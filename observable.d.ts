// Debugging hooks are declared globally.
declare var __OBSERVABLE_HOOKS__:
  | import('./dist/index').ObservableHooks
  | false
  | null
  | undefined
