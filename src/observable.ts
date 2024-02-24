import { isFunction, isString } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { Disposable, attachDisposer } from './addons/disposable'
import { Promisable } from './addons/promises'
import { createSymbolProperty } from './internal/symbolProperty'
import { noop } from './internal/util'

const kRefType = Symbol.for('refType')

export type ObservableHooks = {
  /**
   * A ref was changed and the given observer was notified.
   */
  observe(
    observer: Observer,
    ref: ReadonlyRef<any>,
    newValue: any,
    oldValue: any
  ): void
  /**
   * A ref was observed or unobserved.
   */
  isObserved(
    ref: ReadonlyRef<any>,
    observer: Observer,
    isObserved: boolean
  ): void
  /**
   * An update was completed or threw an error.
   */
  didUpdate(observer: Observer | ComputedRef, error: any, result: any): void
}

declare module globalThis {
  var __OBSERVABLE_HOOKS__: ObservableHooks | Falsy
}

let hooks = DEV && globalThis.__OBSERVABLE_HOOKS__
if (DEV) {
  Object.defineProperty(globalThis, '__OBSERVABLE_HOOKS__', {
    configurable: true,
    get: () => hooks,
    set(newHooks) {
      hooks = newHooks || false
    },
  })
}

type InternalRef<T> = Ref<T> & {
  _value: T
  _observers: Set<Observer>
  _depth: number
  _isObserved: (observer: Observer, isObserved: boolean) => void
}

const unseenAccess = (ref: InternalRef<any>) => ref._value

let nextDebugId = 1
let access = unseenAccess

export abstract class ReadonlyRef<T = any> {
  readonly debugId: string | number | undefined
  protected _observers = new Set<Observer>()
  protected get _depth() {
    return 0
  }

  constructor(protected _value: T, debugId?: string | number) {
    if (DEV) this.debugId = debugId ?? nextDebugId++
  }

  /**
   * In addition to adding/removing an observer, computed refs use this method
   * to switch between eager and lazy computation mode.
   */
  protected _isObserved(observer: Observer, isObserved: boolean) {
    if (isObserved === this._observers.has(observer)) {
      return
    }
    if (DEV && hooks) {
      peek(hooks.isObserved, this, observer, isObserved)
    }
    if (isObserved) {
      this._observers.add(observer)
    } else {
      this._observers.delete(observer)
    }
  }

  get [kRefType]() {
    return 'ReadonlyRef'
  }

  get value(): T {
    return access(this as any)
  }

  peek() {
    return this._value
  }

  /**
   * Create a `ComputedRef` whose value is derived from `this.value` using the
   * given function.
   */
  computedMap<U>(compute: (value: T) => U) {
    return computed(() => compute(this.value))
  }

  /**
   * Create a `ComputedRef` that does the following:
   *
   * If `this.value` is truthy, use the first argument. Otherwise, use the
   * second argument (if none is provided, return undefined). Function arguments
   * are called within the `computed` function.
   */
  computedIf<True>(
    trueValue: ComputedInput<True>
  ): ComputedRef<True | undefined>
  computedIf<True, False>(
    trueValue: ComputedInput<True>,
    falseValue: ComputedInput<False>
  ): ComputedRef<True | False>
  computedIf(trueValue: any, falseValue?: any): ComputedRef<any> {
    return computed(() =>
      this.value
        ? evaluateInput(trueValue)
        : falseValue !== undefined
        ? evaluateInput(falseValue)
        : undefined
    )
  }

  /**
   * Create a `ComputedRef` that uses the first argument if `this.value` is
   * falsy. Otherwise, undefined is used. Function arguments are called within
   * the `computed` function.
   */
  computedElse<False>(
    falseValue: ComputedInput<False>
  ): ComputedRef<False | undefined> {
    return computed(() => (this.value ? undefined : evaluateInput(falseValue)))
  }
}

export class Ref<T = any> extends ReadonlyRef<T> {
  get [kRefType]() {
    return 'Ref'
  }

  set(arg: T | ((value: T) => T)) {
    if (isFunction(arg)) {
      arg = arg(this._value)
    }
    this.value = arg
    return arg
  }

  /** Use the negation operator on the current value. */
  toggle() {
    this.value = !this.value as any
  }
}

export interface Ref<T> {
  readonly 0: T
  readonly 1: (arg: T | ((value: T) => T)) => T
  set value(newValue: T)
}

