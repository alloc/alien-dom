import test from 'ava'
import { isComment } from 'functions/typeChecking'
import { useChildren } from 'hooks/useChildren'
import { JSX } from 'types/jsx'

test('useChildren • JSX.ElementProp', t => {
  function Test(props: { element: JSX.ElementProp }) {
    const elementProp = useChildren(props.element)
    const element = elementProp.expectSingleElement()
    // The first child is always a comment node.
    t.is(isComment(elementProp.firstChild), true)
    t.is(element.tagName, 'SPAN')
    return elementProp
  }
  const test = <Test element={<span>1</span>} />
  t.snapshot(test.toString())
})

test('useChildren • JSX.ElementsProp', t => {
  function Test(props: { foo: JSX.ElementsProp }) {
    const foo = useChildren(props.foo)
    t.is(foo.childNodes.length, 3)
    t.is(foo.toElements().length, 2)
    // Test wrapping it in a JSX element.
    return <div>{foo}</div>
  }
  const test = <Test foo={[<span>1</span>, <span>2</span>]} />
  t.snapshot(test.toString())
})

test('useChildren • JSX.ChildrenProp', t => {
  function Test(props: { children: JSX.ChildrenProp }) {
    t.is(typeof props.children, 'function')
    const children = useChildren(props.children)
    t.is(children.firstElementChild?.tagName, 'SPAN')
    return children
  }
  function One() {
    return <span>1</span>
  }
  const test = (
    <Test>
      <One />
    </Test>
  )
  t.snapshot(test.toString())
})
