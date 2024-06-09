import { isArray, isFunction, isPlainObject } from '@alloc/is'
import {
  ArrayRef,
  ReadonlyArrayRef,
  Ref,
  arrayRef,
  ref,
} from '../core/observable'
import { attachRef } from '../functions/attachRef'
import { StateInitializer, createState, defineProperty, keys } from './util'

export type Refs<T extends object> = {
  [K in string & Exclude<keyof T, 'bind'>]: T[K] extends infer Value
    ? Value extends readonly (infer U)[]
      ? Value extends any[]
        ? ArrayRef<U>
        : ReadonlyArrayRef<U>
      : Value
    : never
} & {
  bind<K extends keyof T>(key: K): Ref<T[K]>
}

class RefBindings {
  declare _refs: Record<keyof any, Ref>
  constructor(refs: Record<keyof any, Ref>, context: any) {
    defineProperty(this, '_refs', { value: refs })
    if (!isPlainObject(context)) {
      Object.setPrototypeOf(this, context)
      this.bind = RefBindings.prototype.bind
    }
  }
  bind(key: keyof any) {
    return this._refs[key] || (this as any)[key]
  }
}

export function createRefs<T extends object>(init: T, params: any[]) {
  if (isFunction(init)) {
    init = createState(init as StateInitializer, params) as T
  }
  const refs = {} as Record<keyof T, Ref>
  const values: Refs<T> = new RefBindings(refs, init) as any
  for (const key of keys<Omit<T, 'bind'>>(init)) {
    const value = init[key]
    if (isArray(value)) {
      values[key] = arrayRef(value) as any
    } else {
      attachRef(values, key, (refs[key] = ref(value)))
    }
  }
  return values
}
