// The harbour map, drawn with react-native-svg from the same data as the web map.

import { useWindowDimensions } from 'react-native'
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import type { GameState, Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { getVoyage } from '../../../src/game/state'
import { forecast, routeWeather, weatherChangesAt } from '../../../src/game/weather'
import { upgradeValue } from '../../../src/game/upgrades'
import { HOME_PORT_ID, MAP_HEIGHT, MAP_WIDTH, PORTS } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import { TIER_COLORS } from '../../../src/colors'
import { duration } from '../../../src/format'
import { useTheme, type Theme } from '../theme'

const CHIP_OFFSET: Record<string, [number, number]> = { brindle: [110, -20] }
const DEFAULT_OFFSET: [number, number] = [0, -75]
const FORECAST_MARK: Record<Weather, string> = { calm: '—', choppy: '~', rough: '≈', storm: '!' }

const demandColor = (t: Theme, d: number) => (d >= 1.15 ? t.good : d < 0.85 ? t.bad : t.border)

export function HarborMap({ game, now }: { game: GameState; now: number }) {
  const t = useTheme()
  const { width } = useWindowDimensions()
  const w = Math.min(width - 24, 720)
  const radar = upgradeValue(game, 'weather-radar')
  const home = getPort(HOME_PORT_ID)
  const atSea = game.player.ownedBoats.filter((b) => b.state === 'sailing' || b.state === 'returning')

  return (
    <Svg width={w} height={(w * MAP_HEIGHT) / MAP_WIDTH} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
      <Rect width={MAP_WIDTH} height={MAP_HEIGHT} rx={24} fill={t.sea} />
      <SvgText x={MAP_WIDTH - 24} y={48} textAnchor="end" fontSize={30} fontWeight="600" fill={t.muted}>
        {`Weather turns in ${duration(weatherChangesAt(now) - now)}`}
      </SvgText>

      {game.routes.map((r) => {
        const a = getPort(r.portA)
        const b = getPort(r.portB)
        const wx = routeWeather(game, r.id, now)
        const color = wx === 'calm' ? t.route : t[wx]
        return (
          <Line
            key={r.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={color}
            strokeWidth={wx === 'storm' ? 10 : wx === 'rough' ? 8 : 6}
            strokeDasharray={wx === 'storm' ? '6 8' : '14 10'}
          />
        )
      })}

      {game.routes.map((r) => {
        const b = getPort(r.portB)
        const [dx, dy] = CHIP_OFFSET[b.id] ?? DEFAULT_OFFSET
        const wx = routeWeather(game, r.id, now)
        return (
          <G key={r.id} transform={`translate(${b.x + dx} ${b.y + dy})`}>
            {forecast(game, r.id, now, radar).map((f, i) => (
              <G key={i} transform={`translate(${-58 + i * 34} -120)`}>
                <Rect width={28} height={28} rx={6} fill={t[f]} />
                <SvgText x={14} y={21} textAnchor="middle" fontSize={20} fontWeight="800" fill="#fff">
                  {FORECAST_MARK[f]}
                </SvgText>
              </G>
            ))}
            <Rect x={-58} y={-86} width={116} height={40} rx={8} fill={t[wx]} />
            <SvgText x={0} y={-58} textAnchor="middle" fontSize={24} fontWeight="800" fill="#fff">
              {WEATHER[wx].name}
            </SvgText>
            {(
              [
                ['C', r.demandCargo, -42],
                ['P', r.demandPassenger, 2],
              ] as const
            ).map(([label, d, y]) => (
              <G key={label}>
                <Rect x={-58} y={y} width={116} height={40} rx={8} fill={t.surface} stroke={demandColor(t, d)} strokeWidth={4} />
                <SvgText x={-48} y={y + 29} fontSize={24} fontWeight="700" fill={t.text}>
                  {`${label} ×${d.toFixed(2)}`}
                </SvgText>
              </G>
            ))}
          </G>
        )
      })}

      {PORTS.map((p) => {
        const isHome = p.id === home.id
        const size = isHome ? 52 : 36
        return (
          <G key={p.id} transform={`translate(${p.x} ${p.y})`}>
            <Rect x={-size / 2} y={-size / 2} width={size} height={size} fill={isHome ? t.home : t.port} stroke={t.portStroke} strokeWidth={4} />
            <SvgText y={isHome ? 58 : 48} textAnchor="middle" fontSize={28} fontWeight="600" fill={t.text}>
              {p.name}
            </SvgText>
          </G>
        )
      })}

      {game.player.ownedBoats
        .filter((b) => b.state === 'sunk' && b.currentRoute)
        .map((boat) => {
          const route = game.routes.find((r) => r.id === boat.currentRoute)!
          const a = getPort(route.portA)
          const b = getPort(route.portB)
          return (
            <G key={boat.id} transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`}>
              <Path d="M-14 -14 L14 14 M14 -14 L-14 14" stroke={t.bad} strokeWidth={7} strokeLinecap="round" />
            </G>
          )
        })}

      {atSea.map((boat, i) => {
        const v = getVoyage(game, boat.id)
        if (!v) return null
        const route = game.routes.find((r) => r.id === v.routeId)!
        const a = getPort(route.portA)
        const b = getPort(route.portB)
        const half = v.durationMs / 2
        const elapsed = Math.min(Math.max(now - v.startedAt, 0), v.durationMs)
        const f = elapsed <= half ? elapsed / half : 2 - elapsed / half
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
        const off = ((i % 3) - 1) * 18
        const x = a.x + (b.x - a.x) * f + (-(b.y - a.y) / len) * off
        const y = a.y + (b.y - a.y) * f + ((b.x - a.x) / len) * off
        const tier = getBoatClass(boat.classId).sizeTier
        return (
          <G key={boat.id} transform={`translate(${x} ${y})`}>
            <Rect x={-14 - tier * 2} y={-10} width={28 + tier * 4} height={20} rx={4} fill={TIER_COLORS[tier]} stroke={t.portStroke} strokeWidth={2} />
            <SvgText y={-18} textAnchor="middle" fontSize={22} fill={t.text}>
              {boat.nickname}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}
