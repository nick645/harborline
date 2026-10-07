import { useCallback, useEffect, useRef, useState } from 'react'
import type { AwayReport, GameState } from './game/types'
import {
  assignRoute,
  buyBoat,
  craftableClasses,
  craftBoat,
  GameError,
  meltSpares,
  newGame,
  recallBoat,
  repairBoat,
  salvageBoat,
  scrapStandardParts,
  sellBoat,
  settle,
  settleAway,
} from './game/state'
import { getPart, partName } from './game/parts'
import { seasonAt, seasonEndsAt, stormAlerts, weatherChangesAt, type StormAlert } from './game/weather'
import { getPort } from './game/economy'
import { WEATHER } from './game/data/weather'
import { alertsWanted, notificationsSupported, requestPermission, setAlertsWanted, systemNotify } from './notify'
import { randomSeed } from './game/rolls'
import { advanceClock, clearSave, clock, DEBUG, loadGame, saveGame } from './storage'
import { coins, duration } from './format'
import { MapView } from './components/MapView'
import { BoatCard } from './components/BoatCard'
import { Shop } from './components/Shop'
import { Workshop } from './components/Workshop'
import { HarborLog } from './components/HarborLog'

const TICK_MS = 250
const AUTOSAVE_MS = 5000

const worthReporting = (r: AwayReport) => r.tripsCompleted > 0 || r.sunk.length > 0 || r.lost.length > 0

