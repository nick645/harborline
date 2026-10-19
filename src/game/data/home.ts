// Your home harbour's look: colours to pick from, and decorations unlocked by milestones.
// All of it is cosmetic.

export const HOME_NAME_MAX = 24

export const HOME_WALLS = ['#7a5038', '#2f5d62', '#8a3a3a', '#3d5a73', '#6b5a2e', '#efe3d2', '#4a3346'] as const
export const HOME_ROOFS = ['#4a2e22', '#23395b', '#3a2420', '#2f5d62', '#7a1f2a', '#2e333a'] as const
export const HOME_SIGNS = ['#2a4a3e', '#7a1f2a', '#23395b', '#1d1218', '#6e4733'] as const
export const HOME_BUNTING = [
  ['#c2452a', '#e9b23c', '#2f5d62', '#f3e7d8', '#7a4e5e'],
  ['#3d5a73', '#9ec0cf', '#f3e7d8'],
  ['#e9b23c', '#e9772f', '#c2452a'],
  ['#7fd1a8', '#2f5d62', '#f3e7d8'],
  ['#b07be6', '#e6a53a', '#1d1218'],
] as const

/** Places on the home quay where a decoration can stand. */
export const DECOR_SLOTS = 3

export type Milestone = 'storm-trip' | 'raised-wreck'

export type DecorId = 'flowerboxes' | 'bell' | 'figurehead' | 'stormflag' | 'statue' | 'lanternarch' | 'anchor'

export interface DecorDef {
  id: DecorId
  name: string
  /** How it's earned, as the player sees it. */
  earned: string
}

export const DECOR: DecorDef[] = [
  { id: 'flowerboxes', name: 'Flower barrels', earned: 'Yours from the start' },
  { id: 'anchor', name: 'Old anchor', earned: 'Own three boats' },
  { id: 'stormflag', name: 'Storm flag', earned: 'Bring a boat home from a storm' },
  { id: 'figurehead', name: 'Wreck figurehead', earned: 'Raise a sunk boat' },
  { id: 'bell', name: 'Harbour bell', earned: 'Chart your first new waters' },
  { id: 'lanternarch', name: 'Lantern arch', earned: 'Own a tier 3 boat' },
  { id: 'statue', name: 'Statue of a legend', earned: 'Build a legendary or mythic boat' },
]

// ---------- your tavern ----------

export const TAVERN_NAME_MAX = 26
/** Wall panelling, top to bottom. */
export const TAVERN_WALLS = [
  ['#4a2e22', '#6e4430'],
  ['#2f3a3a', '#4a5a56'],
  ['#3a2440', '#5a3a5a'],
  ['#5a4030', '#8a6a48'],
  ['#2a2e3e', '#3f4a62'],
] as const
export const TAVERN_FLOORS = [
  ['#6e4430', '#3a2420'],
  ['#8a6a48', '#4a3a2a'],
  ['#4a4f58', '#2a2e36'],
  ['#7a3a2a', '#3a1e16'],
] as const
export const TAVERN_CLOTHS = ['#efe3d2', '#b8423a', '#2f5d62', '#e9b23c', '#4a3346'] as const
export type Hanging = 'none' | 'wheel' | 'fish' | 'oars' | 'painting' | 'flag'
export const HANGINGS: { id: Hanging; name: string }[] = [
  { id: 'none', name: 'Bare wall' },
  { id: 'wheel', name: "Ship's wheel" },
  { id: 'fish', name: 'Mounted fish' },
  { id: 'oars', name: 'Crossed oars' },
  { id: 'painting', name: 'Painting of a ship' },
  { id: 'flag', name: 'Old flag' },
]
