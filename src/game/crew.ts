// Player actions for captains, managers and port upgrades, plus the views the UI reads.
// Like state.ts, every action takes a state and returns a new one.

import type { Boat, Captain, CaptainRole, GameState, Track } from './types'
import { captainTiers, SCOUT_ACCURACY, SCOUT_ACTIONS, SCOUT_BAND_WIDTH, PROMOTION_VOYAGES, type ScoutAction } from './data/captains'
import { MANAGER_ROLES, type ManagerRoleDef } from './data/managers'
import { UPGRADES, type UpgradeId } from './data/upgrades'
import { addRumour, captainMods, captainView, combineMods, makeBand, poolRefreshesAt, severance, verdictFor, willSail, type CaptainView } from './captains'
import { getBoatClass } from './economy'
import { hooksOf } from './abilities'
import { captainsAboard, GameError, getBoat, getCaptain, log, managerOf, topTier } from './state'
import { nextUpgradeCost, scoutLevel, upgradeLevel } from './upgrades'

// ---------- views ----------

export function recruitViews(state: GameState): CaptainView[] {
  return state.recruitPool.recruits.map(captainView)
}

export function rosterViews(state: GameState): CaptainView[] {
  return state.player.roster.map(captainView)
}

export function captainViewById(state: GameState, captainId: string | null): CaptainView | null {
  const c = captainId ? state.player.roster.find((x) => x.id === captainId) : undefined
  return c ? captainView(c) : null
}

/** Captains on the roster who could be put aboard this boat now. */
export function availableCaptains(state: GameState, boatId: string): CaptainView[] {
  const tier = getBoatClass(getBoat(state, boatId).classId).sizeTier
  return state.player.roster
    .filter((c) => c.role === 'sailing' && !c.bonded && willSail(c, tier))
    .filter((c) => !state.player.ownedBoats.some((b) => b.state !== 'idle' && (b.captainId === c.id || b.mateId === c.id)))
    .map(captainView)
}

/** Managers who could take this boat on. */
export function managersFor(state: GameState, boatId: string): CaptainView[] {
  return state.player.roster.filter((c) => c.role !== 'sailing' && !canManage(state, c.id, boatId)).map(captainView)
}

export function quayInfo(state: GameState, now: number) {
  return {
    watchesLeft: state.recruitPool.watchesLeft,
    refreshesAt: poolRefreshesAt(now),
    scoutLevel: scoutLevel(state),
  }
}

/** The boat a sailing captain is aboard, if any. */
export function boatOfCaptain(state: GameState, captainId: string): Boat | undefined {
  return state.player.ownedBoats.find((b) => b.captainId === captainId || b.mateId === captainId)
}

export function managerRole(role: CaptainRole): ManagerRoleDef | undefined {
  return MANAGER_ROLES.find((r) => r.id === role)
}

/** Desk jobs this captain could be promoted to right now. */
export function promotionOptions(state: GameState, captainId: string): ManagerRoleDef[] {
  const c = getCaptain(state, captainId)
  if (c.role !== 'sailing' || c.voyageCount < PROMOTION_VOYAGES) return []
  return MANAGER_ROLES.filter((r) => state.player.maxTierReached >= r.unlockTier)
}

/** Boats a manager runs (explicitly assigned, or by track for a fleet manager). */
export function boatsManagedBy(state: GameState, managerId: string): Boat[] {
  return state.player.ownedBoats.filter((b) => managerOf(state, b)?.id === managerId)
}

/** Why a manager can't take this boat on, or null if they can. */
export function canManage(state: GameState, managerId: string, boatId: string): string | null {
  const m = getCaptain(state, managerId)
  const role = managerRole(m.role)
  if (!role || m.role === 'fleet-manager') return 'Fleet managers run a whole track automatically'
  const boat = getBoat(state, boatId)
  const tier = getBoatClass(boat.classId).sizeTier
  if (!boat.currentRoute) return 'Send it out once by hand first, so there is a route to run'
  if (tier > role.maxBoatTier || tier >= topTier(state)) return `${role.name}s can't run your top-tier boats`
  if (role.id === 'dockhand' && tier > 2) return 'Dockhands only run tier 1–2 boats'
  const count = state.player.ownedBoats.filter((b) => b.managedBy === managerId).length
  if (count >= role.maxBoats) return `${m.name} already runs ${role.maxBoats} boat${role.maxBoats === 1 ? '' : 's'}`
  return null
}

