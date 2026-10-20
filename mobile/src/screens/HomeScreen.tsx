// The Home tab on one screen: your harbour as you've made it, and tiles that each open a page:
// its look, your tavern, the decorations you've earned, port upgrades, the workshop and the log.

import { useState, type ReactNode } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { DECOR, DECOR_SLOTS, HANGINGS, HOME_BUNTING, HOME_NAME_MAX, HOME_ROOFS, HOME_SIGNS, HOME_WALLS, TAVERN_CLOTHS, TAVERN_FLOORS, TAVERN_NAME_MAX, TAVERN_WALLS, type DecorId } from '../../../src/game/data/home'
import { decorUnlocked, type styleHome } from '../../../src/game/home'
import { portPeople, UPGRADES } from '../../../src/game/crew'
import { getPart } from '../../../src/game/parts'
import { TavernScene } from '../art/TavernScene'
import { homeTavern } from '../homeTavern'
import { boatOfCaptain } from '../../../src/game/crew'
import { getPortDef, homeOf } from '../../../src/game/regions'
import { HomeScene } from '../art/HomeScene'
import { lightAt } from '../art/light'
import { REGION_STYLE } from '../art/regionStyle'
import { fonts, useTheme } from '../theme'
import { duration } from '../../../src/format'
import { Body, Button, Card, Measure, Muted, Row, Strip, Tile, Title } from '../components/ui'

type Props = {
  game: GameState
  now: number
  onStyle: (patch: Parameters<typeof styleHome>[1]) => void
  onPlace: (slot: number, id: DecorId | null) => void
  upgrades: ReactNode
  workshop: ReactNode
  /** The storm alerts switch, shown with the log. */
  alerts: ReactNode
  /** Play-test tools (development builds only). */
  dev?: ReactNode
}

type Page = 'menu' | 'look' | 'tavern' | 'decor' | 'upgrades' | 'workshop' | 'log' | 'dev'

function Swatches({ colors, value, onPick, label }: { colors: readonly string[]; value: string; onPick: (c: string) => void; label: string }) {
  const t = useTheme()
  return (
    <Row style={{ gap: 6 }}>
      <Muted style={{ width: 44 }}>{label}</Muted>
      {colors.map((c) => (
        <Pressable
          key={c}
          onPress={() => onPick(c)}
          accessibilityRole="button"
          accessibilityLabel={`${label} colour`}
          accessibilityState={{ selected: c === value }}
          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: c === value ? 3 : 1, borderColor: c === value ? t.accent : t.border }}
        />
      ))}
    </Row>
  )
}

