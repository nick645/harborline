// What each port is known for, standing in its scene: a lighthouse on the rocks, net sheds and
// drying racks, a boat chapel on the sea wall, a clock tower over the ferry pier, a bell buoy in
// the fog, an abbey, seals on their rock, a market under awnings, houses on stilts, a domed
// customs house, fortress walls, an ice gate, forge chimneys, the great lantern. Drawn in the
// port scene's space (358 wide, the town's waterline at y = 150); `side` says where the town
// leaves room for it.

import type { ReactNode } from 'react'
import { Circle, Group, Path, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'
import type { Light } from '../light'
import { shade, tint } from '../paint'
import { LANDMARK_SHIFT } from './landmarkSpan'

const WL = 150

type P = { light: Light; lit: (c: string) => string; clock: SharedValue<number> }


function Beam({ x, y, clock, color }: { x: number; y: number; clock: SharedValue<number>; color: string }) {
  // A lighthouse beam sweeping round: wide to the right, gone, wide to the left.
  const sweep = useDerivedValue(() => Math.sin(clock.value / 1400))
  const path = useDerivedValue(() => {
    const s = sweep.value
    const len = 120 * Math.abs(s)
    const dir = s > 0 ? 1 : -1
    return `M${x} ${y} L ${x + dir * len} ${y - 14} L ${x + dir * len} ${y + 10} Z`
  })
  const op = useDerivedValue(() => 0.12 + 0.18 * Math.abs(sweep.value))
  return <Path path={path} color={color} opacity={op} />
}

function Lighthouse({ x, base, h, light, lit, clock, stripes = '#c2452a' }: P & { x: number; base: number; h: number; stripes?: string }) {
  const night = light.stars > 0
  return (
    <Group>
      {night && <Beam x={x} y={base - h - 6} clock={clock} color={light.lamp} />}
      <Path path={`M${x - 8} ${base} L ${x - 5} ${base - h} L ${x + 5} ${base - h} L ${x + 8} ${base} Z`} color={lit('#f3e7d8')} />
      {[0.2, 0.55].map((t) => (
        <Path key={t} path={`M${x - 8 + 3 * t} ${base - h * t} L ${x + 8 - 3 * t} ${base - h * t} L ${x + 8 - 3 * (t + 0.15)} ${base - h * (t + 0.15)} L ${x - 8 + 3 * (t + 0.15)} ${base - h * (t + 0.15)} Z`} color={lit(stripes)} />
      ))}
      <Rect x={x - 7} y={base - h - 2} width={14} height={2.4} color={lit('#2e1c19')} />
      <Rect x={x - 4.5} y={base - h - 10} width={9} height={8} color={night ? light.lamp : lit('#e8e2b0')} />
      <Path path={`M${x - 6} ${base - h - 10} L ${x} ${base - h - 16} L ${x + 6} ${base - h - 10} Z`} color={lit('#2e1c19')} />
      {night && (
        <Circle cx={x} cy={base - h - 6} r={18}>
          <RadialGradient c={vec(x, base - h - 6)} r={18} colors={[`${light.lamp}aa`, `${light.lamp}00`]} />
        </Circle>
      )}
      <Rect x={x - 1.5} y={base - 9} width={3} height={6} color={lit('#3a2420')} />
    </Group>
  )
}

function Rocks({ x0, x1, lit, color = '#5a5048' }: { x0: number; x1: number; lit: (c: string) => string; color?: string }) {
  const w = x1 - x0
  return (
    <Group>
      <Path path={`M${x0} ${WL + 4} C ${x0 + w * 0.1} ${WL - 14}, ${x0 + w * 0.3} ${WL - 22}, ${x0 + w * 0.45} ${WL - 16} C ${x0 + w * 0.6} ${WL - 26}, ${x0 + w * 0.85} ${WL - 18}, ${x1} ${WL + 4} Z`} color={lit(color)} />
      <Path path={`M${x0 + w * 0.3} ${WL - 18} l 8 6 M${x0 + w * 0.62} ${WL - 20} l -6 8`} color={lit(shade(color, 0.3))} style="stroke" strokeWidth={1} />
    </Group>
  )
}

function Clock({ x, y, r, lit }: { x: number; y: number; r: number; lit: (c: string) => string }) {
  return (
    <Group>
      <Circle cx={x} cy={y} r={r + 1} color={lit('#2e1c19')} />
      <Circle cx={x} cy={y} r={r} color={lit('#f3e7d8')} />
      <Path path={`M${x} ${y} v ${-r * 0.7} M${x} ${y} l ${r * 0.5} ${r * 0.2}`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.9} strokeCap="round" />
    </Group>
  )
}

function Flag({ x, y, color, clock }: { x: number; y: number; color: string; clock: SharedValue<number> }) {
  const flap = useDerivedValue(() => {
    const f = Math.sin(clock.value / 220) * 2
    return `M${x} ${y} q 6 ${-2 + f} 12 ${f} q -6 ${3 - f} -12 6 Z`
  })
  return (
    <Group>
      <Path path={`M${x} ${y - 1} v 18`} color="#2e1c19" style="stroke" strokeWidth={1} />
      <Path path={flap} color={color} />
    </Group>
  )
}

// A bell buoy rocking out in the fog.
function BellBuoy({ lit, clock }: P) {
  const rock = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 700) * 0.12 }])
  return (
    <Group>
      <Rocks x0={262} x1={340} lit={lit} color="#5b6470" />
      <Group transform={rock} origin={{ x: 300, y: WL + 14 }}>
        <Path path={`M288 ${WL + 14} L 294 ${WL - 18} L 306 ${WL - 18} L 312 ${WL + 14} Z`} color={lit('#b8423a')} />
        <Path path={`M291 ${WL - 4} h 18`} color={lit('#f3e7d8')} style="stroke" strokeWidth={2} />
        <Path path={`M300 ${WL - 18} v -10`} color={lit('#2e333a')} style="stroke" strokeWidth={1.4} />
        <Path path={`M295 ${WL - 26} q 5 -10 10 0 Z`} color={lit('#c9a227')} />
      </Group>
    </Group>
  )
}

