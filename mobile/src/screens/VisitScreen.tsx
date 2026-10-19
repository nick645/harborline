// One port: the town seen from the water, what a trip there pays and its weather now, your
// docked boats ready to send, and the port's own quay and tavern.

import { useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { getBoatClass, routeDistance } from '../../../src/game/economy'
import { quoteVoyage } from '../../../src/game/state'
import { routeWeather } from '../../../src/game/weather'
import { getPortDef } from '../../../src/game/regions'
import { HOME_PORT_ID, getRegion } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import type { ScoutAction } from '../../../src/game/data/captains'
import { coins, duration } from '../../../src/format'
import { PortScene } from '../art/PortScene'
import { lightAt } from '../art/light'
import { useTheme } from '../theme'
import { CaptainsScreen, type CaptainsView } from '../components/CaptainsScreen'
import { Body, Button, Card, Heading, Muted, Row, Tag, Title } from '../components/ui'

type Props = {
  game: GameState
  portId: string
  now: number
  onSend: (boatId: string, routeId: string, trips: number) => void
  onScout: (id: string, action: ScoutAction) => boolean
  onHire: (id: string) => void
  onBuyDrink: (handId: string) => boolean
  onHireHand: (handId: string, boatId: string) => void
  onOpenCaptain: (id: string) => void
}

const SIZE = { village: 'Village', town: 'Town', city: 'City' } as const

export function VisitScreen({ game, portId, now, onSend, ...people }: Props) {
  const t = useTheme()
  const { width } = useWindowDimensions()
  const port = getPortDef(portId)
  const region = getRegion(port.region)
  const route = game.routes.find((r) => r.portB === portId)
  const [view, setView] = useState<CaptainsView>('quay')
  const home = portId === HOME_PORT_ID
  const weather = route ? routeWeather(game, route.id, now) : null
  const docked = game.player.ownedBoats.filter((b) => b.state === 'idle' && b.captainId && !b.managedBy)

  return (
    <View style={{ gap: 12 }}>
      <PortScene width={Math.min(width - 24, 720)} light={lightAt(now)} port={port} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title size={26}>{port.name}</Title>
          {weather && <Tag label={WEATHER[weather].name} color={t[weather]} />}
        </Row>
        <Muted>
          {SIZE[port.size]} · {region.name}
          {route ? ` · ${routeDistance(route)} leagues from home` : ' · your home port'}
        </Muted>
        <Body style={{ fontSize: 14, color: '#e2d2c8' }}>{region.blurb}</Body>
        {route && (
          <Muted>
            Demand here: cargo ×{route.demandCargo.toFixed(2)} · passengers ×{route.demandPassenger.toFixed(2)}
          </Muted>
        )}
      </Card>

      {route && (
        <>
          <Heading>Send a boat</Heading>
          {docked.length === 0 ? (
            <Muted>No boats are docked with a captain aboard right now.</Muted>
          ) : (
            docked.map((b) => {
              const cls = getBoatClass(b.classId)
              const trips = cls.fuelTankTrips
              const q = quoteVoyage(game, b.id, route.id, now)
              return (
                <Card key={b.id}>
                  <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Body style={{ fontWeight: '700' }}>{b.nickname}</Body>
                      <Muted>
                        {coins(q.payout)}c a trip · {trips} × {duration(q.durationMs)} · −{q.worstDamage} worst
                      </Muted>
                    </View>
                    <Button small label={q.blocked ?? `Send ×${trips}`} disabled={!!q.blocked} onPress={() => onSend(b.id, route.id, trips)} />
                  </Row>
                </Card>
              )
            })
          )}
        </>
      )}

      <Heading>{home ? 'Hiring at home' : `Hiring in ${port.name}`}</Heading>
      <CaptainsScreen game={game} now={now} portId={portId} view={view === 'roster' ? 'quay' : view} onView={setView} {...people} />
    </View>
  )
}
