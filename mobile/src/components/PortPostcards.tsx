// The Ports tab's picker: a row of postcards, one per charted port. Each has a little still
// picture of the port's landmark against its own sky and sea, its name, what it trades in, and
// small marks for home, market day, the weather and anyone unusual by the tavern fire. The
// next region's ports wait at the end as cloudy cards, with how far its chart has come.

import { Pressable, ScrollView, Text, View } from 'react-native'
import { Canvas, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia'
import { useSharedValue } from 'react-native-reanimated'
import type { GameState, Port } from '../../../src/game/types'
import { portPeople } from '../../../src/game/crew'
import { chartingNext, homeOf } from '../../../src/game/regions'
import { routeWeather } from '../../../src/game/weather'
import { marketDay } from '../../../src/game/portLife'
import { PORTS, getRegion } from '../../../src/game/data/ports'
import { PORT_LIFE } from '../../../src/game/data/portLife'
import { WEATHER } from '../../../src/game/data/weather'
import { Landmark } from '../art/port/Landmarks'
import { LANDMARK_HEIGHT, LANDMARK_SPAN } from '../art/port/landmarkSpan'
import { REGION_STYLE } from '../art/regionStyle'
import { LIGHT, type Light } from '../art/light'
import { mix } from '../art/paint'
import { fonts, useTheme } from '../theme'

const CARD_W = 150
const ART_H = 74

/** The landmark, still, cropped to where it stands in its port scene. */
function Thumb({ port, light }: { port: Port; light: Light }) {
  const still = useSharedValue(0)
  const st = REGION_STYLE[port.region]
  const sky = mix(light.sky, st.tint, st.tintAmount)
  const skyLow = mix(light.skyLow, st.tint, st.tintAmount)
  const sea = mix(light.sea, st.tint, st.tintAmount * 0.7)
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.75)
  // Frame the landmark's stretch of waterfront (scene units), its base low in the card.
  const [a, b] = LANDMARK_SPAN[port.id] ?? [140, 220]
  // The span is where the landmark already stands (its shift is in it).
  const cx = (a + b) / 2
  // The landmark filling most of the card's height, whatever its own.
  const tall = Math.max(50, LANDMARK_HEIGHT[port.id] ?? 100)
  const s = Math.min(CARD_W / Math.max(80, b - a + 20), (ART_H - 10) / (tall + 8))
  const span = CARD_W / s
  const waterline = 150
  return (
    <Canvas style={{ width: CARD_W, height: ART_H }}>
      <Rect x={0} y={0} width={CARD_W} height={ART_H}>
        <LinearGradient start={vec(0, 0)} end={vec(0, ART_H)} colors={[sky, skyLow]} />
      </Rect>
      <Group transform={[{ translateX: CARD_W / 2 }, { translateY: ART_H - 14 }, { scale: s }, { translateX: -cx }, { translateY: -waterline }]}>
        <Path
          path={`M${cx - span} ${waterline + 2} L ${cx - span} ${waterline - 24} C ${cx - span * 0.4} ${waterline - 44}, ${cx + span * 0.1} ${waterline - 30}, ${cx + span * 0.5} ${waterline - 40} C ${cx + span * 0.8} ${waterline - 48}, ${cx + span} ${waterline - 30}, ${cx + span} ${waterline - 26} L ${cx + span} ${waterline + 2} Z`}
          color={lit(mix(st.land, skyLow, 0.35))}
        />
        <Landmark portId={port.id} light={light} lit={lit} clock={still} />
        <Rect x={cx - span} y={waterline + 2} width={span * 2} height={60} color={sea} />
      </Group>
    </Canvas>
  )
}

