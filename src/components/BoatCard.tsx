import { useState } from 'react'
import type { Boat, GameState } from '../game/types'
import { canBeSold, getBoatClass, getPort, sellPrice } from '../game/economy'
import { getVoyage, quoteVoyage, repairQuote, salvageQuote } from '../game/state'
import { abilityOf } from '../game/abilities'
import { LOW_CONDITION_THRESHOLD, SALVAGE_CONDITION } from '../game/data/economy'
import { WEATHER } from '../game/data/weather'
import { coins, duration, percent } from '../format'
import { TIER_COLORS } from '../colors'

type Props = {
  game: GameState
  boat: Boat
  now: number
  selected: boolean
  canSell: boolean
  onSelect: () => void
  onAssign: (routeId: string, trips: number) => void
  onRecall: () => void
  onRepair: () => void
  onSell: () => void
  onSalvage: () => void
}

/** Runs a click handler without also selecting the card underneath. */
const only = (fn: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation()
  fn()
}

export function BoatCard(props: Props) {
  const { boat, selected, onSelect } = props
  const cls = getBoatClass(boat.classId)
  const ability = abilityOf(boat)
  const lowCondition = boat.condition < LOW_CONDITION_THRESHOLD

  return (
    <article className={`boat-card ${selected ? 'selected' : ''} ${boat.state}`} onClick={onSelect}>
      <header className="boat-head">
        <span className="tier-swatch" style={{ background: TIER_COLORS[cls.sizeTier] }} />
        <div className="boat-names">
          <strong>
            {boat.nickname}
            {cls.rarity !== 'common' && <span className={`rarity-badge ${cls.rarity}`}>{cls.rarity}</span>}
          </strong>
          <span className="muted">
            {cls.name} · {cls.track === 'cargo' ? 'Cargo' : 'Passenger'} · T{cls.sizeTier} · cap {cls.capacity}
          </span>
        </div>
        <div className={`condition ${boat.condition <= 20 ? 'risk' : lowCondition ? 'low' : ''}`} title="Condition">
          <div className="condition-bar">
            <div style={{ width: `${boat.condition}%` }} />
          </div>
          <span>{boat.condition}</span>
        </div>
      </header>

      {ability && (
        <p className={`ability ${ability.inactiveReason ? 'inactive' : ''}`}>
          <strong>{ability.name}:</strong> {ability.description}
          {ability.inactiveReason && <span className="muted"> ({ability.inactiveReason})</span>}
        </p>
      )}

      {boat.state === 'sunk' ? (
        <SunkBody {...props} />
      ) : boat.state === 'idle' ? (
        <DockedBody {...props} lowCondition={lowCondition} />
      ) : (
        <AtSeaBody {...props} />
      )}
    </article>
  )
}

function AtSeaBody({ game, boat, now, onRecall }: Props) {
  const v = getVoyage(game, boat.id)
  if (!v) return null
  const dest = getPort(game.routes.find((r) => r.id === v.routeId)!.portB).name
  const eta = duration((boat.etaMs ?? now) - now)
  const tripsLeft = v.tripsTotal - v.tripIndex
  const weather = v.weatherAtStart ?? 'calm'
  return (
    <>
      <p className="boat-status">
        <span className="trip-count">
          Trip {v.tripIndex}/{v.tripsTotal}
        </span>{' '}
        <span className={`weather-tag ${weather}`}>{WEATHER[weather].name}</span>{' '}
        {v.lost
          ? `Cargo lost. Limping home · ${eta}`
          : boat.state === 'sailing'
            ? `Sailing to ${dest} · ${eta} · pays ${coins(v.payout)}`
            : `Returning from ${dest} · ${eta}`}
      </p>
      {tripsLeft > 0 ? (
        <div className="boat-actions">
          <button className="secondary" onClick={only(onRecall)}>
            Return after this trip
          </button>
          <span className="muted small">
            {tripsLeft} more trip{tripsLeft === 1 ? '' : 's'} queued · each sails in the weather it meets
          </span>
        </div>
      ) : (
        <p className="muted small">Last trip: docks when it gets home.</p>
      )}
    </>
  )
}

function DockedBody({
  game,
  boat,
  now,
  canSell,
  onAssign,
  onRepair,
  onSell,
  lowCondition,
}: Props & { lowCondition: boolean }) {
  const cls = getBoatClass(boat.classId)
  const tank = cls.fuelTankTrips
  const [trips, setTrips] = useState(tank)
  const fixCost = repairQuote(game, boat.id)
  const sellable = canSell && canBeSold(cls)

  return (
    <>
      <p className="boat-status">Docked at home</p>
      {lowCondition && <p className="warn">Below {LOW_CONDITION_THRESHOLD}: payouts −20%, wears faster</p>}

      <div className="trips-row">
        <span className="muted small">Trips · fuel for {tank}</span>
        <div className="stepper">
          <button className="secondary" disabled={trips <= 1} onClick={only(() => setTrips(trips - 1))} aria-label="Fewer trips">
            −
          </button>
          <span className="stepper-value">{trips}</span>
          <button className="secondary" disabled={trips >= tank} onClick={only(() => setTrips(trips + 1))} aria-label="More trips">
            +
          </button>
        </div>
      </div>

      <div className="route-buttons">
        {game.routes.map((r) => {
          const q = quoteVoyage(game, boat.id, r.id, now)
          return (
            <button
              key={r.id}
              disabled={!!q.blocked}
              title={q.blocked ?? undefined}
              className={`route-btn ${q.payout <= 0 ? 'loss' : ''} ${boat.currentRoute === r.id ? 'last' : ''} ${q.canSink ? 'danger-route' : ''}`}
              onClick={only(() => onAssign(r.id, trips))}
            >
              <span className="route-name">
                {getPort(r.portB).name} <span className={`weather-tag ${q.weather}`}>{WEATHER[q.weather].name}</span>
              </span>
              <span className="route-pay">
                {coins(q.payout)}c<span className="route-per"> /trip now</span>
              </span>
              <span className="route-meta">
                {trips} × {duration(q.durationMs)} = {duration(q.durationMs * trips)}
              </span>
              <span className="route-risk">
                −{q.worstDamage} cond worst
                {q.lossRisk > 0 && ` · ${percent(q.lossRisk)} lose cargo`}
              </span>
              {q.canSink && <span className="route-sink">Could sink</span>}
            </button>
          )
        })}
      </div>

      <div className="boat-actions">
        <button disabled={fixCost === 0 || game.player.coins < 2} onClick={only(onRepair)}>
          Repair {fixCost > 0 ? `${coins(fixCost)}c` : ''}
        </button>
        {canBeSold(cls) && (
          <button
            className="danger"
            disabled={!sellable}
            onClick={only(() => {
              if (confirm(`Sell ${boat.nickname} for ${coins(sellPrice(cls))} coins?`)) onSell()
            })}
          >
            Sell {coins(sellPrice(cls))}c
          </button>
        )}
      </div>
    </>
  )
}

function SunkBody({ game, boat, onSalvage }: Props) {
  const route = game.routes.find((r) => r.id === boat.currentRoute)
  const cost = salvageQuote(game, boat.id)
  return (
    <>
      <p className="boat-status bad">Sunk{route ? ` on the way to ${getPort(route.portB).name}` : ''}.</p>
      <div className="boat-actions">
        <button disabled={game.player.coins < cost} onClick={only(onSalvage)}>
          Salvage {coins(cost)}c
        </button>
        <span className="muted small">Comes back at {SALVAGE_CONDITION} condition</span>
      </div>
    </>
  )
}
