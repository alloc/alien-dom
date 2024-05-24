import { Falsy } from '@alloc/types'
import { ContextStore } from '../core/context'
import {
  ArrayOperation,
  ArrayRef,
  observeArrayOperations,
} from '../core/observable'
import { unmount } from '../core/unmount'
import { morphRootNode } from '../functions/morphRootNode'
import { isFragment, isNode } from '../functions/typeChecking'
import { AlienComponent } from '../internal/component'
import { forwardContext } from '../internal/context'
import { endOfFragment } from '../internal/fragment'
import { currentNodeStore, expectCurrentComponent } from '../internal/global'
import { NodeStore } from '../internal/nodeStore'
import {
  getElementKey,
  getElementTags,
  setElementKey,
} from '../internal/symbols'
import { AnyDeferredNode } from '../jsx-dom/node'
import { UnresolvedChild } from '../jsx-dom/resolveChildren'
import { JSX } from '../types'
import { useEffect } from './useEffect'
import { useHookOffset } from './useHookOffset'
import { useMemo } from './useMemo'
import { useStableCallback } from './useStableCallback'
import { useView } from './useView'

export type ArrayViewRenderFn<T = any> = (
  item: T,
  key: JSX.ElementKey
) => JSX.Children

export function useArrayView<T>(
  array: ArrayRef<T> | Falsy,
  render: ArrayViewRenderFn<T>,
  deps?: readonly any[]
): JSX.Element | null {
  if (!array) {
    useHookOffset(6)
    return null
  }

  const component = expectCurrentComponent()

  const view = useMemo(initArrayViewState<T>, [array])
  view.context = component.context

  // This effect is responsible for updating the items when the deps change. If
  // a deps array isn't provided, the items will only be updated if the render
  // function changes.
  useEffect(() => {
    if (view.mounted) {
      const items = array.peek()
      renderArrayView(view, { type: 'update', items }, render)
    }
  }, deps || [render])

  // Ensure the render function is always up-to-date for new items.
  render = useStableCallback(render)

  // Handle mounting and unmounting side effects.
  view.head = useView(() => {
    // Mount the current items when the head is mounted.
    const items = array.peek()
    renderArrayView(view, { type: 'mount', items }, render)
    view.mounted = true

    // Observe array operations and update the view accordingly.
    const observer = observeArrayOperations(array, operations => {
      for (const operation of operations) {
        view[operation.type](operation as any, render)
      }
    })

    // We know that our observer won't be mutating any other observables, so
    // mark it as "observably pure" to ensure all chained observables are
    // updated before our observer is called.
    observer.isObservablyPure = () => true

    return () => {
      observer.dispose()

      // Unmount all items when the head is unmounted.
      for (const node of view.itemNodes) {
        unmount(isNode(node) ? node : node.rootNode)
      }

      // Clear all state. If remounted, the item nodes will be recreated.
      view.itemNodes.length = 0
      view.itemKeys.length = 0
      view.nextItemKey = 1
      view.mounted = false
    }
  }, [view])

  return view.head as any
}

type ArrayViewItemNode = ChildNode | DocumentFragment | AlienComponent

let nextViewKey = 1

class ArrayViewState<T = any> implements NodeStore {
  readonly key = nextViewKey++
  head!: ChildNode
  context!: ContextStore
  mounted = false

  readonly itemKeys: JSX.ElementKey[] = []
  readonly itemNodes: ArrayViewItemNode[] = []
  readonly itemUpdates = new Map<JSX.ElementKey, AnyDeferredNode>()
  nextItemKey = 1

  /**
   * The `view` method is called once per item. It calls the `children` prop
   * to render the item, and keeps track of the item's key and node.
   */
  mountItem(item: T, index: number, render: ArrayViewRenderFn<T>) {
    const itemKey = getArrayViewItemKey(this, this.nextItemKey++)
    const itemResult: UnresolvedChild = render(item, itemKey)

    const rootNode = morphRootNode(null, itemResult, undefined)

    validateArrayViewItemResult(rootNode, itemResult, itemKey)
    const itemNode = getArrayViewItemNode(rootNode)

    // Register the item's key and node.
    const { itemNodes, itemKeys } = this
    itemNodes[index] = itemNode
    itemKeys[index] = itemKey

    // Allow support for sparse arrays by finding the previous sibling
    // that is not undefined.
    let prevSibling: ArrayViewItemNode | undefined
    for (let i = index; i >= 0; i--) {
      prevSibling = i > 0 ? itemNodes[i - 1] : this.head
      if (prevSibling) {
        break
      }
    }

    if (isNode(prevSibling)) {
      if (isFragment(prevSibling)) {
        const lastChild = endOfFragment(prevSibling)
        lastChild!.after(rootNode)
      } else {
        prevSibling.after(rootNode)
      }
    } else {
      prevSibling!.lastChild!.after(rootNode)
    }
  }

  updateItem(item: T, index: number, render: ArrayViewRenderFn<T>) {
    const itemKey = this.itemKeys[index]
    const itemResult = render(item, itemKey)

    // The morphRootNode call is responsible for DOM tree operations and
    // providing a placeholder node in cases where the itemResult is falsy.
    let rootNode = this.itemNodes[index]
    rootNode = morphRootNode(
      isNode(rootNode) ? rootNode : rootNode.rootNode!,
      itemResult,
      itemKey,
      this.context,
      this
    )

    validateArrayViewItemResult(rootNode, itemResult, itemKey)
    const itemNode = getArrayViewItemNode(rootNode)
    this.itemNodes[index] = itemNode
  }

