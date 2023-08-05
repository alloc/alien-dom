import test from 'ava'
import { parseHTML } from 'linkedom'
import { createElement } from '../src/jsx-dom/jsx-runtime'
import { setPlatform } from '../src/platform'

const React = {
  createElement,
}

test.beforeEach(() => {
  const window = parseHTML('<html><body></body></html>')
  setPlatform(window)
})

test('component returning div', () => {
  function App() {
    return <div />
  }
  console.log('React:', React)
  const app = <App />
  console.log('app:', app)
})
