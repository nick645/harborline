// Game state transitions. Every exported action takes a state and returns a new one;
// the input is never mutated. All timers are absolute timestamps, so catching up after
// any gap is a single settle pass, never a tick loop.

import type { AwayReport, Boat, GameState, Route, Voyage } from './types'
import { BOAT_CLASSES } from './data/boats'
import { ROUTES } from './data/routes'
import { NICKNAMES } from './data/nicknames'
import {
  CONDITION_MAX,
  REPAIR_COST_PER_POINT,
  SALVAGE_CONDITION,
  STARTING_BOAT_CLASSES,
  STARTING_COINS,
} from './data/economy'
import { getBoatClass, roundTripMs, routeDistance, salvageCost, sellPrice, voyagePayout } from './economy'
import { createRng, rollConditionLoss, rollDemand, rollPick } from './rolls'

export const SAVE_VERSION = 3

export class GameError extends Error {}

export function newGame(seed: number, now: number): GameState {
  const rng = createRng(seed)
  const routes: Route[] = ROUTES.map((r) => ({
    ...r,
    demandCargo: rollDemand(rng),
    demandPassenger: rollDemand(rng),
  }))
  const state: GameState = {
    version: SAVE_VERSION,
    player: {
      coins: STARTING_COINS,
      scoutingLevel: 1,
      ownedBoats: [],
      partInventory: [],
      roster: [],
      portUpgrades: {},
      lastSeenAt: now,
    },
    routes,
    voyages: [],
    rng,
    nextBoatSeq: 1,
  }
  for (const classId of STARTING_BOAT_CLASSES) addBoat(state, classId)
  return state
}

// ---------- queries ----------

export function getBoat(state: GameState, boatId: string): Boat {
  const b = state.player.ownedBoats.find((x) => x.id === boatId)
  if (!b) throw new GameError(`No boat ${boatId}`)
  return b
}

export function getRoute(state: GameState, routeId: string): Route {
  const r = state.routes.find((x) => x.id === routeId)
  if (!r) throw new GameError(`No route ${routeId}`)
  return r
}

export function getVoyage(state: GameState, boatId: string): Voyage | undefined {
  return state.voyages.find((v) => v.boatId === boatId)
}

/** What one trip on this route would pay and take right now. Later trips in a run re-quote at departure. */
export function quoteVoyage(state: GameState, boatId: string, routeId: string) {
  const boat = getBoat(state, boatId)
  const route = getRoute(state, routeId)
  const cls = getBoatClass(boat.classId)
  const distance = routeDistance(route)
  const demand = cls.track === 'cargo' ? route.demandCargo : route.demandPassenger
  const payout = voyagePayout(cls, demand, distance, boat.condition)
  const durationMs = roundTripMs(cls, distance)
  return { payout, durationMs, distance, demand, perMinute: (payout / durationMs) * 60_000 }
}

export function shopClasses() {
  return BOAT_CLASSES.filter((c) => c.price > 0)
}

/** What raising a sunk boat costs. If nothing else is afloat it never costs more than the
 * player has, so a fleet can't end up permanently stuck on the seabed. */
export function salvageQuote(state: GameState, boatId: string): number {
  const fee = salvageCost(getBoatClass(getBoat(state, boatId).classId))
  const anyAfloat = state.player.ownedBoats.some((b) => b.state !== 'sunk')
  return anyAfloat ? fee : Math.min(fee, Math.max(0, state.player.coins))
}

// ---------- actions ----------

/** Send an idle boat on `trips` back-to-back round trips, up to one tank of fuel. */
export function assignRoute(state: GameState, boatId: string, routeId: string, now: number, trips = 1): GameState {
  const s = structuredClone(state)
  const boat = getBoat(s, boatId)
  if (boat.state !== 'idle') throw new GameError('Boat is not docked')
  const tank = getBoatClass(boat.classId).fuelTankTrips
  if (!Number.isInteger(trips) || trips < 1 || trips > tank) throw new GameError(`Trips must be 1–${tank}`)
  getRoute(s, routeId)
  startTrip(s, boat, routeId, now, 1, trips)
  return s
}

/** Let the current trip finish, then bring the boat home instead of running the rest. */
export function recallBoat(state: GameState, boatId: string): GameState {
  const s = structuredClone(state)
  const v = getVoyage(s, boatId)
  if (!v) throw new GameError('Boat is not at sea')
  v.tripsTotal = v.tripIndex
  return s
}

export function buyBoat(state: GameState, classId: string): GameState {
  const cls = getBoatClass(classId)
  if (cls.price <= 0) throw new GameError('Not for sale')
  if (state.player.coins < cls.price) throw new GameError('Not enough coins')
  const s = structuredClone(state)
  s.player.coins -= cls.price
  addBoat(s, classId)
  return s
}

export function sellBoat(state: GameState, boatId: string): GameState {
  const boat = getBoat(state, boatId)
  if (boat.state !== 'idle') throw new GameError('Only docked boats can be sold')
  if (state.player.ownedBoats.length <= 1) throw new GameError('Cannot sell your last boat')
  const s = structuredClone(state)
  s.player.coins += sellPrice(getBoatClass(boat.classId))
  s.player.ownedBoats = s.player.ownedBoats.filter((b) => b.id !== boatId)
  return s
}

