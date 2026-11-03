// The harbourmaster's walk-through for a new harbour: buy a first boat, court a first captain,
// put them aboard, send her out, then buy the cottage on the quay. It can't be skipped. Each step
// is read from the game itself, so the guide never gets out of step with what the player has
// done; only finishing it is stored.

import { courtingOf } from './crew'
import { KEEN_YOURS } from './data/courting'
import { GameError } from './state'
import type { GameState } from './types'

export type GuideStep =
  | { id: 'buy' }
  /** Court the keen captain: what to do next with them. */
  | { id: 'court'; recruitId: string | null; next: 'drink' | 'harbour' | 'sign' | 'wait' }
  | { id: 'aboard'; captainId: string; boatId: string }
  | { id: 'send'; boatId: string }
  /** She's away: buy the cottage on the quay. */
  | { id: 'home' }
  | { id: 'farewell' }

export function guideStep(state: GameState, now: number): GuideStep | null {
  if (!state.player.guide) return null
  const boat = state.player.ownedBoats[0]
  if (!boat) return { id: 'buy' }
  const captains = state.player.roster.filter((c) => c.role === 'sailing')
  if (!captains.length) {
    const recruits = state.recruitPool.recruits
    const keen = recruits.find((c) => (c.courting?.yours ?? 0) >= KEEN_YOURS) ?? recruits[0]
    const v = keen ? courtingOf(state, keen.id, now) : null
    const next = !v ? 'wait' : v.canSign ? 'sign' : v.drinkReady && !v.known.length ? 'drink' : !v.walked ? 'harbour' : 'wait'
    return { id: 'court', recruitId: keen?.id ?? null, next }
  }
  const sailed = state.voyages.length > 0 || captains.some((c) => c.voyageCount > 0)
  if (!sailed) {
    if (!boat.captainId) return { id: 'aboard', captainId: captains[0].id, boatId: boat.id }
    return { id: 'send', boatId: boat.id }
  }
  if (state.player.homeDue) return { id: 'home' }
  return { id: 'farewell' }
}

/** The sea chart is under cloud until the first boat sails. */
export function chartHidden(state: GameState, now: number): boolean {
  const step = guideStep(state, now)?.id
  return step === 'buy' || step === 'court' || step === 'aboard' || step === 'send'
}

/** Home stays shut until the walk-through brings you to it. */
export function homeLocked(state: GameState, now: number): boolean {
  const step = guideStep(state, now)?.id
  return !!step && step !== 'home' && step !== 'farewell'
}

/** The walk-through is over: the farewell has been heard. */
export function endGuide(state: GameState): GameState {
  if (state.player.homeDue) throw new GameError('Buy your home first')
  const s = structuredClone(state)
  delete s.player.guide
  return s
}
