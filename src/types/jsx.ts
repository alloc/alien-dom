import type { AnyElement } from '../internal/types'
import type { ShadowRootContainer } from '../jsx-dom/shadow'
import type { AttrWithRef, Attributes } from './attr'
import type {
  ChangeEventHandler,
  DragEventHandler,
  ReactEventHandler,
} from './dom'
import type {
  DetailedHTMLProps,
  HTMLAttributeAnchorTarget,
  HTMLAttributeReferrerPolicy,
  HTMLAttributes,
} from './html'
import type { SVGProps } from './svg'

type HTMLWebViewElement = HTMLElement

type Thunk<T = any> = () => T
type Thunkable<T> = T | Thunk<T>

export declare namespace JSX {
  type Element = HTMLElement
  type ElementKey = string | number
  type ElementRef<Element extends AnyElement = AnyElement> =
    import('../hooks/useElementRef').ElementRef<Element>

  type RefProp<Element extends AnyElement = AnyElement> =
    | readonly (RefProp<Element> | false | null | undefined)[]
    | ElementRef<Element>
    | false
    | null
    | undefined

  type Child =
    | NodeList
    | HTMLCollection
    | ShadowRootContainer
    | DocumentFragment
    | AnyElement
    | Text
    | Comment
    | string
    | number
    | boolean
    | null
    | undefined

  type Children = Thunkable<Child | Children[]>

  type ElementsOption = ElementOption | ElementOption[]
  type ElementOption =
    | HTMLElement
    | SVGElement
    | DocumentFragment
    | ShadowRootContainer
    | false
    | null
    | undefined

  /**
   * If defining the type of a component prop that can be a JSX element,
   * you have to use this type instead of `JSX.Element` or else you'll
   * be surprised when trying to use the element without passing it into
   * `fromElementProp` first.
   */
  type ElementProp = Thunkable<ElementOption>
  type ElementsProp = Thunkable<ElementOption | ElementOption[]>

  type ElementType = keyof IntrinsicElements | ((props: any) => ElementOption)

  type ElementAttributes<T> = keyof IntrinsicElements extends infer TagName
    ? TagName extends keyof IntrinsicElements
      ? IntrinsicElements[TagName]['onDrag'] extends
          | DragEventHandler<infer Element>
          | undefined
        ? Element extends T
          ? IntrinsicElements[TagName]
          : never
        : never
      : never
    : never

  interface ElementAttributesProperty {
    props: {}
  }
  interface ElementChildrenAttribute {
    children: {}
  }

  interface IntrinsicAttributes extends Attributes {}
  interface IntrinsicClassAttributes<T>
    extends AttrWithRef<Extract<T, AnyElement>> {}