/** Instant repair at the home port. Repairs as many points as the player can afford. */
export function repairBoat(state: GameState, boatId: string): GameState {
  const boat = getBoat(state, boatId)
  if (boat.state !== 'idle') throw new GameError('Only docked boats can be repaired')
  const affordable = Math.floor(Math.max(0, state.player.coins) / REPAIR_COST_PER_POINT)
  const points = Math.min(CONDITION_MAX - boat.condition, affordable)
  if (points <= 0) return state
  const s = structuredClone(state)
  s.player.coins -= points * REPAIR_COST_PER_POINT
  getBoat(s, boatId).condition += points
  return s
}

/** Raise a sunk boat. It comes home at SALVAGE_CONDITION. */
export function salvageBoat(state: GameState, boatId: string): GameState {
  const boat = getBoat(state, boatId)
  if (boat.state !== 'sunk') throw new GameError('Boat is not sunk')
  const cost = salvageQuote(state, boatId)
  if (state.player.coins < cost) throw new GameError('Not enough coins to salvage')
  const s = structuredClone(state)
  s.player.coins -= cost
  const b = getBoat(s, boatId)
  b.state = 'idle'
  b.condition = SALVAGE_CONDITION
  return s
}

// ---------- time ----------

/** Resolve every voyage event up to `now`, in time order. Marks the player as seen at `now`. */
export function settle(state: GameState, now: number): GameState {
  return settleAway(state, now).state
}

/**
 * Same as settle, plus a summary of what happened since the player was last seen.
 * Away time earns exactly like present time: boats only run the trips they were sent on.
 */
export function settleAway(state: GameState, now: number): { state: GameState; report: AwayReport } {
  const s = structuredClone(state)
  const coinsBefore = s.player.coins
  const awayMs = Math.max(0, now - s.player.lastSeenAt)
  const { tripsCompleted, sunk } = settleInPlace(s, now)
  s.player.lastSeenAt = Math.max(s.player.lastSeenAt, now)
  return { state: s, report: { awayMs, coinsEarned: s.player.coins - coinsBefore, tripsCompleted, sunk } }
}

// ---------- internals (mutate the given state) ----------

function addBoat(s: GameState, classId: string): Boat {
  const boat: Boat = {
    id: `b${s.nextBoatSeq++}`,
    classId,
    nickname: rollPick(s.rng, NICKNAMES),
    condition: CONDITION_MAX,
    captainId: null,
    currentRoute: null,
    state: 'idle',
    etaMs: null,
  }
  s.player.ownedBoats.push(boat)
  return boat
}

function startTrip(s: GameState, boat: Boat, routeId: string, at: number, tripIndex: number, tripsTotal: number) {
  const { payout, durationMs } = quoteVoyage(s, boat.id, routeId)
  s.voyages.push({
    boatId: boat.id,
    routeId,
    tripIndex,
    tripsTotal,
    startedAt: at,
    durationMs,
    payout,
    paid: false,
    weatherAtStart: null,
    partRollResult: null,
  })
  boat.state = 'sailing'
  boat.currentRoute = routeId
  boat.etaMs = at + durationMs / 2
}

type VoyageEvent = { at: number; voyage: Voyage; kind: 'arrive' | 'dock' }

function nextEvent(s: GameState, now: number): VoyageEvent | null {
  let best: VoyageEvent | null = null
  for (const v of s.voyages) {
    const ev: VoyageEvent = v.paid
      ? { at: v.startedAt + v.durationMs, voyage: v, kind: 'dock' }
      : { at: v.startedAt + v.durationMs / 2, voyage: v, kind: 'arrive' }
    if (ev.at > now) continue
    if (!best || ev.at < best.at || (ev.at === best.at && ev.voyage.boatId < best.voyage.boatId)) best = ev
  }
  return best
}

function settleInPlace(s: GameState, now: number) {
  let tripsCompleted = 0
  const sunk: string[] = []
  // Each trip has at most two events and runs are capped by the fuel tank, so this is bounded.
  for (let ev = nextEvent(s, now); ev; ev = nextEvent(s, now)) {
    const v = ev.voyage
    const boat = getBoat(s, v.boatId)
    if (ev.kind === 'arrive') {
      // The trip's wear lands on the outbound leg. A hull that reaches 0 goes down with the cargo.
      boat.condition = Math.max(0, boat.condition - rollConditionLoss(s.rng, boat.condition))
      if (boat.condition === 0) {
        boat.state = 'sunk'
        boat.etaMs = null
        s.voyages = s.voyages.filter((x) => x !== v)
        sunk.push(boat.nickname)
        continue
      }
      // Cargo delivered at the far port: get paid, and the port's demand reshuffles.
      v.paid = true
      s.player.coins += v.payout
      const route = getRoute(s, v.routeId)
      route.demandCargo = rollDemand(s.rng)
      route.demandPassenger = rollDemand(s.rng)
      boat.state = 'returning'
      boat.etaMs = v.startedAt + v.durationMs
    } else {
      tripsCompleted++
      s.voyages = s.voyages.filter((x) => x !== v)
      if (v.tripIndex < v.tripsTotal) {
        startTrip(s, boat, v.routeId, ev.at, v.tripIndex + 1, v.tripsTotal)
      } else {
        boat.state = 'idle'
        boat.etaMs = null
      }
    }
  }
  return { tripsCompleted, sunk }
}
