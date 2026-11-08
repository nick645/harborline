// The sea chart, lit by the player's own time of day: a mainland coast and islands
// (map/geography.ts), each climate's land, the shallows along every shore, and cloud over the
// regions you haven't charted. Pinch to zoom and drag to pan.
//
// Fast because it's mostly still: the land and cloud are drawn once into pictures (ChartBase's
// chartSnapshot) and only moved and scaled while you pan, on the GPU, with no React work. Over
// them, routes coloured by their weather, the ports, and your boats sailing their lanes in real
// time. Tap a port for its card (weather, market day, your boats; Visit or Send); tap a boat to
// open her. A newly charted region rolls its cloud back with a flourish.

import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Platform, Pressable, Text, View, type GestureResponderEvent } from 'react-native'
import { Canvas, Circle, Group, Image as SkImageView, Path, Rect, RoundedRect, Skia, Text as SkText, DashPathEffect, matchFont, vec, RadialGradient } from '@shopify/react-native-skia'
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Boat, GameState, Port, Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { getVoyage } from '../../../src/game/state'
import { routeWeather, weatherChangesAt } from '../../../src/game/weather'
import { chartingNext, homeOf, openPorts } from '../../../src/game/regions'
import { marketDay, nextMarketDay } from '../../../src/game/portLife'
import { PORT_LIFE } from '../../../src/game/data/portLife'
import { PORTS, REGIONS, type RegionId } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import { duration } from '../../../src/format'
import { fonts, useTheme } from '../theme'
import { lightAt, type Light } from '../art/light'
import { REGION_STYLE } from '../art/regionStyle'
import { useSceneClock } from '../art/clock'
import { Sparkles } from '../art/Sparkles'
import { type Clearing } from '../map/ChartBase'
import { CHART_SEEN_KEY, WORLD, chartKey, chartSnapshot, type ChartImage } from '../map/snapshot'
import { play } from '../sound/sound'

const LABEL_BG = '#1d1420'
const PAD = 190
const REVEAL_MS = 2600

const labelFont = matchFont({ fontFamily: Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }), fontSize: 12, fontWeight: '600' })
const chipFont = matchFont({ fontFamily: Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }), fontSize: 10, fontWeight: '700' })

function bounds(ports: Port[]) {
  const xs = ports.map((p) => p.x)
  const ys = ports.map((p) => p.y)
  return { x0: Math.min(...xs) - PAD, y0: Math.min(...ys) - PAD, x1: Math.max(...xs) + PAD, y1: Math.max(...ys) + PAD }
}

/** The waters you know, given the ports charted and home: round each port, and along the lanes. */
function clearingsFor(open: Port[], home: Port): Clearing[] {
  const out: Clearing[] = []
  for (const p of open) {
    out.push({ x: p.x, y: p.y, r: p.region === 'bay' ? 520 : 400 })
    const len = Math.hypot(p.x - home.x, p.y - home.y)
    for (let d = 160; d < len; d += 160) out.push({ x: home.x + ((p.x - home.x) * d) / len, y: home.y + ((p.y - home.y) * d) / len, r: 230 })
  }
  return out
}

type Snap = Awaited<ReturnType<typeof chartSnapshot>>

