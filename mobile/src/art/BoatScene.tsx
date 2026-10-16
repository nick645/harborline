// Your boat, live: side on, in the weather of the trip she's on, under your own sky.
// Weather is a dial, not a switch: from calm to storm the clouds close in, the sea climbs,
// the rain thickens and slants, the boat pitches harder, and in a storm the cold violet and
// magenta lightning take over the warm harbour light. Design space is 358 × 320.

import { useMemo } from 'react'
import { Canvas, Circle, Group, LinearGradient, Path, Rect, rect, rrect, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { BoatClass, Weather } from '../../../src/game/types'
import type { Look } from './looks'
import { STORM, type Light } from './light'
import { BoatArt } from './BoatArt'
import { boatLayout } from './boatGeometry'
import { useSceneClock } from './clock'
import { mix } from './paint'

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
  /** Your captain's look, if one is aboard. */
  captain: Look | null
  /** Hull condition 0–100, shown as wear. */
  condition?: number
  /** Deckhands aboard. */
  hands?: number
}

/** How each weather looks. `k` runs 0 (calm) to 3 (storm). */
interface Mood {
  k: number
  /** 0–1: how much of the sky the cloud takes. */
  cloud: number
  /** 0–1: how far the scene sinks toward storm violet. */
  gloom: number
  /** Wave height in scene units, and how fast the sea runs. */
  wave: number
  speed: number
  /** Rain streaks per layer (0 for none) and their slant. */
  rain: number
  slant: number
  /** Boat motion multipliers. */
  heave: number
  roll: number
  /** Foam on the crests, 0–1. */
  foam: number
  spray: boolean
  lightning: boolean
}

const MOODS: Record<Weather, Mood> = {
  calm: { k: 0, cloud: 0.1, gloom: 0, wave: 3, speed: 1, rain: 0, slant: 0, heave: 1, roll: 1, foam: 0, spray: false, lightning: false },
  choppy: { k: 1, cloud: 0.4, gloom: 0.12, wave: 6, speed: 1.4, rain: 0, slant: 0, heave: 1.6, roll: 1.6, foam: 0.35, spray: false, lightning: false },
  rough: { k: 2, cloud: 0.75, gloom: 0.38, wave: 10, speed: 1.9, rain: 34, slant: 8, heave: 2.4, roll: 2.6, foam: 0.7, spray: true, lightning: false },
  storm: { k: 3, cloud: 1, gloom: 0.7, wave: 15, speed: 2.6, rain: 70, slant: 16, heave: 3.4, roll: 3.8, foam: 1, spray: true, lightning: true },
}

/** A run of sea from x = -80 to 440: rounded troughs and sharper crests as the waves grow. */
function seaPath(amp: number, len: number, closed: boolean): string {
  let d = `M-80 0`
  for (let x = -80; x < 440; x += len) {
    const h = amp
    d += ` Q ${x + len * 0.25} ${h * 0.6} ${x + len * 0.5} ${h * 0.5} Q ${x + len * 0.8} ${h * 0.35} ${x + len} ${-h * 0.5}`
  }
  return closed ? `${d} L 440 200 L -80 200 Z` : d
}

/** Foam caps sitting on each crest of a seaPath. */
function foamPath(amp: number, len: number): string {
  let d = ''
  for (let x = -80; x < 440; x += len) {
    const cx = x + len
    const cy = -amp * 0.5
    d += `M${cx - len * 0.18} ${cy + amp * 0.12} Q ${cx - len * 0.06} ${cy - 3} ${cx + 2} ${cy + 1} Q ${cx - len * 0.04} ${cy + 3} ${cx - len * 0.18} ${cy + amp * 0.18} Z `
  }
  return d
}

/** Rain streaks in a 358 × 360 tile, a stable scatter. */
function rainPath(n: number, slant: number, len: number, seed: number): string {
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = ((i * 73 + seed * 31) % 400) - 20
    const y = (i * 137 + seed * 17) % 360
    d += `M${x} ${y} l ${-slant} ${len} `
  }
  return d
}

const CLOUDS = [
  'M-40 70 C -20 40, 30 36, 50 56 C 70 26, 130 22, 150 52 C 170 40, 210 44, 214 70 Z',
  'M150 64 C 170 34, 230 30, 250 54 C 270 30, 330 30, 340 58 C 370 54, 390 70, 384 80 L 150 80 Z',
  'M-30 104 C 10 84, 60 90, 90 98 C 130 80, 190 84, 220 98 C 260 84, 330 86, 390 100 L 390 120 L -30 120 Z',
]

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

