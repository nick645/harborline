import { useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { Canvas, Group, rect, rrect, Rect } from '@shopify/react-native-skia'
import type { GameState } from '../../../src/game/types'
import type { CaptainView } from '../../../src/game/captains'
import { boatOfCaptain, managerRole, quayInfo, recruitViews, rosterViews } from '../../../src/game/crew'
import { SCOUT_ACTIONS, type ScoutAction } from '../../../src/game/data/captains'
import { coins, duration } from '../../../src/format'
import { QuayScene } from '../art/QuayScene'
import { Figure } from '../art/Figure'
import { useSceneClock } from '../art/clock'
import { lightAt } from '../art/light'
import { lookFor } from '../art/looks'
import { SkillRange } from '../screens/CaptainScreen'
import { fonts, useTheme } from '../theme'
import { Anchors, Button, Card, Muted, Row, Tag, Title } from './ui'

type Props = {
  game: GameState
  now: number
  /** Returns true if the scouting went ahead. */
  onScout: (id: string, action: ScoutAction) => boolean
  onHire: (id: string) => void
  onOpenCaptain: (id: string) => void
}

const VERDICT = { sleeper: 'Sleeper', 'all-talk': 'All talk', 'true-to-form': 'True to form' } as const

export function CaptainsScreen(props: Props) {
  const [tab, setTab] = useState<'quay' | 'roster'>('quay')
  return (
    <View style={{ gap: 10 }}>
      <Row>
        <Button small kind={tab === 'quay' ? 'primary' : 'secondary'} label={`The quay (${props.game.recruitPool.recruits.length})`} onPress={() => setTab('quay')} />
        <Button small kind={tab === 'roster' ? 'primary' : 'secondary'} label={`Your captains (${props.game.player.roster.length})`} onPress={() => setTab('roster')} />
      </Row>
      {tab === 'quay' ? <Quay {...props} /> : <Roster {...props} />}
    </View>
  )
}

function Quay({ game, now, onScout, onHire }: Props) {
  const t = useTheme()
  const { width } = useWindowDimensions()
  const info = quayInfo(game, now)
  const recruits = recruitViews(game)
  const [selectedId, setSelected] = useState<string | null>(null)
  const [moment, setMoment] = useState<{ id: string; action: ScoutAction } | null>(null)
  const sel = recruits.find((r) => r.id === selectedId) ?? recruits[0] ?? null

  const scout = (action: ScoutAction) => {
    if (sel && onScout(sel.id, action)) setMoment({ id: sel.id, action })
  }

  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Muted>New faces in {duration(info.refreshesAt - now)}</Muted>
        <Row style={{ gap: 3 }}>
          {Array.from({ length: Math.max(info.watchesLeft, 0) + 0 }, (_, i) => (
            <Text key={i} style={{ color: t.accent, fontSize: 14 }}>●</Text>
          ))}
          <Muted>
            {info.watchesLeft} watch{info.watchesLeft === 1 ? '' : 'es'} left
          </Muted>
        </Row>
      </Row>

      {recruits.length > 0 ? (
        <QuayScene
          width={Math.min(width - 24, 720)}
          light={lightAt(now)}
          recruits={recruits}
          selectedId={sel?.id ?? null}
          onSelect={(id) => {
            setSelected(id)
            setMoment(null)
          }}
        />
      ) : (
        <Muted>Nobody else is looking for work today.</Muted>
      )}

      {sel && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Title size={24}>{sel.name}</Title>
            <Anchors n={sel.reputation} />
          </Row>
          <Muted>
            From {sel.homePort} · takes tier {sel.sailsTiers[0]}–{sel.sailsTiers[1]} boats · asks {coins(sel.fee)}c
          </Muted>
          {sel.traits.map((tr) => (
            <Text key={tr.id} style={{ fontFamily: fonts.titleItalic, fontSize: 18, color: tr.status === 'disproven' ? t.muted : '#e2d2c8', textDecorationLine: tr.status === 'disproven' ? 'line-through' : 'none' }}>
              “{tr.rumour}”
            </Text>
          ))}
          {!(sel.skillBand[0] <= 1 && sel.skillBand[1] >= 100) && <SkillRange band={sel.skillBand} />}
          {sel.verdict && <Tag label={VERDICT[sel.verdict]} color={sel.verdict === 'sleeper' ? t.good : sel.verdict === 'all-talk' ? t.bad : t.muted} dark />}
          {moment?.id === sel.id && <Moment c={sel} action={moment.action} />}
          <Row>
            {(Object.keys(SCOUT_ACTIONS) as ScoutAction[]).map((a) => (
              <Button
                key={a}
                small
                kind="secondary"
                label={`${SCOUT_ACTIONS[a].name} · ${SCOUT_ACTIONS[a].watches}`}
                disabled={(a === 'run' && sel.verdict !== null) || info.watchesLeft < SCOUT_ACTIONS[a].watches}
                onPress={() => scout(a)}
              />
            ))}
          </Row>
          <Button label={`Hire for ${coins(sel.fee)}c`} disabled={game.player.coins < sel.fee} onPress={() => onHire(sel.id)} />
        </Card>
      )}
    </View>
  )
}

