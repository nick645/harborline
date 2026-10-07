import { describe, expect, it } from 'vitest'
import type { GameState, Weather } from './types'
import {
  assignRoute,
  buyBoat,
  craftBoat,
  meltGroups,
  meltSpares,
  newGame,
  quoteVoyage,
  recallBoat,
  repairBoat,
  repairQuote,
  salvageBoat,
  salvageQuote,
  scrapStandardParts,
  sellBoat,
  settle,
  settleAway,
} from './state'
import { createRng, rollConditionLoss } from './rolls'
import { getBoatClass, repairCostPerPoint, routeDistance, voyagePayout } from './economy'
import { missingAbilityIds } from './abilities'
import { naturalWeather, seasonAt, stormAlerts } from './weather'
import { dropChances, getPart, pickSet } from './parts'
import { BOAT_CLASSES } from './data/boats'
import { PARTS } from './data/parts'
import { ROUTES } from './data/routes'
import { SALVAGE_CONDITION, STANDARD_SCRAP_VALUE, STARTING_COINS } from './data/economy'
import { SEASON_LENGTH_MS, WEATHER_SLOT_MS } from './data/weather'
import { deserialize, serialize } from './save'

const T0 = 1_000_000_000_000

/** First time at or after `from` when a route has the given weather (for this game's seed). */
function timeWith(s: GameState, routeId: string, weather: Weather, from = T0): number {
  for (let t = from; t < from + 5000 * WEATHER_SLOT_MS; t += WEATHER_SLOT_MS) {
    if (naturalWeather(s.rng.seed, routeId, t) === weather) return t
  }
  throw new Error(`no ${weather} found`)
}

/** Add a boat of any class directly, bypassing shop and crafting rules. */
function give(s: GameState, classId: string): string {
  const id = `t${s.player.ownedBoats.length + 1}`
  s.player.ownedBoats.push({
    id,
    classId,
    nickname: id,
    condition: 100,
    captainId: null,
    currentRoute: null,
    state: 'idle',
    etaMs: null,
    dockedAt: T0,
  })
  return id
}

describe('catalog', () => {
  it('has 6 tiers, both tracks, and every ability resolves', () => {
    expect(new Set(BOAT_CLASSES.map((c) => c.sizeTier))).toEqual(new Set([1, 2, 3, 4, 5, 6]))
    expect(missingAbilityIds()).toEqual([])
    expect(new Set(BOAT_CLASSES.map((c) => c.id)).size).toBe(BOAT_CLASSES.length)
  })

  it('never sells legendary or mythic boats', () => {
    for (const c of BOAT_CLASSES.filter((c) => c.rarity === 'legendary' || c.rarity === 'mythic')) {
      expect(c.price).toBe(0)
      expect(c.requiredParts).toHaveLength(3)
    }
    const s = newGame(1, T0)
    s.player.coins = 1e12
    expect(() => buyBoat(s, 'the-ghost', T0)).toThrow()
    expect(() => buyBoat(s, 'grand-dame', T0)).toThrow()
  })

  it('every recipe part exists exactly once in the parts table', () => {
    const ids = PARTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of BOAT_CLASSES) for (const id of c.requiredParts) expect(ids).toContain(id)
  })
})

describe('economy', () => {
  it('matches the spec payout formula', () => {
    const dinghy = getBoatClass('dinghy-hauler')
    expect(voyagePayout(dinghy, 1, 10, 100)).toBe(20)
    expect(voyagePayout(dinghy, 1, 10, 49)).toBe(Math.round(32 * 0.8 - 12))
    // Weather multiplies cargo, never fuel.
    expect(voyagePayout(dinghy, 1, 10, 100, { grossMult: 1.6 })).toBe(Math.round(32 * 1.6 - 12))
  })

  it('places routes near the intended distances', () => {
    expect(ROUTES.map(routeDistance)).toEqual([6, 10.1, 14.1, 20.2])
  })
})

