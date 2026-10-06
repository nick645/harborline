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

/** Net payout for one round trip. Can be negative when fuel outweighs cargo. */
export function voyagePayout(
  boatClass: BoatClass,
  demand: number,
  distance: number,
  condition: number,
): number {
  let gross = boatClass.capacity * demand * distance * PAYOUT_FACTOR
  if (condition < LOW_CONDITION_THRESHOLD) gross *= LOW_CONDITION_PAYOUT_MULT
  return Math.round(gross - boatClass.fuelPerLeg * 2)
}

export function sellPrice(boatClass: BoatClass): number {
  return Math.floor(boatClass.price * SELL_RATE)
}

export function repairCost(condition: number): number {
  return Math.max(0, CONDITION_MAX - condition) * REPAIR_COST_PER_POINT
}
