// A boat seen side on, built from her class (see boatLayout): a sailing workboat, a derrick
// boat, a trawler or a freighter on the cargo side; a water taxi, a ferry or a liner for
// passengers. Paint comes from the class, light from the hour, wear from her condition, and
// rarity shows in the trim. Local space: deck amidships at y = 0, stern x = 0, bow x = W.

import { useMemo } from 'react'
import { Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia'
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated'
import type { BoatClass } from '../../../src/game/types'
import type { Light } from './light'
import { lookFor, type Look } from './looks'
import { DeckFigure } from './DeckFigure'
import type { Ctx } from './Specials'
import { SPECIALS } from './specialsIndex'
import { boatLayout, handsFor, linerDecks, type BoatLayout, type Box } from './boatGeometry'
import { hash, mix, shade, tint } from './paint'

const TRIM: Record<BoatClass['rarity'], string | null> = {
  common: null,
  rare: '#5aa2ea',
  legendary: '#e6a53a',
  mythic: '#b07be6',
}
const CABIN = '#efe3d2'
const WOOD = '#8a5a3a'
const CANVAS = '#eadfca'
/** Sail cloth and awning colours, picked per class so sister boats don't look like twins. */
const SAILS = [CANVAS, '#d9b48a', '#c9785a', '#e4d6b8', '#b8c4c0']
const AWNINGS = ['#c2452a', '#2f5d62', '#e9b23c', '#3d5a73', '#7a4e5e']
const RUST = '#8a4a2a'
const CONTAINERS = ['#b8423a', '#2f5d62', '#e9b23c', '#3d5a73', '#7a4e5e', '#6b5a2e', '#c97a3a']

type Props = {
  cls: BoatClass
  light: Light
  x: number
  y: number
  scale?: number
  /** Facing left (heading home) instead of right. */
  flip?: boolean
  /** Your captain, at work on deck or at the wheel; null for none aboard. */
  captain?: Look | null
  /** Show the people aboard (captain and deckhands). Off for small thumbnails. */
  people?: boolean
  /** On a trip: passengers aboard, cargo on deck. Docked and for sale, the decks are clear. */
  laden?: boolean
  /** Deckhands aboard; defaults to a full complement. */
  hands?: number
  /** Hull condition 0–100: rust shows below 60, patches below 35. */
  condition?: number
  /** Scene clock for the flag and lamps; without one the boat holds still. */
  clock?: SharedValue<number>
}

export function BoatArt({ cls, light, x, y, scale = 1, flip = false, captain = null, people = false, laden = false, hands, condition = 100, clock }: Props) {
  const L = useMemo(() => boatLayout(cls), [cls])
  const hullClip = useMemo(() => Skia.Path.MakeFromSVGString(L.hullPath)!, [L])
  const still = useSharedValue(0)
  const clk = clock ?? still
  const flutter = useDerivedValue(() => [{ scaleX: 0.85 + 0.15 * Math.sin(clk.value / 180) }, { skewY: 0.12 * Math.sin(clk.value / 140) }])
  const glow = useDerivedValue(() => 0.8 + 0.2 * Math.sin(clk.value / 260))

  const { W, H } = L
  const lit = (c: string) => mix(c, light.silhouette, light.dim)
  const ctx: Ctx = { L, tier: cls.sizeTier, lit, light, seed: hash(cls.id), condition, hands: hands ?? handsFor(cls.sizeTier), clock: clk, laden }
  const trim = TRIM[cls.rarity]
  const Special = SPECIALS[cls.id]
  const paint = lit(L.paint)
  const transform = [{ translateX: x + (flip ? W * scale : 0) }, { translateY: y }, { scaleX: flip ? -scale : scale }, { scaleY: scale }]
  const staffY = L.deckY(1)

  return (
    <Group transform={transform}>
      {cls.rarity === 'mythic' && (
        <Circle cx={W / 2} cy={-14} r={W * 0.62}>
          <RadialGradient c={vec(W / 2, -14)} r={W * 0.62} colors={[`${trim}66`, `${trim}22`, `${trim}00`]} />
        </Circle>
      )}

      {Special ? (
        <Special ctx={ctx} clock={clk} captain={captain} people={people} />
      ) : (
        <>
      <Works ctx={ctx} />
      {L.stack && <Stack box={L.stack} ctx={ctx} trim={trim} />}
      <Wheelhouse ctx={ctx} captain={people ? captain : null} clock={clk} />
      {people && <People ctx={ctx} captain={captain} clock={clk} />}

      {/* Hull */}
      <Path path={L.hullPath}>
        <LinearGradient start={vec(0, -8)} end={vec(0, H)} colors={[tint(paint, 0.08), shade(paint, 0.22)]} />
      </Path>
      <Group clip={hullClip}>
        <Rect x={-4} y={L.waterline} width={W + 8} height={H} color={lit('#8a2f2a')} />
        <Path path={`M-4 ${L.waterline} H ${W + 4}`} color={lit('#efe3d2')} style="stroke" strokeWidth={1.4} />
        {cls.sizeTier <= 2 &&
          [5, 10].map((dy) => (
            <Path key={dy} path={L.sheerPath} transform={[{ translateY: dy }]} color={shade(paint, 0.25)} style="stroke" strokeWidth={0.7} opacity={0.6} />
          ))}
        <Wear ctx={ctx} />
      </Group>
      <Path path={L.sheerPath} color={trim ? lit(trim) : lit(shade(L.paint, 0.35))} style="stroke" strokeWidth={trim ? 3.2 : 2.4} strokeCap="round" />
      {trim && <Path path={L.sheerPath} transform={[{ translateY: 5 }]} color={lit(trim)} style="stroke" strokeWidth={1} opacity={0.8} />}
      <Portholes ctx={ctx} />
      {cls.rarity === 'legendary' && (
        <Path path={`M${W - 22} ${L.deckY(W - 22) + 6} c 4 -3, 9 -3, 12 0 c -3 1, -6 4, -6 7`} color={lit('#e6a53a')} style="stroke" strokeWidth={1.4} strokeCap="round" />
      )}

      {/* Stern flag */}
      <Path path={`M1 ${staffY} V ${staffY - 22}`} color={lit('#4a2e22')} style="stroke" strokeWidth={1.4} />
      <Group transform={flutter} origin={vec(1, staffY - 18)}>
        <Path path={`M1 ${staffY - 22} L -15 ${staffY - 19} L 1 ${staffY - 15} Z`} color={lit(trim ?? '#c2452a')} />
      </Group>
      <MastLamp ctx={ctx} glow={glow} />
        </>
      )}
    </Group>
  )
}

function Wheelhouse({ ctx, captain, clock }: { ctx: Ctx; captain: Look | null; clock: SharedValue<number> }) {
  const { L, lit, light } = ctx
  const b = L.wheelhouse
  const base = L.kind === 'sail' || L.kind === 'workboat' ? '#e2d5bd' : CABIN
  const floors = L.kind === 'freighter' ? Math.max(2, Math.floor(b.h / 11)) : 1
  const raked = L.build === 'fast'
  const body = raked
    ? `M${b.x} ${b.y + b.h} V ${b.y} H ${b.x + b.w * 0.8} L ${b.x + b.w} ${b.y + b.h} Z`
    : `M${b.x} ${b.y + b.h} V ${b.y} H ${b.x + b.w} V ${b.y + b.h} Z`
  const winH = Math.min(8, b.h * 0.35)
  return (
    <Group>
      <Path path={body} color={lit(base)} />
      <Path path={`M${b.x} ${b.y + b.h} V ${b.y + 2}`} color={lit(shade(base, 0.25))} style="stroke" strokeWidth={2} />
      <Rect x={b.x - 2} y={b.y - 2.5} width={b.w + 4} height={3} color={lit(shade(L.paint, 0.2))} />
      {Array.from({ length: floors }, (_, f) => {
        const wy = b.y + 4 + f * 11
        // A raked front leans in, so its windows stop short of the slope.
        const span = (raked ? b.w * (0.8 + (0.2 * (wy - b.y)) / b.h) - 3 : b.w) - 4
        const n = Math.max(1, Math.floor(span / 9))
        return Array.from({ length: n }, (_, i) => (
          <RoundedRect key={`${f}-${i}`} x={b.x + 3 + i * (span / n)} y={wy} width={span / n - 2} height={winH} r={1.2} color={light.window} />
        ))
      })}
      {captain && !L.captain && (
        // At the wheel, seen through the windows: clipped to the window band.
        <Group clip={{ x: b.x + 1, y: b.y + 3, width: b.w - 2, height: winH + 2 }}>
          <DeckFigure
            look={captain}
            pose="wheel"
            x={b.x + b.w * 0.5}
            y={b.y + b.h}
            size={((b.h - 4 - winH / 2) * 32) / 25.2}
            clock={clock}
            lit={lit}
          />
          <Rect x={b.x} y={b.y} width={b.w} height={b.h} color={light.window} opacity={0.22} />
        </Group>
      )}
    </Group>
  )
}

/** The captain at their deck station (small boats) and deckhands by size. */
function People({ ctx, captain, clock }: { ctx: Ctx; captain: Look | null; clock: SharedValue<number> }) {
  const { L, tier, lit, seed } = ctx
  const size = 30 - tier * 2
  const hands = L.hands.slice(0, ctx.hands)
  const mast = mastTop(L)
  return (
    <Group>
      {hands.map((h, i) => (
        <DeckFigure
          key={i}
          look={lookFor(`hand-${seed}-${i}`)}
          pose={h.pose}
          aft={h.aft}
          x={h.x}
          y={L.deckY(h.x)}
          size={size}
          clock={clock}
          offset={i * 911}
          lit={lit}
          lineTo={mast ? { x: (h.aft ? -1 : 1) * (mast.x - h.x), y: mast.y - L.deckY(h.x) } : undefined}
        />
      ))}
      {captain && L.captain && (
        <DeckFigure
          look={captain}
          pose={L.captain.pose}
          aft={L.captain.aft}
          x={L.captain.x}
          y={L.deckY(L.captain.x)}
          size={size}
          clock={clock}
          lit={lit}
          lineTo={mast ? { x: mast.x - L.captain.x, y: mast.y + 6 - L.deckY(L.captain.x) } : undefined}
        />
      )}
    </Group>
  )
}

function Stack({ box, ctx, trim }: { box: Box; ctx: Ctx; trim: string | null }) {
  const { lit, L } = ctx
  const band = trim ?? (L.kind === 'liner' ? '#c2452a' : '#2e1c19')
  return (
    <Group>
      <Rect x={box.x} y={box.y} width={box.w} height={box.h} color={lit('#c2452a')} />
      <Rect x={box.x} y={box.y} width={box.w} height={3} color={lit('#2e1c19')} />
      <Rect x={box.x} y={box.y + 6} width={box.w} height={3} color={lit(band === '#c2452a' ? '#f3e7d8' : band)} />
    </Group>
  )
}

function Portholes({ ctx }: { ctx: Ctx }) {
  const { L, tier, light } = ctx
  if (tier < 3) return null
  const n = Math.min(10, 3 + tier)
  return (
    <Group>
      {Array.from({ length: n }, (_, i) => {
        const px = L.W * 0.14 + i * ((L.W * 0.66) / n)
        return <Circle key={i} cx={px} cy={L.H * 0.24} r={1.9} color={light.window} opacity={0.85} />
      })}
    </Group>
  )
}

/** Rust streaks below 60 condition, a patched plate below 35. Drawn inside the hull's clip. */
function Wear({ ctx }: { ctx: Ctx }) {
  const { L, condition, seed, lit } = ctx
  if (condition >= 60) return null
  const n = 3 + Math.floor((60 - condition) / 12)
  const streaks = Array.from({ length: n }, (_, i) => {
    const sx = L.W * 0.1 + (((seed >>> (i * 3)) % 97) / 97) * L.W * 0.75
    const len = 4 + ((seed >>> (i * 2)) % 9)
    return `M${sx} ${L.deckY(sx) + 2} v ${len}`
  }).join(' ')
  return (
    <Group>
      <Path path={streaks} color={lit(RUST)} opacity={0.35 + (0.45 * (60 - condition)) / 60} style="stroke" strokeWidth={1.4} strokeCap="round" />
      {condition < 35 && (
        <Group>
          <Rect x={L.W * 0.42} y={L.H * 0.12} width={14} height={9} color={lit(shade(L.paint, 0.3))} />
          <Path
            path={[2, 12].map((dx) => `M${L.W * 0.42 + dx} ${L.H * 0.12 + 1.5} v 1 m 0 1 v 1 m 0 1 v 1 m 0 1 v 1`).join(' ')}
            color={lit('#c9b6ae')}
            style="stroke"
            strokeWidth={0.6}
          />
        </Group>
      )}
    </Group>
  )
}

function MastLamp({ ctx, glow }: { ctx: Ctx; glow: SharedValue<number> }) {
  const { L, light } = ctx
  const m = mastTop(L)
  if (!m) return null
  return (
    <Group>
      <Circle cx={m.x} cy={m.y} r={1.8} color={light.lamp} opacity={glow} />
      <Circle cx={m.x} cy={m.y} r={9} opacity={0.3 + ctx.light.dim}>
        <RadialGradient c={vec(m.x, m.y)} r={9} colors={[`${light.lamp}aa`, `${light.lamp}00`]} />
      </Circle>
    </Group>
  )
}

function mastTop(L: BoatLayout): { x: number; y: number } | null {
  switch (L.kind) {
    case 'sail':
      return { x: L.W * 0.44, y: -78 }
    case 'workboat':
      return { x: L.W * 0.5, y: -72 }
    case 'trawler':
      return { x: L.wheelhouse.x + L.wheelhouse.w * 0.5, y: L.wheelhouse.y - 28 }
    case 'freighter':
      return { x: L.W * 0.92, y: L.deckY(L.W * 0.92) - 34 }
    case 'taxi':
      return null
    case 'ferry':
      return { x: L.wheelhouse.x + L.wheelhouse.w * 0.5, y: L.wheelhouse.y - 16 }
    case 'liner':
      return { x: L.W * 0.88, y: L.wheelhouse.y - 30 }
  }
}

/** What's on deck: the part that says what kind of boat she is. */
function Works({ ctx }: { ctx: Ctx }) {
  switch (ctx.L.kind) {
    case 'sail':
      return <SailWorks ctx={ctx} />
    case 'workboat':
      return <DerrickWorks ctx={ctx} />
    case 'trawler':
      return <TrawlerWorks ctx={ctx} />
    case 'freighter':
      return <FreighterWorks ctx={ctx} />
    case 'taxi':
      return <TaxiWorks ctx={ctx} />
    case 'ferry':
      return <FerryWorks ctx={ctx} />
    case 'liner':
      return <LinerWorks ctx={ctx} />
  }
}

function Crate({ x, y, w = 18, h = 14, ctx, i = 0 }: { x: number; y: number; w?: number; h?: number; ctx: Ctx; i?: number }) {
  const c = ctx.lit(i % 2 ? '#a06a44' : WOOD)
  return (
    <Group>
      <Rect x={x} y={y - h} width={w} height={h} color={c} />
      <Path path={`M${x} ${y - h} l ${w} ${h} M${x} ${y - h / 2} h ${w}`} color={ctx.lit('#4a2e1e')} style="stroke" strokeWidth={0.8} opacity={0.7} />
    </Group>
  )
}

function SailWorks({ ctx }: { ctx: Ctx }) {
  const { L, lit, condition, seed } = ctx
  const W = L.W
  const mx = W * 0.44
  const cloth = SAILS[(seed >>> 7) % SAILS.length]
  const boomEnd = W * 0.1
  const sail = `M${mx + 1} -9 L ${mx + 1} -70 L ${mx - 30} -77 Q ${mx - 36} -42, ${boomEnd + 3} -10 Z`
  const jib = `M${mx + 2} -72 L ${W - 6} ${L.deckY(W - 6) - 1} L ${mx + 5} -12 Z`
  return (
    <Group>
      {ctx.laden && (
        <>
          <Crate x={W * 0.12} y={L.deckY(W * 0.12)} ctx={ctx} />
          <Crate x={W * 0.24} y={L.deckY(W * 0.24)} w={16} h={11} ctx={ctx} i={1} />
          <Oval x={W * 0.34} y={L.deckY(W * 0.34) - 9} width={14} height={9} color={lit('#c9b08a')} />
        </>
      )}
      <Path path={`M${mx} ${L.deckY(mx)} V -78`} color={lit('#5a3a2a')} style="stroke" strokeWidth={2.4} />
      <Path path={jib} color={lit(tint(cloth, 0.2))} opacity={0.95} />
      <Path path={sail} color={lit(cloth)} />
      <Path path={`M${mx} -24 L ${boomEnd + 8} -18 M${mx} -40 L ${mx - 26} -38 M${mx} -56 L ${mx - 28} -58`} color={lit(shade(cloth, 0.15))} style="stroke" strokeWidth={0.7} />
      {condition < 35 && <Rect x={mx - 20} y={-50} width={9} height={8} color={lit('#c9a27a')} opacity={0.9} />}
      <Path path={`M${mx} -10 L ${boomEnd} -9`} color={lit('#5a3a2a')} style="stroke" strokeWidth={2} strokeCap="round" />
      <Path path={`M${mx - 30} -77 L ${mx} -72`} color={lit('#5a3a2a')} style="stroke" strokeWidth={1.6} />
    </Group>
  )
}

function DerrickWorks({ ctx }: { ctx: Ctx }) {
  const { L, lit } = ctx
  const W = L.W
  const mx = W * 0.5
  return (
    <Group>
      {ctx.laden && [0, 1, 2, 3, 4].map((i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const cx = W * 0.1 + col * 19
        return <Crate key={i} x={cx} y={L.deckY(cx) - row * 14} ctx={ctx} i={i} />
      })}
      {ctx.laden && [0, 1].map((i) => (
        <RoundedRect key={i} x={W * 0.4 + i * 10} y={L.deckY(W * 0.4) - 14} width={9} height={14} r={2} color={lit(i ? '#6e4733' : '#7a5236')} />
      ))}
      <Path path={`M${mx} ${L.deckY(mx)} V -72`} color={lit('#4a3346')} style="stroke" strokeWidth={2.6} />
      <Path path={`M${mx} -48 L ${W * 0.14} -36`} color={lit('#4a3346')} style="stroke" strokeWidth={2} strokeCap="round" />
      <Path path={`M${mx} -70 L ${W * 0.14} -36 M${W * 0.14} -36 V -28`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.8} />
      <Path path={`M${W * 0.14 - 2} -28 q 2 4 4 0`} color={lit('#2e1c19')} style="stroke" strokeWidth={1.2} />
    </Group>
  )
}

function TrawlerWorks({ ctx }: { ctx: Ctx }) {
  const { L, lit } = ctx
  const W = L.W
  const wh = L.wheelhouse
  const mx = wh.x + wh.w * 0.5
  const a0 = W * 0.03
  const a1 = W * 0.17
  const net = `M${W * 0.1} -46 L ${W * 0.05} ${L.deckY(W * 0.05) - 2} L ${W * 0.17} ${L.deckY(W * 0.17) - 2} Z`
  return (
    <Group>
      <Path path={`M${a0} ${L.deckY(a0)} L ${W * 0.1} -50 L ${a1} ${L.deckY(a1)}`} color={lit('#4a5a66')} style="stroke" strokeWidth={3} strokeJoin="round" />
      <Path path={net} color={lit('#3f6b5a')} opacity={0.85} />
      <Path
        path={`M${W * 0.07} -30 L ${W * 0.15} -10 M${W * 0.13} -30 L ${W * 0.07} -10 M${W * 0.085} -40 L ${W * 0.12} -24 M${W * 0.115} -40 L ${W * 0.08} -24`}
        color={lit('#2a4a3e')}
        style="stroke"
        strokeWidth={0.6}
      />
      <Circle cx={W * 0.26} cy={L.deckY(W * 0.26) - 9} r={9} color={lit('#5b6470')} />
      <Circle cx={W * 0.26} cy={L.deckY(W * 0.26) - 9} r={6} color={lit('#3f6b5a')} />
      <Path path={`M${W * 0.36} ${L.deckY(W * 0.36)} L ${W * 0.3} -58`} color={lit('#4a5a66')} style="stroke" strokeWidth={2} strokeCap="round" />
      <Circle cx={W * 0.3} cy={-58} r={2.4} color={lit('#e9b23c')} />
      <Path path={`M${mx} ${wh.y} V ${wh.y - 28}`} color={lit('#4a5a66')} style="stroke" strokeWidth={2} />
      <Rect x={mx - 8} y={wh.y - 20} width={16} height={2.4} color={lit('#4a5a66')} />
    </Group>
  )
}

function FreighterWorks({ ctx }: { ctx: Ctx }) {
  const { L, lit, tier, seed } = ctx
  const W = L.W
  const x0 = W * 0.28
  const x1 = W * 0.86
  const cw = 19
  const cols = Math.floor((x1 - x0) / cw)
  const rows = Math.max(2, tier - 2 + (L.build === 'big' ? 1 : 0) - (L.build === 'fast' ? 1 : 0))
  const base = L.deckY(x0 + 10) - 1
  const craneXs = [x0 + cw * Math.floor(cols / 3), x0 + cw * Math.floor((2 * cols) / 3)]
  return (
    <Group>
      {ctx.laden && Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const cx = x0 + col * cw
        const color = CONTAINERS[(seed >>> ((col + row * 3) % 24)) % CONTAINERS.length]
        return (
          <Group key={i}>
            <Rect x={cx} y={base - (row + 1) * 12} width={cw - 1} height={11.4} color={lit(color)} />
            <Path path={`M${cx + 4} ${base - (row + 1) * 12 + 2} v 7.4 M${cx + 9} ${base - (row + 1) * 12 + 2} v 7.4 M${cx + 14} ${base - (row + 1) * 12 + 2} v 7.4`} color={lit(shade(color, 0.3))} style="stroke" strokeWidth={0.6} />
          </Group>
        )
      })}
      {craneXs.map((cx, i) => (
        <Group key={i}>
          <Path path={`M${cx} ${base} V ${base - rows * 12 - 18}`} color={lit('#e9b23c')} style="stroke" strokeWidth={3} />
          <Path path={`M${cx} ${base - rows * 12 - 16} L ${cx + 34} ${base - rows * 12 - 6}`} color={lit('#e9b23c')} style="stroke" strokeWidth={2} strokeCap="round" />
          <Path path={`M${cx + 34} ${base - rows * 12 - 6} v 10`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.8} />
        </Group>
      ))}
      <Path path={`M${W * 0.92} ${L.deckY(W * 0.92)} V ${L.deckY(W * 0.92) - 34}`} color={lit('#4a5a66')} style="stroke" strokeWidth={2} />
    </Group>
  )
}

