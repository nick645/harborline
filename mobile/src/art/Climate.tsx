// What bad weather looks like in each climate: rain in the bay and the pines (the pines drizzle
// even on a choppy day), warm heavy downpours in the tropics, snow and blizzards in the north,
// blowing dust and sandstorms in the desert. Shared by the port and boat scenes.

import { useMemo } from 'react'
import { Group, Path, Rect } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Weather } from '../../../src/game/types'
import type { Climate } from '../../../src/game/data/ports'
import { CLIMATE_LOOK, type Kind } from './climateLook'

function streaks(kind: Kind, n: number, slant: number, seed: number): string {
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = ((i * 73 + seed * 31) % 400) - 20
    const y = (i * 137 + seed * 17) % 360
    if (kind === 'rain') d += `M${x} ${y} l ${-slant} 18 `
    else if (kind === 'snow') {
      const r = 0.8 + ((i * 7) % 5) * 0.3
      d += `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
    } else d += `M${x} ${y} l ${26 + (i % 5) * 8} ${1 + (i % 3)} `
  }
  return d
}

/** Falling weather over a 358 × 360 area, in two layers, scrolling on the scene's clock. */
export function Fall({ climate, weather, clock, wind = -1, opacity = 1 }: { climate: Climate; weather: Weather; clock: SharedValue<number>; wind?: number; opacity?: number }) {
  const look = CLIMATE_LOOK[climate]
  const n = look.count[weather]
  const storm = weather === 'storm'
  const slant = look.kind === 'rain' ? (storm ? 14 : 7) * -wind : 0
  const near = useMemo(() => streaks(look.kind, n, slant, 1), [look.kind, n, slant])
  const far = useMemo(() => streaks(look.kind, Math.round(n * 0.8), slant * 0.6, 7), [look.kind, n, slant])
  // Rain falls fast; snow drifts down and sideways; dust blows across.
  const speed = look.kind === 'rain' ? 5 : look.kind === 'snow' ? (storm ? 9 : 22) : 6
  const kind = look.kind
  const move = (t: number, div: number, shift: number) => {
    'worklet'
    const o = (t / div) % 360
    if (kind === 'dust') return [{ translateX: (wind < 0 ? -1 : 1) * (o - shift) }, { translateY: Math.sin(t / 900) * 6 }]
    const sway = kind === 'snow' ? Math.sin(t / 1300) * 10 - o * (storm ? 0.6 : 0.15) * -wind : (o * slant) / 18
    return [{ translateX: sway }, { translateY: o - shift }]
  }
  const a = useDerivedValue(() => move(clock.value, speed, 360))
  const b = useDerivedValue(() => move(clock.value, speed, 0))
  const c = useDerivedValue(() => move(clock.value, speed * 1.7, 360))
  const d = useDerivedValue(() => move(clock.value, speed * 1.7, 0))
  if (n === 0) return null
  const stroke = look.kind === 'rain' ? 'stroke' : look.kind === 'dust' ? 'stroke' : 'fill'
  const w = look.kind === 'dust' ? 1.6 : 1.1
  return (
    <Group opacity={opacity}>
      {look.kind === 'dust' && <Rect x={-40} y={-40} width={440} height={440} color={look.veil} opacity={storm ? 0.32 : weather === 'rough' ? 0.18 : 0.06} />}
      {[c, d].map((t, i) => (
        <Group key={`f${i}`} transform={t}>
          <Path path={far} color={look.fall} style={stroke} strokeWidth={w * 0.7} opacity={0.4} />
        </Group>
      ))}
      {[a, b].map((t, i) => (
        <Group key={`n${i}`} transform={t}>
          <Path path={near} color={look.fall} style={stroke} strokeWidth={w} opacity={look.kind === 'snow' ? 0.85 : 0.65} />
        </Group>
      ))}
    </Group>
  )
}
