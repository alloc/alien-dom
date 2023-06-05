import test from 'ava'
import selfUpdatingTransform from './selfUpdating'
import { nebu } from 'nebu'

test('self-referencing variable with function value', t => {
  // Basic case
  let result = nebu.process(
    'function Input() { const x = () => x() }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)

  // The auto-memoized function is a callback prop. The element is
  // assigned to a variable, but first it's wrapped with $().
  result = nebu.process(
    'function Outer() { const x = $(<Inner onClick={() => x.remove()} />) }',
    { jsx: true, plugins: [selfUpdatingTransform()] }
  )
  t.snapshot(result.js)

  // The referenced variable shares the same name as the containing
  // function. The referenced variable was declareed in the same scope
  // as the reference. This is not a self-referencing function.
  result = nebu.process(
    'function Input() { const x = () => { const x = () => {}; return x() } }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)

  // The referenced variable shares the same name as the containing
  // function. The referenced variable was declareed in a parent scope
  // of the reference. This is still not a self-referencing function.
  result = nebu.process(
    'function Input() { const x = () => { const x = () => {}; return () => x() } }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)
})

// TODO: When generating __objectMemo calls, omit any constants outside
// of the component from any dependency arrays.
test('constant referenced by auto-memoized function', t => {
  // Referenced constant exists at top level.
  let result = nebu.process(
    'const inner = () => {}; function NewInput() { const outer = () => inner() }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)

  // Referenced constant exists in a component.
  result = nebu.process(
    'function Input() { const inner = () => {}; const outer = () => inner() }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)

  // Referenced constant exists in a function outside the component.
  result = nebu.process(
    'function createInput() { const inner = () => {}; return function Input() { const outer = () => inner() } }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)
})

// BUG: This will cause a reference error due to access before lexical
// declaration of the `outer` variable.
test('auto-memoized function declared before variable referenced by it', t => {
  let result = nebu.process(
    'function Outer() { const Inner = () => <Input onChange={() => outer.remove()} />; const outer = <div><Inner /></div>; return outer }',
    { jsx: true, plugins: [selfUpdatingTransform()] }
  )
  t.snapshot(result.js)
})

test('displayName added to selfUpdating component', t => {
  let result = nebu.process('const Foo = selfUpdating(() => null);', [
    selfUpdatingTransform(),
  ])
  t.snapshot(result.js)
})
