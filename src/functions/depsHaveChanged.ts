/**
 * This is slightly unintuitive, but this function returns true unless
 * `deps` and `prevDeps` are **different arrays with the same
 * contents.** So passing the same exact array (`===` to itself) as both
 * `deps` and `prevDeps` will give you true (unintuitively).
 */
export function depsHaveChanged(
  deps: readonly any[],
  prevDeps: readonly any[]
) {
  return (
    deps === prevDeps ||
    deps.length !== prevDeps.length ||
    deps.some((dep, i) => dep !== prevDeps[i])
  )
}
