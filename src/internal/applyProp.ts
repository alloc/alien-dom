import { isArray, isBoolean, isObject } from '@alloc/is'
import { createDisposable } from '../disposable'
import { appendChild } from '../jsx-dom/appendChild'
import { AnyDeferredNode, isDeferredNode } from '../jsx-dom/node'
import { ResolvedChild, resolveChildren } from '../jsx-dom/resolveChildren'
import { resolveSelected } from '../jsx-dom/resolveSelected'
import {
  UpdateStyle,
  decamelize,
  forEach,
  noop,
  updateStyle,
} from '../jsx-dom/util'
import { morphChildren } from '../morphdom/morphChildren'
import { ReadonlyRef, isRef } from '../observable'
import { window } from '../platform'
import { DOMClassAttribute, HTMLStyleAttribute, JSX } from '../types'
import { AlienComponent } from './component'
import { hasTagName, isNode } from './duck'
import { flattenClassProp } from './flattenClassProp'
import { MergeStylesFn, flattenStyleProp } from './flattenStyleProp'
import { HostProps } from './hostProps'
import { kAlienElementKey } from './symbols'
import { DefaultElement } from './types'

const nonPresentationSVGAttributes =
  /^(a(ll|t|u)|base[FP]|c(al|lipPathU|on)|di|ed|ex|filter[RU]|g(lyphR|r)|ke|l(en|im)|ma(rker[HUW]|s)|n|pat|pr|point[^e]|re[^n]|s[puy]|st[^or]|ta|textL|vi|xC|y|z)/

const { set } = Reflect

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

export function applyProp(
  node: DefaultElement,
  prop: string,
  value: any,
  hostProps?: HostProps
): void {
  const attr = prop === 'htmlFor' ? 'for' : prop
  const apply = (applyFunctions[attr] ||= generateApplyFunction(attr))
  if (apply !== noop) {
    if (prop !== 'children') {
      value = addHostProp(hostProps, prop, value)
    }
    apply(node, value, hostProps)
  }
}

export function addHostProp(
  hostProps: HostProps | undefined,
  prop: string,
  value: any,
  onUpdate = applyProp
) {
  if (isRef(value)) {
    hostProps?.addObserver(prop, value, value => {
      onUpdate(hostProps.node, prop, value)
    })
    value = value.peek()
  } else if (value != null) {
    hostProps?.add(prop)
  }
  return value
}

export function addChildrenRef(
  ref: ReadonlyRef<JSX.Children>,
  hostProps?: HostProps
) {
  if (hostProps) {
    hostProps.clearProp('children')
    hostProps.addObserver('children', ref, newChildren => {
      const children = resolveChildren(newChildren)
      morphChildren(hostProps.node, children)
    })
  }
  return resolveChildren(ref.peek())
}

export function applyChildrenProp(
  node: DefaultElement,
  children: ResolvedChild[] | ReadonlyRef<any>,
  hostProps?: HostProps
): void {
  // Note: If children is a ref, it must be the only child.
  if (isRef(children)) {
    children = addChildrenRef(children, hostProps)
  }
  for (const child of children) {
    appendChild(child, node)
  }
  if (hasTagName(node, 'SELECT')) {
    resolveSelected(node)
  }
}

export function applyClassProp(
  node: DefaultElement,
  value: DOMClassAttribute,
  hostProps?: HostProps
): void {
  const result = flattenClassProp(value, hostProps)
  if (result) {
    node.setAttribute('class', result)
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
  value: HTMLStyleAttribute,
  hostProps?: HostProps
): void {
  const merge: MergeStylesFn = (style, value) =>
    applyObjectProp(node, 'style', value, hostProps, style)
  const style = flattenStyleProp(node, value, {}, merge, hostProps)
  updateStyle(node, style, UpdateStyle.NonAnimated)
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
      return (node, value) => {
        set(node, prop, value == null || isBoolean(value) ? '' : value)
      }
    case 'checked':
    case 'disabled':
    case 'spellCheck':
      prop = prop.toLowerCase()
      return (node, value) => {
        set(node, prop, value)
      }
    case 'key':
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
      if (value != null) {
        // Create a new reference in case the event handler is memoized.
        value = value.bind(null)

        node.addEventListener(key, value, useCapture)
        hostProps?.addEffect(
          prop,
          createDisposable(
            [key, value, useCapture],
            node.removeEventListener,
            node
          )
        )
      }
    }
  }

  let namespace: string | null | undefined
  let getAttributeName: (node: DefaultElement) => string

  if (prop[0] === 'x') {
    if (prop === 'xmlnsXlink') {
      getAttributeName = () => 'xmlns:xlink'
    } else {
      namespace = /^xlink[A-Z]/.test(prop)
        ? 'http://www.w3.org/1999/xlink'
        : /^xml[A-Z]/.test(prop)
        ? 'http://www.w3.org/XML/1998/namespace'
        : null

      if (namespace) {
        const attr = decamelize(prop, ':')
        getAttributeName = () => attr
      }
    }
  }

  if (!nonPresentationSVGAttributes.test(prop)) {
    const dashedProp = decamelize(prop, '-')
    if (prop !== dashedProp) {
      getAttributeName = node =>
        node instanceof SVGElement ? dashedProp : prop
    }
  }

  getAttributeName ||= () => prop

  return (node, value) => {
    if (isObject(value)) {
      // Custom elements might have object properties, which are set
      // directly instead of as attributes.
      set(node, prop, value)
      return
    }

    const attr = getAttributeName(node)
    if (value === null || value === false) {
      if (namespace) {
        node.removeAttributeNS(namespace, attr)
      } else {
        node.removeAttribute(attr)
      }
    } else if (value !== undefined) {
      value = value === true ? '' : value
      if (namespace) {
        node.setAttributeNS(namespace, attr, value)
      } else {
        node.setAttribute(attr, value)
      }
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
  node: ChildNode | DocumentFragment | AnyDeferredNode,
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
      if (isDeferredNode(node)) {
        component.updates!.set(key, node)
      }
      if (oldNode) {
        kAlienElementKey(node, key)
      }
    }
  } else {
    kAlienElementKey(node, key)
  }
}
