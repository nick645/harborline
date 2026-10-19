// A port seen from the water: its region's landscape behind (bay hills and a lighthouse, grey
// fog isles, sandy shoals with palms, snowy black cliffs, or the lamplit Reach), houses along
// the waterfront as many as its size (village, town, city), coloured and shaped from the
// port's own seed so no two look alike, and its people on the quay. Design space 358 × 210.

import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Port } from '../../../src/game/types'
import type { RegionId } from '../../../src/game/data/ports'
import type { Light } from './light'
import { lookFor } from './looks'
import { REGION_STYLE } from './regionStyle'
import { Walker } from './Walker'
import { useSceneClock } from './clock'
import { hash, mix, shade } from './paint'

const W = 358
const H = 210
const WATER = 150
const QUAY = 176

const HOUSES: Record<Port['size'], number> = { village: 3, town: 5, city: 8 }

/** What stands behind the town: the region's skyline. */
function Backdrop({ region, light, clock }: { region: RegionId; light: Light; clock: SharedValue<number> }) {
  const st = REGION_STYLE[region]
  const land = mix(st.land, light.silhouette, light.dim * 0.7)
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
      return (
        <Group>
          <Path path={`M0 ${WATER} C 50 112, 110 110, 160 126 C 210 104, 290 100, 358 118 L 358 ${WATER} Z`} color={land} />
          <Rect x={318} y={84} width={9} height={36} color="#f3e7d8" />
          <Rect x={318} y={96} width={9} height={6} color="#c2452a" />
          <Rect x={316} y={78} width={13} height={7} color={light.lamp} />
        </Group>
      )
    case 'fogbanks':
      return (
        <Group>
          <Path path={`M-10 ${WATER} L 30 96 L 60 110 L 90 84 L 130 ${WATER} Z M220 ${WATER} L 260 100 L 290 116 L 330 92 L 368 ${WATER} Z`} color={land} />
          <Group transform={fogA} opacity={0.55}>
            <RoundedRect x={0} y={100} width={220} height={18} r={9} color="#e8eef2" />
          </Group>
          <Group transform={fogB} opacity={0.45}>
            <RoundedRect x={80} y={124} width={260} height={16} r={8} color="#e8eef2" />
          </Group>
          <Path path={`M300 ${WATER - 6} l 6 -16 l 6 16 Z`} color="#b8423a" />
          <Circle cx={306} cy={WATER - 24} r={3} color="#e9b23c" />
        </Group>
      )
    case 'sunward':
      return (
        <Group>
          <Path path={`M0 ${WATER} C 80 130, 160 136, 240 128 C 290 124, 330 130, 358 134 L 358 ${WATER} Z`} color={land} />
          {[34, 70, 300, 332].map((x, i) => (
            <Group key={x}>
              <Path path={`M${x} ${WATER - 2} C ${x + 2} ${WATER - 30}, ${x - 4} ${WATER - 50}, ${x + 2} ${WATER - 62 - (i % 2) * 8}`} color="#8a5a3a" style="stroke" strokeWidth={3} strokeCap="round" />
              <Path
                path={`M${x + 2} ${WATER - 62 - (i % 2) * 8} q -16 -2 -24 10 M${x + 2} ${WATER - 62 - (i % 2) * 8} q 16 -2 24 10 M${x + 2} ${WATER - 62 - (i % 2) * 8} q -10 -12 -20 -10 M${x + 2} ${WATER - 62 - (i % 2) * 8} q 10 -12 20 -10`}
                color={mix('#3f8a5a', light.silhouette, light.dim * 0.6)}
                style="stroke"
                strokeWidth={4}
                strokeCap="round"
              />
            </Group>
          ))}
        </Group>
      )
    case 'ironcliffs':
      return (
        <Group>
          <Path path={`M-10 ${WATER} L 10 50 L 60 40 L 90 70 L 140 30 L 190 64 L 240 36 L 300 60 L 368 44 L 368 ${WATER} Z`} color={land} />
          <Path path="M10 50 L 60 40 L 70 52 L 40 56 Z M140 30 L 165 46 L 150 50 Z M240 36 L 268 48 L 250 52 Z M300 60 L 368 44 L 368 56 L 330 64 Z" color="#e8eef2" opacity={0.9} />
          <Path path={snow} color="#ffffff" opacity={0.7} />
        </Group>
      )
    case 'lantern':
      return (
        <Group>
          <Path path={`M0 ${WATER} L 0 120 L 60 110 L 120 124 L 200 104 L 280 118 L 358 108 L 358 ${WATER} Z`} color={land} />
          {[40, 180, 320].map((x) => (
            <Group key={x}>
              <Rect x={x - 4} y={56} width={8} height={WATER - 56} color={shade(land, 0.3)} />
              <Rect x={x - 7} y={48} width={14} height={10} color="#ffb054" />
              <Circle cx={x} cy={53} r={20}>
                <RadialGradient c={vec(x, 53)} r={20} colors={['#ffb05488', '#ffb05400']} />
              </Circle>
            </Group>
          ))}
        </Group>
      )
  }
}

