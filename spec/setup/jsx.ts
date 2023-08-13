import { Fragment, createElement } from '../../src/jsx-dom/jsx-runtime'

declare const React: any
React.createElement = createElement
React.Fragment = Fragment
