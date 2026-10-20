// Every captain has their own look, picked from their id so the same person looks the same on
// the quay, on your roster, at the helm and at the tavern. Only the id goes in: a look never
// hints at hidden skill or traits.

import { hash } from './paint'
import type { RegionId } from '../../../src/game/data/ports'
import { REGION_STYLE } from './regionStyle'
import { PERSONA_LOOKS } from './personas'

export type HatKind =
  | 'cap' | 'souwester' | 'beanie' | 'brim' | 'bun' | 'bare' | 'tricorn'
  // Worn only by Legends and Mythics.
  | 'lamphat' | 'bicorne' | 'hood' | 'straw' | 'plumed' | 'beacon' | 'helmet' | 'kelp' | 'coral' | 'crown' | 'bandana' | 'none'
export type HairStyle = 'cropped' | 'swept' | 'long' | 'curls' | 'braid'
export type FacialHair = 'none' | 'stubble' | 'moustache' | 'beard' | 'mutton'
export type Coat = 'peacoat' | 'oilskin' | 'knit' | 'stripes' | 'raincoat' | 'greatcoat' | 'cape' | 'robe' | 'fur'
export type Prop = 'none' | 'spyglass' | 'mug' | 'logbook' | 'rope' | 'lantern' | 'crate' | 'harpoon' | 'scroll' | 'conch' | 'bell' | 'line' | 'umbrella' | 'coin'
/** Something that rides on a Legend's shoulder. */
export type Companion = 'gull' | 'cat' | 'heron' | 'octopus'
/** Flourishes only Legends and Mythics have: light, weather, creatures, and stranger things. */
export type Fx =
  | 'embers' | 'beam' | 'bubbles' | 'cloud' | 'lightning' | 'frost' | 'rings' | 'float' | 'ghost' | 'tentacles'
  | 'twinkles' | 'water' | 'moon' | 'whale' | 'bluefire' | 'fish' | 'glints' | 'halo' | 'brass-arm' | 'lantern-head'
  | 'moss' | 'medals' | 'tooth' | 'beads' | 'monocle' | 'goggles' | 'flow-hair' | 'feathers'
export type Build = 'slim' | 'stocky'
export type Extra = 'none' | 'pipe' | 'earring' | 'scar'

export interface Look {
  hat: HatKind
  hatColor: string
  coat: string
  coatStyle: Coat
  scarf: string
  skin: string
  hair: string
  hairStyle: HairStyle
  facialHair: FacialHair
  /** 0 young, 1 weathered, 2 old salt: lines, and grey coming in. */
  age: 0 | 1 | 2
  /** Brow weight, 1–2.4. */
  brow: number
  nose: 0 | 1 | 2
  extra: Extra
  build: Build
  glasses: boolean
  /** What they hold in front of them in portraits. */
  prop: Prop
  trousers: string
  boots: string
  /** A rare tavern find: a look nobody else has. */
  rare?: boolean
  /** A Legend's or Mythic's persona (see personas.ts) and what comes with it. */
  persona?: string
  fx?: Fx[]
  companion?: Companion
  /** The glow around them: amber for a Legend, their own colour for a Mythic. */
  aura?: string
  /** A cape's colour, when the coat is a cape. */
  capeColor?: string
}

