// Game state transitions. Every exported action takes a state and returns a new one;
// the input is never mutated. All timers are absolute timestamps, so catching up after
// any gap is a single settle pass, never a tick loop.

import type { AwayReport, Boat, Captain, GameState, LogKind, PartRarity, PartType, Route, Track, Voyage } from './types'
import { BOAT_CLASSES } from './data/boats'
import { ROUTES, routesFrom } from './data/routes'
import { NICKNAMES } from './data/nicknames'
import { WEATHER, LOST_TRIP_CONDITION, WEATHER_SLOT_MS } from './data/weather'
import {
  CONDITION_MAX,
  LOG_LIMIT,
  MELT_COST,
  CAPTAIN_ADRIFT_MS,
  SALVAGE_CONDITION,
  STANDARD_SCRAP_VALUE,
  STARTING_BOAT_CLASSES,
  STARTING_COINS,
  WEAR_MULTIPLIERS,
  WEATHER_DAMAGE_SPREAD,
} from './data/economy'
import {
  AUTOMATED_PAY_SHARE,
  AUTOMATED_REPAIR_BELOW,
  AUTOMATED_WAIT_SLOTS,
  MANAGER_FIRE_BELOW_PAY,
  MANAGER_HIRE_BUDGET_MIN,
  MANAGER_HIRE_BUDGET_SHARE,
  MANAGER_JUDGE_AFTER,
} from './data/managers'
import {
  boatValue,
  canBeSold,
  crewDamageMult,
  getBoatClass,
  handFee,
  handsNeeded,
  repairCostPerPoint,
  roundTripMs,
  routeDistance,
  salvageCost,
  sellPrice,
  shortHandedMult,
  voyagePayout,
} from './economy'
import { createRng, rollChance, rollConditionLoss, rollDemand, rollPartRarity, rollPick } from './rolls'
import { hooksOf, type TripContext } from './abilities'
import { routeWeather, weatherSlot } from './weather'
import { handCount, handMods, migrateHands, recordHands, refreshTavern } from './hands'
import { chartTrip, getPortDef, homeOf, portOpen, refreshPortPools } from './regions'
import { getRegion, HOME_PRICE } from './data/ports'
import { markMilestone } from './home'
import { countParts, dropChances, getPart, hasParts, partName, pickPart, takeParts } from './parts'
import {
  captainMods,
  combineMods,
  generateBondedCaptain,
  generateCaptain,
  getTrait,
  proveTrait,
  recordVoyage,
  refreshRecruitPool,
  severance,
  willSail,
  type CaptainMods,
} from './captains'
import { fleetCap, scoutLevel, upgradeValue } from './upgrades'

export const SAVE_VERSION = 6

export class GameError extends Error {
  /** Some refusals still change the game (a captain shows who they are); this carries that state. */
  readonly state?: GameState
  constructor(message: string, state?: GameState) {
    super(message)
    this.state = state
  }
}

