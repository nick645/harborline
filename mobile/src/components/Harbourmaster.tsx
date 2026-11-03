// Wick, the harbourmaster: walks a new player through their first boat, first captain and first
// trip, in a card under the screen. What he says is in guideLine.ts.

import { Pressable, Text, View } from 'react-native'
import { Canvas, Group, Rect, rect, rrect } from '@shopify/react-native-skia'
import { Figure } from '../art/Figure'
import type { Look } from '../art/looks'
import { useSceneClock } from '../art/clock'
import type { GuideLine } from '../guideLine'
import { fonts, useTheme } from '../theme'
import { Button, Card, Row } from './ui'

/** An old salt in an oilskin and sou'wester, pipe going, lantern in hand. */
const WICK: Look = {
  hat: 'souwester',
  hatColor: '#e9b23c',
  coat: '#c99a2e',
  coatStyle: 'oilskin',
  scarf: '#2f5d62',
  skin: '#d9a77f',
  hair: '#d8d2c8',
  hairStyle: 'cropped',
  facialHair: 'beard',
  age: 2,
  brow: 2,
  nose: 2,
  extra: 'pipe',
  build: 'stocky',
  glasses: false,
  prop: 'lantern',
  trousers: '#3a2e2a',
  boots: '#2a1f1c',
}

export function Harbourmaster({ line, onEnd }: { line: GuideLine; onEnd: () => void }) {
  const t = useTheme()
  const clock = useSceneClock()
  return (
    <Card accent={t.accent} style={{ padding: 10, gap: 6 }}>
      <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
        <Canvas style={{ width: 52, height: 60 }}>
          <Group clip={rrect(rect(0, 0, 52, 60), 10, 10)}>
            <Rect x={0} y={0} width={52} height={60} color="#433145" />
            <Figure look={WICK} x={-6} y={-10} scale={1.1} clock={clock} rimLight="#ffd27a" />
          </Group>
        </Canvas>
        <View style={{ flex: 1, gap: 3 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Text style={{ color: t.accent, fontFamily: fonts.titleItalic, fontSize: 17 }}>Wick, harbourmaster</Text>
            {!line.done && (
              <Pressable onPress={onEnd} accessibilityRole="button" accessibilityLabel="Skip the walk-through" hitSlop={10}>
                <Text style={{ color: t.muted, fontFamily: fonts.medium, fontSize: 12 }}>Skip</Text>
              </Pressable>
            )}
          </Row>
          <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 19 }}>{line.text}</Text>
        </View>
      </Row>
      {line.done && <Button small label="Thanks, Wick" onPress={onEnd} />}
    </Card>
  )
}
