import { isArray, isFunction } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { ContextStore } from '../context'
import { AlienEffects } from '../effects'
import { attachRef } from '../functions/attachRef'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { unmount } from '../functions/unmount'
import {
  AnyDeferredNode,
  evaluateDeferredNode,
  isDeferredNode,
  isShadowRoot,
} from '../jsx-dom/node'
import { ShadowRootContext } from '../jsx-dom/shadow'
import { morph } from '../morphdom/morph'
import { morphComposite } from '../morphdom/morphComposite'
import { morphFragment } from '../morphdom/morphFragment'
import {
  Observer,
  ReadonlyRef,
  Ref,
  collectAccessedRefs,
  ref,
} from '../observable'
import { FunctionComponent, JSX } from '../types'
import { forwardContext } from './context'
import { deepEquals } from './deepEquals'
import { isComment, isElement, isFragment, isNode } from './duck'
import { updateParentFragment, wrapWithFragment } from './fragment'
import { fromElementThunk } from './fromElementThunk'
import {
  currentComponent,
  currentEffects,
  expectCurrentComponent,
} from './global'
import { popValue } from './stack'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragmentNodes,
  kAlienMemo,
  kAlienParentFragment,
  kAlienRenderFunc,
} from './symbols'
import { AnyElement } from './types'
import { compareNodeWithTag, lastValue, noop } from './util'

let componentRenderHook = (component: AlienComponent) => component.render

export type ElementTags = Map<FunctionComponent, AlienComponent<any>>
export type ElementRefs = Map<JSX.ElementKey, ChildNode | DocumentFragment>

