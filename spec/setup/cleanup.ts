import test from 'ava'
import { unmount } from '../../src/functions/unmount'

test.afterEach(() => {
  document.body.childNodes.forEach(child => {
    unmount(child)
  })
})
