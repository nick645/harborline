// Cloud over the whole sea chart while a new harbour's first boat has yet to sail. Banks of
// cloud drift slowly over it; when she sails they thin away and the chart shows through.

import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia'
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import type { Light } from './light'
import { useSceneClock } from './clock'
import { fonts } from '../theme'

/** Cloud banks in a 100 × 100 box, scaled to the chart: centre, radius, drift speed. */
const BANKS: [number, number, number, number][] = [
  [10, 12, 22, 0.7], [38, 8, 26, 0.5], [70, 14, 24, 0.8], [95, 6, 20, 0.6],
  [20, 40, 28, 0.4], [55, 36, 30, 0.6], [88, 42, 26, 0.5],
  [6, 70, 24, 0.7], [36, 66, 30, 0.5], [68, 72, 28, 0.6], [98, 76, 22, 0.8],
  [22, 96, 26, 0.6], [56, 98, 28, 0.4], [86, 100, 24, 0.7],
]

export function ChartFog({ width, height, light, hidden }: { width: number; height: number; light: Light; hidden: boolean }) {
  const clock = useSceneClock()
  const shown = useSharedValue(hidden ? 1 : 0)
  useEffect(() => {
    shown.set(withTiming(hidden ? 1 : 0, { duration: hidden ? 0 : 2400 }))
  }, [hidden, shown])
  const style = useAnimatedStyle(() => ({ opacity: shown.value }))
  const night = light.stars > 0
  const base = night ? '#3a2e46' : '#d9d3dc'
  const puff = night ? '#4a3c58' : '#f0ebf0'
  const s = Math.max(width, height) / 100
  const drift = useDerivedValue(() => clock.value / 1000)
  return (
    <Animated.View pointerEvents={hidden ? 'auto' : 'none'} style={[{ position: 'absolute', left: 0, top: 0, width, height }, style]}>
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height} color={base} />
        {BANKS.map(([x, y, r, speed], i) => (
          <Bank key={i} x={x * s} y={y * s} r={r * s} speed={speed} drift={drift} color={i % 3 ? puff : base} width={width} />
        ))}
      </Canvas>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
        <Text style={{ color: night ? '#e2d2c8' : '#4a3346', fontFamily: fonts.titleItalic, fontSize: 18 }}>The sea is all cloud</Text>
        <Text style={{ color: night ? '#c9b6ae' : '#6e5a66', fontFamily: fonts.body, fontSize: 13 }}>It clears once your first boat sails.</Text>
      </View>
    </Animated.View>
  )
}

function Bank({ x, y, r, speed, drift, color, width }: { x: number; y: number; r: number; speed: number; drift: SharedValue<number>; color: string; width: number }) {
  const at = useDerivedValue(() => {
    const span = width + 2 * r
    return [{ translateX: ((((x + r + drift.value * speed * 6) % span) + span) % span) - r }, { translateY: y + Math.sin(drift.value * 0.2 + x) * 3 }]
  })
  return (
    <Group transform={at}>
      <Circle cx={0} cy={0} r={r} color={color} opacity={0.9} />
      <Circle cx={r * 0.7} cy={-r * 0.25} r={r * 0.7} color={color} opacity={0.85} />
      <Circle cx={-r * 0.75} cy={r * 0.15} r={r * 0.6} color={color} opacity={0.85} />
    </Group>
  )
}
