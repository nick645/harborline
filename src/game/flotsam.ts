// Fishing things out of the water as they drift past a boat at sea.

import { FLOTSAM_COIN_SHARE, FLOTSAM_COOLDOWN_MS, FLOTSAM_KEEPSAKE_CHANCE, FLOTSAM_KINDS, FLOTSAM_PART_CHANCE, type FlotsamKind } from './data/flotsam'
import { PART_TYPES } from './data/parts'
import { getKeepsake, KEEPSAKES } from './data/keepsakes'
import { getBoatClass } from './economy'
import { looksOpen } from './keepsakes'
import { partName } from './parts'
import { getPortDef } from './regions'
import { nextFloat, rollChance, rollPick } from './rolls'
import { GameError, getBoat, getRoute, getVoyage, log, quoteVoyage } from './state'
import type { GameState } from './types'

export type FlotsamFind = { kind: FlotsamKind; what: string; coins: number; part: string | null; keepsake: string | null }

/** Whether something can drift past this boat now: at sea, and none fished out lately. */
export function flotsamReady(state: GameState, boatId: string, now: number): boolean {
  const boat = state.player.ownedBoats.find((b) => b.id === boatId)
  if (!boat || (boat.state !== 'sailing' && boat.state !== 'returning')) return false
  return now - (state.player.flotsamAt?.[boatId] ?? -Infinity) >= FLOTSAM_COOLDOWN_MS
}

/** What drifts past next (the look only; the find is rolled when it's fished out). */
export function flotsamKind(state: GameState, boatId: string): FlotsamKind {
  const n = (state.player.flotsamAt?.[boatId] ?? 0) / 1000
  return FLOTSAM_KINDS[Math.abs(Math.floor(n + boatId.length)) % FLOTSAM_KINDS.length].id
}

/** Fish out what's drifting past: a few coins, sometimes a fitting, rarely a keepsake. */
export function collectFlotsam(state: GameState, boatId: string, now: number): { state: GameState; find: FlotsamFind } {
  if (!flotsamReady(state, boatId, now)) throw new GameError('Nothing in the water just now')
  const s = structuredClone(state)
  const boat = getBoat(s, boatId)
  const v = getVoyage(s, boatId)!
  const weather = v.weatherAtStart ?? 'calm'
  const kind = flotsamKind(state, boatId)
  ;(s.player.flotsamAt ??= {})[boatId] = now
  const find: FlotsamFind = { kind, what: FLOTSAM_KINDS.find((k) => k.id === kind)!.name, coins: 0, part: null, keepsake: null }
  const region = getPortDef(getRoute(s, v.routeId).portB).region
  const open = looksOpen(s)
  const left = KEEPSAKES.filter((k) => k.region === region && !open.has(k.id) && !k.storm)
  if (left.length && rollChance(s.rng, FLOTSAM_KEEPSAKE_CHANCE[weather])) {
    const k = rollPick(s.rng, left)
    ;(s.player.keepsakes ??= []).push(k.id)
    find.keepsake = k.id
    log(s, now, 'part', `${boat.nickname} fished out ${find.what}: ${getKeepsake(k.id)!.name}, something new for home`)
  } else if (rollChance(s.rng, FLOTSAM_PART_CHANCE[weather])) {
    const part = `std-${getBoatClass(boat.classId).track}-${rollPick(s.rng, PART_TYPES)}`
    s.player.partInventory.push(part)
    find.part = part
    log(s, now, 'info', `${boat.nickname} fished out ${find.what}: ${partName(part)}`)
  } else {
    const pays = Math.max(10, quoteVoyage(state, boatId, v.routeId, v.startedAt).payout)
    const share = FLOTSAM_COIN_SHARE[0] + nextFloat(s.rng) * (FLOTSAM_COIN_SHARE[1] - FLOTSAM_COIN_SHARE[0])
    find.coins = Math.max(2, Math.round(pays * share))
    s.player.coins += find.coins
    log(s, now, 'info', `${boat.nickname} fished out ${find.what}: ${find.coins}c`)
  }
  return { state: s, find }
}
