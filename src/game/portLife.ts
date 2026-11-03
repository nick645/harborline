// Each port's trade and market day, as they bear on what a trip pays.

import { DAY_MS, LEAN_DOWN, LEAN_UP, MARKET_DAY_MULT, PORT_LIFE, type PortLife } from './data/portLife'
import type { Track } from './types'

export function portLife(portId: string): PortLife | undefined {
  return PORT_LIFE[portId]
}

/** The day of the week (0–6) at time t, counted from the start of game time. */
export const weekDay = (t: number) => Math.floor(t / DAY_MS) % 7

/** Is it this port's market day? */
export function marketDay(portId: string, t: number): boolean {
  const p = PORT_LIFE[portId]
  return !!p && weekDay(t) === p.marketDay
}

/** When its next market day starts (now, if it's on). */
export function nextMarketDay(portId: string, t: number): number {
  const p = PORT_LIFE[portId]
  if (!p) return Infinity
  const ahead = (p.marketDay - weekDay(t) + 7) % 7
  return ahead === 0 ? t : (Math.floor(t / DAY_MS) + ahead) * DAY_MS
}

/** How much a trip to this port pays for this track, against an even port on an ordinary day. */
export function portDemandMult(portId: string, track: Track, t: number): number {
  const p = PORT_LIFE[portId]
  if (!p) return 1
  const lean = p.lean === null ? 1 : p.lean === track ? LEAN_UP : LEAN_DOWN
  return lean * (marketDay(portId, t) ? MARKET_DAY_MULT : 1)
}
