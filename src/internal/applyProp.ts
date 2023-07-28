import { isArray, isBoolean, isObject } from '@alloc/is'
import { appendChild } from '../jsx-dom/appendChild'
import { DeferredNode } from '../jsx-dom/node'
import { ResolvedChild, resolveChildren } from '../jsx-dom/resolveChildren'
import { decamelize, noop, updateStyle } from '../jsx-dom/util'
import { morphChildren } from '../morphdom/morphChildren'
import { ReadonlyRef, isRef } from '../observable'
import { DOMClassAttribute, JSX } from '../types'
import { AlienComponent } from './component'
import { hasTagName, isElement, isNode } from './duck'
import { enableEffect, getEffects } from './effects'
import { onElementEvent } from './elementEvent'
import { flattenClassProp } from './flattenClassProp'
import { flattenStyleProp } from './flattenStyleProp'
import { HostProps } from './hostProps'
import { kAlienElementKey, kAlienRefProp } from './symbols'
import { DefaultElement } from './types'

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

type ApplyFunction = (
  node: DefaultElement,
  value: any,
  hostProps?: HostProps
) => void

const applyFunctions: Record<string, ApplyFunction> = {
  children: applyChildrenProp,
  class: applyClassProp,
  dataset: applyDatasetProp,
  ref: applyRefProp,
  style: applyStyleProp,
}

export function applyChildrenProp(
  node: DefaultElement,
  children: ResolvedChild[] | ReadonlyRef<any>,
  hostProps?: HostProps
): void {
  // Note: If children is a ref, it must be the only child.
  if (isRef(children)) {
    hostProps?.addObserver('children', children, (node, newChildren) => {
      const children = resolveChildren(newChildren)
      morphChildren(node, children)
    })
    children = resolveChildren(children.peek())
  }
  for (const child of children) {
    appendChild(child, node)
  }
}

export function applyClassProp(
  node: DefaultElement,
  value: DOMClassAttribute,
  hostProps?: HostProps
): void {
  const result = flattenClassProp(value, hostProps)
  if (result) {
    setAttribute(node, 'class', result)
  } else {
    node.removeAttribute('class')
  }
}

export function applyDatasetProp(
  node: DefaultElement,
  value: any,
  hostProps?: HostProps
): void {
  applyObjectProp(node, 'dataset', value, hostProps)
}

export function applyStyleProp(
  node: DefaultElement,
  value: any,
  hostProps?: HostProps
): void {
  const style = flattenStyleProp(node, value, {}, hostProps)
  updateStyle(node, style)
}

export function applyProp(
  node: DefaultElement,
  prop: string,
  value: any,
  hostProps?: HostProps
): void {
  if (prop === 'htmlFor') {
    prop = 'for'
  }
  const apply = (applyFunctions[prop] ||= generateApplyFunction(prop))
  apply(node, value, hostProps)
}

export function addHostProp(
  hostProps: HostProps | undefined,
  prop: string,
  value: any,
  onUpdate = applyProp
) {
  if (isRef(value)) {
    hostProps?.addObserver(prop, value, (node, value) => {
      onUpdate(node, prop, value)
    })
    value = value.peek()
  } else if (value != null) {
    hostProps?.add(prop)
  }
  return value
}

/**
 * Transfer values into a node's object property (i.e. `style` or `dataset`).
 * Optionally, transfer them into another `out` object instead.
 *
 * Either way, the node's `HostProps` will have each key path added.
 */
export function applyObjectProp(
  node: any,
  prop: string,
  newValues: any,
  hostProps?: HostProps,
  out: any = node[prop]
) {
  for (const key in newValues) {
    let newValue = newValues[key]
    newValue = addHostProp(
      hostProps,
      prop + '.' + key,
      newValue,
      applyNestedProp
    )
    out[key] = newValue
  }
}

export function applyNestedProp(
  node: any,
  keyPath: string,
  newValue: any,
  hostProps?: HostProps
) {
  const [prop, key] = keyPath.split('.')
  applyProp(node, prop, { [key]: newValue }, hostProps)
}

