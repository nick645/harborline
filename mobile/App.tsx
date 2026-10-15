import { useEffect, useState } from 'react'
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useFonts, Cormorant_600SemiBold_Italic, Cormorant_700Bold } from '@expo-google-fonts/cormorant'
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow'
import type { Boat, GameState } from '../src/game/types'
import { assignRoute, buyBoat, recallBoat, repairBoat, salvageBoat, sellBoat } from '../src/game/state'
import { assignCaptain, fireCaptain, hireCaptain, promoteCaptain, scoutRecruit, takeOverCaptain, unassignCaptain } from '../src/game/crew'
import { getPart, partName } from '../src/game/parts'
import { seasonAt, seasonEndsAt } from '../src/game/weather'
import { fleetCap } from '../src/game/upgrades'
import { coins, duration } from '../src/format'
import { useGame } from './src/useGame'
import { fonts, useTheme } from './src/theme'
import { lightAt } from './src/art/light'
import { HarborMap } from './src/components/HarborMap'
import { BoatCard } from './src/components/BoatCard'
import { CaptainsScreen } from './src/components/CaptainsScreen'
import { ShipyardScreen } from './src/components/ShipyardScreen'
import { BoatScreen } from './src/screens/BoatScreen'
import { CaptainScreen } from './src/screens/CaptainScreen'
import { Body, Button, Card, Muted, Row, Title } from './src/components/ui'

type Tab = 'fleet' | 'captains' | 'shipyard' | 'log'
const TABS: { id: Tab; label: string }[] = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'captains', label: 'Captains' },
  { id: 'shipyard', label: 'Shipyard' },
  { id: 'log', label: 'Log' },
]

/** A screen opened on top of the tabs. */
type Detail = { kind: 'boat'; id: string } | { kind: 'captain'; id: string } | null

export default function App() {
  const [fontsLoaded] = useFonts({
    Cormorant_700Bold,
    Cormorant_600SemiBold_Italic,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  })
  return (
    <SafeAreaProvider>
      {fontsLoaded ? (
        <Harbor />
      ) : (
        <View style={[styles.center, { backgroundColor: '#2b1f2c' }]}>
          <ActivityIndicator color="#f2b45a" />
        </View>
      )}
    </SafeAreaProvider>
  )
}

