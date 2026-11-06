// The sea chart, lit by the player's own time of day: a mainland coast and islands
// (map/geography.ts), each climate's land with its trees, pines, palms, peaks or dunes, the
// shallows pale along every shore, and cloud over the regions you haven't charted. Pinch to
// zoom and drag to pan; a tap on a port opens it. Routes run from home, coloured by their weather.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, Pressable, Text, View, type GestureResponderEvent } from 'react-native'
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import type { GameState, Port, Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { getVoyage } from '../../../src/game/state'
import { routeWeather, weatherChangesAt } from '../../../src/game/weather'
import { chartingNext, homeOf, openPorts } from '../../../src/game/regions'
import { PORTS } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import { duration } from '../../../src/format'
import { fonts, useTheme } from '../theme'
import { lightAt } from '../art/light'
import { REGION_STYLE } from '../art/regionStyle'
import { LAND as LAND_PIECES } from '../map/geography'
import { ChartBase } from '../map/ChartBase'

const LABEL_BG = '#1d1420'
const PAD = 170

function bounds(ports: Port[]) {
  const xs = ports.map((p) => p.x)
  const ys = ports.map((p) => p.y)
  return { x0: Math.min(...xs) - PAD, y0: Math.min(...ys) - PAD, x1: Math.max(...xs) + PAD, y1: Math.max(...ys) + PAD }
}

/** All the land with sea round it: the furthest the chart can be panned or zoomed out. */
const WORLD = (() => {
  const pts = LAND_PIECES.flatMap((l) => l.pts)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs) - 300, y0: Math.min(...ys) - 300, x1: Math.max(...xs) + 300, y1: Math.max(...ys) + 300 }
})()


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
  const wide = { x: view.x - view.w, y: view.y - view.h, w: view.w * 3, h: view.h * 3 }
  const camRef = useRef(c)
  camRef.current = c
  const origin = useRef({ x: 0, y: 0 })
  const viewRef = useRef<View>(null)
  const pending = useRef<{ z: number; cx: number; cy: number; key: string } | null>(null)
  const anim = useRef({ k: new Animated.Value(1), x: new Animated.Value(0), y: new Animated.Value(0) }).current
  // Once the chart has redrawn at the new camera, drop the picture's stand-in transform.
  useLayoutEffect(() => {
    anim.k.setValue(1)
    anim.x.setValue(0)
    anim.y.setValue(0)
  }, [cam, anim])
  const gesture = useRef<{ n: number; d0: number; mx: number; my: number; z0: number; cx0: number; cy0: number } | null>(null)
  // Zoomed all the way out, the whole world fits.
  const zMin = Math.max(0.12, Math.min(base.w / (WORLD.x1 - WORLD.x0), base.h / (WORLD.y1 - WORLD.y0)))
  const zClamp = (z: number) => Math.min(5, Math.max(zMin, z))
  const clampCam = (z: number, cx: number, cy: number) => {
    const zz = zClamp(z)
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
          const u1 = base.w / zClamp(z) / box.w
          // Keep the map point under the fingers' midpoint under it.
          const px = g.cx0 + (g.mx - box.w / 2) * u0
          const py = g.cy0 + (g.my - box.h / 2) * u0
          const to = clampCam(z, px - (p.mx - box.w / 2) * u1, py - (p.my - box.h / 2) * u1)
          pending.current = to
          // While the fingers move, the drawing slides and scales as a picture; it's redrawn
          // properly once, when they lift.
          const from = camRef.current
          const sc = box.w / base.w
          anim.k.setValue(to.z / from.z)
          anim.x.setValue((from.cx - to.cx) * to.z * sc)
          anim.y.setValue((from.cy - to.cy) * to.z * sc)
        },
        onPanResponderRelease: () => {
          gesture.current = null
          if (pending.current) setCam(pending.current)
          pending.current = null
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base.w, base.h, box.w, box.h, frameKey],
  )
  // Sizes in map units that stay the same on screen whatever the zoom.
  const k = view.w / 1000
  // Zoomed far out, ports are just their markers: names and weather would only pile up.
  const far = view.w > base.w * 1.6
  const moved = c.z !== 1 || Math.abs(c.cx - base.cx) > 1 || Math.abs(c.cy - base.cy) > 1
  const home = getPort(homeOf(game))
  const atSea = game.player.ownedBoats.filter((x) => x.state === 'sailing' || x.state === 'returning')
  const weatherOf = (portId: string): Weather | null => {
    const r = game.routes.find((x) => x.portB === portId)
    return r ? routeWeather(game, r.id, now) : null
  }

  // The waters you know: round every port you've charted, and along the lanes from home.
  const clear = useMemo(() => {
    const out: { x: number; y: number; r: number }[] = []
    for (const p of open) {
      out.push({ x: p.x, y: p.y, r: p.region === 'bay' ? 520 : 400 })
      const len = Math.hypot(p.x - home.x, p.y - home.y)
      for (let d = 160; d < len; d += 160) out.push({ x: home.x + ((p.x - home.x) * d) / len, y: home.y + ((p.y - home.y) * d) / len, r: 230 })
    }
    return out
  }, [open, home.x, home.y])


  return (
    <View
      ref={viewRef}
      style={{ width: box.w, height: box.h }}
      onLayout={() => viewRef.current?.measureInWindow((x, y) => (origin.current = { x, y }))}
      {...responder.panHandlers}
    >
    <View style={{ width: box.w, height: box.h, overflow: 'hidden' }}>
    {/* Drawn a screen wider on every side than you see, so a drag or pinch, which slides and
        scales this as a picture until the fingers lift, never shows an empty edge. */}
    <Animated.View style={{ position: 'absolute', left: -box.w, top: -box.h, width: box.w * 3, height: box.h * 3, transform: [{ translateX: anim.x }, { translateY: anim.y }, { scale: anim.k }] }}>
    <ChartBase width={box.w * 3} height={box.h * 3} view={wide} light={light} openRegions={openRegions} clear={clear} />
    <Svg width={box.w * 3} height={box.h * 3} viewBox={`${wide.x} ${wide.y} ${wide.w} ${wide.h}`} style={{ position: 'absolute', left: 0, top: 0 }}>
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
            {wx && !isHome && !far && (
              <G transform="translate(0 -62)">
                <Rect x={-46} y={-16} width={92} height={30} rx={8} fill={t[wx]} />
                <SvgText y={6} textAnchor="middle" fontSize={20} fontFamily={fonts.bold} fill="#fff">
                  {WEATHER[wx].name}
                </SvgText>
              </G>
            )}
            {(!far || isHome) && (
              <>
                <Rect x={-86} y={18} width={172} height={34} rx={17} fill={LABEL_BG} opacity={0.78} />
                <SvgText y={42} textAnchor="middle" fontSize={22} fontFamily={fonts.semibold} fill="#f3e7d8">
                  {p.name}
                </SvgText>
              </>
            )}
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

    </Svg>
    </Animated.View>
    </View>
      <Text pointerEvents="none" style={{ position: 'absolute', right: 14, top: 12, color: light.stars ? '#e9dccd' : '#2b1f2c', opacity: 0.8, fontFamily: fonts.semibold, fontSize: 13 }}>
        {`Weather turns in ${duration(weatherChangesAt(now) - now)}`}
      </Text>
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
