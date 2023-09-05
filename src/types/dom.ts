import type * as CSS from 'csstype'
import type { AlienEvent } from '../element'
import type { ReadonlyRef } from '../observable'
import type { AttrWithRef } from './attr'
import type { JSX } from './jsx'

export interface CSSProperties extends CSS.Properties<string | number> {}

export type DOMFactory<P extends DOMAttributes<T>, T extends Element> = (
  props?: (P & AttrWithRef<T>) | null,
  ...children: JSX.ChildrenProp[]
) => T

export type DOMClassArray = (
  | DOMClassAttribute
  | ReadonlyRef<DOMClassAttribute>
)[]

export type DOMClassAttribute =
  | readonly (DOMClassAttribute | ReadonlyRef<DOMClassAttribute>)[]
  | string
  | { [key: string]: boolean | ReadonlyRef<boolean> }
  | DOMTokenList
  | false
  | null
  | undefined

export interface DOMAttributes<T> {
  children?: JSX.ChildrenProp | undefined

  // Clipboard Events
  onCopy?: ClipboardEventHandler<T> | undefined
  onCopyCapture?: ClipboardEventHandler<T> | undefined
  onCut?: ClipboardEventHandler<T> | undefined
  onCutCapture?: ClipboardEventHandler<T> | undefined
  onPaste?: ClipboardEventHandler<T> | undefined
  onPasteCapture?: ClipboardEventHandler<T> | undefined

  // Composition Events
  onCompositionEnd?: CompositionEventHandler<T> | undefined
  onCompositionEndCapture?: CompositionEventHandler<T> | undefined
  onCompositionStart?: CompositionEventHandler<T> | undefined
  onCompositionStartCapture?: CompositionEventHandler<T> | undefined
  onCompositionUpdate?: CompositionEventHandler<T> | undefined
  onCompositionUpdateCapture?: CompositionEventHandler<T> | undefined

  // Focus Events
  onFocus?: FocusEventHandler<T> | undefined
  onFocusCapture?: FocusEventHandler<T> | undefined
  onBlur?: FocusEventHandler<T> | undefined
  onBlurCapture?: FocusEventHandler<T> | undefined

  // Form Events
  onChange?: FormEventHandler<T> | undefined
  onChangeCapture?: FormEventHandler<T> | undefined
  onBeforeInput?: FormEventHandler<T> | undefined
  onBeforeInputCapture?: FormEventHandler<T> | undefined
  onInput?: FormEventHandler<T> | undefined
  onInputCapture?: FormEventHandler<T> | undefined
  onReset?: FormEventHandler<T> | undefined
  onResetCapture?: FormEventHandler<T> | undefined
  onSubmit?: FormEventHandler<T> | undefined
  onSubmitCapture?: FormEventHandler<T> | undefined
  onInvalid?: FormEventHandler<T> | undefined
  onInvalidCapture?: FormEventHandler<T> | undefined

  // Image Events
  onLoad?: EventHandler<Event, T> | undefined
  onLoadCapture?: EventHandler<Event, T> | undefined
  onError?: EventHandler<Event, T> | undefined // also a Media Event
  onErrorCapture?: EventHandler<Event, T> | undefined // also a Media Event

  // Keyboard Events
  onKeyDown?: KeyboardEventHandler<T> | undefined
  onKeyDownCapture?: KeyboardEventHandler<T> | undefined
  onKeyPress?: KeyboardEventHandler<T> | undefined
  onKeyPressCapture?: KeyboardEventHandler<T> | undefined
  onKeyUp?: KeyboardEventHandler<T> | undefined
  onKeyUpCapture?: KeyboardEventHandler<T> | undefined