/** Passengers dress for the trip, not the work: no sou'westers or oilskins. */
function passengerLook(ctx: Ctx, i: number): Look {
  const look = lookFor(`pax-${ctx.seed}-${i}`)
  const hats: Look['hat'][] = ['brim', 'bare', 'bun', 'cap', 'bare']
  const coats = ['#7a4e5e', '#2f5d62', '#c2452a', '#3d5a73', '#e9b23c', '#efe3d2', '#4a3346']
  return { ...look, hat: hats[(ctx.seed + i * 7) % hats.length], coat: coats[(ctx.seed + i * 3) % coats.length], prop: 'none' }
}

/** A passenger on a bench, shifting, looking about, now and then pointing or waving. */
function Sitter({ x, y, size, ctx, i, aft }: { x: number; y: number; size: number; ctx: Ctx; i: number; aft?: boolean }) {
  return <DeckFigure look={passengerLook(ctx, i)} pose="sit" aft={aft} x={x} y={y} size={size} clock={ctx.clock} offset={i * 2300} lit={ctx.lit} />
}

/** A passenger walking the deck from one end of `x0..x1` to the other and back, pausing at each end. */
function Stroller({ x0, x1, y, size, ctx, i, speed = 7 }: { x0: number; x1: number; y: (x: number) => number; size: number; ctx: Ctx; i: number; speed?: number }) {
  const y0 = y(x0)
  const y1 = y(x1)
  const span = Math.max(1, x1 - x0)
  const pause = 1.8
  const walk = span / speed
  const where = useDerivedValue(() => {
    const t = ((ctx.clock.value + i * 4100) / 1000) % (2 * (walk + pause))
    const leg = walk + pause
    const back = t >= leg
    const u = Math.min(1, (back ? t - leg : t) / walk)
    const x = back ? x1 - u * span : x0 + u * span
    return [{ translateX: x }, { translateY: y0 + ((y1 - y0) * (x - x0)) / span }, { scaleX: back ? -1 : 1 }]
  })
  return (
    <Group transform={where}>
      <DeckFigure look={passengerLook(ctx, i)} pose="stroll" x={0} y={0} size={size} clock={ctx.clock} offset={i * 1700} lit={ctx.lit} />
    </Group>
  )
}

