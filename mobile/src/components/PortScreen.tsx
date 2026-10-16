// The home port: upgrades to build, and the workshop where parts become boats.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { GameState, PartRarity, PartType, Track } from '../../../src/game/types'
import { craftableClasses, meltGroups } from '../../../src/game/state'
import { UPGRADES, upgradeQuote } from '../../../src/game/crew'
import { getBoatClass } from '../../../src/game/economy'
import { getAbility } from '../../../src/game/abilities'
import { countParts, getPart, partName, slotName } from '../../../src/game/parts'
import { MELT_COST, STANDARD_SCRAP_VALUE } from '../../../src/game/data/economy'
import { coins } from '../../../src/format'
import { fonts, useTheme } from '../theme'
import { Body, Button, Card, Heading, Muted, Row, Tag, Title } from './ui'

type UpgradeId = (typeof UPGRADES)[number]['id']

type Props = {
  game: GameState
  onBuild: (id: UpgradeId) => void
  onCraft: (classId: string) => void
  onScrap: () => void
  onMelt: (rarity: PartRarity, slot: PartType, track: Track) => void
}

export function PortScreen({ game, onBuild, onCraft, onScrap, onMelt }: Props) {
  return (
    <View style={{ gap: 10 }}>
      <Title size={24}>Saltmarsh Quay</Title>
      {UPGRADES.map((u) => {
        const q = upgradeQuote(game, u.id)
        return (
          <Card key={u.id}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '700' }}>{u.name}</Body>
                <Muted>{q.level > 0 ? `Level ${q.level}/3 · ${u.describe(u.levels[q.level - 1])}` : 'Not built'}</Muted>
                {q.cost !== null && (
                  <Muted>
                    Next: {u.describe(u.levels[q.level])}
                    {q.discount > 0 && ` · ${Math.round(q.discount * 100)}% off while your Monarch is docked`}
                  </Muted>
                )}
              </View>
              <Button
                small
                label={q.cost === null ? 'Done' : `${coins(q.cost)}c`}
                disabled={q.cost === null || game.player.coins < q.cost}
                onPress={() => onBuild(u.id)}
              />
            </Row>
          </Card>
        )
      })}

      <Title size={24}>Workshop</Title>
      <Workshop game={game} onCraft={onCraft} onScrap={onScrap} onMelt={onMelt} />
    </View>
  )
}

function Workshop({ game, onCraft, onScrap, onMelt }: Omit<Props, 'onBuild'>) {
  const t = useTheme()
  const [showAllSets, setShowAllSets] = useState(false)
  const counts = countParts(game.player.partInventory)
  const standard = [...counts].filter(([id]) => getPart(id).rarity === 'standard').reduce((n, [, c]) => n + c, 0)
  const rares = [...counts].filter(([id]) => getPart(id).rarity === 'rare')
  const owned = new Set(game.player.ownedBoats.map((b) => b.classId))

  const sets = craftableClasses()
    .map((cls) => ({ cls, have: cls.requiredParts.filter((id) => counts.has(id)) }))
    .filter(({ cls, have }) => showAllSets || have.length > 0 || owned.has(cls.id))
    .sort((a, b) => b.have.length - a.have.length || a.cls.sizeTier - b.cls.sizeTier)

  const melts = meltGroups(game).filter((g) => g.spares.length >= MELT_COST)
  const rarityColor = (r: string) => (r === 'mythic' ? t.mythic : r === 'legendary' ? t.legendary : t.rare)

  return (
    <View style={{ gap: 10 }}>
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}>
            <Body>
              <Text style={{ fontFamily: fonts.bold }}>{standard}</Text> standard fitting{standard === 1 ? '' : 's'}
            </Body>
            <Muted>{STANDARD_SCRAP_VALUE}c each as scrap</Muted>
          </View>
          <Button small label={standard > 0 ? `Scrap +${coins(standard * STANDARD_SCRAP_VALUE)}c` : 'Scrap'} disabled={standard === 0} onPress={onScrap} />
        </Row>
      </Card>

      {rares.length > 0 && (
        <>
          <Heading>Rare parts</Heading>
          <Card accent={t.rare}>
            {rares.map(([id, n]) => (
              <View key={id}>
                <Body>
                  {partName(id)}
                  {n > 1 && <Text style={{ color: t.muted }}> ×{n}</Text>}
                </Body>
                <Muted>Unlocks {getBoatClass(getPart(id).setId).name} in the Shipyard</Muted>
              </View>
            ))}
          </Card>
        </>
      )}

      <Heading>Sets</Heading>
      {sets.length === 0 && <Muted>No set pieces yet. Legendary pieces drop in rough water and storms; mythic pieces only in storms.</Muted>}
      {sets.map(({ cls, have }) => {
        const complete = have.length === cls.requiredParts.length
        const ability = getAbility(cls.abilityId)
        const color = rarityColor(cls.rarity)
        return (
          <Card key={cls.id} accent={complete ? color : undefined}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row>
                <Body style={{ fontWeight: '700' }}>{cls.name}</Body>
                <Tag label={cls.rarity.toUpperCase()} color={color} dark />
              </Row>
              <Muted>
                {have.length} of {cls.requiredParts.length}
              </Muted>
            </Row>
            <Muted>
              T{cls.sizeTier} {cls.track} · {ability?.description}
              {cls.rarity === 'mythic' && ' · never sold, at any price'}
            </Muted>
            <Row style={{ gap: 6 }}>
              {cls.requiredParts.map((id) => {
                const p = getPart(id)
                const got = counts.has(id)
                return (
                  <View key={id} style={{ borderWidth: 1, borderColor: got ? color : t.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: got ? t.text : t.muted, fontFamily: fonts.medium, fontSize: 12 }}>
                      {got ? '✓' : '○'} {slotName(p.type, p.track)}
                    </Text>
                  </View>
                )
              })}
            </Row>
            {complete && <Button label={`Build ${cls.name}`} onPress={() => onCraft(cls.id)} />}
            {!complete && owned.has(cls.id) && <Muted>In your fleet</Muted>}
          </Card>
        )
      })}
      <Pressable onPress={() => setShowAllSets(!showAllSets)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
        <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 14 }}>{showAllSets ? 'Show sets in progress' : 'Show every set'}</Text>
      </Pressable>

      {melts.length > 0 && (
        <>
          <Heading>Spares</Heading>
          {melts.map((g) => (
            <Card key={`${g.rarity}/${g.slot}/${g.track}`}>
              <Body>
                {g.spares.length} spare {g.rarity} {slotName(g.slot, g.track).toLowerCase()} ({g.track})
              </Body>
              <Button small kind="secondary" label={`Melt ${MELT_COST} → 1 new ${g.rarity}`} onPress={() => onMelt(g.rarity, g.slot, g.track)} />
            </Card>
          ))}
        </>
      )}
    </View>
  )
}
