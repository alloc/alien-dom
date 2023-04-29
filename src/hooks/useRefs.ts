import { attachRef, batch, ref } from '../signals'
import { useState } from './useState'
import { useForceUpdate } from './useForceUpdate'

const processedValues = new WeakSet()

export function useRefs<T extends object>(values: T) {
  const state = useState(initialState, values)
  const forceUpdate = useForceUpdate()
}

const initialState = (state: any, forceUpdate: () => void): any => {
  return new Proxy(state, {
    get(state, key) {
      if (Object.getOwnPropertyDescriptor(state, key)?.writable) {
        attachRef(state, key, ref(state[key]))
      }
      return state[key]
    },
    set(state, key, value) {
      if (state.hasOwnProperty(key)) {
        state[key] = value
      } else {
        attachRef(state, key, ref(value))
        forceUpdate()
      }
      return true
    },
  })
}
