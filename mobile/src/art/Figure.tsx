// A captain, drawn in Skia. Origin is the figure's top-left in a 56 × 100 box (56 × 145 with
// legs); place it with a transform. The same look is used everywhere the captain appears.
// Light comes from the figure's right (the lamp's rim); the left side falls into shadow.
// Given motion values (see Walker) they step, swing their arms and act out their prop.

import { useMemo } from 'react'
import { Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia'
import type { SharedValue } from 'react-native-reanimated'
import { useDerivedValue, useSharedValue } from 'react-native-reanimated'
import { HAT_PATHS, type HairStyle, type Look, type Prop } from './looks'
import { shade, tint } from './paint'

type Props = {
  look: Look
  x: number
  y: number
  scale?: number
  clock: SharedValue<number>
  /** Phase offset so a crowd doesn't breathe (or blink) in unison. */
  offset?: number
  /** A warm rim of lamplight down one side. */
  rimLight?: string
  /** Out on deck: the scarf streams and the head braces a little more. */
  wind?: boolean
  /** Draw legs and boots (full length, 145 tall) instead of stopping at the waist. */
  legs?: boolean
  /** Walking and acting, driven by a Walker; without it they stand still. */
  motion?: Motion
}

export interface Motion {
  /** Step phase: sin of the walk cycle while walking, 0 while standing. */
  stride: SharedValue<number>
  /** 0..1: how far into their action (raising the spyglass, sipping...) they are. */
  act: SharedValue<number>
}

/** Height of a full-length figure, feet included. */
export const FIGURE_FULL_H = 145


// Figure-space shapes. Head centred at (28, 39), chin at 53.5.
const HEAD = 'M16.5 37 C 16.5 28, 21 24.5, 28 24.5 C 35 24.5, 39.5 28, 39.5 37 C 39.5 46, 35 53.5, 28 53.5 C 21 53.5, 16.5 46, 16.5 37 Z'
const HEAD_SHADOW = 'M16.5 37 C 16.5 28, 21 24.5, 28 24.5 C 22.5 27, 20 32, 20 38 C 20 45, 23 51, 28 53.5 C 21 53.5, 16.5 46, 16.5 37 Z'
const TORSO = {
  slim: 'M3 100 C 4 76, 11 64, 21 61 L 35 61 C 45 64, 52 76, 53 100 Z',
  stocky: 'M-1 100 C 0 73, 8 62, 20 60 L 36 60 C 48 62, 56 73, 57 100 Z',
}
const TORSO_SHADOW = 'M3 100 C 4 76, 11 64, 21 61 L 24 61 C 17 66, 14 80, 15 100 Z'
const CREAM = '#efe6d6'

/** Where the hands go for each prop: [left hand, right hand], and the shoulders they hang from. */
const HANDS: Record<Prop, [[number, number], [number, number]]> = {
  none: [[11, 99], [45, 99]],
  spyglass: [[18, 88], [33, 81]],
  mug: [[23, 87], [33, 85]],
  logbook: [[20, 88], [36, 88]],
  rope: [[21, 87], [35, 87]],
  lantern: [[22, 90], [37, 84]],
}

const BACK_HAIR: Partial<Record<HairStyle, string>> = {
  long: 'M14.5 31 C 12 44, 12.5 56, 17 63 L 39 63 C 43.5 56, 44 44, 41.5 31 Z',
}
const FRONT_HAIR: Record<HairStyle, string> = {
  cropped: 'M16.6 35 C 16.4 30, 18 27.6, 20.4 27 L 19.2 36.5 Z M39.4 35 C 39.6 30, 38 27.6, 35.6 27 L 36.8 36.5 Z',
  swept: 'M16.6 36 C 16.5 29, 21 25, 28 25 C 33 25, 37 26.5, 39 29.5 C 33 27.5, 26 29, 21.5 33.5 L 19 37 Z M39.4 35 L 36.8 36.5 L 37.4 30 Z',
  long: 'M16.8 31.5 C 14.6 40, 14.8 50, 16.6 58 L 19.4 56.5 C 18.4 48, 18.6 40, 20.2 33 Z M39.2 31.5 C 41.4 40, 41.2 50, 39.4 58 L 36.6 56.5 C 37.6 48, 37.4 40, 35.8 33 Z',
  curls:
    'M14 33 a3.1 3.1 0 1 0 6.2 0 a3.1 3.1 0 1 0 -6.2 0 Z M13.8 38 a2.7 2.7 0 1 0 5.4 0 a2.7 2.7 0 1 0 -5.4 0 Z M35.8 33 a3.1 3.1 0 1 0 6.2 0 a3.1 3.1 0 1 0 -6.2 0 Z M36.8 38 a2.7 2.7 0 1 0 5.4 0 a2.7 2.7 0 1 0 -5.4 0 Z',
  braid: 'M16.6 35 C 16.4 30, 18 27.6, 20.4 27 L 19.2 36.5 Z M39.4 35 C 39.6 30, 38 27.6, 35.6 27 L 36.8 36.5 Z',
}
const BRAID = [0, 1, 2, 3, 4].map((i) => ({ x: 38.6 + i * 0.7, y: 45 + i * 4.4 }))

const NOSES = [
  'M26.9 44.3 Q 28 45.4 29.3 44.3',
  'M28.7 37.6 L 29.7 43.4 Q 28.6 45 27 44.4',
  'M25.8 44 Q 28 46.2 30.4 44 M26.6 41.8 Q 25.5 43.4 26 44.4 M29.6 41.8 Q 30.7 43.4 30.2 44.4',
]
const BEARD = 'M16.9 39.5 C 16.9 50, 21.5 57.5, 28 57.5 C 34.5 57.5, 39.1 50, 39.1 39.5 C 37.4 45, 34 47.4, 28 47.4 C 22 47.4, 18.6 45, 16.9 39.5 Z'
const STUBBLE = 'M17.4 42 C 19 50, 23.5 53.5, 28 53.5 C 32.5 53.5, 37 50, 38.6 42 C 35 46.8, 21 46.8, 17.4 42 Z'
const MUTTON = 'M16.8 37.5 C 16.9 44, 19 48.6, 22.6 48.6 L 22.4 44.4 C 20.4 43.4, 19.4 41, 19.4 37.5 Z M39.2 37.5 C 39.1 44, 37 48.6, 33.4 48.6 L 33.6 44.4 C 35.6 43.4, 36.6 41, 36.6 37.5 Z'
const MOUSTACHE = 'M22.8 46.6 C 25 44.9, 27 45.4, 28 46.3 C 29 45.4, 31 44.9, 33.2 46.6 C 31.2 48.2, 29.2 47.6, 28 47.1 C 26.8 47.6, 24.8 48.2, 22.8 46.6 Z'

/** Highlights and bands drawn over each hat, in figure space. */
const HAT_TRIM: Record<string, { band?: string; shine?: string; badge?: boolean }> = {
  cap: { band: 'M12 30.6 h32 v3.4 h-32 Z', shine: 'M19.5 23.2 C 22.5 19.6, 30.5 19.2, 34.5 21.4', badge: true },
  souwester: { band: 'M17.4 29.4 C 22 28, 34 28, 38.6 29.4 L 38.8 31 C 34 29.8, 22 29.8, 17.2 31 Z', shine: 'M20 27 C 22 21.6, 31 20.6, 35 23.4' },
  beanie: { band: 'M14 30 h28 v4 h-28 Z', shine: 'M19 27 C 20.5 21.6, 27 20, 31.5 21' },
  brim: { band: 'M18 28 h20 v2.4 h-20 Z', shine: 'M9 32 C 18 29.6, 30 29.4, 38 30' },
}

export function Figure({ look, x, y, scale = 1, clock, offset = 0, rimLight, wind = false, legs = false, motion }: Props) {
  // Fine detail (lines, lids, highlights) only where the figure is big enough to show it.
  const fine = scale >= 1.1
  const skinShadow = shade(look.skin, 0.28)
  const line = shade(look.skin, 0.5)
  const knit = look.coatStyle === 'knit' || look.coatStyle === 'stripes'
  const torso = TORSO[look.build]
  const torsoClip = useMemo(() => Skia.Path.MakeFromSVGString(torso)!, [torso])
  const base = look.coatStyle === 'stripes' ? CREAM : look.coat
  const wide = look.build === 'stocky' ? 2.5 : 0
  const [hl, hr] = HANDS[look.prop]
  const shoulderL: [number, number] = [11 - wide, 70]
  const shoulderR: [number, number] = [45 + wide, 70]
  const still = useSharedValue(0)
  const stride = motion?.stride ?? still
  const act = motion?.act ?? still
  const prop = look.prop

  // Where the hands and the prop go right now: rest pose, plus a swing while walking, plus
  // the prop's action as `act` rises.
  const pose = useDerivedValue(() => {
    const a = act.value
    const st = stride.value
    const t = (clock.value + offset) / 1000
    let lx = hl[0]
    let ly = hl[1] + st * 2
    let rx = hr[0]
    let ry = hr[1] - st * 2
    let px = 0
    let py = st * -1
    let rot = 0
    switch (prop) {
      case 'spyglass':
        lx += 6 * a; ly -= 40 * a; rx += 4 * a; ry -= 40 * a; px = 5 * a; py += -40 * a; rot = 0.35 * a
        break
      case 'mug':
        lx += 2 * a; ly -= 34 * a; rx -= 1 * a; ry -= 34 * a; py += -34 * a; rot = -0.2 * a
        break
      case 'logbook':
        ly -= 12 * a; ry -= 12 * a; py += -12 * a; rot = -0.15 * a
        break
      case 'rope': {
        const cx = Math.cos(t * 5) * 3 * a
        const cy = Math.sin(t * 5) * 3 * a
        lx += cx; ly += cy; rx += cx; ry += cy; px = cx; py += cy; rot = t * 2 * a
        break
      }
      case 'lantern':
        rx += 6 * a; ry -= 42 * a; px = 6 * a; py += -42 * a
        break
      case 'none':
        rx += (5 + Math.sin(t * 9) * 4) * a; ry -= 46 * a
        break
    }
    return { lx, ly, rx, ry, px, py, rot }
  })
  const sleeveL = useDerivedValue(() => {
    const p = pose.value
    return `M${shoulderL[0]} ${shoulderL[1]} Q ${shoulderL[0] - 4} ${(shoulderL[1] + p.ly) / 2 + 4}, ${p.lx} ${p.ly}`
  })
  const sleeveR = useDerivedValue(() => {
    const p = pose.value
    return `M${shoulderR[0]} ${shoulderR[1]} Q ${shoulderR[0] + 4} ${(shoulderR[1] + p.ry) / 2 + 4}, ${p.rx} ${p.ry}`
  })
  const handLx = useDerivedValue(() => pose.value.lx)
  const handLy = useDerivedValue(() => pose.value.ly)
  const handRx = useDerivedValue(() => pose.value.rx)
  const handRy = useDerivedValue(() => pose.value.ry)
  const propT = useDerivedValue(() => [{ translateX: pose.value.px }, { translateY: pose.value.py }, { rotate: pose.value.rot }])
  const propOrigin = vec((hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2)
  const legL = useDerivedValue(() => [{ translateY: -Math.max(0, stride.value) * 5 }])
  const legR = useDerivedValue(() => [{ translateY: -Math.max(0, -stride.value) * 5 }])
  const hipX = look.build === 'stocky' ? 9 : 8
  const blinkEvery = 3600 + (offset % 1300)

  const idle = useDerivedValue(() => [
    { translateX: x },
    { translateY: y + Math.sin((clock.value + offset) / 600) * 1.5 * scale },
    { scale },
  ])
  const breath = useDerivedValue(() => [{ scaleY: 1 + Math.sin((clock.value + offset) / 600) * 0.014 }])
  const tilt = useDerivedValue(() => [
    // Reading the logbook, they look down at it.
    { translateY: prop === 'logbook' ? act.value * 2 : 0 },
    { rotate: Math.sin((clock.value + offset) / (wind ? 1300 : 2100)) * (wind ? 0.045 : 0.03) + stride.value * 0.03 },
    { scale: 1.08 },
  ])
  const blink = useDerivedValue(() => {
    const t = (clock.value + offset * 3) % blinkEvery
    return [{ scaleY: t < 110 ? 0.12 : 1 }]
  })
  const flutter = useDerivedValue(() => [{ rotate: wind ? 0.3 + Math.sin(clock.value / 170) * 0.16 : Math.sin(clock.value / 900) * 0.03 }])
  const puff = (k: number) => {
    'worklet'
    return ((clock.value + offset + k * 1500) % 3000) / 3000
  }
  const smokeA = {
    cy: useDerivedValue(() => 45 - 14 * puff(0)),
    cx: useDerivedValue(() => 38.4 + 3 * puff(0)),
    r: useDerivedValue(() => 1 + 2.2 * puff(0)),
    opacity: useDerivedValue(() => 0.5 * (1 - puff(0))),
  }
  const smokeB = {
    cy: useDerivedValue(() => 45 - 14 * puff(1)),
    cx: useDerivedValue(() => 38.4 + 3 * puff(1)),
    r: useDerivedValue(() => 1 + 2.2 * puff(1)),
    opacity: useDerivedValue(() => 0.5 * (1 - puff(1))),
  }
  const ember = useDerivedValue(() => 0.6 + 0.4 * Math.sin((clock.value + offset) / 260))

  const hatTrim = HAT_TRIM[look.hat]
  const eye = (cx: number) => (
    <Group key={cx}>
      <Oval x={cx - 2.3} y={38.1} width={4.6} height={3.1} color="#f3e7d8" opacity={0.9} />
      <Oval x={cx - 1.5} y={38.3} width={3} height={2.7} color="#2a1a1c" />
      {fine && <Circle cx={cx + 0.6} cy={38.9} r={0.6} color="#fff3dc" opacity={0.9} />}
    </Group>
  )

  return (
    <Group transform={idle}>
      {legs && (
        <Group>
          {([
            [28 - hipX, legL, -1],
            [28 + hipX, legR, 1],
          ] as const).map(([lx, lt, side]) => (
            <Group key={side} transform={lt}>
              <RoundedRect x={lx - 5.2} y={92} width={10.4} height={42} r={3} color={shade(look.trousers, side < 0 ? 0.15 : 0)} />
              <Path path={`M${lx - 6} 132 h 12 q ${side * 7} 0 ${side * 7} 6 v 4 h -19 Z`} color={look.boots} />
              <Rect x={lx - 6} y={131} width={12} height={3} color={shade(look.boots, 0.2)} />
            </Group>
          ))}
        </Group>
      )}
      {/* Body */}
      <Group transform={breath} origin={vec(28, 100)}>
        <Path path={torso}>
          <LinearGradient start={vec(28, 61)} end={vec(28, 100)} colors={[tint(base, 0.1), shade(base, 0.2)]} />
        </Path>
        {look.coatStyle === 'stripes' && (
          <Group clip={torsoClip}>
            {[66, 72, 78, 84, 90, 96].map((sy) => (
              <Rect key={sy} x={-4} y={sy} width={64} height={2.6} color={look.coat} />
            ))}
          </Group>
        )}
        {look.coatStyle === 'raincoat' && (
          <>
            <Path path="M17 60 C 15 52, 19 47, 28 47 C 37 47, 41 52, 39 60 C 34 57, 22 57, 17 60 Z" color={shade(look.coat, 0.18)} />
            <Path path="M28 62 V 100" color={shade(look.coat, 0.35)} style="stroke" strokeWidth={1} />
            {[70, 80, 90].map((by) => (
              <RoundedRect key={by} x={29.5} y={by - 1.2} width={5} height={2.4} r={1.2} color={tint(look.coat, 0.6)} />
            ))}
            <RoundedRect x={10} y={88} width={11} height={8} r={1.5} color={shade(look.coat, 0.12)} />
            <Path path="M38 64 C 44 68, 48 78, 49 90" color="#ffffff" opacity={0.2} style="stroke" strokeWidth={2.6} strokeCap="round" />
          </>
        )}
        <Path path={TORSO_SHADOW} color={shade(look.coat, 0.45)} opacity={0.45} />
        {look.coatStyle === 'peacoat' && (
          <>
            <Path path="M28 79 V 100" color={shade(look.coat, 0.4)} style="stroke" strokeWidth={0.8} />
            <Path path="M21.5 61 L 28 80 L 24.4 84 L 16.6 66.5 Z" color={shade(look.coat, 0.25)} />
            <Path path="M34.5 61 L 28 80 L 31.6 84 L 39.4 66.5 Z" color={tint(look.coat, 0.08)} />
            {[87, 95].flatMap((by) => [21, 35].map((bx) => <Circle key={`${bx}-${by}`} cx={bx} cy={by} r={1.4} color="#d9a441" />))}
          </>
        )}
        {look.coatStyle === 'oilskin' && (
          <>
            <Path path="M18.6 57.5 L 21.6 67 L 28 62.4 L 34.4 67 L 37.4 57.5 L 34.5 61 L 21.5 61 Z" color={shade(look.coat, 0.15)} />
            <Path path="M28 63 V 100" color={shade(look.coat, 0.4)} style="stroke" strokeWidth={0.9} />
            {[72, 82, 92].map((by) => <Circle key={by} cx={28} cy={by} r={0.9} color={tint(look.coat, 0.5)} />)}
            <Path path="M40 66 C 46 70, 49 80, 50 92" color="#ffffff" opacity={0.16} style="stroke" strokeWidth={2.4} strokeCap="round" />
          </>
        )}
        {look.coatStyle === 'knit' && (
          <>
            {fine && [70, 77, 84, 91].map((ry) => <Path key={ry} path={`M${8 + (ry - 70) * 0.18} ${ry} H ${48 - (ry - 70) * 0.18}`} color={shade(look.coat, 0.3)} opacity={0.5} style="stroke" strokeWidth={0.7} />)}
          </>
        )}
      </Group>

      {look.hairStyle === 'braid' &&
        BRAID.map((b, i) => <Oval key={i} x={b.x - 2.2} y={b.y - 2.6} width={4.4} height={5.2} color={i % 2 ? look.hair : shade(look.hair, 0.15)} />)}
      {BACK_HAIR[look.hairStyle] && <Path path={BACK_HAIR[look.hairStyle]!} color={shade(look.hair, 0.12)} />}

      {/* Neck and scarf */}
      <Rect x={23} y={48} width={10} height={14} color={skinShadow} />
      {knit && (
        <>
            <Path path="M19.6 63.4 C 19.4 59, 21 55.6, 23.4 54.4 L 32.6 54.4 C 35 55.6, 36.6 59, 36.4 63.4 C 32 65.4, 24 65.4, 19.6 63.4 Z" color={tint(look.coatStyle === 'stripes' ? look.coat : look.coat, 0.14)} />
            <Path path="M20 58.8 C 24 60.6, 32 60.6, 36 58.8" color={shade(look.coat, 0.25)} style="stroke" strokeWidth={0.8} />
        </>
      )}
      {!knit && (
        <>
          <Path path="M19.6 56.6 C 24 61, 32 61, 36.4 56.6 L 37.2 62 C 32 66.4, 24 66.4, 18.8 62 Z" color={look.scarf} />
          <Path path="M19.6 56.6 C 24 61, 32 61, 36.4 56.6 L 36.6 58.4 C 32 62.4, 24 62.4, 19.4 58.4 Z" color={tint(look.scarf, 0.2)} />
          <Group transform={flutter} origin={vec(24, 64)}>
            <Path path="M22.8 63.6 C 20.6 71, 21.6 77, 19.6 83.6 L 24.6 83 C 25.6 77, 25.8 71, 26 64.6 Z" color={shade(look.scarf, 0.15)} />
          </Group>
          <Circle cx={24} cy={64} r={2.8} color={shade(look.scarf, 0.08)} />
        </>
      )}

      {/* Arms and whatever they're holding */}
      <Path path={sleeveL} color={shade(base, 0.12)} style="stroke" strokeWidth={7.5} strokeCap="round" />
      <Path path={sleeveR} color={shade(base, 0.04)} style="stroke" strokeWidth={7.5} strokeCap="round" />
      <Group transform={propT} origin={propOrigin}>
        <PropArt prop={look.prop} hands={[hl, hr]} clock={clock} offset={offset} />
      </Group>
      <Circle cx={handLx} cy={handLy} r={3} color={skinShadow} />
      <Circle cx={handRx} cy={handRy} r={3} color={look.skin} />

      {/* Head */}
      <Group transform={tilt} origin={vec(28, 56)}>
        <Oval x={14.6} y={35.4} width={4.2} height={7.2} color={skinShadow} />
        <Oval x={37.2} y={35.4} width={4.2} height={7.2} color={look.skin} />
        {look.extra === 'earring' && <Circle cx={16.6} cy={43.6} r={1.2} color="#e8c061" />}
        <Path path={HEAD}>
          <RadialGradient c={vec(31.5, 34)} r={22} colors={[tint(look.skin, 0.14), look.skin, shade(look.skin, 0.12)]} />
        </Path>
        <Path path={HEAD_SHADOW} color={skinShadow} opacity={0.4} />
        <Oval x={18.6} y={42} width={5.4} height={3} color="#d9604a" opacity={0.16} />
        <Oval x={32} y={42} width={5.4} height={3} color="#d9604a" opacity={0.16} />
        {rimLight && <Path path="M38 30 C 41.6 37, 41.6 46, 36.6 52.6" color={rimLight} style="stroke" strokeWidth={1.8} strokeCap="round" opacity={0.75} />}

        {look.facialHair === 'stubble' && <Path path={STUBBLE} color={look.hair} opacity={0.3} />}
        {look.facialHair === 'mutton' && <Path path={MUTTON} color={look.hair} />}
        {look.facialHair === 'beard' && <Path path={BEARD} color={look.hair} />}

        {/* Lines of age and weather */}
        {fine && look.age >= 1 && (
          <Path path="M18.4 38.6 l -1.5 -0.7 M18.4 40.2 l -1.6 0.3 M37.6 38.6 l 1.5 -0.7 M37.6 40.2 l 1.6 0.3" color={line} opacity={0.6} style="stroke" strokeWidth={0.6} strokeCap="round" />
        )}
        {fine && look.age === 2 && (
          <Path path="M23 31.6 Q 28 30.6 33 31.6 M24.6 45 Q 23.6 47 24.2 49.2 M31.4 45 Q 32.4 47 31.8 49.2" color={line} opacity={0.4} style="stroke" strokeWidth={0.6} strokeCap="round" />
        )}

        <Group transform={blink} origin={vec(28, 39.6)}>
          {eye(23.5)}
          {eye(32.5)}
        </Group>
        {fine && (
          <Path path="M21.4 38.4 Q 23.5 37.1 25.6 38.4 M30.4 38.4 Q 32.5 37.1 34.6 38.4" color={line} style="stroke" strokeWidth={0.7} strokeCap="round" />
        )}
        <Path path="M20.6 35.6 Q 23.4 33.9 26.1 35.2 M29.9 35.2 Q 32.6 33.9 35.4 35.6" color={shade(look.hair, 0.1)} style="stroke" strokeWidth={look.brow} strokeCap="round" />
        {look.glasses && (
          <Path path="M20.2 39.6 a3.3 3.3 0 1 0 6.6 0 a3.3 3.3 0 1 0 -6.6 0 Z M29.2 39.6 a3.3 3.3 0 1 0 6.6 0 a3.3 3.3 0 1 0 -6.6 0 Z M26.8 39.2 Q 28 38.4 29.2 39.2 M20.2 39 L 17.2 38" color="#2a1a1c" style="stroke" strokeWidth={0.8} />
        )}
        <Path path={NOSES[look.nose]} color={line} style="stroke" strokeWidth={0.9} strokeCap="round" />
        {look.extra === 'scar' && fine && <Path path="M33.6 35.6 L 35.6 42.4" color={tint(look.skin, 0.45)} style="stroke" strokeWidth={0.8} strokeCap="round" />}

        {look.facialHair === 'beard' || look.facialHair === 'moustache' ? (
          <>
            <Path path="M25.6 48.8 Q 28 49.9 30.4 48.8" color="#7a3f2c" style="stroke" strokeWidth={1} strokeCap="round" />
            <Path path={MOUSTACHE} color={look.hair} />
          </>
        ) : (
          <>
            <Path path="M25 48 Q 28 50.4 31 48" color="#7a3f2c" style="stroke" strokeWidth={1.2} strokeCap="round" />
            {fine && <Path path="M26.4 50.6 Q 28 51.4 29.6 50.6" color={skinShadow} opacity={0.6} style="stroke" strokeWidth={0.7} strokeCap="round" />}
          </>
        )}

        {look.extra === 'pipe' && (
          <>
            <Path path="M30.4 48.8 L 37 50.6" color="#4a2e22" style="stroke" strokeWidth={1.3} strokeCap="round" />
            <Path path="M36.4 46.6 h 3.8 v 4.4 q -1.9 1.7 -3.8 0 Z" color="#6e4733" />
            <Circle cx={38.3} cy={46.9} r={1} color="#ffb054" opacity={ember} />
            <Circle cx={smokeA.cx} cy={smokeA.cy} r={smokeA.r} opacity={smokeA.opacity} color="#e9dccf" />
            <Circle cx={smokeB.cx} cy={smokeB.cy} r={smokeB.r} opacity={smokeB.opacity} color="#e9dccf" />
          </>
        )}

        {/* Hair, then hat over it */}
        {look.hat !== 'bare' && look.hat !== 'bun' && <Path path={FRONT_HAIR[look.hairStyle]} color={look.hair} />}
        <Path path={HAT_PATHS[look.hat]} color={look.hatColor} />
        {look.hat === 'bare' || look.hat === 'bun' ? (
          <Path path="M19 27.6 C 22 24.2, 30 23.4, 35 25.6" color={tint(look.hair, 0.25)} opacity={0.6} style="stroke" strokeWidth={0.9} strokeCap="round" />
        ) : (
          hatTrim && (
            <>
              {hatTrim.band && <Path path={hatTrim.band} color={shade(look.hatColor, 0.3)} />}
              {hatTrim.shine && <Path path={hatTrim.shine} color="#fff3dc" opacity={0.28} style="stroke" strokeWidth={1.1} strokeCap="round" />}
              {hatTrim.badge && <Circle cx={28} cy={25.2} r={1.7} color="#f2b45a" />}
            </>
          )
        )}
      </Group>
    </Group>
  )
}

/** The thing a captain carries, between their hands. */
function PropArt({ prop, hands, clock, offset }: { prop: Prop; hands: [[number, number], [number, number]]; clock: SharedValue<number>; offset: number }) {
  const steam = useDerivedValue(() => 0.25 + 0.25 * Math.sin((clock.value + offset) / 500))
  const glow = useDerivedValue(() => 0.75 + 0.25 * Math.sin((clock.value + offset) / 240))
  const [, hr] = hands
  switch (prop) {
    case 'none':
      return null
    case 'spyglass':
      return (
        <Group>
          <Path path="M13 91 L 26 84" color="#8a5a2a" style="stroke" strokeWidth={4.6} strokeCap="round" />
          <Path path="M25 84.5 L 40 77" color="#c9a24a" style="stroke" strokeWidth={3.6} strokeCap="round" />
          <Path path="M30 82 L 31.4 84.6 M35 79.4 L 36.4 82" color="#8a6a2a" style="stroke" strokeWidth={0.8} />
          <Circle cx={40.4} cy={76.8} r={2.2} color="#e8d9a0" />
        </Group>
      )
    case 'mug':
      return (
        <Group>
          <RoundedRect x={23} y={78} width={10} height={11} r={1.6} color="#c98a5b" />
          <Rect x={23} y={78} width={10} height={2.2} color="#fff3dc" />
          <Path path="M33 81 c 4 0, 4 5, 0 5" color="#8a5a3a" style="stroke" strokeWidth={1.4} />
          <Path path="M26 75 q -2 -3 0 -6 M30 75 q 2 -3 0 -6" color="#fff3dc" style="stroke" strokeWidth={1.1} strokeCap="round" opacity={steam} />
        </Group>
      )
    case 'logbook':
      return (
        <Group>
          <RoundedRect x={17} y={79} width={22} height={14} r={1.4} color="#6e3a2a" />
          <Rect x={18.5} y={91.2} width={19} height={1.4} color="#efe3d2" />
          <Rect x={26.6} y={79} width={2.8} height={14} color="#4a2418" />
          <Circle cx={32.8} cy={85.6} r={1.6} color="#d9a441" />
        </Group>
      )
    case 'rope':
      return (
        <Group>
          {[8, 5.6, 3.2].map((r) => (
            <Circle key={r} cx={28} cy={86} r={r} color="#c9a26a" style="stroke" strokeWidth={2.2} />
          ))}
          <Path path="M33 92 q 4 4 2 8" color="#c9a26a" style="stroke" strokeWidth={2.2} strokeCap="round" />
        </Group>
      )
    case 'lantern':
      return (
        <Group>
          <Path path={`M${hr[0]} ${hr[1]} V ${hr[1] + 3}`} color="#2e1c19" style="stroke" strokeWidth={0.9} />
          <Circle cx={hr[0]} cy={hr[1] + 9} r={9} opacity={glow}>
            <RadialGradient c={vec(hr[0], hr[1] + 9)} r={9} colors={['#ffd27aaa', '#ffd27a00']} />
          </Circle>
          <RoundedRect x={hr[0] - 3.4} y={hr[1] + 3} width={6.8} height={10} r={1.4} color="#2e1c19" />
          <RoundedRect x={hr[0] - 2.2} y={hr[1] + 4.6} width={4.4} height={6.6} r={1} color="#ffd27a" opacity={glow} />
        </Group>
      )
  }
}
