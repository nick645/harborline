// The shipyard, all of it at once: a slipway shed with a hull going up on the stocks, a crane
// swinging a crate, and this tier's boats for sale moored along two piers, each with a painted
// FOR SALE board. Tap a boat and the view closes in on her; hand back `null` to pull out again.
// Design space is 720 × 420; the camera fits it to whatever room the page has.

import { useEffect, useMemo } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, Text as SkText, matchFont, vec } from '@shopify/react-native-skia'
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'
import type { BoatClass } from '../../../src/game/types'
import { coins } from '../../../src/format'
import type { Light } from './light'
import { lookFor, type Prop } from './looks'
import { BoatArt } from './BoatArt'
import { Walker } from './Walker'
import { boatWidth } from './boatGeometry'
import { useSceneClock } from './clock'
import { mix } from './paint'

export const YARD_W = 720
export const YARD_H = 420
const WATER = 196
/** Waterlines of the two rows, and the piers they're moored along. */
const BACK = { line: 262, pier: 236, depth: 0.72 }
const FRONT = { line: 368, pier: 372, depth: 1 }
const CELL = 176
/** How much of a berth the boat takes; the rest is her FOR SALE board. */
const BOAT_SHARE = 0.72
const ZOOM_MS = 650
const RARE = '#5aa2ea'

const signFont = matchFont({ fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 6.5, fontWeight: 'bold' })
const priceFont = matchFont({ fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 7.5, fontStyle: 'italic', fontWeight: 'bold' })

type Berth = { cls: BoatClass; x: number; w: number; line: number; pier: number; depth: number; scale: number }

/** Where each boat is moored: the first half along the front pier, the rest behind. */
function berths(classes: BoatClass[]): Berth[] {
  const frontN = classes.length <= 4 ? classes.length : Math.ceil(classes.length / 2)
  const row = (list: BoatClass[], r: typeof BACK) => {
    const w = Math.min(CELL, (YARD_W - 40) / Math.max(4, list.length)) * r.depth * (list.length < 4 ? 1.15 : 1)
    const x0 = (YARD_W - w * list.length) / 2
    return list.map((cls, i) => ({ cls, x: x0 + i * w, w, line: r.line, pier: r.pier, depth: r.depth, scale: (w * BOAT_SHARE) / boatWidth(cls) }))
  }
  return [...row(classes.slice(frontN), BACK), ...row(classes.slice(0, frontN), FRONT)]
}

/** The part of the scene to fill the view with when looking at one boat. */
function focusBox(b: Berth) {
  const bw = boatWidth(b.cls) * b.scale
  const top = b.line - bw * 0.62
  return { x: b.x - 6, y: top, w: b.w + 12, h: b.pier + 30 * b.depth - top }
}

type Props = {
  width: number
  height: number
  light: Light
  classes: BoatClass[]
  coins: number
  focused: string | null
  onFocus: (classId: string) => void
}

