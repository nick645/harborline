// Something worth a look aboard a hand-run boat at sea, rolled when the trip leaves (numbers are
// Claude's picks): now and then a passenger with the makings of a captain, who'll sign on for
// nothing; now and then a crate in the hold with a part in it. Both sparkle gold on deck until
// claimed, and are gone if she docks first.

import type { PartRarity, Weather } from '../types'

/** Chance a hand-run passenger trip carries someone who'd make a captain. */
export const PASSENGER_CAPTAIN_CHANCE = 0.03
/** Chance a hand-run cargo trip carries a crate with a part in it. */
export const CARGO_PART_CHANCE = 0.04
/** Share of those passengers who are unusual: a look of their own, and a better name than the quay's. */
export const UNIQUE_PASSENGER_CHANCE = 0.3
/** Anchors above the quay's best for an unusual one (as the tavern's rare captain). */
export const UNIQUE_PASSENGER_BOOST = 2

/** What's in the crate, by the weather she sailed in: legendary from rough water, mythic only in storms. */
export const CRATE_RARITY: Record<Weather, Partial<Record<PartRarity, number>>> = {
  calm: { rare: 1 },
  choppy: { rare: 1 },
  rough: { rare: 0.8, legendary: 0.2 },
  storm: { rare: 0.7, legendary: 0.25, mythic: 0.05 },
}
