// A boat moored at Saltmarsh Quay, seen up close: her captain stands on the quay boards in
// front of her at portrait size (the same look as everywhere else), she rides at her lines
// behind them with her deckhands at work, and the harbour carries on around them: a bollard,
// a lamp post, crates, gulls, the far shore. Tap the captain to open them. Design space
// matches BoatScene (358 × 320).

import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { Pressable, View } from 'react-native'
import { useDerivedValue } from 'react-native-reanimated'
import type { BoatClass } from '../../../src/game/types'
import type { Light } from './light'
import { lookFor, type Look, type Prop } from './looks'
import { BoatArt } from './BoatArt'
import { FIGURE_FULL_H } from './Figure'
import { Walker } from './Walker'
import { boatWidth } from './boatGeometry'
import { useSceneClock } from './clock'
import { mix } from './paint'
import { SCENE_H, SCENE_W } from './BoatScene'

const WATER = 170
const DECK = 232
const QUAY = 262
const CAPTAIN_SCALE = 1.15
const CAPTAIN_X0 = 140
const CAPTAIN_X1 = 250
const FOOT_Y = SCENE_H - 10
/** Deckhands work the quay behind the captain, a little smaller. */
const HAND_SCALE = 0.6
const HAND_FOOT = 292
/** Their jobs, in turn: what they carry and where they walk. Crates go from the stack to the boat. */
const HAND_JOBS: [Prop, number, number, number][] = [
  // prop, from, to, speed
  ['crate', 56, 200, 20],
  ['rope', 24, 44, 6],
  ['crate', 90, 250, 18],
  ['logbook', 300, 320, 5],
  ['lantern', 270, 210, 9],
]

type Props = {
  width: number
  light: Light
  cls: BoatClass
  captain: Look | null
  captainName?: string
  condition: number
  hands: number
  /** Ids of the hands aboard, so each one working the quay has their own look. */
  handIds?: string[]
  onOpenCaptain?: () => void
}