// Seals basking on their rock.
function Seals({ lit, clock }: P) {
  const nod = useDerivedValue(() => [{ rotate: Math.sin(clock.value / 1200) * 0.15 }])
  return (
    <Group>
      <Rocks x0={226} x1={352} lit={lit} color="#6b7480" />
      {[[250, -14], [282, -20], [318, -12]].map(([x, dy], i) => (
        <Group key={i} transform={i === 1 ? nod : undefined} origin={{ x, y: WL + dy }}>
          <Path path={`M${x - 14} ${WL + dy} q 6 -9 20 -6 q 6 -6 10 -2 q -2 6 -8 6 q -8 4 -22 2 Z`} color={lit('#4a4f58')} />
          <Circle cx={x + 13} cy={WL + dy - 7} r={0.8} color="#1d1218" />
        </Group>
      ))}
    </Group>
  )
}

// Forge chimneys belching smoke, and a crane over the quay.
function Forges({ lit, clock, light }: P) {
  const smoke = useDerivedValue(() => {
    const t = clock.value / 1000
    let d = ''
    for (const [x, y0] of [[262, WL - 80], [300, WL - 96]] as const) {
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.25 + i / 4) % 1
        const r = 3 + p * 8
        d += `M${x + p * 14 - r} ${y0 - p * 40} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `
      }
    }
    return d
  })
  return (
    <Group>
      <Path path={smoke} color={light.stars ? '#3a3046' : '#7a7480'} opacity={0.5} />
      <Rect x={240} y={WL - 40} width={90} height={44} color={lit('#3a3f48')} />
      <Path path={`M236 ${WL - 40} l 12 -10 l 12 10 l 12 -10 l 12 10 l 12 -10 l 12 10 l 12 -10 l 12 10 Z`} color={lit('#2a2e36')} />
      <Rect x={258} y={WL - 80} width={8} height={40} color={lit('#5a3424')} />
      <Rect x={296} y={WL - 96} width={9} height={56} color={lit('#5a3424')} />
      {[250, 270, 290, 310].map((x) => (
        <Rect key={x} x={x} y={WL - 24} width={10} height={8} color={light.stars ? '#ff8a3a' : lit('#e9772f')} opacity={0.85} />
      ))}
      <Path path={`M342 ${WL + 2} V ${WL - 70} L 300 ${WL - 62}`} color={lit('#e9b23c')} style="stroke" strokeWidth={2.4} strokeJoin="round" />
      <Path path={`M304 ${WL - 63} v 22`} color={lit('#2e1c19')} style="stroke" strokeWidth={0.8} />
    </Group>
  )
}