  interface IntrinsicElements {
    // HTML
    a: DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >
    abbr: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    address: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    area: DetailedHTMLProps<
      AreaHTMLAttributes<HTMLAreaElement>,
      HTMLAreaElement
    >
    article: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    aside: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    audio: DetailedHTMLProps<
      AudioHTMLAttributes<HTMLAudioElement>,
      HTMLAudioElement
    >
    b: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    base: DetailedHTMLProps<
      BaseHTMLAttributes<HTMLBaseElement>,
      HTMLBaseElement
    >
    bdi: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    bdo: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    big: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    blockquote: DetailedHTMLProps<
      BlockquoteHTMLAttributes<HTMLElement>,
      HTMLElement
    >
    body: DetailedHTMLProps<HTMLAttributes<HTMLBodyElement>, HTMLBodyElement>
    br: DetailedHTMLProps<HTMLAttributes<HTMLBRElement>, HTMLBRElement>
    button: DetailedHTMLProps<
      ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    >
    canvas: DetailedHTMLProps<
      CanvasHTMLAttributes<HTMLCanvasElement>,
      HTMLCanvasElement
    >
    caption: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    cite: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    code: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    col: DetailedHTMLProps<
      ColHTMLAttributes<HTMLTableColElement>,
      HTMLTableColElement
    >
    colgroup: DetailedHTMLProps<
      ColgroupHTMLAttributes<HTMLTableColElement>,
      HTMLTableColElement
    >
    data: DetailedHTMLProps<
      DataHTMLAttributes<HTMLDataElement>,
      HTMLDataElement
    >
    datalist: DetailedHTMLProps<
      HTMLAttributes<HTMLDataListElement>,
      HTMLDataListElement
    >
    dd: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    del: DetailedHTMLProps<DelHTMLAttributes<HTMLElement>, HTMLElement>
    details: DetailedHTMLProps<DetailsHTMLAttributes<HTMLElement>, HTMLElement>
    dfn: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    dialog: DetailedHTMLProps<
      DialogHTMLAttributes<HTMLDialogElement>,
      HTMLDialogElement
    >
    div: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
    dl: DetailedHTMLProps<HTMLAttributes<HTMLDListElement>, HTMLDListElement>
    dt: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    em: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    embed: DetailedHTMLProps<
      EmbedHTMLAttributes<HTMLEmbedElement>,
      HTMLEmbedElement
    >
    fieldset: DetailedHTMLProps<
      FieldsetHTMLAttributes<HTMLFieldSetElement>,
      HTMLFieldSetElement
    >
    figcaption: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    figure: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    footer: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    form: DetailedHTMLProps<
      FormHTMLAttributes<HTMLFormElement>,
      HTMLFormElement
    >
    h1: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
    h2: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
    h3: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
    h4: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
    h5: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
    h6: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
    head: DetailedHTMLProps<HTMLAttributes<HTMLHeadElement>, HTMLHeadElement>
    header: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    hgroup: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    hr: DetailedHTMLProps<HTMLAttributes<HTMLHRElement>, HTMLHRElement>
    html: DetailedHTMLProps<
      HtmlHTMLAttributes<HTMLHtmlElement>,
      HTMLHtmlElement
    >
    i: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    iframe: DetailedHTMLProps<
      IframeHTMLAttributes<HTMLIFrameElement>,
      HTMLIFrameElement
    >
    img: DetailedHTMLProps<
      ImgHTMLAttributes<HTMLImageElement>,
      HTMLImageElement
    >
    input: DetailedHTMLProps<
      InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >
    ins: DetailedHTMLProps<InsHTMLAttributes<HTMLModElement>, HTMLModElement>
    kbd: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    keygen: DetailedHTMLProps<KeygenHTMLAttributes<HTMLElement>, HTMLElement>
    label: DetailedHTMLProps<
      LabelHTMLAttributes<HTMLLabelElement>,
      HTMLLabelElement
    >
    legend: DetailedHTMLProps<
      HTMLAttributes<HTMLLegendElement>,
      HTMLLegendElement
    >
    li: DetailedHTMLProps<LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>
    link: DetailedHTMLProps<
      LinkHTMLAttributes<HTMLLinkElement>,
      HTMLLinkElement
    >
    main: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    map: DetailedHTMLProps<MapHTMLAttributes<HTMLMapElement>, HTMLMapElement>
    mark: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    menu: DetailedHTMLProps<MenuHTMLAttributes<HTMLElement>, HTMLElement>
    menuitem: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    meta: DetailedHTMLProps<
      MetaHTMLAttributes<HTMLMetaElement>,
      HTMLMetaElement
    >
    meter: DetailedHTMLProps<MeterHTMLAttributes<HTMLElement>, HTMLElement>
    nav: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    noindex: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    noscript: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    object: DetailedHTMLProps<
      ObjectHTMLAttributes<HTMLObjectElement>,
      HTMLObjectElement
    >
    ol: DetailedHTMLProps<OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>
    optgroup: DetailedHTMLProps<
      OptgroupHTMLAttributes<HTMLOptGroupElement>,
      HTMLOptGroupElement
    >
    option: DetailedHTMLProps<
      OptionHTMLAttributes<HTMLOptionElement>,
      HTMLOptionElement
    >
    output: DetailedHTMLProps<OutputHTMLAttributes<HTMLElement>, HTMLElement>
    p: DetailedHTMLProps<
      HTMLAttributes<HTMLParagraphElement>,
      HTMLParagraphElement
    >
    param: DetailedHTMLProps<
      ParamHTMLAttributes<HTMLParamElement>,
      HTMLParamElement
    >
    picture: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    pre: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>
    progress: DetailedHTMLProps<
      ProgressHTMLAttributes<HTMLProgressElement>,
      HTMLProgressElement
    >
    q: DetailedHTMLProps<
      QuoteHTMLAttributes<HTMLQuoteElement>,
      HTMLQuoteElement
    >
    rp: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    rt: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    ruby: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    s: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    samp: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    script: DetailedHTMLProps<
      ScriptHTMLAttributes<HTMLScriptElement>,
      HTMLScriptElement
    >
    section: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    select: DetailedHTMLProps<
      SelectHTMLAttributes<HTMLSelectElement>,
      HTMLSelectElement
    >
    slot: DetailedHTMLProps<
      SlotHTMLAttributes<HTMLSlotElement>,
      HTMLSlotElement
    >
    small: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    source: DetailedHTMLProps<
      SourceHTMLAttributes<HTMLSourceElement>,
      HTMLSourceElement
    >
    span: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>
    strong: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    style: DetailedHTMLProps<
      StyleHTMLAttributes<HTMLStyleElement>,
      HTMLStyleElement
    >
    sub: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    summary: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    sup: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    table: DetailedHTMLProps<
      TableHTMLAttributes<HTMLTableElement>,
      HTMLTableElement
    >
    template: DetailedHTMLProps<
      HTMLAttributes<HTMLTemplateElement>,
      HTMLTemplateElement
    >
    tbody: DetailedHTMLProps<
      HTMLAttributes<HTMLTableSectionElement>,
      HTMLTableSectionElement
    >
    td: DetailedHTMLProps<
      TdHTMLAttributes<HTMLTableDataCellElement>,
      HTMLTableDataCellElement
    >
    textarea: DetailedHTMLProps<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      HTMLTextAreaElement
    >
    tfoot: DetailedHTMLProps<
      HTMLAttributes<HTMLTableSectionElement>,
      HTMLTableSectionElement
    >
    th: DetailedHTMLProps<
      ThHTMLAttributes<HTMLTableHeaderCellElement>,
      HTMLTableHeaderCellElement
    >
    thead: DetailedHTMLProps<
      HTMLAttributes<HTMLTableSectionElement>,
      HTMLTableSectionElement
    >
    time: DetailedHTMLProps<TimeHTMLAttributes<HTMLElement>, HTMLElement>
    title: DetailedHTMLProps<HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>
    tr: DetailedHTMLProps<
      HTMLAttributes<HTMLTableRowElement>,
      HTMLTableRowElement
    >
    track: DetailedHTMLProps<
      TrackHTMLAttributes<HTMLTrackElement>,
      HTMLTrackElement
    >
    u: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    ul: DetailedHTMLProps<HTMLAttributes<HTMLUListElement>, HTMLUListElement>
    var: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    video: DetailedHTMLProps<
      VideoHTMLAttributes<HTMLVideoElement>,
      HTMLVideoElement
    >
    wbr: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    webview: DetailedHTMLProps<
      WebViewHTMLAttributes<HTMLWebViewElement>,
      HTMLWebViewElement
    >

