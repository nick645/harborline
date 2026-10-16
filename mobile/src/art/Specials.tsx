// Legendary and mythic boats are one of a kind, so each is drawn by hand here rather than built
// from the common kit. The look follows what she does: Stormchaser wears a lightning rod, the
// Ghost is half there, the Unmoored floats above the sea. Same local space as BoatArt: deck
// amidships at y = 0, stern x = 0, bow x = W, hull down to y = H.

import type { ReactNode } from 'react'
import { Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { BoatLayout, Pose } from './boatGeometry'
import { handsFor } from './boatGeometry'
import type { Light } from './light'
import { lookFor, type Look } from './looks'
import { DeckFigure } from './DeckFigure'
import { shade, tint } from './paint'

/** Everything a part of a boat drawing needs. */
export type Ctx = { L: BoatLayout; tier: number; lit: (c: string) => string; light: Light; seed: number; condition: number }

type SP = { ctx: Ctx; clock: SharedValue<number>; captain: Look | null; people: boolean }

// ---------- shared bits ----------

const ring = (x: number, y: number, r: number) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`
const rivets = (x0: number, x1: number, y: (x: number) => number, step = 7, r = 0.8) => {
  let d = ''
  for (let x = x0; x <= x1; x += step) d += ring(x, y(x), r)
  return d
}
const clipOf = (d: string) => Skia.Path.MakeFromSVGString(d)!

function Hull({ ctx, d = ctx.L.hullPath, top, bottom, belly, stripe }: { ctx: Ctx; d?: string; top: string; bottom?: string; belly?: string; stripe?: string }) {
  const { L, lit } = ctx
  return (
    <Group>
      <Path path={d}>
        <LinearGradient start={vec(0, -8)} end={vec(0, L.H)} colors={[lit(tint(top, 0.08)), lit(bottom ?? shade(top, 0.25))]} />
      </Path>
      {belly && (
        <Group clip={clipOf(d)}>
          <Rect x={-10} y={L.waterline} width={L.W + 20} height={L.H * 2} color={lit(belly)} />
          <Path path={`M-10 ${L.waterline} H ${L.W + 10}`} color={lit('#efe3d2')} style="stroke" strokeWidth={1.2} />
        </Group>
      )}
      {stripe && <Path path={L.sheerPath} color={lit(stripe)} style="stroke" strokeWidth={3} strokeCap="round" />}
    </Group>
  )
}

/** The captain (if aboard) and as many hands as her size calls for. */
function Aboard({ p, captainAt, hands = [], dim = 1 }: { p: SP; captainAt?: { x: number; pose: Pose; aft?: boolean; y?: number }; hands?: { x: number; pose: Pose; aft?: boolean; y?: number }[]; dim?: number }) {
  if (!p.people) return null
  const { L, tier, lit, seed } = p.ctx
  const size = 30 - tier * 2
  return (
    <Group opacity={dim}>
      {hands.slice(0, handsFor(tier)).map((h, i) => (
        <DeckFigure key={i} look={lookFor(`hand-${seed}-${i}`)} pose={h.pose} aft={h.aft} x={h.x} y={h.y ?? L.deckY(h.x)} size={size} clock={p.clock} offset={i * 911} lit={lit} />
      ))}
      {p.captain && captainAt && (
        <DeckFigure look={p.captain} pose={captainAt.pose} aft={captainAt.aft} x={captainAt.x} y={captainAt.y ?? L.deckY(captainAt.x)} size={size} clock={p.clock} lit={lit} />
      )}
    </Group>
  )
}

function Lamp({ x, y, color, r = 9, clock }: { x: number; y: number; color: string; r?: number; clock: SharedValue<number> }) {
  const glow = useDerivedValue(() => 0.75 + 0.25 * Math.sin(clock.value / 230 + x))
  return (
    <Group opacity={glow}>
      <Circle cx={x} cy={y} r={r}>
        <RadialGradient c={vec(x, y)} r={r} colors={[`${color}cc`, `${color}00`]} />
      </Circle>
      <Circle cx={x} cy={y} r={1.8} color={color} />
    </Group>
  )
}

function Flag({ x, y, color, clock, len = 16 }: { x: number; y: number; color: string; clock: SharedValue<number>; len?: number }) {
  const flutter = useDerivedValue(() => [{ scaleX: 0.85 + 0.15 * Math.sin(clock.value / 170 + x) }, { skewY: 0.12 * Math.sin(clock.value / 130 + x) }])
  return (
    <Group>
      <Path path={`M${x} ${y + 26} V ${y}`} color="#4a2e22" style="stroke" strokeWidth={1.4} />
      <Group transform={flutter} origin={vec(x, y + 3)}>
        <Path path={`M${x} ${y} L ${x - len} ${y + 3} L ${x} ${y + 7} Z`} color={color} />
      </Group>
    </Group>
  )
}

const windows = (x0: number, x1: number, y: number, w: number, h: number, gap: number, color: string, r = 1.4) => {
  const n = Math.max(1, Math.floor((x1 - x0 + gap) / (w + gap)))
  return Array.from({ length: n }, (_, i) => <RoundedRect key={i} x={x0 + i * (w + gap)} y={y} width={w} height={h} r={r} color={color} />)
}

// ---------- legendary ----------

/** Takes no damage in storms: a sealed whaleback with a lightning rod and a red storm sail. */
function Stormchaser(p: SP) {
  const { L, lit } = p.ctx
  const { W } = L
  const spark = useDerivedValue(() => {
    const t = (p.clock.value % 2600) / 2600
    return t < 0.06 || (t > 0.1 && t < 0.13) ? 1 : 0
  })
  const back = `M${W * 0.4} 0 C ${W * 0.42} -24, ${W * 0.84} -26, ${W * 0.92} ${L.deckY(W * 0.92)} Z`
  return (
    <Group>
      <Path path={`M${W * 0.36} 0 V -80`} color={lit('#3a2a22')} style="stroke" strokeWidth={2.6} />
      <Path path={`M${W * 0.36} -76 L ${W * 0.36} -26 L ${W * 0.14} -24 Z`} color={lit('#b8423a')} />
      <Path path={`M${W * 0.36} -80 V -94`} color={lit('#c98a5b')} style="stroke" strokeWidth={1.4} />
      <Path path={`M${W * 0.36 - 3} -86 q 3 -2 6 0 q -3 2 -6 0 m 0 4 q 3 -2 6 0`} color={lit('#c98a5b')} style="stroke" strokeWidth={0.9} />
      <Path path={`M${W * 0.36} -94 l -4 -8 l 5 2 l -3 -9`} color="#ffe46b" style="stroke" strokeWidth={1.4} opacity={spark} />
      <Hull ctx={p.ctx} top="#1f2a44" belly="#8a2f2a" />
      <Path path={back}>
        <LinearGradient start={vec(0, -26)} end={vec(0, 0)} colors={[lit('#e9b23c'), lit('#b88a2a')]} />
      </Path>
      {[0.55, 0.66, 0.77].map((f) => (
        <Circle key={f} cx={W * f} cy={-10} r={2.6} color={p.ctx.light.window} />
      ))}
      <Path path={`M${W * 0.08} 7 l 12 -4 l -4 6 l 14 -5 l -5 7 l 16 -6`} color={lit('#ffe46b')} style="stroke" strokeWidth={1.8} strokeJoin="round" />
      <Aboard p={p} captainAt={{ x: W * 0.24, pose: 'haul' }} />
    </Group>
  )
}

/** Trips take half the time: a varnished mahogany runabout throwing spray. */
function TheErrand(p: SP) {
  const { L, lit } = p.ctx
  const { W } = L
  const hull = `M-2 -4 L ${W * 0.7} -5 C ${W * 0.9} -6, ${W - 2} -9, ${W + 6} -12 C ${W - 12} 4, ${W * 0.7} ${L.H}, ${W * 0.5} ${L.H} L ${W * 0.06} ${L.H} C 0 ${L.H}, -3 ${L.H * 0.5}, -2 -4 Z`
  const spray = useDerivedValue(() => [{ translateX: -((p.clock.value / 9) % 18) }])
  return (
    <Group>
      <Path path={hull}>
        <LinearGradient start={vec(0, -6)} end={vec(0, L.H)} colors={[lit('#a8572e'), lit('#5a2512')]} />
      </Path>
      {[3, 8].map((dy) => (
        <Path key={dy} path={`M2 ${dy} L ${W * 0.85} ${dy - 5}`} color={lit('#e8a06a')} style="stroke" strokeWidth={0.6} opacity={0.6} />
      ))}
      <Path path={`M-2 -4 L ${W * 0.7} -5 C ${W * 0.9} -6, ${W - 2} -9, ${W + 6} -12`} color={lit('#e6d6b0')} style="stroke" strokeWidth={2} />
      <Path path={`M${W * 0.62} -5 L ${W * 0.95} -10`} color={lit('#f3e7d8')} style="stroke" strokeWidth={0.8} />
      <Path path={`M${W * 0.5} -5 C ${W * 0.52} -16, ${W * 0.6} -18, ${W * 0.62} -18 L ${W * 0.64} -5 Z`} color={lit('#cfe6ee')} opacity={0.7} />
      <Path path={`M${W * 0.5} -5 C ${W * 0.52} -16, ${W * 0.6} -18, ${W * 0.62} -18`} color={lit('#d9dde2')} style="stroke" strokeWidth={1.2} />
      {[0.18, 0.34].map((f, i) => (
        <RoundedRect key={i} x={W * f} y={-11} width={W * 0.12} height={7} r={3} color={lit('#b8423a')} />
      ))}
      {[0.2, 0.26, 0.36, 0.42].map((f, i) => (
        <Group key={f}>
          <Circle cx={W * f} cy={-14} r={2.8} color={lit(['#e0b48a', '#b5764c', '#f0c9a0', '#8a5a3a'][i])} />
          <Path path={`M${W * f - 3} -8 C ${W * f - 3} -12, ${W * f + 3} -12, ${W * f + 3} -8`} color={lit(['#2f5d62', '#e9b23c', '#7a4e5e', '#3d5a73'][i])} />
        </Group>
      ))}
      <Group transform={spray}>
        {[0, 18, 36].map((dx) => (
          <Path key={dx} path={`M${W + 8 + dx} -8 q 6 -10 14 -4 M${W + 12 + dx} -2 q 4 -6 10 -2`} color="#f3fbff" style="stroke" strokeWidth={1.2} opacity={0.8} />
        ))}
      </Group>
      <Path path={`M-4 ${L.H - 2} C -20 ${L.H - 8}, -40 ${L.H - 2}, -60 ${L.H - 6}`} color="#f3fbff" style="stroke" strokeWidth={1.8} opacity={0.7} />
      <Aboard p={p} captainAt={{ x: W * 0.55, pose: 'wheel', y: -3 }} />
    </Group>
  )
}

/** Never loses a trip: kingfisher blue over orange, a beak for a bowsprit. */
function Kingfisher(p: SP) {
  const { L, lit } = p.ctx
  const { W } = L
  const bow = L.deckY(W)
  return (
    <Group>
      {[0.3, 0.58].map((f, i) => (
        <Group key={f}>
          <Path path={`M${W * f} ${L.deckY(W * f)} V ${-86 + i * 10}`} color={lit('#2e2a33')} style="stroke" strokeWidth={2.2} />
          <Path path={`M${W * f + 1} ${-84 + i * 10} C ${W * f - 30} ${-60 + i * 10}, ${W * f - 34} -30, ${W * f - 30} -8 L ${W * f + 1} -8 Z`}>
            <LinearGradient start={vec(W * f - 30, -80)} end={vec(W * f, -8)} colors={[lit('#3cb4e6'), lit('#1d6fa8')]} />
          </Path>
        </Group>
      ))}
      <Path path={`M${W * 0.58} -76 L ${W + 18} ${bow - 3} L ${W * 0.6} -10 Z`} color={lit('#f08a3c')} opacity={0.95} />
      <Hull ctx={p.ctx} top="#1d7a9a" bottom="#0f4d66" belly="#e2742a" />
      <Path path={`M8 4 C ${W * 0.3} 0, ${W * 0.6} 0, ${W - 6} ${bow + 5}`} color={lit('#7fdcf0')} style="stroke" strokeWidth={1.6} />
      <Path path={`M${W - 2} ${bow} L ${W + 24} ${bow - 4} L ${W - 2} ${bow + 4} Z`} color={lit('#2e2a33')} />
      <Circle cx={W - 8} cy={bow + 2} r={2.2} color="#fff3dc" />
      <Circle cx={W - 7.6} cy={bow + 2} r={1.1} color="#1d1218" />
      {[0, 1, 2].map((i) => (
        <RoundedRect key={i} x={W * 0.38 + i * 11} y={-10} width={10} height={10} r={4} color={lit(i % 2 ? '#c9a27a' : '#b88a5a')} />
      ))}
      <Aboard p={p} captainAt={{ x: W * 0.18, pose: 'haul' }} hands={[{ x: W * 0.86, pose: 'lookout' }]} />
    </Group>
  )
}

/** Comes home if a trip is lost: she sails on a gull's wings. */
function TheGull(p: SP) {
  const { L, lit } = p.ctx
  const { W } = L
  const mx = W * 0.5
  const beat = useDerivedValue(() => [{ scaleY: 1 + 0.06 * Math.sin(p.clock.value / 420) }])
  const wing = (dir: 1 | -1) =>
    `M${mx} -30 C ${mx + dir * 20} -64, ${mx + dir * 46} -72, ${mx + dir * 70} -58 C ${mx + dir * 54} -56, ${mx + dir * 40} -52, ${mx + dir * 30} -40 C ${mx + dir * 22} -36, ${mx + dir * 10} -34, ${mx} -30 Z`
  return (
    <Group>
      <Path path={`M${mx} 0 V -40`} color={lit('#5b6470')} style="stroke" strokeWidth={2.4} />
      <Group transform={beat} origin={vec(mx, -30)}>
        {([-1, 1] as const).map((d) => (
          <Group key={d}>
            <Path path={wing(d)} color={lit('#f6f2ea')} />
            <Path path={`M${mx + d * 70} -58 C ${mx + d * 62} -57, ${mx + d * 56} -56, ${mx + d * 52} -54 L ${mx + d * 58} -62 Z`} color={lit('#2e2a33')} />
            <Path path={wing(d)} color={lit('#c9c4bc')} style="stroke" strokeWidth={0.8} />
          </Group>
        ))}
      </Group>
      <Hull ctx={p.ctx} top="#f3efe6" bottom="#c9c4bc" belly="#5b6470" stripe="#e9b23c" />
      <RoundedRect x={W * 0.24} y={-16} width={W * 0.5} height={16} r={6} color={lit('#e8e2d6')} />
      {windows(W * 0.27, W * 0.7, -12, 8, 7, 4, p.ctx.light.window, 3.5)}
      <Path path={`M${W - 4} ${L.deckY(W - 4) + 2} l 9 2 l -9 3 Z`} color={lit('#e9b23c')} />
      <Aboard p={p} captainAt={{ x: W * 0.84, pose: 'wheel' }} hands={[{ x: W * 0.12, pose: 'coil', aft: true }]} />
    </Group>
  )
}

/** Duplicates rare finds: a salvage tug with a crane, a catch on the hook and her scars on show. */
function Salvager(p: SP) {
  const { L, lit } = p.ctx
  const { W } = L
  const swing = useDerivedValue(() => [{ rotate: 0.12 * Math.sin(p.clock.value / 700) }])
  const tip = { x: W * 0.06, y: -84 }
  return (
    <Group>
      <Path path={`M${W * 0.34} 0 L ${W * 0.3} -70 L ${tip.x} ${tip.y} M${W * 0.3} -70 L ${W * 0.18} 0`} color={lit('#e9b23c')} style="stroke" strokeWidth={3.2} strokeJoin="round" />
      <Group transform={swing} origin={vec(tip.x, tip.y)}>
        <Path path={`M${tip.x} ${tip.y} V -36`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.9} />
        <Path path={`M${tip.x} -36 v 14 m -8 -6 c 0 8, 16 8, 16 0 m -16 0 l -2 -2 m 18 2 l 2 -2 m -10 -10 h 4`} color={lit('#5b6470')} style="stroke" strokeWidth={2.2} strokeCap="round" />
        {[-4, 2, 6].map((dx) => (
          <Circle key={dx} cx={tip.x + dx} cy={-16 + Math.abs(dx)} r={1.2} color={lit('#3f6b5a')} />
        ))}
      </Group>
      <Rect x={W * 0.52} y={-38} width={W * 0.26} height={38} color={lit('#efe3d2')} />
      {windows(W * 0.54, W * 0.76, -32, 9, 8, 3, p.ctx.light.window)}
      <Rect x={W * 0.6} y={-56} width={14} height={18} color={lit('#2e1c19')} />
      <Rect x={W * 0.6} y={-50} width={14} height={4} color={lit('#d0662a')} />
      <Hull ctx={p.ctx} top="#d0662a" bottom="#8a3a1a" belly="#2e1c19" />
      {[0.15, 0.3, 0.45, 0.6, 0.75].map((f) => (
        <Circle key={f} cx={W * f} cy={6} r={4} color={lit('#1d1218')} style="stroke" strokeWidth={2} />
      ))}
      <Rect x={W * 0.36} y={-3} width={16} height={11} color={lit('#a8452e')} />
      <Path path={rivets(W * 0.36 + 2, W * 0.36 + 15, () => -1, 4.3, 0.6)} color={lit('#f3e7d8')} />
      <Path path={`M${W * 0.44} -12 c 0 -6, 8 -6, 8 0 l 1 4 h -10 Z`} color={lit('#c99a3a')} />
      <Aboard p={p} captainAt={{ x: W * 0.86, pose: 'lookout' }} hands={[{ x: W * 0.24, pose: 'haul', aft: true }, { x: W * 0.44, pose: 'coil' }]} />
    </Group>
  )
}

/** Earns at anchor: black as the bird, a long neck at the bow and lines over the side. */
function TheCormorant(p: SP) {
  const { L, lit } = p.ctx
  const { W } = L
  const bob = useDerivedValue(() => Math.sin(p.clock.value / 500) * 2)
  const bobB = useDerivedValue(() => Math.cos(p.clock.value / 560) * 2)
  const bow = L.deckY(W)
  return (
    <Group>
      <Path path={`M-6 ${L.deckY(0) - 6} L -40 30 M${W * 0.1} -20 L -24 34`} color={lit('#c9b6ae')} style="stroke" strokeWidth={0.6} />
      <Circle cx={-40} cy={bob} r={2.2} color="#e9772f" transform={[{ translateY: 30 }]} />
      <Circle cx={-24} cy={bobB} r={2.2} color="#e9772f" transform={[{ translateY: 34 }]} />
      <Path path={`M${W * 0.1} -20 L ${W * 0.1} -2`} color={lit('#2e2a33')} style="stroke" strokeWidth={1.4} />
      <Rect x={W * 0.18} y={-34} width={W * 0.56} height={34} color={lit('#26302c')} />
      <Rect x={W * 0.18} y={-34} width={W * 0.56} height={3} color={lit('#3f6b5a')} />
      {windows(W * 0.21, W * 0.72, -28, 8, 9, 5, p.ctx.light.window, 4)}
      <Rect x={W * 0.3} y={-50} width={W * 0.3} height={16} color={lit('#26302c')} />
      {windows(W * 0.32, W * 0.58, -46, 7, 7, 4, p.ctx.light.window, 3.5)}
      <Hull ctx={p.ctx} top="#1d2420" bottom="#0e1210" belly="#3f6b5a" stripe="#5aa287" />
      <Path path={`M${W - 6} ${bow} C ${W + 4} ${bow - 8}, ${W} ${bow - 22}, ${W + 6} ${bow - 30} C ${W + 10} ${bow - 34}, ${W + 18} ${bow - 32}, ${W + 22} ${bow - 28}`} color={lit('#1d2420')} style="stroke" strokeWidth={5} strokeCap="round" />
      <Path path={`M${W + 21} ${bow - 29} l 9 3`} color={lit('#e9b23c')} style="stroke" strokeWidth={2} strokeCap="round" />
      <Circle cx={W + 13} cy={bow - 32} r={1.1} color="#7fdcf0" />
      <Lamp x={W * 0.12} y={-22} color="#ffc46b" clock={p.clock} />
      <Aboard p={p} captainAt={{ x: W * 0.82, pose: 'lookout' }} hands={[{ x: W * 0.06, pose: 'coil', aft: true }, { x: W * 0.12, pose: 'haul', aft: true }]} />
    </Group>
  )
}

/** Faster by night: a low blockade runner in dazzle paint, hooded lamps only. */
function Nightrunner(p: SP) {
  const { L, lit } = p.ctx
  const { W, H } = L
  const hull = L.hullPath
  const dazzle = `M0 -4 L ${W * 0.14} ${H} L ${W * 0.26} ${H} L ${W * 0.12} -4 Z M${W * 0.3} -4 L ${W * 0.5} ${H} L ${W * 0.58} ${H} L ${W * 0.4} -4 Z M${W * 0.62} -6 L ${W * 0.7} ${H} L ${W * 0.82} ${H} L ${W * 0.7} -7 Z M${W * 0.86} -9 L ${W * 0.92} ${H}`
  return (
    <Group>
      {[0.4, 0.52].map((f) => (
        <Path key={f} path={`M${W * f + 6} 0 L ${W * f - 8} -40 L ${W * f + 4} -40 L ${W * f + 18} 0 Z`} color={lit('#2a2e36')} />
      ))}
      <Path path={`M${W * 0.56} 0 L ${W * 0.58} -22 L ${W * 0.74} -22 L ${W * 0.8} 0 Z`} color={lit('#3a414c')} />
      <Rect x={W * 0.6} y={-18} width={W * 0.14} height={3} color={lit('#0e1014')} />
      {[0.1, 0.2].map((f) => (
        <Path key={f} path={`M${W * f} 0 C ${W * f} -14, ${W * f + 26} -14, ${W * f + 26} 0 Z`} color={lit('#4a4f3a')} />
      ))}
      <Path path={hull}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[lit('#3a414c'), lit('#1d2128')]} />
      </Path>
      <Group clip={clipOf(hull)}>
        <Path path={dazzle} color={lit('#8f9aa8')} opacity={0.75} />
        <Path path={`M${W * 0.2} ${H * 0.4} L ${W * 0.4} ${H * 0.1} L ${W * 0.44} ${H * 0.5} Z`} color={lit('#0e1014')} opacity={0.8} />
      </Group>
      <Path path={L.sheerPath} color={lit('#0e1014')} style="stroke" strokeWidth={2} />
      <Lamp x={W * 0.66} y={-26} color="#ff5c5c" r={6} clock={p.clock} />
      <Aboard p={p} captainAt={{ x: W * 0.84, pose: 'lookout' }} hands={[{ x: W * 0.28, pose: 'coil' }, { x: W * 0.06, pose: 'haul', aft: true }, { x: W * 0.92, pose: 'coil' }]} />
    </Group>
  )
}

/** Carries two captains: a catamaran with a wheelhouse on each hull and a brass sun on the mast. */
function TheMeridian(p: SP) {
  const { L, lit } = p.ctx
  const { W, H } = L
  const spin = useDerivedValue(() => [{ rotate: p.clock.value / 4000 }])
  const sun = { x: W * 0.5, y: -76 }
  const far = L.hullPath
  return (
    <Group>
      <Group transform={[{ translateX: 14 }, { translateY: -16 }]}>
        <Path path={far} color={lit('#4a6a96')} />
        <Path path={L.sheerPath} color={lit('#e6a53a')} style="stroke" strokeWidth={1.6} />
      </Group>
      {[0.25, 0.5, 0.75].map((f) => (
        <Path key={f} path={`M${W * f} 0 L ${W * f + 14} -16`} color={lit('#24324a')} style="stroke" strokeWidth={3} />
      ))}
      <Rect x={W * 0.1} y={-26} width={W * 0.78} height={26} color={lit('#f3efe6')} />
      <Rect x={W * 0.1} y={-26} width={W * 0.78} height={3} color={lit('#24324a')} />
      {windows(W * 0.13, W * 0.86, -20, 8, 10, 4, p.ctx.light.window, 2)}
      {[0.2, 0.66].map((f) => (
        <Group key={f}>
          <Rect x={W * f} y={-42} width={W * 0.14} height={16} color={lit('#e8e2d6')} />
          {windows(W * f + 3, W * f + W * 0.14 - 3, -38, 7, 7, 3, p.ctx.light.window)}
        </Group>
      ))}
      <Path path={`M${sun.x} -26 V ${sun.y}`} color={lit('#8a6a3a')} style="stroke" strokeWidth={2} />
      <Group transform={spin} origin={vec(sun.x, sun.y)}>
        <Path path={Array.from({ length: 8 }, (_, i) => `M${sun.x} ${sun.y} l ${Math.cos((i * Math.PI) / 4) * 12} ${Math.sin((i * Math.PI) / 4) * 12}`).join(' ')} color={lit('#e6a53a')} style="stroke" strokeWidth={1.6} />
      </Group>
      <Circle cx={sun.x} cy={sun.y} r={6} color={lit('#e6a53a')} />
      <Circle cx={sun.x} cy={sun.y} r={3} color={lit('#fff1cf')} />
      <Path path={far}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[lit('#34507a'), lit('#1d2c44')]} />
      </Path>
      <Path path={L.sheerPath} color={lit('#e6a53a')} style="stroke" strokeWidth={2.4} />
      <Aboard p={p} captainAt={{ x: W * 0.27, pose: 'wheel', y: -26 }} hands={[{ x: W * 0.73, pose: 'wheel', y: -26 }, { x: W * 0.92, pose: 'lookout' }, { x: W * 0.05, pose: 'coil', aft: true }]} />
    </Group>
  )
}

/** Rolls for parts twice: an icebreaker with a riveted ram and teeth at the bow. */
function Ironjaw(p: SP) {
  const { L, lit } = p.ctx
  const { W, H } = L
  const hull = `M-2 -3 Q ${W * 0.6} 0, ${W * 0.9} -14 L ${W + 4} -16 L ${W + 14} ${H * 0.55} L ${W * 0.84} ${H} L ${W * 0.08} ${H} C ${W * 0.02} ${H}, -2 ${H * 0.6}, -2 -3 Z`
  const teeth = Array.from({ length: 6 }, (_, i) => `M${W + 12 - i * 2.4} ${H * 0.18 + i * 3.4} l -6 2 l 6 1.6`).join(' ')
  return (
    <Group>
      <Rect x={W * 0.12} y={-56} width={W * 0.28} height={56} color={lit('#d9d2c4')} />
      {[0, 1, 2].map((r) => windows(W * 0.14, W * 0.38, -50 + r * 15, 8, 8, 3, p.ctx.light.window))}
      <Rect x={W * 0.2} y={-84} width={20} height={28} color={lit('#1d1218')} />
      <Rect x={W * 0.2} y={-76} width={20} height={6} color={lit('#b8423a')} />
      <Path path={`M${W * 0.6} 0 V -60 L ${W * 0.86} -40`} color={lit('#e9b23c')} style="stroke" strokeWidth={3} strokeJoin="round" />
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={W * 0.44 + i * 14} y={-12} width={13} height={12} color={lit(['#6b5a2e', '#5b6470', '#8a4a2a', '#4a5a66'][i])} />
      ))}
      <Path path={hull}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[lit('#6a737e'), lit('#3a414c')]} />
      </Path>
      <Group clip={clipOf(hull)}>
        <Rect x={-4} y={L.waterline} width={W + 30} height={H} color={lit('#8a2f2a')} />
        <Path path={`M${W * 0.78} -12 L ${W + 14} -16 L ${W + 14} ${H} L ${W * 0.84} ${H} Z`} color={lit('#4a525c')} />
      </Group>
      <Path path={rivets(4, W * 0.9, (x) => (x < W * 0.6 ? 3 : 3 - ((x - W * 0.6) / (W * 0.3)) * 10), 8)} color={lit('#c9ccd0')} />
      <Path path={rivets(W * 0.8, W + 8, (x) => 10 + (x - W * 0.8) * 0.2, 6)} color={lit('#c9ccd0')} />
      <Path path={teeth} color={lit('#e8e4dc')} />
      <Aboard p={p} captainAt={{ x: W * 0.92, pose: 'lookout' }} hands={[{ x: W * 0.46, pose: 'coil' }, { x: W * 0.06, pose: 'haul', aft: true }, { x: W * 0.68, pose: 'haul' }, { x: W * 0.54, pose: 'wave' }]} />
    </Group>
  )
}

/** Always sells high: a paddle steamer in gingerbread and gold. */
function TheMirabel(p: SP) {
  const { L, lit } = p.ctx
  const { W, H } = L
  const turn = useDerivedValue(() => [{ rotate: -p.clock.value / 700 }])
  const wheel = { x: W * 0.5, y: 2, r: 22 }
  return (
    <Group>
      {[0.42, 0.5].map((f) => (
        <Group key={f}>
          <Rect x={W * f} y={-92} width={7} height={60} color={lit('#1d1218')} />
          <Path path={`M${W * f - 2} -92 l 2 -5 l 2 3 l 2 -4 l 2 4 l 2 -3 l 2 5 Z`} color={lit('#e6a53a')} />
        </Group>
      ))}
      {[0, 1, 2].map((d) => {
        const x0 = W * (0.08 + d * 0.06)
        const x1 = W * (0.86 - d * 0.06)
        const top = -16 - d * 14
        return (
          <Group key={d}>
            <Rect x={x0} y={top} width={x1 - x0} height={15} color={lit('#f6f0e2')} />
            {windows(x0 + 4, x1 - 4, top + 3, 6, 8, 3, p.ctx.light.window, 3)}
            <Path path={Array.from({ length: Math.floor((x1 - x0) / 6) }, (_, i) => `M${x0 + i * 6} ${top} q 3 3 6 0`).join(' ')} color={lit('#c9a24a')} style="stroke" strokeWidth={0.8} />
          </Group>
        )
      })}
      <Rect x={W * 0.6} y={-60} width={W * 0.12} height={14} color={lit('#f6f0e2')} />
      {windows(W * 0.61, W * 0.71, -57, 6, 7, 2, p.ctx.light.window, 2)}
      <Path path={`M${W * 0.6 - 2} -60 L ${W * 0.66} -68 L ${W * 0.72 + 2} -60 Z`} color={lit('#b8423a')} />
      <Hull ctx={p.ctx} top="#f3efe6" bottom="#c9c0ae" belly="#2a2230" stripe="#e6a53a" />
      <Path path={`M${wheel.x - wheel.r - 4} 2 A ${wheel.r + 4} ${wheel.r + 4} 0 0 1 ${wheel.x + wheel.r + 4} 2 Z`} color={lit('#b8423a')} />
      <Group transform={turn} origin={vec(wheel.x, wheel.y)}>
        <Path path={Array.from({ length: 10 }, (_, i) => `M${wheel.x} ${wheel.y} l ${Math.cos((i * Math.PI) / 5) * wheel.r} ${Math.sin((i * Math.PI) / 5) * wheel.r}`).join(' ')} color={lit('#f3e7d8')} style="stroke" strokeWidth={1.6} />
        <Circle cx={wheel.x} cy={wheel.y} r={wheel.r} color={lit('#f3e7d8')} style="stroke" strokeWidth={1.4} />
      </Group>
      <Path path={`M${wheel.x - wheel.r - 4} 2 A ${wheel.r + 4} ${wheel.r + 4} 0 0 1 ${wheel.x + wheel.r + 4} 2`} color={lit('#e6a53a')} style="stroke" strokeWidth={2} />
      <Path path={`M${wheel.x - 10} -14 h 20`} color={lit('#e6a53a')} style="stroke" strokeWidth={1} />
      <Flag x={W * 0.9} y={-60} color={lit('#b8423a')} clock={p.clock} />
      <Flag x={W * 0.08} y={-56} color={lit('#e6a53a')} clock={p.clock} />
      <Aboard p={p} captainAt={{ x: W * 0.66, pose: 'wheel', y: -46 }} hands={[{ x: W * 0.92, pose: 'wave' }, { x: W * 0.05, pose: 'coil', aft: true }, { x: W * 0.2, pose: 'wave', y: -44 }, { x: W * 0.8, pose: 'lookout', y: -30 }]} />
    </Group>
  )
}

/** A legendary find brings the whole set: a giant, stacked to the sky. */
function TheColossus(p: SP) {
  const { L, lit, seed } = p.ctx
  const { W, H } = L
  const colors = ['#b8423a', '#2f5d62', '#e9b23c', '#3d5a73', '#7a4e5e', '#6b5a2e', '#c97a3a']
  const hull = `M-4 -6 Q ${W * 0.6} -4, ${W + 4} -16 C ${W - 6} ${H * 0.6}, ${W * 0.86} ${H * 1.3}, ${W * 0.8} ${H * 1.3} L ${W * 0.06} ${H * 1.3} C 0 ${H * 1.3}, -6 ${H * 0.6}, -4 -6 Z`
  return (
    <Group>
      <Rect x={W * 0.03} y={-90} width={W * 0.16} height={90} color={lit('#f3efe6')} />
      {[0, 1, 2, 3, 4, 5].map((r) => windows(W * 0.045, W * 0.18, -84 + r * 13, 6, 7, 2.6, p.ctx.light.window))}
      <Rect x={W * 0.01} y={-96} width={W * 0.2} height={6} color={lit('#24324a')} />
      <Rect x={W * 0.08} y={-120} width={18} height={24} color={lit('#1d1218')} />
      <Path path={`M${W * 0.08} -112 h 18`} color={lit('#e6a53a')} style="stroke" strokeWidth={3} />
      {Array.from({ length: 13 * 6 }, (_, i) => {
        const col = i % 13
        const row = Math.floor(i / 13)
        if (row > 4 + ((col * 7 + seed) % 2)) return null
        const cx = W * 0.23 + col * 16.5
        const c = colors[(col * 3 + row * 5 + seed) % colors.length]
        return <Rect key={i} x={cx} y={-12 - row * 11} width={15.5} height={10.4} color={lit(c)} />
      })}
      {[0.32, 0.56, 0.8].map((f) => (
        <Group key={f}>
          <Path path={`M${W * f} 0 V -92 M${W * f + 22} 0 V -92 M${W * f - 6} -92 H ${W * f + 44} L ${W * f + 60} -84`} color={lit('#e9772f')} style="stroke" strokeWidth={2.4} />
        </Group>
      ))}
      <Path path={hull}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H * 1.3)} colors={[lit('#24324a'), lit('#141c2c')]} />
      </Path>
      <Group clip={clipOf(hull)}>
        <Rect x={-6} y={H * 0.75} width={W + 12} height={H} color={lit('#8a2f2a')} />
      </Group>
      <Path path={`M8 2 Q ${W * 0.6} 4, ${W - 6} -8`} color={lit('#f3efe6')} style="stroke" strokeWidth={1} />
      <Rect x={W * 0.5} y={4} width={44} height={6} color={lit('#f3efe6')} />
      <Aboard p={p} captainAt={{ x: W * 0.1, pose: 'lookout', y: -96 }} hands={[{ x: W * 0.95, pose: 'lookout' }, { x: W * 0.24, pose: 'coil' }, { x: W * 0.9, pose: 'haul' }, { x: W * 0.02, pose: 'coil', aft: true }, { x: W * 0.6, pose: 'wave' }]} />
    </Group>
  )
}

/** Lifts every boat leaving her port: a four-funnelled grande dame of the sea. */
function GrandDame(p: SP) {
  const { L, lit } = p.ctx
  const { W, H } = L
  const hull = `M-4 -10 Q ${W * 0.6} -6, ${W + 6} -22 C ${W - 4} ${H * 0.5}, ${W * 0.86} ${H}, ${W * 0.8} ${H} L ${W * 0.1} ${H} C ${W * 0.02} ${H}, -6 ${H * 0.3}, -4 -10 Z`
  return (
    <Group>
      {[0.3, 0.42, 0.54, 0.66].map((f) => (
        <Group key={f}>
          <Path path={`M${W * f + 2} -24 L ${W * f - 5} -76 L ${W * f + 10} -76 L ${W * f + 17} -24 Z`} color={lit('#c98a4a')} />
          <Path path={`M${W * f - 5} -76 L ${W * f + 10} -76 L ${W * f + 9} -69 L ${W * f - 4} -69 Z`} color={lit('#1d1218')} />
        </Group>
      ))}
      {[0, 1, 2].map((d) => {
        const x0 = W * (0.1 + d * 0.07)
        const x1 = W * (0.84 - d * 0.05)
        const top = -14 - d * 13
        return (
          <Group key={d}>
            <Rect x={x0} y={top} width={x1 - x0} height={14} color={lit('#f6f0e2')} />
            <Rect x={x0} y={top + 11} width={x1 - x0} height={1.4} color={lit('#c9a24a')} />
            {windows(x0 + 3, x1 - 3, top + 3, 5, 6, 2.6, p.ctx.light.window, 1)}
          </Group>
        )
      })}
      <Path path={`M${W * 0.08} -56 Q ${W * 0.48} -100, ${W * 0.92} -60`} color={lit('#c9b6ae')} style="stroke" strokeWidth={0.6} />
      {Array.from({ length: 16 }, (_, i) => {
        const t = i / 15
        const x = W * 0.08 + t * W * 0.84
        const y = (1 - t) ** 2 * -56 + 2 * t * (1 - t) * -100 + t * t * -60
        return <Circle key={i} cx={x} cy={y + 1} r={1.3} color={p.ctx.light.dim > 0.3 ? '#ffd27a' : lit(['#b8423a', '#e9b23c', '#3d5a73'][i % 3])} />
      })}
      <Path path={hull}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[lit('#1d1218'), lit('#0e090c')]} />
      </Path>
      <Group clip={clipOf(hull)}>
        <Rect x={-6} y={L.waterline} width={W + 12} height={H} color={lit('#8a2f2a')} />
      </Group>
      <Path path={`M0 -4 Q ${W * 0.6} -1, ${W + 2} -16`} color={lit('#e6a53a')} style="stroke" strokeWidth={1.6} />
      <Path path={rivets(W * 0.08, W * 0.86, (x) => 3 - (x / W) * 4, 7, 1.1)} color={p.ctx.light.window} />
      <Aboard p={p} captainAt={{ x: W * 0.8, pose: 'lookout', y: -40 }} hands={[{ x: W * 0.95, pose: 'lookout', y: -18 }, { x: W * 0.04, pose: 'wave', aft: true }, { x: W * 0.2, pose: 'wave', y: -40 }, { x: W * 0.5, pose: 'wave', y: -40 }, { x: W * 0.9, pose: 'coil', y: -17 }]} />
    </Group>
  )
}

// ---------- mythic ----------

/** Sails only between midnight and four: a galleon that isn't quite there. */
function TheGhost(p: SP) {
  const { L } = p.ctx
  const { W, H } = L
  const fade = useDerivedValue(() => 0.62 + 0.2 * Math.sin(p.clock.value / 900) + 0.06 * Math.sin(p.clock.value / 137))
  const wisp = (k: number) => {
    'worklet'
    return ((p.clock.value / 3000 + k / 3) % 1 + 1) % 1
  }
  const w1 = useDerivedValue(() => -20 - wisp(0) * 50)
  const w2 = useDerivedValue(() => -20 - wisp(1) * 50)
  const w3 = useDerivedValue(() => -20 - wisp(2) * 50)
  const o1 = useDerivedValue(() => 0.5 * (1 - wisp(0)))
  const o2 = useDerivedValue(() => 0.5 * (1 - wisp(1)))
  const o3 = useDerivedValue(() => 0.5 * (1 - wisp(2)))
  const hull = `M-6 -26 L ${W * 0.16} -24 L ${W * 0.2} -6 Q ${W * 0.6} -4, ${W * 0.84} -10 L ${W + 10} -18 C ${W - 4} ${H * 0.5}, ${W * 0.8} ${H}, ${W * 0.7} ${H} L ${W * 0.1} ${H} C ${W * 0.02} ${H}, -8 ${H * 0.4}, -6 -26 Z`
  const ghost = '#bfeee6'
  const sail = (x: number, top: number, w: number) =>
    `M${x - w} ${top} L ${x + w} ${top} L ${x + w * 0.9} ${top + 22} l -4 4 l -3 -3 l -5 6 l -4 -5 l -3 4 l -4 -4 L ${x - w * 0.9} ${top + 22} Z`
  return (
    <Group opacity={fade}>
      <Circle cx={W / 2} cy={-30} r={W * 0.7}>
        <RadialGradient c={vec(W / 2, -30)} r={W * 0.7} colors={['#7fe0c844', '#7fe0c800']} />
      </Circle>
      {[0.32, 0.54, 0.76].map((f, i) => (
        <Group key={f}>
          <Path path={`M${W * f} -6 V ${-100 + i * 8}`} color={ghost} style="stroke" strokeWidth={1.6} />
          <Path path={sail(W * f, -92 + i * 8, 15)} color={ghost} opacity={0.45} />
          <Path path={sail(W * f, -62 + i * 8, 19)} color={ghost} opacity={0.45} />
          <Path path={sail(W * f, -92 + i * 8, 15)} color="#e8fff9" style="stroke" strokeWidth={0.7} />
          <Path path={sail(W * f, -62 + i * 8, 19)} color="#e8fff9" style="stroke" strokeWidth={0.7} />
        </Group>
      ))}
      <Path path={`M${W * 0.76} ${-100 + 16} L ${W + 26} -16 M${W * 0.32} -100 L -6 -26`} color={ghost} style="stroke" strokeWidth={0.6} />
      <Path path={hull} color="#9fd8cf" opacity={0.4} />
      <Path path={hull} color="#e8fff9" style="stroke" strokeWidth={1.2} />
      <Path path={`M${W * 0.1} 4 Q ${W * 0.5} 8, ${W * 0.9} -2 M${W * 0.12} 10 Q ${W * 0.5} 14, ${W * 0.84} 6`} color="#e8fff9" style="stroke" strokeWidth={0.6} opacity={0.7} />
      {[0.3, 0.45, 0.6].map((f) => (
        <Circle key={f} cx={W * f} cy={2} r={2.2} color="#7fffd4" />
      ))}
      <Lamp x={-2} y={-34} color="#7fffd4" r={14} clock={p.clock} />
      <Circle cx={W * 0.4} cy={w1} r={6} color="#e8fff9" opacity={o1} />
      <Circle cx={W * 0.6} cy={w2} r={5} color="#e8fff9" opacity={o2} />
      <Circle cx={W * 0.2} cy={w3} r={4} color="#e8fff9" opacity={o3} />
      <Aboard p={p} captainAt={{ x: W * 0.08, pose: 'wheel', y: -24 }} hands={[{ x: W * 0.9, pose: 'lookout', y: -12 }]} dim={0.7} />
    </Group>
  )
}

/** Comes with a bonded captain: a queen raised from the seabed, weed and barnacles and all. */
function DerelictQueen(p: SP) {
  const { L, lit, seed } = p.ctx
  const { W, H } = L
  const sway = useDerivedValue(() => [{ skewX: 0.12 * Math.sin(p.clock.value / 800) }])
  const hull = L.hullPath
  const barnacles = Array.from({ length: 28 }, (_, i) => ring(W * 0.06 + ((seed >>> (i % 24)) % 100) * W * 0.0085, H * 0.3 + ((i * 7) % 10) * H * 0.065, 0.9 + (i % 3) * 0.4)).join(' ')
  const weed = Array.from({ length: 9 }, (_, i) => {
    const x = W * 0.08 + i * W * 0.1
    return `M${x} ${L.deckY(x) + 2} q -3 8 0 14 q 3 6 -1 12`
  }).join(' ')
  return (
    <Group>
      <Path path={`M${W * 0.42} -6 L ${W * 0.44} -70 L ${W * 0.5} -58 L ${W * 0.47} -48`} color={lit('#3a2e22')} style="stroke" strokeWidth={3} strokeJoin="round" />
      <Path path={`M${W * 0.44} -66 L ${W * 0.2} -60 L ${W * 0.24} -40 l 4 -3 l 3 5 l 4 -6 l 4 4 L ${W * 0.43} -36 Z`} color={lit('#6b5a4a')} opacity={0.85} />
      <Path path={`M${W * 0.68} -6 V -40 L ${W * 0.72} -46`} color={lit('#3a2e22')} style="stroke" strokeWidth={2.4} />
      <Rect x={W * 0.56} y={-28} width={W * 0.22} height={28} color={lit('#3a4038')} />
      {[0.6, 0.7].map((f) => (
        <Path key={f} path={`M${W * f} -22 h 8 v 8 h -8 Z`} color="#ffb84a" opacity={0.85} />
      ))}
      <Path path={hull}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={[lit('#3f4a3a'), lit('#1f2620')]} />
      </Path>
      <Group clip={clipOf(hull)}>
        <Path path={barnacles} color={lit('#c9c0ae')} />
        <Path path={`M${W * 0.3} ${H * 0.2} l 8 -2 l 2 6 l -6 4 l -6 -3 Z`} color="#120e0c" />
      </Group>
      <Group transform={sway} origin={vec(0, 0)}>
        <Path path={weed} color={lit('#4f7a3a')} style="stroke" strokeWidth={1.6} strokeCap="round" />
      </Group>
      {[0.2, 0.36, 0.52, 0.68].map((f) => (
        <Circle key={f} cx={W * f} cy={6} r={2.4} color="#ffb84a" opacity={0.9} />
      ))}
      <Path path={`M${W - 4} ${L.deckY(W - 4) - 2} l 4 -10 l 3 6 l 3 -8 l 3 8 l 3 -6 l 2 10 Z`} color={lit('#c9a24a')} />
      <Path path={`M${W * 0.12} -4 c 2 -6, 6 -6, 6 0 M${W * 0.15} -4 c 1 -8, 4 -10, 6 -4`} color={lit('#d9605a')} style="stroke" strokeWidth={1.4} />
      <Aboard p={p} captainAt={{ x: W * 0.86, pose: 'lookout' }} hands={[{ x: W * 0.3, pose: 'haul', aft: true }, { x: W * 0.06, pose: 'coil', aft: true }]} />
    </Group>
  )
}

/** Never lost to the weather, ever: black hull, sails of night sky, a crescent at the masthead. */
function TheLongNight(p: SP) {
  const { L, seed } = p.ctx
  const { W, H } = L
  const twinkle = useDerivedValue(() => 0.5 + 0.5 * Math.sin(p.clock.value / 300))
  const twinkleB = useDerivedValue(() => 0.5 - 0.5 * Math.sin(p.clock.value / 300))
  const masts = [0.24, 0.5, 0.76]
  const sail = (x: number) => `M${x - 26} -96 L ${x + 26} -96 C ${x + 30} -70, ${x + 30} -40, ${x + 26} -12 L ${x - 26} -12 C ${x - 22} -40, ${x - 22} -70, ${x - 26} -96 Z`
  const stars = (k: number) =>
    masts
      .flatMap((m, j) => Array.from({ length: 9 }, (_, i) => ring(W * m - 20 + (((seed >>> ((i + j * 5 + k) % 26)) % 40) * 40) / 40, -90 + ((i * 37 + j * 13 + k * 11) % 76), 0.6 + ((i + k) % 3) * 0.3)))
      .join(' ')
  return (
    <Group>
      {masts.map((m) => (
        <Group key={m}>
          <Path path={`M${W * m} 0 V -104`} color="#2a2236" style="stroke" strokeWidth={2.2} />
          <Path path={sail(W * m)}>
            <LinearGradient start={vec(0, -96)} end={vec(0, -12)} colors={['#1a1430', '#2c2050']} />
          </Path>
          <Path path={sail(W * m)} color="#6a5aa0" style="stroke" strokeWidth={0.8} />
        </Group>
      ))}
      <Path path={stars(0)} color="#fff3dc" opacity={twinkle} />
      <Path path={stars(3)} color="#cfd8ff" opacity={twinkleB} />
      <Path path={`M${W * 0.5 + 2} -118 a 7 7 0 1 0 0 12 a 5 5 0 1 1 0 -12 Z`} color="#f4e6c8" />
      <Circle cx={W * 0.5} cy={-112} r={14}>
        <RadialGradient c={vec(W * 0.5, -112)} r={14} colors={['#f4e6c855', '#f4e6c800']} />
      </Circle>
      <Path path={L.hullPath}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={['#120e1a', '#05040a']} />
      </Path>
      <Path path={L.sheerPath} color="#6a5aa0" style="stroke" strokeWidth={1.4} />
      <Aboard p={p} captainAt={{ x: W * 0.9, pose: 'lookout' }} hands={[{ x: W * 0.36, pose: 'haul' }, { x: W * 0.62, pose: 'haul' }, { x: W * 0.06, pose: 'coil', aft: true }]} dim={0.6} />
    </Group>
  )
}

/** Never needs fuel: she has slipped her moorings and floats clear of the sea. */
function TheUnmoored(p: SP) {
  const { L, lit } = p.ctx
  const { W, H } = L
  const hover = useDerivedValue(() => [{ translateY: -26 + Math.sin(p.clock.value / 1100) * 5 }])
  const shadowOpacity = useDerivedValue(() => 0.3 + Math.sin(p.clock.value / 1100) * 0.06)
  const chain = (x: number, len: number) => Array.from({ length: len }, (_, i) => `M${x - 1.6} ${H + 2 + i * 5} a 1.6 2.4 0 1 0 3.2 0 a 1.6 2.4 0 1 0 -3.2 0`).join(' ')
  const rock = `M${W * 0.2} ${H - 2} C ${W * 0.26} ${H + 26}, ${W * 0.5} ${H + 40}, ${W * 0.56} ${H + 22} C ${W * 0.66} ${H + 30}, ${W * 0.78} ${H + 12}, ${W * 0.8} ${H - 2} Z`
  return (
    <Group>
      <Path path={`M${W * 0.15} ${H + 34} C ${W * 0.3} ${H + 30}, ${W * 0.7} ${H + 30}, ${W * 0.85} ${H + 34} C ${W * 0.7} ${H + 38}, ${W * 0.3} ${H + 38}, ${W * 0.15} ${H + 34} Z`} color="#000000" opacity={shadowOpacity} />
      <Group transform={hover}>
        <Path path={rock}>
          <LinearGradient start={vec(0, H)} end={vec(0, H + 40)} colors={[lit('#6b5a46'), lit('#3a2e24')]} />
        </Path>
        <Path path={`M${W * 0.3} ${H + 8} q 6 10 2 22 M${W * 0.62} ${H + 6} q -4 8 0 14`} color={lit('#4f7a3a')} style="stroke" strokeWidth={1.4} />
        <Path path={chain(W * 0.12, 7)} color={lit('#8a8f96')} style="stroke" strokeWidth={1} />
        <Path path={chain(W * 0.9, 5)} color={lit('#8a8f96')} style="stroke" strokeWidth={1} />
        <Path path={`M${W * 0.5} 0 V -96`} color={lit('#4a3a2a')} style="stroke" strokeWidth={2.4} />
        <Path path={`M${W * 0.5} -90 C ${W * 0.3} -80, ${W * 0.26} -40, ${W * 0.3} -14 L ${W * 0.5} -14 Z`} color={lit('#d9c9e6')} opacity={0.95} />
        <Path path={`M${W * 0.52} -90 C ${W * 0.74} -80, ${W * 0.8} -40, ${W * 0.76} -14 L ${W * 0.52} -14 Z`} color={lit('#c4b0dc')} opacity={0.95} />
        <Rect x={W * 0.08} y={-26} width={W * 0.16} height={26} color={lit('#efe3d2')} />
        {windows(W * 0.1, W * 0.22, -21, 8, 8, 3, p.ctx.light.window)}
        <Hull ctx={p.ctx} top="#5a4a6e" bottom="#2e2440" stripe="#b07be6" />
        {[0.35, 0.65].map((f) => (
          <Group key={f}>
            <Circle cx={W * f} cy={H * 0.45} r={4} color="#b07be6" opacity={0.85} />
            <Circle cx={W * f} cy={H * 0.45} r={10}>
              <RadialGradient c={vec(W * f, H * 0.45)} r={10} colors={['#d9b0ff99', '#d9b0ff00']} />
            </Circle>
          </Group>
        ))}
        <Aboard p={p} captainAt={{ x: W * 0.16, pose: 'wheel', y: -26 }} hands={[{ x: W * 0.9, pose: 'lookout' }, { x: W * 0.4, pose: 'haul', aft: true }, { x: W * 0.62, pose: 'haul' }, { x: W * 0.32, pose: 'coil' }]} />
      </Group>
    </Group>
  )
}

/** Storms follow her: a clipper crowned in St Elmo's fire, under her own cloud. */
function SaintElmo(p: SP) {
  const { L, lit } = p.ctx
  const { W } = L
  const masts = [0.2, 0.38, 0.56, 0.74]
  const flame = useDerivedValue(() => [{ scaleY: 0.8 + 0.3 * Math.sin(p.clock.value / 90) }, { scaleX: 0.9 + 0.15 * Math.sin(p.clock.value / 70) }])
  const flash = useDerivedValue(() => {
    const t = (p.clock.value % 3400) / 3400
    return t > 0.8 && t < 0.82 ? 1 : t > 0.86 && t < 0.88 ? 0.7 : 0
  })
  const tops = masts.map((m, i) => ({ x: W * m, y: -120 + (i === 0 || i === 3 ? 10 : 0) }))
  const square = (x: number, y: number, w: number) => `M${x - w} ${y} L ${x + w} ${y} C ${x + w + 3} ${y + 8}, ${x + w + 3} ${y + 14}, ${x + w} ${y + 20} L ${x - w} ${y + 20} C ${x - w + 3} ${y + 14}, ${x - w + 3} ${y + 8}, ${x - w} ${y} Z`
  return (
    <Group>
      <Path path={`M${W * 0.05} -150 C ${W * 0.1} -176, ${W * 0.3} -180, ${W * 0.36} -164 C ${W * 0.44} -190, ${W * 0.72} -188, ${W * 0.76} -166 C ${W * 0.9} -172, ${W * 1.02} -158, ${W * 0.94} -146 Z`} color="#3b3266" />
      <Path path={`M${W * 0.5} -150 l -8 18 l 8 0 l -10 20`} color="#ff5c93" style="stroke" strokeWidth={2} strokeJoin="round" opacity={flash} />
      {tops.map((t, i) => (
        <Group key={i}>
          <Path path={`M${t.x} ${L.deckY(t.x)} V ${t.y}`} color={lit('#3a2a22')} style="stroke" strokeWidth={2} />
          {[0, 1, 2, 3].map((k) => (
            <Path key={k} path={square(t.x, t.y + 6 + k * 22, 18 - k * -2)} color={lit('#f3efe6')} opacity={0.95} />
          ))}
        </Group>
      ))}
      <Path path={`M${tops[3].x} ${tops[3].y} L ${W + 30} ${L.deckY(W) - 4} M${tops[0].x} ${tops[0].y} L -10 ${L.deckY(0) - 8}`} color={lit('#c9b6ae')} style="stroke" strokeWidth={0.6} />
      <Hull ctx={p.ctx} top="#1d2a3a" bottom="#0e141c" belly="#2a2230" stripe="#7fb2ff" />
      {[0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75].map((f) => (
        <Circle key={f} cx={W * f} cy={4} r={1.6} color={p.ctx.light.window} />
      ))}
      {tops.map((t, i) => (
        <Group key={i} transform={flame} origin={vec(t.x, t.y)}>
          <Path path={`M${t.x - 3} ${t.y} C ${t.x - 4} ${t.y - 8}, ${t.x} ${t.y - 10}, ${t.x} ${t.y - 14} C ${t.x + 2} ${t.y - 8}, ${t.x + 4} ${t.y - 6}, ${t.x + 3} ${t.y} Z`} color="#9fc4ff" />
          <Circle cx={t.x} cy={t.y - 4} r={9}>
            <RadialGradient c={vec(t.x, t.y - 4)} r={9} colors={['#8fb8ffaa', '#8fb8ff00']} />
          </Circle>
        </Group>
      ))}
      <Aboard p={p} captainAt={{ x: W * 0.08, pose: 'wheel' }} hands={[{ x: W * 0.92, pose: 'lookout' }, { x: W * 0.3, pose: 'haul' }, { x: W * 0.48, pose: 'haul' }, { x: W * 0.66, pose: 'haul' }, { x: W * 0.84, pose: 'coil' }]} />
    </Group>
  )
}

export const SPECIALS: Record<string, (p: SP) => ReactNode> = {
  stormchaser: Stormchaser,
  'the-errand': TheErrand,
  kingfisher: Kingfisher,
  'the-gull': TheGull,
  salvager: Salvager,
  'the-cormorant': TheCormorant,
  nightrunner: Nightrunner,
  'the-meridian': TheMeridian,
  ironjaw: Ironjaw,
  'the-mirabel': TheMirabel,
  'the-colossus': TheColossus,
  'grand-dame': GrandDame,
  'the-ghost': TheGhost,
  'derelict-queen': DerelictQueen,
  'the-long-night': TheLongNight,
  'the-unmoored': TheUnmoored,
  'saint-elmo': SaintElmo,
}
