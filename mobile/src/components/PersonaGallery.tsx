// Dev tool: every Legend and Mythic persona, full length, for checking the art without raising
// thirty captains.

import { useState } from 'react'
import { Text, View } from 'react-native'
import { Canvas, Rect } from '@shopify/react-native-skia'
import { LEGEND_PERSONAS, MYTHIC_PERSONAS } from '../../../src/game/data/personas'
import { Figure } from '../art/Figure'
import { lookFor } from '../art/looks'
import { useSceneClock } from '../art/clock'
import { fonts, useTheme } from '../theme'
import { Segments, Strip } from './ui'

const W = 104
const H = 196

const PAGES = { mythic: MYTHIC_PERSONAS, legend1: LEGEND_PERSONAS.slice(0, 10), legend2: LEGEND_PERSONAS.slice(10) }

export function PersonaGallery() {
  const t = useTheme()
  const clock = useSceneClock()
  // Ten at a time: thirty animated figures at once is more than Skia wants to draw.
  const [page, setPage] = useState<keyof typeof PAGES>('mythic')
  return (
    <View style={{ gap: 6 }}>
    <Segments
      items={[
        { id: 'mythic', label: 'Mythic' },
        { id: 'legend1', label: 'Legend 1–10' },
        { id: 'legend2', label: 'Legend 11–20' },
      ]}
      value={page}
      onChange={setPage}
    />
    <Strip gap={6}>
      {PAGES[page].map((p, i) => (
        <View key={p.id} style={{ width: W, gap: 2 }}>
          <Canvas style={{ width: W, height: H, borderRadius: 8 }}>
            <Rect x={0} y={0} width={W} height={H} color="#2b1f2c" />
            <Figure key={p.id} look={lookFor(`gallery-${p.id}`, false, 'bay', p.id)} x={(W - 56 * 1.15) / 2} y={H - 145 * 1.15 - 8} scale={1.15} clock={clock} offset={i * 377} legs rimLight="#ffd27a" />
          </Canvas>
          <Text numberOfLines={2} style={{ color: page === 'mythic' ? t.mythic : t.legendary, fontFamily: fonts.semibold, fontSize: 11 }}>
            {p.name}
          </Text>
        </View>
      ))}
    </Strip>
    </View>
  )
}
