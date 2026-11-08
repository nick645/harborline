import { useState } from 'react'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { Canvas, Group, rect, rrect, Rect } from '@shopify/react-native-skia'
import type { GameState } from '../../../src/game/types'
import type { CaptainView } from '../../../src/game/captains'
import { ratingTitle } from '../../../src/game/data/captains'
import { bestOnOffer, boatOfCaptain, boatsNeedingHands, boatToShowTo, courtedPeople, courtingOf, managerRole, prospectBudget, portPeople, quayInfo, recruitViewById, rosterViews } from '../../../src/game/crew'
import { termsFee } from '../../../src/game/courting'
import { COURT_ACTIONS, TERMS_MAX, type CourtAction } from '../../../src/game/data/courting'
import type { RegionId } from '../../../src/game/data/ports'
import { getPortDef, homeOf } from '../../../src/game/regions'

const portRegion = (portId?: string): RegionId => (portId ? getPortDef(portId).region : 'bay')

/** The tavern's name at a port: yours at home, the region's elsewhere. */
const tavernName = (game: GameState, portId?: string) =>
  (portId ?? homeOf(game)) === homeOf(game) ? homeTavern(game).name : REGION_STYLE[getPortDef(portId!).region].tavern
import { getBoatClass, handFee } from '../../../src/game/economy'
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
import { storybookLookFor } from '../art/parts/upgrade'
import { Lodestone, SkillSheet, Standing } from './SkillSheet'
import { fonts, useTheme } from '../theme'
import { Button, Card, Measure, Muted, Row, Segments, Strip, Title } from './ui'
import { Bearing } from './Bearing'

