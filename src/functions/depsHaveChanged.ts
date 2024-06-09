/**
 * Returns `true` when the two dependency arrays have differing values,
 * according to `Object.is()`.
 *
 * ⚠️ If either argument is `undefined`, then `true` is returned. Even if both
 * are undefined.
 */
export function depsHaveChanged(
  deps: readonly any[] | undefined,
  prevDeps: readonly any[] | undefined
) {
  if (
    deps === undefined ||
    prevDeps === undefined ||
    deps.length !== prevDeps.length
  ) {
    return true
  }

  if (deps !== prevDeps && deps.length > 0)
    for (let i = 0; i < deps.length; i++)
      if (!Object.is(deps[i], prevDeps[i])) {
        return true
      }

  return false
}
