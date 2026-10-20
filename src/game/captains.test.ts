import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Captain, GameState, Weather } from './types'
import { assignRoute, buyBoat, craftBoat, newGame, quoteVoyage, settle, settleAway, getBoat, isAutomated } from './state'
import {
  assignCaptain,
  buyUpgrade,
  canManage,
  fireCaptain,
  hireCaptain,
  promoteCaptain,
  scoutRecruit,
  setManagerCrewing,
  setManaged,
  takeOverCaptain,
} from './crew'
import { captainView, generateCaptain, newRecruit, recordVoyage, verdictFor } from './captains'
import { createRng } from './rolls'
import { fleetCap, scoutLevel } from './upgrades'
import { naturalWeather } from './weather'
import { getPart } from './parts'
import { getBoatClass } from './economy'
import { HIRE_FEE, SCOUT_ACCURACY, SCOUT_BAND_WIDTH, skillToAnchors, WATCHES_BASE } from './data/captains'
import { WEATHER_SLOT_MS } from './data/weather'
import { ROUTES } from './data/routes'

const T0 = 1_000_000_000_000

function captain(seed: number, edit: Partial<Captain> = {}): Captain {
  return { ...generateCaptain(createRng(seed), 'cx'), ...edit }
}

/** Put a captain straight onto the roster and aboard a boat. */
function crew(s: GameState, boatIndex: number, edit: Partial<Captain> = {}): Captain {
  const c = captain(s.player.roster.length + 100, { id: `crew${s.player.roster.length}`, ...edit })
  s.player.roster.push(c)
  s.player.ownedBoats[boatIndex].captainId = c.id
  return c
}

function timeWith(s: GameState, routeId: string, weather: Weather): number {
  for (let t = T0; ; t += WEATHER_SLOT_MS) if (naturalWeather(s.rng.seed, routeId, t) === weather) return t
}

describe('generation', () => {
  it('reputation is right about 70% of the time, and fees follow reputation', () => {
    let right = 0
    let sleepers = 0
    for (let i = 0; i < 3000; i++) {
      const c = captain(i)
      if (skillToAnchors(c.trueSkill) === c.reputation) right++
      if (verdictFor(c) === 'sleeper') sleepers++
      expect(c.fee).toBeGreaterThanOrEqual(HIRE_FEE[c.reputation] * 0.9 - 10)
      expect(c.fee).toBeLessThanOrEqual(HIRE_FEE[c.reputation] * 1.1 + 10)
      expect(c.hiddenTraits.length).toBeGreaterThanOrEqual(2)
      expect(c.hiddenTraits.length).toBeLessThanOrEqual(4)
      expect(c.skillBand).toEqual([1, 100])
      expect(c.rumours).toHaveLength(1)
    }
    expect(right / 3000).toBeGreaterThan(0.65)
    expect(right / 3000).toBeLessThan(0.8)
    expect(sleepers / 3000).toBeGreaterThan(0.08)
  })
})

describe('scouting', () => {
  it('spends watches; the logbook gives a range that holds the truth; the run gives a verdict', () => {
    let s = newGame(1, T0)
    const r = s.recruitPool.recruits[0]
    expect(s.recruitPool.watchesLeft).toBe(WATCHES_BASE)
    s = scoutRecruit(s, r.id, 'logbook')
    const after = s.recruitPool.recruits[0]
    expect(after.skillBand[1] - after.skillBand[0]).toBe(SCOUT_BAND_WIDTH[1])
    expect(after.trueSkill).toBeGreaterThanOrEqual(after.skillBand[0])
    expect(after.trueSkill).toBeLessThanOrEqual(after.skillBand[1])
    s = scoutRecruit(s, r.id, 'run')
    expect(s.recruitPool.recruits[0].verdict).toBe(verdictFor(r))
    expect(s.recruitPool.watchesLeft).toBe(WATCHES_BASE - 2 - 3)
    expect(() => scoutRecruit(s, r.id, 'run')).toThrow()
    expect(() => scoutRecruit(scoutRecruit(s, r.id, 'ask'), r.id, 'logbook')).toThrow() // out of watches or nothing new
  })

  it('rumours are about as accurate as the scout level says', () => {
    let real = 0
    let n = 0
    for (let i = 0; i < 2000; i++) {
      const c = captain(i)
      const rumour = c.rumours[0]
      n++
      if (c.hiddenTraits.includes(rumour.traitId)) real++
    }
    expect(real / n).toBeGreaterThan(SCOUT_ACCURACY[1] - 0.05)
    expect(real / n).toBeLessThan(SCOUT_ACCURACY[1] + 0.05)
  })

  it('the pool refreshes every 6 hours with a fresh set of watches', () => {
    const s = newGame(1, T0)
    const first = s.recruitPool.recruits.map((c) => c.id)
    const later = settle(s, T0 + 6 * 3600_000)
    expect(later.recruitPool.recruits.map((c) => c.id)).not.toEqual(first)
    expect(later.recruitPool.watchesLeft).toBe(WATCHES_BASE)
  })
})