type Props = {
  game: GameState
  now: number
  /** Returns true if the scouting went ahead. */
  onScout: (id: string, action: ScoutAction) => Promise<boolean>
  onHire: (id: string) => void
  onOpenCaptain: (id: string) => void
  /** Make your case to someone; resolves to whether it went ahead. */
  onCourt: (id: string, action: CourtAction) => Promise<boolean>
  onHireHand: (handId: string, boatId: string) => void
  /** Which part of the harbour is showing; kept by the app so a boat card can send you to the tavern. */
  view: CaptainsView
  onView: (v: CaptainsView) => void
  /** Whose quay and tavern: home by default. A port screen shows only its quay and tavern. */
  portId?: string
  /** Someone to have selected on arrival (from the Captains tab's courting list). */
  focusId?: string | null
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

/** Your captains: at work on the home quay, and the roster; then everyone you're courting. */
export function CaptainsScreen({
  game,
  now,
  onOpenCaptain,
  onOpenCourted,
  onMoveProspect,
  onPassProspect,
}: {
  game: GameState
  now: number
  onOpenCaptain: (id: string) => void
  onOpenCourted: (portId: string, place: CaptainsView, id: string) => void
  onMoveProspect: (id: string, by: -1 | 1) => void
  onPassProspect: (id: string, pass: boolean) => void
}) {
  return (
    // Scrolls, so a long list of prospects is never squeezed.
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <Roster game={game} now={now} onOpenCaptain={onOpenCaptain} />
      <Courting game={game} now={now} onOpen={onOpenCourted} onMove={onMoveProspect} onPass={onPassProspect} />
    </ScrollView>
  )
}

/**
 * Your prospects, as a list in your order: who's heading your way, when they decide, and what
 * your coins cover from the top down. Move them up and down, or pass on one, to choose who gets
 * paid for first.
 */
function Courting({
  game,
  now,
  onOpen,
  onMove,
  onPass,
}: {
  game: GameState
  now: number
  onOpen: (portId: string, place: CaptainsView, id: string) => void
  onMove: (id: string, by: -1 | 1) => void
  onPass: (id: string, pass: boolean) => void
}) {
  const t = useTheme()
  const people = courtedPeople(game, now)
  const budget = prospectBudget(game, now)
  const shortOf = budget.wanted - budget.coins
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title size={20}>Prospects</Title>
        <Muted>{people.length ? `${people.length} deciding` : ''}</Muted>
      </Row>
      <Leads game={game} now={now} onOpen={onOpen} />
      {people.length === 0 ? (
        <Muted>None yet. Anyone you start winning over on a quay or in a tavern shows here, with when they'll decide.</Muted>
      ) : (
        <>
          {/* Coins against everyone heading your way */}
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: shortOf > 0 ? t.bad : t.border, backgroundColor: t.surface, padding: 10, gap: 2 }}>
            <Text style={{ color: shortOf > 0 ? t.bad : t.text, fontFamily: fonts.semibold, fontSize: 14 }}>
              {budget.wanted === 0
                ? 'Nobody is heading your way yet'
                : shortOf > 0
                  ? `${coins(budget.wanted)}c to sign them all · you have ${coins(budget.coins)}c`
                  : `${coins(budget.wanted)}c to sign them all · you have ${coins(budget.coins)}c: covered`}
            </Text>
            <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 }}>
              {shortOf > 0
                ? `${coins(shortOf)}c short. Coins go to the top of your list first: whoever's short when their time comes goes to a rival. Reorder with ▲▼.`
                : 'Coins are set aside from the top of your list down. Reorder with ▲▼, or pass on anyone you don\'t want.'}
            </Text>
          </View>
          {people.map((p, i) => {
            const v = p.court
            const b = p.budget
            const tag =
              b.status === 'covered'
                ? { text: v.canSign ? 'Won over · covered' : 'Covered', color: t.good }
                : b.status === 'short'
                  ? { text: `Short ${coins(b.shortBy)}c`, color: t.bad }
                  : b.status === 'passed'
                    ? { text: 'Passed on', color: t.muted }
                    : b.status === 'no-berth'
                      ? { text: 'No berth for them', color: t.muted }
                      : { text: `Going to ${v.finalLeader.name}`, color: t.bad }
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: b.status === 'short' ? t.bad : p.rare ? t.legendary : t.border, backgroundColor: t.surface, padding: 6, opacity: b.status === 'passed' ? 0.6 : 1 }}>
                <Text style={{ width: 18, textAlign: 'center', color: t.muted, fontFamily: fonts.bold, fontSize: 14 }}>{i + 1}</Text>
                <Pressable onPress={() => onOpen(p.portId, p.place, p.id)} accessibilityRole="button" accessibilityLabel={`${p.name}, ${tag.text}, at ${getPortDef(p.portId).name}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {p.kind === 'captain' ? (
                    <Portrait id={p.id} rare={p.rare} region={p.region} small />
                  ) : (
                    <View style={{ width: 34, height: 38, borderRadius: 8, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: t.muted, fontSize: 16 }}>⚓︎</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 1 }}>
                    <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
                      <Text numberOfLines={1} style={{ flexShrink: 1, color: t.text, fontFamily: fonts.title, fontSize: 16 }}>
                        {p.rare ? '✦ ' : ''}
                        {p.name}
                      </Text>
                      {p.fee !== null && <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 12 }}>{coins(p.fee)}c</Text>}
                    </Row>
                    <Text numberOfLines={1} style={{ color: tag.color, fontFamily: fonts.semibold, fontSize: 12 }}>
                      {tag.text}
                    </Text>
                    <Text numberOfLines={1} style={{ color: t.muted, fontFamily: fonts.body, fontSize: 11 }}>
                      {v.canSign ? 'Sign now ›' : `Decides in ${duration(Math.max(0, v.decidesAt - now))}`} · {getPortDef(p.portId).name}
                    </Text>
                  </View>
                </Pressable>
                <View style={{ gap: 4 }}>
                  <Row style={{ gap: 4, flexWrap: 'nowrap' }}>
                    <OrderButton label="▲" disabled={i === 0} onPress={() => onMove(p.id, -1)} />
                    <OrderButton label="▼" disabled={i === people.length - 1} onPress={() => onMove(p.id, 1)} />
                  </Row>
                  <Pressable onPress={() => onPass(p.id, b.status !== 'passed')} accessibilityRole="button" hitSlop={6}>
                    <Text style={{ color: t.muted, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' }}>{b.status === 'passed' ? 'Take back' : 'Pass on'}</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
        </>
      )}
    </View>
  )
}

function OrderButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label === '▲' ? 'Move up' : 'Move down'}
      style={{ width: 30, height: 28, borderRadius: 8, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}
    >
      <Text style={{ color: t.text, fontSize: 12 }}>{label}</Text>
    </Pressable>
  )
}

/**
 * Your watches for scouting, and where the best captains looking for work are right now, from
 * what you can see of them: tap one to go and meet them.
 */
function Leads({ game, now, onOpen }: { game: GameState; now: number; onOpen: (portId: string, place: CaptainsView, id: string) => void }) {
  const t = useTheme()
  const best = bestOnOffer(game, now)
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, padding: 10, gap: 8 }}>
      <Watches game={game} now={now} />
      <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12, marginTop: -4 }}>A watch scouts one captain a little closer: what they're really like at sea.</Text>
      {best.length > 0 && <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 14 }}>Best on offer now</Text>}
      {best.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onOpen(c.portId, c.place, c.id)}
          accessibilityRole="button"
          accessibilityLabel={`${c.name}, ${c.reputation} anchors, ${c.place === 'tavern' ? 'in the tavern' : 'on the quay'} at ${getPortDef(c.portId).name}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: c.rare ? t.legendary : t.border, backgroundColor: t.surface2, padding: 6, opacity: pressed ? 0.8 : 1 })}
        >
          <Portrait id={c.id} rare={c.rare} region={getPortDef(c.portId).region} small />
          <View style={{ flex: 1, gap: 1 }}>
            <Text numberOfLines={1} style={{ color: t.text, fontFamily: fonts.title, fontSize: 16 }}>
              {c.rare ? '✦ ' : ''}
              {c.name}
            </Text>
            <Text numberOfLines={1} style={{ color: c.rare ? t.legendary : t.accent, fontFamily: fonts.semibold, fontSize: 12 }}>
              {'⚓︎'.repeat(c.reputation)} {c.reputation} anchor{c.reputation === 1 ? '' : 's'}
              {c.rare ? ' · someone unusual' : ''}
              {c.potential ? ` · ${c.potential === 'mythic' ? 'Mythic' : 'Legend'} in them` : ''}
            </Text>
            <Text numberOfLines={1} style={{ color: t.muted, fontFamily: fonts.body, fontSize: 11 }}>
              {c.place === 'tavern' ? 'In the tavern' : 'On the quay'} at {getPortDef(c.portId).name} · {coins(c.fee)}c
              {Number.isFinite(c.decidesIn) ? ` · decides in ${duration(c.decidesIn)}` : ''}
            </Text>
          </View>
          <Text style={{ color: t.accent, fontFamily: fonts.bold, fontSize: 16 }}>›</Text>
        </Pressable>
      ))}
      {best.length === 0 && <Muted>No one new is looking for work in your waters just now. Fresh faces arrive when the watches refill.</Muted>}
    </View>
  )
}