  add(operation: ArrayOperation.Add, render: ArrayViewRenderFn<T>) {
    // Expand the itemNodes and itemKeys arrays to make room for the new items.
    const slots = Array(operation.count)
    this.itemNodes.splice(operation.index, 0, ...slots)
    this.itemKeys.splice(operation.index, 0, ...slots)

    // Add the new items to the DOM.
    renderArrayView(this, operation, render)
  }

  remove(operation: ArrayOperation.Remove) {
    for (let offset = 0; offset < operation.count; offset++) {
      const node = this.itemNodes[operation.index + offset]
      unmount(isNode(node) ? node : node.rootNode)
    }

    // Shrink the itemNodes and itemKeys arrays to remove the items.
    this.itemNodes.splice(operation.index, operation.count)
    this.itemKeys.splice(operation.index, operation.count)
  }

  replace(operation: ArrayOperation.Replace, render: ArrayViewRenderFn<T>) {
    // Remove the previous item, if one exists.
    const node = this.itemNodes[operation.index]
    if (node) {
      unmount(isNode(node) ? node : node.rootNode)
    }

    renderArrayView(this, operation, render)
  }

  // TODO: Try to reuse old item nodes if possible?
  rebase(operation: ArrayOperation.Rebase, render: ArrayViewRenderFn<T>) {
    // Unmount all current item nodes.
    for (const node of this.itemNodes) {
      unmount(isNode(node) ? node : node.rootNode)
    }

    // Clear the item data storage.
    this.itemNodes.length = 0
    this.itemKeys.length = 0

    // Add the new items to the DOM.
    renderArrayView(this, operation, render)
  }

  //
  // NodeStore interface
  //

  getNodeForKey(key: JSX.ElementKey): ChildNode | DocumentFragment | undefined {
    const itemIndex = this.itemKeys.indexOf(key)
    if (itemIndex !== -1) {
      const itemNode = this.itemNodes[itemIndex]
      return isNode(itemNode) ? itemNode : itemNode.rootNode!
    }
  }

  setNodeForKey(
    _key: JSX.ElementKey,
    _node: ChildNode | DocumentFragment
  ): void {
    // Do nothing. Array views don't support arbitrary element keys. Only the
    // "item key" should be used within an array view's render function (and it
    // needs to be used as the root node's key). Since we already manage the
    // item nodes in the mountItem/updateItem methods, this method is
    // superfluous.
  }

  getNodeUpdateForKey(key: JSX.ElementKey): AnyDeferredNode | undefined {
    return this.itemUpdates.get(key)
  }

  setNodeUpdateForKey(key: JSX.ElementKey, update: AnyDeferredNode): void {
    this.itemUpdates.set(key, update)
  }
}

function initArrayViewState<T>() {
  return new ArrayViewState<T>()
}

function getArrayViewItemKey(view: ArrayViewState<any>, itemKey: number) {
  return `${view.key}@${itemKey}`
}

function getArrayViewItemNode(rootNode: ChildNode | DocumentFragment) {
  // If a composite element is returned, keep track of its component
  // instance instead of the DOM node, since it may change without notice.
  const tags = getElementTags(rootNode)
  return (tags && Array.from(tags.values()).pop()) || rootNode
}

function validateArrayViewItemResult(
  rootNode: ChildNode | DocumentFragment,
  itemResult: UnresolvedChild,
  itemKey: JSX.ElementKey
) {
  const rootKey = getElementKey(rootNode)

  if (!itemResult) {
    setElementKey(rootNode, itemKey)
  } else if (DEV && rootKey !== itemKey) {
    throw Error(
      `ArrayView item key mismatch. Expected ${JSON.stringify(
        itemKey
      )}, but got ${JSON.stringify(rootKey)}.`
    )
  }
}

declare namespace ArrayView {
  type Operation = MountOperation | UpdateOperation | ArrayOperation
  type MountOperation = { type: 'mount'; items: readonly any[] }
  type UpdateOperation = { type: 'update'; items: readonly any[] }
}

function renderArrayView(
  view: ArrayViewState,
  operation: ArrayView.MountOperation,
  render: ArrayViewRenderFn
): void

function renderArrayView(
  view: ArrayViewState,
  operation: ArrayView.UpdateOperation,
  render: ArrayViewRenderFn
): void

function renderArrayView(
  view: ArrayViewState,
  operation: ArrayOperation.Add,
  render: ArrayViewRenderFn
): void

function renderArrayView(
  view: ArrayViewState,
  operation: ArrayOperation.Replace,
  render: ArrayViewRenderFn
): void

function renderArrayView(
  view: ArrayViewState,
  operation: ArrayOperation.Rebase,
  render: ArrayViewRenderFn
): void

function renderArrayView(
  view: ArrayViewState,
  props: ArrayView.Operation,
  render: ArrayViewRenderFn
): void {
  const restoreContext = forwardContext(view.context)
  currentNodeStore.push(view)
  try {
    switch (props.type) {
      case 'mount':
        return props.items.forEach((item, i) => {
          view.mountItem(item, i, render)
        })
      case 'update':
        return props.items.forEach((item, i) => {
          view.updateItem(item, i, render)
        })
      case 'add':
        for (let offset = 0; offset < props.count; offset++) {
          const index = props.index + offset
          if (props.newArray.hasOwnProperty(index)) {
            view.mountItem(props.newArray[index], index, render)
          }
        }
        break
      case 'replace':
        return view.mountItem(props.newValue, props.index, render)
      case 'rebase':
        return props.newArray.forEach((item, i) => {
          view.mountItem(item, i, render)
        })
    }
  } finally {
    currentNodeStore.pop()
    restoreContext()
  }
}
