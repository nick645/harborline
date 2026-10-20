// Courting: how someone looking for work leans between you and the rival lines over time, what
// each of your efforts does for them, and what the player may see of it.
//
// Invariant: `wants` is hidden. The UI only sees courtingView(): the rumour, the wants already
// shown to you, and the bearing.

import type { Boat, Courting, GameState, RngState } from './types'
import {
  CAPTAIN_RIVALS,
  CAPTAIN_WANTS,
  COURT_ACTIONS,
  DECIDE_HOURS,
  DRINK_COMPANY,
  HAND_DECIDE_HOURS,
  HAND_RIVAL_FINISH,
  HARBOUR_PER_DECOR,
  HARBOUR_PER_LEVEL,
  HARBOUR_WANT_MAX,
  RIVAL_FINISH,
  RIVAL_FINISH_PER_ANCHOR,
  RIVAL_START,
  RIVALS,
  SAFETY_PENALTY,
  SAFETY_WINDOW_MS,
  SHIP_BASE,
  SHIP_CAP,
  SHIP_PER_TIER,
  SHIP_RARITY,
  STORMS_PER_TRIP,
  TERMS_MAX,
  TERMS_PAY,
  TERMS_STEP,
  WANT_HEARD_ACCURACY,
  WANTS,
  WON_OVER_AT,
  WON_OVER_LEAD,
  YOURS_START,
  type CourtAction,
  type RivalId,
  type WantId,
} from './data/courting'
import { getBoatClass } from './economy'
import { HOME_PORT_ID, PORTS } from './data/ports'
import { nextFloat, nextInt, rollChance, rollPick, rollWeighted } from './rolls'

const HOUR = 60 * 60 * 1000
/** Drinks can be repeated once per watch, the same 6-hour slot the quay keeps. */
const DRINK_SLOT_MS = 6 * HOUR

const between = (rng: RngState, [lo, hi]: [number, number]) => lo + nextFloat(rng) * (hi - lo)

function pickWants(rng: RngState, n: number, handsOnly: boolean): WantId[] {
  const out: WantId[] = []
  while (out.length < n) {
    const pool = WANTS.filter((w) => !out.includes(w.id) && (!handsOnly || w.hands))
    out.push(rollWeighted(rng, pool.map((w) => ({ item: w.id, weight: w.weight }))))
  }
  return out
}

/**
 * A new courtship: who else is after them, what they want, and when they'll decide. `settled`
 * people were already on the quay when you got there (a new game, or back after a long time
 * away): they've been looking a while, so some decide soon.
 */
export function newCourting(rng: RngState, t: number, who: { reputation: number } | 'hand', settled = false): Courting {
  const hand = who === 'hand'
  const hours = hand ? HAND_DECIDE_HOURS : DECIDE_HOURS[who.reputation]
  // A little spread, so a quay full of people doesn't all decide at once.
  const span = Math.round(hours * HOUR * (0.85 + nextFloat(rng) * 0.3))
  const arrivedAt = settled ? t - Math.round(span * nextFloat(rng) * 0.75) : t
  const decidesAt = arrivedAt + span
  const ids = [...RIVALS.map((r) => r.id)]
  const rivals = Array.from({ length: hand ? 1 : CAPTAIN_RIVALS }, (_, i) => {
    const id = ids.splice(nextInt(rng, 0, ids.length - 1), 1)[0]
    const top = hand ? between(rng, HAND_RIVAL_FINISH) : between(rng, RIVAL_FINISH) + RIVAL_FINISH_PER_ANCHOR * ((who as { reputation: number }).reputation - 1)
    // The second rival is keen, but not as keen as the first.
    return { id, start: Math.round(between(rng, RIVAL_START)), finish: Math.round(i === 0 ? top : top * (0.6 + nextFloat(rng) * 0.3)) }
  })
  const wants = pickWants(rng, hand ? 1 : CAPTAIN_WANTS[(who as { reputation: number }).reputation], hand)
  const others = WANTS.filter((w) => !wants.includes(w.id) && (!hand || w.hands)).map((w) => w.id)
  const heard = rollChance(rng, WANT_HEARD_ACCURACY) || others.length === 0 ? rollPick(rng, wants) : rollPick(rng, others)
  return { arrivedAt, decidesAt, rivals, yours: Math.round(between(rng, YOURS_START)), wants, heard, known: [], drinkSlot: null, walked: false, shown: false, terms: 0 }
}

/** A rival's standing at time t: rising steadily from when they arrived to when they decide. */
export function rivalStanding(c: Courting, r: Courting['rivals'][number], t: number): number {
  const p = Math.min(1, Math.max(0, (t - c.arrivedAt) / Math.max(1, c.decidesAt - c.arrivedAt)))
  return Math.round(r.start + (r.finish - r.start) * p)
}

export function leadingRival(c: Courting, t: number): { id: RivalId; standing: number } {
  return c.rivals.map((r) => ({ id: r.id, standing: rivalStanding(c, r, t) })).sort((a, b) => b.standing - a.standing)[0]
}

/** You're at least level with every rival: at their deadline, they'd sign with you. */
export function leaning(c: Courting, t: number): boolean {
  return c.yours >= leadingRival(c, t).standing
}

/** So sold on you they'll sign before their time is up. */
export function wonOver(c: Courting, t: number): boolean {
  return c.yours >= WON_OVER_AT && c.yours >= leadingRival(c, t).standing + WON_OVER_LEAD
}

export function canSign(c: Courting | undefined, t: number): boolean {
  return !c || wonOver(c, t) || (t >= c.decidesAt && leaning(c, t))
}

/** Their fee once better terms are on the table. */
export function termsFee(fee: number, c: Pick<Courting, 'terms'> | undefined): number {
  return Math.round((fee * (1 + TERMS_STEP * (c?.terms ?? 0))) / 10) * 10
}

