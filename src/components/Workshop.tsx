import { useState } from 'react'
import type { GameState, PartRarity, PartType, Track } from '../game/types'
import { craftableClasses, meltGroups } from '../game/state'
import { getBoatClass } from '../game/economy'
import { getAbility } from '../game/abilities'
import { countParts, getPart, partName, slotName } from '../game/parts'
import { MELT_COST, STANDARD_SCRAP_VALUE } from '../game/data/economy'
import { coins } from '../format'

type Props = {
  game: GameState
  onCraft: (classId: string) => void
  onScrap: () => void
  onMelt: (rarity: PartRarity, slot: PartType, track: Track) => void
}

export function Workshop({ game, onCraft, onScrap, onMelt }: Props) {
  const [showAllSets, setShowAllSets] = useState(false)
  const counts = countParts(game.player.partInventory)
  const standard = [...counts].filter(([id]) => getPart(id).rarity === 'standard').reduce((n, [, c]) => n + c, 0)
  const rares = [...counts].filter(([id]) => getPart(id).rarity === 'rare')
  const owned = new Set(game.player.ownedBoats.map((b) => b.classId))

  const sets = craftableClasses()
    .map((cls) => ({ cls, have: cls.requiredParts.filter((id) => counts.has(id)) }))
    .filter(({ cls, have }) => showAllSets || have.length > 0 || owned.has(cls.id))
    .sort((a, b) => b.have.length - a.have.length || a.cls.sizeTier - b.cls.sizeTier)

  const melts = meltGroups(game).filter((g) => g.spares.length >= MELT_COST)

  return (
    <section className="workshop">
      <h2>Workshop</h2>

      <div className="workshop-row">
        <div>
          <strong>{standard}</strong> standard fitting{standard === 1 ? '' : 's'}
          <span className="muted small"> · {STANDARD_SCRAP_VALUE}c each as scrap</span>
        </div>
        <button disabled={standard === 0} onClick={onScrap}>
          Scrap {standard > 0 ? `+${coins(standard * STANDARD_SCRAP_VALUE)}c` : ''}
        </button>
      </div>

      {rares.length > 0 && (
        <div className="parts-list">
          <h3>Rare parts</h3>
          {rares.map(([id, n]) => (
            <div key={id} className="part-line">
              <span className="rarity-dot rare" />
              {partName(id)} {n > 1 && <span className="muted">×{n}</span>}
              <span className="muted small"> · unlocks {getBoatClass(getPart(id).setId).name} in the Shipyard</span>
            </div>
          ))}
        </div>
      )}

      <div className="sets">
        <h3>Sets</h3>
        {sets.length === 0 && (
          <p className="muted small">
            No set pieces yet. Legendary pieces drop in rough water and storms; mythic pieces only in storms.
          </p>
        )}
        {sets.map(({ cls, have }) => {
          const complete = have.length === cls.requiredParts.length
          const ability = getAbility(cls.abilityId)
          return (
            <div key={cls.id} className={`set-card ${cls.rarity} ${complete ? 'complete' : ''}`}>
              <div className="set-head">
                <strong>{cls.name}</strong>
                <span className={`rarity-badge ${cls.rarity}`}>{cls.rarity}</span>
                <span className="set-count">
                  {have.length} of {cls.requiredParts.length}
                </span>
              </div>
              <div className="muted small">
                T{cls.sizeTier} {cls.track} · {ability?.description}
                {cls.rarity === 'mythic' && ' · never sold, at any price'}
              </div>
              <div className="set-pieces">
                {cls.requiredParts.map((id) => {
                  const p = getPart(id)
                  return (
                    <span key={id} className={`set-piece ${counts.has(id) ? 'have' : ''}`}>
                      {counts.has(id) ? '✓' : '○'} {slotName(p.type, p.track)}
                    </span>
                  )
                })}
              </div>
              {complete && <button onClick={() => onCraft(cls.id)}>Build {cls.name}</button>}
              {!complete && owned.has(cls.id) && <span className="muted small">In your fleet</span>}
            </div>
          )
        })}
        <button className="secondary" onClick={() => setShowAllSets(!showAllSets)}>
          {showAllSets ? 'Show sets in progress' : 'Show every set'}
        </button>
      </div>

      {melts.length > 0 && (
        <div className="melts">
          <h3>Spares</h3>
          {melts.map((g) => (
            <div key={`${g.rarity}/${g.slot}/${g.track}`} className="workshop-row">
              <span>
                {g.spares.length} spare {g.rarity} {slotName(g.slot, g.track).toLowerCase()} ({g.track})
              </span>
              <button onClick={() => onMelt(g.rarity, g.slot, g.track)}>
                Melt {MELT_COST} → 1 new {g.rarity}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