describe('weather', () => {
  it('is fixed within a slot and changes between slots', () => {
    const seen = new Set<Weather>()
    const start = Math.floor(T0 / WEATHER_SLOT_MS) * WEATHER_SLOT_MS
    for (let i = 0; i < 400; i++) {
      const t = start + i * WEATHER_SLOT_MS
      expect(naturalWeather(7, ROUTES[0].id, t + 1)).toBe(naturalWeather(7, ROUTES[0].id, t + WEATHER_SLOT_MS - 1))
      seen.add(naturalWeather(7, ROUTES[0].id, t))
    }
    expect(seen).toEqual(new Set(['calm', 'choppy', 'rough', 'storm']))
  })

  it('storms roughly double in winter', () => {
    const count = (season: string) => {
      let storms = 0
      let n = 0
      for (let t = 0; n < 20000; t += WEATHER_SLOT_MS) {
        if (seasonAt(t) !== season) {
          t += SEASON_LENGTH_MS - WEATHER_SLOT_MS
          continue
        }
        n++
        if (naturalWeather(3, ROUTES[1].id, t) === 'storm') storms++
      }
      return storms / n
    }
    expect(count('winter') / count('spring')).toBeGreaterThan(1.6)
  })

  it('pays more and wears harder in rough weather', () => {
    const s = newGame(5, T0)
    const boat = s.player.ownedBoats[0].id
    const calm = quoteVoyage(s, boat, ROUTES[3].id, timeWith(s, ROUTES[3].id, 'calm'))
    const storm = quoteVoyage(s, boat, ROUTES[3].id, timeWith(s, ROUTES[3].id, 'storm'))
    expect(storm.payout).toBeGreaterThan(calm.payout)
    expect(storm.lossRisk).toBe(0.08)
    expect(calm.lossRisk).toBe(0)
    const avg = (w: Weather, condition: number) => {
      const rng = createRng(1)
      let total = 0
      for (let i = 0; i < 4000; i++) total += rollConditionLoss(rng, w, condition)
      return total / 4000
    }
    expect(avg('storm', 90)).toBeGreaterThan(avg('calm', 90) * 10)
    // Worn hulls wear faster in the same weather.
    expect(avg('rough', 20)).toBeGreaterThan(avg('rough', 40))
    expect(avg('rough', 40)).toBeGreaterThan(avg('rough', 90))
  })
})

describe('storm alerts', () => {
  it('fires when a route with queued trips turns rough, and only then', () => {
    let s = newGame(5, T0)
    const route = ROUTES[3].id
    // Find a slot boundary where this route worsens into rough or storm.
    let at = 0
    for (let t = Math.ceil(T0 / WEATHER_SLOT_MS) * WEATHER_SLOT_MS; !at; t += WEATHER_SLOT_MS) {
      const now = naturalWeather(s.rng.seed, route, t)
      const before = naturalWeather(s.rng.seed, route, t - 1)
      const sev = { calm: 0, choppy: 1, rough: 2, storm: 3 }
      if (sev[now] >= 2 && sev[now] > sev[before]) at = t
    }
    expect(stormAlerts(s, at)).toEqual([]) // nobody queued there
    s = assignRoute(s, s.player.ownedBoats[0].id, route, at - 60_000, 4)
    expect(stormAlerts(s, at)).toEqual([{ routeId: route, weather: naturalWeather(s.rng.seed, route, at), boatIds: [s.player.ownedBoats[0].id] }])
    // A boat on its last trip won't sail again, so there's nothing to warn about.
    expect(stormAlerts(recallBoat(s, s.player.ownedBoats[0].id), at)).toEqual([])
  })
})

describe('voyage lifecycle', () => {
  it('sails, pays on arrival, returns, and goes idle', () => {
    let s = newGame(42, T0)
    const t = timeWith(s, ROUTES[1].id, 'calm')
    const boat = s.player.ownedBoats[0]
    const quote = quoteVoyage(s, boat.id, ROUTES[1].id, t)
    s = assignRoute(s, boat.id, ROUTES[1].id, t)
    expect(s.player.ownedBoats[0].state).toBe('sailing')
    s = settle(s, t + quote.durationMs / 2 - 1)
    expect(s.player.coins).toBe(STARTING_COINS)
    s = settle(s, t + quote.durationMs / 2)
    expect(s.player.ownedBoats[0].state).toBe('returning')
    expect(s.player.coins).toBe(STARTING_COINS + quote.payout)
    s = settle(s, t + quote.durationMs)
    expect(s.player.ownedBoats[0].state).toBe('idle')
    expect(s.player.ownedBoats[0].condition).toBeLessThan(100)
    expect(s.voyages).toHaveLength(0)
  })

  it('does not mutate its input', () => {
    const s = newGame(7, T0)
    const before = serialize(s)
    assignRoute(s, s.player.ownedBoats[0].id, ROUTES[0].id, T0)
    expect(serialize(s)).toBe(before)
  })

  it('is deterministic for a given seed', () => {
    const run = () => {
      let s = newGame(99, T0)
      s = assignRoute(s, s.player.ownedBoats[0].id, ROUTES[2].id, T0, 4)
      return serialize(settle(s, T0 + 3600_000))
    }
    expect(run()).toBe(run())
  })
})

