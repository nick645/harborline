// Browser persistence and the game clock. The only place that touches localStorage.

import type { GameState } from './game/types'
import { deserialize, serialize } from './game/save'

const SAVE_KEY = 'harborline.save'
const OFFSET_KEY = 'harborline.debugClockOffset'

export const DEBUG = new URLSearchParams(location.search).has('debug')

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode etc.): the game still runs, it just won't persist.
  }
}

export function loadGame(): GameState | null {
  return deserialize(read(SAVE_KEY))
}

export function saveGame(state: GameState) {
  write(SAVE_KEY, serialize(state))
}

export function clearSave() {
  write(SAVE_KEY, null)
  write(OFFSET_KEY, null)
}

// Debug-only clock offset, so "away for 8 hours" can be tested without waiting.
let clockOffset = DEBUG ? Number(read(OFFSET_KEY)) || 0 : 0

export function clock(): number {
  return Date.now() + clockOffset
}

export function advanceClock(ms: number) {
  clockOffset += ms
  write(OFFSET_KEY, String(clockOffset))
}
