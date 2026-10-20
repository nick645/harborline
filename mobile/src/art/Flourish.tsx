// What only Legends and Mythics wear and trail: their glow, the creatures that ride with them,
// the weather they carry, and the stranger things that follow a Mythic. All in figure space (a
// 56-wide figure, head centred at (28, 39); 145 tall with legs, 100 without), animated off the
// scene clock, so Figure can layer them behind, on and in front of the captain.

import { Circle, Group, Oval, Path, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia'
import type { SharedValue } from 'react-native-reanimated'
import { useDerivedValue } from 'react-native-reanimated'
import type { Companion as CompanionKind, Fx, Look } from './looks'
import { shade, tint } from './paint'

type Clock = { clock: SharedValue<number>; offset: number }

const has = (look: Look, fx: Fx) => !!look.fx?.includes(fx)

/** One drifting particle: rises (or falls) along a column, wobbling, and fades as it goes. */
function Mote({ clock, offset, i, n, x, y, spread, rise, period, size, color, grow = false }: Clock & {
  i: number
  n: number
  x: number
  y: number
  spread: number
  rise: number
  period: number
  size: number
  color: string
  grow?: boolean
}) {
  const p = useDerivedValue(() => (((clock.value + offset + (i * period) / n) % period) + period) % period / period)
  const cx = useDerivedValue(() => x + Math.sin(i * 2.1 + p.value * 6) * spread + ((i % 3) - 1) * spread * 0.6)
  const cy = useDerivedValue(() => y - rise * p.value)
  const r = useDerivedValue(() => (grow ? size * (0.5 + p.value) : size * (1 - p.value * 0.5)))
  const opacity = useDerivedValue(() => Math.sin(Math.PI * p.value) * 0.9)
  return <Circle cx={cx} cy={cy} r={r} opacity={opacity} color={color} />
}

function Motes(props: Omit<Parameters<typeof Mote>[0], 'i'>) {
  return (
    <Group>
      {Array.from({ length: props.n }, (_, i) => (
        <Mote key={i} {...props} i={i} />
      ))}
    </Group>
  )
}

/** An expanding ring from a point, like a bell's note or a song across water. */
function Ring({ clock, offset, i, x, y, color }: Clock & { i: number; x: number; y: number; color: string }) {
  const p = useDerivedValue(() => ((clock.value + offset + i * 900) % 2700) / 2700)
  const r = useDerivedValue(() => 3 + p.value * 22)
  const opacity = useDerivedValue(() => 0.55 * (1 - p.value))
  return <Circle cx={x} cy={y} r={r} opacity={opacity} color={color} style="stroke" strokeWidth={1.2} />
}

function Twinkle({ clock, offset, x, y, i, color, size = 1 }: Clock & { x: number; y: number; i: number; color: string; size?: number }) {
  const opacity = useDerivedValue(() => Math.max(0, Math.sin((clock.value + offset) / (380 + i * 53) + i * 1.9)) ** 3)
  return (
    <Group opacity={opacity}>
      <Path path={`M${x - 2 * size} ${y} H ${x + 2 * size} M${x} ${y - 2 * size} V ${y + 2 * size}`} color={color} style="stroke" strokeWidth={0.7} strokeCap="round" />
      <Circle cx={x} cy={y} r={0.7 * size} color={color} />
    </Group>
  )
}

// ---------- behind the captain ----------

/** Glow, moon, tentacles, a whale passing behind, hair adrift: drawn before the body. */
export function BackFx({ look, clock, offset, legs }: Clock & { look: Look; legs: boolean }) {
  const pulse = useDerivedValue(() => 0.5 + 0.18 * Math.sin((clock.value + offset) / 700))
  const cy = legs ? 78 : 62
  return (
    <Group>
      {look.aura && (
        <Oval x={-14} y={cy - (legs ? 74 : 52)} width={84} height={legs ? 148 : 104} opacity={pulse}>
          <RadialGradient c={vec(28, cy)} r={legs ? 74 : 52} colors={[`${look.aura}55`, `${look.aura}22`, `${look.aura}00`]} positions={[0, 0.55, 1]} />
        </Oval>
      )}
      {has(look, 'moon') && <Moon clock={clock} offset={offset} />}
      {has(look, 'whale') && <Whale clock={clock} offset={offset} front={false} legs={legs} />}
      {has(look, 'tentacles') && <Tentacles clock={clock} offset={offset} legs={legs} />}
      {has(look, 'flow-hair') && <FlowHair clock={clock} offset={offset} color={look.hair} />}
      {look.coatStyle === 'cape' && <Cape clock={clock} offset={offset} color={look.capeColor ?? shade(look.coat, 0.2)} legs={legs} />}
    </Group>
  )
}

function Moon({ clock, offset }: Clock) {
  const glow = useDerivedValue(() => 0.75 + 0.15 * Math.sin((clock.value + offset) / 1500))
  return (
    <Group opacity={glow}>
      <Circle cx={28} cy={30} r={25}>
        <RadialGradient c={vec(24, 26)} r={25} colors={['#f6f3ea', '#d8dde6', '#b9c0cc']} />
      </Circle>
      <Circle cx={18} cy={24} r={3} color="#c4cad4" opacity={0.6} />
      <Circle cx={37} cy={36} r={4.2} color="#c4cad4" opacity={0.5} />
      <Circle cx={30} cy={16} r={2} color="#c4cad4" opacity={0.6} />
    </Group>
  )
}

const WHALE = 'M-12 0 C -9 -6, 4 -7, 10 -2 L 15 -6 L 14 0 L 15 6 L 10 2 C 4 7, -9 6, -12 0 Z'

/** A whale swimming a slow loop around them, behind on the way round and in front coming back. */
export function Whale({ clock, offset, front, legs }: Clock & { front: boolean; legs: boolean }) {
  const a = useDerivedValue(() => (clock.value + offset) / 2600)
  const t = useDerivedValue(() => {
    const ang = a.value
    const depth = Math.sin(ang)
    return [{ translateX: 28 + Math.cos(ang) * 34 }, { translateY: (legs ? 52 : 40) + depth * 8 }, { scaleX: -Math.sign(Math.sin(ang)) || 1 }, { scale: 1.2 + depth * 0.3 }]
  })
  const opacity = useDerivedValue(() => {
    const depth = Math.sin(a.value)
    return front ? (depth > 0 ? 0.9 : 0) : depth <= 0 ? 0.55 : 0
  })
  return (
    <Group transform={t} opacity={opacity}>
      <Path path={WHALE} color="#3f6a96" />
      <Path path="M-10 1 C -4 4, 4 4, 9 1.6" color="#c9dcef" style="stroke" strokeWidth={1.2} />
      <Circle cx={-7} cy={-1.4} r={0.7} color="#0e1a2a" />
    </Group>
  )
}

function Tentacles({ clock, offset, legs }: Clock & { legs: boolean }) {
  const base = legs ? 120 : 96
  // Four great arms rising from behind them, curling at the tips.
  const path = useDerivedValue(() => {
    const t = (clock.value + offset) / 1100
    return [-1, 1, -0.55, 0.55]
      .map((side, i) => {
        const sway = Math.sin(t + i * 1.3) * 5
        const x0 = 28 + side * 8
        const top = base - 70 - (i % 2) * 14
        const tipX = 28 + side * 30 + sway
        return `M${x0} ${base} C ${x0 + side * 22 + sway} ${base - 20}, ${28 + side * 34 - sway} ${top + 30}, ${tipX} ${top} C ${tipX - side * 4} ${top - 8}, ${tipX - side * 12} ${top - 4}, ${tipX - side * 9} ${top + 4}`
      })
      .join(' ')
  })
  return (
    <Group>
      <Path path={path} color="#5a1830" style="stroke" strokeWidth={7} strokeCap="round" strokeJoin="round" />
      <Path path={path} color="#b0405e" style="stroke" strokeWidth={4.4} strokeCap="round" strokeJoin="round" />
      <Path path={path} color="#f0a0b4" style="stroke" strokeWidth={1} strokeCap="round" opacity={0.6} />
    </Group>
  )
}

/** Hair drifting up and out as if underwater. */
function FlowHair({ clock, offset, color }: Clock & { color: string }) {
  const path = useDerivedValue(() => {
    const t = (clock.value + offset) / 800
    // Long hair adrift beside the face and down past the shoulders, rippling as if underwater.
    return [-1, -0.7, 0.7, 1]
      .map((side, i) => {
        const w = Math.sin(t + i * 1.4) * 3
        const x0 = 28 + side * 11
        return `M${x0} 32 C ${x0 + side * 6 + w} 44, ${x0 + side * 4 - w} 56, ${x0 + side * 9 + w} 68 S ${x0 + side * 12 - w} 80, ${x0 + side * 16 + w} 84`
      })
      .join(' ')
  })
  return <Path path={path} color={color} style="stroke" strokeWidth={3} strokeCap="round" opacity={0.7} />
}

/** A cape from the shoulders, lifting and settling as if there's always a wind. */
function Cape({ clock, offset, color, legs }: Clock & { color: string; legs: boolean }) {
  const path = useDerivedValue(() => {
    const w = Math.sin((clock.value + offset) / 700) * 3
    return legs
      ? `M14 62 C 4 82, ${-2 + w} 112, ${-6 + w * 1.6} 136 C 14 ${141 + w}, 40 ${141 - w}, ${60 + w * 1.6} 134 C ${56 + w} 110, 52 82, 42 62 Z`
      : `M10 66 C 2 80, ${-2 + w} 92, ${-4 + w} 100 L ${60 + w} 100 C ${58 + w} 92, 54 80, 46 66 Z`
  })
  return (
    <Group>
      <Path path={path} color={shade(color, 0.25)} />
      <Path path={path} color={color} opacity={0.85} />
    </Group>
  )
}

// ---------- hats only Legends wear ----------

/** Lamps, plumes, kelp, coral and brass: what goes on (or round) the hat shape itself. */
export function HatExtras({ look, clock, offset }: Clock & { look: Look }) {
  const flicker = useDerivedValue(() => 0.75 + 0.25 * Math.sin((clock.value + offset) / 140) * Math.sin((clock.value + offset) / 333))
  const sway = useDerivedValue(() => [{ rotate: Math.sin((clock.value + offset) / 900) * 0.12 }])
  switch (look.hat) {
    case 'lamphat':
      return (
        <Group>
          <Rect x={20} y={26} width={16} height={2.6} color="#c9a24a" />
          <Path path="M24 13 h8 v-7 h-8 Z" color="#2e1c19" />
          <Rect x={25} y={7} width={6} height={5} color="#ffd27a" opacity={flicker} />
          <Circle cx={28} cy={9} r={9} opacity={flicker}>
            <RadialGradient c={vec(28, 9)} r={9} colors={['#ffd27a99', '#ffd27a00']} />
          </Circle>
          <Path path="M23 6 h10 l -5 -3 Z" color="#2e1c19" />
        </Group>
      )
    case 'bicorne':
      return (
        <Group>
          <Path path="M1 30 C 12 34, 44 34, 55 30" color="#e6a53a" style="stroke" strokeWidth={1.3} />
          <Circle cx={28} cy={22} r={3.2} color="#f3e7d8" />
          <Circle cx={28} cy={22} r={1.6} color="#b8423a" />
        </Group>
      )
    case 'hood':
      // Only fur hoods have the fur trim; a Mythic's hood is smooth.
      if (look.coatStyle !== 'fur') return null
      return (
        <Group>
          <Path path="M14.6 51 C 13 38, 18 29, 28 28.4 C 38 29, 43 38, 41.4 51" color={tint(look.hatColor, 0.45)} style="stroke" strokeWidth={4.4} strokeCap="round" />
          <Path path="M15.4 44 l 2 -1 M16.4 37 l 2 0.4 M19.6 31.6 l 1.4 1.6 M25 29 l 0.6 2 M31 29 l -0.6 2 M36.4 31.6 l -1.4 1.6 M39.6 37 l -2 0.4 M40.6 44 l -2 -1" color={shade(look.hatColor, 0.1)} style="stroke" strokeWidth={0.8} strokeCap="round" />
        </Group>
      )
    case 'straw':
      return (
        <Group>
          <Rect x={17} y={26.5} width={22} height={3} color="#b8423a" />
          <Path path="M6 31 C 18 29, 38 29, 50 31" color={shade(look.hatColor, 0.2)} style="stroke" strokeWidth={0.6} />
        </Group>
      )
    case 'plumed':
      return (
        <Group transform={sway} origin={vec(34, 22)}>
          <Path path="M34 24 C 42 14, 52 8, 58 2 C 54 12, 46 20, 36 26 Z" color={look.persona === 'night-heron' ? '#f3efe8' : '#8a4aa0'} />
          <Path path="M35 25 C 44 16, 52 9, 57 3" color={shade(look.persona === 'night-heron' ? '#f3efe8' : '#8a4aa0', 0.3)} style="stroke" strokeWidth={0.6} />
          <Rect x={17.5} y={27} width={21} height={2.4} color="#c9a24a" />
        </Group>
      )
    case 'beacon':
      return (
        <Group>
          <Rect x={17.5} y={25} width={21} height={2.6} color="#f3e7d8" />
          <RoundedRect x={24} y={13} width={8} height={8} r={1.5} color="#2e1c19" />
          <RoundedRect x={25.2} y={14.2} width={5.6} height={5.6} r={1} color="#fff1b0" opacity={flicker} />
          <Path path="M23 13 h10 l -5 -4 Z" color="#b8423a" />
        </Group>
      )
    case 'helmet':
      return (
        <Group>
          <Path path="M28 27 C 21 27, 18.5 32, 18.5 39 C 18.5 46, 21 51, 28 51 C 35 51, 37.5 46, 37.5 39 C 37.5 32, 35 27, 28 27 Z" color="#9ec0cf" opacity={0.28} />
          <Path path="M28 27 C 21 27, 18.5 32, 18.5 39 C 18.5 46, 21 51, 28 51 C 35 51, 37.5 46, 37.5 39 C 37.5 32, 35 27, 28 27 Z" color="#7a5a2a" style="stroke" strokeWidth={1.8} />
          {[
            [12, 30],
            [44, 30],
            [11, 46],
            [45, 46],
            [28, 17],
          ].map(([bx, by], i) => (
            <Circle key={i} cx={bx} cy={by} r={1.3} color="#f2c75a" />
          ))}
          <Path path="M17 20 C 22 16, 30 15, 36 17" color="#fff3dc" opacity={0.45} style="stroke" strokeWidth={1.6} strokeCap="round" />
        </Group>
      )
    case 'kelp':
      return (
        <Group transform={sway} origin={vec(28, 31)}>
          {[16, 20.5, 25, 29.5, 34, 38.5].map((kx, i) => (
            <Path key={kx} path={`M${kx} 31 C ${kx - 2} ${25 - i % 2 * 3}, ${kx + 3} ${21 - i % 3 * 2}, ${kx + 1} ${14 - i % 2 * 3}`} color={i % 2 ? '#3f6a3a' : '#5a8a4a'} style="stroke" strokeWidth={2.4} strokeCap="round" />
          ))}
          <Circle cx={28} cy={31.6} r={2} color="#f3e7d8" />
        </Group>
      )
    case 'coral':
      return (
        <Group>
          {[-1, 1].map((side) => (
            <Path
              key={side}
              path={`M${28 + side * 7} 31 C ${28 + side * 9} 22, ${28 + side * 14} 18, ${28 + side * 18} 10 M${28 + side * 11} 22 C ${28 + side * 7} 16, ${28 + side * 8} 12, ${28 + side * 6} 6 M${28 + side * 15} 16 C ${28 + side * 20} 15, ${28 + side * 23} 17, ${28 + side * 25} 14`}
              color={look.hatColor}
              style="stroke"
              strokeWidth={2.6}
              strokeCap="round"
            />
          ))}
          {[[14, 9], [42, 9], [22, 6], [34, 6]].map(([px, py], i) => (
            <Circle key={i} cx={px} cy={py} r={1.4} color="#ffd0b0" />
          ))}
        </Group>
      )
    case 'crown':
      return <Path path="M17 23 L 18 27 M23 20 L 24 26 M32.6 21 L 33.4 26" color="#ffffff" opacity={0.6} style="stroke" strokeWidth={0.8} strokeCap="round" />
    default:
      return null
  }
}

// ---------- on the captain ----------

/** Painted on the coat itself (drawn inside the coat's outline). */
export function BodyFx({ look, clock, offset, legs }: Clock & { look: Look; legs: boolean }) {
  const shimmer = useDerivedValue(() => [{ translateX: ((clock.value + offset) / 60) % 12 }])
  return (
    <Group>
      {has(look, 'twinkles') &&
        Array.from({ length: 16 }, (_, i) => (
          <Twinkle key={i} clock={clock} offset={offset} i={i} x={10 + ((i * 37) % 36)} y={(legs ? 66 : 70) + ((i * 53) % (legs ? 70 : 30))} color="#dfe6ff" size={0.7 + (i % 3) * 0.25} />
        ))}
      {has(look, 'water') && (
        <Group transform={shimmer}>
          {[70, 82, 94, 106, 118, 130].map((wy) => (
            <Path key={wy} path={`M-12 ${wy} q 3 -2.4 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0`} color="#d8f2f8" opacity={0.45} style="stroke" strokeWidth={0.9} />
          ))}
        </Group>
      )}
      {has(look, 'medals') &&
        [19, 23, 27].map((mx, i) => (
          <Group key={mx}>
            <Rect x={mx - 1.4} y={70} width={2.8} height={4} color={['#b8423a', '#2f5d62', '#e9b23c'][i]} />
            <Circle cx={mx} cy={76} r={1.7} color="#f2c75a" />
          </Group>
        ))}
      {has(look, 'tooth') && (
        <Group>
          <Path path="M20 61 Q 28 69 36 61" color="#3a2a1e" style="stroke" strokeWidth={0.7} />
          <Path path="M27 66 L 29 66 L 28 72 Z" color="#f3efe8" />
        </Group>
      )}
    </Group>
  )
}

/** On the face and head (drawn with the head, so it tilts with it). */
export function HeadFx({ look, clock, offset }: Clock & { look: Look }) {
  const spark = useDerivedValue(() => (Math.sin((clock.value + offset) / 90) > 0.85 ? 1 : 0))
  return (
    <Group>
      {has(look, 'monocle') && (
        <Group>
          <Circle cx={32.5} cy={39.6} r={3.2} color="#e6c27a" style="stroke" strokeWidth={0.9} />
          <Path path="M35.6 41 Q 38 48 36 56" color="#e6c27a" style="stroke" strokeWidth={0.5} />
        </Group>
      )}
      {has(look, 'beads') && (
        <Group>
          {[[24, 55.6], [28, 57], [32, 55.6]].map(([bx, by], i) => (
            <Circle key={i} cx={bx} cy={by} r={1.3} color="#f2c75a" />
          ))}
        </Group>
      )}
      {has(look, 'lightning') && <Path path="M22 50 l 2 3 l -1.6 1 l 2.6 3.4 M33 49 l -1.8 3 l 1.6 0.8 l -2.2 3.6" color="#f2e27a" style="stroke" strokeWidth={0.9} opacity={spark} />}
      {has(look, 'moss') && (
        <Group>
          {[[19, 26], [24, 24], [33, 24], [37, 27]].map(([mx, my], i) => (
            <Oval key={i} x={mx - 2.4} y={my - 1.4} width={4.8} height={2.8} color={i % 2 ? '#6b8f4e' : '#4f7038'} />
          ))}
        </Group>
      )}
    </Group>
  )
}

/** Goggles pushed up on the hat band: drawn over the hat. */
export function Goggles() {
  return (
    <Group>
      <Rect x={16} y={27.4} width={24} height={2} color="#3a2a1e" />
      <Circle cx={23} cy={28.4} r={3.2} color="#c9a24a" />
      <Circle cx={33} cy={28.4} r={3.2} color="#c9a24a" />
      <Circle cx={23} cy={28.4} r={2} color="#9ec0cf" />
      <Circle cx={33} cy={28.4} r={2} color="#9ec0cf" />
      <Path path="M21.6 27.4 l 1.4 -0.8 M31.6 27.4 l 1.4 -0.8" color="#ffffff" opacity={0.7} style="stroke" strokeWidth={0.6} />
    </Group>
  )
}

/** A lantern where the face should be: the Lantern-headed have nothing else to show. */
export function LanternHead({ clock, offset }: Clock) {
  const flame = useDerivedValue(() => 0.75 + 0.25 * Math.sin((clock.value + offset) / 120) * Math.sin((clock.value + offset) / 310))
  return (
    <Group>
      <Circle cx={28} cy={40} r={20} opacity={flame}>
        <RadialGradient c={vec(28, 40)} r={20} colors={['#ffd27acc', '#ffd27a00']} />
      </Circle>
      <Path path="M20 30 h16 l -2 -5 h -12 Z" color="#1d1218" />
      <RoundedRect x={19} y={30} width={18} height={20} r={2} color="#1d1218" />
      <RoundedRect x={21.5} y={32.5} width={13} height={15} r={1.4} color="#ffd27a" opacity={flame} />
      <Path path="M28 34 C 25 38, 26 42, 28 45 C 30 42, 31 38, 28 34 Z" color="#fff3dc" opacity={flame} />
      <Path path="M28 32.5 V 47.5 M21.5 40 H 34.5" color="#1d1218" style="stroke" strokeWidth={1} />
      <Rect x={20} y={50} width={16} height={2.4} color="#1d1218" />
      <Path path="M24 25 C 24 20, 32 20, 32 25" color="#1d1218" style="stroke" strokeWidth={1.2} />
    </Group>
  )
}

// ---------- in front ----------

/** Creatures, weather and light around them: drawn last. */
export function FrontFx({ look, clock, offset, legs }: Clock & { look: Look; legs: boolean }) {
  const foot = legs ? 140 : 100
  return (
    <Group>
      {has(look, 'halo') && <Halo clock={clock} offset={offset} color={look.aura ?? '#fff3dc'} />}
      {has(look, 'beam') && <Beam clock={clock} offset={offset} />}
      {has(look, 'embers') && <Motes clock={clock} offset={offset} n={7} x={28} y={look.hat === 'lamphat' ? 8 : foot - 40} spread={7} rise={look.hat === 'lamphat' ? 24 : 60} period={2600} size={1.1} color="#ffb054" />}
      {has(look, 'bubbles') && <Motes clock={clock} offset={offset} n={6} x={32} y={legs ? 60 : 50} spread={6} rise={50} period={3000} size={1.4} color="#d8f2f8" grow />}
      {has(look, 'feathers') && <Motes clock={clock} offset={offset} n={3} x={28} y={-6} spread={18} rise={-70} period={5200} size={1.6} color="#f3efe8" />}
      {has(look, 'frost') && (
        <Group>
          <Motes clock={clock} offset={offset} n={4} x={34} y={48} spread={3} rise={8} period={2200} size={2.2} color="#f3f8fb" grow />
          <Motes clock={clock} offset={offset} n={8} x={28} y={-2} spread={20} rise={-(foot + 4)} period={6000} size={0.9} color="#ffffff" />
        </Group>
      )}
      {has(look, 'rings') && [0, 1, 2].map((i) => <Ring key={i} clock={clock} offset={offset} i={i} x={look.prop === 'bell' ? 40 : look.prop === 'conch' ? 34 : 28} y={look.prop === 'bell' ? 95 : look.prop === 'conch' ? 80 : 48} color={look.aura ?? '#9ec0cf'} />)}
      {has(look, 'glints') && [0, 1, 2, 3].map((i) => <Twinkle key={i} clock={clock} offset={offset} i={i + 20} x={[8, 50, 12, 46][i]} y={[50, 44, 86, 92][i]} color={look.aura ?? '#fff3dc'} size={1.3} />)}
      {has(look, 'cloud') && <Cloud clock={clock} offset={offset} storm={has(look, 'lightning')} />}
      {has(look, 'lightning') && !has(look, 'beads') && <Crackle clock={clock} offset={offset} legs={legs} />}
      {has(look, 'fish') && [0, 1, 2].map((i) => <Fish key={i} clock={clock} offset={offset} i={i} legs={legs} />)}
      {has(look, 'whale') && <Whale clock={clock} offset={offset} front legs={legs} />}
      {has(look, 'bluefire') && <SeaFire clock={clock} offset={offset} legs={legs} />}
      {look.companion && <Companion kind={look.companion} clock={clock} offset={offset} legs={legs} />}
    </Group>
  )
}

function Halo({ clock, offset, color }: Clock & { color: string }) {
  const bob = useDerivedValue(() => [{ translateY: Math.sin((clock.value + offset) / 800) * 1.2 }])
  return (
    <Group transform={bob}>
      <Oval x={16} y={10} width={24} height={6} color={color} style="stroke" strokeWidth={2} opacity={0.85} />
      <Oval x={13} y={7} width={30} height={12} opacity={0.5}>
        <RadialGradient c={vec(28, 13)} r={15} colors={[`${color}aa`, `${color}00`]} />
      </Oval>
    </Group>
  )
}

/** A lighthouse beam swept slowly from the lamp on their hat. */
function Beam({ clock, offset }: Clock) {
  const t = useDerivedValue(() => [{ rotate: Math.sin((clock.value + offset) / 1400) * 0.9 }])
  return (
    <Group transform={t} origin={vec(28, 17)}>
      <Path path="M28 15 L 90 -2 L 90 34 Z" opacity={0.35}>
        <RadialGradient c={vec(28, 17)} r={62} colors={['#fff1b0', '#fff1b000']} />
      </Path>
      <Path path="M28 15 L -34 -2 L -34 34 Z" opacity={0.18}>
        <RadialGradient c={vec(28, 17)} r={62} colors={['#fff1b0', '#fff1b000']} />
      </Path>
    </Group>
  )
}

/** Their own small cloud, raining on nobody in particular (crackling, for a Stormcaller). */
function Cloud({ clock, offset, storm }: Clock & { storm: boolean }) {
  const drift = useDerivedValue(() => [{ translateX: Math.sin((clock.value + offset) / 1600) * 3 }])
  const rain = useDerivedValue(() => [{ translateY: ((clock.value + offset) / 30) % 8 }])
  const flash = useDerivedValue(() => (storm && Math.sin((clock.value + offset) / 170) > 0.9 ? 1 : 0))
  const body = storm ? '#3a3050' : '#c9d2dc'
  return (
    <Group transform={drift}>
      <Group transform={rain} opacity={0.6}>
        {[18, 24, 30, 36].map((rx, i) => (
          <Path key={rx} path={`M${rx} ${4 + (i % 2) * 3} l -1 4`} color={storm ? '#c9a0ff' : '#9ec0cf'} style="stroke" strokeWidth={0.8} strokeCap="round" />
        ))}
      </Group>
      <Circle cx={20} cy={0} r={6} color={body} />
      <Circle cx={28} cy={-3} r={8} color={body} />
      <Circle cx={36} cy={0} r={6} color={body} />
      <Rect x={14} y={0} width={28} height={5} color={body} />
      {storm && <Path path="M30 4 l -3 6 l 3 0 l -3 7" color="#ff6af0" style="stroke" strokeWidth={1.2} opacity={flash} />}
    </Group>
  )
}

/** Lightning crackling round the hands and coat. */
function Crackle({ clock, offset, legs }: Clock & { legs: boolean }) {
  const y = legs ? 70 : 64
  const path = useDerivedValue(() => {
    const k = Math.floor((clock.value + offset) / 120) % 3
    return [
      `M6 ${y} l 4 6 l -3 2 l 5 7 M50 ${y + 4} l -4 5 l 3 2 l -5 8`,
      `M4 ${y + 8} l 5 4 l -2 3 l 4 6 M52 ${y} l -3 6 l 3 1 l -4 9`,
      `M8 ${y - 4} l 2 7 l -3 1 l 4 6 M48 ${y + 10} l -5 3 l 2 3 l -4 5`,
    ][k]
  })
  const opacity = useDerivedValue(() => (Math.sin((clock.value + offset) / 200) > 0.2 ? 0.95 : 0))
  return (
    <Group opacity={opacity}>
      <Path path={path} color="#ff6af0" style="stroke" strokeWidth={2.2} strokeCap="round" opacity={0.4} />
      <Path path={path} color="#fff0ff" style="stroke" strokeWidth={0.9} strokeCap="round" />
    </Group>
  )
}

function Fish({ clock, offset, i, legs }: Clock & { i: number; legs: boolean }) {
  const a = useDerivedValue(() => (clock.value + offset) / 1500 + (i * Math.PI * 2) / 3)
  const t = useDerivedValue(() => [
    { translateX: 28 + Math.cos(a.value) * 30 },
    { translateY: (legs ? 60 : 48) + Math.sin(a.value) * 9 + i * 8 },
    { scaleX: Math.sin(a.value) > 0 ? -1 : 1 },
  ])
  const opacity = useDerivedValue(() => (Math.sin(a.value) > 0 ? 0.95 : 0.35))
  return (
    <Group transform={t} opacity={opacity}>
      <Path path="M-4 0 C -2 -2.6, 2 -2.6, 4 0 C 2 2.6, -2 2.6, -4 0 Z M4 0 L 7 -2.4 L 7 2.4 Z" color={['#ff9a7a', '#f2d16b', '#7fd1c8'][i]} />
    </Group>
  )
}

/** Cold blue fire flickering along the shoulders and hat: the sea-fire sailors fear. */
function SeaFire({ clock, offset, legs }: Clock & { legs: boolean }) {
  const spots: [number, number][] = legs
    ? [[12, 64], [44, 64], [6, 30], [50, 30], [28, 16], [14, 108], [42, 108]]
    : [[8, 68], [48, 68], [6, 30], [50, 30], [28, 16]]
  return (
    <Group>
      {spots.map(([fx, fy], i) => (
        <Flame key={i} clock={clock} offset={offset + i * 173} x={fx} y={fy} />
      ))}
    </Group>
  )
}

function Flame({ clock, offset, x, y }: Clock & { x: number; y: number }) {
  const t = useDerivedValue(() => {
    const k = 0.75 + 0.35 * Math.abs(Math.sin((clock.value + offset) / 130))
    return [{ translateX: x }, { translateY: y }, { scaleY: k }, { scaleX: 0.9 + 0.2 * Math.sin((clock.value + offset) / 210) }]
  })
  return (
    <Group transform={t}>
      <Path path="M0 0 C -3 -3, -2 -7, 0 -10 C 2 -7, 3 -3, 0 0 Z" color="#4ad0ff" opacity={0.75} />
      <Path path="M0 0 C -1.4 -2, -1 -4.6, 0 -6 C 1 -4.6, 1.4 -2, 0 0 Z" color="#e8fbff" opacity={0.9} />
    </Group>
  )
}

// ---------- companions ----------

/** The creature that rides on their right shoulder. */
export function Companion({ kind, clock, offset, legs }: Clock & { kind: CompanionKind; legs: boolean }) {
  const sx = legs ? 44 : 48
  const sy = legs ? 62 : 66
  const bob = useDerivedValue(() => [{ translateX: sx }, { translateY: sy + Math.sin((clock.value + offset) / 450) * 0.8 }])
  const head = useDerivedValue(() => [{ rotate: Math.sin((clock.value + offset) / 1300) * 0.25 }])
  const tail = useDerivedValue(() => `M-7 2 C -12 4, -14 10, ${-11 + Math.sin((clock.value + offset) / 500) * 3} 16`)
  switch (kind) {
    case 'gull':
      return (
        <Group transform={bob}>
          <Oval x={-6} y={-7} width={12} height={8} color="#f3efe8" />
          <Path path="M-6 -4 C -2 -6, 4 -6, 6 -3 L 2 -1 Z" color="#9aa4b4" />
          <Group transform={head} origin={vec(3, -7)}>
            <Circle cx={4} cy={-9} r={3.4} color="#f3efe8" />
            <Path path="M7 -9.4 L 11 -8.6 L 7 -7.8 Z" color="#f2b45a" />
            <Circle cx={5} cy={-9.8} r={0.7} color="#1d1218" />
          </Group>
          <Path path="M-1 0 v 2 M2 0 v 2" color="#f2b45a" style="stroke" strokeWidth={0.8} />
        </Group>
      )
    case 'cat':
      return (
        <Group transform={bob}>
          <Path path={tail} color="#c97a3a" style="stroke" strokeWidth={2.4} strokeCap="round" />
          <Oval x={-9} y={-5} width={14} height={8} color="#d98a4a" />
          <Path path="M-6 -4 v 6 M-2 -5 v 7 M2 -4 v 6" color="#a8582a" style="stroke" strokeWidth={0.8} />
          <Group transform={head} origin={vec(4, -4)}>
            <Circle cx={5} cy={-6} r={4} color="#d98a4a" />
            <Path path="M2 -9 L 2.6 -12.4 L 4.6 -9.6 Z M6 -9.6 L 8 -12.4 L 8.4 -8.8 Z" color="#d98a4a" />
            <Path path="M3.6 -6 h 1 M6.4 -6 h 1" color="#1d1218" style="stroke" strokeWidth={0.8} strokeCap="round" />
          </Group>
        </Group>
      )
    case 'heron':
      return (
        <Group transform={bob}>
          <Oval x={-4} y={-10} width={9} height={11} color="#6f7f94" />
          <Group transform={head} origin={vec(1, -10)}>
            <Path path="M1 -9 C 4 -16, -2 -20, 2 -26" color="#8a9aae" style="stroke" strokeWidth={2.2} strokeCap="round" />
            <Circle cx={2.4} cy={-26.6} r={2.6} color="#c9d6dc" />
            <Path path="M4.6 -26.6 L 11 -25.6 L 4.6 -25 Z" color="#e9b23c" />
            <Path path="M0.6 -28 C -3 -29, -5 -27, -6 -25" color="#1d2230" style="stroke" strokeWidth={0.8} />
            <Circle cx={3} cy={-27.2} r={0.6} color="#1d1218" />
          </Group>
        </Group>
      )
    case 'octopus': {
      return (
        <Group transform={bob}>
          <OctoArms clock={clock} offset={offset} />
          <Path path="M-6 -2 C -7 -12, 7 -12, 6 -2 Z" color="#a8466e" />
          <Circle cx={-2} cy={-5} r={1.4} color="#fff3dc" />
          <Circle cx={2} cy={-5} r={1.4} color="#fff3dc" />
          <Circle cx={-2} cy={-5} r={0.7} color="#1d1218" />
          <Circle cx={2} cy={-5} r={0.7} color="#1d1218" />
        </Group>
      )
    }
  }
}

function OctoArms({ clock, offset }: Clock) {
  const arms = useDerivedValue(() => {
    const t = (clock.value + offset) / 600
    return [-5, -2, 1, 4]
      .map((ax, i) => `M${ax} -2 c ${Math.sin(t + i) * 3} 4, ${-2 + Math.cos(t + i) * 3} 7, ${ax < 0 ? -3 : 3} 9`)
      .join(' ')
  })
  return <Path path={arms} color="#8a3a5a" style="stroke" strokeWidth={1.8} strokeCap="round" />
}
