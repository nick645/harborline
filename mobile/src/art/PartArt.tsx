// A set piece drawn on its own, for the Workshop's slots: the hull is that boat's own hull in her
// paint, the engine an engine block (cargo) or a steam turbine with its flywheel (passengers), the
// specialty a crane lifting a crate (cargo) or a cabin under an awning (passengers). Trim in the
// set's rarity colour. Long hulls are stretched deeper to read at this size. A piece you don't have yet is a pale ghost of itself. Drawn still, in a
// 60 × 44 box, so a page of sets stays light.

import { useMemo } from 'react'
import { Circle, Group, Path, RadialGradient, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia'
import type { BoatClass, PartType } from '../../../src/game/types'
import { boatLayout } from './boatGeometry'

export const PART_W = 60
export const PART_H = 44

interface Props {
  cls: BoatClass
  slot: PartType
  /** The rarity colour, for the trim. */
  trim: string
  /** Drawn as a pale outline: the piece isn't in hand yet. */
  ghost?: boolean
  /** The ghost's colour. */
  ghostColor?: string
  x?: number
  y?: number
}

export function PartArt({ cls, slot, trim, ghost = false, ghostColor = '#c9b6ae', x = 0, y = 0 }: Props) {
  const c = (col: string) => (ghost ? ghostColor : col)
  const glow = !ghost && cls.rarity !== 'rare'
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]} opacity={ghost ? 0.32 : 1}>
      {glow && (
        <Circle cx={PART_W / 2} cy={PART_H / 2} r={26}>
          <RadialGradient c={vec(PART_W / 2, PART_H / 2)} r={26} colors={[`${trim}55`, `${trim}00`]} />
        </Circle>
      )}
      {slot === 'hull' ? <Hull cls={cls} c={c} trim={trim} /> : slot === 'engine' ? <Engine passenger={cls.track === 'passenger'} c={c} trim={trim} /> : <Specialty cls={cls} c={c} trim={trim} />}
    </Group>
  )
}

type Paint = (col: string) => string

/** Her own hull, fitted to the box: paint, red bottom below the waterline, planking, trim on the sheer. */
function Hull({ cls, c, trim }: { cls: BoatClass; c: Paint; trim: string }) {
  const L = useMemo(() => boatLayout(cls), [cls])
  const clip = useMemo(() => Skia.Path.MakeFromSVGString(L.hullPath)!, [L])
  const top = L.deckY(L.W) - 1
  // Long hulls are drawn deeper than they are, so a big ship's hull still reads as a piece.
  const sx = (PART_W - 6) / (L.W + 6)
  const sy = Math.min((PART_H - 10) / (L.H - top), sx * 2.6)
  const s = (sx + sy) / 2
  const ox = (PART_W - L.W * sx) / 2
  const oy = (PART_H - (L.H - top) * sy) / 2 - top * sy
  return (
    <Group transform={[{ translateX: ox }, { translateY: oy }, { scaleX: sx }, { scaleY: sy }]}>
      <Path path={L.hullPath} color={c(L.paint)} />
      <Group clip={clip}>
        <Rect x={-4} y={L.waterline} width={L.W + 8} height={L.H} color={c('#8a2f2a')} />
        {[0.3, 0.55].map((f) => (
          <Path key={f} path={`M-4 ${L.H * f} H ${L.W + 4}`} color={c('#1d1218')} style="stroke" strokeWidth={1.2 / s} opacity={0.25} />
        ))}
      </Group>
      <Path path={L.sheerPath} color={c(trim)} style="stroke" strokeWidth={2.2 / s} />
      <Path path={L.hullPath} color={c('#1d1218')} style="stroke" strokeWidth={1 / s} opacity={0.5} />
    </Group>
  )
}

