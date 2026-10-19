// The Shipyard: the tiers you can buy in as tabs, and that tier's boats one to a page, drawn
// large, swiped sideways.

import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia'
import type { GameState } from '../../../src/game/types'
import { shopClasses, topTier } from '../../../src/game/state'
import { getAbility } from '../../../src/game/abilities'
import { hasParts, partName } from '../../../src/game/parts'
import { fleetCap } from '../../../src/game/upgrades'
import { handFee, handsNeeded } from '../../../src/game/economy'
import { coins } from '../../../src/format'
import { BoatArt } from '../art/BoatArt'
import { boatWidth } from '../art/boatGeometry'
import { lightAt } from '../art/light'
import { useSceneClock } from '../art/clock'
import { fonts, useTheme } from '../theme'
import { Button, Card, Measure, Muted, Row, Segments, Tag, Title } from './ui'

/** Height kept under the drawing for the boat's details and the buy button. */
const INFO_H = 190

export function ShipyardScreen({ game, now, onBuy }: { game: GameState; now: number; onBuy: (classId: string) => void }) {
  const t = useTheme()
  const top = topTier(game)
  const tiers = [top, top + 1].filter((x) => x <= 6)
  const [tier, setTier] = useState(tiers[0])
  const [page, setPage] = useState(0)
  const full = game.player.ownedBoats.length >= fleetCap(game)
  const classes = shopClasses().filter((c) => c.sizeTier === tier)
  const light = lightAt(now)
  const clock = useSceneClock()

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Segments
        items={tiers.map((x) => ({ id: String(x), label: `Tier ${x}` }))}
        value={String(tier)}
        onChange={(v) => {
          setTier(Number(v))
          setPage(0)
        }}
      />
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Muted>
          Harbour: {game.player.ownedBoats.length}/{fleetCap(game)} boats{full ? ' · full (a tier up still fits)' : ''}
        </Muted>
        <Muted>
          {Math.min(page + 1, classes.length)} of {classes.length} ›
        </Muted>
      </Row>
      <Measure>
        {(w, h) => (
          <ScrollView
            key={tier}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: w, height: h }}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
          >
            {classes.map((c) => {
              const hasPart = hasParts(game.player.partInventory, c.requiredParts)
              const ability = getAbility(c.abilityId)
              const artH = Math.max(90, h - INFO_H)
              const artW = w - 2
              // Masts stand up to about 0.7 of the boat's length; keep them inside the frame.
              const scale = Math.min((artW - 40) / boatWidth(c), (artH * 0.74) / (0.7 * boatWidth(c)))
              const bw = boatWidth(c) * scale
              return (
                <View key={c.id} style={{ width: w, height: h }}>
                  <Card accent={c.rarity === 'rare' ? t.rare : undefined} style={{ flex: 1, padding: 0, overflow: 'hidden', gap: 0 }}>
                    <Canvas style={{ width: artW, height: artH }}>
                      <Rect x={0} y={0} width={artW} height={artH}>
                        <LinearGradient start={vec(0, 0)} end={vec(0, artH)} colors={[light.sky, light.skyLow]} />
                      </Rect>
                      <Rect x={0} y={artH * 0.8} width={artW} height={artH * 0.2} color={light.sea} />
                      <BoatArt cls={c} light={light} x={(artW - bw) / 2} y={artH * 0.82} scale={scale} people clock={clock} />
                    </Canvas>
                    <View style={{ padding: 12, gap: 3, flex: 1 }}>
                      <Row>
                        <Title size={24}>{c.name}</Title>
                        {c.rarity === 'rare' && <Tag label="RARE" color={t.rare} />}
                      </Row>
                      <Muted>
                        {c.track === 'cargo' ? 'Cargo' : 'Passenger'} · carries {c.capacity} · fuel for {c.fuelTankTrips} trips
                      </Muted>
                      {ability && <Muted>{ability.description}</Muted>}
                      {handsNeeded(c) > 0 && (
                        <Muted>
                          Needs {handsNeeded(c)} deckhand{handsNeeded(c) === 1 ? '' : 's'} · {coins(handFee(c))}c each, once
                        </Muted>
                      )}
                      {c.requiredParts.length > 0 && (
                        <Text style={{ color: hasPart ? t.good : t.muted, fontFamily: fonts.body, fontSize: 13 }}>
                          {hasPart ? '✓ ' : 'Needs '}
                          {c.requiredParts.map(partName).join(', ')}
                        </Text>
                      )}
                      <View style={{ flex: 1 }} />
                      <Button label={`Buy for ${coins(c.price)}c`} disabled={game.player.coins < c.price || !hasPart} onPress={() => onBuy(c.id)} />
                    </View>
                  </Card>
                </View>
              )
            })}
          </ScrollView>
        )}
      </Measure>
    </View>
  )
}
