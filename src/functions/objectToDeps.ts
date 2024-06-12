/**
 * Return a flat array of keys and values from an object, sorted by key, to be
 * used as a dependency array. Properties with an undefined value are skipped,
 * so that they're identical to omitted properties.
 */
export function objectToDeps(object: object) {
  const deps: any[] = []
  for (const key of Object.keys(object).sort() as (keyof typeof object)[]) {
    if (object[key] !== undefined) {
      deps.push(key, object[key])
    }
  }
  return deps
}
