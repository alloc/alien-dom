import { AlienElementPrototype } from './dist/internal/element.mjs'
import { AlienNodeListPrototype } from './dist/internal/nodeList.mjs'

Object.setPrototypeOf(AlienElementPrototype, Node.prototype)
Object.setPrototypeOf(Element.prototype, AlienElementPrototype)
Object.assign(NodeList.prototype, AlienNodeListPrototype)
