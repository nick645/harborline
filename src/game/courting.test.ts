import { describe, expect, it } from 'vitest'
import type { Captain, GameState } from './types'
import { newGame, settle } from './state'
import { court, courtingOf, hireCaptain } from './crew'
import { courtingView, leadingRival, rivalStanding } from './courting'
import { newRecruit } from './captains'
import { createRng } from './rolls'
import { handCount } from './hands'
import type { WantId } from './data/courting'

const T0 = Date.UTC(2026, 0, 5)
const HOUR = 3600_000

/** A fresh 1-anchor recruit on the home quay, wanting exactly `wants`. */
function recruit(s: GameState, wants: WantId[]): Captain {
  const c = newRecruit(createRng(7), 'r1', [1, 1], T0)
  c.courting!.wants = wants
  c.courting!.known = []
  s.recruitPool.recruits[0] = c
  return c
}

describe('courting', () => {
  it('rivals gain ground over time, and the strongest finishes where it was set to', () => {
    const s = newGame(1, T0)
    const c = recruit(s, ['pay']).courting!
    const r = c.rivals[0]
    expect(rivalStanding(c, r, c.arrivedAt)).toBe(r.start)
    expect(rivalStanding(c, r, c.decidesAt)).toBe(r.finish)
    expect(leadingRival(c, c.decidesAt).standing).toBeGreaterThanOrEqual(c.rivals[1].finish)
  })

  it('aimed efforts move people much further than ones they do not care about', () => {
    let s = newGame(1, T0)
    recruit(s, ['pay', 'company'])
    const before = s.recruitPool.recruits[0].courting!.yours
    s = court(s, 'r1', 'terms', T0)
    const afterPay = s.recruitPool.recruits[0].courting!.yours
    expect(afterPay - before).toBeGreaterThan(15)
    expect(s.recruitPool.recruits[0].courting!.known).toContain('pay')

    let t = newGame(1, T0)
    recruit(t, ['company', 'storms'])
    const b2 = t.recruitPool.recruits[0].courting!.yours
    t = court(t, 'r1', 'terms', T0)
    expect(t.recruitPool.recruits[0].courting!.yours - b2).toBeLessThan(8)
    // Better terms raise what they'll sign for.
    expect(courtingOf(t, 'r1', T0)!.terms).toBe(1)
  })

  it('a drink tells you something they want, once per watch', () => {
    let s = newGame(1, T0)
    recruit(s, ['harbour', 'company'])
    const watches = s.recruitPool.watchesLeft
    s = court(s, 'r1', 'drink', T0)
    expect(s.recruitPool.recruits[0].courting!.known.length).toBe(1)
    expect(s.recruitPool.watchesLeft).toBe(watches - 1)
    expect(() => court(s, 'r1', 'drink', T0 + 60_000)).toThrow(/this watch/)
    expect(() => court(s, 'r1', 'drink', T0 + 6 * HOUR)).not.toThrow()
  })

  it('at their deadline they sign with you if you are level with every rival, and pay their fee', () => {
    const s = newGame(1, T0)
    const c = recruit(s, ['pay'])
    c.courting!.yours = 99
    c.courting!.walked = true // you courted them
    const coins = s.player.coins
    const after = settle(s, c.courting!.decidesAt + 1)
    expect(after.player.roster.some((x) => x.id === 'r1')).toBe(true)
    expect(after.player.roster.find((x) => x.id === 'r1')!.courting).toBeUndefined()
    expect(after.player.coins).toBeLessThan(coins)
    expect(after.recruitPool.recruits.some((x) => x.id === 'r1')).toBe(false)
  })

  it('nobody signs with a line that never courted them', () => {
    const s = newGame(1, T0)
    const c = recruit(s, ['pay'])
    c.courting!.yours = 99
    const after = settle(s, c.courting!.decidesAt + 1)
    expect(after.player.roster.some((x) => x.id === 'r1')).toBe(false)
  })

  it('behind at their deadline, they sign with a rival line and leave the quay', () => {
    const s = newGame(1, T0)
    const c = recruit(s, ['pay'])
    c.courting!.yours = 0
    c.courting!.terms = 1 // you courted them, so the log says where they went
    const after = settle(s, c.courting!.decidesAt + 1)
    expect(after.player.roster.some((x) => x.id === 'r1')).toBe(false)
    expect(after.recruitPool.recruits.some((x) => x.id === 'r1')).toBe(false)
    expect(after.log.some((e) => e.text.includes('signed with'))).toBe(true)
    // Someone new takes their place on the quay.
    expect(after.recruitPool.recruits).toHaveLength(s.recruitPool.recruits.length)
  })

  it('only someone won over signs before their time is up', () => {
    let s = newGame(1, T0)
    s.player.coins = 1e6
    recruit(s, ['pay'])
    expect(() => hireCaptain(s, 'r1', T0)).toThrow(/weighing up/)
    s.recruitPool.recruits[0].courting!.yours = 100
    s = hireCaptain(s, 'r1', T0)
    expect(s.player.roster.some((x) => x.id === 'r1')).toBe(true)
  })

  it('a hand signs at their deadline: aboard a docked boat, or waiting at home for one at sea', () => {
    const s = newGame(9, T0)
    s.player.coins = 1e6
    s.player.ownedBoats.push({ ...s.player.ownedBoats[0], id: 'big', classId: 'coastal-trawler', nickname: 'Big', captainId: null })
    const h = s.tavern!.hands[0]
    h.courting!.yours = 100
    h.courting!.walked = true
    const docked = settle(s, h.courting!.decidesAt + 1)
    expect(docked.player.deckhands!.find((x) => x.id === h.id)?.boatId).toBe('big')

    const away = structuredClone(s)
    away.player.ownedBoats.find((b) => b.id === 'big')!.state = 'sailing'
    away.player.ownedBoats.find((b) => b.id === 'big')!.etaMs = h.courting!.decidesAt + 10 * HOUR
    // Her boat is at sea: they sign on and wait at home, not aboard until she docks.
    const waiting = settle(away, h.courting!.decidesAt + 1)
    const signed = waiting.player.deckhands!.find((x) => x.id === h.id)!
    expect(signed.waiting).toBe(true)
    expect(handCount(waiting, 'big')).toBe(0)
  })

  it('what they really want never reaches the UI', () => {
    const s = newGame(1, T0)
    const c = recruit(s, ['storms', 'harbour'])
    c.courting!.heard = 'pay'
    const v = courtingView(c.courting!, T0) as unknown as Record<string, unknown>
    expect(v).not.toHaveProperty('wants')
    expect(JSON.stringify(v)).not.toContain('"storms"')
  })
})
