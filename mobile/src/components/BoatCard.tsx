import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Boat, GameState } from '../../../src/game/types'
import { canBeSold, getBoatClass, getPort, sellPrice } from '../../../src/game/economy'
import { getVoyage, isAutomated, managerOf, quoteVoyage, repairQuote, salvageQuote } from '../../../src/game/state'
import { abilityOf } from '../../../src/game/abilities'
import { availableCaptains, captainViewById, knownCrewEffect } from '../../../src/game/crew'
import { LOW_CONDITION_THRESHOLD, SALVAGE_CONDITION } from '../../../src/game/data/economy'
import { WEATHER } from '../../../src/game/data/weather'
import { coins, duration, percent } from '../../../src/format'
import { Canvas } from '@shopify/react-native-skia'
import { fonts, useTheme } from '../theme'
import { BoatArt } from '../art/BoatArt'
import { boatWidth } from '../art/boatGeometry'
import { LIGHT } from '../art/light'
import { Body, Button, Card, Muted, Row, Tag, Title } from './ui'

type Props = {
  game: GameState
  boat: Boat
  now: number
  canSell: boolean
  onAssign: (routeId: string, trips: number) => void
  onRecall: () => void
  onRepair: () => void
  onSell: () => void
  onSalvage: () => void
  onCaptain: (captainId: string) => void
  /** Open the live view of this boat; absent when already on it. */
  onOpen?: () => void
  onOpenCaptain: (captainId: string) => void
}

/** A small drawing of the boat for her card. */
function BoatThumb({ cls }: { cls: ReturnType<typeof getBoatClass> }) {
  const W = boatWidth(cls)
  const scale = 60 / W
  return (
    <Canvas style={{ width: 64, height: 44 }}>
      <BoatArt cls={cls} light={LIGHT.golden} x={2} y={32} scale={scale} />
    </Canvas>
  )
}

