export const kAlienHooks = Symbol.for('alien:hooks')
export const kAlienNewHooks = Symbol.for('alien:newHooks')
export const kAlienElementKey = Symbol.for('alien:elementKey')
export const kAlienElementTags = Symbol.for('alien:elementTags')
export const kAlienSelfUpdating = Symbol.for('alien:selfUpdating')
export const kAlienThunkResult = Symbol.for('alien:thunkResult')
export const kAlienPlaceholder = Symbol.for('alien:placeholder')
export const kAlienUpdateProp = Symbol.for('alien:updateProp')

export const setSymbol = (obj: any, key: symbol, value: any) =>
  Object.defineProperty(obj, key, { value, configurable: true })
