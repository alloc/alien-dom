import { isArray, isFunction } from '@alloc/is'
import { ContextStore } from '../core/context'
import { AlienEffects } from '../core/effects'
import {
  Observer,
  ReadonlyRef,
  Ref,
  collectAccessedRefs,
  ref,
} from '../core/observable'
import { onMount } from '../core/onMount'
import { attachRef } from '../functions/attachRef'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { morphRootNode } from '../functions/morphRootNode'
import { AnyDeferredNode } from '../jsx-dom/node'
import { FunctionComponent, JSX } from '../types'
import { forwardContext, getContext } from './context'
import { deepEquals } from './deepEquals'
import { isFragment } from './duck'
import { endOfFragment } from './fragment'
import {
  currentComponent,
  currentEffects,
  currentNodeStore,
  expectCurrentComponent,
} from './global'
import { NodeStore } from './nodeStore'
import { popValue } from './stack'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragmentNodes,
  kAlienMemo,
} from './symbols'
import { lastValue, noop } from './util'

let componentRenderHook = (component: AlienComponent) => component.tag

type Component = (props: any) => JSX.ChildrenProp

export type ElementTags = Map<Component, AlienComponent<any>>
export type ElementRefs = Map<JSX.ElementKey, ChildNode | DocumentFragment>

