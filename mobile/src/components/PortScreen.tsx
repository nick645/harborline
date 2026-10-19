// The home port's works: upgrades to build, and the workshop where parts become boats. Each is
// one page of the Home tab, laid out to fit the screen (long lists swipe sideways).

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
import { Canvas, Group } from '@shopify/react-native-skia'
import { BoatArt } from '../art/BoatArt'
import { boatWidth } from '../art/boatGeometry'
import { LIGHT } from '../art/light'
import { fonts, useTheme } from '../theme'
import { Body, Button, Card, Heading, Muted, Row, Strip, Tag } from './ui'

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

export function Workshop({
  game,
  onCraft,
  onScrap,
  onMelt,
}: {
  game: GameState
  onCraft: (classId: string) => void
  onScrap: () => void
  onMelt: (rarity: PartRarity, slot: PartType, track: Track) => void
}) {
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
      <Card style={{ paddingVertical: 9 }}>
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
          <Strip>
            {rares.map(([id, n]) => (
              <Card key={id} accent={t.rare} style={{ width: 170, paddingVertical: 8, gap: 2 }}>
                <Body style={{ fontSize: 14 }}>
                  {partName(id)}
                  {n > 1 && <Text style={{ color: t.muted }}> ×{n}</Text>}
                </Body>
                <Muted style={{ fontSize: 12 }}>Unlocks {getBoatClass(getPart(id).setId).name} in the Shipyard</Muted>
              </Card>
            ))}
          </Strip>
        </>
      )}

      <Row style={{ justifyContent: 'space-between' }}>
        <Heading>Sets</Heading>
        <Pressable onPress={() => setShowAllSets(!showAllSets)} accessibilityRole="button">
          <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 13 }}>{showAllSets ? 'Sets in progress' : 'Every set'}</Text>
        </Pressable>
      </Row>
      {sets.length === 0 ? (
        <Muted>No set pieces yet. Legendary pieces drop in rough water and storms; mythic pieces only in storms.</Muted>
      ) : (
        <Strip>
          {sets.map(({ cls, have }) => {
            const complete = have.length === cls.requiredParts.length
            const ability = getAbility(cls.abilityId)
            const color = rarityColor(cls.rarity)
            return (
              <Card key={cls.id} accent={complete ? color : undefined} style={{ width: 230 }}>
                <SetBoat cls={cls} share={have.length / cls.requiredParts.length} />
                <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <Body style={{ fontWeight: '700', flexShrink: 1 }}>{cls.name}</Body>
                  <Muted>
                    {have.length}/{cls.requiredParts.length}
                  </Muted>
                </Row>
                <Tag label={cls.rarity.toUpperCase()} color={color} dark />
                <Muted style={{ fontSize: 12 }} numberOfLines={3}>
                  T{cls.sizeTier} {cls.track} · {ability?.description}
                  {cls.rarity === 'mythic' && ' · never sold, at any price'}
                </Muted>
                <Row style={{ gap: 4 }}>
                  {cls.requiredParts.map((id) => {
                    const p = getPart(id)
                    const got = counts.has(id)
                    return (
                      <View key={id} style={{ borderWidth: 1, borderColor: got ? color : t.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: got ? t.text : t.muted, fontFamily: fonts.medium, fontSize: 11 }}>
                          {got ? '✓' : '○'} {slotName(p.type, p.track)}
                        </Text>
                      </View>
                    )
                  })}
                </Row>
                {complete ? <Button small label={`Build ${cls.name}`} onPress={() => onCraft(cls.id)} /> : owned.has(cls.id) ? <Muted>In your fleet</Muted> : null}
              </Card>
            )
          })}
        </Strip>
      )}

      {melts.length > 0 && (
        <>
          <Heading>Spares</Heading>
          <Strip>
            {melts.map((g) => (
              <Card key={`${g.rarity}/${g.slot}/${g.track}`} style={{ width: 200, paddingVertical: 8 }}>
                <Body style={{ fontSize: 14 }}>
                  {g.spares.length} spare {g.rarity} {slotName(g.slot, g.track).toLowerCase()} ({g.track})
                </Body>
                <Button small kind="secondary" label={`Melt ${MELT_COST} → 1 new`} onPress={() => onMelt(g.rarity, g.slot, g.track)} />
              </Card>
            ))}
          </Strip>
        </>
      )}
    </View>
  )
}

/** The boat a set builds, faint until her parts are in. */
function SetBoat({ cls, share }: { cls: ReturnType<typeof getBoatClass>; share: number }) {
  const W = 206
  const H = 104
  const scale = Math.min((W - 12) / boatWidth(cls), (H * 0.85) / (0.5 * boatWidth(cls)))
  return (
    <Canvas style={{ width: W, height: H }}>
      <Group opacity={0.45 + 0.55 * share}>
        <BoatArt cls={cls} light={LIGHT.golden} x={(W - boatWidth(cls) * scale) / 2} y={H - 10} scale={scale} />
      </Group>
    </Canvas>
  )
}
