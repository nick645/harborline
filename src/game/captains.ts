// Captains: generation, scouting, effects at sea, and how the truth comes out over voyages.
//
// Invariant: trueSkill, ceiling, hiddenTraits and an unknown development style never reach the
// UI. Components only ever see captainView(). A test enforces this.

import type { Captain, Exposure, GameState, RngState, Rumour, Track, Verdict, Weather } from './types'
import {
  BAND_MIN_WIDTH,
  BAND_NARROW_FACTOR,
  CEILING_HEADROOM,
  DEVELOPMENT,
  DEVELOPMENT_KNOWN_AFTER,
  DISPROVE_AFTER_TESTS,
  emptyExposure,
  FIRST_NAMES,
  GREEN_EXPIRES_AFTER,
  GROWTH,
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
  type TraitDef,
} from './data/captains'
import { nextFloat, nextInt, rollChance, rollNormal, rollPick, rollWeighted } from './rolls'

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
export function generateCaptain(rng: RngState, id: string, repRange: [number, number] = [1, 5]): Captain {
  const reps = Array.from({ length: repRange[1] - repRange[0] + 1 }, (_, i) => repRange[0] + i)
  const reputation = rollWeighted(rng, reps.map((r) => ({ item: r, weight: REPUTATION_WEIGHTS[r] })))
  const r = nextFloat(rng)
  const trueAnchors =
    r < REPUTATION_UNDERVALUED
      ? Math.min(5, reputation + 1)
      : r < REPUTATION_UNDERVALUED + REPUTATION_OVERRATED
        ? Math.max(1, reputation - 1)
        : reputation
  const trueSkill = Math.min(SKILL_MAX, Math.max(SKILL_MIN, nextInt(rng, trueAnchors * 20 - 19, trueAnchors * 20)))
  const ceiling = Math.min(100, trueSkill + nextInt(rng, 0, CEILING_HEADROOM))
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
    trueSkill,
    ceiling,
    development,
    developmentKnown: false,
    hiddenTraits,
    revealedTraits: [],
    rumours: [],
    skillBand: [1, 100],
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
  c.trueSkill = rollNormal(rng, 85, 5, 75, 98)
  c.ceiling = Math.min(100, c.trueSkill + nextInt(rng, 0, 8))
  if (!c.hiddenTraits.includes('lucky')) c.hiddenTraits[0] = 'lucky'
  c.reputation = 5
  c.fee = 0
  c.bonded = true
  c.rumours = []
  addRumour(rng, c, SCOUT_ACCURACY[1])
  return c
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

/** Replace the recruit pool if a new 6-hour slot has started. Mutates. */
export function refreshRecruitPool(s: GameState, t: number, level: number) {
  const slot = recruitSlot(t)
  if (s.recruitPool.slot === slot) return
  const range = QUAY_REPUTATION[s.player.maxTierReached]
  s.recruitPool = {
    slot,
    recruits: Array.from({ length: RECRUIT_POOL_SIZE }, () => generateCaptain(s.rng, `c${s.nextCaptainSeq++}`, range)),
    watchesLeft: watchesFor(level),
  }
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
}

export interface TripFacts {
  track: Track
  weather: Weather
  /** Departure time. */
  t: number
}

/**
 * What a captain does to a trip. 'true' uses everything they really are (the engine);
 * 'known' uses only what the player has learned: proven traits and the middle of the skill range.
 */
export function captainMods(c: Captain, trip: TripFacts, mode: 'true' | 'known'): CaptainMods {
  const m = { ...NO_MODS }
  const skill = mode === 'true' ? c.trueSkill : (c.skillBand[0] + c.skillBand[1]) / 2
  m.payoutMult *= 1 + (skill - 50) * SKILL_PAY_PER_POINT
  m.damageMult *= 1 - (skill - 50) * SKILL_DAMAGE_PER_POINT

  const rough = trip.weather === 'rough' || trip.weather === 'storm'
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
}

/**
 * Called when a captain completes a voyage. Mutates the captain: experience, growth, a
 * narrower skill range now and then, traits revealed by what they've been through, false
 * rumours put to rest. `revealEvery` is shorter aboard boats that bring traits out faster.
 */
export function recordVoyage(rng: RngState, c: Captain, trip: TripFacts, revealEvery = REVEAL_EVERY): VoyageNews {
  const news: VoyageNews = { proven: [], disproven: [], developmentRevealed: false, reputationChange: 0 }
  c.voyageCount++
  const exp: Exposure = c.exposure
  exp[trip.weather]++
  exp[trip.track]++
  if (isNight(trip.t)) exp.night++

  // Growth toward (or away from) their best, by development style.
  const g = GROWTH[c.development]
  const n = c.voyageCount - g.startAfter
  if (n > 0 && n % g.every === 0) {
    c.trueSkill = g.step > 0 ? Math.min(c.ceiling, c.trueSkill + g.step) : Math.max(SKILL_MIN, c.trueSkill + g.step)
    // Keep the displayed range honest if skill drifts out of it.
    if (c.trueSkill > c.skillBand[1]) c.skillBand = [c.skillBand[0] + 1, c.skillBand[1] + 1]
    if (c.trueSkill < c.skillBand[0]) c.skillBand = [c.skillBand[0] - 1, c.skillBand[1] - 1]
  }

  if (c.voyageCount % revealEvery === 0) {
    // The skill range tightens, but never to an exact number.
    const width = c.skillBand[1] - c.skillBand[0]
    const narrower = Math.max(BAND_MIN_WIDTH, Math.round(width * BAND_NARROW_FACTOR))
    if (narrower < width) c.skillBand = makeBand(rng, c.trueSkill, narrower)

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
  skillBand: [number, number]
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
    fee: c.fee,
    skillBand: [...c.skillBand] as [number, number],
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
