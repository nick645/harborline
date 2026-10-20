// Someone at work on deck, small and full length: the captain hauling a line or a deckhand on
// lookout. Drawn in boat space with the feet at (x, y); `size` is their height. Arms move with
// what they're doing.

import { Circle, Group, Path, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Pose } from './boatGeometry'
import type { Look } from './looks'
import { shade } from './paint'

type Props = {
  look: Look
  pose: Pose
  x: number
  y: number
  size: number
  /** Facing the stern. */
  aft?: boolean
  clock: SharedValue<number>
  /** Phase offset so two people don't move in step. */
  offset?: number
  /** Light and hour: dims colours like the boat's paint. */
  lit: (c: string) => string
  /** For a hauling pose: where the line runs up to, in the figure's own units (feet at 0,0). */
  lineTo?: { x: number; y: number }
}

const HATS: Record<Look['hat'], string> = {
  cap: 'M-4 -27.6 h 8 v -2.2 c 0 -2.4 -8 -2.4 -8 0 Z M2.8 -27.8 h 3.4 v 1 h -3.4 Z',
  souwester: 'M-6 -27.4 C -3 -29, 3 -29, 6 -27.4 L 5 -26.6 C 2 -27.6, -2 -27.6, -5 -26.6 Z M-3.4 -28 C -3.4 -31.8, 3.4 -31.8, 3.4 -28 Z',
  beanie: 'M-3.8 -27 C -3.8 -32, 3.8 -32, 3.8 -27 Z',
  brim: 'M-6.4 -27.6 C -3 -29, 3 -29, 6.4 -27.6 C 3 -26.6, -3 -26.6, -6.4 -27.6 Z M-3 -28 C -3 -31.4, 3 -31.4, 3 -28 Z',
  bun: 'M-3.6 -26 C -3.8 -29.6, 3.8 -29.6, 3.6 -26 Z M-1.4 -30.6 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 Z',
  bare: 'M-3.6 -25.6 C -3.8 -29.4, 3.8 -29.4, 3.6 -25.6 Z',
  tricorn: 'M-6.6 -27.4 C -4 -30, -2 -28, 0 -32 C 2 -28, 4 -30, 6.6 -27.4 C 3 -25.8, -3 -25.8, -6.6 -27.4 Z',
  // Legends' and Mythics' hats, small.
  lamphat: 'M-4.4 -27.6 h 8.8 v 0.8 h -8.8 Z M-2.8 -27.6 L -2.4 -33 h 4.8 L 2.8 -27.6 Z',
  bicorne: 'M-7.4 -27.6 C -4 -31, -1 -32, 0 -32.4 C 1 -32, 4 -31, 7.4 -27.6 C 3 -26.4, -3 -26.4, -7.4 -27.6 Z',
  hood: 'M-4.6 -21.6 C -5.6 -27, -4 -30.4, 0 -30.6 C 4 -30.4, 5.6 -27, 4.6 -21.6 C 3.4 -24, 3 -27, 0 -27.6 C -3 -27, -3.4 -24, -4.6 -21.6 Z',
  straw: 'M-7.6 -27.4 C -3 -28.6, 3 -28.6, 7.6 -27.4 C 3 -26.4, -3 -26.4, -7.6 -27.4 Z M-3 -27.8 C -3 -30.6, 3 -30.6, 3 -27.8 Z',
  plumed: 'M-6.4 -27.4 C -3 -28.8, 3 -28.8, 6.4 -27.4 C 3 -26.4, -3 -26.4, -6.4 -27.4 Z M-3 -27.8 C -3 -31.6, 3 -31.6, 3 -27.8 Z M2 -30 C 4 -32, 6 -34, 8 -35 C 6 -32.6, 4.4 -31, 2.6 -29.4 Z',
  beacon: 'M-4 -27.6 h 8 v 0.8 h -8 Z M-3 -27.6 L -2.6 -30.6 h 5.2 L 3 -27.6 Z M-1.2 -30.6 h 2.4 v -2 h -2.4 Z',
  helmet: 'M0 -31.4 C 4.4 -31.4, 5.4 -28, 5.4 -25.2 C 5.4 -22, 3.4 -20.4, 0 -20.4 C -3.4 -20.4, -5.4 -22, -5.4 -25.2 C -5.4 -28, -4.4 -31.4, 0 -31.4 Z',
  kelp: 'M-3.8 -27.4 h 7.6 v 0.9 h -7.6 Z M-3 -27.4 l -0.6 -3.4 M-1 -27.4 l 0.2 -4 M1 -27.4 l 0.6 -3.6 M3 -27.4 l 0.4 -3',
  coral: 'M-3.8 -27.4 h 7.6 v 0.9 h -7.6 Z M-2.4 -27.4 C -3 -30, -4.4 -31, -5.4 -33 M2.4 -27.4 C 3 -30, 4.4 -31, 5.4 -33',
  crown: 'M-3.8 -27.4 h 7.6 v 1 h -7.6 Z M-3.6 -27.4 l 0.8 -2.4 l 0.8 2.4 Z M-0.8 -27.4 l 0.8 -3 l 0.8 3 Z M2 -27.4 l 0.8 -2.4 l 0.8 2.4 Z',
  bandana: 'M-3.6 -26 C -3.8 -29.6, 3.8 -29.6, 3.6 -26 Z M3.4 -27.6 l 2 0.8 l -0.6 1.4 Z',
  none: 'M0 0',
}

