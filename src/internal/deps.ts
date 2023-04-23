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
