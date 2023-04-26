import { JSX } from './jsx'

export type PropsWithChildren<P> = P & { children: JSX.Children | undefined }

export type ComponentType<P = {}, T extends Element = JSX.Element> =
  | ComponentClass<P, T>
  | FunctionComponent<P, T>

export interface FunctionComponent<P = {}, T extends Element = JSX.Element> {
  (props: PropsWithChildren<P>, context?: any): T | null
  defaultProps?: Partial<P>
  displayName?: string
}

export interface ComponentClass<P = {}, T extends Element = JSX.Element> {
  new (props: P, context?: any): Component<P, T>
  defaultProps?: Partial<P> | undefined
  displayName?: string | undefined
}

export declare class Component<P = {}, T extends Element = JSX.Element> {
  constructor(props: PropsWithChildren<P>)
  readonly props: PropsWithChildren<P>
  render(): T | null
}

export { Component as PureComponent }