export function DeckFigure({ look, pose, x, y, size, aft = false, clock, offset = 0, lit, lineTo }: Props) {
  const k = size / 32
  // Hands, worked out per frame from the pose; shoulders sit at (±3.2, -19.5).
  const arms = useDerivedValue(() => {
    const t = (clock.value + offset) / 1000
    const s = Math.sin(t * 2.6)
    let l: [number, number]
    let r: [number, number]
    switch (pose) {
      case 'haul': {
        const pull = (s + 1) / 2
        l = [3, -31 + pull * 9]
        r = [4.5, -27 + pull * 9]
        break
      }
      case 'tiller':
        l = [7, -13 + s * 0.8]
        r = [8, -14 + s * 0.8]
        break
      case 'wheel':
        l = [6, -18 + s]
        r = [6, -15 - s]
        break
      case 'lookout':
        l = [-4, -11]
        r = [2.6, -25.5 + Math.max(0, s) * 0.6]
        break
      case 'coil': {
        const a = t * 3.2
        l = [5 + Math.cos(a) * 2.2, -8 + Math.sin(a) * 2.2]
        r = [6.5, -9]
        break
      }
      case 'wave':
        l = [-4, -11]
        r = [7 + s * 3, -31]
        break
    }
    return `M-3.2 -19.5 L ${l[0]} ${l[1]} M3.2 -19.5 L ${r[0]} ${r[1]}`
  })
  const lean = pose === 'coil' ? 0.35 : pose === 'haul' ? -0.08 : 0
  const trousers = lit('#2e2a33')
  const coat = lit(look.coat)
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scaleX: aft ? -k : k }, { scaleY: k }]}>
      {/* A Legend's or Mythic's glow, even at the helm */}
      {look.aura && (
        <Circle cx={0} cy={-18} r={16}>
          <RadialGradient c={vec(0, -18)} r={16} colors={[`${look.aura}77`, `${look.aura}00`]} />
        </Circle>
      )}
      <Path path="M-2.4 -11 L -3 0 M2.4 -11 L 3.2 0" color={trousers} style="stroke" strokeWidth={2.8} strokeCap="round" />
      <Group transform={[{ rotate: lean }]} origin={{ x: 0, y: -11 }}>
        {pose === 'haul' && lineTo && <Path path={`M3.5 -29 L ${lineTo.x / k} ${lineTo.y / k}`} color={lit('#c9b6ae')} style="stroke" strokeWidth={0.6} />}
        <RoundedRect x={-4.4} y={-21.5} width={8.8} height={11.5} r={2.6} color={coat} />
        <Rect x={-4.4} y={-21.5} width={8.8} height={2.4} color={lit(look.scarf)} />
        <Path path={arms} color={lit(shade(look.coat, 0.15))} style="stroke" strokeWidth={2.2} strokeCap="round" strokeJoin="round" />
        {look.fx?.includes('lantern-head') ? (
          <>
            <RoundedRect x={-3.2} y={-29} width={6.4} height={7.4} r={1} color="#1d1218" />
            <RoundedRect x={-2.2} y={-28} width={4.4} height={5.4} r={0.8} color="#ffd27a" />
          </>
        ) : (
          <Circle cx={0} cy={-25.2} r={3.4} color={lit(look.skin)} />
        )}
        {look.facialHair === 'beard' && <Path path="M-3 -24.4 C -3 -21, 3 -21, 3 -24.4 Z" color={lit(look.hair)} />}
        <Path path={HATS[look.hat]} color={lit(look.hatColor)} />
        {look.hat === 'helmet' && <Circle cx={0} cy={-25.4} r={2.4} color="#9ec0cf" opacity={0.7} />}
        {pose === 'wheel' && <Circle cx={7.5} cy={-16.5} r={3.6} color={lit('#8a5a3a')} style="stroke" strokeWidth={1} />}
      </Group>
    </Group>
  )
}