/** Hat and hair shapes in figure space: a 56 × 100 standing figure, head centred at (28, 40). */
export const HAT_PATHS: Record<HatKind, string> = {
  cap: 'M12 31 h32 v3 h-32 Z M15 30 L 41 30 L 38 23 C 35 17, 21 17, 18 23 Z',
  souwester: 'M8 34 C 16 30, 40 30, 48 34 L 44 36 C 36 34, 20 34, 12 36 Z M17 31 C 18 20, 38 20, 39 31 Z',
  beanie: 'M15 32 C 15 18, 41 18, 41 32 Z M14 30 h28 v4 h-28 Z',
  brim: 'M6 32 C 14 28, 42 28, 50 32 C 42 35, 14 35, 6 32 Z M18 30 C 18 20, 38 20, 38 30 Z',
  bun: 'M16 34 C 14 22, 22 20, 28 20 C 34 20, 42 22, 40 34 C 36 28, 20 28, 16 34 Z M23 17 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z',
  bare: 'M16 34 C 14 22, 22 22, 28 22 C 34 22, 42 22, 40 34 C 36 29, 20 29, 16 34 Z',
  tricorn: 'M4 30 C 10 24, 18 30, 28 18 C 38 30, 46 24, 52 30 C 44 36, 12 36, 4 30 Z',
  lamphat: 'M15 31 h26 v3 h-26 Z M19.5 31 L 20.5 13 h 15 L 36.5 31 Z',
  bicorne: 'M1 30 C 9 21, 19 16, 28 15 C 37 16, 47 21, 55 30 C 44 34, 12 34, 1 30 Z',
  hood: 'M12.5 52 C 9 36, 13 21, 28 19 C 43 21, 47 36, 43.5 52 C 41 44, 40 33, 28 28 C 16 33, 15 44, 12.5 52 Z',
  straw: 'M1 31 C 10 27.4, 46 27.4, 55 31 C 46 34.6, 10 34.6, 1 31 Z M17 30 C 17 21, 39 21, 39 30 Z',
  plumed: 'M5 32 C 13 27, 43 27, 51 32 C 43 35.4, 13 35.4, 5 32 Z M17.5 30 C 17 19, 39 19, 38.5 30 Z',
  beacon: 'M14 31 h28 v3 h-28 Z M17 31 L 18.5 21 h 19 L 39 31 Z',
  helmet: 'M28 14 C 42 14, 48 26, 48 40 C 48 52, 42 58, 28 58 C 14 58, 8 52, 8 40 C 8 26, 14 14, 28 14 Z M28 27 C 21 27, 18.5 32, 18.5 39 C 18.5 46, 21 51, 28 51 C 35 51, 37.5 46, 37.5 39 C 37.5 32, 35 27, 28 27 Z',
  kelp: 'M15 30 h26 v3.6 h-26 Z',
  coral: 'M15 30 h26 v3.4 h-26 Z',
  crown: 'M15 30 h26 v3.6 h-26 Z M15.5 30.4 l 2.4 -8 l 2.4 8 Z M21 30.4 l 2.8 -11 l 2.8 11 Z M27 30.4 l 1.6 -7 l 1.6 7 Z M30.6 30.4 l 2.6 -10 l 2.6 10 Z M36.4 30.4 l 2.2 -7 l 2.2 7 Z',
  bandana: 'M16.2 33.5 C 15.8 24, 21.5 21.6, 28 21.6 C 34.5 21.6, 40.2 24, 39.8 33.5 C 34 30.4, 22 30.4, 16.2 33.5 Z M38.6 30 l 6 2.6 l -1.4 4.4 l -4.4 -3.6 Z M38.6 30 l 4 -3.4 l 2.4 3.8 Z',
  none: 'M0 0',
}

const HATS: HatKind[] = ['cap', 'souwester', 'beanie', 'brim', 'bun', 'bare']
const HAT_COLORS = ['#23395b', '#e9b23c', '#b8423a', '#6e4733', '#2f5d62', '#4a3346']
const COATS = ['#2f5d62', '#7a4e5e', '#3d5a73', '#5a4a3a', '#8a3a3a', '#46566e', '#6b5a2e']
const SCARVES = ['#c2452a', '#f2b45a', '#f3e7d8', '#7fd1a8', '#e8a0b4', '#9ec0cf']
const SKIN = ['#f0c9a0', '#e0b48a', '#c98a5b', '#b5764c', '#8a5a3a', '#6b4430']
const HAIR = ['#3a2630', '#5a3a2a', '#8a5a3a', '#c9a27a', '#2e1c19', '#a8452e']
const GREY = '#b9aea6'