export function ShipyardScene({ width, height, light, classes, coins: purse, focused, onFocus }: Props) {
  const clock = useSceneClock()
  const list = useMemo(() => berths(classes), [classes])
  const night = light.stars > 0
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.8)

  // The camera: centre (in scene units) and zoom. The whole yard is framed round the boats (the
  // shed and crane at its edges), standing on the bottom of the view with any spare height
  // going to sky; or one boat fills the view.
  const bx0 = Math.min(...list.map((b) => b.x))
  const bx1 = Math.max(...list.map((b) => b.x + b.w))
  // With few boats the yard draws in: the shed and crane stand just past the outermost berths.
  const shedShift = Math.max(0, bx0 - 150)
  const craneShift = Math.min(0, bx1 + 50 - 650)
  const whole = (() => {
    const x0 = Math.max(0, bx0 - 70)
    const x1 = Math.min(YARD_W, bx1 + 70)
    const z = Math.min(width / (x1 - x0), height / (YARD_H - 40))
    return { cx: (x0 + x1) / 2, cy: YARD_H - 6 - height / (2 * z), z }
  })()
  const target = (() => {
    const b = list.find((x) => x.cls.id === focused)
    if (!b) return whole
    const f = focusBox(b)
    const z = Math.min(width / f.w, height / f.h)
    // Her keel low in the frame, sky and the yard behind her above.
    return { cx: f.x + f.w / 2, cy: Math.min(f.y + f.h / 2, f.y + f.h - height / (2 * z)), z }
  })()
  const cx = useSharedValue(target.cx)
  const cy = useSharedValue(target.cy)
  const z = useSharedValue(target.z)
  useEffect(() => {
    const ease = { duration: ZOOM_MS, easing: Easing.inOut(Easing.cubic) }
    cx.set(withTiming(target.cx, ease))
    cy.set(withTiming(target.cy, ease))
    z.set(withTiming(target.z, ease))
  }, [target.cx, target.cy, target.z, cx, cy, z])
  const camera = useDerivedValue(() => [{ translateX: width / 2 }, { translateY: height / 2 }, { scale: z.value }, { translateX: -cx.value }, { translateY: -cy.value }])

  const waves = useDerivedValue(() => [{ translateX: -((clock.value / 80) % 36) }])
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  // The crane's trolley runs along the jib; the crate swings under it.
  const trolley = useDerivedValue(() => 600 + Math.sin(clock.value / 4200) * 50)
  const crate = useDerivedValue(() => [{ translateX: trolley.value + Math.sin(clock.value / 700) * 3 }, { translateY: 128 + Math.sin(clock.value / 3100) * 18 }])
  const rope = useDerivedValue(() => `M ${trolley.value} 52 L ${trolley.value + Math.sin(clock.value / 700) * 3} ${128 + Math.sin(clock.value / 3100) * 18}`)
  const trolleyAt = useDerivedValue(() => [{ translateX: trolley.value }])
  const gull = useDerivedValue(() => {
    const t = clock.value / 1000
    return [{ translateX: ((t * 18) % 860) - 70 }, { translateY: 70 + Math.sin(t * 0.8) * 10 }]
  })
  const flap = useDerivedValue(() => {
    const f = Math.sin(clock.value / 120) * 4
    return `M-7 ${f * 0.3} Q -3.5 ${-f} 0 0 Q 3.5 ${-f} 7 ${f * 0.3}`
  })

  // Clouds drift across the high sky (a tall screen shows plenty of it), wrapping round.
  const clouds = useDerivedValue(() => -((clock.value / 260) % 1100))
  const c1 = useDerivedValue(() => [{ translateX: ((clouds.value + 1100) % 1100) - 250 }])
  const c2 = useDerivedValue(() => [{ translateX: ((380 + clouds.value + 1100) % 1100) - 250 }])
  const c3 = useDerivedValue(() => [{ translateX: ((760 + clouds.value + 1100) % 1100) - 250 }])
  const cloud = (y: number, s: number) =>
    `M${-40 * s} ${y} C ${-44 * s} ${y - 14 * s}, ${-20 * s} ${y - 20 * s}, ${-8 * s} ${y - 12 * s} C ${0} ${y - 30 * s}, ${30 * s} ${y - 28 * s}, ${34 * s} ${y - 12 * s} C ${50 * s} ${y - 16 * s}, ${60 * s} ${y - 4 * s}, ${52 * s} ${y} Z`
  const waveRow = (y: number, o: number) => <Path key={y} path={`M-400 ${y} ${'q 9 -3 18 0 t 18 0 '.repeat(44)}`} color={light.seaLine} style="stroke" strokeWidth={1.3} opacity={o} />
  // A pier with its piles between the berths (never in front of a boat), and on out past them.
  const pier = (y: number, depth: number) => {
    const row = list.filter((b) => b.depth === depth)
    const edges = row.length ? [...row.map((b) => b.x), row[row.length - 1].x + row[row.length - 1].w] : []
    const gap = row[0]?.w ?? CELL * depth
    const posts = [...edges]
    for (let x = (edges[0] ?? YARD_W / 2) - gap; x > -400; x -= gap) posts.push(x)
    for (let x = (edges[edges.length - 1] ?? YARD_W / 2) + gap; x < YARD_W + 400; x += gap) posts.push(x)
    return (
      <Group>
        <Rect x={-400} y={y} width={YARD_W + 800} height={14 * depth} color={lit('#8a5a3a')} />
        <Rect x={-400} y={y + 14 * depth} width={YARD_W + 800} height={4 * depth} color={lit('#4a2e22')} />
        {posts.map((x, i) => (
          <Rect key={i} x={x - 3.5 * depth} y={y - 6 * depth} width={7 * depth} height={30 * depth} color={lit('#4a2e22')} />
        ))}
      </Group>
    )
  }

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        <Group transform={camera}>
          {/* Sky and far shore, wider than the yard so a wide screen never shows an edge */}
          <Rect x={-800} y={-600} width={YARD_W + 1600} height={600 + WATER}>
            <LinearGradient start={vec(0, -100)} end={vec(0, WATER)} colors={[light.sky, light.skyLow]} />
          </Rect>
          <Circle cx={light.sunX * 2} cy={Math.min(90, light.sunY)} r={20} color={light.sun} />
          {[
            [c1, -40, 1.3],
            [c2, 30, 0.9],
            [c3, -130, 1.6],
          ].map(([t, y, s], i) => (
            <Group key={i} transform={t as typeof c1}>
              <Path path={cloud(y as number, s as number)} color={night ? '#4a3a5a' : '#fff6e8'} opacity={night ? 0.5 : 0.75} />
            </Group>
          ))}
          <Group opacity={light.stars}>
            {[[40, 30], [140, 16], [250, 50], [380, 24], [470, 60], [690, 34], [-60, 40], [780, 20]].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={1.2} color="#fff3dc" />
            ))}
          </Group>
          <Path path={`M-800 ${WATER} L -800 168 L 120 172 L 170 160 L 260 166 L 330 150 L 420 158 L 520 152 L 760 168 L 1520 166 L 1520 ${WATER} Z`} color={light.land} />

          {/* The slipway shed: a hull going up on the stocks under a big gable */}
          <Group transform={[{ translateX: shedShift }]}>
            <Path path={`M18 ${WATER} L 18 96 L 110 50 L 202 96 L 202 ${WATER} Z`} color={lit('#6e4733')} />
            <Path path="M10 100 L 110 46 L 210 100" color={lit('#3a2420')} style="stroke" strokeWidth={8} strokeJoin="round" />
            <Rect x={42} y={110} width={136} height={WATER - 110} color={lit('#2e1c19')} />
            {/* the ribs of a hull being built */}
            {Array.from({ length: 8 }, (_, i) => (
              <Path key={i} path={`M${58 + i * 15} 186 q ${-4 + i} -30 0 -56`} color={lit('#c9a27a')} style="stroke" strokeWidth={2} opacity={0.85} />
            ))}
            <Path path="M54 186 L 170 186" color={lit('#c9a27a')} style="stroke" strokeWidth={3} />
            <Rect x={100} y={72} width={20} height={14} color={night ? light.lamp : lit('#3a2420')} opacity={night ? 0.9 : 1} />
          </Group>

          {/* The crane */}
          <Group transform={[{ translateX: craneShift }]}>
            <Path path={`M630 ${WATER} L 640 52 L 650 ${WATER}`} color={lit('#2e1c19')} style="stroke" strokeWidth={4} />
            <Path path={`M632 ${WATER - 30} L 648 ${WATER - 70} M648 ${WATER - 30} L 632 ${WATER - 70} M634 100 L 646 70 M646 100 L 634 70`} color={lit('#2e1c19')} style="stroke" strokeWidth={1.5} />
            <Rect x={540} y={48} width={170} height={6} color={lit('#c2452a')} />
            <Rect x={690} y={54} width={18} height={14} color={lit('#2e1c19')} />
            <Group transform={trolleyAt}>
              <Rect x={-6} y={52} width={12} height={5} color={lit('#2e1c19')} />
            </Group>
            <Path path={rope} color={lit('#2e1c19')} style="stroke" strokeWidth={1} />
            <Group transform={crate}>
              <Rect x={-9} y={0} width={18} height={14} color={lit('#8a5a3a')} />
              <Path path="M-9 0 l 18 14 M-9 7 h 18" color={lit('#4a2e1e')} style="stroke" strokeWidth={0.8} />
            </Group>
            {night && (
              <Circle cx={700} cy={46} r={3} color="#ff6b5a" opacity={flicker} />
            )}
          </Group>

          {/* Harbour water */}
          <Rect x={-800} y={WATER} width={YARD_W + 1600} height={YARD_H - WATER + 600}>
            <LinearGradient start={vec(0, WATER)} end={vec(0, YARD_H)} colors={[light.sea, mix(light.sea, '#0e0a18', 0.3)]} />
          </Rect>
          <Group transform={waves}>
            {waveRow(212, 0.6)}
            {waveRow(300, 0.5)}
            {waveRow(330, 0.4)}
          </Group>
          <Group transform={gull}>
            <Path path={flap} color={night ? '#c9c0cf' : '#3a2e36'} style="stroke" strokeWidth={1.6} strokeCap="round" strokeJoin="round" />
          </Group>

          {/* Back row: pier, then the boats in front of it */}
          {pier(BACK.pier, BACK.depth)}
          {list.filter((b) => b.depth < 1).map((b, i) => <Moored key={b.cls.id} b={b} i={i} light={light} clock={clock} afford={purse >= b.cls.price} lit={lit} />)}
          <Rect x={-800} y={BACK.line + 2} width={YARD_W + 1600} height={6} color={mix(light.sea, '#0e0a18', 0.15)} opacity={0.8} />

          {/* Front row and the front pier, with the yard hands at work */}
          {list.filter((b) => b.depth === 1).map((b, i) => <Moored key={b.cls.id} b={b} i={i + 4} light={light} clock={clock} afford={purse >= b.cls.price} lit={lit} />)}
          <Rect x={-800} y={FRONT.pier} width={YARD_W + 1600} height={YARD_H - FRONT.pier + 600} color={lit('#5a3a28')} />
          {pier(FRONT.pier, 1)}
          {(
            [
              ['crate', 30, 230, 20],
              ['rope', 420, 520, 8],
              ['logbook', 600, 690, 6],
            ] as [Prop, number, number, number][]
          ).map(([prop, a, c, speed], i) => (
            <Walker key={i} look={{ ...lookFor(`yard-${i}`), prop }} clock={clock} x0={a} x1={c} footY={YARD_H - 6} scale={0.32} speed={speed} pauseMs={2600} offset={i * 2100} />
          ))}
          {/* Lamp post */}
          <Group transform={[{ translateX: 360 }, { translateY: FRONT.pier }]}>
            <Rect x={-2} y={-88} width={4} height={88} color={lit('#2e1c19')} />
            <Rect x={-7} y={-100} width={14} height={14} color={lit('#2e1c19')} />
            <Rect x={-4.5} y={-97.5} width={9} height={9} color={light.lamp} opacity={flicker} />
            <Circle cx={0} cy={-93} r={night ? 40 : 18} opacity={flicker}>
              <RadialGradient c={vec(0, -93)} r={night ? 40 : 18} colors={[`${light.lamp}66`, `${light.lamp}00`]} />
            </Circle>
          </Group>
        </Group>
      </Canvas>
      {/* Tap a boat to look her over (only while looking at the whole yard) */}
      {!focused &&
        list.map((b) => {
          const f = focusBox(b)
          return (
            <Pressable
              key={b.cls.id}
              onPress={() => onFocus(b.cls.id)}
              accessibilityRole="button"
              accessibilityLabel={`${b.cls.name}, for sale, ${coins(b.cls.price)} coins`}
              style={{
                position: 'absolute',
                left: width / 2 + (f.x - whole.cx) * whole.z,
                top: height / 2 + (f.y - whole.cy) * whole.z,
                width: f.w * whole.z,
                height: f.h * whole.z,
              }}
            />
          )
        })}
    </View>
  )
}

