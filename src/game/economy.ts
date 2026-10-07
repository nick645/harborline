// Pure economy formulas. No state mutation, no randomness.

import type { BoatClass, Port, RouteDef } from './types'
import { BOAT_CLASSES } from './data/boats'
import { MAP_UNITS_PER_DISTANCE, PORTS } from './data/ports'
import {
  LOW_CONDITION_PAYOUT_MULT,
  LOW_CONDITION_THRESHOLD,
  PAYOUT_FACTOR,
  REPAIR_COST_PER_POINT,
  SELL_RATE,
  CONDITION_MAX,
  SALVAGE_MIN,
  SALVAGE_RATE,
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
  { capacityMult = 1, grossMult = 1 }: { capacityMult?: number; grossMult?: number } = {},
): number {
  let gross = boatClass.capacity * capacityMult * demand * distance * PAYOUT_FACTOR * grossMult
  if (condition < LOW_CONDITION_THRESHOLD) gross *= LOW_CONDITION_PAYOUT_MULT
  return Math.round(gross - boatClass.fuelPerLeg * 2)
}

/** Only boats bought with coins can be sold; crafted boats are kept (or traded, later). */
export function canBeSold(boatClass: BoatClass): boolean {
  return boatClass.rarity === 'common' || boatClass.rarity === 'rare'
}

export function sellPrice(boatClass: BoatClass): number {
  return Math.floor(boatClass.price * SELL_RATE)
}

export function repairCostPerPoint(mult = 1): number {
  return REPAIR_COST_PER_POINT * mult
}

export function repairCost(condition: number, mult = 1): number {
  return Math.ceil(Math.max(0, CONDITION_MAX - condition) * repairCostPerPoint(mult))
}

/** What a boat is worth for salvage: its price (starters: 0), or for crafted boats its tier's common price. */
export function boatValue(boatClass: BoatClass): number {
  if (boatClass.rarity === 'common' || boatClass.rarity === 'rare') return boatClass.price
  return Math.max(0, ...BOAT_CLASSES.filter((c) => c.sizeTier === boatClass.sizeTier && c.rarity === 'common').map((c) => c.price))
}

export function salvageCost(boatClass: BoatClass): number {
  return Math.max(SALVAGE_MIN, Math.round(boatValue(boatClass) * SALVAGE_RATE))
}
