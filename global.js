import { AlienElementPrototype } from './dist/element'
import { AlienNodeListPrototype } from './dist/nodeList'

Object.setPrototypeOf(AlienElementPrototype, Node.prototype)
Object.setPrototypeOf(Element.prototype, AlienElementPrototype)
Object.assign(NodeList.prototype, AlienNodeListPrototype)
