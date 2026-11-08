// The Workshop, in the Shipyard's slipway shed: where the finds from bad weather become boats.
// A lamplit shed with the set you're closest to taking shape on the stocks; how it works in three
// steps; every set as three slots (hull, engine, specialty) that fill as pieces come home, with a
// Build button once they're all in; rare parts and what they unlock; and the workbench, where
// spare pieces melt into new ones and plain fittings are scrapped for coins.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia'
import type { BoatClass, GameState, PartRarity, PartType, Track } from '../../../src/game/types'
import { craftableClasses, meltGroups } from '../../../src/game/state'
import { countParts, getPart, slotName } from '../../../src/game/parts'
import { getAbility } from '../../../src/game/abilities'
import { MELT_COST, STANDARD_SCRAP_VALUE } from '../../../src/game/data/economy'
import { coins } from '../../../src/format'
import { BoatArt } from '../art/BoatArt'
import { boatWidth } from '../art/boatGeometry'
import { LIGHT } from '../art/light'
import { useSceneClock } from '../art/clock'
import { fonts, useTheme } from '../theme'
import { Button, Row, Title } from './ui'

const SLOT_MARK: Record<PartType, string> = { hull: '⛵︎', engine: '⚙︎', specialty: '✦' }

/** The shed: beams, a lamp, tools on the wall, and a boat on the stocks as far along as `share`. */
function Shed({ cls, share, width }: { cls: BoatClass | null; share: number; width: number }) {
  const clock = useSceneClock()
  const H = 150
  const s = width / 358
  const scale = cls ? Math.min(220 / boatWidth(cls), 1.3) : 1
  const bw = cls ? boatWidth(cls) * scale : 0
  return (
    <Canvas style={{ width, height: H * s }}>
      <Group transform={[{ scale: s }]}>
        <Rect x={0} y={0} width={358} height={H}>
          <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={['#3a2420', '#5a3a2a']} />
        </Rect>
        {/* Planked walls and roof beams */}
        {Array.from({ length: 9 }, (_, i) => (
          <Path key={i} path={`M${i * 42} 0 V ${H}`} color="#2e1c19" style="stroke" strokeWidth={1} opacity={0.5} />
        ))}
        <Path path="M0 26 L 179 6 L 358 26" color="#2e1c19" style="stroke" strokeWidth={6} />
        {/* Tools on the wall: saw, mallet, a coil of rope */}
        <Path path="M28 40 h 34 l -4 10 h -26 Z" color="#9aa3ad" />
        <Rect x={60} y={38} width={8} height={14} color="#8a5a3a" />
        <Rect x={300} y={36} width={22} height={10} color="#8a5a3a" />
        <Rect x={309} y={46} width={4} height={18} color="#6e4733" />
        <Circle cx={330} cy={82} r={11} color="#c9b08a" style="stroke" strokeWidth={4} />
        {/* The lamp */}
        <Path path="M179 6 V 30" color="#2e1c19" style="stroke" strokeWidth={1.5} />
        <RoundedRect x={171} y={30} width={16} height={18} r={3} color="#c99a2e" />
        <RoundedRect x={174} y={33} width={10} height={12} r={2} color="#ffd27a" />
        <Circle cx={179} cy={44} r={110}>
          <RadialGradient c={vec(179, 44)} r={110} colors={['#ffd27a44', '#ffd27a00']} />
        </Circle>
        {/* The slipway floor and the stocks */}
        <Rect x={0} y={H - 22} width={358} height={22} color="#2e1c19" />
        {[100, 179, 258].map((x) => (
          <Path key={x} path={`M${x - 10} ${H - 22} L ${x} ${H - 40} L ${x + 10} ${H - 22} Z`} color="#6e4733" />
        ))}
        {/* The boat taking shape: ribs for what's missing, the boat itself for what's in */}
        {cls ? (
          <Group>
            <Group opacity={0.25 + 0.75 * share}>
              <BoatArt cls={cls} light={LIGHT.golden} x={179 - bw / 2} y={H - 46} scale={scale} clock={clock} />
            </Group>
            {share < 1 &&
              Array.from({ length: 9 }, (_, i) => (
                <Path key={i} path={`M${179 - bw / 2 + 12 + i * ((bw - 24) / 8)} ${H - 40} q -3 -14 0 -26`} color="#e8d4a0" style="stroke" strokeWidth={2} opacity={0.7} />
              ))}
          </Group>
        ) : (
          Array.from({ length: 9 }, (_, i) => <Path key={i} path={`M${110 + i * 17} ${H - 40} q -3 -16 0 -30`} color="#e8d4a0" style="stroke" strokeWidth={2} opacity={0.6} />)
        )}
      </Group>
    </Canvas>
  )
}

