// Gold sparkles twinkling round something worth a look: four-pointed glints that swell and fade
// on their own beats, and a soft glow under them.

import { Circle, Group, Path, RadialGradient, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'

const GOLD = '#ffd66b'
const GLINT = 'M0 -1 L 0.22 -0.22 L 1 0 L 0.22 0.22 L 0 1 L -0.22 0.22 L -1 0 L -0.22 -0.22 Z'

/** Glints scattered over an ellipse `rx` × `ry` round (cx, cy), and a gold star bobbing at `beaconY`. */
export function Sparkles({ cx, cy, rx, ry, clock, count = 11, beaconY }: { cx: number; cy: number; rx: number; ry: number; clock: SharedValue<number>; count?: number; beaconY?: number }) {
  const glow = useDerivedValue(() => 0.6 + 0.25 * Math.sin(clock.value / 380))
  const bob = useDerivedValue(() => [{ translateX: cx }, { translateY: (beaconY ?? 0) + Math.sin(clock.value / 300) * 3 }, { scale: 9 + Math.sin(clock.value / 220) * 1.5 }, { rotate: clock.value / 1400 }])
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={Math.max(rx, ry) * 1.15} opacity={glow}>
        <RadialGradient c={vec(cx, cy)} r={Math.max(rx, ry) * 1.15} colors={[`${GOLD}bb`, `${GOLD}44`, `${GOLD}00`]} positions={[0, 0.5, 1]} />
      </Circle>
      {Array.from({ length: count }, (_, i) => (
        <Glint key={i} i={i} n={count} cx={cx} cy={cy} rx={rx} ry={ry} clock={clock} />
      ))}
      {beaconY !== undefined && (
        <Group transform={bob}>
          <Circle cx={0} cy={0} r={1.4} color={GOLD} opacity={0.35} />
          <Path path={GLINT} color={GOLD} />
          <Circle cx={0} cy={0} r={0.25} color="#fffbe8" />
        </Group>
      )}
    </Group>
  )
}

function Glint({ i, n, cx, cy, rx, ry, clock }: { i: number; n: number; cx: number; cy: number; rx: number; ry: number; clock: SharedValue<number> }) {
  const a = (i / n) * Math.PI * 2 + i * 0.7
  const x = cx + Math.cos(a) * rx * (0.55 + ((i * 37) % 45) / 100)
  const y = cy + Math.sin(a) * ry * (0.55 + ((i * 53) % 45) / 100)
  const period = 900 + ((i * 211) % 700)
  const size = 5 + (i % 3) * 2.5
  const t = useDerivedValue(() => {
    const p = ((clock.value + i * 337) % period) / period
    const k = Math.max(0, Math.sin(p * Math.PI))
    return [{ translateX: x }, { translateY: y }, { scale: size * (0.3 + k) }, { rotate: p * 0.8 }]
  })
  const opacity = useDerivedValue(() => Math.max(0, Math.sin((((clock.value + i * 337) % period) / period) * Math.PI)))
  return (
    <Group transform={t} opacity={opacity}>
      <Path path={GLINT} color={GOLD} />
      <Circle cx={0} cy={0} r={0.18} color="#fffbe8" />
    </Group>
  )
}
