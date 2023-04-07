import {
  decamelize,
  forEach,
  isArrayLike,
  isBoolean,
  isComponentClass,
  isElement,
  isFunction,
  isNumber,
  isObject,
  isString,
  keys,
} from './util'
import { isUnitlessNumber } from './css-props'
import { isShadowRoot } from './shadow'
import { svgTags } from './svg-tags'
import {
  kAlienElementKey,
  setSymbol,
  kAlienSelfUpdating,
  kAlienPlaceholder,
} from '../symbols'
import { DefaultElement } from '../internal/types'
import { elementEvent } from '../elementEvents'
import { currentHooks, currentComponent } from '../global'
import { updateTagProps } from '../internal/tags'
import { ElementKey } from '../types/attr'
import { hasForEach } from './util'
import { JSX } from '../types/jsx'
import { selfUpdating } from '../selfUpdating'
import { fromElementThunk } from '../fromElementProp'

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

export function Fragment(attr: { children: JSX.Children }) {
  const fragment = document.createDocumentFragment()
  appendChild(attr.children, fragment)
  return fragment
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

export function jsx(tag: any, props: any, key?: ElementKey) {
  if (!props.namespaceURI && svgTags[tag]) {
    props.namespaceURI = SVGNamespace
  }

  let oldNode: DefaultElement | undefined

  const scope = currentComponent.get()
  if (scope && typeof tag !== 'string' && tag !== Fragment) {
    if (!tag.hasOwnProperty(kAlienSelfUpdating)) {
      let selfUpdatingTag = selfUpdatingTags.get(tag)
      if (!selfUpdatingTag) {
        selfUpdatingTag = selfUpdating(tag)
        selfUpdatingTags.set(tag, selfUpdatingTag)
      }
      tag = selfUpdatingTag
    }
    if (key !== undefined && (oldNode = scope.fromRef(key))) {
      // Updating the props of an existing element will only rerender
      // the component if a new value is defined for a stateless prop.
      if (updateTagProps(oldNode, tag, props)) {
        // TODO: what if the component returned a different node?
        scope.setRef(key, oldNode)
        return oldNode
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
    if (scope) {
      // Check for equivalence as the return value of a custom component
      // might be the cached result of an element thunk.
      if (oldNode !== node) {
        scope.newElements.set(key, node as DefaultElement)
      }
      if (oldNode) {
        node = oldNode as typeof node
      }
      scope.setRef(key, node as DefaultElement)
    } else {
      setSymbol(node, kAlienElementKey, key)
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
    if (child.nodeType !== Node.TEXT_NODE) {
      if (child.hasOwnProperty(kAlienElementKey)) {
        const scope = currentComponent.get()
        if (scope) {
          const key = (child as any)[kAlienElementKey]
          // If the key is not found in `scope.newElements`, it means
          // that the element was cached, so no update is needed.
          const newChild = scope.newElements.get(key)
          if (newChild) {
            // Append the new element, so the old element's parent is
            // preserved.
            child = newChild
          }
          // Elements created in a loop or callback don't have their `key`
          // prop set by the compiler, which means they don't get added to
          // the `scope.newElements` cache unless a dynamic key is set.
          else if (document.contains(child)) {
            // Ensure this element is not forgotten by the ref tracker, so
            // it can be reused when the cache is invalidated.
            scope.setRef(key, child as DefaultElement)
            // Prevent an update by morphdom.
            child = getPlaceholder(child)
          }
        }
      } else {
        setSymbol(child, kAlienElementKey, key || '*0')
      }
    }
    appendChildToNode(child, parent)
  } else if (isFunction(child)) {
    appendChild(fromElementThunk(child), parent, key)
  } else if (isArrayLike(child)) {
    let children = child
    if (!hasForEach(children)) {
      children = Array.from(children)
    }
    const slotKey = key || ''
    children.forEach((child, i) => {
      const arrayKey = slotKey + '*' + i

      // Fragment children are not wrapped in an element, so we need to
      // prepend the key to the child nodes to differentiate them.
      if (isElement(child, Node.DOCUMENT_FRAGMENT_NODE)) {
        child.childNodes.forEach(node => {
          let key = (node as any)[kAlienElementKey]
          if (key && key[0] === '*') {
            setSymbol(node, kAlienElementKey, arrayKey + key)
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

function getPlaceholder(child: any): DefaultElement {
  const tagName = child.tagName.toLowerCase()
  const placeholder: any = child.namespaceURI
    ? document.createElementNS(child.namespaceURI, tagName)
    : document.createElement(tagName)
  placeholder[kAlienPlaceholder] = child
  return placeholder
}

function hasTagName<Tag extends string>(
  node: any,
  tagName: Tag
): node is JSX.ElementType<Lowercase<Tag>> {
  return node && node.tagName === tagName
}

function appendChildToNode(child: Node, node: Node) {
  if (hasTagName(node, 'TEMPLATE')) {
    node.content.appendChild(child)
  } else {
    node.appendChild(child)
  }
}

export function updateStyle(
  node: Element & HTMLOrSVGElement & { style?: any },
  value?: any
) {
  if (value == null || value === false) {
    return
  } else if (Array.isArray(value)) {
    value.forEach(v => updateStyle(node, v))
  } else if (isObject(value)) {
    forEach(value, (val, key) => {
      if (isNumber(val) && !isUnitlessNumber[key]) {
        node.style[key] = val + 'px'
      } else {
        node.style[key] = val
      }
    })
  }
}

function applyProp(prop: string, value: any, node: Element & HTMLOrSVGElement) {
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
      forEach(value, (dataValue, dataKey) => {
        if (dataValue != null) {
          node.dataset[dataKey] = dataValue
        }
      })
      return
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
