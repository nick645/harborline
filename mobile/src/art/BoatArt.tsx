// A boat seen side on, built from its class: bigger tiers are longer and taller, cargo boats
// carry crates and cranes, passenger boats stack decks of lit windows, and rarity adds a trim.
// Local space: deck line at y = 0 from x = 0 (stern) to x = width (bow); hull below, works above.

import { Circle, Group, Oval, Path, Rect } from '@shopify/react-native-skia'
import type { BoatClass } from '../../../src/game/types'
import type { Light } from './light'
import { HAT_PATHS, type HatKind } from './looks'
import { boatWidth } from './boatGeometry'

const TRIM: Record<BoatClass['rarity'], string | null> = {
  common: null,
  rare: '#5aa2ea',
  legendary: '#e6a53a',
  mythic: '#b07be6',
}

type Props = {
  cls: BoatClass
  light: Light
  x: number
  y: number
  scale?: number
  /** Facing left (heading home) instead of right. */
  flip?: boolean
  /** Silhouette of the captain in the wheelhouse window, if there is one. */
  captainHat?: HatKind | null
}

export function BoatArt({ cls, light, x, y, scale = 1, flip = false, captainHat }: Props) {
  const W = boatWidth(cls)
  const H = 18 + cls.sizeTier * 4
  const tier = cls.sizeTier
  const trim = TRIM[cls.rarity]
  const hull = `M0 0 L ${W} 0 L ${W * 0.9} ${H} L ${W * 0.12} ${H} Z`
  // Wheelhouse near the bow-ward end; everything else is laid out around it.
  const whX = W * 0.62
  const whW = W * 0.2
  const whH = 24 + tier * 3
  const transform = [{ translateX: x + (flip ? W * scale : 0) }, { translateY: y }, { scaleX: flip ? -scale : scale }, { scaleY: scale }]

  return (
    <Group transform={transform}>
      {cls.rarity === 'mythic' && <Circle cx={W / 2} cy={-10} r={W * 0.6} color={trim!} opacity={0.12} />}
      {cls.track === 'cargo' ? <CargoWorks W={W} tier={tier} light={light} /> : <PassengerWorks W={W} tier={tier} light={light} />}

      <Rect x={whX} y={-whH} width={whW} height={whH} color={light.cabin} />
      <Rect x={whX + 6} y={-whH + 6} width={whW - 12} height={Math.min(14, whH - 12)} color={light.lamp} />
      {captainHat && (
        <Group transform={[{ translateX: whX + whW / 2 - 7 }, { translateY: -whH + 4 }, { scale: 0.5 }]}>
          <Oval x={16} y={26} width={24} height={28} color="#3a2630" />
          <Path path={HAT_PATHS[captainHat]} color="#3a2630" />
        </Group>
      )}
      {tier >= 2 && (
        <Group>
          <Rect x={whX + whW * 0.35} y={-whH - 14 - tier * 2} width={10 + tier} height={14 + tier * 2} color="#c2452a" />
          <Rect x={whX + whW * 0.35} y={-whH - 10 - tier * 2} width={10 + tier} height={3} color="#f3e7d8" />
        </Group>
      )}

      <Path path={hull} color={light.hull} />
      <Path path={`M4 6 L ${W - 4} 6`} color={trim ?? '#f2b45a'} style="stroke" strokeWidth={trim ? 3 : 1.5} opacity={trim ? 1 : 0.6} />
      {Array.from({ length: Math.min(6, tier + 1) }, (_, i) => (
        <Circle key={i} cx={W * 0.2 + i * 14} cy={H * 0.5} r={2.2} color={light.lamp} opacity={0.75} />
      ))}
    </Group>
  )
}

function CargoWorks({ W, tier, light }: { W: number; tier: number; light: Light }) {
  const crates = Math.min(2 + tier, 8)
  return (
    <Group>
      {tier === 1 && (
        <Group>
          <Path path={`M${W * 0.38} 0 L ${W * 0.38} -64`} color={light.hull} style="stroke" strokeWidth={3} />
          <Path path={`M${W * 0.38} -60 L ${W * 0.2} -14 L ${W * 0.38} -14 Z`} color="#f3e7d8" opacity={0.9} />
        </Group>
      )}
      {Array.from({ length: crates }, (_, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        return (
          <Group key={i}>
            <Rect x={W * 0.12 + col * 22} y={-16 - row * 16} width={20} height={16} color={i % 2 ? '#a06a44' : '#8a5a3a'} />
            <Path path={`M${W * 0.12 + col * 22} ${-8 - row * 16} h 20`} color="#4a2e1e" style="stroke" strokeWidth={1} />
          </Group>
        )
      })}
      {tier >= 3 && (
        <Path path={`M${W * 0.5} 0 L ${W * 0.5} -70 L ${W * 0.18} -58`} color={light.hull} style="stroke" strokeWidth={3} strokeJoin="round" />
      )}
    </Group>
  )
}

function PassengerWorks({ W, tier, light }: { W: number; tier: number; light: Light }) {
  const decks = 1 + Math.floor(tier / 2)
  return (
    <Group>
      {Array.from({ length: decks }, (_, d) => {
        const inset = W * (0.14 + d * 0.06)
        const width = W * 0.5 - d * W * 0.06
        const top = -16 - d * 16
        const windows = Math.max(2, Math.floor(width / 13))
        return (
          <Group key={d}>
            <Rect x={inset} y={top} width={width} height={16} color={d % 2 ? light.cabin : '#f3e7d8'} />
            {Array.from({ length: windows }, (_, i) => (
              <Rect key={i} x={inset + 4 + i * 13} y={top + 4} width={8} height={7} color={light.lamp} />
            ))}
          </Group>
        )
      })}
      {tier === 1 && <Path path={`M${W * 0.1} -18 L ${W * 0.62} -18 L ${W * 0.58} -24 L ${W * 0.14} -24 Z`} color="#c2452a" />}
    </Group>
  )
}
