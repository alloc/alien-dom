import { useEffect, useMemo } from '../hooks'
import { Observable, createObservableState } from '../internal/createRefs'

type Fn = (...args: any[]) => any
type FnPropertyOf<T extends object> = {
  [K in keyof T]: T[K] extends Fn ? K : never
}[keyof T]

export class Controller<State extends object = any, Key = any> {
  protected instances: Map<any, any> | undefined = undefined
  constructor(protected singleton = false) {}

  exists(key: Key): boolean {
    return Boolean(this.instances?.has(key))
  }

  /**
   * Set the entire state of an instance. Any properties not provided will be
   * set to `undefined`.
   */
  set(
    arg1: [Key] extends [void] ? State : Key,
    arg2: [Key] extends [void] ? void : State
  ): void {
    const key = this.singleton ? void 0 : arg1
    const instance = this.instances?.get(key)
    if (!instance) {
      throw Error(`key ${key} does not exist`)
    }
    const values = (this.singleton ? arg1 : arg2) as any
    for (const prop in instance) {
      if (!(prop in values)) {
        instance[prop] = undefined
      }
    }
    for (const [prop, value] of Object.entries(values)) {
      instance[prop] = value
    }
  }

  /**
   * Patch the state of an instance. Any properties not provided will be left
   * unchanged.
   */
  patch(
    arg1: [Key] extends [void] ? Partial<State> : Key,
    arg2: [Key] extends [void] ? void : Partial<State>
  ): void {
    const key = this.singleton ? void 0 : arg1
    const instance = this.instances?.get(key)
    if (!instance) {
      throw Error(`key ${key} does not exist`)
    }
    Object.assign(instance, this.singleton ? arg1 : arg2)
  }

  protected call<P extends FnPropertyOf<State>>(
    key: Key,
    method: P,
    ...args: Parameters<Extract<State[P], Fn>>
  ): ReturnType<Extract<State[P], Fn>> {
    if (!this.instances?.has(key)) {
      throw Error(`key ${key} does not exist`)
    }
    // Prefer not to throw since the caller can't check if the method actually exists.
    return this.instances.get(key)[method]?.(...args)
  }
}

export type ControllerProxy<State extends object, Key> = unknown &
  Controller<State, Key> & {
    [P in FnPropertyOf<State>]-?: (
      ...args: Parameters<Extract<State[P], Fn>>
    ) => ReturnType<Extract<State[P], Fn>>
  }

export function defineController<State extends object>(
  singleton: true
): ControllerProxy<State, void>

export function defineController<Key, State extends object>(
  singleton?: false
): ControllerProxy<State, Key>

export function defineController(singleton?: boolean) {
  return new Proxy(new Controller(singleton), {
    get(ctrl: any, prop: string) {
      if (ctrl[prop] !== undefined || prop in ctrl) {
        return ctrl[prop]
      }
      // Anything else is a method call.
      return ctrl.singleton
        ? ctrl.call.bind(ctrl, void 0, prop)
        : function (key: any, ...args: any[]) {
            return ctrl.call(key, prop, ...args)
          }
    },
  })
}

/**
 * Only one component can use a controller instance at a time. The `init`
 * function should declare every possible property, even if the initial value is
 * `undefined`. Every property in the returned object is observable.
 */
export function useController<State extends object, Params extends any[]>(
  ctrl: Controller<State, void>,
  init: new (...params: Params) => State,
  ...params: Params
): Observable<State>

export function useController<Key, State extends object, Params extends any[]>(
  ctrl: Controller<State, Key>,
  key: Key,
  init: new (...params: Params) => State,
  ...params: Params
): Observable<State>

export function useController<State extends object, Params extends any[]>(
  ctrl: Controller<State, void>,
  init: (...params: Params) => State,
  ...params: Params
): Observable<State>

export function useController<Key, State extends object, Params extends any[]>(
  ctrl: Controller<State, Key>,
  key: Key,
  init: (...params: Params) => State,
  ...params: Params
): Observable<State>

export function useController(
  ctrl: Controller,
  key?: any,
  ...params: any[]
): any {
  const singleton = ctrl['singleton']
  const init = singleton ? key : params.shift()
  key = singleton ? void 0 : key

  const instance = useMemo(() => {
    if (ctrl['instances']?.has(key)) {
      throw Error(`key ${key} already exists`)
    }
    const instance = createObservableState(init, params)
    ctrl['instances'] ||= new Map()
    ctrl['instances'].set(key, instance)
    return instance
  }, [key])

  useEffect(
    () => () => {
      const instances = ctrl['instances']!
      if (instances.delete(key) && !instances.size) {
        ctrl['instances'] = undefined
      }
    },
    [instance]
  )

  return instance
}