/** How many watches are left today, and when new faces arrive. */
function Watches({ game, now }: { game: GameState; now: number }) {
  const t = useTheme()
  const info = quayInfo(game, now)
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Muted>Watches refill in {duration(info.refreshesAt - now)}</Muted>
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
  const { game, now, onHireHand } = props
  const t = useTheme()
  const { hands, captain } = portPeople(game, props.portId ?? homeOf(game))
  const region = portRegion(props.portId ?? homeOf(game))
  const [selectedId, setSelected] = useState<string | null>(props.focusId ?? null)
  const selHand = hands.find((h) => h.id === selectedId) ?? (captain && selectedId === captain.id ? null : hands[0] ?? null)
  const selCaptain = captain && (selectedId === captain.id || (!selHand && !hands.length)) ? captain : null
  const boats = boatsNeedingHands(game).filter((b) => b.state === 'idle')
  const court = selHand ? courtingOf(game, selHand.id, now) : null

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
            onSelect={setSelected}
          />
        )}
      </Measure>
      {captain && !selCaptain && (
        <Pressable onPress={() => setSelected(captain.id)} accessibilityRole="button">
          <Muted style={{ color: t.legendary }}>✦ Someone unusual is sitting by the fire. Tap them.</Muted>
        </Pressable>
      )}
      {selCaptain ? (
        <RecruitCard key={selCaptain.id} {...props} sel={selCaptain} rare />
      ) : selHand ? (
        <Card key={selHand.id} style={{ gap: 6, padding: 10 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Title size={21}>{selHand.name}</Title>
            {selHand.known ? (
              <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>{selHand.known.name}</Text>
            ) : (
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.titleItalic, fontSize: 14, color: '#e2d2c8' }}>
                “{selHand.rumour}”
              </Text>
            )}
          </Row>
          {court && <Bearing v={court} now={now} compact />}
          {court && <CourtPanel {...props} personId={selHand.id} name={selHand.name} hand />}
          {court?.canSign ? (
            boats.length ? (
              <Strip>
                {boats.map((b) => {
                  const fee = termsFee(handFee(getBoatClass(b.classId)), court)
                  return <Button key={b.id} small label={`Sign for ${b.nickname} · ${coins(fee)}c`} disabled={game.player.coins < fee} onPress={() => onHireHand(selHand.id, b.id)} />
                })}
              </Strip>
            ) : (
              <Muted>Ready to sign, but none of your boats docked at home needs hands.</Muted>
            )
          ) : (
            <Muted numberOfLines={2}>If they choose your line, they join your biggest boat short of hands, or wait at home for her.</Muted>
          )}
        </Card>
      ) : (
        <Muted>The tavern is quiet. Someone new will be in soon.</Muted>
      )}
    </View>
  )
}

