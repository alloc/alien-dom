import { JSX } from './jsx'

export type PropsWithChildren<P> = P & { children: JSX.Children | undefined }

export type FunctionComponent<
  P = {},
  T extends JSX.ElementOption = JSX.ElementOption
> = (props: PropsWithChildren<P>, context?: any) => T
