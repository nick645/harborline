// First-pass economy values from the build spec. All of these are meant to be tuned.

export const STARTING_COINS = 500
export const STARTING_BOAT_CLASSES = ['dinghy-hauler', 'water-taxi']

/** payout = capacity × demand × distance × PAYOUT_FACTOR − fuelPerLeg × 2 */
export const PAYOUT_FACTOR = 0.8

export const DEMAND_MIN = 0.5
export const DEMAND_MAX = 1.5

export const SELL_RATE = 0.5

export const CONDITION_MAX = 100
/** Worn hulls wear faster: the first band the condition is below applies. Weather sets the base. */
export const WEAR_MULTIPLIERS = [
  { below: 25, mult: 2 },
  { below: 50, mult: 1.5 },
]
/** Each trip's weather damage rolls between these fractions of the weather's average cost. */
export const WEATHER_DAMAGE_SPREAD = [0.5, 1.5] as const
/** Below this condition, payout is multiplied by LOW_CONDITION_PAYOUT_MULT. */
export const LOW_CONDITION_THRESHOLD = 50
export const LOW_CONDITION_PAYOUT_MULT = 0.8
export const REPAIR_COST_PER_POINT = 2

/** A boat at 0 condition sinks. Raising it costs this share of its price, at least the minimum. */
export const SALVAGE_RATE = 0.25
export const SALVAGE_MIN = 100
export const SALVAGE_CONDITION = 10

// ---------- part drops (one roll per completed trip; checked rarest first) ----------

export const STANDARD_PART_CHANCE = 0.25
/** Rare parts drop in rough or stormy water, or on tier-4+ boats. */
export const RARE_PART_CHANCE = 0.08
export const RARE_PART_MIN_BOAT_TIER = 4
/** Legendary chance comes from the weather table: rough and storm only. */
export const LEGENDARY_PART_CHANCE = { calm: 0, choppy: 0, rough: 0.005, storm: 0.02 } as const
/** Mythic set pieces drop on storm runs only, at the same odds for every player. */
export const MYTHIC_PART_CHANCE_STORM = 0.0005
/** A legendary drop picks an unfinished set; each piece already held adds this much weight. */
export const LEGENDARY_SET_WEIGHT_PER_PIECE = 2

/** Coins for scrapping one standard fitting. */
export const STANDARD_SCRAP_VALUE = 10
/** Spare copies of a rare-or-better part, of one rarity and slot, melt into one re-roll. */
export const MELT_COST = 3

export const LOG_LIMIT = 30
