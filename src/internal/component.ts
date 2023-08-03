import { AlienContext } from '../context'
import { AlienEffects } from '../effects'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { AnyDeferredNode } from '../jsx-dom/node'
import { Observer, Ref, observe } from '../observable'
import { FunctionComponent, JSX } from '../types'
import { deepEquals } from './deepEquals'
import { isFragment } from './duck'
import { currentComponent } from './global'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragmentNodes,
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
    this.observer = observe(this.render)
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

  update() {
    this.enable(this.render!)
  }

  startRender() {
    this.newEffects = new AlienEffects()
    this.updates = new Map()
    this.newRefs = new Map()
    this.nextHookIndex = 0
    return this as {
      rootNode: ChildNode | DocumentFragment | null
      updates: Map<JSX.ElementKey, AnyDeferredNode>
      newEffects: AlienEffects
    }
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
      this.hooks[i]?.dispose?.()
    }
    this.hooks.length = length
  }

  setRootNode(rootNode: ChildNode | DocumentFragment) {
    this.rootNode = rootNode

    // Register this component instance with the root node, so the node can be
    // morphed by future renders.
    let tags = kAlienElementTags(rootNode)
    if (!tags) {
      tags = new Map()
      kAlienElementTags(rootNode, tags)
    }
    tags.set(this.tag, this)

    // Move the element key from the node to the component. If the node is
    // mounted outside a render (e.g. from an event handler), an undefined key
    // signals that the node cannot be unmounted through morphing.
    this.rootKey = kAlienElementKey(rootNode)
    kAlienElementKey(rootNode, undefined)
  }

  setRef(key: JSX.ElementKey, element: ChildNode | DocumentFragment) {
    kAlienElementKey(element, key)
    this.newRefs!.set(key, element)
  }
}

/**
 * @internal
 * The compiler inserts `registerObject` calls for inline callback props.
 */
export function registerObject(
  key: string,
  newObject: object,
  // Pass true for deep equality check.
  deps?: readonly any[] | true
) {
  const component = currentComponent.get()!
  if (component) {
    let memo = component.memos?.get(key)
    if (deps) {
      if (
        memo &&
        (deps === true
          ? deepEquals(newObject, memo[0])
          : !depsHaveChanged(deps, memo[1]))
      ) {
        newObject = memo[0]
      } else {
        memo = [newObject, deps]
      }
    } else if (memo) {
      newObject = memo
    }
    component.newMemos ||= new Map()
    component.newMemos.set(key, memo || newObject)
  }
  return newObject
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
      kAlienRenderFunc(oldTag, tag)
      tag = oldTag
    } else {
      const Component = (props: any) => {
        const render = kAlienRenderFunc(Component)!
        return render(props)
      }
      kAlienRenderFunc(Component, tag)
      tag = Component
    }
    component.newMemos ||= new Map()
    component.newMemos.set(key, tag)
  }
  return tag
}
