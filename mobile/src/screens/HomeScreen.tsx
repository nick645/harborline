// The Home tab: your harbour as you've made it, the controls to make it yours (name, colours,
// bunting, decorations you've earned), then the port upgrades and workshop, and the harbour log.

import { useState, type ReactNode } from 'react'
import { Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native'
import type { GameState } from '../../../src/game/types'
import { DECOR, DECOR_SLOTS, HOME_BUNTING, HOME_NAME_MAX, HOME_ROOFS, HOME_SIGNS, HOME_WALLS, type DecorId } from '../../../src/game/data/home'
import { decorUnlocked } from '../../../src/game/home'
import { boatOfCaptain } from '../../../src/game/crew'
import { getPortDef, homeOf } from '../../../src/game/regions'
import { HomeScene } from '../art/HomeScene'
import { lightAt } from '../art/light'
import { REGION_STYLE } from '../art/regionStyle'
import { fonts, useTheme } from '../theme'
import { Body, Card, Heading, Muted, Row, Title } from '../components/ui'

type Props = {
  game: GameState
  now: number
  onStyle: (patch: { name?: string; wall?: string; roof?: string; sign?: string; bunting?: number }) => void
  onPlace: (slot: number, id: DecorId | null) => void
  /** Upgrades and workshop. */
  works: ReactNode
  /** The harbour log, storm alerts and dev tools. */
  log: ReactNode
}

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

export function HomeScreen({ game, now, onStyle, onPlace, works, log }: Props) {
  const t = useTheme()
  const { width } = useWindowDimensions()
  const home = getPortDef(homeOf(game))
  const st = REGION_STYLE[home.region]
  const style = game.player.homeStyle ?? {}
  const name = style.name ?? home.name
  const [draft, setDraft] = useState(name)
  const [slot, setSlot] = useState(0)
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
      .map((c) => ({ id: c.id, rare: !!c.rare, region: c.region ?? 'bay' })),
  }

  return (
    <View style={{ gap: 12 }}>
      <Title size={26}>{name}</Title>
      <Muted>
        Home port: {home.name}
        {look.captains.length ? ` · ${look.captains.length} of your captains ashore` : ''}
      </Muted>
      <HomeScene width={Math.min(width - 24, 720)} light={lightAt(now)} look={look} />

      <Heading>Make it yours</Heading>
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

      <Heading>Decorations</Heading>
      <Card>
        <Muted>Pick a spot on the quay, then what stands there.</Muted>
        <Row>
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
                <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>{d?.name ?? 'Empty'}</Text>
              </Pressable>
            )
          })}
        </Row>
        <View style={{ gap: 6 }}>
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
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: unlocked ? 1 : 0.45, paddingVertical: 4 }}
              >
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '700' }}>{d.name}</Body>
                  <Muted>{unlocked ? (decor.includes(d.id) && !here ? 'Placed elsewhere · tap to move it here' : here ? 'Here · tap to take it away' : 'Tap to place') : `Locked · ${d.earned}`}</Muted>
                </View>
                <Text style={{ color: here ? t.accent : t.muted, fontSize: 18 }}>{here ? '✓' : unlocked ? '+' : '🔒︎'}</Text>
              </Pressable>
            )
          })}
        </View>
      </Card>

      {works}

      <Heading>Harbour log</Heading>
      {log}
    </View>
  )
}