function getValue<T>(this: ReadonlyRef<T>) {
  return access(this as any)
}

function setValue<T>(this: ReadonlyRef<T>, newValue: T) {
  const oldValue = this._value
  if (newValue !== oldValue) {
    this._value = newValue

    this._observers.forEach(observer => {
      observer.observe(this, newValue, oldValue)
      updateHasSideEffects ||= !observer.isObservablyPure()
    })

    if (updateQueue.size > 0) {
      scheduleUpdates()
    }
  }
}

Object.defineProperties(Ref.prototype, {
  0: { get: getValue },
  1: {
    get(this: Ref) {
      return this.set.bind(this)
    },
  },
  [Symbol.iterator]: {
    value: function* () {
      yield this[0]
      yield this[1]
    },
  },
  value: {
    get: getValue,
    set: setValue,
  },
})

function assignPrototype(
  prototype: any,
  newProperties: Record<string, any>
): void {
  for (const key in newProperties) {
    Object.defineProperty(prototype, key, {
      value: newProperties[key],
      writable: true,
      configurable: true,
    })
  }
}

//
// Array refs
//

export class ArrayRef<T> extends ReadonlyRef<readonly T[]> {}
export interface ArrayRef<T>
  extends ArrayMutators<T>,
    ArrayIterators<T>,
    Iterable<T> {
  [index: number]: T
  length: number
  set value(newValue: readonly T[])
  /**
   * Observe a single index in the array. Any time the array is mutated, this
   * will check the given `index` to see if a new value exists there.
   */
  observe(index: number): ComputedRef<T>
}

interface ArrayMutators<T> {
  push(...items: T[]): number
  pop(): T | undefined
  shift(): T | undefined
  unshift(...items: T[]): number
  splice(start: number, deleteCount?: number, ...items: T[]): T[]
}

interface ArrayIterators<T> {
  at(index: number): T | undefined
  indexOf(searchElement: T, fromIndex?: number): number
  includes(searchElement: T, fromIndex?: number): boolean
  map<U>(
    callbackfn: (value: T, index: number, array: T[]) => U,
    thisArg?: any
  ): U[]
}

const numberRE = /^\d+$/
const kLengthRef =
  /* @__PURE__ */ createSymbolProperty<Ref<number>>('lengthRef')

const updateLengthRef = (
  ref: Ref<number> | undefined,
  oldArray: any[],
  newArray: any[]
) => {
  if (ref && oldArray.length !== newArray.length) {
    ref.value = newArray.length
  }
}

const arrayTraps: ProxyHandler<InternalRef<any[]>> = {
  get(target, key) {
    if (key === Symbol.iterator) {
      return () => target.value[Symbol.iterator]()
    }
    if (typeof key === 'string' && numberRE.test(key)) {
      // Indexed access is not observable.
      return target._value[+key]
    }
    if (key === 'length') {
      if (access === unseenAccess) {
        return target._value.length
      }
      let lengthRef = kLengthRef(target)
      if (!lengthRef) {
        kLengthRef(target, (lengthRef = new Ref(target._value.length)))
      }
      return lengthRef.value
    }
    return Reflect.get(target, key)
  },
  set(target, key, newValue) {
    if (typeof key === 'string' && numberRE.test(key)) {
      const index = +key
      const oldArray = target._value
      const isExpanding = index >= oldArray.length
      if (isExpanding || newValue !== oldArray[index]) {
        const newArray = oldArray.slice()
        newArray[index] = newValue
        setValue.call(target, newArray)
        if (isExpanding) {
          updateLengthRef(kLengthRef(target), oldArray, newArray)
        }
      }
      return true
    }
    if (key === 'length') {
      const oldArray = target._value
      if (newValue !== oldArray.length) {
        const newArray = oldArray.slice(0, newValue)
        if (newValue > oldArray.length) {
          newArray.length = newValue
        }
        setValue.call(target, newArray)
        updateLengthRef(kLengthRef(target), oldArray, newArray)
      }
      return true
    }
    if (key === 'value') {
      const oldArray = target._value
      if (newValue !== oldArray) {
        setValue.call(target, newValue)
        updateLengthRef(kLengthRef(target), oldArray, newValue)
      }
      return true
    }
    return Reflect.set(target, key, newValue)
  },
  has(target, key) {
    if (typeof key === 'string' && numberRE.test(key)) {
      // Indexed access is not observable.
      return +key < target._value.length
    }
    return Reflect.has(target, key)
  },
}

