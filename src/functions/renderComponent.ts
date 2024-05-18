import { AlienComponent } from '../internal/component'
import { fragmentToChildNodes } from '../internal/fragment'
import { kAlienStateless } from '../internal/symbols'
import { findFirstElement, findLastElement } from '../internal/traversal'
import { FunctionComponent } from '../types'
import { isFragment } from './typeChecking'

export interface ComponentNode<Props extends object = any> {
  get tag(): FunctionComponent<Props>
  get props(): Readonly<Props>

  get rootNode(): ChildNode | DocumentFragment
  get firstChild(): ChildNode
  get firstElementChild(): JSX.Element | null
  get lastChild(): ChildNode
  get lastElementChild(): JSX.Element | null
  get childNodes(): readonly ChildNode[]
  get ownerDocument(): Document | null

  /**
   * Update the value of the given props. It's a partial update, so any props
   * not defined in `newProps` are left unchanged. Any object props are replaced
   * by any new object, rather than being merged.
   */
  patchProps(newProps: Partial<Props>): void

  /**
   * Same as `updateProps`, but any props which are not defined in `newProps`
   * are set to undefined.
   */
  replaceProps(newProps: Props): void
}

/**
 * Similar to rendering a component with JSX, but you get a `ComponentNode`
 * back, which keeps a reference to the root node of the component instance,
 * even if it gets replaced.
 */
export function renderComponent<Props extends object = {}>(
  tag: FunctionComponent<Props>,
  initialProps = {} as Props
): ComponentNode<Props> {
  if (kAlienStateless(tag)) {
    throw Error('renderComponent doesn’t work with stateless components.')
  }
  return new Component(tag, initialProps) as any
}

const Component = class ComponentNode<
  Props extends object = any
> extends AlienComponent<Props> {
  get firstElementChild(): Element | null {
    return findFirstElement(this.firstChild, this.lastChild)
  }

  get lastElementChild(): Element | null {
    return findLastElement(this.lastChild, this.firstChild)
  }

  get childNodes(): readonly ChildNode[] {
    const { rootNode } = this
    if (rootNode && isFragment(rootNode)) {
      return fragmentToChildNodes(rootNode)
    }
    return rootNode ? [rootNode] : []
  }
}
