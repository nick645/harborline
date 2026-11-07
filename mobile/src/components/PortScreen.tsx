// The home port's works: upgrades to build, one page of the Home tab. (The Workshop, where parts
// become boats, is in the Shipyard: components/Workshop.tsx.)

import { Text, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { UPGRADES, upgradeQuote } from '../../../src/game/crew'
import { coins } from '../../../src/format'
import { useTheme } from '../theme'
import { Body, Button, Card, Muted, Row } from './ui'

type UpgradeId = (typeof UPGRADES)[number]['id']

export function Upgrades({ game, onBuild }: { game: GameState; onBuild: (id: UpgradeId) => void }) {
  const t = useTheme()
  return (
    <View style={{ gap: 8 }}>
      {UPGRADES.map((u) => {
        const q = upgradeQuote(game, u.id)
        return (
          <Card key={u.id} style={{ paddingVertical: 9 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <View style={{ flex: 1, gap: 1 }}>
                <Row style={{ gap: 6 }}>
                  <Body style={{ fontWeight: '700' }}>{u.name}</Body>
                  <Text style={{ color: t.accent, fontSize: 11, letterSpacing: 2 }}>
                    {'●'.repeat(q.level)}
                    <Text style={{ color: t.border }}>{'●'.repeat(3 - q.level)}</Text>
                  </Text>
                </Row>
                <Muted style={{ fontSize: 12 }} numberOfLines={2}>
                  {q.cost === null
                    ? u.describe(u.levels[q.level - 1])
                    : `Next: ${u.describe(u.levels[q.level])}${q.discount > 0 ? ` · ${Math.round(q.discount * 100)}% off while your Monarch is docked` : ''}`}
                </Muted>
              </View>
              <Button small label={q.cost === null ? 'Done' : `${coins(q.cost)}c`} disabled={q.cost === null || game.player.coins < q.cost} onPress={() => onBuild(u.id)} />
            </Row>
          </Card>
        )
      })}
    </View>
  )
}

