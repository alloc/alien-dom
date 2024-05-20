import type { Booleanish } from '../internal/types'
import type { AriaAttributes, AriaRole } from './aria'
import type { DOMAttributes } from './dom'
import type { HTMLAttributes } from './html'

// this list is "complete" in that it contains every SVG attribute
// that React supports, but the types can be improved.
// Full list here: https://facebook.github.io/react/docs/dom-elements.html
//
// The three broad type categories are (in order of restrictiveness):
//   - "number | string"
//   - "string"
//   - union of string literals
export interface SVGAttributes<T> extends AriaAttributes, DOMAttributes<T> {
  // Attributes also defined in HTMLAttributes
  color?: string
  height?: number | string
  id?: string
  lang?: string
  max?: number | string
  media?: string
  method?: string
  min?: number | string
  name?: string
  target?: string
  type?: string
  width?: number | string

  // Other HTML properties supported by SVG elements in browsers
  role?: AriaRole
  tabIndex?: number
  crossOrigin?: 'anonymous' | 'use-credentials' | ''

  // SVG Specific attributes
  accentHeight?: number | string
  accumulate?: 'none' | 'sum'
  additive?: 'replace' | 'sum'
  alignmentBaseline?:
    | 'auto'
    | 'baseline'
    | 'before-edge'
    | 'text-before-edge'
    | 'middle'
    | 'central'
    | 'after-edge'
    | 'text-after-edge'
    | 'ideographic'
    | 'alphabetic'
    | 'hanging'
    | 'mathematical'
    | 'inherit'
  allowReorder?: 'no' | 'yes'
  alphabetic?: number | string
  amplitude?: number | string
  arabicForm?: 'initial' | 'medial' | 'terminal' | 'isolated'
  ascent?: number | string
  attributeName?: string
  attributeType?: string
  autoReverse?: Booleanish
  azimuth?: number | string
  baseFrequency?: number | string
  baselineShift?: number | string
  baseProfile?: number | string
  bbox?: number | string
  begin?: number | string
  bias?: number | string
  by?: number | string
  calcMode?: number | string
  capHeight?: number | string
  clip?: number | string
  clipPath?: string
  clipPathUnits?: number | string
  clipRule?: number | string
  colorInterpolation?: number | string
  colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit'
  colorProfile?: number | string
  colorRendering?: number | string
  contentScriptType?: number | string
  contentStyleType?: number | string
  cursor?: number | string
  cx?: number | string
  cy?: number | string
  d?: string
  decelerate?: number | string
  descent?: number | string
  diffuseConstant?: number | string
  direction?: number | string
  display?: number | string
  divisor?: number | string
  dominantBaseline?: number | string
  dur?: number | string
  dx?: number | string
  dy?: number | string
  edgeMode?: number | string
  elevation?: number | string
  enableBackground?: number | string
  end?: number | string
  exponent?: number | string
  externalResourcesRequired?: Booleanish
  fill?: string
  fillOpacity?: number | string
  fillRule?: 'nonzero' | 'evenodd' | 'inherit'
  filter?: string
  filterRes?: number | string
  filterUnits?: number | string
  floodColor?: number | string
  floodOpacity?: number | string
  focusable?: Booleanish | 'auto'
  fontFamily?: string
  fontSize?: number | string
  fontSizeAdjust?: number | string
  fontStretch?: number | string
  fontStyle?: number | string
  fontVariant?: number | string
  fontWeight?: number | string
  format?: number | string
  from?: number | string
  fx?: number | string
  fy?: number | string
  g1?: number | string
  g2?: number | string
  glyphName?: number | string
  glyphOrientationHorizontal?: number | string
  glyphOrientationVertical?: number | string
  glyphRef?: number | string
  gradientTransform?: string
  gradientUnits?: string
  hanging?: number | string
  horizAdvX?: number | string
  horizOriginX?: number | string
  href?: string
  ideographic?: number | string
  imageRendering?: number | string
  in2?: number | string
  in?: string
  intercept?: number | string
  k1?: number | string
  k2?: number | string
  k3?: number | string
  k4?: number | string
  k?: number | string
  kernelMatrix?: number | string
  kernelUnitLength?: number | string
  kerning?: number | string
  keyPoints?: number | string
  keySplines?: number | string
  keyTimes?: number | string
  lengthAdjust?: number | string
  letterSpacing?: number | string
  lightingColor?: number | string
  limitingConeAngle?: number | string
  local?: number | string
  markerEnd?: string
  markerHeight?: number | string
  markerMid?: string
  markerStart?: string
  markerUnits?: number | string
  markerWidth?: number | string
  mask?: string
  maskContentUnits?: number | string
  maskUnits?: number | string
  mathematical?: number | string
  mode?: number | string
  numOctaves?: number | string
  offset?: number | string
  opacity?: number | string
  operator?: number | string
  order?: number | string
  orient?: number | string
  orientation?: number | string
  origin?: number | string
  overflow?: number | string
  overlinePosition?: number | string
  overlineThickness?: number | string
  paintOrder?: number | string
  panose1?: number | string
  path?: string
  pathLength?: number | string
  patternContentUnits?: string
  patternTransform?: number | string
  patternUnits?: string
  pointerEvents?: number | string
  points?: string
  pointsAtX?: number | string
  pointsAtY?: number | string
  pointsAtZ?: number | string
  preserveAlpha?: Booleanish
  preserveAspectRatio?: string
  primitiveUnits?: number | string
  r?: number | string
  radius?: number | string
  refX?: number | string
  refY?: number | string
  renderingIntent?: number | string
  repeatCount?: number | string
  repeatDur?: number | string
  requiredExtensions?: number | string
  requiredFeatures?: number | string
  restart?: number | string
  result?: string
  rotate?: number | string
  rx?: number | string
  ry?: number | string
  scale?: number | string
  seed?: number | string
  shapeRendering?: number | string
  slope?: number | string
  spacing?: number | string
  specularConstant?: number | string
  specularExponent?: number | string
  speed?: number | string
  spreadMethod?: string
  startOffset?: number | string
  stdDeviation?: number | string
  stemh?: number | string
  stemv?: number | string
  stitchTiles?: number | string
  stopColor?: string
  stopOpacity?: number | string
  strikethroughPosition?: number | string
  strikethroughThickness?: number | string
  string?: number | string
  stroke?: string
  strokeDasharray?: string | number
  strokeDashoffset?: string | number
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit'
  strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit'
  strokeMiterlimit?: number | string
  strokeOpacity?: number | string
  strokeWidth?: number | string
  surfaceScale?: number | string
  systemLanguage?: number | string
  tableValues?: number | string
  targetX?: number | string
  targetY?: number | string
  textAnchor?: string
  textDecoration?: number | string
  textLength?: number | string
  textRendering?: number | string
  to?: number | string
  transform?: string
  u1?: number | string
  u2?: number | string
  underlinePosition?: number | string
  underlineThickness?: number | string
  unicode?: number | string
  unicodeBidi?: number | string
  unicodeRange?: number | string
  unitsPerEm?: number | string
  vAlphabetic?: number | string
  values?: string
  vectorEffect?: number | string
  version?: string
  vertAdvY?: number | string
  vertOriginX?: number | string
  vertOriginY?: number | string
  vHanging?: number | string
  vIdeographic?: number | string
  viewBox?: string
  viewTarget?: number | string
  visibility?: number | string
  vMathematical?: number | string
  widths?: number | string
  wordSpacing?: number | string
  writingMode?: number | string
  x1?: number | string
  x2?: number | string
  x?: number | string
  xChannelSelector?: string
  xHeight?: number | string
  xlinkActuate?: string
  xlinkArcrole?: string
  xlinkHref?: string
  xlinkRole?: string
  xlinkShow?: string
  xlinkTitle?: string
  xlinkType?: string
  xmlBase?: string
  xmlLang?: string
  xmlns?: string
  xmlnsXlink?: string
  xmlSpace?: string
  y1?: number | string
  y2?: number | string
  y?: number | string
  yChannelSelector?: string
  z?: number | string
  zoomAndPan?: string
}

