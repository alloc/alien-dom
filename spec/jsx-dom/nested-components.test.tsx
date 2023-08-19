import test from 'ava'
import { flushMicroTasks } from 'flush-microtasks'
import { ref } from '../../src/observable'
import '../setup/cleanup'

let app: HTMLElement

test('nested components', async t => {
  const renders: string[] = []

  const outerDep = ref(0)
  const innerDep = ref(0)

  function Outer() {
    renders.push('outer')

    function Inner() {
      renders.push('inner')

      return <span>Inner {innerDep.value}</span>
    }

    return (
      <div>
        <span>Outer {outerDep.value}</span>
        {outerDep.value < 2 && <Inner />}
      </div>
    )
  }

  app = <Outer />
  document.body.appendChild(app)
  t.deepEqual(renders, ['outer', 'inner'])
  t.snapshot(app.toString())

  // Next, update the Outer component, causing the Inner to also update. In the
  // future, the Inner component shouldn't update, since nothing used by Inner
  // has changed.
  renders.length = 0
  outerDep.value++

  await flushMicroTasks()
  t.deepEqual(renders, ['outer', 'inner'])
  t.snapshot(app.toString())

  // Next, update only the Inner component.
  renders.length = 0
  innerDep.value++

  await flushMicroTasks()
  t.deepEqual(renders, ['inner'])
  t.snapshot(app.toString())

  // Next, set the outerDep to 2, which unmounts the <Inner /> element.
  renders.length = 0
  outerDep.value++

  await flushMicroTasks()
  t.deepEqual(renders, ['outer'])
  t.snapshot(app.toString())
})
