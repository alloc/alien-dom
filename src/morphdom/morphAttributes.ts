import { isArray, isNumber } from '@alloc/is'
import { Disposable } from '../disposable'
import {
  parseTransform,
  readTransform,
  renderTransform,
} from '../internal/animate/transform'
import { addHostProp, applyDatasetProp, applyProp } from '../internal/applyProp'
import { kAlienHostProps } from '../internal/symbols'
import { cssTransformAliases, cssTransformUnits } from '../internal/transform'
import { DefaultElement } from '../internal/types'
import { isSvgChild } from '../jsx-dom/svg-tags'
import { forEach, keys, noop, updateStyle } from '../jsx-dom/util'

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

      if (oldEffects) {
        forEach(oldEffects, disposeFirstArg)
      }
    }
  }

  // The `style.transform` property is special-cased.
  let fromTransformExists: boolean | undefined
  let toTransformExists: boolean | undefined

  for (const prop in toProps) {
    if (prop === 'children') {
      continue // Children are morphed separately.
    }

    let newValue = toProps[prop]

    if (newValue && prop in fineGrainedMorphs) {
      if (prop === 'style') {
        const transformKeys = keys(newValue).filter(
          key => key in cssTransformAliases
        )
        if (transformKeys.length) {
          const newStyle = (newValue = { ...newValue })
          const svgMode = isSvgChild(fromNode)

          toTransformExists = true
          newStyle.transform = transformKeys.map(key => {
            let value = newStyle[key]
            delete newStyle[key]

            const keyPath = 'style.' + key
            const oldEffects = fromProps.get(keyPath)
            fromProps.delete(keyPath)

            // Add an observer if necessary.
            value = addHostProp(fromProps, keyPath, value)

            if (oldEffects) {
              forEach(oldEffects, disposeFirstArg)
            }

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
      }
      morphProp = (_, prop, newValue) => {
        morphProp = fineGrainedMorphs[prop]
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
        if (parentProp === 'style' && prop in cssTransformAliases) {
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
    if (oldEffects) {
      forEach(oldEffects, disposeFirstArg)
    }

    morphProp(fromNode, prop, null)
    fromProps.delete(keyPath)
  }

  if (fromTransformExists && !toTransformExists) {
    updateStyle(fromNode, { transform: null })
  }
}

const morphStyleProperty: typeof applyProp = (fromNode, key, newValue) => {
  if (key === 'transform') {
    const svgMode = isSvgChild(fromNode)
    const oldTransform = parseTransform(readTransform(fromNode, svgMode))
    const newTransform = renderTransform(
      oldTransform,
      isArray(newValue)
        ? (newValue as [string, string][])
        : parseTransform(newValue),
      false,
      svgMode
    )
    updateStyle(fromNode, { transform: newTransform })
  } else {
    updateStyle(fromNode, { [key]: newValue })
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
