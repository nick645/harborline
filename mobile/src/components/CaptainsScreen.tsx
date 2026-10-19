import { useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { Canvas, Group, rect, rrect, Rect } from '@shopify/react-native-skia'
import type { GameState } from '../../../src/game/types'
import type { CaptainView } from '../../../src/game/captains'
import { boatOfCaptain, boatsNeedingHands, managerRole, portPeople, quayInfo, rosterViews } from '../../../src/game/crew'
import { HOME_PORT_ID, type RegionId } from '../../../src/game/data/ports'
import { getPortDef } from '../../../src/game/regions'

const portRegion = (portId?: string): RegionId => (portId ? getPortDef(portId).region : 'bay')
import { getBoatClass, handFee } from '../../../src/game/economy'
import { DRINK_WATCHES } from '../../../src/game/data/hands'
import { SCOUT_ACTIONS, type ScoutAction } from '../../../src/game/data/captains'
import { coins, duration } from '../../../src/format'
import { QuayScene } from '../art/QuayScene'
import { TavernScene } from '../art/TavernScene'
import { WorkScene } from '../art/WorkScene'
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
  onBuyDrink: (handId: string) => boolean
  onHireHand: (handId: string, boatId: string) => void
  /** Which part of the harbour is showing; kept by the app so a boat card can send you to the tavern. */
  view: CaptainsView
  onView: (v: CaptainsView) => void
  /** Whose quay and tavern: home by default. A port screen shows only its quay and tavern. */
  portId?: string
}

export type CaptainsView = 'quay' | 'tavern' | 'roster'

const VERDICT = { sleeper: 'Sleeper', 'all-talk': 'All talk', 'true-to-form': 'True to form' } as const

export function CaptainsScreen(props: Props) {
  const { view: tab, onView: setTab } = props
  const people = portPeople(props.game, props.portId ?? HOME_PORT_ID)
  const atPort = props.portId !== undefined && props.portId !== HOME_PORT_ID
  return (
    <View style={{ gap: 10 }}>
      <Row>
        <Button small kind={tab === 'quay' ? 'primary' : 'secondary'} label={`The quay (${people.recruits.length})`} onPress={() => setTab('quay')} />
        <Button small kind={tab === 'tavern' ? 'primary' : 'secondary'} label={`The tavern${people.captain ? ' ✦' : ''}`} onPress={() => setTab('tavern')} />
        {!atPort && <Button small kind={tab === 'roster' ? 'primary' : 'secondary'} label={`Your captains (${props.game.player.roster.length})`} onPress={() => setTab('roster')} />}
      </Row>
      {tab === 'quay' ? <Quay {...props} /> : tab === 'tavern' ? <Tavern {...props} /> : <Roster {...props} />}
    </View>
  )
}

/** How many watches are left today, and when new faces arrive. */
function Watches({ game, now }: { game: GameState; now: number }) {
  const t = useTheme()
  const info = quayInfo(game, now)
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Muted>New faces in {duration(info.refreshesAt - now)}</Muted>
      <Row style={{ gap: 3 }}>
        {Array.from({ length: Math.max(info.watchesLeft, 0) }, (_, i) => (
          <Text key={i} style={{ color: t.accent, fontSize: 14 }}>●</Text>
        ))}
        <Muted>
          {info.watchesLeft} watch{info.watchesLeft === 1 ? '' : 'es'} left
        </Muted>
      </Row>
    </Row>
  )
}

function Tavern(props: Props) {
  const { game, now, onBuyDrink, onHireHand } = props
  const t = useTheme()
  const { width } = useWindowDimensions()
  const { hands, captain } = portPeople(game, props.portId ?? HOME_PORT_ID)
  const region = portRegion(props.portId)
  const watchesLeft = quayInfo(game, now).watchesLeft
  const [selectedId, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const selHand = hands.find((h) => h.id === selectedId) ?? (captain && selectedId === captain.id ? null : hands[0] ?? null)
  const selCaptain = captain && (selectedId === captain.id || (!selHand && !hands.length)) ? captain : null
  const boats = boatsNeedingHands(game)

  return (
    <View style={{ gap: 10 }}>
      <Watches game={game} now={now} />
      <TavernScene
        width={Math.min(width - 24, 720)}
        light={lightAt(now)}
        hands={hands}
        region={region}
        captain={captain}
        selectedId={selCaptain?.id ?? selHand?.id ?? null}
        onSelect={(id) => {
          setSelected(id)
          setToast(null)
        }}
      />
      {captain && !selCaptain && (
        <Pressable onPress={() => setSelected(captain.id)} accessibilityRole="button">
          <Muted style={{ color: t.legendary }}>✦ Someone unusual is sitting by the fire. Tap them.</Muted>
        </Pressable>
      )}
      {selCaptain ? (
        <RecruitCard {...props} sel={selCaptain} rare />
      ) : selHand ? (
        <Card>
          <Title size={22}>{selHand.name}</Title>
          {selHand.known ? (
            <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 15 }}>
              <Text style={{ fontFamily: fonts.bold }}>{selHand.known.name}.</Text> {selHand.known.description}
            </Text>
          ) : (
            <Text style={{ fontFamily: fonts.titleItalic, fontSize: 18, color: '#e2d2c8' }}>“{selHand.rumour}”</Text>
          )}
          {toast && <Muted>{toast}</Muted>}
          {!selHand.known && (
            <Button
              small
              kind="secondary"
              label={`Buy them a drink · ${DRINK_WATCHES} watch`}
              disabled={watchesLeft < DRINK_WATCHES}
              onPress={() => {
                if (onBuyDrink(selHand.id)) setToast(`You stand ${selHand.name.split(' ')[0]} a drink by the fire and hear the real story.`)
              }}
            />
          )}
          {boats.length === 0 ? (
            <Muted>None of your boats needs hands right now. Boats of tier 2 and up do.</Muted>
          ) : (
            <Row>
              {boats.map((b) => {
                const fee = handFee(getBoatClass(b.classId))
                return <Button key={b.id} small label={`Hire for ${b.nickname} · ${coins(fee)}c`} disabled={game.player.coins < fee} onPress={() => onHireHand(selHand.id, b.id)} />
              })}
            </Row>
          )}
        </Card>
      ) : (
        <Muted>The tavern is quiet. New faces come in every six hours.</Muted>
      )}
    </View>
  )
}

