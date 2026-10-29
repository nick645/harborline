// Your house on the home quay, built the way you chose: its shape, roof, wall finish, windows,
// door, colours, something on the roof, and the small touches (smoke, lights, window boxes,
// a porch lamp). Drawn in HomeScene's design space; the walls always stand on the quay at QUAY.

import { Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, Skia, Text as SkText, rect, type SkFont, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { DoorStyle, HouseBuild, HouseExtra, RoofStyle, Siding, Topper, WindowStyle } from '../../../src/game/data/home'
import type { Light } from './light'
import { houseFrame, roofRise } from './houseGeometry'
import { mix, shade, tint } from './paint'

export interface HouseLook {
  name: string
  wall: string
  roof: string
  sign: string
  build: HouseBuild
  roofStyle: RoofStyle
  siding: Siding
  windows: WindowStyle
  door: string
  doorStyle: DoorStyle
  trim: string
  /** Empty: no shutters. */
  shutters: string
  topper: Topper
  extras: HouseExtra[]
  /** The first bunting colour, for a flag on the roof. */
  flag: string
}

type Props = {
  look: HouseLook
  lit: (c: string) => string
  light: Light
  clock: SharedValue<number>
  water: number
  quay: number
  font: SkFont | null
}

export function House({ look, lit, light, clock, water, quay, font }: Props) {
  const { x, w, top, rows } = houseFrame(look.build, water)
  const cx = x + w / 2
  const rise = roofRise(look.roofStyle, w)
  const peak = top - rise
  const wall = lit(look.wall)
  const trim = lit(look.trim)
  const has = (e: HouseExtra) => look.extras.includes(e)
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const night = light.stars > 0

  // Windows: one row per storey (a boathouse has a low strip of small ones).
  const winW = look.build === 'boathouse' ? 18 : 24
  const winH = look.build === 'boathouse' ? 15 : 26
  const cols = look.build === 'boathouse' ? [x + 14, x + 44, x + w - 62, x + w - 32] : look.build === 'tall' ? [x + 12, x + w - 36] : [x + 16, x + w - 40]
  const rowsY = look.build === 'boathouse' ? [top + 8] : rows === 2 ? [top + 14, water - 34] : [water - 32]
  const doorW = look.build === 'boathouse' ? 56 : look.doorStyle === 'double' ? 36 : 28
  const doorX = cx - doorW / 2
  const doorTop = look.build === 'boathouse' ? water + 18 : water + 18
  const signY = water + 2

  return (
    <Group>
      {/* A lookout tower beside a cottage */}
      {look.build === 'tower' && <Tower x={x + w - 10} top={top - 70} quay={quay} wall={wall} roof={lit(look.roof)} trim={trim} light={light} flicker={flicker} />}

      {/* Chimney (behind the roof line) and its smoke */}
      <Rect x={x + w * 0.72} y={peak + rise * 0.25 - 14} width={11} height={rise * 0.6 + 14} color={lit(shade(look.roof, 0.1))} />
      <Rect x={x + w * 0.72 - 1.5} y={peak + rise * 0.25 - 16} width={14} height={3} color={lit(shade(look.roof, 0.3))} />
      {has('smoke') && <Smoke clock={clock} x={x + w * 0.72 + 5.5} y={peak + rise * 0.25 - 18} />}

      {/* Walls and their finish */}
      <Rect x={x} y={top} width={w} height={quay - top} color={wall} />
      <Group clip={rect(x, top, w, quay - top)}>
        <WallFinish siding={look.siding} x={x} y={top} w={w} h={quay - top} wall={look.wall} lit={lit} />
      </Group>
      {/* Corner boards */}
      <Rect x={x} y={top} width={3} height={quay - top} color={trim} />
      <Rect x={x + w - 3} y={top} width={3} height={quay - top} color={trim} />

      {/* Roof */}
      <Roof style={look.roofStyle} x={x} w={w} top={top} rise={rise} color={lit(look.roof)} trim={trim} />
      {has('lights') && <EaveLights clock={clock} x={x} w={w} top={top} />}

      {/* Windows */}
      {rowsY.flatMap((wy) =>
        cols.map((wx) => (
          <Window key={`${wx}-${wy}`} style={look.windows} x={wx} y={wy} w={winW} h={winH} light={light} flicker={flicker} trim={trim} shutters={look.shutters ? lit(look.shutters) : ''} boxes={has('boxes')} lit={lit} />
        )),
      )}

      {/* Door */}
      <Door style={look.build === 'boathouse' ? 'arched' : look.doorStyle} x={doorX} y={doorTop} w={doorW} h={quay - doorTop} color={lit(look.door)} trim={trim} />
      {has('porch') && (
        <Group>
          <Path path={`M${doorX + doorW + 6} ${doorTop + 6} h 4`} color={lit('#2e1c19')} style="stroke" strokeWidth={1.2} />
          <RoundedRect x={doorX + doorW + 8} y={doorTop + 6} width={6} height={9} r={1.5} color={lit('#2e1c19')} />
          <RoundedRect x={doorX + doorW + 9.2} y={doorTop + 7.4} width={3.6} height={6} r={1} color="#ffd27a" opacity={night ? flicker : 0.55} />
          {night && (
            <Circle cx={doorX + doorW + 11} cy={doorTop + 11} r={16}>
              <RadialGradient c={vec(doorX + doorW + 11, doorTop + 11)} r={16} colors={['#ffd27a55', '#ffd27a00']} />
            </Circle>
          )}
        </Group>
      )}

      {/* The name board over the door */}
      <RoundedRect x={cx - 47} y={signY} width={94} height={13} r={3} color={lit(look.sign)} />
      <RoundedRect x={cx - 47} y={signY} width={94} height={13} r={3} color="#d9a441" style="stroke" strokeWidth={1} />
      {font && <SkText x={cx - font.measureText(look.name).width / 2} y={signY + 10} text={look.name} font={font} color="#f3e7d8" />}

      {/* Something on the roof */}
      <TopperArt topper={look.topper} x={cx} y={peak} clock={clock} lit={lit} flag={lit(look.flag)} />
    </Group>
  )
}

function WallFinish({ siding, x, y, w, h, wall, lit }: { siding: Siding; x: number; y: number; w: number; h: number; wall: string; lit: (c: string) => string }) {
  const line = lit(shade(wall, 0.25))
  switch (siding) {
    case 'boards':
      return (
        <Group>
          {Array.from({ length: Math.ceil(h / 11) }, (_, i) => (
            <Path key={i} path={`M${x} ${y + 8 + i * 11} h ${w}`} color={line} style="stroke" strokeWidth={0.7} />
          ))}
        </Group>
      )
    case 'shingles':
      return (
        <Group>
          {Array.from({ length: Math.ceil(h / 8) }, (_, r) => (
            <Path
              key={r}
              path={Array.from({ length: Math.ceil(w / 8) + 1 }, (_, c) => `M${x + c * 8 - (r % 2) * 4} ${y + 8 + r * 8} a 4 3 0 0 0 8 0`).join(' ')}
              color={line}
              style="stroke"
              strokeWidth={0.7}
            />
          ))}
        </Group>
      )
    case 'stone':
      return (
        <Group>
          {Array.from({ length: Math.ceil(h / 9) }, (_, r) => (
            <Group key={r}>
              <Path path={`M${x} ${y + 9 + r * 9} h ${w}`} color={line} style="stroke" strokeWidth={0.8} />
              {Array.from({ length: Math.ceil(w / 16) + 1 }, (_, c) => (
                <Path key={c} path={`M${x + c * 16 + (r % 2) * 8} ${y + r * 9} v 9`} color={line} style="stroke" strokeWidth={0.8} />
              ))}
            </Group>
          ))}
        </Group>
      )
    default:
      // Plaster: smooth, a little lighter at the top.
      return (
        <Rect x={x} y={y} width={w} height={h} opacity={0.35}>
          <LinearGradient start={vec(0, y)} end={vec(0, y + h)} colors={[lit(tint(wall, 0.25)), lit(shade(wall, 0.1))]} />
        </Rect>
      )
  }
}

function Roof({ style, x, w, top, rise, color, trim }: { style: RoofStyle; x: number; w: number; top: number; rise: number; color: string; trim: string }) {
  const cx = x + w / 2
  const l = x - 8
  const r = x + w + 8
  const base = top + 2
  const path =
    style === 'hip'
      ? `M${l} ${base} L ${x + w * 0.22} ${top - rise} L ${x + w * 0.78} ${top - rise} L ${r} ${base} Z`
      : style === 'thatch'
        ? // A thick, rounded thatch with a soft ridge along the top.
          `M${l - 2} ${base + 3} C ${l + 2} ${top - rise * 0.55}, ${x + w * 0.22} ${top - rise}, ${cx} ${top - rise} C ${x + w * 0.78} ${top - rise}, ${r - 2} ${top - rise * 0.55}, ${r + 2} ${base + 3} Z`
        : `M${l} ${base} L ${cx} ${top - rise} L ${r} ${base} Z`
  // Thatch is straw, whatever colour it's been washed.
  const fill = style === 'thatch' ? mix(color, '#c9a24a', 0.55) : color
  return (
    <Group>
      <Path path={path} color={fill} />
      {style === 'thatch' && (
        <Group clip={Skia.Path.MakeFromSVGString(path)!}>
          {Array.from({ length: 18 }, (_, i) => (
            <Path key={i} path={`M${l + 2 + i * ((r - l - 4) / 17)} ${base + 4} l ${(i - 8.5) * 0.5} -${rise * 0.7}`} color={shade(fill, 0.28)} style="stroke" strokeWidth={0.8} />
          ))}
          {[0.35, 0.65].map((k) => (
            <Path key={k} path={`M${l - 2} ${base + 3 - rise * k} H ${r + 2}`} color={shade(fill, 0.2)} style="stroke" strokeWidth={1} />
          ))}
        </Group>
      )}
      {style !== 'thatch' && <Path path={`M${l} ${base} L ${r} ${base}`} color={trim} style="stroke" strokeWidth={2.4} />}
      {style === 'thatch' && <Path path={`M${l - 2} ${base + 3} H ${r + 2}`} color={shade(fill, 0.35)} style="stroke" strokeWidth={2.4} />}
    </Group>
  )
}

function Window({ style, x, y, w, h, light, flicker, trim, shutters, boxes, lit }: {
  style: WindowStyle
  x: number
  y: number
  w: number
  h: number
  light: Light
  flicker: SharedValue<number>
  trim: string
  shutters: string
  boxes: boolean
  lit: (c: string) => string
}) {
  const cx = x + w / 2
  const r = Math.min(w, h) / 2
  const glass =
    style === 'round'
      ? `M${cx - r} ${y + h / 2} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`
      : style === 'arched'
        ? `M${x} ${y + h} V ${y + w / 2} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 V ${y + h} Z`
        : `M${x} ${y} h ${w} v ${h} h ${-w} Z`
  const bars = style === 'round' ? `M${cx} ${y + h / 2 - r} v ${2 * r} M${cx - r} ${y + h / 2} h ${2 * r}` : `M${cx} ${y + (style === 'arched' ? 2 : 0)} V ${y + h} M${x} ${y + h * 0.55} h ${w}`
  return (
    <Group>
      {shutters !== '' && style !== 'round' && (
        <Group>
          <Rect x={x - 7} y={y} width={6} height={h} color={shutters} />
          <Rect x={x + w + 1} y={y} width={6} height={h} color={shutters} />
          <Path path={`M${x - 7} ${y + h / 3} h 6 M${x - 7} ${y + (2 * h) / 3} h 6 M${x + w + 1} ${y + h / 3} h 6 M${x + w + 1} ${y + (2 * h) / 3} h 6`} color={shade(shutters, 0.3)} style="stroke" strokeWidth={0.6} />
        </Group>
      )}
      <Path path={glass} color={light.window} />
      <Path path={glass} color={light.lamp} opacity={flicker} />
      <Path path={bars} color={trim} style="stroke" strokeWidth={1.6} />
      <Path path={glass} color={trim} style="stroke" strokeWidth={style === 'round' ? 2.4 : 1.6} />
      {boxes && (
        <Group>
          <Rect x={x - 2} y={y + h + 1} width={w + 4} height={5} color={lit('#8a5a3a')} />
          {Array.from({ length: 5 }, (_, i) => (
            <Circle key={i} cx={x + 1 + i * ((w + 2) / 4)} cy={y + h} r={2.2} color={lit(['#e8a0b4', '#e9b23c', '#c2452a', '#f3e7d8', '#b07be6'][i])} />
          ))}
        </Group>
      )}
    </Group>
  )
}

function Door({ style, x, y, w, h, color, trim }: { style: DoorStyle; x: number; y: number; w: number; h: number; color: string; trim: string }) {
  const path = style === 'arched' ? `M${x} ${y + h} V ${y + w / 2} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 V ${y + h} Z` : `M${x} ${y} h ${w} v ${h} h ${-w} Z`
  return (
    <Group>
      <Path path={path} color={color} />
      <Path path={path} color={trim} style="stroke" strokeWidth={1.6} />
      {style === 'double' && <Path path={`M${x + w / 2} ${y} V ${y + h}`} color={shade(color, 0.4)} style="stroke" strokeWidth={1.2} />}
      {style === 'double' ? (
        <>
          <Circle cx={x + w / 2 - 3} cy={y + h * 0.55} r={1.3} color="#d9a441" />
          <Circle cx={x + w / 2 + 3} cy={y + h * 0.55} r={1.3} color="#d9a441" />
        </>
      ) : (
        <Circle cx={x + w - 5} cy={y + h * 0.55} r={1.4} color="#d9a441" />
      )}
      {/* Panels */}
      <Path path={`M${x + 5} ${y + h * 0.3} h ${w - 10} M${x + 5} ${y + h * 0.75} h ${w - 10}`} color={shade(color, 0.25)} style="stroke" strokeWidth={0.8} />
    </Group>
  )
}

function Tower({ x, top, quay, wall, roof, trim, light, flicker }: { x: number; top: number; quay: number; wall: string; roof: string; trim: string; light: Light; flicker: SharedValue<number> }) {
  return (
    <Group>
      <Path path={`M${x} ${quay} L ${x + 2} ${top} h 22 L ${x + 26} ${quay} Z`} color={shade(wall, 0.08)} />
      {[0.25, 0.5, 0.75].map((k) => (
        <Path key={k} path={`M${x + 1} ${top + (quay - top) * k} h 24`} color={trim} style="stroke" strokeWidth={1} opacity={0.6} />
      ))}
      <Rect x={x + 3} y={top - 12} width={20} height={12} color={light.window} />
      <Rect x={x + 3} y={top - 12} width={20} height={12} color={light.lamp} opacity={flicker} />
      <Path path={`M${x + 13} ${top - 12} v 12`} color={trim} style="stroke" strokeWidth={1.4} />
      <Rect x={x} y={top - 1} width={26} height={3} color={trim} />
      <Path path={`M${x - 2} ${top - 12} L ${x + 13} ${top - 26} L ${x + 28} ${top - 12} Z`} color={roof} />
    </Group>
  )
}

function Smoke({ clock, x, y }: { clock: SharedValue<number>; x: number; y: number }) {
  return (
    <Group>
      {[0, 1, 2].map((i) => (
        <Puff key={i} clock={clock} i={i} x={x} y={y} />
      ))}
    </Group>
  )
}

function Puff({ clock, i, x, y }: { clock: SharedValue<number>; i: number; x: number; y: number }) {
  const p = useDerivedValue(() => ((clock.value + i * 1400) % 4200) / 4200)
  const cx = useDerivedValue(() => x + p.value * 14 + Math.sin(p.value * 6) * 2)
  const cy = useDerivedValue(() => y - p.value * 30)
  const r = useDerivedValue(() => 2.5 + p.value * 5)
  const opacity = useDerivedValue(() => 0.5 * (1 - p.value))
  return <Circle cx={cx} cy={cy} r={r} opacity={opacity} color="#e9dccf" />
}

function EaveLights({ clock, x, w, top }: { clock: SharedValue<number>; x: number; w: number; top: number }) {
  const n = Math.floor((w + 16) / 9)
  return (
    <Group>
      <Path path={`M${x - 8} ${top + 4} Q ${x + w / 2} ${top + 10} ${x + w + 8} ${top + 4}`} color="#2e1c19" style="stroke" strokeWidth={0.6} />
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        const bx = x - 8 + (w + 16) * t
        const by = (1 - t) ** 2 * (top + 4) + 2 * t * (1 - t) * (top + 10) + t * t * (top + 4)
        return <Bulb key={i} clock={clock} i={i} x={bx} y={by + 2} />
      })}
    </Group>
  )
}

