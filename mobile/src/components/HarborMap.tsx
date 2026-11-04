// The sea chart, lit by the player's own time of day: a mainland coast and islands
// (map/geography.ts), each climate's land with its trees, pines, palms, peaks or dunes, the
// shallows pale along every shore, and cloud over the regions you haven't charted. Pinch to
// zoom and drag to pan; a tap on a port opens it. Routes run from home, coloured by their weather.

import { useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, Text, View, type GestureResponderEvent } from 'react-native'
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import type { GameState, Port, Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { getVoyage } from '../../../src/game/state'
import { routeWeather, weatherChangesAt } from '../../../src/game/weather'
import { chartingNext, homeOf, openPorts } from '../../../src/game/regions'
import { PORTS, REGIONS, type Climate } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import { duration } from '../../../src/format'
import { fonts, useTheme } from '../theme'
import { lightAt } from '../art/light'
import { REGION_STYLE } from '../art/regionStyle'
import { mix, shade } from '../art/paint'
import { LAND as LAND_PIECES, RIVERS, ZONE_SHAPES, scatter, smooth, type Decor } from '../map/geography'

const LABEL_BG = '#1d1420'
const PAD = 170

function bounds(ports: Port[]) {
  const xs = ports.map((p) => p.x)
  const ys = ports.map((p) => p.y)
  return { x0: Math.min(...xs) - PAD, y0: Math.min(...ys) - PAD, x1: Math.max(...xs) + PAD, y1: Math.max(...ys) + PAD }
}

/** What the land looks like from above in each climate. */
const LAND: Record<Climate, string> = { temperate: '#6f8a52', forest: '#2f5040', tropical: '#c9c07a', snow: '#d8e0e8', desert: '#d8a868' }

/** One thing on the land: a tree, a pine, a palm, a snowy peak, a dune or a mesa. Map units. */
function Icon({ d, light }: { d: Decor; light: ReturnType<typeof lightAt> }) {
  const c = (hex: string) => mix(hex, light.silhouette, light.dim * 0.5)
  const { x, y, s, v } = d
  switch (d.climate) {
    case 'temperate':
      return (
        <G>
          <Line x1={x} y1={y} x2={x} y2={y - 12 * s} stroke={c('#5a3a2a')} strokeWidth={3.5 * s} />
          <Circle cx={x} cy={y - 20 * s} r={12 * s} fill={c(v > 0.5 ? '#4f7a3e' : '#5f8a48')} />
          <Circle cx={x + 5 * s} cy={y - 24 * s} r={5 * s} fill={c('#7aa05a')} />
        </G>
      )
    case 'forest':
      return (
        <G>
          <Path d={`M${x} ${y - 40 * s} L ${x - 13 * s} ${y} L ${x + 13 * s} ${y} Z`} fill={c(v > 0.5 ? '#1f3a2a' : '#26442f')} />
          <Path d={`M${x} ${y - 40 * s} L ${x + 13 * s} ${y} L ${x + 4 * s} ${y} Z`} fill={c('#335a40')} />
        </G>
      )
    case 'tropical':
      return (
        <G>
          <Path d={`M${x} ${y} q ${4 * s} ${-16 * s} ${-2 * s} ${-32 * s}`} stroke={c('#8a5a3a')} strokeWidth={3.5 * s} fill="none" strokeLinecap="round" />
          <Path
            d={`M${x - 2 * s} ${y - 32 * s} q ${-12 * s} ${-2 * s} ${-16 * s} ${7 * s} M${x - 2 * s} ${y - 32 * s} q ${12 * s} ${-2 * s} ${16 * s} ${7 * s} M${x - 2 * s} ${y - 32 * s} q ${-5 * s} ${-10 * s} ${-14 * s} ${-7 * s} M${x - 2 * s} ${y - 32 * s} q ${5 * s} ${-10 * s} ${14 * s} ${-7 * s}`}
            stroke={c('#3f8a5a')}
            strokeWidth={4 * s}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      )
    case 'snow':
      return (
        <G>
          <Path d={`M${x - 26 * s} ${y} L ${x - 2 * s} ${y - 40 * s} L ${x + 24 * s} ${y} Z`} fill={c('#5a6470')} />
          <Path d={`M${x - 2 * s} ${y - 40 * s} L ${x + 24 * s} ${y} L ${x + 6 * s} ${y} Z`} fill={c('#3f4650')} />
          <Path d={`M${x - 11 * s} ${y - 25 * s} L ${x - 2 * s} ${y - 40 * s} L ${x + 8 * s} ${y - 24 * s} L ${x + 2 * s} ${y - 27 * s} L ${x - 3 * s} ${y - 22 * s} Z`} fill={c('#f3f6fa')} />
        </G>
      )
    case 'desert':
      return v > 0.7 ? (
        <G>
          <Path d={`M${x - 22 * s} ${y} L ${x - 14 * s} ${y - 22 * s} L ${x + 14 * s} ${y - 22 * s} L ${x + 22 * s} ${y} Z`} fill={c('#b8603a')} />
          <Path d={`M${x - 14 * s} ${y - 22 * s} L ${x + 14 * s} ${y - 22 * s} L ${x + 22 * s} ${y} L ${x + 8 * s} ${y} Z`} fill={c('#9a4a2a')} />
        </G>
      ) : (
        <Path d={`M${x - 26 * s} ${y} q ${13 * s} ${-16 * s} ${26 * s} ${-8 * s} q ${13 * s} ${-8 * s} ${26 * s} ${8 * s}`} stroke={c('#c99a5a')} strokeWidth={4 * s} fill="none" strokeLinecap="round" />
      )
  }
}

/** Where each region's name is written across its land. */
const REGION_LABEL: Record<string, { x: number; y: number }> = {
  bay: { x: 380, y: 760 },
  fogbanks: { x: 300, y: -860 },
  sunward: { x: 1450, y: 820 },
  ironcliffs: { x: 1720, y: -1120 },
  lantern: { x: 2700, y: 420 },
}

/** Every port, framed with room round it: the furthest the chart can be panned. */
const WORLD = (() => {
  const xs = PORTS.map((p) => p.x)
  const ys = PORTS.map((p) => p.y)
  return { x0: Math.min(...xs) - 500, y0: Math.min(...ys) - 600, x1: Math.max(...xs) + 500, y1: Math.max(...ys) + 500 }
})()

const DECOR = scatter(PORTS, 104)
const COAST = LAND_PIECES.map((l) => ({ ...l, d: smooth(l.pts) }))
const MAINLAND_D = COAST.find((l) => l.id === 'mainland')!.d
/** A river as one soft line through its points. */
const riverPath = (pts: [number, number][]) => pts.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : i === pts.length - 1 ? ` L ${p[0]} ${p[1]}` : ` Q ${p[0]} ${p[1]} ${(p[0] + pts[i + 1][0]) / 2} ${(p[1] + pts[i + 1][1]) / 2}`)).join('')
const RIVERS_D = RIVERS.map(riverPath)
const ZONES_D = ZONE_SHAPES.map((z) => ({ climate: z.climate, d: smooth(z.pts) }))

