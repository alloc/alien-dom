import { isObject, isFunction, isBoolean, isString } from '@alloc/is'
import type { JSX, ElementKey } from '../types'
import type { DefaultElement } from '../internal/types'
import {
  kAlienElementTags,
  kAlienPureComponent,
  kAlienElementKey,
  kAlienSelfUpdating,
} from '../internal/symbols'
import { Fragment } from '../components/Fragment'
import { currentComponent } from '../internal/global'
import { hasTagName } from '../internal/duck'
import { appendChild } from './appendChild'
import { svgTags } from './svg-tags'
import { decamelize, keys, updateStyle } from './util'
import { createEventEffect } from '../internal/elementEvent'
import { currentContext } from '../context'
import { selfUpdating } from '../functions/selfUpdating'

export type { JSX }
export { Fragment }

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

const selfUpdatingTags = new WeakMap<any, any>()

export { jsx as jsxs }

export function jsx(tag: any, props: any, key?: ElementKey) {
  const component = currentComponent.get()
  const hasImpureTag = typeof tag !== 'string' && !kAlienPureComponent.in(tag)
  if (hasImpureTag && !kAlienSelfUpdating.in(tag)) {
    let selfUpdatingTag = selfUpdatingTags.get(tag)
    if (!selfUpdatingTag) {
      selfUpdatingTag = selfUpdating(tag)
      selfUpdatingTags.set(tag, selfUpdatingTag)
    }
    tag = selfUpdatingTag
  }

  // Use the element key to discover the original version of this node. We will
  // return this original node so an API like React's useRef isn't needed.
  let oldNode = key != null && component?.refs?.get(key)

  // Find the component instance associated with the original node, so we can
  // rerender it with the latest props and context (if anything changed).
  if (oldNode && hasImpureTag) {
    const tags = kAlienElementTags(oldNode)
    if (tags) {
      const instance = tags.get(tag)
      if (instance) {
        instance.updateProps(props)
        currentContext.forEach((ref, key) => {
          const targetRef = instance.context.get(key)
          if (targetRef) {
            targetRef.value = ref.peek()
          }
        })
      }
      const updatedNode = instance?.rootNode
      if (updatedNode) {
        component!.setRef(key!, updatedNode as DefaultElement)
        return updatedNode
      }
    }
    // Cannot reuse an old node if the tags differ.
    oldNode = undefined
  }

  let node: HTMLElement | SVGElement | null
  if (isString(tag)) {
    const namespaceURI = props.namespaceURI || (svgTags[tag] && SVGNamespace)
    node = namespaceURI
      ? document.createElementNS(namespaceURI, tag)
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
    node = tag(props)
  } else {
    throw new TypeError(`Invalid JSX element type: ${tag}`)
  }

  if (node && key != null) {
    if (component) {
      // Check for equivalence as the return value of a custom component
      // might be the cached result of an element thunk.
      if (oldNode !== node) {
        component.newElements!.set(key, node as JSX.Element)
      }
      if (oldNode) {
        kAlienElementKey(node, key)
        node = oldNode as any
      }
      component.setRef(key, node as JSX.Element)
    } else {
      kAlienElementKey(node, key)
    }
  }

  // TODO: call this when props.ref changes
  if (props.ref && node && node !== oldNode) {
    props.ref.setElement(node)
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

function applyStyleProp(node: DefaultElement, value: any) {
  if (value != null && value !== false) {
    if (Array.isArray(value)) {
      value.forEach(v => applyStyleProp(node, v))
    } else if (isObject(value)) {
      updateStyle(node, value)
    }
  }
}

function applyProp(prop: string, value: any, node: DefaultElement) {
  if (value === null) {
    node.removeAttribute(prop)
    return
  }

  switch (prop) {
    case 'class':
    case 'className':
      setAttribute(node, 'class', className(value))
      return
    case 'style':
      if (isString(value)) {
        setAttribute(node, 'style', value)
      } else {
        applyStyleProp(node, value)
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
    case 'ref':
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

      // If this element is being created within a self-updating
      // component, we need to ensure the event listener can be removed
      // by the next render. It also allows for transferring a new event
      // listener to the original element of the same element key.
      if (currentComponent.get()) {
        createEventEffect(node, key, value, useCapture)
      } else {
        node.addEventListener(key, value, useCapture)
      }
    }
  } else if (isObject(value)) {
    // Custom elements might have object properties, which are set
    // directly instead of as attributes.
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
