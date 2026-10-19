// The home tavern as the player has made it, with the region's defaults for anything unset.

import type { GameState } from '../../src/game/types'
import { TAVERN_FLOORS, TAVERN_WALLS, type Hanging } from '../../src/game/data/home'
import { getPortDef, homeOf } from '../../src/game/regions'
import { REGION_STYLE } from './art/regionStyle'

export interface TavernLook {
  name: string
  wall: readonly [string, string]
  floor: readonly [string, string]
  cloth: string | null
  hanging: Hanging
}

export function homeTavern(game: GameState): TavernLook {
  const st = REGION_STYLE[getPortDef(homeOf(game)).region]
  const h = game.player.homeStyle ?? {}
  return {
    name: h.tavernName ?? st.tavern,
    wall: h.tavernWall !== undefined ? TAVERN_WALLS[h.tavernWall] : st.tavernWall,
    floor: h.tavernFloor !== undefined ? TAVERN_FLOORS[h.tavernFloor] : st.tavernFloor,
    cloth: h.cloth ?? null,
    hanging: (h.hanging as Hanging | undefined) ?? 'none',
  }
}
