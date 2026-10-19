import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Boat, GameState } from '../../../src/game/types'
import { canBeSold, getBoatClass, getPort, handFee, handsNeeded, sellPrice } from '../../../src/game/economy'
import { adriftDeadline, getVoyage, isAutomated, managerOf, quoteVoyage, repairQuote, salvageQuote } from '../../../src/game/state'
import { abilityOf } from '../../../src/game/abilities'
import { availableCaptains, captainViewById, handViewsOn, knownCrewEffect, managersFor } from '../../../src/game/crew'
import { LOW_CONDITION_THRESHOLD, SALVAGE_CONDITION } from '../../../src/game/data/economy'
import { WEATHER } from '../../../src/game/data/weather'
import { coins, duration, percent } from '../../../src/format'
import { Canvas } from '@shopify/react-native-skia'
import { fonts, useTheme } from '../theme'
import { BoatArt } from '../art/BoatArt'
import { boatWidth } from '../art/boatGeometry'
import { LIGHT } from '../art/light'
import { Body, Button, Card, Muted, Row, Strip, Tag } from './ui'

export type Props = {
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
  /** Hand her to a manager, or (null) take her back. */
  onManage: (managerId: string | null) => void
  /** Go to the tavern to hire hands. */
  onFindHands: () => void
  /** Open the live view of this boat; absent when already on it. */
  onOpen?: () => void
  onOpenCaptain: (captainId: string) => void
}

/** A small drawing of the boat for her card. */
function BoatThumb({ cls, condition }: { cls: ReturnType<typeof getBoatClass>; condition: number }) {
  const W = boatWidth(cls)
  const scale = 60 / W
  return (
    <Canvas style={{ width: 64, height: 44 }}>
      <BoatArt cls={cls} light={LIGHT.day} x={2} y={32} scale={scale} condition={condition} />
    </Canvas>
  )
}

const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`

/** One boat in the Fleet tab's row: her picture, name, where she is and her hull. */
export function BoatChip({ game, boat, now, onOpen }: { game: GameState; boat: Boat; now: number; onOpen: () => void }) {
  const t = useTheme()
  const cls = getBoatClass(boat.classId)
  const cond = boat.condition
  const condColor = cond <= 20 ? t.bad : cond < LOW_CONDITION_THRESHOLD ? t.warn : t.good
  const v = getVoyage(game, boat.id)
  const dest = v ? getPort(game.routes.find((r) => r.id === v.routeId)!.portB).name : null
  const status =
    boat.state === 'sunk'
      ? 'Sunk'
      : boat.state === 'idle'
        ? boat.captainId
          ? 'Docked · ready'
          : 'Docked · no captain'
        : `${boat.state === 'sailing' ? 'To' : 'From'} ${dest} · ${duration((boat.etaMs ?? now) - now)}`
  const attention = boat.state === 'sunk' || (boat.state === 'idle' && !isAutomated(game, boat))
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${boat.nickname}, ${status}`}
      style={({ pressed }) => [styles.chip, { backgroundColor: t.surface, borderColor: boat.state === 'sunk' ? t.bad : attention ? t.accent : t.border, opacity: pressed ? 0.8 : 1 }]}
    >
      <BoatThumb cls={cls} condition={boat.condition} />
      <Text numberOfLines={1} style={{ color: t.text, fontFamily: fonts.title, fontSize: 17 }}>
        {boat.nickname}
      </Text>
      <Text numberOfLines={1} style={{ color: boat.state === 'sunk' ? t.bad : t.muted, fontFamily: fonts.body, fontSize: 12 }}>
        {status}
      </Text>
      <View style={[styles.condTrack, { backgroundColor: t.surface2, width: '100%' }]}>
        <View style={{ width: `${cond}%`, height: '100%', backgroundColor: condColor }} />
      </View>
    </Pressable>
  )
}

/** Where she can go now (or her trip, or her wreck). */
export function SendPanel(props: Props) {
  const { game, boat } = props
  if (boat.state === 'sunk') return <Sunk {...props} />
  if (boat.state === 'idle' && isAutomated(game, boat)) return <Muted>Docked · her manager sends her out again when the water is calm enough.</Muted>
  if (boat.state === 'idle') return <Docked {...props} />
  return <AtSea {...props} />
}

/** Who's aboard: her captain, her hands, and her manager. */
export function CrewPanel(props: Props) {
  return <CrewLine {...props} />
}

/** Her hull and what she is: condition, ability, repair and sale. */
export function HullPanel({ game, boat, canSell, onRepair, onSell }: Props) {
  const t = useTheme()
  const cls = getBoatClass(boat.classId)
  const ability = abilityOf(boat)
  const cond = boat.condition
  const condColor = cond <= 20 ? t.bad : cond < LOW_CONDITION_THRESHOLD ? t.warn : t.good
  const fix = repairQuote(game, boat.id)
  const rarityColor = cls.rarity === 'common' ? null : t[cls.rarity]
  return (
    <View style={{ gap: 8 }}>
      <Row>
        <Muted>
          {cls.name} · {cls.track === 'cargo' ? 'Cargo' : 'Passenger'} · tier {cls.sizeTier} · {cls.track === 'cargo' ? 'cargo' : 'seats'} {cls.capacity} · fuel for {cls.fuelTankTrips}
        </Muted>
        {rarityColor && <Tag label={cls.rarity.toUpperCase()} color={rarityColor} />}
      </Row>
      <Row style={{ flexWrap: 'nowrap' }}>
        <Muted>Hull</Muted>
        <View style={[styles.condTrack, { backgroundColor: t.surface2, flex: 1, width: undefined }]}>
          <View style={{ width: `${cond}%`, height: '100%', backgroundColor: condColor }} />
        </View>
        <Text style={{ color: condColor, fontSize: 13, fontFamily: fonts.bold }}>{cond}</Text>
      </Row>
      {ability && (
        <Muted>
          <Text style={{ fontFamily: fonts.bold, color: t.text }}>{ability.name}:</Text> {ability.description}
          {ability.inactiveReason ? ` (${ability.inactiveReason})` : ''}
        </Muted>
      )}
      {boat.state === 'idle' && (
        <Row>
          <Button small label={fix > 0 ? `Repair ${coins(fix)}c` : 'Hull is sound'} disabled={fix === 0 || game.player.coins < 2} onPress={onRepair} />
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
      )}
    </View>
  )
}

