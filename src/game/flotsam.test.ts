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
