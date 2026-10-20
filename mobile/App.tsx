import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useFonts, Cormorant_600SemiBold_Italic, Cormorant_700Bold } from '@expo-google-fonts/cormorant'
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow'
import type { Boat, GameState } from '../src/game/types'
import { assignRoute, buyBoat, craftableClasses, shopClasses, craftBoat, meltSpares, recallBoat, repairBoat, salvageBoat, scrapStandardParts, moveHome, sellBoat, settle } from '../src/game/state'
import { assignCaptain, boatToShowTo, buyUpgrade, captainViewById, court, courtingOf, hireHand, moveHand, recruitViewById, tavernHandView, UPGRADES, upgradeQuote, fireCaptain, hireCaptain, promoteCaptain, scoutRecruit, setManaged, setManagerCrewing, takeOverCaptain, unassignCaptain } from '../src/game/crew'
import { getPart, partName, slotName } from '../src/game/parts'
import { getBoatClass, getPort, handFee, handsNeeded, sellPrice } from '../src/game/economy'
import { quoteVoyage, repairQuote, salvageQuote } from '../src/game/state'
import { MELT_COST, SALVAGE_CONDITION, STANDARD_SCRAP_VALUE } from '../src/game/data/economy'
import { SCOUT_ACTIONS } from '../src/game/data/captains'
import { COURT_ACTIONS, type CourtAction } from '../src/game/data/courting'
import { termsFee } from '../src/game/courting'
import { HOME_PORT_ID, HOME_PRICE } from '../src/game/data/ports'
import { MANAGER_ROLES } from '../src/game/data/managers'
import { getPortDef } from '../src/game/regions'
import { seasonAt, seasonEndsAt } from '../src/game/weather'
import { fleetCap } from '../src/game/upgrades'
import { coins, duration } from '../src/format'
import { PROMOTION_VOYAGES, QUAY_REPUTATION } from '../src/game/data/captains'
import { devMakeLegend } from './src/devTools'
import { TAVERN_RARE_BOOST } from '../src/game/data/hands'
import { generateCaptain } from '../src/game/captains'
import { chartingNext, homeOf } from '../src/game/regions'
import { useGame } from './src/useGame'
import { ConfirmProvider } from './src/confirm'
import { useConfirm, type Ask } from './src/confirmContext'
import { alertsWanted, alertText, previewAlert, setAlertsWanted } from './src/notify'
import { fonts, useTheme } from './src/theme'
import { lightAt } from './src/art/light'
import { HarborMap } from './src/components/HarborMap'
import { BoatChip, type Props as BoatProps } from './src/components/BoatCard'
import { CaptainsScreen } from './src/components/CaptainsScreen'
import type { VisitPage } from './src/screens/VisitScreen'
import { ShipyardScreen } from './src/components/ShipyardScreen'
import { BoatGallery } from './src/components/BoatGallery'
import { Upgrades, Workshop } from './src/components/PortScreen'
import { BoatScreen } from './src/screens/BoatScreen'
import { CaptainScreen } from './src/screens/CaptainScreen'
import { PortsScreen } from './src/screens/PortsScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { placeDecor, styleHome } from '../src/game/home'
import { Body, Button, Card, Measure, Muted, Row, Strip, Title } from './src/components/ui'