/** Internal state for a component instance. */
export class AlienComponent<Props extends object = any>
  extends Observer
  implements NodeStore
{
  readonly parent: AlienComponent | null = lastValue(currentComponent)
  readonly context = new ContextStore(getContext())
  readonly props: Props

  hooks: any[] = []
  nextHookIndex = 0

  rootNode: ChildNode | DocumentFragment | null = null
  rootNodeCallbacks: Set<(node: ChildNode | DocumentFragment) => void> | null =
    null
  rootKey: JSX.ElementKey | undefined = undefined

  /** Deferred nodes (by key) created in the current render pass. */
  updates: Map<JSX.ElementKey, AnyDeferredNode> | null = null
  /** Stable references to the nodes that are mounted. */
  nodes: ElementRefs | null = null
  /** Stable references that were added or reused by the current render pass. */
  newNodes: ElementRefs | null = null
  /** Effects tied to the last finished render pass. */
  effects: AlienEffects | null = null
  /** Effects added in the current render pass. */
  newEffects: AlienEffects | null = null
  /** Values memoized in the last finished render pass. */
  memos: Map<any, any> | null = null
  /** Values memoized in the current render pass. */
  newMemos: Map<any, any> | null = null

  constructor(
    readonly tag: (props: Props) => JSX.ChildrenProp,
    initialProps: Props
  ) {
    super()

    this.props = { ...initialProps }
    for (const key in initialProps) {
      const initialValue = initialProps[key]
      attachRef(this.props, key, ref(initialValue))
    }

    this.update()
  }

  get firstChild(): ChildNode | null {
    const { rootNode } = this
    if (rootNode && isFragment(rootNode)) {
      return kAlienFragmentNodes(rootNode)![0]
    }
    return rootNode
  }

  get lastChild(): ChildNode | null {
    const { rootNode } = this
    if (rootNode && isFragment(rootNode)) {
      return endOfFragment(rootNode)!
    }
    return rootNode
  }

  get ownerDocument() {
    return this.firstChild?.ownerDocument
  }

  patchProps(newProps: Partial<Props>) {
    let newPropAdded = false
    for (const key in newProps) {
      const newValue = newProps[key]
      if (this.props.hasOwnProperty(key)) {
        this.props[key] = newValue as any
      } else {
        attachRef(this.props, key, ref(newValue))
        newPropAdded = true
      }
    }
    // When a prop has its initial value set, the component must be manually
    // updated in case the prop's absence influenced the render result.
    if (newPropAdded) {
      this.scheduleUpdate()
    }
  }

  replaceProps(newProps: Props) {
    for (const key in this.props) {
      if (!newProps.hasOwnProperty(key)) {
        this.props[key] = undefined as any
      }
    }
    this.patchProps(newProps)
  }

  truncate(length: number) {
    for (let i = length; i < this.hooks.length; i++) {
      const hook = this.hooks[i]
      if (hook && isFunction(hook.dispose)) {
        hook.dispose()
      }
    }
    this.hooks.length = length
  }

  setRootNode(rootNode: ChildNode | DocumentFragment) {
    this.rootNode = rootNode
    this.rootKey = kAlienElementKey(rootNode)

    // Register this component instance with the root node, so the node can be
    // morphed by future renders.
    let tags = kAlienElementTags(rootNode)
    if (!tags) {
      tags = new Map()
      kAlienElementTags(rootNode, tags)
    }
    tags.set(this.tag, this)

    this.rootNodeCallbacks?.forEach(callback => callback(rootNode))
    this.rootNodeCallbacks = null
  }

  getNodeForKey(key: JSX.ElementKey) {
    return this.nodes?.get(key)
  }

  setNodeForKey(key: JSX.ElementKey, node: ChildNode | DocumentFragment) {
    this.newNodes!.set(key, node)
  }

  getNodeUpdateForKey(key: JSX.ElementKey) {
    return this.updates?.get(key)
  }

  setNodeUpdateForKey(key: JSX.ElementKey, update: AnyDeferredNode) {
    this.updates!.set(key, update)
  }

  override nextCompute() {
    const oldEffects = this.effects

    // Schedule an update for the next microtask if the component
    // effects from the previous render are still being enabled.
    if (oldEffects?.partiallyEnabled) {
      return this.scheduleUpdate()
    }

    this.newEffects = new AlienEffects()
    this.newNodes = new Map()
    this.nextHookIndex = 0
    this.updates = new Map()

    let { rootNode, newEffects } = this

    currentComponent.push(this as AlienRunningComponent)
    currentEffects.push(newEffects)
    currentNodeStore.push(this)

    // Apply cached parent context if re-rendering.
    const restoreContext = oldEffects
      ? forwardContext(this.context, true)
      : noop

    // If there are enabled component effects, we are mounted.
    const isMounted = !!oldEffects && oldEffects.enabled

    let threw = true
    try {
      let newRootNode = componentRenderHook(this)(this.props)
      newRootNode = morphRootNode(
        rootNode,
        newRootNode,
        this.rootKey,
        this.context,
        this.updates
      )
      if (newRootNode !== rootNode) {
        this.setRootNode((rootNode = newRootNode))
      }
      threw = false
    } finally {
      restoreContext()

      popValue(currentNodeStore, this)
      popValue(currentEffects, newEffects)
      popValue(currentComponent, this as AlienRunningComponent)

      if (!threw) {
        this.truncate(this.nextHookIndex)
        this.nodes = this.newNodes
        this.effects = newEffects
        this.memos = this.newMemos
      }
      this.updates = null
      this.newNodes = null
      this.newEffects = null
      this.newMemos = null
    }

    // When the root node is a fragment, use its first child to determine if
    // the fragment has been connected to the DOM.
    if (isFragment(rootNode)) {
      rootNode = kAlienFragmentNodes(rootNode)![0]
    }

    if (isMounted && rootNode.isConnected) {
      newEffects.enable()
      oldEffects.disable()
    } else {
      // Wait for the root node to be connected to the DOM before running its
      // side effects. Note that a memory leak occurs if the root node is never
      // connected to the DOM.
      onMount(rootNode, () => {
        if (this.effects === newEffects) {
          newEffects.enable()
        }
      })
    }
  }

  override isObservablyPure() {
    return true
  }

  override didObserve(ref: ReadonlyRef): void {
    const { memos } = this
    memos?.forEach((memo, key) => {
      if (Memo.isMemo(memo) && memo.refs?.has(ref)) {
        memos.delete(key)
      }
    })
  }

  /**
   * Note: This doesn't remove the root node from its document.
   */
  override dispose() {
    this.truncate(0)
    this.effects?.disable()
    this.effects = null
    super.dispose()
  }
}

export interface AlienComponent {
  readonly name: string
}

