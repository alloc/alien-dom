export function useAutoBind<T extends object>(target: T): Readonly<T> {
  return new Proxy(target, traps)
}

const traps: ProxyHandler<any> = {
  get(target, key) {
    const value = Reflect.get(target, key)
    if (typeof value === 'function') {
      return value.bind(target)
    }
    return value
  },
}