describe('queued trips', () => {
  it('runs back to back and then docks for the player', () => {
    let s = newGame(5, T0)
    const id = s.player.ownedBoats[0].id
    s = assignRoute(s, id, ROUTES[1].id, T0, 3)
    s = settleAway(s, T0 + 24 * 3600_000).state
    expect(['idle', 'sunk']).toContain(s.player.ownedBoats[0].state)
    expect(s.voyages).toHaveLength(0)
    expect(settleAway(s, T0 + 48 * 3600_000).report.tripsCompleted).toBe(0)
  })

  it('caps the run at one tank of fuel', () => {
    const s = newGame(5, T0)
    const id = s.player.ownedBoats[0].id
    expect(() => assignRoute(s, id, ROUTES[0].id, T0, 5)).toThrow()
    expect(() => assignRoute(s, id, ROUTES[0].id, T0, 0)).toThrow()
  })

  it('recall finishes the current trip and comes home', () => {
    let s = newGame(5, T0)
    const id = s.player.ownedBoats[0].id
    s = assignRoute(s, id, ROUTES[1].id, T0, 4)
    s = recallBoat(s, id)
    s = settle(s, T0 + 3600_000)
    expect(['idle', 'sunk']).toContain(s.player.ownedBoats[0].state)
    expect(s.voyages).toHaveLength(0)
  })
})

describe('sinking and lost trips', () => {
  it('sinks at 0, pays nothing, and can be salvaged', () => {
    let s = newGame(5, T0)
    const id = s.player.ownedBoats[0].id
    s.player.ownedBoats[0].condition = 1
    const t = timeWith(s, ROUTES[1].id, 'choppy')
    s = assignRoute(s, id, ROUTES[1].id, t, 4)
    const { state, report } = settleAway(s, t + 3600_000)
    expect(report.sunk).toEqual([s.player.ownedBoats[0].nickname])
    expect(state.player.coins).toBe(STARTING_COINS)
    expect(state.player.ownedBoats[0].state).toBe('sunk')
    expect(() => assignRoute(state, id, ROUTES[0].id, t)).toThrow()
    expect(salvageQuote(state, id)).toBe(100)
    const raised = salvageBoat(state, id, t + 3600_000)
    expect(raised.player.ownedBoats[0].state).toBe('idle')
    expect(raised.player.ownedBoats[0].condition).toBe(SALVAGE_CONDITION)
  })

  it('never leaves a fleet stuck on the seabed', () => {
    const s = newGame(5, T0)
    for (const b of s.player.ownedBoats) b.state = 'sunk'
    s.player.coins = 30
    expect(salvageQuote(s, s.player.ownedBoats[0].id)).toBe(30)
  })

  it('storms sometimes take the cargo: no pay, no parts, home at low condition', () => {
    let lostSeen = 0
    for (let seed = 1; seed <= 60 && lostSeen === 0; seed++) {
      let s = newGame(seed, T0)
      const id = give(s, 'kingfisher') // control: never loses a trip
      const t = timeWith(s, ROUTES[3].id, 'storm')
      s = assignRoute(s, s.player.ownedBoats[0].id, ROUTES[3].id, t, 1)
      s = assignRoute(s, id, ROUTES[3].id, t, 1)
      const { state, report } = settleAway(s, t + 3600_000)
      expect(report.lost).not.toContain(id)
      if (report.lost.length) {
        lostSeen++
        expect(state.player.ownedBoats[0].condition).toBeLessThanOrEqual(10)
      }
    }
    expect(lostSeen).toBe(1)
  })
})

