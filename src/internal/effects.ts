import { isFunction } from '@alloc/is'
import { Disposable, attachDisposer } from '../disposable'
import { AlienEffect, AlienEffects } from '../effects'
import { noop } from '../jsx-dom/util'
import { currentEffects } from './global'
import { kAlienEffects, kAlienNewEffects } from './symbols'
import { AnyElement } from './types'

export function getAlienEffects<T extends AnyElement>(
  element: T,
  rootNode?: Node
): AlienEffects<T> {
  const newEffects = kAlienNewEffects(element)
  return (
    newEffects || kAlienEffects(element) || new AlienEffects(element, rootNode)
  )
}

export const enum EffectFlags {
  Once = 1,
  Async = 2,
}

export function enableEffect<Effect extends AlienEffect<any, any>>(
  context: AlienEffects,
  effect: Effect,
  flags: EffectFlags | 0,
  target: any,
  args: any[] | false
): Disposable<Effect> {
  effect.target = target
  if (args !== false) {
    effect.args = args
  }

  if (flags & EffectFlags.Once) {
    effect.once = true
  }
  if (flags & EffectFlags.Async) {
    effect.async = true
  }

  context.effects ||= new Set()
  context.effects.add(effect)
  if (context.enabled) {
    // If the effect is being retargeted, this is needed.
    disableEffect(effect)
    currentEffects.push(context)
    try {
      runEffect(effect, context)
    } finally {
      context.currentEffect = null
      currentEffects.pop(context)
    }
  }

  return attachDisposer(effect, () => {
    context.effects?.delete(effect)
    disableEffect(effect)
  })
}

export function runEffect(
  effect: AlienEffect<any, any>,
  context?: AlienEffects | null,
  flags: EffectFlags | 0 = 0,
  target = effect.target,
  args = effect.args || []
) {
  let abortCtrl!: AbortController

  const isAsync = effect.async || !!(flags & EffectFlags.Async)
  if (isAsync) {
    if (context) {
      abortCtrl = context.abortCtrl ||= new AbortController()
    } else {
      abortCtrl = new AbortController()
    }
    args = [abortCtrl.signal, ...args]
  }

  if (context) {
    context.currentEffect = effect
    effect.context = context
  }

  const disable = effect(target, ...args)
  if (disable instanceof Promise) {
    if (!isAsync) {
      throw Error('Cannot return promise from non-async effect')
    }
    effect.disable = abortCtrl.abort.bind(abortCtrl)
    disable.then(
      disable => {
        effect.disable = isFunction(disable) ? disable : noop
      },
      error => {
        if (error.name != 'AbortError') {
          console.error(error)
        }
      }
    )
  } else if (isFunction(disable)) {
    effect.disable = disable
  }
}

export function disableEffect(effect: AlienEffect) {
  const { disable } = effect
  effect.context = undefined
  if (disable) {
    effect.disable = undefined
    disable()
  }
}

export function disableEffects(context: AlienEffects, destroy?: boolean) {
  context.abortCtrl?.abort()
  context.effects?.forEach(effect => {
    disableEffect(effect)
    if (effect.once) {
      context.effects?.delete(effect)
    }
  })
  context.abortCtrl = undefined
  if (destroy) {
    context.effects = undefined
  }
}
