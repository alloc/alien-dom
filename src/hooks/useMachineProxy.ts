import {
  MachineCallback,
  MachineClass,
  MachineParams,
  MachineProxy,
  MachineType,
} from '../machine'
import { useCallbackProp } from './useCallbackProp'
import { useState } from './useState'

const initMachineProxy = <T extends MachineType>(
  constructor: MachineClass<T>,
  params: MachineParams<T>,
  onChange: MachineCallback<T>
) => new constructor(params, onChange).proxy

export function useMachineProxy<T extends MachineType>(
  constructor: MachineClass<T>,
  params: MachineParams<T>,
  onChange?: MachineCallback<T>
): MachineProxy<T> {
  const onChangeRef = useCallbackProp(onChange)
  return useState(initMachineProxy, constructor, params, onChangeRef)
}
