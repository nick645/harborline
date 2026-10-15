// A captain, drawn in Skia. Origin is the figure's top-left in a 56 × 100 box; place it with
// a transform. The same look is used everywhere the captain appears.

import { Circle, Group, Oval, Path, Rect } from '@shopify/react-native-skia'
import type { SharedValue } from 'react-native-reanimated'
import { useDerivedValue } from 'react-native-reanimated'
import { HAT_PATHS, type Look } from './looks'

type Props = {
  look: Look
  x: number
  y: number
  scale?: number
  clock: SharedValue<number>
  /** Phase offset so a crowd doesn't breathe in unison. */
  offset?: number
  /** A warm rim of lamplight down one side. */
  rimLight?: string
}

export function Figure({ look, x, y, scale = 1, clock, offset = 0, rimLight }: Props) {
  const idle = useDerivedValue(() => [
    { translateX: x },
    { translateY: y + Math.sin((clock.value + offset) / 600) * 1.5 * scale },
    { scale },
  ])
  return (
    <Group transform={idle}>
      <Path path="M6 100 C 8 70, 18 60, 28 60 C 38 60, 48 70, 50 100 Z" color={look.coat} />
      <Path path="M20 60 L 28 72 L 36 60 Z" color={look.scarf} />
      <Rect x={24} y={48} width={8} height={14} color={look.skin} />
      <Oval x={16} y={26} width={24} height={28} color={look.skin} />
      {rimLight && <Path path="M38 30 C 42 38, 42 48, 37 54" color={rimLight} style="stroke" strokeWidth={2} strokeCap="round" opacity={0.8} />}
      <Circle cx={23.5} cy={41} r={1.6} color="#2e1c19" />
      <Circle cx={32.5} cy={41} r={1.6} color="#2e1c19" />
      <Path path="M25 48 Q 28 50 31 48" color="#7a3f2c" style="stroke" strokeWidth={1.4} strokeCap="round" />
      <Path path={HAT_PATHS[look.hat]} color={look.hatColor} />
    </Group>
  )
}
