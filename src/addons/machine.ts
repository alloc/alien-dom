import { isArray, isString } from '@alloc/is'
import { AllKeys, Intersect, Remap } from '@alloc/types'
import { ReadonlyRef, ref } from '../core/observable'
import { noop } from '../internal/util'

export function defineMachine<T extends MachineType>(
  setup: (
    params: Readonly<MachineParams<T>>,
    update: MachineUpdater<T>,
    machine: Machine<T>
  ) => MachineState<T>
): MachineClass<T> {
  return class extends Machine<T> {
    constructor(
      params: Readonly<MachineParams<T>>,
      onChange: MachineCallback<T> = noop
    ) {
      const stateRef = ref<any>(undefined)
      super(params, stateRef)
      stateRef.value = setup(
        params,
        (arg1: any, arg2?: any) => {
          const newState = isString(arg1) ? { ...arg2, value: arg1 } : arg1
          stateRef.value = newState
          onChange(newState, this)
          return newState
        },
        this
      )
    }
  }
}

export interface MachineClass<T extends MachineType = any> {
  new (
    params: Readonly<MachineParams<T>>,
    onChange?: MachineCallback<T>
  ): Machine<T>
}

export type MachineType<
  Params extends object | void = any,
  State extends { value: string } = any
> = (params: Params) => State

export type MachineState<
  T extends MachineType,
  S extends MachineValue<T> = any
> = T extends MachineType<any, infer State> //
  ? Extract<State, { value: S }>
  : never

export type MachineValue<T extends MachineType> = //
  T extends MachineType<any, infer State> ? State['value'] : never

export type MachineValueWithKey<
  T extends MachineType,
  Key extends keyof any
> = Extract<MachineState<T>, { [K in Key]: any }>['value']

export type MachineParams<T extends MachineType> = //
  T extends MachineType<infer Params> ? Params : never

export type MachineCallback<T extends MachineType> = (
  state: Readonly<MachineState<T>>,
  self: Machine<T>
) => void

type VoidMachineValue<T extends MachineType> =
  MachineState<T> extends infer State
    ? State extends { value: MachineValue<T> }
      ? { value: any } extends State
        ? State['value']
        : never
      : never
    : never

export type MachineUpdater<T extends MachineType> = {
  <State extends MachineState<T>>(newState: State): State
  <Value extends VoidMachineValue<T>>(value: Value): Extract<
    MachineState<T>,
    { value: Value }
  >
  <
    Value extends MachineValue<T>,
    State extends Extract<MachineState<T>, { value: Value }>
  >(
    value: Value,
    newState: Omit<State, 'value'>
  ): State
}

// Machine proxies let you access any state at any time.
export type MachineProxy<
  T extends MachineType,
  State extends MachineValue<T> = any
> = ProxiedMachine<T, State> & Readonly<AssumedState<MachineState<T>>>

interface ProxiedMachine<T extends MachineType, State extends MachineValue<T>>
  extends Machine<T, State> {
  is<Value extends MachineValue<T>>(
    value: Value | Value[]
  ): this is MachineProxy<T, Value>
  has<Key extends AllKeys<MachineState<T>>>(
    key: Key
  ): this is MachineProxy<T, MachineValueWithKey<T, Key>>
}

type OmitValue<T> = T extends any ? Remap<Omit<T, 'value'>> : never
type AssumedState<T> = Remap<
  Intersect<
    [T] extends [{ value: infer V }] ? { value: V } & OmitValue<T> : never
  >
>

export class Machine<
  T extends MachineType,
  State extends MachineValue<T> = any
> {
  constructor(
    readonly params: Readonly<MachineParams<T>>,
    readonly stateRef: ReadonlyRef<MachineState<T, State>>
  ) {}

  get state(): Readonly<MachineState<T, State>> {
    return this.stateRef.value
  }

  get value(): Extract<MachineValue<T>, State> {
    return this.state.value
  }

  peek() {
    return this.stateRef.peek().value
  }

  is<Value extends MachineValue<T>>(
    value: Value | Value[]
  ): this is Machine<T, Value> {
    return isArray(value) ? value.includes(this.value) : this.value === value
  }

  has<Key extends AllKeys<MachineState<T>>>(
    key: Key
  ): this is Machine<T, MachineValueWithKey<T, Key>> {
    return key in this.state
  }

  assert<Value extends MachineValue<T>>(
    value: Value
  ): Readonly<MachineState<T, Value>> {
    if (this.value === value) {
      return this.state
    }
    throw Error(`Expected "${value}", got "${this.value}"`)
  }
}

export function toMachineProxy<T extends MachineType>(
  machine: Machine<T>
): MachineProxy<T> {
  return new Proxy(machine as any, {
    get(machine, prop) {
      if (prop in machine) {
        return machine[prop]
      }
      if (prop in machine.state) {
        return machine.state[prop]
      }
      if (prop === 'dispose') {
        // Avoid throwing in case an unmounting component is trying to access
        // the dispose method.
        return
      }
      throw ReferenceError(
        `Illegal property access: "${String(prop)}" in "${machine.value}" state`
      )
    },
  })
}
