export const cssTransformAliases: Record<string, string | 0> = {
  x: 'translateX',
  y: 'translateY',
  z: 'translateZ',

  // These functions are not aliased.
  rotate: 0,
  scale: 0,
  scaleX: 0,
  scaleY: 0,
}

export const cssTransformDefaults: Record<string, number | null> = {
  rotate: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  // Ensure that translateZ(0) stays in the transform, so the browser
  // continues to use hardware acceleration.
  translateZ: null,
}

export const cssTransformUnits: Record<string, string | undefined> = {
  x: 'px',
  y: 'px',
  z: 'px',
  rotate: 'deg',
}
