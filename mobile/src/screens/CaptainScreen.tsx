// One captain: where they are right now, what's known of them, and their logbook.

import { useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { boatOfCaptain, boatsManagedBy, captainViewById, managerRole, promotionOptions } from '../../../src/game/crew'
import { coins } from '../../../src/format'
import { DEVELOPMENT_KNOWN_AFTER } from '../../../src/game/data/captains'
import { CaptainScene } from '../art/CaptainScene'
import { lightAt } from '../art/light'
import { lookFor } from '../art/looks'
import { homeTavern } from '../homeTavern'
import { fonts, useTheme } from '../theme'
import { Body, Button, Card, Measure, Muted, Row, Segments, Tag, Title } from '../components/ui'
import { Lodestone, RankAbilities, SkillSheet, Standing } from '../components/SkillSheet'

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
  const [panel, setPanel] = useState<'skills' | 'log' | 'orders'>('skills')
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
    <View style={{ flex: 1, gap: 8 }}>
      <Measure>{(w, h) => <CaptainScene width={Math.min(w, 720)} height={h} light={lightAt(now)} look={lookFor(c.id, c.rare, c.region)} place={atSea ? 'helm' : 'port'} />}</Measure>

      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Row style={{ flexShrink: 1, flexWrap: 'nowrap', gap: 6 }}>
            <Title size={26}>{c.name}</Title>
            {c.potential && (!c.rank || (c.rank === 'legend' && c.potential === 'mythic')) && <Lodestone potential={c.potential} size={20} />}
          </Row>
          <Standing c={c} />
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
      </Card>

      <Segments
        items={[
          { id: 'skills', label: 'Skills' },
          { id: 'log', label: 'Logbook' },
          { id: 'orders', label: role ? 'Desk' : 'Orders' },
        ]}
        value={panel}
        onChange={setPanel}
      />
      <View style={{ minHeight: 170, gap: 8 }}>
      {panel === 'orders' && boat && <Button small kind="secondary" label={`Go to ${boat.nickname}`} onPress={() => onOpenBoat(boat.id)} />}

      {panel === 'orders' && role && (
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

      {panel === 'skills' && (
        <View style={[styles.logbook, { backgroundColor: t.paper }]}>
          <SkillSheet c={c} paper />
          <RankAbilities c={c} paper />
          {c.potential && (!c.rank || (c.rank === 'legend' && c.potential === 'mythic')) && (
            <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
              <Lodestone potential={c.potential} />
              <Text style={{ flex: 1, fontFamily: fonts.titleItalic, fontSize: 16, color: t.ink }}>
                {c.rank === 'legend' ? 'A Legend, and still more in them: the sea may yet make them Mythic.' : c.potential === 'mythic' ? 'Something in them the sea has rarely seen. Keep them sailing.' : 'The makings of a Legend, if the sea brings it out of them.'}
              </Text>
            </Row>
          )}
        </View>
      )}

      {panel === 'log' && (
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
      )}

      {panel === 'orders' && (
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
            onPress={() => onFire(c.id)}
          />
        )}
      </Row>
      )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  logbook: { borderRadius: 8, padding: 14, paddingLeft: 20, gap: 8, borderLeftWidth: 6, borderLeftColor: '#c2a98c' },
  pencil: { fontFamily: fonts.titleItalic, fontSize: 18, lineHeight: 22 },
})