  // Media Events
  onAbort?: EventHandler<Event, T> | undefined
  onAbortCapture?: EventHandler<Event, T> | undefined
  onCanPlay?: EventHandler<Event, T> | undefined
  onCanPlayCapture?: EventHandler<Event, T> | undefined
  onCanPlayThrough?: EventHandler<Event, T> | undefined
  onCanPlayThroughCapture?: EventHandler<Event, T> | undefined
  onDurationChange?: EventHandler<Event, T> | undefined
  onDurationChangeCapture?: EventHandler<Event, T> | undefined
  onEmptied?: EventHandler<Event, T> | undefined
  onEmptiedCapture?: EventHandler<Event, T> | undefined
  onEncrypted?: EventHandler<Event, T> | undefined
  onEncryptedCapture?: EventHandler<Event, T> | undefined
  onEnded?: EventHandler<Event, T> | undefined
  onEndedCapture?: EventHandler<Event, T> | undefined
  onLoadedData?: EventHandler<Event, T> | undefined
  onLoadedDataCapture?: EventHandler<Event, T> | undefined
  onLoadedMetadata?: EventHandler<Event, T> | undefined
  onLoadedMetadataCapture?: EventHandler<Event, T> | undefined
  onLoadStart?: EventHandler<Event, T> | undefined
  onLoadStartCapture?: EventHandler<Event, T> | undefined
  onPause?: EventHandler<Event, T> | undefined
  onPauseCapture?: EventHandler<Event, T> | undefined
  onPlay?: EventHandler<Event, T> | undefined
  onPlayCapture?: EventHandler<Event, T> | undefined
  onPlaying?: EventHandler<Event, T> | undefined
  onPlayingCapture?: EventHandler<Event, T> | undefined
  onProgress?: EventHandler<Event, T> | undefined
  onProgressCapture?: EventHandler<Event, T> | undefined
  onRateChange?: EventHandler<Event, T> | undefined
  onRateChangeCapture?: EventHandler<Event, T> | undefined
  onSeeked?: EventHandler<Event, T> | undefined
  onSeekedCapture?: EventHandler<Event, T> | undefined
  onSeeking?: EventHandler<Event, T> | undefined
  onSeekingCapture?: EventHandler<Event, T> | undefined
  onStalled?: EventHandler<Event, T> | undefined
  onStalledCapture?: EventHandler<Event, T> | undefined
  onSuspend?: EventHandler<Event, T> | undefined
  onSuspendCapture?: EventHandler<Event, T> | undefined
  onTimeUpdate?: EventHandler<Event, T> | undefined
  onTimeUpdateCapture?: EventHandler<Event, T> | undefined
  onVolumeChange?: EventHandler<Event, T> | undefined
  onVolumeChangeCapture?: EventHandler<Event, T> | undefined
  onWaiting?: EventHandler<Event, T> | undefined
  onWaitingCapture?: EventHandler<Event, T> | undefined

  // MouseEvents
  onAuxClick?: MouseEventHandler<T> | undefined
  onAuxClickCapture?: MouseEventHandler<T> | undefined
  onClick?: MouseEventHandler<T> | undefined
  onClickCapture?: MouseEventHandler<T> | undefined
  onContextMenu?: MouseEventHandler<T> | undefined
  onContextMenuCapture?: MouseEventHandler<T> | undefined
  onDblClick?: MouseEventHandler<T> | undefined
  onDblClickCapture?: MouseEventHandler<T> | undefined
  onDrag?: DragEventHandler<T> | undefined
  onDragCapture?: DragEventHandler<T> | undefined
  onDragEnd?: DragEventHandler<T> | undefined
  onDragEndCapture?: DragEventHandler<T> | undefined
  onDragEnter?: DragEventHandler<T> | undefined
  onDragEnterCapture?: DragEventHandler<T> | undefined
  onDragExit?: DragEventHandler<T> | undefined
  onDragExitCapture?: DragEventHandler<T> | undefined
  onDragLeave?: DragEventHandler<T> | undefined
  onDragLeaveCapture?: DragEventHandler<T> | undefined
  onDragOver?: DragEventHandler<T> | undefined
  onDragOverCapture?: DragEventHandler<T> | undefined
  onDragStart?: DragEventHandler<T> | undefined
  onDragStartCapture?: DragEventHandler<T> | undefined
  onDrop?: DragEventHandler<T> | undefined
  onDropCapture?: DragEventHandler<T> | undefined
  onMouseDown?: MouseEventHandler<T> | undefined
  onMouseDownCapture?: MouseEventHandler<T> | undefined
  onMouseEnter?: MouseEventHandler<T> | undefined
  onMouseLeave?: MouseEventHandler<T> | undefined
  onMouseMove?: MouseEventHandler<T> | undefined
  onMouseMoveCapture?: MouseEventHandler<T> | undefined
  onMouseOut?: MouseEventHandler<T> | undefined
  onMouseOutCapture?: MouseEventHandler<T> | undefined
  onMouseOver?: MouseEventHandler<T> | undefined
  onMouseOverCapture?: MouseEventHandler<T> | undefined
  onMouseUp?: MouseEventHandler<T> | undefined
  onMouseUpCapture?: MouseEventHandler<T> | undefined

