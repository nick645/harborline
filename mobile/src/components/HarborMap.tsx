// The sea chart, lit by the player's own time of day. It shows the waters you've charted and,
// under fog at the edge, the next region with how far its chart has come. The view widens as
// regions open. Every open port can be tapped; routes run from home, coloured by their weather.

import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import type { GameState, Port, Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { getVoyage } from '../../../src/game/state'
import { routeWeather, weatherChangesAt } from '../../../src/game/weather'
import { chartingNext, homeOf, openPorts } from '../../../src/game/regions'
import { PORTS, REGIONS } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import { duration } from '../../../src/format'
import { fonts, useTheme } from '../theme'
import { lightAt } from '../art/light'
import { REGION_STYLE } from '../art/regionStyle'
import { mix } from '../art/paint'

const LABEL_BG = '#1d1420'
const PAD = 170

function bounds(ports: Port[]) {
  const xs = ports.map((p) => p.x)
  const ys = ports.map((p) => p.y)
  return { x0: Math.min(...xs) - PAD, y0: Math.min(...ys) - PAD, x1: Math.max(...xs) + PAD, y1: Math.max(...ys) + PAD }
}

/** A soft blob of land under a region's ports. */
function landBlob(ports: Port[]): string {
  return ports
    .map((p, i) => {
      const r = 70 + ((p.x * 7 + p.y * 3 + i * 31) % 40)
      return `M${p.x - r} ${p.y + 30} C ${p.x - r} ${p.y - r}, ${p.x + r} ${p.y - r}, ${p.x + r} ${p.y + 30} C ${p.x + r * 0.6} ${p.y + r * 0.8}, ${p.x - r * 0.6} ${p.y + r * 0.8}, ${p.x - r} ${p.y + 30} Z`
    })
    .join(' ')
}

export function HarborMap({ game, now, onOpenPort, box }: { game: GameState; now: number; onOpenPort: (portId: string) => void; box: { w: number; h: number } }) {
  const t = useTheme()
  const light = lightAt(now)
  const open = openPorts(game)
  const next = chartingNext(game)
  const fogPorts = next ? PORTS.filter((p) => p.region === next.id) : []
  // The uncharted region sits at the edge of the chart: drawn part of the way toward you, so
  // the waters you know stay big enough to read.
  const centre = (ps: Port[]) => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length })
  const known = centre(open)
  const fogAt = fogPorts.length ? centre(fogPorts) : null
  // Pull it in only as far as needed to sit just past the farthest port you know in that direction.
  const reach = fogAt ? Math.max(...open.map((p) => ((p.x - known.x) * (fogAt.x - known.x) + (p.y - known.y) * (fogAt.y - known.y)) / Math.hypot(fogAt.x - known.x, fogAt.y - known.y))) : 0
  const fogDist = fogAt ? Math.hypot(fogAt.x - known.x, fogAt.y - known.y) : 1
  const pull = Math.min(1, (reach + 260) / fogDist)
  const fogPull = (p: { x: number; y: number }) => ({ x: known.x + (p.x - known.x) * pull, y: known.y + (p.y - known.y) * pull })
  const fogAnchor = fogAt ? fogPull(fogAt) : null
  const b = bounds(fogAnchor ? [...open, { ...open[0], ...fogAnchor }] : open)
  // Never crop: widen whichever side is short so the chart stays between 0.62 and 1.0 tall.
  let vw = b.x1 - b.x0
  let vh = b.y1 - b.y0
  if (vh > vw) vw = vh
  if (vh < vw * 0.62) vh = vw * 0.62
  if (next) vh += 120 * (vw / 1000)
  const view = { x: (b.x0 + b.x1) / 2 - vw / 2, y: (b.y0 + b.y1) / 2 - vh / 2 + (next ? 60 * (vw / 1000) : 0), w: vw, h: vh }
  // Sizes in map units that stay the same on screen whatever the zoom.
  const k = vw / 1000
  const home = getPort(homeOf(game))
  const atSea = game.player.ownedBoats.filter((x) => x.state === 'sailing' || x.state === 'returning')
  const regions = REGIONS.filter((r) => open.some((p) => p.region === r.id))
  const weatherOf = (portId: string): Weather | null => {
    const r = game.routes.find((x) => x.portB === portId)
    return r ? routeWeather(game, r.id, now) : null
  }

  return (
    <Svg width={Math.min(box.w, (box.h * view.w) / view.h)} height={Math.min(box.h, (box.w * view.h) / view.w)} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}>
      <Rect x={view.x} y={view.y} width={view.w} height={view.h} rx={28 * k} fill={light.sea} />
      {[0.25, 0.55, 0.82].map((f) => (
        <Path
          key={f}
          d={`M${view.x} ${view.y + view.h * f} ${Array.from({ length: 16 }, () => `q ${view.w / 32} ${-12 * k} ${view.w / 16} 0`).join(' ')}`}
          stroke={light.seaLine}
          strokeWidth={3 * k}
          fill="none"
          opacity={0.35}
        />
      ))}

      {/* Land under each open region, in its own colour */}
      {regions.map((r) => (
        <Path key={r.id} d={landBlob(open.filter((p) => p.region === r.id))} fill={mix(REGION_STYLE[r.id].land, light.silhouette, light.dim * 0.5)} opacity={0.55} />
      ))}

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
      {next && fogAnchor && <Fog ports={fogPorts.map((p) => ({ ...p, ...fogPull(p) }))} from={next.from} k={k} light={light} />}

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
  )
}

/** Uncharted waters: fog banks over the region's ports, its name, and the chart's progress. */
function Fog({ ports, from, k, light }: { ports: Port[]; from: string[]; k: number; light: ReturnType<typeof lightAt> }) {
  const cx = ports.reduce((a, p) => a + p.x, 0) / ports.length
  const cy = ports.reduce((a, p) => a + p.y, 0) / ports.length
  const fogColor = light.stars ? '#5a4a66' : '#e8e2ea'
  return (
    <G>
      {/* Dotted lines from the ports that chart it */}
      {from.map((id) => {
        const f = getPort(id)
        return <Line key={id} x1={f.x} y1={f.y} x2={cx} y2={cy} stroke={fogColor} strokeWidth={4 * k} strokeDasharray={`${4 * k} ${14 * k}`} opacity={0.7} />
      })}
      {ports.map((p, i) => (
        <G key={p.id} transform={`translate(${p.x} ${p.y}) scale(${k})`} opacity={0.85}>
          <Circle cx={-40} cy={0} r={60 + (i % 2) * 12} fill={fogColor} opacity={0.75} />
          <Circle cx={30} cy={-16} r={70} fill={fogColor} opacity={0.75} />
          <Circle cx={10} cy={30} r={54} fill={fogColor} opacity={0.8} />
        </G>
      ))}
    </G>
  )
}
