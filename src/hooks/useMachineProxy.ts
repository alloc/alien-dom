import { isFunction } from '@alloc/is'
import {
  Machine,
  MachineCallback,
  MachineClass,
  MachineParams,
  MachineProxy,
  MachineType,
  toMachineProxy,
} from '../machine'
import { useCallbackProp } from './useCallbackProp'
import { useState } from './useState'

export function useMachineProxy<T extends MachineType<void>>(
  constructor: MachineClass<T>,
  onChange?: MachineCallback<T>
): MachineProxy<T>

export function useMachineProxy<T extends MachineType>(
  constructor: MachineClass<T>,
  params: MachineParams<T>,
  onChange?: MachineCallback<T>
): MachineProxy<T>

export function useMachineProxy(
  constructor: new (params: any) => Machine<any>,
  params?: any,
  onChange?: MachineCallback<any>
): any {
  if (isFunction(params)) {
    onChange = params
    params = undefined
  }
  const onChangeRef = useCallbackProp(onChange)
  return useState(initMachineProxy, constructor, params, onChangeRef)
}

function initMachineProxy<T extends MachineType>(
  constructor: MachineClass<T>,
  params: MachineParams<T> | undefined,
  onChange: MachineCallback<T>
) {
  const machine = new constructor(params!, onChange)
  return toMachineProxy(machine)
}
