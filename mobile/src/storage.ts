// Phone persistence: the same save format as the web build, kept in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { GameState } from '../../src/game/types'
import { deserialize, serialize } from '../../src/game/save'

const SAVE_KEY = 'harborline.save'

export async function loadGame(): Promise<GameState | null> {
  try {
    return deserialize(await AsyncStorage.getItem(SAVE_KEY))
  } catch {
    return null
  }
}

export async function saveGame(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, serialize(state))
  } catch {
    // Storage unavailable: the game still runs, it just won't persist.
  }
}

export async function clearSave(): Promise<void> {
  await AsyncStorage.removeItem(SAVE_KEY).catch(() => undefined)
}
