// Pure economy formulas. No state mutation, no randomness.

import type { BoatClass, Port, RouteDef } from './types'
import { BOAT_CLASSES, TIERS } from './data/boats'
import { MAP_UNITS_PER_DISTANCE, PORTS } from './data/ports'
import {
  LOW_CONDITION_PAYOUT_MULT,
  LOW_CONDITION_THRESHOLD,
  PAYOUT_FACTOR,
  REPAIR_COST_PER_POINT_MIN,
  REPAIR_COST_VALUE_SHARE,
  SELL_RATE,
  SALVAGE_MIN,
  SALVAGE_RATE,
  HAND_FEE_SHARE,
  SHORT_HANDED_DURATION,
  FULL_CREW_STORM_DAMAGE,
} from './data/economy'

const portsById = new Map(PORTS.map((p) => [p.id, p]))
const classesById = new Map(BOAT_CLASSES.map((c) => [c.id, c]))

export function getPort(id: string): Port {
  const p = portsById.get(id)
  if (!p) throw new Error(`Unknown port ${id}`)
  return p
}

export function getBoatClass(id: string): BoatClass {
  const c = classesById.get(id)
  if (!c) throw new Error(`Unknown boat class ${id}`)
  return c
}

/** Route distance in game units, rounded to one decimal. */
export function routeDistance(route: RouteDef): number {
  const a = getPort(route.portA)
  const b = getPort(route.portB)
  const d = Math.hypot(a.x - b.x, a.y - b.y) / MAP_UNITS_PER_DISTANCE
  return Math.round(d * 10) / 10
}

export function legDurationMs(boatClass: BoatClass, distance: number): number {
  return Math.round((distance / boatClass.speed) * 60_000)
}

export function roundTripMs(boatClass: BoatClass, distance: number): number {
  return legDurationMs(boatClass, distance) * 2
}

/**
 * Net payout for one round trip. Can be negative when fuel outweighs cargo.
 * `grossMult` stacks weather, abilities and auras; it applies to cargo, never to fuel.
 */
export function voyagePayout(
  boatClass: BoatClass,
  demand: number,
  distance: number,
  condition: number,
  {
    capacityMult = 1,
    grossMult = 1,
    fuelMult = 1,
  }: { capacityMult?: number; grossMult?: number; fuelMult?: number } = {},
): number {
  let gross = boatClass.capacity * capacityMult * demand * distance * PAYOUT_FACTOR * grossMult
  if (condition < LOW_CONDITION_THRESHOLD) gross *= LOW_CONDITION_PAYOUT_MULT
  return Math.round(gross - boatClass.fuelPerLeg * 2 * fuelMult)
}

/** Only boats bought with coins can be sold; crafted boats are kept (or traded, later). */
export function canBeSold(boatClass: BoatClass): boolean {
  return boatClass.rarity === 'common' || boatClass.rarity === 'rare'
}

export function sellPrice(boatClass: BoatClass): number {
  return Math.floor(boatClass.price * SELL_RATE)
}

/** Coins per condition point: 0.1% of the boat's value (2c minimum), times any ability discount. */
export function repairCostPerPoint(boatClass: BoatClass, mult = 1): number {
  return Math.max(REPAIR_COST_PER_POINT_MIN, Math.round(boatValue(boatClass) * REPAIR_COST_VALUE_SHARE)) * mult
}

/** What a boat is worth for salvage: its price (starters: 0), or for crafted boats its tier's common price. */
/** Deckhands a boat of this class needs to sail at full speed. */
export function handsNeeded(boatClass: BoatClass): number {
  return boatClass.sizeTier - 1
}

/** Coins to sign on one deckhand for a boat of this class. */
export function handFee(boatClass: BoatClass): number {
  return Math.round(TIERS[boatClass.sizeTier].price * HAND_FEE_SHARE)
}

/** Trip-time multiplier for a boat sailing with this many hands. */
export function shortHandedMult(boatClass: BoatClass, hands: number): number {
  return 1 + Math.max(0, handsNeeded(boatClass) - hands) * SHORT_HANDED_DURATION
}

/** Hull-damage multiplier from the hands aboard in this weather. */
export function crewDamageMult(boatClass: BoatClass, hands: number, weather: string): number {
  const need = handsNeeded(boatClass)
  return need > 0 && hands >= need && (weather === 'rough' || weather === 'storm') ? FULL_CREW_STORM_DAMAGE : 1
}

export function boatValue(boatClass: BoatClass): number {
  if (boatClass.rarity === 'common' || boatClass.rarity === 'rare') return boatClass.price
  return Math.max(0, ...BOAT_CLASSES.filter((c) => c.sizeTier === boatClass.sizeTier && c.rarity === 'common').map((c) => c.price))
}

export function salvageCost(boatClass: BoatClass): number {
  return Math.max(SALVAGE_MIN, Math.round(boatValue(boatClass) * SALVAGE_RATE))
}