    // SVG
    svg: SVGProps<SVGSVGElement>

    animate: SVGProps<SVGElement> // TODO: It is SVGAnimateElement but is not in TypeScript's lib.dom.d.ts for now.
    animateMotion: SVGProps<SVGElement>
    animateTransform: SVGProps<SVGElement> // TODO: It is SVGAnimateTransformElement but is not in TypeScript's lib.dom.d.ts for now.
    circle: SVGProps<SVGCircleElement>
    clipPath: SVGProps<SVGClipPathElement>
    defs: SVGProps<SVGDefsElement>
    desc: SVGProps<SVGDescElement>
    ellipse: SVGProps<SVGEllipseElement>
    feBlend: SVGProps<SVGFEBlendElement>
    feColorMatrix: SVGProps<SVGFEColorMatrixElement>
    feComponentTransfer: SVGProps<SVGFEComponentTransferElement>
    feComposite: SVGProps<SVGFECompositeElement>
    feConvolveMatrix: SVGProps<SVGFEConvolveMatrixElement>
    feDiffuseLighting: SVGProps<SVGFEDiffuseLightingElement>
    feDisplacementMap: SVGProps<SVGFEDisplacementMapElement>
    feDistantLight: SVGProps<SVGFEDistantLightElement>
    feDropShadow: SVGProps<SVGFEDropShadowElement>
    feFlood: SVGProps<SVGFEFloodElement>
    feFuncA: SVGProps<SVGFEFuncAElement>
    feFuncB: SVGProps<SVGFEFuncBElement>
    feFuncG: SVGProps<SVGFEFuncGElement>
    feFuncR: SVGProps<SVGFEFuncRElement>
    feGaussianBlur: SVGProps<SVGFEGaussianBlurElement>
    feImage: SVGProps<SVGFEImageElement>
    feMerge: SVGProps<SVGFEMergeElement>
    feMergeNode: SVGProps<SVGFEMergeNodeElement>
    feMorphology: SVGProps<SVGFEMorphologyElement>
    feOffset: SVGProps<SVGFEOffsetElement>
    fePointLight: SVGProps<SVGFEPointLightElement>
    feSpecularLighting: SVGProps<SVGFESpecularLightingElement>
    feSpotLight: SVGProps<SVGFESpotLightElement>
    feTile: SVGProps<SVGFETileElement>
    feTurbulence: SVGProps<SVGFETurbulenceElement>
    filter: SVGProps<SVGFilterElement>
    foreignObject: SVGProps<SVGForeignObjectElement>
    g: SVGProps<SVGGElement>
    image: SVGProps<SVGImageElement>
    line: SVGProps<SVGLineElement>
    linearGradient: SVGProps<SVGLinearGradientElement>
    marker: SVGProps<SVGMarkerElement>
    mask: SVGProps<SVGMaskElement>
    metadata: SVGProps<SVGMetadataElement>
    mpath: SVGProps<SVGElement>
    path: SVGProps<SVGPathElement>
    pattern: SVGProps<SVGPatternElement>
    polygon: SVGProps<SVGPolygonElement>
    polyline: SVGProps<SVGPolylineElement>
    radialGradient: SVGProps<SVGRadialGradientElement>
    rect: SVGProps<SVGRectElement>
    stop: SVGProps<SVGStopElement>
    switch: SVGProps<SVGSwitchElement>
    symbol: SVGProps<SVGSymbolElement>
    text: SVGProps<SVGTextElement>
    textPath: SVGProps<SVGTextPathElement>
    tspan: SVGProps<SVGTSpanElement>
    use: SVGProps<SVGUseElement>
    view: SVGProps<SVGViewElement>
  }

