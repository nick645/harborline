import { useState } from 'react'
import type { GameState } from '../game/types'
import { shopClasses } from '../game/state'
import { getBoatClass } from '../game/economy'
import { getAbility } from '../game/abilities'
import { hasParts, partName } from '../game/parts'
import { coins } from '../format'
import { TIER_COLORS } from '../colors'

type Props = { game: GameState; onBuy: (classId: string) => void }

export function Shop({ game, onBuy }: Props) {
  const [showAll, setShowAll] = useState(false)
  const topTier = Math.max(...game.player.ownedBoats.map((b) => getBoatClass(b.classId).sizeTier))
  // Show what's in reach: your top tier and the next one. The rest is a tap away.
  const visibleTiers = showAll ? [1, 2, 3, 4, 5, 6] : [topTier, topTier + 1].filter((t) => t <= 6)
  const classes = shopClasses()

  return (
    <section className="shop">
      <h2>Shipyard</h2>
      {visibleTiers.map((tier) => (
        <div key={tier} className="shop-tier">
          <h3>Tier {tier}</h3>
          {classes
            .filter((c) => c.sizeTier === tier)
            .map((c) => {
              const hasPart = hasParts(game.player.partInventory, c.requiredParts)
              const affordable = game.player.coins >= c.price && hasPart
              const ability = getAbility(c.abilityId)
              return (
                <div key={c.id} className={`shop-row ${c.rarity}`}>
                  <span className="tier-swatch" style={{ background: TIER_COLORS[c.sizeTier] }} />
                  <div className="shop-info">
                    <strong>
                      {c.name}
                      {c.rarity !== 'common' && <span className={`rarity-badge ${c.rarity}`}>{c.rarity}</span>}
                    </strong>
                    <span className="muted">
                      {c.track === 'cargo' ? 'Cargo' : 'Passenger'} · cap {c.capacity} · fuel for {c.fuelTankTrips} trips
                    </span>
                    {ability && (
                      <span className={`small ${ability.inactiveReason ? 'muted' : ''}`}>
                        {ability.description}
                        {ability.inactiveReason && ' (not active yet)'}
                      </span>
                    )}
                    {c.requiredParts.length > 0 && (
                      <span className={`small ${hasPart ? 'good' : 'muted'}`}>
                        {hasPart ? '✓ ' : 'Needs '}
                        {c.requiredParts.map(partName).join(', ')}
                      </span>
                    )}
                  </div>
                  <button disabled={!affordable} onClick={() => onBuy(c.id)}>
                    {coins(c.price)}c
                  </button>
                </div>
              )
            })}
        </div>
      ))}
      <button className="secondary" onClick={() => setShowAll(!showAll)}>
        {showAll ? 'Show tiers in reach' : 'Show all tiers'}
      </button>
    </section>
  )
}
