// Something drifting past on the water: a bottle, a crate, a barrel, a tangle of net. It bobs
// across the scene at `waterY` (a share of the scene's height), now and then, while there's a
// find to be had; tap it before it drifts off.

import { useEffect, useState } from 'react'
import { Animated, Easing, Pressable } from 'react-native'
import { Canvas, Circle, Group, Path, Rect, RoundedRect } from '@shopify/react-native-skia'
import type { FlotsamKind } from '../../../src/game/data/flotsam'

const SIZE = 40
/** How long it takes to drift across, and the wait between sightings. */
const DRIFT_MS = 15000
const WAIT_MS: [number, number] = [5000, 16000]

function Thing({ kind }: { kind: FlotsamKind }) {
  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Group>
        {/* A ring of light so it can be spotted */}
        <Circle cx={20} cy={22} r={17} color="#fff3dc" opacity={0.18} />
        {kind === 'bottle' && (
          <Group transform={[{ rotate: -0.5 }]} origin={{ x: 20, y: 22 }}>
            <RoundedRect x={11} y={17} width={18} height={9} r={4} color="#5a9a7a" opacity={0.9} />
            <Rect x={28} y={19} width={5} height={5} color="#5a9a7a" />
            <Rect x={33} y={19.5} width={3} height={4} color="#8a5a3a" />
            <Rect x={14} y={19} width={10} height={5} color="#efe3d2" />
          </Group>
        )}
        {kind === 'crate' && (
          <Group>
            <Rect x={10} y={13} width={20} height={15} color="#a06a44" />
            <Path path="M10 13 l 20 15 M30 13 l -20 15" color="#5a3a2a" style="stroke" strokeWidth={1.4} />
          </Group>
        )}
        {kind === 'barrel' && (
          <Group>
            <RoundedRect x={11} y={12} width={18} height={18} r={6} color="#8a5a3a" />
            <Path path="M11 17 h 18 M11 25 h 18" color="#2e1c19" style="stroke" strokeWidth={1.6} />
          </Group>
        )}
        {kind === 'net' && <Path path="M8 24 q 6 -10 12 0 q 6 -10 12 0 M10 18 l 8 10 M18 18 l 8 10 M26 18 l -8 10 M14 28 l 8 -10" color="#3f6b5a" style="stroke" strokeWidth={1.6} strokeCap="round" />}
        {/* The waterline it rides in */}
        <Path path="M4 28 q 8 -4 16 0 t 16 0" color="#cfe6ee" style="stroke" strokeWidth={1.6} opacity={0.8} />
      </Group>
    </Canvas>
  )
}

export function Flotsam({ width, height, waterY, kind, ready, onCollect }: { width: number; height: number; waterY: number; kind: FlotsamKind; ready: boolean; onCollect: () => void }) {
  const [x] = useState(() => new Animated.Value(-SIZE))
  const [bob] = useState(() => new Animated.Value(0))
  const [showing, setShowing] = useState(false)

  useEffect(() => {
    // Nothing to find: it shows nothing (see below), and nothing is scheduled.
    if (!ready) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const sail = () => {
      if (cancelled) return
      setShowing(true)
      x.setValue(-SIZE)
      Animated.timing(x, { toValue: width + SIZE, duration: DRIFT_MS, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (cancelled || !finished) return
        setShowing(false)
        timer = setTimeout(sail, WAIT_MS[0] + Math.random() * (WAIT_MS[1] - WAIT_MS[0]))
      })
    }
    timer = setTimeout(sail, 2500 + Math.random() * 5000)
    const bobbing = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    bobbing.start()
    return () => {
      cancelled = true
      clearTimeout(timer)
      bobbing.stop()
      x.stopAnimation()
    }
  }, [ready, width, x, bob])

  if (!ready || !showing) return null
  const y = height * waterY - SIZE * 0.7
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: y,
        transform: [{ translateX: x }, { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) }],
      }}
    >
      <Pressable
        onPress={() => {
          x.stopAnimation()
          setShowing(false)
          onCollect()
        }}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel={`Fish out the ${kind}`}
      >
        <Thing kind={kind} />
      </Pressable>
    </Animated.View>
  )
}
