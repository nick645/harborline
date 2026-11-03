// One building on a port's waterfront, drawn with some care: siding or stone or plaster, a
// tiled roof with an overhang, framed windows with sills that light up after dark, a door on
// its step, and the touches that make a street lived in (shutters, a flower box, a hanging
// sign, an awning, smoke from the chimney, snow on the roof). Local space: (x, base) is the
// bottom-left corner on the quay; everything grows upward.

import { Circle, Group, LinearGradient, Path, Rect, RoundedRect, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Light } from '../light'
import { mix, shade, tint } from '../paint'

export type HouseKind = 'cottage' | 'stone' | 'plaster' | 'tall' | 'warehouse'

export interface HouseSpec {
  x: number
  w: number
  /** Wall height, not counting the roof. */
  h: number
  kind: HouseKind
  wall: string
  roof: string
  trim: string
  /** Bits drawn from the port's seed: which touches this one has. */
  bits: number
  /** Roof pitch: 0 flat, 1 a cottage gable, 1.6 steep. */
  pitch: number
  snow?: boolean
  lanterns?: boolean
}

type Props = { spec: HouseSpec; base: number; light: Light; lit: (c: string) => string; clock: SharedValue<number>; offset?: number }

const has = (bits: number, n: number) => ((bits >>> n) & 1) === 1

