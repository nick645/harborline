// Play-test tools that reach into the hidden truth, kept out of the UI files (which a test checks
// never touch it). Development builds only.

import type { GameState } from '../../src/game/types'
import { SKILL_IDS } from '../../src/game/data/captains'

/** Your first captain becomes a Legend, with a Mythic still in them. */
export function devMakeLegend(g: GameState): GameState {
  const s = structuredClone(g)
  const c = s.player.roster[0]
  if (!c) return g
  for (const id of SKILL_IDS) {
    c.skills[id] = 92
    c.ceilings[id] = 99
    c.bands[id] = [86, 96]
  }
  c.trueSkill = 92
  c.ceiling = 99
  c.potential = 'mythic'
  c.potentialKnown = true
  c.rank = 'legend'
  c.rankAbilities = ['storm-rider']
  c.persona = 'lamplighter'
  c.reputation = 5
  return s
}
