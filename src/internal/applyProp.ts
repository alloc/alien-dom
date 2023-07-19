import {
  isArray,
  isBoolean,
  isFunction,
  isNumber,
  isObject,
  isPlainObject,
  isString,
} from '@alloc/is'
import { classToString } from '../functions/classToString'
import { appendChild } from '../jsx-dom/appendChild'
import { enablePropObserver } from '../jsx-dom/jsx-runtime'
import { isSvgChild } from '../jsx-dom/svg-tags'
import { UpdateStyle, decamelize, keys, updateStyle } from '../jsx-dom/util'
import { ReadonlyRef, isRef } from '../observable'
import { HTMLStyleAttribute } from '../types'
import { parseTransform, renderTransform } from './animate/transform'
import { hasTagName } from './duck'
import { createEventEffect } from './elementEvent'
import { currentComponent } from './global'
import {
  kAlienElementKey,
  kAlienElementProps,
  kAlienElementTags,
} from './symbols'
import { cssTransformAliases, cssTransformUnits } from './transform'
import { DefaultElement, StyleAttributes } from './types'

const XLinkNamespace = 'http://www.w3.org/1999/xlink'
const XMLNamespace = 'http://www.w3.org/XML/1998/namespace'

const nonPresentationSVGAttributes =
  /^(a(ll|t|u)|base[FP]|c(al|lipPathU|on)|di|ed|ex|filter[RU]|g(lyphR|r)|ke|l(en|im)|ma(rker[HUW]|s)|n|pat|pr|point[^e]|re[^n]|s[puy]|st[^or]|ta|textL|vi|xC|y|z)/

const { set } = Reflect
const { call } = Function

const setAttribute = call.bind(Element.prototype.setAttribute) as (
  node: Element,
  key: string,
  value: string | number
) => void

const setAttributeNS = call.bind(Element.prototype.setAttributeNS) as (
  node: Element,
  namespace: string,
  key: string,
  value: string | number
) => void

export function applyProp(node: DefaultElement, prop: string, value: any) {
  if (isRef(value)) {
    const isChildren = prop === 'children'
    enablePropObserver(node, prop, value, (node, newValue) => {
      if (isChildren) {
        while (node.lastChild) {
          node.removeChild(node.lastChild)
        }
      }
      applyProp(node, prop, newValue)
    })
    value = value.peek()
  }

  if (value === null) {
    node.removeAttribute(prop)
    return
  }

  switch (prop) {
    case 'class':
    case 'className':
      setAttribute(node, 'class', classToString(value, node))
      return
    case 'style':
      if (isString(value)) {
        setAttribute(node, 'style', value)
      } else {
        applyStyleProp(node, value, UpdateStyle.AllowRefs)
      }
      return
    case 'children':
      appendChild(value, node)
      return
    case 'innerHTML':
    case 'innerText':
    case 'textContent':
      if (value != null && !isBoolean(value)) {
        set(node, prop, value)
      }
      return
    case 'value':
      // Skip nullish values for <select> value after appending
      // <option> elements.
      if (value == null || hasTagName(node, 'SELECT')) {
        return
      }
      if (hasTagName(node, 'TEXTAREA')) {
        node.value = value
        return
      }
      // Use setAttribute for other tag names.
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

export function applyInitialProps(node: DefaultElement, props: any) {
  const initialProps = new Set(keys(props))
  initialProps.delete('children')

  // Save these keys to nullify them if omitted in a future render.
  kAlienElementProps(node, initialProps)

  for (const prop of initialProps) {
    applyProp(node, prop, props[prop])
  }
}

export function applyInitialPropsRecursively(node: DefaultElement) {
  if (kAlienElementTags.in(node)) {
    return // Skip over self-updating nodes.
  }
  // Skip over explicitly keyed nodes, which had their props applied at
  // the time of creation.
  const key = kAlienElementKey(node)
  if (key == null || (key as string)[0] === '*') {
    const props = kAlienElementProps(node)
    // If no props are set, this node probably wasn't created with JSX. But
    // let's check its descendants in case those are.
    if (props) {
      if (!isPlainObject(props)) {
        return // Already processed by fromElementThunk.
      }
      applyInitialProps(node, props)
    }
  }
  let child = node.firstElementChild
  while (child) {
    applyInitialPropsRecursively(child as DefaultElement)
    child = child.nextElementSibling
  }
}

function applyStyleProp(
  node: DefaultElement,
  value: any,
  flags: UpdateStyle.AllowRefs | 0
) {
  const style = flattenStyleProp(node, value, {}, flags)
  const refs = updateStyle(node, style, flags)
  if (refs?.size) {
    for (const [key, ref] of refs) {
      enablePropObserver(node, 'style.' + key, ref, (node, newValue) => {
        let transformFn = cssTransformAliases[key]
        if (transformFn != null) {
          const svgMode = isSvgChild(node)
          if (!transformFn || svgMode) {
            transformFn = key
          }
          if (isNumber(newValue) && !svgMode) {
            newValue += (cssTransformUnits[key] || '') as any
          }
          const oldTransform = parseTransform(node, svgMode)
          const newTransform = renderTransform(
            oldTransform,
            [[transformFn, newValue]],
            false
          )
          updateStyle(node, { transform: newTransform })
        } else {
          updateStyle(node, { [key]: newValue })
        }
      })
    }
  }
}

function flattenStyleProp(
  node: DefaultElement,
  value: HTMLStyleAttribute | ReadonlyRef<HTMLStyleAttribute>,
  style: StyleAttributes,
  flags: UpdateStyle.AllowRefs | 0,
  rootValue?: HTMLStyleAttribute
) {
  if (value != null && value !== false) {
    if (isArray(value)) {
      value.forEach(item => {
        flattenStyleProp(node, item, style, flags, rootValue ?? value)
      })
    } else if (isRef<HTMLStyleAttribute>(value)) {
      flattenStyleProp(node, value.peek(), style, flags, rootValue)
      if (flags & UpdateStyle.AllowRefs) {
        enablePropObserver(node, 'style', value, node => {
          applyStyleProp(node, rootValue, 0)
        })
      }
    } else if (isObject(value)) {
      for (const key of keys(value as { z: 0 })) {
        style[key] = value[key] as any
      }
    } else {
      value.split(/\s*;\s*/).forEach(property => {
        const [key, value] = property.split(/\s*:\s*/) as ['z', any]
        style[key] = value
      })
    }
  }
  return style
}
