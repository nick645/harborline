// Badges: what a captain earns at sea by what they actually do, each in three levels with a small
// bonus that grows. Unlike traits they're never hidden: you can watch them build trip by trip.
// Names, what counts, thresholds and bonuses are Claude's picks (user-approved 2026-11-06).

export type BadgeId = 'storm-hand' | 'long-hauler' | 'trader' | 'steady-keel' | 'old-salt' | 'charter'

export interface BadgeDef {
  id: BadgeId
  name: string
  /** What earns it, as the player is told. */
  earn: string
  /** Trips (or voyages) needed for levels I, II and III. */
  levels: [number, number, number]
  /** The bonus at levels I, II and III, as the player is told. */
  bonus: [string, string, string]
  /** The bonus as a number per level (what it multiplies). */
  value: [number, number, number]
  /** A one-glyph mark for the badge. */
  mark: string
}

/** A trip counts as long at this many leagues. */
export const LONG_TRIP = 25
/** A trip counts toward Steady Keel when the hull comes home at least this sound. */
export const STEADY_HULL = 80

export const BADGES: BadgeDef[] = [
  {
    id: 'storm-hand',
    name: 'Storm Hand',
    earn: 'Trips sailed through storms',
    levels: [8, 25, 60],
    bonus: ['−6% hull damage in storms', '−12% hull damage in storms', '−18% hull damage in storms'],
    value: [0.94, 0.88, 0.82],
    mark: 'ϟ',
  },
  {
    id: 'long-hauler',
    name: 'Long Hauler',
    earn: `Trips of ${LONG_TRIP} leagues or more`,
    levels: [12, 40, 100],
    bonus: ['Long trips 4% faster', 'Long trips 8% faster', 'Long trips 12% faster'],
    value: [0.96, 0.92, 0.88],
    mark: '⟿',
  },
  {
    id: 'trader',
    name: 'Market Trader',
    earn: 'Trips that land on a port’s market day',
    levels: [4, 12, 30],
    bonus: ['+5% pay on market days', '+10% pay on market days', '+15% pay on market days'],
    value: [1.05, 1.1, 1.15],
    mark: '⚖',
  },
  {
    id: 'steady-keel',
    name: 'Steady Keel',
    earn: `Trips home with the hull at ${STEADY_HULL} or better`,
    levels: [20, 60, 150],
    bonus: ['−5% hull damage in fair weather', '−10% hull damage in fair weather', '−15% hull damage in fair weather'],
    value: [0.95, 0.9, 0.85],
    mark: '⚓',
  },
  {
    id: 'old-salt',
    name: 'Old Salt',
    earn: 'Voyages, any kind',
    levels: [25, 75, 200],
    bonus: ['Skills grow 15% faster', 'Skills grow 30% faster', 'Skills grow 50% faster'],
    value: [1.15, 1.3, 1.5],
    mark: '✦',
  },
  {
    id: 'charter',
    name: 'Chart-maker',
    earn: 'Trips beyond home waters',
    levels: [10, 40, 100],
    bonus: ['Charts new waters 10% faster', 'Charts new waters 20% faster', 'Charts new waters 30% faster'],
    value: [1.1, 1.2, 1.3],
    mark: '✧',
  },
]

export function getBadge(id: BadgeId): BadgeDef {
  return BADGES.find((b) => b.id === id)!
}

/** The level (0–3) a count reaches. */
export function badgeLevel(def: BadgeDef, count: number): 0 | 1 | 2 | 3 {
  return (def.levels.filter((n) => count >= n).length as 0 | 1 | 2 | 3)
}

/** A captain's bonus from a badge (1 when not yet earned). */
export function badgeValue(marks: Partial<Record<BadgeId, number>> | undefined, id: BadgeId): number {
  const def = getBadge(id)
  const lv = badgeLevel(def, marks?.[id] ?? 0)
  return lv === 0 ? 1 : def.value[lv - 1]
}

/** How well a captain's potential is known after this many voyages, if nothing showed it sooner. */
export const CEILING_KNOWN_AFTER = 40

/** A captain's grade shows once their rating is sure and they've sailed this many voyages. */
export const GRADE_KNOWN_AFTER = 20

export type GradeId = 'pearl' | 'seasoned' | 'able' | 'driftwood' | 'barnacle'

/** What sort of captain they've turned out to be (Claude's names, user-approved 2026-11-06). */
export const GRADES: Record<GradeId, { name: string; blurb: string }> = {
  pearl: { name: 'Pearl of the fleet', blurb: 'Rare as they come. Give them your best boat.' },
  seasoned: { name: 'Seasoned', blurb: 'Knows the sea, and shows it.' },
  able: { name: 'Able', blurb: 'Does the job, day in, day out.' },
  driftwood: { name: 'Driftwood', blurb: 'Not much yet, but still finding their feet.' },
  barnacle: { name: 'Barnacle', blurb: 'Plenty of voyages, little to show for them, and done getting better.' },
}
