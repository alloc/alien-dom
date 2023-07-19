import { Disposable } from '../disposable'
import { AlienEffect } from '../effects'
import { isDocument } from '../internal/duck'
import { enableEffect, getAlienEffects } from '../internal/effects'
import { currentComponent } from '../internal/global'
import { ShadowRootContext } from '../jsx-dom/appendChild'
import { noop } from '../jsx-dom/util'
import { ref } from '../observable'
import { useEffect } from './useEffect'
import { useState } from './useState'

export function useKeyBinding(
  command: string | false,
  callback?: (event: KeyboardEvent) => void
) {
  const component = currentComponent.get()!
  const binding = useState(initKeyBinding, callback)

  binding.command = !!command && parseCommand(command)
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
  callback: ((event: KeyboardEvent) => void) | undefined
): {
  /**
   * Equals true when the key binding is activated.
   * @observable
   */
  isActive: boolean
  effect: Disposable<AlienEffect> | null
  command: Set<string> | false
  callback: ((event: KeyboardEvent) => void) | undefined
  setElement: (element: HTMLElement) => void
  enable: (target: Document | HTMLElement) => () => void
} => {
  const isActiveRef = ref(false)
  let command: Set<string> | false

  return {
    get isActive() {
      return isActiveRef.value
    },
    set isActive(value) {
      isActiveRef.value = value
    },
    effect: null,
    get command() {
      return command
    },
    set command(newCommand) {
      command = newCommand
      isActiveRef.value = false
    },
    callback,
    enable(target) {
      return enableKeyBinding(target, this)
    },
    setElement(element) {
      return (this.effect = enableEffect(
        getAlienEffects(element, ShadowRootContext.get()),
        enableKeyBinding,
        0,
        element,
        [this]
      ))
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

function parseCommand(command: string) {
  const keys = new Set<string>()
  for (let start = 0; start < command.length; ) {
    let end = command.indexOf('+', start)
    if (end === -1) {
      end = command.length
    }
    let key = command.slice(start, end).toLowerCase()
    if (isWindows && key === 'meta') {
      key = 'control'
    }
    keys.add(key)
    start = end + 1
  }
  return keys
}

const contexts = new Map<Document | HTMLElement, KeyBindingContext>()

class KeyBindingContext {
  dispose: () => void
  bindings = new Set<KeyBinding>()

  constructor(readonly target: Document | HTMLElement) {
    if (!isDocument(target) && !supportsKeyDown(target)) {
      throw Error(
        'The target element must be a document or a focusable element.'
      )
    }

    const activeKeys = new Set<string>()
    const onKeyChange = (event: KeyboardEvent) => {
      for (const binding of this.bindings) {
        if (binding.command && setsEqual(binding.command, activeKeys)) {
          binding.isActive = true
          binding.callback?.(event)
        } else {
          binding.isActive = false
        }
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      activeKeys.add(event.key.toLowerCase())
      onKeyChange(event)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      activeKeys.delete(event.key.toLowerCase())
      onKeyChange(event)
    }
    const clear = () => {
      activeKeys.clear()
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
