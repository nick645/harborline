// The game loop on the phone. Same rules as the web build: settle on a tick while the app is
// open, save after every action, and when the app comes back to the foreground settle the
// whole gap at once and report what happened while you were away.

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import type { AwayReport, GameState } from '../../src/game/types'
import { GameError, newGame, settle, settleAway } from '../../src/game/state'
import { randomSeed } from '../../src/game/rolls'
import { clearSave, loadGame, saveGame } from './storage'

const TICK_MS = 500
const AUTOSAVE_MS = 5000

export const worthReporting = (r: AwayReport) => r.tripsCompleted > 0 || r.sunk.length > 0 || r.lost.length > 0

export function useGame() {
  const [game, setGame] = useState<GameState | null>(null)
  const [now, setNow] = useState(Date.now)
  const [report, setReport] = useState<AwayReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<GameState | null>(null)

  const commit = useCallback((g: GameState) => {
    ref.current = g
    setGame(g)
  }, [])

  const comeBack = useCallback(() => {
    if (!ref.current) return
    const t = Date.now()
    const { state, report } = settleAway(ref.current, t)
    commit(state)
    setNow(t)
    void saveGame(state)
    if (worthReporting(report)) setReport(report)
  }, [commit])

  // Load the save (or start a new game) once.
  useEffect(() => {
    let cancelled = false
    void loadGame().then((saved) => {
      if (cancelled) return
      const t = Date.now()
      if (!saved) {
        commit(newGame(randomSeed(), t))
        return
      }
      const { state, report } = settleAway(saved, t)
      commit(state)
      if (worthReporting(report)) setReport(report)
    })
    return () => {
      cancelled = true
    }
  }, [commit])

  // Present-time clock while the app is in the foreground.
  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current || AppState.currentState !== 'active') return
      const t = Date.now()
      setNow(t)
      commit(settle(ref.current, t))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [commit])

  // Save on a timer and when leaving; settle the gap when coming back.
  useEffect(() => {
    const id = setInterval(() => ref.current && void saveGame(ref.current), AUTOSAVE_MS)
    const sub = AppState.addEventListener('change', (next) => {
      if (!ref.current) return
      if (next === 'active') comeBack()
      else {
        const g = settle(ref.current, Date.now())
        commit(g)
        void saveGame(g)
      }
    })
    return () => {
      clearInterval(id)
      sub.remove()
    }
  }, [comeBack, commit])

  /** Run a game action against the settled present. Game refusals become a message, not a crash. */
  const act = useCallback(
    (fn: (g: GameState, t: number) => GameState) => {
      if (!ref.current) return
      try {
        const t = Date.now()
        const next = fn(settle(ref.current, t), t)
        commit(next)
        setError(null)
        void saveGame(next)
      } catch (e) {
        if (!(e instanceof GameError)) throw e
        // Some refusals still change things: a captain's trait comes to light.
        if (e.state) {
          commit(e.state)
          void saveGame(e.state)
        }
        setError(e.message)
      }
    },
    [commit],
  )

  const reset = useCallback(async () => {
    await clearSave()
    commit(newGame(randomSeed(), Date.now()))
    setReport(null)
  }, [commit])

  return { game, now, act, error, clearError: () => setError(null), report, clearReport: () => setReport(null), reset }
}