/** Heads at the windows of a cabin, one in a few, bobbing with the boat. */
function WindowHeads({ xs, y, h, ctx, from }: { xs: number[]; y: number; h: number; ctx: Ctx; from: number }) {
  const bob = useDerivedValue(() => [{ translateY: Math.sin(ctx.clock.value / 700 + from) * 0.4 }])
  const r = Math.min(2.6, h * 0.28)
  return (
    <Group transform={bob}>
      {xs.map((x, k) => {
        if ((ctx.seed >>> ((k + from) % 24)) % 3 !== 0) return null
        const look = passengerLook(ctx, from + k)
        return (
          <Group key={k}>
            <Path path={`M${x - r * 1.4} ${y + h} C ${x - r * 1.4} ${y + h - r * 1.6}, ${x + r * 1.4} ${y + h - r * 1.6}, ${x + r * 1.4} ${y + h} Z`} color={ctx.lit(look.coat)} />
            <Circle cx={x} cy={y + h - r * 1.9} r={r} color={ctx.lit(look.skin)} />
          </Group>
        )
      })}
    </Group>
  )
}

function TaxiWorks({ ctx }: { ctx: Ctx }) {
  const { L, lit, seed } = ctx
  const W = L.W
  const awning = AWNINGS[(seed >>> 7) % AWNINGS.length]
  const c0 = W * 0.14
  const c1 = W * 0.62
  const stripes = Math.floor((c1 - c0) / 8)
  const canopyY = L.deckY(c0) - 26
  return (
    <Group>
      {ctx.laden && [0, 1, 2].map((i) => {
        const px = c0 + 6 + i * ((c1 - c0 - 18) / 2)
        return <Sitter key={i} x={px} y={L.deckY(px)} size={20} ctx={ctx} i={i} aft={i === 2} />
      })}
      <Path path={`M${c0 + 2} ${L.deckY(c0) - 5} H ${c1 - 2}`} color={lit('#5a3a2a')} style="stroke" strokeWidth={1.6} />
      <Path path={`M${c0 + 2} ${L.deckY(c0)} V ${canopyY} M${c1 - 2} ${L.deckY(c1)} V ${canopyY}`} color={lit('#5a3a2a')} style="stroke" strokeWidth={1.4} />
      {Array.from({ length: stripes }, (_, i) => (
        <Rect key={i} x={c0 + i * 8} y={canopyY - 5} width={8} height={5} color={lit(i % 2 ? '#f3e7d8' : awning)} />
      ))}
      <Path path={`M${c0} ${canopyY} ${'q 4 3 8 0 '.repeat(stripes)}`} color={lit(awning)} />
    </Group>
  )
}

