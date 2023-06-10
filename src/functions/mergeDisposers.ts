import { Disposable } from '../disposable'

export function mergeDisposers(...objects: Disposable[]) {
  return () => {
    for (const object of objects) {
      object.dispose()
    }
  }
}
