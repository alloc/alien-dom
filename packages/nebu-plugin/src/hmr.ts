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

      let name = component.id.name

      // If the component is declared as a property (often for type inference),
      // declare a random variable to assign the component to.
      const propertyParent = component.function.findParent(
        node => node.isObjectExpression() || node.isClassBody()
      )
      if (propertyParent) {
        const property = component.function.findParent(
          node =>
            node.parent === propertyParent &&
            (node.isProperty() || (node.isPropertyDefinition() && node.static))
        ) as Node.Property | Node.PropertyDefinition | undefined

        if (property) {
          const nearestStatement = propertyParent.findParent(
            node => node.parent === nearestBlock
          )!
          name = name + '_'
          nearestStatement.before('let ' + name + ';\n')
          property.value.before('(' + name + ' = (')
          property.value.after('))')
        }
      }

      nearestBlock.push(
        'body',
        `\nhmrRegister("${file}:${component.id.name}", ${name}, "${component.hash}", [${deps}])`
      )
    }

    program.unshift(
      'body',
      `import { hmrRegister } from "alien-dom/dist/hmr.mjs"\n`
    )

    options.onHmrAdded?.(file)
  },
})
