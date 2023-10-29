import { JSX } from '../types/jsx'
import { unmount } from './unmount'

export function mount(root: HTMLElement, element: JSX.Element): void {
  unmount(root.firstChild)
  root.append(element)
}