// The great lantern tower that names the Reach.
function GreatLantern({ lit, clock }: P) {
  const glow = useDerivedValue(() => 0.75 + 0.25 * Math.sin(clock.value / 500))
  return (
    <Group>
      <Path path={`M162 ${WL + 2} L 168 ${WL - 100} L 192 ${WL - 100} L 198 ${WL + 2} Z`} color={lit('#3b2a3f')} />
      {[0, 1, 2, 3].map((i) => (
        <RoundedRect key={i} x={176} y={WL - 88 + i * 22} width={8} height={12} r={4} color="#ffb054" opacity={0.8} />
      ))}
      <Rect x={160} y={WL - 104} width={40} height={5} color={lit('#1d1218')} />
      <Group opacity={glow}>
        <RoundedRect x={168} y={WL - 126} width={24} height={22} r={4} color="#ffb054" />
        <Circle cx={180} cy={WL - 115} r={46}>
          <RadialGradient c={vec(180, WL - 115)} r={46} colors={['#ffb05499', '#ffb05400']} />
        </Circle>
      </Group>
      <Path path={`M164 ${WL - 126} L 180 ${WL - 142} L 196 ${WL - 126} Z`} color={lit('#1d1218')} />
    </Group>
  )
}

// A smouldering peak, glowing at its crown.
function Smoulder({ lit, clock }: P) {
  const glow = useDerivedValue(() => 0.5 + 0.3 * Math.sin(clock.value / 800))
  return (
    <Group>
      <Path path={`M226 ${WL + 2} L 284 ${WL - 92} L 300 ${WL - 88} L 358 ${WL + 2} Z`} color={lit('#2a1e30')} />
      <Path path={`M284 ${WL - 92} L 300 ${WL - 88} L 296 ${WL - 70} L 290 ${WL - 80} L 286 ${WL - 72} Z`} color="#e9772f" opacity={glow} />
      <Circle cx={292} cy={WL - 94} r={30} opacity={glow}>
        <RadialGradient c={vec(292, WL - 94)} r={30} colors={['#ff8a3a88', '#ff8a3a00']} />
      </Circle>
    </Group>
  )
}

