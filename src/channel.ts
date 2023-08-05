import { isFunction } from '@alloc/is'
import { Disposable } from './disposable'
import { AlienBoundEffect, createEffect } from './effects'
import { isNode } from './internal/duck'
import { makeIterable } from './internal/iterable'
import { noop } from './jsx-dom/util'

export interface AlienMessage {
  readonly target?: Node
  currentTarget?: Node
  stopPropagation(): void
  stopImmediatePropagation(): void
}

export interface AlienBubblingMessage<Target extends Node = any>
  extends AlienMessage {
  readonly target: Target
  currentTarget: Node
}

export type AlienReceiver<
  Message extends object = {},
  Target extends Node | void = any
> = (
  message: (Target extends void ? AlienMessage : AlienBubblingMessage) & Message
) => void

type MessageInput<Message extends object> = Message extends any
  ? {} extends Message
    ? void
    : Message
  : never

type AddReceiverFn<Message extends object> = {
  <Target extends Node>(
    target: Target,
    receiver: AlienReceiver<Message, Target>
  ): Disposable<AlienBoundEffect<Target>>
  (receiver: AlienReceiver<Message, void>): Disposable<AlienBoundEffect<void>>
}

type SendMessageFn<Message extends object> = {
  <Target extends Node>(target: Target, message: MessageInput<Message>): void
  (message: MessageInput<Message>): void
}

/**
 * Channels are strongly typed event buses.
 *
 * When an element is passed as the first argument, the channel will
 * only send messages to receivers that are bound to that element or to
 * one of its ancestors.
 *
 * The `Message` type must be a plain object. Use the `{}` type to
 * represent a message with no custom metadata.
 */
export type AlienChannel<Message extends object> = AddReceiverFn<Message> &
  SendMessageFn<Message> &
  [SendMessageFn<Message>, AddReceiverFn<Message>]

/**
 * Channels are strongly typed event buses.
 *
 * When an element is passed as the first argument, the channel will
 * only send messages to receivers that are bound to that element or to
 * one of its ancestors.
 *
 * The `Message` type must be a plain object. Use the `{}` type to
 * represent a message with no custom metadata.
 */
export function defineChannel<
  Message extends object = {}
>(): AlienChannel<Message> {
  let untargetedReceivers: Set<AlienReceiver<object, void>> | undefined
  let targetedReceiverCaches: WeakMap<Node, Set<AlienReceiver>> | undefined

  const bubble = (target: Node, message: AlienBubblingMessage) => {
    const receivers = targetedReceiverCaches!.get(target)
    if (receivers) {
      message.currentTarget = target
      for (const receiver of [...receivers]) {
        receiver(message)
        if (message.stopImmediatePropagation === noop) {
          return
        }
      }
      if (message.stopPropagation === noop) {
        return
      }
    }
    if (target.parentNode) {
      bubble(target.parentNode, message)
    } else if (untargetedReceivers) {
      message.currentTarget = document
      for (const receiver of [...untargetedReceivers]) {
        receiver(message)
        if (message.stopImmediatePropagation === noop) {
          return
        }
      }
    }
  }

  const addReceiver: AddReceiverFn<Message> = (arg1: any, arg2?: any): any => {
    if (isNode(arg1)) {
      const receiversByTarget = (targetedReceiverCaches ||= new WeakMap())
      return createEffect({
        target: arg1,
        args: [arg2],
        enable(target: Node, receiver: AlienReceiver) {
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

  const sendMessage: SendMessageFn<Message> = (arg1: any, arg2?: any) => {
    let message: AlienMessage | null

    if (isNode(arg1)) {
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

    if (untargetedReceivers) {
      message ||= { ...arg1 } as AlienMessage
      message.stopPropagation = noop
      message.stopImmediatePropagation = () => {
        message = null
      }
      for (const receiver of [...untargetedReceivers]) {
        receiver(message)
        if (!message) {
          return
        }
      }
    }
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
