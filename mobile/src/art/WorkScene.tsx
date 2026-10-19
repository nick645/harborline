// Your captains at work on the home quay: hauling crates from the stack to the boat, coiling
// lines, checking the manifest, swinging a lantern. One of your boats is moored behind them.
// Tap a captain to open them. Design space is 358 × 240.

import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { Pressable, View } from 'react-native'
import { useDerivedValue } from 'react-native-reanimated'
import type { BoatClass } from '../../../src/game/types'
import type { Light } from './light'
import { lookFor, type Look, type Prop } from './looks'
import { BoatArt } from './BoatArt'
import { boatWidth } from './boatGeometry'
import { FIGURE_FULL_H } from './Figure'
import { Walker } from './Walker'
import { useSceneClock } from './clock'
import { mix } from './paint'

const W = 358
const H = 240
const QUAY = 172
const FOOT_Y = 230
const SCALE = 0.5
const FIG_H = FIGURE_FULL_H * SCALE
const FIG_W = 56 * SCALE

/** What each captain is doing, in turn: [task, from, to]. Crate carriers walk the stack to the boat. */
const JOBS: [Prop, number, number][] = [
  ['crate', 300, 120],
  ['rope', 70, 96],
  ['crate', 280, 150],
  ['logbook', 200, 228],
  ['lantern', 30, 60],
  ['crate', 320, 180],
]

type Person = { id: string; name: string; rare: boolean }

export function WorkScene({ width, light, cls, captains, onOpen }: { width: number; light: Light; cls: BoatClass | null; captains: Person[]; onOpen: (id: string) => void }) {
  const clock = useSceneClock()
  const s = width / W
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.8)
  const ride = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 900) * 1.5 }])
  const waves = useDerivedValue(() => [{ translateX: -((clock.value / 80) % 36) }])
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const shown = captains.slice(0, JOBS.length)
  const boatScale = cls ? Math.min(1.1, 230 / boatWidth(cls)) : 1

  return (
    <View style={{ width, height: H * s }}>
      <Canvas style={{ width, height: H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
          <Rect x={0} y={0} width={W} height={120}>
            <LinearGradient start={vec(0, 0)} end={vec(0, 120)} colors={[light.sky, light.skyLow]} />
          </Rect>
          <Circle cx={light.sunX} cy={Math.min(60, light.sunY)} r={14} color={light.sun} />
          <Path path="M0 120 L 0 104 L 50 98 L 90 108 L 150 96 L 220 104 L 300 94 L 358 102 L 358 120 Z" color={light.land} />
          <Rect x={0} y={118} width={W} height={QUAY - 118} color={light.sea} />
          <Group transform={waves}>
            <Path path={`M0 132 ${'q 9 -3 18 0 t 18 0 '.repeat(12)}`} color={light.seaLine} style="stroke" strokeWidth={1.4} opacity={0.7} />
          </Group>
          {cls && (
            <Group transform={ride}>
              <BoatArt cls={cls} light={light} x={40} y={QUAY - 14} scale={boatScale} clock={clock} />
            </Group>
          )}
          <Rect x={0} y={QUAY - 8} width={W} height={8} color={mix(light.sea, '#0e0a18', 0.2)} />

          {/* The quay, a stack of crates to load, a bollard and a lamp */}
          <Rect x={0} y={QUAY} width={W} height={H - QUAY}>
            <LinearGradient start={vec(0, QUAY)} end={vec(0, H)} colors={[lit('#7a5038'), lit('#4a2e22')]} />
          </Rect>
          <Path path={`M0 ${QUAY + 20} h 358 M0 ${QUAY + 42} h 358 M80 ${QUAY} v 20 M220 ${QUAY + 20} v 22 M150 ${QUAY + 42} v 26`} color={lit('#3a2420')} style="stroke" strokeWidth={1.2} />
          <Rect x={0} y={QUAY - 3} width={W} height={5} color={lit('#8a5a3a')} />
          {[
            [304, 0],
            [326, 0],
            [315, 1],
          ].map(([x, row], i) => (
            <Group key={i}>
              <Rect x={x} y={QUAY + 14 - row * 18} width={20} height={18} color={lit(i % 2 ? '#a06a44' : '#8a5a3a')} />
              <Path path={`M${x} ${QUAY + 14 - row * 18} l 20 18 M${x} ${QUAY + 23 - row * 18} h 20`} color={lit('#4a2e1e')} style="stroke" strokeWidth={1} />
            </Group>
          ))}
          <RoundedRect x={8} y={QUAY - 12} width={14} height={14} r={4} color={lit('#2e1c19')} />
          <Group transform={[{ translateX: 222 }, { translateY: QUAY }]}>
            <Rect x={-2} y={-90} width={4} height={90} color={lit('#2e1c19')} />
            <Rect x={-7} y={-102} width={14} height={14} color={lit('#2e1c19')} />
            <Rect x={-4.5} y={-99.5} width={9} height={9} color={light.lamp} opacity={flicker} />
            <Circle cx={0} cy={-95} r={light.stars ? 30 : 14} opacity={flicker}>
              <RadialGradient c={vec(0, -95)} r={light.stars ? 30 : 14} colors={[`${light.lamp}66`, `${light.lamp}00`]} />
            </Circle>
          </Group>

          {shown.map((c, i) => {
            const [prop, from, to] = JOBS[i]
            const look: Look = { ...lookFor(c.id, c.rare), prop }
            return (
              <Walker
                key={c.id}
                look={look}
                clock={clock}
                x0={from - FIG_W / 2}
                x1={to - FIG_W / 2}
                footY={FOOT_Y - (i % 2) * 10}
                scale={SCALE}
                speed={prop === 'crate' ? 22 : 8}
                pauseMs={prop === 'crate' ? 1800 : 4800}
                offset={i * 1900}
                rimLight={light.stars ? light.lamp : undefined}
              />
            )
          })}
        </Group>
      </Canvas>
      {shown.map((c, i) => {
        const [, from, to] = JOBS[i]
        const left = Math.min(from, to) - FIG_W / 2
        return (
          <Pressable
            key={c.id}
            onPress={() => onOpen(c.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open Captain ${c.name}`}
            style={{ position: 'absolute', left: left * s, top: (FOOT_Y - (i % 2) * 10 - FIG_H) * s, width: (Math.abs(to - from) + FIG_W) * s, height: FIG_H * s }}
          />
        )
      })}
    </View>
  )
}
