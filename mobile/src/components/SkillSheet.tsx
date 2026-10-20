// A captain's page in your book: the five sea skills, greyed out until you've learned something
// about them, the lodestone that marks someone who could become a Legend (or more), and the
// badge of a Legend or a Mythic.

import { Text, View } from 'react-native'
import { Canvas, Circle, Group, Path, RadialGradient, vec } from '@shopify/react-native-skia'
import type { CaptainView } from '../../../src/game/captains'
import { fonts, useTheme } from '../theme'
import { Anchors } from './ui'

/** Rows of the five skills. `paper` draws it in ink on the logbook's page. */
export function SkillSheet({ c, paper, compact }: { c: CaptainView; paper?: boolean; compact?: boolean }) {
  const t = useTheme()
  const ink = paper ? t.ink : t.text
  const faint = paper ? t.pencil : t.muted
  const track = paper ? 'rgba(80,60,50,0.15)' : t.border
  return (
    <View style={{ gap: compact ? 3 : 6 }}>
      {c.skills.map((sk) => {
        const [lo, hi] = sk.band
        return (
          <View key={sk.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: sk.known ? 1 : 0.55 }}>
            <Text style={{ width: 66, color: sk.known ? ink : faint, fontFamily: fonts.semibold, fontSize: compact ? 12 : 13 }}>{sk.name}</Text>
            <View style={{ flex: 1, height: compact ? 7 : 9, borderRadius: 5, backgroundColor: track, overflow: 'hidden' }}>
              {sk.known ? (
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${lo - 1}%`, width: `${Math.max(3, hi - lo + 1)}%`, borderRadius: 5, backgroundColor: paper ? '#8a5a3a' : t.accent }} />
              ) : (
                // Not learned yet: faint hatching across the whole scale.
                <View style={{ flexDirection: 'row', flex: 1, gap: 4, paddingHorizontal: 2 }}>
                  {Array.from({ length: 14 }, (_, i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: faint, opacity: 0.18, transform: [{ skewX: '-30deg' }] }} />
                  ))}
                </View>
              )}
            </View>
            <Text style={{ width: 46, textAlign: 'right', color: sk.known ? ink : faint, fontFamily: fonts.body, fontSize: compact ? 12 : 13 }}>{sk.known ? `${lo}–${hi}` : '?'}</Text>
          </View>
        )
      })}
      {!compact && c.skills.every((sk) => !sk.known) && (
        <Text style={{ color: faint, fontFamily: fonts.body, fontSize: 12 }}>Nothing learned yet. Scouting and voyages fill this in.</Text>
      )}
    </View>
  )
}

/**
 * A lodestone: a dark sea-worn stone with light in its veins. Amber for the makings of a Legend,
 * a cold violet for something rarer still.
 */
export function Lodestone({ potential, size = 18 }: { potential: 'legend' | 'mythic'; size?: number }) {
  const t = useTheme()
  const glow = potential === 'mythic' ? t.mythic : t.legendary
  const s = size / 20
  return (
    <Canvas style={{ width: size, height: size }} accessibilityLabel={potential === 'mythic' ? 'Could become Mythic' : 'Could become a Legend'}>
      <Group transform={[{ scale: s }]}>
        <Circle cx={10} cy={11} r={10}>
          <RadialGradient c={vec(10, 11)} r={10} colors={[glow, 'rgba(0,0,0,0)']} />
        </Circle>
        <Path path="M4 12 C3 7 7 4 11 4 C15 4 17 8 16 12 C15 16 11 17 8 16 C5 15 4.5 14 4 12 Z" color="#2a2230" />
        <Path path="M6 12 L9 9 L11 11 L14 7 M9 9 L9 14" color={glow} style="stroke" strokeWidth={1.2} strokeCap="round" />
      </Group>
    </Canvas>
  )
}

/** Anchors, or for those who've risen above five, the badge of a Legend or a Mythic. */
export function Standing({ c, size = 14 }: { c: Pick<CaptainView, 'rank' | 'reputation'>; size?: number }) {
  const t = useTheme()
  if (!c.rank) return <Anchors n={c.reputation} size={size} />
  const color = c.rank === 'mythic' ? t.mythic : t.legendary
  return (
    <View style={{ borderRadius: 6, borderWidth: 1.5, borderColor: color, paddingHorizontal: 7, paddingVertical: 1 }}>
      <Text style={{ color, fontFamily: fonts.bold, fontSize: size - 2, letterSpacing: 1.5 }}>{c.rank === 'mythic' ? 'MYTHIC' : 'LEGEND'}</Text>
    </View>
  )
}

/** A Legend's and a Mythic's signatures. */
export function RankAbilities({ c, paper }: { c: CaptainView; paper?: boolean }) {
  const t = useTheme()
  if (!c.rankAbilities.length) return null
  return (
    <View style={{ gap: 3 }}>
      {c.rankAbilities.map((a, i) => (
        <Text key={a.id} style={{ color: paper ? t.ink : t.text, fontFamily: fonts.body, fontSize: 14 }}>
          <Text style={{ fontFamily: fonts.bold, color: i === 0 ? t.legendary : t.mythic }}>{a.name}.</Text> {a.description}
        </Text>
      ))}
    </View>
  )
}
