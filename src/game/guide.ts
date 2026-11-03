// The harbourmaster's walk-through for a new harbour: buy a first boat, court a first captain,
// put them aboard and send her out. Each step is read from the game itself, so the guide never
// gets out of step with what the player has done; only finishing it is stored.

import { courtingOf } from './crew'
import { KEEN_YOURS } from './data/courting'
import type { GameState } from './types'

export type GuideStep =
  | { id: 'buy' }
  /** Court the keen captain: what to do next with them. */
  | { id: 'court'; recruitId: string | null; next: 'drink' | 'harbour' | 'sign' | 'wait' }
  | { id: 'aboard'; captainId: string; boatId: string }
  | { id: 'send'; boatId: string }
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
  return { id: 'farewell' }
}

/** The player has heard enough (or skipped the walk-through). */
export function endGuide(state: GameState): GameState {
  const s = structuredClone(state)
  delete s.player.guide
  return s
}
