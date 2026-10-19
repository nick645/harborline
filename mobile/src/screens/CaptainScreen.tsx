// One captain: where they are right now, what's known of them, and their logbook.

import { Alert, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { boatOfCaptain, boatsManagedBy, captainViewById, managerRole, promotionOptions } from '../../../src/game/crew'
import { coins } from '../../../src/format'
import { DEVELOPMENT_KNOWN_AFTER } from '../../../src/game/data/captains'
import { CaptainScene } from '../art/CaptainScene'
import { lightAt } from '../art/light'
import { lookFor } from '../art/looks'
import { homeTavern } from '../homeTavern'
import { fonts, useTheme } from '../theme'
import { Anchors, Body, Button, Card, Muted, Row, Tag, Title } from '../components/ui'

type Props = {
  game: GameState
  captainId: string
  now: number
  onOpenBoat: (id: string) => void
  onAshore: (id: string) => void
  onFire: (id: string) => void
  onTakeOver: (id: string) => void
  onManagerCrewing: (id: string, on: boolean) => void
  onPromote: (id: string, role: 'dockhand' | 'harbormaster' | 'fleet-manager', track?: 'cargo' | 'passenger') => void
}

const VERDICT = { sleeper: 'Sleeper', 'all-talk': 'All talk', 'true-to-form': 'True to form' } as const

export function CaptainScreen({ game, captainId, now, onOpenBoat, onAshore, onFire, onTakeOver, onManagerCrewing, onPromote }: Props) {
  const t = useTheme()
  const { width } = useWindowDimensions()
  const c = captainViewById(game, captainId)
  if (!c) return <Muted>That captain has moved on.</Muted>
  const boat = boatOfCaptain(game, c.id)
  const atSea = !!boat && (boat.state === 'sailing' || boat.state === 'returning')
  const role = managerRole(c.role)
  const managed = role ? boatsManagedBy(game, c.id) : []
  const where = role
    ? `${role.name} · at the harbour office`
    : boat
      ? atSea
        ? `At the helm of ${boat.nickname}`
        : `Aboard ${boat.nickname}, in port`
      : `Ashore, at ${homeTavern(game).name}`

  return (
    <View style={{ gap: 12 }}>
      <CaptainScene width={Math.min(width - 24, 720)} light={lightAt(now)} look={lookFor(c.id, c.rare, c.region)} place={atSea ? 'helm' : 'port'} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title size={26}>{c.name}</Title>
          <Anchors n={c.reputation} />
        </Row>
        <Row>
          {c.verdict && <Tag label={VERDICT[c.verdict]} color={c.verdict === 'sleeper' ? t.good : c.verdict === 'all-talk' ? t.bad : t.muted} dark />}
          <Muted>
            {where} · {c.voyageCount} voyage{c.voyageCount === 1 ? '' : 's'}
          </Muted>
        </Row>
        <Muted>
          From {c.homePort} · takes tier {c.sailsTiers[0]}–{c.sailsTiers[1]} boats
        </Muted>
        <SkillRange band={c.skillBand} />
        {boat && <Button small kind="secondary" label={`Go to ${boat.nickname}`} onPress={() => onOpenBoat(boat.id)} />}
      </Card>

      {role && (
        <Card>
          <Body>
            <Text style={{ fontFamily: fonts.bold }}>{role.name}</Text> · {role.description}
            {c.managesTrack && ` (${c.managesTrack})`}
          </Body>
          <Muted>
            Runs {managed.length} boat{managed.length === 1 ? '' : 's'}
            {managed.length ? `: ${managed.map((b) => b.nickname).join(', ')}` : '. Hand boats over from their cards in Fleet.'}
          </Muted>
          <Pressable
            onPress={() => onManagerCrewing(c.id, !c.handlesCrew)}
            accessibilityRole="switch"
            accessibilityState={{ checked: c.handlesCrew }}
            style={[styles.toggleRow]}
          >
            <Body style={{ flex: 1 }}>Hires and fires crew for their boats</Body>
            <Switch
              value={c.handlesCrew}
              onValueChange={(on) => onManagerCrewing(c.id, on)}
              trackColor={{ true: t.accent, false: t.muted }}
              ios_backgroundColor={t.muted}
              importantForAccessibility="no"
            />
          </Pressable>
        </Card>
      )}

      <View style={[styles.logbook, { backgroundColor: t.paper }]}>
        <Text style={{ fontFamily: fonts.title, fontSize: 22, color: t.ink }}>Logbook</Text>
        {c.traits.length === 0 && <Text style={[styles.pencil, { color: t.pencil }]}>Nothing written yet.</Text>}
        {c.traits.map((tr) =>
          tr.status === 'proven' ? (
            <Text key={tr.id} style={{ fontFamily: fonts.body, fontSize: 15, color: t.ink, lineHeight: 20 }}>
              <Text style={{ fontFamily: fonts.bold }}>{tr.name}.</Text> {tr.description}
            </Text>
          ) : tr.status === 'rumour' ? (
            <Text key={tr.id} style={[styles.pencil, { color: t.pencil }]}>
              Pencilled: “{tr.rumour}”
            </Text>
          ) : (
            <Text key={tr.id} style={[styles.pencil, { color: '#8a7a72', textDecorationLine: 'line-through' }]}>
              “{tr.rumour}”
            </Text>
          ),
        )}
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.pencil }}>
          {c.knownDevelopment
            ? `${c.knownDevelopment.name}: ${c.knownDevelopment.description}.`
            : `Still getting the measure of them: ${Math.min(c.voyageCount, DEVELOPMENT_KNOWN_AFTER)} of ${DEVELOPMENT_KNOWN_AFTER} voyages.`}
        </Text>
      </View>

      <Row>
        {boat && !c.bonded && boat.state === 'idle' && <Button small kind="secondary" label="Step ashore" onPress={() => onAshore(c.id)} />}
        {c.hiredBy && <Button small kind="secondary" label="Take over from their manager" onPress={() => onTakeOver(c.id)} />}
        {promotionOptions(game, c.id).map((r) =>
          r.id === 'fleet-manager' ? (
            (['cargo', 'passenger'] as const).map((track) => (
              <Button key={track} small kind="secondary" label={`Make ${r.name} (${track})`} onPress={() => onPromote(c.id, r.id, track)} />
            ))
          ) : (
            <Button key={r.id} small kind="secondary" label={`Make ${r.name}`} onPress={() => onPromote(c.id, r.id)} />
          ),
        )}
        {!c.bonded && (
          <Button
            small
            kind="danger"
            label={`Let go · ${coins(c.severance)}c`}
            disabled={game.player.coins < c.severance || atSea}
            onPress={() =>
              Alert.alert(`Let ${c.name} go?`, `Severance is ${coins(c.severance)} coins.`, [
                { text: 'Keep', style: 'cancel' },
                { text: 'Let go', style: 'destructive', onPress: () => onFire(c.id) },
              ])
            }
          />
        )}
      </Row>
    </View>
  )
}

export function SkillRange({ band }: { band: [number, number] }) {
  const t = useTheme()
  const [lo, hi] = band
  const unknown = lo <= 1 && hi >= 100
  return (
    <Row style={{ flexWrap: 'nowrap' }}>
      <Muted>Skill</Muted>
      <View style={[styles.skillTrack, { backgroundColor: t.border }]}>
        {!unknown && <View style={[styles.skillBand, { left: `${lo - 1}%`, width: `${Math.max(2, hi - lo + 1)}%`, backgroundColor: t.accent }]} />}
      </View>
      <Muted>{unknown ? '?' : `${lo}–${hi}`}</Muted>
    </Row>
  )
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  logbook: { borderRadius: 8, padding: 14, paddingLeft: 20, gap: 8, borderLeftWidth: 6, borderLeftColor: '#c2a98c' },
  pencil: { fontFamily: fonts.titleItalic, fontSize: 18, lineHeight: 22 },
  skillTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  skillBand: { position: 'absolute', top: 0, bottom: 0, borderRadius: 4 },
})