export function DockScene({ width, light, cls, captain, captainName, condition, hands, handIds = [], onOpenCaptain }: Props) {
  const clock = useSceneClock()
  const s = width / SCENE_W
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.8)
  const night = light.stars > 0

  // The boat fills the frame behind the captain; the biggest ones run off the left edge.
  const W = boatWidth(cls)
  const scale = Math.min(1.6, 330 / W)
  const boatX = SCENE_W - 18 - W * scale
  const ride = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 900) * 2 }, { rotate: Math.sin(clock.value / 1300) * 0.008 }])
  const waves = useDerivedValue(() => [{ translateX: -((clock.value / 80) % 36) }])
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const slack = useDerivedValue(() => `M22 ${QUAY - 16} Q 40 ${QUAY - 2 + Math.sin(clock.value / 900) * 3}, ${boatX + 10} ${DECK + 2}`)
  const gull = useDerivedValue(() => {
    const t = clock.value / 1000
    return [{ translateX: ((t * 16) % 460) - 50 }, { translateY: 40 + Math.sin(t * 0.8) * 8 }]
  })
  const flap = useDerivedValue(() => {
    const f = Math.sin(clock.value / 120) * 4
    return `M-7 ${f * 0.3} Q -3.5 ${-f} 0 0 Q 3.5 ${-f} 7 ${f * 0.3}`
  })

  const figY = FOOT_Y - FIGURE_FULL_H * CAPTAIN_SCALE

  return (
    <View style={{ width, height: SCENE_H * s }}>
      <Canvas style={{ width, height: SCENE_H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, SCENE_W, SCENE_H), 20, 20)}>
          {/* Sky, far shore and harbour water */}
          <Rect x={0} y={0} width={SCENE_W} height={WATER}>
            <LinearGradient start={vec(0, 0)} end={vec(0, WATER)} colors={[light.sky, light.skyLow]} />
          </Rect>
          <Circle cx={light.sunX} cy={Math.min(80, light.sunY)} r={18} color={light.sun} />
          <Group opacity={light.stars}>
            {[[30, 30], [90, 18], [150, 44], [260, 22], [320, 50]].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={1.1} color="#fff3dc" />
            ))}
          </Group>
          <Path path={`M0 ${WATER} L 0 150 L 30 146 L 40 132 L 60 132 L 66 146 L 120 150 L 150 140 L 190 142 L 230 128 L 238 128 L 244 140 L 300 146 L 358 140 L 358 ${WATER} Z`} color={light.land} />
          {[[44, 136], [234, 132]].map(([x, y], i) => (
            <Rect key={i} x={x} y={y} width={5} height={4} color={light.lamp} opacity={night ? 0.9 : 0.3} />
          ))}
          <Rect x={0} y={WATER} width={SCENE_W} height={QUAY - WATER}>
            <LinearGradient start={vec(0, WATER)} end={vec(0, QUAY)} colors={[light.sea, mix(light.sea, '#0e0a18', 0.25)]} />
          </Rect>
          <Group transform={waves}>
            {[184, 204].map((wy, i) => (
              <Path key={wy} path={`M0 ${wy} ${'q 9 -3 18 0 t 18 0 '.repeat(12)}`} color={light.seaLine} style="stroke" strokeWidth={1.4} opacity={0.7 - i * 0.2} />
            ))}
          </Group>
          <Group transform={gull}>
            <Path path={flap} color={night ? '#c9c0cf' : '#3a2e36'} style="stroke" strokeWidth={1.6} strokeCap="round" strokeJoin="round" />
          </Group>

          {/* Her, at her lines, with the hands at work (the captain is down on the quay) */}
          <Group transform={ride} origin={{ x: SCENE_W / 2, y: DECK }}>
            <BoatArt cls={cls} light={light} x={boatX} y={DECK} scale={scale} people hands={hands} condition={condition} clock={clock} />
          </Group>
          <Rect x={0} y={DECK + 14} width={SCENE_W} height={QUAY - DECK - 14} color={mix(light.sea, '#0e0a18', 0.2)} opacity={0.9} />
          <Path path={`M0 ${DECK + 14} ${'q 9 -3 18 0 t 18 0 '.repeat(12)}`} color={light.seaLine} style="stroke" strokeWidth={1.4} opacity={0.6} />

          {/* The quay */}
          <Rect x={0} y={QUAY} width={SCENE_W} height={SCENE_H - QUAY}>
            <LinearGradient start={vec(0, QUAY)} end={vec(0, SCENE_H)} colors={[lit('#7a5038'), lit('#4a2e22')]} />
          </Rect>
          <Path path={`M0 ${QUAY + 18} h 358 M0 ${QUAY + 38} h 358 M90 ${QUAY} v 18 M210 ${QUAY + 18} v 20 M300 ${QUAY} v 18 M40 ${QUAY + 38} v 20`} color={lit('#3a2420')} style="stroke" strokeWidth={1.4} />
          <Rect x={0} y={QUAY - 4} width={SCENE_W} height={6} color={lit('#8a5a3a')} />
          <Path path={slack} color={lit('#c9b6ae')} style="stroke" strokeWidth={1.6} />
          <RoundedRect x={10} y={QUAY - 20} width={20} height={20} r={6} color={lit('#2e1c19')} />
          <Rect x={8} y={QUAY - 22} width={24} height={5} color={lit('#3a2620')} />
          <Group>
            <Rect x={52} y={QUAY + 6} width={28} height={22} color={lit('#8a5a3a')} />
            <Path path={`M52 ${QUAY + 6} l 28 22 M52 ${QUAY + 17} h 28`} color={lit('#4a2e1e')} style="stroke" strokeWidth={1} />
            <RoundedRect x={84} y={QUAY + 8} width={18} height={20} r={5} color={lit('#6e4733')} />
            <Path path={`M84 ${QUAY + 14} h 18 M84 ${QUAY + 22} h 18`} color={lit('#2e1c19')} style="stroke" strokeWidth={1} />
          </Group>
          {/* Lamp post at the right edge */}
          <Group transform={[{ translateX: 336 }, { translateY: QUAY }]}>
            <Rect x={-2} y={-120} width={4} height={120} color={lit('#2e1c19')} />
            <Rect x={-9} y={-136} width={18} height={18} color={lit('#2e1c19')} />
            <Rect x={-6} y={-133} width={12} height={12} color={light.lamp} opacity={flicker} />
            <Circle cx={0} cy={-127} r={night ? 34 : 18} opacity={flicker}>
              <RadialGradient c={vec(0, -127)} r={night ? 34 : 18} colors={[`${light.lamp}77`, `${light.lamp}00`]} />
            </Circle>
          </Group>

          {/* The hands at work on the quay: the boat's own, with a couple of dock workers lending a hand */}
          {[...handIds, 'dockworker-a', 'dockworker-b'].slice(0, HAND_JOBS.length).map((id, i) => {
            const [prop, from, to, speed] = HAND_JOBS[i]
            return (
              <Walker
                key={id}
                look={{ ...lookFor(id), prop }}
                clock={clock}
                x0={from}
                x1={to}
                footY={HAND_FOOT - (i % 2) * 6}
                scale={HAND_SCALE}
                speed={speed}
                pauseMs={prop === 'crate' ? 1600 : 4600}
                offset={i * 1700}
              />
            )
          })}

          {/* Your captain, close enough to know */}
          {captain && (
            <Group>
              <Walker look={captain} clock={clock} x0={CAPTAIN_X0} x1={CAPTAIN_X1} footY={FOOT_Y} scale={CAPTAIN_SCALE} rimLight={night ? light.lamp : undefined} />
            </Group>
          )}
        </Group>
      </Canvas>
      {captain && onOpenCaptain && (
        <Pressable
          onPress={onOpenCaptain}
          accessibilityRole="button"
          accessibilityLabel={captainName ? `Open Captain ${captainName}` : 'Open captain'}
          style={{ position: 'absolute', left: CAPTAIN_X0 * s, top: figY * s, width: (CAPTAIN_X1 - CAPTAIN_X0 + 56 * CAPTAIN_SCALE) * s, height: (FOOT_Y - figY) * s }}
        />
      )}
    </View>
  )
}
