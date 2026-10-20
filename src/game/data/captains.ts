import type { DevelopmentStyle, Exposure, Weather } from '../types'

// Captain content. Effects are applied in captains.ts; traits here are data.

export interface TraitDef {
  id: string
  name: string
  /** What the player reads once the trait is known. */
  description: string
  /** What a dockside rumour of this trait sounds like. */
  rumour: string
  /** Which experiences can reveal it: a storm trait only shows itself in storms. */
  testedBy: (keyof Exposure)[] | 'any'
  /** Relative odds of a captain having this trait. */
  weight: number
  good: boolean
}

const ANY = 'any' as const
const ROUGH: (keyof Exposure)[] = ['rough', 'storm']

export const TRAITS: TraitDef[] = [
  // From the spec
  { id: 'steady', name: 'Steady', description: '−40% condition loss in rough water and storms', rumour: 'Says they’ve never had to bail', testedBy: ROUGH, weight: 10, good: true },
  { id: 'reckless', name: 'Reckless', description: '+20% pay, +50% chance of losing the cargo', rumour: 'Known to take the short way round the rocks', testedBy: ANY, weight: 8, good: false },
  { id: 'beloved', name: 'Beloved', description: '+15% passenger demand; no effect on cargo', rumour: 'Passengers ask for them by name', testedBy: ['passenger'], weight: 8, good: true },
  { id: 'green', name: 'Green', description: '−10% pay until 20 voyages, then it wears off', rumour: 'Still learning the knots', testedBy: ANY, weight: 8, good: false },
  { id: 'superstitious', name: 'Superstitious', description: 'Refuses to sail into storms; +10% pay in calm water', rumour: 'Won’t sail on a red sky', testedBy: ['storm', 'calm'], weight: 7, good: false },
  { id: 'lucky', name: 'Lucky', description: 'A second part roll on every voyage', rumour: 'Things wash up wherever they anchor', testedBy: ANY, weight: 1.5, good: true },
  // Harborline's own
  { id: 'navigator', name: 'Navigator', description: '−15% trip time', rumour: 'Knows every current in the bay', testedBy: ANY, weight: 8, good: true },
  { id: 'thrifty', name: 'Thrifty', description: '−25% fuel cost', rumour: 'Counts every drop in the tank', testedBy: ANY, weight: 8, good: true },
  { id: 'heavy-handed', name: 'Heavy-handed', description: '+30% condition loss in any weather', rumour: 'Hard on the wheel, harder on the hull', testedBy: ANY, weight: 7, good: false },
  { id: 'fair-weather', name: 'Fair-weather', description: '−20% pay in rough water and storms', rumour: 'Goes quiet when the wind picks up', testedBy: ROUGH, weight: 7, good: false },
  { id: 'night-owl', name: 'Night owl', description: '+15% pay on trips leaving between 10pm and 6am', rumour: 'Sleeps through the day', testedBy: ['night'], weight: 6, good: true },
  { id: 'haggler', name: 'Haggler', description: '+10% cargo pay; no effect on passengers', rumour: 'Never pays the first price for anything', testedBy: ['cargo'], weight: 8, good: true },
]

export const TRAIT_COUNT = { min: 2, max: 4 }

export interface DevelopmentDef {
  id: DevelopmentStyle
  name: string
  description: string
  weight: number
}

export const DEVELOPMENT: DevelopmentDef[] = [
  { id: 'steady', name: 'Steady learner', description: 'Improves slowly and surely toward their best', weight: 45 },
  { id: 'quick-study', name: 'Quick study', description: 'Improves fast', weight: 20 },
  { id: 'late-bloomer', name: 'Late bloomer', description: 'Shows little for a long while, then takes off', weight: 15 },
  { id: 'peaked', name: 'Peaked', description: 'As good as they will get; slowly slipping', weight: 20 },
]

/** How trueSkill moves with voyages, per development style. */
export const GROWTH: Record<DevelopmentStyle, { startAfter: number; every: number; step: number }> = {
  steady: { startAfter: 0, every: 10, step: 1 },
  'quick-study': { startAfter: 0, every: 5, step: 1 },
  'late-bloomer': { startAfter: 40, every: 4, step: 1 },
  peaked: { startAfter: 0, every: 25, step: -1 },
}

// ---------- skills ----------

export type SkillId = 'helm' | 'charts' | 'trade' | 'nerve' | 'command'

export interface SkillDef {
  id: SkillId
  name: string
  /** What it does, for the logbook page. */
  description: string
}

/** Five sea skills, each shaping a different part of a trip. 50 is neutral in every one. */
export const SKILLS: SkillDef[] = [
  { id: 'helm', name: 'Helm', description: 'Less hull damage, in any weather' },
  { id: 'charts', name: 'Charts', description: 'Faster trips' },
  { id: 'trade', name: 'Trade', description: 'Better pay' },
  { id: 'nerve', name: 'Nerve', description: 'Less chance of losing a cargo in rough water and storms' },
  { id: 'command', name: 'Command', description: 'Gets more from the hands aboard: less damage, quicker trips' },
]
export const SKILL_IDS = SKILLS.map((x) => x.id)

