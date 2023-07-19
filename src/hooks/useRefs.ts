import { isArray } from '@alloc/is'
import { attachRef } from '../functions/attachRef'
import { keys } from '../jsx-dom/util'
import { ArrayRef, Ref, arrayRef, ref } from '../observable'
import { useState } from './useState'

/**
 * Like `useState` but properties are observable. Array properties are wrapped
 * with `ArrayRef` objects. Note that destructured values won't be observable.
 */
export function useRefs<T extends object>(init: T): Refs<T> {
  return useState(createRefs, init)
}

export type Refs<T extends object> = {
  [K in string & Exclude<keyof T, 'bind'>]: T[K] extends readonly (infer U)[]
    ? ArrayRef<U>
    : T[K]
} & {
  bind<K extends keyof T>(key: K): Ref<T[K]>
}

class RefBindings {
  constructor(private _refs: Record<keyof any, Ref>) {}
  bind(key: keyof any) {
    return this._refs[key] || (this as any)[key]
  }
}

const createRefs = <T extends object>(init: T) => {
  const refs = {} as Record<keyof T, Ref>
  const values: Refs<T> = new RefBindings(refs) as any
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
