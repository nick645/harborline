// Your boat, live: side on, in the weather of the trip she's on, under your own sky.
// Design space is 358 × 320 and scales to the screen width.

import { Canvas, Circle, Group, Path, Rect, rect, rrect } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { BoatClass, Weather } from '../../../src/game/types'
import type { HatKind } from './looks'
import { STORM, type Light } from './light'
import { BoatArt } from './BoatArt'
import { boatLayout } from './boatGeometry'
import { useSceneClock } from './clock'

export const SCENE_W = 358
export const SCENE_H = 320
const HORIZON = 190
const DECK_Y = 262

export type BoatMode = 'sailing' | 'returning' | 'docked' | 'sunk'

type Props = {
  width: number
  light: Light
  weather: Weather
  mode: BoatMode
  cls: BoatClass
  captainHat: HatKind | null
  /** Hull condition 0–100, shown as wear. */
  condition?: number
}

const WAVES = 'M0 0 q 20 -6 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0'
const SWELL = 'M0 0 q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0'
const RAIN =
  'M20 0 l -10 34 M60 20 l -10 34 M100 -6 l -10 34 M140 30 l -10 34 M180 4 l -10 34 M220 24 l -10 34 M260 -2 l -10 34 M300 28 l -10 34 M340 8 l -10 34 ' +
  'M30 110 l -10 34 M70 140 l -10 34 M110 104 l -10 34 M150 150 l -10 34 M190 118 l -10 34 M230 146 l -10 34 M270 112 l -10 34 M310 150 l -10 34 M350 120 l -10 34 ' +
  'M10 230 l -10 34 M50 260 l -10 34 M90 220 l -10 34 M130 270 l -10 34 M170 240 l -10 34 M210 280 l -10 34 M250 230 l -10 34 M290 290 l -10 34 M330 246 l -10 34'

/** One smoke puff on a 3.6 s cycle, staggered by `k`. */
function usePuff(clock: SharedValue<number>, k: number, x: number, y: number, drift: number) {
  const phase = useDerivedValue(() => ((clock.value + k * 1200) % 3600) / 3600)
  return {
    cx: useDerivedValue(() => x + drift * phase.value),
    cy: useDerivedValue(() => y - 34 * phase.value),
    r: useDerivedValue(() => 7 * (0.6 + 0.9 * phase.value)),
    opacity: useDerivedValue(() => 0.55 * (1 - phase.value)),
  }
}

