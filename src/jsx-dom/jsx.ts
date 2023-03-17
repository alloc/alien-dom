import {
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
import type { ComponentClass, JSX } from './types'
import type { ShadowRootContainer } from './shadow'
import { isShadowRoot } from './shadow'

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

const svg: Record<string, 1> = {
  animate: 1,
  circle: 1,
  clipPath: 1,
  defs: 1,
  desc: 1,
  ellipse: 1,
  feBlend: 1,
  feColorMatrix: 1,
  feComponentTransfer: 1,
  feComposite: 1,
  feConvolveMatrix: 1,
  feDiffuseLighting: 1,
  feDisplacementMap: 1,
  feDistantLight: 1,
  feFlood: 1,
  feFuncA: 1,
  feFuncB: 1,
  feFuncG: 1,
  feFuncR: 1,
  feGaussianBlur: 1,
  feImage: 1,
  feMerge: 1,
  feMergeNode: 1,
  feMorphology: 1,
  feOffset: 1,
  fePointLight: 1,
  feSpecularLighting: 1,
  feSpotLight: 1,
  feTile: 1,
  feTurbulence: 1,
  filter: 1,
  foreignObject: 1,
  g: 1,
  image: 1,
  line: 1,
  linearGradient: 1,
  marker: 1,
  mask: 1,
  metadata: 1,
  path: 1,
  pattern: 1,
  polygon: 1,
  polyline: 1,
  radialGradient: 1,
  rect: 1,
  stop: 1,
  svg: 1,
  switch: 1,
  symbol: 1,
  text: 1,
  textPath: 1,
  tspan: 1,
  use: 1,
  view: 1,
}

const nonPresentationSVGAttributes =
  /^(a(ll|t|u)|base[FP]|c(al|lipPathU|on)|di|ed|ex|filter[RU]|g(lyphR|r)|ke|l(en|im)|ma(rker[HUW]|s)|n|pat|pr|point[^e]|re[^n]|s[puy]|st[^or]|ta|textL|vi|xC|y|z)/

export function createFactory(tag: string) {
  return createElement.bind(null, tag)
}

export function Fragment(attr: { children: JSX.Element | JSX.Element[] }) {
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

export function jsx(tag: any, props: any, key?: string) {
  if (!props.namespaceURI && svg[tag]) {
    props.namespaceURI = SVGNamespace
  }

  let node: HTMLElement | SVGElement | null
  if (isString(tag)) {
    node = props.namespaceURI
      ? document.createElementNS(props.namespaceURI, tag)
      : document.createElement(tag)
    applyProps(props, node)

    // Select `option` elements in `select`
    if (node instanceof window.HTMLSelectElement && props.value != null) {
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

function appendChild(
  child: any[] | string | number | ShadowRootContainer | null | Element,
  node: Node
) {
  if (isArrayLike(child)) {
    appendChildren(child as any, node)
  } else if (isString(child) || isNumber(child)) {
    appendChildToNode(document.createTextNode(child as any), node)
  } else if (child === null) {
    appendChildToNode(document.createComment(''), node)
  } else if (isElement(child)) {
    appendChildToNode(child, node)
  } else if (isShadowRoot(child)) {
    const shadowRoot = (node as HTMLElement).attachShadow(child.attr)
    appendChild(child.children, shadowRoot)
  }
}

function appendChildren(children: any[], node: Node) {
  for (const child of [...children]) {
    appendChild(child, node)
  }
  return node
}

function appendChildToNode(child: Node, node: Node) {
  if (node instanceof window.HTMLTemplateElement) {
    node.content.appendChild(child)
  } else {
    node.appendChild(child)
  }
}

function normalizeAttribute(s: string, separator: string) {
  return s.replace(/[A-Z]/g, match => separator + match.toLowerCase())
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
  switch (prop) {
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
      if (value == null || node instanceof window.HTMLSelectElement) {
        // skip nullish values
        // for `<select>` apply value after appending `<option>` elements
        return
      } else if (node instanceof window.HTMLTextAreaElement) {
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
    case 'ref':
    case 'namespaceURI':
      return
    // fallthrough
  }

  if (prop.startsWith('x')) {
    switch (prop) {
      case 'xlinkActuate':
      case 'xlinkArcrole':
      case 'xlinkHref':
      case 'xlinkRole':
      case 'xlinkShow':
      case 'xlinkTitle':
      case 'xlinkType':
        setAttributeNS(
          node,
          XLinkNamespace,
          normalizeAttribute(prop, ':'),
          value
        )
        return
      case 'xmlnsXlink':
        setAttribute(node, normalizeAttribute(prop, ':'), value)
        return
      case 'xmlBase':
      case 'xmlLang':
      case 'xmlSpace':
        setAttributeNS(node, XMLNamespace, normalizeAttribute(prop, ':'), value)
        return
    }
  }

  if (isFunction(value)) {
    if (prop[0] === 'o' && prop[1] === 'n') {
      const attribute = prop.toLowerCase()
      const useCapture = attribute.endsWith('capture')

      if (!useCapture && get(node, attribute) === null) {
        // use property when possible PR #17
        set(node, attribute, value)
      } else if (useCapture) {
        node.addEventListener(
          attribute.substring(2, attribute.length - 7),
          value,
          true
        )
      } else {
        let eventName
        if (attribute in window) {
          // standard event
          // the JSX attribute could have been "onMouseOver" and the
          // member name "onmouseover" is on the window's prototype
          // so let's add the listener "mouseover", which is all lowercased
          const standardEventName = attribute.substring(2)
          eventName = standardEventName
        } else {
          // custom event
          // the JSX attribute could have been "onMyCustomEvent"
          // so let's trim off the "on" prefix and lowercase the first character
          // and add the listener "myCustomEvent"
          // except for the first character, we keep the event name case
          const customEventName = attribute[2] + prop.slice(3)
          eventName = customEventName
        }
        node.addEventListener(eventName, value)
      }
    }
  } else if (isObject(value)) {
    set(node, prop, value)
  } else if (value === true) {
    setAttribute(node, prop, '')
  } else if (value !== false && value != null) {
    if (
      node instanceof SVGElement &&
      !nonPresentationSVGAttributes.test(prop)
    ) {
      setAttribute(node, normalizeAttribute(prop, '-'), value)
    } else {
      setAttribute(node, prop, value)
    }
  }
}

const get = <T = any>(obj: any, key: string) => obj[key] as T
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
