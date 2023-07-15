import { isFunction, isString } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { createSymbolProperty } from './internal/symbolProperty'
import { noop } from './jsx-dom/util'

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

let currentVersion = 1
let nextVersion = 1
let nextDebugId = 1
let access = unseenAccess

const kRefType = Symbol.for('alien:refType')

export class ReadonlyRef<T = any> {
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
    if (DEV && hooks) {
      hooks.isObserved(this, observer, isObserved)
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

  get value() {
    return access(this as any)
  }

  peek() {
    return this._value
  }
}

export class Ref<T = any> extends ReadonlyRef<T> {
  get [kRefType]() {
    return 'Ref'
  }

  get value() {
    return super.value
  }

  set value(newValue: T) {
    const oldValue = this._value
    if (newValue !== oldValue) {
      this._value = newValue
      this._observers.forEach(observer => {
        observer.observe(this, newValue, oldValue)
      })
      onObservedUpdate()
    }
  }

  set(arg: T | ((value: T) => T)) {
    if (isFunction(arg)) {
      arg = arg(this._value)
    }
    this.value = arg
    return arg
  }
}

export interface Ref<T> {
  0: T
  1: (arg: T | ((value: T) => T)) => T
}

const valueProperty = Object.getOwnPropertyDescriptor(Ref.prototype, 'value')!
const setValue = valueProperty.set!

Object.defineProperties(Ref.prototype, {
  0: valueProperty,
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
})

//
// Computed refs
//

const emptySymbol: any = Symbol('empty')

export class ComputedRef<T = any> extends ReadonlyRef<T> {
  protected _dirty = true
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
      this._dirty = true
    }
    // Create our own observer once the ref is observed.
    else if (!this._observer) {
      this._setupObserver()
    }
  }

  protected _setupObserver() {
    const observer = (this._observer = new Observer(computeQueue))
    observer.willUpdate = () => (this._dirty = true)
    observer.onUpdate = setValue.bind(this)
    observer.update(oldRefs => {
      if (this._dirty) {
        return this.compute()
      }

      // Preserve the current refs.
      observer.refs = new Set(oldRefs)
      oldRefs?.clear()

      return this._value
    })
  }

  protected _update() {
    this._dirty = false

    if (this._observer) {
      return this._observer.update(this.compute)
    }

    // When a computed ref is in lazy mode (i.e. it has no persistent observer),
    // a temporary observer is created in case a ref is changed after this
    // update but before the `currentVersion` counter is incremented again.
    const observer = new Observer({
      add: () => {
        this._dirty = true
        // If this computed ref is accessed, another synchronous observer will
        // be created, so let's dispose this one now.
        observer.dispose()
      },
      delete: noop,
    }) as InternalObserver

    // The temporary observer is removed in the next microtask at the latest.
    queueMicrotask(() => {
      observer.dispose()
    })

    const parentAccess = access
    access = ref => observer._access(ref)
    try {
      observer.nextCompute = this.compute
      return (this._value = observer._update(true))
    } finally {
      access = parentAccess
    }
  }

  get [kRefType]() {
    return 'ComputedRef'
  }

  get value() {
    if (this._observer) {
      if (this._dirty) {
        this._update()
      }
      return super.value
    }
    if (access !== unseenAccess) {
      this._setupObserver()
      return super.value
    }
    return this.peek()
  }

  peek() {
    if (this._dirty) {
      return this._update()
    }
    return this._value
  }
}

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

/* @__PURE__ */ assignPrototype(ArrayRef.prototype, {
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
  map: arrayEnumerator('map'),
})

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
export const arrayRef = <T>(
  init?: T[],
  debugId?: string | number
): ArrayRef<T> =>
  new Proxy(new ArrayRef(init || [], debugId), arrayTraps as any)

//
// Plain observers
//

const passThrough = (result: any) => result

let nextObserverId = 1

export declare namespace Observer {
  type WillUpdateFn = (
    ref: ReadonlyRef<any>,
    newValue: any,
    oldValue: any
  ) => void
  type OnUpdateFn = (result: any) => any
  type Queue = {
    add(observer: Observer): void
    delete(observer: Observer): void
  }
}

export class Observer {
  readonly id = nextObserverId++
  refs = new Set<InternalRef<any>>()
  version = 0
  depth = 0
  nextCompute: (oldRefs?: Set<InternalRef<any>>) => any = noop
  willUpdate: Observer.WillUpdateFn = noop
  onUpdate: Observer.OnUpdateFn = passThrough