const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`

export function BoatCard(props: Props) {
  const { game, boat } = props
  const t = useTheme()
  const cls = getBoatClass(boat.classId)
  const ability = abilityOf(boat)
  const cond = boat.condition
  const condColor = cond <= 20 ? t.bad : cond < LOW_CONDITION_THRESHOLD ? t.warn : t.good
  const rarityColor = cls.rarity === 'common' ? null : t[cls.rarity]

  return (
    <Card accent={boat.state === 'idle' ? t.accent : boat.state === 'sunk' ? t.bad : undefined}>
      <Pressable
        onPress={props.onOpen}
        disabled={!props.onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Watch ${boat.nickname}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <BoatThumb cls={cls} />
        <View style={{ flex: 1 }}>
          <Row>
            <Title size={21}>{boat.nickname}</Title>
            {rarityColor && <Tag label={cls.rarity.toUpperCase()} color={rarityColor} />}
          </Row>
          <Muted>
            {cls.name} · {cls.track === 'cargo' ? 'Cargo' : 'Passenger'} · T{cls.sizeTier} · cap {cls.capacity}
          </Muted>
          {props.onOpen && <Muted style={{ color: t.accent }}>Watch her ›</Muted>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={[styles.condTrack, { backgroundColor: t.surface2 }]}>
            <View style={{ width: `${cond}%`, height: '100%', backgroundColor: condColor }} />
          </View>
          <Text style={{ color: condColor, fontSize: 12, fontFamily: fonts.bold }}>{cond}</Text>
        </View>
      </Pressable>

      {ability && (
        <Muted>
          <Text style={{ fontFamily: fonts.bold, color: t.text }}>{ability.name}:</Text> {ability.description}
          {ability.inactiveReason ? ` (${ability.inactiveReason})` : ''}
        </Muted>
      )}

      <CrewLine {...props} />

      {boat.state === 'sunk' ? (
        <Sunk {...props} />
      ) : boat.state === 'idle' && isAutomated(game, boat) ? (
        <Muted>Docked · leaves again when the water is calm enough</Muted>
      ) : boat.state === 'idle' ? (
        <Docked {...props} />
      ) : (
        <AtSea {...props} />
      )}
    </Card>
  )
}

function CrewLine({ game, boat, now, onCaptain, onOpenCaptain }: Props) {
  const t = useTheme()
  const captain = captainViewById(game, boat.captainId)
  const effect = knownCrewEffect(game, boat.id, now)
  const manager = managerOf(game, boat)
  const spare = boat.state === 'idle' ? availableCaptains(game, boat.id).filter((c) => c.id !== boat.captainId) : []
  const parts = effect
    ? [
        Math.abs(effect.pay) >= 0.005 && `pay ${signed(effect.pay)}`,
        Math.abs(effect.stormDamage) >= 0.005 && `storm damage ${signed(effect.stormDamage)}`,
        Math.abs(effect.speed) >= 0.005 && `speed ${signed(effect.speed)}`,
        effect.refusesStorm && 'won’t sail into storms',
      ].filter(Boolean)
    : []
  return (
    <View style={{ gap: 6 }}>
      {captain ? (
        <Pressable onPress={() => onOpenCaptain(captain.id)} accessibilityRole="button" accessibilityLabel={`Open Captain ${captain.name}`}>
          <Muted>
            Captain <Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{captain.name}</Text> {'⚓︎'.repeat(captain.reputation)} · best guess:{' '}
            {parts.length ? parts.join(', ') : 'no effect known yet'}
          </Muted>
        </Pressable>
      ) : boat.state === 'sunk' ? null : (
        <Text style={{ color: t.bad, fontFamily: fonts.bold, fontSize: 13 }}>
          No captain aboard: she can’t sail.{spare.length === 0 ? ' Hire one in Captains.' : ''}
        </Text>
      )}
      {manager && <Muted>Run by {manager.name}</Muted>}
      {spare.length > 0 && (
        <Row>
          {spare.slice(0, 3).map((c) => (
            <Button key={c.id} small kind="secondary" label={`Put ${c.name.split(' ')[0]} aboard`} onPress={() => onCaptain(c.id)} />
          ))}
        </Row>
      )}
    </View>
  )
}

function AtSea({ game, boat, now, onRecall }: Props) {
  const t = useTheme()
  const v = getVoyage(game, boat.id)
  if (!v) return null
  const dest = getPort(game.routes.find((r) => r.id === v.routeId)!.portB).name
  const eta = duration((boat.etaMs ?? now) - now)
  const weather = v.weatherAtStart ?? 'calm'
  const left = v.tripsTotal - v.tripIndex
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <Body style={{ fontWeight: '700' }}>
          Trip {v.tripIndex}/{v.tripsTotal}
        </Body>
        <Tag label={WEATHER[weather].name} color={t[weather]} />
        <Body>
          {v.lost
            ? `Cargo lost. Limping home · ${eta}`
            : boat.state === 'sailing'
              ? `To ${dest} · ${eta} · pays ${coins(v.payout)}`
              : `Back from ${dest} · ${eta}`}
        </Body>
      </Row>
      {left > 0 ? (
        <Row>
          <Button small kind="secondary" label="Return after this trip" onPress={onRecall} />
          <Muted>
            {left} more trip{left === 1 ? '' : 's'} queued
          </Muted>
        </Row>
      ) : (
        <Muted>Last trip: docks when it gets home.</Muted>
      )}
    </View>
  )
}

function Docked({ game, boat, now, canSell, onAssign, onRepair, onSell }: Props) {
  const t = useTheme()
  const cls = getBoatClass(boat.classId)
  const tank = cls.fuelTankTrips
  const [trips, setTrips] = useState(tank)
  const fix = repairQuote(game, boat.id)
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Muted>Docked · trips (fuel for {tank})</Muted>
        <Row>
          <Button small kind="secondary" label="−" disabled={trips <= 1} onPress={() => setTrips(trips - 1)} />
          <Body style={{ fontWeight: '700', minWidth: 22, textAlign: 'center' }}>{trips}</Body>
          <Button small kind="secondary" label="+" disabled={trips >= tank} onPress={() => setTrips(trips + 1)} />
        </Row>
      </Row>
      <View style={styles.routes}>
        {game.routes.map((r) => {
          const q = quoteVoyage(game, boat.id, r.id, now)
          return (
            <View key={r.id} style={styles.routeCell}>
              <Card
                style={[
                  styles.routeCard,
                  { backgroundColor: t.surface2, borderColor: q.canSink ? t.bad : boat.currentRoute === r.id ? t.accent : t.border },
                ]}
              >
                <Row>
                  <Body style={{ fontWeight: '700', fontSize: 14 }}>{getPort(r.portB).name}</Body>
                  <Tag label={WEATHER[q.weather].name} color={t[q.weather]} />
                </Row>
                <Text style={{ fontSize: 20, fontFamily: fonts.title, color: q.payout > 0 ? t.accent : t.bad }}>
                  {coins(q.payout)}c <Text style={{ fontSize: 11, fontFamily: fonts.body, color: t.muted }}>/trip now</Text>
                </Text>
                <Muted style={{ fontSize: 11 }}>
                  {trips} × {duration(q.durationMs)} · −{q.worstDamage} worst
                  {q.lossRisk > 0 ? ` · ${percent(q.lossRisk)} lose cargo` : ''}
                </Muted>
                {q.canSink && <Text style={{ color: t.bad, fontSize: 11, fontFamily: fonts.bold }}>Could sink</Text>}
                <Button small label={q.blocked ?? 'Send'} disabled={!!q.blocked} onPress={() => onAssign(r.id, trips)} />
              </Card>
            </View>
          )
        })}
      </View>
      <Row>
        <Button small label={fix > 0 ? `Repair ${coins(fix)}c` : 'Repair'} disabled={fix === 0 || game.player.coins < 2} onPress={onRepair} />
        {canBeSold(cls) && (
          <Button
            small
            kind="danger"
            label={`Sell ${coins(sellPrice(cls))}c`}
            disabled={!canSell}
            onPress={() =>
              Alert.alert(`Sell ${boat.nickname}?`, `For ${coins(sellPrice(cls))} coins.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sell', style: 'destructive', onPress: onSell },
              ])
            }
          />
        )}
      </Row>
    </View>
  )
}

function Sunk({ game, boat, onSalvage }: Props) {
  const route = game.routes.find((r) => r.id === boat.currentRoute)
  const cost = salvageQuote(game, boat.id)
  return (
    <Row>
      <Body style={{ fontWeight: '700' }}>Sunk{route ? ` on the way to ${getPort(route.portB).name}` : ''}.</Body>
      <Button small label={`Salvage ${coins(cost)}c`} disabled={game.player.coins < cost} onPress={onSalvage} />
      <Muted>Back at {SALVAGE_CONDITION} condition</Muted>
    </Row>
  )
}

const styles = StyleSheet.create({
  condTrack: { width: 60, height: 8, borderRadius: 4, overflow: 'hidden' },
  routes: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  routeCell: { width: '50%', padding: 4 },
  routeCard: { padding: 8, gap: 4 },
})