  type InstanceType<T extends string> = T extends keyof IntrinsicElements
    ? IntrinsicElements[T]['ref'] extends RefProp<infer Element>
      ? Element
      : never
    : never
}

interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
  download?: any | undefined
  href?: string | undefined
  hrefLang?: string | undefined
  media?: string | undefined
  ping?: string | undefined
  rel?: string | undefined
  target?: HTMLAttributeAnchorTarget | undefined
  type?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
}

interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}

interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
  alt?: string | undefined
  coords?: string | undefined
  download?: any | undefined
  href?: string | undefined
  hrefLang?: string | undefined
  media?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  rel?: string | undefined
  shape?: string | undefined
  target?: string | undefined
}

interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
  href?: string | undefined
  target?: string | undefined
}

interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
}

interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
  autoFocus?: boolean | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  formAction?: string | undefined
  formEncType?: string | undefined
  formMethod?: string | undefined
  formNoValidate?: boolean | undefined
  formTarget?: string | undefined
  name?: string | undefined
  type?: 'submit' | 'reset' | 'button' | undefined
  value?: string | number | undefined
}

interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined
  width?: number | string | undefined
}

interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
  span?: number | undefined
  width?: number | string | undefined
}

interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
  span?: number | undefined
}

interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
  value?: string | number | undefined
}

