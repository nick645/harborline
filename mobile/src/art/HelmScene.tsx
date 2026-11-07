// At the helm: inside the wheelhouse, close up. Your captain at the wheel, the sea and the bow
// through the windows ahead, the compass swinging in its binnacle and a brass lamp overhead.
// The view through the glass rolls with the sea, harder in worse weather; rain, snow or dust
// streams down the glass. Tap the wheel to steady her for a moment; tap the captain to hear them.
// Design space matches BoatScene (358 × 320).

import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'
import type { Weather } from '../../../src/game/types'
import type { Climate } from '../../../src/game/data/ports'
import { STORM, type Light } from './light'
import type { Look } from './looks'
import { Figure } from './Figure'
import { Fall } from './Climate'
import { CLIMATE_LOOK, GLOOM } from './climateLook'
import { useSceneClock } from './clock'
import { mix, shade, tint } from './paint'
import { SCENE_H, SCENE_W } from './BoatScene'

/** The windows ahead, and the sea's horizon in them. */
const WIN = { x: 14, y: 22, w: 330, h: 150 }
const HORIZON = 92
const CONSOLE = 236
const WHEEL = { x: 222, y: 238, r: 44 }

const ROLL: Record<Weather, number> = { calm: 0.02, choppy: 0.05, rough: 0.09, storm: 0.14 }

type Props = {
  width: number
  light: Light
  weather: Weather
  captain: Look | null
  climate?: Climate
  /** Bumped each time you steady the wheel: she rolls less for a few seconds. */
  steadied: number
  onWheel: () => void
  onCaptain: () => void
}