/**
 * Some SVGElement interfaces are not assignable to SVGElement, but are still
 * technically SVG elements.
 */
export type SVGElementLike =
  | SVGElement
  | SVGFEDisplacementMapElement
  | SVGFEDistantLightElement
  | SVGFEFuncAElement
  | SVGFEFuncBElement
  | SVGFEFuncGElement
  | SVGFEFuncRElement
  | SVGStopElement
  | SVGTextElement
  | SVGTSpanElement

export type SVGTagName = keyof SVGAttributesByTagName

export interface SVGAttributesByTagName {
  svg: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>
  animate: SVGAttributes<SVGAnimateElement>
  animateMotion: SVGAttributes<SVGAnimateMotionElement>
  animateTransform: SVGAttributes<SVGAnimateTransformElement>
  circle: SVGAttributes<SVGCircleElement>
  clipPath: SVGAttributes<SVGClipPathElement>
  defs: SVGAttributes<SVGDefsElement>
  desc: SVGAttributes<SVGDescElement>
  ellipse: SVGAttributes<SVGEllipseElement>
  feBlend: SVGAttributes<SVGFEBlendElement>
  feColorMatrix: SVGAttributes<SVGFEColorMatrixElement>
  feComponentTransfer: SVGAttributes<SVGFEComponentTransferElement>
  feComposite: SVGAttributes<SVGFECompositeElement>
  feConvolveMatrix: SVGAttributes<SVGFEConvolveMatrixElement>
  feDiffuseLighting: SVGAttributes<SVGFEDiffuseLightingElement>
  feDisplacementMap: SVGAttributes<SVGFEDisplacementMapElement>
  feDistantLight: SVGAttributes<SVGFEDistantLightElement>
  feDropShadow: SVGAttributes<SVGFEDropShadowElement>
  feFlood: SVGAttributes<SVGFEFloodElement>
  feFuncA: SVGAttributes<SVGFEFuncAElement>
  feFuncB: SVGAttributes<SVGFEFuncBElement>
  feFuncG: SVGAttributes<SVGFEFuncGElement>
  feFuncR: SVGAttributes<SVGFEFuncRElement>
  feGaussianBlur: SVGAttributes<SVGFEGaussianBlurElement>
  feImage: SVGAttributes<SVGFEImageElement>
  feMerge: SVGAttributes<SVGFEMergeElement>
  feMergeNode: SVGAttributes<SVGFEMergeNodeElement>
  feMorphology: SVGAttributes<SVGFEMorphologyElement>
  feOffset: SVGAttributes<SVGFEOffsetElement>
  fePointLight: SVGAttributes<SVGFEPointLightElement>
  feSpecularLighting: SVGAttributes<SVGFESpecularLightingElement>
  feSpotLight: SVGAttributes<SVGFESpotLightElement>
  feTile: SVGAttributes<SVGFETileElement>
  feTurbulence: SVGAttributes<SVGFETurbulenceElement>
  filter: SVGAttributes<SVGFilterElement>
  foreignObject: SVGAttributes<SVGForeignObjectElement>
  g: SVGAttributes<SVGGElement>
  image: SVGAttributes<SVGImageElement>
  line: SVGAttributes<SVGLineElement>
  linearGradient: SVGAttributes<SVGLinearGradientElement>
  marker: SVGAttributes<SVGMarkerElement>
  mask: SVGAttributes<SVGMaskElement>
  metadata: SVGAttributes<SVGMetadataElement>
  mpath: SVGAttributes<SVGMPathElement>
  path: SVGAttributes<SVGPathElement>
  pattern: SVGAttributes<SVGPatternElement>
  polygon: SVGAttributes<SVGPolygonElement>
  polyline: SVGAttributes<SVGPolylineElement>
  radialGradient: SVGAttributes<SVGRadialGradientElement>
  rect: SVGAttributes<SVGRectElement>
  stop: SVGAttributes<SVGStopElement>
  switch: SVGAttributes<SVGSwitchElement>
  symbol: SVGAttributes<SVGSymbolElement>
  text: SVGAttributes<SVGTextElement>
  textPath: SVGAttributes<SVGTextPathElement>
  tspan: SVGAttributes<SVGTSpanElement>
  use: SVGAttributes<SVGUseElement>
  view: SVGAttributes<SVGViewElement>
}

