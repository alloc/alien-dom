import { nebu } from 'nebu'
import { green } from 'kleur/colors'
import { nebuSelfUpdating } from './dist/index.js'

const result = nebu.process(
  `import {selfUpdating} from 'alien-dom'
function Foo() {
  return <Transition enter={() => ({ opacity: 1 })}>
    {() => <Slide />}
  </Transition>
}
`,
  {
    plugins: [nebuSelfUpdating()],
    jsx: true,
  }
)

console.log('\n' + green(result.js))
