import type { GameState } from '../game/types'
import { UPGRADES, upgradeQuote } from '../game/crew'
import { coins } from '../format'

type Props = { game: GameState; onBuild: (id: (typeof UPGRADES)[number]['id']) => void }

export function PortPanel({ game, onBuild }: Props) {
  return (
    <section className="port">
      <h2>Saltmarsh Quay</h2>
      {UPGRADES.map((u) => {
        const q = upgradeQuote(game, u.id)
        return (
          <div key={u.id} className="workshop-row">
            <div>
              <strong>{u.name}</strong>{' '}
              <span className="muted small">
                {q.level > 0 ? `level ${q.level}/3 · ${u.describe(u.levels[q.level - 1])}` : 'not built'}
              </span>
              {q.cost !== null && (
                <div className="muted small">
                  Next: {u.describe(u.levels[q.level])}
                  {q.discount > 0 && ` · ${Math.round(q.discount * 100)}% off while your Monarch is docked`}
                </div>
              )}
            </div>
            <button disabled={q.cost === null || game.player.coins < q.cost} onClick={() => onBuild(u.id)}>
              {q.cost === null ? 'Done' : `${coins(q.cost)}c`}
            </button>
          </div>
        )
      })}
    </section>
  )
}
