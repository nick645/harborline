// The Home tab on one screen: your harbour as you've made it, and tiles that each open a page:
// its look, your tavern, the decorations you've earned, port upgrades, the workshop and the log.

import { useState, type ReactNode } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import {
  DECOR,
  DECOR_SLOTS,
  DOOR_STYLES,
  HANGINGS,
  HOME_BUNTING,
  HOME_DOORS,
  HOME_NAME_MAX,
  HOME_ROOFS,
  HOME_SHUTTERS,
  HOME_SIGNS,
  HOME_TRIMS,
  HOME_WALLS,
  HOUSE_BUILDS,
  HOUSE_EXTRAS,
  ROOF_STYLES,
  SIDINGS,
  TAVERN_CLOTHS,
  TAVERN_FLOORS,
  TAVERN_NAME_MAX,
  TAVERN_WALLS,
  TOPPERS,
  WINDOW_STYLES,
  type DecorId,
  type HouseExtra,
} from '../../../src/game/data/home'
import { decorUnlocked, type styleHome } from '../../../src/game/home'
import { looksOpen, whereFound } from '../../../src/game/keepsakes'
import { KEEPSAKES, lookKey, type KeepsakeGroup } from '../../../src/game/data/keepsakes'
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
import { coins, duration } from '../../../src/format'
import { Body, Button, Card, Measure, Muted, Row, Segments, Strip, Tile, Title } from '../components/ui'

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
  /** Open on this page instead of the menu (a find banner opens the Workshop). */
  startPage?: 'workshop'
  /** A new harbour's cottage, still to buy: shown instead of everything else until it's yours. */
  deed?: { price: number; onBuy: () => void }
}

type LookTab = 'house' | 'colours' | 'openings' | 'touches'

/** A row of named choices, one picked: house shapes, roof styles and the like. */
function Choices<T extends string>({
  label,
  items,
  value,
  onPick,
  locked,
  onLocked,
}: {
  label: string
  items: readonly { id: T; name: string }[]
  value: T
  onPick: (id: T) => void
  /** Still out at sea: shown dashed and dim; tapping says where to look. */
  locked?: (id: T) => boolean
  onLocked?: (id: T, name: string) => void
}) {
  const t = useTheme()
  return (
    <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
      <Muted style={{ width: 52 }}>{label}</Muted>
      <Strip gap={6}>
        {items.map((it) => {
          const on = it.id === value
          const shut = !on && !!locked?.(it.id)
          return (
            <Pressable
              key={it.id}
              onPress={() => (shut ? onLocked?.(it.id, it.name) : onPick(it.id))}
              accessibilityRole="button"
              accessibilityLabel={shut ? `${it.name}, not found yet` : it.name}
              accessibilityState={{ selected: on }}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: on ? 2 : 1, borderStyle: shut ? 'dashed' : 'solid', borderColor: on ? t.accent : t.border, backgroundColor: on ? t.surface2 : 'transparent', opacity: shut ? 0.45 : 1 }}
            >
              <Text style={{ color: on ? t.text : t.muted, fontFamily: fonts.semibold, fontSize: 13 }}>{it.name}</Text>
            </Pressable>
          )
        })}
      </Strip>
    </Row>
  )
}

type Page = 'menu' | 'look' | 'tavern' | 'decor' | 'upgrades' | 'workshop' | 'log' | 'dev'

function Swatches({
  colors,
  value,
  onPick,
  label,
  locked,
  onLocked,
}: {
  colors: readonly string[]
  value: string
  onPick: (c: string) => void
  label: string
  locked?: (c: string) => boolean
  onLocked?: (c: string) => void
}) {
  const t = useTheme()
  return (
    <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
      <Muted style={{ width: 52 }}>{label}</Muted>
      {colors.map((c) => {
        const shut = c !== value && !!locked?.(c)
        return (
          <Pressable
            key={c || 'none'}
            onPress={() => (shut ? onLocked?.(c) : onPick(c))}
            accessibilityRole="button"
            accessibilityLabel={shut ? `${label} colour, not found yet` : c ? `${label} colour` : `No ${label.toLowerCase()}`}
            accessibilityState={{ selected: c === value }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: shut ? 'transparent' : c || 'transparent',
              borderWidth: c === value ? 3 : 1,
              borderStyle: shut ? 'dashed' : 'solid',
              borderColor: c === value ? t.accent : t.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Still at sea: a question mark. No colour: none at all (no shutters). */}
            {shut ? (
              <Text style={{ color: t.muted, fontFamily: fonts.semibold, fontSize: 13 }}>?</Text>
            ) : (
              !c && <View style={{ width: 18, height: 1.5, backgroundColor: t.muted, transform: [{ rotate: '-45deg' }] }} />
            )}
          </Pressable>
        )
      })}
    </Row>
  )
}