function CrewLine({ game, boat, now, onCaptain, onManage, onFindHands, onOpenCaptain }: Props) {
  const t = useTheme()
  const captain = captainViewById(game, boat.captainId)
  const effect = knownCrewEffect(game, boat.id, now)
  const manager = managerOf(game, boat)
  const managers = boat.state === 'idle' && !manager ? managersFor(game, boat.id) : []
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
      <Hands game={game} boat={boat} onFindHands={onFindHands} />
      {manager && (
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Muted style={{ flex: 1 }}>
            Run by <Text style={{ color: t.text, fontFamily: fonts.semibold }}>{manager.name}</Text> ·{' '}
            {isAutomated(game, boat) ? 'earns less, avoids rough water, finds no rare parts' : 'send her out once to start'}
          </Muted>
          {boat.managedBy && <Button small kind="secondary" label="Take back" onPress={() => onManage(null)} />}
        </Row>
      )}
      {managers.length > 0 && (
        <Row>
          {managers.map((m) => (
            <Button key={m.id} small kind="secondary" label={`Hand to ${m.name.split(' ')[0]}`} onPress={() => onManage(m.id)} />
          ))}
        </Row>
      )}
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

/** Deckhands: who's aboard (with what you know of them), and the way to the tavern for the rest. */
function Hands({ game, boat, onFindHands }: { game: GameState; boat: Boat; onFindHands: () => void }) {
  const t = useTheme()
  const cls = getBoatClass(boat.classId)
  const need = handsNeeded(cls)
  if (need === 0 || boat.state === 'sunk') return null
  const aboard = handViewsOn(game, boat.id)
  const missing = need - aboard.length
  return (
    <View style={{ gap: 4 }}>
      <Muted style={{ color: missing ? t.bad : t.muted }}>
        Deckhands {aboard.length}/{need}
        {aboard.length ? `: ${aboard.map((h) => `${h.name.split(' ')[0]}${h.known ? ` (${h.known.name.toLowerCase()})` : ''}`).join(', ')}` : ''}
        {missing ? ` · short-handed, trips take ${Math.round(missing * 20)}% longer` : ''}
      </Muted>
      {missing > 0 && <Button small kind="secondary" label={`Find ${missing} at the tavern · ${coins(handFee(cls))}c each`} onPress={onFindHands} />}
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

function Docked({ game, boat, now, onAssign }: Props) {
  const t = useTheme()
  const cls = getBoatClass(boat.classId)
  const tank = cls.fuelTankTrips
  const [trips, setTrips] = useState(tank)
  // The bay first, then farther waters; the last route run leads.
  const routes = [...game.routes].sort((x, y) => (x.id === boat.currentRoute ? -1 : y.id === boat.currentRoute ? 1 : 0))
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
      <Strip>
        {routes.map((r) => {
          const q = quoteVoyage(game, boat.id, r.id, now)
          return (
            <View key={r.id} style={{ width: 168 }}>
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
      </Strip>
    </View>
  )
}

function Sunk({ game, boat, now, onSalvage }: Props) {
  const t = useTheme()
  const route = game.routes.find((r) => r.id === boat.currentRoute)
  const cost = salvageQuote(game, boat.id)
  const deadline = adriftDeadline(game, boat)
  const captain = captainViewById(game, boat.captainId)
  const left = deadline ? deadline - now : 0
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <Body style={{ fontWeight: '700' }}>Sunk{route ? ` on the way to ${getPort(route.portB).name}` : ''}.</Body>
        <Button small label={`Salvage ${coins(cost)}c`} disabled={game.player.coins < cost} onPress={onSalvage} />
        <Muted>Back at {SALVAGE_CONDITION} condition</Muted>
      </Row>
      {deadline && captain && (
        <Text style={{ color: left < 60 * 60 * 1000 ? t.bad : t.accent, fontFamily: fonts.semibold, fontSize: 13 }}>
          {captain.name} is clinging to the wreckage. Raise her within {duration(Math.max(0, left))} or they'll be lost at sea.
        </Text>
      )}
      {!captain && <Muted>No one's waiting on her now. She can still be raised.</Muted>}
    </View>
  )
}

const styles = StyleSheet.create({
  condTrack: { width: 60, height: 8, borderRadius: 4, overflow: 'hidden' },
  chip: { width: 132, borderWidth: 1, borderRadius: 14, padding: 8, gap: 3, alignItems: 'flex-start' },
  routeCard: { padding: 8, gap: 4 },
})
