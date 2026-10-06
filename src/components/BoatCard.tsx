import type { Boat, GameState } from '../game/types'
import { getBoatClass, getPort, repairCost, sellPrice } from '../game/economy'
import { getVoyage, quoteVoyage } from '../game/state'
import { LOW_CONDITION_THRESHOLD } from '../game/data/economy'
import { coins, duration } from '../format'
import { TIER_COLORS } from '../colors'

type Props = {
  game: GameState
  boat: Boat
  now: number
  selected: boolean
  canSell: boolean
  onSelect: () => void
  onAssign: (routeId: string) => void
  onRepair: () => void
  onSell: () => void
}

export function BoatCard({ game, boat, now, selected, canSell, onSelect, onAssign, onRepair, onSell }: Props) {
  const cls = getBoatClass(boat.classId)
  const voyage = getVoyage(game, boat.id)
  const lowCondition = boat.condition < LOW_CONDITION_THRESHOLD
  const fixCost = repairCost(boat.condition)

  let status: string
  if (boat.state === 'idle') status = 'Docked at home'
  else {
    const route = game.routes.find((r) => r.id === voyage?.routeId)
    const dest = route ? getPort(route.portB).name : '?'
    const eta = duration((boat.etaMs ?? now) - now)
    status =
      boat.state === 'sailing'
        ? `Sailing to ${dest} · ${eta} · pays ${coins(voyage?.payout ?? 0)}`
        : `Returning from ${dest} · ${eta}`
  }

  return (
    <article className={`boat-card ${selected ? 'selected' : ''} ${boat.state}`} onClick={onSelect}>
      <header className="boat-head">
        <span className="tier-swatch" style={{ background: TIER_COLORS[cls.sizeTier] }} />
        <div className="boat-names">
          <strong>{boat.nickname}</strong>
          <span className="muted">
            {cls.name} · T{cls.sizeTier} · cap {cls.capacity}
          </span>
        </div>
        <div className={`condition ${lowCondition ? 'low' : ''}`} title="Condition">
          <div className="condition-bar">
            <div style={{ width: `${boat.condition}%` }} />
          </div>
          <span>{boat.condition}</span>
        </div>
      </header>

      <p className="boat-status">{status}</p>
      {lowCondition && <p className="warn">Below {LOW_CONDITION_THRESHOLD} condition: payouts −20%</p>}

      {boat.state === 'idle' && (
        <>
          <div className="route-buttons">
            {game.routes.map((r) => {
              const q = quoteVoyage(game, boat.id, r.id)
              const isLast = boat.currentRoute === r.id
              return (
                <button
                  key={r.id}
                  className={`route-btn ${q.payout <= 0 ? 'loss' : ''} ${isLast ? 'last' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAssign(r.id)
                  }}
                >
                  <span className="route-name">{getPort(r.portB).name}</span>
                  <span className="route-pay">{coins(q.payout)}c</span>
                  <span className="route-meta">
                    {duration(q.durationMs)} · {coins(q.perMinute)}/min
                  </span>
                </button>
              )
            })}
          </div>
          <div className="boat-actions">
            <button
              disabled={fixCost === 0 || game.player.coins < 2}
              onClick={(e) => {
                e.stopPropagation()
                onRepair()
              }}
            >
              Repair {fixCost > 0 ? `${coins(fixCost)}c` : ''}
            </button>
            <button
              className="danger"
              disabled={!canSell}
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Sell ${boat.nickname} for ${coins(sellPrice(cls))} coins?`)) onSell()
              }}
            >
              Sell {coins(sellPrice(cls))}c
            </button>
          </div>
        </>
      )}
    </article>
  )
}