/** Report-worthy finds: anything better than a standard fitting. */
const notableParts = (r: AwayReport) => r.parts.filter((id) => getPart(id).rarity !== 'standard')

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
  const [alerts, setAlerts] = useState<StormAlert[]>([])
  const [alertsOn, setAlertsOn] = useState(alertsWanted)

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

  // Storm alerts: check each time the weather turns. Works in a background tab; a closed
  // app can't be woken without a server, so the Expo build will use local notifications.
  const checkAlerts = useCallback(
    (at: number) => {
      // Check against a settled copy without committing it, so away reports stay intact.
      const found = stormAlerts(settle(gameRef.current, at), at)
      if (!found.length) return
      setAlerts(found)
      if (document.hidden && alertsOn) {
        const first = found[0]
        const names = first.boatIds.map((id) => gameRef.current.player.ownedBoats.find((b) => b.id === id)?.nickname)
        systemNotify(
          `${WEATHER[first.weather].name} over ${getPort(gameRef.current.routes.find((r) => r.id === first.routeId)!.portB).name}`,
          `${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} trips queued there. Open Harborline to bring them home.`,
        )
      }
    },
    [alertsOn],
  )

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      const t = clock()
      const at = weatherChangesAt(t)
      timer = window.setTimeout(() => {
        checkAlerts(at)
        schedule()
      }, Math.max(0, at - t) + 500)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [checkAlerts])

  const toggleAlerts = async () => {
    const on = !alertsOn
    if (on) await requestPermission()
    setAlertsWanted(on)
    setAlertsOn(on)
  }

  const boats = game.player.ownedBoats
  const idleCount = boats.filter((b) => b.state === 'idle').length
  const sunkCount = boats.filter((b) => b.state === 'sunk').length

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Harborline</h1>
          <span className="muted small">
            {seasonAt(now)[0].toUpperCase() + seasonAt(now).slice(1)} · {duration(seasonEndsAt(now) - now)} left
            {seasonAt(now) === 'winter' && ' · storm season'}
            {seasonAt(seasonEndsAt(now)) === 'winter' && ' · storm season next'}
          </span>
        </div>
        <div className="stats">
          <span className="coins">{coins(game.player.coins)}c</span>
          <span className="muted">
            {boats.length} boat{boats.length === 1 ? '' : 's'}
            {idleCount > 0 && ` · ${idleCount} docked`}
            {sunkCount > 0 && ` · ${sunkCount} sunk`}
          </span>
          {notificationsSupported() && (
            <button className="secondary small alert-toggle" onClick={toggleAlerts}>
              Storm alerts: {alertsOn ? (Notification.permission === 'granted' ? 'on' : 'in-app') : 'off'}
            </button>
          )}
        </div>
      </header>

      {report && (
        <div className={`banner ${report.sunk.length + report.lost.length > 0 ? 'error' : ''}`} onClick={() => setReport(null)}>
          <strong>Welcome back.</strong> While you were away ({duration(report.awayMs)}), your fleet finished{' '}
          {report.tripsCompleted} trip{report.tripsCompleted === 1 ? '' : 's'} for{' '}
          <strong>{coins(report.coinsEarned)}c</strong>.
          {notableParts(report).length > 0 && <> Found: {notableParts(report).map(partName).join(', ')}.</>}
          {report.lost.length > 0 && <strong className="bad"> Cargo lost: {report.lost.join(', ')}.</strong>}
          {report.sunk.length > 0 && <strong className="bad"> Sunk: {report.sunk.join(', ')}.</strong>}
          <span className="muted"> Tap to dismiss.</span>
        </div>
      )}
      {alerts.map((a) => {
        const port = getPort(game.routes.find((r) => r.id === a.routeId)!.portB).name
        const stillQueued = a.boatIds.filter((id) => {
          const v = game.voyages.find((x) => x.boatId === id)
          return v && v.tripIndex < v.tripsTotal
        })
        if (stillQueued.length === 0) return null
        const names = stillQueued.map((id) => boats.find((b) => b.id === id)?.nickname).join(', ')
        return (
          <div key={a.routeId} className="banner storm">
            <strong>
              {WEATHER[a.weather].name} over {port}.
            </strong>{' '}
            {names} {stillQueued.length === 1 ? 'has' : 'have'} more trips queued there.{' '}
            <button
              onClick={() => {
                act((g) => stillQueued.reduce((acc, id) => recallBoat(acc, id), g))
                setAlerts((xs) => xs.filter((x) => x !== a))
              }}
            >
              Bring {stillQueued.length === 1 ? 'her' : 'them'} home after this trip
            </button>{' '}
            <button className="secondary" onClick={() => setAlerts((xs) => xs.filter((x) => x !== a))}>
              Keep sailing
            </button>
          </div>
        )
      })}
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
                onSalvage={() => act((g, t) => salvageBoat(g, b.id, t))}
                onRepair={() => act((g) => repairBoat(g, b.id))}
                onSell={() => act((g, t) => sellBoat(g, b.id, t))}
              />
            ))}
          </section>

          <Workshop
            game={game}
            onCraft={(id) => act((g, t) => craftBoat(g, id, t))}
            onScrap={() => act((g) => scrapStandardParts(g))}
            onMelt={(rarity, slot, track) => act((g, t) => meltSpares(g, rarity, slot, track, t))}
          />

          <Shop game={game} onBuy={(id) => act((g, t) => buyBoat(g, id, t))} />

          <HarborLog log={game.log} now={now} />

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
                  className="secondary"
                  onClick={() => {
                    // Debug: jump to the next weather change while present, and check alerts there.
                    const at = weatherChangesAt(clock())
                    advanceClock(at - clock() + 1000)
                    const t = clock()
                    const g = settle(gameRef.current, t)
                    gameRef.current = g
                    setGame(g)
                    setNow(t)
                    checkAlerts(at)
                  }}
                >
                  Next weather
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    act((g) => {
                      // Debug: hand over every piece of a random set the player hasn't built.
                      const sets = craftableClasses().filter((c) => !g.player.ownedBoats.some((b) => b.classId === c.id))
                      const pick = sets[Math.floor(Math.random() * sets.length)]
                      return { ...g, player: { ...g.player, partInventory: [...g.player.partInventory, ...pick.requiredParts] } }
                    })
                  }
                >
                  Grant a set
                </button>
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
