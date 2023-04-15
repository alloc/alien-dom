import type { JSX } from './types/jsx';
import {selfUpdating} from './selfUpdating';

const fileRegistry: {[file:string]: {[componentName:string]: string}} = {}
const elementRegistry: {[file:string]:{[componentName:string]:}} = {}

export function hmrSelfUpdating(render: (props: any, update: (props : any) => void) => JSX.Element, hash: string) {
  const Component = selfUpdating((props, update) => {
    const result = render(props, update)
  })
}

export function hmrComponent(render: (props: any) => JSX.Element, hash: string) {
  const Component = (props: any) => {
    
  }
}

export function hmrRegisterComponent(file: string, name: string, hash: string) {
  const components = fileRegistry[file] ||= {}

  const oldHash = components[name]
  const canUpdate = oldHash && oldHash !== hash
  components[name] = hash

  if (canUpdate) {
    const elements = elementRegistry[name]
    if (elements) {
      for (const element of elements) {
        element.rerender(hash)
      }
    }
  } 

}