export function upgradeQuote(state: GameState, id: UpgradeId) {
  const base = nextUpgradeCost(state, id)
  // A docked boat with the right ability talks the yard down.
  const discount = Math.max(
    0,
    ...state.player.ownedBoats.filter((b) => b.state === 'idle').map((b) => hooksOf(b).upgradeDiscount ?? 0),
  )
  return { level: upgradeLevel(state, id), cost: base === null ? null : Math.round(base * (1 - discount)), discount }
}

export { UPGRADES }

/**
 * The crew's net effect on a boat, as far as the player knows (proven traits, middle of the
 * skill range). Pay in calm water; damage and loss risk in a storm, where they matter most.
 */
export function knownCrewEffect(state: GameState, boatId: string, t: number) {
  const boat = getBoat(state, boatId)
  const track = getBoatClass(boat.classId).track
  const aboard = captainsAboard(state, boat)
  if (!aboard.length) return null
  const calm = combineMods(aboard.map((c) => captainMods(c, { track, weather: 'calm', t }, 'known')))
  const storm = combineMods(aboard.map((c) => captainMods(c, { track, weather: 'storm', t }, 'known')))
  return {
    pay: calm.payoutMult * calm.demandMult - 1,
    stormDamage: storm.damageMult - 1,
    stormLoss: storm.lossRiskMult - 1,
    speed: 1 / calm.durationMult - 1,
    fuel: calm.fuelMult - 1,
    refusesStorm: storm.refusesStorm,
  }
}

// ---------- scouting and hiring ----------

/** Spend watches learning about a recruit on the quay. */
export function scoutRecruit(state: GameState, captainId: string, action: ScoutAction): GameState {
  const cost = SCOUT_ACTIONS[action].watches
  if (state.recruitPool.watchesLeft < cost) throw new GameError('Not enough watches left today')
  const s = structuredClone(state)
  const c = s.recruitPool.recruits.find((r) => r.id === captainId)
  if (!c) throw new GameError('That captain has left the quay')
  const level = scoutLevel(s)
  if (action === 'logbook') {
    const width = SCOUT_BAND_WIDTH[level]
    if (c.skillBand[1] - c.skillBand[0] <= width) throw new GameError('Their logbook has nothing more to tell you')
    c.skillBand = makeBand(s.rng, c.trueSkill, width)
  } else {
    if (action === 'run') {
      if (c.verdict) throw new GameError('You already took them out')
      c.verdict = verdictFor(c)
    }
    if (!addRumour(s.rng, c, SCOUT_ACCURACY[level]) && action === 'ask') throw new GameError('Nobody has anything more to say')
  }
  c.scoutLevel = Math.max(c.scoutLevel, level)
  c.watchesSpent += cost
  s.recruitPool.watchesLeft -= cost
  return s
}

export function hireCaptain(state: GameState, captainId: string, now: number): GameState {
  const c = state.recruitPool.recruits.find((r) => r.id === captainId)
  if (!c) throw new GameError('That captain has left the quay')
  if (state.player.coins < c.fee) throw new GameError('Not enough coins')
  const s = structuredClone(state)
  const hired = s.recruitPool.recruits.find((r) => r.id === captainId)!
  s.recruitPool.recruits = s.recruitPool.recruits.filter((r) => r.id !== captainId)
  s.player.coins -= hired.fee
  s.player.roster.push(hired)
  log(s, now, 'captain', `Hired ${hired.name}`)
  return s
}

export function fireCaptain(state: GameState, captainId: string, now: number): GameState {
  const c = getCaptain(state, captainId)
  if (c.bonded) throw new GameError(`${c.name} is bonded to their ship and can't be let go`)
  const boat = boatOfCaptain(state, captainId)
  if (boat && boat.state !== 'idle') throw new GameError(`${c.name} is at sea`)
  const pay = severance(c)
  if (state.player.coins < pay) throw new GameError(`Severance is ${pay} coins`)
  const s = structuredClone(state)
  s.player.coins -= pay
  s.player.roster = s.player.roster.filter((x) => x.id !== captainId)
  for (const b of s.player.ownedBoats) {
    if (b.captainId === captainId) b.captainId = null
    if (b.mateId === captainId) b.mateId = null
    if (b.managedBy === captainId) b.managedBy = null
  }
  log(s, now, 'captain', `Let ${c.name} go`)
  return s
}

// ---------- assignments ----------

