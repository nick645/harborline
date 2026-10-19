// Deckhands: who's aboard which boat, what they do to a trip, and the tavern where they're
// found. Internal helpers here mutate the state they're given (callers clone first); the
// player actions live in crew.ts.

import type { Boat, Deckhand, GameState, RngState, Weather } from './types'
import { HAND_KNOWN_AFTER, HAND_RUMOUR_ACCURACY, HAND_TRAITS, TAVERN_HANDS, TAVERN_RARE_BOOST, TAVERN_RARE_CHANCE, type HandTraitId } from './data/hands'
import { FIRST_NAMES, LAST_NAMES, QUAY_REPUTATION } from './data/captains'
import { rollChance, rollPick, rollWeighted } from './rolls'
import { generateCaptain, recruitSlot } from './captains'

export function getHandTrait(id: HandTraitId) {
  return HAND_TRAITS.find((t) => t.id === id)!
}

export function generateHand(rng: RngState, id: string): Deckhand {
  const trait = rollWeighted(rng, HAND_TRAITS.map((t) => ({ item: t.id, weight: t.weight })))
  const heard = rollChance(rng, HAND_RUMOUR_ACCURACY) ? trait : rollPick(rng, HAND_TRAITS.filter((t) => t.id !== trait).map((t) => t.id))
  return { id, name: `${rollPick(rng, FIRST_NAMES)} ${rollPick(rng, LAST_NAMES)}`, trait, heard, known: false, boatId: null, voyages: 0 }
}

export function newHandId(s: GameState): string {
  s.nextHandSeq = (s.nextHandSeq ?? 1) + 1
  return `h${s.nextHandSeq - 1}`
}

/** The hands aboard a boat. */
export function handsOn(state: GameState, boatId: string): Deckhand[] {
  return (state.player.deckhands ?? []).filter((h) => h.boatId === boatId)
}

export function handCount(state: GameState, boatId: string): number {
  return handsOn(state, boatId).length
}

/** What the hands aboard do to a trip. With view 'known', only traits the player has learned count. */
export function handMods(state: GameState, boat: Boat, weather: Weather, view: 'known' | 'true') {
  let damageMult = 1
  let durationMult = 1
  let fuelMult = 1
  for (const h of handsOn(state, boat.id)) {
    if (view === 'known' && !h.known) continue
    const t = getHandTrait(h.trait)
    damageMult *= t.damage ?? 1
    if (weather === 'rough' || weather === 'storm') damageMult *= t.stormDamage ?? 1
    durationMult *= t.duration ?? 1
    fuelMult *= t.fuel ?? 1
  }
  return { damageMult, durationMult, fuelMult }
}

/** After a completed trip: the hands aboard gain a voyage, and in time show what they are. */
export function recordHands(s: GameState, boat: Boat) {
  for (const h of handsOn(s, boat.id)) {
    h.voyages++
    if (h.voyages >= HAND_KNOWN_AFTER) h.known = true
  }
}

/** New faces at the tavern each 6-hour slot: hands, and now and then a captain above the quay's best. */
export function refreshTavern(s: GameState, t: number) {
  const slot = recruitSlot(t)
  if (s.tavern?.slot === slot) return
  const hands = Array.from({ length: TAVERN_HANDS }, () => generateHand(s.rng, newHandId(s)))
  let captain = null
  if (rollChance(s.rng, TAVERN_RARE_CHANCE)) {
    const rep = Math.min(5, QUAY_REPUTATION[s.player.maxTierReached][1] + TAVERN_RARE_BOOST)
    captain = generateCaptain(s.rng, `c${s.nextCaptainSeq++}`, [rep, rep])
    captain.rare = true
  }
  s.tavern = { slot, hands, captain }
}

/** Saves from before hands were people kept a count on each boat: give those boats real hands. */
export function migrateHands(s: GameState) {
  s.player.deckhands ??= []
  for (const b of s.player.ownedBoats) {
    const n = b.hands ?? 0
    delete b.hands
    for (let i = 0; i < n; i++) s.player.deckhands.push({ ...generateHand(s.rng, newHandId(s)), boatId: b.id })
  }
}
