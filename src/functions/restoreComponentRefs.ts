import { AlienComponent } from '../internal/component'
import { currentComponent } from '../internal/global'
import { kAlienElementKey, kAlienFragmentNodes } from '../internal/symbols'
import { isFragment, isTextNode } from './typeChecking'

/**
 * Restore a previous HTML element within a component's element references, so a
 * JSX element using the same key will be reuse the HTML element instead of
 * generating a new one.
 *
 * This function is meant to support JSX updates of HTML elements that are
 * removed from or moved within the DOM, and then subsequently restored in the
 * DOM.
 */
export function restoreComponentRefs(node: ChildNode | DocumentFragment) {
  const component = currentComponent.get()
  if (!component) {
    throw Error('restoreComponentRefs must be called within a component')
  }

  component.refs ??= new Map()

  if (isFragment(node)) {
    const childNodes = kAlienFragmentNodes(node)
    childNodes?.forEach(childNode => {
      if (childNode && !isTextNode(childNode)) {
        restoreComponentRef(childNode, component)
      }
    })
  } else if (!isTextNode(node)) {
    restoreComponentRef(node, component)
  }
}

function restoreComponentRef(node: ChildNode, component: AlienComponent) {
  const key = kAlienElementKey(node)
  if (key != null) {
    component.refs!.set(key, node)
  }
  node.childNodes.forEach(childNode => {
    if (!isTextNode(childNode)) {
      restoreComponentRef(childNode, component)
    }
  })
}
