import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import type { CaptainView } from '../../../src/game/captains'
import { boatOfCaptain, managerRole, promotionOptions, quayInfo, recruitViews, rosterViews } from '../../../src/game/crew'
import { SCOUT_ACTIONS, type ScoutAction } from '../../../src/game/data/captains'
import { coins, duration } from '../../../src/format'
import { useTheme } from '../theme'
import { Body, Button, Card, Muted, Row, Tag } from './ui'

type Props = {
  game: GameState
  now: number
  onScout: (id: string, action: ScoutAction) => void
  onHire: (id: string) => void
  onFire: (id: string) => void
  onAshore: (id: string) => void
  onPromote: (id: string, role: 'dockhand' | 'harbormaster' | 'fleet-manager', track?: 'cargo' | 'passenger') => void
  onTakeOver: (id: string) => void
}

export function CaptainsScreen(props: Props) {
  const [tab, setTab] = useState<'quay' | 'roster'>('quay')
  return (
    <View style={{ gap: 10 }}>
      <Row>
        <Button small kind={tab === 'quay' ? 'primary' : 'secondary'} label={`Quay (${props.game.recruitPool.recruits.length})`} onPress={() => setTab('quay')} />
        <Button small kind={tab === 'roster' ? 'primary' : 'secondary'} label={`Yours (${props.game.player.roster.length})`} onPress={() => setTab('roster')} />
      </Row>
      {tab === 'quay' ? <Quay {...props} /> : <Roster {...props} />}
    </View>
  )
}

function Quay({ game, now, onScout, onHire }: Props) {
  const info = quayInfo(game, now)
  return (
    <View style={{ gap: 10 }}>
      <Muted>
        {info.watchesLeft} watch{info.watchesLeft === 1 ? '' : 'es'} left · new faces in {duration(info.refreshesAt - now)} · scout level {info.scoutLevel}
      </Muted>
      {recruitViews(game).map((c) => (
        <Card key={c.id}>
          <Head c={c} />
          <SkillRange band={c.skillBand} />
          <Traits c={c} />
          <Row>
            {(Object.keys(SCOUT_ACTIONS) as ScoutAction[]).map((a) => (
              <Button
                key={a}
                small
                kind="secondary"
                label={`${SCOUT_ACTIONS[a].name} · ${SCOUT_ACTIONS[a].watches}w`}
                disabled={(a === 'run' && c.verdict !== null) || info.watchesLeft < SCOUT_ACTIONS[a].watches}
                onPress={() => onScout(c.id, a)}
              />
            ))}
            <Button small label={`Hire ${coins(c.fee)}c`} disabled={game.player.coins < c.fee} onPress={() => onHire(c.id)} />
          </Row>
        </Card>
      ))}
    </View>
  )
}

function Roster({ game, onFire, onAshore, onPromote, onTakeOver }: Props) {
  const roster = rosterViews(game)
  if (roster.length === 0) return <Muted>No captains yet. Find one on the quay.</Muted>
  return (
    <View style={{ gap: 10 }}>
      {roster.map((c) => {
        const boat = boatOfCaptain(game, c.id)
        const role = managerRole(c.role)
        return (
          <Card key={c.id}>
            <Head c={c} />
            <Muted>
              {role ? `${role.name} · ${role.description}` : boat ? `Aboard ${boat.nickname}${boat.state !== 'idle' ? ' (at sea)' : ''}` : 'Ashore'} · {c.voyageCount} voyage
              {c.voyageCount === 1 ? '' : 's'}
              {c.hiredBy ? ` · hired by ${roster.find((m) => m.id === c.hiredBy)?.name ?? 'a manager'}` : ''}
            </Muted>
            <SkillRange band={c.skillBand} />
            {c.knownDevelopment && (
              <Muted>
                {c.knownDevelopment.name}: {c.knownDevelopment.description}
              </Muted>
            )}
            <Traits c={c} />
            <Row>
              {boat && !c.bonded && boat.state === 'idle' && <Button small kind="secondary" label="Step ashore" onPress={() => onAshore(c.id)} />}
              {c.hiredBy && <Button small kind="secondary" label="Take over" onPress={() => onTakeOver(c.id)} />}
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
                  disabled={game.player.coins < c.severance || (!!boat && boat.state !== 'idle')}
                  onPress={() =>
                    Alert.alert(`Let ${c.name} go?`, `Severance is ${coins(c.severance)} coins.`, [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Let go', style: 'destructive', onPress: () => onFire(c.id) },
                    ])
                  }
                />
              )}
            </Row>
          </Card>
        )
      })}
    </View>
  )
}

const VERDICT = { sleeper: 'Sleeper', 'all-talk': 'All talk', 'true-to-form': 'True to form' } as const

function Head({ c }: { c: CaptainView }) {
  const t = useTheme()
  return (
    <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Row>
          <Body style={{ fontWeight: '700' }}>{c.name}</Body>
          {c.verdict && (
            <Tag label={VERDICT[c.verdict]} color={c.verdict === 'sleeper' ? t.good : c.verdict === 'all-talk' ? t.bad : t.muted} />
          )}
        </Row>
        <Muted>
          from {c.homePort} · sails tier {c.sailsTiers[0]}–{c.sailsTiers[1]} boats
        </Muted>
      </View>
      <Text style={{ fontSize: 15, letterSpacing: 1 }}>
        <Text style={{ color: t.text }}>{'⚓︎'.repeat(c.reputation)}</Text>
        <Text style={{ color: t.muted, opacity: 0.3 }}>{'⚓︎'.repeat(5 - c.reputation)}</Text>
      </Text>
    </Row>
  )
}

function SkillRange({ band }: { band: [number, number] }) {
  const t = useTheme()
  const [lo, hi] = band
  const unknown = lo <= 1 && hi >= 100
  return (
    <Row style={{ flexWrap: 'nowrap' }}>
      <Muted>Skill</Muted>
      <View style={[styles.track, { backgroundColor: t.surface2 }]}>
        {!unknown && <View style={[styles.band, { left: `${lo - 1}%`, width: `${Math.max(2, hi - lo + 1)}%`, backgroundColor: t.accent }]} />}
      </View>
      <Muted>{unknown ? '?' : `${lo}–${hi}`}</Muted>
    </Row>
  )
}

function Traits({ c }: { c: CaptainView }) {
  const t = useTheme()
  if (!c.traits.length) return <Muted>Nobody knows much about them yet.</Muted>
  return (
    <View style={{ gap: 2 }}>
      {c.traits.map((tr) => (
        <Text key={tr.id} style={{ fontSize: 13, color: tr.status === 'disproven' ? t.muted : t.text }}>
          {tr.status === 'proven' && (
            <>
              <Text style={{ fontWeight: '700' }}>✓ {tr.name}</Text> <Text style={{ color: t.muted }}>{tr.description}</Text>
            </>
          )}
          {tr.status === 'rumour' && <Text>Rumour: “{tr.rumour}”</Text>}
          {tr.status === 'disproven' && <Text style={{ textDecorationLine: 'line-through' }}>“{tr.rumour}”</Text>}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5 },
})
