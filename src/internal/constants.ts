export const kElementNodeType = 1
export const kFragmentNodeType = 11
export const kTextNodeType = 3
export const kCommentNodeType = 8

/** Special nodes are distinguished by a numeric property of this symbol. */
export const kAlienNodeType = Symbol.for('alien:nodeType')

export const kShadowRootNodeType = 99
export const kDeferredNodeType = 98
