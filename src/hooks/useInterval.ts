import { useEffect } from './useEffect'

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