export function BoatScene({ width, light, weather, mode, cls, captain, condition = 100, hands }: Props) {
  const clock = useSceneClock()
  const s = width / SCENE_W
  const m = MOODS[weather]
  const atSea = mode === 'sailing' || mode === 'returning'

  const layout = boatLayout(cls)
  const W = layout.W
  const scale = (170 + cls.sizeTier * 12) / W
  const boatX = (SCENE_W - W * scale) / 2 + (mode === 'docked' ? 30 : 0)
  const flip = mode === 'returning'
  const waterY = DECK_Y + layout.waterline * scale * 0.85
  // Wind blows from the bow back over the stern, whichever way she's heading.
  const wind = flip ? 1 : -1

  // Colours, sunk toward the storm by the weather's gloom.
  const g = (c: string, extra = 0) => mix(c, STORM.veil, Math.min(1, m.gloom + extra))
  const sky = g(light.sky)
  const skyLow = g(light.skyLow, 0.05)
  const sea = g(light.sea, -0.1)
  const seaDeep = mix(sea, '#0e0a18', 0.35 + m.k * 0.08)
  const seaLine = g(light.seaLine)
  const cloud = mix(mix(light.skyLow, '#c9c0cf', 0.4), STORM.cloud, Math.min(1, m.gloom * 1.3))

  const backSea = useMemo(() => seaPath(m.wave * 0.45, 46, true), [m.wave])
  const midSea = useMemo(() => seaPath(m.wave * 0.7, 64, true), [m.wave])
  const frontSea = useMemo(() => seaPath(m.wave, 92, true), [m.wave])
  const frontLine = useMemo(() => seaPath(m.wave, 92, false), [m.wave])
  const frontFoam = useMemo(() => foamPath(m.wave, 92), [m.wave])
  const midFoam = useMemo(() => foamPath(m.wave * 0.7, 64), [m.wave])
  const rainNear = useMemo(() => rainPath(m.rain, m.slant * wind * -1, 22, 1), [m.rain, m.slant, wind])
  const rainFar = useMemo(() => rainPath(Math.round(m.rain * 0.8), m.slant * 0.6 * wind * -1, 12, 7), [m.rain, m.slant, wind])

  const run = (len: number, ms: number) => {
    'worklet'
    return (((clock.value * m.speed) / ms) % len) * -1
  }
  const backT = useDerivedValue(() => [{ translateX: run(46, 90) }, { translateY: HORIZON + 6 }])
  const midT = useDerivedValue(() => [{ translateX: run(64, 60) }, { translateY: HORIZON + 34 }])
  const frontT = useDerivedValue(() => [{ translateX: run(92, 38) }, { translateY: DECK_Y + 44 + Math.sin(clock.value / 600) * m.wave * 0.15 }])
  const cloudT = (k: number) => {
    'worklet'
    return [{ translateX: ((clock.value * m.speed) / (90 + k * 50)) % 420 - 30 }]
  }
  const cloudA = useDerivedValue(() => cloudT(0))
  const cloudB = useDerivedValue(() => cloudT(1))
  const cloudC = useDerivedValue(() => cloudT(2))

  const bob = useDerivedValue(() => {
    const t = clock.value
    return [
      { translateY: Math.sin(t / 510) * 3 * m.heave },
      // Pitch: bow rises on the swell, then digs in.
      { rotate: (Math.sin(t / 700) * 0.014 + Math.sin(t / 330) * 0.005 * m.k) * m.roll },
    ]
  })
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 280))
  const beam = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 1400) * 0.6 }])
  const rainNearT = useDerivedValue(() => {
    const o = (clock.value / 5) % 360
    return [{ translateX: (o * m.slant * wind * -1) / 22 }, { translateY: o - 360 }]
  })
  const rainNearT2 = useDerivedValue(() => {
    const o = (clock.value / 5) % 360
    return [{ translateX: (o * m.slant * wind * -1) / 22 }, { translateY: o }]
  })
  const rainFarT = useDerivedValue(() => {
    const o = (clock.value / 9) % 360
    return [{ translateX: (o * m.slant * 0.6 * wind * -1) / 12 }, { translateY: o - 360 }]
  })
  const rainFarT2 = useDerivedValue(() => {
    const o = (clock.value / 9) % 360
    return [{ translateX: (o * m.slant * 0.6 * wind * -1) / 12 }, { translateY: o }]
  })

  // Lightning: a strike every few seconds at a different place, a double flash, a bright veil.
  const STRIKE_MS = 4300
  const strikeN = useDerivedValue(() => Math.floor(clock.value / STRIKE_MS))
  const strikeP = useDerivedValue(() => (clock.value % STRIKE_MS) / STRIKE_MS)
  const flash = useDerivedValue(() => {
    const p = strikeP.value
    return p < 0.03 ? 1 : p > 0.06 && p < 0.1 ? 0.75 : 0
  })
  const bolt = useDerivedValue(() => {
    const n = strikeN.value
    const r = (i: number) => {
      const v = Math.sin(n * 12.9898 + i * 78.233) * 43758.5453
      return v - Math.floor(v)
    }
    let x = 40 + r(0) * 280
    let y = 70
    let d = `M${x} ${y}`
    for (let i = 1; i <= 6; i++) {
      x += (r(i) - 0.5) * 26
      y += 18 + r(i + 7) * 6
      d += ` L ${x} ${y}`
    }
    return d
  })
  const flashVeil = useDerivedValue(() => flash.value * 0.22)
  const boltGlow = useDerivedValue(() => flash.value * 0.5)

  // Spray: the bow buries into a crest and throws water, on the swell's beat.
  const bowX = flip ? boatX + 6 : boatX + W * scale - 6
  const sprayP = useDerivedValue(() => ((clock.value * m.speed) % 1700) / 1700)
  const sprayOpacity = useDerivedValue(() => (sprayP.value < 0.5 ? 0.85 * (1 - sprayP.value * 2) : 0))
  // All six drops in one path, thrown forward of the bow and falling back.
  const ahead = flip ? -1 : 1
  const spray = useDerivedValue(() => {
    const p = sprayP.value
    let d = ''
    for (let i = 0; i < 6; i++) {
      const x = bowX + ahead * (4 + i * 5) * p * 4
      const y = DECK_Y - 4 - (14 + i * 4) * Math.sin(p * Math.PI) * (m.k / 2)
      const r = 1.6 + (i % 3) * 0.8
      d += `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
    }
    return d
  })

  // Funnel smoke streams back, flattened by the wind.
  const stack = layout.stack
  const stackMid = stack ? stack.x + stack.w / 2 : 0
  const stackX = boatX + (flip ? (W - stackMid) * scale : stackMid * scale)
  const stackY = DECK_Y + (stack ? stack.y : 0) * scale
  const drift = wind * (26 + m.k * 18)
  const puffs = [usePuff(clock, 0, stackX, stackY, drift), usePuff(clock, 1, stackX, stackY, drift), usePuff(clock, 2, stackX, stackY, drift)]

  return (
    <Canvas style={{ width, height: SCENE_H * s }}>
      <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, SCENE_W, SCENE_H), 20, 20)}>
        {/* Sky */}
        <Rect x={0} y={0} width={SCENE_W} height={HORIZON}>
          <LinearGradient start={vec(0, 0)} end={vec(0, HORIZON)} colors={[sky, skyLow]} />
        </Rect>
        <Group opacity={1 - m.cloud * 0.9}>
          <Circle cx={light.sunX} cy={light.sunY} r={28} color={light.sun} />
          <Group opacity={light.stars}>
            {[[40, 40], [96, 70], [150, 30], [200, 58], [320, 34], [250, 20], [70, 22], [290, 76]].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={1.2} color="#fff3dc" />
            ))}
          </Group>
        </Group>
        {m.lightning && (
          <Group>
            <Rect x={0} y={0} width={SCENE_W} height={HORIZON} color={STORM.bolt} opacity={boltGlow} />
            <Path path={bolt} color="#ffe6f2" style="stroke" strokeWidth={2.4} strokeJoin="round" opacity={flash} />
            <Path path={bolt} color={STORM.bolt} style="stroke" strokeWidth={6} strokeJoin="round" opacity={boltGlow} />
          </Group>
        )}

        {/* Clouds, more and darker with the weather; the low bank only comes in rough and worse. */}
        <Group opacity={m.cloud}>
          <Group transform={cloudA}>
            <Path path={CLOUDS[0]} color={cloud} />
          </Group>
          <Group transform={cloudB}>
            <Path path={CLOUDS[1]} color={mix(cloud, '#000000', 0.08)} />
          </Group>
        </Group>
        {m.k >= 2 && (
          <Group transform={cloudC}>
            <Path path={CLOUDS[2]} color={mix(cloud, '#000000', 0.18)} />
            <Path path={CLOUDS[2]} color={mix(cloud, '#000000', 0.18)} transform={[{ translateX: -420 }]} />
          </Group>
        )}

        {/* Land and lighthouse; in rough weather and at night its beam sweeps. */}
        <Path path={`M0 ${HORIZON} L 40 166 L 90 174 L 130 156 L 180 170 L 230 160 L 290 174 L 358 164 L 358 ${HORIZON + 2} L 0 ${HORIZON + 2} Z`} color={g(light.land)} />
        <Group transform={[{ translateX: 300 }, { translateY: 158 }]}>
          {(m.k >= 2 || light.stars > 0) && (
            <Group transform={beam} origin={{ x: 0, y: -28 }}>
              <Path path="M0 -28 L -150 -52 L -150 -10 Z" color={light.lamp} opacity={0.14} />
            </Group>
          )}
          <Rect x={-4} y={-26} width={8} height={26} color={light.silhouette} />
          <Rect x={-5} y={-31} width={10} height={6} color={light.lamp} opacity={flicker} />
          <Path path="M-6 -31 L 0 -38 L 6 -31 Z" color={light.silhouette} />
        </Group>

        {/* Sea, back to front */}
        <Rect x={0} y={HORIZON} width={SCENE_W} height={SCENE_H - HORIZON}>
          <LinearGradient start={vec(0, HORIZON)} end={vec(0, SCENE_H)} colors={[sea, seaDeep]} />
        </Rect>
        <Group transform={backT}>
          <Path path={backSea} color={mix(sea, seaLine, 0.18)} opacity={0.5} />
        </Group>
        <Group transform={midT}>
          <Path path={midSea} color={mix(sea, seaDeep, 0.3)} />
          {m.foam > 0 && <Path path={midFoam} color="#f3fbff" opacity={m.foam * 0.6} />}
        </Group>

        {atSea && m.k === 0 && (
          <Path path={`M150 ${DECK_Y + 22} h 140 M170 ${DECK_Y + 32} h 100 M196 ${DECK_Y + 42} h 50`} color={light.lamp} style="stroke" strokeWidth={2} opacity={light.glint} />
        )}

        {mode === 'sunk' ? (
          <Group>
            <Path path={`M150 ${DECK_Y + 10} L 190 ${DECK_Y - 70} M190 ${DECK_Y - 64} L 214 ${DECK_Y - 30}`} color={light.silhouette} style="stroke" strokeWidth={5} strokeCap="round" />
            <Circle cx={170} cy={DECK_Y + 4} r={4} color="#fff3dc" opacity={0.5} />
            <Circle cx={182} cy={DECK_Y - 4} r={3} color="#fff3dc" opacity={0.4} />
            <Circle cx={176} cy={DECK_Y - 14} r={2} color="#fff3dc" opacity={0.3} />
          </Group>
        ) : (
          <Group transform={bob} origin={{ x: SCENE_W / 2, y: DECK_Y }}>
            <BoatArt cls={cls} light={light} x={boatX} y={DECK_Y} scale={scale} flip={flip} captain={captain} people hands={hands} condition={condition} clock={clock} />
          </Group>
        )}

        {mode !== 'sunk' && stack && puffs.map((p, i) => <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} opacity={p.opacity} color={m.k >= 3 ? '#9a93ad' : '#e7dccf'} />)}

        {/* The sea in front of her hull, so she sits in the water rather than on it. */}
        <Rect x={0} y={waterY} width={SCENE_W} height={SCENE_H - waterY} color={sea} opacity={0.92} />

        {atSea && m.spray && (
          <Group opacity={sprayOpacity}>
            <Path path={spray} color="#f3fbff" />
          </Group>
        )}

        {mode === 'docked' && (
          <Group>
            <Rect x={0} y={DECK_Y - 30} width={64} height={SCENE_H - DECK_Y + 30} color="#5a3a2c" />
            <Rect x={0} y={DECK_Y - 34} width={70} height={6} color="#8a5a3a" />
            <Rect x={54} y={DECK_Y - 44} width={8} height={18} color="#2e1c19" />
            <Path path={`M58 ${DECK_Y - 40} C 80 ${DECK_Y - 30}, 90 ${DECK_Y - 20}, ${boatX + 6} ${DECK_Y - 4}`} color="#c9b6ae" style="stroke" strokeWidth={1.5} />
          </Group>
        )}

        <Group transform={frontT}>
          <Path path={frontSea}>
            <LinearGradient start={vec(0, -m.wave)} end={vec(0, 60)} colors={[mix(sea, seaLine, 0.15), seaDeep]} />
          </Path>
          <Path path={frontLine} color={seaLine} style="stroke" strokeWidth={2.2} />
          {m.foam > 0 && <Path path={frontFoam} color="#f3fbff" opacity={m.foam * 0.85} />}
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

        {/* Rain in two layers, the near one longer and faster. */}
        {m.rain > 0 && (
          <Group>
            <Group transform={rainFarT}>
              <Path path={rainFar} color={STORM.rain} style="stroke" strokeWidth={0.8} opacity={0.45} />
            </Group>
            <Group transform={rainFarT2}>
              <Path path={rainFar} color={STORM.rain} style="stroke" strokeWidth={0.8} opacity={0.45} />
            </Group>
            <Group transform={rainNearT}>
              <Path path={rainNear} color={STORM.rain} style="stroke" strokeWidth={1.2} opacity={0.7} />
            </Group>
            <Group transform={rainNearT2}>
              <Path path={rainNear} color={STORM.rain} style="stroke" strokeWidth={1.2} opacity={0.7} />
            </Group>
          </Group>
        )}
        {m.lightning && <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} color="#ffe6f2" opacity={flashVeil} />}
      </Group>
    </Canvas>
  )
}
