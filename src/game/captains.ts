// Captains: generation, scouting, effects at sea, and how the truth comes out over voyages.
//
// Invariant: trueSkill, ceiling, hiddenTraits and an unknown development style never reach the
// UI. Components only ever see captainView(). A test enforces this.

import type { Captain, Exposure, GameState, RngState, Rumour, Track, Verdict, Weather } from './types'
import {
  BAND_MIN_WIDTH,
  COMMAND_USE_PER_HAND,
  LEARN_RATE,
  LEGEND_ABILITIES,
  LEGEND_AT,
  LEGEND_CEILING,
  MYTHIC_ABILITIES,
  MYTHIC_AT,
  MYTHIC_CEILING,
  ORDINARY_CEILING,
  POTENTIAL_KNOWN_AFTER,
  POTENTIAL_ODDS,
  SKILL_BELOW_AVERAGE,
  SKILL_COMMAND_PER_POINT,
  SKILL_IDS,
  SKILL_NERVE_PER_POINT,
  SKILL_SPEED_PER_POINT,
  SKILL_SPREAD,
  SKILL_USE,
  SKILLS,
  BAND_NARROW_FACTOR,
  CEILING_HEADROOM,
  DEVELOPMENT,
  DEVELOPMENT_KNOWN_AFTER,
  DISPROVE_AFTER_TESTS,
  emptyExposure,
  FIRST_NAMES,
  GREEN_EXPIRES_AFTER,
  HIRE_FEE,
  HOME_PORTS,
  isNight,
  LAST_NAMES,
  RECRUIT_POOL_MS,
  RECRUIT_POOL_SIZE,
  REPUTATION_OVERRATED,
  REPUTATION_UNDERVALUED,
  REVEAL_EVERY,
  SCOUT_ACCURACY,
  SEVERANCE_CAP_SHARE,
  SEVERANCE_FEE_SHARE,
  SEVERANCE_PER_VOYAGE_SHARE,
  SKILL_DAMAGE_PER_POINT,
  SKILL_MAX,
  SKILL_MIN,
  SKILL_PAY_PER_POINT,
  skillToAnchors,
  QUAY_REPUTATION,
  REPUTATION_REVIEW_EVERY,
  REPUTATION_WEIGHTS,
  captainTiers,
  TRAIT_COUNT,
  TRAIT_REVEAL_CHANCE,
  TRAITS,
  WATCHES_BASE,
  WATCHES_PER_SCOUT_LEVEL,
  type Potential,
  type SkillId,
  type TraitDef,
} from './data/captains'
import { nextFloat, nextInt, rollChance, rollNormal, rollPick, rollWeighted } from './rolls'
import { newCourting, termsFee } from './courting'

const traitsById = new Map(TRAITS.map((t) => [t.id, t]))

export function getTrait(id: string): TraitDef {
  const t = traitsById.get(id)
  if (!t) throw new Error(`Unknown trait ${id}`)
  return t
}

// ---------- generation ----------

/** A skill range of the given width that contains `skill`, placed so its middle gives nothing away. */
export function makeBand(rng: RngState, skill: number, width: number): [number, number] {
  if (width >= 99) return [1, 100]
  const lo = Math.min(100 - width, Math.max(1, skill - Math.floor(nextFloat(rng) * (width + 1))))
  return [lo, lo + width]
}

/**
 * A new captain. Reputation is drawn from `repRange` (the quay offers captains around your
 * level); the truth behind it is usually the same, sometimes an anchor better (a Sleeper) or
 * worse (All talk).
 */
