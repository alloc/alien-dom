import { JSX } from './jsx'

export type PropsWithChildren<Props> = Props & {
  children: JSX.ChildrenProp | undefined
}

export type FunctionComponent<
  Props = {},
  Result extends JSX.ChildrenProp = JSX.ChildrenProp
> = (props: Props, context?: any) => Result
