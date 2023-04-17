import { computeComponentHashes } from './hash'
import { Node, Plugin } from 'nebu'
import { ESTree } from 'nebu/dist/types'
import { FunctionNode } from './helpers'

type Identifier = Node<ESTree.Identifier>

type State = { file: string; code: string }

export default (options: {
  hash: (code: string) => string
  /**
   * Called when a file contains `alien-dom` components that are
   * compatible with hot reloading.
   */
  onHmrAdded?: (file: string) => void
}): Plugin<State> => ({
  Program(program, { file, code }) {
    const components = computeComponentHashes<Identifier, FunctionNode>(
      program,
      code,
      options.hash
    )

    if (!components.length) {
      return
    }

    program.unshift(
      'body',
      `import { hmrSelfUpdating, hmrComponent, hmrRegister } from "alien-dom/dist/hmr"\n`
    )

    for (const component of components) {
      if (component.selfUpdating) {
        const selfUpdatingCall = component.function
          .parent as Node<ESTree.CallExpression>
        const callee = selfUpdatingCall.callee as Node<ESTree.Identifier>
        callee.replace('hmrSelfUpdating')
      } else {
        component.function.before(`hmrComponent(`)
        component.function.after(`)`)
        if (component.function.isFunctionDeclaration()) {
          component.function.before(`const ${component.id.name} = `)
        }
      }

      const nearestBlock = component.function.findParent(
        node => node.isBlockStatement() || node.isProgram()
      ) as Node<ESTree.BlockStatement | ESTree.Program>

      nearestBlock.push(
        'body',
        `\nhmrRegister("${file}", "${component.id.name}", ${component.id.name}, "${component.hash}")`
      )
    }

    options.onHmrAdded?.(file)
  },
})
