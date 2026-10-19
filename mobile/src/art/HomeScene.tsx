// Your home harbour as you've made it: the tavern in your colours with your name over the quay,
// your bunting, the decorations you've placed, the port upgrades you've built standing where
// they work, and your captains ashore wandering about. Design space is 358 × 270.

import type { ReactNode } from 'react'
import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, Text as SkText, matchFont, rect, rrect, vec } from '@shopify/react-native-skia'
import { Platform } from 'react-native'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { RegionId } from '../../../src/game/data/ports'
import { HOME_BUNTING, type DecorId } from '../../../src/game/data/home'
import type { Light } from './light'
import { lookFor } from './looks'
import { REGION_STYLE } from './regionStyle'
import { Walker } from './Walker'
import { useSceneClock } from './clock'
import { mix, shade, tint } from './paint'

const W = 358
const H = 270
const WATER = 120
const QUAY = 196
const FOOT_Y = 262
/** Where the three decoration spots are on the quay (centre x). */
const DECOR_X = [44, 150, 236]

export interface HomeLookProps {
  name: string
  wall: string
  roof: string
  sign: string
  bunting: number
  decor: (DecorId | null)[]
  /** Port upgrade levels by id. */
  upgrades: Record<string, number>
  region: RegionId
  /** Your captains ashore. */
  captains: { id: string; rare: boolean; region: RegionId }[]
}

const font = matchFont({ fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 12, fontStyle: 'italic', fontWeight: 'bold' })

function Decoration({ id, x, lit, clock }: { id: DecorId; x: number; lit: (c: string) => string; clock: SharedValue<number> }) {
  const swing = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 900) * 0.15 }])
  const flutter = useDerivedValue(() => [{ skewY: 0.2 * Math.sin(clock.value / 160) }, { scaleX: 0.85 + 0.15 * Math.sin(clock.value / 200) }])
  const glow = useDerivedValue(() => 0.8 + 0.2 * Math.sin(clock.value / 280))
  const y = QUAY + 18
  let art: ReactNode
  switch (id) {
    case 'flowerboxes':
      art = (
        <Group>
          {[-12, 4].map((dx, i) => (
            <Group key={dx}>
              <RoundedRect x={x + dx} y={y - 12} width={14} height={14} r={3} color={lit('#8a5a3a')} />
              <Path path={`M${x + dx} ${y - 6} h 14`} color={lit('#4a2e22')} style="stroke" strokeWidth={1} />
              {[2, 7, 12].map((fx, j) => (
                <Circle key={fx} cx={x + dx + fx} cy={y - 14 - (j % 2) * 3} r={2.6} color={lit(['#e8a0b4', '#e9b23c', '#c2452a'][(i + j) % 3])} />
              ))}
              <Path path={`M${x + dx + 2} ${y - 12} l 0 -2 M${x + dx + 12} ${y - 12} l 0 -2`} color={lit('#4f7a3a')} style="stroke" strokeWidth={1.4} />
            </Group>
          ))}
        </Group>
      )
      break
    case 'anchor':
      art = (
        <Group>
          <Path path={`M${x} ${y - 34} V ${y - 4} M${x - 8} ${y - 26} h 16 M${x - 14} ${y - 12} Q ${x} ${y + 2} ${x + 14} ${y - 12} M${x - 14} ${y - 12} l -2 -6 M${x + 14} ${y - 12} l 2 -6`} color={lit('#3f4650')} style="stroke" strokeWidth={3.4} strokeCap="round" />
          <Circle cx={x} cy={y - 37} r={4} color={lit('#3f4650')} style="stroke" strokeWidth={2.4} />
        </Group>
      )
      break
    case 'stormflag':
      art = (
        <Group>
          <Path path={`M${x - 8} ${y} V ${y - 48}`} color={lit('#4a2e22')} style="stroke" strokeWidth={2.2} />
          <Group transform={flutter} origin={vec(x - 8, y - 46)}>
            <Path path={`M${x - 8} ${y - 48} h 22 v 14 h -22 Z`} color={lit('#c2452a')} />
            <Rect x={x - 1} y={y - 44} width={8} height={6} color="#1d1218" />
          </Group>
        </Group>
      )
      break
    case 'figurehead':
      art = (
        <Group>
          <Path path={`M${x - 12} ${y} L ${x - 8} ${y - 18} C ${x - 6} ${y - 30}, ${x + 4} ${y - 34}, ${x + 6} ${y - 26} C ${x + 10} ${y - 20}, ${x + 6} ${y - 10}, ${x + 12} ${y} Z`} color={lit('#c98a4a')} />
          <Circle cx={x + 2} cy={y - 32} r={5} color={lit('#e0b48a')} />
          <Path path={`M${x - 3} ${y - 35} q 5 -6 10 0`} color={lit('#8a3a3a')} style="stroke" strokeWidth={2} />
          <Path path={`M${x - 8} ${y - 18} q 8 4 16 0`} color={lit('#e6a53a')} style="stroke" strokeWidth={1.6} />
        </Group>
      )
      break
    case 'bell':
      art = (
        <Group>
          <Path path={`M${x - 14} ${y} V ${y - 46} H ${x + 14} V ${y}`} color={lit('#4a2e22')} style="stroke" strokeWidth={3} />
          <Group transform={swing} origin={vec(x, y - 44)}>
            <Path path={`M${x - 9} ${y - 22} C ${x - 9} ${y - 36}, ${x + 9} ${y - 36}, ${x + 9} ${y - 22} L ${x + 11} ${y - 19} H ${x - 11} Z`} color={lit('#c9a24a')} />
            <Circle cx={x} cy={y - 17} r={2} color={lit('#8a6a2a')} />
            <Path path={`M${x} ${y - 44} v 10`} color={lit('#2e1c19')} style="stroke" strokeWidth={1} />
          </Group>
        </Group>
      )
      break
    case 'lanternarch':
      art = (
        <Group>
          <Path path={`M${x - 20} ${y} V ${y - 30} Q ${x} ${y - 52} ${x + 20} ${y - 30} V ${y}`} color={lit('#2e1c19')} style="stroke" strokeWidth={2.6} />
          {[-14, 0, 14].map((dx, i) => (
            <Group key={dx}>
              <Circle cx={x + dx} cy={y - 34 - (i === 1 ? 10 : 0)} r={9} opacity={glow}>
                <RadialGradient c={vec(x + dx, y - 34 - (i === 1 ? 10 : 0))} r={9} colors={['#ffd27a99', '#ffd27a00']} />
              </Circle>
              <RoundedRect x={x + dx - 3} y={y - 37 - (i === 1 ? 10 : 0)} width={6} height={7} r={1.5} color="#ffd27a" opacity={glow} />
            </Group>
          ))}
        </Group>
      )
      break
    case 'statue':
      art = (
        <Group>
          <Rect x={x - 12} y={y - 12} width={24} height={12} color={lit('#8f9aa8')} />
          <Path path={`M${x - 6} ${y - 12} L ${x - 5} ${y - 34} L ${x + 5} ${y - 34} L ${x + 6} ${y - 12} Z`} color={lit('#a8b0b8')} />
          <Circle cx={x} cy={y - 39} r={5} color={lit('#a8b0b8')} />
          <Path path={`M${x - 7} ${y - 44} L ${x} ${y - 50} L ${x + 7} ${y - 44} Z`} color={lit('#8f9aa8')} />
          <Path path={`M${x + 5} ${y - 30} l 10 -12`} color={lit('#a8b0b8')} style="stroke" strokeWidth={2.6} strokeCap="round" />
          <Circle cx={x + 15} cy={y - 43} r={2.4} color="#e6a53a" />
        </Group>
      )
      break
  }
  return <Group>{art}</Group>
}

