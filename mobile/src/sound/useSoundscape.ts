// What the harbour sounds like right now, and what just happened: the music follows the clock
// and the weather your boats are in; effects come from new log entries, coins landing, and the
// player's own actions.

import { useEffect, useRef } from 'react'
import type { GameState, LogEntry } from '../../../src/game/types'
import { routeWeather } from '../../../src/game/weather'
import { phaseAt } from '../art/light'
import { justActed, play, setMood, startSound, type Sfx } from './sound'

/** The sound a log entry earns, if any. Ranked: the first in this list wins. */
const RANK: Sfx[] = ['sink', 'rankup', 'thunder', 'find', 'bell', 'signed', 'depart', 'buy', 'coins', 'confirm', 'tap']

function cueFor(e: LogEntry): Sfx | null {
  switch (e.kind) {
    case 'sunk':
      return 'sink'
    case 'lost':
      return 'thunder'
    case 'craft':
      return 'rankup'
    case 'part':
      return 'find'
    case 'captain':
      if (/ now(:|\.)/.test(e.text) && /Mythic|Legend/.test(e.text)) return 'rankup'
      if (/has the makings/.test(e.text)) return 'find'
      if (/chose your line|signed on|hired|came aboard/.test(e.text)) return 'signed'
      return null
    case 'info':
      if (/finished charting/.test(e.text)) return 'bell'
      if (/chose your line|signed on with/.test(e.text)) return 'signed'
      return null
  }
}

const key = (e: LogEntry) => `${e.at}|${e.text}`

/** Entries in `next` that weren't in `prev` (the log grows at the front). */
function newEntries(prev: GameState, next: GameState): LogEntry[] {
  const seen = prev.log[0] ? key(prev.log[0]) : null
  const out: LogEntry[] = []
  for (const e of next.log) {
    if (key(e) === seen) break
    out.push(e)
  }
  return out
}

/** A choice the player just made: what kind of thing it was. */
function actCue(prev: GameState, next: GameState): Sfx {
  if (next.player.coins < prev.player.coins) return 'buy'
  if (next.voyages.length > prev.voyages.length) return 'depart'
  if (next.player.coins > prev.player.coins) return 'coins'
  const { homeStyle: a, ...restA } = prev.player
  const { homeStyle: b, ...restB } = next.player
  // Dressing the house: a light tap per pick, not a chime.
  if (a !== b && JSON.stringify(restA) === JSON.stringify(restB)) return 'tap'
  return 'confirm'
}

export function useSoundscape(game: GameState | null, now: number, alertCount: number) {
  const prev = useRef<GameState | null>(null)

  useEffect(() => {
    void startSound()
  }, [])

  // Music: a storm wherever one of your boats is out in it; otherwise the time of day.
  const stormy = !!game?.voyages.some((v) => routeWeather(game, v.routeId, now) === 'storm')
  const night = phaseAt(now) === 'night'
  useEffect(() => setMood(stormy ? 'storm' : night ? 'night' : 'day'), [stormy, night])

  useEffect(() => {
    const before = prev.current
    prev.current = game
    if (!before || !game || before === game) return
    const cues: Sfx[] = newEntries(before, game).flatMap((e) => cueFor(e) ?? [])
    if (justActed()) cues.push(actCue(before, game))
    else if (game.player.coins > before.player.coins) cues.push('coins')
    const best = RANK.find((s) => cues.includes(s))
    if (best) play(best)
  }, [game])

  useEffect(() => {
    if (alertCount > 0) play('thunder')
  }, [alertCount])
}
