import { createContext } from './context'
import { AlienHooks } from './hooks'
import { AlienComponent } from './internal/types'

export const currentHooks = createContext<AlienHooks | undefined>()
export const currentComponent = createContext<AlienComponent | undefined>()
