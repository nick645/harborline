// Keepsakes: things your boats bring home that open up new looks for your house and tavern.
// A new harbour starts plain; everything else is found at sea. Each keepsake washes up in
// one region's waters, and the rarest only come out of storms. Which waters hold what, the
// names and the odds are Claude's picks.

import type { Weather } from '../types'
import type { RegionId } from './ports'

/** The part of the home a keepsake opens up: one option in one of the style pickers. */
export type KeepsakeGroup =
  | 'build'
  | 'roofStyle'
  | 'siding'
  | 'windows'
  | 'doorStyle'
  | 'topper'
  | 'extra'
  | 'wall'
  | 'roof'
  | 'sign'
  | 'trim'
  | 'door'
  | 'shutters'
  | 'bunting'
  | 'tavernWall'
  | 'tavernFloor'
  | 'cloth'
  | 'hanging'

export interface KeepsakeDef {
  /** `${group}:${value}`, the look it opens. */
  id: string
  group: KeepsakeGroup
  value: string
  /** What was found, as the log and the picker tell it. */
  name: string
  region: RegionId
  /** Only turns up in a storm. */
  storm?: boolean
}

export const lookKey = (group: KeepsakeGroup, value: string | number) => `${group}:${value}`

/** What every harbour has from the start: a bare board cottage. */
export const STARTING_LOOKS: string[] = [
  lookKey('build', 'cottage'),
  lookKey('roofStyle', 'gable'),
  lookKey('siding', 'boards'),
  lookKey('windows', 'square'),
  lookKey('doorStyle', 'plain'),
  lookKey('topper', 'none'),
  lookKey('extra', 'smoke'),
  lookKey('wall', '#7a5038'),
  lookKey('wall', '#efe3d2'),
  lookKey('roof', '#4a2e22'),
  lookKey('roof', '#2e333a'),
  lookKey('sign', '#2a4a3e'),
  lookKey('sign', '#6e4733'),
  lookKey('trim', '#f3e7d8'),
  lookKey('door', '#3a2420'),
  lookKey('shutters', ''),
  lookKey('bunting', 0),
  lookKey('tavernWall', 0),
  lookKey('tavernFloor', 0),
  lookKey('cloth', '#efe3d2'),
  lookKey('hanging', 'none'),
]

const k = (group: KeepsakeGroup, value: string | number, name: string, region: RegionId, storm?: true): KeepsakeDef => ({
  id: lookKey(group, value),
  group,
  value: String(value),
  name,
  region,
  ...(storm ? { storm } : {}),
})

