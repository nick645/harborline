// The quay where captains wait for work: the Gull & Lantern with its swinging sign, bunting
// strung from the lamps, a boat at her mooring, gulls, crates and barrels, and each recruit
// standing in their own look. The one you're looking at stands in a pool of lamplight.
// Design space is 358 × 280; tap targets are real buttons laid over the canvas.

import { Canvas, Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { Pressable, View } from 'react-native'
import { useDerivedValue } from 'react-native-reanimated'
import { getBoatClass } from '../../../src/game/economy'
import type { Light } from './light'
import { lookFor } from './looks'
import { REGION_STYLE } from './regionStyle'
import type { RegionId } from '../../../src/game/data/ports'
import { FIGURE_FULL_H } from './Figure'
import { Chatter, Walker } from './Walker'
import { BoatArt } from './BoatArt'
import { useSceneClock } from './clock'
import { mix, shade } from './paint'

const W = 358
const H = 280
const FIGURE_SCALE = 0.68
/** Recruits pace a little either side of their spot. */
const PACE = 12
const FOOT_Y = 272
const FIG_TOP = FOOT_Y - FIGURE_FULL_H * FIGURE_SCALE
const QUAY_Y = 186
const MOORED = getBoatClass('skiff')

type Recruit = { id: string; name: string; reputation: number }

const BUNTING = ['#c2452a', '#e9b23c', '#2f5d62', '#f3e7d8', '#7a4e5e']

export function QuayScene({
  width,
  light,
  recruits,
  selectedId,
  onSelect,
  onEnterTavern,
  region = 'bay',
}: {
  width: number
  light: Light
  recruits: Recruit[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Tap the Gull & Lantern to go inside. */
  onEnterTavern?: () => void
  /** Where these people are from, which shows in how they dress. */
  region?: RegionId
}) {
  const clock = useSceneClock()
  const s = width / W
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.8)
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const bob = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 650) * 2.5 }, { rotate: Math.sin(clock.value / 900) * 0.012 }])
  const swing = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 1100) * 0.08 }])
  const sway = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 1300) * 1.5 }])
  const waves = useDerivedValue(() => [{ translateX: -((clock.value / 70) % 36) }])
  const gullA = useDerivedValue(() => {
    const t = clock.value / 1000
    return [{ translateX: ((t * 18) % 460) - 50 }, { translateY: 46 + Math.sin(t * 0.9) * 8 }]
  })
  const gullB = useDerivedValue(() => {
    const t = clock.value / 1000 + 9
    return [{ translateX: ((t * 13) % 460) - 50 }, { translateY: 70 + Math.sin(t * 1.2) * 6 }, { scale: 0.75 }]
  })
  const flap = useDerivedValue(() => {
    const f = Math.sin(clock.value / 120) * 4
    return `M-7 ${f * 0.3} Q -3.5 ${-f} 0 0 Q 3.5 ${-f} 7 ${f * 0.3}`
  })
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
  const span = W - 36 - 56 * FIGURE_SCALE - 2 * PACE
  const pairs = Math.floor(recruits.length / 2)
  const xs = recruits.map((_, i) => (recruits.length > 1 ? 18 + PACE + (i * span) / (recruits.length - 1) : (W - 56 * FIGURE_SCALE) / 2))
  const st = REGION_STYLE[region]
  const wall = lit(region === 'bay' ? '#7a5038' : st.walls[0])
  const roof = lit(region === 'bay' ? '#4a2e22' : st.roofs[0])
  const sky = mix(light.sky, st.tint, st.tintAmount)
  const skyLow = mix(light.skyLow, st.tint, st.tintAmount)
  const sea = mix(light.sea, st.tint, st.tintAmount * 0.7)
  const night = light.stars > 0

  return (
    <View style={{ width, height: H * s }}>
      <Canvas style={{ width, height: H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
          {/* Sky and sea */}
          <Rect x={0} y={0} width={W} height={112}>
            <LinearGradient start={vec(0, 0)} end={vec(0, 112)} colors={[sky, skyLow]} />
          </Rect>
          <Circle cx={Math.min(200, light.sunX)} cy={Math.min(90, light.sunY)} r={20} color={light.sun} />
          <Group opacity={light.stars}>
            {[[40, 30], [120, 18], [190, 40], [160, 70], [70, 60]].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={1.1} color="#fff3dc" />
            ))}
          </Group>
          <Path path="M0 112 L 30 100 L 70 106 L 110 96 L 160 104 L 250 98 L 250 112 Z" color={light.land} />
          <Rect x={0} y={110} width={W} height={80}>
            <LinearGradient start={vec(0, 110)} end={vec(0, 190)} colors={[sea, mix(sea, '#0e0a18', 0.3)]} />
          </Rect>
          <Group transform={waves}>
            {[124, 146, 168].map((wy, i) => (
              <Path key={wy} path={`M0 ${wy} ${'q 9 -3 18 0 t 18 0 '.repeat(12)}`} color={light.seaLine} style="stroke" strokeWidth={1.6} opacity={0.8 - i * 0.2} />
            ))}
          </Group>
          {[gullA, gullB].map((g, i) => (
            <Group key={i} transform={g}>
              <Path path={flap} color={night ? '#c9c0cf' : '#3a2e36'} style="stroke" strokeWidth={1.6} strokeCap="round" strokeJoin="round" />
            </Group>
          ))}

          {/* A boat at her mooring */}
          <Group transform={bob} origin={{ x: 110, y: 168 }}>
            <BoatArt cls={MOORED} light={light} x={30} y={168} scale={0.6} clock={clock} />
          </Group>
          <Path path="M30 165 C 24 178, 18 182, 12 186" color={lit('#c9b6ae')} style="stroke" strokeWidth={1} />

          {/* The Gull & Lantern */}
          <Group transform={[{ translateX: 250 }, { translateY: 44 }]}>
            <Rect x={0} y={0} width={108} height={150} color={wall} />
            {Array.from({ length: 14 }, (_, i) => (
              <Path key={i} path={`M0 ${8 + i * 10.5} h 108`} color={shade(wall, 0.25)} style="stroke" strokeWidth={0.8} />
            ))}
            <Path path="M0 0 V 150 M108 0 V 150" color={lit('#4a2e22')} style="stroke" strokeWidth={5} />
            <Path path="M-10 2 L 54 -36 L 118 2 Z" color={roof} />
            <Path path="M-10 2 L 54 -36 L 118 2" color={lit('#2e1c19')} style="stroke" strokeWidth={3} strokeJoin="round" />
            <Rect x={70} y={-42} width={12} height={26} color={lit('#4a2e22')} />
            {[16, 62].map((wx) => (
              <Group key={wx}>
                <Rect x={wx} y={22} width={30} height={34} color={light.window} />
                <Rect x={wx} y={22} width={30} height={34} color={light.lamp} opacity={flicker} />
                <Path path={`M${wx + 15} 22 v34 M${wx} 39 h30`} color={lit('#4a2e22')} style="stroke" strokeWidth={2.4} />
                <Rect x={wx - 3} y={56} width={36} height={4} color={lit('#4a2e22')} />
                <Rect x={wx - 2} y={60} width={34} height={6} color={lit('#4f7a3a')} />
                {[0, 1, 2, 3].map((k) => (
                  <Circle key={k} cx={wx + 4 + k * 8} cy={60} r={2.2} color={lit(['#c2452a', '#e9b23c', '#e8a0b4', '#c2452a'][k])} />
                ))}
              </Group>
            ))}
            <Rect x={36} y={86} width={36} height={64} color={lit('#3a2420')} />
            <Path path="M36 86 Q 54 72 72 86" color={lit('#4a2e22')} style="stroke" strokeWidth={4} />
            <Rect x={58} y={116} width={4} height={4} color="#d9a441" />
            {onEnterTavern && (
              <Rect x={36} y={86} width={36} height={64} opacity={flicker}>
                <RadialGradient c={vec(54, 140)} r={44} colors={[`${light.lamp}66`, `${light.lamp}00`]} />
              </Rect>
            )}
            {night && (
              <Rect x={36} y={86} width={36} height={64}>
                <RadialGradient c={vec(54, 150)} r={60} colors={[`${light.lamp}55`, `${light.lamp}00`]} />
              </Rect>
            )}
            {/* Swinging sign */}
            <Path path="M-2 70 H -30" color={lit('#2e1c19')} style="stroke" strokeWidth={2.4} />
            <Group transform={swing} origin={{ x: -24, y: 70 }}>
              <Path path="M-28 70 v 6 M-6 70 v 6" color={lit('#2e1c19')} style="stroke" strokeWidth={0.8} />
              <RoundedRect x={-34} y={76} width={32} height={22} r={3} color={lit('#2a4a3e')} />
              <RoundedRect x={-34} y={76} width={32} height={22} r={3} color="#d9a441" style="stroke" strokeWidth={1.2} />
              <Path path="M-25 87 q 3 -4 7 0 q 3 -4 7 0" color={lit('#f3e7d8')} style="stroke" strokeWidth={1.4} strokeCap="round" />
              <Circle cx={-18} cy={92} r={2} color="#ffd27a" opacity={flicker} />
            </Group>
          </Group>
          <Circle cx={puffA.cx} cy={puffA.cy} r={7} opacity={puffA.opacity} color="#fff3dc" />
          <Circle cx={puffB.cx} cy={puffB.cy} r={7} opacity={puffB.opacity} color="#fff3dc" />

          {/* The quay boards */}
          <Rect x={0} y={QUAY_Y} width={W} height={H - QUAY_Y}>
            <LinearGradient start={vec(0, QUAY_Y)} end={vec(0, H)} colors={[lit('#6a4432'), lit('#4a2e22')]} />
          </Rect>
          <Path path="M0 204 h 358 M0 226 h 358 M0 248 h 358 M0 270 h 358" color={lit('#3a2420')} style="stroke" strokeWidth={1.6} />
          <Path path="M60 186 v 18 M150 204 v 22 M240 186 v 18 M100 226 v 22 M300 226 v 22 M30 248 v 22 M200 248 v 22" color={lit('#3a2420')} style="stroke" strokeWidth={1.2} />
          <Rect x={0} y={QUAY_Y - 2} width={W} height={6} color={lit('#8a5a3a')} />
          {/* Bollard, crates and barrels at the edges */}
          <RoundedRect x={4} y={QUAY_Y - 14} width={12} height={14} r={4} color={lit('#2e1c19')} />
          <Path path="M10 186 C 18 182, 22 174, 28 168" color={lit('#c9b6ae')} style="stroke" strokeWidth={1.2} />
          <Group>
            <Rect x={226} y={QUAY_Y - 18} width={20} height={18} color={lit('#8a5a3a')} />
            <Path path="M226 168 l 20 18 M226 177 h 20" color={lit('#4a2e1e')} style="stroke" strokeWidth={0.9} />
            <RoundedRect x={208} y={QUAY_Y - 16} width={14} height={16} r={4} color={lit('#6e4733')} />
            <Path path="M208 175 h 14 M208 181 h 14" color={lit('#2e1c19')} style="stroke" strokeWidth={1} />
          </Group>

          {/* Lamps with bunting strung between them */}
          <Path path="M70 104 Q 135 124 200 104" color={lit('#2e1c19')} style="stroke" strokeWidth={0.6} />
          {Array.from({ length: 9 }, (_, i) => {
            const t = (i + 1) / 10
            const bx = 70 + 130 * t
            const by = 104 + 2 * t * (1 - t) * 20 * 2
            return <Path key={i} path={`M${bx - 4} ${by} L ${bx + 4} ${by} L ${bx} ${by + 8} Z`} color={lit(BUNTING[i % BUNTING.length])} />
          })}
          <Group transform={sway}>
            {[70, 200].map((x) => (
              <Group key={x} transform={[{ translateX: x }, { translateY: QUAY_Y }]}>
                <Oval x={-60} y={38} width={120} height={36}>
                  <RadialGradient c={vec(0, 56)} r={60} colors={[`${light.lamp}44`, `${light.lamp}00`]} />
                </Oval>
                <Rect x={-2} y={-70} width={4} height={70} color={lit('#2e1c19')} />
                <Path path="M-9 -84 h 18 l -2 -4 h -14 Z" color={lit('#2e1c19')} />
                <Rect x={-8} y={-84} width={16} height={16} color={lit('#2e1c19')} />
                <Rect x={-5} y={-81} width={10} height={10} color={light.lamp} opacity={flicker} />
                <Circle cx={0} cy={-76} r={16} opacity={flicker}>
                  <RadialGradient c={vec(0, -76)} r={16} colors={[`${light.lamp}66`, `${light.lamp}00`]} />
                </Circle>
              </Group>
            ))}
          </Group>

          {recruits.map((r, i) => {
            const chosen = r.id === selectedId
            const cx = xs[i] + 28 * FIGURE_SCALE
            return (
              <Group key={r.id} opacity={selectedId && !chosen ? 0.82 : 1}>
                {chosen && (
                  <>
                    <Path path={`M${cx - 14} 120 L ${cx + 14} 120 L ${cx + 44} ${H} L ${cx - 44} ${H} Z`} opacity={0.5}>
                      <LinearGradient start={vec(0, 120)} end={vec(0, H)} colors={[`${light.lamp}00`, `${light.lamp}55`]} />
                    </Path>
                    <Oval x={xs[i] - PACE - 6} y={FOOT_Y - 10} width={56 * FIGURE_SCALE + 2 * PACE + 12} height={16} color={light.lamp} opacity={0.4} />
                  </>
                )}
                <Walker
                  look={lookFor(r.id, false, region)}
                  clock={clock}
                  // Pairs drift toward each other to talk; an odd one out paces on their own.
                  x0={i < pairs * 2 ? xs[i] : xs[i] - PACE}
                  x1={i < pairs * 2 ? xs[i] + (i % 2 === 0 ? PACE : -PACE) : xs[i] + PACE}
                  footY={FOOT_Y}
                  scale={FIGURE_SCALE}
                  speed={8}
                  pauseMs={4200 + i * 900}
                  offset={i * 1700}
                  rimLight={chosen ? light.lamp : undefined}
                />
              </Group>
            )
          })}
          {Array.from({ length: pairs }, (_, k) => (
            <Chatter
              key={k}
              clock={clock}
              a={{ x: xs[2 * k] + (56 * FIGURE_SCALE) / 2 + 6, y: FIG_TOP - 2 }}
              b={{ x: xs[2 * k + 1] + (56 * FIGURE_SCALE) / 2 - 6, y: FIG_TOP - 2 }}
              offset={k * 1700}
            />
          ))}
        </Group>
      </Canvas>
      {onEnterTavern && (
        <Pressable
          onPress={onEnterTavern}
          accessibilityRole="button"
          accessibilityLabel={`Go into ${st.tavern}`}
          style={{ position: 'absolute', left: 250 * s, top: 4 * s, width: 108 * s, height: 180 * s }}
        />
      )}
      {recruits.map((r, i) => (
        <Pressable
          key={r.id}
          onPress={() => onSelect(r.id)}
          accessibilityRole="button"
          accessibilityLabel={`${r.name}, reputation ${r.reputation} of 5`}
          accessibilityState={{ selected: r.id === selectedId }}
          style={{ position: 'absolute', left: (xs[i] - PACE - 4) * s, top: (FIG_TOP - 4) * s, width: (56 * FIGURE_SCALE + 2 * PACE + 8) * s, height: (FOOT_Y - FIG_TOP + 8) * s }}
        />
      ))}
    </View>
  )
}

