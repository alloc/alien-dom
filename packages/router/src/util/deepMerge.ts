/**
 * Deep merge two objects while preserving unchanged objects. If both objects
 * are deeply equal, `target` is returned. Otherwise, `source` is returned after
 * having any unchanged objects merged into it.
 *
 * In other words, `target` will never be mutated, but `source` might.
 *
 * Note that class instances are not supported.
 */
export function deepMerge(target: any, source: any) {
  if (
    !target ||
    !source ||
    typeof target !== 'object' ||
    typeof source !== 'object'
  ) {
    return source
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    return deepMergeArray(target, source)
  }

  let out = target
  for (const key in target) {
    if (source.hasOwnProperty(key)) {
      source[key] = deepMerge(target[key], source[key])
      if (target[key] !== source[key]) {
        out = source
      }
    } else {
      out = source
    }
  }
  if (Object.keys(target).length !== Object.keys(source).length) {
    return source
  }
  return out
}

function deepMergeArray(target: any[], source: any[]) {
  let out: any[] = target
  for (let i = 0; i < target.length; i++) {
    if (i < source.length) {
      source[i] = deepMerge(target[i], source[i])
      if (target[i] !== source[i]) {
        out = source
      }
    }
  }
  if (target.length !== source.length) {
    return source
  }
  return out
}
