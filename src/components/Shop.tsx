import { shopClasses } from '../game/state'
import { coins } from '../format'
import { TIER_COLORS } from '../colors'

type Props = { playerCoins: number; onBuy: (classId: string) => void }

export function Shop({ playerCoins, onBuy }: Props) {
  return (
    <section className="shop">
      <h2>Shipyard</h2>
      {shopClasses().map((c) => {
        const affordable = playerCoins >= c.price
        return (
          <div key={c.id} className="shop-row">
            <span className="tier-swatch" style={{ background: TIER_COLORS[c.sizeTier] }} />
            <div className="shop-info">
              <strong>{c.name}</strong>
              <span className="muted">
                {c.track === 'cargo' ? 'Cargo' : 'Passenger'} · T{c.sizeTier} · cap {c.capacity} · fuel {c.fuelPerLeg}/leg · speed {c.speed.toFixed(1)}
              </span>
            </div>
            <button disabled={!affordable} onClick={() => onBuy(c.id)}>
              {coins(c.price)}c
            </button>
          </div>
        )
      })}
    </section>
  )
}
