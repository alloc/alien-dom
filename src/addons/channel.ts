import { isFunction } from '@alloc/is'
import { Disposable } from '../core/disposable'
import { AlienBoundEffect, createEffect } from '../core/effects'
import { isNode } from '../internal/duck'
import { makeIterable } from '../internal/iterable'
import { noop } from '../internal/util'

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
export type Channel<
  Data extends object = Record<string, any>,
  Target extends object | void = any
> = Channel.Signature<Data, Target> & Channel.FunctionTuple<Data, Target>

export declare namespace Channel {
  export interface Message<
    T extends Signature = Signature,
    Target extends InferTarget<T> = InferTarget<T>
  > {
    readonly target?: Target
    currentTarget?: InferTarget<T>
    stopPropagation(): void
    stopImmediatePropagation(): void
  }

  /**
   * A message that is sent to the target and its ancestors. This propagation
   * can be interrupted by `stopPropagation` or `stopImmediatePropagation`.
   */
  interface BubblingMessage<
    T extends Signature = Signature,
    Target extends InferTarget<T> = InferTarget<T>
  > extends Message<T, Target> {
    readonly target: Target
    currentTarget: InferTarget<T>
  }

  /** A receiver is a function that receives messages from a channel. */
  type Receiver<
    T extends Signature = Signature,
    Target extends InferTarget<T> | void = InferTarget<T>
  > = (
    message: (Target extends void
      ? Message<T, InferTarget<T>>
      : BubblingMessage<T, InferTarget<T>>) &
      InferData<T>,
    connection: Connection<Target>
  ) => boolean | void

  /** The signature of a channel. */
  interface Signature<
    Data extends object = Record<string, any>,
    Target extends object | void = any
  > extends Send<Signature<Data, Target>>,
      Connect<Signature<Data, Target>> {}

  /**
   * Every channel returned by `defineChannel` can be divided into two functions
   * (`send` and `connect`) via array destructuring.
   */
  type FunctionTuple<
    Data extends object = Record<string, any>,
    Target extends object | void = any
  > = [
    send: Send<Signature<Data, Target>>,
    connect: Connect<Signature<Data, Target>>
  ]

  /** The function that sends a message to a channel. */
  type Send<T extends Signature = Signature> = {
    <Target extends InferTarget<T>>(
      target: Target,
      message: VoidIfEmpty<InferData<T>>
    ): boolean

    (message: VoidIfEmpty<InferData<T>>): boolean
  }

  /** The function that connects a receiver to a channel. */
  type Connect<T extends Signature = Signature> = {
    <Target extends InferTarget<T>>(
      target: Target,
      receiver: Receiver<T>
    ): Connection<Target>

    (receiver: Receiver<Signature<InferData<T>, void>>): Connection<void>
  }

  /** A disposable connection of a receiver to a channel. */
  type Connection<Target extends object | void> = Disposable<
    AlienBoundEffect<Target>
  >
}

type InferData<T extends Channel.Signature> = //
  T extends Channel.Signature<infer Data> ? Data : never

type InferTarget<T extends Channel.Signature> = //
  T extends Channel.Signature<any, infer Target> ? Target : never

type VoidIfEmpty<Data extends object> = Data extends any
  ?
      | ({} extends Data ? void : never)
      | ({} extends Required<Data> ? never : Data)
  : never

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
  bubblingKey = isTarget === isNode ? ('parentNode' as any) : false,
}: {
  isTarget?(node: any): node is Target
  bubblingKey?: Extract<keyof Target, string> | false
} = {}): Channel<Data, Target> {
  type Receiver = (message: Channel.Message) => boolean | void

  let untargetedReceivers: Set<Receiver> | undefined
  let targetedReceiverCaches: WeakMap<Target, Set<Receiver>> | undefined

  const bubble = (
    target: Target,
    message: Channel.BubblingMessage
  ): boolean => {
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

    if (bubblingKey !== false && target[bubblingKey]) {
      return bubble(target[bubblingKey] as any, message)
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

  const connect: Channel.Connect = (arg1: any, arg2?: any): any => {
    let connection: Channel.Connection
    if (isTarget(arg1)) {
      const receiversByTarget = (targetedReceiverCaches ||= new WeakMap())
      connection = createEffect({
        target: arg1,
        args: [arg2],
        enable(target: Target, receiver: Channel.Receiver) {
          const receivers = receiversByTarget.get(target) || new Set()
          receiversByTarget.set(target, receivers)

          const newReceiver: Receiver = message => receiver(message, connection)
          receivers.add(newReceiver)

          return () => {
            receivers.delete(newReceiver)

            if (!receivers.size) {
              receiversByTarget.delete(target)
            }
          }
        },
      })
    } else {
      const receivers = (untargetedReceivers ||= new Set())
      connection = createEffect({
        args: [arg1],
        enable(_: void, receiver: Channel.Receiver) {
          const newReceiver: Receiver = message => receiver(message, connection)
          receivers.add(newReceiver)

          return () => {
            receivers.delete(newReceiver)
          }
        },
      })
    }
    return connection
  }

  const send: Channel.Send = (arg1: any, arg2?: any) => {
    let message: Channel.Message | null

    if (isTarget(arg1)) {
      message = Object.create(arg2) as Channel.Message

      if (targetedReceiverCaches) {
        Object.assign(message, {
          currentTarget: arg1,
          stopPropagation() {
            this.stopPropagation = noop
          },
          stopImmediatePropagation() {
            this.stopImmediatePropagation = noop
          },
        })
        return bubble(arg1, message as Channel.BubblingMessage)
      }

      Object.assign(message, {
        target: arg1,
        currentTarget: document,
      })
    }

    let received = false

    if (untargetedReceivers) {
      message ||= Object.create(arg1) as Channel.Message
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
        return connect(arg1)
      }
      if (arg2 === undefined) {
        return send(arg1)
      }
      if (isFunction(arg2)) {
        return connect(arg1, arg2)
      }
      return send(arg1, arg2)
    },
    [send, connect]
  ) as any
}
