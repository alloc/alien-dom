import { JSX } from './jsx'

export type FunctionComponent<Props extends object = {}> = (
  props: Props
) => JSX.Children
