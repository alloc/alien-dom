import { effect as observe } from '@preact/signals-core'
import { useEffect } from './useEffect'

export const useObserver = (
  effect: () => void | (() => void),
  deps: readonly any[] = []
) => useEffect(() => observe(effect), deps)
