// Game state transitions. Every exported action takes a state and returns a new one;
// the input is never mutated. All timers are absolute timestamps, so catching up after
// any gap is a single settle pass, never a tick loop.

import type { AwayReport, Boat, GameState, LogKind, PartRarity, PartType, Route, Track, Voyage } from './types'
import { BOAT_CLASSES } from './data/boats'
import { ROUTES } from './data/routes'
import { NICKNAMES } from './data/nicknames'
import { WEATHER, LOST_TRIP_CONDITION } from './data/weather'
import {
  CONDITION_MAX,
  LOG_LIMIT,
  MELT_COST,
  SALVAGE_CONDITION,
  STANDARD_SCRAP_VALUE,
  STARTING_BOAT_CLASSES,
  STARTING_COINS,
  WEAR_MULTIPLIERS,
  WEATHER_DAMAGE_SPREAD,
} from './data/economy'
import {
  canBeSold,
  getBoatClass,
  repairCostPerPoint,
  roundTripMs,
  routeDistance,
  salvageCost,
  sellPrice,
  voyagePayout,
} from './economy'
import { createRng, rollChance, rollConditionLoss, rollDemand, rollPartRarity, rollPick } from './rolls'
import { hooksOf, type TripContext } from './abilities'
import { routeWeather } from './weather'
import { countParts, dropChances, getPart, hasParts, partName, pickPart, takeParts } from './parts'

export const SAVE_VERSION = 4

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
    log: [],
  }
  for (const classId of STARTING_BOAT_CLASSES) addBoat(state, classId, now)
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

function tripContext(state: GameState, boat: Boat, routeId: string, t: number): TripContext {
  return { state, boat, cls: getBoatClass(boat.classId), routeId, weather: routeWeather(state, routeId, t), t }
}

/** Multiplier other boats' auras give a boat departing on a route. */
function auraPayoutMult(state: GameState, boat: Boat, routeId: string): number {
  let mult = 1
  for (const other of state.player.ownedBoats) {
    if (other.id === boat.id) continue
    const h = hooksOf(other)
    if (h.dockedPortPayoutMult && other.state === 'idle') mult *= h.dockedPortPayoutMult
    if (h.sameRoutePayoutMult && getVoyage(state, other.id)?.routeId === routeId) mult *= h.sameRoutePayoutMult
  }
  return mult
}

function fleetDemandMult(state: GameState): number {
  return state.player.ownedBoats
    .filter((b) => b.state !== 'sunk')
    .reduce((m, b) => m * (hooksOf(b).fleetDemandMult ?? 1), 1)
}

/**
 * What one trip on this route would pay, take and risk if the boat left at time t.
 * Later trips in a queued run re-quote at their own departure, in that moment's weather.
 */
export function quoteVoyage(state: GameState, boatId: string, routeId: string, t: number) {
  const boat = getBoat(state, boatId)
  const route = getRoute(state, routeId)
  const ctx = tripContext(state, boat, routeId, t)
  const h = hooksOf(boat)
  const weather = WEATHER[ctx.weather]
  const distance = routeDistance(route)

  const raw = ctx.cls.track === 'cargo' ? route.demandCargo : route.demandPassenger
  const demand =
    (h.demandLock ?? Math.max(raw, h.demandFloor ?? 0)) * (h.demandMult?.(ctx) ?? 1) * fleetDemandMult(state)
  const grossMult = weather.payoutMult * (h.payoutMult?.(ctx) ?? 1) * auraPayoutMult(state, boat, routeId)
  const payout = voyagePayout(ctx.cls, demand, distance, boat.condition, {
    capacityMult: h.capacityMult?.(ctx) ?? 1,
    grossMult,
  })
  const durationMs = Math.round(roundTripMs(ctx.cls, distance) * (h.durationMult?.(ctx) ?? 1))
  const lossRisk = weather.lossRisk * (h.lossRiskMult?.(ctx) ?? 1)
  // Worst roll this weather can deal on this hull: if it would reach 0, the boat could sink.
  const wear = WEAR_MULTIPLIERS.find((w) => boat.condition < w.below)?.mult ?? 1
  const rawWorst = Math.round(weather.conditionCost * WEATHER_DAMAGE_SPREAD[1] * wear)
  const worstDamage = Math.max(0, Math.round(h.damage?.(rawWorst, ctx) ?? rawWorst))
  return {
    payout,
    worstDamage,
    canSink: boat.condition - worstDamage <= 0,
    durationMs,
    distance,
    demand,
    weather: ctx.weather,
    lossRisk,
    perMinute: (payout / durationMs) * 60_000,
    blocked: h.departureBlock?.(t) ?? null,
  }
}

