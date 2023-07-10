import { isFunction } from '@alloc/is'
import { noop } from './jsx-dom/util'

// Debugging hooks are declared globally.
declare const __OBSERVABLE_HOOKS__: {
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

type InternalRef<T> = Ref<T> & {
  _value: T
  _version: number
  _observers: Set<Observer>
  _depth: number
  _isObserved: (observer: Observer, isObserved: boolean) => void
}

const unseenAccess = (ref: InternalRef<any>) => ref._value

let currentVersion = 1
let nextVersion = 1
let access = unseenAccess

const kRefType = Symbol.for('alien:refType')

export class ReadonlyRef<T = any> {
  protected _version = 0
  protected _observers = new Set<Observer>()
  protected get _depth() {
    return 0
  }

  constructor(protected _value: T) {}

  /**
   * In addition to adding/removing an observer, computed refs use this method
   * to switch between eager and lazy computation mode.
   */
  protected _isObserved(observer: Observer, isObserved: boolean) {
    if (DEV && typeof __OBSERVABLE_HOOKS__ !== 'undefined') {
      __OBSERVABLE_HOOKS__.isObserved(this, observer, isObserved)
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

  get version() {
    return this._version
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
      this._version = currentVersion
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

const emptySymbol: any = Symbol('empty')

export class ComputedRef<T = any> extends ReadonlyRef<T> {
  protected _refs: Set<InternalRef<any>> | null = null
  protected _observer: Observer | null = null
  protected get _depth() {
    return this._observer?.depth ?? 0
  }

  constructor(protected compute: () => T) {
    super(emptySymbol)
  }

  protected _isObserved(observer: Observer, isObserved: boolean) {
    super._isObserved(observer, isObserved)

    // Destroy our own observer once the ref is no longer observed.
    if (!isObserved) {
      this._value = emptySymbol
      this._observer?.dispose()
      this._observer = null
      this._refs = null
    }
    // Create our own observer once the ref is observed.
    else if (!this._observer) {
      this._setupObserver()
    }
  }

  protected _setupObserver() {
    const observer = (this._observer = new Observer(computeQueue))
    this._refs = observer.refs
    observer.onUpdate = valueProperty.set!.bind(this)
    observer.update(this.compute)
  }

  protected _update() {
    this._refs = new Set<InternalRef<any>>()

    const parentAccess = access
    access = ref => {
      this._refs!.add(ref)
      return ref._value
    }

    let error: any

    try {
      this._version = currentVersion
      this._value = this.compute()
    } catch (e) {
      error = e
    }

    access = parentAccess

    if (DEV && typeof __OBSERVABLE_HOOKS__ !== 'undefined') {
      __OBSERVABLE_HOOKS__.didUpdate(this, error, this._value)
    }

    if (error) throw error
    return this._value
  }

  get [kRefType]() {
    return 'ComputedRef'
  }

  get value() {
    if (this._observer) {
      return super.value
    }
    if (access !== unseenAccess) {
      this._setupObserver()
      return super.value
    }
    if (this._value === emptySymbol) {
      return this._update()
    }
    // Check if a dependency has changed since last access.
    for (const ref of this._refs!) {
      if (ref._version > this._version) {
        return this._update()
      }
    }
    return this._value
  }
}

const passThrough = (result: any) => result

let nextObserverId = 1

export class Observer {
  readonly id = nextObserverId++
  refs = new Set<InternalRef<any>>()
  version = 0
  depth = 0
  nextCompute: () => any = noop
  onUpdate = passThrough

  constructor(readonly queue = updateQueue) {}

  update<T>(compute: () => T) {
    const oldRefs = new Set(this.refs)
    this.refs.clear()
    this.depth = 0

    const parentAccess = access
    access = ref => {
      ref._isObserved(this, true)
      oldRefs.delete(ref)
      this.refs.add(ref)
      this.depth = Math.max(this.depth, ref._depth + 1)
      return ref._value
    }

    let error: any
    let result: any

    try {
      result = (this.nextCompute = compute)()
    } catch (e) {
      error = e
    }

    access = parentAccess
    oldRefs.forEach(ref => {
      ref._isObserved(this, false)
    })

    if (DEV && typeof __OBSERVABLE_HOOKS__ !== 'undefined') {
      __OBSERVABLE_HOOKS__.didUpdate(this, error, result)
    }

    if (error) throw error
    return this.onUpdate(result)
  }

  /** Called when a ref has a new value. */
  observe(ref: ReadonlyRef<any>, newValue: any, oldValue: any) {
    if (DEV && typeof __OBSERVABLE_HOOKS__ !== 'undefined') {
      __OBSERVABLE_HOOKS__.observe(this, ref, newValue, oldValue)
    }
    if (this.version !== currentVersion) {
      this.version = currentVersion
      this.queue.add(this)
    }
  }

  dispose() {
    this.queue.delete(this)
    this.refs.forEach(ref => {
      ref._isObserved(this, false)
    })
  }

  /**
   * Returns a bound `dispose` method.
   */
  get destructor() {
    return this.dispose.bind(this)
  }
}

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

function computeNextVersion() {
  currentVersion = nextVersion

  // Capture the stack trace before the infinite loop.
  const devError = DEV && Error('Cycle detected')

  let currentObserver: Observer
  let oldRefs: Set<InternalRef<any>>

  const parentAccess = access
  access = (ref: InternalRef<any>) => {
    ref._isObserved(currentObserver, true)
    oldRefs.delete(ref)
    currentObserver.refs.add(ref)
    currentObserver.depth = Math.max(currentObserver.depth, ref._depth + 1)
    return ref._value
  }

  for (let loops = 0; hasQueuedObservers(); loops++) {
    if (loops > 100) {
      throw (DEV && devError) || Error('Cycle detected')
    }

    const update = (observer: Observer) => {
      oldRefs = new Set(observer.refs)
      observer.refs.clear()
      observer.depth = 0

      let error: any
      let result: any

      currentObserver = observer
      try {
        result = observer.nextCompute()
        observer.onUpdate(result)
      } catch (e) {
        console.error((error = e))
      }

      oldRefs.forEach(ref => {
        ref._isObserved(observer, false)
      })

      if (DEV && typeof __OBSERVABLE_HOOKS__ !== 'undefined') {
        __OBSERVABLE_HOOKS__.didUpdate(observer, error, result)
      }
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

export const ref = <T>(value: T) => new Ref(value)
export const computed = <T>(compute: () => T) => new ComputedRef(compute)

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
    observer.update(() => {
      access(ref as any)
    })
    observer.observe = (ref, newValue, oldValue) => {
      // Capture the old value for the onChange callback.
      observer.onUpdate = onChange.bind(null, newValue, oldValue, ref)
    }
  }
  return observer
}

export function isRef<T = any>(value: any): value is Ref<T> {
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
