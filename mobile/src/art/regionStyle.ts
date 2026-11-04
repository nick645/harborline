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
  /** The tavern's name, its walls and its floor. */
  tavern: string
  tavernWall: [string, string]
  tavernFloor: [string, string]
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
    tavern: 'The Gull & Lantern',
    tavernWall: ['#4a2e22', '#6e4430'],
    tavernFloor: ['#6e4430', '#3a2420'],
  },
  // A misty pine-forest coast: dark green hills, timber and grey stone, mossy roofs.
  fogbanks: {
    land: '#34503f',
    walls: ['#6e5a44', '#8f9aa8', '#5a4a3a', '#a8b0b8', '#7a6a52'],
    roofs: ['#2e333a', '#3f4650', '#3f5236'],
    tint: '#9ab8a8',
    tintAmount: 0.24,
    tavern: 'The Foghorn',
    tavernWall: ['#3f4650', '#5b6470'],
    tavernFloor: ['#5a5452', '#2e2a2a'],
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
    tavern: 'The Painted Parrot',
    tavernWall: ['#c97a5a', '#e8b07a'],
    tavernFloor: ['#c9a26a', '#8a6a3a'],
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
    tavern: 'The Iron Kettle',
    tavernWall: ['#2a2e36', '#4a4f58'],
    tavernFloor: ['#4a3a30', '#221a16'],
    hats: ['beanie', 'beanie', 'cap', 'souwester'],
    coats: ['#23395b', '#3a3026', '#2e2a33', '#46566e'],
    coatStyles: ['knit', 'knit', 'peacoat', 'oilskin'],
    scarves: ['#b8423a', '#f3e7d8', '#9ec0cf'],
  },
  // A desert coast: sand and red rock, adobe and whitewash, lanterns in every window.
  lantern: {
    land: '#d8a868',
    walls: ['#d9a86a', '#c98a5a', '#ead2a6', '#b8704a', '#f0e2c8'],
    roofs: ['#8a4a2a', '#6e3a22', '#2f5d62'],
    tint: '#ffb070',
    tintAmount: 0.16,
    tavern: 'The Last Lamp',
    tavernWall: ['#3a1e2a', '#5a2e36'],
    tavernFloor: ['#4a2a22', '#1d1218'],
    hats: ['brim', 'bare', 'bun', 'brim'],
    coats: ['#e8d6b4', '#c2452a', '#2f5d62', '#d9a86a', '#7a4e5e'],
    coatStyles: ['robe', 'robe', 'cape', 'stripes'],
    scarves: ['#f2b45a', '#ffd27a', '#e9772f', '#c2452a'],
  },
}