export function shopClasses() {
  return BOAT_CLASSES.filter((c) => (c.rarity === 'common' && c.price > 0) || c.rarity === 'rare')
}

export function craftableClasses() {
  return BOAT_CLASSES.filter((c) => c.rarity === 'legendary' || c.rarity === 'mythic')
}

/** What raising a sunk boat costs. If nothing else is afloat it never costs more than the
 * player has, so a fleet can't end up permanently stuck on the seabed. */
export function salvageQuote(state: GameState, boatId: string): number {
  const fee = salvageCost(getBoatClass(getBoat(state, boatId).classId))
  const anyAfloat = state.player.ownedBoats.some((b) => b.state !== 'sunk')
  return anyAfloat ? fee : Math.min(fee, Math.max(0, state.player.coins))
}

export function repairQuote(state: GameState, boatId: string): number {
  const boat = getBoat(state, boatId)
  return Math.ceil((CONDITION_MAX - boat.condition) * repairCostPerPoint(hooksOf(boat).repairCostMult))
}

/** Spare copies (beyond the first) of rare-or-better parts, grouped by rarity, slot and track. */
export function meltGroups(state: GameState) {
  const groups = new Map<string, { rarity: PartRarity; slot: PartType; track: Track; spares: string[] }>()
  for (const [id, n] of countParts(state.player.partInventory)) {
    const p = getPart(id)
    if (p.rarity === 'standard' || n < 2) continue
    const key = `${p.rarity}/${p.type}/${p.track}`
    const g = groups.get(key) ?? { rarity: p.rarity, slot: p.type, track: p.track, spares: [] }
    for (let i = 1; i < n; i++) g.spares.push(id)
    groups.set(key, g)
  }
  return [...groups.values()]
}

// ---------- actions ----------

