// Where everything on a boat goes, worked out from her class: the hull's shape, her paint, what
// kind of working boat she is, and where the wheelhouse and funnel sit (scenes need those for
// the captain's silhouette and the smoke). Local space: x = 0 at the stern to x = W at the bow,
// y = 0 at the deck amidships, up is negative; the hull runs down to y = H.

import type { BoatClass } from '../../../src/game/types'
import { TIERS } from '../../../src/game/data/boats'
import { hash } from './paint'

export type Build = 'base' | 'big' | 'fast'
export type Kind = 'sail' | 'workboat' | 'trawler' | 'freighter' | 'taxi' | 'ferry' | 'liner'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface BoatLayout {
  W: number
  H: number
  kind: Kind
  build: Build
  paint: string
  /** Where the red bottom paint starts, below the deck. */
  waterline: number
  hullPath: string
  sheerPath: string
  /** Deck height at x (negative is up), following the sheer. */
  deckY: (x: number) => number
  wheelhouse: Box
  /** The funnel, if she has one; smoke leaves from the middle of its top. */
  stack: Box | null
}

/** A boat's drawn length in local units: bigger tiers are longer. */
export function boatWidth(cls: BoatClass): number {
  return 120 + cls.sizeTier * 30
}

const PAINT = {
  common: ['#3d5a73', '#2f5d62', '#8a3a3a', '#e2d5bd', '#23395b', '#4a3346', '#6b5a2e', '#d9cdb4'],
  rare: ['#2c5f8a', '#1f4e5f', '#34507a'],
  legendary: ['#2a2230', '#3a2a1e'],
  mythic: ['#1e2a2e'],
}

function buildOf(cls: BoatClass): Build {
  if (cls.price === 0) return 'base' // the starters are just small
  const r = cls.capacity / TIERS[cls.sizeTier].capacity
  return r > 1.1 ? 'big' : r < 0.9 ? 'fast' : 'base'
}

function kindOf(cls: BoatClass): Kind {
  const t = cls.sizeTier
  if (cls.track === 'cargo') return t === 1 ? 'sail' : t === 2 ? 'workboat' : t === 3 ? 'trawler' : 'freighter'
  return t === 1 ? 'taxi' : t === 2 ? 'ferry' : 'liner'
}

export function boatLayout(cls: BoatClass): BoatLayout {
  const W = boatWidth(cls)
  const tier = cls.sizeTier
  const build = buildOf(cls)
  const kind = kindOf(cls)
  const H = 16 + tier * 4 + (build === 'big' ? 4 : build === 'fast' ? -3 : 0)
  const sr = 2 // stern rise
  const br = 7 + tier * 1.5 + (build === 'fast' ? 3 : 0) // bow rise
  const rake = H * (build === 'fast' ? 1.9 : 1.25)
  const palette = PAINT[cls.rarity]
  const paint = palette[hash(cls.id) % palette.length]

  // The sheer is one quadratic from the stern up to the bow.
  const P0 = { x: -2, y: -sr }
  const P1 = { x: W * 0.6, y: -sr + 1 }
  const P2 = { x: W, y: -br }
  const at = (t: number) => ({
    x: (1 - t) ** 2 * P0.x + 2 * t * (1 - t) * P1.x + t * t * P2.x,
    y: (1 - t) ** 2 * P0.y + 2 * t * (1 - t) * P1.y + t * t * P2.y,
  })
  const samples = Array.from({ length: 41 }, (_, i) => at(i / 40))
  const deckY = (x: number) => {
    const i = samples.findIndex((p) => p.x >= x)
    if (i <= 0) return samples[0].y
    const a = samples[i - 1]
    const b = samples[i]
    return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)
  }
  const sheerPath = `M${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`
  const hullPath =
    `${sheerPath} C ${W - rake * 0.15} ${H * 0.3}, ${W - rake * 0.6} ${H}, ${W - rake} ${H} ` +
    `L ${W * 0.1} ${H} C ${W * 0.035} ${H}, 0 ${H * 0.65}, -3 ${H * 0.1} Z`

  const lift = build === 'big' ? 1.15 : build === 'fast' ? 0.85 : 1
  let wheelhouse: Box
  let stack: Box | null = null
  switch (kind) {
    case 'sail':
      wheelhouse = { x: W * 0.64, y: -18, w: W * 0.17, h: 18 }
      break
    case 'workboat': {
      const h = 28 * lift
      wheelhouse = { x: W * 0.62, y: -h, w: W * 0.2, h }
      stack = { x: W * 0.62 - 12, y: -h - 6, w: 9, h: h + 6 }
      break
    }
    case 'trawler': {
      const h = 32 * lift
      wheelhouse = { x: W * 0.6, y: -h, w: W * 0.22, h }
      stack = { x: W * 0.6 - 14, y: -h - 10, w: 11, h: h + 10 }
      break
    }
    case 'freighter': {
      const h = (30 + tier * 6) * lift
      wheelhouse = { x: W * 0.05, y: -h, w: W * 0.2, h }
      stack = { x: W * 0.09, y: -h - 16 - tier * 2, w: 14 + tier, h: 16 + tier * 2 }
      break
    }
    case 'taxi':
      wheelhouse = { x: W * 0.66, y: -16, w: W * 0.15, h: 16 }
      break
    case 'ferry': {
      const cabin = 20 * lift
      wheelhouse = { x: W * 0.56, y: -cabin - 16, w: W * 0.17, h: 16 }
      stack = { x: W * 0.36, y: -cabin - 22, w: 11, h: 22 }
      break
    }
    case 'liner': {
      const decks = linerDecks(tier, build)
      const top = -decks * 14 * lift
      wheelhouse = { x: W * (0.6 - decks * 0.03), y: top - 14, w: W * 0.14, h: 14 }
      stack = { x: W * 0.4, y: top - 26 - tier * 2, w: 14 + tier, h: 26 + tier * 2 }
      break
    }
  }
  return { W, H, kind, build, paint, waterline: H * 0.58, hullPath, sheerPath, deckY, wheelhouse, stack }
}

export function linerDecks(tier: number, build: Build): number {
  return 2 + (tier >= 5 ? 1 : 0) + (build === 'big' ? 1 : 0) - (build === 'fast' ? 1 : 0)
}
