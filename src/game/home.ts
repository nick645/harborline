// Customizing your home harbour: its name, colours and the decorations on its quay. All
// cosmetic. Decorations unlock from things you've done.

import type { GameState } from './types'
import { DECOR, DECOR_SLOTS, HOME_BUNTING, HOME_NAME_MAX, HOME_ROOFS, HOME_SIGNS, HOME_WALLS, type DecorId, type Milestone } from './data/home'
import { getBoatClass } from './economy'
import { regionOpen } from './regions'
import { GameError } from './state'

export function decorUnlocked(state: GameState, id: DecorId): boolean {
  const m = new Set(state.player.milestones ?? [])
  switch (id) {
    case 'flowerboxes':
      return true
    case 'anchor':
      return state.player.ownedBoats.length >= 3
    case 'stormflag':
      return m.has('storm-trip')
    case 'figurehead':
      return m.has('raised-wreck')
    case 'bell':
      return regionOpen(state, 'fogbanks')
    case 'lanternarch':
      return state.player.maxTierReached >= 3
    case 'statue':
      return state.player.ownedBoats.some((b) => ['legendary', 'mythic'].includes(getBoatClass(b.classId).rarity))
  }
}

/** Record a milestone (mutates; internal). */
export function markMilestone(s: GameState, m: Milestone) {
  const list = (s.player.milestones ??= [])
  if (!list.includes(m)) list.push(m)
}

type StylePatch = { name?: string; wall?: string; roof?: string; sign?: string; bunting?: number }

export function styleHome(state: GameState, patch: StylePatch): GameState {
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (name.length > HOME_NAME_MAX) throw new GameError(`Keep it under ${HOME_NAME_MAX} letters`)
  }
  if (patch.wall && !(HOME_WALLS as readonly string[]).includes(patch.wall)) throw new GameError('Not a wall colour')
  if (patch.roof && !(HOME_ROOFS as readonly string[]).includes(patch.roof)) throw new GameError('Not a roof colour')
  if (patch.sign && !(HOME_SIGNS as readonly string[]).includes(patch.sign)) throw new GameError('Not a sign colour')
  if (patch.bunting !== undefined && !(patch.bunting >= 0 && patch.bunting < HOME_BUNTING.length)) throw new GameError('Not a bunting')
  const s = structuredClone(state)
  const style = (s.player.homeStyle ??= {})
  if (patch.name !== undefined) style.name = patch.name.trim() || undefined
  if (patch.wall) style.wall = patch.wall
  if (patch.roof) style.roof = patch.roof
  if (patch.sign) style.sign = patch.sign
  if (patch.bunting !== undefined) style.bunting = patch.bunting
  return s
}

/** Put a decoration in a spot on the quay (null clears it). One of each. */
export function placeDecor(state: GameState, slot: number, id: DecorId | null): GameState {
  if (!Number.isInteger(slot) || slot < 0 || slot >= DECOR_SLOTS) throw new GameError('No such spot')
  if (id && !DECOR.some((d) => d.id === id)) throw new GameError('No such decoration')
  if (id && !decorUnlocked(state, id)) throw new GameError('Not earned yet')
  const s = structuredClone(state)
  const style = (s.player.homeStyle ??= {})
  const decor = (style.decor ??= Array.from({ length: DECOR_SLOTS }, () => null)).map((d) => (d === id ? null : d))
  decor[slot] = id
  style.decor = decor
  return s
}