describe('parts and drops', () => {
  it('follows the drop table by weather and tier', () => {
    const s = newGame(1, T0)
    const ctx = (classId: string, weather: Weather) => ({
      state: s,
      boat: s.player.ownedBoats[0],
      cls: getBoatClass(classId),
      routeId: ROUTES[0].id,
      weather,
      t: T0,
    })
    const calm = dropChances(ctx('dinghy-hauler', 'calm'), {})
    expect(calm).toEqual({ mythic: 0, legendary: 0, rare: 0, standard: 0.25 })
    expect(dropChances(ctx('dinghy-hauler', 'rough'), {}).rare).toBe(0.08)
    expect(dropChances(ctx('dinghy-hauler', 'rough'), {}).legendary).toBe(0.005)
    expect(dropChances(ctx('short-sea-freighter', 'calm'), {}).rare).toBe(0.08)
    const storm = dropChances(ctx('dinghy-hauler', 'storm'), {})
    expect(storm.legendary).toBe(0.02)
    expect(storm.mythic).toBe(0.0005)
  })

  it('weights legendary drops toward sets already started', () => {
    const s = newGame(1, T0)
    s.player.partInventory = ['stormchaser-hull', 'stormchaser-engine']
    const rng = createRng(9)
    let hits = 0
    for (let i = 0; i < 3000; i++) if (pickSet(rng, s, 'legendary', 'cargo') === 'stormchaser') hits++
    // 6 cargo legendary sets; the started one has weight 5 vs 1 for the rest → 5/10.
    expect(hits / 3000).toBeGreaterThan(0.4)
  })

  it('never offers a set the player has finished', () => {
    const s = newGame(1, T0)
    give(s, 'stormchaser')
    const rng = createRng(2)
    for (let i = 0; i < 500; i++) expect(pickSet(rng, s, 'legendary', 'cargo')).not.toBe('stormchaser')
  })

  it('crafts a legendary from its exact set, instantly and free', () => {
    const s = newGame(1, T0)
    s.player.partInventory = ['stormchaser-hull', 'stormchaser-engine', 'kingfisher-specialty']
    expect(() => craftBoat(s, 'stormchaser', T0)).toThrow()
    s.player.partInventory.push('stormchaser-specialty')
    const after = craftBoat(s, 'stormchaser', T0)
    expect(after.player.coins).toBe(s.player.coins)
    expect(after.player.partInventory).toEqual(['kingfisher-specialty'])
    expect(after.player.ownedBoats.at(-1)!.classId).toBe('stormchaser')
    expect(() => sellBoat(after, after.player.ownedBoats.at(-1)!.id, T0)).toThrow()
  })

  it('buys a rare boat with coins plus its own rare part', () => {
    const s = newGame(1, T0)
    s.player.coins = 5000
    expect(() => buyBoat(s, 'pelican', T0)).toThrow()
    s.player.partInventory = ['pelican-hull']
    const after = buyBoat(s, 'pelican', T0)
    expect(after.player.coins).toBe(5000 - getBoatClass('pelican').price)
    expect(after.player.partInventory).toEqual([])
  })

  it('scraps standard parts for coins', () => {
    const s = newGame(1, T0)
    s.player.partInventory = ['std-cargo-hull', 'std-cargo-hull', 'pelican-hull']
    const after = scrapStandardParts(s)
    expect(after.player.coins).toBe(STARTING_COINS + 2 * STANDARD_SCRAP_VALUE)
    expect(after.player.partInventory).toEqual(['pelican-hull'])
  })

  it('melts three spare copies into one re-roll of the same rarity and slot', () => {
    const s = newGame(1, T0)
    s.player.partInventory = ['pelican-hull', 'pelican-hull', 'pelican-hull', 'tin-pail-hull', 'tin-pail-hull']
    expect(meltGroups(s)).toHaveLength(1)
    const after = meltSpares(s, 'rare', 'hull', 'cargo', T0)
    expect(after.player.partInventory).toHaveLength(3)
    const fresh = after.player.partInventory.find((id) => !['pelican-hull', 'tin-pail-hull'].includes(id))
    if (fresh) expect(getPart(fresh)).toMatchObject({ rarity: 'rare', type: 'hull' })
  })
})