/**
 * Create an observable array.
 *
 * Note: The array is cloned before each mutation.
 */
export let arrayRef = <T>(
  init?: readonly T[],
  debugId?: string | number
): ArrayRef<T> => {
  arrayRef = (init, debugId) =>
    new Proxy(new ArrayRef(init || [], debugId), arrayTraps as any)

  const arrayMutator = (name: keyof ArrayMutators<any>) =>
    function (this: InternalRef<any>, ...args: any[]) {
      const oldArray = this._value
      const newArray = oldArray.slice()
      const result = newArray[name](...args)
      setValue.call(this, newArray)
      updateLengthRef(kLengthRef(this), oldArray, newArray)
      return result
    }

  const arrayEnumerator = (name: keyof ArrayIterators<any>) =>
    function (this: InternalRef<any>, ...args: any[]) {
      return this.value[name](...args)
    }

  assignPrototype(ArrayRef.prototype, {
    [kRefType]: 'ArrayRef',
    observe(this: InternalRef<any[]>, index: number) {
      return computed(
        () => this.value[index],
        DEV && isString(this.debugId) ? `${this.debugId}[${index}]` : undefined
      )
    },
    push: arrayMutator('push'),
    pop: arrayMutator('pop'),
    shift: arrayMutator('shift'),
    unshift: arrayMutator('unshift'),
    splice: arrayMutator('splice'),
    at: arrayEnumerator('at'),
    indexOf: arrayEnumerator('indexOf'),
    includes: arrayEnumerator('includes'),
    map: arrayEnumerator('map'),
  })

  return arrayRef(init, debugId)
}

// Ref maps

export class RefMap<K, V> {
  protected _map: Map<K, Ref<V>>
  protected _sizeRef: Ref<number>
  protected _keysRef: ArrayRef<K>

  constructor(entries?: Iterable<[K, V]>) {
    this._map = new Map(
      entries && Array.from(entries, entry => [entry[0], ref(entry[1])])
    )
    this._sizeRef = ref(this._map.size)
    this._keysRef = arrayRef(Array.from(this._map.keys()))
  }

  get size() {
    return this._sizeRef.value
  }

  get(key: K): V | undefined {
    return computed((): V | undefined => {
      const value = this._map.get(key)
      if (value) {
        return value.value
      }
      // Recompute if the key is added.
      computed(() => this._keysRef.includes(key)).value
      return undefined
    }).value
  }

  peek(key: K) {
    return this._map.get(key)?.peek()
  }

  peekSize() {
    return this._sizeRef.peek()
  }

  set(key: K, newValue: V) {
    let value = this._map.get(key)
    if (value) {
      value.value = newValue
    } else {
      this._map.set(key, (value = ref(newValue)))
      this._keysRef.push(key)
      this._sizeRef.value++
    }
  }

  delete(key: K) {
    if (this._map.delete(key)) {
      const keys = this._keysRef.peek()
      this._keysRef.splice(keys.indexOf(key), 1)
      this._sizeRef.value--
    }
  }

  clear() {
    this._map.clear()
    this._keysRef.length = 0
    this._sizeRef.value = 0
  }

  forEach(callback: (value: V, key: K, map: RefMap<K, V>) => void) {
    this._sizeRef.value // <- observe added/removed keys
    this._map.forEach((value, key) => callback(value.value, key, this))
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    const keys = this._keysRef.value
    let index = 0
    return {
      next: () => {
        if (index < keys.length) {
          const key = keys[index++]
          const value = this._map.get(key)!
          return { value: [key, value.peek()], done: false }
        }
        return { value: undefined, done: true }
      },
    }
  }
}

//
// Plain observers
//

const passThrough = (result: any) => result
const alwaysFalse = () => false

let nextObserverId = 1

export declare namespace Observer {
  type WillUpdateFn = (
    ref: ReadonlyRef<any>,
    newValue: any,
    oldValue: any
  ) => void
  type OnUpdateFn = (result: any) => any
}

export class Observer {
  readonly id = nextObserverId++
  refs = new Set<InternalRef<any>>()
  depth = 0

