// The land on the sea chart, in map units (the same space as port positions in data/ports.ts):
// a mainland that wraps the west and south and climbs into the eastern desert, a snowy northern
// coast split by Frostgate's fjord, and islands where the other ports sit. Ports keep their
// places; the coast is drawn round them, and kept clear of the sea lanes from Saltmarsh so a
// route never runs over land (checked by scripts/check-map.ts). Shapes are Claude's.

import type { Climate, RegionId } from '../../../src/game/data/ports'

export type Pt = [number, number]

export interface LandPiece {
  id: string
  /** Outline, clockwise, as rough vertices; drawn smoothed. */
  pts: Pt[]
  /** A fixed climate, or by position (the mainland runs through several). */
  climate: Climate | 'by-zone'
  /** The region it belongs to, for hiding it under cloud until charted (zoned: by position). */
  region: RegionId | 'by-zone'
}

/** A border that wanders: points along a line from a to b, nudged side to side. */
function wander(a: Pt, b: Pt, seed: number, amp: number, n = 18): Pt[] {
  const out: Pt[] = []
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const w = (Math.sin(t * 9 + seed) * 0.6 + Math.sin(t * 23 + seed * 2.1) * 0.4) * amp
    out.push([a[0] + dx * t + (-dy / len) * w, a[1] + dy * t + (dx / len) * w])
  }
  return out
}

/** The mainland's climates beyond the bay's: patches with wandering borders, laid over its
 * temperate land and clipped to its shore. */
export const ZONE_SHAPES: { climate: Climate; region: RegionId; pts: Pt[] }[] = [
  { climate: 'forest', region: 'fogbanks', pts: [[-3000, -4000], [1050, -4000], ...wander([1050, -4000], [1050, -150], 1, 0), ...wander([1050, -150], [-3000, -150], 2, 70)] },
  { climate: 'tropical', region: 'sunward', pts: [...wander([1060, -4000], [1060, 4000], 3, 90, 40), [2120, 4000], ...wander([2120, 4000], [2120, -4000], 4, 0, 2)] },
  { climate: 'desert', region: 'lantern', pts: [...wander([2120, -4000], [2120, 4000], 5, 90, 40), [6000, 4000], [6000, -4000]] },
]

/** Fractal coast: each edge broken into wiggles, smaller and smaller, quieter near harbours so
 * ports keep their shore and the lanes stay clear. Deterministic. */
export function roughen(pts: Pt[], seed: number, quiet: Pt[] = [], levels = 3): Pt[] {
  let s = seed * 9301 + 49297
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  let cur = pts
  for (let lv = 0; lv < levels; lv++) {
    const next: Pt[] = []
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i]
      const b = cur[(i + 1) % cur.length]
      next.push(a)
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (len < 18) continue
      const mx = (a[0] + b[0]) / 2
      const my = (a[1] + b[1]) / 2
      const near = Math.min(1, ...quiet.map((q) => Math.hypot(q[0] - mx, q[1] - my) / 140))
      const off = (rnd() - 0.5) * Math.min(len, 260) * 0.32 * near
      next.push([mx + (-(b[1] - a[1]) / len) * off, my + ((b[0] - a[0]) / len) * off])
    }
    cur = next
  }
  return cur
}

const MAINLAND: Pt[] = [
  // The west shore, from the far north down to Saltmarsh, with Wickstone's cape.
  [-900, -4000],
  [40, -4000],
  [40, -1900],
  [70, -1300],
  [30, -1000],
  [62, -790],
  [124, -702],
  [58, -632],
  [34, -480],
  [60, -260],
  [40, -40],
  [62, 200],
  [48, 420],
  [62, 540],
  // Saltmarsh, in the corner of the bay.
  [100, 602],
  [170, 652],
  // The south coast, low enough to keep the lanes east clear.
  [330, 700],
  [560, 690],
  [800, 720],
  [1040, 700],
  [1260, 726],
  [1480, 700],
  [1640, 690],
  // Saffron on its headland.
  [1700, 654],
  [1760, 676],
  [1900, 706],
  [2060, 640],
  [2200, 470],
  [2320, 310],
  // Lanternhold, then the desert coast climbing to the Last Light's cape.
  [2400, 202],
  [2470, 140],
  [2580, 40],
  [2650, -40],
  [2700, -98],
  [2760, -70],
  [2900, -160],
  [3500, -200],
  [3500, 4000],
  [-900, 4000],
]

/** The northern coast: Holdfast and Anvil Sound on its shore, Frostgate at the head of its fjord. */
const NORTH: Pt[] = [
  [1900, -452],
  [1760, -482],
  [1620, -512],
  [1460, -522],
  [1300, -500],
  [1380, -590],
  [1470, -700],
  [1545, -800],
  [1612, -898],
  [1600, -960],
  [1520, -960],
  [1420, -930],
  [1320, -890],
  [1200, -840],
  [1120, -860],
  [1090, -960],
  [1060, -1300],
  [1020, -1700],
  [1060, -4000],
  [2500, -4000],
  [2420, -1300],
  [2300, -900],
  [2180, -680],
  [2060, -540],
]

