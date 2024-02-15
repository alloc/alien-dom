import { isFunction } from '@alloc/is'
import { AlienBoundEffect, createEffect } from '../effects'
import { isNode } from '../internal/duck'
import { makeIterable } from '../internal/iterable'
import { noop } from '../internal/util'
import { Disposable } from './disposable'

type ChannelTarget<T extends ChannelFunction> = //
  T extends ChannelFunction<any, infer Target> ? Target : never
type ChannelData<T extends ChannelFunction> = //
  T extends ChannelFunction<infer Data> ? Data : never

export interface AlienMessage<
  T extends ChannelFunction = ChannelFunction,
  Target extends ChannelTarget<T> = ChannelTarget<T>
> {
  readonly target?: Target
  currentTarget?: ChannelTarget<T>
  stopPropagation(): void
  stopImmediatePropagation(): void
}

export interface AlienBubblingMessage<
  T extends ChannelFunction = ChannelFunction,
  Target extends ChannelTarget<T> = ChannelTarget<T>
> extends AlienMessage<T, Target> {
  readonly target: Target
  currentTarget: ChannelTarget<T>
}

export type AlienReceiver<
  T extends ChannelFunction = ChannelFunction,
  Target extends ChannelTarget<T> = ChannelTarget<T>
> = (
  message: (ChannelTarget<T> extends void
    ? AlienMessage<T, Target>
    : AlienBubblingMessage<T, Target>) &
    ChannelData<T>
) => boolean | void

type AlienChannelEffect<Target extends object | void> = Disposable<
  AlienBoundEffect<Target>
>

type ChannelAddReceiver<T extends ChannelFunction = ChannelFunction> = {
  <Target extends ChannelTarget<T>>(
    target: Target,
    receiver: AlienReceiver<T>
  ): AlienChannelEffect<Target>

  (
    receiver: AlienReceiver<ChannelFunction<ChannelData<T>, void>>
  ): AlienChannelEffect<void>
}

type VoidIfEmpty<Data extends object> = Data extends any
  ?
      | ({} extends Data ? void : never)
      | ({} extends Required<Data> ? never : Data)
  : never

type ChannelSend<T extends ChannelFunction = ChannelFunction> = {
  <Target extends ChannelTarget<T>>(
    target: Target,
    message: VoidIfEmpty<ChannelData<T>>
  ): boolean

  (message: VoidIfEmpty<ChannelData<T>>): boolean
}

/**
 * Channels are strongly typed event buses.
 *
 * When an element is passed as the first argument, the channel will only send
 * messages to receivers that are bound to that element or to one of its
 * ancestors.
 *
 * The `Data` type must be a plain object. Use the `{}` type to represent a
 * message with no custom metadata.
 */
export type AlienChannel<
  Data extends object = Record<string, any>,
  Target extends object | void = any
> = ChannelFunction<Data, Target> &
  [
    ChannelSend<ChannelFunction<Data, Target>>,
    ChannelAddReceiver<ChannelFunction<Data, Target>>
  ]

interface ChannelFunction<
  Data extends object = Record<string, any>,
  Target extends object | void = any
> extends ChannelAddReceiver<ChannelFunction<Data, Target>>,
    ChannelSend<ChannelFunction<Data, Target>> {}

/**
 * Channels are strongly typed event buses.
 *
 * When an element is passed as the first argument, the channel will only send
 * messages to receivers that are bound to that element or to one of its
 * ancestors.
 *
 * The `Data` type must be a plain object. Use the `{}` type to represent a
 * message with no custom metadata.
 */
export function defineChannel<
  Data extends object = {},
  Target extends object = Node
>({
  isTarget = isNode as any,
  parentKey = 'parentNode' as any,
}: {
  isTarget?(node: any): node is Target
  parentKey?: Extract<keyof Target, string>
} = {}): AlienChannel<Data, Target> {
  let untargetedReceivers: Set<AlienReceiver> | undefined
  let targetedReceiverCaches: WeakMap<Target, Set<AlienReceiver>> | undefined

  const bubble = (target: Target, message: AlienBubblingMessage): boolean => {
    let received = false

    const receivers = targetedReceiverCaches!.get(target)
    if (receivers) {
      message.currentTarget = target
      for (const receiver of [...receivers]) {
        received = receiver(message) !== false || received
        if (message.stopImmediatePropagation === noop) {
          break
        }
      }
      if (message.stopPropagation === noop) {
        return received
      }
    }

    if (target[parentKey]) {
      return bubble(target[parentKey] as any, message)
    }

    if (untargetedReceivers) {
      message.currentTarget = document
      for (const receiver of [...untargetedReceivers]) {
        received = receiver(message) !== false || received
        if (message.stopImmediatePropagation === noop) {
          break
        }
      }
    }

    return received
  }

  const addReceiver: ChannelAddReceiver = (arg1: any, arg2?: any): any => {
    if (isTarget(arg1)) {
      const receiversByTarget = (targetedReceiverCaches ||= new WeakMap())
      return createEffect({
        target: arg1,
        args: [arg2],
        enable(target: Target, receiver: AlienReceiver) {
          const receivers = receiversByTarget.get(target) || new Set()
          receiversByTarget.set(target, receivers)

          // Clone the receiver in case it was memoized by a component.
          const newReceiver = receiver.bind(null)
          receivers.add(newReceiver)

          return () => {
            receivers.delete(newReceiver)

            if (!receivers.size) {
              receiversByTarget.delete(target)
            }
          }
        },
      })
    }
    const receivers = (untargetedReceivers ||= new Set())
    return createEffect({
      args: [arg1],
      enable(_: void, receiver: AlienReceiver) {
        // Clone the receiver in case it was memoized by a component.
        const newReceiver = receiver.bind(null)
        receivers.add(newReceiver)

        return () => {
          receivers.delete(newReceiver)
        }
      },
    })
  }

  const sendMessage: ChannelSend = (arg1: any, arg2?: any) => {
    let message: AlienMessage | null

    if (isTarget(arg1)) {
      if (targetedReceiverCaches) {
        message = {
          ...(arg2 as AlienMessage),
          currentTarget: arg1,
          stopPropagation() {
            this.stopPropagation = noop
          },
          stopImmediatePropagation() {
            this.stopImmediatePropagation = noop
          },
        }
        return bubble(arg1, message as AlienBubblingMessage)
      }

      message = {
        ...(arg2 as AlienMessage),
        target: arg1,
        currentTarget: document,
      }
    }

    let received = false

    if (untargetedReceivers) {
      message ||= { ...arg1 } as AlienMessage
      message.stopPropagation = noop
      message.stopImmediatePropagation = () => {
        message = null
      }
      for (const receiver of [...untargetedReceivers]) {
        received = receiver(message) !== false || received
        if (!message) {
          break
        }
      }
    }

    return received
  }

  return makeIterable(
    (arg1: any, arg2?: any): any => {
      if (isFunction(arg1)) {
        return addReceiver(arg1)
      }
      if (arg2 === undefined) {
        return sendMessage(arg1)
      }
      if (isFunction(arg2)) {
        return addReceiver(arg1, arg2)
      }
      return sendMessage(arg1, arg2)
    },
    [sendMessage, addReceiver]
  ) as any
}
