// The storybook upgrade: a classic look (looks.ts lookFor, unchanged) with new parts chosen on
// top. Every choice is its own salted hash of the captain's id (`<id>~sb-<slot>`), so it's the
// same every time and independent of the classic picks: nothing about the classic look moves
// except what a new part replaces. Nothing is saved; looks are still worked out from the id.
//
// What's kept: regional dress (hats and coats come only from the region's pool, otherwise the
// classic one stays), the rare tavern captains' tricorn and greatcoat, Legend and Mythic personas
// (untouched), and titles (insignia draw over any coat; badges ride on any hat).

import type { RegionId } from '../../../../src/game/data/ports'
import { hash } from '../paint'
import { lookFor, type Look } from '../looks'
import { BEARD_PARTS, COAT_CLOTH, COAT_PARTS, COAT_REGIONS, HAIR_PARTS, HAIR_REGIONS, HAT_PARTS, HAT_REGIONS, type StorybookParts } from './registry'

/** How often each slot takes a new part (the rest keep their classic one). */
const CHANCE = { hair: 0.5, hat: 0.45, coat: 0.5, beard: 0.6, accessory: 0.4 }

/** A roll in [0, 1) and a pick, from the captain's id and a salt of their own. */
const roll = (id: string, salt: string) => hash(`${id}~sb-${salt}`) / 0x100000000
const pickFrom = <T,>(xs: readonly T[], id: string, salt: string) => xs[hash(`${id}~sb-${salt}-pick`) % xs.length]

/** A classic look upgraded with storybook parts. Personas are left exactly as they are. */
export function storybookLook(look: Look, id: string, region: RegionId = 'bay'): Look {
  if (look.persona) return look
  const parts: StorybookParts = {}
  const out: Look = { ...look }

  // Hair: anyone may take a new style. A headwrap is headwear too, so it takes the hat's place.
  const hairs = HAIR_PARTS.filter((h) => HAIR_REGIONS[h].includes(region))
  if (roll(id, 'hair') < CHANCE.hair) {
    const hair = pickFrom(hairs, id, 'hair')
    if (!(hair === 'headwrap' && look.rare)) parts.hair = hair
  }
  if (parts.hair) {
    // The classic hair drawing steps aside (cropped draws nothing at the back, no braid).
    out.hairStyle = 'cropped'
    if (parts.hair === 'headwrap' || out.hat === 'bare' || out.hat === 'bun') out.hat = 'none'
  }

  // Hat and coat: from the region's own pool, never over a rare captain's tricorn and greatcoat.
  const hats = HAT_PARTS.filter((h) => HAT_REGIONS[h].includes(region))
  if (!look.rare && parts.hair !== 'headwrap' && hats.length && roll(id, 'hat') < CHANCE.hat) parts.hat = pickFrom(hats, id, 'hat')
  if (parts.hat) out.hat = 'none'
  const coats = COAT_PARTS.filter((c) => COAT_REGIONS[c].includes(region))
  if (!look.rare && coats.length && roll(id, 'coat') < CHANCE.coat) {
    parts.coat = pickFrom(coats, id, 'coat')
    out.coat = pickFrom(COAT_CLOTH[parts.coat], id, 'cloth')
    // A plain coat underneath, so the scarf shows and no classic trim fights the new one.
    out.coatStyle = 'peacoat'
  }

  // Facial hair: only those who already wear some get a fuller version.
  if (look.facialHair !== 'none' && roll(id, 'beard') < CHANCE.beard) {
    parts.beard = pickFrom(BEARD_PARTS, id, 'beard')
    out.facialHair = 'none'
  }

  // One accessory, where it doesn't clash: no monocle over glasses, the hoop replaces a stud.
  if (roll(id, 'accessory') < CHANCE.accessory) {
    const options = (['monocle', 'gold-hoop', 'satchel'] as const).filter((a) => !(a === 'monocle' && look.glasses))
    const a = pickFrom(options, id, 'accessory')
    parts.accessory = a
    if (a === 'gold-hoop') out.extra = out.extra === 'earring' ? 'none' : out.extra
  }

  return Object.keys(parts).length ? { ...out, parts } : out
}

/** lookFor, upgraded: the same arguments, the storybook look. lookFor itself is unchanged. */
export function storybookLookFor(id: string, rare = false, region: RegionId = 'bay', persona?: string | null, title?: number): Look {
  return storybookLook(lookFor(id, rare, region, persona, title), id, region)
}