export function HarborMap({ game, now, onOpenPort, box }: { game: GameState; now: number; onOpenPort: (portId: string) => void; box: { w: number; h: number } }) {
  const t = useTheme()
  const light = lightAt(now)
  const open = openPorts(game)
  const next = chartingNext(game)
  const fogPorts = next ? PORTS.filter((p) => p.region === next.id) : []
  const openRegions = new Set(open.map((p) => p.region))
  // Frame what you know and the next waters you're charting, to the box's own shape.
  const b = bounds([...open, ...fogPorts])
  let vw = b.x1 - b.x0
  let vh = b.y1 - b.y0 + (next ? 120 * ((b.x1 - b.x0) / 1000) : 0)
  const boxAspect = box.w / Math.max(1, box.h)
  if (vw / vh < boxAspect) vw = vh * boxAspect
  else vh = vw / boxAspect
  const base = { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 + (next ? 60 * (vw / 1000) : 0), w: vw, h: vh }

  // The camera: a zoom over that frame and a pan, from pinches and drags.
  const [cam, setCam] = useState({ z: 1, cx: base.cx, cy: base.cy, key: '' })
  // A newly charted region reframes the chart.
  const frameKey = `${open.length}-${next?.id ?? ''}-${box.w}x${box.h}`
  const c = cam.key === frameKey ? cam : { z: 1, cx: base.cx, cy: base.cy, key: frameKey }
  const view = { x: c.cx - base.w / c.z / 2, y: c.cy - base.h / c.z / 2, w: base.w / c.z, h: base.h / c.z }
  const camRef = useRef(c)
  camRef.current = c
  const origin = useRef({ x: 0, y: 0 })
  const viewRef = useRef<View>(null)
  const gesture = useRef<{ n: number; d0: number; mx: number; my: number; z0: number; cx0: number; cy0: number } | null>(null)
  const clampCam = (z: number, cx: number, cy: number) => {
    const zz = Math.min(5, Math.max(0.6, z))
    const hw = base.w / zz / 2
    const hh = base.h / zz / 2
    const fit = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
    return { z: zz, cx: fit(cx, WORLD.x0 + hw, WORLD.x1 - hw), cy: fit(cy, WORLD.y0 + hh, WORLD.y1 - hh), key: frameKey }
  }
  const pinch = (e: GestureResponderEvent) => {
    const ts = e.nativeEvent.touches
    const mx = ts.reduce((a, t) => a + t.pageX, 0) / ts.length - origin.current.x
    const my = ts.reduce((a, t) => a + t.pageY, 0) / ts.length - origin.current.y
    const d = ts.length > 1 ? Math.hypot(ts[0].pageX - ts[1].pageX, ts[0].pageY - ts[1].pageY) : 0
    return { n: ts.length, mx, my, d }
  }
  const startGesture = (e: GestureResponderEvent) => {
    const p = pinch(e)
    const cc = camRef.current
    gesture.current = { n: p.n, d0: p.d, mx: p.mx, my: p.my, z0: cc.z, cx0: cc.cx, cy0: cc.cy }
  }
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (e, gs) => e.nativeEvent.touches.length > 1 || Math.abs(gs.dx) + Math.abs(gs.dy) > 6,
        onPanResponderGrant: startGesture,
        onPanResponderMove: (e) => {
          const g = gesture.current
          const p = pinch(e)
          if (!g || p.n !== g.n) return startGesture(e)
          // Map units per screen point, before and after the zoom.
          const u0 = base.w / g.z0 / box.w
          const z = g.n > 1 && g.d0 > 0 ? g.z0 * (p.d / g.d0) : g.z0
          const u1 = base.w / Math.min(5, Math.max(0.6, z)) / box.w
          // Keep the map point under the fingers' midpoint under it.
          const px = g.cx0 + (g.mx - box.w / 2) * u0
          const py = g.cy0 + (g.my - box.h / 2) * u0
          setCam(clampCam(z, px - (p.mx - box.w / 2) * u1, py - (p.my - box.h / 2) * u1))
        },
        onPanResponderRelease: () => (gesture.current = null),
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base.w, base.h, box.w, box.h, frameKey],
  )
  // Sizes in map units that stay the same on screen whatever the zoom.
  const k = view.w / 1000
  const moved = c.z !== 1 || Math.abs(c.cx - base.cx) > 1 || Math.abs(c.cy - base.cy) > 1
  const seen = (x: number, y: number, pad = 60) => x > view.x - pad && x < view.x + view.w + pad && y > view.y - pad && y < view.y + view.h + pad
  const home = getPort(homeOf(game))
  const atSea = game.player.ownedBoats.filter((x) => x.state === 'sailing' || x.state === 'returning')
  const weatherOf = (portId: string): Weather | null => {
    const r = game.routes.find((x) => x.portB === portId)
    return r ? routeWeather(game, r.id, now) : null
  }

  const night = light.stars > 0
  const landColor = (cl: Climate) => mix(LAND[cl], light.silhouette, light.dim * 0.55)
  const shallow = mix(light.sea, '#ffffff', night ? 0.08 : 0.22)
  const coastLine = mix('#3a2a24', light.silhouette, light.dim * 0.4)

  return (
    <View
      ref={viewRef}
      style={{ width: box.w, height: box.h }}
      onLayout={() => viewRef.current?.measureInWindow((x, y) => (origin.current = { x, y }))}
      {...responder.panHandlers}
    >
    <Svg width={box.w} height={box.h} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}>
      <Defs>
        <ClipPath id="mainland">
          <Path d={MAINLAND_D} />
        </ClipPath>
      </Defs>
      <Rect x={WORLD.x0 - 2000} y={WORLD.y0 - 2000} width={WORLD.x1 - WORLD.x0 + 4000} height={WORLD.y1 - WORLD.y0 + 4000} fill={light.sea} />
      {/* Swell lines on the open sea */}
      {Array.from({ length: 9 }, (_, i) => WORLD.y0 + 120 + i * 300).map((y) => (
        <Path
          key={y}
          d={`M${WORLD.x0 - 400} ${y} ${Array.from({ length: 40 }, () => 'q 60 -14 120 0').join(' ')}`}
          stroke={light.seaLine}
          strokeWidth={3}
          fill="none"
          opacity={0.22}
        />
      ))}

      {/* Shallows: pale water hugging every shore */}
      {COAST.map((l) => (
        <G key={`sh-${l.id}`}>
          <Path d={l.d} fill="none" stroke={shallow} strokeWidth={64} opacity={0.35} strokeLinejoin="round" />
          <Path d={l.d} fill="none" stroke={shallow} strokeWidth={30} opacity={0.5} strokeLinejoin="round" />
        </G>
      ))}

      {/* The land, in its climates' colours: the mainland clipped zone by zone */}
      {COAST.map((l) => (
        <Path key={l.id} d={l.d} fill={landColor(l.climate === 'by-zone' ? 'temperate' : l.climate)} />
      ))}
      {/* The mainland's other climates, their borders wandering, clipped to its shore */}
      <G clipPath="url(#mainland)">
        {ZONES_D.map((z) => (
          <G key={z.climate}>
            <Path d={z.d} fill="none" stroke={landColor(z.climate)} strokeWidth={60} opacity={0.35} />
            <Path d={z.d} fill={landColor(z.climate)} />
          </G>
        ))}
      </G>
      {/* Rivers winding down to the sea */}
      {RIVERS_D.map((d, i) => (
        <G key={`r${i}`}>
          <Path d={d} fill="none" stroke={shallow} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          <Path d={d} fill="none" stroke={light.sea} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      ))}
      {/* A sandy beach line, then the coast's ink */}
      {COAST.map((l) => (
        <G key={`cl-${l.id}`}>
          <Path d={l.d} fill="none" stroke={mix('#e8d4a0', light.silhouette, light.dim * 0.5)} strokeWidth={7} opacity={0.75} />
          <Path d={l.d} fill="none" stroke={coastLine} strokeWidth={2.4} opacity={0.85} />
        </G>
      ))}

      {/* What grows or lies on the land you know */}
      {DECOR.filter((d) => openRegions.has(d.region) && seen(d.x, d.y)).map((d, i) => (
        <Icon key={i} d={d} light={light} />
      ))}

      {/* Region names written across the land */}
      {REGIONS.filter((r) => openRegions.has(r.id)).map((r) => {
        const at = REGION_LABEL[r.id]
        return (
          <SvgText
            key={r.id}
            x={at.x}
            y={at.y}
            textAnchor="middle"
            fontSize={Math.max(44, 30 * k)}
            fontFamily={fonts.titleItalic}
            letterSpacing={6}
            fill={night ? '#f3e7d8' : '#2b1f2c'}
            opacity={0.45}
          >
            {r.name.toUpperCase()}
          </SvgText>
        )
      })}

      {/* Routes from home, coloured by their weather now */}
      {game.routes.map((r) => {
        const a = getPort(r.portA)
        const p = getPort(r.portB)
        const wx = routeWeather(game, r.id, now)
        const color = wx === 'calm' ? light.lamp : t[wx]
        return (
          <Line
            key={r.id}
            x1={a.x}
            y1={a.y}
            x2={p.x}
            y2={p.y}
            stroke={color}
            strokeWidth={(wx === 'storm' ? 10 : wx === 'rough' ? 8 : 5) * k}
            strokeDasharray={`${14 * k} ${12 * k}`}
            opacity={wx === 'calm' ? 0.6 : 0.95}
          />
        )
      })}

      {/* Cloud over every region not yet charted */}
      {REGIONS.filter((r) => !openRegions.has(r.id)).map((r) => (
        <CloudCover key={r.id} region={r.id} light={light} />
      ))}

      {/* The next region, under fog, with its chart filling */}
      {next && (
        <G transform={`translate(${view.x + view.w / 2} ${view.y + view.h - 62 * k}) scale(${k})`}>
          <Rect x={-300} y={-38} width={600} height={76} rx={18} fill={LABEL_BG} opacity={0.88} />
          <SvgText x={-280} y={-8} fontSize={26} fontFamily={fonts.title} fill="#f3e7d8">
            {`Charting ${next.name}`}
          </SvgText>
          <SvgText x={280} y={-8} textAnchor="end" fontSize={20} fontFamily={fonts.semibold} fill={light.lamp}>
            {`${next.points}/${next.needed}`}
          </SvgText>
          <Rect x={-280} y={4} width={560} height={10} rx={5} fill="#4d3a4a" />
          <Rect x={-280} y={4} width={560 * Math.min(1, next.points / next.needed)} height={10} rx={5} fill={light.lamp} />
          <SvgText x={-280} y={32} fontSize={17} fontFamily={fonts.medium} fill="#c9b6ae">
            {`Sail to ${next.from.map((id) => getPort(id).name).join(', ')} · storms chart fastest`}
          </SvgText>
        </G>
      )}
      {next && <ChartLines ports={fogPorts} from={next.from} k={k} light={light} />}

      {/* Open ports: tap to visit */}
      {open.map((p) => {
        const isHome = p.id === home.id
        const wx = weatherOf(p.id)
        const st = REGION_STYLE[p.region]
        const n = p.size === 'city' ? 4 : p.size === 'town' ? 2 : 1
        return (
          <G key={p.id} transform={`translate(${p.x} ${p.y}) scale(${k})`} onPress={() => onOpenPort(p.id)}>
            <Circle r={60} fill="#000000" opacity={0.001} />
            <Circle r={isHome ? 62 : 40} fill={light.lamp} opacity={0.14} />
            {Array.from({ length: n }, (_, i) => {
              const x = -12 * n + i * 24
              const h = 18 + ((i * 7 + p.x) % 3) * 6
              return (
                <G key={i}>
                  <Rect x={x} y={-h + 6} width={20} height={h} fill={st.walls[i % st.walls.length]} />
                  <Path d={`M${x - 3} ${-h + 6} L ${x + 10} ${-h - 6} L ${x + 23} ${-h + 6} Z`} fill={st.roofs[i % st.roofs.length]} />
                  <Rect x={x + 6} y={-h + 12} width={7} height={7} fill={light.lamp} />
                </G>
              )
            })}
            {isHome && (
              <G>
                <Rect x={34} y={-52} width={12} height={58} fill="#f3e7d8" />
                <Rect x={34} y={-40} width={12} height={8} fill="#c2452a" />
                <Rect x={32} y={-62} width={16} height={10} fill={light.lamp} />
              </G>
            )}
            {wx && !isHome && (
              <G transform="translate(0 -62)">
                <Rect x={-46} y={-16} width={92} height={30} rx={8} fill={t[wx]} />
                <SvgText y={6} textAnchor="middle" fontSize={20} fontFamily={fonts.bold} fill="#fff">
                  {WEATHER[wx].name}
                </SvgText>
              </G>
            )}
            <Rect x={-86} y={18} width={172} height={34} rx={17} fill={LABEL_BG} opacity={0.78} />
            <SvgText y={42} textAnchor="middle" fontSize={22} fontFamily={fonts.semibold} fill="#f3e7d8">
              {p.name}
            </SvgText>
          </G>
        )
      })}

      {/* Sunk boats and boats at sea */}
      {game.player.ownedBoats
        .filter((x) => x.state === 'sunk' && x.currentRoute)
        .map((boat) => {
          const route = game.routes.find((r) => r.id === boat.currentRoute)
          if (!route) return null
          const a = getPort(route.portA)
          const p = getPort(route.portB)
          return (
            <G key={boat.id} transform={`translate(${(a.x + p.x) / 2} ${(a.y + p.y) / 2}) scale(${k})`}>
              <Path d="M-14 -14 L14 14 M14 -14 L-14 14" stroke={t.bad} strokeWidth={7} strokeLinecap="round" />
            </G>
          )
        })}
      {atSea.map((boat, i) => {
        const v = getVoyage(game, boat.id)
        const route = v && game.routes.find((r) => r.id === v.routeId)
        if (!v || !route) return null
        const a = getPort(route.portA)
        const p = getPort(route.portB)
        const half = v.durationMs / 2
        const elapsed = Math.min(Math.max(now - v.startedAt, 0), v.durationMs)
        const f = elapsed <= half ? elapsed / half : 2 - elapsed / half
        const len = Math.hypot(p.x - a.x, p.y - a.y) || 1
        const off = ((i % 3) - 1) * 20 * k
        const x = a.x + (p.x - a.x) * f + (-(p.y - a.y) / len) * off
        const y = a.y + (p.y - a.y) * f + ((p.x - a.x) / len) * off
        const w2 = 26 + getBoatClass(boat.classId).sizeTier * 4
        return (
          <G key={boat.id} transform={`translate(${x} ${y}) scale(${k})`}>
            <Path d={`M${-w2} 0 L ${w2} 0 L ${w2 - 6} 12 L ${-w2 + 8} 12 Z`} fill={light.hull} />
            <Rect x={w2 * 0.2} y={-12} width={w2 * 0.5} height={12} fill={light.cabin} />
            <SvgText y={-20} textAnchor="middle" fontSize={20} fontFamily={fonts.semibold} fill={LABEL_BG} stroke={LABEL_BG} strokeWidth={6}>
              {boat.nickname}
            </SvgText>
            <SvgText y={-20} textAnchor="middle" fontSize={20} fontFamily={fonts.semibold} fill="#f3e7d8">
              {boat.nickname}
            </SvgText>
          </G>
        )
      })}

      <SvgText x={view.x + view.w - 28 * k} y={view.y + 50 * k} textAnchor="end" fontSize={28 * k} fontFamily={fonts.semibold} fill={light.stars ? '#e9dccd' : '#2b1f2c'} opacity={0.8}>
        {`Weather turns in ${duration(weatherChangesAt(now) - now)}`}
      </SvgText>
    </Svg>
      {moved && (
        <Pressable
          onPress={() => setCam({ z: 1, cx: base.cx, cy: base.cy, key: frameKey })}
          accessibilityRole="button"
          accessibilityLabel="Show the whole chart"
          style={{ position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(29,20,32,0.82)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 }}
        >
          <Text style={{ color: '#f3e7d8', fontFamily: fonts.semibold, fontSize: 13 }}>⤢ Whole chart</Text>
        </Pressable>
      )}
    </View>
  )
}