export function BoatScene({ width, light, weather, mode, cls, captainHat, condition = 100 }: Props) {
  const clock = useSceneClock()
  const s = width / SCENE_W
  const storm = weather === 'storm'
  const rough = weather === 'rough' || storm
  const atSea = mode === 'sailing' || mode === 'returning'
  const swell = rough ? 2.2 : weather === 'choppy' ? 1.5 : 1

  const layout = boatLayout(cls)
  const W = layout.W
  const scale = (170 + cls.sizeTier * 12) / W
  const boatX = (SCENE_W - W * scale) / 2 + (mode === 'docked' ? 30 : 0)
  const flip = mode === 'returning'
  const waterY = DECK_Y + layout.waterline * scale * 0.85

  const waveFast = useDerivedValue(() => [{ translateX: -((clock.value / (rough ? 30 : 50)) % 80) }, { translateY: 0 }])
  const waveSlow = useDerivedValue(() => [{ translateX: -((clock.value / 125) % 80) }])
  const bob = useDerivedValue(() => {
    const t = clock.value
    return [
      { translateY: Math.sin(t / 510) * 4 * swell },
      { rotate: Math.sin(t / 700) * 0.02 * swell },
    ]
  })
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 280))
  const rain = useDerivedValue(() => {
    const o = (clock.value / 11.7) % 60
    return [{ translateX: -o * 0.4 }, { translateY: o - 30 }]
  })
  const flash = useDerivedValue(() => {
    const p = (clock.value % 5000) / 5000
    return p > 0.88 && p < 0.9 ? 1 : p > 0.92 && p < 0.95 ? 0.8 : 0
  })

  // Funnel smoke drifts back from the stack; three puffs on a staggered cycle.
  const stack = layout.stack
  const stackMid = stack ? stack.x + stack.w / 2 : 0
  const stackX = boatX + (flip ? (W - stackMid) * scale : stackMid * scale)
  const stackY = DECK_Y + (stack ? stack.y : 0) * scale
  const drift = flip ? 26 : -26
  const puffs = [usePuff(clock, 0, stackX, stackY, drift), usePuff(clock, 1, stackX, stackY, drift), usePuff(clock, 2, stackX, stackY, drift)]
  const flashVeil = useDerivedValue(() => flash.value * 0.12)

  return (
    <Canvas style={{ width, height: SCENE_H * s }}>
      <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, SCENE_W, SCENE_H), 20, 20)}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} color={light.sky} />
        <Rect x={0} y={110} width={SCENE_W} height={HORIZON - 110} color={light.skyLow} />
        <Circle cx={light.sunX} cy={light.sunY} r={28} color={light.sun} />
        <Group opacity={light.stars}>
          {[[40, 40], [96, 70], [150, 30], [200, 58], [320, 34], [250, 20]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={1.2} color="#fff3dc" />
          ))}
        </Group>

        {storm && (
          <Group>
            <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} color={STORM.veil} opacity={0.72} />
            <Path path="M-10 60 C 20 20, 80 20, 100 46 C 120 10, 200 6, 220 44 C 250 24, 320 26, 330 62 C 360 60, 370 90, 350 100 L -10 100 Z" color={STORM.cloud} />
            <Path path="M-10 92 C 40 70, 90 84, 130 74 C 180 62, 240 80, 290 70 C 320 64, 350 74, 370 70 L 370 110 L -10 110 Z" color={STORM.cloudLow} />
          </Group>
        )}

        <Path path={`M0 ${HORIZON} L 40 166 L 90 174 L 130 156 L 180 170 L 230 160 L 290 174 L 358 164 L 358 ${HORIZON + 2} L 0 ${HORIZON + 2} Z`} color={light.land} />
        <Group transform={[{ translateX: 300 }, { translateY: 158 }]}>
          <Rect x={-4} y={-26} width={8} height={26} color={light.silhouette} />
          <Rect x={-5} y={-31} width={10} height={6} color={light.lamp} opacity={flicker} />
          <Path path="M-6 -31 L 0 -38 L 6 -31 Z" color={light.silhouette} />
        </Group>

        <Rect x={0} y={HORIZON} width={SCENE_W} height={SCENE_H - HORIZON} color={light.sea} />
        <Group transform={waveSlow}>
          <Group transform={[{ translateY: HORIZON + 18 }]}>
            <Path path={WAVES} color={light.seaLine} style="stroke" strokeWidth={2} />
          </Group>
          <Group transform={[{ translateY: HORIZON + 40 }]}>
            <Path path={WAVES} color={light.seaLine} style="stroke" strokeWidth={2} opacity={0.7} />
          </Group>
        </Group>


        {atSea && <Path path={`M${150} ${DECK_Y + 22} h 140 M170 ${DECK_Y + 32} h 100 M196 ${DECK_Y + 42} h 50`} color={light.lamp} style="stroke" strokeWidth={2} opacity={light.glint} />}

        {mode === 'sunk' ? (
          <Group>
            <Path path={`M150 ${DECK_Y + 10} L 190 ${DECK_Y - 70} M190 ${DECK_Y - 64} L 214 ${DECK_Y - 30}`} color={light.silhouette} style="stroke" strokeWidth={5} strokeCap="round" />
            <Circle cx={170} cy={DECK_Y + 4} r={4} color="#fff3dc" opacity={0.5} />
            <Circle cx={182} cy={DECK_Y - 4} r={3} color="#fff3dc" opacity={0.4} />
            <Circle cx={176} cy={DECK_Y - 14} r={2} color="#fff3dc" opacity={0.3} />
          </Group>
        ) : (
          <Group transform={bob} origin={{ x: SCENE_W / 2, y: DECK_Y }}>
            <BoatArt cls={cls} light={light} x={boatX} y={DECK_Y} scale={scale} flip={flip} captainHat={captainHat} condition={condition} clock={clock} />
          </Group>
        )}

        {/* The sea in front of her hull, so she sits in the water rather than on it. */}
        <Rect x={0} y={waterY} width={SCENE_W} height={SCENE_H - waterY} color={light.sea} />
        <Group transform={waveSlow}>
          <Group transform={[{ translateY: waterY }]}>
            <Path path={WAVES} color={light.seaLine} style="stroke" strokeWidth={1.6} opacity={0.8} />
          </Group>
        </Group>
        {mode === 'docked' && (
          <Group>
            <Rect x={0} y={DECK_Y - 30} width={64} height={SCENE_H - DECK_Y + 30} color="#5a3a2c" />
            <Rect x={0} y={DECK_Y - 34} width={70} height={6} color="#8a5a3a" />
            <Rect x={54} y={DECK_Y - 44} width={8} height={18} color="#2e1c19" />
            <Path path={`M58 ${DECK_Y - 40} C 80 ${DECK_Y - 30}, 90 ${DECK_Y - 20}, ${boatX + 6} ${DECK_Y - 4}`} color="#c9b6ae" style="stroke" strokeWidth={1.5} />
          </Group>
        )}

        {mode !== 'sunk' &&
          stack &&
          puffs.map((p, i) => <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} opacity={p.opacity} color={storm ? '#9a93ad' : '#e7dccf'} />)}

        <Group transform={waveFast}>
          <Group transform={[{ translateY: DECK_Y + 40 }]}>
            <Path path={SWELL} color={light.sea} />
            <Path path={SWELL} color={light.seaLine} style="stroke" strokeWidth={2.5} />
          </Group>
          <Group transform={[{ translateY: DECK_Y + 62 }]}>
            <Path path={SWELL} color={light.seaLine} style="stroke" strokeWidth={2} opacity={0.6} />
          </Group>
        </Group>

        {atSea && (
          <Path
            path={flip ? `M${boatX + W * scale - 6} ${DECK_Y + 28} C 300 ${DECK_Y + 32}, 330 ${DECK_Y + 30}, 360 ${DECK_Y + 36}` : `M${boatX + 6} ${DECK_Y + 28} C 40 ${DECK_Y + 32}, 20 ${DECK_Y + 30}, 0 ${DECK_Y + 36}`}
            color="#fff3dc"
            style="stroke"
            strokeWidth={1.6}
            opacity={0.5}
          />
        )}

        {storm && (
          <Group>
            <Group transform={rain}>
              <Path path={RAIN} color={STORM.rain} style="stroke" strokeWidth={1.2} />
            </Group>
            <Path path="M180 100 L 166 132 L 180 132 L 168 170" color={STORM.bolt} style="stroke" strokeWidth={3} strokeJoin="round" opacity={flash} />
            <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} color={STORM.bolt} opacity={flashVeil} />
          </Group>
        )}
      </Group>
    </Canvas>
  )
}