describe('hiring and firing', () => {
  it('hires for the fee and fires for severance that grows with voyages', () => {
    let s = newGame(1, T0)
    s.player.coins = 1e6
    const r = s.recruitPool.recruits[0]
    expect(() => hireCaptain(s, r.id, T0)).toThrow(/weighing up/)
    r.courting!.yours = 100 // won over
    s = hireCaptain(s, r.id, T0)
    expect(s.player.coins).toBe(1e6 - r.fee)
    const hired = () => s.player.roster.find((c) => c.id === r.id)!
    expect(hired()).toBeDefined()
    const fresh = captainView(hired()).severance
    hired().voyageCount = 50
    expect(captainView(hired()).severance).toBeGreaterThan(fresh)
    const before = s.player.coins
    s = fireCaptain(s, r.id, T0)
    expect(s.player.coins).toBe(before - Math.round(Math.min(r.fee * 0.2 + 50 * r.fee * 0.01, r.fee * 1.5)))
    expect(s.player.roster.find((c) => c.id === r.id)).toBeUndefined()
  })
})

describe('captains at sea', () => {
  it('skill and traits change what a trip pays, and the UI quote only knows what has been proven', () => {
    const s = newGame(1, T0)
    const t = timeWith(s, ROUTES[3].id, 'calm')
    const base = quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[3].id, t, 'true').payout
    crew(s, 0, { trueSkill: 100, hiddenTraits: ['haggler', 'thrifty'], skillBand: [1, 100] })
    const truth = quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[3].id, t, 'true').payout
    const known = quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[3].id, t).payout
    expect(truth).toBeGreaterThan(base)
    // Known: skill read as the middle of 1–100, no proven traits — close to an average captain.
    expect(Math.abs(known - base)).toBeLessThan(Math.abs(truth - base))
  })

  it('the skill range narrows with voyages but always holds the truth', () => {
    const rng = createRng(4)
    const c = captain(4)
    for (let i = 0; i < 200; i++) {
      recordVoyage(rng, c, { track: 'cargo', weather: 'calm', t: T0 })
      expect(c.trueSkill).toBeGreaterThanOrEqual(c.skillBand[0])
      expect(c.trueSkill).toBeLessThanOrEqual(c.skillBand[1])
    }
    expect(c.skillBand[1] - c.skillBand[0]).toBeLessThan(15)
    expect(c.skillBand[1] - c.skillBand[0]).toBeGreaterThanOrEqual(6)
    expect(c.developmentKnown).toBe(true)
  })

  it('storm traits only show themselves in storms', () => {
    const rng = createRng(5)
    const c = captain(5, { hiddenTraits: ['steady', 'fair-weather'], revealedTraits: [], rumours: [] })
    for (let i = 0; i < 100; i++) recordVoyage(rng, c, { track: 'cargo', weather: 'calm', t: T0 })
    expect(c.revealedTraits).toEqual([])
    for (let i = 0; i < 100; i++) recordVoyage(rng, c, { track: 'cargo', weather: 'storm', t: T0 })
    expect(c.revealedTraits.sort()).toEqual(['fair-weather', 'steady'])
  })

  it('a false rumour is disproven once the sea has tested it', () => {
    const rng = createRng(6)
    const c = captain(6, { hiddenTraits: ['haggler', 'thrifty'], rumours: [{ traitId: 'beloved', status: 'rumour' }] })
    for (let i = 0; i < 20; i++) recordVoyage(rng, c, { track: 'cargo', weather: 'calm', t: T0 })
    expect(c.rumours[0].status).toBe('rumour') // never carried passengers, so nothing to go on
    for (let i = 0; i < 10; i++) recordVoyage(rng, c, { track: 'passenger', weather: 'calm', t: T0 })
    expect(c.rumours[0].status).toBe('disproven')
  })

  it('a superstitious captain refuses a storm, and that is how you find out', () => {
    let s = newGame(1, T0)
    const c = crew(s, 0, { hiddenTraits: ['superstitious', 'haggler'], revealedTraits: [] })
    const t = timeWith(s, ROUTES[2].id, 'storm')
    // The UI quote doesn't know yet, so it doesn't warn.
    expect(quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[2].id, t).blocked).toBeNull()
    let err: unknown
    try {
      assignRoute(s, s.player.ownedBoats[0].id, ROUTES[2].id, t)
    } catch (e) {
      err = e
    }
    const revealed = (err as { state?: GameState }).state!
    expect(revealed.player.roster.find((x) => x.id === c.id)!.revealedTraits).toContain('superstitious')
    s = revealed
    expect(quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[2].id, t).blocked).not.toBeNull()
  })

  it('captains gain voyages when their boat completes trips', () => {
    let s = newGame(1, T0)
    const c = crew(s, 0)
    s = assignRoute(s, s.player.ownedBoats[0].id, ROUTES[0].id, timeWith(s, ROUTES[0].id, 'calm'), 3)
    s = settle(s, T0 + 30 * 24 * 3600_000)
    expect(s.player.roster.find((x) => x.id === c.id)!.voyageCount).toBeGreaterThan(0)
  })
})

