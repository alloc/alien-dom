import { peek } from '../observable'

let nextId = Number.MIN_SAFE_INTEGER

/**
 * Create a globally unique identifier, which is usually guaranteed to be
 * non-zero. Of course, this cannot be guaranteed when a `generateId` function
 * is provided.
 *
 * The identifiers begin at `Number.MIN_SAFE_INTEGER` and increment by 1.
 */
export function createGuid<
  Container extends object,
  Key extends AssignableProps<Container, number>
>(
  container: Container,
  key: Key,
  force?: boolean | null,
  generateId?: () => Container[Key]
): Exclude<Container[Key], null | undefined>

export function createGuid(): number

export function createGuid(
  container?: any,
  key?: any,
  force?: boolean | null,
  generateId?: () => any
) {
  if (!container) {
    return (nextId += nextId === -1 ? 2 : 1)
  }
  if (key == null) {
    throw Error('A key must be provided when a container is provided')
  }
  let guid: any = peek(() => container[key])
  if (!guid || force) {
    guid = generateId ? generateId() : (nextId += nextId === -1 ? 2 : 1)
    container[key] = guid
  }
  return guid
}

type AssignableProps<
  T extends object,
  PropertyType
> = keyof T extends infer Property
  ? Property extends keyof T
    ? PropertyType extends T[Property]
      ? Property
      : never
    : never
  : never
