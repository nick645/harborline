// A captain rises to a new title: the whole screen stops for it. Rays of lamplight turn behind
// them (storm-light for Stormborn), sparks rise, the old title is struck out and the new one
// stamps in, with what they now wear to show for it and the ladder of titles lit to here.

import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated'
import { Canvas, Circle, Group, Path, RadialGradient, vec } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'
import type { CaptainView } from '../../../src/game/captains'
import type { TitleRise } from '../../../src/game/types'
import { RATING_TITLES, TITLE_MARKS } from '../../../src/game/data/captains'
import { Figure } from '../art/Figure'
import { storybookLookFor } from '../art/parts/upgrade'
import { useSceneClock } from '../art/clock'
import { play } from '../sound/sound'
import { fonts, useTheme } from '../theme'

const SCENE_H = 330
const FIG_SCALE = 2
const RAYS = 14
const SPARKS = 22

export function TitleUp({ rise, captain, more, onDone, onOpen }: { rise: TitleRise; captain: CaptainView; more: number; onDone: () => void; onOpen: () => void }) {
  const t = useTheme()
  const { width: W } = useWindowDimensions()
  const clock = useSceneClock()
  const storm = rise.to === 9
  const glow = storm ? '#9aa6ff' : '#f2c75a'
  const [oldW, setOldW] = useState(0)
  const look = useMemo(() => storybookLookFor(captain.id, captain.rare, captain.region, captain.persona?.id, rise.to), [captain, rise.to])

  // The reveal, in beats: the backdrop, the old title struck out, the new one stamping in.
  const fade = useSharedValue(0)
  const strike = useSharedValue(0)
  const stamp = useSharedValue(0)
  const after = useSharedValue(0)
  const pulse = useSharedValue(1)
  useEffect(() => {
    play('rankup')
    fade.set(withTiming(1, { duration: 450 }))
    strike.set(withDelay(700, withTiming(1, { duration: 350 })))
    stamp.set(withDelay(1100, withSpring(1, { damping: 9, stiffness: 140 })))
    after.set(withDelay(1700, withTiming(1, { duration: 500 })))
    pulse.set(withDelay(1700, withRepeat(withSequence(withTiming(1.35, { duration: 600 }), withTiming(1, { duration: 600 })), -1)))
  }, [rise.captainId, rise.to, fade, strike, stamp, after, pulse])

  const backdrop = useAnimatedStyle(() => ({ opacity: fade.get() }))
  const struck = useAnimatedStyle(() => ({ transform: [{ scaleX: strike.get() }] }))
  const oldTitle = useAnimatedStyle(() => ({ opacity: 1 - strike.get() * 0.55 }))
  const newTitle = useAnimatedStyle(() => ({ opacity: Math.min(1, stamp.get() * 1.5), transform: [{ scale: 2.2 - 1.2 * stamp.get() }, { rotate: `${(1 - stamp.get()) * -8}deg` }] }))
  const rest = useAnimatedStyle(() => ({ opacity: after.get(), transform: [{ translateY: (1 - after.get()) * 12 }] }))

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(22, 13, 24, 0.94)', justifyContent: 'center' }, backdrop]}>
      <Pressable onPress={onDone} style={{ flex: 1, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={`${captain.name} is now a ${RATING_TITLES[rise.to]}. Tap to continue`}>
        <Text style={{ alignSelf: 'center', color: glow, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 3 }}>A NEW TITLE</Text>
        <View style={{ height: SCENE_H }}>
          <Canvas style={{ width: W, height: SCENE_H }}>
            <Rays clock={clock} cx={W / 2} cy={SCENE_H * 0.5} r={Math.max(W, SCENE_H)} color={glow} />
            <Circle cx={W / 2} cy={SCENE_H * 0.52} r={130}>
              <RadialGradient c={vec(W / 2, SCENE_H * 0.52)} r={130} colors={[`${glow}66`, `${glow}00`]} />
            </Circle>
            {Array.from({ length: SPARKS }, (_, i) => (
              <Spark key={i} i={i} clock={clock} w={W} h={SCENE_H} color={i % 3 === 0 ? '#fff3dc' : glow} />
            ))}
            <Figure look={look} x={W / 2 - 28 * FIG_SCALE} y={SCENE_H - 148 * FIG_SCALE + 6} scale={FIG_SCALE} clock={clock} legs rimLight={glow} />
          </Canvas>
        </View>

        <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 24 }}>
          <Text style={{ color: t.text, fontFamily: fonts.title, fontSize: 30 }}>{captain.name}</Text>
          <Animated.View style={[{ alignSelf: 'center' }, oldTitle]}>
            <Text onLayout={(e) => setOldW(e.nativeEvent.layout.width)} style={{ color: t.muted, fontFamily: fonts.title, fontSize: 22 }}>
              {RATING_TITLES[rise.from]}
            </Text>
            <Animated.View style={[{ position: 'absolute', left: -4, width: oldW + 8, top: '52%', height: 2, backgroundColor: t.bad, transformOrigin: 'left' }, struck]} />
          </Animated.View>
          <Animated.Text style={[{ color: glow, fontFamily: fonts.title, fontSize: 46, lineHeight: 52, textShadowColor: glow, textShadowRadius: 14 }, newTitle]}>{RATING_TITLES[rise.to]}</Animated.Text>

          <Animated.View style={[{ alignItems: 'center', gap: 10, marginTop: 4 }, rest]}>
            <Ladder to={rise.to} glow={glow} pulse={pulse} />
            <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 15, textAlign: 'center' }}>
              <Text style={{ color: glow, fontFamily: fonts.bold }}>New to wear: </Text>
              {TITLE_MARKS[rise.to]}
            </Text>
            <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' }}>
              LVL {captain.rating.guess}
              {rise.to < RATING_TITLES.length - 1 ? ` · ${RATING_TITLES[rise.to + 1]} at ${(rise.to + 1) * 10}` : ' · The top of the ladder'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable onPress={onOpen} accessibilityRole="button" style={({ pressed }) => ({ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: glow, opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ color: glow, fontFamily: fonts.bold, fontSize: 15 }}>See {captain.name.split(' ')[0]}</Text>
              </Pressable>
              <Pressable onPress={onDone} accessibilityRole="button" style={({ pressed }) => ({ paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12, backgroundColor: glow, opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: '#2b1f2c', fontFamily: fonts.bold, fontSize: 15 }}>{more > 0 ? `Next (${more} more)` : 'Splendid'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

/** Every title as a pip, lit to the new one, which pulses. */
function Ladder({ to, glow, pulse }: { to: number; glow: string; pulse: SharedValue<number> }) {
  const t = useTheme()
  const beat = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }))
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {RATING_TITLES.map((name, i) => {
        const dot = { width: i === to ? 14 : 9, height: i === to ? 14 : 9, borderRadius: 7, backgroundColor: i <= to ? glow : t.border, opacity: i < to ? 0.7 : 1 }
        return i === to ? <Animated.View key={name} style={[dot, beat]} /> : <View key={name} style={dot} />
      })}
    </View>
  )
}

