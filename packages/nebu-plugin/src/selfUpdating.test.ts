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
