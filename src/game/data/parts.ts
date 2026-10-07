import type { Part, PartRarity, PartType, Track } from '../types'
import { BOAT_CLASSES } from './boats'

export const PART_TYPES: PartType[] = ['hull', 'engine', 'specialty']

/** What the specialty slot is called on each track. Display only. */
export const SPECIALTY_NAME: Record<Track, string> = {
  cargo: 'Hold & cranes',
  passenger: 'Cabins & amenities',
}

/** Standard fittings: generic parts for any boat on a track. Scrapped for coins. */
const STANDARD_PARTS: Part[] = (['cargo', 'passenger'] as Track[]).flatMap((track) =>
  PART_TYPES.map((type): Part => ({ id: `std-${track}-${type}`, type, setId: `std-${track}`, rarity: 'standard', track })),
)

/** Every rare, legendary and mythic part comes from a boat recipe; a part id ends in its slot. */
const RECIPE_PARTS: Part[] = BOAT_CLASSES.flatMap((cls) =>
  cls.requiredParts.map((id) => ({
    id,
    type: id.slice(id.lastIndexOf('-') + 1) as PartType,
    setId: cls.id,
    // Only rare, legendary and mythic boats have recipes.
    rarity: cls.rarity as PartRarity,
    track: cls.track,
  })),
)

export const PARTS: Part[] = [...STANDARD_PARTS, ...RECIPE_PARTS]