export function House({ spec, base, light, lit, clock, offset = 0 }: Props) {
  const { x, w, h, kind, bits } = spec
  const top = base - h
  const night = light.stars > 0
  const wall = lit(spec.wall)
  const trim = lit(spec.trim)
  const roof = lit(spec.roof)
  const flat = spec.pitch === 0
  const peak = top - (w / 2) * 0.55 * spec.pitch
  const over = 3

  // Window grid: rows by height, columns by width.
  const floors = Math.max(1, Math.round((h - 12) / 15))
  const cols = Math.max(1, Math.floor((w - 6) / 12))
  const winW = kind === 'tall' ? 5 : 6
  const winH = kind === 'stone' ? 6 : 8
  const gapX = (w - cols * winW) / (cols + 1)
  const doorCol = Math.floor(cols / 2)
  const glass = night ? light.window : mix(light.window, '#3a4a58', 0.35)

  const chimneyX = x + w * (has(bits, 3) ? 0.22 : 0.68)
  const chimneyTop = flat ? top - 8 : top - (Math.min(chimneyX - x, x + w - chimneyX) / (w / 2)) * (top - peak) - 6
  const smoke = useDerivedValue(() => {
    const t = (clock.value + offset) / 1000
    let d = ''
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.35 + i / 3) % 1
      const r = 1.6 + p * 3.2
      d += `M${chimneyX + 2 + p * 6 + Math.sin(t + i) * 1.5 - r} ${chimneyTop - 2 - p * 22} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
    }
    return d
  })
  const smokeOpacity = useDerivedValue(() => 0.35 + 0.1 * Math.sin((clock.value + offset) / 900))

  return (
    <Group>
      {/* Shadow on the quay */}
      <Rect x={x - 1} y={base} width={w + 4} height={3} color="#1d1218" opacity={0.25} />

      {/* Chimney (behind the roof) and its smoke */}
      {kind !== 'warehouse' && (
        <Group>
          <Path path={smoke} color={night ? '#5a4a66' : '#e8e2dc'} opacity={smokeOpacity} />
          <Rect x={chimneyX} y={chimneyTop} width={5} height={top - chimneyTop + 2} color={lit(shade(spec.wall === '#efe3d2' ? '#8a5a3a' : spec.wall, 0.35))} />
          <Rect x={chimneyX - 1} y={chimneyTop - 1.5} width={7} height={2.2} color={lit('#2e1c19')} />
        </Group>
      )}

      {/* Walls, lit from the right, falling into shade on the left */}
      <Rect x={x} y={top} width={w} height={h}>
        <LinearGradient start={vec(x, 0)} end={vec(x + w, 0)} colors={[shade(wall, 0.18), wall, tint(wall, 0.06)]} />
      </Rect>
      {kind === 'cottage' &&
        Array.from({ length: Math.floor(h / 4) }, (_, i) => (
          <Path key={i} path={`M${x} ${top + 4 + i * 4} h ${w}`} color={shade(wall, 0.22)} style="stroke" strokeWidth={0.5} opacity={0.7} />
        ))}
      {(kind === 'stone' || kind === 'warehouse') &&
        Array.from({ length: Math.floor(h / 5) }, (_, row) => (
          <Group key={row}>
            <Path path={`M${x} ${top + 5 + row * 5} h ${w}`} color={shade(wall, 0.25)} style="stroke" strokeWidth={0.5} opacity={0.7} />
            {Array.from({ length: Math.ceil(w / 9) }, (_, c) => (
              <Path key={c} path={`M${x + c * 9 + (row % 2) * 4.5} ${top + row * 5} v 5`} color={shade(wall, 0.25)} style="stroke" strokeWidth={0.5} opacity={0.6} />
            ))}
          </Group>
        ))}
      {kind === 'tall' && <Path path={`M${x} ${top + h * 0.5} h ${w}`} color={trim} style="stroke" strokeWidth={1.2} />}
      {/* Corner boards */}
      <Rect x={x} y={top} width={1.6} height={h} color={shade(trim, 0.15)} />
      <Rect x={x + w - 1.6} y={top} width={1.6} height={h} color={trim} />

      {/* Roof */}
      {flat ? (
        <Group>
          <Rect x={x - 1} y={top - 4} width={w + 2} height={4} color={trim} />
          <Rect x={x - 1} y={top - 5} width={w + 2} height={1.4} color={shade(trim, 0.2)} />
        </Group>
      ) : (
        <Group>
          <Path path={`M${x - over} ${top + 1} L ${x + w / 2} ${peak} L ${x + w + over} ${top + 1} Z`} color={roof} />
          {/* Rows of tiles or slates */}
          {Array.from({ length: Math.floor((top - peak) / 3.5) }, (_, i) => {
            const y = top - 2 - i * 3.5
            const half = ((y - peak) / (top - peak)) * (w / 2 + over)
            return <Path key={i} path={`M${x + w / 2 - half} ${y} h ${half * 2}`} color={shade(roof, 0.3)} style="stroke" strokeWidth={0.6} opacity={0.8} />
          })}
          <Path path={`M${x + w / 2} ${peak} L ${x + w + over} ${top + 1}`} color={tint(roof, 0.12)} style="stroke" strokeWidth={1.2} />
          <Path path={`M${x - over} ${top + 1.5} H ${x + w + over}`} color={shade(roof, 0.35)} style="stroke" strokeWidth={1.4} />
          {spec.snow && <Path path={`M${x - over} ${top} L ${x + w / 2} ${peak - 1} L ${x + w + over} ${top} L ${x + w + over - 2} ${top + 2} L ${x + w / 2} ${peak + 3} L ${x - over + 2} ${top + 2} Z`} color={lit('#f3f6fa')} />}
          {/* A dormer on the wider ones */}
          {w > 34 && has(bits, 5) && (
            <Group>
              <Rect x={x + w / 2 - 4} y={peak + (top - peak) * 0.45} width={8} height={7} color={wall} />
              <Path path={`M${x + w / 2 - 5.5} ${peak + (top - peak) * 0.45} l 5.5 -4 l 5.5 4 Z`} color={shade(roof, 0.1)} />
              <Rect x={x + w / 2 - 2} y={peak + (top - peak) * 0.45 + 2} width={4} height={4} color={glass} />
            </Group>
          )}
        </Group>
      )}

      {/* Windows: framed, with panes and sills; shutters and a flower box on some */}
      {Array.from({ length: floors }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          if (row === 0 && col === doorCol && kind !== 'warehouse') return null
          const wx = x + gapX + col * (winW + gapX)
          const wy = top + 5 + row * ((h - 8) / floors)
          if (wy + winH > base - 2) return null
          const round = kind === 'stone' && has(bits, 7)
          const arch = kind === 'plaster'
          return (
            <Group key={`${row}-${col}`}>
              {night && <Circle cx={wx + winW / 2} cy={wy + winH / 2} r={winW * 1.3} color={light.lamp} opacity={0.12} />}
              {round ? (
                <>
                  <Circle cx={wx + winW / 2} cy={wy + winH / 2} r={winW / 2 + 1} color={trim} />
                  <Circle cx={wx + winW / 2} cy={wy + winH / 2} r={winW / 2 - 0.2} color={glass} />
                </>
              ) : (
                <>
                  <RoundedRect x={wx - 1} y={wy - 1} width={winW + 2} height={winH + 2} r={arch ? winW / 2 + 1 : 0.6} color={trim} />
                  <RoundedRect x={wx} y={wy} width={winW} height={winH} r={arch ? winW / 2 : 0.3} color={glass} />
                  <Path path={`M${wx + winW / 2} ${wy} v ${winH} M${wx} ${wy + winH / 2} h ${winW}`} color={trim} style="stroke" strokeWidth={0.6} />
                  <Rect x={wx - 1.5} y={wy + winH + 1} width={winW + 3} height={1.2} color={shade(trim, 0.2)} />
                </>
              )}
              {kind === 'cottage' && has(bits, (row + col) % 8) && (
                <>
                  <Rect x={wx - 3.4} y={wy - 1} width={2.2} height={winH + 2} color={lit(spec.roof)} />
                  <Rect x={wx + winW + 1.2} y={wy - 1} width={2.2} height={winH + 2} color={lit(spec.roof)} />
                </>
              )}
              {row === 0 && has(bits, (col + 2) % 9) && kind !== 'warehouse' && (
                <Group>
                  <Rect x={wx - 1} y={wy + winH + 2} width={winW + 2} height={2.4} color={lit('#6e4733')} />
                  {[0, 2, 4, 6].map((k) => (
                    <Circle key={k} cx={wx + k * ((winW + 1) / 6)} cy={wy + winH + 1.6} r={1.1} color={lit(['#c2452a', '#e9b23c', '#e8a0b4'][(col + k) % 3])} />
                  ))}
                </Group>
              )}
            </Group>
          )
        }),
      )}

      {/* Door on its step */}
      {kind === 'warehouse' ? (
        <Group>
          <Rect x={x + w * 0.25} y={base - h * 0.62} width={w * 0.5} height={h * 0.62} color={lit('#3a2420')} />
          <Path path={`M${x + w * 0.25} ${base - h * 0.62} l ${w * 0.5} ${h * 0.62} M${x + w * 0.75} ${base - h * 0.62} l ${-w * 0.5} ${h * 0.62} M${x + w / 2} ${base - h * 0.62} v ${h * 0.62}`} color={lit('#6e4733')} style="stroke" strokeWidth={0.8} />
          <Rect x={x + w * 0.22} y={base - h * 0.62 - 2} width={w * 0.56} height={2} color={trim} />
        </Group>
      ) : (
        <Group>
          {(() => {
            const dx = x + gapX + doorCol * (winW + gapX) + winW / 2 - 3.5
            const dh = Math.min(13, h * 0.45)
            return (
              <>
                <RoundedRect x={dx - 1} y={base - dh - 1} width={9} height={dh + 1} r={kind === 'plaster' ? 4.5 : 0.6} color={trim} />
                <RoundedRect x={dx} y={base - dh} width={7} height={dh} r={kind === 'plaster' ? 3.5 : 0.3} color={lit(shade(spec.roof, 0.1))} />
                <Circle cx={dx + 5.4} cy={base - dh / 2} r={0.7} color={lit('#e9b23c')} />
                <Rect x={dx - 2} y={base - 1} width={11} height={1.6} color={lit('#8a8078')} />
                {/* A hanging sign beside the door */}
                {has(bits, 1) && (
                  <Group>
                    <Path path={`M${dx + 8} ${base - dh - 2} h 6 v 2`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.7} />
                    <RoundedRect x={dx + 10} y={base - dh} width={8} height={5} r={1} color={lit(['#2a4a3e', '#7a1f2a', '#23395b'][bits % 3])} />
                    <Rect x={dx + 11.5} y={base - dh + 2} width={5} height={1} color={lit('#e9b23c')} />
                  </Group>
                )}
                {/* A lamp by the door after dark */}
                {night && <Circle cx={dx - 3} cy={base - dh} r={1.4} color={light.lamp} />}
              </>
            )
          })()}
        </Group>
      )}

      {/* Plaster houses shade their doors with a striped awning */}
      {kind === 'plaster' && has(bits, 2) && (
        <Group>
          {Array.from({ length: Math.max(3, Math.floor(w / 6)) }, (_, i) => (
            <Rect key={i} x={x + 2 + i * ((w - 4) / Math.max(3, Math.floor(w / 6)))} y={base - h * 0.55} width={(w - 4) / Math.max(3, Math.floor(w / 6))} height={4} color={lit(i % 2 ? '#f3efe6' : ['#c2452a', '#2f8a8a', '#e9772f'][bits % 3])} />
          ))}
          <Path path={`M${x + 2} ${base - h * 0.55 + 4} ${'q 2 2 4 0 '.repeat(Math.floor((w - 4) / 4))}`} color={lit(['#c2452a', '#2f8a8a', '#e9772f'][bits % 3])} />
        </Group>
      )}

      {/* Lantern Reach hangs a lamp from every eave */}
      {spec.lanterns && (
        <Group>
          <Path path={`M${x + w - 3} ${top + 2} v 4`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.6} />
          <RoundedRect x={x + w - 5} y={top + 6} width={4} height={5} r={1} color="#ffb054" />
          <Circle cx={x + w - 3} cy={top + 8.5} r={7} color="#ffb054" opacity={0.18} />
        </Group>
      )}
    </Group>
  )
}

/** A house far up the hillside: a simple block and roof, hazed by distance, a lit window or two. */
export function FarHouse({ x, base, w, h, wall, roof, haze, light, pitch }: { x: number; base: number; w: number; h: number; wall: string; roof: string; haze: (c: string) => string; light: Light; pitch: number }) {
  const peak = base - h - (w / 2) * 0.55 * pitch
  return (
    <Group>
      <Rect x={x} y={base - h} width={w} height={h} color={haze(wall)} />
      {pitch > 0 ? (
        <Path path={`M${x - 1.5} ${base - h + 0.5} L ${x + w / 2} ${peak} L ${x + w + 1.5} ${base - h + 0.5} Z`} color={haze(roof)} />
      ) : (
        <Rect x={x - 0.5} y={base - h - 2} width={w + 1} height={2} color={haze(roof)} />
      )}
      <Rect x={x + w * 0.25} y={base - h * 0.65} width={2.4} height={3} color={light.stars ? light.window : haze('#3a4a58')} />
      {w > 12 && <Rect x={x + w * 0.62} y={base - h * 0.65} width={2.4} height={3} color={light.stars ? light.window : haze('#3a4a58')} />}
    </Group>
  )
}