export function generateCaptain(rng: RngState, id: string, repRange: [number, number] = [1, 5], where: 'quay' | 'tavern' = 'quay'): Captain {
  const reps = Array.from({ length: repRange[1] - repRange[0] + 1 }, (_, i) => repRange[0] + i)
  const reputation = rollWeighted(rng, reps.map((r) => ({ item: r, weight: REPUTATION_WEIGHTS[r] })))
  const r = nextFloat(rng)
  const trueAnchors =
    r < REPUTATION_UNDERVALUED
      ? Math.min(5, reputation + 1)
      : r < REPUTATION_UNDERVALUED + REPUTATION_OVERRATED
        ? Math.max(1, reputation - 1)
        : reputation
  const overall = Math.min(SKILL_MAX, Math.max(SKILL_MIN, nextInt(rng, trueAnchors * 20 - 19, trueAnchors * 20)))
  const odds = POTENTIAL_ODDS[where]
  const p = nextFloat(rng)
  const potential: Potential = p < odds.mythic ? 'mythic' : p < odds.mythic + odds.legend ? 'legend' : 'none'
  const { skills, ceilings } = rollSkills(rng, overall, potential)
  const development = rollWeighted(rng, DEVELOPMENT.map((d) => ({ item: d.id, weight: d.weight })))

  const traitCount = nextInt(rng, TRAIT_COUNT.min, TRAIT_COUNT.max)
  const hiddenTraits: string[] = []
  while (hiddenTraits.length < traitCount) {
    const pick = rollWeighted(
      rng,
      TRAITS.filter((t) => !hiddenTraits.includes(t.id)).map((t) => ({ item: t.id, weight: t.weight })),
    )
    hiddenTraits.push(pick)
  }
  const fee = Math.round((HIRE_FEE[reputation] * (0.9 + nextFloat(rng) * 0.2)) / 10) * 10

  const captain: Captain = {
    id,
    name: `${rollPick(rng, FIRST_NAMES)} ${rollPick(rng, LAST_NAMES)}`,
    homePort: rollPick(rng, HOME_PORTS),
    reputation,
    fee,
    trueSkill: overallOf(skills),
    ceiling: overallOf(ceilings),
    skills,
    ceilings,
    bands: unknownBands(),
    potential,
    potentialKnown: false,
    development,
    developmentKnown: false,
    hiddenTraits,
    revealedTraits: [],
    rumours: [],
    verdict: null,
    voyageCount: 0,
    exposure: emptyExposure(),
    scoutLevel: 0,
    watchesSpent: 0,
    role: 'sailing',
    managesTrack: null,
    bonded: false,
  }
  // Everyone on the quay comes with one thing people say about them, true or not.
  addRumour(rng, captain, SCOUT_ACCURACY[1])
  return captain
}

/** A captain who comes with a ship (the Derelict Queen): exceptional, lucky, bonded for good. */
export function generateBondedCaptain(rng: RngState, id: string): Captain {
  const c = generateCaptain(rng, id, [5, 5])
  // Exceptional, and with the makings of a Legend.
  const rolled = rollSkills(rng, rollNormal(rng, 85, 5, 75, 95), 'legend')
  c.skills = rolled.skills
  c.ceilings = rolled.ceilings
  c.potential = 'legend'
  syncOverall(c)
  if (!c.hiddenTraits.includes('lucky')) c.hiddenTraits[0] = 'lucky'
  c.reputation = 5
  c.fee = 0
  c.bonded = true
  c.rumours = []
  addRumour(rng, c, SCOUT_ACCURACY[1])
  return c
}

// ---------- skills ----------

export const overallOf = (skills: Record<SkillId, number>) => Math.round(SKILL_IDS.reduce((n, id) => n + skills[id], 0) / SKILL_IDS.length)

/** Keep the overall numbers in step with the five skills. Mutates. */
export function syncOverall(c: Captain) {
  c.trueSkill = overallOf(c.skills)
  c.ceiling = overallOf(c.ceilings)
}

export const unknownBands = () => Object.fromEntries(SKILL_IDS.map((id) => [id, [1, 100]])) as Record<SkillId, [number, number]>

/**
 * Five skills scattered around an overall ability, and where each can grow to. Ordinary captains
 * top out below a Legend; those with potential can reach it, and a Mythic further still.
 */
