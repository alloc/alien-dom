import type { Node, Plugin } from 'nebu'
import { computeComponentHashes } from './hash'
import { FunctionNode, findExternalReferences } from './helpers'

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
    const components = computeComponentHashes<Node.Identifier, FunctionNode>(
      program,
      code,
      options.hash
    )

    if (!components.length) {
      return
    }

    for (const component of components) {
      const { deps } = findExternalReferences(component.function)

      const nearestBlock = component.function.findParent(
        node => node.isBlockStatement() || node.isProgram()
      ) as Node.BlockStatement | Node.Program

      nearestBlock.push(
        'body',
        `\nhmrRegister("${file}:${component.id.name}", ${component.id.name}, "${component.hash}", [${deps}])`
      )
    }

    program.unshift(
      'body',
      `import { hmrRegister } from "alien-dom/dist/hmr.mjs"\n`
    )

    options.onHmrAdded?.(file)
  },
})
