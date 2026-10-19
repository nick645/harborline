import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Canvas, Group, rect, rrect, Rect } from '@shopify/react-native-skia'
import type { GameState } from '../../../src/game/types'
import type { CaptainView } from '../../../src/game/captains'
import { boatOfCaptain, boatsNeedingHands, managerRole, portPeople, quayInfo, rosterViews } from '../../../src/game/crew'
import type { RegionId } from '../../../src/game/data/ports'
import { getPortDef, homeOf } from '../../../src/game/regions'

const portRegion = (portId?: string): RegionId => (portId ? getPortDef(portId).region : 'bay')

/** The tavern's name at a port: yours at home, the region's elsewhere. */
const tavernName = (game: GameState, portId?: string) =>
  (portId ?? homeOf(game)) === homeOf(game) ? homeTavern(game).name : REGION_STYLE[getPortDef(portId!).region].tavern
import { getBoatClass, handFee } from '../../../src/game/economy'
import { DRINK_WATCHES } from '../../../src/game/data/hands'
import { SCOUT_ACTIONS, type ScoutAction } from '../../../src/game/data/captains'
import { coins, duration } from '../../../src/format'
import { QuayScene } from '../art/QuayScene'
import { TavernScene } from '../art/TavernScene'
import { REGION_STYLE } from '../art/regionStyle'
import { homeTavern } from '../homeTavern'
import { WorkScene } from '../art/WorkScene'
import { Figure } from '../art/Figure'
import { useSceneClock } from '../art/clock'
import { lightAt } from '../art/light'
import { lookFor } from '../art/looks'
import { SkillRange } from '../screens/CaptainScreen'
import { fonts, useTheme } from '../theme'
import { Anchors, Button, Card, Measure, Muted, Row, Strip, Title } from './ui'

type Props = {
  game: GameState
  now: number
  /** Returns true if the scouting went ahead. */
  onScout: (id: string, action: ScoutAction) => Promise<boolean>
  onHire: (id: string) => void
  onOpenCaptain: (id: string) => void
  onBuyDrink: (handId: string) => Promise<boolean>
  onHireHand: (handId: string, boatId: string) => void
  /** Which part of the harbour is showing; kept by the app so a boat card can send you to the tavern. */
  view: CaptainsView
  onView: (v: CaptainsView) => void
  /** Whose quay and tavern: home by default. A port screen shows only its quay and tavern. */
  portId?: string
}

export type CaptainsView = 'quay' | 'tavern'

const VERDICT = { sleeper: 'Sleeper', 'all-talk': 'All talk', 'true-to-form': 'True to form' } as const

/** A port's quay and tavern: who's looking for work there. */
export function HiringScreen(props: Props) {
  const { view: tab, onView: setTab } = props
  const people = portPeople(props.game, props.portId ?? homeOf(props.game))
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Row>
        <Button small kind={tab === 'quay' ? 'primary' : 'secondary'} label={`The quay (${people.recruits.length})`} onPress={() => setTab('quay')} />
        <Button small kind={tab === 'tavern' ? 'primary' : 'secondary'} label={`The tavern${people.captain ? ' ✦' : ''}`} onPress={() => setTab('tavern')} />
      </Row>
      {tab === 'quay' ? <Quay {...props} /> : <Tavern {...props} />}
    </View>
  )
}

