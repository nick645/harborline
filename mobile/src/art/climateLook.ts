// How each climate's weather looks: what falls, what the sky sinks toward, and how much.

import type { Weather } from '../../../src/game/types'
import type { Climate } from '../../../src/game/data/ports'

export type Kind = 'rain' | 'snow' | 'dust'

export interface ClimateLook {
  kind: Kind
  /** What the scene sinks toward as the weather worsens. */
  veil: string
  /** The rain, flakes or dust. */
  fall: string
  /** How many streaks in a 358 × 360 tile, by weather. */
  count: Record<Weather, number>
  /** Lightning in a storm. */
  lightning: boolean
}

export const CLIMATE_LOOK: Record<Climate, ClimateLook> = {
  temperate: { kind: 'rain', veil: '#4a3a66', fall: '#cfc6e0', count: { calm: 0, choppy: 0, rough: 34, storm: 70 }, lightning: true },
  forest: { kind: 'rain', veil: '#3a4a48', fall: '#c6d6d0', count: { calm: 0, choppy: 14, rough: 44, storm: 80 }, lightning: true },
  tropical: { kind: 'rain', veil: '#3a3a5a', fall: '#e0e6ee', count: { calm: 0, choppy: 0, rough: 50, storm: 100 }, lightning: true },
  snow: { kind: 'snow', veil: '#7a8aa0', fall: '#ffffff', count: { calm: 6, choppy: 18, rough: 50, storm: 110 }, lightning: false },
  desert: { kind: 'dust', veil: '#b87a42', fall: '#f0c890', count: { calm: 0, choppy: 6, rough: 30, storm: 60 }, lightning: false },
}

/** How far each weather sinks a scene toward its veil. */
export const GLOOM: Record<Weather, number> = { calm: 0, choppy: 0.12, rough: 0.38, storm: 0.7 }