/** What you can do to win someone over, what you know they want, and how they took it. */
function CourtPanel({ game, now, onCourt, personId, name, hand }: Props & { personId: string; name: string; hand?: boolean }) {
  const t = useTheme()
  const v = courtingOf(game, personId, now)
  const [said, setSaid] = useState<string | null>(null)
  if (!v) return null
  const first = name.split(' ')[0]
  const watches = quayInfo(game, now).watchesLeft
  const boat = boatToShowTo(game, personId)
  const cost = (a: CourtAction) => (hand ? COURT_ACTIONS[a].handWatches : COURT_ACTIONS[a].watches)
  // A captain's fee, better terms included (a hand's depends on the boat they'd join).
  const fee = hand ? undefined : recruitViewById(game, personId)?.fee
  // Remember what they'd shown you before, so the reaction can tell what's new.
  const act = async (a: CourtAction) => {
    const knownBefore = v.known.length
    if (await onCourt(personId, a)) setSaid(a === 'drink' ? `drink:${knownBefore}` : a)
  }
  const latest = v.known[v.known.length - 1]
  const reaction =
    said === null
      ? null
      : said.startsWith('drink')
        ? latest && Number(said.split(':')[1]) < v.known.length
          ? `Over a drink, ${first} lets slip what matters to them: ${latest.name.toLowerCase()}.`
          : `${first} enjoys the drink, and tells you nothing new.`
        : said === 'terms'
          ? `${first} turns the new terms over: ${100 + 25 * v.terms}% of what they first asked.`
          : said === 'ship'
            ? `${first} walks the deck of ${boat?.nickname ?? 'your boat'} and runs a hand along the rail.`
            : `${first} takes in your harbour.`
  // What each costs, and why it can't be done right now.
  const buttons: { a: CourtAction; label: string; cost: string; why: string | null }[] = [
    {
      a: 'drink',
      label: 'Drink',
      cost: `${cost('drink')} watch${cost('drink') === 1 ? '' : 'es'} (time)`,
      why: !v.drinkReady ? 'Again later' : watches < cost('drink') ? 'No watches' : null,
    },
    { a: 'harbour', label: 'Harbour', cost: 'Free · once', why: v.walked ? 'Done' : null },
    { a: 'ship', label: 'A boat', cost: 'Free · once', why: v.shown ? 'Done' : !boat ? 'None docked' : null },
    { a: 'terms', label: 'Terms', cost: fee ? `+${coins(Math.round((fee * 0.25) / 10) * 10)}c fee` : 'Fee +25%', why: v.terms >= TERMS_MAX ? 'Maxed' : null },
  ]
  return (
    <View style={{ gap: 6 }}>
      <Text numberOfLines={2} style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
        {v.known.length ? (
          <>
            Wants <Text style={{ color: t.text, fontFamily: fonts.semibold }}>{v.known.map((k) => k.name.toLowerCase()).join(', ')}</Text> · {v.known.map((k) => k.hint.toLowerCase()).join('; ')}
          </>
        ) : (
          <>
            Word is: <Text style={{ fontFamily: fonts.titleItalic, fontSize: 14, color: '#e2d2c8' }}>“{v.heard.heard}”</Text>
          </>
        )}
      </Text>
      {reaction && (
        <View style={{ backgroundColor: t.surface2, borderRadius: 10, padding: 8 }}>
          <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>{reaction}</Text>
        </View>
      )}
      <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
        {buttons.map((b) => (
          <Pressable
            key={b.a}
            disabled={!!b.why}
            onPress={() => void act(b.a)}
            accessibilityRole="button"
            accessibilityLabel={`${b.label}, ${b.why ?? b.cost}`}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              paddingVertical: 7,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: b.why ? t.border : t.accent,
              backgroundColor: pressed ? t.surface2 : t.surface,
              opacity: b.why ? 0.5 : 1,
            })}
          >
            <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 14 }}>{b.label}</Text>
            <Text style={{ color: b.why ? t.muted : t.accent, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' }}>{b.cost}</Text>
            {b.why && <Text style={{ color: t.muted, fontFamily: fonts.semibold, fontSize: 10 }}>{b.why}</Text>}
          </Pressable>
        ))}
      </Row>
      <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 11 }}>
        Watches are your time on the quay: {watches} left, a fresh few every 6 hours. Coins are only paid when they sign: their fee, plus anything better terms add. Each helps a little; whatever answers what they want helps a lot.
      </Text>
      <Forecast v={v} first={first} fee={fee} coins={game.player.coins} now={now} />
    </View>
  )
}