/** Your captains: at work on the home quay, and the roster. */
export function CaptainsScreen({ game, now, onOpenCaptain }: { game: GameState; now: number; onOpenCaptain: (id: string) => void }) {
  return <Roster game={game} now={now} onOpenCaptain={onOpenCaptain} />
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
  const { hands, captain } = portPeople(game, props.portId ?? homeOf(game))
  const region = portRegion(props.portId ?? homeOf(game))
  const watchesLeft = quayInfo(game, now).watchesLeft
  const [selectedId, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const selHand = hands.find((h) => h.id === selectedId) ?? (captain && selectedId === captain.id ? null : hands[0] ?? null)
  const selCaptain = captain && (selectedId === captain.id || (!selHand && !hands.length)) ? captain : null
  const boats = boatsNeedingHands(game)

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Watches game={game} now={now} />
      <Measure>
        {(w, h) => (
      <TavernScene
        width={Math.min(w, 720)}
        height={h}
        light={lightAt(now)}
        hands={hands}
        region={region}
        custom={(props.portId ?? homeOf(game)) === homeOf(game) ? homeTavern(game) : undefined}
        captain={captain}
        selectedId={selCaptain?.id ?? selHand?.id ?? null}
        onSelect={(id) => {
          setSelected(id)
          setToast(null)
        }}
      />
        )}
      </Measure>
      {captain && !selCaptain && (
        <Pressable onPress={() => setSelected(captain.id)} accessibilityRole="button">
          <Muted style={{ color: t.legendary }}>✦ Someone unusual is sitting by the fire. Tap them.</Muted>
        </Pressable>
      )}
      {selCaptain ? (
        <RecruitCard {...props} sel={selCaptain} rare />
      ) : selHand ? (
        <Card style={{ gap: 6, padding: 10 }}>
          <Title size={21}>{selHand.name}</Title>
          {selHand.known ? (
            <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 14 }}>
              <Text style={{ fontFamily: fonts.bold }}>{selHand.known.name}.</Text> {selHand.known.description}
            </Text>
          ) : (
            <Text style={{ fontFamily: fonts.titleItalic, fontSize: 16, color: '#e2d2c8' }}>“{selHand.rumour}”</Text>
          )}
          {toast && <Muted>{toast}</Muted>}
          {!selHand.known && (
            <Button
              small
              kind="secondary"
              label={`Buy them a drink · ${DRINK_WATCHES} watch`}
              disabled={watchesLeft < DRINK_WATCHES}
              onPress={async () => {
                if (await onBuyDrink(selHand.id)) setToast(`You stand ${selHand.name.split(' ')[0]} a drink by the fire and hear the real story.`)
              }}
            />
          )}
          {boats.length === 0 ? (
            <Muted>None of your boats needs hands right now. Boats of tier 2 and up do.</Muted>
          ) : (
            <>
              <Strip>
                {boats
                  .filter((b) => b.state === 'idle')
                  .map((b) => {
                    const fee = handFee(getBoatClass(b.classId))
                    return <Button key={b.id} small label={`Hire for ${b.nickname} · ${coins(fee)}c`} disabled={game.player.coins < fee} onPress={() => onHireHand(selHand.id, b.id)} />
                  })}
              </Strip>
              {boats.some((b) => b.state !== 'idle') && (
                <Muted>
                  {boats
                    .filter((b) => b.state !== 'idle')
                    .map((b) => b.nickname)
                    .join(', ')}{' '}
                  can take hands once docked at home.
                </Muted>
              )}
            </>
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
  const people = portPeople(game, props.portId ?? homeOf(game))
  const recruits = people.recruits
  const region = portRegion(props.portId ?? homeOf(game))
  const [selectedId, setSelected] = useState<string | null>(null)
  const sel = recruits.find((r) => r.id === selectedId) ?? recruits[0] ?? null
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Watches game={game} now={now} />
      <Pressable onPress={() => props.onView('tavern')} accessibilityRole="button">
        <Muted>
          Tap {tavernName(game, props.portId)} to go inside: deckhands drink there{people.captain ? <Text style={{ color: t.legendary }}>, and someone unusual is by the fire ✦</Text> : ''}.
        </Muted>
      </Pressable>
      {recruits.length > 0 ? (
        <Measure>
          {(w, h) => (
            <QuayScene width={Math.min(w, 720)} height={h} light={lightAt(now)} recruits={recruits} region={region} selectedId={sel?.id ?? null} onSelect={setSelected} onEnterTavern={() => props.onView('tavern')} />
          )}
        </Measure>
      ) : (
        <Muted>Nobody else is looking for work today.</Muted>
      )}
      {sel && <RecruitCard key={sel.id} {...props} sel={sel} />}
    </View>
  )
}

/** A captain looking for work: what's known, scouting, and hiring. */
function RecruitCard({ game, now, onScout, onHire, sel, portId, rare = false }: Props & { sel: CaptainView; rare?: boolean }) {
  const t = useTheme()
  const info = quayInfo(game, now)
  const [moment, setMoment] = useState<ScoutAction | null>(null)
  const scout = async (action: ScoutAction) => {
    if (await onScout(sel.id, action)) setMoment(action)
  }
  const short: Record<ScoutAction, string> = { ask: 'Ask around', logbook: 'Logbook', run: 'Take out' }
  return (
    <Card accent={rare ? t.legendary : undefined} style={{ gap: 6, padding: 10 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Title size={21}>
          {rare ? '✦ ' : ''}
          {sel.name}
        </Title>
        <Anchors n={sel.reputation} size={12} />
      </Row>
      <Muted>
        {sel.homePort} · tier {sel.sailsTiers[0]}–{sel.sailsTiers[1]} boats · asks {coins(sel.fee)}c
        {sel.verdict ? ` · ${VERDICT[sel.verdict]}` : ''}
      </Muted>
      {moment ? (
        <Moment c={sel} action={moment} tavern={tavernName(game, portId)} />
      ) : sel.traits.length ? (
        <Text numberOfLines={2} style={{ fontFamily: fonts.titleItalic, fontSize: 16, color: '#e2d2c8' }}>
          {sel.traits.map((tr) => `“${tr.rumour}”`).join('  ')}
        </Text>
      ) : null}
      {!(sel.skillBand[0] <= 1 && sel.skillBand[1] >= 100) && <SkillRange band={sel.skillBand} />}
      <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
        {(Object.keys(SCOUT_ACTIONS) as ScoutAction[]).map((a) => (
          <View key={a} style={{ flex: 1 }}>
            <Button
              small
              kind="secondary"
              label={`${short[a]} · ${SCOUT_ACTIONS[a].watches}`}
              disabled={(a === 'run' && sel.verdict !== null) || info.watchesLeft < SCOUT_ACTIONS[a].watches}
              onPress={() => scout(a)}
            />
          </View>
        ))}
      </Row>
      <Button small label={`Hire for ${coins(sel.fee)}c`} disabled={game.player.coins < sel.fee} onPress={() => onHire(sel.id)} />
    </Card>
  )
}

/** A scouting action told as a little moment on the quay. */
function Moment({ c, action, tavern }: { c: CaptainView; action: ScoutAction; tavern: string }) {
  const t = useTheme()
  const first = c.name.split(' ')[0]
  const latest = c.traits[c.traits.length - 1]
  const text =
    action === 'ask'
      ? `You stand a round at ${tavern}. Someone at the bar leans in: “${latest?.rumour ?? '…'}”`
      : action === 'logbook'
        ? `${first} lets you leaf through their logbook under the lamp. Tidy entries, a few smudged ones. Skill somewhere between ${c.skillBand[0]} and ${c.skillBand[1]}.`
        : `You take ${first} out past the breakwater as the lamps come on. By the time you tie up, you have a feeling: ${c.verdict ? VERDICT[c.verdict] : '…'}.`
  return (
    <View style={{ backgroundColor: t.surface2, borderRadius: 10, padding: 10 }}>
      <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  )
}

function Roster({ game, now, onOpenCaptain }: { game: GameState; now: number; onOpenCaptain: (id: string) => void }) {
  const t = useTheme()
  const roster = rosterViews(game)
  if (roster.length === 0) return <Muted>No captains yet. Find one on the quay in the Ports tab.</Muted>
  const moored = game.player.ownedBoats.find((b) => b.state === 'idle') ?? game.player.ownedBoats[0]
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Measure>
        {(w, h) => <WorkScene width={Math.min(w, 720)} height={h} light={lightAt(now)} cls={moored ? getBoatClass(moored.classId) : null} captains={roster} onOpen={onOpenCaptain} />}
      </Measure>
      <Strip>
        {roster.map((c) => {
          const boat = boatOfCaptain(game, c.id)
          const role = managerRole(c.role)
          const where = role ? role.name : boat ? (boat.state === 'sailing' || boat.state === 'returning' ? `At sea · ${boat.nickname}` : `Aboard ${boat.nickname}`) : 'Ashore'
          return (
            <Pressable
              key={c.id}
              onPress={() => onOpenCaptain(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open Captain ${c.name}`}
              style={({ pressed }) => ({ width: 132, padding: 8, gap: 4, borderRadius: 14, borderWidth: 1, borderColor: c.rare ? t.legendary : t.border, backgroundColor: t.surface, opacity: pressed ? 0.8 : 1 })}
            >
              <Portrait id={c.id} rare={c.rare} region={c.region} />
              <Text numberOfLines={1} style={{ color: t.text, fontFamily: fonts.title, fontSize: 17 }}>
                {c.name}
              </Text>
              <Anchors n={c.reputation} size={11} />
              <Text numberOfLines={1} style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
                {where}
              </Text>
            </Pressable>
          )
        })}
      </Strip>
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