/** Cargo: a diesel block, three cylinder heads and a stack. Passengers: a turbine and flywheel. Both drive a screw. */
function Engine({ passenger, c, trim }: { passenger: boolean; c: Paint; trim: string }) {
  const iron = c('#55606b')
  const dark = c('#2f363d')
  const prop = (
    <Group>
      <Path path="M40 30 H 50" color={dark} style="stroke" strokeWidth={2.4} />
      <Path path="M51 30 q 5 -9 1 -12 q -3 4 -1 12 Z" color={c('#c99a2e')} />
      <Path path="M51 30 q 5 9 1 12 q -3 -4 -1 -12 Z" color={c('#c99a2e')} />
      <Circle cx={51} cy={30} r={2} color={c('#8a6a1e')} />
    </Group>
  )
  if (passenger)
    return (
      <Group>
        <RoundedRect x={8} y={18} width={32} height={20} r={9} color={iron} />
        <Rect x={14} y={18} width={2.5} height={20} color={c(trim)} />
        <Rect x={31} y={18} width={2.5} height={20} color={c(trim)} />
        <Circle cx={18} cy={14} r={9} color={dark} style="stroke" strokeWidth={2.5} />
        {[0, 1, 2, 3].map((i) => (
          <Path key={i} path={`M18 14 l ${8 * Math.cos((i * Math.PI) / 4)} ${8 * Math.sin((i * Math.PI) / 4)} M18 14 l ${-8 * Math.cos((i * Math.PI) / 4)} ${-8 * Math.sin((i * Math.PI) / 4)}`} color={dark} style="stroke" strokeWidth={1.2} />
        ))}
        <Circle cx={18} cy={14} r={2.4} color={c(trim)} />
        <Rect x={34} y={6} width={5} height={12} color={c('#8a5a3a')} />
        {prop}
      </Group>
    )
  return (
    <Group>
      <Rect x={30} y={4} width={5} height={14} color={dark} />
      <Rect x={29} y={3} width={7} height={3} color={c(trim)} />
      {[10, 18, 26].map((x) => (
        <RoundedRect key={x} x={x} y={12} width={6} height={8} r={1.5} color={dark} />
      ))}
      <RoundedRect x={7} y={18} width={34} height={20} r={3} color={iron} />
      <Rect x={7} y={26} width={34} height={3} color={c(trim)} />
      {[12, 20, 28, 36].map((x) => (
        <Circle key={x} cx={x} cy={22} r={1} color={c('#1d1218')} opacity={0.6} />
      ))}
      <Rect x={5} y={38} width={38} height={3} color={dark} />
      {prop}
    </Group>
  )
}

/** Cargo: a crane swinging a crate. Passengers: a cabin with lit windows under an awning. */
function Specialty({ cls, c, trim }: { cls: BoatClass; c: Paint; trim: string }) {
  const L = useMemo(() => boatLayout(cls), [cls])
  if (cls.track === 'passenger')
    return (
      <Group>
        <Rect x={8} y={20} width={42} height={20} color={c('#efe3d2')} />
        {[13, 22, 31, 40].map((x) => (
          <RoundedRect key={x} x={x} y={25} width={5} height={7} r={1.5} color={c('#ffd27a')} />
        ))}
        <Rect x={6} y={17} width={46} height={4} color={c(L.paint)} />
        <Path path="M5 9 H 53 L 50 17 H 8 Z" color={c(trim)} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Path key={i} path={`M${8 + i * 7} 17 q 3.5 4 7 0`} color={c(trim)} />
        ))}
        <Circle cx={47} cy={34} r={3.6} color={c('#d9473a')} style="stroke" strokeWidth={2} />
        <Rect x={6} y={40} width={46} height={2} color={c('#6e4733')} />
      </Group>
    )
  return (
    <Group>
      <Rect x={9} y={8} width={4} height={34} color={c('#6e4733')} />
      <Path path="M11 10 L 48 6" color={c(trim)} style="stroke" strokeWidth={3} strokeCap="round" />
      <Path path="M11 22 L 48 7" color={c('#6e4733')} style="stroke" strokeWidth={1} />
      <Path path="M45 7 V 20" color={c('#2f363d')} style="stroke" strokeWidth={1} />
      <Path path="M43 20 h 4 v 3" color={c('#2f363d')} style="stroke" strokeWidth={1.4} />
      <Rect x={34} y={23} width={20} height={16} color={c('#a8743f')} />
      <Path path="M34 23 L 54 39 M54 23 L 34 39" color={c('#7a512a')} style="stroke" strokeWidth={1.4} />
      <Rect x={34} y={23} width={20} height={16} color={c('#5a3a1e')} style="stroke" strokeWidth={1.4} />
      <Rect x={5} y={40} width={50} height={2.5} color={c('#2f363d')} />
    </Group>
  )
}