export function PortPostcards({ game, now, light, selected, onSelect, ports }: { game: GameState; now: number; light?: Light; selected: string; onSelect: (id: string) => void; ports: Port[] }) {
  const t = useTheme()
  const home = homeOf(game)
  const next = chartingNext(game)
  // Drawn by day: a postcard is the port at its best.
  const day = light ?? LIGHT.day
  const uncharted = next ? PORTS.filter((p) => p.region === next.id) : []
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingRight: 8, paddingVertical: 4 }}>
      {ports.map((p) => {
        const on = p.id === selected
        const isHome = p.id === home
        const people = portPeople(game, p.id)
        const life = PORT_LIFE[p.id]
        const route = game.routes.find((r) => r.portB === p.id)
        const wx = route ? routeWeather(game, route.id, now) : null
        const market = marketDay(p.id, now)
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${p.name}${isHome ? ', home' : ''}${market ? ', market day' : ''}`}
            style={{
              width: CARD_W + 8,
              padding: 4,
              borderRadius: 14,
              backgroundColor: on ? '#f3e7d8' : '#e8dccb',
              borderWidth: 2,
              borderColor: on ? t.accent : 'transparent',
              transform: [{ translateY: on ? -3 : 0 }, { rotate: on ? '0deg' : `${((p.x + p.y) % 5) - 2}deg` }],
              shadowColor: '#000',
              shadowOpacity: on ? 0.35 : 0.2,
              shadowRadius: on ? 8 : 4,
              shadowOffset: { width: 0, height: on ? 5 : 2 },
            }}
          >
            <View style={{ borderRadius: 10, overflow: 'hidden' }}>
              <Thumb port={p} light={day} />
              {/* Marks over the picture */}
              <View style={{ position: 'absolute', top: 4, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {isHome && <Mark text="⚓︎ Home" bg="#2b1f2c" />}
                  {market && <Mark text="Market day" bg="#a8452e" />}
                </View>
                {wx && wx !== 'calm' && <Mark text={WEATHER[wx].name} bg={t[wx]} />}
              </View>
            </View>
            <View style={{ paddingHorizontal: 4, paddingTop: 5, paddingBottom: 2, gap: 1 }}>
              <Text numberOfLines={1} style={{ color: '#2b1f2c', fontFamily: fonts.title, fontSize: 17 }}>
                {p.name}
                {people.captain ? <Text style={{ color: '#a8702a' }}> ✦</Text> : null}
              </Text>
              <Text numberOfLines={1} style={{ color: '#6e5a66', fontFamily: fonts.body, fontSize: 11 }}>
                {isHome ? getRegion(p.region).name : life?.trade ?? getRegion(p.region).name}
              </Text>
              <Text numberOfLines={1} style={{ color: '#6e5a66', fontFamily: fonts.medium, fontSize: 11 }}>
                {people.recruits.length} captain{people.recruits.length === 1 ? '' : 's'} · {people.hands.length} hand{people.hands.length === 1 ? '' : 's'}
              </Text>
            </View>
          </Pressable>
        )
      })}
      {/* The next waters, still under cloud */}
      {next &&
        uncharted.map((p, i) => (
          <View key={p.id} style={{ width: CARD_W + 8, padding: 4, borderRadius: 14, backgroundColor: '#d8d2dc', opacity: 0.85, transform: [{ rotate: `${(i % 3) - 1}deg` }] }}>
            <View style={{ height: ART_H, borderRadius: 10, backgroundColor: '#c6bfcc', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {[[-40, 10, 34], [10, -6, 40], [44, 14, 30], [-6, 26, 30]].map(([x, y, r], k) => (
                <View key={k} style={{ position: 'absolute', left: CARD_W / 2 + x - r, top: ART_H / 2 + y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: '#efeaf1' }} />
              ))}
              <Text style={{ color: '#6e5a66', fontFamily: fonts.title, fontSize: 26 }}>?</Text>
            </View>
            <View style={{ paddingHorizontal: 4, paddingTop: 5, paddingBottom: 2, gap: 1 }}>
              <Text numberOfLines={1} style={{ color: '#6e5a66', fontFamily: fonts.titleItalic, fontSize: 16 }}>
                Uncharted
              </Text>
              <Text numberOfLines={1} style={{ color: '#7a6e78', fontFamily: fonts.body, fontSize: 11 }}>
                {getRegion(p.region).name}
              </Text>
              <Text numberOfLines={1} style={{ color: '#7a6e78', fontFamily: fonts.medium, fontSize: 11 }}>
                Charted {Math.floor((next.points / next.needed) * 100)}%
              </Text>
            </View>
          </View>
        ))}
    </ScrollView>
  )
}

function Mark({ text, bg }: { text: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 10 }}>{text}</Text>
    </View>
  )
}
