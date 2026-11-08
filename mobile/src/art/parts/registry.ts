// The storybook parts library: modular pieces a captain's look can wear, drawn by Parts.tsx in the
// same 56 × 100 figure space as Figure (head centred at (28, 39), chin at 53.5, neck at 61, waist
// at 93 full length). Pure data, no drawing, so the game's tests can check selection.
//
// Each part names its slot and where it belongs (regions, by how people there dress). Parts are
// looked up by id, never by position, so adding one later restyles nobody (see upgrade.ts).
// Visual references: assets/art-references/.

import type { RegionId } from '../../../../src/game/data/ports'

export const HAIR_PARTS = ['curls-crown', 'headwrap', 'locs', 'swept-wave'] as const
export const HAT_PARTS = ['officer-cap', 'fur-trapper', 'straw-sunhat'] as const
export const COAT_PARTS = ['naval-officer', 'fur-longcoat', 'island-jacket'] as const
export const BEARD_PARTS = ['full-beard', 'handlebar-goatee', 'whiskers'] as const
export const ACCESSORY_PARTS = ['monocle', 'gold-hoop', 'satchel'] as const

export type HairPart = (typeof HAIR_PARTS)[number]
export type HatPart = (typeof HAT_PARTS)[number]
export type CoatPart = (typeof COAT_PARTS)[number]
export type BeardPart = (typeof BEARD_PARTS)[number]
export type AccessoryPart = (typeof ACCESSORY_PARTS)[number]

/** The storybook pieces a look wears; any slot left out keeps the classic drawing. */
export interface StorybookParts {
  hair?: HairPart
  hat?: HatPart
  coat?: CoatPart
  beard?: BeardPart
  accessory?: AccessoryPart
}

const ALL: RegionId[] = ['bay', 'fogbanks', 'sunward', 'ironcliffs', 'lantern']

/** Where each hat and coat is worn: they follow regional dress, as the classic ones do. */
export const HAT_REGIONS: Record<HatPart, RegionId[]> = {
  'officer-cap': ['bay', 'fogbanks'],
  'fur-trapper': ['ironcliffs', 'fogbanks'],
  'straw-sunhat': ['sunward', 'lantern'],
}
export const COAT_REGIONS: Record<CoatPart, RegionId[]> = {
  'naval-officer': ['bay', 'fogbanks'],
  'fur-longcoat': ['ironcliffs', 'fogbanks'],
  'island-jacket': ['sunward', 'lantern'],
}
export const HAIR_REGIONS: Record<HairPart, RegionId[]> = { 'curls-crown': ALL, headwrap: ALL, locs: ALL, 'swept-wave': ALL }

/** Each coat's cloth: picked per captain from these. */
export const COAT_CLOTH: Record<CoatPart, string[]> = {
  'naval-officer': ['#1f2f4a', '#24413a', '#5a2230'],
  'fur-longcoat': ['#5a3f2e', '#3f4a3a', '#4a3346'],
  'island-jacket': ['#2f7a7a', '#c2452a', '#c98a2e'],
}

/** Which layer an accessory sits on: the head (moves with it) or the chest. */
export const ACCESSORY_LAYER: Record<AccessoryPart, 'head' | 'chest'> = { monocle: 'head', 'gold-hoop': 'head', satchel: 'chest' }

/** Coats with a waist piece of their own, so the title's rope belt doesn't sit on top of it. */
export const COAT_HAS_BELT: Record<CoatPart, boolean> = { 'naval-officer': false, 'fur-longcoat': false, 'island-jacket': true }