/** In plain words: when they'll decide, who they'll go with if nothing changes, and what it takes. */
function Forecast({ v, first, fee, coins: have, now }: { v: NonNullable<ReturnType<typeof courtingOf>>; first: string; fee?: number; coins: number; now: number }) {
  const t = useTheme()
  const when = duration(Math.max(0, v.decidesAt - now))
  const short = fee !== undefined && have < fee
  let head: string
  let body: string
  let color = t.text
  if (v.canSign) {
    head = `${first} is won over`
    body = 'Sign them on now, before anyone else does.'
    color = t.good
  } else if (!v.courted) {
    head = `If nothing changes: signs with ${v.finalLeader.name} in ${when}`
    body = `${first} hasn't heard from you yet. Make at least one move to win them over, or they'll go elsewhere.`
    color = t.bad
  } else if (v.forecast === 'you') {
    head = `If nothing changes: signs with you in ${when}`
    body = `${short ? `You'll need ${coins(fee!)}c by then, or they'll go to ${v.finalLeader.name}. ` : `They join on their own when time's up${fee !== undefined ? ` (${coins(fee)}c)` : ''}. `}To sign sooner, win them over: ${v.toWinOver} more.`
    color = t.good
  } else {
    head = `If nothing changes: signs with ${v.finalLeader.name} in ${when}`
    body = `The rivals keep gaining until then. You need ${v.toLevel} more to stay level at the end.`
    color = t.bad
  }
  return (
    <View style={{ borderRadius: 10, borderWidth: 1, borderColor: color, padding: 8, gap: 2 }}>
      <Text style={{ color, fontFamily: fonts.bold, fontSize: 14 }}>{head}</Text>
      <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 }}>{body}</Text>
    </View>
  )
}