export function HomeScreen({ game, now, onStyle, onPlace, upgrades, workshop, alerts, dev }: Props) {
  const t = useTheme()
  const [page, setPage] = useState<Page>('menu')
  const home = getPortDef(homeOf(game))
  const st = REGION_STYLE[home.region]
  const style = game.player.homeStyle ?? {}
  const name = style.name ?? home.name
  const [draft, setDraft] = useState(name)
  const [slot, setSlot] = useState(0)
  const tavern = homeTavern(game)
  const [tavernDraft, setTavernDraft] = useState(tavern.name)
  const people = portPeople(game, homeOf(game))
  const twoTone = (pairs: readonly (readonly [string, string])[], value: number | undefined, onPick: (i: number) => void, label: string) => (
    <Row style={{ gap: 6 }}>
      <Muted style={{ width: 44 }}>{label}</Muted>
      {pairs.map(([a, b], i) => (
        <Pressable
          key={i}
          onPress={() => onPick(i)}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${i + 1}`}
          accessibilityState={{ selected: value === i }}
          style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', borderWidth: value === i ? 3 : 1, borderColor: value === i ? t.accent : t.border }}
        >
          <View style={{ flex: 1, backgroundColor: a }} />
          <View style={{ flex: 1, backgroundColor: b }} />
        </Pressable>
      ))}
    </Row>
  )
  const decor = (style.decor ?? Array.from({ length: DECOR_SLOTS }, () => null)) as (DecorId | null)[]
  const look = {
    name,
    wall: style.wall ?? (home.region === 'bay' ? HOME_WALLS[0] : st.walls[0]),
    roof: style.roof ?? HOME_ROOFS[0],
    sign: style.sign ?? HOME_SIGNS[0],
    bunting: style.bunting ?? 0,
    decor,
    upgrades: game.player.portUpgrades,
    region: home.region,
    captains: game.player.roster
      .filter((c) => {
        const b = boatOfCaptain(game, c.id)
        return !b || b.state === 'idle'
      })
      .map((c) => ({ id: c.id, rare: !!c.rare, region: c.region ?? 'bay', persona: c.persona })),
  }
  const scene = <Measure>{(w, h) => <HomeScene width={Math.min(w, 720)} height={h} light={lightAt(now)} look={look} />}</Measure>
  const back = (title: string) => (
    <Row style={{ flexWrap: 'nowrap' }}>
      <Button small kind="secondary" label={`‹ ${name}`} onPress={() => setPage('menu')} />
      <Title size={22}>{title}</Title>
    </Row>
  )

  if (page === 'look')
    return (
      <View style={{ flex: 1, gap: 10 }}>
        {back('Its look')}
        {scene}
        <Card>
          <Row style={{ flexWrap: 'nowrap' }}>
            <Muted style={{ width: 44 }}>Name</Muted>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onEndEditing={() => draft.trim() !== name && onStyle({ name: draft })}
              maxLength={HOME_NAME_MAX}
              placeholder={home.name}
              placeholderTextColor={t.muted}
              returnKeyType="done"
              accessibilityLabel="Harbour name"
              style={{ flex: 1, color: t.text, fontFamily: fonts.semibold, fontSize: 16, borderBottomWidth: 1, borderBottomColor: t.border, paddingVertical: 6 }}
            />
          </Row>
          <Swatches label="Walls" colors={HOME_WALLS} value={look.wall} onPick={(c) => onStyle({ wall: c })} />
          <Swatches label="Roof" colors={HOME_ROOFS} value={look.roof} onPick={(c) => onStyle({ roof: c })} />
          <Swatches label="Sign" colors={HOME_SIGNS} value={look.sign} onPick={(c) => onStyle({ sign: c })} />
          <Row style={{ gap: 8 }}>
            <Muted style={{ width: 44 }}>Flags</Muted>
            {HOME_BUNTING.map((set, i) => (
              <Pressable
                key={i}
                onPress={() => onStyle({ bunting: i })}
                accessibilityRole="button"
                accessibilityLabel={`Bunting ${i + 1}`}
                accessibilityState={{ selected: look.bunting === i }}
                style={{ flexDirection: 'row', gap: 2, padding: 4, borderRadius: 8, borderWidth: look.bunting === i ? 2 : 1, borderColor: look.bunting === i ? t.accent : t.border }}
              >
                {set.slice(0, 3).map((c, j) => (
                  <View key={j} style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c }} />
                ))}
              </Pressable>
            ))}
          </Row>
        </Card>
      </View>
    )

  if (page === 'tavern')
    return (
      <View style={{ flex: 1, gap: 10 }}>
        {back(tavern.name)}
        <Measure>
          {(w, h) => (
            <TavernScene width={Math.min(w, 720)} height={h} light={lightAt(now)} hands={people.hands} captain={people.captain} selectedId={null} onSelect={() => undefined} region={home.region} custom={tavern} />
          )}
        </Measure>
        <Card>
          <Row style={{ flexWrap: 'nowrap' }}>
            <Muted style={{ width: 44 }}>Name</Muted>
            <TextInput
              value={tavernDraft}
              onChangeText={setTavernDraft}
              onEndEditing={() => tavernDraft.trim() !== tavern.name && onStyle({ tavernName: tavernDraft })}
              maxLength={TAVERN_NAME_MAX}
              placeholder={st.tavern}
              placeholderTextColor={t.muted}
              returnKeyType="done"
              accessibilityLabel="Tavern name"
              style={{ flex: 1, color: t.text, fontFamily: fonts.semibold, fontSize: 16, borderBottomWidth: 1, borderBottomColor: t.border, paddingVertical: 6 }}
            />
          </Row>
          {twoTone(TAVERN_WALLS, style.tavernWall, (i) => onStyle({ tavernWall: i }), 'Walls')}
          {twoTone(TAVERN_FLOORS, style.tavernFloor, (i) => onStyle({ tavernFloor: i }), 'Floor')}
          <Swatches label="Cloth" colors={TAVERN_CLOTHS} value={tavern.cloth ?? ''} onPick={(c) => onStyle({ cloth: c })} />
          <Row style={{ gap: 6 }}>
            <Muted style={{ width: 44 }}>Wall</Muted>
            {HANGINGS.map((h) => (
              <Pressable
                key={h.id}
                onPress={() => onStyle({ hanging: h.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: tavern.hanging === h.id }}
                style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: tavern.hanging === h.id ? 2 : 1, borderColor: tavern.hanging === h.id ? t.accent : t.border }}
              >
                <Text style={{ color: t.text, fontFamily: fonts.medium, fontSize: 12 }}>{h.name}</Text>
              </Pressable>
            ))}
          </Row>
        </Card>
      </View>
    )

  if (page === 'decor')
    return (
      <View style={{ flex: 1, gap: 10 }}>
        {back('Decorations')}
        {scene}
        <Muted>Pick a spot on the quay, then what stands there.</Muted>
        <Row style={{ flexWrap: 'nowrap' }}>
          {Array.from({ length: DECOR_SLOTS }, (_, i) => {
            const d = DECOR.find((x) => x.id === decor[i])
            return (
              <Pressable
                key={i}
                onPress={() => setSlot(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: slot === i }}
                style={{ flex: 1, padding: 8, borderRadius: 10, borderWidth: slot === i ? 2 : 1, borderColor: slot === i ? t.accent : t.border, backgroundColor: t.surface2 }}
              >
                <Text style={{ color: t.muted, fontFamily: fonts.medium, fontSize: 11 }}>{['Left', 'Middle', 'Right'][i]}</Text>
                <Text numberOfLines={1} style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>
                  {d?.name ?? 'Empty'}
                </Text>
              </Pressable>
            )
          })}
        </Row>
        <Strip>
          {DECOR.map((d) => {
            const unlocked = decorUnlocked(game, d.id)
            const here = decor[slot] === d.id
            return (
              <Pressable
                key={d.id}
                disabled={!unlocked}
                onPress={() => onPlace(slot, here ? null : d.id)}
                accessibilityRole="button"
                accessibilityState={{ disabled: !unlocked, selected: here }}
                style={{ width: 150, minHeight: 92, gap: 3, padding: 10, borderRadius: 12, borderWidth: here ? 2 : 1, borderColor: here ? t.accent : t.border, backgroundColor: t.surface, opacity: unlocked ? 1 : 0.5 }}
              >
                <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <Body style={{ fontWeight: '700', fontSize: 14, flexShrink: 1 }}>{d.name}</Body>
                  <Text style={{ color: here ? t.accent : t.muted, fontSize: 16 }}>{here ? '✓' : unlocked ? '+' : '🔒︎'}</Text>
                </Row>
                <Muted style={{ fontSize: 12 }} numberOfLines={3}>
                  {unlocked ? (decor.includes(d.id) && !here ? 'Placed elsewhere · tap to move it here' : here ? 'Here · tap to take it away' : 'Tap to place') : d.earned}
                </Muted>
              </Pressable>
            )
          })}
        </Strip>
      </View>
    )

  if (page === 'upgrades' || page === 'workshop')
    return (
      <View style={{ flex: 1, gap: 10 }}>
        {back(page === 'upgrades' ? 'Port upgrades' : 'Workshop')}
        {page === 'upgrades' ? upgrades : workshop}
      </View>
    )

  if (page === 'log')
    return (
      <View style={{ flex: 1, gap: 10 }}>
        {back('Harbour log')}
        {alerts}
        <HarbourLog game={game} now={now} />
        {dev && <Button small kind="secondary" label="Play-test tools" onPress={() => setPage('dev')} />}
      </View>
    )

  if (page === 'dev')
    return (
      <View style={{ flex: 1, gap: 10 }}>
        <Row>
          <Button small kind="secondary" label="‹ Harbour log" onPress={() => setPage('log')} />
        </Row>
        {dev}
      </View>
    )

  const rares = game.player.partInventory.filter((id) => getPart(id).rarity !== 'standard').length
  const built = Object.values(game.player.portUpgrades).reduce((n, l) => n + l, 0)
  const placed = decor.filter(Boolean).length
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <View>
        <Title size={26}>{name}</Title>
        <Muted>
          Home port: {home.name}
          {look.captains.length ? ` · ${look.captains.length} of your captains ashore` : ''}
        </Muted>
      </View>
      {scene}
      <Row style={{ gap: 8 }}>
        <Tile label="Its look" sub="Name, colours, flags" onPress={() => setPage('look')} />
        <Tile label={tavern.name} sub={`Your tavern · ${people.hands.length} hands in`} onPress={() => setPage('tavern')} />
        <Tile label="Decorations" sub={`${placed} of ${DECOR_SLOTS} spots filled`} onPress={() => setPage('decor')} />
        <Tile label="Port upgrades" sub={`${built} of ${3 * UPGRADES.length} levels built`} onPress={() => setPage('upgrades')} />
        <Tile label="Workshop" sub={rares ? `${rares} set piece${rares === 1 ? '' : 's'}` : 'Scrap, sets, spares'} onPress={() => setPage('workshop')} />
        <Tile label="Harbour log" sub={game.log[0] ? `${duration(now - game.log[0].at)} ago: ${game.log[0].text}` : 'Nothing yet'} onPress={() => setPage('log')} />
      </Row>
    </View>
  )
}

/** The log a page at a time: as many entries as fit, with Newer and Older. */
function HarbourLog({ game, now }: { game: GameState; now: number }) {
  const t = useTheme()
  const [page, setPage] = useState(0)
  return (
    <Measure>
      {(w, h) => {
        // Entries run to two lines; leave room for the paging row.
        const per = Math.max(3, Math.floor((h - 48) / 42))
        const pages = Math.max(1, Math.ceil(game.log.length / per))
        const p = Math.min(page, pages - 1)
        const shown = game.log.slice(p * per, (p + 1) * per)
        return (
          <View style={{ width: w, height: h, gap: 6 }}>
            {shown.length === 0 && <Muted>Nothing to report yet.</Muted>}
            {shown.map((e, i) => (
              <Body key={`${e.at}-${i}`} style={{ fontSize: 14, color: e.kind === 'sunk' || e.kind === 'lost' ? t.bad : t.text }}>
                <Text style={{ color: t.muted, fontSize: 12 }}>{duration(now - e.at)} ago </Text>
                <Text numberOfLines={2}>{e.text}</Text>
              </Body>
            ))}
            <View style={{ flex: 1 }} />
            {pages > 1 && (
              <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <Button small kind="secondary" label="‹ Newer" disabled={p === 0} onPress={() => setPage(p - 1)} />
                <Muted>
                  {p + 1} of {pages}
                </Muted>
                <Button small kind="secondary" label="Older ›" disabled={p >= pages - 1} onPress={() => setPage(p + 1)} />
              </Row>
            )}
          </View>
        )
      }}
    </Measure>
  )
}
