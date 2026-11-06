// A port seen from the water. Behind: its region's skyline and a hillside of houses fading into
// the distance. Along the waterfront: a full street of buildings in its region's manner (board
// cottages in the bay, grey stone in the fog, plaster and awnings on the shoals, tall snowy
// houses under the cliffs, lamplit ones in the Reach), with the port's own landmark among them.
// In the harbour: small boats at their moorings, and lit windows trembling in the water after
// dark. In front: the quay you're standing on, with its bollards, crates, lamps and locals.
// Everything is picked from the port's seed, so no two ports are alike. Design space 358 × 210.

import { Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Port, Weather } from '../../../src/game/types'
import { STORM, type Light } from './light'
import { Fall } from './Climate'
import { CLIMATE_LOOK, GLOOM } from './climateLook'
import { getRegion, type RegionId } from '../../../src/game/data/ports'
import { lookFor } from './looks'
import { REGION_STYLE } from './regionStyle'
import { Walker } from './Walker'
import { useSceneClock } from './clock'
import { Stage } from './Stage'
import { hash, mix, shade } from './paint'
import { FarHouse, House, type HouseKind, type HouseSpec } from './port/House'
import { Landmark } from './port/Landmarks'
import { LANDMARK_SPAN } from './port/landmarkSpan'

const W = 358
const H = 210
const WATER = 150
const QUAY = 182

/** How a region builds: house kinds to pick from, roof pitch, trims. */
const BUILD: Record<RegionId, { kinds: HouseKind[]; pitch: number; trims: string[]; snow?: boolean; lanterns?: boolean }> = {
  bay: { kinds: ['cottage', 'cottage', 'cottage', 'warehouse', 'stone'], pitch: 1, trims: ['#f3e7d8', '#e9dcc4', '#2e1c19'] },
  fogbanks: { kinds: ['cottage', 'stone', 'cottage', 'tall'], pitch: 1.5, trims: ['#c9c4bc', '#e8eef2', '#3f4650'] },
  sunward: { kinds: ['plaster', 'plaster', 'plaster', 'cottage'], pitch: 0, trims: ['#f3efe6', '#ffffff', '#e9b23c'] },
  ironcliffs: { kinds: ['tall', 'tall', 'stone', 'warehouse'], pitch: 1.7, trims: ['#e8eef2', '#9ec0cf', '#2a2e36'], snow: true },
  lantern: { kinds: ['plaster', 'plaster', 'plaster', 'warehouse'], pitch: 0, trims: ['#f0e2c8', '#e9b23c', '#8a4a2a'], lanterns: true },
}

const FRONT: Record<Port['size'], number> = { village: 4, town: 6, city: 8 }
const BACK: Record<Port['size'], number> = { village: 5, town: 9, city: 14 }

/** A cheap seeded random stream for laying out a port. */
function picker(seed: number) {
  let s = seed || 1
  return () => {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) ^ Math.imul(s ^ (s >>> 13), 0x297a2d39)
    return ((s >>> 0) % 10000) / 10000
  }
}

/** A pine, its tip at (x, y), h tall. */
const pine = (x: number, y: number, h: number) =>
  `M${x} ${y} L ${x - h * 0.22} ${y + h * 0.4} L ${x - h * 0.1} ${y + h * 0.4} L ${x - h * 0.3} ${y + h * 0.75} L ${x - h * 0.12} ${y + h * 0.75} L ${x - h * 0.36} ${y + h} L ${x + h * 0.36} ${y + h} L ${x + h * 0.12} ${y + h * 0.75} L ${x + h * 0.3} ${y + h * 0.75} L ${x + h * 0.1} ${y + h * 0.4} L ${x + h * 0.22} ${y + h * 0.4} Z `

