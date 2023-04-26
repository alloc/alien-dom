import { batch } from '@preact/signals-core'
import { JSX, ElementKey, FunctionComponent } from '../types'
import { AnyElement, DefaultElement } from './types'
import { AlienEffects } from '../effects'
import { getAlienEffects } from './effects'
import { Ref } from '../signals'
import { AlienContext, currentContext } from '../context'
import { currentComponent } from './global'
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
  memory: any[] = []
  memoryIndex = 0
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
  /** Tags created by this component. */
  tags: Map<string, FunctionComponent> | null = null
  /** Tags created in the current render pass. */
  newTags: Map<string, FunctionComponent> | null = null

  constructor(
    readonly parent: AlienComponent | null,
    readonly tag: FunctionComponent,
    readonly props: Props,
    readonly context: Map<AlienContext, Ref>,
    readonly reinitProps: (props: Partial<Props>) => void,
    readonly updateProps: (props: Partial<Props>) => void,
    readonly enable: () => void,
    readonly disable: () => void
  ) {}

  startRender() {
    this.newRefs = new Map()
    this.newElements = new Map()
    this.newEffects = new AlienEffects()
    this.memoryIndex = 0
    return this as {
      rootNode: ChildNode | null
      newElements: Map<ElementKey, JSX.Element>
      newEffects: AlienEffects
      newRefs: Map<ElementKey, DefaultElement>
    }
  }

  endRender(threw?: boolean) {
    if (!threw) {
      this.truncate(this.memoryIndex)
      this.refs = this.newRefs
      this.effects = this.newEffects
      this.tags = this.newTags
    }
    this.newElements = null
    this.newRefs = null
    this.newEffects = null
    this.newTags = null
  }

  truncate(length: number) {
    for (let i = length; i < this.memory.length; i++) {
      this.memory[i]?.dispose?.()
    }
    this.memory.length = length
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
    const oldTag = component.tags?.get(key)
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
    component.newTags ||= new Map()
    component.newTags.set(key, tag)
  }
  return tag
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