export function rollSkills(rng: RngState, overall: number, potential: Potential) {
  const skills = {} as Record<SkillId, number>
  const ceilings = {} as Record<SkillId, number>
  for (const id of SKILL_IDS) {
    const cap = potential === 'none' ? ORDINARY_CEILING : SKILL_MAX
    skills[id] = Math.min(cap, Math.max(SKILL_MIN, Math.round(overall + (nextFloat(rng) * 2 - 1) * SKILL_SPREAD)))
    const room = skills[id] + nextInt(rng, 0, CEILING_HEADROOM)
    ceilings[id] =
      potential === 'mythic'
        ? Math.max(room, nextInt(rng, MYTHIC_CEILING[0], MYTHIC_CEILING[1]))
        : potential === 'legend'
          ? Math.max(room, nextInt(rng, LEGEND_CEILING[0], LEGEND_CEILING[1]))
          : Math.min(ORDINARY_CEILING, room)
    ceilings[id] = Math.min(100, Math.max(ceilings[id], skills[id]))
  }
  return { skills, ceilings }
}

/** Narrow the displayed range of one skill to `width` (never wider than it is). Mutates. */
export function narrowSkill(rng: RngState, c: Captain, id: SkillId, width: number): boolean {
  const [lo, hi] = c.bands[id]
  if (hi - lo <= width) return false
  c.bands[id] = makeBand(rng, c.skills[id], width)
  return true
}

/** The skill you know least about. */
export function leastKnownSkill(c: Captain): SkillId {
  return [...SKILL_IDS].sort((a, b) => c.bands[b][1] - c.bands[b][0] - (c.bands[a][1] - c.bands[a][0]))[0]
}

/** Saves from before the five skills: spread the one skill across five, and keep what was known. */
export function migrateCaptain(rng: RngState, c: Captain) {
  if (c.skills) return
  const old = c as Captain & { skillBand?: [number, number] }
  const rolled = rollSkills(rng, c.trueSkill, 'none')
  c.skills = rolled.skills
  // Old ceilings carry over, within what an ordinary captain can reach.
  for (const id of SKILL_IDS) c.ceilings = { ...(c.ceilings ?? {}), [id]: Math.max(c.skills[id], Math.min(ORDINARY_CEILING, c.ceiling)) } as Record<SkillId, number>
  c.potential = 'none'
  c.potentialKnown = false
  const band = old.skillBand ?? [1, 100]
  const width = band[1] - band[0]
  c.bands = unknownBands()
  if (width < 99) for (const id of SKILL_IDS) c.bands[id] = makeBand(rng, c.skills[id], width)
  delete old.skillBand
  syncOverall(c)
}

/** Add a rumour: about a trait they have with probability `accuracy`, otherwise one they don't. */
export function addRumour(rng: RngState, c: Captain, accuracy: number): Rumour | null {
  const heard = new Set(c.rumours.map((r) => r.traitId))
  const real = c.hiddenTraits.filter((id) => !heard.has(id))
  const fake = TRAITS.map((t) => t.id).filter((id) => !heard.has(id) && !c.hiddenTraits.includes(id))
  const pool = rollChance(rng, accuracy) && real.length ? real : fake.length ? fake : real
  if (!pool.length) return null
  const traitId = rollPick(rng, pool)
  // A rumour about a trait already proven at sea is simply confirmed.
  const rumour: Rumour = { traitId, status: c.revealedTraits.includes(traitId) ? 'proven' : 'rumour' }
  c.rumours.push(rumour)
  return rumour
}

/** Whether a captain will take command of a boat of this tier. */
export function willSail(c: Captain, boatTier: number): boolean {
  const [lo, hi] = captainTiers(c.reputation)
  return boatTier >= lo && boatTier <= hi
}

export function verdictFor(c: Captain): Verdict {
  const truth = skillToAnchors(c.trueSkill)
  return truth > c.reputation ? 'sleeper' : truth < c.reputation ? 'all-talk' : 'true-to-form'
}

// ---------- recruit pool ----------

export function recruitSlot(t: number): number {
  return Math.floor(t / RECRUIT_POOL_MS)
}

export function poolRefreshesAt(t: number): number {
  return (recruitSlot(t) + 1) * RECRUIT_POOL_MS
}

export function watchesFor(scoutLevel: number): number {
  return WATCHES_BASE + WATCHES_PER_SCOUT_LEVEL * (scoutLevel - 1)
}