/** A palm, its foot at (x, base), h tall, fronds in one path. */
function Palm({ x, base, h, lean, trunk, frond }: { x: number; base: number; h: number; lean: number; trunk: string; frond: string }) {
  const tx = x + lean
  const ty = base - h
  return (
    <Group>
      <Path path={`M${x} ${base} C ${x + lean * 0.2} ${base - h * 0.5}, ${tx - lean * 0.3} ${ty + h * 0.2}, ${tx} ${ty}`} color={trunk} style="stroke" strokeWidth={h * 0.06} strokeCap="round" />
      <Path
        path={`M${tx} ${ty} q ${-h * 0.3} ${-h * 0.02} ${-h * 0.42} ${h * 0.2} M${tx} ${ty} q ${h * 0.3} ${-h * 0.02} ${h * 0.42} ${h * 0.2} M${tx} ${ty} q ${-h * 0.18} ${-h * 0.2} ${-h * 0.36} ${-h * 0.12} M${tx} ${ty} q ${h * 0.18} ${-h * 0.2} ${h * 0.36} ${-h * 0.12} M${tx} ${ty} q ${h * 0.04} ${-h * 0.2} ${h * 0.02} ${-h * 0.3}`}
        color={frond}
        style="stroke"
        strokeWidth={h * 0.08}
        strokeCap="round"
      />
    </Group>
  )
}

/** What stands far behind the town: the region's skyline. */
function Backdrop({ region, light, clock }: { region: RegionId; light: Light; clock: SharedValue<number> }) {
  const st = REGION_STYLE[region]
  const far = mix(mix(st.land, light.skyLow, 0.45), light.silhouette, light.dim * 0.6)
  const fogA = useDerivedValue(() => [{ translateX: ((clock.value / 120) % 420) - 60 }])
  const fogB = useDerivedValue(() => [{ translateX: -(((clock.value / 160) % 420) - 60) }])
  const snow = useDerivedValue(() => {
    let d = ''
    for (let i = 0; i < 26; i++) {
      const y = (((clock.value / 40 + i * 53) % 220) + 220) % 220 - 10
      const x = (i * 71 + Math.sin(clock.value / 900 + i) * 8) % 358
      d += `M${x - 1} ${y} a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0 Z `
    }
    return d
  })
  switch (region) {
    case 'bay':
      return <Path path={`M0 ${WATER} L 0 96 C 60 76, 120 80, 170 92 C 230 70, 300 74, 358 88 L 358 ${WATER} Z`} color={far} />
    case 'fogbanks': {
      // Forested hills, ridge behind ridge, dark with pines, the fog lying in the valleys.
      const pines = mix(mix('#24402f', light.skyLow, 0.3), light.silhouette, light.dim * 0.6)
      let ridge = ''
      for (let x = -10; x < 370; x += 11) ridge += pine(x + ((x * 7) % 5), 70 + Math.abs(Math.sin(x / 40)) * 22, 26 + ((x * 13) % 9))
      return (
        <Group>
          <Path path={`M-10 ${WATER} L -10 92 C 60 74, 120 84, 180 76 C 240 68, 300 82, 368 74 L 368 ${WATER} Z`} color={far} />
          <Path path={ridge} color={pines} />
          <Group transform={fogA} opacity={0.6}>
            <RoundedRect x={0} y={84} width={240} height={20} r={10} color="#e8eef2" />
          </Group>
          <Group transform={fogB} opacity={0.5}>
            <RoundedRect x={60} y={104} width={280} height={18} r={9} color="#e8eef2" />
          </Group>
        </Group>
      )
    }
    case 'sunward':
      // Green headlands and palms leaning out over the water.
      return (
        <Group>
          <Path path={`M0 ${WATER} L 0 112 C 80 96, 160 104, 240 94 C 290 90, 330 98, 358 100 L 358 ${WATER} Z`} color={mix(mix('#5a9a5a', light.skyLow, 0.3), light.silhouette, light.dim * 0.6)} />
          {[16, 46, 300, 334].map((x, i) => (
            <Palm key={x} x={x} base={WATER - 4} h={46 + (i % 2) * 12} lean={i < 2 ? 8 : -8} trunk={mix('#8a5a3a', light.silhouette, light.dim * 0.6)} frond={mix('#3f8a5a', light.silhouette, light.dim * 0.6)} />
          ))}
        </Group>
      )
    case 'ironcliffs':
      return (
        <Group>
          <Path path={`M-10 ${WATER} L 10 40 L 60 30 L 90 60 L 140 18 L 190 54 L 240 24 L 300 50 L 368 32 L 368 ${WATER} Z`} color={far} />
          <Path path="M10 40 L 60 30 L 70 42 L 40 46 Z M140 18 L 165 34 L 150 38 Z M240 24 L 268 36 L 250 40 Z M300 50 L 368 32 L 368 44 L 330 54 Z" color="#e8eef2" opacity={0.9} />
          <Path path={snow} color="#ffffff" opacity={0.7} />
        </Group>
      )
    case 'lantern': {
      // Red-rock mesas behind rolling dunes, date palms at an oasis, lanterns strung at night.
      const rock = mix(mix('#b8603a', light.skyLow, 0.35), light.silhouette, light.dim * 0.6)
      const dune = mix(mix('#e8c48a', light.skyLow, 0.2), light.silhouette, light.dim * 0.6)
      return (
        <Group>
          <Path path={`M-10 ${WATER} L -10 84 L 40 84 L 52 70 L 104 70 L 116 86 L 220 90 L 236 64 L 300 64 L 312 82 L 368 86 L 368 ${WATER} Z`} color={rock} />
          <Path path={`M60 70 h 40 M240 64 h 56`} color={shade(rock, 0.25)} style="stroke" strokeWidth={2} />
          <Path path={`M-10 ${WATER} L -10 118 C 50 100, 110 112, 170 104 C 230 96, 300 112, 368 104 L 368 ${WATER} Z`} color={dune} />
          <Path path={`M40 112 C 80 104, 120 108, 150 106 M210 100 C 250 98, 300 106, 340 104`} color={mix(dune, '#ffffff', 0.25)} style="stroke" strokeWidth={1.2} opacity={0.6} />
          {[22, 330].map((x, i) => (
            <Palm key={x} x={x} base={WATER - 2} h={40} lean={i ? -6 : 6} trunk={mix('#8a5a3a', light.silhouette, light.dim * 0.6)} frond={mix('#5a7a3a', light.silhouette, light.dim * 0.6)} />
          ))}
          {light.stars > 0 && (
            <Group>
              <Path path={`M0 96 Q 90 112 180 98 Q 270 86 358 100`} color="#3a2420" style="stroke" strokeWidth={0.6} />
              {Array.from({ length: 14 }, (_, i) => (
                <Circle key={i} cx={12 + i * 25} cy={i < 7 ? 96 + Math.sin((i / 7) * Math.PI) * 10 : 98 - Math.sin(((i - 7) / 7) * Math.PI) * 8} r={2} color="#ffb054" />
              ))}
            </Group>
          )}
        </Group>
      )
    }
  }
}

