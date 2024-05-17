export type MountHandler<T extends Node = any> = {
  node: T
  callback: (node: T) => void
  dispose: () => void
}

// The nodes waiting for a mount notification.
const handlers = new Set<MountHandler>()

// Spend at most 3ms per frame to check for mounts.
const resrvedFrameTimeInMs = 3

// Equals true if a mount check will be performed soon.
let deadline = 0

function checkMount() {
  for (const handler of handlers) {
    if (handler.node.isConnected) {
      handler.callback(handler.node)
      handler.dispose()
    }
  }
  if (handlers.size > 0) {
    if (deadline < performance.now()) {
      requestAnimationFrame(() => {
        deadline = performance.now() + resrvedFrameTimeInMs
        checkMount()
      })
    } else {
      queueMicrotask(checkMount)
    }
  } else {
    deadline = 0
  }
}

export function onMount<T extends Node>(node: T, callback: (node: T) => void) {
  const handler: MountHandler<T> = {
    node,
    callback,
    dispose: () => handlers.delete(handler),
  }
  handlers.add(handler)
  if (!deadline) {
    deadline = performance.now() + resrvedFrameTimeInMs
    queueMicrotask(checkMount)
  }
  return handler
}