function FerryWorks({ ctx }: { ctx: Ctx }) {
  const { L, lit, light } = ctx
  const W = L.W
  const cabinH = -L.wheelhouse.y - L.wheelhouse.h
  const x0 = W * 0.12
  const x1 = W * 0.78
  const top = L.deckY(x0) - cabinH
  const n = Math.floor((x1 - x0 - 8) / 11)
  const rail0 = W * 0.16
  const rail1 = W * 0.52
  return (
    <Group>
      <Rect x={x0} y={top} width={x1 - x0} height={cabinH + 2} color={lit(CABIN)} />
      <Rect x={x0} y={top} width={x1 - x0} height={2.4} color={lit(shade(L.paint, 0.1))} />
      {Array.from({ length: n }, (_, i) => (
        <RoundedRect key={i} x={x0 + 5 + i * 11} y={top + 5} width={8} height={7} r={1.5} color={light.window} />
      ))}
      {ctx.laden && (
        <>
          <WindowHeads xs={Array.from({ length: n }, (_, i) => x0 + 9 + i * 11)} y={top + 5} h={7} ctx={ctx} from={10} />
          <Stroller x0={x0 + 4} x1={rail1 + 6} y={() => top} size={18} ctx={ctx} i={4} />
          <Stroller x0={rail0} x1={x1 - 22} y={() => top} size={18} ctx={ctx} i={5} speed={5} />
          <Sitter x={x1 - 18} y={top} size={18} ctx={ctx} i={6} aft />
        </>
      )}
      <Path path={`M${rail0} ${top - 6} H ${rail1} ${Array.from({ length: 7 }, (_, i) => `M${rail0 + i * ((rail1 - rail0) / 6)} ${top} v -6`).join(' ')}`} color={lit('#f3e7d8')} style="stroke" strokeWidth={0.9} />
    </Group>
  )
}

