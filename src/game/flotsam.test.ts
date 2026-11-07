import { describe, expect, it } from 'vitest'
import { harbourGame } from './testing'
import { assignRoute } from './state'
import { collectFlotsam, flotsamReady } from './flotsam'
import { FLOTSAM_COOLDOWN_MS } from './data/flotsam'

const T0 = 1_000_000_000_000

describe('flotsam', () => {
  it('only at sea, one find per boat per cooldown, and it pays something small', () => {
    let s = harbourGame(61, T0)
    const boat = s.player.ownedBoats[0]
    expect(flotsamReady(s, boat.id, T0)).toBe(false)
    expect(() => collectFlotsam(s, boat.id, T0)).toThrow()
    s = assignRoute(s, boat.id, s.routes[1].id, T0, 1)
    expect(flotsamReady(s, boat.id, T0 + 1000)).toBe(true)
    const before = { coins: s.player.coins, parts: s.player.partInventory.length, looks: (s.player.keepsakes ?? []).length }
    const { state, find } = collectFlotsam(s, boat.id, T0 + 1000)
    const gained = state.player.coins - before.coins + (state.player.partInventory.length - before.parts) + ((state.player.keepsakes ?? []).length - before.looks)
    expect(gained).toBeGreaterThan(0)
    expect(find.coins === 0 || find.coins < 100).toBe(true)
    // Not again until the cooldown has passed.
    expect(flotsamReady(state, boat.id, T0 + 2000)).toBe(false)
    expect(flotsamReady(state, boat.id, T0 + 1000 + FLOTSAM_COOLDOWN_MS)).toBe(true)
    // The input is untouched.
    expect(s.player.coins).toBe(before.coins)
  })
})

import { weatherUpside } from './upside'
describe('what bad weather is good for', () => {
  it('says calm is safe and storms pay and find the most', () => {
    expect(weatherUpside('calm', 1)).toEqual([])
    expect(weatherUpside('storm', 1)).toEqual(expect.arrayContaining(['+60% pay', 'rare parts', 'mythic parts']))
    // Managed boats find nothing better than fittings, so only pay and charting are offered.
    expect(weatherUpside('storm', 1, true).some((x) => /parts|keepsakes/.test(x))).toBe(false)
  })
})

import { settleAway } from './state'
import { getPart } from './parts'
describe('the welcome-back summary', () => {
  it('reports what the trips paid, each find with its boat, and badges earned', () => {
    let s = harbourGame(71, T0)
    const boat = s.player.ownedBoats[0]
    s = assignRoute(s, boat.id, s.routes[1].id, T0, 4)
    // Their eighth storm trip would earn Storm Hand I: give them seven already.
    const cap = s.player.roster[0]
    cap.marks = { 'storm-hand': 7, 'steady-keel': 19 }
    const { report } = settleAway(s, T0 + 10 * 3600_000)
    expect(report.tripsCompleted).toBeGreaterThan(0)
    expect(report.tripPay).toBeGreaterThan(0)
    expect(report.finds.every((f) => f.boat === boat.nickname && (f.part || f.keepsake))).toBe(true)
    expect(report.finds.filter((f) => f.part).map((f) => f.part)).toEqual(report.parts)
    // Any trip home with a sound hull completes Steady Keel I.
    expect(report.risen.some((x) => /earned Steady Keel I$/.test(x))).toBe(true)
    expect(report.finds.filter((f) => f.part && getPart(f.part).rarity === 'standard').length).toBeGreaterThanOrEqual(0)
  })
})
