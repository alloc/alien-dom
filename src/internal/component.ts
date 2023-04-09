import { batch } from '@preact/signals-core'
import { ElementKey } from '../types/attr'
import { AnyElement, DefaultElement } from './types'
import { AlienHooks } from '../hooks'
import { kAlienElementTags } from '../symbols'
import { FunctionComponent } from '../types/component'
import { getAlienHooks } from './hooks'
import { Ref } from '../signals'
import { AlienContext, currentContext } from '../context'
import {
  setSymbol,
  kAlienElementKey,
  kAlienHooks,
  kAlienNewHooks,
} from '../symbols'

export type ElementTags = Map<FunctionComponent, AlienComponent<any>>

/** Internal state for a component instance. */
export class AlienComponent<Props = any> {
  rootNode: ChildNode | null = null
  memory: any[] = []
  memoryIndex = 0
  /** Stable references to the elements that are mounted. */
  refs: Map<ElementKey, DefaultElement> | null = null
  /** Effects tied to this component lifecycle. */
  hooks: AlienHooks | null = null
  /** Stable references that were added or reused by the current render pass. */
  newRefs: Map<ElementKey, DefaultElement> | null = null
  /** Elements created by this component in the current render pass. */
  newElements: Map<ElementKey, DefaultElement> | null = null
  /** Effects added in the current render pass. */
  newHooks: AlienHooks | null = null

  constructor(
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
      this.refs = this.newRefs
      this.hooks = this.newHooks
    }
    this.newRefs = null
    this.newElements = null
    this.newHooks = null
  }

  setRootNode(rootNode: ChildNode) {
    let tags: ElementTags = (rootNode as any)[kAlienElementTags]
    if (!tags) {
      tags = new Map()
      setSymbol(rootNode, kAlienElementTags, tags)
    }
    tags.set(this.tag, this)
    this.rootNode = rootNode
  }

  setRef(key: ElementKey, element: DefaultElement) {
    setSymbol(element, kAlienElementKey, key)
    this.newRefs!.set(key, element)

    // If a component accesses the hooks of an old element during
    // render, return the hooks of a new element instead.
    const oldHooks: AlienHooks | undefined = (element as any)[kAlienHooks]
    if (oldHooks?.enabled) {
      Object.defineProperty(element, kAlienNewHooks, {
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
 * Update the props of a component instance if possible.
 *
 * Returns `true` if a component instance is found for the given tag.
 */
export function updateTagProps(element: AnyElement, tag: any, props: any) {
  const tags: ElementTags = (element as any)[kAlienElementTags]
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