/** Send a docked boat on `trips` back-to-back round trips, up to one tank of fuel. */
export function assignRoute(state: GameState, boatId: string, routeId: string, now: number, trips = 1): GameState {
  const s = structuredClone(state)
  const boat = getBoat(s, boatId)
  if (boat.state !== 'idle') throw new GameError('Boat is not docked')
  const tank = getBoatClass(boat.classId).fuelTankTrips
  if (!Number.isInteger(trips) || trips < 1 || trips > tank) throw new GameError(`Trips must be 1–${tank}`)
  getRoute(s, routeId)
  const blocked = hooksOf(boat).departureBlock?.(now)
  if (blocked) throw new GameError(blocked)
  accrueDocked(s, boat, now)
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

/** Buy a common boat with coins, or a rare boat with coins plus its rare part. */
export function buyBoat(state: GameState, classId: string, now: number): GameState {
  const cls = getBoatClass(classId)
  if (cls.rarity === 'legendary' || cls.rarity === 'mythic') throw new GameError(`${cls.name} can only be crafted`)
  if (cls.price <= 0) throw new GameError('Not for sale')
  if (state.player.coins < cls.price) throw new GameError('Not enough coins')
  if (!hasParts(state.player.partInventory, cls.requiredParts)) throw new GameError(`Needs ${cls.requiredParts.map(partName).join(', ')}`)
  const s = structuredClone(state)
  s.player.coins -= cls.price
  s.player.partInventory = takeParts(s.player.partInventory, cls.requiredParts)
  addBoat(s, classId, now)
  return s
}

/** Build a legendary or mythic boat from its full set. Instant and free: the parts are the price. */
export function craftBoat(state: GameState, classId: string, now: number): GameState {
  const cls = getBoatClass(classId)
  if (cls.rarity !== 'legendary' && cls.rarity !== 'mythic') throw new GameError(`${cls.name} is bought, not crafted`)
  if (!hasParts(state.player.partInventory, cls.requiredParts)) throw new GameError('Set incomplete')
  const s = structuredClone(state)
  s.player.partInventory = takeParts(s.player.partInventory, cls.requiredParts)
  const boat = addBoat(s, classId, now)
  log(s, now, 'craft', `Built ${cls.name}, "${boat.nickname}"`)
  return s
}

export function sellBoat(state: GameState, boatId: string, now: number): GameState {
  const boat = getBoat(state, boatId)
  const cls = getBoatClass(boat.classId)
  if (boat.state !== 'idle') throw new GameError('Only docked boats can be sold')
  if (!canBeSold(cls)) throw new GameError(`${cls.name} was crafted and can't be sold`)
  if (state.player.ownedBoats.length <= 1) throw new GameError('Cannot sell your last boat')
  const s = structuredClone(state)
  accrueDocked(s, getBoat(s, boatId), now)
  s.player.coins += sellPrice(cls)
  s.player.ownedBoats = s.player.ownedBoats.filter((b) => b.id !== boatId)
  return s
}

/** Instant repair at the home port. Repairs as many points as the player can afford. */
export function repairBoat(state: GameState, boatId: string): GameState {
  const boat = getBoat(state, boatId)
  if (boat.state !== 'idle') throw new GameError('Only docked boats can be repaired')
  const perPoint = repairCostPerPoint(hooksOf(boat).repairCostMult)
  const affordable = Math.floor(Math.max(0, state.player.coins) / perPoint)
  const points = Math.min(CONDITION_MAX - boat.condition, affordable)
  if (points <= 0) return state
  const s = structuredClone(state)
  s.player.coins -= Math.ceil(points * perPoint)
  getBoat(s, boatId).condition += points
  return s
}

/** Raise a sunk boat. It comes home at SALVAGE_CONDITION. */
export function salvageBoat(state: GameState, boatId: string, now: number): GameState {
  const boat = getBoat(state, boatId)
  if (boat.state !== 'sunk') throw new GameError('Boat is not sunk')
  const cost = salvageQuote(state, boatId)
  if (state.player.coins < cost) throw new GameError('Not enough coins to salvage')
  const s = structuredClone(state)
  s.player.coins -= cost
  const b = getBoat(s, boatId)
  b.state = 'idle'
  b.condition = SALVAGE_CONDITION
  b.dockedAt = now
  return s
}

/** Sell every standard fitting for scrap. */
export function scrapStandardParts(state: GameState): GameState {
  const standard = state.player.partInventory.filter((id) => getPart(id).rarity === 'standard')
  if (standard.length === 0) return state
  const s = structuredClone(state)
  s.player.partInventory = s.player.partInventory.filter((id) => getPart(id).rarity !== 'standard')
  s.player.coins += standard.length * STANDARD_SCRAP_VALUE
  return s
}

/** Melt MELT_COST spare copies of one rarity/slot/track group into one fresh roll of the same kind. */
export function meltSpares(state: GameState, rarity: PartRarity, slot: PartType, track: Track, now: number): GameState {
  const group = meltGroups(state).find((g) => g.rarity === rarity && g.slot === slot && g.track === track)
  if (!group || group.spares.length < MELT_COST) throw new GameError(`Needs ${MELT_COST} spare parts`)
  const s = structuredClone(state)
  s.player.partInventory = takeParts(s.player.partInventory, group.spares.slice(0, MELT_COST))
  const found = pickPart(s.rng, s, rarity, track, slot) ?? pickPart(s.rng, s, 'rare', track, slot)
  if (found) {
    s.player.partInventory.push(found)
    log(s, now, 'part', `Melted ${MELT_COST} spares into ${partName(found)}`)
  }
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
  const outcome = settleInPlace(s, now)
  for (const b of s.player.ownedBoats) accrueDocked(s, b, now)
  s.player.lastSeenAt = Math.max(s.player.lastSeenAt, now)
  return { state: s, report: { awayMs, coinsEarned: s.player.coins - coinsBefore, ...outcome } }
}

// ---------- internals (mutate the given state) ----------

function log(s: GameState, at: number, kind: LogKind, text: string) {
  s.log.unshift({ at, kind, text })
  if (s.log.length > LOG_LIMIT) s.log.length = LOG_LIMIT
}

function addBoat(s: GameState, classId: string, now: number): Boat {
  const boat: Boat = {
    id: `b${s.nextBoatSeq++}`,
    classId,
    nickname: rollPick(s.rng, NICKNAMES),
    condition: CONDITION_MAX,
    captainId: null,
    currentRoute: null,
    state: 'idle',
    etaMs: null,
    dockedAt: now,
  }
  s.player.ownedBoats.push(boat)
  return boat
}

/** Pay out docked-time earnings (abilities like the Cormorant's) up to time t. */
function accrueDocked(s: GameState, boat: Boat, t: number) {
  if (boat.state !== 'idle' || boat.dockedAt === null) return
  const share = hooksOf(boat).dockedIncomeShare
  if (!share) {
    boat.dockedAt = t
    return
  }
  const route = getRoute(s, boat.currentRoute ?? s.routes[0].id)
  const cls = getBoatClass(boat.classId)
  const distance = routeDistance(route)
  const perMs = (share * Math.max(0, voyagePayout(cls, 1, distance, boat.condition))) / roundTripMs(cls, distance)
  if (perMs <= 0) {
    boat.dockedAt = t
    return
  }
  const earned = Math.floor((t - boat.dockedAt) * perMs)
  if (earned <= 0) return
  s.player.coins += earned
  boat.dockedAt += earned / perMs
}

function startTrip(s: GameState, boat: Boat, routeId: string, at: number, tripIndex: number, tripsTotal: number) {
  const q = quoteVoyage(s, boat.id, routeId, at)
  s.voyages.push({
    boatId: boat.id,
    routeId,
    tripIndex,
    tripsTotal,
    startedAt: at,
    durationMs: q.durationMs,
    payout: q.payout,
    paid: false,
    lost: false,
    weatherAtStart: q.weather,
    partRollResult: null,
  })
  boat.state = 'sailing'
  boat.currentRoute = routeId
  boat.etaMs = at + q.durationMs / 2
  boat.dockedAt = null
}

function dockBoat(boat: Boat, at: number) {
  boat.state = 'idle'
  boat.etaMs = null
  boat.dockedAt = at
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
  const lost: string[] = []
  const parts: string[] = []
  // Each trip has at most two events and runs are capped by the fuel tank, so this is bounded.
  for (let ev = nextEvent(s, now); ev; ev = nextEvent(s, now)) {
    const v = ev.voyage
    const boat = getBoat(s, v.boatId)
    const h = hooksOf(boat)
    const ctx: TripContext = {
      state: s,
      boat,
      cls: getBoatClass(boat.classId),
      routeId: v.routeId,
      weather: v.weatherAtStart ?? 'calm',
      t: v.startedAt,
    }

    if (ev.kind === 'arrive') {
      // Outbound leg done; the voyage now waits for its 'dock' event.
      v.paid = true
      const lossRisk = WEATHER[ctx.weather].lossRisk * (h.lossRiskMult?.(ctx) ?? 1)
      if (rollChance(s.rng, lossRisk)) {
        // Lost to the weather: no pay, no parts, the run is over and the boat limps home.
        v.lost = true
        v.tripsTotal = v.tripIndex
        boat.condition = Math.min(boat.condition, LOST_TRIP_CONDITION)
        lost.push(boat.nickname)
        log(s, ev.at, 'lost', `${boat.nickname} lost her cargo in ${WEATHER[ctx.weather].name.toLowerCase()} seas`)
        if (h.instantReturnOnLoss) {
          s.voyages = s.voyages.filter((x) => x !== v)
          dockBoat(boat, ev.at)
        } else {
          boat.state = 'returning'
          boat.etaMs = v.startedAt + v.durationMs
        }
        continue
      }

      // The trip's wear lands on the outbound leg. A hull that reaches 0 goes down with the cargo.
      const raw = rollConditionLoss(s.rng, ctx.weather, boat.condition)
      boat.condition = Math.max(0, boat.condition - Math.max(0, Math.round(h.damage?.(raw, ctx) ?? raw)))
      if (boat.condition === 0) {
        boat.state = 'sunk'
        boat.etaMs = null
        s.voyages = s.voyages.filter((x) => x !== v)
        sunk.push(boat.nickname)
        log(s, ev.at, 'sunk', `${boat.nickname} sank in ${WEATHER[ctx.weather].name.toLowerCase()} seas`)
        continue
      }

      // Cargo delivered at the far port: get paid, and the port's demand reshuffles.
      s.player.coins += v.payout
      const route = getRoute(s, v.routeId)
      route.demandCargo = rollDemand(s.rng, h.demandRerollFloor)
      route.demandPassenger = rollDemand(s.rng, h.demandRerollFloor)
      boat.state = 'returning'
      boat.etaMs = v.startedAt + v.durationMs
    } else {
      s.voyages = s.voyages.filter((x) => x !== v)
      if (!v.lost) {
        tripsCompleted++
        v.partRollResult = rollTripParts(s, ctx)
        for (const id of v.partRollResult) {
          parts.push(id)
          if (getPart(id).rarity !== 'standard') log(s, ev.at, 'part', `${boat.nickname} found ${partName(id)}`)
        }
      }
      const blocked = h.departureBlock?.(ev.at)
      if (v.tripIndex < v.tripsTotal && !blocked) {
        startTrip(s, boat, v.routeId, ev.at, v.tripIndex + 1, v.tripsTotal)
      } else {
        dockBoat(boat, ev.at)
      }
    }
  }
  return { tripsCompleted, sunk, lost, parts }
}

/** Roll for parts at the end of a completed trip. Returns the ids found (already added). */
function rollTripParts(s: GameState, ctx: TripContext): string[] {
  const h = hooksOf(ctx.boat)
  const found: string[] = []
  const rolls = 1 + (h.extraPartRolls?.(ctx) ?? 0)
  for (let i = 0; i < rolls; i++) {
    const rarity = rollPartRarity(s.rng, dropChances(ctx, h))
    if (!rarity) continue
    // If every set of that rarity is already done, the find falls back to a rare part.
    const id = pickPart(s.rng, s, rarity, ctx.cls.track) ?? pickPart(s.rng, s, 'rare', ctx.cls.track)
    if (!id) continue
    const part = getPart(id)
    const extra: string[] = []
    if (part.rarity === 'rare' && rollChance(s.rng, h.rareDuplicateChance ?? 0)) extra.push(id)
    if (part.rarity === 'legendary' && h.fullSetOnLegendary) {
      const set = getBoatClass(part.setId).requiredParts
      const held = countParts([...s.player.partInventory, id])
      extra.push(...set.filter((p) => !held.has(p)))
    }
    for (const got of [id, ...extra]) {
      s.player.partInventory.push(got)
      found.push(got)
    }
  }
  return found
}
