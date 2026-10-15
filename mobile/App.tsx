import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { assignRoute, buyBoat, recallBoat, repairBoat, salvageBoat, sellBoat } from '../src/game/state'
import { assignCaptain, fireCaptain, hireCaptain, promoteCaptain, scoutRecruit, takeOverCaptain, unassignCaptain } from '../src/game/crew'
import { getPart, partName } from '../src/game/parts'
import { seasonAt, seasonEndsAt } from '../src/game/weather'
import { fleetCap } from '../src/game/upgrades'
import { coins, duration } from '../src/format'
import { useGame } from './src/useGame'
import { useTheme } from './src/theme'
import { HarborMap } from './src/components/HarborMap'
import { BoatCard } from './src/components/BoatCard'
import { CaptainsScreen } from './src/components/CaptainsScreen'
import { ShipyardScreen } from './src/components/ShipyardScreen'
import { Body, Button, Card, Muted, Row } from './src/components/ui'

type Tab = 'fleet' | 'captains' | 'shipyard' | 'log'
const TABS: { id: Tab; label: string }[] = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'captains', label: 'Captains' },
  { id: 'shipyard', label: 'Shipyard' },
  { id: 'log', label: 'Log' },
]

export default function App() {
  return (
    <SafeAreaProvider>
      <Harbor />
    </SafeAreaProvider>
  )
}

function Harbor() {
  const t = useTheme()
  const { game, now, act, error, clearError, report, clearReport, reset } = useGame()
  const [tab, setTab] = useState<Tab>('fleet')

  if (!game) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator />
      </View>
    )
  }

  const boats = game.player.ownedBoats
  const season = seasonAt(now)
  const finds = report?.parts.filter((id) => getPart(id).rarity !== 'standard') ?? []

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: t.text }]}>Harborline</Text>
          <Muted>
            {season[0].toUpperCase() + season.slice(1)} · {duration(seasonEndsAt(now) - now)} left
            {season === 'winter' ? ' · storm season' : ''}
          </Muted>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.coins, { color: t.text }]}>{coins(game.player.coins)}c</Text>
          <Muted>
            {boats.length}/{fleetCap(game)} boats
          </Muted>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {report && (
          <Pressable onPress={clearReport}>
            <Card accent={report.sunk.length + report.lost.length ? t.bad : t.good}>
              <Body>
                <Text style={{ fontWeight: '700' }}>Welcome back.</Text> While you were away ({duration(report.awayMs)}), your fleet finished{' '}
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

        {tab === 'fleet' && <HarborMap game={game} now={now} />}

        {tab === 'fleet' &&
          boats.map((b) => (
            <BoatCard
              key={b.id}
              game={game}
              boat={b}
              now={now}
              canSell={boats.length > 1}
              onAssign={(routeId, trips) => act((g, at) => assignRoute(g, b.id, routeId, at, trips))}
              onRecall={() => act((g) => recallBoat(g, b.id))}
              onRepair={() => act((g) => repairBoat(g, b.id))}
              onSell={() => act((g, at) => sellBoat(g, b.id, at))}
              onSalvage={() => act((g, at) => salvageBoat(g, b.id, at))}
              onCaptain={(captainId) => act((g) => assignCaptain(g, captainId, b.id))}
            />
          ))}

        {tab === 'captains' && (
          <CaptainsScreen
            game={game}
            now={now}
            onScout={(id, a) => act((g) => scoutRecruit(g, id, a))}
            onHire={(id) => act((g, at) => hireCaptain(g, id, at))}
            onFire={(id) => act((g, at) => fireCaptain(g, id, at))}
            onAshore={(id) => act((g) => unassignCaptain(g, id))}
            onPromote={(id, role, track) => act((g, at) => promoteCaptain(g, id, role, at, track))}
            onTakeOver={(id) => act((g) => takeOverCaptain(g, id))}
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
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.tabBar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        {TABS.map((x) => (
          <Pressable key={x.id} onPress={() => setTab(x.id)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }}>
            <Text style={{ color: tab === x.id ? t.accent : t.muted, fontWeight: tab === x.id ? '800' : '600', fontSize: 14 }}>{x.label}</Text>
          </Pressable>
        ))}
      </SafeAreaView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  coins: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  content: { padding: 12, gap: 12, paddingBottom: 32 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
})
