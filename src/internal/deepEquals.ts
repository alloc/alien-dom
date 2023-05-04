const has = Object.prototype.hasOwnProperty

export function deepEquals(foo: any, bar: any) {
  let ctor: any
  let len: number
  if (foo === bar) {
    return true
  }
  if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
    if (ctor === Date) {
      return foo.getTime() === bar.getTime()
    }
    if (ctor === RegExp) {
      return foo.toString() === bar.toString()
    }
    if (ctor === Array) {
      if ((len = foo.length) === bar.length) {
        while (len-- && deepEquals(foo[len], bar[len]));
      }
      return len === -1
    }
    if (!ctor || typeof foo === 'object') {
      len = 0
      for (const key in foo) {
        if (has.call(foo, key) && ++len && !has.call(bar, key)) {
          return false
        }
        if (!(key in bar) || !deepEquals(foo[key], bar[key])) {
          return false
        }
      }
      return Object.keys(bar).length === len
    }
  }

  return foo !== foo && bar !== bar
}
