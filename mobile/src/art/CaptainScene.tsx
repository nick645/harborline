// Your captain where they are right now: at the helm of their boat, or ashore at the tavern
// window with something warm. Design space is 358 × 280.

import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, rect, rrect, vec } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'
import type { Light } from './light'
import type { Look } from './looks'
import { Walker } from './Walker'
import { useSceneClock } from './clock'

const W = 358
const H = 280

export type CaptainPlace = 'helm' | 'port'

export function CaptainScene({ width, light, look, place }: { width: number; light: Light; look: Look; place: CaptainPlace }) {
  const clock = useSceneClock()
  const s = width / W
  const roll = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 540) * 5 }])
  const sway = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 640) * 0.035 }])
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const steam = (k: number) => {
    'worklet'
    return ((clock.value + k * 1400) % 2800) / 2800
  }
  const steamA = {
    cy: useDerivedValue(() => 174 - 26 * steam(0)),
    r: useDerivedValue(() => 5 * (0.7 + 0.7 * steam(0))),
    opacity: useDerivedValue(() => 0.6 * (1 - steam(0))),
  }
  const steamB = {
    cy: useDerivedValue(() => 174 - 26 * steam(1)),
    r: useDerivedValue(() => 5 * (0.7 + 0.7 * steam(1))),
    opacity: useDerivedValue(() => 0.6 * (1 - steam(1))),
  }

  return (
    <Canvas style={{ width, height: H * s }}>
      <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
        {place === 'helm' ? (
          <Group>
            <Rect x={0} y={0} width={W} height={H} color="#4a2f2a" />
            <Rect x={24} y={24} width={310} height={140} color={light.sky} />
            <Circle cx={Math.min(300, light.sunX)} cy={Math.min(120, light.sunY)} r={18} color={light.sun} />
            <Group transform={roll}>
              <Rect x={24} y={110} width={310} height={60} color={light.sea} />
              <Path path="M24 122 q 18 -5 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0" color={light.seaLine} style="stroke" strokeWidth={2} />
              <Path path="M60 108 L 120 96 L 170 104 L 230 92 L 300 102" color={light.land} style="stroke" strokeWidth={10} strokeJoin="round" />
            </Group>
            <Path path="M24 24 h 310 v 140 h -310 Z M128 24 v 140 M230 24 v 140" color="#2e1c19" style="stroke" strokeWidth={8} />
            <Group transform={sway} origin={{ x: 300, y: 16 }}>
              <Path path="M300 16 v 30" color="#2e1c19" style="stroke" strokeWidth={2} />
              <Rect x={290} y={46} width={20} height={26} color="#2e1c19" />
              <Rect x={294} y={50} width={12} height={18} color={light.lamp} opacity={flicker} />
              <Circle cx={300} cy={59} r={34} color={light.lamp} opacity={0.12} />
            </Group>
            <Rect x={0} y={226} width={W} height={H - 226} color="#3a2420" />
            <Path path="M0 244 h 358 M0 262 h 358" color="#2e1c19" style="stroke" strokeWidth={1.4} />
            <Walker look={look} clock={clock} x0={24} x1={112} footY={270} scale={1.3} rimLight={light.lamp} wind />
            <Group transform={[{ translateX: 252 }, { translateY: 236 }]}>
              <Circle cx={0} cy={0} r={44} color="#8a5a3a" style="stroke" strokeWidth={8} />
              <Circle cx={0} cy={0} r={10} color="#8a5a3a" />
              <Path path="M0 -58 V 58 M-58 0 H 58 M-40 -40 L 40 40 M40 -40 L -40 40" color="#8a5a3a" style="stroke" strokeWidth={6} strokeCap="round" />
            </Group>
          </Group>
        ) : (
          <Group>
            <Rect x={0} y={0} width={W} height={H} color="#5a3a2c" />
            <Rect x={0} y={0} width={W} height={H} color={light.lamp} opacity={0.07} />
            <Rect x={150} y={22} width={190} height={146} color={light.sky} />
            <Circle cx={Math.max(170, Math.min(320, light.sunX))} cy={Math.min(110, light.sunY)} r={14} color={light.sun} />
            <Rect x={150} y={116} width={190} height={52} color={light.sea} />
            <Path path="M150 132 q 16 -5 32 0 t 32 0 t 32 0 t 32 0 t 32 0 t 32 0" color={light.seaLine} style="stroke" strokeWidth={2} />
            <Group transform={[{ translateX: 262 }, { translateY: 122 }]}>
              <Path path="M-30 0 L 34 0 L 26 10 L -22 10 Z" color={light.silhouette} />
              <Rect x={0} y={-12} width={18} height={12} color={light.silhouette} />
              <Rect x={4} y={-9} width={4} height={4} color={light.lamp} opacity={flicker} />
              <Path path="M-10 0 V -26 L -24 -6 H -10 Z" color={light.silhouette} />
            </Group>
            <Path path="M150 22 h 190 v 146 h -190 Z M245 22 v 146 M150 96 h 190" color="#2e1c19" style="stroke" strokeWidth={7} />
            <Rect x={140} y={168} width={210} height={10} color="#2e1c19" />
            <Group transform={[{ translateX: 52 }, { translateY: 110 }]}>
              <Path path="M0 -40 v 26" color="#2e1c19" style="stroke" strokeWidth={2} />
              <Rect x={-10} y={-14} width={20} height={24} color="#2e1c19" />
              <Rect x={-6} y={-10} width={12} height={16} color={light.lamp} opacity={flicker} />
              <Circle cx={0} cy={-2} r={40} color={light.lamp} opacity={0.14} />
            </Group>
            {/* A chart on the wall */}
            <Rect x={98} y={30} width={40} height={30} color="#d9c9a8" />
            <Path path="M102 52 q 8 -14 16 -4 q 6 6 14 -8 M104 36 h 6 M120 44 a 3 3 0 1 0 0.1 0" color="#6e4733" style="stroke" strokeWidth={1} />
            <Rect x={98} y={30} width={40} height={30} color="#4a2e22" style="stroke" strokeWidth={2.4} />
            {/* The floor, and a table under the window */}
            <Rect x={0} y={214} width={W} height={H - 214}>
              <LinearGradient start={vec(0, 214)} end={vec(0, H)} colors={['#6e4430', '#3a2420']} />
            </Rect>
            <Path path="M0 232 h 358 M0 252 h 358 M0 272 h 358 M70 214 v 18 M200 232 v 20 M120 252 v 20 M300 214 v 18" color="#2e1c19" style="stroke" strokeWidth={1.2} />
            <Rect x={160} y={214} width={8} height={56} color="#4a2a1e" />
            <Rect x={322} y={214} width={8} height={56} color="#4a2a1e" />
            <Rect x={150} y={206} width={190} height={10} color="#8a5a3a" />
            <Rect x={150} y={206} width={190} height={2} color="#c98a5b" opacity={0.7} />
            <Walker look={look} clock={clock} x0={10} x1={98} footY={274} scale={1.3} rimLight={light.lamp} offset={2600} />
            {/* On the table: a candle and a ship in a bottle */}
            <Group transform={[{ translateX: 236 }, { translateY: 206 }]}>
              <Rect x={-4} y={-18} width={8} height={18} color="#f3e7d8" />
              <Path path="M0 -18 C -3 -22, -1 -26, 0 -28 C 1 -26, 3 -22, 0 -18 Z" color="#ffd27a" opacity={flicker} />
              <Circle cx={0} cy={-22} r={14} opacity={flicker}>
                <RadialGradient c={vec(0, -22)} r={14} colors={['#ffd27a55', '#ffd27a00']} />
              </Circle>
            </Group>
            <Group transform={[{ translateX: 296 }, { translateY: 206 }]}>
              <Path path="M-24 0 C -26 -14, -18 -20, -6 -20 L 14 -20 L 14 -14 L 22 -14 L 22 -6 L 14 -6 L 14 0 Z" color="#9fd8cf" opacity={0.35} />
              <Path path="M-18 -6 L 6 -6 L 3 -2 L -15 -2 Z" color="#6e3a2a" />
              <Path path="M-6 -6 V -17 L -14 -8 Z M-5 -16 L 2 -8 L -5 -8 Z" color="#f3e7d8" />
              <Path path="M-24 0 C -26 -14, -18 -20, -6 -20 L 14 -20 L 14 -14 L 22 -14 L 22 -6 L 14 -6 L 14 0 Z" color="#e8fff9" style="stroke" strokeWidth={0.8} />
              <Rect x={22} y={-13} width={4} height={6} color="#8a5a3a" />
            </Group>
            <Group transform={[{ translateX: 176 }, { translateY: 206 }]}>
              <Path path="M-12 0 v -26 h 24 v 26 Z" color="#c98a5b" />
              <Path path="M12 -20 c 10 0, 10 14, 0 14" color="#6e4733" style="stroke" strokeWidth={3} />
              <Rect x={-12} y={-26} width={24} height={5} color="#fff3dc" />
            </Group>
            <Circle cx={174} cy={steamA.cy} r={steamA.r} opacity={steamA.opacity} color="#fff3dc" />
            <Circle cx={180} cy={steamB.cy} r={steamB.r} opacity={steamB.opacity} color="#fff3dc" />
          </Group>
        )}
      </Group>
    </Canvas>
  )
}