/** Your record and harbour, as people looking for work weigh them. */
function harbourValue(s: GameState, want: WantId, region: string | undefined, now: number): number {
  switch (want) {
    case 'safety': {
      const last = s.player.record?.lastSunkAt
      return last !== undefined && now - last < SAFETY_WINDOW_MS ? SAFETY_PENALTY : HARBOUR_WANT_MAX
    }
    case 'storms':
      return Math.min(HARBOUR_WANT_MAX, STORMS_PER_TRIP * (s.player.record?.stormTrips ?? 0))
    case 'region': {
      const home = PORTS.find((p) => p.id === (s.player.home ?? HOME_PORT_ID))
      return home?.region === (region ?? 'bay') ? HARBOUR_WANT_MAX : 0
    }
    case 'harbour': {
      const levels = Object.values(s.player.portUpgrades).reduce((n, l) => n + l, 0)
      const decor = (s.player.homeStyle?.decor ?? []).filter(Boolean).length
      return Math.min(HARBOUR_WANT_MAX, HARBOUR_PER_LEVEL * levels + HARBOUR_PER_DECOR * decor)
    }
    default:
      return 0
  }
}

/** The best boat to show them, from those docked at home. */
export function boatToShow(s: GameState, fits: (b: Boat) => boolean): Boat | null {
  const docked = s.player.ownedBoats.filter((b) => b.state === 'idle' && fits(b))
  const score = (b: Boat) => {
    const cls = getBoatClass(b.classId)
    return cls.sizeTier * 10 + (SHIP_RARITY[cls.rarity] ?? 0)
  }
  return docked.sort((a, b) => score(b) - score(a))[0] ?? null
}

/**
 * What one of your efforts does for them: how far they swing your way, and which of their wants
 * it shows you. Throws a message (via `refuse`) when it can't be done. Mutates `c`.
 */
export function applyCourt(
  s: GameState,
  c: Courting,
  action: CourtAction,
  now: number,
  opts: { region?: string; boat?: Boat | null },
  refuse: (why: string) => never,
): { gain: number; revealed: WantId[] } {
  const def = COURT_ACTIONS[action]
  let gain = def.base
  const revealed: WantId[] = []
  const reveal = (w: WantId) => {
    if (!c.known.includes(w)) {
      c.known.push(w)
      revealed.push(w)
    }
  }
  if (action === 'drink') {
    const slot = Math.floor(now / DRINK_SLOT_MS)
    if (c.drinkSlot === slot) refuse('You’ve had a drink with them this watch already')
    c.drinkSlot = slot
    if (c.wants.includes('company')) gain += DRINK_COMPANY
    // Over a drink, people say what they're after.
    const unknown = c.wants.filter((w) => !c.known.includes(w))
    if (unknown.length) reveal(unknown[0])
  } else if (action === 'harbour') {
    if (c.walked) refuse('They’ve seen your harbour')
    c.walked = true
    for (const w of c.wants) {
      const v = harbourValue(s, w, opts.region, now)
      if (v !== 0) {
        gain += v
        reveal(w)
      }
    }
  } else if (action === 'ship') {
    if (c.shown) refuse('They’ve seen your boats')
    const b = opts.boat
    if (!b) refuse('No boat docked at home they’d sail')
    c.shown = true
    if (c.wants.includes('ship')) {
      const cls = getBoatClass(b!.classId)
      gain += Math.min(SHIP_CAP, SHIP_BASE + SHIP_PER_TIER * cls.sizeTier + (SHIP_RARITY[cls.rarity] ?? 0))
      reveal('ship')
    }
  } else {
    if (c.terms >= TERMS_MAX) refuse('That’s as far as your terms go')
    c.terms++
    if (c.wants.includes('pay')) {
      gain += TERMS_PAY
      reveal('pay')
    }
  }
  c.yours = Math.min(100, c.yours + gain)
  return { gain, revealed }
}

/** Everything the player may see of a courtship. Never includes what they really want. */
export interface CourtingView {
  decidesAt: number
  yours: number
  leader: { id: RivalId; name: string; colors: [string, string]; standing: number }
  rivals: { id: RivalId; name: string; colors: [string, string]; standing: number }[]
  /** Your standing minus the leading rival's: above 0 they lean your way. */
  bearing: number
  leaning: boolean
  wonOver: boolean
  canSign: boolean
  heard: { id: WantId; name: string; heard: string }
  known: { id: WantId; name: string; hint: string }[]
  drinkReady: boolean
  walked: boolean
  shown: boolean
  terms: number
}

export function courtingView(c: Courting, t: number): CourtingView {
  const rivals = c.rivals
    .map((r) => {
      const def = RIVALS.find((x) => x.id === r.id)!
      return { id: r.id, name: def.name, colors: def.colors, standing: rivalStanding(c, r, t) }
    })
    .sort((a, b) => b.standing - a.standing)
  const want = (id: WantId) => WANTS.find((w) => w.id === id)!
  return {
    decidesAt: c.decidesAt,
    yours: c.yours,
    leader: rivals[0],
    rivals,
    bearing: c.yours - rivals[0].standing,
    leaning: leaning(c, t),
    wonOver: wonOver(c, t),
    canSign: canSign(c, t),
    heard: { id: c.heard, name: want(c.heard).name, heard: want(c.heard).heard },
    known: c.known.map((id) => ({ id, name: want(id).name, hint: want(id).hint })),
    drinkReady: c.drinkSlot !== Math.floor(t / DRINK_SLOT_MS),
    walked: c.walked,
    shown: c.shown,
    terms: c.terms,
  }
}

export function rivalName(id: RivalId): string {
  return RIVALS.find((r) => r.id === id)!.name
}