  constructor() {
    this.isObservablyPure ||= alwaysFalse
    this.nextCompute ||= noop
    this.didObserve ||= noop
    this.willUpdate ||= noop
    this.onUpdate ||= passThrough
  }

  protected _access(ref: InternalRef<any>, oldRefs: Set<InternalRef<any>>) {
    ref._isObserved(this, true)
    oldRefs.delete(ref)
    this.refs.add(ref)
    this.depth = Math.max(this.depth, ref._depth + 1)
    return ref._value
  }

  protected _update(sync: boolean, oldRefs: Set<InternalRef<any>>) {
    this.refs.clear()
    this.depth = 0

    let error: any
    let result: any

    try {
      result = this.nextCompute(oldRefs)
      oldRefs.forEach(ref => {
        ref._isObserved(this, false)
      })

      result = this.onUpdate(result)
    } catch (e) {
      error = e
      if (!sync) {
        console.error(error)
      }
    }

    if (DEV && hooks) {
      peek(hooks.didUpdate, this, error, result)
    }

    if (sync) {
      if (error) throw error
      return result
    }
  }

  /**
   * Run the `compute` function synchronously, observing any accessed refs.
   *
   * When those refs change, the `compute` function will run again in the next
   * microtask (unless you call this method before then).
   */
  update<T>(compute?: (oldRefs: Set<InternalRef<any>>) => T): T {
    // Prevent a double update.
    updateQueue.delete(this)

    const oldRefs = new Set(this.refs)
    const parentAccess = access
    access = ref => this._access(ref, oldRefs)
    try {
      if (compute) {
        this.nextCompute = compute
      }
      return this._update(true, oldRefs)
    } finally {
      access = parentAccess
    }
  }

  /** Called when a ref has a new value. */
  observe(ref: ReadonlyRef<any>, newValue: any, oldValue: any) {
    if (DEV && hooks) {
      hooks.observe(this, ref, newValue, oldValue)
    }
    this.didObserve(ref, newValue, oldValue)
    this.scheduleUpdate(ref, newValue, oldValue)
  }

  scheduleUpdate(ref?: ReadonlyRef<any>, newValue?: any, oldValue?: any) {
    if (!updateQueue.has(this)) {
      updateQueue.add(this)
      if (ref) {
        this.willUpdate(ref, newValue, oldValue)
      }
      // If no ref is provided, this is a forced update, which means the update
      // queue may not be flushed unless we ask for it here.
      else {
        updateHasSideEffects ||= !this.isObservablyPure()
        scheduleUpdates()
      }
    }
  }

  /**
   * Note: A disposed observer can still be reused.
   */
  dispose() {
    updateQueue.delete(this)
    this.refs.forEach(ref => {
      ref._isObserved(this, false)
    })
    // Ensure subsequent calls to dispose are no-ops.
    this.refs = new Set()
  }

  /**
   * Returns a bound `dispose` method.
   */
  get destructor() {
    return this.dispose.bind(this)
  }
}

// These methods can be implemented by a subclass or set directly.
export interface Observer {
  /**
   * When true, this observer will run *after* all other observers in the queue.
   * This is useful to ensure all side effects have been applied before this
   * observer runs.
   */
  isObservablyPure(): boolean
  nextCompute(oldRefs: Set<InternalRef<any>>): any
  /**
   * Called whenever an observed ref is changed.
   */
  didObserve(ref: ReadonlyRef<any>, newValue: any, oldValue: any): void
  /**
   * Called when the observer has been queued to run.
   */
  willUpdate(ref: ReadonlyRef<any>, newValue: any, oldValue: any): void
  /**
   * Called with the result of the `compute` function. You must either return it
   * or return a new result.
   */
  onUpdate(result: any): any
}

//
// Computed refs
//

const emptySymbol: any = Symbol('empty')

export class ComputedRef<T = any> extends ReadonlyRef<T> {
  protected _observer: Observer | null = null
  protected get _depth() {
    return this._observer?.depth ?? 0
  }

  constructor(protected compute: () => T, debugId?: string | number) {
    super(emptySymbol, debugId)
  }

  protected _isObserved(observer: Observer, isObserved: boolean) {
    super._isObserved(observer, isObserved)

    // Destroy our own observer once the ref is no longer observed.
    if (!isObserved) {
      if (this._observers.size) return
      this._observer?.dispose()
      this._observer = null
      // Don't waste memory on a value that may not be needed.
      this._value = emptySymbol
    }
    // Create our own observer once the ref is observed.
    else if (!this._observer) {
      this._observer = new ComputedRef.Observer(this)
      this._observer.update()
    }
  }

