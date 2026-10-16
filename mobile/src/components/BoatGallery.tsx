// Dev tool: every boat class drawn side by side, for checking the art without buying them.

import { useState } from 'react'
import { View } from 'react-native'
import { Canvas } from '@shopify/react-native-skia'
import { BOAT_CLASSES } from '../../../src/game/data/boats'
import { BoatArt } from '../art/BoatArt'
import { boatWidth } from '../art/boatGeometry'
import { LIGHT, type Phase } from '../art/light'
import { Button, Muted, Row } from './ui'

const CELL_W = 168
const CELL_H = 120

export function BoatGallery() {
  const [phase, setPhase] = useState<Phase>('day')
  const [worn, setWorn] = useState(false)
  return (
    <View style={{ gap: 8 }}>
      <Row>
        {(['dawn', 'day', 'golden', 'night'] as const).map((p) => (
          <Button key={p} small kind={p === phase ? 'primary' : 'secondary'} label={p} onPress={() => setPhase(p)} />
        ))}
        <Button small kind={worn ? 'primary' : 'secondary'} label="worn" onPress={() => setWorn(!worn)} />
      </Row>
      <Row style={{ gap: 6 }}>
        {BOAT_CLASSES.map((cls) => {
          const scale = (CELL_W - 30) / boatWidth(cls)
          return (
            <View key={cls.id} style={{ width: CELL_W, gap: 2 }}>
              <Canvas style={{ width: CELL_W, height: CELL_H, backgroundColor: LIGHT[phase].sky, borderRadius: 8 }}>
                <BoatArt cls={cls} light={LIGHT[phase]} x={20} y={CELL_H - 28} scale={scale} condition={worn ? 25 : 100} />
              </Canvas>
              <Muted>
                {cls.name} · T{cls.sizeTier} {cls.rarity !== 'common' ? cls.rarity : ''}
              </Muted>
            </View>
          )
        })}
      </Row>
    </View>
  )
}
