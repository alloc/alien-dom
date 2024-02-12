import { AlienElementPrototype } from './dist/global/element.mjs'
import { AlienNodeListPrototype } from './dist/global/nodeList.mjs'

Object.setPrototypeOf(AlienElementPrototype, Node.prototype)
Object.setPrototypeOf(Element.prototype, AlienElementPrototype)
Object.assign(NodeList.prototype, AlienNodeListPrototype)