  get [kRefType]() {
    return 'ComputedRef'
  }

  get value(): T {
    if (access !== unseenAccess) {
      if (this._observer && this._value === emptySymbol) {
        this._observer.update()
      }
      return super.value
    }
    return this.peek()
  }

  peek() {
    if (this._value === emptySymbol) {
      if (!this._observer) {
        return this.compute()
      }
      this._observer.update()
    }
    return this._value
  }

  private static Observer = class extends Observer {
    oldValue = emptySymbol
    constructor(readonly ref: ComputedRef) {
      super()
    }
    // The computed ref is cleared immediately upon an observed ref being
    // changed to prevent peeks from returning a possibly stale value.
    willUpdate() {
      this.oldValue = this.ref._value
      this.ref._value = emptySymbol
    }
    nextCompute() {
      return this.ref.compute()
    }
    onUpdate(result: any) {
      // Reset to the old value before the setValue call.
      this.ref._value = this.oldValue
      this.oldValue = undefined

      setValue.call(this.ref, result)
      return result
    }
  }
}

//
// Single ref observer
//

class TargetObserver<T = any> extends Observer {
  private oldValue = emptySymbol
  constructor(
    readonly target: ReadonlyRef<T>,
    readonly onChange: (newValue: T, oldValue: T, ref: ReadonlyRef<T>) => void
  ) {
    super()
  }
  willUpdate(_ref: ReadonlyRef, _newValue: any, oldValue: any) {
    if (this.oldValue === emptySymbol) {
      this.oldValue = oldValue
    }
  }
  nextCompute() {
    return access(this.target as any)
  }
  onUpdate(newValue: any) {
    // Skip the reaction if triggered by the initial value.
    if (this.oldValue !== emptySymbol) {
      const { oldValue } = this
      this.oldValue = emptySymbol

      if (newValue !== oldValue) {
        peek(TargetObserver.onChange, this, newValue, oldValue)
      }
    }
  }
  static onChange(observer: TargetObserver, newValue: any, oldValue: any) {
    observer.onChange(newValue, oldValue, observer.target)
  }
}

//
// Update loop
//

const updateQueue = new Set<Observer>()
let updateScheduled = false
let updateHasSideEffects = false

function scheduleUpdates() {
  if (!updateScheduled) {
    updateScheduled = true
    Promise.resolve().then(processUpdates)
  }
}

// Observers with deeper dependencies are updated last.
function sortObservers(a: Observer, b: Observer) {
  if (a.depth < b.depth) {
    return -1
  }
  if (b.depth < a.depth) {
    return 1
  }
  // Sort oldest first.
  return a.id - b.id
}

type InternalObserver = Observer & {
  _access: (ref: InternalRef<any>, oldRefs?: Set<InternalRef<any>>) => any
  _update: (sync?: boolean, oldRefs?: Set<InternalRef<any>>) => any
}

function processUpdates() {
  updateScheduled = false

  // Capture the stack trace before the infinite loop.
  const devError = DEV && Error('Cycle detected')

  let skipPureObservers = false
  let currentObserver: InternalObserver
  let oldRefs: Set<InternalRef<any>>

  const parentAccess = access
  access = (ref: InternalRef<any>) => currentObserver._access(ref, oldRefs)

  const update = (observer: Observer) => {
    if (skipPureObservers && observer.isObservablyPure()) {
      return // Wait for observable side effects to complete.
    }
    // Skip the update if the observer was disposed.
    if (updateQueue.delete(observer)) {
      oldRefs = new Set(observer.refs)
      currentObserver = observer as InternalObserver
      currentObserver._update(false, oldRefs)
    }
  }

  for (let loops = 0; updateQueue.size > 0; loops++) {
    if (loops > 100) {
      throw (DEV && devError) || Error('Cycle detected')
    }

    if (updateQueue.size) {
      // Run observers with side effects before all others.
      skipPureObservers = updateHasSideEffects
      updateHasSideEffects = false

      const updatedObservers = [...updateQueue].sort(sortObservers)
      updatedObservers.forEach(update)
    }
  }

  access = parentAccess
}

