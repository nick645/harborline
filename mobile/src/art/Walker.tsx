// A captain on their feet: they walk between two spots in the scene, stepping as they go, and
// at each end stop to do something with what they're holding (spyglass to the eye, a sip from
// the mug, a look at the logbook...). Feet land on `footY`. With Reduce Motion the clock holds
// still, so they stand at `x0` doing nothing.

import { Group, Oval, Path, RoundedRect } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Look } from './looks'
import { Figure, FIGURE_FULL_H } from './Figure'

type Props = {
  look: Look
  clock: SharedValue<number>
  /** Left edges of the figure at each end of their walk, in scene units. */
  x0: number
  x1: number
  footY: number
  scale: number
  /** Scene units per second. */
  speed?: number
  /** How long they stop at each end, acting. */
  pauseMs?: number
  offset?: number
  rimLight?: string
  wind?: boolean
  /** A soft shadow under their feet. */
  shadow?: boolean
}

export function Walker({ look, clock, x0, x1, footY, scale, speed = 16, pauseMs = 5200, offset = 0, rimLight, wind, shadow = true }: Props) {
  const walkMs = (Math.abs(x1 - x0) / speed) * 1000
  const cycle = 2 * (walkMs + pauseMs)

  // Where they are in the loop: stopped at x0, walking out, stopped at x1, walking back.
  const plan = useDerivedValue(() => {
    let t = (((clock.value + offset) % cycle) + cycle) % cycle
    const act = (u: number) => Math.sin(Math.min(1, Math.max(0, (u - 0.12) / 0.76)) * Math.PI)
    if (t < pauseMs) return { x: x0, walking: 0, act: act(t / pauseMs) }
    t -= pauseMs
    if (t < walkMs) return { x: x0 + ((x1 - x0) * t) / walkMs, walking: 1, act: 0 }
    t -= walkMs
    if (t < pauseMs) return { x: x1, walking: 0, act: act(t / pauseMs) }
    t -= pauseMs
    return { x: x1 + ((x0 - x1) * t) / walkMs, walking: 1, act: 0 }
  })
  const stride = useDerivedValue(() => (plan.value.walking ? Math.sin((clock.value + offset) / 140) : 0))
  const act = useDerivedValue(() => plan.value.act)
  const move = useDerivedValue(() => [
    { translateX: plan.value.x - x0 },
    // A little bounce on each step.
    { translateY: -Math.abs(stride.value) * 1.6 * scale },
  ])
  const shadowX = useDerivedValue(() => plan.value.x + 4 * scale)

  return (
    <Group>
      {shadow && <Oval x={shadowX} y={footY - 4 * scale} width={48 * scale} height={8 * scale} color="#000000" opacity={0.2} />}
      <Group transform={move}>
        <Figure look={look} x={x0} y={footY - FIGURE_FULL_H * scale} scale={scale} clock={clock} offset={offset} rimLight={rimLight} wind={wind} legs motion={{ stride, act }} />
      </Group>
    </Group>
  )
}

/**
 * Two people talking: speech bubbles with bobbing dots that take turns above each head.
 * `a` and `b` are where the bubbles sit (just above each head).
 */
export function Chatter({ clock, a, b, offset = 0, color = '#fff3dc' }: { clock: SharedValue<number>; a: { x: number; y: number }; b: { x: number; y: number }; offset?: number; color?: string }) {
  const TURN = 2600
  // Each speaks for part of their turn, then a short silence.
  const showA = useDerivedValue(() => {
    const t = ((clock.value + offset) % (2 * TURN) + 2 * TURN) % (2 * TURN)
    return (t < TURN * 0.8 ? 1 : 0) as number
  })
  const showB = useDerivedValue(() => {
    const t = ((clock.value + offset) % (2 * TURN) + 2 * TURN) % (2 * TURN)
    return (t > TURN && t < TURN * 1.8 ? 1 : 0) as number
  })
  const dots = useDerivedValue(() => {
    let d = ''
    for (let i = 0; i < 3; i++) {
      const lift = Math.max(0, Math.sin((clock.value + offset) / 160 - i * 0.9)) * 1.6
      const r = 1.3
      d += `M${-5 + i * 5 - r} ${-lift} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
    }
    return d
  })
  const bubble = (p: { x: number; y: number }, show: SharedValue<number>, tailLeft: boolean) => (
    <Group opacity={show} transform={[{ translateX: p.x }, { translateY: p.y }]}>
      <RoundedRect x={-11} y={-16} width={22} height={13} r={6} color={color} />
      <Path path={tailLeft ? 'M-3 -3.5 L -7 2 L 2 -3.5 Z' : 'M3 -3.5 L 7 2 L -2 -3.5 Z'} color={color} />
      <Group transform={[{ translateY: -9.5 }]}>
        <Path path={dots} color="#4a3346" />
      </Group>
    </Group>
  )
  return (
    <Group>
      {bubble(a, showA, false)}
      {bubble(b, showB, true)}
    </Group>
  )
}
