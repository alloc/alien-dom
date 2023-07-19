import { isString } from '@alloc/is'
import type { Key } from 'ts-key-enum'
import { Disposable } from '../disposable'
import { AlienEffect } from '../effects'
import { isDocument } from '../internal/duck'
import { enableEffect, getAlienEffects } from '../internal/effects'
import { currentComponent } from '../internal/global'
import { ShadowRootContext } from '../jsx-dom/appendChild'
import { noop, toArray } from '../jsx-dom/util'
import { Ref, observe, ref } from '../observable'
import { useEffect } from './useEffect'
import { useState } from './useState'

export interface KeyBindingEvent {
  target: Document | HTMLElement
  stopPropagation(): void
  preventDefault(): void
}

type Split<T extends string> = T extends `${infer First}${infer Rest}`
  ? First | Split<Rest>
  : never

type Letter = Split<'ABCDEFGHIJKLMNOPQRSTUVWXYZ'>
type Digit = Split<'0123456789'>
type Symbol = Split<'!@#$%^&*()_+-=[]{}|\\;:,.?<>/\'"'>

export type KeyCombo =
  | readonly KeyCombo[]
  | `${Key}`
  | Letter
  | Digit
  | Symbol
  | false
  | null
  | undefined

export function useKeyBinding(
  combo: KeyCombo,
  callback?: (event: KeyBindingEvent) => void
) {
  const component = currentComponent.get()!
  const binding = useState(initKeyBinding, callback)

  binding.combo = prepareCombo(combo)
  binding.callback = callback

  // If no element is attached, use the document.
  useEffect(() => {
    if (!binding.effect) {
      return binding.enable(component.ownerDocument!)
    }
  }, [])

  return binding
}

export type KeyBinding = ReturnType<typeof initKeyBinding>

const initKeyBinding = (
  callback: ((event: KeyBindingEvent) => void) | undefined
): {
  /**
   * Equals true when the key binding is activated.
   * @observable
   */
  isActive: boolean
  effect: Disposable<AlienEffect> | null
  combo: Set<string>
  callback: ((event: KeyBindingEvent) => void) | undefined
  setElement: (element: HTMLElement) => void
  enable: (target: Document | HTMLElement) => () => void
} => {
  const isActiveRef = ref(false)
  const comboRef = ref<Set<string>>()

  return {
    get isActive() {
      return isActiveRef.value
    },
    set isActive(value) {
      isActiveRef.value = value
    },
    effect: null,
    get combo() {
      return comboRef.value!
    },
    set combo(newCombo) {
      const oldCombo = comboRef.peek()
      if (!oldCombo || !setsEqual(newCombo, oldCombo)) {
        comboRef.value = newCombo
      }
    },
    callback,
    enable(target) {
      return enableKeyBinding(target, this, comboRef)
    },
    setElement(element) {
      return (this.effect = enableEffect(
        getAlienEffects(element, ShadowRootContext.get()),
        enableKeyBinding,
        0,
        element,
        [this, comboRef]
      ))
    },
  }
}

function enableKeyBinding(
  target: Document | HTMLElement,
  binding: KeyBinding,
  comboRef: Ref<Set<string> | undefined>
) {
  const context = contexts.get(target) || new KeyBindingContext(target)
  context.addBinding(binding)
  const observer = observe(comboRef, () => {
    context.checkBinding(binding)
  })
  return () => {
    context.removeBinding(binding)
    observer.dispose()
  }
}

function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) {
    return false
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false
    }
  }
  return true
}

const isWindows = /* @__PURE__ */ navigator.platform.includes('Win')

function prepareCombo(combo: KeyCombo, keys = new Set<string>()) {
  for (let key of toArray(combo)) {
    if (!key) continue
    if (isString(key)) {
      if (isWindows && key === 'Meta') {
        key = 'Control'
      }
      keys.add(key)
    } else {
      prepareCombo(key, keys)
    }
  }
  return keys
}

const contexts = new Map<Document | HTMLElement, KeyBindingContext>()

class KeyBindingContext {
  dispose: () => void
  bindings = new Set<KeyBinding>()
  activeKeys = new Set<string>()

  constructor(readonly target: Document | HTMLElement) {
    if (!isDocument(target) && !supportsKeyDown(target)) {
      throw Error(
        'The target element must be a document or a focusable element.'
      )
    }

    const onKeyChange = (e?: Event) => {
      const event: KeyBindingEvent = {
        target,
        preventDefault: e?.preventDefault.bind(e) || noop,
        stopPropagation: e?.stopPropagation.bind(e) || noop,
      }
      for (const binding of this.bindings) {
        this.checkBinding(binding, event)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      this.activeKeys.add(event.key.toLowerCase())
      onKeyChange(event)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      this.activeKeys.delete(event.key.toLowerCase())
      onKeyChange(event)
    }
    const clear = () => {
      if (this.activeKeys.size > 0) {
        this.activeKeys.clear()
        onKeyChange()
      }
    }

    contexts.set(target, this)

    target.addEventListener('keydown', onKeyDown as any)
    target.addEventListener('keyup', onKeyUp as any)

    target.addEventListener('paste', clear)
    window.addEventListener('blur', clear)

    this.dispose = () => {
      contexts.delete(target)

      target.removeEventListener('keydown', onKeyDown as any)
      target.removeEventListener('keyup', onKeyUp as any)

      target.removeEventListener('paste', clear)
      window.removeEventListener('blur', clear)
    }
  }

  checkBinding(binding: KeyBinding, event?: KeyBindingEvent) {
    if (binding.combo.size > 0 && setsEqual(binding.combo, this.activeKeys)) {
      binding.isActive = true
      binding.callback?.(
        event || {
          target: this.target,
          preventDefault: noop,
          stopPropagation: noop,
        }
      )
    } else {
      binding.isActive = false
    }
  }

  addBinding(binding: KeyBinding) {
    this.bindings.add(binding)
  }

  removeBinding(binding: KeyBinding) {
    this.bindings.delete(binding)
    if (this.bindings.size === 0) {
      this.dispose()
      this.dispose = noop
    }
  }
}

function supportsKeyDown(element: HTMLElement) {
  return element.matches(
    'input, textarea, summary, [contenteditable], [tabindex]'
  )
}
