import test from 'ava'
import { flushMicroTasks } from 'flush-microtasks'
import { spy } from 'nanospy'
import { useMicrotask } from '../src/hooks/useMicrotask'
import './setup/cleanup'

let app: HTMLElement

test('useMicrotask should fire once mounted', async t => {
  const callback = spy()

  function App() {
    useMicrotask(callback)
    return null
  }

  app = <App title="Hello">Welcome to my app!</App>
  t.is(callback.callCount, 0)

  await flushMicroTasks()
  t.is(callback.callCount, 0)

  document.body.append(app)
  t.is(callback.callCount, 0)

  await flushMicroTasks()
  t.is(callback.callCount, 1)
})
