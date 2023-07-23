import { isString } from '@alloc/is'
import { noop } from './jsx-dom/util'
import { ReadonlyRef, ref } from './observable'

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
          onChange(newState)
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
    onChange?: (state: Readonly<MachineState<T>>) => void
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

export type MachineParams<T extends MachineType> = //
  T extends MachineType<infer Params> ? Params : never

export type MachineCallback<T extends MachineType> = (
  state: Readonly<MachineState<T>>
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

  is<Value extends Extract<MachineValue<T>, State>>(
    value: Value
  ): this is Machine<T, Value> {
    return this.value === value
  }

  as<Value extends State['value'], Result>(
    value: Value,
    callback: (state: Readonly<MachineState<T, Value>>) => Result
  ): Result | undefined {
    if (this.is(value)) {
      return callback(this.state)
    }
  }
}
