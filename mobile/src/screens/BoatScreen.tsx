// One boat, live, on one screen: the scene of where she is right now (sized to fit), her name
// and trip, and three panels you switch between: where to send her, who's aboard, her hull.

import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { captainViewById, handViewsOn } from '../../../src/game/crew'
import { getVoyage } from '../../../src/game/state'
import { handCount } from '../../../src/game/hands'
import { getPortDef, homeOf } from '../../../src/game/regions'
import { routeWeather } from '../../../src/game/weather'
import { WEATHER } from '../../../src/game/data/weather'
import { getRegion } from '../../../src/game/data/ports'
import { coins, duration, percent } from '../../../src/format'
import { BoatScene, SCENE_H, SCENE_W, type BoatMode } from '../art/BoatScene'
import { SunkScene } from '../art/SunkScene'
import { DockScene } from '../art/DockScene'
import { DeckScene } from '../art/DeckScene'
import { HelmScene } from '../art/HelmScene'
import { Flotsam } from '../art/Flotsam'
import { captainLine, deckLine, steadyLine } from '../chatter'
import { flotsamKind, flotsamReady } from '../../../src/game/flotsam'
import { getKeepsake } from '../../../src/game/data/keepsakes'
import { partName } from '../../../src/game/parts'
import { lightAt } from '../art/light'
import { lookFor } from '../art/looks'
import { fonts, useTheme } from '../theme'
import { CrewPanel, HullPanel, SendPanel, type Props as BoatProps } from '../components/BoatCard'
import { Fit, Muted, Row, Segments, Title } from '../components/ui'

type Panel = 'send' | 'crew' | 'hull'

