import test from 'ava'
import { createContext } from 'core/context'
import { flushMicroTasks } from 'flush-microtasks'
import { renderComponent } from 'functions/renderComponent'

test('context layering', t => {
  const TestContext = createContext(1)

  function Test() {
    const value = TestContext.get()
    return <span>{value}</span>
  }

  const defaultTest = <Test />
  t.snapshot(defaultTest.toString())

  const overrideTest = (
    <TestContext value={2}>
      <Test />
    </TestContext>
  )
  t.snapshot(overrideTest.toString())

  const nestedOverrideTest = (
    <TestContext value={2}>
      <TestContext value={3}>
        <Test />
      </TestContext>
    </TestContext>
  )
  t.snapshot(nestedOverrideTest.toString())
})

test('component with context as its root node', async t => {
  const TestContext = createContext(1)

  function Inner() {
    const value = TestContext.get()
    return <span>{value}</span>
  }

  function Outer({ value }: { value: number }) {
    return (
      <TestContext value={value}>
        <Inner />
      </TestContext>
    )
  }

  const node = renderComponent(Outer, { value: 2 })

  t.snapshot(node.rootNode.toString())

  node.replaceProps({ value: 3 })
  await flushMicroTasks()

  t.is(node.firstElementChild.textContent, '3')
})