/** Per point above or below 50. */
export const SKILL_PAY_PER_POINT = 0.004 // Trade 100 → +20% pay
export const SKILL_DAMAGE_PER_POINT = 0.003 // Helm 100 → −15% hull damage
export const SKILL_SPEED_PER_POINT = 0.002 // Charts 100 → −10% trip time
export const SKILL_NERVE_PER_POINT = 0.006 // Nerve 100 → −30% loss risk
export const SKILL_COMMAND_PER_POINT = 0.002 // Command 100 → −10% damage and −5% time with hands aboard
/** Below 50, Charts, Nerve and Command cost only this share of what they'd give above it. */
export const SKILL_BELOW_AVERAGE = 0.5

/** How far each skill strays from a captain's overall ability when they're generated. */
export const SKILL_SPREAD = 14

/**
 * Learning by doing: on each voyage, each skill has this chance (times how much the voyage used
 * it) of going up a point, by development style. Peaked captains slowly slip instead.
 */
export const LEARN_RATE: Record<DevelopmentStyle, { startAfter: number; rate: number }> = {
  steady: { startAfter: 0, rate: 0.1 },
  'quick-study': { startAfter: 0, rate: 0.2 },
  'late-bloomer': { startAfter: 40, rate: 0.25 },
  peaked: { startAfter: 0, rate: -0.04 },
}
/** How much a voyage works each skill, by weather. Trade and charts are always in use. */
export const SKILL_USE: Record<SkillId, Record<Weather, number>> = {
  helm: { calm: 0.4, choppy: 0.8, rough: 1.6, storm: 2 },
  charts: { calm: 1, choppy: 1, rough: 1, storm: 1 },
  trade: { calm: 1, choppy: 1, rough: 1, storm: 1 },
  nerve: { calm: 0.2, choppy: 0.5, rough: 1.2, storm: 2.5 },
  command: { calm: 0.3, choppy: 0.3, rough: 0.3, storm: 0.3 },
}
/** Command is worked by every hand aboard, on top of the base above. */
export const COMMAND_USE_PER_HAND = 0.3

// ---------- potential and the ranks above five anchors ----------

/** What a captain could become. Hidden until scouting or the sea turns it up. */
export type Potential = 'none' | 'legend' | 'mythic'
/** Odds of each potential: most captains, and the unusual ones by the tavern fire. */
export const POTENTIAL_ODDS = { quay: { legend: 0.04, mythic: 0.004 }, tavern: { legend: 0.3, mythic: 0.06 } }
/** A captain with no potential never has a skill ceiling above this. */
export const ORDINARY_CEILING = 88
/** Ceilings for those who could go further. */
export const LEGEND_CEILING: [number, number] = [90, 97]
export const MYTHIC_CEILING: [number, number] = [96, 100]
/** Overall skill (the average of the five) that makes a Legend, or a Mythic. */
export const LEGEND_AT = 90
export const MYTHIC_AT = 96
/** A captain's own potential shows after this many voyages, if scouting hasn't turned it up. */
export const POTENTIAL_KNOWN_AFTER = 20

export type Rank = 'legend' | 'mythic'

export interface RankAbilityDef {
  id: string
  name: string
  description: string
}

/** A Legend's signature: one of these, for good. */
export const LEGEND_ABILITIES: RankAbilityDef[] = [
  { id: 'iron-keel', name: 'Iron keel', description: 'Her boat can’t sink while they’re at the helm' },
  { id: 'fair-winds', name: 'Fair winds', description: 'Trips 20% faster' },
  { id: 'silver-tongue', name: 'Silver tongue', description: '+20% pay' },
  { id: 'wreck-reader', name: 'Wreck-reader', description: 'An extra part roll on every trip' },
  { id: 'storm-rider', name: 'Storm rider', description: '+40% pay in storms' },
]

/** A Mythic captain's own: rarer, stranger, on top of their Legend signature. */
export const MYTHIC_ABILITIES: RankAbilityDef[] = [
  { id: 'calm-bringer', name: 'Calm-bringer', description: 'No hull damage in rough water or storms' },
  { id: 'tide-turner', name: 'Tide-turner', description: 'Trips 35% faster and half the fuel' },
  { id: 'drowned-luck', name: 'Drowned luck', description: 'Two extra part rolls on every trip' },
  { id: 'stormcaller', name: 'Stormcaller', description: 'Storms pay double and never take the cargo' },
]

export const SKILL_MIN = 5
export const SKILL_MAX = 95
/** Ceiling sits this far above starting skill, at most. */
export const CEILING_HEADROOM = 40

