import { isFunction } from '@alloc/is'
import {
  MachineCallback,
  MachineClass,
  MachineParams,
  MachineProxy,
  MachineType,
  toMachineProxy,
} from '../addons/machine'
import { expectCurrentComponent } from '../internal/global'
import { useStableCallback } from './useStableCallback'

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
  constructor: MachineClass<any>,
  params?: any,
  onChange?: MachineCallback<any>
): any {
  if (isFunction(params)) {
    onChange = params
    params = undefined
  }
  const onChangeRef = useStableCallback(onChange)
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  return (component.hooks[index] ||= toMachineProxy(
    new constructor(params!, onChangeRef)
  ))
}
