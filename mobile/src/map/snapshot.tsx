// The chart's base as pictures: drawn once per light and per known waters (and kept, so coming
// back to the chart is instant), then only moved and scaled while you look around.

import { Group, drawAsImage, type SkImage } from '@shopify/react-native-skia'
import type { RegionId } from '../../../src/game/data/ports'
import type { Light } from '../art/light'
import { ChartLayers, type Clearing } from './ChartBase'
import { LAND } from './geography'

/** A picture of part of the chart, and where it sits in map units. */
export type ChartImage = { image: SkImage; x: number; y: number; w: number; h: number }
type Snapshot = { world: ChartImage; detail: ChartImage }

/** All the land with sea round it: the furthest the chart goes. */
export const WORLD = (() => {
  const pts = LAND.flatMap((l) => l.pts)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs) - 300, y0: Math.min(...ys) - 300, x1: Math.max(...xs) + 300, y1: Math.max(...ys) + 300 }
})()

/** Pixels per map unit: the whole world softly (it's mostly cloud), the waters you know sharply. */
const WORLD_SCALE = 0.3
const DETAIL_SCALE = 1.5
const DETAIL_MAX_PX = 3200

/** Which regions the player had seen charted on the map, so a new one can be revealed. */
export const CHART_SEEN_KEY = 'harborline.chart.seen'

const cache = new Map<string, Snapshot>()

async function shoot(light: Light, openRegions: Set<RegionId>, clear: Clearing[], r: { x: number; y: number; w: number; h: number }, scale: number): Promise<ChartImage | null> {
  const width = Math.round(r.w * scale)
  const height = Math.round(r.h * scale)
  const image = await drawAsImage(
    <Group transform={[{ scale }, { translateX: -r.x }, { translateY: -r.y }]}>
      <ChartLayers light={light} openRegions={openRegions} clear={clear} />
    </Group>,
    { width, height },
  )
  return image ? { image, ...r } : null
}

/** The key a snapshot is kept under: what's charted, and the light. */
export const chartKey = (light: Light, clear: Clearing[]) => `${light.label}|${clear.map((h) => `${Math.round(h.x)},${Math.round(h.y)},${h.r}`).join(';')}`

/**
 * The chart's base, drawn once as pictures for this light and these known waters (and kept, so
 * coming back to the chart is instant). Null until the first is ready.
 */
export async function chartSnapshot(light: Light, openRegions: Set<RegionId>, clear: Clearing[]): Promise<Snapshot | null> {
  const key = chartKey(light, clear)
  const hit = cache.get(key)
  if (hit) return hit
  const w = { x: WORLD.x0, y: WORLD.y0, w: WORLD.x1 - WORLD.x0, h: WORLD.y1 - WORLD.y0 }
  const xs = clear.flatMap((h) => [h.x - h.r - 250, h.x + h.r + 250])
  const ys = clear.flatMap((h) => [h.y - h.r - 250, h.y + h.r + 250])
  const d = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  const world = await shoot(light, openRegions, clear, w, WORLD_SCALE)
  const detail = await shoot(light, openRegions, clear, d, Math.min(DETAIL_SCALE, DETAIL_MAX_PX / Math.max(d.w, d.h)))
  if (!world || !detail) return null
  const snap = { world, detail }
  cache.set(key, snap)
  // A few lights' and charts' worth is plenty.
  while (cache.size > 4) cache.delete(cache.keys().next().value!)
  return snap
}