export const KEEPSAKES: KeepsakeDef[] = [
  // ---- Saltmarsh Bay: the plain, useful things a home harbour gives up ----
  k('siding', 'shingles', 'a crate of cedar shingles', 'bay'),
  k('roofStyle', 'hip', 'a bundle of hip-roof rafters', 'bay'),
  k('doorStyle', 'double', 'a pair of salvaged double doors', 'bay'),
  k('topper', 'gull', 'a gull weathervane off an old net shed', 'bay'),
  k('topper', 'flag', 'a flagpole from a broken jetty', 'bay'),
  k('extra', 'boxes', 'window boxes and a bag of seeds', 'bay'),
  k('extra', 'porch', 'a storm lantern, still lit', 'bay', true),
  k('wall', '#2f5d62', 'a tin of harbour-teal paint', 'bay'),
  k('wall', '#8a3a3a', 'a tin of brick-red paint', 'bay'),
  k('roof', '#23395b', 'a stack of navy roof tiles', 'bay'),
  k('roof', '#3a2420', 'a stack of umber roof tiles', 'bay'),
  k('sign', '#7a1f2a', 'a pot of claret sign paint', 'bay'),
  k('trim', '#e9b23c', 'a pot of honey trim paint', 'bay'),
  k('door', '#b8423a', 'a pot of red door paint', 'bay'),
  k('door', '#2f5d62', 'a pot of teal door paint', 'bay'),
  k('shutters', '#2f5d62', 'a pair of teal shutters', 'bay'),
  k('bunting', 1, 'a string of blue-and-white flags', 'bay'),
  k('tavernWall', 1, 'a load of grey driftwood planks', 'bay'),
  k('cloth', '#b8423a', 'a bolt of red-check cloth', 'bay'),
  k('hanging', 'oars', 'a pair of oars too good to row with', 'bay'),
  k('hanging', 'fish', 'a fish too big to eat', 'bay'),

  // ---- The Fogbanks: grey stone, bells and sea-glass ----
  k('build', 'tall', "a builder's plans for a tall house, in a bottle", 'fogbanks'),
  k('siding', 'stone', 'a cart of grey island stone', 'fogbanks'),
  k('roofStyle', 'steep', 'rafters from a fog chapel', 'fogbanks'),
  k('windows', 'round', 'a crate of porthole glass', 'fogbanks'),
  k('wall', '#3d5a73', 'a tin of slate-blue paint', 'fogbanks'),
  k('roof', '#2f5d62', 'a stack of teal roof tiles', 'fogbanks'),
  k('sign', '#23395b', 'a pot of navy sign paint', 'fogbanks'),
  k('trim', '#9ec0cf', 'a jar of sea-glass trim paint', 'fogbanks'),
  k('door', '#23395b', 'a pot of navy door paint', 'fogbanks'),
  k('shutters', '#23395b', 'a pair of navy shutters', 'fogbanks'),
  k('bunting', 3, 'a string of sea-green flags', 'fogbanks'),
  k('tavernFloor', 2, 'flagstones from a sunken quay', 'fogbanks'),
  k('cloth', '#2f5d62', 'a bolt of teal sailcloth', 'fogbanks'),
  k('hanging', 'wheel', "a ship's wheel off a fog-bound wreck", 'fogbanks', true),

  // ---- Sunward Shoals: painted houses, palms and bright doors ----
  k('build', 'boathouse', 'plans for a boathouse, sketched on a sail', 'sunward'),
  k('siding', 'plaster', 'a sack of white lime plaster', 'sunward'),
  k('roofStyle', 'thatch', 'a bundle of palm thatch', 'sunward'),
  k('windows', 'arched', 'a set of arched window frames', 'sunward'),
  k('doorStyle', 'arched', 'an arched door from a shoal chapel', 'sunward'),
  k('wall', '#6b5a2e', 'a tin of olive paint', 'sunward'),
  k('wall', '#4a3346', 'a tin of plum paint', 'sunward'),
  k('trim', '#c2452a', 'a pot of signal-red trim paint', 'sunward'),
  k('door', '#e9b23c', 'a pot of honey door paint', 'sunward'),
  k('door', '#f3e7d8', 'a pot of white door paint', 'sunward'),
  k('shutters', '#e9b23c', 'a pair of honey shutters', 'sunward'),
  k('shutters', '#b8423a', 'a pair of red shutters', 'sunward'),
  k('bunting', 2, 'a string of sunset flags', 'sunward'),
  k('tavernWall', 3, 'pale oak panelling from a beach house', 'sunward'),
  k('tavernFloor', 1, 'a load of sun-bleached boards', 'sunward'),
  k('cloth', '#e9b23c', 'a bolt of honey linen', 'sunward'),

  // ---- The Ironcliffs: iron, tar and the lookouts of a hard coast ----
  k('build', 'tower', 'plans for a lookout tower, from a dead lighthouse', 'ironcliffs', true),
  k('topper', 'ship', 'a copper ship vane, struck by lightning', 'ironcliffs', true),
  k('topper', 'anchor', 'an anchor dragged up from the deep', 'ironcliffs'),
  k('roof', '#7a1f2a', 'a stack of claret roof tiles', 'ironcliffs'),
  k('sign', '#1d1218', 'a pot of black sign paint', 'ironcliffs'),
  k('trim', '#2e1c19', 'a barrel of ship tar', 'ironcliffs'),
  k('shutters', '#f3e7d8', 'a pair of frost-white shutters', 'ironcliffs'),
  k('tavernWall', 4, 'blue-black panelling from a whaler', 'ironcliffs'),
  k('tavernFloor', 3, 'red pine boards from a cliff mill', 'ironcliffs'),
  k('cloth', '#4a3346', 'a bolt of plum wool', 'ironcliffs'),
  k('hanging', 'flag', 'the tattered flag of a line long gone', 'ironcliffs', true),

  // ---- Lantern Reach: the far lights ----
  k('extra', 'lights', 'a string of sea-lanterns', 'lantern'),
  k('bunting', 4, 'a string of violet storm flags', 'lantern', true),
  k('tavernWall', 2, 'plum panelling from a lantern hall', 'lantern'),
  k('hanging', 'painting', 'a painting of a ship that never came home', 'lantern', true),
]

/** Chance a hand-run trip that comes home brings a keepsake, by the weather it sailed in. */
export const KEEPSAKE_CHANCE: Record<Weather, number> = { calm: 0.025, choppy: 0.03, rough: 0.05, storm: 0.15 }

export function getKeepsake(id: string): KeepsakeDef | undefined {
  return KEEPSAKES.find((x) => x.id === id)
}