/** Lamplight rays turning slowly behind them. */
function Rays({ clock, cx, cy, r, color }: { clock: SharedValue<number>; cx: number; cy: number; r: number; color: string }) {
  const spin = useDerivedValue(() => [{ rotate: clock.get() / 9000 }])
  const path = useMemo(() => {
    const half = Math.PI / RAYS / 2.4
    return Array.from({ length: RAYS }, (_, i) => {
      const a = (i / RAYS) * Math.PI * 2
      return `M${cx} ${cy} L ${cx + Math.cos(a - half) * r} ${cy + Math.sin(a - half) * r} L ${cx + Math.cos(a + half) * r} ${cy + Math.sin(a + half) * r} Z`
    }).join(' ')
  }, [cx, cy, r])
  return (
    <Group transform={spin} origin={vec(cx, cy)}>
      <Path path={path}>
        <RadialGradient c={vec(cx, cy)} r={r * 0.6} colors={[`${color}55`, `${color}00`]} />
      </Path>
    </Group>
  )
}

/** One spark rising and fading, on its own phase. */
function Spark({ i, clock, w, h, color }: { i: number; clock: SharedValue<number>; w: number; h: number; color: string }) {
  const seed = (i * 7919) % 1000
  const x0 = w / 2 + (((seed * 37) % 260) - 130)
  const period = 2600 + (seed % 1700)
  const at = useDerivedValue(() => ((clock.get() + seed * 13) % period) / period)
  const cx = useDerivedValue(() => x0 + Math.sin(at.get() * 6 + i) * 10)
  const cy = useDerivedValue(() => h - 20 - at.get() * (h - 30))
  const opacity = useDerivedValue(() => Math.sin(at.get() * Math.PI) * 0.9)
  return <Circle cx={cx} cy={cy} r={1.4 + (seed % 3) * 0.7} color={color} opacity={opacity} />
}
