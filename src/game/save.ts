// Save format (de)serialization. Storage itself lives in the UI layer.

import type { GameState } from './types'
import { SAVE_VERSION } from './state'

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

/** Returns null when the save is missing, corrupt, or from an incompatible version. */
export function deserialize(raw: string | null): GameState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as GameState
    if (parsed?.version !== SAVE_VERSION) return null
    if (!parsed.player || !Array.isArray(parsed.player.ownedBoats) || !parsed.rng) return null
    return parsed
  } catch {
    return null
  }
}
