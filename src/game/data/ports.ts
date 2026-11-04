import type { Port, Weather } from '../types'
import type { Season } from './weather'

export const HOME_PORT_ID = 'saltmarsh'

/** Map units per distance unit. */
export const MAP_UNITS_PER_DISTANCE = 40

export type RegionId = 'bay' | 'fogbanks' | 'sunward' | 'ironcliffs' | 'lantern'

/** The land and sky each region has (user-approved 2026-11-03). */
export type Climate = 'temperate' | 'forest' | 'tropical' | 'snow' | 'desert'

/** What the weather is called in each climate when it turns rough, and in a storm. */
export const WEATHER_WORDS: Record<Climate, { rough: string; storm: string }> = {
  temperate: { rough: 'a gale', storm: 'a storm' },
  forest: { rough: 'driving rain', storm: 'a tempest' },
  tropical: { rough: 'a squall', storm: 'a hurricane' },
  snow: { rough: 'a snow squall', storm: 'a blizzard' },
  desert: { rough: 'a dust squall', storm: 'a sandstorm' },
}

export interface RegionDef {
  id: RegionId
  name: string
  /** One line of flavour for the map and port screens. */
  blurb: string
  /** Chart points needed to open this region (0 for the home bay). */
  chart: number
  /** Trips to these ports chart this region. */
  chartedFrom: string[]
  climate: Climate
  /** How this region's sea leans against the season's odds (multipliers; 1 = no change). */
  weather: Record<Weather, number>
  /** A season when this climate is at its worst (or best): a further lean on top. */
  seasons?: Partial<Record<Season, Partial<Record<Weather, number>>>>
  /** Pay multiplier. Long trips waste less on (flat) fuel, so far waters pay a little less
   * per load to keep pay per minute level with the bay; they still pay far more per trip. */
  payout: number
}

// Regions open in order, each charted by sailing to the outer ports of the one before.
// Chart sizes are first-pass picks, meant to be tuned against the sim.
export const REGIONS: RegionDef[] = [
  {
    id: 'bay',
    name: 'Saltmarsh Bay',
    blurb: 'Home waters: a lighthouse, a tavern and five ports you know by heart.',
    chart: 0,
    chartedFrom: [],
    climate: 'temperate',
    weather: { calm: 1, choppy: 1, rough: 1, storm: 1 },
    payout: 1,
  },
  {
    id: 'fogbanks',
    name: 'The Fogbanks',
    blurb: 'Pine-dark isles under rain and drifting fog. Bells ring in the mist.',
    chart: 150,
    chartedFrom: ['cobble', 'farhaven'],
    climate: 'forest',
    // Rain more often than not, rarely a dead calm; autumn brings the tempests.
    weather: { calm: 0.7, choppy: 1.35, rough: 1.2, storm: 0.9 },
    seasons: { autumn: { rough: 1.2, storm: 1.4 } },
    payout: 0.94,
  },
  {
    id: 'sunward',
    name: 'Sunward Shoals',
    blurb: 'Bright shallows, painted houses and palms. Glassy most of the year, until the summer squalls.',
    chart: 700,
    chartedFrom: ['mistle', 'greyhollow', 'wickstone', 'sealrock'],
    climate: 'tropical',
    // The calmest water on the coast, except in summer, when the squalls come through.
    weather: { calm: 1.3, choppy: 1, rough: 0.8, storm: 0.6 },
    seasons: { summer: { calm: 0.8, rough: 1.5, storm: 2.4 } },
    payout: 0.92,
  },
  {
    id: 'ironcliffs',
    name: 'The Ironcliffs',
    blurb: 'Snow on black cliffs, and storms that come down off the north without warning.',
    chart: 2200,
    chartedFrom: ['coralby', 'driftwood', 'saffron'],
    climate: 'snow',
    // The worst water anywhere, and worse still in winter.
    weather: { calm: 0.7, choppy: 1, rough: 1.3, storm: 1.5 },
    seasons: { winter: { storm: 1.3 } },
    payout: 0.9,
  },
  {
    id: 'lantern',
    name: 'Lantern Reach',
    blurb: 'A desert coast at the edge of the charts: dunes, hot glassy seas, and night markets under a thousand lanterns.',
    chart: 5000,
    chartedFrom: ['holdfast', 'frostgate', 'anvil'],
    climate: 'desert',
    // Hot and glassy most days; when it turns, it turns hard: dust squalls and sandstorms.
    weather: { calm: 1.4, choppy: 0.8, rough: 0.8, storm: 1.2 },
    seasons: { summer: { calm: 1.2 }, spring: { storm: 1.3 } },
    payout: 0.885,
  },
]

