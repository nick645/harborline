// Which looks a harbour has opened, and the keepsakes hand-run boats bring home from sea.

import { KEEPSAKE_CHANCE, KEEPSAKES, lookKey, STARTING_LOOKS, type KeepsakeDef, type KeepsakeGroup } from './data/keepsakes'
import { REGIONS, type RegionId } from './data/ports'
import { regionOpen } from './regions'
import { rollChance, rollPick } from './rolls'
import type { GameState, Weather } from './types'

type HomeStyle = NonNullable<GameState['player']['homeStyle']>

/** The looks a harbour already wore before keepsakes existed, so an old save loses nothing. */
function lookedBefore(style: HomeStyle | undefined): string[] {
  if (!style) return []
  const keys: string[] = []
  const groups: [KeepsakeGroup, unknown][] = [
    ['build', style.build],
    ['roofStyle', style.roofStyle],
    ['siding', style.siding],
    ['windows', style.windows],
    ['doorStyle', style.doorStyle],
    ['topper', style.topper],
    ['wall', style.wall],
    ['roof', style.roof],
    ['sign', style.sign],
    ['trim', style.trim],
    ['door', style.door],
    ['shutters', style.shutters],
    ['bunting', style.bunting],
    ['tavernWall', style.tavernWall],
    ['tavernFloor', style.tavernFloor],
    ['cloth', style.cloth],
    ['hanging', style.hanging],
  ]
  for (const [g, v] of groups) if (v !== undefined) keys.push(lookKey(g, v as string | number))
  for (const x of style.extras ?? []) keys.push(lookKey('extra', x))
  return keys
}

/** Every look this harbour can pick from. */
export function looksOpen(state: GameState): Set<string> {
  return new Set([...STARTING_LOOKS, ...(state.player.keepsakes ?? lookedBefore(state.player.homeStyle))])
}

export function lookOpen(state: GameState, group: KeepsakeGroup, value: string | number): boolean {
  return looksOpen(state).has(lookKey(group, value))
}

/** Older saves: keep what the harbour already wore (mutates; internal). */
export function migrateKeepsakes(s: GameState) {
  s.player.keepsakes ??= lookedBefore(s.player.homeStyle).filter((key) => !STARTING_LOOKS.includes(key))
}

/**
 * A trip home from `region` may bring a keepsake (mutates; internal). Storms are likelier to,
 * and a storm brings up the storm-only finds of those waters first. Waters with nothing left
 * to give bring nothing.
 */
export function rollKeepsake(s: GameState, region: RegionId, weather: Weather): KeepsakeDef | null {
  if (!rollChance(s.rng, KEEPSAKE_CHANCE[weather])) return null
  const open = looksOpen(s)
  const left = KEEPSAKES.filter((x) => x.region === region && !open.has(x.id) && (!x.storm || weather === 'storm'))
  if (!left.length) return null
  const stormy = left.filter((x) => x.storm)
  const found = rollPick(s.rng, stormy.length ? stormy : left)
  ;(s.player.keepsakes ??= []).push(found.id)
  return found
}

/** Where a look still at sea can be found, as the player is told it. */
export function whereFound(state: GameState, group: KeepsakeGroup, value: string | number): string {
  const k = KEEPSAKES.find((x) => x.id === lookKey(group, value))
  if (!k) return ''
  const where = regionOpen(state, k.region) ? REGIONS.find((r) => r.id === k.region)!.name.replace(/^The /, 'the ') : "waters you haven't charted yet"
  return `Look in ${where}${k.storm ? ', in a storm' : ''}.`
}