/** Port upgrades, drawn where they'd stand. Level 0 draws nothing. */
function Upgrades({ up, lit, clock, wall, roof }: { up: Record<string, number>; lit: (c: string) => string; clock: SharedValue<number>; wall: string; roof: string }) {
  const dish = useDerivedValue(() => [{ scaleX: Math.cos(clock.value / 900) }])
  const blink = useDerivedValue(() => ((clock.value % 1400) < 700 ? 1 : 0.25))
  const lv = (id: string) => up[id] ?? 0
  return (
    <Group>
      {/* Dry dock: a slipway with a cradle; more scaffolding per level */}
      {lv('dry-dock') > 0 && (
        <Group>
          <Path path={`M8 ${QUAY} L 26 ${WATER + 30} L 70 ${WATER + 30} L 86 ${QUAY} Z`} color={lit('#5a4a3a')} />
          <Path path={`M30 ${QUAY - 4} q 18 10 36 0`} color={lit('#8a5a3a')} style="stroke" strokeWidth={3} />
          {Array.from({ length: lv('dry-dock') + 1 }, (_, i) => (
            <Path key={i} path={`M${28 + i * 14} ${QUAY - 6} V ${QUAY - 30 - i * 4}`} color={lit('#4a2e22')} style="stroke" strokeWidth={2} />
          ))}
          <Path path={`M26 ${QUAY - 30} H ${30 + lv('dry-dock') * 14}`} color={lit('#4a2e22')} style="stroke" strokeWidth={2} />
        </Group>
      )}
      {/* Berths: mooring posts along the water, two per level */}
      {Array.from({ length: lv('berths') * 2 }, (_, i) => (
        <RoundedRect key={i} x={100 + i * 16} y={QUAY - 12} width={6} height={12} r={2} color={lit('#2e1c19')} />
      ))}
      {/* Fuel depot: round tanks, one per level */}
      {Array.from({ length: lv('fuel-depot') }, (_, i) => (
        <Group key={i}>
          <RoundedRect x={300 - i * 20} y={QUAY - 24} width={18} height={24} r={8} color={lit(i % 2 ? '#c9c4bc' : '#e8e2d6')} />
          <Rect x={300 - i * 20} y={QUAY - 14} width={18} height={3} color={lit('#c2452a')} />
        </Group>
      ))}
      {/* Salvage yard: a crane over a pile of scrap */}
      {lv('salvage-yard') > 0 && (
        <Group>
          <Path path={`M258 ${QUAY} V ${QUAY - 54} L 226 ${QUAY - 44}`} color={lit('#e9b23c')} style="stroke" strokeWidth={2.4} strokeJoin="round" />
          <Path path={`M226 ${QUAY - 44} v 12`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.8} />
          <Path path={`M236 ${QUAY} l 6 -10 l 6 4 l 6 -8 l 8 14 Z`} color={lit('#6b5a4a')} />
          {lv('salvage-yard') >= 2 && <Circle cx={246} cy={QUAY - 4} r={4} color={lit('#4a4f58')} style="stroke" strokeWidth={2} />}
        </Group>
      )}
      {/* Scout office: a little hut with a flag and a telescope */}
      {lv('scout-office') > 0 && (
        <Group>
          <Rect x={318} y={WATER + 8} width={28} height={22} color={lit(tint(wall, 0.15))} />
          <Path path={`M315 ${WATER + 8} L 332 ${WATER - 4} L 349 ${WATER + 8} Z`} color={lit(roof)} />
          <Path path={`M342 ${WATER - 2} V ${WATER - 22}`} color={lit('#2e1c19')} style="stroke" strokeWidth={1.2} />
          <Path path={`M342 ${WATER - 22} h 10 l -3 4 l 3 4 h -10 Z`} color={lit('#c2452a')} />
          <Path path={`M324 ${WATER + 12} l 10 -6`} color={lit('#c9a24a')} style="stroke" strokeWidth={2.4} strokeCap="round" />
        </Group>
      )}
      {/* Weather radar: a mast on the tavern roof with a turning dish and a blinking light */}
      {lv('weather-radar') > 0 && (
        <Group>
          <Path path={`M228 ${WATER - 50} V ${WATER - 82 - lv('weather-radar') * 6}`} color={lit('#4a4f58')} style="stroke" strokeWidth={2} />
          <Group transform={dish} origin={vec(228, WATER - 86 - lv('weather-radar') * 6)}>
            <Path path={`M218 ${WATER - 86 - lv('weather-radar') * 6} q 10 -8 20 0 Z`} color={lit('#c9ccd0')} />
          </Group>
          <Circle cx={228} cy={WATER - 82 - lv('weather-radar') * 6} r={2} color="#ff5c5c" opacity={blink} />
        </Group>
      )}
    </Group>
  )
}