const LANDMARKS: Record<string, (p: P) => ReactNode> = {
  // Home: the lighthouse at the harbour mouth, and the harbour office's flag.
  saltmarsh: (p) => (
    <Group>
      <Rocks x0={296} x1={358} lit={p.lit} />
      <Lighthouse {...p} x={330} base={WL - 14} h={56} />
    </Group>
  ),
  // A fishing village: tarred net sheds, nets drying on poles, a rowing boat pulled up.
  gullwick: ({ lit, clock }) => (
    <Group>
      {[8, 46].map((x, i) => (
        <Group key={x}>
          <Rect x={x} y={WL - 26 + i * 4} width={32} height={30 - i * 4} color={lit('#2e2420')} />
          <Path path={`M${x - 2} ${WL - 26 + i * 4} L ${x + 16} ${WL - 38 + i * 4} L ${x + 34} ${WL - 26 + i * 4} Z`} color={lit('#4a2e22')} />
          {Array.from({ length: 6 }, (_, k) => (
            <Path key={k} path={`M${x + 2 + k * 5} ${WL - 24 + i * 4} v ${26 - i * 4}`} color={lit('#4a3a32')} style="stroke" strokeWidth={0.7} />
          ))}
          <Rect x={x + 12} y={WL - 12 + i * 2} width={8} height={14 - i * 2} color={lit('#1d1218')} />
        </Group>
      ))}
      {/* Drying racks hung with nets */}
      {[86, 100].map((x) => (
        <Path key={x} path={`M${x} ${WL + 2} v -30`} color={lit('#5a3a2a')} style="stroke" strokeWidth={1.6} />
      ))}
      <Path path={`M84 ${WL - 26} h 18`} color={lit('#5a3a2a')} style="stroke" strokeWidth={1.4} />
      <Path path={`M85 ${WL - 26} q 8 18 16 0 M86 ${WL - 22} l 14 14 M100 ${WL - 22} l -14 14 M88 ${WL - 26} v 16 M93 ${WL - 26} v 18 M98 ${WL - 26} v 16`} color={lit('#3f6b5a')} style="stroke" strokeWidth={0.6} />
      <Flag x={78} y={WL - 52} color={lit('#2f5d62')} clock={clock} />
      <Path path={`M60 ${WL + 2} q 12 6 24 0 l -3 -4 h -18 Z`} color={lit('#a8452e')} />
    </Group>
  ),
  // A lighthouse on its point, tall over the rocks.
  brindle: (p) => (
    <Group>
      <Rocks x0={262} x1={358} lit={p.lit} color="#6a5a4e" />
      <Lighthouse {...p} x={318} base={WL - 18} h={78} stripes="#23395b" />
      <Rect x={290} y={WL - 30} width={16} height={12} color={p.lit('#efe3d2')} />
      <Path path={`M288 ${WL - 30} l 10 -7 l 10 7 Z`} color={p.lit('#23395b')} />
    </Group>
  ),
  // A sea wall of dressed stone, and a little chapel where boats are blessed.
  cobble: ({ lit, light }) => (
    <Group>
      <Rect x={230} y={WL - 10} width={128} height={14} color={lit('#8a8078')} />
      {Array.from({ length: 16 }, (_, i) => (
        <Path key={i} path={`M${230 + i * 8} ${WL - 10} v 14`} color={lit('#5a5048')} style="stroke" strokeWidth={0.6} />
      ))}
      <Path path={`M230 ${WL - 3} h 128`} color={lit('#5a5048')} style="stroke" strokeWidth={0.6} />
      <Rect x={290} y={WL - 46} width={34} height={36} color={lit('#efe3d2')} />
      <Path path={`M287 ${WL - 46} L 307 ${WL - 62} L 327 ${WL - 46} Z`} color={lit('#7a1f2a')} />
      <Rect x={300} y={WL - 82} width={14} height={22} color={lit('#efe3d2')} />
      <Path path={`M298 ${WL - 82} L 307 ${WL - 96} L 316 ${WL - 82} Z`} color={lit('#7a1f2a')} />
      <Path path={`M307 ${WL - 96} v -7 M304 ${WL - 100} h 6`} color={lit('#e9b23c')} style="stroke" strokeWidth={1.2} />
      <RoundedRect x={303} y={WL - 76} width={8} height={9} r={4} color={light.stars ? light.window : lit('#3a4a58')} />
      <RoundedRect x={301} y={WL - 30} width={12} height={20} r={6} color={lit('#4a2e22')} />
      <Circle cx={307} cy={WL - 38} r={0} color="#000" />
    </Group>
  ),
  // The ferry town: a long pier with a waiting shelter and a clock tower.
  farhaven: ({ lit, light, clock }) => (
    <Group>
      <Rect x={150} y={WL - 72} width={20} height={76} color={lit('#a8452e')} />
      {Array.from({ length: 10 }, (_, i) => (
        <Path key={i} path={`M150 ${WL - 66 + i * 7} h 20`} color={lit(shade('#a8452e', 0.3))} style="stroke" strokeWidth={0.5} />
      ))}
      <Rect x={147} y={WL - 76} width={26} height={5} color={lit('#efe3d2')} />
      <Path path={`M147 ${WL - 76} L 160 ${WL - 96} L 173 ${WL - 76} Z`} color={lit('#2e333a')} />
      <Clock x={160} y={WL - 62} r={6} lit={lit} />
      <Rect x={156} y={WL - 20} width={8} height={24} color={lit('#3a2420')} />
      <Flag x={160} y={WL - 112} color={lit('#c2452a')} clock={clock} />
      {light.stars > 0 && <Circle cx={160} cy={WL - 62} r={12} color={light.lamp} opacity={0.25} />}
    </Group>
  ),
  // A bell buoy rocking out in the fog.
  mistle: (p) => <BellBuoy {...p} />,
  // An abbey of grey stone on the hill, its tower and a round window.
  greyhollow: ({ lit, light }) => (
    <Group>
      <Rect x={130} y={WL - 48} width={70} height={50} color={lit('#8f9aa8')} />
      {Array.from({ length: 9 }, (_, r) => (
        <Path key={r} path={`M130 ${WL - 43 + r * 5} h 70`} color={lit('#6b7480')} style="stroke" strokeWidth={0.5} />
      ))}
      <Path path={`M126 ${WL - 48} L 165 ${WL - 70} L 204 ${WL - 48} Z`} color={lit('#3f4650')} />
      <Rect x={200} y={WL - 96} width={24} height={98} color={lit('#a8b0b8')} />
      <Path path={`M198 ${WL - 96} L 212 ${WL - 116} L 226 ${WL - 96} Z`} color={lit('#3f4650')} />
      <Circle cx={165} cy={WL - 30} r={8} color={lit('#6b7480')} />
      <Circle cx={165} cy={WL - 30} r={6} color={light.stars ? light.window : lit('#9ec0cf')} />
      {[206, 214].map((x) => (
        <RoundedRect key={x} x={x} y={WL - 84} width={5} height={12} r={2.5} color={light.stars ? light.window : lit('#3a4a58')} />
      ))}
    </Group>
  ),
  // A round watchtower on the cliff edge.
  wickstone: (p) => (
    <Group>
      <Rocks x0={0} x1={86} lit={p.lit} color="#5b6470" />
      <Rect x={22} y={WL - 86} width={24} height={66} color={p.lit('#a8b0b8')} />
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={20 + i * 7} y={WL - 92} width={5} height={6} color={p.lit('#a8b0b8')} />
      ))}
      <RoundedRect x={30} y={WL - 72} width={7} height={12} r={3.5} color={p.light.stars ? p.light.window : p.lit('#3a4a58')} />
    </Group>
  ),
  // Seals basking on their rock.
  sealrock: (p) => <Seals {...p} />,
  // Market day under striped awnings, stalls heaped with fruit.
  coralby: ({ lit }) => (
    <Group>
      {[120, 162, 204].map((x, i) => (
        <Group key={x}>
          <Path path={`M${x + 2} ${WL + 2} v -24 M${x + 36} ${WL + 2} v -24`} color={lit('#6e4733')} style="stroke" strokeWidth={1.4} />
          {Array.from({ length: 6 }, (_, k) => (
            <Rect key={k} x={x + k * 6.3} y={WL - 30} width={6.3} height={7} color={lit(k % 2 ? '#f3efe6' : ['#c2452a', '#2f8a8a', '#e9772f'][i])} />
          ))}
          <Path path={`M${x} ${WL - 23} ${'q 3.15 3 6.3 0 '.repeat(6)}`} color={lit(['#c2452a', '#2f8a8a', '#e9772f'][i])} />
          <Rect x={x + 3} y={WL - 8} width={32} height={10} color={lit('#a8845a')} />
          {Array.from({ length: 7 }, (_, k) => (
            <Circle key={k} cx={x + 7 + k * 4} cy={WL - 10} r={2.2} color={lit(['#e9772f', '#f6e08a', '#c2452a', '#7fb04a'][(k + i) % 4])} />
          ))}
        </Group>
      ))}
    </Group>
  ),
  // Houses on stilts over the shallows, joined by a boardwalk.
  driftwood: ({ lit }) => (
    <Group>
      <Path path={`M4 ${WL - 12} h 140`} color={lit('#a8845a')} style="stroke" strokeWidth={3} />
      {[10, 58, 104].map((x, i) => (
        <Group key={x}>
          {[0, 12, 24, 36].map((k) => (
            <Path key={k} path={`M${x + k} ${WL - 12} v 22`} color={lit('#6e4733')} style="stroke" strokeWidth={1.6} />
          ))}
          <Rect x={x - 2} y={WL - 40} width={40} height={28} color={lit(['#7fd1c8', '#f2a7a0', '#f6e08a'][i])} />
          <Path path={`M${x - 6} ${WL - 40} L ${x + 18} ${WL - 58} L ${x + 42} ${WL - 40} Z`} color={lit('#c9a26a')} />
          {Array.from({ length: 8 }, (_, k) => (
            <Path key={k} path={`M${x - 4 + k * 6} ${WL - 41} l 3 4`} color={lit('#a8845a')} style="stroke" strokeWidth={0.8} />
          ))}
          <Rect x={x + 14} y={WL - 30} width={8} height={18} color={lit('#4a2e22')} />
        </Group>
      ))}
    </Group>
  ),
  // The domed customs house, gilded, with a colonnade.
  saffron: ({ lit, light }) => (
    <Group>
      <Rect x={136} y={WL - 44} width={90} height={46} color={lit('#f3efe6')} />
      {Array.from({ length: 7 }, (_, i) => (
        <Rect key={i} x={142 + i * 12.5} y={WL - 38} width={4} height={38} color={lit('#e0d6c4')} />
      ))}
      <Rect x={132} y={WL - 48} width={98} height={6} color={lit('#e9b23c')} />
      <Rect x={162} y={WL - 62} width={38} height={14} color={lit('#f3efe6')} />
      <Path path={`M158 ${WL - 62} C 158 ${WL - 92}, 204 ${WL - 92}, 204 ${WL - 62} Z`} color={lit('#e9b23c')} />
      <Path path={`M166 ${WL - 66} C 170 ${WL - 84}, 192 ${WL - 84}, 196 ${WL - 66}`} color={lit(tint('#e9b23c', 0.4))} style="stroke" strokeWidth={1.2} />
      <Path path={`M181 ${WL - 88} v -10`} color={lit('#c99a2e')} style="stroke" strokeWidth={1.6} />
      <Circle cx={181} cy={WL - 99} r={2} color={lit('#e9b23c')} />
      {light.stars > 0 && <Rect x={136} y={WL - 38} width={90} height={38} color={light.lamp} opacity={0.15} />}
    </Group>
  ),
  // Fortress walls round the whole harbour, battlements and a gatehouse.
  holdfast: ({ lit, clock }) => (
    <Group>
      <Rect x={0} y={WL - 26} width={358} height={30} color={lit('#4a4f58')} />
      {Array.from({ length: 30 }, (_, i) => (
        <Rect key={i} x={i * 12} y={WL - 32} width={7} height={7} color={lit('#4a4f58')} />
      ))}
      {Array.from({ length: 6 }, (_, r) => (
        <Path key={r} path={`M0 ${WL - 22 + r * 5} h 358`} color={lit('#3a3f48')} style="stroke" strokeWidth={0.5} />
      ))}
      <Rect x={160} y={WL - 60} width={40} height={64} color={lit('#5a5e66')} />
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={158 + i * 12} y={WL - 66} width={8} height={7} color={lit('#5a5e66')} />
      ))}
      <RoundedRect x={170} y={WL - 30} width={20} height={34} r={10} color={lit('#1d2128')} />
      <Flag x={180} y={WL - 86} color={lit('#b8423a')} clock={clock} />
    </Group>
  ),
  // A gate of ice and black stone across the harbour mouth.
  frostgate: ({ lit }) => (
    <Group>
      <Path path={`M140 ${WL + 4} L 140 ${WL - 50} C 140 ${WL - 92}, 220 ${WL - 92}, 220 ${WL - 50} L 220 ${WL + 4} L 206 ${WL + 4} L 206 ${WL - 48} C 206 ${WL - 72}, 154 ${WL - 72}, 154 ${WL - 48} L 154 ${WL + 4} Z`} color={lit('#2e333a')} />
      <Path path={`M140 ${WL - 50} C 140 ${WL - 92}, 220 ${WL - 92}, 220 ${WL - 50} L 214 ${WL - 52} C 210 ${WL - 82}, 150 ${WL - 82}, 146 ${WL - 52} Z`} color={lit('#e8f2fa')} />
      {[150, 162, 176, 190, 204].map((x, i) => (
        <Path key={x} path={`M${x} ${WL - 74 + Math.abs(2 - i) * 4} l 2 ${8 + (i % 2) * 5} l 2 ${-(8 + (i % 2) * 5)} Z`} color={lit('#cfe0f0')} />
      ))}
    </Group>
  ),
  // Forge chimneys belching smoke, and a crane over the quay.
  anvil: (p) => <Forges {...p} />,
  // The great lantern tower that names the Reach.
  lanternhold: (p) => <GreatLantern {...p} />,
  // A smouldering peak, glowing at its crown.
  ember: (p) => <Smoulder {...p} />,
  // The last lighthouse before the edge of the chart.
  lastlight: (p) => (
    <Group>
      <Rocks x0={266} x1={358} lit={p.lit} color="#2a1e30" />
      <Lighthouse {...p} x={314} base={WL - 18} h={90} stripes="#7a1f2a" />
    </Group>
  ),
}

export function Landmark({ portId, ...p }: P & { portId: string }) {
  const Draw = LANDMARKS[portId]
  return Draw ? (
    <Group transform={[{ translateX: LANDMARK_SHIFT[portId] ?? 0 }]}>
      <Draw {...p} />
    </Group>
  ) : null
}
