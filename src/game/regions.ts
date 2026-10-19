// The map grows as you chart it: which regions and ports are open, charting from completed
// trips, and the quays and taverns of every port beyond home. Internal helpers mutate the
// state they're given (callers clone first).

import type { GameState, Port, Weather } from './types'
import { CHART_POINTS, HOME_PORT_ID, PORT_POOLS, PORTS, REGIONS, getRegion, type RegionId } from './data/ports'
import { QUAY_REPUTATION } from './data/captains'
import { generateCaptain, recruitSlot } from './captains'
import { generateHand, newHandId } from './hands'

/** Where the fleet sails from. */
export function homeOf(state: GameState): string {
  return state.player.home ?? HOME_PORT_ID
}

export function getPortDef(id: string): Port {
  return PORTS.find((p) => p.id === id)!
}

export function regionOpen(state: GameState, id: RegionId): boolean {
  const r = getRegion(id)
  return r.chart === 0 || (state.charts?.[id] ?? 0) >= r.chart
}

export function portOpen(state: GameState, portId: string): boolean {
  return regionOpen(state, getPortDef(portId).region)
}

export function openPorts(state: GameState): Port[] {
  return PORTS.filter((p) => portOpen(state, p.id))
}

/** The next region to chart, with how far along it is; null once the whole map is open. */
export function chartingNext(state: GameState): { id: RegionId; name: string; points: number; needed: number; from: string[] } | null {
  const r = REGIONS.find((x) => !regionOpen(state, x.id))
  return r ? { id: r.id, name: r.name, points: state.charts?.[r.id] ?? 0, needed: r.chart, from: r.chartedFrom } : null
}

/** A completed trip to a port charts the region beyond it. Returns a region's name if this opened it. */
export function chartTrip(s: GameState, portId: string, weather: Weather): string | null {
  for (const r of REGIONS) {
    if (r.chart === 0 || regionOpen(s, r.id) || !r.chartedFrom.includes(portId)) continue
    s.charts ??= {}
    s.charts[r.id] = Math.min(r.chart, (s.charts[r.id] ?? 0) + CHART_POINTS[weather])
    if (s.charts[r.id] >= r.chart) return r.name
  }
  return null
}

/** New faces at every open port beyond home, each 6-hour slot, sized by the port. */
export function refreshPortPools(s: GameState, t: number) {
  const slot = recruitSlot(t)
  s.portPools ??= {}
  const range = QUAY_REPUTATION[s.player.maxTierReached]
  for (const p of openPorts(s)) {
    if (p.id === homeOf(s) || s.portPools[p.id]?.slot === slot) continue
    const size = PORT_POOLS[p.size]
    s.portPools[p.id] = {
      slot,
      recruits: Array.from({ length: size.captains }, () => {
        const c = generateCaptain(s.rng, `c${s.nextCaptainSeq++}`, range)
        c.homePort = p.name
        c.region = p.region
        return c
      }),
      hands: Array.from({ length: size.hands }, () => ({ ...generateHand(s.rng, newHandId(s)), region: p.region })),
      captain: null,
    }
  }
}
