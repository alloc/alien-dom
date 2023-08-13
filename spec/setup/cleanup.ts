import test from 'ava'
import { unmount } from '../../src/functions/unmount'
import { document } from '../../src/platform'

test.afterEach(() => {
  document.body.childNodes.forEach(child => {
    unmount(child)
  })
})