describe('reputation and boat size', () => {
  it('the quay offers captains around your level', () => {
    const s = newGame(1, T0)
    expect(s.recruitPool.recruits.every((c) => c.reputation <= 2)).toBe(true)
    s.player.maxTierReached = 5
    const later = settle(s, T0 + 6 * 3600_000)
    expect(later.recruitPool.recruits.every((c) => c.reputation >= 3)).toBe(true)
  })

  it("captains only take boats that suit their standing", () => {
    const s = newGame(1, T0)
    s.player.ownedBoats.push({ ...s.player.ownedBoats[1], id: 'big', classId: 'cruise-ship', nickname: 'Big', captainId: null })
    const rookie = captain(3, { id: 'rookie', reputation: 1 })
    const star = captain(4, { id: 'star', reputation: 5 })
    s.player.roster.push(rookie, star)
    expect(() => assignCaptain(s, 'rookie', 'big')).toThrow(/tier 1–2/)
    expect(() => assignCaptain(s, 'star', s.player.ownedBoats[1].id)).toThrow(/tier 4–6/)
    expect(assignCaptain(s, 'star', 'big').player.ownedBoats.find((b) => b.id === 'big')!.captainId).toBe('star')
  })

  it('a good captain earns a bigger reputation at sea; an overrated one slips', () => {
    const rng = createRng(8)
    const sleeper = captain(8, { reputation: 1, trueSkill: 75, ceiling: 75, development: 'steady' })
    const allTalk = captain(9, { reputation: 4, trueSkill: 30, ceiling: 30, development: 'steady' })
    for (let i = 0; i < 40; i++) {
      recordVoyage(rng, sleeper, { track: 'cargo', weather: 'calm', t: T0 })
      recordVoyage(rng, allTalk, { track: 'cargo', weather: 'calm', t: T0 })
    }
    expect(sleeper.reputation).toBe(4)
    expect(allTalk.reputation).toBe(2)
  })
})

describe('the hidden truth never reaches the UI', () => {
  it('captainView carries no hidden fields', () => {
    const v = captainView(captain(1)) as unknown as Record<string, unknown>
    for (const key of ['trueSkill', 'ceiling', 'hiddenTraits', 'exposure']) expect(v).not.toHaveProperty(key)
    expect(v.knownDevelopment).toBeNull()
    expect(v).not.toHaveProperty('development')
  })

  it('no UI file, web or phone, touches a hidden captain field', () => {
    const root = join(__dirname, '..', '..')
    const dir = (...p: string[]) => readdirSync(join(root, ...p)).filter((f) => f.endsWith('.tsx')).map((f) => join(root, ...p, f))
    const files = [join(root, 'src', 'App.tsx'), ...dir('src', 'components'), join(root, 'mobile', 'App.tsx'), ...dir('mobile', 'src', 'components'), ...dir('mobile', 'src', 'screens')]
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const hidden of ['trueSkill', 'hiddenTraits', '.ceiling', '.development', "'true')", '.wants']) {
        expect(src.includes(hidden), `${f} mentions ${hidden}`).toBe(false)
      }
    }
  })
})