export function BoatScreen(props: BoatProps) {
  const { game, boat, now, onOpenCaptain } = props
  const t = useTheme()
  const cls = getBoatClass(boat.classId)
  const v = getVoyage(game, boat.id)
  const captain = captainViewById(game, boat.captainId)
  const mode: BoatMode = boat.state === 'sunk' ? 'sunk' : boat.state === 'sailing' ? 'sailing' : boat.state === 'returning' ? 'returning' : 'docked'
  const weather: Weather = v?.weatherAtStart ?? (boat.currentRoute ? routeWeather(game, boat.currentRoute, now) : 'calm')
  const route = v ? game.routes.find((r) => r.id === v.routeId) : null
  const dest = route ? getPort(route.portB).name : null
  // The weather looks like where she's headed (home waters while she's in port).
  const climate = getRegion(getPortDef(route?.portB ?? homeOf(game)).region).climate
  const progress = v ? Math.min(1, Math.max(0, (now - v.startedAt) / v.durationMs)) : 0
  const [panel, setPanel] = useState<Panel>(boat.captainId || boat.state === 'sunk' ? 'send' : 'crew')
  // Dev only: preview the scene in any weather.
  const [preview, setPreview] = useState<Weather | null>(null)
  const look = captain ? lookFor(captain.id, captain.rare, captain.region, captain.persona?.id, captain.title) : null
  // At sea, three views: the whole ship, on deck among the passengers, and at the helm.
  const [view, setView] = useState<'ship' | 'deck' | 'helm'>('deck')
  const atSea = mode === 'sailing' || mode === 'returning'
  // What someone just said, or what just came out of the water, shown over the scene a while.
  const [said, setSaid] = useState<{ who: string; text: string } | null>(null)
  const [talk, setTalk] = useState(0)
  const [steadied, setSteadied] = useState(0)
  useEffect(() => {
    if (!said) return
    const timer = setTimeout(() => setSaid(null), 4200)
    return () => clearTimeout(timer)
  }, [said])
  const wx = preview ?? weather
  const where = dest ?? getPortDef(homeOf(game)).name
  const say = (who: string, text: string) => {
    setTalk((n) => n + 1)
    setSaid({ who, text })
  }
  const fishOut = () => {
    const f = props.onFlotsam?.()
    if (!f) return
    const what = f.keepsake ? `${getKeepsake(f.keepsake)?.name}: something new for home!` : f.part ? partName(f.part) : `${coins(f.coins)}c`
    setSaid({ who: `Fished out ${f.what}`, text: what })
  }
  const showing = (atSea || preview) && !(mode === 'sunk' && !preview)

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Fit aspect={SCENE_W / SCENE_H}>
        {(w) => (
          <View>
            {mode === 'sunk' && !preview ? (
              <SunkScene width={w} light={lightAt(now)} cls={cls} captain={look} />
            ) : mode === 'docked' && !preview ? (
              <DockScene
                width={w}
                light={lightAt(now)}
                cls={cls}
                captain={look}
                captainName={captain?.name}
                condition={boat.condition}
                hands={handCount(game, boat.id)}
                handIds={handViewsOn(game, boat.id).map((h) => h.id)}
                onOpenCaptain={captain ? () => onOpenCaptain(captain.id) : undefined}
              />
            ) : showing && view === 'helm' ? (
              <HelmScene
                width={w}
                light={lightAt(now)}
                weather={wx}
                captain={look}
                climate={climate}
                steadied={steadied}
                onWheel={() => {
                  setSteadied((n) => n + 1)
                  if (captain) say(captain.name, steadyLine(wx, talk))
                }}
                onCaptain={() => captain && say(captain.name, captainLine(captain, wx, where, talk))}
              />
            ) : showing && view === 'deck' ? (
              <DeckScene
                width={w}
                light={lightAt(now)}
                weather={preview ?? weather}
                cls={cls}
                captain={look}
                captainName={captain?.name}
                hands={handCount(game, boat.id)}
                handIds={handViewsOn(game, boat.id).map((h) => h.id)}
                climate={climate}
                outbound={mode === 'sailing'}
                onOpenCaptain={captain ? () => onOpenCaptain(captain.id) : undefined}
                onDeck={() => {
                  const l = deckLine(cls.track, wx, where, talk)
                  say(l.who, l.text)
                }}
              />
            ) : (
              <BoatScene
                width={w}
                light={lightAt(now)}
                weather={preview ?? (mode === 'docked' ? 'calm' : weather)}
                mode={preview && mode === 'docked' ? 'sailing' : mode}
                cls={cls}
                captain={look}
                condition={boat.condition}
                hands={handCount(game, boat.id)}
                climate={climate}
              />
            )}
            <View style={[styles.pill, { backgroundColor: 'rgba(29,20,32,0.75)' }]}>
              <View style={[styles.dot, { backgroundColor: mode === 'sunk' ? t.bad : t[weather] }]} />
              <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 12 }}>
                {mode === 'sunk' ? 'Sunk' : mode === 'docked' ? `Moored at ${getPortDef(homeOf(game)).name}` : `${WEATHER[weather].name}${WEATHER[weather].lossRisk ? ` · ${percent(WEATHER[weather].lossRisk)} risk` : ''}`}
              </Text>
            </View>
            {/* Something drifting by, while there's a find to be had */}
            {atSea && !preview && (
              <Flotsam
                width={w}
                height={w / (SCENE_W / SCENE_H)}
                waterY={view === 'ship' ? 0.86 : view === 'deck' ? 0.5 : 0.42}
                kind={flotsamKind(game, boat.id)}
                ready={flotsamReady(game, boat.id, now)}
                onCollect={fishOut}
              />
            )}
            {said && (
              <View pointerEvents="none" style={[styles.said, { backgroundColor: 'rgba(29,20,32,0.86)' }]}>
                <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 12 }}>{said.who}</Text>
                <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 19 }}>{said.text}</Text>
              </View>
            )}
            {showing && (
              <View style={[styles.views, { backgroundColor: 'rgba(29,20,32,0.82)' }]}>
                {(
                  [
                    ['ship', 'Ship'],
                    ['deck', 'Deck'],
                    ['helm', 'Helm'],
                  ] as const
                ).map(([id, label]) => (
                  <Pressable
                    key={id}
                    onPress={() => setView(id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: view === id }}
                    style={[styles.viewChip, view === id && { backgroundColor: t.accent }]}
                  >
                    <Text style={{ color: view === id ? t.accentText : t.text, fontFamily: fonts.semibold, fontSize: 12 }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {__DEV__ && (
              <View style={styles.devChips}>
                {(['calm', 'choppy', 'rough', 'storm'] as const).map((wx) => (
                  <Pressable key={wx} onPress={() => setPreview(preview === wx ? null : wx)} style={[styles.chip, { borderColor: t[wx], backgroundColor: preview === wx ? t[wx] : 'rgba(29,20,32,0.6)' }]}>
                    <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 10 }}>{wx[0].toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </Fit>

      <View style={{ gap: 4 }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Title size={24}>{boat.nickname}</Title>
          {v && !v.lost && <Text style={{ color: t.accent, fontFamily: fonts.title, fontSize: 20 }}>{coins(v.payout)}c</Text>}
        </Row>
        {v && dest ? (
          <Row style={{ flexWrap: 'nowrap' }}>
            <Muted>Trip {v.tripIndex}/{v.tripsTotal}</Muted>
            <View style={[styles.track, { backgroundColor: t.border }]}>
              <View style={{ width: `${progress * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.accent }} />
            </View>
            <Muted>
              {dest} · {duration((boat.etaMs ?? now) - now)}
            </Muted>
          </Row>
        ) : captain ? (
          <Pressable onPress={() => onOpenCaptain(captain.id)} accessibilityRole="button" accessibilityLabel={`Open Captain ${captain.name}`}>
            <Muted>
              {cls.name} · Captain <Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{captain.name}</Text> aboard ›
            </Muted>
          </Pressable>
        ) : (
          mode !== 'sunk' && <Text style={{ color: t.bad, fontFamily: fonts.semibold, fontSize: 13 }}>No captain aboard: she can’t sail. See Crew.</Text>
        )}
      </View>

      <Segments
        items={[
          { id: 'send', label: mode === 'sunk' ? 'Wreck' : v ? 'Trip' : 'Send' },
          { id: 'crew', label: 'Crew' },
          { id: 'hull', label: 'Hull' },
        ]}
        value={panel}
        onChange={setPanel}
      />
      <View style={{ minHeight: 190 }}>{panel === 'send' ? <SendPanel {...props} /> : panel === 'crew' ? <CrewPanel {...props} /> : <HullPanel {...props} />}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  devChips: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', gap: 4 },
  views: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', borderRadius: 14, padding: 3, gap: 2 },
  viewChip: { borderRadius: 11, paddingHorizontal: 11, paddingVertical: 5 },
  said: { position: 'absolute', left: 10, right: 10, top: 44, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  pill: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
})
