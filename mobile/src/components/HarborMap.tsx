// The harbour map in the Lantern style, lit by the player's own time of day.

import { useWindowDimensions } from 'react-native'
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import type { GameState, Weather } from '../../../src/game/types'
import { getBoatClass, getPort } from '../../../src/game/economy'
import { getVoyage } from '../../../src/game/state'
import { forecast, routeWeather, weatherChangesAt } from '../../../src/game/weather'
import { upgradeValue } from '../../../src/game/upgrades'
import { HOME_PORT_ID, MAP_HEIGHT, MAP_WIDTH, PORTS } from '../../../src/game/data/ports'
import { WEATHER } from '../../../src/game/data/weather'
import { duration } from '../../../src/format'
import { fonts, useTheme } from '../theme'
import { lightAt } from '../art/light'

const CHIP_OFFSET: Record<string, [number, number]> = { brindle: [110, -20] }
const DEFAULT_OFFSET: [number, number] = [0, -75]
const FORECAST_MARK: Record<Weather, string> = { calm: '—', choppy: '~', rough: '≈', storm: '!' }
const LABEL_BG = '#1d1420'

export function HarborMap({ game, now }: { game: GameState; now: number }) {
  const t = useTheme()
  const light = lightAt(now)
  const { width } = useWindowDimensions()
  const w = Math.min(width - 24, 720)
  const radar = upgradeValue(game, 'weather-radar')
  const home = getPort(HOME_PORT_ID)
  const atSea = game.player.ownedBoats.filter((b) => b.state === 'sailing' || b.state === 'returning')
  const demandColor = (d: number) => (d >= 1.15 ? t.good : d < 0.85 ? t.bad : t.border)

  return (
    <Svg width={w} height={(w * MAP_HEIGHT) / MAP_WIDTH} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
      <Rect width={MAP_WIDTH} height={MAP_HEIGHT} rx={28} fill={light.sea} />
      <Path d="M0 120 q 40 -12 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0" stroke={light.seaLine} strokeWidth={3} fill="none" opacity={0.5} />
      <Path d="M0 420 q 40 -12 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0" stroke={light.seaLine} strokeWidth={3} fill="none" opacity={0.4} />
      <Path d="M0 640 C 60 600, 120 650, 200 620 C 260 600, 300 660, 330 700 L 0 700 Z" fill={light.land} />
      <Path d="M760 0 C 740 80, 820 120, 800 180 C 790 230, 900 250, 1000 230 L 1000 0 Z" fill={light.land} />
      <SvgText x={MAP_WIDTH - 28} y={58} textAnchor="end" fontSize={30} fontFamily={fonts.semibold} fill={light.stars ? '#e9dccd' : '#2b1f2c'} opacity={0.8}>
        {`Weather turns in ${duration(weatherChangesAt(now) - now)}`}
      </SvgText>

      {game.routes.map((r) => {
        const a = getPort(r.portA)
        const b = getPort(r.portB)
        const wx = routeWeather(game, r.id, now)
        const color = wx === 'calm' ? light.lamp : t[wx]
        return (
          <Line
            key={r.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={color}
            strokeWidth={wx === 'storm' ? 10 : wx === 'rough' ? 8 : 5}
            strokeDasharray={wx === 'storm' ? '6 8' : '14 12'}
            opacity={wx === 'calm' ? 0.75 : 1}
          />
        )
      })}

      {PORTS.map((p) => {
        const isHome = p.id === home.id
        return (
          <G key={p.id} transform={`translate(${p.x} ${p.y})`}>
            {isHome ? (
              <G>
                <Circle r={70} fill={light.lamp} opacity={0.14} />
                <Rect x={-30} y={-22} width={36} height={30} fill="#6e4733" />
                <Path d="M-34 -22 L -12 -40 L 10 -22 Z" fill="#4a2e22" />
                <Rect x={-24} y={-14} width={8} height={8} fill={light.lamp} />
                <Rect x={-10} y={-14} width={8} height={8} fill={light.lamp} />
                <Rect x={12} y={-52} width={12} height={60} fill="#f3e7d8" />
                <Rect x={12} y={-40} width={12} height={8} fill="#c2452a" />
                <Rect x={10} y={-62} width={16} height={10} fill={light.lamp} />
                <Path d="M10 -62 L 18 -72 L 26 -62 Z" fill="#4a2e22" />
              </G>
            ) : (
              <G>
                <Circle r={36} fill={light.lamp} opacity={0.12} />
                <Rect x={-16} y={-12} width={32} height={22} fill="#6e4733" />
                <Path d="M-20 -12 L 0 -28 L 20 -12 Z" fill="#4a2e22" />
                <Rect x={-9} y={-6} width={7} height={7} fill={light.lamp} />
                <Rect x={3} y={-6} width={7} height={7} fill={light.lamp} />
              </G>
            )}
            <Rect x={-80} y={isHome ? 30 : 22} width={160} height={36} rx={18} fill={LABEL_BG} opacity={0.75} />
            <SvgText y={isHome ? 56 : 48} textAnchor="middle" fontSize={24} fontFamily={fonts.semibold} fill="#f3e7d8">
              {p.name}
            </SvgText>
          </G>
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
                <SvgText x={14} y={21} textAnchor="middle" fontSize={20} fontFamily={fonts.bold} fill="#fff">
                  {FORECAST_MARK[f]}
                </SvgText>
              </G>
            ))}
            <Rect x={-58} y={-86} width={116} height={40} rx={10} fill={t[wx]} />
            <SvgText x={0} y={-58} textAnchor="middle" fontSize={24} fontFamily={fonts.bold} fill="#fff">
              {WEATHER[wx].name}
            </SvgText>
            {(
              [
                ['Cargo', r.demandCargo, -42],
                ['Pass.', r.demandPassenger, 2],
              ] as const
            ).map(([label, d, y]) => (
              <G key={label}>
                <Rect x={-58} y={y} width={116} height={40} rx={10} fill={LABEL_BG} opacity={0.85} stroke={demandColor(d)} strokeWidth={4} />
                <SvgText x={0} y={y + 28} textAnchor="middle" fontSize={22} fontFamily={fonts.semibold} fill="#f3e7d8">
                  {`${label} ×${d.toFixed(2)}`}
                </SvgText>
              </G>
            ))}
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
        const off = ((i % 3) - 1) * 20
        const x = a.x + (b.x - a.x) * f + (-(b.y - a.y) / len) * off
        const y = a.y + (b.y - a.y) * f + ((b.x - a.x) / len) * off
        const tier = getBoatClass(boat.classId).sizeTier
        const w2 = 26 + tier * 4
        return (
          <G key={boat.id} transform={`translate(${x} ${y})`}>
            <Path d={`M${-w2} 0 L ${w2} 0 L ${w2 - 6} 12 L ${-w2 + 8} 12 Z`} fill={light.hull} />
            <Rect x={w2 * 0.2} y={-12} width={w2 * 0.5} height={12} fill={light.cabin} />
            <Rect x={w2 * 0.28} y={-9} width={6} height={6} fill={light.lamp} />
            <SvgText y={-22} textAnchor="middle" fontSize={22} fontFamily={fonts.semibold} fill={LABEL_BG} stroke={LABEL_BG} strokeWidth={6}>
              {boat.nickname}
            </SvgText>
            <SvgText y={-22} textAnchor="middle" fontSize={22} fontFamily={fonts.semibold} fill="#f3e7d8">
              {boat.nickname}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}
