import { JSX } from './jsx'

export type PropsWithChildren<P> = P & { children: JSX.Children | undefined }

export interface FunctionComponent<P = {}, T extends Element = JSX.Element> {
  (props: PropsWithChildren<P>, context?: any): T | null
}