/** Dotted courses from the ports that chart the next region, toward its middle. */
function ChartLines({ ports, from, k, light }: { ports: Port[]; from: string[]; k: number; light: ReturnType<typeof lightAt> }) {
  const cx = ports.reduce((a, p) => a + p.x, 0) / ports.length
  const cy = ports.reduce((a, p) => a + p.y, 0) / ports.length
  const fogColor = light.stars ? '#5a4a66' : '#e8e2ea'
  return (
    <G>
      {from.map((id) => {
        const f = getPort(id)
        return <Line key={id} x1={f.x} y1={f.y} x2={cx} y2={cy} stroke={fogColor} strokeWidth={4 * k} strokeDasharray={`${4 * k} ${14 * k}`} opacity={0.8} />
      })}
    </G>
  )
}

/** Thick cloud over a region you haven't charted: its ports, its coast, all of it. */
function CloudCover({ region, light }: { region: string; light: ReturnType<typeof lightAt> }) {
  const ports = PORTS.filter((p) => p.region === region)
  const xs = ports.map((p) => p.x)
  const ys = ports.map((p) => p.y)
  const x0 = Math.min(...xs) - 260
  const x1 = Math.max(...xs) + 260
  const y0 = Math.min(...ys) - 260
  const y1 = Math.max(...ys) + 260
  const night = light.stars > 0
  const base = night ? '#3a2e46' : '#dcd6e0'
  const puff = night ? '#4a3c58' : '#f2eef4'
  const step = 120
  const puffs: { x: number; y: number; r: number; tone: boolean }[] = []
  let i = 0
  for (let y = y0; y <= y1; y += step * 0.75) {
    for (let x = x0 + ((i++ % 2) * step) / 2; x <= x1; x += step) puffs.push({ x, y, r: step * (0.75 + ((x * 7 + y * 3) % 40) / 100), tone: (x + y) % 3 === 0 })
  }
  return (
    <G>
      <Rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={step} fill={base} opacity={0.92} />
      {puffs.map((p, j) => (
        <Circle key={j} cx={p.x} cy={p.y} r={p.r} fill={p.tone ? base : puff} opacity={0.9} />
      ))}
      {puffs
        .filter((_, j) => j % 3 === 0)
        .map((p, j) => (
          <Circle key={`s${j}`} cx={p.x + p.r * 0.3} cy={p.y + p.r * 0.35} r={p.r * 0.55} fill={shade(base, 0.08)} opacity={0.35} />
        ))}
    </G>
  )
}
