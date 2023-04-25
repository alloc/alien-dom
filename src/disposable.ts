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
