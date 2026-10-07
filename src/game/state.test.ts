import { describe, expect, it } from 'vitest'
import {
  assignRoute,
  buyBoat,
  newGame,
  quoteVoyage,
  recallBoat,
  repairBoat,
  salvageBoat,
  salvageQuote,
  sellBoat,
  settle,
  settleAway,
} from './state'
import { createRng, rollConditionLoss } from './rolls'
import { routeDistance, voyagePayout } from './economy'
import { BOAT_CLASSES } from './data/boats'
import { ROUTES } from './data/routes'
import { SALVAGE_CONDITION, STARTING_COINS } from './data/economy'
import { deserialize, serialize } from './save'

const T0 = 1_000_000

describe('economy', () => {
  it('matches the spec payout formula', () => {
    const dinghy = BOAT_CLASSES[0]
    // 4 × 1.0 × 10 × 0.8 − 6 × 2 = 20, the spec's "~20 net per round trip"
    expect(voyagePayout(dinghy, 1, 10, 100)).toBe(20)
    // Below 50 condition, cargo pays 20% less
    expect(voyagePayout(dinghy, 1, 10, 49)).toBe(Math.round(32 * 0.8 - 12))
  })

  it('places routes near the intended distances', () => {
    expect(ROUTES.map(routeDistance)).toEqual([6, 10.1, 14.1, 20.2])
  })
})

describe('voyage lifecycle', () => {
  it('sails, pays on arrival, returns, and goes idle', () => {
    let s = newGame(42, T0)
    const boat = s.player.ownedBoats[0]
    const quote = quoteVoyage(s, boat.id, ROUTES[1].id)
    s = assignRoute(s, boat.id, ROUTES[1].id, T0)
    expect(s.player.ownedBoats[0].state).toBe('sailing')

    s = settle(s, T0 + quote.durationMs / 2 - 1)
    expect(s.player.coins).toBe(STARTING_COINS)

    s = settle(s, T0 + quote.durationMs / 2)
    expect(s.player.ownedBoats[0].state).toBe('returning')
    expect(s.player.coins).toBe(STARTING_COINS + quote.payout)

    s = settle(s, T0 + quote.durationMs)
    const b = s.player.ownedBoats[0]
    expect(b.state).toBe('idle')
    expect(b.condition).toBeGreaterThanOrEqual(97)
    expect(b.condition).toBeLessThanOrEqual(99)
    expect(s.voyages).toHaveLength(0)
  })

  it('settles a huge gap in one pass', () => {
    let s = newGame(1, T0)
    s = assignRoute(s, s.player.ownedBoats[0].id, ROUTES[0].id, T0)
    s = settle(s, T0 + 10 * 24 * 3600_000)
    expect(s.player.ownedBoats[0].state).toBe('idle')
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
      s = assignRoute(s, s.player.ownedBoats[0].id, ROUTES[2].id, T0)
      return serialize(settle(s, T0 + 3600_000))
    }
    expect(run()).toBe(run())
  })
})

describe('fleet actions', () => {
  it('starts with one small cargo and one small passenger boat', () => {
    const s = newGame(3, T0)
    expect(s.player.ownedBoats.map((b) => b.classId)).toEqual(['dinghy-hauler', 'water-taxi'])
  })

  it('buys and sells at 50%', () => {
    let s = newGame(3, T0)
    s.player.coins = 2500
    s = buyBoat(s, 'skiff')
    expect(s.player.coins).toBe(500)
    expect(s.player.ownedBoats).toHaveLength(3)
    s = sellBoat(s, s.player.ownedBoats[2].id)
    expect(s.player.coins).toBe(1500)
  })

  it('refuses to sell the last boat, buy a starter, or overspend', () => {
    let s = newGame(3, T0)
    s = sellBoat(s, s.player.ownedBoats[1].id)
    expect(() => sellBoat(s, s.player.ownedBoats[0].id)).toThrow()
    expect(() => buyBoat(s, 'dinghy-hauler')).toThrow()
    expect(() => buyBoat(s, 'skiff')).toThrow()
  })

  it('passenger boats sell into passenger demand', () => {
    const s = newGame(3, T0)
    const taxi = s.player.ownedBoats[1]
    const q = quoteVoyage(s, taxi.id, ROUTES[0].id)
    expect(q.demand).toBe(s.routes[0].demandPassenger)
  })

  it('repairs at 2 coins per point', () => {
    let s = newGame(3, T0)
    s.player.ownedBoats[0].condition = 40
    s = repairBoat(s, s.player.ownedBoats[0].id)
    expect(s.player.ownedBoats[0].condition).toBe(100)
    expect(s.player.coins).toBe(STARTING_COINS - 120)
  })
})

describe('queued trips', () => {
  it('runs back to back and then docks for the player', () => {
    let s = newGame(5, T0)
    const id = s.player.ownedBoats[0].id
    s = assignRoute(s, id, ROUTES[1].id, T0, 3)
    s = settleAway(s, T0 + 24 * 3600_000).state
    expect(s.player.ownedBoats[0].state).toBe('idle')
    expect(s.voyages).toHaveLength(0)
    // Nothing keeps running once the queue is done: no auto-pilot.
    const later = settleAway(s, T0 + 48 * 3600_000)
    expect(later.report.coinsEarned).toBe(0)
  })

  it('reports trips completed while away, at full rate', () => {
    let s = newGame(5, T0)
    s = assignRoute(s, s.player.ownedBoats[0].id, ROUTES[1].id, T0, 4)
    const { report } = settleAway(s, T0 + 24 * 3600_000)
    expect(report.tripsCompleted + report.sunk.length).toBeGreaterThanOrEqual(1)
    if (report.sunk.length === 0) expect(report.tripsCompleted).toBe(4)
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
    expect(s.player.ownedBoats[0].state).toBe('idle')
  })
})

describe('wear and sinking', () => {
  it('wears faster on a worn hull', () => {
    const avg = (condition: number) => {
      const rng = createRng(1)
      let total = 0
      for (let i = 0; i < 5000; i++) total += rollConditionLoss(rng, condition)
      return total / 5000
    }
    expect(avg(20)).toBeGreaterThan(avg(40))
    expect(avg(40)).toBeGreaterThan(avg(90))
  })

  it('sinks at 0, pays nothing for that trip, and can be salvaged', () => {
    let s = newGame(5, T0)
    const id = s.player.ownedBoats[0].id
    s.player.ownedBoats[0].condition = 1
    s = assignRoute(s, id, ROUTES[1].id, T0, 4)
    const { state, report } = settleAway(s, T0 + 3600_000)
    expect(report.sunk).toEqual([s.player.ownedBoats[0].nickname])
    expect(state.player.coins).toBe(STARTING_COINS)
    expect(state.player.ownedBoats[0].state).toBe('sunk')
    expect(() => assignRoute(state, id, ROUTES[0].id, T0)).toThrow()

    const fee = salvageQuote(state, id)
    expect(fee).toBe(100)
    const raised = salvageBoat(state, id)
    expect(raised.player.ownedBoats[0].state).toBe('idle')
    expect(raised.player.ownedBoats[0].condition).toBe(SALVAGE_CONDITION)
    expect(raised.player.coins).toBe(STARTING_COINS - fee)
  })

  it('never leaves a fleet stuck on the seabed', () => {
    const s = newGame(5, T0)
    for (const b of s.player.ownedBoats) b.state = 'sunk'
    s.player.coins = 30
    expect(salvageQuote(s, s.player.ownedBoats[0].id)).toBe(30)
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
