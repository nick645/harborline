// One boat, live, on one screen: the scene of where she is right now (sized to fit), her name
// and trip, and three panels you switch between: where to send her, who's aboard, her hull.

import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { captainViewById, handViewsOn } from '../../../src/game/crew'
import { getVoyage } from '../../../src/game/state'
import { handCount } from '../../../src/game/hands'
import { getPortDef, homeOf } from '../../../src/game/regions'
import { routeWeather } from '../../../src/game/weather'
import { WEATHER } from '../../../src/game/data/weather'
import { coins, duration, percent } from '../../../src/format'
import { BoatScene, SCENE_H, SCENE_W, type BoatMode } from '../art/BoatScene'
import { SunkScene } from '../art/SunkScene'
import { DockScene } from '../art/DockScene'
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
  const progress = v ? Math.min(1, Math.max(0, (now - v.startedAt) / v.durationMs)) : 0
  const [panel, setPanel] = useState<Panel>(boat.captainId || boat.state === 'sunk' ? 'send' : 'crew')
  // Dev only: preview the scene in any weather.
  const [preview, setPreview] = useState<Weather | null>(null)
  const look = captain ? lookFor(captain.id, captain.rare, captain.region) : null

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
              />
            )}
            <View style={[styles.pill, { backgroundColor: 'rgba(29,20,32,0.75)' }]}>
              <View style={[styles.dot, { backgroundColor: mode === 'sunk' ? t.bad : t[weather] }]} />
              <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 12 }}>
                {mode === 'sunk' ? 'Sunk' : mode === 'docked' ? `Moored at ${getPortDef(homeOf(game)).name}` : `${WEATHER[weather].name}${WEATHER[weather].lossRisk ? ` · ${percent(WEATHER[weather].lossRisk)} risk` : ''}`}
              </Text>
            </View>
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
  pill: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
})
