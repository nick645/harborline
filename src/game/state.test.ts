import { describe, expect, it } from 'vitest'
import { assignRoute, buyBoat, newGame, quoteVoyage, repairBoat, sellBoat, settle, settleOffline } from './state'
import { routeDistance, voyagePayout } from './economy'
import { BOAT_CLASSES } from './data/boats'
import { ROUTES } from './data/routes'
import { OFFLINE_CAP_MS, STARTING_COINS } from './data/economy'
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
  it('buys and sells at 50%', () => {
    let s = newGame(3, T0)
    s = buyBoat(s, 'harbor-skiff')
    expect(s.player.coins).toBe(100)
    expect(s.player.ownedBoats).toHaveLength(2)
    s = sellBoat(s, s.player.ownedBoats[1].id)
    expect(s.player.coins).toBe(300)
  })

  it('refuses to sell the last boat or buy the starter', () => {
    const s = newGame(3, T0)
    expect(() => sellBoat(s, s.player.ownedBoats[0].id)).toThrow()
    expect(() => buyBoat(s, 'dinghy-hauler')).toThrow()
    expect(() => buyBoat(s, 'coastal-trawler')).toThrow()
  })

  it('repairs at 2 coins per point', () => {
    let s = newGame(3, T0)
    s.player.ownedBoats[0].condition = 40
    s = repairBoat(s, s.player.ownedBoats[0].id)
    expect(s.player.ownedBoats[0].condition).toBe(100)
    expect(s.player.coins).toBe(STARTING_COINS - 120)
  })
})

describe('offline progression', () => {
  it('pays half rate, capped at 8 hours', () => {
    let s = newGame(5, T0)
    s = assignRoute(s, s.player.ownedBoats[0].id, ROUTES[1].id, T0)
    s = settle(s, T0)
    const a = settleOffline(s, T0 + OFFLINE_CAP_MS)
    const b = settleOffline(s, T0 + 3 * OFFLINE_CAP_MS)
    expect(a.report.voyages).toBeGreaterThan(100)
    expect(b.report.voyages).toBe(a.report.voyages)
    expect(b.report.creditedMs).toBe(OFFLINE_CAP_MS)
    expect(a.state.player.ownedBoats[0].state).toBe('idle')
    expect(a.state.player.ownedBoats[0].condition).toBeLessThan(100)
  })

  it('pays nothing extra for boats that never had a route', () => {
    const s = newGame(5, T0)
    const { report } = settleOffline(s, T0 + OFFLINE_CAP_MS)
    expect(report.coinsEarned).toBe(0)
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