  // Selection Events
  onSelect?: EventHandler<Event, T> | undefined
  onSelectCapture?: EventHandler<Event, T> | undefined

  // Touch Events
  onTouchCancel?: TouchEventHandler<T> | undefined
  onTouchCancelCapture?: TouchEventHandler<T> | undefined
  onTouchEnd?: TouchEventHandler<T> | undefined
  onTouchEndCapture?: TouchEventHandler<T> | undefined
  onTouchMove?: TouchEventHandler<T> | undefined
  onTouchMoveCapture?: TouchEventHandler<T> | undefined
  onTouchStart?: TouchEventHandler<T> | undefined
  onTouchStartCapture?: TouchEventHandler<T> | undefined

  // Pointer Events
  onPointerDown?: PointerEventHandler<T> | undefined
  onPointerDownCapture?: PointerEventHandler<T> | undefined
  onPointerMove?: PointerEventHandler<T> | undefined
  onPointerMoveCapture?: PointerEventHandler<T> | undefined
  onPointerUp?: PointerEventHandler<T> | undefined
  onPointerUpCapture?: PointerEventHandler<T> | undefined
  onPointerCancel?: PointerEventHandler<T> | undefined
  onPointerCancelCapture?: PointerEventHandler<T> | undefined
  onPointerEnter?: PointerEventHandler<T> | undefined
  onPointerEnterCapture?: PointerEventHandler<T> | undefined
  onPointerLeave?: PointerEventHandler<T> | undefined
  onPointerLeaveCapture?: PointerEventHandler<T> | undefined
  onPointerOver?: PointerEventHandler<T> | undefined
  onPointerOverCapture?: PointerEventHandler<T> | undefined
  onPointerOut?: PointerEventHandler<T> | undefined
  onPointerOutCapture?: PointerEventHandler<T> | undefined
  onGotPointerCapture?: PointerEventHandler<T> | undefined
  onGotPointerCaptureCapture?: PointerEventHandler<T> | undefined
  onLostPointerCapture?: PointerEventHandler<T> | undefined
  onLostPointerCaptureCapture?: PointerEventHandler<T> | undefined

  // UI Events
  onScroll?: UIEventHandler<T> | undefined
  onScrollCapture?: UIEventHandler<T> | undefined

  // Wheel Events
  onWheel?: WheelEventHandler<T> | undefined
  onWheelCapture?: WheelEventHandler<T> | undefined

  // Animation Events
  onAnimationStart?: AnimationEventHandler<T> | undefined
  onAnimationStartCapture?: AnimationEventHandler<T> | undefined
  onAnimationEnd?: AnimationEventHandler<T> | undefined
  onAnimationEndCapture?: AnimationEventHandler<T> | undefined
  onAnimationIteration?: AnimationEventHandler<T> | undefined
  onAnimationIterationCapture?: AnimationEventHandler<T> | undefined

  // Transition Events
  onTransitionEnd?: TransitionEventHandler<T> | undefined
  onTransitionEndCapture?: TransitionEventHandler<T> | undefined
}

type FormEvent = Event
type ChangeEvent = Event

//
// Event Handler Types
// ----------------------------------------------------------------------

export type EventHandler<E extends Event = Event, T = Element> = (
  event: AlienEvent<E, Extract<T, Element>>
) => void

export type ClipboardEventHandler<T = Element> = EventHandler<ClipboardEvent, T>
export type CompositionEventHandler<T = Element> = EventHandler<
  CompositionEvent,
  T
>
export type DragEventHandler<T = Element> = EventHandler<DragEvent, T>
export type FocusEventHandler<T = Element> = EventHandler<FocusEvent, T>
export type FormEventHandler<T = Element> = EventHandler<FormEvent, T>
export type ChangeEventHandler<T = Element> = EventHandler<ChangeEvent, T>
export type KeyboardEventHandler<T = Element> = EventHandler<KeyboardEvent, T>
export type MouseEventHandler<T = Element> = EventHandler<MouseEvent, T>
export type TouchEventHandler<T = Element> = EventHandler<TouchEvent, T>
export type PointerEventHandler<T = Element> = EventHandler<PointerEvent, T>
export type UIEventHandler<T = Element> = EventHandler<UIEvent, T>
export type WheelEventHandler<T = Element> = EventHandler<WheelEvent, T>
export type AnimationEventHandler<T = Element> = EventHandler<AnimationEvent, T>
export type TransitionEventHandler<T = Element> = EventHandler<
  TransitionEvent,
  T
>