/** A small boat at her mooring, nodding on the swell. */
function Moored({ x, y, color, mast, clock, i, lit }: { x: number; y: number; color: string; mast: boolean; clock: SharedValue<number>; i: number; lit: (c: string) => string }) {
  const bob = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 800 + i * 1.7) * 1.2 }, { rotate: Math.sin(clock.value / 1100 + i) * 0.04 }])
  return (
    <Group transform={bob} origin={{ x: x + 12, y }}>
      <Path path={`M${x} ${y - 4} L ${x + 26} ${y - 4} L ${x + 22} ${y + 2} L ${x + 4} ${y + 2} Z`} color={lit(color)} />
      <Path path={`M${x} ${y - 4} H ${x + 26}`} color={lit('#f3e7d8')} style="stroke" strokeWidth={0.9} />
      {mast ? (
        <Group>
          <Path path={`M${x + 12} ${y - 4} V ${y - 30}`} color={lit('#4a2e22')} style="stroke" strokeWidth={1.1} />
          <Path path={`M${x + 12.5} ${y - 28} L ${x + 22} ${y - 7} L ${x + 12.5} ${y - 7} Z`} color={lit('#e9dcc4')} />
        </Group>
      ) : (
        <Rect x={x + 14} y={y - 10} width={7} height={6} color={lit('#efe3d2')} />
      )}
    </Group>
  )
}

