import { isNumber } from '@alloc/is'
import { Disposable } from '../addons/disposable'
import {
  parseTransform,
  readTransform,
  renderTransform,
} from '../internal/animate/transform'
import {
  addHostProp,
  applyDatasetProp,
  applyNestedProp,
  applyProp,
} from '../internal/applyProp'
import { flattenStyleProp } from '../internal/flattenStyleProp'
import { kAlienHostProps } from '../internal/symbols'
import { cssTransformAliases, cssTransformUnits } from '../internal/transform'
import { DefaultElement } from '../internal/types'
import { UpdateStyle, updateStyle } from '../internal/updateStyle'
import { forEach, keys, noop } from '../internal/util'
import { isSvgChild } from '../jsx-dom/svg-tags'

export function morphAttributes(
  fromNode: DefaultElement,
  toProps: any,
  targetProp?: string
): void {
  const fromProps = kAlienHostProps(fromNode)!

  // Capture the keys that existed before the toProps were applied.
  const fromKeyPaths = new Set(fromProps.keys())

  // This changes based on whether the prop being morphed is fine-grained.
  let morphProp: typeof applyProp

  const updateProp = (prop: string, newValue: any, keyPath = prop) => {
    if (newValue !== undefined) {
      const oldEffects = fromProps.get(keyPath)
      fromProps.delete(keyPath)

      morphProp(fromNode, prop, newValue, fromProps)
      fromKeyPaths.delete(keyPath)

      forEach(oldEffects, disposeFirstArg)
    }
  }

  // The `style.transform` property is special-cased.
  let fromTransformExists: boolean | undefined
  let toTransformExists: boolean | undefined

  for (const prop in toProps) {
    let newValue = toProps[prop]

    if (newValue && prop in fineGrainedMorphs) {
      morphProp = (_, prop, newValue) => {
        morphProp = fineGrainedMorphs[prop]

        if (prop === 'style') {
          // Flatten the style prop while preserving any Ref objects.
          newValue = flattenStyleProp(
            fromNode,
            newValue,
            {},
            Object.assign,
            fromProps
          )

          const newStyle = newValue
          const newTransform = newStyle.transform
          const transformKeys = keys(newStyle).filter(
            key => key in cssTransformAliases
          )
          if (transformKeys.length) {
            const svgMode = isSvgChild(fromNode)

            toTransformExists = true
            newStyle.transform = transformKeys.map(key => {
              let value = newStyle[key]
              delete newStyle[key]

              const keyPath = 'style.' + key
              const oldEffects = fromProps.get(keyPath)
              fromProps.delete(keyPath)

              // Add an observer if necessary.
              value = addHostProp(fromProps, keyPath, value, applyNestedProp)

              forEach(oldEffects, disposeFirstArg)

              let transformFn = cssTransformAliases[key]
              if (!transformFn || svgMode) {
                transformFn = key
              }

              if (isNumber(value) && !svgMode) {
                value += (cssTransformUnits[key] || '') as any
              }

              return [transformFn, value]
            })
          }
          if (newTransform !== undefined) {
            toTransformExists = true

            morphProp = (fromNode, prop, newValue) => {
              if (prop === 'transform') {
                const value = parseTransform(
                  addHostProp(
                    fromProps,
                    'style.transform',
                    newTransform,
                    applyNestedProp
                  )
                )
                if (transformKeys.length) {
                  newValue.push(...value)
                } else {
                  newValue = value
                }
              }

              fineGrainedMorphs.style(fromNode, prop, newValue, fromProps)
            }
          }
        }

        for (const key in newValue) {
          updateProp(key, newValue[key], `${prop}.${key}`)
        }
      }
    } else {
      morphProp = applyProp
    }

    updateProp(prop, newValue)
  }

  // Unset any key paths that were not updated.
  for (const keyPath of fromKeyPaths) {
    if (keyPath === 'children') {
      continue
    }

    let parentProp: string | undefined
    let prop: string

    if (keyPath in fineGrainedMorphs) {
      prop = keyPath
      // Do nothing, as properties are individually removed.
      morphProp = noop
    } else {
      const dotIndex = keyPath.indexOf('.')
      if (dotIndex !== -1) {
        prop = keyPath.slice(dotIndex + 1)
        parentProp = keyPath.slice(0, dotIndex)
        if (
          parentProp === 'style' &&
          (prop === 'transform' || prop in cssTransformAliases)
        ) {
          fromTransformExists = true
          // Do nothing, as transform props are removed together.
          morphProp = noop
        } else {
          morphProp = fineGrainedMorphs[parentProp]
        }
      } else {
        prop = keyPath
        morphProp = applyProp
      }
    }

    // Never unset props not related to the target prop.
    if (targetProp && (parentProp || prop) !== targetProp) {
      continue
    }

    const oldEffects = fromProps.get(keyPath)
    forEach(oldEffects, disposeFirstArg)

    morphProp(fromNode, prop, null)
    fromProps.delete(keyPath)
  }

  if (fromTransformExists && !toTransformExists) {
    updateStyle(fromNode, { transform: null })
  }
}

const morphStyleProperty: typeof applyProp = (
  fromNode,
  key,
  newValue,
  fromProps
) => {
  if (key === 'transform') {
    const svgMode = isSvgChild(fromNode)
    const gpuMode = fromNode.classList.contains('transform-gpu')
    const oldTransform = parseTransform(readTransform(fromNode, svgMode))
    const newTransform = renderTransform(
      oldTransform,
      newValue,
      false,
      svgMode,
      gpuMode
    )
    updateStyle(fromNode, { transform: newTransform })
  } else {
    newValue = addHostProp(fromProps, 'style.' + key, newValue, applyNestedProp)
    updateStyle(fromNode, { [key]: newValue }, UpdateStyle.NonAnimated)
  }
}

const morphDatasetProperty: typeof applyProp = (
  fromNode,
  key,
  newValue,
  fromProps
) => {
  applyDatasetProp(fromNode, { [key]: newValue }, fromProps)
}

const fineGrainedMorphs: Record<string, typeof applyProp> = {
  style: morphStyleProperty,
  dataset: morphDatasetProperty,
}

function disposeFirstArg(arg: Disposable) {
  arg.dispose()
}