/** Put a captain in command of a docked boat. Boats that carry two take a mate as well. */
export function assignCaptain(state: GameState, captainId: string, boatId: string): GameState {
  const c = getCaptain(state, captainId)
  if (c.role !== 'sailing') throw new GameError(`${c.name} has a desk job now`)
  const boat = getBoat(state, boatId)
  if (boat.state !== 'idle') throw new GameError('Captains can only change at the dock')
  const tier = getBoatClass(boat.classId).sizeTier
  if (!willSail(c, tier)) {
    const [lo, hi] = captainTiers(c.reputation)
    throw new GameError(`${c.name} only takes tier ${lo}–${hi} boats at their reputation`)
  }
  const current = boatOfCaptain(state, captainId)
  if (current && current.state !== 'idle') throw new GameError(`${c.name} is at sea`)
  if (current?.id === boatId) return state
  const s = structuredClone(state)
  for (const b of s.player.ownedBoats) {
    if (b.captainId === captainId) b.captainId = null
    if (b.mateId === captainId) b.mateId = null
  }
  const target = getBoat(s, boatId)
  if (!target.captainId) target.captainId = captainId
  else if (hooksOf(target).carriesMate && !target.mateId) target.mateId = captainId
  else if (getCaptain(s, target.captainId).bonded) throw new GameError('Her bonded captain stays at the helm')
  else target.captainId = captainId // the old captain steps ashore
  return s
}

export function unassignCaptain(state: GameState, captainId: string): GameState {
  const c = getCaptain(state, captainId)
  if (c.bonded) throw new GameError(`${c.name} never leaves their ship`)
  const boat = boatOfCaptain(state, captainId)
  if (!boat) return state
  if (boat.state !== 'idle') throw new GameError(`${c.name} is at sea`)
  const s = structuredClone(state)
  const b = getBoat(s, boat.id)
  if (b.captainId === captainId) b.captainId = null
  if (b.mateId === captainId) b.mateId = null
  return s
}

// ---------- delegation ----------

/** Give a veteran captain a desk job. They stop sailing and start running boats. */
export function promoteCaptain(state: GameState, captainId: string, role: Exclude<CaptainRole, 'sailing'>, now: number, track?: Track): GameState {
  if (!promotionOptions(state, captainId).some((r) => r.id === role)) throw new GameError('Not available yet')
  if (role === 'fleet-manager') {
    if (!track) throw new GameError('Choose a track to manage')
    if (state.player.roster.some((c) => c.role === 'fleet-manager' && c.managesTrack === track)) {
      throw new GameError(`The ${track} track already has a fleet manager`)
    }
  }
  const boat = boatOfCaptain(state, captainId)
  if (boat && boat.state !== 'idle') throw new GameError('Wait until they are back in port')
  const s = structuredClone(state)
  const c = getCaptain(s, captainId)
  c.role = role
  c.managesTrack = role === 'fleet-manager' ? track! : null
  for (const b of s.player.ownedBoats) {
    if (b.captainId === captainId) b.captainId = null
    if (b.mateId === captainId) b.mateId = null
  }
  log(s, now, 'captain', `${c.name} is now ${managerRole(role)!.name}`)
  return s
}

/** Hand a boat to a manager, or (managerId null) take it back. */
export function setManaged(state: GameState, boatId: string, managerId: string | null): GameState {
  if (managerId) {
    const why = canManage(state, managerId, boatId)
    if (why) throw new GameError(why)
  }
  const s = structuredClone(state)
  getBoat(s, boatId).managedBy = managerId
  return s
}

// ---------- port ----------

export function buyUpgrade(state: GameState, id: UpgradeId, now: number): GameState {
  const { cost, level } = upgradeQuote(state, id)
  if (cost === null) throw new GameError('Already fully built')
  if (state.player.coins < cost) throw new GameError('Not enough coins')
  const s = structuredClone(state)
  s.player.coins -= cost
  s.player.portUpgrades[id] = level + 1
  s.player.scoutingLevel = scoutLevel(s)
  log(s, now, 'info', `Built ${UPGRADES.find((u) => u.id === id)!.name} level ${level + 1}`)
  return s
}

/** For tests and tools: a captain by id from the roster or the quay. Not for the UI. */
export function findCaptain(state: GameState, captainId: string): Captain | undefined {
  return state.player.roster.find((c) => c.id === captainId) ?? state.recruitPool.recruits.find((c) => c.id === captainId)
}
