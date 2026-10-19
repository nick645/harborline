// Inside the Gull & Lantern: a long table down the middle of the room with hands and regulars
// drinking, laughing and talking across it, more of them wandering about with a mug, the
// barkeep working the bar at the back, and a fire in the hearth. Now and then someone else is
// here: a captain far above the quay's usual, by the fire in a coat nobody else wears. Every
// figure is drawn at the same scale, a little smaller toward the back of the room.
// Tap anyone you could hire to step closer. Design space is 358 × 290.

import { Canvas, Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { Pressable, View } from 'react-native'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Light } from './light'
import { lookFor, type Look } from './looks'
import { Figure, FIGURE_FULL_H } from './Figure'
import { Chatter, Walker } from './Walker'
import { useSceneClock } from './clock'

const W = 358
const H = 290
const BACK = 190
/** Table top, its front edge, and where its legs meet the floor. */
const TABLE_Y = 222
const TABLE_X0 = 64
const TABLE_X1 = 304
/** Seated figures (behind the table) and walkers (in front of it). */
const SEAT_SCALE = 0.55
const WALK_SCALE = 0.6
const FRONT_FOOT = 284
const SEAT_W = 56 * SEAT_SCALE
const SEATS = [78, 118, 158, 198, 238, 272]
/** Which seats the hands take (the rest are regulars). */
const HAND_SEATS = [0, 2, 4, 5]
const CAPTAIN_X = 14

type Person = { id: string; name: string }