export function PortScene({ width, height, light, port, weather = 'calm' }: { width: number; height?: number; light: Light; port: Port; weather?: Weather }) {
  const clock = useSceneClock()
  const st = REGION_STYLE[port.region]
  const build = BUILD[port.region]
  const climate = getRegion(port.region).climate
  const seed = hash(port.id)
  const sky = mix(light.sky, st.tint, st.tintAmount)
  const skyLow = mix(light.skyLow, st.tint, st.tintAmount)
  const sea = mix(light.sea, st.tint, st.tintAmount * 0.7)
  const night = light.stars > 0
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.75)
  const haze = (c: string) => mix(mix(c, skyLow, 0.35), light.silhouette, light.dim * 0.7)
  const waves = useDerivedValue(() => [{ translateX: -((clock.value / 80) % 36) }])
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const shimmer = useDerivedValue(() => 0.35 + 0.2 * Math.sin(clock.value / 450))
  const clouds = useDerivedValue(() => [{ translateX: ((clock.value / 300) % 500) - 120 }])
  const gull = useDerivedValue(() => {
    const t = clock.value / 1000
    return [{ translateX: ((t * 14 + (seed % 200)) % 440) - 40 }, { translateY: 40 + Math.sin(t * 0.7) * 8 }]
  })
  const flap = useDerivedValue(() => {
    const f = Math.sin(clock.value / 120) * 3
    return `M-6 ${f * 0.3} Q -3 ${-f} 0 0 Q 3 ${-f} 6 ${f * 0.3}`
  })

  // Lay the town out from the port's seed: the hillside behind, then the waterfront street,
  // leaving the landmark's stretch clear.
  const r = picker(seed)
  const span = LANDMARK_SPAN[port.id] ?? [W, W]
  const hill = `M0 ${WATER} L 0 ${118 + r() * 10} C 90 ${104 + r() * 12}, 200 ${108 + r() * 12}, 260 ${112 + r() * 10} C 300 ${110 + r() * 8}, 340 ${116 + r() * 8}, 358 ${120 + r() * 6} L 358 ${WATER} Z`
  const back = Array.from({ length: BACK[port.size] }, (_, i) => {
    const w = 9 + r() * 7
    return { x: 4 + (i / BACK[port.size]) * (W - 16) + r() * 6, base: WATER - 10 - r() * 18, w, h: 7 + r() * 7, wall: st.walls[Math.floor(r() * st.walls.length)], roof: st.roofs[Math.floor(r() * st.roofs.length)] }
  }).sort((a, b) => a.base - b.base)

  const front: HouseSpec[] = []
  const free = [
    [4, span[0] - 4],
    [span[1] + 4, W - 4],
  ].filter(([a, b]) => b - a > 24)
  const tall = port.size === 'city' ? 18 : port.size === 'town' ? 10 : 0
  for (const [a, b] of free) {
    let x = a
    const share = Math.max(1, Math.round((FRONT[port.size] * (b - a)) / (W - (span[1] - span[0]))))
    const avg = (b - a) / share
    while (x < b - 20) {
      const kind = build.kinds[Math.floor(r() * build.kinds.length)]
      const w = Math.min(b - x, Math.max(24, avg * (0.75 + r() * 0.4)) * (kind === 'tall' ? 0.75 : kind === 'warehouse' ? 1.25 : 1))
      if (w < 20) break
      front.push({
        x,
        w,
        h: (kind === 'tall' ? 46 : kind === 'warehouse' ? 30 : 28) + r() * 16 + tall * r(),
        kind,
        wall: st.walls[Math.floor(r() * st.walls.length)],
        roof: st.roofs[Math.floor(r() * st.roofs.length)],
        trim: build.trims[Math.floor(r() * build.trims.length)],
        bits: Math.floor(r() * 0xffff),
        pitch: kind === 'plaster' ? 0 : build.pitch * (0.85 + r() * 0.3),
        snow: build.snow,
        lanterns: build.lanterns,
      })
      x += w + 1 + r() * 4
    }
  }
  const boats = Array.from({ length: port.size === 'village' ? 2 : 3 }, (_, i) => ({ x: 20 + i * 110 + r() * 50, color: ['#3d5a73', '#a8452e', '#2f5d62', '#e9b23c'][Math.floor(r() * 4)], mast: r() > 0.4 }))
  const people = Array.from({ length: port.size === 'village' ? 2 : port.size === 'town' ? 3 : 4 }, (_, i) => `${port.id}-local-${i}`)
  const base = WATER + 4

  return (
    <Stage width={width} height={height} W={W} H={H} sky={[mix(sky, '#000000', 0.08), sky]} ground={lit('#4a2e22')} night={night}>
      <Group>
        <Rect x={0} y={0} width={W} height={WATER}>
          <LinearGradient start={vec(0, 0)} end={vec(0, WATER)} colors={[sky, skyLow]} />
        </Rect>
        <Circle cx={light.sunX} cy={Math.min(46, light.sunY)} r={13} color={light.sun} opacity={port.region === 'fogbanks' ? 0.5 : 1} />
        <Group opacity={light.stars}>
          {[[30, 20], [100, 34], [200, 16], [280, 30], [340, 12]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={1.1} color="#fff3dc" />
          ))}
        </Group>
        <Group transform={clouds} opacity={night ? 0.25 : 0.7}>
          <Path path="M40 34 c -2 -8 10 -12 16 -6 c 4 -10 20 -8 20 2 c 8 -2 12 6 6 8 Z" color={night ? '#4a3a5a' : '#fff6e8'} />
          <Path path="M240 22 c -2 -6 8 -10 13 -5 c 3 -8 16 -6 16 2 c 6 -1 9 5 5 6 Z" color={night ? '#4a3a5a' : '#fff6e8'} />
        </Group>
        <Group transform={gull}>
          <Path path={flap} color={night ? '#c9c0cf' : '#3a2e36'} style="stroke" strokeWidth={1.3} strokeCap="round" strokeJoin="round" />
        </Group>

        <Backdrop region={port.region} light={light} clock={clock} />

        {/* The hillside behind the town, its houses fading into the distance */}
        <Path path={hill} color={mix(mix(st.land, skyLow, 0.2), light.silhouette, light.dim * 0.7)} />
        {back.map((b, i) => (
          <FarHouse key={i} x={b.x} base={b.base} w={b.w} h={b.h} wall={b.wall} roof={b.roof} haze={haze} light={light} pitch={build.pitch} />
        ))}

        {/* The landmark, then the waterfront street */}
        <Landmark portId={port.id} light={light} lit={lit} clock={clock} />
        {front.map((spec, i) => (
          <House key={i} spec={spec} base={base} light={light} lit={lit} clock={clock} offset={i * 1300} />
        ))}

        {/* The harbour wall the town stands on */}
        <Rect x={0} y={base} width={W} height={7} color={lit(port.region === 'sunward' ? '#d8c08a' : '#7a7068')} />
        {Array.from({ length: 30 }, (_, i) => (
          <Path key={i} path={`M${i * 12 + (i % 2) * 6} ${base} v 7`} color={lit('#4a4440')} style="stroke" strokeWidth={0.5} opacity={0.7} />
        ))}
        <Path path={`M0 ${base + 3.5} h ${W}`} color={lit('#4a4440')} style="stroke" strokeWidth={0.5} opacity={0.7} />

        {/* Harbour water, with the town's lights trembling in it after dark */}
        <Rect x={0} y={base + 7} width={W} height={QUAY - base - 7}>
          <LinearGradient start={vec(0, base + 7)} end={vec(0, QUAY)} colors={[sea, mix(sea, '#0e0a18', 0.25)]} />
        </Rect>
        {night && (
          <Group opacity={shimmer}>
            {front.map((f, i) => (
              <Rect key={i} x={f.x + f.w * 0.3} y={base + 9} width={f.w * 0.4} height={2 + (i % 3)} color={light.lamp} />
            ))}
          </Group>
        )}
        <Group transform={waves}>
          {[base + 12, base + 20].map((y, i) => (
            <Path key={y} path={`M0 ${y} ${'q 9 -3 18 0 t 18 0 '.repeat(12)}`} color={light.seaLine} style="stroke" strokeWidth={1.1} opacity={0.6 - i * 0.2} />
          ))}
        </Group>
        {boats.map((b, i) => (
          <Moored key={i} x={b.x} y={base + 18 + (i % 2) * 3} color={b.color} mast={b.mast} clock={clock} i={i} lit={lit} />
        ))}

        {/* The quay you're standing on */}
        {/* Runs on past the bottom: a taller frame shows more of the quay, not a band of nothing */}
        <Rect x={-60} y={QUAY} width={W + 120} height={H - QUAY + 400}>
          <LinearGradient start={vec(0, QUAY)} end={vec(0, H + 60)} colors={[lit(port.region === 'sunward' ? '#c9a26a' : '#7a5038'), lit(port.region === 'sunward' ? '#a8845a' : '#4a2e22')]} />
        </Rect>
        {Array.from({ length: 12 }, (_, i) => (
          <Path key={i} path={`M${i * 32 + 10} ${QUAY + 2} v ${H - QUAY}`} color={lit('#3a2420')} style="stroke" strokeWidth={0.6} opacity={0.5} />
        ))}
        <Rect x={0} y={QUAY - 3} width={W} height={4} color={lit(port.region === 'ironcliffs' ? '#e8eef2' : '#8a5a3a')} />
        {/* Bollards, a stack of crates and barrels, lamps */}
        {[24, 172, 318].map((x) => (
          <Group key={x}>
            <RoundedRect x={x - 4} y={QUAY - 9} width={8} height={9} r={2.5} color={lit('#2e1c19')} />
            <Rect x={x - 5} y={QUAY - 10} width={10} height={2.4} color={lit('#3a2620')} />
          </Group>
        ))}
        <Group>
          <Rect x={232} y={QUAY - 12} width={14} height={12} color={lit('#8a5a3a')} />
          <Rect x={246} y={QUAY - 9} width={11} height={9} color={lit('#a06a44')} />
          <Rect x={236} y={QUAY - 22} width={11} height={10} color={lit('#7a5236')} />
          <Path path={`M232 ${QUAY - 12} l 14 12 M246 ${QUAY - 9} l 11 9`} color={lit('#4a2e1e')} style="stroke" strokeWidth={0.7} />
          <RoundedRect x={262} y={QUAY - 13} width={10} height={13} r={3} color={lit('#6e4733')} />
          <Path path={`M262 ${QUAY - 9} h 10 M262 ${QUAY - 4} h 10`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.8} />
        </Group>
        {[96, 290].map((x) => (
          <Group key={x}>
            <Rect x={x - 1.5} y={QUAY - 44} width={3} height={44} color={lit('#2e1c19')} />
            <Rect x={x - 5} y={QUAY - 52} width={10} height={10} color={lit('#2e1c19')} />
            <Rect x={x - 3} y={QUAY - 50} width={6} height={6} color={light.lamp} opacity={flicker} />
            {night && (
              <Circle cx={x} cy={QUAY - 47} r={22} opacity={flicker}>
                <RadialGradient c={vec(x, QUAY - 47)} r={22} colors={[`${light.lamp}55`, `${light.lamp}00`]} />
              </Circle>
            )}
          </Group>
        ))}

        {/* Locals going about their day */}
        {people.map((id, i) => (
          <Walker
            key={id}
            look={lookFor(id, false, port.region)}
            clock={clock}
            x0={20 + i * 80}
            x1={60 + i * 80}
            footY={H - 4}
            scale={0.3}
            speed={8}
            pauseMs={3600 + i * 700}
            offset={i * 1300}
          />
        ))}

        {/* The weather over the town: its climate's rain, snow or dust, and the sky sinking with it */}
        <Rect x={-60} y={-400} width={W + 120} height={H + 800} color={climate === 'temperate' ? STORM.veil : CLIMATE_LOOK[climate].veil} opacity={GLOOM[weather] * 0.55} />
        <Fall climate={climate} weather={weather} clock={clock} />
      </Group>
    </Stage>
  )
}