export function newGame(seed: number, now: number): GameState {
  const rng = createRng(seed)
  // Only routes into open waters; the rest are added as their regions are charted.
  const routes: Route[] = ROUTES.filter((r) => getPortDef(r.portB).region === 'bay').map((r) => ({
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
      deckhands: [],
      portUpgrades: {},
      maxTierReached: 1,
      lastSeenAt: now,
    },
    routes,
    voyages: [],
    rng,
    nextBoatSeq: 1,
    nextCaptainSeq: 1,
    recruitPool: { slot: -1, recruits: [], watchesLeft: 0 },
    log: [],
  }
  for (const classId of STARTING_BOAT_CLASSES) addBoat(state, classId, now)
  // One green captain to start, aboard the first boat; the second boat waits for a hire.
  const first = generateCaptain(rng, `c${state.nextCaptainSeq++}`, [1, 1])
  state.player.roster.push(first)
  state.player.ownedBoats[0].captainId = first.id
  refreshRecruitPool(state, now, scoutLevel(state))
  refreshTavern(state, now)
  refreshPortPools(state, now)
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

export function getCaptain(state: GameState, captainId: string): Captain {
  const c = state.player.roster.find((x) => x.id === captainId)
  if (!c) throw new GameError(`No captain ${captainId}`)
  return c
}

/** Captains sailing aboard a boat: its captain, plus a mate on boats that carry two. */
export function captainsAboard(state: GameState, boat: Boat): Captain[] {
  const ids = [boat.captainId, hooksOf(boat).carriesMate ? boat.mateId : null]
  return ids.flatMap((id) => state.player.roster.filter((c) => c.id === id))
}

/** Highest tier among boats owned right now. */
export function topTier(state: GameState): number {
  return Math.max(1, ...state.player.ownedBoats.map((b) => getBoatClass(b.classId).sizeTier))
}

/** The manager running this boat, if any: an assigned one, or a fleet manager covering its track. */
export function managerOf(state: GameState, boat: Boat): Captain | null {
  if (boat.managedBy) {
    const m = state.player.roster.find((c) => c.id === boat.managedBy && c.role !== 'sailing')
    if (m) return m
  }
  const tier = getBoatClass(boat.classId).sizeTier
  if (tier >= topTier(state)) return null
  return (
    state.player.roster.find(
      (c) => c.role === 'fleet-manager' && c.managesTrack === getBoatClass(boat.classId).track,
    ) ?? null
  )
}

export function isAutomated(state: GameState, boat: Boat): boolean {
  return boat.currentRoute !== null && managerOf(state, boat) !== null
}

function tripContext(state: GameState, boat: Boat, routeId: string, t: number): TripContext {
  return { state, boat, cls: getBoatClass(boat.classId), routeId, weather: routeWeather(state, routeId, t), t }
}

/** Everything the people aboard change about a trip: captains' traits, and a full crew of hands. */
function tripMods(state: GameState, boat: Boat, ctx: TripContext, view: 'known' | 'true'): CaptainMods {
  const trip = { track: ctx.cls.track, weather: ctx.weather, t: ctx.t }
  const mods = combineMods(captainsAboard(state, boat).map((c) => captainMods(c, trip, view)))
  const hands = handMods(state, boat, ctx.weather, view)
  return {
    ...mods,
    damageMult: mods.damageMult * hands.damageMult * crewDamageMult(ctx.cls, handCount(state, boat.id), ctx.weather),
    durationMult: mods.durationMult * hands.durationMult,
    fuelMult: mods.fuelMult * hands.fuelMult,
  }
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
 *
 * `view` decides what is known about the captains aboard: 'known' (the default, and the only
 * one the UI uses) counts proven traits and the middle of the skill range; 'true' is what
 * actually happens at sea.
 */
export function quoteVoyage(state: GameState, boatId: string, routeId: string, t: number, view: 'known' | 'true' = 'known') {
  const boat = getBoat(state, boatId)
  const route = getRoute(state, routeId)
  const ctx = tripContext(state, boat, routeId, t)
  const h = hooksOf(boat)
  const mods = tripMods(state, boat, ctx, view)
  const weather = WEATHER[ctx.weather]
  const distance = routeDistance(route)
  const automated = isAutomated(state, boat)

  const raw = ctx.cls.track === 'cargo' ? route.demandCargo : route.demandPassenger
  const demand =
    (h.demandLock ?? Math.max(raw, h.demandFloor ?? 0)) *
    (h.demandMult?.(ctx) ?? 1) *
    fleetDemandMult(state) *
    mods.demandMult
  const grossMult =
    weather.payoutMult *
    getRegion(getPortDef(route.portB).region).payout *
    (h.payoutMult?.(ctx) ?? 1) *
    auraPayoutMult(state, boat, routeId) *
    mods.payoutMult *
    (automated ? (h.automatedPayShare ?? AUTOMATED_PAY_SHARE) : 1)
  const payout = voyagePayout(ctx.cls, demand, distance, boat.condition, {
    capacityMult: h.capacityMult?.(ctx) ?? 1,
    grossMult,
    fuelMult: mods.fuelMult * (1 - upgradeValue(state, 'fuel-depot')),
  })
  const durationMs = Math.round(
    roundTripMs(ctx.cls, distance) * (h.durationMult?.(ctx) ?? 1) * mods.durationMult * shortHandedMult(ctx.cls, handCount(state, boat.id)),
  )
  const lossRisk = weather.lossRisk * (h.lossRiskMult?.(ctx) ?? 1) * mods.lossRiskMult
  // Worst roll this weather can deal on this hull: if it would reach 0, the boat could sink.
  const wear = WEAR_MULTIPLIERS.find((w) => boat.condition < w.below)?.mult ?? 1
  const rawWorst = Math.round(weather.conditionCost * WEATHER_DAMAGE_SPREAD[1] * wear * mods.damageMult)
  const worstDamage = Math.max(0, Math.round(h.damage?.(rawWorst, ctx) ?? rawWorst))
  const refusal = !boat.captainId
    ? 'No captain aboard'
    : mods.refusesStorm && ctx.weather === 'storm'
      ? 'The captain refuses to sail into a storm'
      : null
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
    handsMissing: Math.max(0, handsNeeded(ctx.cls) - handCount(state, boat.id)),
    blocked: h.departureBlock?.(t) ?? refusal,
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

function repairPerPoint(state: GameState, boat: Boat): number {
  const mult = (hooksOf(boat).repairCostMult ?? 1) * (1 - upgradeValue(state, 'dry-dock'))
  return repairCostPerPoint(getBoatClass(boat.classId), mult)
}

export function repairQuote(state: GameState, boatId: string): number {
  const boat = getBoat(state, boatId)
  return Math.ceil((CONDITION_MAX - boat.condition) * repairPerPoint(state, boat))
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
  const manager = managerOf(s, boat)
  if (manager && boat.currentRoute) throw new GameError(`${manager.name} is running this boat; take it back first`)
  const tank = getBoatClass(boat.classId).fuelTankTrips
  if (!Number.isInteger(trips) || trips < 1 || trips > tank) throw new GameError(`Trips must be 1–${tank}`)
  const route = getRoute(s, routeId)
  if (!portOpen(s, route.portB)) throw new GameError("Those waters aren't charted yet")
  const q = quoteVoyage(s, boatId, routeId, now, 'true')
  if (q.blocked) {
    // A refusal at the gangway is how a superstitious captain gives themselves away.
    if (revealRefusal(s, boat, now)) throw new GameError(q.blocked, s)
    throw new GameError(q.blocked)
  }
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

/** The harbour grows with the tier you reach, so a step up a tier always fits. */
function checkFleetRoom(state: GameState, newTier: number) {
  if (state.player.ownedBoats.length >= fleetCap(state, newTier)) {
    throw new GameError(`The harbour is full (${fleetCap(state)} boats). Sell one, reach a higher tier, or build Berths.`)
  }
}

/** Buy a common boat with coins, or a rare boat with coins plus its rare part. */
export function buyBoat(state: GameState, classId: string, now: number): GameState {
  const cls = getBoatClass(classId)
  if (cls.rarity === 'legendary' || cls.rarity === 'mythic') throw new GameError(`${cls.name} can only be crafted`)
  if (cls.price <= 0) throw new GameError('Not for sale')
  if (state.player.coins < cls.price) throw new GameError('Not enough coins')
  if (!hasParts(state.player.partInventory, cls.requiredParts)) throw new GameError(`Needs ${cls.requiredParts.map(partName).join(', ')}`)
  checkFleetRoom(state, cls.sizeTier)
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
  checkFleetRoom(state, cls.sizeTier)
  const s = structuredClone(state)
  s.player.partInventory = takeParts(s.player.partInventory, cls.requiredParts)
  const boat = addBoat(s, classId, now)
  log(s, now, 'craft', `Built ${cls.name}, "${boat.nickname}"`)
  if (hooksOf(boat).arrivesWithCaptain) {
    const c = generateBondedCaptain(s.rng, `c${s.nextCaptainSeq++}`)
    s.player.roster.push(c)
    boat.captainId = c.id
    log(s, now, 'captain', `${c.name} came aboard with her, bonded to the ship for good`)
  }
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
  s.player.deckhands = (s.player.deckhands ?? []).filter((h) => h.boatId !== boatId)
  return s
}

/** Instant repair at the home port. Repairs as many points as the player can afford. */
export function repairBoat(state: GameState, boatId: string): GameState {
  const boat = getBoat(state, boatId)
  if (boat.state !== 'idle') throw new GameError('Only docked boats can be repaired')
  if (repairInPlace(state, boat, true) === 0) return state
  const s = structuredClone(state)
  repairInPlace(s, getBoat(s, boatId))
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
  delete b.sunkAt
  markMilestone(s, 'raised-wreck')
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
 * Away time earns exactly like present time: hand-run boats only run the trips they were
 * sent on; boats under a manager keep working.
 */
export function settleAway(state: GameState, now: number): { state: GameState; report: AwayReport } {
  const s = structuredClone(state)
  const coinsBefore = s.player.coins
  const awayMs = Math.max(0, now - s.player.lastSeenAt)
  migrateHands(s)
  ensureRoutes(s)
  const outcome = settleInPlace(s, now)
  for (const b of s.player.ownedBoats) accrueDocked(s, b, now)
  s.player.scoutingLevel = scoutLevel(s)
  refreshRecruitPool(s, now, s.player.scoutingLevel)
  refreshTavern(s, now)
  refreshPortPools(s, now)
  s.player.lastSeenAt = Math.max(s.player.lastSeenAt, now)
  return { state: s, report: { awayMs, coinsEarned: s.player.coins - coinsBefore, ...outcome } }
}

// ---------- internals (mutate the given state) ----------

/**
 * Move the fleet's home to another town or city: buy its harbour office (free if you already own
 * it). Routes then run from there, with fresh demand; every boat must be in port first.
 * Port upgrades, captains and the tavern's regulars come along.
 */
export function moveHome(state: GameState, portId: string, now: number): GameState {
  const port = getPortDef(portId)
  if (portId === homeOf(state)) throw new GameError("That's already home")
  if (!portOpen(state, portId)) throw new GameError("Those waters aren't charted yet")
  if (port.size === 'village') throw new GameError('Only a town or city has a harbour office')
  if (state.player.ownedBoats.some((b) => b.state === 'sailing' || b.state === 'returning')) throw new GameError('Bring every boat home first')
  if (state.player.ownedBoats.some((b) => b.state === 'sunk')) throw new GameError('Raise your wrecks before you move')
  const owned = new Set(state.player.homesOwned ?? ['saltmarsh'])
  const price = owned.has(portId) ? 0 : HOME_PRICE[port.region]
  if (state.player.coins < price) throw new GameError('Not enough coins')
  const s = structuredClone(state)
  s.player.coins -= price
  owned.add(portId)
  s.player.homesOwned = [...owned]
  s.player.home = portId
  s.routes = []
  ensureRoutes(s)
  // Boats keep their last port as the route there from the new home, or forget it.
  for (const b of s.player.ownedBoats) {
    const dest = b.currentRoute ? s.routes.find((r) => r.portB === getRoute(state, b.currentRoute!).portB) : null
    b.currentRoute = dest?.id ?? null
    if (!dest) b.managedBy = null
  }
  // The new home's people become the home quay and tavern on the next refresh.
  delete s.portPools?.[portId]
  s.recruitPool.slot = -1
  if (s.tavern) s.tavern.slot = -1
  refreshRecruitPool(s, now, scoutLevel(s))
  refreshTavern(s, now)
  refreshPortPools(s, now)
  log(s, now, 'info', `Moved home to ${port.name}${price ? ` for ${price.toLocaleString('en-US')}c` : ''}`)
  return s
}

/** Every open port has a route from home, with its own demand; add any that are missing. */
function ensureRoutes(s: GameState) {
  for (const r of routesFrom(homeOf(s))) {
    if (s.routes.some((x) => x.id === r.id) || !portOpen(s, r.portB)) continue
    s.routes.push({ ...r, demandCargo: rollDemand(s.rng), demandPassenger: rollDemand(s.rng) })
  }
}

/** Add a harbour log entry. Exported for the crew actions; not for the UI. */
export function log(s: GameState, at: number, kind: LogKind, text: string) {
  s.log.unshift({ at, kind, text })
  if (s.log.length > LOG_LIMIT) s.log.length = LOG_LIMIT
}

function addBoat(s: GameState, classId: string, now: number): Boat {
  const boat: Boat = {
    id: `b${s.nextBoatSeq++}`,
    classId,
    nickname: pickNickname(s),
    condition: CONDITION_MAX,
    captainId: null,
    mateId: null,
    managedBy: null,
    currentRoute: null,
    state: 'idle',
    etaMs: null,
    dockedAt: now,
  }
  s.player.ownedBoats.push(boat)
  s.player.maxTierReached = Math.max(s.player.maxTierReached, getBoatClass(classId).sizeTier)
  return boat
}

/** A nickname nobody in the fleet has yet; once the list runs out, numbered repeats. */
function pickNickname(s: GameState): string {
  const used = new Set(s.player.ownedBoats.map((b) => b.nickname))
  const free = NICKNAMES.filter((n) => !used.has(n))
  if (free.length) return rollPick(s.rng, free)
  const base = rollPick(s.rng, NICKNAMES)
  let n = 2
  while (used.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}

/** Repair as much as affordable. With `dryRun`, only reports the points it would repair. */
function repairInPlace(s: GameState, boat: Boat, dryRun = false): number {
  const perPoint = repairPerPoint(s, boat)
  const affordable = Math.floor(Math.max(0, s.player.coins) / perPoint)
  const points = Math.min(CONDITION_MAX - boat.condition, affordable)
  if (points > 0 && !dryRun) {
    s.player.coins -= Math.ceil(points * perPoint)
    boat.condition += points
  }
  return Math.max(0, points)
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

/** If a captain aboard refused because of a trait the player didn't know, reveal it. */
function revealRefusal(s: GameState, boat: Boat, at: number): boolean {
  let news = false
  for (const c of captainsAboard(s, boat)) {
    if (c.hiddenTraits.includes('superstitious') && proveTrait(c, 'superstitious')) {
      log(s, at, 'captain', `${c.name} refused to take ${boat.nickname} into a storm: ${getTrait('superstitious').name}`)
      news = true
    }
  }
  return news
}

function startTrip(s: GameState, boat: Boat, routeId: string, at: number, tripIndex: number, tripsTotal: number) {
  const q = quoteVoyage(s, boat.id, routeId, at, 'true')
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
  boat.autoWaitUntil = undefined
}

function dockBoat(boat: Boat, at: number) {
  boat.state = 'idle'
  boat.etaMs = null
  boat.dockedAt = at
}

/** The next moment a managed boat can leave: its route in calm or choppy water. */
function nextAutoDeparture(s: GameState, boat: Boat): number {
  const from = Math.max(boat.dockedAt ?? 0, boat.autoWaitUntil ?? 0)
  for (let k = 0; k <= AUTOMATED_WAIT_SLOTS; k++) {
    const t = k === 0 ? from : (weatherSlot(from) + k) * WEATHER_SLOT_MS
    const w = routeWeather(s, boat.currentRoute!, t)
    if (w === 'calm' || w === 'choppy') return t
  }
  return (weatherSlot(from) + AUTOMATED_WAIT_SLOTS) * WEATHER_SLOT_MS
}

type SettleEvent =
  | { at: number; kind: 'arrive' | 'dock'; voyage: Voyage; boatId: string }
  | { at: number; kind: 'auto'; boatId: string }

function nextEvent(s: GameState, now: number): SettleEvent | null {
  let best: SettleEvent | null = null
  const consider = (ev: SettleEvent) => {
    if (ev.at > now) return
    if (!best || ev.at < best.at || (ev.at === best.at && ev.boatId < best.boatId)) best = ev
  }
  for (const v of s.voyages) {
    consider(
      v.paid
        ? { at: v.startedAt + v.durationMs, kind: 'dock', voyage: v, boatId: v.boatId }
        : { at: v.startedAt + v.durationMs / 2, kind: 'arrive', voyage: v, boatId: v.boatId },
    )
  }
  for (const b of s.player.ownedBoats) {
    if (b.state === 'idle' && isAutomated(s, b)) consider({ at: nextAutoDeparture(s, b), kind: 'auto', boatId: b.id })
  }
  return best
}

function settleInPlace(s: GameState, now: number) {
  let tripsCompleted = 0
  const sunk: string[] = []
  const lost: string[] = []
  const parts: string[] = []
  // Each trip has at most two events, runs are capped by the fuel tank, and managed boats
  // depart at most once per trip, so this is bounded by the voyages that fit before `now`.
  for (let ev = nextEvent(s, now); ev; ev = nextEvent(s, now)) {
    const boat = getBoat(s, ev.boatId)

    if (ev.kind === 'auto') {
      autoDepart(s, boat, ev.at)
      continue
    }

    const v = ev.voyage
    const h = hooksOf(boat)
    const ctx: TripContext = {
      state: s,
      boat,
      cls: getBoatClass(boat.classId),
      routeId: v.routeId,
      weather: v.weatherAtStart ?? 'calm',
      t: v.startedAt,
    }
    const mods = tripMods(s, boat, ctx, 'true')

    if (ev.kind === 'arrive') {
      // Outbound leg done; the voyage now waits for its 'dock' event.
      v.paid = true
      const lossRisk = WEATHER[ctx.weather].lossRisk * (h.lossRiskMult?.(ctx) ?? 1) * mods.lossRiskMult
      if (rollChance(s.rng, lossRisk)) {
        // Lost to the weather: no pay, no parts, the run is over and the boat limps home.
        v.lost = true
        v.tripsTotal = v.tripIndex
        boat.condition = Math.min(boat.condition, LOST_TRIP_CONDITION)
        lost.push(boat.nickname)
        log(s, ev.at, 'lost', `${boat.nickname} lost her cargo in ${WEATHER[ctx.weather].name.toLowerCase()} seas`)
        if (h.instantReturnOnLoss) {
          s.voyages = s.voyages.filter((x) => x !== v)
          recordCaptains(s, boat, ctx, ev.at)
          dockBoat(boat, ev.at)
        } else {
          boat.state = 'returning'
          boat.etaMs = v.startedAt + v.durationMs
        }
        continue
      }

      // The trip's wear lands on the outbound leg. A hull that reaches 0 goes down with the cargo.
      const raw = Math.round(rollConditionLoss(s.rng, ctx.weather, boat.condition) * mods.damageMult)
      boat.condition = Math.max(0, boat.condition - Math.max(0, Math.round(h.damage?.(raw, ctx) ?? raw)))
      if (boat.condition === 0) {
        boat.state = 'sunk'
        boat.etaMs = null
        boat.sunkAt = ev.at
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
        v.partRollResult = rollTripParts(s, ctx, mods)
        for (const id of v.partRollResult) {
          parts.push(id)
          if (getPart(id).rarity !== 'standard') log(s, ev.at, 'part', `${boat.nickname} found ${partName(id)}`)
        }
      }
      recordCaptains(s, boat, ctx, ev.at)
      if (!v.lost) {
        recordHands(s, boat)
        if (ctx.weather === 'storm') markMilestone(s, 'storm-trip')
        const opened = chartTrip(s, getRoute(s, v.routeId).portB, ctx.weather)
        if (opened) {
          ensureRoutes(s)
          log(s, ev.at, 'info', `${boat.nickname} finished charting ${opened}: new waters to sail`)
        }
      }

      let leaving = v.tripIndex < v.tripsTotal && !h.departureBlock?.(ev.at)
      if (leaving && quoteVoyage(s, boat.id, v.routeId, ev.at, 'true').blocked) {
        // The next trip would sail into a storm the captain won't face: the run ends here.
        revealRefusal(s, boat, ev.at)
        leaving = false
      }
      if (leaving) startTrip(s, boat, v.routeId, ev.at, v.tripIndex + 1, v.tripsTotal)
      else dockBoat(boat, ev.at)
    }
  }
  const captainsLost = loseAdrift(s, now)
  return { tripsCompleted, sunk, lost, parts, captainsLost }
}

/** When a sunk boat's captain will be lost unless she's raised first, or null if no one's at risk. */
export function adriftDeadline(state: GameState, boat: Boat): number | null {
  if (boat.state !== 'sunk' || boat.sunkAt === undefined) return null
  const atRisk = [boat.captainId, boat.mateId].some((id) => id && !getCaptain(state, id).bonded)
  return atRisk ? boat.sunkAt + CAPTAIN_ADRIFT_MS : null
}

/** Captains of boats left on the seabed too long are lost at sea. Bonded captains wait. */
function loseAdrift(s: GameState, now: number): string[] {
  const lostNames: string[] = []
  for (const boat of s.player.ownedBoats) {
    if (boat.state !== 'sunk') continue
    boat.sunkAt ??= now
    const at = boat.sunkAt + CAPTAIN_ADRIFT_MS
    if (now < at) continue
    for (const id of [boat.captainId, boat.mateId]) {
      if (!id) continue
      const c = getCaptain(s, id)
      if (c.bonded) continue
      s.player.roster = s.player.roster.filter((x) => x.id !== id)
      if (boat.captainId === id) boat.captainId = null
      if (boat.mateId === id) boat.mateId = null
      lostNames.push(c.name)
      log(s, at, 'sunk', `${c.name} was lost at sea, still waiting for ${boat.nickname} to be raised`)
    }
  }
  return lostNames
}

/** A managed boat's turn: sort out its captain, patch the hull if it's worn, then head out. */
function autoDepart(s: GameState, boat: Boat, at: number) {
  accrueDocked(s, boat, at)
  const manager = managerOf(s, boat)
  if (manager && manager.handlesCrew !== false) {
    manageCrew(s, boat, manager, at)
    // Managers sign on missing hands from the tavern when the coins are there.
    const cls = getBoatClass(boat.classId)
    refreshTavern(s, at)
    while (handCount(s, boat.id) < handsNeeded(cls) && s.player.coins >= handFee(cls) && s.tavern!.hands.length) {
      const hand = s.tavern!.hands.shift()!
      s.player.coins -= handFee(cls)
      ;(s.player.deckhands ??= []).push({ ...hand, boatId: boat.id })
      log(s, at, 'info', `${manager.name} signed on ${hand.name} for ${boat.nickname}`)
    }
  }
  if (boat.condition < AUTOMATED_REPAIR_BELOW) repairInPlace(s, boat)
  const q = quoteVoyage(s, boat.id, boat.currentRoute!, at, 'true')
  if (q.blocked || q.payout <= 0 || q.canSink) {
    // Not worth it right now; look again when the weather next turns.
    boat.autoWaitUntil = (weatherSlot(at) + 1) * WEATHER_SLOT_MS
    return
  }
  startTrip(s, boat, boat.currentRoute!, at, 1, 1)
}

/**
 * A manager looks after the captain of a boat they run. They judge only on what has been
 * proven at sea, let go only captains they hired themselves, and stay within a hiring budget.
 */
function manageCrew(s: GameState, boat: Boat, manager: Captain, at: number) {
  const cls = getBoatClass(boat.classId)
  const current = boat.captainId ? getCaptain(s, boat.captainId) : null
  if (current && current.hiredBy === manager.id && !current.bonded) {
    const known = captainMods(current, { track: cls.track, weather: 'calm', t: at }, 'known')
    const provenPoor = current.voyageCount >= MANAGER_JUDGE_AFTER && known.payoutMult * known.demandMult < MANAGER_FIRE_BELOW_PAY
    const pay = severance(current)
    if ((provenPoor || !willSail(current, cls.sizeTier)) && s.player.coins >= pay) {
      s.player.coins -= pay
      s.player.roster = s.player.roster.filter((c) => c.id !== current.id)
      boat.captainId = null
      log(s, at, 'captain', `${manager.name} let ${current.name} go from ${boat.nickname}`)
    }
  }
  if (boat.captainId) return

  // Someone ashore who'll take her, before spending anything.
  const aboard = new Set(s.player.ownedBoats.flatMap((b) => [b.captainId, b.mateId]))
  const ashore = s.player.roster.find((c) => c.role === 'sailing' && !c.bonded && !aboard.has(c.id) && willSail(c, cls.sizeTier))
  if (ashore) {
    boat.captainId = ashore.id
    log(s, at, 'captain', `${manager.name} put ${ashore.name} aboard ${boat.nickname}`)
    return
  }

  refreshRecruitPool(s, at, scoutLevel(s))
  const budget = Math.min(s.player.coins, Math.max(MANAGER_HIRE_BUDGET_MIN, boatValue(cls) * MANAGER_HIRE_BUDGET_SHARE))
  const pick = s.recruitPool.recruits
    .filter((c) => willSail(c, cls.sizeTier) && c.fee <= budget)
    .sort((a, b) => b.reputation - a.reputation || a.fee - b.fee)[0]
  if (!pick) return
  s.recruitPool.recruits = s.recruitPool.recruits.filter((c) => c.id !== pick.id)
  s.player.coins -= pick.fee
  pick.hiredBy = manager.id
  s.player.roster.push(pick)
  boat.captainId = pick.id
  log(s, at, 'captain', `${manager.name} hired ${pick.name} for ${boat.nickname}`)
}

/** Every captain aboard gains the voyage's experience; tell the log what came to light. */
function recordCaptains(s: GameState, boat: Boat, ctx: TripContext, at: number) {
  const revealEvery = hooksOf(boat).traitRevealEvery
  for (const c of captainsAboard(s, boat)) {
    const news = recordVoyage(s.rng, c, { track: ctx.cls.track, weather: ctx.weather, t: ctx.t }, revealEvery)
    for (const id of news.proven) log(s, at, 'captain', `${c.name} showed what they're made of: ${getTrait(id).name}`)
    for (const id of news.disproven) log(s, at, 'captain', `Turns out ${c.name} isn't ${getTrait(id).name.toLowerCase()} after all`)
    if (news.developmentRevealed) log(s, at, 'captain', `You're getting the measure of ${c.name}`)
    if (news.reputationChange > 0) log(s, at, 'captain', `Word is getting round about ${c.name}: reputation up to ${c.reputation} anchors`)
    if (news.reputationChange < 0) log(s, at, 'captain', `${c.name}'s reputation has slipped to ${c.reputation} anchor${c.reputation === 1 ? '' : 's'}`)
  }
}

/** Roll for parts at the end of a completed trip. Returns the ids found (already added). */
function rollTripParts(s: GameState, ctx: TripContext, mods: CaptainMods): string[] {
  const h = hooksOf(ctx.boat)
  const automated = isAutomated(s, ctx.boat)
  const chances = dropChances(ctx, h, { yardBonus: upgradeValue(s, 'salvage-yard'), automated })
  const found: string[] = []
  const rolls = 1 + (h.extraPartRolls?.(ctx) ?? 0) + mods.extraPartRolls
  for (let i = 0; i < rolls; i++) {
    const rarity = rollPartRarity(s.rng, chances)
    if (!rarity) continue
    // If every set of that rarity is already done, the find falls back to a rare part.
    const id = pickPart(s.rng, s, rarity, ctx.cls.track) ?? (automated ? null : pickPart(s.rng, s, 'rare', ctx.cls.track))
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
