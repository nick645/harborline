// The sea chart's land, sea and cloud, drawn on the GPU (Skia) under the ports and routes:
// the sea and its swell, pale shallows along every shore, each piece of land in its climate's
// colour, rivers, a beach line and the coast's ink, the trees, pines, palms, peaks, mesas and
// dunes (merged into a handful of shapes per region, so thousands cost no more than a few),
// region names, and cloud over everything not yet charted. Drawn in map units under the camera.

import { useMemo } from 'react'
import { Platform } from 'react-native'
import { Canvas, Group, Path, PathOp, Rect, Skia, Text as SkText, matchFont, type SkPath } from '@shopify/react-native-skia'
import type { Climate, RegionId } from '../../../src/game/data/ports'
import { REGIONS } from '../../../src/game/data/ports'
import type { Light } from '../art/light'
import { mix } from '../art/paint'
import { LAND, RIVERS, ZONE_SHAPES, scatter, smooth, type Decor } from './geography'
import { PORTS } from '../../../src/game/data/ports'

/** What the land looks like from above in each climate. */
const LAND_COLOR: Record<Climate, string> = { temperate: '#6f8a52', forest: '#2f5040', tropical: '#c9c07a', snow: '#d8e0e8', desert: '#d8a868' }

const sk = (d: string) => Skia.Path.MakeFromSVGString(d)!

/** Coasts, zones and rivers, built once. */
const COASTS = LAND.map((l) => ({ climate: l.climate, path: sk(smooth(l.pts)) }))
const CONTINENTS = (() => {
  const p = Skia.Path.Make()
  for (const l of LAND) if (l.climate === 'by-zone') p.addPath(sk(smooth(l.pts)))
  return p
})()
const ZONES = ZONE_SHAPES.map((z) => ({ climate: z.climate, path: sk(smooth(z.pts)) }))
const RIVERS_P = RIVERS.map((pts) =>
  sk(pts.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : i === pts.length - 1 ? ` L ${p[0]} ${p[1]}` : ` Q ${p[0]} ${p[1]} ${(p[0] + pts[i + 1][0]) / 2} ${(p[1] + pts[i + 1][1]) / 2}`)).join('')),
)

/** One part of the decoration: its fill or stroke, colour key, and path, per region. */
type Part = 'trunk' | 'leafA' | 'leafB' | 'leafHi' | 'pineA' | 'pineB' | 'pineHi' | 'palmTrunk' | 'frond' | 'peak' | 'peakShade' | 'snowcap' | 'mesa' | 'mesaShade' | 'dune'
const PART_STYLE: Record<Part, { color: string; stroke?: number }> = {
  trunk: { color: '#5a3a2a', stroke: 3.5 },
  leafA: { color: '#4f7a3e' },
  leafB: { color: '#5f8a48' },
  leafHi: { color: '#7aa05a' },
  pineA: { color: '#1f3a2a' },
  pineB: { color: '#26442f' },
  pineHi: { color: '#335a40' },
  palmTrunk: { color: '#8a5a3a', stroke: 3.5 },
  frond: { color: '#3f8a5a', stroke: 4 },
  peak: { color: '#5a6470' },
  peakShade: { color: '#3f4650' },
  snowcap: { color: '#f3f6fa' },
  mesa: { color: '#b8603a' },
  mesaShade: { color: '#9a4a2a' },
  dune: { color: '#c99a5a', stroke: 4 },
}

