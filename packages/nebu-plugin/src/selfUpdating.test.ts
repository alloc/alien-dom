import test from 'ava'
import selfUpdatingTransform from './selfUpdating'
import { nebu } from 'nebu'

test('self-referencing variable with function value', t => {
  let result = nebu.process(
    'function Input() { const x = () => x() }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)

  result = nebu.process(
    'function Input() { const x = () => { const x = () => {}; return x() } }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)

  result = nebu.process(
    'function Input() { const x = () => { const x = () => {}; return () => x() } }',
    selfUpdatingTransform()
  )
  t.snapshot(result.js)
})
