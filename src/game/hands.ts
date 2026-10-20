// Deckhands: who's aboard which boat, what they do to a trip, and the tavern where they're
// found. Internal helpers here mutate the state they're given (callers clone first); the
// player actions live in crew.ts.

import type { Boat, Deckhand, GameState, RngState, Weather } from './types'
import { HAND_KNOWN_AFTER, HAND_RUMOUR_ACCURACY, HAND_TRAITS, TAVERN_HANDS, TAVERN_RARE_BOOST, TAVERN_RARE_CHANCE, type HandTraitId } from './data/hands'
import { FIRST_NAMES, LAST_NAMES, QUAY_REPUTATION } from './data/captains'
import { rollChance, rollPick, rollWeighted } from './rolls'
import { newRecruit, recruitSlot } from './captains'
import { newCourting } from './courting'

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

/** The hands aboard a boat. Anyone waiting at home for her is aboard once she's docked. */
export function handsOn(state: GameState, boatId: string): Deckhand[] {
  const docked = state.player.ownedBoats.find((b) => b.id === boatId)?.state === 'idle'
  return (state.player.deckhands ?? []).filter((h) => h.boatId === boatId && (!h.waiting || docked))
}

/** Berths taken on a boat: hands aboard plus any signed on and waiting at home for her. */
export function handBerths(state: GameState, boatId: string): number {
  return (state.player.deckhands ?? []).filter((h) => h.boatId === boatId).length
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
/** A hand new to a tavern, already being courted. */
export function newTavernHand(s: GameState, t: number, settled = false): Deckhand {
  const h = generateHand(s.rng, newHandId(s))
  h.courting = newCourting(s.rng, t, 'hand', settled)
  return h
}

/**
 * Keep the home tavern going: new hands for any who've signed, and each 6-hour slot a small
 * chance of a captain well above the quay's best. Mutates.
 */
export function refreshTavern(s: GameState, t: number) {
  const slot = recruitSlot(t)
  s.tavern ??= { slot: -1, hands: [], captain: null }
  const tv = s.tavern
  if (tv.slot !== slot) {
    tv.slot = slot
    if (!tv.captain && rollChance(s.rng, TAVERN_RARE_CHANCE)) {
      const rep = Math.min(5, QUAY_REPUTATION[s.player.maxTierReached][1] + TAVERN_RARE_BOOST)
      tv.captain = newRecruit(s.rng, `c${s.nextCaptainSeq++}`, [rep, rep], t, false, 'tavern')
      tv.captain.rare = true
    }
  }
  if (tv.captain) tv.captain.courting ??= newCourting(s.rng, t, tv.captain, true)
  const settled = tv.hands.length === 0
  for (const h of tv.hands) h.courting ??= newCourting(s.rng, t, 'hand', true)
  while (tv.hands.length < TAVERN_HANDS) tv.hands.push(newTavernHand(s, t, settled))
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
