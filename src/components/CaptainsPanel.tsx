import { useState } from 'react'
import type { GameState, Track } from '../game/types'
import type { CaptainView } from '../game/captains'
import {
  boatOfCaptain,
  boatsManagedBy,
  managerRole,
  promotionOptions,
  quayInfo,
  recruitViews,
  rosterViews,
} from '../game/crew'
import { SCOUT_ACTIONS, PROMOTION_VOYAGES, type ScoutAction } from '../game/data/captains'
import { coins, duration } from '../format'
import { Anchors, SkillRange, TraitList, VerdictBadge } from './CaptainBits'

type Props = {
  game: GameState
  now: number
  onScout: (captainId: string, action: ScoutAction) => void
  onHire: (captainId: string) => void
  onFire: (captainId: string) => void
  onAssign: (captainId: string, boatId: string) => void
  onAshore: (captainId: string) => void
  onPromote: (captainId: string, role: 'dockhand' | 'harbormaster' | 'fleet-manager', track?: Track) => void
}

export function CaptainsPanel(props: Props) {
  const { game } = props
  const [tab, setTab] = useState<'quay' | 'roster'>(game.player.roster.length ? 'roster' : 'quay')
  return (
    <section className="captains">
      <h2>Captains</h2>
      <div className="tabs">
        <button className={tab === 'quay' ? '' : 'secondary'} onClick={() => setTab('quay')}>
          Quay ({game.recruitPool.recruits.length})
        </button>
        <button className={tab === 'roster' ? '' : 'secondary'} onClick={() => setTab('roster')}>
          Yours ({game.player.roster.length})
        </button>
      </div>
      {tab === 'quay' ? <Quay {...props} /> : <Roster {...props} />}
    </section>
  )
}

function Quay({ game, now, onScout, onHire }: Props) {
  const info = quayInfo(game, now)
  const recruits = recruitViews(game)
  return (
    <>
      <p className="muted small">
        {info.watchesLeft} watch{info.watchesLeft === 1 ? '' : 'es'} left to spend · new faces in{' '}
        {duration(info.refreshesAt - now)} · scout level {info.scoutLevel}
      </p>
      {recruits.length === 0 && <p className="muted small">Nobody else is looking for work today.</p>}
      {recruits.map((c) => (
        <article key={c.id} className="captain-card">
          <CaptainHead c={c} />
          <SkillRange band={c.skillBand} />
          <TraitList c={c} />
          <div className="boat-actions">
            {(Object.keys(SCOUT_ACTIONS) as ScoutAction[]).map((a) => {
              const act = SCOUT_ACTIONS[a]
              const done = a === 'run' && c.verdict !== null
              return (
                <button
                  key={a}
                  className="secondary"
                  disabled={done || info.watchesLeft < act.watches}
                  title={`Reveals ${act.reveals}`}
                  onClick={() => onScout(c.id, a)}
                >
                  {act.name} · {act.watches}w
                </button>
              )
            })}
            <button disabled={game.player.coins < c.fee} onClick={() => onHire(c.id)}>
              Hire {coins(c.fee)}c
            </button>
          </div>
        </article>
      ))}
    </>
  )
}

function Roster({ game, onFire, onAssign, onAshore, onPromote }: Props) {
  const roster = rosterViews(game)
  if (roster.length === 0) return <p className="muted small">No captains yet. Find one on the quay.</p>
  const docked = game.player.ownedBoats.filter((b) => b.state === 'idle')
  return (
    <>
      {roster.map((c) => {
        const boat = boatOfCaptain(game, c.id)
        const role = managerRole(c.role)
        const promos = promotionOptions(game, c.id)
        return (
          <article key={c.id} className={`captain-card ${c.role !== 'sailing' ? 'manager' : ''}`}>
            <CaptainHead c={c} />
            <p className="small">
              {role ? (
                <>
                  <strong>{role.name}</strong> · {role.description}
                  {c.managesTrack && ` (${c.managesTrack})`} · runs {boatsManagedBy(game, c.id).length} boat
                  {boatsManagedBy(game, c.id).length === 1 ? '' : 's'}
                </>
              ) : boat ? (
                <>
                  Aboard <strong>{boat.nickname}</strong>
                  {boat.state !== 'idle' && ' (at sea)'}
                </>
              ) : (
                'Ashore'
              )}{' '}
              · {c.voyageCount} voyage{c.voyageCount === 1 ? '' : 's'}
              {c.bonded && ' · bonded to her ship'}
            </p>
            <SkillRange band={c.skillBand} />
            {c.knownDevelopment && (
              <p className="small">
                <strong>{c.knownDevelopment.name}:</strong> <span className="muted">{c.knownDevelopment.description}</span>
              </p>
            )}
            <TraitList c={c} />
            <div className="boat-actions">
              {c.role === 'sailing' && !c.bonded && (
                <select
                  value=""
                  onChange={(e) => e.target.value && onAssign(c.id, e.target.value)}
                  disabled={!!boat && boat.state !== 'idle'}
                  aria-label="Put in command of a boat"
                >
                  <option value="">{boat ? 'Move to…' : 'Put aboard…'}</option>
                  {docked
                    .filter((b) => b.id !== boat?.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nickname}
                      </option>
                    ))}
                </select>
              )}
              {boat && !c.bonded && boat.state === 'idle' && (
                <button className="secondary" onClick={() => onAshore(c.id)}>
                  Step ashore
                </button>
              )}
              {promos.map((r) =>
                r.id === 'fleet-manager' ? (
                  (['cargo', 'passenger'] as Track[]).map((t) => (
                    <button key={t} className="secondary" onClick={() => onPromote(c.id, r.id, t)}>
                      Make {r.name} ({t})
                    </button>
                  ))
                ) : (
                  <button key={r.id} className="secondary" onClick={() => onPromote(c.id, r.id)} title={r.description}>
                    Make {r.name}
                  </button>
                ),
              )}
              {c.role === 'sailing' && promos.length === 0 && c.voyageCount >= PROMOTION_VOYAGES && (
                <span className="muted small">Ready for a desk job once you reach tier 3</span>
              )}
              {!c.bonded && (
                <button
                  className="danger"
                  disabled={game.player.coins < c.severance || (!!boat && boat.state !== 'idle')}
                  onClick={() => confirm(`Let ${c.name} go? Severance is ${coins(c.severance)} coins.`) && onFire(c.id)}
                >
                  Let go · {coins(c.severance)}c
                </button>
              )}
            </div>
          </article>
        )
      })}
    </>
  )
}

function CaptainHead({ c }: { c: CaptainView }) {
  return (
    <header className="captain-head">
      <div>
        <strong>{c.name}</strong> <VerdictBadge verdict={c.verdict} />
        <div className="muted small">
          from {c.homePort} · sails tier {c.sailsTiers[0]}–{c.sailsTiers[1]} boats
        </div>
      </div>
      <Anchors n={c.reputation} />
    </header>
  )
}