/**
 * A captain's look. Rare tavern finds keep their face but dress like no one else on the coast;
 * Legends and Mythics keep their face too, and become their persona.
 */
export function lookFor(id: string, rare = false, region: RegionId = 'bay', persona?: string | null): Look {
  const look = regional(baseLook(id), id, region)
  if (persona && PERSONA_LOOKS[persona]) return { ...look, ...PERSONA_LOOKS[persona], persona, rare: true }
  if (!rare) return look
  return {
    ...look,
    hat: 'tricorn',
    hatColor: '#1d1218',
    coat: '#7a1f2a',
    coatStyle: 'greatcoat',
    scarf: '#e6a53a',
    trousers: '#1d1218',
    boots: '#1d1218',
    prop: 'spyglass',
    rare: true,
  }
}

/** People from beyond the bay dress the way their region does; their face stays their own. */
function regional(look: Look, id: string, region: RegionId): Look {
  const st = REGION_STYLE[region]
  if (!st.coats) return look
  const h = hash(`${id}~${region}`)
  const pick = <T,>(xs: readonly T[], shift: number) => xs[(h >>> shift) % xs.length]
  const hat = look.hat === 'bun' && st.hats!.includes('bun') ? 'bun' : pick(st.hats!, 0)
  return {
    ...look,
    hat,
    hatColor: hat === 'bun' || hat === 'bare' ? look.hair : pick(st.coats, 6),
    coat: pick(st.coats, 3),
    coatStyle: pick(st.coatStyles!, 9),
    scarf: pick(st.scarves!, 13),
    hairStyle: hat === 'bun' ? 'braid' : look.hairStyle === 'braid' && look.hat === 'bun' ? 'long' : look.hairStyle,
  }
}

function baseLook(id: string): Look {
  const h = hash(id)
  // A second hash for the newer features, so existing captains keep their hat, coat and skin.
  const h2 = hash(`${id}~face`)
  const pick = <T,>(xs: readonly T[], shift: number, from = h) => xs[(from >>> shift) % xs.length]
  const hat = pick(HATS, 0)
  const age = pick([0, 0, 1, 1, 2] as const, 0, h2)
  const hair = age === 2 ? GREY : pick(HAIR, 18)
  return {
    hat,
    hatColor: hat === 'bun' || hat === 'bare' ? hair : pick(HAT_COLORS, 4),
    coat: pick(COATS, 8),
    coatStyle: pick(['peacoat', 'peacoat', 'oilskin', 'knit', 'stripes', 'raincoat'] as const, 4, h2),
    scarf: pick(SCARVES, 12),
    skin: pick(SKIN, 15),
    hair,
    hairStyle: hat === 'bun' ? 'braid' : pick(['cropped', 'swept', 'long', 'curls', 'braid'] as const, 8, h2),
    facialHair: pick(['none', 'none', 'none', 'stubble', 'moustache', 'beard', 'mutton'] as const, 12, h2),
    age,
    brow: 1 + ((h2 >>> 16) % 8) * 0.2,
    nose: pick([0, 1, 2] as const, 20, h2),
    extra: pick(['none', 'none', 'none', 'pipe', 'earring', 'scar'] as const, 24, h2),
    build: pick(['slim', 'slim', 'stocky'] as const, 2, h2),
    glasses: (h2 >>> 28) % 6 === 0,
    prop: pick(['none', 'spyglass', 'mug', 'logbook', 'rope', 'lantern'] as const, 6, hash(`${id}~prop`)),
    trousers: pick(['#34405a', '#3a3026', '#2e2a33', '#4a4038', '#3d4a3a'] as const, 10, hash(`${id}~legs`)),
    boots: pick(['#2e1c19', '#2e1c19', '#4a2e22', '#e9b23c', '#1d2a3a'] as const, 16, hash(`${id}~legs`)),
  }
}
