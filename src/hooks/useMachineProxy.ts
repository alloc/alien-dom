import { isFunction } from '@alloc/is'
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
  params: MachineParams<T> | undefined,
  onChange: MachineCallback<T>
) => new constructor(params!, onChange).proxy

export function useMachineProxy<T extends MachineType<void>>(
  constructor: MachineClass<T>,
  onChange?: MachineCallback<T>
): MachineProxy<T>

export function useMachineProxy<T extends MachineType>(
  constructor: MachineClass<T>,
  params: MachineParams<T>,
  onChange?: MachineCallback<T>
): MachineProxy<T>

export function useMachineProxy<T extends MachineType>(
  constructor: MachineClass<T>,
  params?: MachineParams<T> | MachineCallback<T>,
  onChange?: MachineCallback<T>
): MachineProxy<T> {
  if (isFunction(params)) {
    onChange = params
    params = undefined
  }
  const onChangeRef = useCallbackProp(onChange)
  return useState(initMachineProxy, constructor, params, onChangeRef)
}
