import {
  decamelize,
  hasTagName,
  isArrayLike,
  isBoolean,
  isComponentClass,
  isElement,
  isFunction,
  isObject,
  isString,
  keys,
  hasForEach,
  formatStyleValue,
} from './util'
import { isShadowRoot } from './shadow'
import { svgTags } from './svg-tags'
import {
  kAlienElementKey,
  kAlienSelfUpdating,
  kAlienPlaceholder,
} from '../symbols'
import { DefaultElement, StyleAttributes } from '../internal/types'
import { elementEvent } from '../elementEvents'
import { currentHooks, currentComponent, currentMode } from '../global'
import { updateTagProps, AlienComponent } from '../internal/component'
import { ElementKey } from '../types/attr'
import { JSX } from '../types/jsx'
import { selfUpdating } from '../selfUpdating'
import { fromElementThunk } from '../fromElementProp'
import {
  kAlienFragment,
  kAlienElementTags,
  kAlienManualUpdates,
} from '../symbols'
import {
  kCommentNodeType,
  kFragmentNodeType,
  kTextNodeType,
} from '../internal/constants'

export type { JSX }

export const SVGNamespace = 'http://www.w3.org/2000/svg'
const XLinkNamespace = 'http://www.w3.org/1999/xlink'
const XMLNamespace = 'http://www.w3.org/XML/1998/namespace'

// https://facebook.github.io/react/docs/jsx-in-depth.html#booleans-null-and-undefined-are-ignored
// Emulate JSX Expression logic to ignore certain type of children or className.
function isVisibleChild(value: any): boolean {
  return !isBoolean(value) && value != null
}

const DomTokenList =
  typeof DOMTokenList !== 'undefined' ? DOMTokenList : function () {}

/**
 * Convert a `value` to a className string.
 * `value` can be a string, an array or a `Dictionary<boolean>`.
 */
export function className(value: any): string {
  if (Array.isArray(value)) {
    return value.map(className).filter(Boolean).join(' ')
  } else if (value instanceof DomTokenList) {
    return '' + value
  } else if (isObject(value)) {
    return keys(value)
      .filter(k => value[k])
      .join(' ')
  } else if (isVisibleChild(value)) {
    return '' + value
  } else {
    return ''
  }
}

const nonPresentationSVGAttributes =
  /^(a(ll|t|u)|base[FP]|c(al|lipPathU|on)|di|ed|ex|filter[RU]|g(lyphR|r)|ke|l(en|im)|ma(rker[HUW]|s)|n|pat|pr|point[^e]|re[^n]|s[puy]|st[^or]|ta|textL|vi|xC|y|z)/

export function createFactory(tag: string) {
  return createElement.bind(null, tag)
}

export function Fragment(props: {
  children: JSX.Children
  manualUpdates?: boolean
}): JSX.Element {
  const fragment = document.createDocumentFragment()
  if (props.manualUpdates) {
    kAlienManualUpdates(fragment, true)
  }
  appendChild(props.children, fragment)
  return fragment as any
}

export class Component {
  constructor(readonly props: any) {}

  render() {
    return null
  }
}

/* @__PURE__ */ Object.defineProperties(Component.prototype, {
  isReactComponent: {
    value: true,
  },
})

const selfUpdatingTags = new WeakMap<any, any>()

export { jsx as jsxs }