export function HomeScene({ width, light, look }: { width: number; light: Light; look: HomeLookProps }) {
  const clock = useSceneClock()
  const s = width / W
  const st = REGION_STYLE[look.region]
  const lit = (c: string) => mix(c, light.silhouette, light.dim * 0.8)
  const flicker = useDerivedValue(() => 0.85 + 0.15 * Math.sin(clock.value / 300))
  const waves = useDerivedValue(() => [{ translateX: -((clock.value / 80) % 36) }])
  const sky = mix(light.sky, st.tint, st.tintAmount)
  const skyLow = mix(light.skyLow, st.tint, st.tintAmount)
  const sea = mix(light.sea, st.tint, st.tintAmount * 0.7)
  const bunting = HOME_BUNTING[look.bunting] ?? HOME_BUNTING[0]
  const wall = lit(look.wall)
  const shown = look.captains.slice(0, 5)

  return (
    <Canvas style={{ width, height: H * s }}>
      <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, W, H), 20, 20)}>
        <Rect x={0} y={0} width={W} height={WATER}>
          <LinearGradient start={vec(0, 0)} end={vec(0, WATER)} colors={[sky, skyLow]} />
        </Rect>
        <Circle cx={light.sunX} cy={Math.min(46, light.sunY)} r={14} color={light.sun} />
        <Group opacity={light.stars}>
          {[[30, 20], [100, 34], [180, 14], [300, 26]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={1.1} color="#fff3dc" />
          ))}
        </Group>
        <Path path={`M0 ${WATER} L 0 96 L 60 88 L 120 100 L 190 86 L 260 98 L 358 90 L 358 ${WATER} Z`} color={mix(st.land, light.silhouette, light.dim * 0.6)} />
        <Rect x={0} y={WATER} width={W} height={QUAY - WATER}>
          <LinearGradient start={vec(0, WATER)} end={vec(0, QUAY)} colors={[sea, mix(sea, '#0e0a18', 0.3)]} />
        </Rect>
        <Group transform={waves}>
          <Path path={`M0 ${WATER + 16} ${'q 9 -3 18 0 t 18 0 '.repeat(12)}`} color={light.seaLine} style="stroke" strokeWidth={1.4} opacity={0.7} />
        </Group>

        {/* Your tavern, in your colours */}
        <Group>
          <Rect x={168} y={WATER - 50} width={110} height={QUAY - WATER + 50} color={wall} />
          {Array.from({ length: 10 }, (_, i) => (
            <Path key={i} path={`M168 ${WATER - 42 + i * 11} h 110`} color={shade(wall, 0.25)} style="stroke" strokeWidth={0.7} />
          ))}
          <Path path={`M160 ${WATER - 48} L 223 ${WATER - 82} L 286 ${WATER - 48} Z`} color={lit(look.roof)} />
          <Rect x={244} y={WATER - 86} width={11} height={22} color={lit(look.roof)} />
          {[184, 236].map((wx) => (
            <Group key={wx}>
              <Rect x={wx} y={WATER - 30} width={26} height={28} color={light.window} />
              <Rect x={wx} y={WATER - 30} width={26} height={28} color={light.lamp} opacity={flicker} />
              <Path path={`M${wx + 13} ${WATER - 30} v 28 M${wx} ${WATER - 16} h 26`} color={lit(look.roof)} style="stroke" strokeWidth={2} />
            </Group>
          ))}
          <Rect x={208} y={WATER + 16} width={30} height={QUAY - WATER - 16} color={lit(shade(look.wall, 0.55))} />
          {/* The name board over the door */}
          <RoundedRect x={176} y={WATER + 2} width={94} height={13} r={3} color={lit(look.sign)} />
          <RoundedRect x={176} y={WATER + 2} width={94} height={13} r={3} color="#d9a441" style="stroke" strokeWidth={1} />
          {font && <SkText x={223 - font.measureText(look.name).width / 2} y={WATER + 12} text={look.name} font={font} color="#f3e7d8" />}
        </Group>

        <Upgrades up={look.upgrades} lit={lit} clock={clock} wall={look.wall} roof={look.roof} />

        {/* Bunting across the quay */}
        <Path path={`M6 ${QUAY - 46} Q 90 ${QUAY - 26} 168 ${QUAY - 50}`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.7} />
        {Array.from({ length: 9 }, (_, i) => {
          const tt = (i + 1) / 10
          const bx = 6 + 162 * tt
          const by = (1 - tt) ** 2 * (QUAY - 46) + 2 * tt * (1 - tt) * (QUAY - 26) + tt * tt * (QUAY - 50)
          return <Path key={i} path={`M${bx - 4} ${by} L ${bx + 4} ${by} L ${bx} ${by + 9} Z`} color={lit(bunting[i % bunting.length])} />
        })}

        {/* The quay */}
        <Rect x={0} y={QUAY} width={W} height={H - QUAY}>
          <LinearGradient start={vec(0, QUAY)} end={vec(0, H)} colors={[lit('#7a5038'), lit('#4a2e22')]} />
        </Rect>
        <Path path={`M0 ${QUAY + 22} h 358 M0 ${QUAY + 46} h 358 M70 ${QUAY} v 22 M200 ${QUAY + 22} v 24 M290 ${QUAY} v 22`} color={lit('#3a2420')} style="stroke" strokeWidth={1.1} />
        <Rect x={0} y={QUAY - 3} width={W} height={5} color={lit('#8a5a3a')} />

        {look.decor.map((d, i) => d && <Decoration key={`${d}-${i}`} id={d} x={DECOR_X[i]} lit={lit} clock={clock} />)}

        {/* Your captains ashore, at home */}
        {shown.map((c, i) => (
          <Walker
            key={c.id}
            look={lookFor(c.id, c.rare, c.region)}
            clock={clock}
            x0={16 + i * 66}
            x1={46 + i * 66}
            footY={FOOT_Y - (i % 2) * 6}
            scale={0.42}
            speed={7}
            pauseMs={4400 + i * 600}
            offset={i * 1500}
            rimLight={light.stars ? light.lamp : undefined}
          />
        ))}
      </Group>
    </Canvas>
  )
}
