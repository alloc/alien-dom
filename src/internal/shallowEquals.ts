import { isObject } from '../jsx-dom/util'

export function shallowEquals(a: any, b: any) {
  if (a === b) {
    return true
  }
  if (isObject(a) && isObject(b)) {
    const keys = keysEqual(Object.keys(a), Object.keys(b))
    return keys && keys.every(key => a[key] === b[key])
  }
  return false
}

function keysEqual<K extends keyof any>(left: K[], right: K[]) {
  return (
    left.every(key => right.includes(key)) &&
    right.every(key => left.includes(key)) &&
    left
  )
}
