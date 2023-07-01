import { JSX } from './jsx'

export type PropsWithChildren<Props> = Props & {
  children: JSX.Children | undefined
}

export type FunctionComponent<
  Props = {},
  Result extends JSX.Children = JSX.Children
> = (props: Props, context?: any) => Result
