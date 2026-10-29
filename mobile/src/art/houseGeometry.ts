// Where the home house stands and how high its roof rises, shared by the drawing and the scene
// (the radar mast stands on the roof).

import type { HouseBuild, RoofStyle } from '../../../src/game/data/home'

/** Where the walls stand, by shape. Bottom is always the quay. */
export function houseFrame(build: HouseBuild, water: number) {
  switch (build) {
    case 'tall':
      return { x: 180, w: 86, top: water - 96, rows: 2 }
    case 'boathouse':
      return { x: 156, w: 140, top: water - 26, rows: 1 }
    default:
      return { x: 168, w: 110, top: water - 50, rows: 1 }
  }
}

/** How high each roof style rises over walls this wide. */
export function roofRise(style: RoofStyle, w: number) {
  return style === 'steep' ? w * 0.55 : style === 'hip' ? w * 0.22 : style === 'thatch' ? w * 0.32 : w * 0.3
}

/** The top of the roof (for the radar mast and anything else that stands on it). */
export function roofPeak(build: HouseBuild, style: RoofStyle, water: number) {
  const f = houseFrame(build, water)
  return f.top - roofRise(style, f.w)
}