if (DEV) {
  Object.defineProperty(AlienComponent.prototype, 'name', {
    get: function name(this: AlienComponent) {
      return (this.tag as any).displayName || this.tag.name || '<anonymous>'
    },
  })
}

export declare class AlienRunningComponent<
  Props extends object = any
> extends AlienComponent<Props> {
  updates: Map<JSX.ElementKey, AnyDeferredNode>
  newNodes: ElementRefs
  newEffects: AlienEffects
}

export const setComponentRenderHook = (
  hook: (component: AlienComponent) => (props: any) => JSX.ChildrenProp
) => (componentRenderHook = hook)

/** @internal */
export class Memo {
  static isMemo = (value: any): value is Memo =>
    value != null && kAlienMemo.in(value)
  constructor(
    public value: any,
    public deps?: readonly any[],
    public refs?: Set<ReadonlyRef>
  ) {
    kAlienMemo(this, true)
  }
}

/**
 * @internal
 * The compiler inserts `registerMemo` calls for props with an inlined object,
 * array, or function call as its value.
 */
export function registerMemo(
  key: string,
  value: any,
  deps?: readonly any[] | false
) {
  const component = expectCurrentComponent()
  if (component) {
    let memo: Memo | undefined
    if (component.memos?.has(key)) {
      memo = component.memos.get(key) as Memo

      // Compare dependency arrays if possible. The memo is never dirty when
      // deps is false or when value is a function and deps is not an array.
      // If none of that applies, a deep equality check is done.
      const dirty = isArray(deps)
        ? depsHaveChanged(deps, memo.deps)
        : deps !== false &&
          !(isFunction(value) || deepEquals(value, memo.value))

      if (dirty) {
        memo = undefined
      } else {
        value = deps ? memo.value : memo
      }
    }
    if (memo === undefined) {
      if (deps) {
        let refs: Set<Ref> | undefined
        if (isFunction(value)) {
          refs = new Set()
          value = collectAccessedRefs(value, refs)
        }
        memo = new Memo(value, deps, refs)
      } else {
        // Skip creating a Memo wrapper if no deps are provided.
        memo = value
      }
    }
    component.newMemos ||= new Map()
    component.newMemos.set(key, memo)
  }
  return value
}

/**
 * @internal
 * Like `registerMemo` but for inlined callback props.
 */
export function registerCallback(
  key: string,
  callback: Function,
  deps?: readonly any[] | false
) {
  const component = expectCurrentComponent()
  if (component) {
    let memo = component.memos?.get(key) as Memo | undefined
    if (deps) {
      if (memo && !depsHaveChanged(deps, memo.deps)) {
        callback = memo.value
      } else {
        memo = new Memo(callback, deps)
      }
    } else if (memo) {
      // Skip creating a Memo wrapper if no deps are provided.
      callback = memo as any
    }
    component.newMemos ||= new Map()
    component.newMemos.set(key, memo || callback)
  }
  return callback
}

class NestedTag {
  render: Ref<FunctionComponent>
  constructor(render: FunctionComponent, public deps: readonly any[]) {
    this.render = ref(render)
  }
  Component = (props: any) => {
    return (void 0, this.render.value)(props)
  }
}

/**
 * @internal
 * This swaps out nested components with a stable reference so that
 * elements created with it can be reused even if the parent component
 * is re-rendered. The nested component is wrapped so it can be updated
 * when the parent component re-renders, thereby avoiding stale closure
 * issues.
 */
export function registerNestedTag(
  key: string,
  tag: FunctionComponent,
  deps: readonly any[]
) {
  const component = lastValue(currentComponent)
  if (component) {
    let state: NestedTag = component.memos?.get(key)
    if (!state) {
      state = new NestedTag(tag, deps)
    }
    // Make the nested component rerender if deps have changed.
    else if (depsHaveChanged(deps, state.deps)) {
      state.deps = deps
      state.render.value = tag
    }

    component.newMemos ||= new Map()
    component.newMemos.set(key, state)

    return state.Component
  }

  // Probably a fluke in the compiler. Do nothing.
  return tag
}
