// The Ports tab: every charted port as a postcard (home first), and the chosen port below: its
// town, weather, sending boats there, its harbour office, quay and tavern.

import { View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { homeOf, openPorts } from '../../../src/game/regions'
import { PortPostcards } from '../components/PortPostcards'
import { chartHidden } from '../../../src/game/guide'
import { VisitScreen, type VisitPage } from './VisitScreen'

type VisitProps = Omit<Parameters<typeof VisitScreen>[0], 'portId' | 'page' | 'onPage'>

export function PortsScreen({
  selected,
  onSelect,
  page,
  onPage,
  ...visit
}: VisitProps & { selected: string | null; onSelect: (id: string) => void; page: VisitPage; onPage: (p: VisitPage) => void }) {
  const { game } = visit
  const home = homeOf(game)
  // Home first; during the walk-through, only home (the rest of the sea is still under cloud).
  const ports = openPorts(game)
    .filter((p) => !chartHidden(game, visit.now) || p.id === home)
    .sort((a, b) => (a.id === home ? -1 : b.id === home ? 1 : 0))
  const portId = selected && ports.some((p) => p.id === selected) ? selected : home
  const port = ports.find((p) => p.id === portId)!

  return (
    <View style={{ flex: 1, gap: 10 }}>
      {page === 'menu' && <PortPostcards game={game as GameState} now={visit.now} selected={portId} onSelect={onSelect} ports={ports} />}
      <VisitScreen key={port.id} {...visit} portId={port.id} page={page} onPage={onPage} />
    </View>
  )
}
