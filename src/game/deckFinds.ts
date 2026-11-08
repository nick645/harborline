// Claiming what's aboard a boat at sea (data/deckFinds.ts): sign the promising passenger, for
// nothing, or open the crate and keep the part.

import { QUAY_REPUTATION } from './data/captains'
import { UNIQUE_PASSENGER_BOOST, UNIQUE_PASSENGER_CHANCE } from './data/deckFinds'
import { generateCaptain } from './captains'
import { partName } from './parts'
import { rollChance } from './rolls'
import { GameError, getBoat, getVoyage, log } from './state'
import type { GameState } from './types'

export type DeckFindResult = { kind: 'captain'; captainId: string; name: string; unusual: boolean } | { kind: 'cargo'; part: string }

/** What's aboard this boat right now worth a look, if anything. */
export function deckFindOn(state: GameState, boatId: string): 'captain' | 'cargo' | null {
  return getVoyage(state, boatId)?.deckFind?.kind ?? null
}

export function claimDeckFind(state: GameState, boatId: string, now: number): { state: GameState; result: DeckFindResult } {
  const found = getVoyage(state, boatId)?.deckFind
  if (!found) throw new GameError('Nothing aboard worth a look just now')
  const s = structuredClone(state)
  const boat = getBoat(s, boatId)
  const v = getVoyage(s, boatId)!
  delete v.deckFind
  if (found.kind === 'cargo') {
    s.player.partInventory.push(found.part)
    log(s, now, 'part', `A crate aboard ${boat.nickname} held ${partName(found.part)}`)
    return { state: s, result: { kind: 'cargo', part: found.part } }
  }
  // A passenger with the makings of a captain: around the quay's level, or now and then someone
  // unusual, well above it and dressed like no one else.
  const unusual = rollChance(s.rng, UNIQUE_PASSENGER_CHANCE)
  const range = QUAY_REPUTATION[s.player.maxTierReached]
  const top = Math.min(5, range[1] + UNIQUE_PASSENGER_BOOST)
  const c = generateCaptain(s.rng, `c${s.nextCaptainSeq++}`, unusual ? [top, top] : range, unusual ? 'tavern' : 'quay')
  if (unusual) c.rare = true
  s.player.roster.push(c)
  log(s, now, 'captain', `${c.name}, a passenger aboard ${boat.nickname}, signed on with your line for nothing`)
  return { state: s, result: { kind: 'captain', captainId: c.id, name: c.name, unusual } }
}
