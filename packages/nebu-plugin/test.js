import { nebu } from 'nebu'
import { green } from 'kleur/colors'
import plugin from './src/plugin'

const result = nebu.process(
  `import {selfUpdating} from 'alien-dom'
function Foo() {
  const button = <button />

  const Bar = selfUpdating(() => {
    const button = <button />
    button.onClick(() => {
      button.replace(<div>{button}</div>)
    })
    return <div>{button}</div>
  })

  return <div>{button}<Bar/></div>
}
`,
  {
    plugins: [plugin],
    jsx: true,
  }
)

console.log('\n' + green(result.js))
