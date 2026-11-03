// The Shipyard: the tiers you can buy in as tabs, and that tier's boats moored around a live
// yard. Tap one and the view closes in on her and her FOR SALE board; her details and the buy
// button sit underneath, with the next boat along a tap away.

import { useState } from 'react'
import { Text, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { shopClasses, topTier } from '../../../src/game/state'
import { getAbility } from '../../../src/game/abilities'
import { hasParts, partName } from '../../../src/game/parts'
import { fleetCap } from '../../../src/game/upgrades'
import { handFee, handsNeeded } from '../../../src/game/economy'
import { coins } from '../../../src/format'
import { ShipyardScene } from '../art/ShipyardScene'
import { lightAt } from '../art/light'
import { fonts, useTheme } from '../theme'
import { Body, Button, Card, Measure, Muted, Row, Segments, Tag, Title } from './ui'

export function ShipyardScreen({ game, now, onBuy }: { game: GameState; now: number; onBuy: (classId: string) => void }) {
  const t = useTheme()
  const top = topTier(game)
  // A new harbour's first boat is a starter; the tiers open up after that.
  const first = game.player.ownedBoats.length === 0
  const tiers = first ? [1] : [top, top + 1].filter((x) => x <= 6)
  const [tier, setTier] = useState(tiers[0])
  const [focused, setFocused] = useState<string | null>(null)
  const full = game.player.ownedBoats.length >= fleetCap(game)
  const classes = shopClasses(game).filter((c) => c.sizeTier === tier)
  const at = classes.findIndex((c) => c.id === focused)
  const c = at >= 0 ? classes[at] : null
  const step = (by: number) => setFocused(classes[(at + by + classes.length) % classes.length].id)

  return (
    <View style={{ flex: 1, gap: 10 }}>
      {tiers.length > 1 && (
        <Segments
          items={tiers.map((x) => ({ id: String(x), label: `Tier ${x}` }))}
          value={String(tier)}
          onChange={(v) => {
            setTier(Number(v))
            setFocused(null)
          }}
        />
      )}
      <Measure>
        {(w, h) => (
          <View style={{ borderRadius: 16, overflow: 'hidden' }}>
            <ShipyardScene width={w} height={h} light={lightAt(now)} classes={classes} coins={game.player.coins} focused={focused} onFocus={setFocused} />
          </View>
        )}
      </Measure>
      {c ? (
        <Card accent={c.rarity === 'rare' ? t.rare : undefined} style={{ gap: 4, padding: 12 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Row style={{ flexShrink: 1 }}>
              <Title size={24}>{c.name}</Title>
              {c.rarity === 'rare' && <Tag label="RARE" color={t.rare} />}
            </Row>
            <Muted>
              {at + 1} of {classes.length}
            </Muted>
          </Row>
          <Muted>
            {c.track === 'cargo' ? 'Cargo' : 'Passengers'} · carries {c.capacity} · fuel for {c.fuelTankTrips} trips
          </Muted>
          {getAbility(c.abilityId) && <Muted>{getAbility(c.abilityId)!.description}</Muted>}
          {handsNeeded(c) > 0 && (
            <Muted>
              Needs {handsNeeded(c)} deckhand{handsNeeded(c) === 1 ? '' : 's'} · {coins(handFee(c))}c each, once
            </Muted>
          )}
          {c.requiredParts.length > 0 && (
            <Text style={{ color: hasParts(game.player.partInventory, c.requiredParts) ? t.good : t.muted, fontFamily: fonts.body, fontSize: 13 }}>
              {hasParts(game.player.partInventory, c.requiredParts) ? '✓ ' : 'Needs '}
              {c.requiredParts.map(partName).join(', ')}
            </Text>
          )}
          <Row style={{ flexWrap: 'nowrap', marginTop: 4 }}>
            <Button small kind="secondary" label="‹" onPress={() => step(-1)} />
            <View style={{ flex: 1 }}>
              <Button
                label={`Buy for ${coins(c.price)}c`}
                disabled={game.player.coins < c.price || !hasParts(game.player.partInventory, c.requiredParts)}
                onPress={() => onBuy(c.id)}
              />
            </View>
            <Button small kind="secondary" label="›" onPress={() => step(1)} />
          </Row>
          <Button small kind="secondary" label="‹ The whole yard" onPress={() => setFocused(null)} />
        </Card>
      ) : (
        <Card style={{ gap: 2, padding: 12 }}>
          <Body style={{ fontWeight: '700' }}>{first ? 'Your first boat' : `Tier ${tier} boats for sale`}</Body>
          <Muted>
            Tap a boat to look her over. Harbour: {game.player.ownedBoats.length}/{fleetCap(game)} boats{full ? ' · full (a tier up still fits)' : ''}.
          </Muted>
        </Card>
      )}
    </View>
  )
}