export function jsx(tag: any, props: any, key?: ElementKey) {
  if (!props.namespaceURI && svgTags[tag]) {
    props.namespaceURI = SVGNamespace
  }

  let oldNode: DefaultElement | undefined

  const component = currentComponent.get()
  if (component) {
    if (key !== undefined) {
      oldNode = component.refs?.get(key)
    }
    if (typeof tag !== 'string' && tag !== Fragment) {
      // When a plain function component is used by a self-updating
      // component, the former is made to be self-updating as well.
      if (!kAlienSelfUpdating.in(tag)) {
        let selfUpdatingTag = selfUpdatingTags.get(tag)
        if (!selfUpdatingTag) {
          selfUpdatingTag = selfUpdating(tag)
          selfUpdatingTags.set(tag, selfUpdatingTag)
        }
        tag = selfUpdatingTag
      }
      // Updating the props of an existing element will only rerender
      // the component if a new value is defined for a stateless prop.
      if (oldNode) {
        if (updateTagProps(oldNode, tag, props)) {
          component.setRef(key!, oldNode)
          return oldNode
        }
        // Cannot reuse an old node if the tags differ.
        if (kAlienElementTags.in(oldNode)) {
          oldNode = undefined
        }
      }
    }
  }

  let node: HTMLElement | SVGElement | null
  if (isString(tag)) {
    node = props.namespaceURI
      ? document.createElementNS(props.namespaceURI, tag)
      : document.createElement(tag)
    applyProps(node, props)

    // Select `option` elements in `select`
    if (hasTagName(node, 'SELECT') && props.value != null) {
      if (props.multiple === true && Array.isArray(props.value)) {
        const values = (props.value as any[]).map(value => String(value))

        node
          .querySelectorAll('option')
          .forEach(option => (option.selected = values.includes(option.value)))
      } else {
        node.value = props.value
      }
    }
  } else if (isFunction(tag)) {
    if (tag.defaultProps) {
      props = { ...tag.defaultProps, ...props }
    }
    if (isComponentClass(tag)) {
      node = new tag(props).render()
    } else {
      node = tag(props)
    }
  } else {
    throw new TypeError(`Invalid JSX element type: ${tag}`)
  }

  if (node && key !== undefined) {
    if (component) {
      // Check for equivalence as the return value of a custom component
      // might be the cached result of an element thunk.
      if (oldNode !== node) {
        component.newElements!.set(key, node as JSX.Element)
      }
      if (oldNode) {
        kAlienElementKey(node, key)
        node = oldNode
      }
      component.setRef(key, node as JSX.Element)
    } else {
      kAlienElementKey(node, key)
    }
  }

  return node
}

export function createElement(tag: any, props: any, ...children: any[]) {
  if (isString(props) || Array.isArray(props)) {
    children.unshift(props)
    props = {}
  }

  props = props || {}

  if (props.children != null && !children.length) {
    ;({ children, ...props } = props)
  }

  return jsx(tag, { ...props, children }, props.key)
}

