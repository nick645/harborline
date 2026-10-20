// Which way someone looking for work leans: a little compass with your flag on one side and the
// leading rival's on the other, the needle swinging between them, and when they'll decide.

import { Text, View } from 'react-native'
import type { CourtingView } from '../../../src/game/courting'
import { duration } from '../../../src/format'
import { fonts, useTheme } from '../theme'

const SIZE = 46

function Flag({ colors, side }: { colors: [string, string]; side: 'left' | 'right' }) {
  return (
    <View style={{ position: 'absolute', top: SIZE / 2 - 9, [side]: -2, width: 10, height: 12, flexDirection: 'row', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ flex: 1, backgroundColor: colors[0] }} />
      <View style={{ flex: 1, backgroundColor: colors[1] }} />
    </View>
  )
}

export function Bearing({ v, now, compact }: { v: CourtingView; now: number; compact?: boolean }) {
  const t = useTheme()
  // Your side is the left. Past ±40 the needle is hard over.
  const angle = -Math.max(-1, Math.min(1, v.bearing / 40)) * 70
  const torn = Math.abs(v.bearing) < 5
  const status = v.wonOver ? 'Won over: ready to sign' : torn ? `Torn between you and ${v.leader.name}` : v.leaning ? 'Leaning your way' : `Leaning to ${v.leader.name}`
  const color = v.wonOver ? t.good : torn ? t.accent : v.leaning ? t.good : t.bad
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface2 }}>
        <Flag colors={[t.accent, t.accentText]} side="left" />
        <Flag colors={v.leader.colors} side="right" />
        <View style={{ position: 'absolute', left: SIZE / 2 - 1.5, top: 6, width: 3, height: SIZE / 2 - 6, borderRadius: 2, backgroundColor: color, transform: [{ translateY: (SIZE / 2 - 6) / 2 }, { rotate: `${angle}deg` }, { translateY: -(SIZE / 2 - 6) / 2 }] }} />
        <View style={{ position: 'absolute', left: SIZE / 2 - 3.5, top: SIZE / 2 - 3.5, width: 7, height: 7, borderRadius: 4, backgroundColor: t.text }} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text numberOfLines={1} style={{ color, fontFamily: fonts.semibold, fontSize: 14 }}>
          {status}
        </Text>
        <Text numberOfLines={1} style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
          Decides in {duration(Math.max(0, v.decidesAt - now))}
          {compact || v.rivals.length < 2 ? '' : ` · ${v.leaning ? v.rivals.map((r) => r.name).join(', ') : `also ${v.rivals.slice(1).map((r) => r.name).join(', ')}`}`}
        </Text>
      </View>
    </View>
  )
}