export function PortScene({ width, light, port }: { width: number; light: Light; port: Port }) {
  const clock = useSceneClock()
  const s = width / W
  const st = REGION_STYLE[port.region]
  const seed = hash(port.id)
  const sky = mix(light.sky, st.tint, st.tintAmount)
  const skyLow = mix(light.skyLow, st.tint, st.tintAmount)
  const sea = mix(light.sea, st.tint, st.tintAmount * 0.7)
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.75)
  const waves = useDerivedValue(() => [{ translateX: -((clock.value / 80) % 36) }])
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))

  // The waterfront: houses spread across the scene, sized and coloured from the port's seed.
  const n = HOUSES[port.size]
  const houses = Array.from({ length: n }, (_, i) => {
    const r = (k: number) => ((seed >>> ((i * 5 + k) % 27)) & 0xff) / 255
    const w = 26 + r(1) * 18 + (port.size === 'city' ? 8 : 0)
    const h = 26 + r(2) * 26 + (port.size === 'city' && i % 3 === 1 ? 26 : 0)
    return { x: 12 + (i * (W - 40)) / n + r(3) * 6, w, h, wall: st.walls[(seed + i) % st.walls.length], roof: st.roofs[(seed >>> 3) % st.roofs.length], peaked: port.region !== 'sunward' && r(4) > 0.3 }
  })
  const people = Array.from({ length: port.size === 'village' ? 2 : port.size === 'town' ? 3 : 4 }, (_, i) => `${port.id}-local-${i}`)

  return (
    <Canvas style={{ width, height: H * s }}>
      <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
        <Rect x={0} y={0} width={W} height={WATER}>
          <LinearGradient start={vec(0, 0)} end={vec(0, WATER)} colors={[sky, skyLow]} />
        </Rect>
        <Circle cx={light.sunX} cy={Math.min(50, light.sunY)} r={14} color={light.sun} opacity={port.region === 'fogbanks' ? 0.5 : 1} />
        <Group opacity={light.stars}>
          {[[30, 20], [100, 34], [200, 16], [280, 30]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={1.1} color="#fff3dc" />
          ))}
        </Group>
        <Backdrop region={port.region} light={light} clock={clock} />

        <Rect x={0} y={WATER - 2} width={W} height={8} color={mix(st.land, light.silhouette, light.dim * 0.7)} />
        {/* Houses along the waterfront */}
        {houses.map((h, i) => {
          const base = WATER + 4
          return (
            <Group key={i}>
              <Rect x={h.x} y={base - h.h} width={h.w} height={h.h} color={lit(h.wall)} />
              {h.peaked ? (
                <Path path={`M${h.x - 3} ${base - h.h} L ${h.x + h.w / 2} ${base - h.h - 14} L ${h.x + h.w + 3} ${base - h.h} Z`} color={lit(h.roof)} />
              ) : (
                <Rect x={h.x - 2} y={base - h.h - 4} width={h.w + 4} height={4} color={lit(h.roof)} />
              )}
              {Array.from({ length: Math.max(1, Math.floor(h.h / 16)) }, (_, row) =>
                Array.from({ length: Math.max(1, Math.floor(h.w / 13)) }, (_, col) => (
                  <Rect key={`${row}-${col}`} x={h.x + 4 + col * 12} y={base - h.h + 6 + row * 15} width={6} height={7} color={light.window} />
                )),
              )}
              <Rect x={h.x + h.w / 2 - 3} y={base - 10} width={6} height={10} color={lit(shade(h.wall, 0.5))} />
            </Group>
          )
        })}

        {/* Harbour water between the town and the quay you're standing on */}
        <Rect x={0} y={WATER + 4} width={W} height={QUAY - WATER - 4} color={sea} />
        <Group transform={waves}>
          <Path path={`M0 ${WATER + 14} ${'q 9 -3 18 0 t 18 0 '.repeat(12)}`} color={light.seaLine} style="stroke" strokeWidth={1.2} opacity={0.7} />
        </Group>
        <Rect x={0} y={QUAY} width={W} height={H - QUAY}>
          <LinearGradient start={vec(0, QUAY)} end={vec(0, H)} colors={[lit(port.region === 'sunward' ? '#c9a26a' : '#7a5038'), lit(port.region === 'sunward' ? '#a8845a' : '#4a2e22')]} />
        </Rect>
        <Rect x={0} y={QUAY - 3} width={W} height={4} color={lit(port.region === 'ironcliffs' ? '#e8eef2' : '#8a5a3a')} />
        <Group>
          {[60, 200].map((x) => (
            <Group key={x}>
              <Rect x={x - 1.5} y={QUAY - 40} width={3} height={40} color={lit('#2e1c19')} />
              <Rect x={x - 5} y={QUAY - 48} width={10} height={10} color={lit('#2e1c19')} />
              <Rect x={x - 3} y={QUAY - 46} width={6} height={6} color={light.lamp} opacity={flicker} />
            </Group>
          ))}
        </Group>

        {/* Locals going about their day */}
        {people.map((id, i) => (
          <Walker
            key={id}
            look={lookFor(id, false, port.region)}
            clock={clock}
            x0={20 + i * 80}
            x1={60 + i * 80}
            footY={H - 6}
            scale={0.32}
            speed={8}
            pauseMs={3600 + i * 700}
            offset={i * 1300}
          />
        ))}
      </Group>
    </Canvas>
  )
}
