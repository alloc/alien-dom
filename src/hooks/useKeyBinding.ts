import { isString } from '@alloc/is'
import type { Key } from 'ts-key-enum'
import { Disposable } from '../disposable'
import { AlienEffect } from '../effects'
import { isDocument } from '../internal/duck'
import { enableEffect, getAlienEffects } from '../internal/effects'
import { currentComponent } from '../internal/global'
import { ShadowRootContext } from '../jsx-dom/appendChild'
import { noop, toArray } from '../jsx-dom/util'
import { ref } from '../observable'
import { EffectResult, useEffect } from './useEffect'
import { useState } from './useState'

export interface KeyBindingEvent {
  target: Document | HTMLElement
  repeat: boolean
  stopPropagation(): void
  preventDefault(): void
}

type Split<T extends string> = T extends `${infer First}${infer Rest}`
  ? First | Split<Rest>
  : never

type Letter = Split<'ABCDEFGHIJKLMNOPQRSTUVWXYZ'>
type Digit = Split<'0123456789'>
type Symbol = Split<'!@#$%^&*()_+-=[]{}|\\;:,.?<>/\'" '>

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
  onKeyDown?: (event: KeyBindingEvent) => EffectResult
) {
  const component = currentComponent.get()!
  const binding = useState(initKeyBinding, onKeyDown)

  binding.combo = prepareCombo(combo)
  binding.onKeyDown = onKeyDown

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
  onKeyDown: ((event: KeyBindingEvent) => EffectResult) | undefined
  onKeyUp: EffectResult | undefined
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
    onKeyDown: callback,
    onKeyUp: undefined,
    enable(target) {
      return enableKeyBinding(target, this)
    },
    setElement(element) {
      if (!element) {
        this.effect?.dispose()
        return
      }
      this.effect = enableEffect(
        getAlienEffects(element, ShadowRootContext.get()),
        enableKeyBinding,
        0,
        element,
        [this]
      )
    },
  }
}

function enableKeyBinding(target: Document | HTMLElement, binding: KeyBinding) {
  const context = contexts.get(target) || new KeyBindingContext(target)
  context.addBinding(binding)
  return () => {
    context.removeBinding(binding)
  }
}

const isWindows = /* @__PURE__ */ navigator.platform.includes('Win')

function prepareCombo(combo: KeyCombo, keys = new Set<string>()) {
  for (let key of toArray(combo)) {
    if (!key) continue
    if (isString(key)) {
      if (isWindows && key === 'Meta') {
        key = 'Control'
      }
      keys.add(key.toLowerCase())
    } else {
      prepareCombo(key, keys)
    }
  }
  return keys
}

const shiftedKeys = '~!@#$%^&*()_+{}|:"<>?'
const unshiftedKeys = "`1234567890-=[]\\;',./"
const modifierKeys = ['shift', 'control', 'alt', 'meta', 'fn', 'hyper', 'super']

const contexts = new Map<Document | HTMLElement, KeyBindingContext>()

class KeyBindingContext {
  readonly bindings = new Set<KeyBinding>()
  readonly newBindings = new Set<KeyBinding>()
  readonly activeKeys = new Set<string>()
  readonly dispose: () => void

  constructor(readonly target: Document | HTMLElement) {
    if (!isDocument(target) && !supportsKeyDown(target)) {
      throw Error(
        'The target element must be a document or a focusable element.'
      )
    }

    const { activeKeys } = this

    const onKeyChange = (e?: KeyboardEvent) => {
      let stopPropagation = false

      for (const binding of this.bindings) {
        if (comboMatches(binding.combo, activeKeys)) {
          if (stopPropagation) continue
          if (e?.type === 'keydown') {
            binding.isActive = true
            if (binding.onKeyDown) {
              binding.onKeyUp = binding.onKeyDown({
                target,
                repeat: e?.repeat ?? false,
                preventDefault: e?.preventDefault.bind(e) ?? noop,
                stopPropagation() {
                  stopPropagation = true
                },
              })
            }
          }
        } else if (binding.isActive) {
          binding.isActive = false
          if (binding.onKeyUp) {
            binding.onKeyUp()
            binding.onKeyUp = undefined
          }
        }
      }

      if (stopPropagation) {
        e?.stopPropagation()
      }

      // Newly added bindings aren't activated until all keys are released, so
      // as to avoid an accidental trigger.
      if (activeKeys.size === 0 && this.newBindings.size > 0) {
        for (const binding of this.newBindings) {
          this.bindings.add(binding)
        }
        this.newBindings.clear()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      activeKeys.add(key)
      onKeyChange(event)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (modifierKeys.includes(key)) {
        activeKeys.clear()
      } else {
        activeKeys.delete(key)
      }
      onKeyChange(event)
    }
    const clear = () => {
      if (activeKeys.size > 0) {
        activeKeys.clear()
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

  addBinding(binding: KeyBinding) {
    if (this.activeKeys.size === 0) {
      this.bindings.add(binding)
    } else {
      this.newBindings.add(binding)
    }
  }

  removeBinding(binding: KeyBinding) {
    this.newBindings.delete(binding)
    this.bindings.delete(binding)

    const bindingCount = this.bindings.size + this.newBindings.size
    if (bindingCount === 0) {
      this.dispose()
    }
  }
}

function supportsKeyDown(element: HTMLElement) {
  return element.matches(
    'input, textarea, summary, [contenteditable], [tabindex]'
  )
}

function comboMatches(combo: Set<string>, activeKeys: Set<string>) {
  if (combo.size === 0) {
    return false
  }

  let shiftExpected = combo.has('shift')
  let shiftImplied = false

  for (let key of combo) {
    if (key.length === 1) {
      if (shiftExpected) {
        const index = unshiftedKeys.indexOf(key)
        if (index >= 0) {
          key = shiftedKeys[index]
        }
      } else if (shiftedKeys.includes(key)) {
        shiftImplied = true
      }
    }
    if (!activeKeys.has(key)) {
      return false
    }
  }

  if (shiftImplied && activeKeys.has('shift')) {
    return combo.size === activeKeys.size - 1
  }
  return combo.size === activeKeys.size
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