export function HomeScreen({ game, now, onStyle, onPlace, upgrades, workshop, alerts, dev, deed, startPage }: Props) {
  const t = useTheme()
  const [page, setPage] = useState<Page>(startPage ?? 'menu')
  const home = getPortDef(homeOf(game))
  const st = REGION_STYLE[home.region]
  const style = game.player.homeStyle ?? {}
  const name = style.name ?? home.name
  const [draft, setDraft] = useState(name)
  const [slot, setSlot] = useState(0)
  const [lookTab, setLookTab] = useState<LookTab>('house')
  const tavern = homeTavern(game)
  const [tavernDraft, setTavernDraft] = useState(tavern.name)
  const people = portPeople(game, homeOf(game))
  // Looks beyond the bare cottage are keepsakes brought home from sea.
  const open = looksOpen(game)
  const [hint, setHint] = useState<string | null>(null)
  const shut = (g: KeepsakeGroup) => (v: string | number) => !open.has(lookKey(g, v))
  const tell = (g: KeepsakeGroup, what?: string) => (v: string | number, name?: string) =>
    setHint(`${name ?? what ?? 'That one'} is still out at sea. ${whereFound(game, g, v)}`)
  const pick = (patch: Parameters<typeof styleHome>[1]) => {
    setHint(null)
    onStyle(patch)
  }
  const foundCount = KEEPSAKES.filter((k) => open.has(k.id)).length
  const hintLine = (
    <Muted numberOfLines={2}>{hint ?? `${foundCount} of ${KEEPSAKES.length} keepsakes found. Boats you sail yourself bring the rest home from sea.`}</Muted>
  )
  const twoTone = (pairs: readonly (readonly [string, string])[], value: number | undefined, onPick: (i: number) => void, label: string, group: KeepsakeGroup) => (
    <Row style={{ gap: 6 }}>
      <Muted style={{ width: 44 }}>{label}</Muted>
      {pairs.map(([a, b], i) => {
        const locked = value !== i && shut(group)(i)
        return (
          <Pressable
            key={i}
            onPress={() => (locked ? tell(group, group === 'tavernWall' ? 'That panelling' : 'That floor')(i) : onPick(i))}
            accessibilityRole="button"
            accessibilityLabel={locked ? `${label} ${i + 1}, not found yet` : `${label} ${i + 1}`}
            accessibilityState={{ selected: value === i }}
            style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', borderWidth: value === i ? 3 : 1, borderStyle: locked ? 'dashed' : 'solid', borderColor: value === i ? t.accent : t.border, alignItems: 'center', justifyContent: 'center' }}
          >
            {locked ? (
              <Text style={{ color: t.muted, fontFamily: fonts.semibold, fontSize: 13 }}>?</Text>
            ) : (
              <>
                <View style={{ alignSelf: 'stretch', flex: 1, backgroundColor: a }} />
                <View style={{ alignSelf: 'stretch', flex: 1, backgroundColor: b }} />
              </>
            )}
          </Pressable>
        )
      })}
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
    build: style.build ?? 'cottage',
    roofStyle: style.roofStyle ?? 'gable',
    siding: style.siding ?? 'boards',
    windows: style.windows ?? 'square',
    door: style.door ?? HOME_DOORS[0],
    doorStyle: style.doorStyle ?? 'plain',
    trim: style.trim ?? HOME_TRIMS[0],
    shutters: style.shutters ?? '',
    topper: style.topper ?? 'none',
    extras: style.extras ?? (['smoke'] as HouseExtra[]),
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

  if (deed)
    return (
      <View style={{ flex: 1, gap: 10 }}>
        <Title size={28}>The cottage on the quay</Title>
        <Muted>{home.name} · bare boards and a plain door, for now</Muted>
        {scene}
        <Card style={{ gap: 6, padding: 12 }}>
          <Body>Yours to name, paint and fill with what your boats bring home. Your own tavern comes with it.</Body>
          <Button label={`Buy it · ${coins(deed.price)}c`} disabled={game.player.coins < deed.price} onPress={deed.onBuy} />
          {game.player.coins < deed.price && <Muted>Not quite enough yet: your boat's pay lands when she's home.</Muted>}
        </Card>
      </View>
    )

  if (page === 'look')
    return (
      <View style={{ flex: 1, gap: 10 }}>
        {back('Its look')}
        {scene}
        <Card style={{ gap: 7 }}>
          <Row style={{ flexWrap: 'nowrap' }}>
            <Muted style={{ width: 52 }}>Name</Muted>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onEndEditing={() => draft.trim() !== name && onStyle({ name: draft })}
              maxLength={HOME_NAME_MAX}
              placeholder={home.name}
              placeholderTextColor={t.muted}
              returnKeyType="done"
              accessibilityLabel="Harbour name"
              style={{ flex: 1, color: t.text, fontFamily: fonts.semibold, fontSize: 16, borderBottomWidth: 1, borderBottomColor: t.border, paddingVertical: 4 }}
            />
          </Row>
          <Segments
            items={[
              { id: 'house', label: 'House' },
              { id: 'colours', label: 'Colours' },
              { id: 'openings', label: 'Windows' },
              { id: 'touches', label: 'Touches' },
            ]}
            value={lookTab}
            onChange={(tab) => {
              setHint(null)
              setLookTab(tab)
            }}
          />
          {lookTab === 'house' && (
            <>
              <Choices label="Shape" items={HOUSE_BUILDS} value={look.build} onPick={(build) => pick({ build })} locked={shut('build')} onLocked={tell('build')} />
              <Choices label="Roof" items={ROOF_STYLES} value={look.roofStyle} onPick={(roofStyle) => pick({ roofStyle })} locked={shut('roofStyle')} onLocked={tell('roofStyle')} />
              <Choices label="Walls" items={SIDINGS} value={look.siding} onPick={(siding) => pick({ siding })} locked={shut('siding')} onLocked={tell('siding')} />
              <Choices label="On top" items={TOPPERS} value={look.topper} onPick={(topper) => pick({ topper })} locked={shut('topper')} onLocked={tell('topper')} />
            </>
          )}
          {lookTab === 'colours' && (
            <>
              <Swatches label="Walls" colors={HOME_WALLS} value={look.wall} onPick={(c) => pick({ wall: c })} locked={shut('wall')} onLocked={tell('wall', 'That wall colour')} />
              <Swatches label="Roof" colors={HOME_ROOFS} value={look.roof} onPick={(c) => pick({ roof: c })} locked={shut('roof')} onLocked={tell('roof', 'That roof colour')} />
              <Swatches label="Trim" colors={HOME_TRIMS} value={look.trim} onPick={(c) => pick({ trim: c })} locked={shut('trim')} onLocked={tell('trim', 'That trim colour')} />
              <Swatches label="Sign" colors={HOME_SIGNS} value={look.sign} onPick={(c) => pick({ sign: c })} locked={shut('sign')} onLocked={tell('sign', 'That sign colour')} />
            </>
          )}
          {lookTab === 'openings' && (
            <>
              <Choices label="Windows" items={WINDOW_STYLES} value={look.windows} onPick={(windows) => pick({ windows })} locked={shut('windows')} onLocked={tell('windows')} />
              <Swatches label="Shutters" colors={HOME_SHUTTERS} value={look.shutters} onPick={(c) => pick({ shutters: c })} locked={shut('shutters')} onLocked={tell('shutters', 'That pair of shutters')} />
              <Choices label="Door" items={DOOR_STYLES} value={look.doorStyle} onPick={(doorStyle) => pick({ doorStyle })} locked={shut('doorStyle')} onLocked={tell('doorStyle')} />
              <Swatches label="Paint" colors={HOME_DOORS} value={look.door} onPick={(c) => pick({ door: c })} locked={shut('door')} onLocked={tell('door', 'That door paint')} />
            </>
          )}
          {lookTab === 'touches' && (
            <>
              <Row style={{ gap: 6 }}>
                {HOUSE_EXTRAS.map((x) => {
                  const on = look.extras.includes(x.id)
                  const locked = !on && shut('extra')(x.id)
                  return (
                    <Pressable
                      key={x.id}
                      onPress={() => (locked ? tell('extra')(x.id, x.name) : pick({ extras: on ? look.extras.filter((e) => e !== x.id) : [...look.extras, x.id] }))}
                      accessibilityRole="switch"
                      accessibilityLabel={locked ? `${x.name}, not found yet` : x.name}
                      accessibilityState={{ checked: on }}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: on ? 2 : 1, borderStyle: locked ? 'dashed' : 'solid', borderColor: on ? t.accent : t.border, backgroundColor: on ? t.surface2 : 'transparent', opacity: locked ? 0.45 : 1 }}
                    >
                      <Text style={{ color: on ? t.text : t.muted, fontFamily: fonts.semibold, fontSize: 13 }}>
                        {on ? '✓ ' : ''}
                        {x.name}
                      </Text>
                    </Pressable>
                  )
                })}
              </Row>
              <Row style={{ gap: 8 }}>
                <Muted style={{ width: 52 }}>Flags</Muted>
                {HOME_BUNTING.map((set, i) => {
                  const locked = look.bunting !== i && shut('bunting')(i)
                  return (
                    <Pressable
                      key={i}
                      onPress={() => (locked ? tell('bunting', 'That string of flags')(i) : pick({ bunting: i }))}
                      accessibilityRole="button"
                      accessibilityLabel={locked ? `Bunting ${i + 1}, not found yet` : `Bunting ${i + 1}`}
                      accessibilityState={{ selected: look.bunting === i }}
                      style={{ flexDirection: 'row', gap: 2, padding: 4, borderRadius: 8, borderWidth: look.bunting === i ? 2 : 1, borderStyle: locked ? 'dashed' : 'solid', borderColor: look.bunting === i ? t.accent : t.border, opacity: locked ? 0.45 : 1 }}
                    >
                      {set.slice(0, 3).map((c, j) => (
                        <View key={j} style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: locked ? t.muted : c }} />
                      ))}
                    </Pressable>
                  )
                })}
              </Row>
            </>
          )}
          {hintLine}
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
          {twoTone(TAVERN_WALLS, style.tavernWall, (i) => pick({ tavernWall: i }), 'Walls', 'tavernWall')}
          {twoTone(TAVERN_FLOORS, style.tavernFloor, (i) => pick({ tavernFloor: i }), 'Floor', 'tavernFloor')}
          <Swatches label="Cloth" colors={TAVERN_CLOTHS} value={tavern.cloth ?? ''} onPick={(c) => pick({ cloth: c })} locked={shut('cloth')} onLocked={tell('cloth', 'That tablecloth')} />
          <Row style={{ gap: 6 }}>
            <Muted style={{ width: 44 }}>Wall</Muted>
            {HANGINGS.map((h) => {
              const locked = tavern.hanging !== h.id && shut('hanging')(h.id)
              return (
                <Pressable
                  key={h.id}
                  onPress={() => (locked ? tell('hanging')(h.id, h.name) : pick({ hanging: h.id }))}
                  accessibilityRole="button"
                  accessibilityLabel={locked ? `${h.name}, not found yet` : h.name}
                  accessibilityState={{ selected: tavern.hanging === h.id }}
                  style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: tavern.hanging === h.id ? 2 : 1, borderStyle: locked ? 'dashed' : 'solid', borderColor: tavern.hanging === h.id ? t.accent : t.border, opacity: locked ? 0.45 : 1 }}
                >
                  <Text style={{ color: t.text, fontFamily: fonts.medium, fontSize: 12 }}>{h.name}</Text>
                </Pressable>
              )
            })}
          </Row>
          {hintLine}
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
        <Tile label="Its look" sub="Shape, roof, windows, colours" onPress={() => setPage('look')} />
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
