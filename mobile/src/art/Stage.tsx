// The frame every scene draws in. A scene is designed at a fixed size (W × H); given more
// height than that, the frame grows: the drawing slides down to stand on the bottom edge, the
// space above is filled with the scene's sky, and its ground runs on below. So a scene can fill
// whatever room a page has without stretching or leaving bands.

import type { ReactNode } from 'react'
import { Canvas, Circle, Group, LinearGradient, Path, Rect, RoundedRect, rect, rrect, vec } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'
import { useSceneClock } from './clock'

export function Stage({
  width,
  height,
  W,
  H,
  sky,
  ground,
  night = false,
  indoor = false,
  children,
}: {
  width: number
  /** Screen height wanted; defaults to the design's own aspect. */
  height?: number
  W: number
  H: number
  /** Colours to fill above (top to the scene's top edge) and below. */
  sky: [string, string]
  ground: string
  /** Stars and a moonlit cloud in the open sky (else clouds and gulls). */
  night?: boolean
  /** Indoors: the extra height is ceiling beams and hanging lamps instead of sky. */
  indoor?: boolean
  children: ReactNode
}) {
  const { s, visibleW, cropX, above, below, total } = stageFrame(width, height, W, H)
  return (
    <Canvas style={{ width, height: total * s }}>
      <Group transform={[{ scale: s }, { translateX: -cropX }]} clip={rrect(rect(cropX, 0, visibleW, total), 20 / s, 20 / s)}>
        {above > 0 && (
          <Group>
            <Rect x={0} y={0} width={W} height={above + 2}>
              <LinearGradient start={vec(0, 0)} end={vec(0, above + 2)} colors={sky} />
            </Rect>
            <OpenSky W={W} height={above} night={night} indoor={indoor} />
          </Group>
        )}
        {below > 0 && <Rect x={0} y={above + H - 2} width={W} height={below + 2} color={ground} />}
        <Group transform={[{ translateY: above }]}>{children}</Group>
      </Group>
    </Canvas>
  )
}

/**
 * How a scene sits in its frame. Scale up until the scene's height fits (cropping a little off
 * the sides), never cropping more than a fifth of the width; past that the sky extends above.
 * Overlays (tap targets) use this to land on the drawing: screen x = (sceneX − cropX) · s,
 * screen y = (sceneY + above) · s.
 */
export function stageFrame(width: number, height: number | undefined, W: number, H: number) {
  const fit = width / W
  const cover = height ? Math.min(height / H, fit * 1.25) : fit
  const s = Math.max(fit, cover)
  const visibleW = width / s
  const cropX = (W - visibleW) / 2
  const want = height ? height / s : H
  const extra = Math.max(0, want - H)
  // Most of the extra goes above, so the action stays near the bottom of the frame like a stage.
  const above = extra * 0.7
  const below = extra - above
  return { s, visibleW, cropX, above, below, total: H + extra }
}

/** What fills the open sky above a scene: stars at night, clouds and gulls by day; beams indoors. */
function OpenSky({ W, height, night, indoor }: { W: number; height: number; night: boolean; indoor: boolean }) {
  const clock = useSceneClock()
  const drift = useDerivedValue(() => [{ translateX: ((clock.value / 160) % (W + 160)) - 120 }])
  const driftB = useDerivedValue(() => [{ translateX: W - (((clock.value / 230) % (W + 200)) - 60) }])
  const twinkle = useDerivedValue(() => 0.6 + 0.4 * Math.sin(clock.value / 500))
  const gull = useDerivedValue(() => {
    const f = Math.sin(clock.value / 130) * 4
    return `M-7 ${f * 0.3} Q -3.5 ${-f} 0 0 Q 3.5 ${-f} 7 ${f * 0.3}`
  })
  const gullAt = useDerivedValue(() => [{ translateX: ((clock.value / 55) % (W + 80)) - 40 }, { translateY: height * 0.55 + Math.sin(clock.value / 900) * 8 }])
  if (indoor) {
    // Ceiling beams and a pair of hanging lamps.
    return (
      <Group>
        {Array.from({ length: Math.ceil(height / 46) }, (_, i) => (
          <Rect key={i} x={0} y={height - 10 - i * 46} width={W} height={8} color="#2e1c19" opacity={0.85} />
        ))}
        {[W * 0.3, W * 0.7].map((x) => (
          <Group key={x}>
            <Path path={`M${x} 0 V ${height - 26}`} color="#2e1c19" style="stroke" strokeWidth={1.4} />
            <RoundedRect x={x - 7} y={height - 26} width={14} height={14} r={3} color="#2e1c19" />
            <RoundedRect x={x - 4.5} y={height - 23.5} width={9} height={9} r={2} color="#ffd27a" opacity={twinkle} />
          </Group>
        ))}
      </Group>
    )
  }
  const stars = Array.from({ length: Math.round((W * height) / 1800) }, (_, i) => ({ x: (i * 97) % W, y: ((i * 53) % Math.max(1, height - 8)) + 4, r: 0.8 + (i % 3) * 0.4 }))
  const cloud = (x: number, y: number, k: number) => `M${x} ${y} c ${8 * k} ${-14 * k}, ${30 * k} ${-14 * k}, ${36 * k} ${-4 * k} c ${8 * k} ${-12 * k}, ${34 * k} ${-10 * k}, ${36 * k} ${4 * k} c ${10 * k} 0, ${14 * k} ${8 * k}, ${8 * k} ${12 * k} L ${x} ${y + 12 * k} Z`
  return (
    <Group>
      {night && (
        <Group opacity={twinkle}>
          {stars.map((st, i) => (
            <Circle key={i} cx={st.x} cy={st.y} r={st.r} color="#fff3dc" />
          ))}
        </Group>
      )}
      <Group transform={drift} opacity={night ? 0.25 : 0.55}>
        <Path path={cloud(0, height * 0.35, 1.2)} color={night ? '#c9c0cf' : '#ffffff'} />
      </Group>
      <Group transform={driftB} opacity={night ? 0.18 : 0.45}>
        <Path path={cloud(0, height * 0.7, 0.9)} color={night ? '#c9c0cf' : '#ffffff'} />
      </Group>
      {!night && (
        <Group transform={gullAt}>
          <Path path={gull} color="#3a2e36" style="stroke" strokeWidth={1.6} strokeCap="round" strokeJoin="round" />
        </Group>
      )}
    </Group>
  )
}
