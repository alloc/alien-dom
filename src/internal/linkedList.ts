import { Falsy } from '@alloc/types'

interface Item {
  next?: this | Falsy
  prev?: this | Falsy
}

export class LinkedList<T extends Item> {
  first: T | Falsy = null
  last: T | Falsy = null

  add(item: T, prepend?: boolean) {
    if (this.first) {
      if (prepend) {
        item.next = this.first
        this.first.prev = item
        this.first = item
      } else {
        item.prev = this.last
        if (this.last) {
          this.last.next = item
        }
        this.last = item
      }
    } else {
      this.first = this.last = item
    }
  }

  remove(item: T) {
    if (item.prev) {
      item.prev.next = item.next
    } else {
      this.first = item.next
    }
    if (item.next) {
      item.next.prev = item.prev
    } else {
      this.last = item.prev
    }
  }

  forEach<This = any>(callback: (item: T) => void, context?: This) {
    let item = this.first
    while (item) {
      const { prev } = item
      callback.call(context, item)
      // Assume the callback won't remove item.prev from the list, which is our
      // source of truth for the next item if the current item is removed.
      item = prev
        ? item.prev === prev
          ? item.next
          : prev.next
        : item === this.first
        ? item.next
        : this.first
    }
  }
}