function LinerWorks({ ctx }: { ctx: Ctx }) {
  const { L, lit, light, tier } = ctx
  const W = L.W
  const decks = linerDecks(tier, L.build)
  const dh = -L.wheelhouse.y - L.wheelhouse.h
  const step = dh / decks
  const fast = L.build === 'fast'
  const topY = -dh
  const bunting = `M2 ${L.deckY(2) - 22} Q ${W * 0.3} ${topY - 4} ${L.stack!.x + L.stack!.w / 2} ${L.stack!.y} Q ${W * 0.7} ${topY - 6} ${W * 0.88} ${L.wheelhouse.y - 30}`
  return (
    <Group>
      {Array.from({ length: decks }, (_, d) => {
        const x0 = W * (0.1 + d * 0.06)
        const x1 = W * (0.8 - d * 0.05)
        const top = L.deckY(x0) - (d + 1) * step
        const n = Math.floor((x1 - x0 - 6) / 10)
        return (
          <Group key={d}>
            <Rect x={x0} y={top} width={x1 - x0} height={step + 1} color={lit(d % 2 ? tint(L.paint, 0.75) : CABIN)} />
            {fast ? (
              <Path path={`M${x0 + 6} ${top + step * 0.65} L ${x0 + 10} ${top + 3} H ${x1 - 6} L ${x1 - 10} ${top + step * 0.65} Z`} color={light.window} />
            ) : (
              <>
                {Array.from({ length: n }, (_, i) => <RoundedRect key={i} x={x0 + 4 + i * 10} y={top + 3} width={7} height={step - 7} r={1.5} color={light.window} />)}
                {ctx.laden && <WindowHeads xs={Array.from({ length: n }, (_, i) => x0 + 7.5 + i * 10)} y={top + 3} h={step - 7} ctx={ctx} from={20 + d * 9} />}
              </>
            )}
          </Group>
        )
      })}
      {[0, 1].map((i) => {
        const bx = W * (0.2 + decks * 0.06) + i * 22
        return (
          <Group key={i}>
            <Path path={`M${bx - 2} ${topY} v -8 h 3`} color={lit('#c9b6ae')} style="stroke" strokeWidth={1} />
            <RoundedRect x={bx} y={topY - 7} width={16} height={5} r={2.5} color={lit('#e9772f')} />
          </Group>
        )
      })}
      {ctx.laden && (() => {
        // The top deck's promenade: people walking it end to end, someone at the stern rail.
        const tx0 = W * (0.1 + (decks - 1) * 0.06) + 6
        const tx1 = W * (0.8 - (decks - 1) * 0.05) - 6
        const size = 18 + tier
        return (
          <>
            <Stroller x0={tx0} x1={tx1} y={() => topY} size={size} ctx={ctx} i={30} speed={6} />
            <Stroller x0={tx0 + (tx1 - tx0) * 0.3} x1={tx1} y={() => topY} size={size} ctx={ctx} i={31} speed={4.5} />
            {tier >= 5 && <Stroller x0={tx0} x1={tx0 + (tx1 - tx0) * 0.6} y={() => topY} size={size} ctx={ctx} i={32} speed={5} />}
            <Sitter x={tx0 + 4} y={topY} size={size} ctx={ctx} i={33} aft />
          </>
        )
      })()}
      <Path path={`M${W * 0.88} ${L.deckY(W * 0.88)} V ${L.wheelhouse.y - 30}`} color={lit('#4a5a66')} style="stroke" strokeWidth={1.6} />
      <Path path={bunting} color={lit('#c9b6ae')} style="stroke" strokeWidth={0.6} />
      {[0.12, 0.2, 0.28, 0.6, 0.68, 0.76].map((t, i) => (
        <Path key={i} path={`M${W * t} ${topY - 6 - (i < 3 ? i * 3 : (5 - i) * 3)} l 2.5 5 l 2.5 -5 Z`} color={lit(CONTAINERS[i % CONTAINERS.length])} />
      ))}
    </Group>
  )
}