function appendChild(child: JSX.Children, parent: Node, key?: string) {
  if (child === undefined || child === null || child === false) {
    return
  }
  if (isElement(child)) {
    // The child nodes of a fragment are cached on the fragment itself
    // in case the fragment is cached and reused in a future render.
    if (child.nodeType === kFragmentNodeType) {
      if (currentMode.is('deref')) {
        // Revert placeholders if not in a component. This should only
        // happen when using the <ManualUpdates> component.
        child = revertAllPlaceholders(child)
      } else {
        const component = currentComponent.get()
        if (component) {
          const fragment: DocumentFragment = child as any
          let childNodes = kAlienFragment(fragment)
          if (childNodes) {
            // For child nodes still in the DOM, generate a placeholder to
            // indicate a no-op. Otherwise, reuse the child node.
            childNodes.forEach(child => {
              if (child.isConnected) {
                child = getPlaceholder(child as any)
              }
              fragment.appendChild(child)
            })
          } else {
            // This is the first time the fragment is being appended, so
            // cache its child nodes.
            childNodes = Array.from(fragment.childNodes)
            kAlienFragment(fragment, childNodes)
          }
        }
      }
    }
    // Text nodes cannot have an element key.
    else if (child.nodeType !== kTextNodeType) {
      if (kAlienElementKey.in(child)) {
        if (currentMode.is('deref')) {
          // Revert placeholders if not in a component. This should only
          // happen when using the <ManualUpdates> component.
          child = revertAllPlaceholders(child)
        } else {
          const component = currentComponent.get()
          if (component) {
            const key = kAlienElementKey(child)!

            // Find the element's new version. The element may have been
            // passed by reference, so its new version could exist in a
            // parent component, hence the for loop.
            let newChild: Element | undefined
            for (let c: AlienComponent | null = component; c; c = c.parent) {
              if (!c.newElements || (newChild = c.newElements.get(key))) break
            }

            // Use the new version of the element if it exists.
            if (newChild && child !== newChild) {
              child = newChild
            }
            // If an element reference was cached, there won't exist a new
            // version in the `newElements` map. In this case, let's
            // ensure it's not forgotten by the reference tracker and
            // replace it with a placeholder to skip morphing.
            else if (child.isConnected) {
              component.setRef(key, child as JSX.Element)
              child = getPlaceholder(child)
            }
          }
        }
      } else {
        kAlienElementKey(child, key || '*0')
      }
    }

    appendChildToNode(child, parent)

    // Enable component hooks when the parent element is set.
    if (kAlienElementTags.in(child)) {
      const tags = kAlienElementTags(child)!
      queueMicrotask(() => {
        const rootNode =
          (child as ChildNode).nodeType === kFragmentNodeType
            ? kAlienFragment(child)![0]
            : (child as ChildNode)

        if (!rootNode.isConnected) {
          // The element hasn't mounted yet, so we'll have to rely on
          // the component to set an `onMount` listener.
          return
        }

        const components = Array.from(tags.values())
        if (components[0].hooks) {
          for (const component of components) {
            component.enable()
          }
        } else {
          // Re-render the top-most component and the updates will
          // trickle down the component tree.
          const topMostComponent = components.at(-1)!
          topMostComponent.enable()
        }
      })
    }
  } else if (isFunction(child)) {
    if (kAlienManualUpdates.in(parent)) {
      currentMode.push('deref')
      try {
        appendChild(fromElementThunk(child), parent, key)
      } finally {
        currentMode.pop('deref')
      }
    } else {
      appendChild(fromElementThunk(child), parent, key)
    }
  } else if (isArrayLike(child)) {
    let children = child
    if (!hasForEach(children)) {
      children = Array.from(children)
    }
    const slotKey = key || ''
    children.forEach((child, i) => {
      const arrayKey = slotKey + '*' + i

      // Fragment children are merged into the nearest ancestor element,
      // so the arrayKey is prepended to avoid conflicts.
      if (isElement(child, kFragmentNodeType)) {
        child.childNodes.forEach(node => {
          const key = kAlienElementKey(node)
          if (typeof key === 'string' && key[0] === '*') {
            kAlienElementKey(node, arrayKey + key)
          }
        })
      }

      appendChild(child as JSX.Children, parent, arrayKey)
    })
  } else if (isShadowRoot(child)) {
    const shadowRoot = (parent as HTMLElement).attachShadow(child.attr)
    appendChild(child.children, shadowRoot)
  } else {
    appendChildToNode(document.createTextNode(String(child)), parent)
  }
}

function getPlaceholder(child: Element): DefaultElement {
  let placeholder: any
  if (child.nodeType === kCommentNodeType) {
    placeholder = document.createComment(child.textContent || '')
  } else {
    const tagName = child.tagName.toLowerCase()
    placeholder = child.namespaceURI
      ? document.createElementNS(child.namespaceURI, tagName)
      : document.createElement(tagName)
  }
  kAlienPlaceholder(placeholder, child)
  kAlienElementKey(placeholder, kAlienElementKey(child))
  return placeholder
}

function revertAllPlaceholders<T extends ChildNode>(child: T) {
  child = kAlienPlaceholder<T>(child) || child
  child.childNodes.forEach(grandChild => {
    const oldGrandChild = grandChild
    grandChild = revertAllPlaceholders(grandChild)
    if (oldGrandChild !== grandChild) {
      child.replaceChild(grandChild, oldGrandChild)
    }
  })
  return child
}

function appendChildToNode(child: Node, node: Node) {
  if (hasTagName(node, 'TEMPLATE')) {
    node.content.appendChild(child)
  } else {
    node.appendChild(child)
  }
}

function updateStyle(node: DefaultElement, value: any) {
  if (value != null && value !== false) {
    if (Array.isArray(value)) {
      value.forEach(v => updateStyle(node, v))
    } else if (isObject(value)) {
      for (const key of keys<StyleAttributes>(value)) {
        node.style[key] = formatStyleValue(key, value[key])
      }
    }
  }
}

