import type { AnyElement } from '../internal/types'
import type { AriaAttributes, AriaRole } from './aria'
import type { Booleanish, AttrWithRef } from './attr'
import type { JSX } from './jsx'
import { StyleAttributes, TransformAttributes } from '../internal/types'
import type {
  CSSProperties,
  DOMAttributes,
  DOMClassAttribute,
  DOMFactory,
} from './dom'

export type HTMLElementTagNames = keyof HTMLElementTagNameMap

export type HTMLFactory<T extends HTMLElement> = DetailedHTMLFactory<
  AllHTMLAttributes<T>,
  T
>

interface DetailedHTMLFactory<
  P extends HTMLAttributes<T>,
  T extends HTMLElement
> extends DOMFactory<P, T> {
  (props?: (P & AttrWithRef<T>) | null, ...children: JSX.Children[]): T
  (...children: JSX.Children[]): T
}

export type DetailedHTMLProps<E extends HTMLAttributes<T>, T> = E &
  AttrWithRef<Extract<T, AnyElement>> & {
    [K in string & keyof E as `initial:${K}`]?: E[K]
  }

export type HTMLStyleAttribute =
  | readonly StyleAttributes[]
  | StyleAttributes
  | string

export interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
  // Extension
  namespaceURI?: string | undefined
  class?: DOMClassAttribute | undefined
  innerHTML?: string | undefined
  innerText?: string | undefined
  textContent?: string | undefined
  dataset?: { [key: string]: string } | undefined

  // Standard HTML Attributes
  accessKey?: string | undefined
  className?: DOMClassAttribute | undefined
  contentEditable?: Booleanish | 'inherit' | undefined
  contextMenu?: string | undefined
  dir?: string | undefined
  draggable?: Booleanish | undefined
  hidden?: boolean | undefined
  id?: string | undefined
  lang?: string | undefined
  placeholder?: string | undefined
  slot?: string | undefined
  spellCheck?: Booleanish | undefined
  style?: HTMLStyleAttribute | undefined
  tabIndex?: number | undefined
  title?: string | undefined
  translate?: 'yes' | 'no' | undefined

  // Unknown
  radioGroup?: string | undefined // <command>, <menuitem>

  // WAI-ARIA
  role?: AriaRole | undefined

  // RDFa Attributes
  about?: string | undefined
  datatype?: string | undefined
  inlist?: any | undefined
  prefix?: string | undefined
  property?: string | undefined
  resource?: string | undefined
  typeof?: string | undefined
  vocab?: string | undefined

  // Non-standard Attributes
  autoCapitalize?: string | undefined
  autoCorrect?: string | undefined
  autoSave?: string | undefined
  color?: string | undefined
  itemProp?: string | undefined
  itemScope?: boolean | undefined
  itemType?: string | undefined
  itemID?: string | undefined
  itemRef?: string | undefined
  results?: number | undefined
  security?: string | undefined
  unselectable?: 'on' | 'off' | undefined

  // Living Standard
  /**
   * Hints at the type of data that might be entered by the user while editing the element or its contents
   * @see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute
   */
  inputMode?:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search'
    | undefined
  /**
   * Specify that a standard HTML element should behave like a defined custom built-in element
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
   */
  is?: string | undefined
}

export interface AllHTMLAttributes<T> extends HTMLAttributes<T> {
  // Standard HTML Attributes
  accept?: string | undefined
  acceptCharset?: string | undefined
  action?: string | undefined
  allowFullScreen?: boolean | undefined
  allowTransparency?: boolean | undefined
  alt?: string | undefined
  as?: string | undefined
  async?: boolean | undefined
  autoComplete?: string | undefined
  autoFocus?: boolean | undefined
  autoPlay?: boolean | undefined
  capture?: boolean | string | undefined
  cellPadding?: number | string | undefined
  cellSpacing?: number | string | undefined
  charSet?: string | undefined
  challenge?: string | undefined
  checked?: boolean | undefined
  cite?: string | undefined
  classID?: string | undefined
  cols?: number | undefined
  colSpan?: number | undefined
  content?: string | undefined
  controls?: boolean | undefined
  coords?: string | undefined
  crossOrigin?: string | undefined
  data?: string | undefined
  dateTime?: string | undefined
  default?: boolean | undefined
  defer?: boolean | undefined
  disabled?: boolean | undefined
  download?: any
  encType?: string | undefined
  form?: string | undefined
  formAction?: string | undefined
  formEncType?: string | undefined
  formMethod?: string | undefined
  formNoValidate?: boolean | undefined
  formTarget?: string | undefined
  frameBorder?: number | string | undefined
  headers?: string | undefined
  height?: number | string | undefined
  high?: number | undefined
  href?: string | undefined
  hrefLang?: string | undefined
  htmlFor?: string | undefined
  httpEquiv?: string | undefined
  integrity?: string | undefined
  keyParams?: string | undefined
  keyType?: string | undefined
  kind?: string | undefined
  label?: string | undefined
  list?: string | undefined
  loop?: boolean | undefined
  low?: number | undefined
  manifest?: string | undefined
  marginHeight?: number | undefined
  marginWidth?: number | undefined
  max?: number | string | undefined
  maxLength?: number | undefined
  media?: string | undefined
  mediaGroup?: string | undefined
  method?: string | undefined
  min?: number | string | undefined
  minLength?: number | undefined
  multiple?: boolean | undefined
  muted?: boolean | undefined
  name?: string | undefined
  nonce?: string | undefined
  noValidate?: boolean | undefined
  open?: boolean | undefined
  optimum?: number | undefined
  pattern?: string | undefined
  placeholder?: string | undefined
  playsInline?: boolean | undefined
  poster?: string | undefined
  preload?: string | undefined
  readOnly?: boolean | undefined
  rel?: string | undefined
  required?: boolean | undefined
  reversed?: boolean | undefined
  rows?: number | undefined
  rowSpan?: number | undefined
  sandbox?: string | undefined
  scope?: string | undefined
  scoped?: boolean | undefined
  scrolling?: string | undefined
  seamless?: boolean | undefined
  selected?: boolean | undefined
  shape?: string | undefined
  size?: number | undefined
  sizes?: string | undefined
  span?: number | undefined
  src?: string | undefined
  srcDoc?: string | undefined
  srcLang?: string | undefined
  srcSet?: string | undefined
  start?: number | undefined
  step?: number | string | undefined
  summary?: string | undefined
  target?: string | undefined
  type?: string | undefined
  useMap?: string | undefined
  value?: string | number | undefined
  width?: number | string | undefined
  wmode?: string | undefined
  wrap?: string | undefined
}

export type HTMLAttributeReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

export type HTMLAttributeAnchorTarget =
  | '_self'
  | '_blank'
  | '_parent'
  | '_top'
  | (string & {})
