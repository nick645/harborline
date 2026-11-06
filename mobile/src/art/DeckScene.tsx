// On deck, at sea: you're standing aboard. Your captain at the wheel by the wheelhouse, close
// enough to know; passengers on the benches under the awning and at the rail (a passenger
// boat), or the cargo lashed down with the hands working it (a cargo boat). Past the rail the
// sea runs by and the coast slides past; everything rolls with the swell, harder as the weather
// worsens, under its climate's rain, snow or blowing dust. Design space matches BoatScene
// (358 × 320).

import { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'
import type { BoatClass, Weather } from '../../../src/game/types'
import type { Climate } from '../../../src/game/data/ports'
import { STORM, type Light } from './light'
import { lookFor, type Look, type Prop } from './looks'
import { Figure, FIGURE_FULL_H } from './Figure'
import { Walker } from './Walker'
import { Fall } from './Climate'
import { CLIMATE_LOOK, GLOOM } from './climateLook'
import { useSceneClock } from './clock'
import { hash, mix, shade, tint } from './paint'
import { SCENE_H, SCENE_W } from './BoatScene'

const HORIZON = 120
/** Top of the rail along the far side of the deck, and the deck itself. */
const RAIL = 176
const DECK = 214
/** Where people stand: the near edge of the deck. */
const FOOT = SCENE_H - 12

/** How each weather moves the boat and the sea. */
const SWELL: Record<Weather, { roll: number; heave: number; wave: number; speed: number }> = {
  calm: { roll: 0.006, heave: 1.5, wave: 3, speed: 1 },
  choppy: { roll: 0.014, heave: 3, wave: 6, speed: 1.4 },
  rough: { roll: 0.028, heave: 5, wave: 10, speed: 1.9 },
  storm: { roll: 0.045, heave: 8, wave: 15, speed: 2.6 },
}

const AWNINGS = ['#c2452a', '#2f5d62', '#e9b23c', '#3d5a73', '#7a4e5e']
const COATS = ['#7a4e5e', '#2f5d62', '#c2452a', '#3d5a73', '#e9b23c', '#efe3d2', '#4a3346', '#6b8f4e']

/** Passengers dress for the trip: brims, buns, bare heads, bright coats; umbrellas in the rain. */
function passenger(seed: number, i: number, wet: boolean): Look {
  const look = lookFor(`pax-${seed}-${i}`)
  const hats: Look['hat'][] = ['brim', 'bare', 'bun', 'cap', 'bare', 'brim']
  const props: Prop[] = wet ? ['umbrella', 'none', 'umbrella'] : ['none', 'mug', 'none', 'scroll', 'none', 'coin']
  return { ...look, hat: hats[(seed + i * 7) % hats.length], coat: COATS[(seed + i * 3) % COATS.length], coatStyle: i % 3 === 0 ? 'stripes' : 'peacoat', prop: props[i % props.length] }
}

type Props = {
  width: number
  light: Light
  weather: Weather
  cls: BoatClass
  captain: Look | null
  captainName?: string
  /** Deckhands aboard. */
  hands?: number
  handIds?: string[]
  climate?: Climate
  /** Sailing out (true) or home (false): which way the coast slides. */
  outbound?: boolean
  onOpenCaptain?: () => void
}

export function DeckScene({ width, light, weather, cls, captain, captainName, hands = 0, handIds = [], climate = 'temperate', outbound = true, onOpenCaptain }: Props) {
  const clock = useSceneClock()
  const s = width / SCENE_W
  const sw = SWELL[weather]
  const look = CLIMATE_LOOK[climate]
  const veil = climate === 'temperate' ? STORM.veil : look.veil
  const gloom = GLOOM[weather]
  const g = (c: string, extra = 0) => mix(c, veil, Math.min(1, gloom + extra))
  const lit = (c: string) => g(mix(c, light.silhouette, light.dim * 0.7))
  const night = light.stars > 0
  const seed = hash(cls.id)
  const passengers = cls.track === 'passenger'
  const wet = look.kind === 'rain' && (weather === 'rough' || weather === 'storm')
  const dir = outbound ? -1 : 1

  // The boat under you: the whole deck rolls and heaves; the horizon tilts the other way.
  const roll = useDerivedValue(() => {
    const t = clock.value
    return [{ translateY: Math.sin(t / 620) * sw.heave }, { rotate: Math.sin(t / 900) * sw.roll + Math.sin(t / 410) * sw.roll * 0.3 }]
  })
  const sea = useDerivedValue(() => [{ rotate: -Math.sin(clock.value / 900) * sw.roll * 0.6 }])
  // The sea runs past the rail; the far coast slides slowly by.
  const waves = useDerivedValue(() => [{ translateX: dir * ((clock.value * sw.speed) / 18) % 48 }])
  const coast = useDerivedValue(() => [{ translateX: dir * (((clock.value / 260) % 900) - 450) }])
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 280))
  const wheelTurn = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 1300) * (0.2 + sw.roll * 8) }])
  const flag = useDerivedValue(() => [{ scaleX: 0.85 + 0.15 * Math.sin(clock.value / 160) }, { skewY: 0.15 * Math.sin(clock.value / 120) }])
  // Lightning in a storm, where the climate has it.
  const flash = useDerivedValue(() => {
    if (weather !== 'storm' || !look.lightning) return 0
    const p = (clock.value % 5200) / 5200
    return p < 0.03 ? 0.55 : p > 0.06 && p < 0.1 ? 0.35 : 0
  })

  const wavePath = (y: number, amp: number, len: number) => {
    let d = `M-60 ${y}`
    for (let x = -60; x < SCENE_W + 120; x += len) d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`
    return d
  }
  const swellRows = useMemo(() => [HORIZON + 10, HORIZON + 24, HORIZON + 40, HORIZON + 58], [])
  const hills = 'M-460 0 C -380 -24, -300 -30, -220 -14 C -150 -30, -60 -26, 20 -10 C 90 -22, 180 -34, 260 -16 C 330 -28, 400 -20, 460 -6 L 460 4 L -460 4 Z'

  // Who's aboard, and where.
  const capX = 262
  const benchY = DECK + 30
  const seated = passengers ? Math.min(4, 3 + Math.floor(cls.sizeTier / 3)) : 0
  const strollers = passengers ? (cls.sizeTier >= 2 ? 2 : 1) : 0
  const workers = passengers ? Math.min(hands, 1) : Math.max(1, Math.min(3, hands + 1))
  const awning = AWNINGS[(seed >>> 7) % AWNINGS.length]
  const deckWood = cls.sizeTier >= 4 ? '#a08a6a' : '#b88e5e'

  return (
    <View style={{ width, height: SCENE_H * s }}>
      <Canvas style={{ width, height: SCENE_H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, SCENE_W, SCENE_H), 20, 20)}>
          {/* Sky, and the sea out to the horizon, tilting against the roll */}
          <Rect x={0} y={0} width={SCENE_W} height={SCENE_H}>
            <LinearGradient start={vec(0, 0)} end={vec(0, HORIZON)} colors={[g(light.sky), g(light.skyLow, 0.05)]} />
          </Rect>
          <Circle cx={light.sunX} cy={Math.min(60, light.sunY)} r={20} color={g(light.sun)} opacity={1 - gloom} />
          <Group opacity={light.stars * (1 - gloom)}>
            {[[30, 24], [90, 14], [150, 40], [230, 18], [310, 36], [200, 60]].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={1.1} color="#fff3dc" />
            ))}
          </Group>
          <Group transform={sea} origin={{ x: SCENE_W / 2, y: HORIZON }}>
            <Group transform={coast}>
              <Path path={hills} transform={[{ translateX: SCENE_W / 2 }, { translateY: HORIZON }]} color={g(light.land, 0.1)} />
              <Rect x={SCENE_W / 2 + 120} y={HORIZON - 30} width={5} height={20} color={g('#f3e7d8', 0.1)} />
              <Rect x={SCENE_W / 2 + 119} y={HORIZON - 34} width={7} height={5} color={light.lamp} opacity={night ? 1 : 0.5} />
            </Group>
            <Rect x={-80} y={HORIZON} width={SCENE_W + 160} height={SCENE_H}>
              <LinearGradient start={vec(0, HORIZON)} end={vec(0, RAIL + 30)} colors={[g(light.sea, -0.1), g(mix(light.sea, '#0e0a18', 0.3))]} />
            </Rect>
            <Group transform={waves}>
              {swellRows.map((y, i) => (
                <Path key={y} path={wavePath(y, sw.wave * (0.3 + i * 0.25), 48 - i * 4)} color={g(light.seaLine)} style="stroke" strokeWidth={1 + i * 0.4} opacity={0.5 + i * 0.1} />
              ))}
            </Group>
          </Group>

          {/* Aboard: everything below rolls with her */}
          <Group transform={roll} origin={{ x: SCENE_W / 2, y: FOOT }}>
            {/* The far rail, spray over it in rough water */}
            <Rect x={-20} y={RAIL} width={SCENE_W + 40} height={DECK - RAIL} color={lit(shade(deckWood, 0.35))} />
            <Rect x={-20} y={RAIL - 4} width={SCENE_W + 40} height={6} color={lit('#f3e7d8')} />
            {Array.from({ length: 12 }, (_, i) => (
              <Rect key={i} x={-10 + i * 32} y={RAIL - 26} width={3} height={24} color={lit('#e9dcc4')} />
            ))}
            <Rect x={-20} y={RAIL - 28} width={SCENE_W + 40} height={3} color={lit('#e9dcc4')} />
            {/* Deck planks, running toward you */}
            <Rect x={-20} y={DECK} width={SCENE_W + 40} height={SCENE_H - DECK + 20}>
              <LinearGradient start={vec(0, DECK)} end={vec(0, SCENE_H)} colors={[lit(deckWood), lit(shade(deckWood, 0.18))]} />
            </Rect>
            {Array.from({ length: 9 }, (_, i) => (
              <Path key={i} path={`M${SCENE_W / 2 + (i - 4) * 18} ${DECK} L ${SCENE_W / 2 + (i - 4) * 70} ${SCENE_H + 10}`} color={lit(shade(deckWood, 0.3))} style="stroke" strokeWidth={0.8} />
            ))}
            <Path path={`M-20 ${DECK + 34} H ${SCENE_W + 20} M-20 ${DECK + 72} H ${SCENE_W + 20}`} color={lit(shade(deckWood, 0.22))} style="stroke" strokeWidth={0.6} opacity={0.6} />

            {/* The wheelhouse on the right, its windows lit after dark */}
            <Rect x={292} y={RAIL - 70} width={90} height={DECK - RAIL + 70} color={lit('#efe3d2')} />
            <Rect x={288} y={RAIL - 76} width={98} height={8} color={lit(shade('#3d5a73', 0.1))} />
            <RoundedRect x={302} y={RAIL - 58} width={30} height={22} r={3} color={night ? light.window : g(mix(light.window, '#3a4a58', 0.3))} />
            <RoundedRect x={338} y={RAIL - 58} width={30} height={22} r={3} color={night ? light.window : g(mix(light.window, '#3a4a58', 0.3))} />
            {/* Mast and the line's flag */}
            <Rect x={318} y={RAIL - 150} width={3} height={76} color={lit('#4a2e22')} />
            <Group transform={flag} origin={{ x: 321, y: RAIL - 146 }}>
              <Path path={`M321 ${RAIL - 150} L 346 ${RAIL - 145} L 321 ${RAIL - 138} Z`} color={lit('#c2452a')} />
            </Group>
            <Group>
              <RoundedRect x={315} y={RAIL - 124} width={9} height={9} r={2} color={light.lamp} opacity={flicker} />
              {night && <Circle cx={319.5} cy={RAIL - 119} r={18} color={light.lamp} opacity={0.2} />}
            </Group>

            {passengers ? (
              <>
                {/* An awning over the benches */}
                <Path path={`M8 ${RAIL - 66} H 250`} color={lit('#5a3a2a')} style="stroke" strokeWidth={2} />
                {Array.from({ length: 15 }, (_, i) => (
                  <Rect key={i} x={8 + i * 16.1} y={RAIL - 76} width={16.1} height={10} color={lit(i % 2 ? '#f3e7d8' : awning)} />
                ))}
                <Path path={`M8 ${RAIL - 66} ${'q 4 5 8 0 '.repeat(30)}`} color={lit(awning)} />
                {[14, 244].map((x) => (
                  <Rect key={x} x={x} y={RAIL - 66} width={3} height={DECK - RAIL + 66 + 26} color={lit('#5a3a2a')} />
                ))}
              </>
            ) : (
              <>
                {/* Cargo lashed down along the rail */}
                {[[16, 0, '#a06a44'], [62, 0, '#8a5a3a'], [30, -34, '#7a5236'], [170, 0, '#2f5d62'], [214, 0, '#c2452a'], [190, -30, '#e9b23c']].map(([x, dy, c], i) => (
                  <Group key={i}>
                    <Rect x={x as number} y={DECK - 6 + (dy as number) - 34} width={44} height={34} color={lit(c as string)} />
                    <Path path={`M${x} ${DECK - 40 + (dy as number)} l 44 34 M${(x as number) + 44} ${DECK - 40 + (dy as number)} l -44 34`} color={lit(shade(c as string, 0.35))} style="stroke" strokeWidth={1} />
                  </Group>
                ))}
                <Path path={`M10 ${DECK - 76} L 260 ${DECK - 46}`} color={lit('#c9b6ae')} style="stroke" strokeWidth={1} />
                <RoundedRect x={112} y={DECK - 30} width={22} height={28} r={6} color={lit('#6e4733')} />
                <Path path={`M112 ${DECK - 22} h 22 M112 ${DECK - 10} h 22`} color={lit('#2e1c19')} style="stroke" strokeWidth={1} />
              </>
            )}

            {/* Hands at work: coiling, carrying, keeping watch */}
            {Array.from({ length: workers }, (_, i) => {
              const props: Prop[] = ['crate', 'rope', 'lantern']
              const id = handIds[i] ?? `deckhand-${seed}-${i}`
              const [x0, x1] = passengers ? [70, 200] : [[20, 150], [150, 240], [90, 200]][i]
              return (
                <Walker
                  key={id}
                  look={{ ...lookFor(id), prop: props[i % props.length] }}
                  clock={clock}
                  x0={x0}
                  x1={x1}
                  footY={DECK + 26 - i * 4}
                  scale={0.52}
                  speed={10 + i * 3}
                  pauseMs={2600 + i * 900}
                  offset={i * 1900}
                  wind={weather !== 'calm'}
                />
              )
            })}

            {/* Passengers strolling at the rail */}
            {Array.from({ length: strollers }, (_, i) => (
              <Walker
                key={`walk${i}`}
                look={passenger(seed, 10 + i, wet)}
                clock={clock}
                x0={20 + i * 90}
                x1={150 + i * 70}
                footY={DECK + 20 - i * 3}
                scale={0.55}
                speed={6 + i * 2}
                pauseMs={3800}
                offset={i * 2700}
                wind={weather !== 'calm'}
              />
            ))}

            {/* Passengers on the bench, waist up behind its back */}
            {seated > 0 && (
              <Group>
                {Array.from({ length: seated }, (_, i) => {
                  const x = 24 + i * (220 / seated)
                  return <Figure key={`sit${i}`} look={passenger(seed, i, wet)} x={x} y={benchY - 98} scale={0.86} clock={clock} offset={i * 1300} wind={weather !== 'calm'} />
                })}
                <Rect x={10} y={benchY - 8} width={240} height={12} color={lit('#6e4733')} />
                <Rect x={10} y={benchY - 12} width={240} height={5} color={lit(tint('#6e4733', 0.15))} />
                <Rect x={10} y={benchY + 4} width={240} height={24} color={lit(shade('#6e4733', 0.2))} />
                {[22, 130, 238].map((x) => (
                  <Rect key={x} x={x} y={benchY + 28} width={6} height={22} color={lit('#3a2420')} />
                ))}
              </Group>
            )}

            {/* Your captain at the wheel */}
            {captain && (
              <Group>
                <Figure look={captain} x={capX - 2} y={FOOT - FIGURE_FULL_H * 1.08} scale={1.08} clock={clock} wind={weather !== 'calm'} legs rimLight={night ? light.lamp : undefined} />
                {/* The wheel, at their hands, turning a little with the sea */}
                <Rect x={capX - 18} y={FOOT - 62} width={8} height={62} color={lit('#4a2e22')} />
                <Group transform={wheelTurn} origin={{ x: capX - 14, y: FOOT - 74 }}>
                  <Circle cx={capX - 14} cy={FOOT - 74} r={17} color={lit('#6e4733')} style="stroke" strokeWidth={3.5} />
                  {Array.from({ length: 8 }, (_, k) => {
                    const a = (k / 8) * Math.PI * 2
                    return <Path key={k} path={`M${capX - 14} ${FOOT - 74} l ${Math.cos(a) * 23} ${Math.sin(a) * 23}`} color={lit('#6e4733')} style="stroke" strokeWidth={2.6} strokeCap="round" />
                  })}
                </Group>
                <Circle cx={capX - 14} cy={FOOT - 74} r={4} color={lit('#e9b23c')} />
              </Group>
            )}
          </Group>

          {/* The weather over it all */}
          <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} color={veil} opacity={gloom * 0.35} />
          <Fall climate={climate} weather={weather} clock={clock} wind={dir} />
          {night && (
            <Circle cx={capX + 8} cy={FOOT - 120} r={120}>
              <RadialGradient c={vec(capX + 8, FOOT - 120)} r={120} colors={[`${light.lamp}33`, `${light.lamp}00`]} />
            </Circle>
          )}
          <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} color="#ffe6f2" opacity={flash} />
        </Group>
      </Canvas>
      {captain && onOpenCaptain && (
        <Pressable
          onPress={onOpenCaptain}
          accessibilityRole="button"
          accessibilityLabel={captainName ? `Open Captain ${captainName}` : 'Open captain'}
          style={{ position: 'absolute', left: (capX - 10) * s, top: (FOOT - FIGURE_FULL_H * 1.08) * s, width: 90 * s, height: FIGURE_FULL_H * 1.08 * s }}
        />
      )}
    </View>
  )
}
