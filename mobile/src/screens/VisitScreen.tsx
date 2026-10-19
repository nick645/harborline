// One port on one screen: its town (sized to fit), name and weather, and a menu of what you
// can do there. Each choice opens its own page: the quay, the tavern, sending a boat, and the
// harbour office.

import { View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { getBoatClass, routeDistance } from '../../../src/game/economy'
import { quoteVoyage } from '../../../src/game/state'
import { routeWeather } from '../../../src/game/weather'
import { getPortDef, homeOf } from '../../../src/game/regions'
import { portPeople } from '../../../src/game/crew'
import { HOME_PORT_ID, HOME_PRICE, getRegion } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import type { ScoutAction } from '../../../src/game/data/captains'
import { coins, duration } from '../../../src/format'
import { PortScene } from '../art/PortScene'
import { lightAt } from '../art/light'
import { REGION_STYLE } from '../art/regionStyle'
import { homeTavern } from '../homeTavern'
import { useTheme } from '../theme'
import { HiringScreen, type CaptainsView } from '../components/CaptainsScreen'
import { Body, Button, Card, Measure, Muted, Row, Strip, Tag, Tile, Title } from '../components/ui'

export type VisitPage = 'menu' | 'quay' | 'tavern' | 'send' | 'office'

type Props = {
  game: GameState
  portId: string
  now: number
  onSend: (boatId: string, routeId: string, trips: number) => void
  onScout: (id: string, action: ScoutAction) => Promise<boolean>
  onHire: (id: string) => void
  onBuyDrink: (handId: string) => Promise<boolean>
  onHireHand: (handId: string, boatId: string) => void
  onOpenCaptain: (id: string) => void
  onMoveHome: (portId: string) => void
  /** Which page of the port; kept by the caller so other screens can send you straight to a tavern. */
  page: VisitPage
  onPage: (p: VisitPage) => void
}

const SIZE = { village: 'Village', town: 'Town', city: 'City' } as const

export function VisitScreen(props: Props) {
  const { game, portId, now, onSend, onMoveHome, page, onPage, ...people } = props
  const t = useTheme()
  const port = getPortDef(portId)
  const region = getRegion(port.region)
  const route = game.routes.find((r) => r.portB === portId)
  const home = portId === homeOf(game)
  const owned = (game.player.homesOwned ?? [HOME_PORT_ID]).includes(portId)
  const price = owned ? 0 : HOME_PRICE[port.region]
  const busy = game.player.ownedBoats.some((b) => b.state !== 'idle')
  const weather = route ? routeWeather(game, route.id, now) : null
  const docked = game.player.ownedBoats.filter((b) => b.state === 'idle' && b.captainId && !b.managedBy)
  const here = portPeople(game, portId)
  const tavern = home ? homeTavern(game).name : REGION_STYLE[port.region].tavern

  if (page === 'quay' || page === 'tavern') {
    const view: CaptainsView = page
    return (
      <View style={{ flex: 1, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Button small kind="secondary" label={`‹ ${port.name}`} onPress={() => onPage('menu')} />
        </Row>
        <HiringScreen game={game} now={now} portId={portId} view={view} onView={onPage} {...people} />
      </View>
    )
  }

  if (page === 'send' && route) {
    return (
      <View style={{ flex: 1, gap: 10 }}>
        <Row>
          <Button small kind="secondary" label={`‹ ${port.name}`} onPress={() => onPage('menu')} />
          {weather && <Tag label={WEATHER[weather].name} color={t[weather]} />}
          <Muted>{routeDistance(route)} leagues</Muted>
        </Row>
        <Title size={24}>Send a boat to {port.name}</Title>
        <Muted>
          Demand: cargo ×{route.demandCargo.toFixed(2)} · passengers ×{route.demandPassenger.toFixed(2)}
        </Muted>
        {docked.length === 0 ? (
          <Muted>No boats are docked with a captain aboard right now.</Muted>
        ) : (
          <Strip>
            {docked.map((b) => {
              const cls = getBoatClass(b.classId)
              const trips = cls.fuelTankTrips
              const q = quoteVoyage(game, b.id, route.id, now)
              return (
                <Card key={b.id} style={{ width: 180 }}>
                  <Body style={{ fontWeight: '700' }}>{b.nickname}</Body>
                  <Muted>
                    {coins(q.payout)}c a trip · {trips} × {duration(q.durationMs)}
                  </Muted>
                  <Muted>−{q.worstDamage} hull at worst</Muted>
                  <Button small label={q.blocked ?? `Send ×${trips}`} disabled={!!q.blocked} onPress={() => onSend(b.id, route.id, trips)} />
                </Card>
              )
            })}
          </Strip>
        )}
      </View>
    )
  }

  if (page === 'office') {
    return (
      <View style={{ flex: 1, gap: 10 }}>
        <Row>
          <Button small kind="secondary" label={`‹ ${port.name}`} onPress={() => onPage('menu')} />
        </Row>
        <Title size={24}>{owned ? `Your harbour office in ${port.name}` : `The harbour office in ${port.name}`}</Title>
        <Body style={{ fontSize: 14 }}>
          Make {port.name} home: your fleet sails from here, and its quay and tavern become your own. Port upgrades, your harbour's look and your
          tavern come with you.{owned ? ' You own it, so moving back is free.' : ''}
        </Body>
        {busy && <Muted>Bring every boat into port (and raise any wrecks) first.</Muted>}
        <Button label={owned ? `Move home to ${port.name}` : `Buy and move home · ${coins(price)}c`} disabled={busy || game.player.coins < price} onPress={() => onMoveHome(portId)} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Measure>{(w, h) => <PortScene width={Math.min(w, 720)} height={h} light={lightAt(now)} port={port} />}</Measure>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Title size={24}>{port.name}</Title>
        {weather && <Tag label={WEATHER[weather].name} color={t[weather]} />}
      </Row>
      <Muted>
        {SIZE[port.size]} · {region.name}
        {home ? ' · your home port' : route ? ` · ${routeDistance(route)} leagues from home` : ''}
      </Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Tile label="The quay" sub={`${here.recruits.length} captain${here.recruits.length === 1 ? '' : 's'} looking for work`} onPress={() => onPage('quay')} />
        <Tile
          label={tavern}
          sub={`${here.hands.length} hand${here.hands.length === 1 ? '' : 's'}${here.captain ? ' · ✦ someone unusual' : ''}`}
          accent={here.captain ? t.legendary : undefined}
          onPress={() => onPage('tavern')}
        />
        {route && <Tile label="Send a boat" sub={`${docked.length} docked and ready`} onPress={() => onPage('send')} />}
        {!home && port.size !== 'village' && (
          <Tile label="Harbour office" sub={owned ? 'Yours · move home for free' : `For sale · ${coins(price)}c`} onPress={() => onPage('office')} />
        )}
      </View>
    </View>
  )
}