export declare namespace SVG {
  type Anchor = SVGAElement
  type Animate = SVGAnimateElement
  type AnimateMotion = SVGAnimateMotionElement
  type AnimateTransform = SVGAnimateTransformElement
  type Circle = SVGCircleElement
  type ClipPath = SVGClipPathElement
  type Defs = SVGDefsElement
  type Desc = SVGDescElement
  type Ellipse = SVGEllipseElement
  type FEBlend = SVGFEBlendElement
  type FEColorMatrix = SVGFEColorMatrixElement
  type FEComponentTransfer = SVGFEComponentTransferElement
  type FEConvolveMatrix = SVGFEConvolveMatrixElement
  type FEDiffuseLighting = SVGFEDiffuseLightingElement
  type FEDisplacementMap = SVGFEDisplacementMapElement
  type FEDistantLight = SVGFEDistantLightElement
  type FEDropShadow = SVGFEDropShadowElement
  type FEFlood = SVGFEFloodElement
  type FEFuncA = SVGFEFuncAElement
  type FEFuncB = SVGFEFuncBElement
  type FEFuncG = SVGFEFuncGElement
  type FEFuncR = SVGFEFuncRElement
  type FEGaussianBlur = SVGFEGaussianBlurElement
  type FEImage = SVGFEImageElement
  type FEMerge = SVGFEMergeElement
  type FEMergeNode = SVGFEMergeNodeElement
  type FEMorphology = SVGFEMorphologyElement
  type FEOffset = SVGFEOffsetElement
  type FEPointLight = SVGFEPointLightElement
  type FETile = SVGFETileElement
  type FETurbulence = SVGFETurbulenceElement
  type Filter = SVGFilterElement
  type Foreign = SVGForeignObjectElement
  type G = SVGGElement
  type Gradient = SVGGradientElement
  type Image = SVGImageElement
  type Line = SVGLineElement
  type LinearGradient = SVGLinearGradientElement
  type Marker = SVGMarkerElement
  type Mask = SVGMaskElement
  type Metadata = SVGMetadataElement
  type Path = SVGPathElement
  type Pattern = SVGPatternElement
  type Polygon = SVGPolygonElement
  type Polyline = SVGPolylineElement
  type RadialGradient = SVGRadialGradientElement
  type Rect = SVGRectElement
  type Script = SVGScriptElement
  type Stop = SVGStopElement
  type Style = SVGStyleElement
  type SVG = SVGSVGElement
  type Switch = SVGSwitchElement
  type Symbol = SVGSymbolElement
  type Text = SVGTextElement
  type TextPath = SVGTextPathElement
  type Title = SVGTitleElement
  type Use = SVGUseElement
  type View = SVGViewElement
}