/** One boat at her berth, riding the swell, with her FOR SALE board on the pier beside her. */
function Moored({ b, i, light, clock, afford, lit }: { b: Berth; i: number; light: Light; clock: ReturnType<typeof useSceneClock>; afford: boolean; lit: (c: string) => string }) {
  const ride = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 900 + i * 1.3) * 1.6 * b.depth }, { rotate: Math.sin(clock.value / 1300 + i) * 0.008 }])
  const bw = boatWidth(b.cls) * b.scale
  const d = b.depth
  const signX = b.x + bw + (b.w - bw) / 2 - 2
  const boardY = b.pier - 44 * d
  const rare = b.cls.rarity === 'rare'
  const price = `${coins(b.cls.price)}c`
  return (
    <Group>
      <Group transform={ride} origin={{ x: b.x + bw / 2, y: b.line }}>
        <BoatArt cls={b.cls} light={light} x={b.x + 4} y={b.line} scale={b.scale} clock={clock} />
      </Group>
      {/* FOR SALE */}
      <Group transform={[{ translateX: signX }, { translateY: boardY }, { scale: d }]}>
        <Rect x={-1.5} y={10} width={3} height={36} color={lit('#3a2420')} />
        <RoundedRect x={-19} y={0} width={38} height={25} r={2.5} color={lit(rare ? RARE : '#f3e7d8')} />
        <RoundedRect x={-17} y={2} width={34} height={21} r={1.5} color={lit('#f3e7d8')} />
        <SkText x={-16 + (34 - signFont.measureText('FOR SALE').width) / 2} y={11} text="FOR SALE" font={signFont} color={lit('#7a1f2a')} />
        <SkText x={-16 + (34 - priceFont.measureText(price).width) / 2} y={20.5} text={price} font={priceFont} color={lit(afford ? '#2a4a3e' : '#6e4733')} />
      </Group>
      {/* keep the board legible in the dark */}
      {light.stars > 0 && <Circle cx={signX} cy={boardY + 12 * d} r={22 * d} color={light.lamp} opacity={0.12} />}
    </Group>
  )
}
