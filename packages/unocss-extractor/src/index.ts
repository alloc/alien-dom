import { extractorSplit, type Extractor } from '@unocss/core'
import { Node } from 'estree-jsx'
import { walk } from 'estree-walker'
import { parseModule } from 'meriyah'
import { transform } from 'sucrase'

const split = extractorSplit.extract as (ctx: { code: string }) => string[]

const extractor: Extractor = {
  name: '@alien-dom/unocss-extractor',
  order: 0,
  extract(ctx) {
    const id = ctx.id

    let code = ctx.code
    let isTSX = false

    if (!id || id.endsWith('.tsx')) {
      try {
        code = transform(code, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'preserve',
        }).code
        isTSX = true
      } catch (e: any) {
        if (!id) {
          return split(ctx)
        }
        return []
      }
    }

    if (isTSX || id?.endsWith('.jsx')) {
      try {
        const ast = parseModule(code, {
          next: true,
          jsx: true,
          ranges: true,
        })

        const tokens: string[] = []
        const skipped = new Set<Node>()

        walk(ast as any, {
          enter(node: Node & { start?: number; end?: number }) {
            // Avoid false positive with import source.
            if (node.type === 'ImportDeclaration') {
              this.skip()
            }

            // Assume that conditions won't contain any tokens.
            else if (
              node.type === 'IfStatement' ||
              node.type === 'ConditionalExpression' ||
              node.type === 'SwitchCase'
            ) {
              if (node.test) {
                skipped.add(node.test)
              }
            }

            // Handle pre-skipped nodes.
            else if (skipped.has(node)) {
              this.skip()
            }

            // Look for specially handled JSX attributes.
            else if (node.type === 'JSXAttribute') {
              if (node.name.type !== 'JSXIdentifier') {
                return
              }

              const attrName = node.name.name
              const isClassLikeAttribute = attrName.match(/(\w+C|^c)lass$/)

              // For class-like JSX attributes, look for object literals and add
              // their property names to the tokens array.
              if (
                isClassLikeAttribute &&
                node.value &&
                node.value.type === 'JSXExpressionContainer'
              ) {
                return walk(node.value.expression, {
                  enter(node) {
                    if (node.type === 'ObjectExpression') {
                      // Add property names to the tokens array.
                      node.properties.forEach(property => {
                        if (
                          property.type === 'Property' &&
                          property.key.type === 'Identifier'
                        ) {
                          tokens.push(property.key.name)
                        }
                      })
                      skipped.add(node)
                      this.skip()
                    }
                  },
                })
              }

              // Avoid false positives in certain attributes. This check can be
              // expanded in the future if more false positives are found to be
              // common.
              const isIgnoredAttribute =
                !isClassLikeAttribute && attrName.match(/((\w+S|^s)tyle|^key)$/)

              if (isIgnoredAttribute) {
                this.skip()
              }
            }

            // String literals are split into tokens using the default UnoCSS
            // extractor.
            else if (node.type === 'Literal') {
              if (typeof node.value === 'string') {
                split({ code: node.value }).forEach(token => {
                  tokens.push(token)
                })
              }
            }
          },
        })

        return tokens
      } catch (e: any) {
        return []
      }
    }

    return split(ctx)
  },
}

export default extractor
