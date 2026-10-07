import { useCallback, useEffect, useRef, useState } from 'react'
import type { AwayReport, GameState } from './game/types'
import {
  assignRoute,
  buyBoat,
  GameError,
  newGame,
  recallBoat,
  repairBoat,
  salvageBoat,
  sellBoat,
  settle,
  settleAway,
} from './game/state'
import { randomSeed } from './game/rolls'
import { advanceClock, clearSave, clock, DEBUG, loadGame, saveGame } from './storage'
import { coins, duration } from './format'
import { MapView } from './components/MapView'
import { BoatCard } from './components/BoatCard'
import { Shop } from './components/Shop'

const TICK_MS = 250
const AUTOSAVE_MS = 5000

const worthReporting = (r: AwayReport) => r.tripsCompleted > 0 || r.sunk.length > 0

function boot(): { game: GameState; report: AwayReport | null } {
  const saved = loadGame()
  if (!saved) return { game: newGame(randomSeed(), clock()), report: null }
  const { state, report } = settleAway(saved, clock())
  return { game: state, report: worthReporting(report) ? report : null }
}

export default function App() {
  const [initial] = useState(boot)
  const [game, setGame] = useState<GameState>(initial.game)
  const [report, setReport] = useState<AwayReport | null>(initial.report)
  const [now, setNow] = useState(clock)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const gameRef = useRef(game)
  useEffect(() => {
    gameRef.current = game
  }, [game])

  const comeBack = useCallback(() => {
    const t = clock()
    const { state, report } = settleAway(gameRef.current, t)
    gameRef.current = state
    setGame(state)
    setNow(t)
    saveGame(state)
    if (worthReporting(report)) setReport(report)
  }, [])

  // Present-time clock: settle in-flight voyages. Paused while hidden, so coming back
  // settles the whole gap at once and can report what happened while away.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      const t = clock()
      setNow(t)
      setGame((g) => settle(g, t))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => saveGame(gameRef.current), AUTOSAVE_MS)
    const onVisibility = () => {
      if (document.hidden) {
        const g = settle(gameRef.current, clock())
        gameRef.current = g
        setGame(g)
        saveGame(g)
      } else {
        comeBack()
      }
    }
    const onPageHide = () => saveGame(settle(gameRef.current, clock()))
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [comeBack])

  const act = useCallback((fn: (g: GameState, t: number) => GameState) => {
    try {
      const t = clock()
      const next = fn(settle(gameRef.current, t), t)
      gameRef.current = next
      setGame(next)
      setError(null)
      saveGame(next)
    } catch (e) {
      if (e instanceof GameError) setError(e.message)
      else throw e
    }
  }, [])

  const boats = game.player.ownedBoats
  const idleCount = boats.filter((b) => b.state === 'idle').length
  const sunkCount = boats.filter((b) => b.state === 'sunk').length

  return (
    <div className="app">
      <header className="topbar">
        <h1>Harborline</h1>
        <div className="stats">
          <span className="coins">{coins(game.player.coins)}c</span>
          <span className="muted">
            {boats.length} boat{boats.length === 1 ? '' : 's'}
            {idleCount > 0 && ` · ${idleCount} docked`}
            {sunkCount > 0 && ` · ${sunkCount} sunk`}
          </span>
        </div>
      </header>

      {report && (
        <div className={`banner ${report.sunk.length > 0 ? 'error' : ''}`} onClick={() => setReport(null)}>
          <strong>Welcome back.</strong> While you were away ({duration(report.awayMs)}), your fleet finished{' '}
          {report.tripsCompleted} trip{report.tripsCompleted === 1 ? '' : 's'} for{' '}
          <strong>{coins(report.coinsEarned)}c</strong>.
          {report.sunk.length > 0 && <strong className="bad"> Sunk: {report.sunk.join(', ')}.</strong>}
          <span className="muted"> Tap to dismiss.</span>
        </div>
      )}
      {error && (
        <div className="banner error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <main className="layout">
        <div className="map-wrap">
          <MapView game={game} now={now} selectedBoatId={selected} onSelectBoat={setSelected} />
        </div>

        <aside className="panel">
          <section className="fleet">
            <h2>Fleet</h2>
            {boats.map((b) => (
              <BoatCard
                key={b.id}
                game={game}
                boat={b}
                now={now}
                selected={b.id === selected}
                canSell={boats.length > 1}
                onSelect={() => setSelected(b.id)}
                onAssign={(routeId, trips) => act((g, t) => assignRoute(g, b.id, routeId, t, trips))}
                onRecall={() => act((g) => recallBoat(g, b.id))}
                onSalvage={() => act((g) => salvageBoat(g, b.id))}
                onRepair={() => act((g) => repairBoat(g, b.id))}
                onSell={() => act((g) => sellBoat(g, b.id))}
              />
            ))}
          </section>

          <Shop playerCoins={game.player.coins} onBuy={(id) => act((g) => buyBoat(g, id))} />

          {DEBUG && (
            <section className="debug">
              <h2>Debug</h2>
              <p className="muted">
                seed {game.rng.seed} · clock offset applies to this browser only
              </p>
              <div className="boat-actions">
                {[10, 60, 480].map((min) => (
                  <button
                    key={min}
                    onClick={() => {
                      gameRef.current = settle(gameRef.current, clock())
                      advanceClock(min * 60_000)
                      comeBack()
                    }}
                  >
                    Away {min >= 60 ? `${min / 60}h` : `${min}m`}
                  </button>
                ))}
                <button
                  className="danger"
                  onClick={() => {
                    if (!confirm('Wipe the save and start over?')) return
                    clearSave()
                    location.reload()
                  }}
                >
                  Reset
                </button>
              </div>
            </section>
          )}
        </aside>
      </main>
    </div>
  )
}