function applyProp(prop: string, value: any, node: DefaultElement) {
  if (value === null) {
    node.removeAttribute(prop)
    return
  }

  switch (prop) {
    case 'ref':
      if (value) {
        value.setElement(node)
      }
      return
    case 'class':
    case 'className':
      if (isFunction(value)) {
        value(node)
      } else {
        setAttribute(node, 'class', className(value))
      }
      return
    case 'style':
      if (isString(value)) {
        setAttribute(node, 'style', value)
      } else {
        updateStyle(node, value)
      }
      return
    case 'children':
      appendChild(value, node)
      return
    case 'innerHTML':
    case 'innerText':
    case 'textContent':
      if (isVisibleChild(value)) {
        set(node, prop, value)
      }
      return
    case 'value':
      if (value == null || hasTagName(node, 'SELECT')) {
        // skip nullish values
        // for `<select>` apply value after appending `<option>` elements
        return
      } else if (hasTagName(node, 'TEXTAREA')) {
        node.value = value
        return
      }
      // use attribute for other elements
      break
    case 'spellCheck':
      set(node, 'spellcheck', value)
      return
    case 'htmlFor':
      setAttribute(node, 'for', value)
      return
    case 'dataset':
      if (value) {
        for (const key of keys(value)) {
          if (value[key] == null) continue
          node.dataset[key] = value[key]
        }
      }
      return
    case 'key':
    case 'namespaceURI':
      return
    // fallthrough
  }

  if (prop[0] === 'x') {
    switch (prop) {
      case 'xlinkActuate':
      case 'xlinkArcrole':
      case 'xlinkHref':
      case 'xlinkRole':
      case 'xlinkShow':
      case 'xlinkTitle':
      case 'xlinkType':
        setAttributeNS(node, XLinkNamespace, decamelize(prop, ':'), value)
        return
      case 'xmlnsXlink':
        setAttribute(node, decamelize(prop, ':'), value)
        return
      case 'xmlBase':
      case 'xmlLang':
      case 'xmlSpace':
        setAttributeNS(node, XMLNamespace, decamelize(prop, ':'), value)
        return
    }
  }

  if (isFunction(value)) {
    if (prop[0] === 'o' && prop[1] === 'n') {
      let key = prop.toLowerCase()
      let useCapture: boolean | undefined

      if (key.endsWith('capture')) {
        key = key.substring(2, key.length - 7)
      } else {
        if (key in window) {
          // standard event
          // the JSX attribute could have been "onMouseOver" and the
          // member name "onmouseover" is on the window's prototype
          // so let's add the listener "mouseover", which is all lowercased
          key = key.substring(2)
        } else {
          // custom event
          // the JSX attribute could have been "onMyCustomEvent"
          // so let's trim off the "on" prefix and lowercase the first character
          // and add the listener "myCustomEvent"
          // except for the first character, we keep the event name case
          key = key[2] + prop.slice(3)
        }
      }

      if (currentHooks.get()) {
        elementEvent(node, key, value, useCapture)
      } else {
        node.addEventListener(key, value, useCapture)
      }
    }
  } else if (isObject(value)) {
    set(node, prop, value)
  } else if (value === true) {
    setAttribute(node, prop, '')
  } else if (value === false) {
    node.removeAttribute(prop)
  } else if (value !== undefined) {
    if (
      node instanceof SVGElement &&
      !nonPresentationSVGAttributes.test(prop)
    ) {
      setAttribute(node, decamelize(prop, '-'), value)
    } else {
      setAttribute(node, prop, value)
    }
  }
}

const set = <T = any>(obj: any, key: string, value: T) => (obj[key] = value)

function setAttribute(node: Element, key: string, value: string | number) {
  node.setAttribute(key, value as any)
}

function setAttributeNS(
  node: Element,
  namespace: string,
  key: string,
  value: string | number
) {
  node.setAttributeNS(namespace, key, value as any)
}

export function applyProps(node: HTMLElement | SVGElement, props: object) {
  for (const prop of keys(props)) {
    applyProp(prop, props[prop], node)
  }
  return node
}