/** Someone new on a quay, already being courted. */
export function newRecruit(rng: RngState, id: string, repRange: [number, number], t: number, settled = false, where: 'quay' | 'tavern' = 'quay'): Captain {
  const c = generateCaptain(rng, id, repRange, where)
  c.courting = newCourting(rng, t, c, settled)
  return c
}

/**
 * Keep the home quay going: fresh watches each 6-hour slot, and new faces for anyone who has
 * signed (with you or a rival). People stay until they decide. Mutates.
 */
export function refreshRecruitPool(s: GameState, t: number, level: number) {
  const slot = recruitSlot(t)
  if (s.recruitPool.slot !== slot) {
    s.recruitPool.slot = slot
    s.recruitPool.watchesLeft = watchesFor(level)
  }
  const range = QUAY_REPUTATION[s.player.maxTierReached]
  // An empty quay means a new game or a long time away: these people have been here a while.
  const settled = s.recruitPool.recruits.length === 0
  for (const c of s.recruitPool.recruits) c.courting ??= newCourting(s.rng, t, c, true)
  while (s.recruitPool.recruits.length < RECRUIT_POOL_SIZE) s.recruitPool.recruits.push(newRecruit(s.rng, `c${s.nextCaptainSeq++}`, range, t, settled))
}

export function severance(c: Captain): number {
  const raw = c.fee * SEVERANCE_FEE_SHARE + c.voyageCount * c.fee * SEVERANCE_PER_VOYAGE_SHARE
  return Math.round(Math.min(raw, c.fee * SEVERANCE_CAP_SHARE))
}

// ---------- effects ----------

export interface CaptainMods {
  payoutMult: number
  damageMult: number
  lossRiskMult: number
  /** Passenger or cargo demand multiplier. */
  demandMult: number
  durationMult: number
  fuelMult: number
  extraPartRolls: number
  refusesStorm: boolean
  /** A Legend's iron keel: the boat can't go down. */
  noSink: boolean
}

export const NO_MODS: CaptainMods = {
  payoutMult: 1,
  damageMult: 1,
  lossRiskMult: 1,
  demandMult: 1,
  durationMult: 1,
  fuelMult: 1,
  extraPartRolls: 0,
  refusesStorm: false,
  noSink: false,
}

export interface TripFacts {
  track: Track
  weather: Weather
  /** Departure time. */
  t: number
  /** Hands aboard, which Command works with. */
  hands?: number
}

/**
 * What a captain does to a trip. 'true' uses everything they really are (the engine);
 * 'known' uses only what the player has learned: proven traits and the middle of the skill range.
 */
