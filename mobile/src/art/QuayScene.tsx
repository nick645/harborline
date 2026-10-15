// The quay where captains wait for work: lamps, the Gull & Lantern, boats at their moorings,
// and each recruit standing in their own look. Tap a recruit to step closer.
// Design space is 358 × 280; tap targets are real buttons laid over the canvas.

import { Canvas, Circle, Group, Oval, Path, Rect, rect, rrect } from '@shopify/react-native-skia'
import { Pressable, View } from 'react-native'
import { useDerivedValue } from 'react-native-reanimated'
import type { Light } from './light'
import { lookFor } from './looks'
import { Figure } from './Figure'
import { useSceneClock } from './clock'

const W = 358
const H = 280
const FIGURE_SCALE = 0.95

type Recruit = { id: string; name: string; reputation: number }

export function QuayScene({
  width,
  light,
  recruits,
  selectedId,
  onSelect,
}: {
  width: number
  light: Light
  recruits: Recruit[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const clock = useSceneClock()
  const s = width / W
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const bob = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 650) * 3 }])
  const smoke = (k: number) => {
    'worklet'
    return ((clock.value + k * 1500) % 3000) / 3000
  }
  const puffA = {
    cx: useDerivedValue(() => 326 + 6 * smoke(0)),
    cy: useDerivedValue(() => 8 - 30 * smoke(0)),
    opacity: useDerivedValue(() => 0.6 * (1 - smoke(0))),
  }
  const puffB = {
    cx: useDerivedValue(() => 326 + 6 * smoke(1)),
    cy: useDerivedValue(() => 8 - 30 * smoke(1)),
    opacity: useDerivedValue(() => 0.6 * (1 - smoke(1))),
  }
  // Spread the recruits evenly along the quay, keeping the last one inside the frame.
  const span = W - 36 - 56 * FIGURE_SCALE
  const xs = recruits.map((_, i) => (recruits.length > 1 ? 18 + (i * span) / (recruits.length - 1) : (W - 56 * FIGURE_SCALE) / 2))

  return (
    <View style={{ width, height: H * s }}>
      <Canvas style={{ width, height: H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
          <Rect x={0} y={0} width={W} height={H} color={light.sky} />
          <Circle cx={Math.min(200, light.sunX)} cy={Math.min(100, light.sunY)} r={20} color={light.sun} />
          <Group opacity={light.stars}>
            <Circle cx={40} cy={30} r={1.2} color="#fff3dc" />
            <Circle cx={120} cy={18} r={1} color="#fff3dc" />
            <Circle cx={190} cy={40} r={1.1} color="#fff3dc" />
          </Group>
          <Rect x={0} y={110} width={W} height={80} color={light.sea} />
          <Path path="M0 124 q 18 -5 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0" color={light.seaLine} style="stroke" strokeWidth={2} />
          <Group transform={bob}>
            <Path path="M30 140 L 110 140 L 102 152 L 40 152 Z" color={light.silhouette} />
            <Path path="M66 140 V 102 L 46 132 H 66 Z" color={light.silhouette} />
            <Rect x={80} y={131} width={6} height={5} color={light.lamp} opacity={flicker} />
          </Group>

          <Group transform={[{ translateX: 250 }, { translateY: 44 }]}>
            <Rect x={0} y={0} width={108} height={150} color="#6e4733" />
            <Path path="M-8 0 L 54 -34 L 116 0 Z" color="#4a2e22" />
            <Rect x={70} y={-40} width={12} height={26} color="#4a2e22" />
            <Rect x={16} y={24} width={30} height={34} color={light.lamp} opacity={flicker} />
            <Rect x={62} y={24} width={30} height={34} color={light.lamp} opacity={flicker} />
            <Path path="M31 24 v34 M16 41 h30 M77 24 v34 M62 41 h30" color="#6e4733" style="stroke" strokeWidth={3} />
            <Rect x={36} y={86} width={36} height={64} color="#3a2420" />
            <Rect x={8} y={66} width={92} height={14} color="#2e1c19" />
          </Group>
          <Circle cx={puffA.cx} cy={puffA.cy} r={7} opacity={puffA.opacity} color="#fff3dc" />
          <Circle cx={puffB.cx} cy={puffB.cy} r={7} opacity={puffB.opacity} color="#fff3dc" />

          <Rect x={0} y={186} width={W} height={H - 186} color="#5a3a2c" />
          <Path path="M0 204 h 358 M0 226 h 358 M0 248 h 358 M0 270 h 358" color="#4a2e22" style="stroke" strokeWidth={2} />
          <Rect x={0} y={184} width={W} height={6} color="#8a5a3a" />
          {[70, 200].map((x) => (
            <Group key={x} transform={[{ translateX: x }, { translateY: 186 }]}>
              <Oval x={-54} y={40} width={108} height={32} color={light.lamp} opacity={0.14} />
              <Rect x={-2} y={-70} width={4} height={70} color="#2e1c19" />
              <Rect x={-8} y={-84} width={16} height={16} color="#2e1c19" />
              <Rect x={-5} y={-81} width={10} height={10} color={light.lamp} opacity={flicker} />
            </Group>
          ))}

          {recruits.map((r, i) => (
            <Group key={r.id}>
              {r.id === selectedId && <Oval x={xs[i] - 4} y={H - 26} width={64} height={18} color={light.lamp} opacity={0.45} />}
              <Figure look={lookFor(r.id)} x={xs[i]} y={H - 14 - 100 * FIGURE_SCALE} scale={FIGURE_SCALE} clock={clock} offset={i * 700} />
            </Group>
          ))}
        </Group>
      </Canvas>
      {recruits.map((r, i) => (
        <Pressable
          key={r.id}
          onPress={() => onSelect(r.id)}
          accessibilityRole="button"
          accessibilityLabel={`${r.name}, reputation ${r.reputation} of 5`}
          accessibilityState={{ selected: r.id === selectedId }}
          style={{ position: 'absolute', left: (xs[i] - 4) * s, top: (H - 14 - 100 * FIGURE_SCALE) * s, width: 64 * s, height: 100 * FIGURE_SCALE * s }}
        />
      ))}
    </View>
  )
}
