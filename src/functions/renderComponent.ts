import { AlienComponent } from '../internal/component'
import { kAlienStateless } from '../internal/symbols'
import { FunctionComponent } from '../types'

export interface ComponentNode<Props extends object = any> {
  get tag(): FunctionComponent<Props>
  get props(): Readonly<Props>

  get rootNode(): ChildNode | DocumentFragment
  get firstChild(): ChildNode
  get lastChild(): ChildNode
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
  component: FunctionComponent<Props>,
  initialProps = {} as Props
): ComponentNode<Props> {
  if (kAlienStateless(component)) {
    throw Error('renderComponent doesn’t work with stateless components.')
  }
  return new AlienComponent(component, initialProps) as ComponentNode
}
