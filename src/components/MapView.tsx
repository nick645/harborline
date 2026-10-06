import type { GameState } from '../game/types'
import { getBoatClass, getPort } from '../game/economy'
import { getVoyage } from '../game/state'
import { TIER_COLORS } from '../colors'
import { HOME_PORT_ID, MAP_HEIGHT, MAP_WIDTH, PORTS } from '../game/data/ports'

type Props = {
  game: GameState
  now: number
  selectedBoatId: string | null
  onSelectBoat: (id: string) => void
}

export function MapView({ game, now, selectedBoatId, onSelectBoat }: Props) {
  const home = getPort(HOME_PORT_ID)
  const boatsAtSea = game.player.ownedBoats.filter((b) => b.state === 'sailing' || b.state === 'returning')

  return (
    <svg className="map" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label="Harbor map">
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="map-sea" />

      {game.routes.map((r) => {
        const a = getPort(r.portA)
        const b = getPort(r.portB)
        // Demand chip sits just short of the midpoint, clear of port labels.
        const mx = a.x + (b.x - a.x) * 0.45
        const my = a.y + (b.y - a.y) * 0.45
        const hot = r.demandCargo >= 1.15
        const cold = r.demandCargo < 0.85
        return (
          <g key={r.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="map-route" />
            <g transform={`translate(${mx} ${my})`}>
              <rect x={-44} y={-20} width={88} height={40} rx={8} className={`map-demand ${hot ? 'hot' : cold ? 'cold' : ''}`} />
              <text textAnchor="middle" dy={9} className="map-demand-text">
                ×{r.demandCargo.toFixed(2)}
              </text>
            </g>
          </g>
        )
      })}

      {PORTS.map((p) => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
          <rect
            x={p.id === home.id ? -26 : -18}
            y={p.id === home.id ? -26 : -18}
            width={p.id === home.id ? 52 : 36}
            height={p.id === home.id ? 52 : 36}
            className={p.id === home.id ? 'map-port home' : 'map-port'}
          />
          <text y={p.id === home.id ? 56 : 46} textAnchor="middle" className="map-port-label">
            {p.name}
          </text>
        </g>
      ))}

      {boatsAtSea.map((boat, i) => {
        const v = getVoyage(game, boat.id)
        if (!v) return null
        const route = game.routes.find((r) => r.id === v.routeId)!
        const a = getPort(route.portA)
        const b = getPort(route.portB)
        const half = v.durationMs / 2
        const elapsed = Math.min(Math.max(now - v.startedAt, 0), v.durationMs)
        const t = elapsed <= half ? elapsed / half : 2 - elapsed / half
        // Nudge boats sideways so several on one route don't stack exactly.
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
        const nx = -(b.y - a.y) / len
        const ny = (b.x - a.x) / len
        const off = ((i % 3) - 1) * 18
        const x = a.x + (b.x - a.x) * t + nx * off
        const y = a.y + (b.y - a.y) * t + ny * off
        const tier = getBoatClass(boat.classId).sizeTier
        const selected = boat.id === selectedBoatId
        return (
          <g
            key={boat.id}
            transform={`translate(${x} ${y})`}
            className="map-boat"
            onClick={() => onSelectBoat(boat.id)}
          >
            <rect
              x={-14 - tier * 2}
              y={-9}
              width={28 + tier * 4}
              height={18}
              rx={4}
              fill={TIER_COLORS[tier]}
              className={selected ? 'selected' : ''}
            />
            <text y={-16} textAnchor="middle" className="map-boat-label">
              {boat.nickname}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
