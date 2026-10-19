// Inside the Gull & Lantern: a fire in the hearth, the barkeep polishing glasses behind the
// bar, and deckhands looking for a berth, talking in pairs. Now and then someone else is
// here: a captain far above the quay's usual, standing by the fire in a coat nobody else
// wears. Tap anyone to step closer. Design space is 358 × 280.

import { Canvas, Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { Pressable, View } from 'react-native'
import { useDerivedValue } from 'react-native-reanimated'
import type { Light } from './light'
import { lookFor } from './looks'
import { Figure, FIGURE_FULL_H } from './Figure'
import { Chatter, Walker } from './Walker'
import { useSceneClock } from './clock'

const W = 358
const H = 280
const FLOOR = 196
const FOOT_Y = 268
const SCALE = 0.6
const FIG_W = 56 * SCALE
const FIG_H = FIGURE_FULL_H * SCALE
const PACE = 7
/** Where each hand stands (figure's left edge), two pairs facing each other across the room. */
const HAND_X = [136, 170, 254, 288]
/** Beside the hearth, warmed by it, not standing in it. */
const CAPTAIN_X = 90

type Person = { id: string; name: string }

export function TavernScene({
  width,
  light,
  hands,
  captain,
  selectedId,
  onSelect,
}: {
  width: number
  light: Light
  hands: Person[]
  captain: Person | null
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const clock = useSceneClock()
  const s = width / W
  const fire = useDerivedValue(() => [{ scaleY: 0.85 + 0.2 * Math.sin(clock.value / 90) + 0.08 * Math.sin(clock.value / 37) }])
  const fireGlow = useDerivedValue(() => 0.5 + 0.12 * Math.sin(clock.value / 120))
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const aura = useDerivedValue(() => 0.45 + 0.2 * Math.sin(clock.value / 700))
  const sparkle = useDerivedValue(() => {
    let d = ''
    for (let i = 0; i < 5; i++) {
      const p = ((clock.value / 2600 + i / 5) % 1 + 1) % 1
      const x = CAPTAIN_X + 4 + ((i * 37) % 30)
      const y = FOOT_Y - 20 - p * 90
      const r = 0.9 + (1 - p) * 0.8
      d += `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
    }
    return d
  })
  const sparkleOpacity = useDerivedValue(() => 0.7 + 0.3 * Math.sin(clock.value / 200))
  const headY = FOOT_Y - FIG_H - 2
  const shown = hands.slice(0, HAND_X.length)

  return (
    <View style={{ width, height: H * s }}>
      <Canvas style={{ width, height: H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
          {/* Walls, beams and a window on the night (or day) */}
          <Rect x={0} y={0} width={W} height={FLOOR}>
            <LinearGradient start={vec(0, 0)} end={vec(0, FLOOR)} colors={['#4a2e22', '#6e4430']} />
          </Rect>
          {Array.from({ length: 9 }, (_, i) => (
            <Path key={i} path={`M${i * 42 + 10} 0 V ${FLOOR}`} color="#3a2420" style="stroke" strokeWidth={1} opacity={0.5} />
          ))}
          <Rect x={0} y={14} width={W} height={8} color="#2e1c19" />
          <Rect x={0} y={150} width={W} height={4} color="#2e1c19" />
          <Rect x={124} y={40} width={70} height={58} color={light.sky} />
          <Circle cx={170} cy={58} r={9} color={light.sun} opacity={light.stars ? 1 : 0.8} />
          <Rect x={124} y={80} width={70} height={18} color={light.sea} />
          <Path path="M124 40 h 70 v 58 h -70 Z M159 40 v 58 M124 69 h 70" color="#2e1c19" style="stroke" strokeWidth={4} />

          {/* The hearth */}
          <Path path="M6 196 V 110 C 6 92, 18 84, 46 84 C 74 84, 86 92, 86 110 V 196 Z" color="#5b5452" />
          <Path path="M6 110 h 80 M6 132 h 80 M6 154 h 80 M6 176 h 80 M26 88 v 22 M66 88 v 22 M46 110 v 22 M26 132 v 22 M66 132 v 22 M46 154 v 22" color="#3f3a3a" style="stroke" strokeWidth={1.2} />
          <Path path="M20 196 V 140 C 20 126, 30 120, 46 120 C 62 120, 72 126, 72 140 V 196 Z" color="#1d1218" />
          <Rect x={2} y={102} width={88} height={8} color="#6e4733" />
          <Circle cx={46} cy={176} r={60} opacity={fireGlow}>
            <RadialGradient c={vec(46, 176)} r={60} colors={['#ffb054aa', '#ffb05400']} />
          </Circle>
          <Group transform={fire} origin={{ x: 46, y: 192 }}>
            <Path path="M30 192 C 28 176, 38 172, 36 158 C 44 166, 46 174, 48 164 C 54 172, 60 178, 62 192 Z" color="#e9772f" />
            <Path path="M36 192 C 36 182, 42 178, 42 170 C 48 178, 52 182, 56 192 Z" color="#ffd27a" />
          </Group>
          <Path path="M28 192 h 36" color="#4a2e22" style="stroke" strokeWidth={4} strokeCap="round" />

          {/* The bar, shelves of bottles, and the barkeep behind it */}
          {[44, 70].map((sy) => (
            <Group key={sy}>
              <Rect x={226} y={sy} width={124} height={4} color="#2e1c19" />
              {Array.from({ length: 9 }, (_, i) => (
                <RoundedRect key={i} x={230 + i * 13} y={sy - 16 + (i % 3)} width={7} height={16 - (i % 3)} r={2} color={['#3f6b5a', '#8a3a3a', '#c9a24a', '#5a7f9a'][(i + sy) % 4]} />
              ))}
            </Group>
          ))}
          <Figure look={lookFor('barkeep')} x={286} y={62} scale={0.95} clock={clock} offset={500} />
          <Rect x={218} y={150} width={140} height={46} color="#5a3424" />
          <Rect x={214} y={146} width={144} height={6} color="#8a5a3a" />
          <Rect x={214} y={146} width={144} height={1.5} color="#c98a5b" opacity={0.7} />
          {[0, 1, 2].map((i) => (
            <Rect key={i} x={226 + i * 44} y={160} width={36} height={30} color="#4a2a1e" style="stroke" strokeWidth={1.6} />
          ))}
          {[240, 300].map((x) => (
            <Group key={x}>
              <RoundedRect x={x} y={134} width={9} height={12} r={2} color="#c98a5b" />
              <Rect x={x} y={134} width={9} height={3} color="#fff3dc" />
            </Group>
          ))}

          {/* Hanging lamps */}
          {[110, 210].map((x) => (
            <Group key={x}>
              <Path path={`M${x} 22 v 22`} color="#2e1c19" style="stroke" strokeWidth={1.4} />
              <Rect x={x - 7} y={44} width={14} height={14} color="#2e1c19" />
              <Rect x={x - 4.5} y={46.5} width={9} height={9} color={light.lamp} opacity={flicker} />
              <Circle cx={x} cy={51} r={40} opacity={flicker}>
                <RadialGradient c={vec(x, 51)} r={40} colors={[`${light.lamp}44`, `${light.lamp}00`]} />
              </Circle>
            </Group>
          ))}

          {/* Floorboards and a table */}
          <Rect x={0} y={FLOOR} width={W} height={H - FLOOR}>
            <LinearGradient start={vec(0, FLOOR)} end={vec(0, H)} colors={['#6e4430', '#3a2420']} />
          </Rect>
          <Path path="M0 214 h 358 M0 236 h 358 M0 260 h 358 M60 196 v 18 M180 214 v 22 M300 196 v 18 M120 236 v 24 M240 236 v 24" color="#2e1c19" style="stroke" strokeWidth={1.1} />
          <Group transform={[{ translateX: 228 }, { translateY: 212 }]}>
            <Oval x={-24} y={30} width={48} height={8} color="#000000" opacity={0.2} />
            <Rect x={-3} y={4} width={6} height={30} color="#4a2a1e" />
            <RoundedRect x={-22} y={0} width={44} height={6} r={2} color="#8a5a3a" />
            <RoundedRect x={-14} y={-10} width={8} height={10} r={2} color="#c98a5b" />
            <Rect x={4} y={-14} width={4} height={14} color="#f3e7d8" />
            <Path path="M6 -14 C 4 -17, 6 -20, 6 -21 C 7 -20, 9 -17, 6 -14 Z" color="#ffd27a" opacity={flicker} />
          </Group>

          {/* The rare captain, by the fire, in a glow of their own */}
          {captain && (
            <Group>
              <Oval x={CAPTAIN_X - 18} y={FOOT_Y - FIG_H - 18} width={FIG_W + 36} height={FIG_H + 30} opacity={aura}>
                <RadialGradient c={vec(CAPTAIN_X + FIG_W / 2, FOOT_Y - FIG_H / 2)} r={FIG_H * 0.75} colors={['#f2c75a66', '#f2c75a00']} />
              </Oval>
              <Walker look={lookFor(captain.id, true)} clock={clock} x0={CAPTAIN_X} x1={CAPTAIN_X + 10} footY={FOOT_Y} scale={SCALE * 1.1} speed={5} pauseMs={7000} offset={900} rimLight="#f2c75a" />
              <Path path={sparkle} color="#f2c75a" opacity={sparkleOpacity} />
            </Group>
          )}

          {/* Hands looking for a berth, talking in pairs */}
          {shown.map((h, i) => {
            const chosen = h.id === selectedId
            const x = HAND_X[i]
            const towards = i % 2 === 0 ? 1 : -1
            return (
              <Group key={h.id} opacity={selectedId && !chosen ? 0.85 : 1}>
                {chosen && <Oval x={x - 6} y={FOOT_Y - 8} width={FIG_W + 12 + PACE} height={12} color={light.lamp} opacity={0.45} />}
                <Walker look={lookFor(h.id)} clock={clock} x0={x} x1={x + towards * PACE} footY={FOOT_Y} scale={SCALE} speed={5} pauseMs={5200 + i * 700} offset={i * 1300} rimLight={chosen ? light.lamp : undefined} />
              </Group>
            )
          })}
          {shown.length >= 2 && <Chatter clock={clock} a={{ x: HAND_X[0] + FIG_W / 2, y: headY }} b={{ x: HAND_X[1] + FIG_W / 2, y: headY }} />}
          {shown.length >= 4 && <Chatter clock={clock} a={{ x: HAND_X[2] + FIG_W / 2, y: headY }} b={{ x: HAND_X[3] + FIG_W / 2, y: headY }} offset={1700} />}
        </Group>
      </Canvas>
      {[...(captain ? [{ p: captain, x: CAPTAIN_X, w: FIG_W * 1.1 + 10 }] : []), ...shown.map((p, i) => ({ p, x: HAND_X[i] - PACE, w: FIG_W + 2 * PACE }))].map(({ p, x, w }) => (
        <Pressable
          key={p.id}
          onPress={() => onSelect(p.id)}
          accessibilityRole="button"
          accessibilityLabel={p.name}
          accessibilityState={{ selected: p.id === selectedId }}
          style={{ position: 'absolute', left: x * s, top: (FOOT_Y - FIG_H * 1.1) * s, width: w * s, height: FIG_H * 1.1 * s }}
        />
      ))}
    </View>
  )
}