function Harbor() {
  const t = useTheme()
  const { game, now, act, error, clearError, report, clearReport, reset } = useGame()
  const [tab, setTab] = useState<Tab>('fleet')
  const [stack, setStack] = useState<Detail[]>([])
  const detail = stack[stack.length - 1] ?? null
  const open = (d: Detail) => setStack((s) => [...s, d])
  const back = () => setStack((s) => s.slice(0, -1))

  // Android's back button closes the open screen before leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length === 0) return false
      back()
      return true
    })
    return () => sub.remove()
  }, [stack.length])

  if (!game) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    )
  }

  const boats = game.player.ownedBoats
  const season = seasonAt(now)
  const finds = report?.parts.filter((id) => getPart(id).rarity !== 'standard') ?? []

  const boatCard = (b: Boat, onOpen?: () => void) => (
    <BoatCard
      key={b.id}
      game={game}
      boat={b}
      now={now}
      canSell={boats.length > 1}
      onOpen={onOpen}
      onOpenCaptain={(id) => open({ kind: 'captain', id })}
      onAssign={(routeId, trips) => act((g, at) => assignRoute(g, b.id, routeId, at, trips))}
      onRecall={() => act((g) => recallBoat(g, b.id))}
      onRepair={() => act((g) => repairBoat(g, b.id))}
      onSell={() => act((g, at) => sellBoat(g, b.id, at))}
      onSalvage={() => act((g, at) => salvageBoat(g, b.id, at))}
      onCaptain={(captainId) => act((g) => assignCaptain(g, captainId, b.id))}
    />
  )

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {detail ? (
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 16 }}>‹ Back</Text>
          </Pressable>
        ) : (
          <View>
            <Title size={28} color={t.accent}>
              Harborline
            </Title>
            <Muted>
              {lightAt(now).label} · {season[0].toUpperCase() + season.slice(1)}
              {season === 'winter' ? ' · storm season' : ` · ${duration(seasonEndsAt(now) - now)} left`}
            </Muted>
          </View>
        )}
        <View style={{ alignItems: 'flex-end' }}>
          <Title size={24} color={t.accent}>{`${coins(game.player.coins)}c`}</Title>
          <Muted>
            {boats.length}/{fleetCap(game)} boats
          </Muted>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {report && (
          <Pressable onPress={clearReport}>
            <Card accent={report.sunk.length + report.lost.length ? t.bad : t.accent}>
              <Body>
                <Text style={{ fontFamily: fonts.bold }}>Welcome back.</Text> While you were away ({duration(report.awayMs)}), your fleet finished{' '}
                {report.tripsCompleted} trip{report.tripsCompleted === 1 ? '' : 's'} for {coins(report.coinsEarned)}c.
                {finds.length ? ` Found: ${finds.map(partName).join(', ')}.` : ''}
                {report.lost.length ? ` Cargo lost: ${report.lost.join(', ')}.` : ''}
                {report.sunk.length ? ` Sunk: ${report.sunk.join(', ')}.` : ''}
              </Body>
              <Muted>Tap to dismiss</Muted>
            </Card>
          </Pressable>
        )}
        {error && (
          <Pressable onPress={clearError}>
            <Card accent={t.bad}>
              <Body>{error}</Body>
            </Card>
          </Pressable>
        )}

        {detail ? (
          <DetailScreen detail={detail} game={game} now={now} open={open} act={act} boatCard={boatCard} />
        ) : (
          <>
            {tab === 'fleet' && (
              <>
                <HarborMap game={game} now={now} />
                {boats.map((b) => boatCard(b, () => open({ kind: 'boat', id: b.id })))}
              </>
            )}

            {tab === 'captains' && (
              <CaptainsScreen
                game={game}
                now={now}
                onScout={(id, a) => act((g) => scoutRecruit(g, id, a))}
                onHire={(id) => act((g, at) => hireCaptain(g, id, at))}
                onOpenCaptain={(id) => open({ kind: 'captain', id })}
              />
            )}

            {tab === 'shipyard' && <ShipyardScreen game={game} onBuy={(id) => act((g, at) => buyBoat(g, id, at))} />}

            {tab === 'log' && (
              <View style={{ gap: 6 }}>
                {game.log.length === 0 && <Muted>Nothing to report yet.</Muted>}
                {game.log.map((e, i) => (
                  <Body key={`${e.at}-${i}`} style={{ fontSize: 14, color: e.kind === 'sunk' || e.kind === 'lost' ? t.bad : t.text }}>
                    <Text style={{ color: t.muted, fontSize: 12 }}>{duration(now - e.at)} ago </Text>
                    {e.text}
                  </Body>
                ))}
                {__DEV__ && (
                  <Card style={{ marginTop: 12 }}>
                    <Muted>Play-test tools (development builds only)</Muted>
                    <Row>
                      <Button small kind="secondary" label="+10,000c" onPress={() => act((g) => ({ ...g, player: { ...g.player, coins: g.player.coins + 10_000 } }))} />
                      <Button small kind="danger" label="Reset game" onPress={() => void reset()} />
                    </Row>
                  </Card>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!detail && (
        <SafeAreaView edges={['bottom']} style={[styles.tabBar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
          {TABS.map((x) => (
            <Pressable key={x.id} onPress={() => setTab(x.id)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }}>
              <Text style={{ color: tab === x.id ? t.accent : t.muted, fontFamily: tab === x.id ? fonts.bold : fonts.medium, fontSize: 14 }}>{x.label}</Text>
            </Pressable>
          ))}
        </SafeAreaView>
      )}
    </SafeAreaView>
  )
}

function DetailScreen({
  detail,
  game,
  now,
  open,
  act,
  boatCard,
}: {
  detail: NonNullable<Detail>
  game: GameState
  now: number
  open: (d: Detail) => void
  act: (fn: (g: GameState, t: number) => GameState) => boolean
  boatCard: (b: Boat) => React.ReactNode
}) {
  if (detail.kind === 'boat') {
    const boat = game.player.ownedBoats.find((b) => b.id === detail.id)
    if (!boat) return <Muted>That boat is no longer in your fleet.</Muted>
    return <BoatScreen game={game} boat={boat} now={now} onOpenCaptain={(id) => open({ kind: 'captain', id })} controls={boatCard(boat)} />
  }
  return (
    <CaptainScreen
      game={game}
      captainId={detail.id}
      now={now}
      onOpenBoat={(id) => open({ kind: 'boat', id })}
      onAshore={(id) => act((g) => unassignCaptain(g, id))}
      onFire={(id) => act((g, at) => fireCaptain(g, id, at))}
      onTakeOver={(id) => act((g) => takeOverCaptain(g, id))}
      onPromote={(id, role, track) => act((g, at) => promoteCaptain(g, id, role, at, track))}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, minHeight: 56 },
  back: { paddingVertical: 10, paddingRight: 16 },
  content: { padding: 12, gap: 12, paddingBottom: 32 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
})