/** Chart points one completed trip earns in each weather. Rough water charts faster. */
export const CHART_POINTS: Record<Weather, number> = { calm: 1, choppy: 2, rough: 4, storm: 7 }

/** Captains and hands looking for work at a port of each size (the home port has its own pools). */
export const PORT_POOLS: Record<Port['size'], { captains: number; hands: number }> = {
  village: { captains: 2, hands: 2 },
  town: { captains: 3, hands: 3 },
  city: { captains: 5, hands: 4 },
}

// The bay's positions are unchanged, so its four routes keep their distances (6, 10, 14, 20).
// Farther regions sit 25 to 67 distance units from home.
export const PORTS: Port[] = [
  { id: 'saltmarsh', name: 'Saltmarsh Quay', x: 100, y: 600, region: 'bay', size: 'town' },
  { id: 'gullwick', name: 'Gullwick', x: 300, y: 470, region: 'bay', size: 'village' },
  { id: 'brindle', name: 'Brindle Point', x: 260, y: 230, region: 'bay', size: 'town' },
  { id: 'cobble', name: 'Cobble Cove', x: 650, y: 480, region: 'bay', size: 'village' },
  { id: 'farhaven', name: 'Farhaven', x: 860, y: 330, region: 'bay', size: 'town' },

  { id: 'mistle', name: 'Mistle', x: 250, y: -400, region: 'fogbanks', size: 'village' },
  { id: 'greyhollow', name: 'Grey Hollow', x: 520, y: -560, region: 'fogbanks', size: 'town' },
  { id: 'wickstone', name: 'Wickstone', x: 120, y: -700, region: 'fogbanks', size: 'village' },
  { id: 'sealrock', name: 'Seal Rock', x: 700, y: -300, region: 'fogbanks', size: 'village' },

  { id: 'coralby', name: 'Coralby', x: 1350, y: 500, region: 'sunward', size: 'town' },
  { id: 'driftwood', name: 'Driftwood Key', x: 1500, y: 250, region: 'sunward', size: 'village' },
  { id: 'saffron', name: 'Saffron Harbour', x: 1700, y: 650, region: 'sunward', size: 'city' },

  { id: 'holdfast', name: 'Holdfast', x: 1300, y: -500, region: 'ironcliffs', size: 'town' },
  { id: 'frostgate', name: 'Frostgate', x: 1600, y: -900, region: 'ironcliffs', size: 'village' },
  { id: 'anvil', name: 'Anvil Sound', x: 1900, y: -450, region: 'ironcliffs', size: 'city' },

  { id: 'lanternhold', name: 'Lanternhold', x: 2400, y: 200, region: 'lantern', size: 'city' },
  { id: 'ember', name: 'Ember Isle', x: 2200, y: -200, region: 'lantern', size: 'village' },
  { id: 'lastlight', name: 'The Last Light', x: 2700, y: -100, region: 'lantern', size: 'town' },
]

export function getRegion(id: RegionId): RegionDef {
  return REGIONS.find((r) => r.id === id)!
}

/** What a harbour office costs, by region: the price of moving your home port there. */
export const HOME_PRICE: Record<RegionId, number> = { bay: 25_000, fogbanks: 50_000, sunward: 150_000, ironcliffs: 600_000, lantern: 2_000_000 }

/** The home bay's extent, used by the old web prototype's map. */
export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 700
