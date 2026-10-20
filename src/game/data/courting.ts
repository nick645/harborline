// Courting: everyone looking for work is also being courted by rival lines. Each person has a
// bearing that swings between you and those rivals over real time; when their time is up they
// sign with whoever they lean toward most. What moves them is what they want, which you learn
// by talking to them. First-pass numbers, all Claude's picks, meant to be tuned with the sim.

export type RivalId = 'merrow' | 'gullstreet' | 'blacklantern' | 'tallowbrine'

export interface RivalDef {
  id: RivalId
  name: string
  /** Flag colours, for the compass and the log. */
  colors: [string, string]
}

export const RIVALS: RivalDef[] = [
  { id: 'merrow', name: 'Merrow & Daughters', colors: ['#3f7d8c', '#e8e2d6'] },
  { id: 'gullstreet', name: 'The Gull Street Line', colors: ['#c2452a', '#f2d16b'] },
  { id: 'blacklantern', name: 'Black Lantern Shipping', colors: ['#1f1a24', '#f2b45a'] },
  { id: 'tallowbrine', name: 'Tallow & Brine', colors: ['#6b8f4e', '#2b1f2c'] },
]

export type WantId = 'pay' | 'ship' | 'safety' | 'storms' | 'region' | 'harbour' | 'company'

export interface WantDef {
  id: WantId
  name: string
  /** How it's heard on the quay. */
  heard: string
  /** What wins them over, for the player once it's known. */
  hint: string
  /** How often a new captain wants this. */
  weight: number
  /** Hands want only simple things. */
  hands?: boolean
}

export const WANTS: WantDef[] = [
  { id: 'pay', name: 'Good pay', heard: 'Talks a lot about what the last line paid', hint: 'Better terms', weight: 3, hands: true },
  { id: 'ship', name: 'A fine ship', heard: 'Keeps looking over the boats in the harbour', hint: 'Show them your best boat', weight: 3, hands: true },
  { id: 'safety', name: 'A line that comes home', heard: 'Lost friends to a careless line', hint: 'No boats lost lately', weight: 2 },
  { id: 'storms', name: 'Storm work', heard: 'Gets restless when the sky is clear', hint: 'Boats that have sailed through storms', weight: 2 },
  { id: 'region', name: 'Close to home', heard: 'Never far from where they grew up', hint: 'A home port in their own waters', weight: 2, hands: true },
  { id: 'harbour', name: 'A proper harbour', heard: 'Has opinions about other lines’ docks', hint: 'Port upgrades and decorations', weight: 2 },
  { id: 'company', name: 'Good company', heard: 'Never turns down a drink and a story', hint: 'Time over a drink', weight: 2, hands: true },
]

/** How long a captain takes to decide, by anchors (index = reputation). Hours. */
export const DECIDE_HOURS = [0, 1.5, 3, 12, 30, 60]
/** Hands decide quickly. Hours. */
export const HAND_DECIDE_HOURS = 3
/** Rivals courting each captain; each hand has one. */
export const CAPTAIN_RIVALS = 2
/** How many things a captain wants (more for the best). Hands want one. */
export const CAPTAIN_WANTS = [0, 2, 2, 2, 3, 3]

/** Where a rival's standing starts, and where the strongest one ends up by the deadline. */
export const RIVAL_START: [number, number] = [5, 25]
export const RIVAL_FINISH: [number, number] = [30, 56]
/** Better captains are courted harder: added to the strongest rival's finish per anchor above 1. */
export const RIVAL_FINISH_PER_ANCHOR = 4
export const HAND_RIVAL_FINISH: [number, number] = [25, 45]
/** Where your own standing starts. */
export const YOURS_START: [number, number] = [10, 20]
/** The rumour about what they want is right this often. */
export const WANT_HEARD_ACCURACY = 0.7

/** They'll sign early, before their time is up, only when this sold on you. */
export const WON_OVER_AT = 80
export const WON_OVER_LEAD = 20

export type CourtAction = 'drink' | 'harbour' | 'ship' | 'terms'

export interface CourtActionDef {
  name: string
  /** Watches for a captain; hands are cheaper (see `handWatches`). */
  watches: number
  handWatches: number
  /** What it does for anyone, whatever they want. */
  base: number
}

export const COURT_ACTIONS: Record<CourtAction, CourtActionDef> = {
  drink: { name: 'Stand them a drink', watches: 1, handWatches: 1, base: 6 },
  harbour: { name: 'Walk them round your harbour', watches: 0, handWatches: 0, base: 5 },
  ship: { name: 'Show them a boat', watches: 0, handWatches: 0, base: 5 },
  terms: { name: 'Better terms', watches: 0, handWatches: 0, base: 5 },
}

/** A drink with someone who wants good company. Drinks can be repeated once per watch (6 h). */
export const DRINK_COMPANY = 18
/** Better terms: each raises their fee by this share, at most this many times. */
export const TERMS_STEP = 0.25
export const TERMS_MAX = 2
export const TERMS_PAY = 18
/** Showing a boat to someone who wants a fine ship: by her tier, more for rarer ones. */
export const SHIP_BASE = 8
export const SHIP_PER_TIER = 5
export const SHIP_RARITY: Record<string, number> = { common: 0, rare: 6, legendary: 12, mythic: 16 }
export const SHIP_CAP = 34
/** Walking them round: each of their wants your harbour answers. */
export const HARBOUR_WANT_MAX = 18
/** A boat sunk this recently counts against you with anyone who wants a safe line. */
export const SAFETY_WINDOW_MS = 72 * 60 * 60 * 1000
export const SAFETY_PENALTY = -10
/** Storm work: per storm trip completed, up to the cap. */
export const STORMS_PER_TRIP = 6
/** A proper harbour: per upgrade level built and decoration placed. */
export const HARBOUR_PER_LEVEL = 3
export const HARBOUR_PER_DECOR = 3

/** A new game's quay has one keen captain: deciding soon, barely courted by anyone else. */
export const KEEN_DECIDES_MS = 5 * 60 * 1000
export const KEEN_RIVAL_FINISH = 24
/** They already lean your way: a drink and a walk round the harbour win them over outright. */
export const KEEN_YOURS = 70

/** Managers sign people only before rivals have much of a hold on them. */
export const MANAGER_RIVAL_MAX = 40