/** One slot of a set: filled with the piece once you have it. */
function Slot({ slot, track, got, color }: { slot: PartType; track: Track; got: boolean; color: string }) {
  const t = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderStyle: got ? 'solid' : 'dashed', borderColor: got ? color : t.border, backgroundColor: got ? `${color}22` : 'transparent' }}>
      <Text style={{ fontSize: 18, color: got ? color : t.muted, opacity: got ? 1 : 0.5 }}>{SLOT_MARK[slot]}</Text>
      <Text style={{ color: got ? t.text : t.muted, fontFamily: fonts.semibold, fontSize: 11 }}>{slotName(slot, track)}</Text>
      <Text style={{ color: got ? color : t.muted, fontFamily: fonts.body, fontSize: 10 }}>{got ? 'In hand' : 'Missing'}</Text>
    </View>
  )
}

export function Workshop({
  game,
  width,
  onCraft,
  onScrap,
  onMelt,
}: {
  game: GameState
  width: number
  onCraft: (classId: string) => void
  onScrap: () => void
  onMelt: (rarity: PartRarity, slot: PartType, track: Track) => void
}) {
  const t = useTheme()
  const [all, setAll] = useState(false)
  const [how, setHow] = useState(false)
  const counts = countParts(game.player.partInventory)
  const standard = [...counts].filter(([id]) => getPart(id).rarity === 'standard').reduce((n, [, c]) => n + c, 0)
  const owned = new Set(game.player.ownedBoats.map((b) => b.classId))
  const color = (r: string) => (r === 'mythic' ? t.mythic : r === 'legendary' ? t.legendary : t.rare)

  const sets = craftableClasses()
    .map((cls) => ({ cls, have: cls.requiredParts.filter((id) => counts.has(id)) }))
    .sort((a, b) => b.have.length / b.cls.requiredParts.length - a.have.length / a.cls.requiredParts.length || a.cls.sizeTier - b.cls.sizeTier)
  const started = sets.filter((x) => x.have.length > 0 && !owned.has(x.cls.id))
  const shown = all ? sets : started
  const best = started[0] ?? null
  const melts = meltGroups(game).filter((g) => g.spares.length >= MELT_COST)
  const ready = started.filter((x) => x.have.length === x.cls.requiredParts.length)

  return (
    <View style={{ gap: 10 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden' }}>
        <Shed cls={best?.cls ?? null} share={best ? best.have.length / best.cls.requiredParts.length : 0} width={width} />
        <View style={{ position: 'absolute', left: 10, bottom: 8, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ color: '#f3e7d8', fontFamily: fonts.title, fontSize: 20 }}>{best ? `On the stocks: ${best.cls.name}` : 'The stocks are empty'}</Text>
          {best && (
            <Text style={{ color: '#ffd27a', fontFamily: fonts.bold, fontSize: 13 }}>
              {best.have.length} of {best.cls.requiredParts.length}
            </Text>
          )}
        </View>
      </View>

      {/* How it works, in three steps (folds away once you know) */}
      <Pressable onPress={() => setHow(!how)} accessibilityRole="button" style={{ borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, padding: 10, gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 14 }}>How the Workshop works</Text>
          <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 13 }}>{how || started.length === 0 ? '▲' : '▼'}</Text>
        </Row>
        {(how || started.length === 0) && (
          <View style={{ gap: 6 }}>
            {[
              ['1', 'Sail into bad weather', 'Rare pieces wash up in rough water (and aboard big boats in any weather); legendary pieces in rough water and storms; mythic pieces only in storms. Calm seas give nothing but plain fittings.'],
              ['2', 'Collect a whole set', 'Every rare, legendary or mythic boat needs her own three pieces: a hull, an engine and a specialty part. Finds lean toward sets you have started.'],
              ['3', 'Build her here, free', 'Once all three are in, build her: the pieces are the price. These boats are never sold in the Shipyard, at any price.'],
            ].map(([n, head, body]) => (
              <View key={n} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: t.accentText, fontFamily: fonts.bold, fontSize: 12 }}>{n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>{head}</Text>
                  <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 }}>{body}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Pressable>

      {ready.length > 0 && (
        <Text style={{ color: t.good, fontFamily: fonts.bold, fontSize: 14 }}>
          {ready.length === 1 ? `${ready[0].cls.name} is ready to build!` : `${ready.length} boats ready to build!`}
        </Text>
      )}

      <Row style={{ justifyContent: 'space-between' }}>
        <Title size={20}>Sets</Title>
        <Pressable onPress={() => setAll(!all)} accessibilityRole="button" hitSlop={8}>
          <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 13 }}>{all ? 'Only sets I’ve started' : `See all ${sets.length}`}</Text>
        </Pressable>
      </Row>
      {shown.length === 0 && <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 13 }}>No set pieces yet. Send a hand-run boat into rough water or a storm.</Text>}
      {shown.map(({ cls, have }) => {
        const c = color(cls.rarity)
        const complete = have.length === cls.requiredParts.length
        const built = owned.has(cls.id)
        return (
          <View key={cls.id} style={{ borderRadius: 14, borderWidth: complete && !built ? 2 : 1, borderColor: complete && !built ? c : t.border, backgroundColor: t.surface, padding: 10, gap: 6, opacity: built ? 0.6 : 1 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ color: t.text, fontFamily: fonts.title, fontSize: 19 }}>{cls.name}</Text>
                <Text style={{ color: c, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1 }}>
                  {cls.rarity.toUpperCase()} · TIER {cls.sizeTier} {cls.track === 'cargo' ? 'CARGO' : 'PASSENGERS'}
                </Text>
              </View>
              <Text style={{ color: complete ? c : t.muted, fontFamily: fonts.bold, fontSize: 15 }}>
                {have.length}/{cls.requiredParts.length}
              </Text>
            </Row>
            <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>{getAbility(cls.abilityId)?.description}</Text>
            <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
              {cls.requiredParts.map((id) => (
                <Slot key={id} slot={getPart(id).type} track={getPart(id).track} got={counts.has(id)} color={c} />
              ))}
            </Row>
            {built ? (
              <Text style={{ color: t.muted, fontFamily: fonts.semibold, fontSize: 12 }}>Built: she's in your fleet</Text>
            ) : complete ? (
              <Button label={`Build ${cls.name} · free`} onPress={() => onCraft(cls.id)} />
            ) : (
              <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>{cls.rarity === 'mythic' ? 'Pieces wash up only in storms.' : cls.rarity === 'legendary' ? 'Pieces wash up in rough water and storms.' : 'Pieces wash up in rough water, or aboard tier 4+ boats.'}</Text>
            )}
          </View>
        )
      })}

      <Title size={20}>The workbench</Title>
      {melts.map((g) => (
        <Row key={`${g.rarity}/${g.slot}/${g.track}`} style={{ gap: 8, flexWrap: 'nowrap', borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, padding: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>
              {g.spares.length} spare {g.rarity} {slotName(g.slot, g.track).toLowerCase()} pieces
            </Text>
            <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>Melt {MELT_COST} doubles into one fresh {g.rarity} piece of the same kind</Text>
          </View>
          <Button small label="Melt" onPress={() => onMelt(g.rarity, g.slot, g.track)} />
        </Row>
      ))}
      <Row style={{ gap: 8, flexWrap: 'nowrap', borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, padding: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>
            {standard} standard fitting{standard === 1 ? '' : 's'}
          </Text>
          <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>Plain parts from any trip: {STANDARD_SCRAP_VALUE}c each as scrap</Text>
        </View>
        <Button small label={standard > 0 ? `Scrap · +${coins(standard * STANDARD_SCRAP_VALUE)}c` : 'Scrap'} disabled={standard === 0} onPress={onScrap} />
      </Row>
    </View>
  )
}
