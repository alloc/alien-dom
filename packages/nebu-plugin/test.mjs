import { nebu } from 'nebu'
import { green } from 'kleur/colors'
import plugin from './dist/plugin.js'

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

  return <div>
    {button}
    <SomeContext.Provider value={1}>
      <Test test={<Test />} />
    </SomeContext.Provider>
    <Bar placeholder={<Placeholder />}>
      <Test>
        <div><Test /></div>
        {condition ? <Test /> : null}
      </Test>
    </Bar>
  </div>
}
`,
  {
    plugins: [plugin],
    jsx: true,
  }
)

console.log('\n' + green(result.js))
