import { batch } from '@preact/signals-core'
import { ElementKey } from '../types/attr'
import { AnyElement, DefaultElement } from './types'
import { AlienHooks } from '../hooks'
import { FunctionComponent } from '../types/component'
import { getAlienHooks } from './hooks'
import { Ref } from '../signals'
import { AlienContext, currentContext } from '../context'
import { currentComponent } from '../global'
import { kAlienRenderFunc } from '../symbols'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienHooks,
  kAlienNewHooks,
} from '../symbols'

export type ElementTags = Map<FunctionComponent, AlienComponent<any>>

/** Internal state for a component instance. */
export class AlienComponent<Props = any> {
  rootNode: ChildNode | null = null
  memory: any[] = []
  memoryIndex = 0
  /** Elements created by this component in the current render pass. */
  newElements: Map<ElementKey, DefaultElement> | null = null
  /** Stable references to the elements that are mounted. */
  refs: Map<ElementKey, DefaultElement> | null = null
  /** Stable references that were added or reused by the current render pass. */
  newRefs: Map<ElementKey, DefaultElement> | null = null
  /** Effects tied to this component lifecycle. */
  hooks: AlienHooks | null = null
  /** Effects added in the current render pass. */
  newHooks: AlienHooks | null = null
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
    this.newHooks = new AlienHooks()
    this.memoryIndex = 0
    return this as {
      rootNode: ChildNode | null
      newElements: Map<ElementKey, DefaultElement>
      newHooks: AlienHooks
      newRefs: Map<ElementKey, DefaultElement>
    }
  }

  endRender(threw?: boolean) {
    if (!threw) {
      // Truncate the memory if the render function returned early.
      this.memory.length = this.memoryIndex

      this.refs = this.newRefs
      this.hooks = this.newHooks
      this.tags = this.newTags
    }
    this.newElements = null
    this.newRefs = null
    this.newHooks = null
    this.newTags = null
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

    // If a component accesses the hooks of an old element during
    // render, return the hooks of a new element instead.
    const oldHooks = kAlienHooks(element)
    if (oldHooks?.enabled) {
      Object.defineProperty(element, kAlienNewHooks.symbol, {
        configurable: true,
        get: () => {
          if (this.newElements) {
            const newElement = this.newElements.get(key)
            return newElement && getAlienHooks(newElement)
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
