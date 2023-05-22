import { noop } from './jsx-dom/util'
import { ReadonlyRef, Ref, ref } from './signals'

export function createMachine<
  State extends { value: string },
  Params extends object | void
>(
  setup: (
    params: Params,
    setState: <S extends State>(newState: S) => S,
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
        newState => {
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