export function captainMods(c: Captain, trip: TripFacts, mode: 'true' | 'known'): CaptainMods {
  const m = { ...NO_MODS }
  // The player reckons with the middle of each range they've learned.
  const sk = (id: SkillId) => {
    if (mode === 'true') return c.skills[id] - 50
    const [lo, hi] = c.bands[id]
    // A skill you know nothing about counts as average.
    return hi - lo >= 99 ? 0 : (lo + hi) / 2 - 50
  }
  const rough = trip.weather === 'rough' || trip.weather === 'storm'
  m.payoutMult *= 1 + sk('trade') * SKILL_PAY_PER_POINT
  m.damageMult *= 1 - sk('helm') * SKILL_DAMAGE_PER_POINT
  // Charts, Nerve and Command reward the best far more than they punish the green.
  const soft = (x: number) => (x < 0 ? x * SKILL_BELOW_AVERAGE : x)
  m.durationMult *= 1 - soft(sk('charts')) * SKILL_SPEED_PER_POINT
  if (rough) m.lossRiskMult *= Math.max(0, 1 - soft(sk('nerve')) * SKILL_NERVE_PER_POINT)
  if (trip.hands) {
    m.damageMult *= 1 - soft(sk('command')) * SKILL_COMMAND_PER_POINT
    m.durationMult *= 1 - soft(sk('command')) * SKILL_COMMAND_PER_POINT * 0.5
  }
  // A Legend's and a Mythic's signatures are public: they count in every quote.
  for (const id of c.rankAbilities ?? []) {
    switch (id) {
      case 'iron-keel':
        m.noSink = true
        break
      case 'fair-winds':
        m.durationMult *= 0.8
        break
      case 'silver-tongue':
        m.payoutMult *= 1.2
        break
      case 'wreck-reader':
        m.extraPartRolls += 1
        break
      case 'storm-rider':
        if (trip.weather === 'storm') m.payoutMult *= 1.4
        break
      case 'calm-bringer':
        if (rough) m.damageMult = 0
        break
      case 'tide-turner':
        m.durationMult *= 0.65
        m.fuelMult *= 0.5
        break
      case 'drowned-luck':
        m.extraPartRolls += 2
        break
      case 'stormcaller':
        if (trip.weather === 'storm') {
          m.payoutMult *= 2
          m.lossRiskMult = 0
        }
        break
    }
  }

  for (const id of mode === 'true' ? c.hiddenTraits : c.revealedTraits) {
    switch (id) {
      case 'steady':
        if (rough) m.damageMult *= 0.6
        break
      case 'reckless':
        m.payoutMult *= 1.2
        m.lossRiskMult *= 1.5
        break
      case 'beloved':
        if (trip.track === 'passenger') m.demandMult *= 1.15
        break
      case 'green':
        if (c.voyageCount < GREEN_EXPIRES_AFTER) m.payoutMult *= 0.9
        break
      case 'superstitious':
        m.refusesStorm = true
        if (trip.weather === 'calm') m.payoutMult *= 1.1
        break
      case 'lucky':
        m.extraPartRolls += 1
        break
      case 'navigator':
        m.durationMult *= 0.85
        break
      case 'thrifty':
        m.fuelMult *= 0.75
        break
      case 'heavy-handed':
        m.damageMult *= 1.3
        break
      case 'fair-weather':
        if (rough) m.payoutMult *= 0.8
        break
      case 'night-owl':
        if (isNight(trip.t)) m.payoutMult *= 1.15
        break
      case 'haggler':
        if (trip.track === 'cargo') m.payoutMult *= 1.1
        break
    }
  }
  return m
}

/** Several captains aboard (The Meridian) stack their effects. */
export function combineMods(list: CaptainMods[]): CaptainMods {
  return list.reduce(
    (a, b) => ({
      payoutMult: a.payoutMult * b.payoutMult,
      damageMult: a.damageMult * b.damageMult,
      lossRiskMult: a.lossRiskMult * b.lossRiskMult,
      demandMult: a.demandMult * b.demandMult,
      durationMult: a.durationMult * b.durationMult,
      fuelMult: a.fuelMult * b.fuelMult,
      extraPartRolls: a.extraPartRolls + b.extraPartRolls,
      refusesStorm: a.refusesStorm || b.refusesStorm,
      noSink: a.noSink || b.noSink,
    }),
    { ...NO_MODS },
  )
}

// ---------- at sea: experience, growth and the truth coming out ----------

function tests(c: Captain, traitId: string): number {
  const t = getTrait(traitId)
  return t.testedBy === 'any' ? c.voyageCount : t.testedBy.reduce((n, k) => n + c.exposure[k], 0)
}

/** Mark a trait as proven (it's real and the player now knows it). Returns true if news. */
export function proveTrait(c: Captain, traitId: string): boolean {
  if (c.revealedTraits.includes(traitId)) return false
  c.revealedTraits.push(traitId)
  const r = c.rumours.find((x) => x.traitId === traitId)
  if (r) r.status = 'proven'
  else c.rumours.push({ traitId, status: 'proven' })
  return true
}

export interface VoyageNews {
  proven: string[]
  disproven: string[]
  developmentRevealed: boolean
  /** +1 or −1 when word of how they really sail moves their reputation. */
  reputationChange: number
  /** Their potential just showed itself at sea. */
  potentialRevealed: boolean
  /** They rose to a new rank on this voyage, with its signature ability. */
  rankUp: { rank: 'legend' | 'mythic'; ability: string } | null
}

