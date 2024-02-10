import type { ParsedValue } from './types'

export function parseValue(
  value: number | string | null | undefined,
  defaultUnit?: string
): ParsedValue | null {
  if (value == null) {
    return null
  }
  if (typeof value == 'number') {
    return [value, defaultUnit || '']
  }
  const match = value.match(/(-?[0-9]+(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?)(\D*)$/)
  if (!match) {
    throw Error(`Invalid value: ${value}`)
  }
  return match ? [parseFloat(match[1]), match[2]] : null
}
