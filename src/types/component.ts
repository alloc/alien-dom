import { JSX } from './jsx'

export type FunctionComponent<
  Props extends object = {},
  Result extends JSX.ChildrenProp = JSX.ChildrenProp
> = (props: Props) => Result
