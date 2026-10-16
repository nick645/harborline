// Every captain has their own look, picked from their id so the same person looks the same on
// the quay, on your roster, at the helm and at the tavern. Only the id goes in: a look never
// hints at hidden skill or traits.

import { hash } from './paint'

export type HatKind = 'cap' | 'souwester' | 'beanie' | 'brim' | 'bun' | 'bare'
export type HairStyle = 'cropped' | 'swept' | 'long' | 'curls' | 'braid'
export type FacialHair = 'none' | 'stubble' | 'moustache' | 'beard' | 'mutton'
export type Coat = 'peacoat' | 'oilskin' | 'knit'
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
}

/** Hat and hair shapes in figure space: a 56 × 100 standing figure, head centred at (28, 40). */
export const HAT_PATHS: Record<HatKind, string> = {
  cap: 'M12 31 h32 v3 h-32 Z M15 30 L 41 30 L 38 23 C 35 17, 21 17, 18 23 Z',
  souwester: 'M8 34 C 16 30, 40 30, 48 34 L 44 36 C 36 34, 20 34, 12 36 Z M17 31 C 18 20, 38 20, 39 31 Z',
  beanie: 'M15 32 C 15 18, 41 18, 41 32 Z M14 30 h28 v4 h-28 Z',
  brim: 'M6 32 C 14 28, 42 28, 50 32 C 42 35, 14 35, 6 32 Z M18 30 C 18 20, 38 20, 38 30 Z',
  bun: 'M16 34 C 14 22, 22 20, 28 20 C 34 20, 42 22, 40 34 C 36 28, 20 28, 16 34 Z M23 17 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z',
  bare: 'M16 34 C 14 22, 22 22, 28 22 C 34 22, 42 22, 40 34 C 36 29, 20 29, 16 34 Z',
}

const HATS: HatKind[] = ['cap', 'souwester', 'beanie', 'brim', 'bun', 'bare']
const HAT_COLORS = ['#23395b', '#e9b23c', '#b8423a', '#6e4733', '#2f5d62', '#4a3346']
const COATS = ['#2f5d62', '#7a4e5e', '#3d5a73', '#5a4a3a', '#8a3a3a', '#46566e', '#6b5a2e']
const SCARVES = ['#c2452a', '#f2b45a', '#f3e7d8', '#7fd1a8', '#e8a0b4', '#9ec0cf']
const SKIN = ['#f0c9a0', '#e0b48a', '#c98a5b', '#b5764c', '#8a5a3a', '#6b4430']
const HAIR = ['#3a2630', '#5a3a2a', '#8a5a3a', '#c9a27a', '#2e1c19', '#a8452e']
const GREY = '#b9aea6'

export function lookFor(id: string): Look {
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
    coatStyle: pick(['peacoat', 'peacoat', 'oilskin', 'knit'] as const, 4, h2),
    scarf: pick(SCARVES, 12),
    skin: pick(SKIN, 15),
    hair,
    hairStyle: hat === 'bun' ? 'braid' : pick(['cropped', 'swept', 'long', 'curls', 'braid'] as const, 8, h2),
    facialHair: pick(['none', 'none', 'none', 'stubble', 'moustache', 'beard', 'mutton'] as const, 12, h2),
    age,
    brow: 1 + ((h2 >>> 16) % 8) * 0.2,
    nose: pick([0, 1, 2] as const, 20, h2),
    extra: pick(['none', 'none', 'none', 'pipe', 'earring', 'scar'] as const, 24, h2),
  }
}