function Bulb({ clock, i, x, y }: { clock: SharedValue<number>; i: number; x: number; y: number }) {
  const opacity = useDerivedValue(() => 0.65 + 0.35 * Math.sin(clock.value / 400 + i * 1.3))
  return <Circle cx={x} cy={y} r={1.8} color={['#ffd27a', '#ff9a7a', '#9ec0ff', '#b8f2a0'][i % 4]} opacity={opacity} />
}

/** A weathervane, an anchor or a flag, at the top of the roof. */
function TopperArt({ topper, x, y, clock, lit, flag }: { topper: Topper; x: number; y: number; clock: SharedValue<number>; lit: (c: string) => string; flag: string }) {
  const turn = useDerivedValue(() => [{ scaleX: Math.cos(clock.value / 2600) > 0 ? 1 : -1 }])
  const wave = useDerivedValue(() => `M${x} ${y - 26} q 6 ${-2 + Math.sin(clock.value / 180) * 2} 12 0 q 2 4 0 8 q -6 ${2 + Math.sin(clock.value / 200) * 2} -12 0 Z`)
  const iron = lit('#2e1c19')
  if (topper === 'none') return null
  if (topper === 'flag')
    return (
      <Group>
        <Path path={`M${x} ${y} V ${y - 28}`} color={iron} style="stroke" strokeWidth={1.2} />
        <Path path={wave} color={flag} />
      </Group>
    )
  if (topper === 'anchor')
    return (
      <Group>
        <Path path={`M${x} ${y} V ${y - 6}`} color={iron} style="stroke" strokeWidth={1.2} />
        <Circle cx={x} cy={y - 20} r={2.2} color={lit('#c9a24a')} style="stroke" strokeWidth={1.2} />
        <Path path={`M${x} ${y - 18} V ${y - 6} M${x - 5} ${y - 14} h 10 M${x - 8} ${y - 10} q 8 8 16 0`} color={lit('#c9a24a')} style="stroke" strokeWidth={1.6} strokeCap="round" />
      </Group>
    )
  return (
    <Group>
      <Path path={`M${x} ${y} V ${y - 22} M${x - 6} ${y - 10} h 12 M${x} ${y - 16} v 12`} color={iron} style="stroke" strokeWidth={1} />
      <Group transform={turn} origin={vec(x, y - 22)}>
        {topper === 'gull' ? (
          <Path path={`M${x - 10} ${y - 23} q 5 -6 10 -1 q 5 -5 10 1 q -5 -2 -10 2 q -5 -4 -10 -2 Z`} color={iron} />
        ) : (
          <Path path={`M${x - 9} ${y - 22} h 18 l -3 3 h -12 Z M${x - 1} ${y - 22} V ${y - 32} L ${x + 7} ${y - 23} Z`} color={iron} />
        )}
      </Group>
    </Group>
  )
}