/** Internal state for a component instance. */
export class AlienComponent<Props extends object = any> extends Observer {
  rootNode: ChildNode | DocumentFragment | null = null
  rootKey: JSX.ElementKey | undefined = undefined
  hooks: any[] = []
  nextHookIndex = 0
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
    readonly parent: AlienComponent | null,
    readonly tag: FunctionComponent,
    readonly render: (props: Readonly<Props>) => JSX.ChildrenProp,
    readonly props: Props,
    readonly context: ContextStore
  ) {
    super()
  }

  get ownerDocument() {
    let { rootNode } = this
    if (!rootNode) {
      return null
    }
    if (isFragment(rootNode)) {
      rootNode = kAlienFragmentNodes(rootNode)![0]
    }
    return rootNode.ownerDocument
  }

  updateProps(newProps: Partial<Props>) {
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
  }

  /**
   * Node references are used for morphing and unmounting nodes.
   */
  setNodeReference(key: JSX.ElementKey, node: ChildNode | DocumentFragment) {
    kAlienElementKey(node, key)
    this.newNodes!.set(key, node)
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

    let { rootNode, updates, newEffects } = this

    currentComponent.push(this as AlienRunningComponent)
    currentEffects.push(newEffects)

    // Apply cached parent context if re-rendering.
    const restoreContext = oldEffects
      ? forwardContext(this.context, true)
      : noop

    // If there are enabled component effects, we are mounted.
    const isMounted = !!oldEffects && oldEffects.enabled

    let threw = true
    try {
      let newRootNode: JSX.ChildrenProp = componentRenderHook(this)(this.props)

      if (isFunction(newRootNode)) {
        newRootNode = fromElementThunk(newRootNode)
      }

      // TODO: support ShadowRoot component roots
      if (isShadowRoot(newRootNode)) {
        throw Error('ShadowRoot cannot be returned by component')
      }

      // When this is true, a comment node will be used as a placeholder, so
      // the component can insert a node later.
      let placeholder: Comment | false

      if (rootNode) {
        placeholder = isComment(rootNode) && rootNode

        // The render function might return an element reference.
        if (rootNode === newRootNode) {
          const key = kAlienElementKey(rootNode)!
          const update = updates.get(key)
          if (update) {
            newRootNode = update
          }
        }
      }

      // When this is true, the root node has been updated in place.
      let updated: boolean | undefined

      if (rootNode !== newRootNode) {
        if (newRootNode != null) {
          // When a non-node is returned, wrap it in a fragment.
          if (!isNode(newRootNode) && !isDeferredNode(newRootNode)) {
            newRootNode = wrapWithFragment(
              newRootNode,
              this.context,
              /* isDeferred */ rootNode != null
            )
          }

          // Update the root node if possible.
          if (
            rootNode &&
            isDeferredNode(newRootNode) &&
            this.rootKey === kAlienElementKey(newRootNode) &&
            compareNodeWithTag(rootNode, newRootNode.tag)
          ) {
            if (isFragment(rootNode)) {
              if (newRootNode.tag === Fragment) {
                morphFragment(rootNode, newRootNode, this)
              } else {
                morphComposite(rootNode, newRootNode as any)
              }
              updated = true
            } else if (isElement(rootNode)) {
              morph(rootNode, newRootNode, this)
              updated = true
            }
          }
        }

        // Initialize or replace the root node.
        if (!updated) {
          if (isDeferredNode(newRootNode)) {
            // The next root node must be a DOM node.
            newRootNode = evaluateDeferredNode(newRootNode)
          }

          if (
            newRootNode &&
            isFragment(newRootNode) &&
            !newRootNode.childNodes.length
          ) {
            // Empty fragments disappear.
            newRootNode = null
          }

          // Use a comment node as a placeholder if nothing was produced.
          if (!newRootNode) {
            placeholder ||= document.createComment(DEV ? this.name : '')
            newRootNode = placeholder
          }
          // Fragments always have a component-specific comment node as
          // their first child, which is how a fragment can be replaced.
          else if (DEV && rootNode !== newRootNode && isFragment(newRootNode)) {
            const newChildren =
              kAlienFragmentNodes(newRootNode) || newRootNode.childNodes
            newChildren[0].nodeValue = this.name
          }

          // Replace the old root node if one exists and wasn't replaced by a
          // deeper component already.
          if (rootNode && !fromSameDeeperComponent(rootNode, newRootNode)) {
            if (isFragment(rootNode)) {
              // Remove any nodes owned by the old fragment.
              const oldNodes = kAlienFragmentNodes(rootNode)!
              if (oldNodes[0].parentElement) {
                oldNodes.slice(1).forEach(node => unmount(node))
              }
              // Replace the fragment's header (which is always a comment).
              rootNode = oldNodes[0] as Comment
            }

            // We can't logically replace a node with no parent.
            if (rootNode.parentElement) {
              rootNode.replaceWith(newRootNode)
              unmount(rootNode, true, this)
            } else if (DEV) {
              console.error(
                `Component "${this.name}" was updated before its initial node could be added to the DOM, resulting in a failed update!`
              )
            }
          }

          if (rootNode) {
            const parentFragment = kAlienParentFragment(rootNode)
            if (parentFragment) {
              kAlienParentFragment(newRootNode, parentFragment)
              updateParentFragment(
                parentFragment,
                kAlienFragmentNodes(rootNode) || [rootNode as AnyElement],
                kAlienFragmentNodes(newRootNode) || [newRootNode as AnyElement]
              )
            }
          }

          this.setRootNode((rootNode = newRootNode))
        }
      } else if (!rootNode) {
        placeholder = document.createComment(DEV ? this.name : '')
        this.setRootNode((rootNode = placeholder))
      }

      if (!rootNode) {
        throw Error('Component failed to render a node')
      }

      threw = false
    } finally {
      restoreContext()

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
      // If the root node isn't connected to the DOM in the next microtask,
      // use a mutation observer. Once connected, run any component effects.
      const shadowRoot = this.context.get(ShadowRootContext)
      queueMicrotask(() => {
        if (this.effects === newEffects) {
          newEffects.enableOnceMounted(rootNode, shadowRoot?.value)
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
      return (
        (this.render as any).displayName || this.render.name || '<anonymous>'
      )
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

/**
 * If the current node and the new node are both returned by the
 * same component instance, we should avoid any mutation, since
 * that's been handled by the deeper component.
 *
 * This function assumes `newRootNode` hasn't had the caller added
 * to its `kAlienElementTags` map yet.
 */
function fromSameDeeperComponent(
  rootNode: ChildNode | DocumentFragment,
  newRootNode: ChildNode | DocumentFragment
) {
  if (rootNode === newRootNode) {
    return true
  }
  const newInstances = kAlienElementTags(newRootNode)
  if (newInstances) {
    const instances = kAlienElementTags(rootNode)!
    for (const [tag, instance] of instances) {
      return newInstances.get(tag) === instance
    }
  }
  return false
}

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

/**
 * @internal
 * This swaps out nested components with a stable reference so that
 * elements created with it can be reused even if the parent component
 * is re-rendered. The nested component is wrapped so it can be updated
 * when the parent component re-renders, thereby avoiding stale closure
 * issues.
 */
export function registerNestedTag(key: string, tag: FunctionComponent) {
  const component = lastValue(currentComponent)
  if (component) {
    const oldTag = component.memos?.get(key)
    if (oldTag) {
      oldTag[kAlienRenderFunc.symbol] = tag
      tag = oldTag
    } else {
      const renderRef = ref(tag)
      const Component = (props: any) => {
        return (void 0, renderRef.value)(props)
      }
      attachRef(Component, kAlienRenderFunc.symbol, renderRef)
      tag = Component
    }
    component.newMemos ||= new Map()
    component.newMemos.set(key, tag)
  }
  return tag
}