function generateApplyFunction(prop: string): ApplyFunction {
  switch (prop) {
    case 'value':
    case 'innerHTML':
    case 'innerText':
    case 'textContent':
      return (node, value, hostProps) => {
        value = addHostProp(hostProps, prop, value)
        set(node, prop, value == null || isBoolean(value) ? '' : value)
      }
    case 'checked':
    case 'disabled':
    case 'spellCheck':
      prop = prop.toLowerCase()
      return (node, value, hostProps) => {
        value = addHostProp(hostProps, prop, value)
        set(node, prop, value)
      }
    case 'key':
    case 'ref':
    case 'namespaceURI':
      return noop
  }

  if (/^on[A-Z]/.test(prop)) {
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

    return (node, value, hostProps) => {
      value = addHostProp(hostProps, prop, value)
      if (value != null) {
        enableEffect(getEffects(node), onElementEvent.bind(null), 0, node, [
          key,
          value,
          useCapture,
        ])
      }
    }
  }

  if (prop[0] === 'x') {
    if (prop === 'xmlnsXlink') {
      return (node, value, hostProps) => {
        value = addHostProp(hostProps, prop, value)
        setAttribute(node, 'xmlns:xlink', value ?? null)
      }
    }

    const namespace = /^xlink[A-Z]/.test(prop)
      ? 'http://www.w3.org/1999/xlink'
      : /^xml[A-Z]/.test(prop)
      ? 'http://www.w3.org/XML/1998/namespace'
      : null

    if (namespace) {
      const attr = decamelize(prop, ':')
      return (node, value, hostProps) => {
        value = addHostProp(hostProps, prop, value)
        setAttributeNS(node, namespace, attr, value ?? null)
      }
    }
  }

  let setAttribute: (node: Element, key: string, value: any) => void
  if (nonPresentationSVGAttributes.test(prop)) {
    const dashedProp = decamelize(prop, '-')
    setAttribute = (node, prop, value) => {
      node.setAttribute(node instanceof SVGElement ? dashedProp : prop, value)
    }
  } else {
    setAttribute = call.bind(Element.prototype.setAttribute)
  }

  return (node, value, hostProps) => {
    value = addHostProp(hostProps, prop, value)

    if (isObject(value)) {
      // Custom elements might have object properties, which are set
      // directly instead of as attributes.
      set(node, prop, value)
      return
    }

    if (value === null || value === false) {
      node.removeAttribute(prop)
    } else if (value !== undefined) {
      setAttribute(node, prop, value === true ? '' : value)
    }

    // See morphdom #117
    if (prop === 'selected' && hasTagName(node, 'OPTION')) {
      let parentNode = node.parentNode as
        | HTMLSelectElement
        | HTMLOptGroupElement

      if (parentNode) {
        if (hasTagName(parentNode, 'OPTGROUP')) {
          parentNode = parentNode.parentNode as HTMLSelectElement
        }
        if (
          hasTagName(parentNode, 'SELECT') &&
          !parentNode.hasAttribute('multiple')
        ) {
          parentNode.selectedIndex = -1
        }
      }
    }
  }
}

export function applyRefProp(
  node: DefaultElement,
  ref: JSX.RefProp,
  hostProps?: HostProps
): void {
  // Updating the `ref` prop from an event listener is not supported.
  if (!hostProps) return

  const oldRefs = hostProps.refs
  if (ref || oldRefs) {
    const newRefs = (hostProps.refs = new Set())
    forEach(ref, function setElement(ref) {
      if (isArray(ref)) {
        forEach(ref, setElement)
      } else if (ref) {
        ref.setElement(node)
        newRefs.add(ref)
        oldRefs?.delete(ref)
      }
    })
    oldRefs?.forEach(ref => {
      ref.setElement(null)
    })
  }
}

export function applyKeyProp(
  node: ChildNode | DocumentFragment | DeferredNode,
  key: JSX.ElementKey,
  oldNode: ChildNode | DocumentFragment | undefined,
  component: AlienComponent | null
) {
  if (component) {
    const cachedNode = oldNode || (isNode(node) && node)
    if (cachedNode) {
      component.setRef(key, cachedNode)
    }

    // Check for equivalence as the return value of a custom component
    // might be the cached result of an element thunk.
    if (node !== oldNode) {
      if (!isNode(node) || isElement(node)) {
        component.newElements!.set(key, node)
      }
      if (oldNode) {
        kAlienElementKey(node, key)
      }
    }
  } else {
    kAlienElementKey(node, key)
  }
}