/** Anchors are 20-point bands of true skill: 1–20 is one anchor, 81–100 is five. */
export const skillToAnchors = (skill: number) => Math.min(5, Math.max(1, Math.ceil(skill / 20)))
/** How often reputation is off by one anchor each way. */
export const REPUTATION_UNDERVALUED = 0.15
export const REPUTATION_OVERRATED = 0.15
/** Relative odds of each reputation turning up on the quay (within the range on offer). */
export const REPUTATION_WEIGHTS = [0, 5, 4, 3, 2, 1]

/** Reputations the quay offers, by the highest tier you've reached (1–6). */
export const QUAY_REPUTATION: [number, number][] = [[1, 1], [1, 2], [1, 3], [2, 4], [2, 5], [3, 5], [3, 5]]

/**
 * Boat tiers a captain of this reputation will sail: nobody above their standing,
 * and nothing beneath it either. Reputation grows (or slips) with voyages.
 */
export const captainTiers = (reputation: number): [number, number] => [Math.max(1, reputation - 1), Math.min(6, reputation + 1)]

/** Every this many voyages, reputation moves one anchor toward the captain's true ability. */
export const REPUTATION_REVIEW_EVERY = 10

// ---------- recruiting ----------

export const RECRUIT_POOL_SIZE = 5
export const RECRUIT_POOL_MS = 6 * 60 * 60 * 1000

/** Hiring fee by reputation (anchors 1–5). */
export const HIRE_FEE = [0, 300, 1200, 5000, 20000, 80000]
/** Severance: a share of the fee, plus a share per voyage served, capped. */
export const SEVERANCE_FEE_SHARE = 0.2
export const SEVERANCE_PER_VOYAGE_SHARE = 0.01
export const SEVERANCE_CAP_SHARE = 1.5

/** Watches available to spend on each recruit pool, by scout level. */
export const WATCHES_BASE = 6
export const WATCHES_PER_SCOUT_LEVEL = 2

export const SCOUT_ACTIONS = {
  ask: { name: 'Ask around the docks', watches: 1, reveals: 'a rumour about one trait' },
  logbook: { name: 'Read their logbook', watches: 2, reveals: 'a skill range' },
  run: { name: 'Take them out on a run', watches: 3, reveals: 'a verdict, and another rumour' },
} as const
export type ScoutAction = keyof typeof SCOUT_ACTIONS

/** By scout level 1–5: rumour accuracy and logbook skill-range width (never exact). */
export const SCOUT_ACCURACY = [0, 0.6, 0.67, 0.75, 0.8, 0.85]
export const SCOUT_BAND_WIDTH = [100, 60, 45, 30, 20, 10]
export const MAX_SCOUT_LEVEL = 5

// ---------- at sea ----------

/** Every this many voyages: the skill range narrows and a tested trait may reveal itself. */
export const REVEAL_EVERY = 5
export const BAND_NARROW_FACTOR = 0.8
export const BAND_MIN_WIDTH = 6
export const TRAIT_REVEAL_CHANCE = 0.5
/** A rumour of a trait the captain doesn't have is disproven after this many tests. */
export const DISPROVE_AFTER_TESTS = 8
export const DEVELOPMENT_KNOWN_AFTER = 30
export const GREEN_EXPIRES_AFTER = 20

/** A captain this experienced can be promoted to a desk job. */
export const PROMOTION_VOYAGES = 100

export const NIGHT_HOURS = { from: 22, to: 6 }
export const isNight = (t: number) => {
  const h = new Date(t).getHours()
  return h >= NIGHT_HOURS.from || h < NIGHT_HOURS.to
}

export const emptyExposure = (): Exposure => ({ calm: 0, choppy: 0, rough: 0, storm: 0, cargo: 0, passenger: 0, night: 0 })
export const WEATHER_KEYS: Weather[] = ['calm', 'choppy', 'rough', 'storm']

// ---------- names ----------

export const FIRST_NAMES = [
  'Ada', 'Bram', 'Cass', 'Dov', 'Edda', 'Fen', 'Greer', 'Hale', 'Ines', 'Jory', 'Kit', 'Lark',
  'Mabry', 'Nell', 'Oren', 'Pell', 'Quill', 'Rook', 'Sable', 'Tamsin', 'Ulla', 'Vance', 'Wren', 'Yara',
]
export const LAST_NAMES = [
  'Ashgrove', 'Barlow', 'Coldwater', 'Dunmore', 'Ellery', 'Fairweather', 'Gorse', 'Hollin', 'Ivey',
  'Kettle', 'Lowry', 'Marram', 'Nettlefold', 'Orrin', 'Penhallow', 'Quayle', 'Rook', 'Saltash',
  'Thorne', 'Underhill', 'Varley', 'Whitlock',
]
export const HOME_PORTS = ['Saltmarsh Quay', 'Gullwick', 'Brindle Point', 'Cobble Cove', 'Farhaven', 'up the coast', 'the islands']