/** Rivers across the mainland, from inland to their mouths on the coast. */
export const RIVERS: Pt[][] = [
  [[380, 1300], [420, 1100], [360, 960], [440, 840], [400, 760], [450, 700]],
  [[1180, 1400], [1120, 1180], [1200, 1000], [1140, 860], [1170, 760], [1150, 718]],
  [[-300, -900], [-180, -760], [-120, -560], [-40, -420], [30, -380]],
]

/** An island round a port: the port on its shore, the island lying off in direction `dir`
 * (radians), long along that direction and narrower across it. */
function isleAt(px: number, py: number, r: number, stretch: number, dir: number, seed: number): Pt[] {
  return roughen(isleRaw(px, py, r, stretch, dir, seed), seed, [[px, py]], 2)
}

function isleRaw(px: number, py: number, r: number, stretch: number, dir: number, seed: number): Pt[] {
  const ux = Math.cos(dir)
  const uy = Math.sin(dir)
  const cx = px + ux * r * stretch * 0.95
  const cy = py + uy * r * stretch * 0.95
  const n = 16
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const wob = 1 + 0.16 * Math.sin(a * 3 + seed) + 0.09 * Math.sin(a * 5 + seed * 2.3)
    const along = Math.cos(a) * r * stretch * wob
    const across = Math.sin(a) * r * wob
    pts.push([cx + along * ux - across * uy, cy + along * uy + across * ux])
  }
  return pts
}

const HOME: Pt = [100, 600]

/** Every port, for the lanes (kept here so the chart needs no game state). */
const ALL_PORTS = [
  { id: 'gullwick', x: 300, y: 470 },
  { id: 'brindle', x: 260, y: 230 },
  { id: 'cobble', x: 650, y: 480 },
  { id: 'farhaven', x: 860, y: 330 },
  { id: 'mistle', x: 250, y: -400 },
  { id: 'greyhollow', x: 520, y: -560 },
  { id: 'wickstone', x: 120, y: -700 },
  { id: 'sealrock', x: 700, y: -300 },
  { id: 'coralby', x: 1350, y: 500 },
  { id: 'driftwood', x: 1500, y: 250 },
  { id: 'saffron', x: 1700, y: 650 },
  { id: 'holdfast', x: 1300, y: -500 },
  { id: 'frostgate', x: 1600, y: -900 },
  { id: 'anvil', x: 1900, y: -450 },
  { id: 'lanternhold', x: 2400, y: 200 },
  { id: 'ember', x: 2200, y: -200 },
  { id: 'lastlight', x: 2700, y: -100 },
]

/** Does this shape sit on any lane (its own only right at the port), or on other land? */
function blocks(pts: Pt[], own: string, land: Pt[][]): boolean {
  for (const l of ALL_PORTS) {
    const len = Math.hypot(l.x - HOME[0], l.y - HOME[1])
    // A lane needs clear water till it's this close to its own port.
    const stop = l.id === own ? len - 14 : len - 24
    for (let d = 24; d < stop; d += 3) {
      const x = HOME[0] + ((l.x - HOME[0]) * d) / len
      const y = HOME[1] + ((l.y - HOME[1]) * d) / len
      if (inside(x, y, pts)) return true
    }
    // Nor cover another port.
    if (l.id !== own && inside(l.x, l.y, pts)) return true
  }
  return pts.some(([x, y]) => land.some((o) => inside(x, y, o)))
}

/** The biggest island, in the best direction, that keeps every lane at sea. */
function fitIsle(port: { id: string; x: number; y: number }, want: number, stretch: number, seed: number, land: Pt[][]): Pt[] {
  const away = Math.atan2(port.y - HOME[1], port.x - HOME[0])
  // Straight on behind the port first, then swinging further and further round.
  const offs = [0, ...Array.from({ length: 24 }, (_, i) => (Math.ceil((i + 1) / 2) * 0.25) * (i % 2 ? -1 : 1))]
  for (let r = want; r >= 14; r -= 4) {
    // Small islands can't be long: they'd reach into the next lane.
    const st = r < 30 ? 1 : stretch
    for (const off of offs) {
      const pts = isleAt(port.x, port.y, r, st, away + off, seed)
      if (!blocks(pts, port.id, land)) return pts
    }
  }
  return isleAt(port.x, port.y, 16, 1, away, seed)
}

