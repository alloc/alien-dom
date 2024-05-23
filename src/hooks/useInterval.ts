import { useEffect } from './useEffect'

/**
 * Set up an effect that repeats at a fixed time interval.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export const useInterval = (
  callback: () => void,
  delay: number | null,
  deps: readonly any[] = []
) =>
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(callback, delay)
    return () => clearInterval(id)
  }, [delay, ...deps])