describe('port upgrades', () => {
  it('Berths raise the fleet cap; reaching tiers does too', () => {
    let s = newGame(1, T0)
    expect(fleetCap(s)).toBe(6)
    s.player.coins = 1e6
    s = buyUpgrade(s, 'berths', T0)
    expect(fleetCap(s)).toBe(7)
    s.player.maxTierReached = 3
    expect(fleetCap(s)).toBe(17)
  })

  it('a full harbour can always step up a tier', () => {
    let s = newGame(1, T0)
    s.player.coins = 1e6
    for (let i = 0; i < 4; i++) s = buyBoat(s, 'skiff', T0)
    expect(s.player.ownedBoats).toHaveLength(6)
    expect(() => buyBoat(s, 'skiff', T0)).toThrow(/harbour is full/)
    s = buyBoat(s, 'harbor-skiff', T0)
    expect(fleetCap(s)).toBe(10)
  })

  it('Scout Office and tier milestones raise the scout level, up to 5', () => {
    let s = newGame(1, T0)
    s.player.coins = 1e7
    expect(scoutLevel(s)).toBe(1)
    s = buyUpgrade(buyUpgrade(buyUpgrade(s, 'scout-office', T0), 'scout-office', T0), 'scout-office', T0)
    expect(scoutLevel(s)).toBe(3)
    s.player.maxTierReached = 6
    expect(scoutLevel(s)).toBe(5)
    expect(() => buyUpgrade(s, 'scout-office', T0)).toThrow()
  })

  it('Fuel Depot and Dry Dock lower costs', () => {
    let s = newGame(1, T0)
    s.player.coins = 1e6
    const t = timeWith(s, ROUTES[3].id, 'calm')
    const before = quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[3].id, t).payout
    s = buyUpgrade(s, 'fuel-depot', T0)
    expect(quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[3].id, t).payout).toBeGreaterThan(before)
  })
})

describe('delegation', () => {
  function veteranHarbor() {
    let s = newGame(2, T0)
    s.player.coins = 1e6
    s.player.maxTierReached = 4
    // A tier-4 boat makes the starters "below your top tier".
    s.player.ownedBoats.push({ ...s.player.ownedBoats[0], id: 'big', classId: 'short-sea-freighter', nickname: 'Big' })
    const vet = crew(s, 1, { voyageCount: 120 })
    s = promoteCaptain(s, vet.id, 'harbormaster', T0)
    return { s, vet }
  }

  it('promotion needs 100 voyages and the right tier', () => {
    const s = newGame(1, T0)
    const c = crew(s, 0, { voyageCount: 99 })
    s.player.maxTierReached = 4
    expect(() => promoteCaptain(s, c.id, 'dockhand', T0)).toThrow()
    c.voyageCount = 100
    s.player.maxTierReached = 2
    expect(() => promoteCaptain(s, c.id, 'dockhand', T0)).toThrow()
    s.player.maxTierReached = 3
    expect(promoteCaptain(s, c.id, 'dockhand', T0).player.roster.find((x) => x.id === c.id)!.role).toBe('dockhand')
  })

  it("a managed boat keeps working while you're away, at reduced pay, never in storms or for rare parts", () => {
    const { s: start, vet } = veteranHarbor()
    let s = start
    const dinghy = s.player.ownedBoats[0].id
    expect(canManage(s, vet.id, dinghy)).toMatch(/route/) // never sailed: nothing to re-run
    s = settle(assignRoute(s, dinghy, ROUTES[1].id, T0, 1), T0 + 3600_000)
    s = setManaged(s, dinghy, vet.id)
    expect(isAutomated(s, getBoat(s, dinghy))).toBe(true)
    expect(() => assignRoute(s, dinghy, ROUTES[2].id, T0 + 3600_000)).toThrow()
    const { state, report } = settleAway(s, T0 + 3600_000 + 8 * 3600_000)
    expect(report.tripsCompleted).toBeGreaterThan(20)
    expect(report.parts.every((id) => getPart(id).rarity === 'standard')).toBe(true)
    expect(state.voyages.filter((v) => v.boatId === dinghy).every((v) => v.weatherAtStart !== 'storm' && v.weatherAtStart !== 'rough')).toBe(true)
    expect(report.sunk).toEqual([])
  })

  it("managers can't take on top-tier boats or more than their share", () => {
    const { s, vet } = veteranHarbor()
    s.player.ownedBoats.forEach((b) => (b.currentRoute = ROUTES[0].id))
    expect(canManage(s, vet.id, 'big')).toMatch(/top-tier/)
  })
})

