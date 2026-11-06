// Where each port's landmark stands on its waterfront: the town leaves this stretch clear. Tall
// screens crop up to a tenth off each side of a scene, so landmarks keep to x 36..322; SHIFT moves
// a drawing (laid out in Landmarks.tsx) into that safe middle.

export const LANDMARK_SPAN: Record<string, [number, number]> = {
  saltmarsh: [262, 324],
  gullwick: [36, 146],
  brindle: [234, 322],
  cobble: [194, 322],
  farhaven: [140, 220],
  mistle: [226, 334],
  greyhollow: [120, 240],
  wickstone: [36, 116],
  sealrock: [184, 322],
  coralby: [110, 250],
  driftwood: [36, 186],
  saffron: [130, 230],
  holdfast: [0, 358],
  frostgate: [130, 230],
  anvil: [194, 322],
  lanternhold: [140, 220],
  ember: [194, 322],
  lastlight: [234, 322],
}

export const LANDMARK_SHIFT: Record<string, number> = {
  saltmarsh: -34,
  gullwick: 36,
  brindle: -36,
  cobble: -36,
  mistle: -24,
  wickstone: 36,
  sealrock: -36,
  driftwood: 36,
  anvil: -36,
  ember: -36,
  lastlight: -36,
}

/** How tall each landmark stands above the water (scene units), for framing it on a postcard. */
export const LANDMARK_HEIGHT: Record<string, number> = {
  saltmarsh: 90,
  gullwick: 56,
  brindle: 112,
  cobble: 104,
  farhaven: 118,
  mistle: 46,
  greyhollow: 118,
  wickstone: 94,
  sealrock: 34,
  coralby: 34,
  driftwood: 60,
  saffron: 102,
  holdfast: 92,
  frostgate: 94,
  anvil: 120,
  lanternhold: 145,
  ember: 104,
  lastlight: 124,
}
