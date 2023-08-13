import { isString } from '@alloc/is'
import type { Key } from 'ts-key-enum'
import { Disposable, createDisposable } from '../disposable'
import { isDocument } from '../internal/duck'
import { currentComponent } from '../internal/global'
import { kAlienHostProps } from '../internal/symbols'
import { noop, toArray } from '../jsx-dom/util'
import { ref } from '../observable'
import { window } from '../platform'
import { EffectResult, useEffect } from './useEffect'
import { useState } from './useState'

export interface KeyBindingEvent<Target extends Document | HTMLElement = any> {
  target: Target
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

export function useKeyBinding<Target extends Document | HTMLElement>(
  combo: KeyCombo,
  onKeyDown?: (event: KeyBindingEvent<Target>) => EffectResult
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
  effect: Disposable | null
  combo: Set<string>
  onKeyDown: ((event: KeyBindingEvent) => EffectResult) | undefined
  onKeyUp: EffectResult | undefined
  setElement: (element: HTMLElement) => void
  enable: (target: Document | HTMLElement) => EffectResult
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
      enableKeyBinding(target, this)
      return () => {
        disableKeyBinding(target, this)
      }
    },
    setElement(element) {
      if (!element) {
        this.effect?.dispose()
        return
      }
      const hostProps = kAlienHostProps(element)!
      enableKeyBinding(element, this)
      this.effect = hostProps.addEffect(
        createDisposable([element, this], disableKeyBinding)
      )
    },
  }
}

function enableKeyBinding(
  target: Document | HTMLElement,
  binding: KeyBinding
): void {
  const context = contexts.get(target) || new KeyBindingContext(target)
  context.addBinding(binding)
}

function disableKeyBinding(
  target: Document | HTMLElement,
  binding: KeyBinding
): void {
  const context = contexts.get(target)
  context?.removeBinding(binding)
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
  readonly bindings: KeyBinding[] = []
  readonly newBindings: KeyBinding[] = []
  readonly activeKeys = new Set<string>()
  readonly dispose: () => void

  constructor(readonly target: Document | HTMLElement) {
    if (!isDocument(target) && !supportsKeyDown(target)) {
      target.setAttribute('tabindex', '0')
    }

    const { activeKeys } = this

    const onKeyChange = (event?: KeyboardEvent) => {
      let stopPropagation = false

      // Modifier keys must be pressed first.
      const isModifierChange =
        event && modifierKeys.includes(event.key.toLowerCase())

      for (const binding of this.bindings) {
        // If no event is given, the activeKeys set was cleared, so there's no
        // point in checking for a match.
        if (event && comboMatches(binding.combo, activeKeys)) {
          if (stopPropagation || isModifierChange) continue
          if (event.type === 'keydown') {
            binding.isActive = true
            if (binding.onKeyDown) {
              binding.onKeyUp = binding.onKeyDown({
                target,
                repeat: event?.repeat ?? false,
                preventDefault: event?.preventDefault.bind(event) ?? noop,
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
        event?.stopPropagation()
      }

      // Newly added bindings aren't activated until all keys are released, so
      // as to avoid an accidental trigger.
      if (activeKeys.size === 0 && this.newBindings.length > 0) {
        for (const binding of this.newBindings) {
          this.bindings.push(binding)
        }
        this.newBindings.length = 0
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      activeKeys.add(key)
      onKeyChange(event)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      activeKeys.delete(key)
      if (modifierKeys.includes(key)) {
        // When a modifier key is released, all non-modifier keys are dropped
        // from the active keys. This is necessary because the browser can
        // prevent "keyup" events for non-modifier keys from being sent when a
        // native shortcut is triggered.
        activeKeys.forEach(key => {
          if (!modifierKeys.includes(key)) {
            activeKeys.delete(key)
          }
        })
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
      this.bindings.push(binding)
    } else {
      this.newBindings.push(binding)
    }
  }

  removeBinding(binding: KeyBinding) {
    let index = this.newBindings.indexOf(binding)
    if (index != -1) {
      this.newBindings.splice(index, 1)
    } else {
      index = this.bindings.indexOf(binding)
      if (index != -1) {
        this.bindings.splice(index, 1)
      }
    }

    const bindingCount = this.bindings.length + this.newBindings.length
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