const circle = (x: number, y: number, r: number) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `

function decorParts(d: Decor): [Part, string][] {
  const { x, y, s, v } = d
  switch (d.climate) {
    case 'temperate':
      return [
        ['trunk', `M${x} ${y} L ${x} ${y - 12 * s} `],
        [v > 0.5 ? 'leafA' : 'leafB', circle(x, y - 20 * s, 12 * s)],
        ['leafHi', circle(x + 5 * s, y - 24 * s, 5 * s)],
      ]
    case 'forest':
      return [
        [v > 0.5 ? 'pineA' : 'pineB', `M${x} ${y - 40 * s} L ${x - 13 * s} ${y} L ${x + 13 * s} ${y} Z `],
        ['pineHi', `M${x} ${y - 40 * s} L ${x + 13 * s} ${y} L ${x + 4 * s} ${y} Z `],
      ]
    case 'tropical':
      return [
        ['palmTrunk', `M${x} ${y} q ${4 * s} ${-16 * s} ${-2 * s} ${-32 * s} `],
        [
          'frond',
          `M${x - 2 * s} ${y - 32 * s} q ${-12 * s} ${-2 * s} ${-16 * s} ${7 * s} M${x - 2 * s} ${y - 32 * s} q ${12 * s} ${-2 * s} ${16 * s} ${7 * s} M${x - 2 * s} ${y - 32 * s} q ${-5 * s} ${-10 * s} ${-14 * s} ${-7 * s} M${x - 2 * s} ${y - 32 * s} q ${5 * s} ${-10 * s} ${14 * s} ${-7 * s} `,
        ],
      ]
    case 'snow':
      return [
        ['peak', `M${x - 26 * s} ${y} L ${x - 2 * s} ${y - 40 * s} L ${x + 24 * s} ${y} Z `],
        ['peakShade', `M${x - 2 * s} ${y - 40 * s} L ${x + 24 * s} ${y} L ${x + 6 * s} ${y} Z `],
        ['snowcap', `M${x - 11 * s} ${y - 25 * s} L ${x - 2 * s} ${y - 40 * s} L ${x + 8 * s} ${y - 24 * s} L ${x + 2 * s} ${y - 27 * s} L ${x - 3 * s} ${y - 22 * s} Z `],
      ]
    case 'desert':
      return v > 0.7
        ? [
            ['mesa', `M${x - 22 * s} ${y} L ${x - 14 * s} ${y - 22 * s} L ${x + 14 * s} ${y - 22 * s} L ${x + 22 * s} ${y} Z `],
            ['mesaShade', `M${x - 14 * s} ${y - 22 * s} L ${x + 14 * s} ${y - 22 * s} L ${x + 22 * s} ${y} L ${x + 8 * s} ${y} Z `],
          ]
        : [['dune', `M${x - 26 * s} ${y} q ${13 * s} ${-16 * s} ${26 * s} ${-8 * s} q ${13 * s} ${-8 * s} ${26 * s} ${8 * s} `]]
  }
}

/** Every decoration, merged by region and part into single paths. */
const DECOR: Record<string, { part: Part; path: SkPath }[]> = (() => {
  const acc: Record<string, Partial<Record<Part, string>>> = {}
  for (const d of scatter(PORTS, 96)) {
    const r = (acc[d.region] ??= {})
    for (const [part, path] of decorParts(d)) r[part] = (r[part] ?? '') + path
  }
  const out: Record<string, { part: Part; path: SkPath }[]> = {}
  for (const [region, parts] of Object.entries(acc)) out[region] = Object.entries(parts).map(([part, d]) => ({ part: part as Part, path: sk(d!) }))
  return out
})()

/** Where each region's name is written. */
const REGION_LABEL: Record<string, { x: number; y: number }> = {
  bay: { x: -560, y: 300 },
  fogbanks: { x: -560, y: -1100 },
  sunward: { x: 1450, y: 1150 },
  ironcliffs: { x: 1750, y: -1700 },
  lantern: { x: 2800, y: 700 },
}
const labelFont = matchFont({ fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 70, fontStyle: 'italic', fontWeight: 'bold' })

type View = { x: number; y: number; w: number; h: number }

export function ChartBase({ width, height, view, light, openRegions, clear }: { width: number; height: number; view: View; light: Light; openRegions: Set<RegionId>; clear: { x: number; y: number; r: number }[] }) {
  const night = light.stars > 0
  const c = (hex: string, t = 0.55) => mix(hex, light.silhouette, light.dim * t)
  const shallow = mix(light.sea, '#ffffff', night ? 0.08 : 0.22)
  const s = width / view.w

  // The cloud: everything outside the waters you know, built once per change of what you know.
  const clearKey = clear.map((h) => `${Math.round(h.x)},${Math.round(h.y)},${h.r}`).join(';')
  const fog = useMemo(() => {
    const world = Skia.Path.Make()
    world.addRect(Skia.XYWHRect(-8000, -8000, 16000, 16000))
    const known = Skia.Path.Make()
    for (const h of clear) known.addCircle(h.x, h.y, h.r)
    const cloud = Skia.Path.MakeFromOp(world, known, PathOp.Difference) ?? world
    // Billows over the whole bank, and puffs piled along its edge.
    const billow = Skia.Path.Make()
    const billowHi = Skia.Path.Make()
    const step = 170
    for (let y = -5200; y < 5600; y += step * 0.8) {
      for (let x = -4600; x < 6400; x += step) {
        const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
        ;(h > 0.5 ? billowHi : billow).addCircle(x + (h - 0.5) * step * 0.6, y + (((h * 7) % 1) - 0.5) * step * 0.5, step * (0.55 + h * 0.4))
      }
    }
    const edge = Skia.Path.Make()
    const outside = (x: number, y: number) => clear.every((k) => Math.hypot(k.x - x, k.y - y) > k.r - 10)
    for (const k of clear) {
      if (k.r < 300) continue
      for (let a = 0; a < 26; a++) {
        const x = k.x + Math.cos((a / 26) * Math.PI * 2) * k.r
        const y = k.y + Math.sin((a / 26) * Math.PI * 2) * k.r
        if (outside(x, y)) edge.addCircle(x, y, 70 + ((a * 37) % 30))
      }
    }
    return { cloud, billow, billowHi, edge }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearKey])

  const cloudBase = night ? '#3a2e46' : '#dcd6e0'
  const cloudHi = night ? '#4a3c58' : '#f2eef4'
  const cloudShade = night ? '#2e2438' : '#c6bfcc'

  return (
    <Canvas style={{ width, height, position: 'absolute', left: 0, top: 0 }}>
      <Rect x={0} y={0} width={width} height={height} color={light.sea} />
      <Group transform={[{ scale: s }, { translateX: -view.x }, { translateY: -view.y }]}>
        {/* Swell on the open sea */}
        {Array.from({ length: 22 }, (_, i) => -3200 + i * 300).map((y) => (
          <Path key={y} path={`M-3000 ${y} ${'q 60 -14 120 0 '.repeat(70)}`} color={light.seaLine} style="stroke" strokeWidth={3} opacity={0.22} />
        ))}
        {/* Shallows */}
        {COASTS.map((l, i) => (
          <Group key={`sh${i}`}>
            <Path path={l.path} color={shallow} style="stroke" strokeWidth={64} strokeJoin="round" opacity={0.35} />
            <Path path={l.path} color={shallow} style="stroke" strokeWidth={30} strokeJoin="round" opacity={0.5} />
          </Group>
        ))}
        {/* Land */}
        {COASTS.map((l, i) => (
          <Path key={`l${i}`} path={l.path} color={c(LAND_COLOR[l.climate === 'by-zone' ? 'temperate' : l.climate])} />
        ))}
        <Group clip={CONTINENTS}>
          {ZONES.map((z, i) => (
            <Group key={`z${i}`}>
              <Path path={z.path} color={c(LAND_COLOR[z.climate])} style="stroke" strokeWidth={60} opacity={0.35} />
              <Path path={z.path} color={c(LAND_COLOR[z.climate])} />
            </Group>
          ))}
        </Group>
        {RIVERS_P.map((p, i) => (
          <Group key={`r${i}`}>
            <Path path={p} color={shallow} style="stroke" strokeWidth={14} strokeCap="round" strokeJoin="round" opacity={0.9} />
            <Path path={p} color={light.sea} style="stroke" strokeWidth={7} strokeCap="round" strokeJoin="round" />
          </Group>
        ))}
        {COASTS.map((l, i) => (
          <Group key={`c${i}`}>
            <Path path={l.path} color={c('#e8d4a0', 0.5)} style="stroke" strokeWidth={7} opacity={0.75} />
            <Path path={l.path} color={c('#3a2a24', 0.4)} style="stroke" strokeWidth={2.4} opacity={0.85} />
          </Group>
        ))}
        {/* What grows on the land you know */}
        {[...openRegions].flatMap((r) =>
          (DECOR[r] ?? []).map(({ part, path }) => {
            const st = PART_STYLE[part]
            return <Path key={`${r}-${part}`} path={path} color={c(st.color, 0.5)} style={st.stroke ? 'stroke' : 'fill'} strokeWidth={st.stroke} strokeCap="round" />
          }),
        )}
        {REGIONS.filter((r) => openRegions.has(r.id)).map((r) => {
          const at = REGION_LABEL[r.id]
          const text = r.name.toUpperCase()
          return <SkText key={r.id} x={at.x - labelFont.measureText(text).width / 2} y={at.y} text={text} font={labelFont} color={night ? '#f3e7d8' : '#2b1f2c'} opacity={0.4} />
        })}
        {/* Cloud over the unknown */}
        <Group clip={fog.cloud}>
          <Rect x={-8000} y={-8000} width={16000} height={16000} color={cloudBase} />
          <Path path={fog.billow} color={cloudShade} opacity={0.5} transform={[{ translateX: 40 }, { translateY: 50 }]} />
          <Path path={fog.billow} color={cloudBase} />
          <Path path={fog.billowHi} color={cloudHi} />
        </Group>
        {/* Shores glimpsed through the cloud: the shape of the world, not yet its details */}
        <Group clip={fog.cloud}>
          {COASTS.map((l, i) => (
            <Path key={`g${i}`} path={l.path} color={night ? '#544462' : '#a89eb2'} opacity={0.8} />
          ))}
          {COASTS.map((l, i) => (
            <Path key={`go${i}`} path={l.path} color={night ? '#7a6a8a' : '#8a7e94'} style="stroke" strokeWidth={4} opacity={0.6} />
          ))}
          <Path path={fog.billowHi} color={cloudHi} opacity={0.3} />
        </Group>
        <Path path={fog.edge} color={cloudShade} opacity={0.35} transform={[{ translateX: 12 }, { translateY: 16 }]} />
        <Path path={fog.edge} color={cloudHi} opacity={0.95} />
      </Group>
    </Canvas>
  )
}
