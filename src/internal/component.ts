import { batch, effect } from '@preact/signals-core'
import { JSX, ElementKey, FunctionComponent } from '../types'
import { AnyElement, DefaultElement } from './types'
import { AlienEffects } from '../effects'
import { getAlienEffects } from './effects'
import { Ref } from '../signals'
import { AlienContext, currentContext } from '../context'
import { currentComponent } from './global'
import { depsHaveChanged } from './deps'
import { deepEquals } from './deepEquals'
import {
  kAlienRenderFunc,
  kAlienElementKey,
  kAlienElementTags,
  kAlienEffects,
  kAlienNewEffects,
} from './symbols'

export type ElementTags = Map<FunctionComponent, AlienComponent<any>>

/** Internal state for a component instance. */
export class AlienComponent<Props = any> {
  rootNode: ChildNode | null = null
  hooks: any[] = []
  nextHookIndex = 0
  /** Elements created by this component in the current render pass. */
  newElements: Map<ElementKey, JSX.Element> | null = null
  /** Stable references to the elements that are mounted. */
  refs: Map<ElementKey, DefaultElement> | null = null
  /** Stable references that were added or reused by the current render pass. */
  newRefs: Map<ElementKey, DefaultElement> | null = null
  /** Effects tied to the last finished render pass. */
  effects: AlienEffects | null = null
  /** Effects added in the current render pass. */
  newEffects: AlienEffects | null = null
  /** Values memoized in the last finished render pass. */
  memos: Record<string, any> | null = null
  /** Values memoized in the current render pass. */
  newMemos: Record<string, any> | null = null

  constructor(
    readonly parent: AlienComponent | null,
    readonly tag: FunctionComponent,
    readonly props: Props,
    readonly context: Map<AlienContext, Ref>,
    readonly reinitProps: (props: Partial<Props>) => void,
    readonly updateProps: (props: Partial<Props>) => void
  ) {}

  /**
   * When non-null, this component will re-render on prop changes and
   * other observables accessed during render.
   */
  private unwatch: (() => void) | null = null
  private render: (() => void) | null = null

  /**
   * Note: This doesn't add the root node to a document.
   */
  enable(render?: () => void) {
    if (this.unwatch) {
      if (!render) return
      this.unwatch()
    }
    this.render = render!
    this.unwatch = effect(this.render)
  }

  /**
   * Note: This doesn't remove the root node from its document.
   */
  disable() {
    if (this.unwatch) {
      this.truncate(0)
      this.effects?.disable()
      this.effects = null
      this.unwatch()
      this.unwatch = null
    }
  }

  update() {
    this.enable(this.render!)
  }

  startRender() {
    this.newRefs = new Map()
    this.newElements = new Map()
    this.newEffects = new AlienEffects()
    this.nextHookIndex = 0
    return this as {
      rootNode: ChildNode | null
      newElements: Map<ElementKey, JSX.Element>
      newEffects: AlienEffects
      newRefs: Map<ElementKey, DefaultElement>
    }
  }

  endRender(threw?: boolean) {
    if (!threw) {
      this.truncate(this.nextHookIndex)
      this.refs = this.newRefs
      this.effects = this.newEffects
      this.memos = this.newMemos
    }
    this.newElements = null
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

  setRootNode(rootNode: ChildNode) {
    let tags = kAlienElementTags(rootNode)
    if (!tags) {
      tags = new Map()
      kAlienElementTags(rootNode, tags)
    }
    tags.set(this.tag, this)
    this.rootNode = rootNode
  }

  setRef(key: ElementKey, element: DefaultElement) {
    kAlienElementKey(element, key)
    this.newRefs!.set(key, element)

    // If a component accesses the effects of an old element during
    // render, return the effects of a new element instead.
    const oldEffects = kAlienEffects(element)
    if (oldEffects?.enabled) {
      Object.defineProperty(element, kAlienNewEffects.symbol, {
        configurable: true,
        get: () => {
          if (this.newElements) {
            const newElement = this.newElements.get(key)
            return newElement && getAlienEffects(newElement)
          }
        },
      })
    }
  }
}

/**
 * Update the props of a component instance if possible.
 *
 * Returns `true` if a component instance is found for the given tag.
 */
export function updateTagProps(element: AnyElement, tag: any, props: any) {
  const tags = kAlienElementTags(element)
  if (tags) {
    const instance = tags.get(tag)
    if (instance) {
      batch(() => {
        instance.reinitProps(props)
        currentContext.forEach((ref, key) => {
          const targetRef = instance.context.get(key)
          if (targetRef) {
            targetRef.value = ref.peek()
          }
        })
      })
      return true
    }
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
    let memo = component.memos?.[key]
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
    component.newMemos ||= {}
    component.newMemos[key] = memo || newObject
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
    const oldTag = component.memos?.[key]
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
    component.newMemos ||= {}
    component.newMemos[key] = tag
  }
  return tag
}
