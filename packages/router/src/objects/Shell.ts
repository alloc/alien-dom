import { JSX, createContext, useContext } from 'alien-dom'

export interface ShellConfig<
  Data = unknown,
  State extends object | null = null
> {
  shell?: Shell
  state?: () => State
  data?: (state: State) => Promise<Data>
  component: (props: ShellProps<Data, State>) => JSX.Element | null
  syncInterval?: number
  overlay?: boolean
}

export interface ShellProps<Data, State extends object | null> {
  data: Awaited<Data>
  state: State
}

/**
 * A "shell" is a reusable component that wraps a route and provides a common
 * layout. Its state is preserved between route navigations and can be used by
 * routes with `useShellProps`.
 */
export interface Shell<Data = any, State extends object | null = any>
  extends ShellConfig<Data, State> {}

export const ShellProps = createContext<ShellProps<any, any> | null>(null)

export type ToShellProps<T extends Shell> = T extends Shell<
  infer Data,
  infer State
>
  ? ShellProps<Data, State>
  : never

export function useShellProps<T extends Shell>(): ToShellProps<T> {
  const shellProps = useContext(ShellProps)
  if (!shellProps) {
    throw new Error('ShellProps not found')
  }
  return shellProps as any
}