/** The chart's pictures for this light and these waters, as they become ready. */
function useSnapshot(light: Light, regions: Set<RegionId>, clear: Clearing[]) {
  const key = chartKey(light, clear)
  const [snap, setSnap] = useState<{ key: string; snap: Snap } | null>(null)
  useEffect(() => {
    let live = true
    void chartSnapshot(light, regions, clear).then((s) => live && setSnap({ key, snap: s }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return snap?.snap ?? null
}

export function HarborMap({
  game,
  now,
  onOpenPort,
  onOpenBoat,
  box,
}: {
  game: GameState
  now: number
  onOpenPort: (portId: string, page?: 'menu' | 'send') => void
  onOpenBoat: (boatId: string) => void
  box: { w: number; h: number }
}) {
  const t = useTheme()
  const light = lightAt(now)
  const clock = useSceneClock()
  const open = openPorts(game)
  const home = getPort(homeOf(game))
  const next = chartingNext(game)
  const fogPorts = next ? PORTS.filter((p) => p.region === next.id) : []
  const openIds = open.map((p) => p.id).join(',')
  const regions = useMemo(() => new Set(open.map((p) => p.region)), [openIds]) // eslint-disable-line react-hooks/exhaustive-deps
  const clear = useMemo(() => clearingsFor(open, home), [openIds, home.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const snap = useSnapshot(light, regions, clear)

  // The charting reveal: the regions you'd last seen, and the cloud as it was then, fading away.
  const [seen, setSeen] = useState<string[] | null>(null)
  useEffect(() => {
    AsyncStorage.getItem(CHART_SEEN_KEY)
      .then((v) => setSeen(v ? (JSON.parse(v) as string[]) : [...regions]))
      .catch(() => setSeen([...regions]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const fresh = seen ? [...regions].filter((r) => !seen.includes(r)) : []
  const before = useMemo(() => new Set(seen?.filter((r) => regions.has(r as RegionId)) as RegionId[] | undefined), [seen, regions])
  const beforeClear = useMemo(() => clearingsFor(open.filter((p) => before.has(p.region)), home), [before, openIds]) // eslint-disable-line react-hooks/exhaustive-deps
  const oldSnap = useSnapshot(light, fresh.length ? before : regions, fresh.length ? beforeClear : clear)
  const veil = useSharedValue(0)
  const [revealing, setRevealing] = useState<RegionId | null>(null)

  // Frame what you know and the next waters you're charting, to the box's own shape.
  const b = bounds([...open, ...fogPorts])
  let vw = b.x1 - b.x0
  let vh = b.y1 - b.y0 + (next ? 120 * ((b.x1 - b.x0) / 1000) : 0)
  const boxAspect = box.w / Math.max(1, box.h)
  if (vw / vh < boxAspect) vw = vh * boxAspect
  else vh = vw / boxAspect
  const base = { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 + (next ? 60 * (vw / 1000) : 0), w: vw, h: vh }
  /** Screen points per map unit at zoom 1. */
  const s0 = box.w / base.w

  // The camera, on the UI thread: centre and zoom. Gestures write it; the chart reads it.
  const cx = useSharedValue(base.cx)
  const cy = useSharedValue(base.cy)
  const z = useSharedValue(1)
  const [moved, setMoved] = useState(false)
  const frameKey = `${openIds}-${next?.id ?? ''}-${box.w}x${box.h}`
  useEffect(() => {
    // A new frame (a new region, a new shape) puts the camera back on it.
    cx.set(base.cx)
    cy.set(base.cy)
    z.set(1)
    setMoved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey])
  const flyTo = (to: { cx: number; cy: number; z: number }, ms = 700) => {
    const ease = { duration: ms, easing: Easing.inOut(Easing.cubic) }
    cx.set(withTiming(to.cx, ease))
    cy.set(withTiming(to.cy, ease))
    z.set(withTiming(to.z, ease))
  }

  // When the snapshots are ready and a region is new, roll its cloud back and fly over to it.
  useEffect(() => {
    if (!seen || !fresh.length || !snap || !oldSnap || revealing) return
    const r = fresh[0] as RegionId
    setRevealing(r)
    veil.set(1)
    const ports = PORTS.filter((p) => p.region === r)
    const fx = ports.reduce((a, p) => a + p.x, 0) / ports.length
    const fy = ports.reduce((a, p) => a + p.y, 0) / ports.length
    flyTo({ cx: fx, cy: fy, z: 1.4 }, 900)
    play('rankup')
    veil.set(withTiming(0, { duration: REVEAL_MS, easing: Easing.inOut(Easing.quad) }))
    // Remembered as it starts, so leaving partway through doesn't replay it.
    const all = [...regions]
    void AsyncStorage.setItem(CHART_SEEN_KEY, JSON.stringify(all)).catch(() => undefined)
    const done = setTimeout(() => {
      setSeen(all)
      flyTo({ cx: base.cx, cy: base.cy, z: 1 }, 900)
    }, REVEAL_MS + 900)
    const off = setTimeout(() => setRevealing(null), REVEAL_MS + 3200)
    return () => {
      clearTimeout(done)
      clearTimeout(off)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, fresh.length, snap, oldSnap])
  // A game where everything charted was already known: just remember it.
  useEffect(() => {
    if (seen && !fresh.length && seen.length !== regions.size) void AsyncStorage.setItem(CHART_SEEN_KEY, JSON.stringify([...regions])).catch(() => undefined)
  }, [seen, fresh.length, regions])

  // Gestures: drag to pan, pinch to zoom, tap to pick. Written straight to the camera.
  const zMin = Math.max(0.12, Math.min(base.w / (WORLD.x1 - WORLD.x0), base.h / (WORLD.y1 - WORLD.y0)))
  const origin = useRef({ x: 0, y: 0 })
  const viewRef = useRef<View>(null)
  const gesture = useRef<{ n: number; d0: number; mx: number; my: number; z0: number; cx0: number; cy0: number; travel: number; at: number } | null>(null)
  const pick = useRef<(x: number, y: number) => void>(() => undefined)
  const pinch = (e: GestureResponderEvent) => {
    const ts = e.nativeEvent.touches.length ? e.nativeEvent.touches : e.nativeEvent.changedTouches
    const mx = ts.reduce((a, q) => a + q.pageX, 0) / ts.length - origin.current.x
    const my = ts.reduce((a, q) => a + q.pageY, 0) / ts.length - origin.current.y
    const d = ts.length > 1 ? Math.hypot(ts[0].pageX - ts[1].pageX, ts[0].pageY - ts[1].pageY) : 0
    return { n: ts.length, mx, my, d }
  }
  const responder = useMemo(() => {
    const clampZ = (v: number) => Math.min(5, Math.max(zMin, v))
    const fit = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
    const start = (e: GestureResponderEvent, travel = 0) => {
      const p = pinch(e)
      gesture.current = { n: p.n, d0: p.d, mx: p.mx, my: p.my, z0: z.get(), cx0: cx.get(), cy0: cy.get(), travel, at: gesture.current?.at ?? Date.now() }
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        gesture.current = null
        start(e)
      },
      onPanResponderMove: (e) => {
        const g = gesture.current
        const p = pinch(e)
        if (!g || p.n !== g.n) return start(e, g?.travel ?? 0)
        g.travel = Math.max(g.travel, Math.hypot(p.mx - g.mx, p.my - g.my), Math.abs(p.d - g.d0))
        if (g.travel < 6) return
        const zz = clampZ(g.n > 1 && g.d0 > 0 ? g.z0 * (p.d / g.d0) : g.z0)
        // Keep the map point under the fingers' midpoint under it.
        const u0 = 1 / (s0 * g.z0)
        const u1 = 1 / (s0 * zz)
        const px = g.cx0 + (g.mx - box.w / 2) * u0
        const py = g.cy0 + (g.my - box.h / 2) * u0
        const hw = base.w / zz / 2
        const hh = base.h / zz / 2
        z.set(zz)
        cx.set(fit(px - (p.mx - box.w / 2) * u1, WORLD.x0 + hw, WORLD.x1 - hw))
        cy.set(fit(py - (p.my - box.h / 2) * u1, WORLD.y0 + hh, WORLD.y1 - hh))
      },
      onPanResponderRelease: (e) => {
        const g = gesture.current
        gesture.current = null
        if (g && g.travel < 6 && Date.now() - g.at < 600) {
          const p = pinch(e)
          pick.current(p.mx, p.my)
        } else setMoved(true)
      },
      onPanResponderTerminationRequest: () => false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s0, base.w, base.h, box.w, box.h, zMin])

  // Map units to the screen, for the hit test (the drawing does the same on the UI thread).
  const toScreen = (x: number, y: number) => {
    const k = s0 * z.get()
    return { x: box.w / 2 + (x - cx.get()) * k, y: box.h / 2 + (y - cy.get()) * k }
  }
  const atSea = game.player.ownedBoats.filter((x) => x.state === 'sailing' || x.state === 'returning')
  const [card, setCard] = useState<string | null>(null)
  pick.current = (x, y) => {
    // A boat first (they sail over ports' waters), then the nearest port within reach.
    for (const boat of atSea) {
      const at = boatAt(game, boat, Date.now())
      if (!at) continue
      const q = toScreen(at.x, at.y)
      if (Math.hypot(q.x - x, q.y - y) < 26) return onOpenBoat(boat.id)
    }
    let best: { id: string; d: number } | null = null
    for (const p of open) {
      const q = toScreen(p.x, p.y)
      const d = Math.hypot(q.x - x, q.y - (y + 6))
      if (d < 36 && (!best || d < best.d)) best = { id: p.id, d }
    }
    setCard(best?.id ?? null)
  }

  const camera = useDerivedValue(() => [{ translateX: box.w / 2 }, { translateY: box.h / 2 }, { scale: s0 * z.get() }, { translateX: -cx.get() }, { translateY: -cy.get() }])
  const oldOpacity = useDerivedValue(() => veil.get())
  // Names when there's room for them: always for a few ports, zoomed in for a crowded chart.
  const dense = open.length > 6
  const labels = useDerivedValue((): number => (z.get() < (dense ? 1.5 : 0.62) ? 0 : 1))
  const weatherOf = (portId: string): Weather | null => {
    const r = game.routes.find((x) => x.portB === portId)
    return r ? routeWeather(game, r.id, now) : null
  }
  const shown = (s: Snap) =>
    s && (
      <>
        <Picture img={s.world} />
        <Picture img={s.detail} />
      </>
    )

  return (
    <View
      ref={viewRef}
      style={{ width: box.w, height: box.h, backgroundColor: light.sea }}
      onLayout={() => viewRef.current?.measureInWindow((x, y) => (origin.current = { x, y }))}
      {...responder.panHandlers}
    >
      <Canvas style={{ width: box.w, height: box.h }}>
        <Group transform={camera}>
          {/* Before a reveal, the chart as you last saw it (so the new waters aren't given away) */}
          {fresh.length && !revealing ? shown(oldSnap) : shown(snap ?? oldSnap)}
          {revealing && oldSnap && snap && <Group opacity={oldOpacity}>{shown(oldSnap)}</Group>}
        </Group>
        {/* Routes from home, coloured by their weather now */}
        {game.routes.map((r) => {
          const a = getPort(r.portA)
          const p = getPort(r.portB)
          const wx = routeWeather(game, r.id, now)
          return <Lane key={r.id} a={a} b={p} color={wx === 'calm' ? light.lamp : t[wx]} width={wx === 'storm' ? 3.4 : wx === 'rough' ? 2.8 : 2} faint={wx === 'calm'} cam={{ cx, cy, z, s0, w: box.w, h: box.h }} />
        })}
        {next && fogPorts.length > 0 && <ChartingLanes from={next.from.map(getPort)} to={fogPorts} night={light.stars > 0} cam={{ cx, cy, z, s0, w: box.w, h: box.h }} />}
        {/* Ports */}
        {open.map((p) => (
          <PortMark key={p.id} port={p} home={p.id === home.id} weather={p.id === home.id ? null : weatherOf(p.id)} light={light} selected={card === p.id} labels={labels} cam={{ cx, cy, z, s0, w: box.w, h: box.h }} colors={t} />
        ))}
        {revealing && <RevealGlow region={revealing} clock={clock} cam={{ cx, cy, z, s0, w: box.w, h: box.h }} />}
        {/* Wrecks, and your boats under way */}
        {game.player.ownedBoats
          .filter((x) => x.state === 'sunk' && x.currentRoute)
          .map((boat) => {
            const route = game.routes.find((r) => r.id === boat.currentRoute)
            if (!route) return null
            const a = getPort(route.portA)
            const p = getPort(route.portB)
            return <Wreck key={boat.id} x={(a.x + p.x) / 2} y={(a.y + p.y) / 2} color={t.bad} cam={{ cx, cy, z, s0, w: box.w, h: box.h }} />
          })}
        {atSea.map((boat, i) => {
          const v = getVoyage(game, boat.id)
          const route = v && game.routes.find((r) => r.id === v.routeId)
          if (!v || !route) return null
          return (
            <BoatMark
              key={boat.id}
              a={getPort(route.portA)}
              b={getPort(route.portB)}
              startedAt={v.startedAt}
              durationMs={v.durationMs}
              lane={i}
              tier={getBoatClass(boat.classId).sizeTier}
              weather={v.weatherAtStart ?? 'calm'}
              light={light}
              sparkle={!!v.deckFind}
              clock={clock}
              cam={{ cx, cy, z, s0, w: box.w, h: box.h }}
            />
          )
        })}
      </Canvas>

      {(fresh.length && !revealing ? !oldSnap : !snap && !oldSnap) && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '45%', alignItems: 'center' }}>
          <Text style={{ color: '#f3e7d8', fontFamily: fonts.semibold, fontSize: 14, opacity: 0.85 }}>Unrolling the chart…</Text>
        </View>
      )}
      <Text pointerEvents="none" style={{ position: 'absolute', right: 14, top: 12, color: light.stars ? '#e9dccd' : '#2b1f2c', opacity: 0.8, fontFamily: fonts.semibold, fontSize: 13 }}>
        {`Weather turns in ${duration(weatherChangesAt(now) - now)}`}
      </Text>
      {moved && (
        <Pressable
          onPress={() => {
            flyTo({ cx: base.cx, cy: base.cy, z: 1 })
            setMoved(false)
          }}
          accessibilityRole="button"
          accessibilityLabel="Show the whole chart"
          style={{ position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(29,20,32,0.82)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 }}
        >
          <Text style={{ color: '#f3e7d8', fontFamily: fonts.semibold, fontSize: 13 }}>⤢ Whole chart</Text>
        </Pressable>
      )}
      {revealing && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: '38%', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(29,20,32,0.88)', borderRadius: 16, borderWidth: 1, borderColor: '#ffd66b', paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: '#ffd66b', fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2 }}>NEW WATERS CHARTED</Text>
            <Text style={{ color: '#f3e7d8', fontFamily: fonts.title, fontSize: 28 }}>{REGIONS.find((r) => r.id === revealing)?.name}</Text>
          </View>
        </View>
      )}
      {card ? (
        <PortCard
          game={game}
          now={now}
          portId={card}
          home={card === home.id}
          weather={card === home.id ? null : weatherOf(card)}
          onClose={() => setCard(null)}
          onVisit={() => onOpenPort(card)}
          onSend={() => onOpenPort(card, 'send')}
          onOpenBoat={onOpenBoat}
        />
      ) : (
        next && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 10, right: 10, bottom: 10, backgroundColor: 'rgba(29,20,32,0.86)', borderRadius: 14, padding: 10, gap: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#f3e7d8', fontFamily: fonts.title, fontSize: 17 }}>Charting {next.name}</Text>
              <Text style={{ color: light.lamp, fontFamily: fonts.semibold, fontSize: 13 }}>
                {next.points}/{next.needed}
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: '#4d3a4a' }}>
              <View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, (next.points / next.needed) * 100)}%`, backgroundColor: light.lamp }} />
            </View>
            <Text style={{ color: '#c9b6ae', fontFamily: fonts.medium, fontSize: 12 }}>
              Sail to {next.from.map((id) => getPort(id).name).join(', ')} · storms chart fastest
            </Text>
          </View>
        )
      )}
    </View>
  )
}

/** Where a boat is on her lane now (map units), out and back. */
function boatAt(game: GameState, boat: Boat, t: number): { x: number; y: number } | null {
  const v = getVoyage(game, boat.id)
  const route = v && game.routes.find((r) => r.id === v.routeId)
  if (!v || !route) return null
  const a = getPort(route.portA)
  const p = getPort(route.portB)
  const half = v.durationMs / 2
  const e = Math.min(Math.max(t - v.startedAt, 0), v.durationMs)
  const f = e <= half ? e / half : 2 - e / half
  return { x: a.x + (p.x - a.x) * f, y: a.y + (p.y - a.y) * f }
}

type Cam = { cx: SharedValue<number>; cy: SharedValue<number>; z: SharedValue<number>; s0: number; w: number; h: number }

/** A map point's place on screen, following the camera. */
function useAt(cam: Cam, x: number, y: number) {
  return useDerivedValue(() => {
    const k = cam.s0 * cam.z.get()
    return [{ translateX: cam.w / 2 + (x - cam.cx.get()) * k }, { translateY: cam.h / 2 + (y - cam.cy.get()) * k }]
  })
}

function Picture({ img }: { img: ChartImage }) {
  return <SkImageView image={img.image} x={img.x} y={img.y} width={img.w} height={img.h} fit="fill" />
}

/** A dashed lane from home, drawn in screen space so it stays the same weight at any zoom. */
function Lane({ a, b, color, width, faint, cam }: { a: Port; b: Port; color: string; width: number; faint: boolean; cam: Cam }) {
  const path = useDerivedValue(() => {
    const k = cam.s0 * cam.z.get()
    const p = Skia.Path.Make()
    p.moveTo(cam.w / 2 + (a.x - cam.cx.get()) * k, cam.h / 2 + (a.y - cam.cy.get()) * k)
    p.lineTo(cam.w / 2 + (b.x - cam.cx.get()) * k, cam.h / 2 + (b.y - cam.cy.get()) * k)
    return p
  })
  return (
    <Path path={path} color={color} style="stroke" strokeWidth={width} strokeCap="round" opacity={faint ? 0.6 : 0.95}>
      <DashPathEffect intervals={[6, 5]} />
    </Path>
  )
}

/** Dotted courses from the ports that chart the next region, into its cloud. */
function ChartingLanes({ from, to, night, cam }: { from: Port[]; to: Port[]; night: boolean; cam: Cam }) {
  const tx = to.reduce((a, p) => a + p.x, 0) / to.length
  const ty = to.reduce((a, p) => a + p.y, 0) / to.length
  const path = useDerivedValue(() => {
    const k = cam.s0 * cam.z.get()
    const p = Skia.Path.Make()
    for (const f of from) {
      p.moveTo(cam.w / 2 + (f.x - cam.cx.get()) * k, cam.h / 2 + (f.y - cam.cy.get()) * k)
      p.lineTo(cam.w / 2 + (tx - cam.cx.get()) * k, cam.h / 2 + (ty - cam.cy.get()) * k)
    }
    return p
  })
  return (
    <Path path={path} color={night ? '#7a6a8a' : '#f2eef4'} style="stroke" strokeWidth={2} strokeCap="round" opacity={0.85}>
      <DashPathEffect intervals={[2, 7]} />
    </Path>
  )
}

/** A port: its little houses in its region's colours, a lamp glow, its name and weather. */
function PortMark({ port, home, weather, light, selected, labels, cam, colors }: { port: Port; home: boolean; weather: Weather | null; light: Light; selected: boolean; labels: SharedValue<number>; cam: Cam; colors: ReturnType<typeof useTheme> }) {
  const at = useAt(cam, port.x, port.y)
  const st = REGION_STYLE[port.region]
  const n = port.size === 'city' ? 3 : port.size === 'town' ? 2 : 1
  const name = port.name
  const nameW = labelFont.measureText(name).width
  const wxName = weather ? WEATHER[weather].name : ''
  const wxW = weather ? chipFont.measureText(wxName).width : 0
  return (
    <Group transform={at}>
      <Circle cx={0} cy={0} r={home ? 22 : 15} color={light.lamp} opacity={selected ? 0.45 : 0.18} />
      {selected && <Circle cx={0} cy={0} r={20} color="#ffd66b" style="stroke" strokeWidth={2} />}
      {Array.from({ length: n }, (_, i) => {
        const x = -5 * n + i * 10
        const h = 7 + ((i * 7 + port.x) % 3) * 2
        return (
          <Group key={i}>
            <Rect x={x} y={-h + 3} width={8} height={h} color={st.walls[i % st.walls.length]} />
            <Path path={`M${x - 1.5} ${-h + 3} L ${x + 4} ${-h - 2} L ${x + 9.5} ${-h + 3} Z`} color={st.roofs[i % st.roofs.length]} />
            <Rect x={x + 2.5} y={-h + 5.5} width={3} height={3} color={light.lamp} />
          </Group>
        )
      })}
      {home && (
        <Group>
          <Rect x={13} y={-20} width={5} height={23} color="#f3e7d8" />
          <Rect x={13} y={-15} width={5} height={3} color="#c2452a" />
          <Rect x={12} y={-24} width={7} height={4} color={light.lamp} />
        </Group>
      )}
      {/* Its weather at a glance, and in words once there's room */}
      {weather && <Circle cx={10} cy={-10} r={4.5} color={colors[weather]} />}
      {weather && <Circle cx={10} cy={-10} r={4.5} color="#1d1420" style="stroke" strokeWidth={1.2} />}
      <Group opacity={home ? 1 : labels}>
        {/* Home's name sits off to the right, clear of the chart's western edge */}
        <RoundedRect x={(home ? 0 : -nameW / 2) - 7} y={7} width={nameW + 14} height={17} r={8.5} color={LABEL_BG} opacity={0.8} />
        <SkText x={home ? 0 : -nameW / 2} y={20} text={name} font={labelFont} color="#f3e7d8" />
        {weather && (
          <Group>
            <RoundedRect x={-wxW / 2 - 5} y={-31} width={wxW + 10} height={14} r={5} color={colors[weather]} />
            <SkText x={-wxW / 2} y={-21} text={wxName} font={chipFont} color="#ffffff" />
          </Group>
        )}
      </Group>
    </Group>
  )
}

/** A boat under way: gliding her lane in real time, rocking with the weather, a wake behind her. */
function BoatMark({ a, b, startedAt, durationMs, lane, tier, weather, light, sparkle, clock, cam }: { a: Port; b: Port; startedAt: number; durationMs: number; lane: number; tier: number; weather: Weather; light: Light; sparkle: boolean; clock: SharedValue<number>; cam: Cam }) {
  const rock = weather === 'storm' ? 0.22 : weather === 'rough' ? 0.14 : weather === 'choppy' ? 0.08 : 0.04
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const off = ((lane % 3) - 1) * 8
  const t = useDerivedValue(() => {
    void clock.get()
    const half = durationMs / 2
    const e = Math.min(Math.max(Date.now() - startedAt, 0), durationMs)
    const f = e <= half ? e / half : 2 - e / half
    const out = e <= half
    const k = cam.s0 * cam.z.get()
    const x = a.x + (b.x - a.x) * f
    const y = a.y + (b.y - a.y) * f
    const sx = cam.w / 2 + (x - cam.cx.get()) * k + (-(b.y - a.y) / len) * off
    const sy = cam.h / 2 + (y - cam.cy.get()) * k + ((b.x - a.x) / len) * off
    const facing = (out ? b.x - a.x : a.x - b.x) >= 0 ? 1 : -1
    return [{ translateX: sx }, { translateY: sy }, { rotate: Math.sin(Date.now() / 520) * rock }, { scaleX: facing }]
  })
  const wake = useDerivedValue(() => 0.35 + 0.25 * Math.sin(Date.now() / 300))
  const w2 = 9 + tier * 1.5
  return (
    <Group transform={t}>
      {sparkle && <Sparkles cx={0} cy={-2} rx={16} ry={12} clock={clock} count={6} />}
      <Path path={`M${-w2 - 4} 3 l -8 -3 M${-w2 - 4} 3 l -8 4`} color="#f3f6fa" style="stroke" strokeWidth={1.4} strokeCap="round" opacity={wake} />
      <Path path={`M${-w2} 0 L ${w2} 0 L ${w2 - 2.5} 5 L ${-w2 + 3} 5 Z`} color={light.hull} />
      <Rect x={-w2 * 0.2} y={-5} width={w2 * 0.6} height={5} color={light.cabin} />
      <Rect x={-1} y={-12} width={1.4} height={8} color="#4a2e22" />
      <Path path="M0.4 -12 L 7 -8 L 0.4 -6 Z" color="#c2452a" />
    </Group>
  )
}

function Wreck({ x, y, color, cam }: { x: number; y: number; color: string; cam: Cam }) {
  const at = useAt(cam, x, y)
  return (
    <Group transform={at}>
      <Path path="M-6 -6 L 6 6 M6 -6 L -6 6" color={color} style="stroke" strokeWidth={3} strokeCap="round" />
    </Group>
  )
}

/** Gold glow and sparkles over a region as its cloud rolls back. */
function RevealGlow({ region, clock, cam }: { region: RegionId; clock: SharedValue<number>; cam: Cam }) {
  const ports = PORTS.filter((p) => p.region === region)
  const x = ports.reduce((a, p) => a + p.x, 0) / ports.length
  const y = ports.reduce((a, p) => a + p.y, 0) / ports.length
  const at = useAt(cam, x, y)
  return (
    <Group transform={at}>
      <Circle cx={0} cy={0} r={90}>
        <RadialGradient c={vec(0, 0)} r={90} colors={['#ffd66b55', '#ffd66b00']} />
      </Circle>
      <Sparkles cx={0} cy={0} rx={80} ry={55} clock={clock} count={14} beaconY={-40} />
    </Group>
  )
}

/** A port's card, slid up from the bottom of the chart when you tap it. */
function PortCard({ game, now, portId, home, weather, onClose, onVisit, onSend, onOpenBoat }: { game: GameState; now: number; portId: string; home: boolean; weather: Weather | null; onClose: () => void; onVisit: () => void; onSend: () => void; onOpenBoat: (id: string) => void }) {
  const t = useTheme()
  const port = getPort(portId)
  const life = PORT_LIFE[portId]
  const region = REGIONS.find((r) => r.id === port.region)
  const market = marketDay(portId, now)
  const heading = game.player.ownedBoats.filter((b) => (b.state === 'sailing' || b.state === 'returning') && game.routes.find((r) => r.id === getVoyage(game, b.id)?.routeId)?.portB === portId)
  const docked = home ? game.player.ownedBoats.filter((b) => b.state === 'idle') : []
  const ready = game.player.ownedBoats.filter((b) => b.state === 'idle' && b.captainId).length
  const boats = [...heading, ...docked]
  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom: 10, backgroundColor: 'rgba(29,20,32,0.94)', borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 12, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#f3e7d8', fontFamily: fonts.title, fontSize: 22 }}>
            {port.name}
            {home ? <Text style={{ color: t.accent, fontFamily: fonts.bold, fontSize: 13 }}>  ⚓ Home</Text> : null}
          </Text>
          <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
            {port.size[0].toUpperCase() + port.size.slice(1)} · {region?.name}
            {life?.lean ? ` · pays more for ${life.lean}` : ''}
          </Text>
        </View>
        {weather && (
          <View style={{ backgroundColor: t[weather], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 12 }}>{WEATHER[weather].name}</Text>
          </View>
        )}
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={{ color: t.muted, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>
      <Text style={{ color: market ? t.good : t.muted, fontFamily: market ? fonts.semibold : fonts.body, fontSize: 13 }}>
        {market ? '✦ Market day: everything pays more today' : `Market day in ${duration(nextMarketDay(portId, now) - now)}`}
      </Text>
      {boats.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {boats.map((b) => (
            <Pressable key={b.id} onPress={() => onOpenBoat(b.id)} style={{ backgroundColor: t.surface2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#f3e7d8', fontFamily: fonts.semibold, fontSize: 12 }}>
                {b.state === 'idle' ? '⚓' : '⛵'} {b.nickname}
                {b.state === 'idle' ? ' · docked' : b.state === 'sailing' ? ' · on her way' : ' · coming home'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
        <Pressable onPress={onVisit} style={({ pressed }) => ({ flex: 1, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 10, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ color: '#2b1f2c', fontFamily: fonts.bold, fontSize: 15 }}>Visit {port.name}</Text>
        </Pressable>
        {!home && (
          <Pressable onPress={onSend} style={({ pressed }) => ({ flex: 1, borderWidth: 1, borderColor: t.accent, borderRadius: 12, paddingVertical: 10, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ color: t.accent, fontFamily: fonts.bold, fontSize: 15 }}>Send a boat{ready ? ` (${ready})` : ''}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
