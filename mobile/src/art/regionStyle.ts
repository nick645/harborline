// How each region looks and dresses: colours for the map and port scenes, and the clothes its
// people favour. Bay people keep the look they've always had.

import type { RegionId } from '../../../src/game/data/ports'
import type { Coat, HatKind } from './looks'

export interface RegionStyle {
  /** Land on the map and hills behind a port. */
  land: string
  /** House walls and roofs to pick from. */
  walls: string[]
  roofs: string[]
  /** A tint laid over the sky and sea. */
  tint: string
  tintAmount: number
  /** Clothes: if set, people from here pick from these instead of the usual. */
  hats?: HatKind[]
  coats?: string[]
  coatStyles?: Coat[]
  scarves?: string[]
}

export const REGION_STYLE: Record<RegionId, RegionStyle> = {
  bay: {
    land: '#7a6a4e',
    walls: ['#6e4733', '#8a5a3a', '#efe3d2', '#a8452e'],
    roofs: ['#4a2e22', '#3a2420', '#5a3424'],
    tint: '#000000',
    tintAmount: 0,
  },
  fogbanks: {
    land: '#5b6470',
    walls: ['#8f9aa8', '#a8b0b8', '#6b7480', '#c9c4bc'],
    roofs: ['#3f4650', '#2e333a', '#4a5260'],
    tint: '#a8b4c0',
    tintAmount: 0.28,
    hats: ['souwester', 'beanie', 'souwester', 'cap'],
    coats: ['#4a5a66', '#5b6470', '#3f4a52', '#6b7480'],
    coatStyles: ['oilskin', 'raincoat', 'oilskin', 'knit'],
    scarves: ['#9ec0cf', '#c9c4bc', '#7a8a96', '#e9b23c'],
  },
  sunward: {
    land: '#e8cf9a',
    walls: ['#f2a7a0', '#7fd1c8', '#f6e08a', '#f3efe6', '#e89a6a'],
    roofs: ['#c2452a', '#2f8a8a', '#e9772f'],
    tint: '#ffd27a',
    tintAmount: 0.12,
    hats: ['brim', 'brim', 'bare', 'bun'],
    coats: ['#e9b23c', '#2f8a8a', '#e8a0b4', '#f3efe6', '#e9772f'],
    coatStyles: ['stripes', 'peacoat', 'stripes', 'knit'],
    scarves: ['#c2452a', '#7fd1c8', '#f6e08a', '#e8a0b4'],
  },
  ironcliffs: {
    land: '#2e333a',
    walls: ['#4a4f58', '#3a3f48', '#5a5e66', '#6e4733'],
    roofs: ['#1d2128', '#2a2e36', '#e8eef2'],
    tint: '#cfe0f0',
    tintAmount: 0.18,
    hats: ['beanie', 'beanie', 'cap', 'souwester'],
    coats: ['#23395b', '#3a3026', '#2e2a33', '#46566e'],
    coatStyles: ['knit', 'knit', 'peacoat', 'oilskin'],
    scarves: ['#b8423a', '#f3e7d8', '#9ec0cf'],
  },
  lantern: {
    land: '#2a1e36',
    walls: ['#4a3346', '#5a3c4c', '#3b2a3f', '#6e4733'],
    roofs: ['#1d1218', '#2a1e30', '#7a1f2a'],
    tint: '#ff9a4a',
    tintAmount: 0.16,
    hats: ['cap', 'brim', 'bare', 'cap'],
    coats: ['#4a3346', '#7a4e5e', '#2a1e30', '#5a3c4c'],
    coatStyles: ['peacoat', 'peacoat', 'raincoat', 'stripes'],
    scarves: ['#f2b45a', '#ffd27a', '#e9772f', '#c2452a'],
  },
}
