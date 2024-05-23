import { unmount } from '../core/unmount'
import { onceMounted } from '../internal/onceMounted'
import { setPrivate } from '../internal/privateSymbol'
import { kAlienUnmountHandler, setElementKey } from '../internal/symbols'
import { useEffect } from './useEffect'
import { useMemo } from './useMemo'

let nextViewId = 1

/**
 * This hook is useful whenever you have an externally managed DOM node (or a
 * collection of nodes) that need to be mounted and unmounted to/from a JSX
 * parent element. One example is `useArrayView` which uses this hook to
 * mount/unmount the nodes derived from the array to/from a parent element.
 *
 * Create a DOM node that notifies when it's mounted and unmounted. The given
 * `view` function is called whenever the node is mounted to the DOM, and the
 * function it returns is called whenever the node is unmounted. The node may be
 * mounted/unmounted multiple times and the `view` function will be called each
 * time. When the `deps` change, a new node is created and the old node is
 * unmounted.
 *
 * ⚠️ To receive an unmount notification, you need to use the `unmount` function
 * provided by AlienDOM (i.e. call `unmount` on the returned node or one of its
 * ancestors).
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useView(
  view: (parentNode: ParentNode) => () => void,
  deps: readonly any[]
): ChildNode {
  const node = useMemo(initViewNode, deps)

  useEffect(() => {
    let mountHandler = onceMounted(node, function mountEffect(): void {
      const dispose = view(node.parentNode!)
      setPrivate(node, kAlienUnmountHandler, () => {
        dispose()

        // Re-attach the mount handler to the node, so that it can be called
        // again if the node is mounted again.
        mountHandler = onceMounted(node, mountEffect)
      })
    })

    return () => {
      unmount(node)
      mountHandler?.dispose()
    }
  }, [node])

  return node
}

function initViewNode() {
  const node = document.createTextNode('')
  setElementKey(node, 'useView#' + nextViewId++)
  return node
}
