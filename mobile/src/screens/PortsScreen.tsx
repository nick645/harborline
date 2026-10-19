// The Ports tab: every charted port in a row of chips (home first), with how many captains and
// hands are looking for work and a ✦ where a rare captain sits by the fire. The chosen port
// shows below: its town, weather, sending boats there, its harbour office, quay and tavern.

import { Pressable, ScrollView, Text, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { portPeople } from '../../../src/game/crew'
import { homeOf, openPorts } from '../../../src/game/regions'
import { getRegion } from '../../../src/game/data/ports'
import { fonts, useTheme } from '../theme'
import { REGION_STYLE } from '../art/regionStyle'
import { VisitScreen, type VisitPage } from './VisitScreen'

type VisitProps = Omit<Parameters<typeof VisitScreen>[0], 'portId' | 'page' | 'onPage'>

export function PortsScreen({
  selected,
  onSelect,
  page,
  onPage,
  ...visit
}: VisitProps & { selected: string | null; onSelect: (id: string) => void; page: VisitPage; onPage: (p: VisitPage) => void }) {
  const t = useTheme()
  const { game } = visit
  const home = homeOf(game)
  const ports = openPorts(game).sort((a, b) => (a.id === home ? -1 : b.id === home ? 1 : 0))
  const portId = selected && ports.some((p) => p.id === selected) ? selected : home
  const port = ports.find((p) => p.id === portId)!

  return (
    <View style={{ flex: 1, gap: 10 }}>
      {page === 'menu' && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {ports.map((p) => {
          const on = p.id === portId
          const people = portPeople(game as GameState, p.id)
          const accent = REGION_STYLE[p.region].roofs[0]
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelect(p.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.name}${p.id === home ? ', home' : ''}`}
              style={{
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: on ? t.accent : t.border,
                backgroundColor: on ? t.surface2 : t.surface,
                paddingHorizontal: 12,
                paddingVertical: 8,
                gap: 2,
                borderLeftWidth: 5,
                borderLeftColor: accent,
              }}
            >
              <Text style={{ color: on ? t.accent : t.text, fontFamily: fonts.semibold, fontSize: 14 }}>
                {p.id === home ? '⚓︎ ' : ''}
                {p.name}
                {people.captain ? <Text style={{ color: t.legendary }}> ✦</Text> : ''}
              </Text>
              <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
                {p.id === home ? 'Home' : getRegion(p.region).name} · {people.recruits.length} captains · {people.hands.length} hands
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      )}
      <VisitScreen key={port.id} {...visit} portId={port.id} page={page} onPage={onPage} />
    </View>
  )
}