/** Someone on the bench behind the table: they drink, laugh and lean in to talk. */
function Seated({ look, x, clock, offset, rim }: { look: Look; x: number; clock: SharedValue<number>; offset: number; rim?: string }) {
  const CYCLE = 7000
  const phase = useDerivedValue(() => ((((clock.value + offset) % CYCLE) + CYCLE) % CYCLE) / CYCLE)
  // A sip partway through each cycle.
  const act = useDerivedValue(() => {
    const p = phase.value
    return p > 0.55 && p < 0.85 ? Math.sin(((p - 0.55) / 0.3) * Math.PI) : 0
  })
  // A laugh near the start: quick bounces and a little sway of the arms.
  const laughing = useDerivedValue(() => (phase.value < 0.16 ? 1 : 0) as number)
  const stride = useDerivedValue(() => laughing.value * Math.sin((clock.value + offset) / 70) * 0.6)
  const bounce = useDerivedValue(() => [{ translateY: -Math.abs(Math.sin((clock.value + offset) / 70)) * 2.4 * laughing.value }])
  const top = TABLE_Y - 49
  const hx = x + SEAT_W / 2
  return (
    <Group>
      <Group transform={bounce}>
        <Figure look={look} x={x} y={top} scale={SEAT_SCALE} clock={clock} offset={offset} rimLight={rim} motion={{ stride, act }} />
      </Group>
      {/* Laugh lines either side of the head */}
      <Group opacity={laughing}>
        <Path path={`M${hx - 13} ${top + 14} l -5 -3 M${hx - 14} ${top + 20} l -6 0 M${hx + 13} ${top + 14} l 5 -3 M${hx + 14} ${top + 20} l 6 0`} color="#fff3dc" style="stroke" strokeWidth={1.4} strokeCap="round" />
      </Group>
    </Group>
  )
}

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
      const x = CAPTAIN_X + 6 + ((i * 37) % 30)
      const y = FRONT_FOOT - 20 - p * 90
      const r = 0.9 + (1 - p) * 0.8
      d += `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
    }
    return d
  })
  const sparkleOpacity = useDerivedValue(() => 0.7 + 0.3 * Math.sin(clock.value / 200))
  const spotGlow = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 900))

  // Who sits where: hands in their seats, regulars filling the rest.
  const seated = SEATS.map((x, i) => {
    const handIdx = HAND_SEATS.indexOf(i)
    const hand = handIdx >= 0 && handIdx < hands.length ? hands[handIdx] : null
    return { x, hand, id: hand?.id ?? `regular-${i}` }
  })
  const extraHands = hands.slice(HAND_SEATS.length)
  const mug = (id: string): Look => ({ ...lookFor(id), prop: 'mug' })
  const seatHead = TABLE_Y - 49 - 4
  const walkTop = FRONT_FOOT - FIGURE_FULL_H * WALK_SCALE
  // Where the selected person is, for the soft light over them.
  const seat = seated.find((p) => p.hand && p.hand.id === selectedId)
  const extraIdx = extraHands.findIndex((h) => h.id === selectedId)
  const spot =
    seat ? { x: seat.x + SEAT_W / 2, y: TABLE_Y + 2, w: 30 }
    : extraIdx >= 0 ? { x: 110 + extraIdx * 40 + 17, y: FRONT_FOOT, w: 70 }
    : captain && captain.id === selectedId ? { x: CAPTAIN_X + 20, y: FRONT_FOOT, w: 34 }
    : null

  return (
    <View style={{ width, height: H * s }}>
      <Canvas style={{ width, height: H * s }}>
        <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
          {/* Back wall, beams and a window */}
          <Rect x={0} y={0} width={W} height={BACK}>
            <LinearGradient start={vec(0, 0)} end={vec(0, BACK)} colors={['#4a2e22', '#6e4430']} />
          </Rect>
          {Array.from({ length: 9 }, (_, i) => (
            <Path key={i} path={`M${i * 42 + 10} 0 V ${BACK}`} color="#3a2420" style="stroke" strokeWidth={1} opacity={0.5} />
          ))}
          <Rect x={0} y={12} width={W} height={8} color="#2e1c19" />
          <Rect x={110} y={34} width={64} height={50} color={light.sky} />
          <Circle cx={152} cy={50} r={8} color={light.sun} />
          <Rect x={110} y={70} width={64} height={14} color={light.sea} />
          <Path path="M110 34 h 64 v 50 h -64 Z M142 34 v 50 M110 59 h 64" color="#2e1c19" style="stroke" strokeWidth={3.5} />

          {/* The hearth, back left */}
          <Path path={`M4 ${BACK} V 104 C 4 88, 14 80, 40 80 C 66 80, 76 88, 76 104 V ${BACK} Z`} color="#5b5452" />
          <Path path="M4 104 h 72 M4 126 h 72 M4 148 h 72 M4 170 h 72 M22 84 v 20 M58 84 v 20 M40 104 v 22 M22 126 v 22 M58 126 v 22 M40 148 v 22" color="#3f3a3a" style="stroke" strokeWidth={1.1} />
          <Path path={`M16 ${BACK} V 140 C 16 126, 26 120, 40 120 C 54 120, 64 126, 64 140 V ${BACK} Z`} color="#1d1218" />
          <Rect x={0} y={96} width={80} height={7} color="#6e4733" />
          <Circle cx={40} cy={172} r={56} opacity={fireGlow}>
            <RadialGradient c={vec(40, 172)} r={56} colors={['#ffb054aa', '#ffb05400']} />
          </Circle>
          <Group transform={fire} origin={{ x: 40, y: 186 }}>
            <Path path="M26 186 C 24 172, 33 168, 31 156 C 38 163, 40 170, 42 161 C 47 168, 52 174, 54 186 Z" color="#e9772f" />
            <Path path="M31 186 C 31 177, 36 174, 36 167 C 41 174, 45 177, 48 186 Z" color="#ffd27a" />
          </Group>

          {/* Shelves of bottles and the barkeep, working the bar at the back */}
          {[42, 66].map((sy) => (
            <Group key={sy}>
              <Rect x={228} y={sy} width={126} height={4} color="#2e1c19" />
              {Array.from({ length: 9 }, (_, i) => (
                <RoundedRect key={i} x={232 + i * 13} y={sy - 15 + (i % 3)} width={7} height={15 - (i % 3)} r={2} color={['#3f6b5a', '#8a3a3a', '#c9a24a', '#5a7f9a'][(i + sy) % 4]} />
              ))}
            </Group>
          ))}
          <Walker look={mug('barkeep')} clock={clock} x0={244} x1={312} footY={BACK - 18} scale={0.5} speed={10} pauseMs={4200} offset={300} shadow={false} />
          <Rect x={226} y={148} width={132} height={BACK - 148} color="#5a3424" />
          <Rect x={222} y={144} width={136} height={5} color="#8a5a3a" />
          {[0, 1, 2].map((i) => (
            <Rect key={i} x={234 + i * 40} y={156} width={32} height={28} color="#4a2a1e" style="stroke" strokeWidth={1.4} />
          ))}
          {[248, 290, 330].map((x) => (
            <Group key={x}>
              <RoundedRect x={x} y={134} width={8} height={10} r={2} color="#c98a5b" />
              <Rect x={x} y={134} width={8} height={2.5} color="#fff3dc" />
            </Group>
          ))}

          {/* Lamps */}
          {[90, 200].map((x) => (
            <Group key={x}>
              <Path path={`M${x} 20 v 20`} color="#2e1c19" style="stroke" strokeWidth={1.3} />
              <Rect x={x - 6} y={40} width={12} height={12} color="#2e1c19" />
              <Rect x={x - 4} y={42} width={8} height={8} color={light.lamp} opacity={flicker} />
              <Circle cx={x} cy={46} r={44} opacity={flicker}>
                <RadialGradient c={vec(x, 46)} r={44} colors={[`${light.lamp}44`, `${light.lamp}00`]} />
              </Circle>
            </Group>
          ))}

          {/* Floor */}
          <Rect x={0} y={BACK} width={W} height={H - BACK}>
            <LinearGradient start={vec(0, BACK)} end={vec(0, H)} colors={['#6e4430', '#3a2420']} />
          </Rect>
          <Path path="M0 206 h 358 M0 230 h 358 M0 258 h 358 M60 190 v 16 M180 206 v 24 M300 190 v 16 M120 230 v 28 M240 230 v 28" color="#2e1c19" style="stroke" strokeWidth={1} />

          {/* A soft light falling on whoever you're looking at */}
          {spot && (
            <Group opacity={spotGlow}>
              <Path path={`M${spot.x - 12} 0 L ${spot.x + 12} 0 L ${spot.x + spot.w} ${spot.y} L ${spot.x - spot.w} ${spot.y} Z`}>
                <LinearGradient start={vec(0, 0)} end={vec(0, spot.y)} colors={[`${light.lamp}10`, `${light.lamp}70`]} />
              </Path>
              <Oval x={spot.x - spot.w - 6} y={spot.y - 6} width={(spot.w + 6) * 2} height={12}>
                <RadialGradient c={vec(spot.x, spot.y)} r={spot.w + 6} colors={[`${light.lamp}aa`, `${light.lamp}00`]} />
              </Oval>
            </Group>
          )}

          {/* The long table, with everyone on the far bench */}
          <Rect x={TABLE_X0 + 6} y={TABLE_Y - 18} width={TABLE_X1 - TABLE_X0 - 12} height={10} color="#4a2a1e" />
          {seated.map((p, i) => (
            <Seated key={p.id} look={mug(p.id)} x={p.x} clock={clock} offset={i * 1170 + (i % 2) * 2900} rim={p.hand && p.hand.id === selectedId ? light.lamp : undefined} />
          ))}
          <Oval x={TABLE_X0} y={TABLE_Y + 36} width={TABLE_X1 - TABLE_X0} height={10} color="#000000" opacity={0.25} />
          {[TABLE_X0 + 14, TABLE_X1 - 22, (TABLE_X0 + TABLE_X1) / 2 - 4].map((x) => (
            <Rect key={x} x={x} y={TABLE_Y + 10} width={8} height={30} color="#4a2a1e" />
          ))}
          <Rect x={TABLE_X0} y={TABLE_Y} width={TABLE_X1 - TABLE_X0} height={12} color="#8a5a3a" />
          <Rect x={TABLE_X0} y={TABLE_Y} width={TABLE_X1 - TABLE_X0} height={2} color="#c98a5b" opacity={0.8} />
          <Path path={`M${TABLE_X0 + 60} ${TABLE_Y + 2} v 10 M${TABLE_X0 + 130} ${TABLE_Y + 2} v 10 M${TABLE_X0 + 190} ${TABLE_Y + 2} v 10`} color="#5a3424" style="stroke" strokeWidth={1} />
          {/* On the table: mugs, a plate, a candle */}
          {[100, 146, 214, 262].map((x, i) => (
            <Group key={x}>
              <RoundedRect x={x} y={TABLE_Y - 9} width={7} height={9} r={1.5} color={i % 2 ? '#c98a5b' : '#b5764c'} />
              <Rect x={x} y={TABLE_Y - 9} width={7} height={2} color="#fff3dc" />
            </Group>
          ))}
          <Oval x={176} y={TABLE_Y - 3} width={20} height={5} color="#efe3d2" />
          <Rect x={182} y={TABLE_Y - 6} width={8} height={4} color="#c98a5b" />
          <Rect x={238} y={TABLE_Y - 13} width={3.5} height={13} color="#f3e7d8" />
          <Path path={`M239.7 ${TABLE_Y - 13} C 238 ${TABLE_Y - 16}, 240 ${TABLE_Y - 19}, 239.7 ${TABLE_Y - 20} C 241 ${TABLE_Y - 19}, 242 ${TABLE_Y - 16}, 239.7 ${TABLE_Y - 13} Z`} color="#ffd27a" opacity={flicker} />
          <Circle cx={240} cy={TABLE_Y - 16} r={16} opacity={flicker}>
            <RadialGradient c={vec(240, TABLE_Y - 16)} r={16} colors={['#ffd27a55', '#ffd27a00']} />
          </Circle>
          {/* The near bench */}
          <Rect x={TABLE_X0 + 10} y={TABLE_Y + 30} width={TABLE_X1 - TABLE_X0 - 20} height={6} color="#6e4733" />

          {/* Talk across the table */}
          <Chatter clock={clock} a={{ x: SEATS[0] + SEAT_W / 2 + 6, y: seatHead }} b={{ x: SEATS[1] + SEAT_W / 2 - 6, y: seatHead }} />
          <Chatter clock={clock} a={{ x: SEATS[3] + SEAT_W / 2 + 6, y: seatHead }} b={{ x: SEATS[4] + SEAT_W / 2 - 6, y: seatHead }} offset={1900} />

          {/* The rare captain, by the fire, in a glow of their own */}
          {captain && (
            <Group>
              <Oval x={CAPTAIN_X - 16} y={FRONT_FOOT - 112} width={70} height={120} opacity={aura}>
                <RadialGradient c={vec(CAPTAIN_X + 18, FRONT_FOOT - 50)} r={64} colors={['#f2c75a66', '#f2c75a00']} />
              </Oval>
              <Walker look={lookFor(captain.id, true)} clock={clock} x0={CAPTAIN_X} x1={CAPTAIN_X + 8} footY={FRONT_FOOT} scale={WALK_SCALE * 1.04} speed={4} pauseMs={7000} offset={900} rimLight="#f2c75a" />
              <Path path={sparkle} color="#f2c75a" opacity={sparkleOpacity} />
            </Group>
          )}

          {/* Wandering about with a mug: a regular, and any hands without a seat */}
          <Walker look={mug('regular-walker')} clock={clock} x0={300} x1={170} footY={FRONT_FOOT} scale={WALK_SCALE} speed={14} pauseMs={3800} offset={2200} />
          {extraHands.map((h, i) => (
            <Walker key={h.id} look={mug(h.id)} clock={clock} x0={70 + i * 40} x1={150 + i * 40} footY={FRONT_FOOT} scale={WALK_SCALE} speed={12} pauseMs={4400} offset={i * 1500} rimLight={h.id === selectedId ? light.lamp : undefined} />
          ))}
          {spot && (
            <Circle cx={spot.x} cy={spot.y - (seat ? 28 : 52)} r={seat ? 26 : 40} opacity={spotGlow}>
              <RadialGradient c={vec(spot.x, spot.y - (seat ? 28 : 52))} r={seat ? 26 : 40} colors={[`${light.lamp}50`, `${light.lamp}00`]} />
            </Circle>
          )}
        </Group>
      </Canvas>

      {/* Tap targets: hands at the table, any wandering hands, and the rare captain */}
      {seated
        .filter((p) => p.hand)
        .map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p.hand!.id)}
            accessibilityRole="button"
            accessibilityLabel={p.hand!.name}
            accessibilityState={{ selected: p.hand!.id === selectedId }}
            style={{ position: 'absolute', left: (p.x - 4) * s, top: (TABLE_Y - 54) * s, width: (SEAT_W + 8) * s, height: 58 * s }}
          />
        ))}
      {extraHands.map((h, i) => (
        <Pressable key={h.id} onPress={() => onSelect(h.id)} accessibilityRole="button" accessibilityLabel={h.name} style={{ position: 'absolute', left: (70 + i * 40) * s, top: walkTop * s, width: 110 * s, height: (FRONT_FOOT - walkTop) * s }} />
      ))}
      {captain && (
        <Pressable
          onPress={() => onSelect(captain.id)}
          accessibilityRole="button"
          accessibilityLabel={captain.name}
          style={{ position: 'absolute', left: (CAPTAIN_X - 4) * s, top: walkTop * s, width: 50 * s, height: (FRONT_FOOT - walkTop) * s }}
        />
      )}
    </View>
  )
}
