import type * as CSS from 'csstype'

export type CSSAttributes = CSSTransformProps & {
  [Key in Exclude<keyof CSS.Properties, 'scale' | 'rotate'>]?:
    | CSS.Properties<CSSLength>[Key]
    | null
}

export type CSSLength = number | string
export type CSSAngle = number | string

export interface CSSTransformProps {
  rotate?: CSSAngle | null
  rotateX?: CSSAngle | null
  rotateY?: CSSAngle | null
  scale?: number | null
  scaleX?: number | null
  scaleY?: number | null
  x?: CSSLength | null
  y?: CSSLength | null
  z?: CSSLength | null
}