type Tab = 'fleet' | 'captains' | 'ports' | 'shipyard' | 'home'
const TABS: { id: Tab; label: string }[] = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'captains', label: 'Captains' },
  { id: 'ports', label: 'Ports' },
  { id: 'shipyard', label: 'Shipyard' },
  { id: 'home', label: 'Home' },
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
        <ConfirmProvider>
          <Harbor />
        </ConfirmProvider>
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
  const { game, now, act, error, clearError, report, clearReport, alerts, clearAlerts, reset } = useGame()
  const [tab, setTab] = useState<Tab>('fleet')
  const [stack, setStack] = useState<Detail[]>([])
  const [gallery, setGallery] = useState(false)
  const [portsSel, setPortsSel] = useState<string | null>(null)
  const [portsPage, setPortsPage] = useState<VisitPage>('menu')
  const confirm = useConfirm()
  const goToPort = (id: string, page: VisitPage = 'menu') => {
    setStack([])
    setPortsSel(id)
    setPortsPage(page)
    setTab('ports')
  }
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

  /** Ask first, then act. Resolves to whether the action went ahead. */
  const ask = async (a: Ask, fn: (g: GameState, at: number) => GameState) => (await confirm(a)) && act(fn)
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const boatById = (id: string) => boats.find((x) => x.id === id)!
  const nameOf = (id: string) => captainViewById(game, id)?.name ?? recruitViewById(game, id)?.name ?? 'them'
  const send = (b: Boat, routeId: string, trips: number) => {
    const route = game.routes.find((r) => r.id === routeId)!
    const q = quoteVoyage(game, b.id, routeId, now)
    return ask(
      {
        title: `Send ${b.nickname} to ${getPort(route.portB).name}?`,
        body: `${plural(trips, 'trip')}, about ${coins(q.payout)}c each, then she docks at home and waits.`,
        label: `Send · ${plural(trips, 'trip')}`,
      },
      (g, at) => assignRoute(g, b.id, routeId, at, trips),
    )
  }

  const boatProps = (b: Boat): BoatProps => ({
    game,
    boat: b,
    now,
    canSell: boats.length > 1,
    onOpenCaptain: (id) => open({ kind: 'captain', id }),
    onAssign: (routeId, trips) => void send(b, routeId, trips),
    onRecall: () =>
      void ask({ title: `Bring ${b.nickname} home?`, body: 'She finishes the trip she is on, then docks at home.', label: 'Return after this trip' }, (g) => recallBoat(g, b.id)),
    onRepair: () =>
      void ask({ title: `Repair ${b.nickname}?`, body: `Her hull goes from ${b.condition} back to 100.`, label: `Repair · ${coins(repairQuote(game, b.id))}c` }, (g) => repairBoat(g, b.id)),
    onSell: async () => {
      const ok = await ask(
        { title: `Sell ${b.nickname}?`, body: 'She leaves your fleet for good.', label: `Sell · ${coins(sellPrice(getBoatClass(b.classId)))}c`, danger: true },
        (g, at) => sellBoat(g, b.id, at),
      )
      if (ok) back()
    },
    onSalvage: () =>
      void ask(
        { title: `Raise ${b.nickname}?`, body: `Salvage brings her up from the seabed with her hull at ${SALVAGE_CONDITION}.`, label: `Raise · ${coins(salvageQuote(game, b.id))}c` },
        (g, at) => salvageBoat(g, b.id, at),
      ),
    onCaptain: (captainId) => {
      const old = b.captainId ? nameOf(b.captainId) : null
      const from = boats.find((x) => x.id !== b.id && (x.captainId === captainId || x.mateId === captainId))
      const notes = [old && `${old} steps ashore.`, from && `${from.nickname} is left without a captain.`].filter(Boolean)
      void ask({ title: `Put ${nameOf(captainId)} aboard ${b.nickname}?`, body: notes.join(' ') || undefined, label: 'Put aboard' }, (g) => assignCaptain(g, captainId, b.id))
    },
    onManage: (managerId) =>
      void ask(
        managerId
          ? {
              title: `Hand ${b.nickname} to ${nameOf(managerId)}?`,
              body: 'Managed boats earn 85%, keep out of rough water, find no rare parts, and keep working while you are away.',
              label: 'Hand her over',
            }
          : { title: `Take ${b.nickname} back?`, body: 'You send her out yourself again.', label: 'Take her back' },
        (g) => setManaged(g, b.id, managerId),
      ),
    onMoveHand: (handId, toBoatId, swapWithId) => {
      const to = boatById(toBoatId)
      const h = game.player.deckhands?.find((x) => x.id === handId)
      const other = swapWithId ? game.player.deckhands?.find((x) => x.id === swapWithId) : null
      void ask(
        {
          title: other ? `Swap ${h?.name} and ${other.name}?` : `Move ${h?.name} to ${to.nickname}?`,
          body: other ? `${h?.name} joins ${to.nickname}; ${other.name} comes to ${b.nickname}.` : `${b.nickname} will be a hand short until you sign someone on.`,
          label: other ? 'Swap them' : 'Move',
        },
        (g, at) => moveHand(g, handId, toBoatId, at, swapWithId),
      )
    },
    onFindHands: () => goToPort(homeOf(game), 'tavern'),
  })

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

      <View style={styles.content}>
        {report && (
          <Pressable onPress={clearReport}>
            <Card accent={report.sunk.length + report.lost.length + report.captainsLost.length ? t.bad : t.accent}>
              <Body>
                <Text style={{ fontFamily: fonts.bold }}>Welcome back.</Text> While you were away ({duration(report.awayMs)}), your fleet finished{' '}
                {report.tripsCompleted} trip{report.tripsCompleted === 1 ? '' : 's'} for {coins(report.coinsEarned)}c.
                {finds.length ? ` Found: ${finds.map(partName).join(', ')}.` : ''}
                {report.lost.length ? ` Cargo lost: ${report.lost.join(', ')}.` : ''}
                {report.sunk.length ? ` Sunk: ${report.sunk.join(', ')}.` : ''}
                {report.captainsLost.length ? ` Lost at sea: ${report.captainsLost.join(', ')}.` : ''}
              </Body>
              <Muted>Tap to dismiss</Muted>
            </Card>
          </Pressable>
        )}
        {alerts.length > 0 && (
          <Pressable onPress={clearAlerts} accessibilityRole="button" accessibilityHint="Dismisses the storm alert">
            <Card accent={t.storm}>
              {alerts.map((a) => {
                const { title, body } = alertText(game, a)
                return (
                  <View key={`${a.routeId}-${a.at}`} style={{ gap: 2 }}>
                    <Body style={{ fontWeight: '700' }}>{title}</Body>
                    <Muted>{body}</Muted>
                  </View>
                )
              })}
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
          <DetailScreen detail={detail} game={game} now={now} open={open} ask={ask} boatProps={boatProps} />
        ) : (
          <>
            {tab === 'fleet' && (
              <>
                <Measure>{(w, h) => <HarborMap game={game} now={now} onOpenPort={(id) => goToPort(id)} box={{ w, h }} />}</Measure>
                <Strip>
                  {boats.map((b) => (
                    <BoatChip key={b.id} game={game} boat={b} now={now} onOpen={() => open({ kind: 'boat', id: b.id })} />
                  ))}
                </Strip>
              </>
            )}

            {tab === 'captains' && <CaptainsScreen game={game} now={now} onOpenCaptain={(id) => open({ kind: 'captain', id })} />}

            {tab === 'ports' && (
              <PortsScreen
                game={game}
                now={now}
                selected={portsSel}
                onSelect={(id) => {
                  setPortsSel(id)
                  setPortsPage('menu')
                }}
                page={portsPage}
                onPage={setPortsPage}
                onSend={(boatId, routeId, trips) => void send(boatById(boatId), routeId, trips)}
                onScout={(id, a) =>
                  ask(
                    {
                      title: `${SCOUT_ACTIONS[a].name}?`,
                      body: `Learn ${SCOUT_ACTIONS[a].reveals} about ${nameOf(id)}. ${plural(game.recruitPool.watchesLeft, 'watch')} left today.`,
                      label: `Spend ${plural(SCOUT_ACTIONS[a].watches, 'watch')}`,
                    },
                    (g) => scoutRecruit(g, id, a),
                  )
                }
                onHire={(id) => {
                  const r = recruitViewById(game, id)
                  void ask({ title: `Sign ${r?.name} on?`, body: 'They’re won over. They join your captains, ashore at home until you put them aboard.', label: `Sign · ${coins(r?.fee ?? 0)}c` }, (g, at) => hireCaptain(g, id, at))
                }}
                onCourt={(id, a) => {
                  const who = recruitViewById(game, id) ?? tavernHandView(game, id)
                  const hand = !recruitViewById(game, id)
                  const first = who?.name.split(' ')[0] ?? 'them'
                  const watches = hand ? COURT_ACTIONS[a].handWatches : COURT_ACTIONS[a].watches
                  const boat = boatToShowTo(game, id)
                  const fee = recruitViewById(game, id)?.fee
                  const asks: Record<CourtAction, Ask> = {
                    drink: { title: `Stand ${first} a drink?`, body: hand ? 'You hear what they’re really like, and what they’re after.' : 'Over a drink, people say what they’re after.', label: `Buy a drink · ${plural(watches, 'watch')}` },
                    harbour: { title: `Walk ${first} round your harbour?`, body: 'They weigh your upgrades and decorations, your record at sea, and whether these are their home waters.', label: 'Show them round' },
                    ship: { title: `Show ${first} ${boat?.nickname ?? 'a boat'}?`, body: 'Your best boat docked at home that they’d sail on.', label: 'Show her' },
                    terms: {
                      title: `Offer ${first} better terms?`,
                      body: fee ? `Their fee goes from ${coins(fee)}c to ${coins(Math.round((fee * 1.25) / 10) * 10)}c. It counts for a lot with anyone who cares about pay.` : 'Their fee goes up a quarter. It counts for a lot with anyone who cares about pay.',
                      label: 'Offer it',
                    },
                  }
                  return ask(asks[a], (g, at) => court(g, id, a, at))
                }}
                onHireHand={(id, boatId) => {
                  const b = boatById(boatId)
                  void ask(
                    { title: `Sign on ${tavernHandView(game, id)?.name} for ${b.nickname}?`, body: 'A one-off fee, no wages.', label: `Hire · ${coins(termsFee(handFee(getBoatClass(b.classId)), courtingOf(game, id, now) ?? undefined))}c` },
                    (g, at) => hireHand(g, id, boatId, at),
                  )
                }}
                onOpenCaptain={(id) => open({ kind: 'captain', id })}
                onMoveHome={(id) => {
                  const port = getPortDef(id)
                  const price = (game.player.homesOwned ?? [HOME_PORT_ID]).includes(id) ? 0 : HOME_PRICE[port.region]
                  void ask(
                    { title: `Make ${port.name} home?`, body: 'Your fleet sails from here, and its quay and tavern become your own.', label: price ? `Buy and move · ${coins(price)}c` : 'Move home' },
                    (g, at) => moveHome(g, id, at),
                  )
                }}
              />
            )}

            {tab === 'shipyard' && (
              <ShipyardScreen
                game={game}
                now={now}
                onBuy={(id) => {
                  const c = getBoatClass(id)
                  const hands = handsNeeded(c)
                  void ask(
                    { title: `Buy a ${c.name}?`, body: hands ? `She needs ${plural(hands, 'deckhand')} (${coins(handFee(c))}c each, once) and a captain.` : 'She needs a captain to sail.', label: `Buy · ${coins(c.price)}c` },
                    (g, at) => buyBoat(g, id, at),
                  )
                }}
              />
            )}

            {tab === 'home' && (
              <HomeScreen
                game={game}
                now={now}
                onStyle={(patch) => act((g) => styleHome(g, patch))}
                onPlace={(slot, id) => act((g) => placeDecor(g, slot, id))}
                upgrades={
                  <Upgrades
                    game={game}
                    onBuild={(id) => {
                      const u = UPGRADES.find((x) => x.id === id)!
                      const q = upgradeQuote(game, id)
                      void ask({ title: `Build ${u.name}?`, body: `Level ${q.level + 1}: ${u.describe(u.levels[q.level])}.`, label: `Build · ${coins(q.cost ?? 0)}c` }, (g, at) => buyUpgrade(g, id, at))
                    }}
                  />
                }
                workshop={
                  <Workshop
                    game={game}
                    onCraft={(id) => void ask({ title: `Build ${getBoatClass(id).name}?`, body: 'Every piece of her set goes into her.', label: 'Build her' }, (g, at) => craftBoat(g, id, at))}
                    onScrap={() => {
                      const n = game.player.partInventory.filter((id) => getPart(id).rarity === 'standard').length
                      void ask({ title: `Scrap ${plural(n, 'standard fitting')}?`, label: `Scrap · +${coins(n * STANDARD_SCRAP_VALUE)}c` }, (g) => scrapStandardParts(g))
                    }}
                    onMelt={(rarity, slot, track) =>
                      void ask(
                        { title: `Melt ${MELT_COST} spares?`, body: `${MELT_COST} spare ${rarity} ${slotName(slot, track).toLowerCase()} pieces become one new ${rarity} piece.`, label: 'Melt them' },
                        (g, at) => meltSpares(g, rarity, slot, track, at),
                      )
                    }
                  />
                }
                alerts={<StormAlertsToggle />}
                dev={__DEV__ ? <View style={{ flex: 1, gap: 8 }}>
                  <Card>
                    <Muted>Play-test tools (development builds only)</Muted>
                    <Row>
                      <Button small kind="secondary" label="+10,000c" onPress={() => act((g) => ({ ...g, player: { ...g.player, coins: g.player.coins + 10_000 } }))} />
                      <Button
                        small
                        kind="secondary"
                        label="Grant a set"
                        onPress={() =>
                          act((g) => {
                            // Every piece of a random set the player hasn't built.
                            const sets = craftableClasses().filter((c) => !g.player.ownedBoats.some((b) => b.classId === c.id))
                            const pick = sets[Math.floor(Math.random() * sets.length)]
                            return { ...g, player: { ...g.player, partInventory: [...g.player.partInventory, ...pick.requiredParts] } }
                          })
                        }
                      />
                      <Button
                        small
                        kind="secondary"
                        label="Manager setup"
                        onPress={() =>
                          act((g, at) => {
                            // Reach tier 3 (unlocks the dockhand) and make every sailing captain a veteran.
                            const t3 = shopClasses().find((c) => c.sizeTier === 3 && c.rarity === 'common')!
                            const s = buyBoat({ ...g, player: { ...g.player, coins: g.player.coins + t3.price } }, t3.id, at)
                            const roster = s.player.roster.map((c) => (c.role === 'sailing' ? { ...c, voyageCount: Math.max(c.voyageCount, PROMOTION_VOYAGES) } : c))
                            return { ...s, player: { ...s.player, roster } }
                          })
                        }
                      />
                      <Button small kind="secondary" label="Preview storm alert" onPress={() => void previewAlert(game, Date.now())} />
                      <Button
                        small
                        kind="secondary"
                        label="Chart the next region"
                        onPress={() =>
                          act((g, at) => {
                            // Dev: fill the next region's chart; the next settle adds its routes and people.
                            const n = chartingNext(g)
                            if (!n) return g
                            return settle({ ...g, charts: { ...(g.charts ?? {}), [n.id]: n.needed } }, at)
                          })
                        }
                      />
                      <Button
                        small
                        kind="secondary"
                        label="Rare captain at the tavern"
                        onPress={() =>
                          act((g) => {
                            // Dev: a guaranteed rare captain, two anchors above the quay.
                            const s = structuredClone(g)
                            const rep = Math.min(5, QUAY_REPUTATION[s.player.maxTierReached][1] + TAVERN_RARE_BOOST)
                            const c = generateCaptain(s.rng, `c${s.nextCaptainSeq++}`, [rep, rep], 'tavern')
                            c.rare = true
                            if (s.tavern) s.tavern.captain = c
                            return s
                          })
                        }
                      />
                      <Button
                        small
                        kind="secondary"
                        label="Make my first captain a Legend"
                        onPress={() =>
                          act(devMakeLegend)
                        }
                      />
                      <Button small kind="secondary" label={gallery ? 'Hide boats' : 'Boat gallery'} onPress={() => setGallery(!gallery)} />
                      <Button small kind="danger" label="Reset game" onPress={() => void reset()} />
                    </Row>
                  </Card>
                {gallery && <BoatGallery />}
              </View> : undefined}
              />
            )}
          </>
        )}
      </View>

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

