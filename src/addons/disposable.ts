export type Disposable<T = {}> = T & { dispose(): void }

export function attachDisposer<T extends object>(
  object: T,
  dispose: () => void
): Disposable<T> {
  Object.defineProperty(object, 'dispose', {
    value: dispose,
    configurable: true,
    enumerable: true,
  })
  return object as any
}

export function isDisposable<T extends {}>(arg: T): arg is Disposable<T> {
  return typeof (arg as any).dispose === 'function'
}

/**
 * Create a `Disposable` object from a function and arguments array.
 *
 * The arguments array is included in the returned object for introspection
 * purposes.
 */
export function createDisposable<Args extends readonly any[]>(
  args: Args,
  dispose: (...args: Args) => void,
  thisArg?: any
): Disposable<{ args: Args; thisArg?: any }>

export function createDisposable(
  args: any[],
  dispose: (...args: any[]) => void,
  thisArg?: any
): Disposable<{ args: readonly any[]; thisArg?: any }> {
  return {
    dispose: dispose.bind(thisArg, ...args),
    args,
    thisArg,
  }
}

export function mergeDisposables(
  ...objects: Disposable[]
): Disposable<{ objects: Disposable[] }> {
  return {
    objects,
    dispose() {
      for (const object of objects) {
        object.dispose()
      }
    },
  }
}
