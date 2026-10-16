// One boat, live: the scene of where she is right now, then the trip and the controls.

import { useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import type { Boat, GameState, Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { captainViewById } from '../../../src/game/crew'
import { getVoyage } from '../../../src/game/state'
import { routeWeather } from '../../../src/game/weather'
import { WEATHER } from '../../../src/game/data/weather'
import { coins, duration, percent } from '../../../src/format'
import { BoatScene, type BoatMode } from '../art/BoatScene'
import { SunkScene } from '../art/SunkScene'
import { DockScene } from '../art/DockScene'
import { lightAt } from '../art/light'
import { lookFor } from '../art/looks'
import { fonts, useTheme } from '../theme'
import { Card, Muted, Row, Title } from '../components/ui'

type Props = {
  game: GameState
  boat: Boat
  now: number
  onOpenCaptain: (id: string) => void
  /** The usual boat controls (send, recall, repair...) rendered under the scene. */
  controls: React.ReactNode
}

export function BoatScreen({ game, boat, now, onOpenCaptain, controls }: Props) {
  const t = useTheme()
  const { width } = useWindowDimensions()
  const cls = getBoatClass(boat.classId)
  const v = getVoyage(game, boat.id)
  const captain = captainViewById(game, boat.captainId)
  const mode: BoatMode = boat.state === 'sunk' ? 'sunk' : boat.state === 'sailing' ? 'sailing' : boat.state === 'returning' ? 'returning' : 'docked'
  const weather: Weather = v?.weatherAtStart ?? (boat.currentRoute ? routeWeather(game, boat.currentRoute, now) : 'calm')
  const route = v ? game.routes.find((r) => r.id === v.routeId) : null
  const dest = route ? getPort(route.portB).name : null
  const progress = v ? Math.min(1, Math.max(0, (now - v.startedAt) / v.durationMs)) : 0
  const sceneWidth = Math.min(width - 24, 720)
  // Dev only: preview the scene in any weather.
  const [preview, setPreview] = useState<Weather | null>(null)

  return (
    <View style={{ gap: 12 }}>
      <View>
        {mode === 'sunk' && !preview ? (
          <SunkScene width={sceneWidth} light={lightAt(now)} cls={cls} captain={captain ? lookFor(captain.id) : null} />
        ) : mode === 'docked' && !preview ? (
          <DockScene
            width={sceneWidth}
            light={lightAt(now)}
            cls={cls}
            captain={captain ? lookFor(captain.id) : null}
            captainName={captain?.name}
            condition={boat.condition}
            hands={boat.hands ?? 0}
            onOpenCaptain={captain ? () => onOpenCaptain(captain.id) : undefined}
          />
        ) : (
        <BoatScene
          width={sceneWidth}
          light={lightAt(now)}
          weather={preview ?? (mode === 'docked' ? 'calm' : weather)}
          mode={preview && mode === 'docked' ? 'sailing' : mode}
          cls={cls}
          captain={captain ? lookFor(captain.id) : null}
          condition={boat.condition}
          hands={boat.hands ?? 0}
        />
        )}
        <View style={[styles.pill, { backgroundColor: 'rgba(29,20,32,0.75)' }]}>
          <View style={[styles.dot, { backgroundColor: mode === 'sunk' ? t.bad : t[weather] }]} />
          <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>
            {mode === 'sunk' ? 'Sunk' : mode === 'docked' ? 'Moored at Saltmarsh Quay' : `${WEATHER[weather].name}${WEATHER[weather].lossRisk ? ` · ${percent(WEATHER[weather].lossRisk)} risk` : ''}`}
          </Text>
        </View>
      </View>

      {__DEV__ && (
        <Row>
          {(['calm', 'choppy', 'rough', 'storm'] as const).map((w) => (
            <Pressable key={w} onPress={() => setPreview(preview === w ? null : w)} style={[styles.chip, { borderColor: t[w], backgroundColor: preview === w ? t[w] : 'transparent' }]}>
              <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 12 }}>{w}</Text>
            </Pressable>
          ))}
          <Muted>preview (dev)</Muted>
        </Row>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title size={26}>{boat.nickname}</Title>
          {v && (
            <Muted>
              Trip {v.tripIndex} of {v.tripsTotal} · {duration((boat.etaMs ?? now) - now)} to {boat.state === 'sailing' ? 'arrive' : 'home'}
            </Muted>
          )}
        </Row>
        <Muted>
          {cls.name} · {cls.track} · tier {cls.sizeTier}
        </Muted>
        {v && dest && (
          <Row style={{ flexWrap: 'nowrap' }}>
            <Muted>Saltmarsh</Muted>
            <View style={[styles.track, { backgroundColor: t.border }]}>
              <View style={{ width: `${progress * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.accent }} />
            </View>
            <Muted>{dest}</Muted>
          </Row>
        )}
        <View style={styles.stats}>
          <Stat label="Pays" value={v && !v.lost ? `${coins(v.payout)}c` : '—'} accent />
          <Stat label="Hull" value={`${boat.condition}`} />
          <Stat label={cls.track === 'cargo' ? 'Cargo' : 'Seats'} value={`${cls.capacity}`} />
        </View>
        {captain ? (
          <Pressable onPress={() => onOpenCaptain(captain.id)} accessibilityRole="button" accessibilityLabel={`Open Captain ${captain.name}`}>
            <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 14 }}>
              Captain <Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{captain.name}</Text>
              {mode === 'sailing' || mode === 'returning' ? ' at the wheel' : mode === 'docked' ? ' aboard' : ''} ›
            </Text>
          </Pressable>
        ) : (
          mode !== 'sunk' && <Text style={{ color: t.bad, fontFamily: fonts.semibold }}>No captain aboard: she can’t sail.</Text>
        )}
      </Card>

      {controls}
    </View>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const t = useTheme()
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: t.muted, fontSize: 11, fontFamily: fonts.semibold, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: accent ? t.accent : t.text, fontSize: 22, fontFamily: fonts.title }}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pill: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  stats: { flexDirection: 'row', gap: 8 },
})