/** Storm alerts: notifications for routes you have trips queued on, sent while you're away. */
function StormAlertsToggle() {
  const t = useTheme()
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => {
    void alertsWanted().then(setOn)
  }, [])
  const toggle = async () => {
    const want = !on
    const now = await setAlertsWanted(want)
    setOn(now)
    if (want && !now) Alert.alert('Notifications are off', 'Allow notifications for Harborline in Settings to get storm alerts.')
  }
  if (on === null) return null
  return (
    <Card>
      <Pressable onPress={toggle} accessibilityRole="switch" accessibilityState={{ checked: on }} style={styles.toggleRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body style={{ fontWeight: '700' }}>Storm alerts</Body>
          <Muted>A notification when a route you have trips queued on turns rough or stormy while you're away.</Muted>
        </View>
        <Switch value={on} onValueChange={() => void toggle()} trackColor={{ true: t.accent, false: t.muted }} ios_backgroundColor={t.muted} importantForAccessibility="no" />
      </Pressable>
    </Card>
  )
}

function DetailScreen({
  detail,
  game,
  now,
  open,
  ask,
  boatProps,
}: {
  detail: NonNullable<Detail>
  game: GameState
  now: number
  open: (d: Detail) => void
  ask: (a: Ask, fn: (g: GameState, t: number) => GameState) => Promise<boolean>
  boatProps: (b: Boat) => BoatProps
}) {
  if (detail.kind === 'boat') {
    const boat = game.player.ownedBoats.find((b) => b.id === detail.id)
    if (!boat) return <Muted>That boat is no longer in your fleet.</Muted>
    return <BoatScreen {...boatProps(boat)} />
  }
  const c = captainViewById(game, detail.id)
  return (
    <CaptainScreen
      game={game}
      captainId={detail.id}
      now={now}
      onOpenBoat={(id) => open({ kind: 'boat', id })}
      onAshore={(id) =>
        void ask({ title: `Send ${c?.name} ashore?`, body: 'Her boat needs another captain before she sails again.', label: 'Step ashore' }, (g) => unassignCaptain(g, id))
      }
      onFire={(id) =>
        void ask(
          { title: `Let ${c?.name} go?`, body: `Severance is ${coins(c?.severance ?? 0)} coins. They won't be back.`, label: `Let go · ${coins(c?.severance ?? 0)}c`, danger: true },
          (g, at) => fireCaptain(g, id, at),
        )
      }
      onTakeOver={(id) =>
        void ask({ title: `Take charge of ${c?.name}?`, body: 'Their manager no longer decides whether they stay.', label: 'Take charge' }, (g) => takeOverCaptain(g, id))
      }
      onManagerCrewing={(id, on) =>
        void ask(
          on
            ? { title: `Let ${c?.name} hire crew?`, body: 'They hire and let go captains and hands for the boats they run.', label: 'Let them hire' }
            : { title: `Stop ${c?.name} hiring crew?`, body: 'You crew their boats yourself.', label: 'Stop hiring' },
          (g) => setManagerCrewing(g, id, on),
        )
      }
      onPromote={(id, role, track) =>
        void ask(
          { title: `Make ${c?.name} a ${MANAGER_ROLES.find((r) => r.id === role)?.name}?`, body: 'They stop sailing for good and start running boats.', label: 'Promote' },
          (g, at) => promoteCaptain(g, id, role, at, track),
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, minHeight: 56 },
  back: { paddingVertical: 10, paddingRight: 16 },
  content: { flex: 1, padding: 12, gap: 10, paddingBottom: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
})