describe('abilities', () => {
  it('The Errand halves trip time; Mirabel sells at 1.5 demand', () => {
    const s = newGame(1, T0)
    const errand = give(s, 'the-errand')
    const taxi = s.player.ownedBoats[1].id
    expect(quoteVoyage(s, errand, ROUTES[1].id, T0).durationMs).toBeLessThan(quoteVoyage(s, taxi, ROUTES[1].id, T0).durationMs * 0.6)
    const mirabel = give(s, 'the-mirabel')
    expect(quoteVoyage(s, mirabel, ROUTES[1].id, T0).demand).toBe(1.5)
  })

  it('Tin Pail repairs at half cost', () => {
    const s = newGame(1, T0)
    s.player.coins = 100_000
    const pail = give(s, 'tin-pail')
    s.player.ownedBoats.find((b) => b.id === pail)!.condition = 50
    const full = 50 * repairCostPerPoint(getBoatClass('tin-pail'))
    expect(repairQuote(s, pail)).toBe(full / 2)
    expect(repairBoat(s, pail).player.coins).toBe(100_000 - full / 2)
  })

  it('repairs cost more per point on bigger boats', () => {
    expect(repairCostPerPoint(getBoatClass('dinghy-hauler'))).toBe(2)
    expect(repairCostPerPoint(getBoatClass('skiff'))).toBe(2)
    expect(repairCostPerPoint(getBoatClass('harbor-skiff'))).toBe(22)
    expect(repairCostPerPoint(getBoatClass('container-ship'))).toBe(3300)
    // Crafted boats are valued at their tier's common price.
    expect(repairCostPerPoint(getBoatClass('grand-dame'))).toBe(3300)
  })

  it('Grand Dame lifts payouts while docked; Pageant lifts fleet demand', () => {
    const s = newGame(1, T0)
    const dinghy = s.player.ownedBoats[0].id
    const before = quoteVoyage(s, dinghy, ROUTES[3].id, T0).payout
    give(s, 'grand-dame')
    expect(quoteVoyage(s, dinghy, ROUTES[3].id, T0).payout).toBeGreaterThan(before)
    const s2 = newGame(1, T0)
    const d0 = quoteVoyage(s2, dinghy, ROUTES[3].id, T0).demand
    give(s2, 'pageant')
    expect(quoteVoyage(s2, dinghy, ROUTES[3].id, T0).demand).toBeCloseTo(d0 * 1.1)
  })

  it('Saint Elmo turns her route to storm', () => {
    let s = newGame(1, T0)
    const t = timeWith(s, ROUTES[2].id, 'calm')
    const elmo = give(s, 'saint-elmo')
    s = assignRoute(s, elmo, ROUTES[2].id, t)
    expect(quoteVoyage(s, s.player.ownedBoats[0].id, ROUTES[2].id, t).weather).toBe('storm')
  })

  it('The Ghost only leaves between midnight and 4am', () => {
    const s = newGame(1, T0)
    const ghost = give(s, 'the-ghost')
    const noon = new Date(2026, 0, 5, 12).getTime()
    const night = new Date(2026, 0, 5, 2).getTime()
    expect(() => assignRoute(s, ghost, ROUTES[0].id, noon)).toThrow()
    expect(() => assignRoute(s, ghost, ROUTES[0].id, night)).not.toThrow()
  })

  it('The Cormorant earns while docked', () => {
    const s = newGame(1, T0)
    give(s, 'the-cormorant')
    const after = settle(s, T0 + 3600_000)
    expect(after.player.coins).toBeGreaterThan(STARTING_COINS)
  })
})

describe('fleet actions', () => {
  it('gives every new boat a nickname nobody else in the fleet has', () => {
    let s = newGame(3, T0)
    s.player.coins = 1e6
    for (let i = 0; i < 30; i++) s = buyBoat(s, 'skiff', T0)
    const names = s.player.ownedBoats.map((b) => b.nickname)
    expect(new Set(names).size).toBe(names.length)
  })

  it('starts with one small cargo and one small passenger boat', () => {
    const s = newGame(3, T0)
    expect(s.player.ownedBoats.map((b) => b.classId)).toEqual(['dinghy-hauler', 'water-taxi'])
  })

  it('buys and sells commons at 50%', () => {
    let s = newGame(3, T0)
    s.player.coins = 2500
    s = buyBoat(s, 'skiff', T0)
    expect(s.player.coins).toBe(500)
    s = sellBoat(s, s.player.ownedBoats[2].id, T0)
    expect(s.player.coins).toBe(1500)
  })

  it('refuses to sell the last boat or buy a starter', () => {
    let s = newGame(3, T0)
    s = sellBoat(s, s.player.ownedBoats[1].id, T0)
    expect(() => sellBoat(s, s.player.ownedBoats[0].id, T0)).toThrow()
    expect(() => buyBoat(s, 'dinghy-hauler', T0)).toThrow()
  })
})

describe('save', () => {
  it('round-trips and rejects junk', () => {
    const s = newGame(11, T0)
    expect(deserialize(serialize(s))).toEqual(s)
    expect(deserialize('{nope')).toBeNull()
    expect(deserialize(JSON.stringify({ ...s, version: 999 }))).toBeNull()
  })
})
