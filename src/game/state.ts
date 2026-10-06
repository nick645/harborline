// Game state transitions. Every exported action takes a state and returns a new one;
// the input is never mutated. All timers are absolute timestamps, so catching up after
// any gap is a single settle pass, never a tick loop.

import type { Boat, GameState, OfflineReport, Route, Voyage } from './types'
import { BOAT_CLASSES } from './data/boats'
import { ROUTES } from './data/routes'
import { NICKNAMES } from './data/nicknames'
import {
  CONDITION_MAX,
  OFFLINE_CAP_MS,
  OFFLINE_RATE,
  REPAIR_COST_PER_POINT,
  STARTING_BOAT_CLASS,
  STARTING_COINS,
} from './data/economy'
import { getBoatClass, roundTripMs, routeDistance, sellPrice, voyagePayout } from './economy'
import { createRng, rollConditionLoss, rollDemand, rollPick } from './rolls'

export const SAVE_VERSION = 1

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
  addBoat(state, STARTING_BOAT_CLASS)
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

/** What a voyage on this route would pay and take right now. */
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

// ---------- actions ----------

export function assignRoute(state: GameState, boatId: string, routeId: string, now: number): GameState {
  const s = structuredClone(state)
  const boat = getBoat(s, boatId)
  if (boat.state !== 'idle') throw new GameError('Boat is not idle')
  const { payout, durationMs } = quoteVoyage(s, boatId, routeId)
  s.voyages.push({
    boatId,
    routeId,
    startedAt: now,
    durationMs,
    payout,
    paid: false,
    weatherAtStart: null,
    partRollResult: null,
  })
  boat.state = 'sailing'
  boat.currentRoute = routeId
  boat.etaMs = now + durationMs / 2
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
  if (boat.state !== 'idle') throw new GameError('Only idle boats can be sold')
  if (state.player.ownedBoats.length <= 1) throw new GameError('Cannot sell your last boat')
  const s = structuredClone(state)
  s.player.coins += sellPrice(getBoatClass(boat.classId))
  s.player.ownedBoats = s.player.ownedBoats.filter((b) => b.id !== boatId)
  return s
}

/** Instant repair at the home port. Repairs as many points as the player can afford. */
export function repairBoat(state: GameState, boatId: string): GameState {
  const boat = getBoat(state, boatId)
  if (boat.state !== 'idle') throw new GameError('Only idle boats can be repaired')
  const affordable = Math.floor(Math.max(0, state.player.coins) / REPAIR_COST_PER_POINT)
  const points = Math.min(CONDITION_MAX - boat.condition, affordable)
  if (points <= 0) return state
  const s = structuredClone(state)
  s.player.coins -= points * REPAIR_COST_PER_POINT
  getBoat(s, boatId).condition += points
  return s
}

// ---------- time ----------

/**
 * Resolve every voyage event up to `now` at full rate, in time order.
 * Call this while the player is present; it marks them as seen at `now`.
 */
export function settle(state: GameState, now: number): GameState {
  const s = structuredClone(state)
  settleInPlace(s, now)
  s.player.lastSeenAt = Math.max(s.player.lastSeenAt, now)
  return s
}

/**
 * Catch up after the player was away since `lastSeenAt`.
 *
 * Voyages already under way finish at full value. After that, every boat that has a
 * route keeps re-running it at OFFLINE_RATE until the cap (8h after the player left).
 * Partial voyages at the cap are dropped, and boats come back idle at the home port.
 */
export function settleOffline(state: GameState, now: number): { state: GameState; report: OfflineReport } {
  const s = structuredClone(state)
  const leftAt = s.player.lastSeenAt
  const awayMs = Math.max(0, now - leftAt)
  const capEnd = Math.min(now, leftAt + OFFLINE_CAP_MS)
  const coinsBefore = s.player.coins

  // Voyages that finished while away still pay in full; the offline loop starts from
  // the moment each boat docked.
  const freeAt = new Map<string, number>()
  for (const v of s.voyages) freeAt.set(v.boatId, v.startedAt + v.durationMs)
  settleInPlace(s, now)
  const fullRateCoins = s.player.coins - coinsBefore

  let voyages = 0
  for (const boat of s.player.ownedBoats) {
    if (boat.state !== 'idle' || !boat.currentRoute) continue
    const route = getRoute(s, boat.currentRoute)
    const cls = getBoatClass(boat.classId)
    const distance = routeDistance(route)
    const tripMs = roundTripMs(cls, distance)
    let t = Math.max(leftAt, freeAt.get(boat.id) ?? leftAt)
    while (t + tripMs <= capEnd) {
      const demand = rollDemand(s.rng)
      s.player.coins += Math.round(voyagePayout(cls, demand, distance, boat.condition) * OFFLINE_RATE)
      boat.condition = Math.max(0, boat.condition - rollConditionLoss(s.rng))
      t += tripMs
      voyages++
    }
  }
  if (voyages > 0) {
    for (const r of s.routes) {
      r.demandCargo = rollDemand(s.rng)
      r.demandPassenger = rollDemand(s.rng)
    }
  }

  s.player.lastSeenAt = Math.max(leftAt, now)
  return {
    state: s,
    report: {
      awayMs,
      creditedMs: Math.max(0, capEnd - leftAt),
      coinsEarned: s.player.coins - coinsBefore - fullRateCoins,
      voyages,
    },
  }
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
  // Each voyage has at most two events, so this loop is bounded by 2 × active voyages.
  for (let ev = nextEvent(s, now); ev; ev = nextEvent(s, now)) {
    const v = ev.voyage
    const boat = getBoat(s, v.boatId)
    if (ev.kind === 'arrive') {
      // Cargo delivered at the far port: get paid, and the port's demand reshuffles.
      v.paid = true
      s.player.coins += v.payout
      const route = getRoute(s, v.routeId)
      route.demandCargo = rollDemand(s.rng)
      route.demandPassenger = rollDemand(s.rng)
      boat.state = 'returning'
      boat.etaMs = v.startedAt + v.durationMs
    } else {
      boat.condition = Math.max(0, boat.condition - rollConditionLoss(s.rng))
      boat.state = 'idle'
      boat.etaMs = null
      s.voyages = s.voyages.filter((x) => x !== v)
    }
  }
}
