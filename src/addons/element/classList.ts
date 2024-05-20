import { isFunction } from '@alloc/is'
import { toArray } from '../../internal/util'

export function hasClass(
  context: HTMLElement | SVGSVGElement,
  className: string
) {
  return context.classList.contains(className)
}

export function addClass(
  context: HTMLElement | SVGSVGElement,
  classes: string | string[]
) {
  for (const name of splitClassNames(classes)) {
    context.classList.add(name)
  }
}

export function removeClass(
  context: HTMLElement | SVGSVGElement,
  classes: string | string[]
) {
  for (const name of splitClassNames(classes)) {
    context.classList.remove(name)
  }
}

export function removeMatchingClass(
  context: HTMLElement | SVGSVGElement,
  pattern: RegExp | ((name: string) => boolean | void)
) {
  const test = isFunction(pattern) ? pattern : pattern.test.bind(pattern)
  for (let i = 0; i < context.classList.length; i++) {
    const token = context.classList.item(i)!
    if (test(token)) {
      context.classList.remove(token)
    }
  }
}

export function toggleClass(
  context: HTMLElement | SVGSVGElement,
  classes: string | string[],
  force?: boolean | ((name: string) => boolean)
) {
  for (const name of splitClassNames(classes)) {
    context.classList.toggle(name, isFunction(force) ? force(name) : force)
  }
}

/**
 * If `classList` was an array, this would be like calling `classList.every()`.
 */
export function hasEveryClass(
  context: HTMLElement | SVGSVGElement,
  classes: string | string[]
) {
  return toArray(classes).every(className =>
    className.split(/\s+/).every(name => context.classList.contains(name))
  )
}

/**
 * If `classList` was an array, this would be like calling `classList.some()`.
 */
export function hasSomeClass(
  context: HTMLElement | SVGSVGElement,
  classes: string | string[]
) {
  return toArray(classes).some(className =>
    className.split(/\s+/).some(name => context.classList.contains(name))
  )
}

/**
 * Iterate every class name in the element's `classList`. Return the first class
 * name that matches the pattern. If `pattern` is a function, any string result
 * (even an empty one) will be returned.
 */
export function matchClass(
  context: HTMLElement | SVGSVGElement,
  pattern: RegExp | ((name: string) => string | false | null | undefined)
) {
  for (let i = 0; i < context.classList.length; i++) {
    const token = context.classList.item(i)!
    if (isFunction(pattern)) {
      const match = pattern(token)
      if (match || match === '') {
        return match
      }
    } else {
      const match = pattern.exec(token)
      if (match) {
        return match[1] ?? match[0]
      }
    }
  }
  return ''
}

function* splitClassNames(classes: string | string[]) {
  for (const className of toArray(classes)) {
    yield* className.split(/\s+/)
  }
}