function Quay(props: Props) {
  const { game, now } = props
  const people = portPeople(game, props.portId ?? homeOf(game))
  const recruits = people.recruits
  const region = portRegion(props.portId ?? homeOf(game))
  const [selectedId, setSelected] = useState<string | null>(props.focusId ?? null)
  const sel = recruits.find((r) => r.id === selectedId) ?? recruits[0] ?? null
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Watches game={game} now={now} />
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

/** A captain looking for work: which way they lean, courting them, scouting them, and signing. */
function RecruitCard(props: Props & { sel: CaptainView; rare?: boolean }) {
  const { game, now, onScout, onHire, sel, portId, rare = false } = props
  const t = useTheme()
  const info = quayInfo(game, now)
  const court = courtingOf(game, sel.id, now)
  const [panel, setPanel] = useState<'court' | 'scout'>('court')
  const [moment, setMoment] = useState<ScoutAction | null>(null)
  const scout = async (action: ScoutAction) => {
    if (await onScout(sel.id, action)) setMoment(action)
  }
  const short: Record<ScoutAction, string> = { ask: 'Ask around', logbook: 'Logbook', run: 'Take out' }
  return (
    <Card accent={rare ? t.legendary : undefined} style={{ gap: 6, padding: 10 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Row style={{ flexShrink: 1, flexWrap: 'nowrap', gap: 6 }}>
          <Title size={21}>
            {rare ? '✦ ' : ''}
            {sel.name}
          </Title>
          {sel.potential && <Lodestone potential={sel.potential} />}
        </Row>
        <Standing c={sel} size={12} />
      </Row>
      <Muted numberOfLines={1}>
        {sel.homePort} · tier {sel.sailsTiers[0]}–{sel.sailsTiers[1]} boats · asks {coins(sel.fee)}c
        {sel.verdict ? ` · ${VERDICT[sel.verdict]}` : ''}
      </Muted>
      {court && <Bearing v={court} now={now} />}
      <Segments
        items={[
          { id: 'court', label: 'Win them over' },
          { id: 'scout', label: 'Size them up' },
        ]}
        value={panel}
        onChange={setPanel}
      />
      {panel === 'court' ? (
        court && <CourtPanel {...props} personId={sel.id} name={sel.name} />
      ) : (
        <View style={{ gap: 6 }}>
          {moment ? (
            <Moment c={sel} action={moment} tavern={tavernName(game, portId)} />
          ) : sel.traits.length ? (
            <Text numberOfLines={2} style={{ fontFamily: fonts.titleItalic, fontSize: 16, color: '#e2d2c8' }}>
              {sel.traits.map((tr) => `“${tr.rumour}”`).join('  ')}
            </Text>
          ) : null}
          <SkillSheet c={sel} compact />
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
        </View>
      )}
      {court?.canSign && <Button small label={`Sign them on · ${coins(sel.fee)}c`} disabled={game.player.coins < sel.fee} onPress={() => onHire(sel.id)} />}
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
        ? `${first} lets you leaf through their logbook under the lamp. Tidy entries, a few smudged ones, and one skill comes clear.`
        : `You take ${first} out past the breakwater as the lamps come on. By the time you tie up, you have a feeling: ${c.verdict ? VERDICT[c.verdict] : '…'}.${c.potential === 'mythic' ? ' And something more: the sea itself seems to listen to them.' : c.potential === 'legend' ? ' And something more: they have the makings of a Legend.' : ''}`
  return (
    <View style={{ backgroundColor: t.surface2, borderRadius: 10, padding: 10 }}>
      <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  )
}

function Roster({ game, now, onOpenCaptain }: { game: GameState; now: number; onOpenCaptain: (id: string) => void }) {
  const t = useTheme()
  const { width: screenW } = useWindowDimensions()
  const sceneH = Math.round(Math.min(300, screenW * 0.6))
  // Best first: by sea rating as far as you know it, reputation breaking ties.
  const roster = rosterViews(game).sort((a, b) => b.rating.guess - a.rating.guess || b.reputation - a.reputation)
  if (roster.length === 0) return <Muted>No captains yet. Find one on the quay in the Ports tab.</Muted>
  const moored = game.player.ownedBoats.find((b) => b.state === 'idle') ?? game.player.ownedBoats[0]
  return (
    <View style={{ gap: 10 }}>
      <View style={{ height: sceneH }}>
      <Measure>
        {(w, h) => <WorkScene width={Math.min(w, 720)} height={h} light={lightAt(now)} cls={moored ? getBoatClass(moored.classId) : null} captains={roster} onOpen={onOpenCaptain} />}
      </Measure>
      </View>
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
              <Portrait id={c.id} rare={c.rare} region={c.region} persona={c.persona?.id} title={c.title} />
              <Text numberOfLines={1} style={{ color: t.text, fontFamily: fonts.title, fontSize: 17 }}>
                {c.name}
              </Text>
              <Row style={{ gap: 4, flexWrap: 'nowrap' }}>
                <Standing c={c} size={11} />
                {c.potential && (!c.rank || (c.rank === 'legend' && c.potential === 'mythic')) && <Lodestone potential={c.potential} size={14} />}
              </Row>
              <SkillLine c={c} />
              <Text numberOfLines={1} style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
                {where}
              </Text>
              {!c.morale.steadfast && (c.morale.mood === 'unsettled' || c.morale.mood === 'quitting') && (
                <Text numberOfLines={1} style={{ color: c.morale.mood === 'quitting' ? t.bad : t.warn, fontFamily: fonts.bold, fontSize: 11 }}>
                  {c.morale.mood === 'quitting' ? '⚠ Close to quitting' : 'Unsettled'}
                </Text>
              )}
            </Pressable>
          )
        })}
      </Strip>
    </View>
  )
}