/**
 * Called when a captain completes a voyage. Mutates the captain: experience, growth, a
 * narrower skill range now and then, traits revealed by what they've been through, false
 * rumours put to rest. `revealEvery` is shorter aboard boats that bring traits out faster.
 */
export function recordVoyage(rng: RngState, c: Captain, trip: TripFacts, revealEvery = REVEAL_EVERY): VoyageNews {
  const news: VoyageNews = { proven: [], disproven: [], developmentRevealed: false, reputationChange: 0, potentialRevealed: false, rankUp: null }
  c.voyageCount++
  const exp: Exposure = c.exposure
  exp[trip.weather]++
  exp[trip.track]++
  if (isNight(trip.t)) exp.night++

  // Learning by doing: each skill grows (toward its ceiling) with the voyages that work it.
  const g = LEARN_RATE[c.development]
  if (c.voyageCount > g.startAfter) {
    for (const id of SKILL_IDS) {
      const use = SKILL_USE[id][trip.weather] + (id === 'command' ? COMMAND_USE_PER_HAND * (trip.hands ?? 0) : 0)
      if (!rollChance(rng, Math.min(1, Math.abs(g.rate) * use))) continue
      c.skills[id] = g.rate > 0 ? Math.min(c.ceilings[id], c.skills[id] + 1) : Math.max(SKILL_MIN, c.skills[id] - 1)
      // Keep the displayed range honest if the skill moves out of it.
      const [lo, hi] = c.bands[id]
      if (c.skills[id] > hi) c.bands[id] = [lo + 1, hi + 1]
      if (c.skills[id] < lo) c.bands[id] = [lo - 1, hi - 1]
    }
    syncOverall(c)
  }

  // At the top of the scale, those with the potential become Legends, and then Mythics.
  if (!c.rank && c.potential !== 'none' && c.trueSkill >= LEGEND_AT) {
    c.rank = 'legend'
    const ability = rollPick(rng, LEGEND_ABILITIES).id
    c.rankAbilities = [ability]
    c.reputation = 5
    c.potentialKnown = true
    news.rankUp = { rank: 'legend', ability }
  } else if (c.rank === 'legend' && c.potential === 'mythic' && c.trueSkill >= MYTHIC_AT) {
    c.rank = 'mythic'
    const ability = rollPick(rng, MYTHIC_ABILITIES).id
    c.rankAbilities = [...(c.rankAbilities ?? []), ability]
    news.rankUp = { rank: 'mythic', ability }
  }
  if (!c.potentialKnown && c.voyageCount >= POTENTIAL_KNOWN_AFTER) {
    c.potentialKnown = true
    news.potentialRevealed = c.potential !== 'none'
  }

  if (c.voyageCount % revealEvery === 0) {
    // Every skill's range tightens, but never to an exact number.
    for (const id of SKILL_IDS) {
      const width = c.bands[id][1] - c.bands[id][0]
      narrowSkill(rng, c, id, Math.max(BAND_MIN_WIDTH, Math.round(width * BAND_NARROW_FACTOR)))
    }

    // A trait shows itself only once the sea has tested it.
    const candidates = c.hiddenTraits
      .filter((id) => !c.revealedTraits.includes(id))
      .map((id) => ({ item: id, weight: tests(c, id) }))
      .filter((x) => x.weight > 0)
    if (candidates.length && rollChance(rng, TRAIT_REVEAL_CHANCE)) {
      const id = rollWeighted(rng, candidates)
      if (proveTrait(c, id)) news.proven.push(id)
    }
  }

  // A rumour of a trait they don't have falls apart once it's been tested enough.
  for (const r of c.rumours) {
    if (r.status === 'rumour' && !c.hiddenTraits.includes(r.traitId) && tests(c, r.traitId) >= DISPROVE_AFTER_TESTS) {
      r.status = 'disproven'
      news.disproven.push(r.traitId)
    }
  }

  // Word gets around: reputation drifts one anchor toward how they really sail.
  if (c.voyageCount % REPUTATION_REVIEW_EVERY === 0) {
    const truth = skillToAnchors(c.trueSkill)
    if (truth !== c.reputation) {
      news.reputationChange = truth > c.reputation ? 1 : -1
      c.reputation += news.reputationChange
    }
  }

  if (!c.developmentKnown && c.voyageCount >= DEVELOPMENT_KNOWN_AFTER) {
    c.developmentKnown = true
    news.developmentRevealed = true
  }
  return news
}

