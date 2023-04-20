import { AlienElementPrototype } from './dist/element.mjs'
import { AlienNodeListPrototype } from './dist/nodeList.mjs'

Object.setPrototypeOf(AlienElementPrototype, Node.prototype)
Object.setPrototypeOf(Element.prototype, AlienElementPrototype)
Object.assign(NodeList.prototype, AlienNodeListPrototype)
