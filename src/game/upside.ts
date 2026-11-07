// What a trip in each weather has going for it, told in a few words for the send cards: the
// pay, the finds (rare, legendary and mythic parts, keepsakes) and charting. Read straight from
// the numbers that decide them, so it never says more than the sea gives.

import { WEATHER } from './data/weather'
import { KEEPSAKE_CHANCE } from './data/keepsakes'
import { CHART_POINTS } from './data/ports'
import { LEGENDARY_PART_CHANCE, MYTHIC_PART_CHANCE_STORM, RARE_PART_MIN_BOAT_TIER } from './data/economy'
import type { Weather } from './types'

export function weatherUpside(weather: Weather, boatTier: number, automated = false): string[] {
  const out: string[] = []
  const pay = Math.round((WEATHER[weather].payoutMult - 1) * 100)
  if (pay > 0) out.push(`+${pay}% pay`)
  if (!automated) {
    const rough = weather === 'rough' || weather === 'storm'
    if (rough && boatTier < RARE_PART_MIN_BOAT_TIER) out.push('rare parts')
    if (LEGENDARY_PART_CHANCE[weather] > 0) out.push(weather === 'storm' ? 'legendary parts ×4' : 'legendary parts')
    if (weather === 'storm' && MYTHIC_PART_CHANCE_STORM > 0) out.push('mythic parts')
    const keep = KEEPSAKE_CHANCE[weather] / KEEPSAKE_CHANCE.calm
    if (keep >= 1.5) out.push(`keepsakes ×${Math.round(keep)}`)
  }
  const chart = CHART_POINTS[weather] / CHART_POINTS.calm
  if (chart > 1) out.push(`charts ×${chart}`)
  return out
}
