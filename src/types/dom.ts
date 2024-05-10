import type { AlienEvent } from '../addons/elementFunctions'

export interface DOMAttributes<T> {
  // Clipboard Events
  onCopy?: ClipboardEventHandler<T>
  onCopyCapture?: ClipboardEventHandler<T>
  onCut?: ClipboardEventHandler<T>
  onCutCapture?: ClipboardEventHandler<T>
  onPaste?: ClipboardEventHandler<T>
  onPasteCapture?: ClipboardEventHandler<T>

  // Composition Events
  onCompositionEnd?: CompositionEventHandler<T>
  onCompositionEndCapture?: CompositionEventHandler<T>
  onCompositionStart?: CompositionEventHandler<T>
  onCompositionStartCapture?: CompositionEventHandler<T>
  onCompositionUpdate?: CompositionEventHandler<T>
  onCompositionUpdateCapture?: CompositionEventHandler<T>

  // Focus Events
  onFocus?: FocusEventHandler<T>
  onFocusCapture?: FocusEventHandler<T>
  onBlur?: FocusEventHandler<T>
  onBlurCapture?: FocusEventHandler<T>

  // Form Events
  onChange?: FormEventHandler<T>
  onChangeCapture?: FormEventHandler<T>
  onBeforeInput?: FormEventHandler<T>
  onBeforeInputCapture?: FormEventHandler<T>
  onInput?: FormEventHandler<T>
  onInputCapture?: FormEventHandler<T>
  onReset?: FormEventHandler<T>
  onResetCapture?: FormEventHandler<T>
  onSubmit?: FormEventHandler<T>
  onSubmitCapture?: FormEventHandler<T>
  onInvalid?: FormEventHandler<T>
  onInvalidCapture?: FormEventHandler<T>

  // Image Events
  onLoad?: EventHandler<Event, T>
  onLoadCapture?: EventHandler<Event, T>
  onError?: EventHandler<Event, T> // also a Media Event
  onErrorCapture?: EventHandler<Event, T> // also a Media Event

  // Keyboard Events
  onKeyDown?: KeyboardEventHandler<T>
  onKeyDownCapture?: KeyboardEventHandler<T>
  onKeyPress?: KeyboardEventHandler<T>
  onKeyPressCapture?: KeyboardEventHandler<T>
  onKeyUp?: KeyboardEventHandler<T>
  onKeyUpCapture?: KeyboardEventHandler<T>

  // Media Events
  onAbort?: EventHandler<Event, T>
  onAbortCapture?: EventHandler<Event, T>
  onCanPlay?: EventHandler<Event, T>
  onCanPlayCapture?: EventHandler<Event, T>
  onCanPlayThrough?: EventHandler<Event, T>
  onCanPlayThroughCapture?: EventHandler<Event, T>
  onDurationChange?: EventHandler<Event, T>
  onDurationChangeCapture?: EventHandler<Event, T>
  onEmptied?: EventHandler<Event, T>
  onEmptiedCapture?: EventHandler<Event, T>
  onEncrypted?: EventHandler<Event, T>
  onEncryptedCapture?: EventHandler<Event, T>
  onEnded?: EventHandler<Event, T>
  onEndedCapture?: EventHandler<Event, T>
  onLoadedData?: EventHandler<Event, T>
  onLoadedDataCapture?: EventHandler<Event, T>
  onLoadedMetadata?: EventHandler<Event, T>
  onLoadedMetadataCapture?: EventHandler<Event, T>
  onLoadStart?: EventHandler<Event, T>
  onLoadStartCapture?: EventHandler<Event, T>
  onPause?: EventHandler<Event, T>
  onPauseCapture?: EventHandler<Event, T>
  onPlay?: EventHandler<Event, T>
  onPlayCapture?: EventHandler<Event, T>
  onPlaying?: EventHandler<Event, T>
  onPlayingCapture?: EventHandler<Event, T>
  onProgress?: EventHandler<Event, T>
  onProgressCapture?: EventHandler<Event, T>
  onRateChange?: EventHandler<Event, T>
  onRateChangeCapture?: EventHandler<Event, T>
  onSeeked?: EventHandler<Event, T>
  onSeekedCapture?: EventHandler<Event, T>
  onSeeking?: EventHandler<Event, T>
  onSeekingCapture?: EventHandler<Event, T>
  onStalled?: EventHandler<Event, T>
  onStalledCapture?: EventHandler<Event, T>
  onSuspend?: EventHandler<Event, T>
  onSuspendCapture?: EventHandler<Event, T>
  onTimeUpdate?: EventHandler<Event, T>
  onTimeUpdateCapture?: EventHandler<Event, T>
  onVolumeChange?: EventHandler<Event, T>
  onVolumeChangeCapture?: EventHandler<Event, T>
  onWaiting?: EventHandler<Event, T>
  onWaitingCapture?: EventHandler<Event, T>

