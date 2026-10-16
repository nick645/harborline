// A sunk boat, seen from under the water: she rests on the seabed, listing, with bubbles still
// rising and her lamp glowing faintly. Light falls in shafts from the surface, weed sways, fish
// pass. While her captain is still waiting, they cling to a plank up at the surface, waving.
// Design space matches BoatScene (358 × 320).

import { Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, rect, rrect, vec } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'
import type { BoatClass } from '../../../src/game/types'
import type { Light } from './light'
import type { Look } from './looks'
import { BoatArt } from './BoatArt'
import { DeckFigure } from './DeckFigure'
import { useSceneClock } from './clock'
import { mix } from './paint'
import { SCENE_H, SCENE_W } from './BoatScene'

const SURFACE = 44
const BED = 262

/** Light under water: everything sinks toward deep blue, and the cabin lamps are long out. */
function underwater(light: Light): Light {
  return { ...light, silhouette: '#0c2232', dim: 0.58, window: '#2a4a5a', lamp: '#9fe0d8', stars: 0 }
}

const WEED = [18, 46, 300, 328, 340]
const ROCKS = 'M-10 300 C 10 284, 40 286, 60 298 Z M250 296 C 266 280, 300 280, 316 294 Z M326 300 C 336 290, 356 290, 370 300 Z'

