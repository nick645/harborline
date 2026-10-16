import { View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { shopClasses, topTier } from '../../../src/game/state'
import { getAbility } from '../../../src/game/abilities'
import { hasParts, partName } from '../../../src/game/parts'
import { fleetCap } from '../../../src/game/upgrades'
import { handFee, handsNeeded } from '../../../src/game/economy'
import { coins } from '../../../src/format'
import { useTheme } from '../theme'
import { Body, Button, Card, Heading, Muted, Row, Tag } from './ui'

export function ShipyardScreen({ game, onBuy }: { game: GameState; onBuy: (classId: string) => void }) {
  const t = useTheme()
  const top = topTier(game)
  const tiers = [top, top + 1].filter((x) => x <= 6)
  const full = game.player.ownedBoats.length >= fleetCap(game)
  return (
    <View style={{ gap: 10 }}>
      <Muted>
        Harbour: {game.player.ownedBoats.length}/{fleetCap(game)} boats{full ? ' · full (a step up a tier still fits)' : ''}
      </Muted>
      {tiers.map((tier) => (
        <View key={tier} style={{ gap: 8 }}>
          <Heading>Tier {tier}</Heading>
          {shopClasses()
            .filter((c) => c.sizeTier === tier)
            .map((c) => {
              const hasPart = hasParts(game.player.partInventory, c.requiredParts)
              const ability = getAbility(c.abilityId)
              return (
                <Card key={c.id} accent={c.rarity === 'rare' ? t.rare : undefined}>
                  <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row>
                        <Body style={{ fontWeight: '700' }}>{c.name}</Body>
                        {c.rarity === 'rare' && <Tag label="RARE" color={t.rare} />}
                      </Row>
                      <Muted>
                        {c.track === 'cargo' ? 'Cargo' : 'Passenger'} · cap {c.capacity} · fuel for {c.fuelTankTrips} trips
                      </Muted>
                      {ability && <Muted>{ability.description}</Muted>}
                      {handsNeeded(c) > 0 && (
                        <Muted>
                          Needs {handsNeeded(c)} deckhand{handsNeeded(c) === 1 ? '' : 's'} · {coins(handFee(c))}c each, once
                        </Muted>
                      )}
                      {c.requiredParts.length > 0 && (
                        <Muted style={{ color: hasPart ? t.good : t.muted }}>
                          {hasPart ? '✓ ' : 'Needs '}
                          {c.requiredParts.map(partName).join(', ')}
                        </Muted>
                      )}
                    </View>
                    <Button small label={`${coins(c.price)}c`} disabled={game.player.coins < c.price || !hasPart} onPress={() => onBuy(c.id)} />
                  </Row>
                </Card>
              )
            })}
        </View>
      ))}
    </View>
  )
}