interface DetailsHTMLAttributes<T> extends HTMLAttributes<T> {
  open?: boolean | undefined
  onToggle?: ReactEventHandler<T> | undefined
}

interface DelHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
  dateTime?: string | undefined
}

interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
  open?: boolean | undefined
}

interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined
  src?: string | undefined
  type?: string | undefined
  width?: number | string | undefined
}

interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined
  form?: string | undefined
  name?: string | undefined
}

interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
  acceptCharset?: string | undefined
  action?: string | undefined
  autoComplete?: string | undefined
  encType?: string | undefined
  method?: string | undefined
  name?: string | undefined
  noValidate?: boolean | undefined
  target?: string | undefined
}

interface HtmlHTMLAttributes<T> extends HTMLAttributes<T> {
  manifest?: string | undefined
}

interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
  allow?: string | undefined
  allowFullScreen?: boolean | undefined
  allowTransparency?: boolean | undefined
  /** @deprecated */
  frameBorder?: number | string | undefined
  height?: number | string | undefined
  loading?: 'eager' | 'lazy' | undefined
  /** @deprecated */
  marginHeight?: number | undefined
  /** @deprecated */
  marginWidth?: number | undefined
  name?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sandbox?: string | undefined
  /** @deprecated */
  scrolling?: string | undefined
  seamless?: boolean | undefined
  src?: string | undefined
  srcDoc?: string | undefined
  width?: number | string | undefined
}

interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
  alt?: string | undefined
  crossOrigin?: 'anonymous' | 'use-credentials' | '' | undefined
  decoding?: 'async' | 'auto' | 'sync' | undefined
  height?: number | string | undefined
  loading?: 'eager' | 'lazy' | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sizes?: string | undefined
  src?: string | undefined
  srcSet?: string | undefined
  useMap?: string | undefined
  width?: number | string | undefined
}

interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
  dateTime?: string | undefined
}

interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
  accept?: string | undefined
  alt?: string | undefined
  autoComplete?: string | undefined
  autoFocus?: boolean | undefined
  capture?: boolean | string | undefined // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
  checked?: boolean | undefined
  crossOrigin?: string | undefined
  disabled?: boolean | undefined
  enterKeyHint?:
    | 'enter'
    | 'done'
    | 'go'
    | 'next'
    | 'previous'
    | 'search'
    | 'send'
    | undefined
  form?: string | undefined
  formAction?: string | undefined
  formEncType?: string | undefined
  formMethod?: string | undefined
  formNoValidate?: boolean | undefined
  formTarget?: string | undefined
  height?: number | string | undefined
  list?: string | undefined
  max?: number | string | undefined
  maxLength?: number | undefined
  min?: number | string | undefined
  minLength?: number | undefined
  multiple?: boolean | undefined
  name?: string | undefined
  pattern?: string | undefined
  placeholder?: string | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  size?: number | undefined
  src?: string | undefined
  step?: number | string | undefined
  type?: string | undefined
  value?: string | readonly string[] | number | undefined
  width?: number | string | undefined

  onChange?: ChangeEventHandler<T> | undefined
}

interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
  autoFocus?: boolean | undefined
  challenge?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  keyType?: string | undefined
  keyParams?: string | undefined
  name?: string | undefined
}

interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined
  htmlFor?: string | undefined
}

interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
  value?: number | undefined
}

interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
  as?: string | undefined
  crossOrigin?: string | undefined
  href?: string | undefined
  hrefLang?: string | undefined
  integrity?: string | undefined
  media?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  rel?: string | undefined
  sizes?: string | undefined
  type?: string | undefined
  charSet?: string | undefined
}

interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined
}

interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
  type?: string | undefined
}

interface MediaHTMLAttributes<T> extends HTMLAttributes<T> {
  autoPlay?: boolean | undefined
  controls?: boolean | undefined
  controlsList?: string | undefined
  crossOrigin?: string | undefined
  loop?: boolean | undefined
  mediaGroup?: string | undefined
  muted?: boolean | undefined
  playsInline?: boolean | undefined
  preload?: string | undefined
  src?: string | undefined
}

interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
  charSet?: string | undefined
  content?: string | undefined
  httpEquiv?: string | undefined
  name?: string | undefined
  media?: string | undefined
}

interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined
  high?: number | undefined
  low?: number | undefined
  max?: number | string | undefined
  min?: number | string | undefined
  optimum?: number | undefined
  value?: number | undefined
}

interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
}

interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
  classID?: string | undefined
  data?: string | undefined
  form?: string | undefined
  height?: number | string | undefined
  name?: string | undefined
  type?: string | undefined
  useMap?: string | undefined
  width?: number | string | undefined
  wmode?: string | undefined
}

interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
  reversed?: boolean | undefined
  start?: number | undefined
  type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined
}

interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined
  label?: string | undefined
}

interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined
  label?: string | undefined
  selected?: boolean | undefined
  value?: string | number | undefined
}

interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined
  htmlFor?: string | undefined
  name?: string | undefined
}

interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined
  value?: string | readonly string[] | number | undefined
}

interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
  max?: number | string | undefined
  value?: number | undefined
}

interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
  async?: boolean | undefined
  /** @deprecated */
  charSet?: string | undefined
  crossOrigin?: string | undefined
  defer?: boolean | undefined
  integrity?: string | undefined
  noModule?: boolean | undefined
  nonce?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  src?: string | undefined
  type?: string | undefined
}

interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
  autoComplete?: string | undefined
  autoFocus?: boolean | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  multiple?: boolean | undefined
  name?: string | undefined
  required?: boolean | undefined
  size?: number | undefined
  value?: string | readonly string[] | number | undefined
  onChange?: ChangeEventHandler<T> | undefined
}

interface SlotHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined
}

interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined
  media?: string | undefined
  sizes?: string | undefined
  src?: string | undefined
  srcSet?: string | undefined
  type?: string | undefined
  width?: number | string | undefined
}

interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
  media?: string | undefined
  nonce?: string | undefined
  scoped?: boolean | undefined
  type?: string | undefined
}

interface TableHTMLAttributes<T> extends HTMLAttributes<T> {
  cellPadding?: number | string | undefined
  cellSpacing?: number | string | undefined
  summary?: string | undefined
  width?: number | string | undefined
}

interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
  autoComplete?: string | undefined
  autoFocus?: boolean | undefined
  cols?: number | undefined
  dirName?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  maxLength?: number | undefined
  minLength?: number | undefined
  name?: string | undefined
  placeholder?: string | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  rows?: number | undefined
  value?: string | number | undefined
  wrap?: string | undefined

  onChange?: ChangeEventHandler<T> | undefined
}

interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
  colSpan?: number | undefined
  headers?: string | undefined
  rowSpan?: number | undefined
  scope?: string | undefined
  abbr?: string | undefined
  height?: number | string | undefined
  width?: number | string | undefined
  valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined
}

interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
  colSpan?: number | undefined
  headers?: string | undefined
  rowSpan?: number | undefined
  scope?: string | undefined
  abbr?: string | undefined
}

interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
  dateTime?: string | undefined
}

interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
  default?: boolean | undefined
  kind?: string | undefined
  label?: string | undefined
  src?: string | undefined
  srcLang?: string | undefined
}

interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
  height?: number | string | undefined
  playsInline?: boolean | undefined
  poster?: string | undefined
  width?: number | string | undefined
  disablePictureInPicture?: boolean | undefined
  disableRemotePlayback?: boolean | undefined
}

interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
  allowFullScreen?: boolean | undefined
  allowpopups?: boolean | undefined
  autoFocus?: boolean | undefined
  autosize?: boolean | undefined
  blinkfeatures?: string | undefined
  disableblinkfeatures?: string | undefined
  disableguestresize?: boolean | undefined
  disablewebsecurity?: boolean | undefined
  guestinstance?: string | undefined
  httpreferrer?: string | undefined
  nodeintegration?: boolean | undefined
  partition?: string | undefined
  plugins?: boolean | undefined
  preload?: string | undefined
  src?: string | undefined
  useragent?: string | undefined
  webpreferences?: string | undefined
}
