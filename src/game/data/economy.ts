// First-pass economy values from the build spec. All of these are meant to be tuned.

export const STARTING_COINS = 500
export const STARTING_BOAT_CLASS = 'dinghy-hauler'

/** payout = capacity × demand × distance × PAYOUT_FACTOR − fuelPerLeg × 2 */
export const PAYOUT_FACTOR = 0.8

export const DEMAND_MIN = 0.5
export const DEMAND_MAX = 1.5

export const SELL_RATE = 0.5

export const CONDITION_MAX = 100
export const CONDITION_LOSS_MIN = 1
export const CONDITION_LOSS_MAX = 3
/** Below this condition, payout is multiplied by LOW_CONDITION_PAYOUT_MULT. */
export const LOW_CONDITION_THRESHOLD = 50
export const LOW_CONDITION_PAYOUT_MULT = 0.8
export const REPAIR_COST_PER_POINT = 2

export const OFFLINE_RATE = 0.5
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