describe('managers and crew', () => {
  /** A harbormaster running the dinghy, which has sailed once and is now docked. */
  function managedDinghy() {
    let s = newGame(2, T0)
    s.player.coins = 1e6
    s.player.maxTierReached = 4
    s.player.ownedBoats.push({ ...s.player.ownedBoats[0], id: 'big', classId: 'short-sea-freighter', nickname: 'Big', captainId: null })
    const vet = crew(s, 1, { voyageCount: 120 })
    s = promoteCaptain(s, vet.id, 'harbormaster', T0)
    const dinghy = s.player.ownedBoats[0].id
    s = settle(assignRoute(s, dinghy, ROUTES[1].id, T0, 1), T0 + 3600_000)
    s = setManaged(s, dinghy, vet.id)
    return { s, vet, dinghy }
  }

  it("a manager hires a captain for a boat that has none, and it shows on your roster", () => {
    const { s: start, vet, dinghy } = managedDinghy()
    let s = start
    const starter = getBoat(s, dinghy).captainId!
    s.player.roster = s.player.roster.filter((c) => c.id !== starter) // nobody ashore to reuse
    getBoat(s, dinghy).captainId = null
    // Managers don't court: they sign someone the rival lines haven't got a hold on yet.
    s.recruitPool.recruits[0] = newRecruit(s.rng, 'fresh', [1, 1], T0 + 3600_000)
    s = settle(s, T0 + 1.25 * 3600_000)
    const hired = s.player.roster.find((c) => c.id === getBoat(s, dinghy).captainId)!
    expect(hired.hiredBy).toBe(vet.id)
    expect(s.log.some((e) => e.text.includes('hired'))).toBe(true)
  })

  it('a manager puts a captain who is ashore aboard before hiring anyone', () => {
    const { s: start, dinghy } = managedDinghy()
    let s = start
    const starter = getBoat(s, dinghy).captainId!
    getBoat(s, dinghy).captainId = null
    const rosterSize = s.player.roster.length
    s = settle(s, T0 + 2 * 3600_000)
    expect(getBoat(s, dinghy).captainId).toBe(starter)
    expect(s.player.roster).toHaveLength(rosterSize)
  })

  it('a manager lets go a poor captain they hired, but never one you took over', () => {
    const { s: start, vet, dinghy } = managedDinghy()
    const poor = (s: GameState) => {
      const c = s.player.roster.find((x) => x.id === getBoat(s, dinghy).captainId)!
      Object.assign(c, { hiredBy: vet.id, voyageCount: 25, revealedTraits: ['green', 'fair-weather'], hiddenTraits: ['green', 'fair-weather'], skillBand: [5, 15], trueSkill: 10, reputation: 1 })
      return c.id
    }
    let s = structuredClone(start)
    const id = poor(s)
    s = settle(s, T0 + 2 * 3600_000)
    expect(s.player.roster.some((c) => c.id === id)).toBe(false)

    let mine = structuredClone(start)
    const kept = poor(mine)
    mine = takeOverCaptain(mine, kept)
    mine = settle(mine, T0 + 2 * 3600_000)
    expect(mine.player.roster.some((c) => c.id === kept)).toBe(true)
  })

  it('with crew handling off, the manager leaves captains to you', () => {
    const { s: start, vet, dinghy } = managedDinghy()
    let s = setManagerCrewing(start, vet.id, false)
    getBoat(s, dinghy).captainId = null
    s = settle(s, T0 + 2 * 3600_000)
    expect(getBoat(s, dinghy).captainId).toBeNull()
  })
})

describe('the Derelict Queen', () => {
  it('arrives with a bonded captain who cannot be fired', () => {
    let s = newGame(1, T0)
    s.player.partInventory = [...getBoatClass('derelict-queen').requiredParts]
    s = craftBoat(s, 'derelict-queen', T0)
    const queen = s.player.ownedBoats.at(-1)!
    const c = s.player.roster.find((x) => x.id === queen.captainId)!
    expect(c.bonded).toBe(true)
    expect(c.hiddenTraits).toContain('lucky')
    expect(() => fireCaptain(s, c.id, T0)).toThrow()
    const other = captain(77, { id: 'other' })
    s.player.roster.push(other)
    expect(() => assignCaptain(s, other.id, queen.id)).toThrow()
  })
})
