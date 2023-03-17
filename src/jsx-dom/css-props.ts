/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found on
 * https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/LICENSE
 */
import { keys } from './util'

/**
 * CSS properties which accept numbers but are not in units of "px".
 */
export const isUnitlessNumber: Record<string, 1> = {
  animationIterationCount: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridArea: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  fontWeight: 1,
  lineClamp: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,

  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1,
}

/**
 * @param prefix vendor-specific prefix, eg: Webkit
 * @param key style name, eg: transitionDuration
 * @return style name prefixed with `prefix`, properly camelCased, eg:
 * WebkitTransitionDuration
 */
function prefixKey(prefix: string, key: string) {
  return prefix + key.charAt(0).toUpperCase() + key.substring(1)
}

/**
 * Support style names that may come passed in prefixed by adding
 * permutations of vendor prefixes.
 */
const prefixes = ['Webkit', 'ms', 'Moz', 'O']

// Using Object.keys here, or else the vanilla for-in loop makes IE8 go
// into an infinite loop, because it iterates over the newly added props
// too.
keys(isUnitlessNumber).forEach(prop => {
  prefixes.forEach(prefix => {
    isUnitlessNumber[prefixKey(prefix, prop)] = 1 // isUnitlessNumber[prop]
  })
})
