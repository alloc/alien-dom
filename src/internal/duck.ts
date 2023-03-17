export function canMatch(node: any): node is { matches: Function } {
  return typeof (node as any).matches == 'function'
}

export function hasForEach(arg: any): arg is { forEach: Function } {
  return typeof arg.forEach == 'function'
}

export function isIterable(arg: any): arg is Iterable<any> {
  return typeof arg[Symbol.iterator] == 'function'
}
