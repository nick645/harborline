// Test fixtures: game states the tests start from. Not used by the game itself.

import { generateCaptain } from './captains'
import { STARTING_COINS } from './data/economy'
import { addBoat, newGame } from './state'
import type { GameState } from './types'

/**
 * A harbour already under way, as tests want it: both starter boats, one green captain aboard
 * the first, and the coins a new game starts with. No walk-through.
 */
export function harbourGame(seed: number, now: number): GameState {
  const s = newGame(seed, now)
  delete s.player.guide
  for (const id of ['dinghy-hauler', 'water-taxi']) addBoat(s, id, now)
  const first = generateCaptain(s.rng, `c${s.nextCaptainSeq++}`, [1, 1])
  s.player.roster.push(first)
  s.player.ownedBoats[0].captainId = first.id
  s.player.coins = STARTING_COINS
  return s
}
