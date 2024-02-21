import { isArray, isFunction } from '@alloc/is'
import { AlienContext } from '../context'
import { AlienEffects } from '../effects'
import { attachRef } from '../functions/attachRef'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { AnyDeferredNode } from '../jsx-dom/node'
import {
  Observer,
  ReadonlyRef,
  Ref,
  collectAccessedRefs,
  ref,
} from '../observable'
import { FunctionComponent, JSX } from '../types'
import { deepEquals } from './deepEquals'
import { isFragment } from './duck'
import { currentComponent } from './global'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragmentNodes,
  kAlienMemo,
  kAlienRenderFunc,
} from './symbols'

export type ElementTags = Map<FunctionComponent, AlienComponent<any>>
export type ElementRefs = Map<JSX.ElementKey, ChildNode | DocumentFragment>

/** Internal state for a component instance. */
export class AlienComponent<Props = any> {
  rootNode: ChildNode | DocumentFragment | null = null
  rootKey: JSX.ElementKey | undefined = undefined
  hooks: any[] = []
  nextHookIndex = 0
  /** Deferred nodes (by key) created in the current render pass. */
  updates: Map<JSX.ElementKey, AnyDeferredNode> | null = null
  /** Stable references to the elements that are mounted. */
  refs: ElementRefs | null = null
  /** Stable references that were added or reused by the current render pass. */
  newRefs: ElementRefs | null = null
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
    readonly props: Props,
    readonly context: Map<AlienContext, Ref>,
    readonly updateProps: (props: Partial<Props>) => void,
    readonly name: () => string
  ) {}

  /**
   * When non-null, this component will re-render on prop changes and
   * other observables accessed during render.
   */
  private observer: Observer | null = null
  private render: (() => void) | null = null

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

  /**
   * Note: This doesn't add the root node to a document.
   */
  enable(render?: () => void) {
    if (this.observer) {
      if (!render) return
      this.observer.dispose()
    }
    this.render = render!
    this.observer = new ComponentObserver(this)
    this.observer.update(render)
  }

  /**
   * Note: This doesn't remove the root node from its document.
   */
  disable() {
    if (this.observer) {
      this.truncate(0)
      this.effects?.disable()
      this.effects = null
      this.observer.dispose()
      this.observer = null
    }
  }

  /** Force a component to rerender. */
  update() {
    if (this.observer) {
      this.observer.scheduleUpdate()
    } else if (this.render) {
      this.enable(this.render)
    }
  }

  startRender() {
    this.newEffects = new AlienEffects()
    this.newRefs = new Map()
    this.nextHookIndex = 0
    this.updates = new Map()

    return this as AlienRunningComponent<Props>
  }

  endRender(threw?: boolean) {
    if (!threw) {
      this.truncate(this.nextHookIndex)
      this.refs = this.newRefs
      this.effects = this.newEffects
      this.memos = this.newMemos
    }
    this.updates = null
    this.newRefs = null
    this.newEffects = null
    this.newMemos = null
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

  setRef(key: JSX.ElementKey, element: ChildNode | DocumentFragment) {
    kAlienElementKey(element, key)
    this.newRefs!.set(key, element)
  }
}

export declare class AlienRunningComponent<
  Props = any
> extends AlienComponent<Props> {
  updates: Map<JSX.ElementKey, AnyDeferredNode>
  newRefs: ElementRefs
  newEffects: AlienEffects
}

class ComponentObserver extends Observer {
  constructor(private component: AlienComponent) {
    super()
  }
  override isObservablyPure() {
    return true
  }
  override didObserve(ref: ReadonlyRef): void {
    const { memos } = this.component
    memos?.forEach((memo, key) => {
      if (Memo.isMemo(memo) && memo.refs?.has(ref)) {
        memos.delete(key)
      }
    })
  }
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
  const component = currentComponent.get()!
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
  const component = currentComponent.get()!
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
  const component = currentComponent.get()
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
