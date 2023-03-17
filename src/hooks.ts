import { AlienScope, AlienSubscription, currentScope } from './context'
import { onMount, onUnmount } from './domObserver'
import type { AlienElement } from './element'
import { AnyElement } from './internal/types'
import { kAlienScope } from './symbols'

/**
 * Hook into an element's lifecycle (mount, unmount, enable, disable).
 *
 * Any `enable` or `disable` callbacks will be run when the element is
 * mounted or unmounted, respectively. If the element is already mounted,
 * any `enable` callbacks will be run immediately.
 */
export class AlienHooks<Element extends AnyElement = any> implements AlienScope {
  enabled: boolean
  subscribed?: Set<AlienSubscription>
  protected enablers?: Set<() => void>

  constructor(readonly element: AlienElement<Element>) {
    Object.defineProperty(this, kAlienScope, { value: true })
    this.enabled = document.contains(element)
    if (!this.enabled) {
      // This assumes that the element will eventually be mounted. If
      // it's not, a memory leak will occur.
      onMount(element, () => this.enable())
    }
  }

  /**
   * Enable the scope. If there are any `enable` callbacks, they will be
   * run.
   *
   * Note: You should only call this method if you know what you're
   * doing. Otherwise, prefer `element.enableHooks()` instead.
   */
  enable(): void

  /**
   * Add a callback to run when the scope is enabled. If the scope is
   * currently enabled, the callback will be run immediately.
   */
  enable(onEnable: () => void): void

  /** @internal */
  enable(onEnable?: () => void) {
    if (onEnable) {
      if (!this.enablers) {
        this.enablers = new Set()
        currentScope.push(this)
        onEnable()
        onUnmount(this.element, () => this.disable())
        currentScope.pop(this)
      }
      this.enablers.add(onEnable)
    } else if (!this.enabled) {
      this.enabled = true
      if (this.enablers) {
        currentScope.push(this)
        this.enablers.forEach(fn => fn())
        onUnmount(this.element, () => this.disable())
        currentScope.pop(this)
      }
    }
  }

  /**
   * Tear down any subscriptions, including `disable` callbacks.
   *
   * Note: You should only call this method if you know what you're
   * doing. Otherwise, prefer `element.disableHooks()` instead.
   */
  disable(): void

  /**
   * Add a callback to run when the scope is disabled.
   */
  disable(onDisable: () => void): void

  /** @internal */
  disable(onDisable?: () => void) {
    if (onDisable) {
      this.subscribed ||= new Set()
      this.subscribed.add({ dispose: onDisable })
    } else if (this.enabled) {
      this.enabled = false
      this.subscribed?.forEach(sub => sub.dispose())
    }
  }

  enableOnce(onEnable: () => void): void {
    this.enable(() => {
      this.enablers!.delete(onEnable)
      onEnable()
    })
  }
}