/** Their sea rating in a line: their level (LVL) and a bar (paler while it's a guess), with the room they
 *  could still grow faintly past it once that's known. */
function SkillLine({ c }: { c: CaptainView }) {
  const t = useTheme()
  const r = c.rating
  const top = c.growth.known === 'unknown' ? r.guess : Math.max(r.guess, c.growth.band[1])
  return (
    <View style={{ gap: 2 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={`Level ${r.guess}, ${ratingTitle(r.guess)}${r.sure ? '' : ', a guess so far'}`}>
      <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 12 }}>
        <Text style={{ color: t.muted, fontSize: 10 }}>LVL </Text>
        {r.guess}
      </Text>
      <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, top)}%`, backgroundColor: t.accent, opacity: 0.25 }} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, r.guess)}%`, backgroundColor: t.accent, opacity: r.sure ? 1 : 0.7 }} />
      </View>
    </View>
      <Text numberOfLines={1} style={{ color: t.accent, fontFamily: fonts.body, fontSize: 11, opacity: r.sure ? 1 : 0.75 }}>
        {ratingTitle(r.guess)}
      </Text>
    </View>
  )
}

/** A small head-and-shoulders portrait under lamplight. */
function Portrait({ id, rare, region, persona, small, title }: { id: string; rare: boolean; region: RegionId; persona?: string; small?: boolean; title?: number }) {
  const clock = useSceneClock()
  const k = small ? 0.6 : 1
  return (
    <Canvas style={{ width: 56 * k, height: 64 * k }}>
      <Group transform={[{ scale: k }]} clip={rrect(rect(0, 0, 56, 64), 10, 10)}>
        <Rect x={0} y={0} width={56} height={64} color="#433145" />
        <Figure look={storybookLookFor(id, rare, region, persona, title)} x={-6} y={-8} scale={1.2} clock={clock} rimLight="#ffd27a" />
      </Group>
    </Canvas>
  )
}