/**
 * Run a function and collect all refs that were accessed.
 */
export function collectAccessedRefs<T>(fn: () => T, accessedRefs: Set<Ref>) {
  const parentAccess = access
  access = ref => {
    accessedRefs.add(ref)
    return parentAccess(ref)
  }
  try {
    return fn()
  } finally {
    access = parentAccess
  }
}

//
// Convenience functions
//

export const ref: {
  <T>(value: T, debugId?: string | number): Ref<T>
  <T>(value?: T, debugId?: string | number): Ref<T | undefined>
} = (value, debugId) => new Ref(value, debugId)

export const refMap = <K, V>(entries?: Iterable<[K, V]>) => new RefMap(entries)

export const computed = <T>(compute: () => T, debugId?: string | number) =>
  new ComputedRef(compute, debugId)

/** Observe any refs accessed in the compute function. */
export function observe(compute: () => void): Observer

/** Observe a single ref. */
export function observe<T>(
  ref: ReadonlyRef<T>,
  compute: (newValue: T, oldValue: T, ref: ReadonlyRef<T>) => void
): Observer

/** @internal */
export function observe(
  arg1: ReadonlyRef | (() => void),
  arg2?: (newValue: any, oldValue: any, ref: ReadonlyRef) => void
) {
  let observer: Observer
  if (isFunction(arg1)) {
    observer = new Observer()
    observer.update(arg1)
  } else {
    observer = new TargetObserver(arg1, arg2!)
    observer.update()
  }
  return observer
}

export function isReadonlyRef(value: any): boolean {
  return !!value && value[kRefType] === 'ReadonlyRef'
}

export function isRef<T = any>(value: any): value is ReadonlyRef<T> {
  return !!value && value[kRefType] !== undefined
}

/**
 * Like `ref.peek()` but applies to all access within the given `compute`
 * callback.
 */
export function peek<T, Args extends any[]>(
  compute: (...args: Args) => T,
  ...args: Args
): T

/**
 * Like `ref.peek()` but for computed properties or custom properties (i.e.
 * defined with `Object.defineProperty`).
 */
export function peek<T extends object, K extends keyof T>(
  object: T,
  key: K
): T[K]

export function peek(arg1: object | ((...args: any[]) => any), ...rest: any[]) {
  const parentAccess = access
  access = unseenAccess
  try {
    if (isFunction(arg1)) {
      return arg1(...rest)
    }
    return (arg1 as any)[rest[0]]
  } finally {
    access = parentAccess
  }
}

/**
 * Coerce a possibly reactive value to a raw value.
 */
export const unref = <T>(arg: T | ReadonlyRef<T>): T =>
  isRef(arg) ? arg.value : arg

/**
 * For values used as inputs to `computed` wrappers.
 */
export type ComputedInput<T> = T | ReadonlyRef<T> | (() => T | ReadonlyRef<T>)

/**
 * Similar to `unref` but also supports thunk values.
 *
 * Most useful inside `computed` callbacks.
 */
export const evaluateInput = <T>(arg: ComputedInput<T>) =>
  unref(isFunction(arg) ? arg() : arg)

/**
 * Observe the given `Ref` until it has a truthy value, then run the effect and
 * return the result. If the ref is already truthy, the effect is run
 * immediately.
 */
export function when<T, Result>(
  condition: ReadonlyRef<T>
): Disposable<Promise<Exclude<T, Falsy>>>

export function when<T, Result = Exclude<T, Falsy>>(
  condition: ReadonlyRef<T>,
  effect: (value: Exclude<T, Falsy>) => Promisable<Result>
): Disposable<Promise<Result>>

export function when(
  condition: ReadonlyRef<any>,
  effect?: (value: any) => any
) {
  const value: any = condition.peek()
  if (value) {
    return attachDisposer(
      effect
        ? Promise.resolve().then(() => effect(value))
        : Promise.resolve(value),
      noop
    )
  }
  let observer: Observer
  return attachDisposer(
    new Promise((resolve, reject) => {
      observer = observe(condition, (value: any) => {
        if (!value) return
        observer.dispose()

        if (effect) {
          try {
            resolve(effect(value))
          } catch (error) {
            reject(error)
          }
        } else {
          resolve(value)
        }
      })
    }),
    () => {
      observer.dispose()
    }
  )
}