  // MouseEvents
  onAuxClick?: MouseEventHandler<T>
  onAuxClickCapture?: MouseEventHandler<T>
  onClick?: MouseEventHandler<T>
  onClickCapture?: MouseEventHandler<T>
  onContextMenu?: MouseEventHandler<T>
  onContextMenuCapture?: MouseEventHandler<T>
  onDblClick?: MouseEventHandler<T>
  onDblClickCapture?: MouseEventHandler<T>
  onDrag?: DragEventHandler<T>
  onDragCapture?: DragEventHandler<T>
  onDragEnd?: DragEventHandler<T>
  onDragEndCapture?: DragEventHandler<T>
  onDragEnter?: DragEventHandler<T>
  onDragEnterCapture?: DragEventHandler<T>
  onDragExit?: DragEventHandler<T>
  onDragExitCapture?: DragEventHandler<T>
  onDragLeave?: DragEventHandler<T>
  onDragLeaveCapture?: DragEventHandler<T>
  onDragOver?: DragEventHandler<T>
  onDragOverCapture?: DragEventHandler<T>
  onDragStart?: DragEventHandler<T>
  onDragStartCapture?: DragEventHandler<T>
  onDrop?: DragEventHandler<T>
  onDropCapture?: DragEventHandler<T>
  onMouseDown?: MouseEventHandler<T>
  onMouseDownCapture?: MouseEventHandler<T>
  onMouseEnter?: MouseEventHandler<T>
  onMouseLeave?: MouseEventHandler<T>
  onMouseMove?: MouseEventHandler<T>
  onMouseMoveCapture?: MouseEventHandler<T>
  onMouseOut?: MouseEventHandler<T>
  onMouseOutCapture?: MouseEventHandler<T>
  onMouseOver?: MouseEventHandler<T>
  onMouseOverCapture?: MouseEventHandler<T>
  onMouseUp?: MouseEventHandler<T>
  onMouseUpCapture?: MouseEventHandler<T>

  // Selection Events
  onSelect?: EventHandler<Event, T>
  onSelectCapture?: EventHandler<Event, T>

  // Touch Events
  onTouchCancel?: TouchEventHandler<T>
  onTouchCancelCapture?: TouchEventHandler<T>
  onTouchEnd?: TouchEventHandler<T>
  onTouchEndCapture?: TouchEventHandler<T>
  onTouchMove?: TouchEventHandler<T>
  onTouchMoveCapture?: TouchEventHandler<T>
  onTouchStart?: TouchEventHandler<T>
  onTouchStartCapture?: TouchEventHandler<T>

  // Pointer Events
  onPointerDown?: PointerEventHandler<T>
  onPointerDownCapture?: PointerEventHandler<T>
  onPointerMove?: PointerEventHandler<T>
  onPointerMoveCapture?: PointerEventHandler<T>
  onPointerUp?: PointerEventHandler<T>
  onPointerUpCapture?: PointerEventHandler<T>
  onPointerCancel?: PointerEventHandler<T>
  onPointerCancelCapture?: PointerEventHandler<T>
  onPointerEnter?: PointerEventHandler<T>
  onPointerEnterCapture?: PointerEventHandler<T>
  onPointerLeave?: PointerEventHandler<T>
  onPointerLeaveCapture?: PointerEventHandler<T>
  onPointerOver?: PointerEventHandler<T>
  onPointerOverCapture?: PointerEventHandler<T>
  onPointerOut?: PointerEventHandler<T>
  onPointerOutCapture?: PointerEventHandler<T>
  onGotPointerCapture?: PointerEventHandler<T>
  onGotPointerCaptureCapture?: PointerEventHandler<T>
  onLostPointerCapture?: PointerEventHandler<T>
  onLostPointerCaptureCapture?: PointerEventHandler<T>

  // UI Events
  onScroll?: UIEventHandler<T>
  onScrollCapture?: UIEventHandler<T>

  // Wheel Events
  onWheel?: WheelEventHandler<T>
  onWheelCapture?: WheelEventHandler<T>

  // Animation Events
  onAnimationStart?: AnimationEventHandler<T>
  onAnimationStartCapture?: AnimationEventHandler<T>
  onAnimationEnd?: AnimationEventHandler<T>
  onAnimationEndCapture?: AnimationEventHandler<T>
  onAnimationIteration?: AnimationEventHandler<T>
  onAnimationIterationCapture?: AnimationEventHandler<T>

  // Transition Events
  onTransitionEnd?: TransitionEventHandler<T>
  onTransitionEndCapture?: TransitionEventHandler<T>
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