export function HelmScene({ width, light, weather, captain, climate = 'temperate', steadied, onWheel, onCaptain }: Props) {
  const clock = useSceneClock()
  const s = width / SCENE_W
  const look = CLIMATE_LOOK[climate]
  const veil = climate === 'temperate' ? STORM.veil : look.veil
  const gloom = GLOOM[weather]
  const g = (c: string, extra = 0) => mix(c, veil, Math.min(1, gloom + extra))
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.55)
  const night = light.stars > 0
  const roll = ROLL[weather]

  // Steadying the wheel calms the roll for a moment, then it comes back.
  const steady = useSharedValue(0)
  useEffect(() => {
    if (!steadied) return
    steady.set(1)
    steady.set(withTiming(0, { duration: 3500 }))
  }, [steadied, steady])

  const horizon = useDerivedValue(() => {
    const k = 1 - steady.value * 0.85
    return [{ rotate: Math.sin(clock.value / 900) * roll * k }, { translateY: Math.sin(clock.value / 620) * roll * 60 * k }]
  })
  const bow = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 620 + 0.6) * roll * 50 * (1 - steady.value * 0.85) }])
  const wheel = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 1300) * (0.25 + roll * 3) * (1 - steady.value * 0.7) + steady.value * 0.4 }])
  const needle = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 1700) * (0.2 + roll * 4) }])
  const lampSwing = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 1100) * (0.08 + roll) }])
  const flash = useDerivedValue(() => {
    if (weather !== 'storm' || !look.lightning) return 0
    const p = (clock.value % 5200) / 5200
    return p < 0.03 ? 0.6 : p > 0.06 && p < 0.1 ? 0.4 : 0
  })
  const waves = useDerivedValue(() => [{ translateX: -((clock.value * (1 + roll * 10)) / 24) % 40 }])

  const wall = lit('#5a3a2a')
  const wood = lit('#8a5a3a')

  return (
    <View style={{ width, height: SCENE_H * s }}>
      <Canvas style={{ width, height: SCENE_H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, SCENE_W, SCENE_H), 20, 20)}>
          {/* The wheelhouse: panelled walls */}
          <Rect x={0} y={0} width={SCENE_W} height={SCENE_H}>
            <LinearGradient start={vec(0, 0)} end={vec(0, SCENE_H)} colors={[wall, shade(wall, 0.25)]} />
          </Rect>
          {Array.from({ length: 8 }, (_, i) => (
            <Path key={i} path={`M${i * 48} 0 V ${SCENE_H}`} color={shade(wall, 0.2)} style="stroke" strokeWidth={1} opacity={0.5} />
          ))}

          {/* Through the windows: sky, sea and the bow, rolling */}
          <Group clip={rrect(rect(WIN.x, WIN.y, WIN.w, WIN.h), 6, 6)}>
            <Group transform={horizon} origin={{ x: SCENE_W / 2, y: HORIZON }}>
              <Rect x={-60} y={-80} width={SCENE_W + 120} height={HORIZON + 80}>
                <LinearGradient start={vec(0, 0)} end={vec(0, HORIZON)} colors={[g(light.sky), g(light.skyLow, 0.05)]} />
              </Rect>
              <Circle cx={light.sunX} cy={Math.min(48, light.sunY)} r={14} color={g(light.sun)} opacity={1 - gloom} />
              <Rect x={-60} y={HORIZON} width={SCENE_W + 120} height={200}>
                <LinearGradient start={vec(0, HORIZON)} end={vec(0, WIN.y + WIN.h)} colors={[g(light.sea, -0.1), g(mix(light.sea, '#0e0a18', 0.35))]} />
              </Rect>
              <Group transform={waves}>
                {[HORIZON + 10, HORIZON + 26, HORIZON + 46].map((y, i) => (
                  <Path key={y} path={`M-60 ${y} ${'q 10 -3 20 0 t 20 0 '.repeat(14)}`} color={g(light.seaLine)} style="stroke" strokeWidth={1 + i * 0.5} opacity={0.5 + i * 0.15} />
                ))}
              </Group>
            </Group>
            {/* The foredeck and bow, ahead of you */}
            <Group transform={bow}>
              <Path path={`M${SCENE_W / 2 - 150} ${WIN.y + WIN.h + 4} L ${SCENE_W / 2 - 18} ${HORIZON + 22} L ${SCENE_W / 2 + 18} ${HORIZON + 22} L ${SCENE_W / 2 + 150} ${WIN.y + WIN.h + 4} Z`} color={g(lit('#b88e5e'))} />
              <Path path={`M${SCENE_W / 2 - 150} ${WIN.y + WIN.h + 4} L ${SCENE_W / 2 - 18} ${HORIZON + 22} M${SCENE_W / 2 + 150} ${WIN.y + WIN.h + 4} L ${SCENE_W / 2 + 18} ${HORIZON + 22}`} color={g(lit('#f3e7d8'))} style="stroke" strokeWidth={3} />
              <Rect x={SCENE_W / 2 - 1.5} y={HORIZON + 4} width={3} height={22} color={g(lit('#4a2e22'))} />
            </Group>
            {/* Weather on the glass */}
            <Rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} color={veil} opacity={gloom * 0.3} />
            <Fall climate={climate} weather={weather} clock={clock} />
            <Rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} color="#ffe6f2" opacity={flash} />
          </Group>
          {/* Window frames */}
          <RoundedRect x={WIN.x - 4} y={WIN.y - 4} width={WIN.w + 8} height={WIN.h + 8} r={8} color={wood} style="stroke" strokeWidth={8} />
          {[WIN.x + WIN.w / 3, WIN.x + (2 * WIN.w) / 3].map((x) => (
            <Rect key={x} x={x - 3} y={WIN.y} width={6} height={WIN.h} color={wood} />
          ))}

          {/* A brass lamp swinging overhead, lit after dark */}
          <Group transform={lampSwing} origin={{ x: 52, y: 0 }}>
            <Path path={`M52 0 V 30`} color={lit('#2e1c19')} style="stroke" strokeWidth={1.5} />
            <RoundedRect x={44} y={30} width={16} height={18} r={3} color={lit('#c99a2e')} />
            <RoundedRect x={47} y={33} width={10} height={12} r={2} color={night ? light.lamp : lit('#e8d4a0')} />
          </Group>
          {night && (
            <Circle cx={52} cy={40} r={90}>
              <RadialGradient c={vec(52, 40)} r={90} colors={[`${light.lamp}44`, `${light.lamp}00`]} />
            </Circle>
          )}

          {/* Your captain, close: head and shoulders over the console */}
          {captain && <Figure look={captain} x={196} y={64} scale={1.9} clock={clock} rimLight={night ? light.lamp : undefined} />}

          {/* The console: compass in its binnacle, a barometer, the wheel on its face */}
          <Rect x={0} y={CONSOLE} width={SCENE_W} height={SCENE_H - CONSOLE} color={lit('#6e4733')} />
          <Rect x={0} y={CONSOLE - 6} width={SCENE_W} height={8} color={lit(tint('#8a5a3a', 0.1))} />
          <Group>
            <Circle cx={72} cy={CONSOLE + 30} r={24} color={lit('#c99a2e')} />
            <Circle cx={72} cy={CONSOLE + 30} r={19} color={lit('#f3e7d8')} />
            <Group transform={needle} origin={{ x: 72, y: CONSOLE + 30 }}>
              <Path path={`M72 ${CONSOLE + 14} L 76 ${CONSOLE + 30} L 72 ${CONSOLE + 46} L 68 ${CONSOLE + 30} Z`} color={lit('#b8423a')} />
            </Group>
            <Circle cx={72} cy={CONSOLE + 30} r={2.5} color={lit('#2e1c19')} />
          </Group>
          <Group>
            <Circle cx={130} cy={CONSOLE + 28} r={14} color={lit('#c99a2e')} />
            <Circle cx={130} cy={CONSOLE + 28} r={10} color={lit('#efe3d2')} />
            <Path path={`M130 ${CONSOLE + 28} l ${weather === 'storm' ? -7 : weather === 'rough' ? -4 : 5} -5`} color={lit('#2e1c19')} style="stroke" strokeWidth={1.5} strokeCap="round" />
          </Group>
          <Group transform={wheel} origin={{ x: WHEEL.x, y: WHEEL.y }}>
            <Circle cx={WHEEL.x} cy={WHEEL.y} r={WHEEL.r} color={lit('#8a5a3a')} style="stroke" strokeWidth={8} />
            {Array.from({ length: 8 }, (_, k) => {
              const a = (k / 8) * Math.PI * 2
              return (
                <Group key={k}>
                  <Path path={`M${WHEEL.x} ${WHEEL.y} l ${Math.cos(a) * (WHEEL.r + 14)} ${Math.sin(a) * (WHEEL.r + 14)}`} color={lit('#8a5a3a')} style="stroke" strokeWidth={6} strokeCap="round" />
                  <Circle cx={WHEEL.x + Math.cos(a) * (WHEEL.r + 14)} cy={WHEEL.y + Math.sin(a) * (WHEEL.r + 14)} r={4} color={lit('#6e4733')} />
                </Group>
              )
            })}
          </Group>
          <Circle cx={WHEEL.x} cy={WHEEL.y} r={11} color={lit('#c99a2e')} />
          <Circle cx={WHEEL.x} cy={WHEEL.y} r={5} color={lit(shade('#c99a2e', 0.3))} />
        </Group>
      </Canvas>
      {/* Tap the wheel to steady her; tap the captain to hear them */}
      <Pressable
        onPress={onWheel}
        accessibilityRole="button"
        accessibilityLabel="Steady the wheel"
        style={{ position: 'absolute', left: (WHEEL.x - WHEEL.r - 16) * s, top: (WHEEL.y - WHEEL.r - 16) * s, width: (WHEEL.r + 16) * 2 * s, height: (WHEEL.r + 16) * 2 * s }}
      />
      {captain && (
        <Pressable
          onPress={onCaptain}
          accessibilityRole="button"
          accessibilityLabel="Talk to your captain"
          style={{ position: 'absolute', left: 206 * s, top: 64 * s, width: 90 * s, height: 110 * s }}
        />
      )}
    </View>
  )
}
