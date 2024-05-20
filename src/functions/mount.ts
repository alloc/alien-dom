import { unmount } from '../core/unmount'
import { JSX } from '../types/jsx'

export function mount(root: HTMLElement, element: JSX.Element): void {
  unmount(root.firstChild)
  root.append(element)
}