/** Islands, in the order they're fitted (bigger ones first get first pick of the water). */
const ISLES: { port: { id: string; x: number; y: number }; r: number; stretch: number; climate: Climate; region: RegionId }[] = [
  { port: { id: 'farhaven', x: 860, y: 330 }, r: 80, stretch: 1.4, climate: 'temperate', region: 'bay' },
  { port: { id: 'greyhollow', x: 520, y: -560 }, r: 92, stretch: 1.4, climate: 'forest', region: 'fogbanks' },
  { port: { id: 'coralby', x: 1350, y: 500 }, r: 82, stretch: 1.3, climate: 'tropical', region: 'sunward' },
  { port: { id: 'ember', x: 2200, y: -200 }, r: 72, stretch: 1.15, climate: 'desert', region: 'lantern' },
  { port: { id: 'brindle', x: 260, y: 230 }, r: 60, stretch: 1.2, climate: 'temperate', region: 'bay' },
  { port: { id: 'cobble', x: 650, y: 480 }, r: 56, stretch: 1.3, climate: 'temperate', region: 'bay' },
  { port: { id: 'gullwick', x: 300, y: 470 }, r: 50, stretch: 1.3, climate: 'temperate', region: 'bay' },
  { port: { id: 'mistle', x: 250, y: -400 }, r: 62, stretch: 1.3, climate: 'forest', region: 'fogbanks' },
  { port: { id: 'sealrock', x: 700, y: -300 }, r: 46, stretch: 1.2, climate: 'forest', region: 'fogbanks' },
  { port: { id: 'driftwood', x: 1500, y: 250 }, r: 62, stretch: 1.5, climate: 'tropical', region: 'sunward' },
]

function build(): LandPiece[] {
  const quiet: Pt[] = [HOME, ...ALL_PORTS.map((p) => [p.x, p.y] as Pt)]
  const pieces: LandPiece[] = [
    { id: 'mainland', pts: roughen(MAINLAND, 11, quiet), climate: 'by-zone', region: 'by-zone' },
    { id: 'north', pts: roughen(NORTH, 12, quiet), climate: 'snow', region: 'ironcliffs' },
  ]
  ISLES.forEach((i, k) => {
    const pts = fitIsle(i.port, i.r, i.stretch, k + 1, pieces.map((p) => p.pts))
    pieces.push({ id: i.port.id, pts, climate: i.climate, region: i.region })
  })
  return pieces
}

export const LAND: LandPiece[] = build()

/** Catmull-Rom through the vertices, as cubic Béziers: a soft, closed coastline. */
export function smooth(pts: Pt[]): string {
  const n = pts.length
  const p = (i: number) => pts[((i % n) + n) % n]
  let d = `M${p(0)[0].toFixed(1)} ${p(0)[1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1)
    const [x1, y1] = p(i)
    const [x2, y2] = p(i + 1)
    const [x3, y3] = p(i + 2)
    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  return `${d} Z`
}

export function inside(x: number, y: number, pts: Pt[]): boolean {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

/** The mainland's climate and region at a point (the bay's, unless a patch covers it). */
function zoneOn(x: number, y: number): { climate: Climate; region: RegionId } {
  for (let i = ZONE_SHAPES.length - 1; i >= 0; i--) {
    const z = ZONE_SHAPES[i]
    if (inside(x, y, z.pts)) return { climate: z.climate, region: z.region }
  }
  return { climate: 'temperate', region: 'bay' }
}

export type Decor = { x: number; y: number; climate: Climate; region: RegionId; s: number; v: number }

/** Trees, pines, palms, peaks and dunes scattered over the land, clear of the ports. */
export function scatter(ports: { x: number; y: number }[], step = 84): Decor[] {
  const out: Decor[] = []
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (const piece of LAND) {
    const xs = piece.pts.map((p) => p[0])
    const ys = piece.pts.map((p) => p[1])
    // Keep to where the chart can show; the mainland runs off far beyond it.
    const x0 = Math.max(Math.min(...xs), -500)
    const x1 = Math.min(Math.max(...xs), 3100)
    const y0 = Math.max(Math.min(...ys), -1500)
    const y1 = Math.min(Math.max(...ys), 1200)
    for (let y = y0; y < y1; y += step * 0.8) {
      for (let x = x0; x < x1; x += step) {
        const px = x + (rnd() - 0.5) * step * 0.8
        const py = y + (rnd() - 0.5) * step * 0.6
        if (!inside(px, py, piece.pts)) continue
        if (ports.some((p) => Math.hypot(p.x - px, p.y - py) < 95)) continue
        const z = piece.climate === 'by-zone' ? zoneOn(px, py) : { climate: piece.climate, region: piece.region as RegionId }
        out.push({ x: px, y: py, climate: z.climate, region: z.region, s: 0.85 + rnd() * 0.5, v: rnd() })
      }
    }
  }
  // Draw back to front.
  return out.sort((a, b) => a.y - b.y)
}
