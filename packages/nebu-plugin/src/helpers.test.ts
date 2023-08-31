import test from 'ava'
import dedent from 'dedent'
import { nebu, Plugin } from 'nebu'
import { findExternalReferences } from './helpers'

test('findExternalReferences', t => {
  const module = js`
    const onClick = () => {
      let tries = 0
      runTask(async function task() {
        try {
          await fetch(url).then(response => response.json())
        } catch(error) {
          // Retry the task.
          if (++tries < 3) {
            return task()
          }
          throw error
        }
      })
    }
  `

  module.process({
    Program(program) {
      const result = findExternalReferences(program.body[0])
      t.deepEqual(result.deps, ['runTask', 'fetch', 'url'])
    },
  })
})

function js(codeTemplate: TemplateStringsArray, ...values: any[]) {
  const code = dedent(codeTemplate, ...values)
  return {
    process(plugin: Plugin) {
      return nebu.process(code, plugin)
    },
  }
}
