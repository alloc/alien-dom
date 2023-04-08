import { createContext } from './context'
import { AlienHooks } from './hooks'
import { AlienComponent } from './internal/component'

export const currentHooks = createContext<AlienHooks | undefined>()
export const currentComponent = createContext<AlienComponent | undefined>()