export function SunkScene({ width, light, cls, captain }: { width: number; light: Light; cls: BoatClass; captain: Look | null }) {
  const clock = useSceneClock()
  const s = width / SCENE_W
  const deep = underwater(light)
  const shallow = mix(light.sea, '#7fd0d0', 0.25)
  const abyss = '#06121e'

  const rays = useDerivedValue(() => [{ skewX: Math.sin(clock.value / 2600) * 0.08 }])
  const rayGlow = useDerivedValue(() => 0.16 + 0.06 * Math.sin(clock.value / 1700))
  const sway = useDerivedValue(() => [{ skewX: Math.sin(clock.value / 900) * 0.25 }])
  const swayB = useDerivedValue(() => [{ skewX: Math.sin(clock.value / 1100 + 1) * 0.3 }])
  const surface = useDerivedValue(() => [{ translateX: -((clock.value / 60) % 40) }])
  const plank = useDerivedValue(() => [{ translateY: Math.sin(clock.value / 700) * 2.5 }, { rotate: Math.sin(clock.value / 900) * 0.05 }])
  const lamp = useDerivedValue(() => 0.35 + 0.25 * Math.sin(clock.value / 400))

  // Bubbles from the wreck: one path, worked out per frame.
  const bubbles = useDerivedValue(() => {
    let d = ''
    for (let i = 0; i < 9; i++) {
      const p = ((clock.value / 4200 + i / 9) % 1 + 1) % 1
      const x = 150 + (i % 3) * 22 + Math.sin(p * 9 + i) * 5
      const y = BED - 40 - p * (BED - 40 - SURFACE)
      const r = 1.4 + (i % 3) * 0.9 + p * 1.2
      d += `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
    }
    return d
  })
  // Two small shoals crossing in opposite directions.
  const fishA = useDerivedValue(() => [{ translateX: ((clock.value / 40) % 460) - 50 }, { translateY: 120 + Math.sin(clock.value / 800) * 6 }])
  const fishB = useDerivedValue(() => [{ translateX: 410 - ((clock.value / 55) % 460) }, { translateY: 196 + Math.sin(clock.value / 650) * 5 }, { scaleX: -1 }])

  const W = 120 + cls.sizeTier * 30
  const scale = (150 + cls.sizeTier * 10) / W
  const fish = (n: number, color: string) =>
    Array.from({ length: n }, (_, i) => (
      <Path key={i} path={`M${i * 14} ${(i % 2) * 8} c 4 -3, 9 -3, 12 0 c -3 3, -8 3, -12 0 Z m 0 0 l -4 -3 l 0 6 Z`} color={color} opacity={0.75} />
    ))

  return (
    <Canvas style={{ width, height: SCENE_H * s }}>
      <Group transform={[{ scale: s }]} clip={rrect(rect(0, 0, SCENE_W, SCENE_H), 20, 20)}>
        {/* Sky above the surface, then the water column darkening with depth */}
        <Rect x={0} y={0} width={SCENE_W} height={SURFACE} color={light.sky} />
        <Rect x={0} y={SURFACE} width={SCENE_W} height={SCENE_H - SURFACE}>
          <LinearGradient start={vec(0, SURFACE)} end={vec(0, SCENE_H)} colors={[shallow, mix(shallow, abyss, 0.6), abyss]} />
        </Rect>
        <Group transform={surface}>
          <Path path={`M-40 ${SURFACE} ${'q 10 -4 20 0 t 20 0 '.repeat(12)}`} color="#e8fbff" style="stroke" strokeWidth={2} opacity={0.8} />
        </Group>

        {/* Shafts of light from the surface */}
        <Group transform={rays} origin={{ x: 0, y: SURFACE }} opacity={rayGlow}>
          {[[40, 70], [130, 50], [230, 80], [310, 40]].map(([x, w], i) => (
            <Path key={i} path={`M${x} ${SURFACE} L ${x + w} ${SURFACE} L ${x + w * 2.2} ${BED} L ${x + w * 0.6} ${BED} Z`}>
              <LinearGradient start={vec(0, SURFACE)} end={vec(0, BED)} colors={['#e8fbff', '#e8fbff00']} />
            </Path>
          ))}
        </Group>

        <Group transform={fishA}>{fish(4, '#9fd8cf')}</Group>
        <Group transform={fishB}>{fish(3, '#e9b23c')}</Group>

        {/* The wreck, listing on the bed and half sunk into the sand */}
        <Group transform={[{ rotate: -0.22 }]} origin={{ x: SCENE_W / 2, y: BED }}>
          <BoatArt cls={cls} light={deep} x={(SCENE_W - W * scale) / 2} y={BED - 6} scale={scale} condition={15} />
          <Circle cx={SCENE_W / 2 + 30} cy={BED - 40} r={16} opacity={lamp}>
            <RadialGradient c={vec(SCENE_W / 2 + 30, BED - 40)} r={16} colors={['#ffd27a88', '#ffd27a00']} />
          </Circle>
        </Group>
        <Path path={bubbles} color="#e8fbff" opacity={0.6} />

        {/* Seabed: sand, rocks and weed */}
        <Path path={`M0 ${BED} C 60 ${BED - 10}, 120 ${BED + 6}, 180 ${BED - 2} C 240 ${BED - 10}, 300 ${BED + 4}, 360 ${BED - 6} L 360 ${SCENE_H} L 0 ${SCENE_H} Z`}>
          <LinearGradient start={vec(0, BED - 10)} end={vec(0, SCENE_H)} colors={['#4a5a5a', '#1c2a2e']} />
        </Path>
        <Path path={ROCKS} color="#20303a" />
        {WEED.map((x, i) => (
          <Group key={x} transform={i % 2 ? sway : swayB} origin={{ x, y: SCENE_H }}>
            <Path path={`M${x} ${SCENE_H} q -6 -20 0 -40 q 6 -20 -2 -44 M${x + 6} ${SCENE_H} q 6 -16 0 -30 q -5 -14 2 -28`} color={i % 2 ? '#3f7a5a' : '#5a8a3a'} style="stroke" strokeWidth={3} strokeCap="round" />
          </Group>
        ))}

        {/* The captain, if they're still waiting, on a plank at the surface */}
        {captain && (
          <Group transform={plank} origin={{ x: 270, y: SURFACE }}>
            <Path path={`M242 ${SURFACE - 2} h 56 l -4 6 h -48 Z`} color="#8a5a3a" />
            <DeckFigure look={captain} pose="wave" x={270} y={SURFACE - 2} size={26} clock={clock} lit={(c) => c} />
          </Group>
        )}
        {/* Under the surface the water softens everything above it a little */}
        <Rect x={0} y={SURFACE} width={SCENE_W} height={4} color="#e8fbff" opacity={0.15} />
      </Group>
    </Canvas>
  )
}