// ---------- the public view ----------

export interface CaptainTraitView {
  id: string
  name: string
  description: string
  rumour: string
  status: Rumour['status']
}

/** Everything the UI may know about a captain. Never includes the hidden truth. */
export interface CaptainView {
  id: string
  name: string
  homePort: string
  reputation: number
  fee: number
  /** Overall: the averages of the five skill ranges. */
  skillBand: [number, number]
  /** Each skill's range as far as you know it; `known` once it's narrower than the whole scale. */
  skills: { id: SkillId; name: string; description: string; band: [number, number]; known: boolean }[]
  /** Shown once scouting or the sea turns it up: they could become a Legend, or a Mythic. */
  potential: 'legend' | 'mythic' | null
  /** Earned at sea, above five anchors. */
  rank: 'legend' | 'mythic' | null
  /** The signatures that came with their rank. */
  rankAbilities: { id: string; name: string; description: string }[]
  traits: CaptainTraitView[]
  verdict: Verdict | null
  /** Only once revealed at sea. */
  knownDevelopment: { name: string; description: string } | null
  voyageCount: number
  watchesSpent: number
  scoutLevel: number
  role: Captain['role']
  managesTrack: Track | null
  bonded: boolean
  severance: number
  /** Boat tiers they'll take command of, given their reputation. */
  sailsTiers: [number, number]
  /** Id of the manager who hired them (and may let them go), if any. */
  hiredBy: string | null
  /** Managers: whether they hire and fire crew. */
  handlesCrew: boolean
  /** A rare tavern find. */
  rare: boolean
  /** Where they're from, which shows in how they dress. */
  region: import('./data/ports').RegionId
}

export function captainView(c: Captain): CaptainView {
  const dev = c.developmentKnown ? DEVELOPMENT.find((d) => d.id === c.development)! : null
  return {
    id: c.id,
    name: c.name,
    homePort: c.homePort,
    reputation: c.reputation,
    // Better terms raise what they'll sign for.
    fee: termsFee(c.fee, c.courting),
    skillBand: [
      Math.round(SKILL_IDS.reduce((n, id) => n + c.bands[id][0], 0) / SKILL_IDS.length),
      Math.round(SKILL_IDS.reduce((n, id) => n + c.bands[id][1], 0) / SKILL_IDS.length),
    ],
    skills: SKILLS.map((d) => ({ id: d.id, name: d.name, description: d.description, band: [...c.bands[d.id]] as [number, number], known: c.bands[d.id][1] - c.bands[d.id][0] < 99 })),
    potential: c.potentialKnown && c.potential !== 'none' ? c.potential : null,
    rank: c.rank ?? null,
    rankAbilities: (c.rankAbilities ?? []).map((id) => [...LEGEND_ABILITIES, ...MYTHIC_ABILITIES].find((a) => a.id === id)!),
    traits: c.rumours.map((r) => {
      const t = getTrait(r.traitId)
      return { id: t.id, name: t.name, description: t.description, rumour: t.rumour, status: r.status }
    }),
    verdict: c.verdict,
    knownDevelopment: dev ? { name: dev.name, description: dev.description } : null,
    voyageCount: c.voyageCount,
    watchesSpent: c.watchesSpent,
    scoutLevel: c.scoutLevel,
    role: c.role,
    managesTrack: c.managesTrack,
    bonded: c.bonded,
    severance: c.bonded ? 0 : severance(c),
    sailsTiers: captainTiers(c.reputation),
    hiredBy: c.hiredBy ?? null,
    handlesCrew: c.handlesCrew !== false,
    rare: !!c.rare,
    region: c.region ?? 'bay',
  }
}