/** A scouting action told as a little moment on the quay. */
function Moment({ c, action }: { c: CaptainView; action: ScoutAction }) {
  const t = useTheme()
  const first = c.name.split(' ')[0]
  const latest = c.traits[c.traits.length - 1]
  const text =
    action === 'ask'
      ? `You stand a round at the Gull & Lantern. Someone at the bar leans in: “${latest?.rumour ?? '…'}”`
      : action === 'logbook'
        ? `${first} lets you leaf through their logbook under the lamp. Tidy entries, a few smudged ones. Skill somewhere between ${c.skillBand[0]} and ${c.skillBand[1]}.`
        : `You take ${first} out past the breakwater as the lamps come on. By the time you tie up, you have a feeling: ${c.verdict ? VERDICT[c.verdict] : '…'}.`
  return (
    <View style={{ backgroundColor: t.surface2, borderRadius: 10, padding: 10 }}>
      <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  )
}

function Roster({ game, onOpenCaptain }: Props) {
  const t = useTheme()
  const roster = rosterViews(game)
  if (roster.length === 0) return <Muted>No captains yet. Find one on the quay.</Muted>
  return (
    <View style={{ gap: 10 }}>
      {roster.map((c) => {
        const boat = boatOfCaptain(game, c.id)
        const role = managerRole(c.role)
        const where = role ? role.name : boat ? (boat.state === 'sailing' || boat.state === 'returning' ? `At the helm of ${boat.nickname}` : `Aboard ${boat.nickname}`) : 'Ashore'
        return (
          <Pressable key={c.id} onPress={() => onOpenCaptain(c.id)} accessibilityRole="button" accessibilityLabel={`Open Captain ${c.name}`}>
            <Card>
              <Row style={{ flexWrap: 'nowrap' }}>
                <Portrait id={c.id} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Title size={20}>{c.name}</Title>
                    <Anchors n={c.reputation} size={12} />
                  </Row>
                  <Muted>
                    {where} · {c.voyageCount} voyage{c.voyageCount === 1 ? '' : 's'}
                    {c.hiredBy ? ' · hired by a manager' : ''}
                  </Muted>
                  <SkillRange band={c.skillBand} />
                </View>
                <Text style={{ color: t.muted, fontSize: 20 }}>›</Text>
              </Row>
            </Card>
          </Pressable>
        )
      })}
    </View>
  )
}

/** A small head-and-shoulders portrait under lamplight. */
function Portrait({ id }: { id: string }) {
  const clock = useSceneClock()
  return (
    <Canvas style={{ width: 56, height: 64 }}>
      <Group clip={rrect(rect(0, 0, 56, 64), 10, 10)}>
        <Rect x={0} y={0} width={56} height={64} color="#433145" />
        <Figure look={lookFor(id)} x={-6} y={-8} scale={1.2} clock={clock} rimLight="#ffd27a" />
      </Group>
    </Canvas>
  )
}