  constructor(readonly queue: Observer.Queue = updateQueue) {}

  protected _access(ref: InternalRef<any>, oldRefs?: Set<InternalRef<any>>) {
    ref._isObserved(this, true)
    oldRefs?.delete(ref)
    this.refs.add(ref)
    this.depth = Math.max(this.depth, ref._depth + 1)
    return ref._value
  }

  protected _update(sync?: boolean, oldRefs?: Set<InternalRef<any>>) {
    this.refs.clear()
    this.depth = 0

    let error: any
    let result: any

    try {
      result = this.nextCompute(oldRefs)
      oldRefs?.forEach(ref => {
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
      peek(() => (hooks as ObservableHooks).didUpdate(this, error, result))
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
  update<T>(compute: (oldRefs?: Set<InternalRef<any>>) => T) {
    const oldRefs = new Set(this.refs)
    this.nextCompute = compute

    const parentAccess = access
    access = ref => this._access(ref, oldRefs)
    try {
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
    if (this.version !== currentVersion) {
      this.version = currentVersion
      this.queue.add(this)
      this.willUpdate(ref, newValue, oldValue)
    }
  }

  dispose() {
    this.queue.delete(this)
    this.refs.forEach(ref => {
      ref._isObserved(this, false)
    })
    // Ensure subsequent calls to dispose are no-ops.
    this.refs.clear()
  }

  /**
   * Returns a bound `dispose` method.
   */
  get destructor() {
    return this.dispose.bind(this)
  }
}

//
// Update loop
//

function onObservedUpdate() {
  if (nextVersion === currentVersion && hasQueuedObservers()) {
    nextVersion++
    Promise.resolve().then(computeNextVersion)
  }
}

// Computed refs always run before plain observers.
const computeQueue = new Set<Observer>()
const updateQueue = new Set<Observer>()

function hasQueuedObservers() {
  return computeQueue.size + updateQueue.size > 0
}

type InternalObserver = Observer & {
  _access: (ref: InternalRef<any>, oldRefs?: Set<InternalRef<any>>) => any
  _update: (sync?: boolean, oldRefs?: Set<InternalRef<any>>) => any
}

function computeNextVersion() {
  currentVersion = nextVersion

  // Capture the stack trace before the infinite loop.
  const devError = DEV && Error('Cycle detected')

  let currentObserver: InternalObserver
  let oldRefs: Set<InternalRef<any>>

  const parentAccess = access
  access = (ref: InternalRef<any>) => currentObserver._access(ref, oldRefs)

  const update = (observer: Observer) => {
    oldRefs = new Set(observer.refs)
    currentObserver = observer as InternalObserver
    currentObserver._update(false, oldRefs)
  }

  for (let loops = 0; hasQueuedObservers(); loops++) {
    if (loops > 100) {
      throw (DEV && devError) || Error('Cycle detected')
    }

    // Computed refs run in order of depth.
    const computedRefs = [...computeQueue].sort((a, b) => b.depth - a.depth)
    computeQueue.clear()

    computedRefs.forEach(update)

    // Plain observers run in order of creation.
    const updatedObservers = [...updateQueue].sort((a, b) => a.id - b.id)
    updateQueue.clear()

    updatedObservers.forEach(update)
  }

  access = parentAccess
}

//
// Convenience functions
//

export const ref = <T>(value: T, debugId?: string | number) =>
  new Ref(value, debugId)

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
  const observer = new Observer()
  if (isFunction(arg1)) {
    observer.update(arg1)
  } else {
    const ref = arg1,
      onChange = arg2!

    observer.update(() => access(ref as any))

    // Capture the old value for the onChange callback.
    observer.willUpdate = (ref, _newValue, oldValue) => {
      observer.onUpdate = newValue =>
        newValue !== oldValue && peek(() => onChange(newValue, oldValue, ref))
    }
  }
  return observer
}

export function isRef<T = any>(value: any): value is ReadonlyRef<T> {
  return !!value && value[kRefType] !== undefined
}

/**
 * Like `ref.peek()` but applies to all access within the given `compute`
 * callback.
 */
export function peek<T>(compute: () => T) {
  const parentAccess = access
  access = unseenAccess
  try {
    return compute()
  } finally {
    access = parentAccess
  }
}