function Quay(props: Props) {
  const { game, now } = props
  const t = useTheme()
  const { width } = useWindowDimensions()
  const people = portPeople(game, props.portId ?? HOME_PORT_ID)
  const recruits = people.recruits
  const region = portRegion(props.portId)
  const [selectedId, setSelected] = useState<string | null>(null)
  const sel = recruits.find((r) => r.id === selectedId) ?? recruits[0] ?? null
  return (
    <View style={{ gap: 10 }}>
      <Watches game={game} now={now} />
      <Pressable onPress={() => props.onView('tavern')} accessibilityRole="button">
        <Muted>
          Tap the tavern to go inside: deckhands drink there{people.captain ? <Text style={{ color: t.legendary }}>, and someone unusual is by the fire ✦</Text> : ''}.
        </Muted>
      </Pressable>
      {recruits.length > 0 ? (
        <QuayScene width={Math.min(width - 24, 720)} light={lightAt(now)} recruits={recruits} region={region} selectedId={sel?.id ?? null} onSelect={setSelected} onEnterTavern={() => props.onView('tavern')} />
      ) : (
        <Muted>Nobody else is looking for work today.</Muted>
      )}
      {sel && <RecruitCard key={sel.id} {...props} sel={sel} />}
    </View>
  )
}

/** A captain looking for work: what's known, scouting, and hiring. */
function RecruitCard({ game, now, onScout, onHire, sel, rare = false }: Props & { sel: CaptainView; rare?: boolean }) {
  const t = useTheme()
  const info = quayInfo(game, now)
  const [moment, setMoment] = useState<ScoutAction | null>(null)
  const scout = (action: ScoutAction) => {
    if (onScout(sel.id, action)) setMoment(action)
  }
  return (
    <Card accent={rare ? t.legendary : undefined}>
      {rare && <Tag label="A RARE FIND" color={t.legendary} dark />}
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
      {moment && <Moment c={sel} action={moment} />}
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

function Roster({ game, now, onOpenCaptain }: Props) {
  const t = useTheme()
  const roster = rosterViews(game)
  const { width } = useWindowDimensions()
  if (roster.length === 0) return <Muted>No captains yet. Find one on the quay.</Muted>
  const moored = game.player.ownedBoats.find((b) => b.state === 'idle') ?? game.player.ownedBoats[0]
  return (
    <View style={{ gap: 10 }}>
      <WorkScene
        width={Math.min(width - 24, 720)}
        light={lightAt(now)}
        cls={moored ? getBoatClass(moored.classId) : null}
        captains={roster}
        onOpen={onOpenCaptain}
      />
      {roster.map((c) => {
        const boat = boatOfCaptain(game, c.id)
        const role = managerRole(c.role)
        const where = role ? role.name : boat ? (boat.state === 'sailing' || boat.state === 'returning' ? `At the helm of ${boat.nickname}` : `Aboard ${boat.nickname}`) : 'Ashore'
        return (
          <Pressable key={c.id} onPress={() => onOpenCaptain(c.id)} accessibilityRole="button" accessibilityLabel={`Open Captain ${c.name}`}>
            <Card>
              <Row style={{ flexWrap: 'nowrap' }}>
                <Portrait id={c.id} rare={c.rare} region={c.region} />
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
function Portrait({ id, rare, region }: { id: string; rare: boolean; region: RegionId }) {
  const clock = useSceneClock()
  return (
    <Canvas style={{ width: 56, height: 64 }}>
      <Group clip={rrect(rect(0, 0, 56, 64), 10, 10)}>
        <Rect x={0} y={0} width={56} height={64} color="#433145" />
        <Figure look={lookFor(id, rare, region)} x={-6} y={-8} scale={1.2} clock={clock} rimLight="#ffd27a" />
      </Group>
    </Canvas>
  )
}
