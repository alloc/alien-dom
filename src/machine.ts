import { isString } from '@alloc/is'
import { noop } from './jsx-dom/util'
import { ReadonlyRef, Ref, ref } from './observable'

export type MachineStateSetter<State extends { value: string }> = {
  <S extends State>(newState: S): S
  <Value extends string, S extends Extract<State, { value: Value }>>(
    value: Value,
    newState: Omit<S, 'value'>
  ): S
}

export function createMachine<
  State extends { value: string },
  Params extends object | void
>(
  setup: (
    params: Params,
    setState: MachineStateSetter<State>,
    machine: Machine<State, Params>
  ) => State
): MachineType<State, Params> {
  return class extends Machine<State, Params> {
    constructor(
      params: Readonly<Params>,
      onChange: (state: State) => void = noop
    ) {
      const stateRef = ref<any>(undefined)
      super(params, stateRef)
      stateRef.value = setup(
        params,
        (arg1: State | State['value'], arg2?: Omit<State, 'value'>) => {
          const newState = isString(arg1)
            ? { ...(arg2 as State), value: arg1 }
            : arg1

          stateRef.value = newState
          onChange(newState)

          return newState
        },
        this
      )
    }
  }
}

export type MachineType<
  State extends { value: string } = any,
  Params extends object | void = any
> = {
  new (params: Params, onChange?: (state: State) => void): Machine<
    State,
    Params
  >
}

export class Machine<
  State extends { value: string } = any,
  Params extends object | void = any
> {
  stateRef: ReadonlyRef<State>
  get state(): State {
    return this.stateRef.value
  }
  get value(): State['value'] {
    return this.state.value
  }
  constructor(readonly params: Readonly<Params>, stateRef: Ref<State>) {
    this.stateRef = stateRef
  }
  is<Value extends State['value']>(
    value: Value
  ): this is Machine<Extract<State, { value: Value }>> {
    return this.value === value
  }
  as<Value extends State['value'], Result>(
    value: Value,
    callback: (state: Extract<State, { value: Value }>) => Result
  ): Result | undefined {
    if (this.is(value)) {
      return callback(this.state)
    }
  }
}
