// Balance harness: simulates N minutes of attentive play with a few buying strategies
// and reports pacing milestones against the spec's targets.
//
//   npm run sim                       # defaults: 20 min, 200 seeds, 2s reaction time
//   npm run sim -- --minutes 40 --seeds 500 --reaction 5
//
// Event-driven: time jumps straight to the next boat event, so a run takes milliseconds.

import type { GameState } from '../src/game/types'
import {
  assignRoute,
  buyBoat,
  newGame,
  quoteVoyage,
  repairBoat,
  settle,
  settleOffline,
  shopClasses,
} from '../src/game/state'
import { getBoatClass } from '../src/game/economy'
import { ROUTES } from '../src/game/data/routes'
import { LOW_CONDITION_THRESHOLD, OFFLINE_CAP_MS } from '../src/game/data/economy'

const args = parseArgs(process.argv.slice(2))
const MINUTES = Number(args.minutes ?? 20)
const SEEDS = Number(args.seeds ?? 200)
const REACTION_MS = Number(args.reaction ?? 2) * 1000
const T0 = 0

type Strategy = { name: string; describe: string; pickPurchase: (s: GameState) => string | null }

const byPriceDesc = () => [...shopClasses()].sort((a, b) => b.price - a.price)
const maxTier = (s: GameState) => Math.max(...s.player.ownedBoats.map((b) => getBoatClass(b.classId).sizeTier))

const STRATEGIES: Strategy[] = [
  {
    name: 'climb',
    describe: 'save for the next tier up; once at the top, buy more of the best',
    pickPurchase: (s) => {
      const next = shopClasses()
        .filter((c) => c.sizeTier > maxTier(s))
        .sort((a, b) => a.price - b.price)[0]
      const target = next ?? byPriceDesc()[0]
      return s.player.coins >= target.price ? target.id : null
    },
  },
  {
    name: 'greedy',
    describe: 'buy the most expensive boat affordable right now',
    pickPurchase: (s) => byPriceDesc().find((c) => c.price <= s.player.coins)?.id ?? null,
  },
  {
    name: 'wide',
    describe: 'fill to 4 boats with Skiffs first, then climb',
    pickPurchase: (s) => {
      if (s.player.ownedBoats.length < 4) return s.player.coins >= 400 ? 'harbor-skiff' : null
      return STRATEGIES[0].pickPurchase(s)
    },
  },
]

type RunResult = {
  firstPurchaseMin: number | null
  fourBoatsMin: number | null
  tierReachedMin: Record<number, number | null>
  finalTier: number
  finalBoats: number
  finalCoins: number
  earnedActive: number
  offlineEarned8h: number
}

function playOneTurn(s: GameState, strat: Strategy, t: number): GameState {
  // Buy first so a new boat can sail this turn.
  for (let id = strat.pickPurchase(s); id; id = strat.pickPurchase(s)) s = buyBoat(s, id)

  for (const boat of s.player.ownedBoats) {
    if (boat.state !== 'idle') continue
    if (boat.condition < LOW_CONDITION_THRESHOLD) s = repairBoat(s, boat.id)
    const best = ROUTES.map((r) => ({ r, q: quoteVoyage(s, boat.id, r.id) })).sort(
      (a, b) => b.q.perMinute - a.q.perMinute,
    )[0]
    if (best.q.payout > 0) s = assignRoute(s, boat.id, best.r.id, t)
  }
  return s
}

function run(seed: number, strat: Strategy): RunResult {
  let s = newGame(seed, T0)
  const end = T0 + MINUTES * 60_000
  const res: RunResult = {
    firstPurchaseMin: null,
    fourBoatsMin: null,
    tierReachedMin: { 1: 0, 2: null, 3: null, 4: null },
    finalTier: 1,
    finalBoats: 1,
    finalCoins: 0,
    earnedActive: 0,
    offlineEarned8h: 0,
  }
  let spent = 0
  let t = T0
  while (t <= end) {
    s = settle(s, t)
    const before = s.player.coins
    const boatsBefore = s.player.ownedBoats.length
    s = playOneTurn(s, strat, t)
    spent += Math.max(0, before - s.player.coins)

    const min = (t - T0) / 60_000
    if (res.firstPurchaseMin === null && s.player.ownedBoats.length > boatsBefore) res.firstPurchaseMin = min
    if (res.fourBoatsMin === null && s.player.ownedBoats.length >= 4) res.fourBoatsMin = min
    const tier = maxTier(s)
    for (let k = 2; k <= tier; k++) res.tierReachedMin[k] ??= min

    const etas = s.player.ownedBoats.map((b) => b.etaMs).filter((x): x is number => x !== null)
    if (etas.length === 0) break // nothing sailing and nothing worth sailing
    t = Math.min(...etas) + REACTION_MS
  }
  s = settle(s, end)
  res.finalTier = maxTier(s)
  res.finalBoats = s.player.ownedBoats.length
  res.finalCoins = s.player.coins
  res.earnedActive = s.player.coins + spent - 500

  // Player closes the app at the end of the session, then comes back after 8h.
  res.offlineEarned8h = settleOffline(s, end + OFFLINE_CAP_MS).report.coinsEarned
  return res
}

// ---------- reporting ----------

function pct(xs: (number | null)[], p: number): string {
  const vals = xs.filter((x): x is number => x !== null).sort((a, b) => a - b)
  if (vals.length === 0) return '   —  '
  const v = vals[Math.min(vals.length - 1, Math.floor(p * vals.length))]
  return v.toFixed(1).padStart(6)
}

function hitRate(xs: (number | null)[]): string {
  const n = xs.filter((x) => x !== null).length
  return `${Math.round((100 * n) / xs.length)}%`.padStart(5)
}

function row(label: string, xs: (number | null)[], unit = 'min') {
  console.log(`  ${label.padEnd(26)} p10 ${pct(xs, 0.1)}  med ${pct(xs, 0.5)}  p90 ${pct(xs, 0.9)} ${unit}  hit ${hitRate(xs)}`)
}

console.log(`\nHarborline balance harness — ${MINUTES} min active play, ${SEEDS} seeds, ${REACTION_MS / 1000}s reaction\n`)
console.log('Spec targets: first purchase ~4 min · 4-boat fleet ~20 min · ~1.5 tiers per 20 min session')
console.log('              offline pays 50%, capped 8h\n')

for (const strat of STRATEGIES) {
  const results = Array.from({ length: SEEDS }, (_, i) => run(i + 1, strat))
  console.log(`${strat.name} — ${strat.describe}`)
  row('first purchase', results.map((r) => r.firstPurchaseMin))
  row('4-boat fleet', results.map((r) => r.fourBoatsMin))
  for (const k of [2, 3, 4]) {
    const name = shopClasses().find((c) => c.sizeTier === k)?.name ?? `tier ${k}`
    row(`tier ${k} (${name})`, results.map((r) => r.tierReachedMin[k]))
  }
  row('tier at end', results.map((r) => r.finalTier), 'tier')
  row('boats at end', results.map((r) => r.finalBoats), 'boats')
  row('coins earned (active)', results.map((r) => r.earnedActive), 'c')
  row('offline 8h earnings', results.map((r) => r.offlineEarned8h), 'c')
  console.log()
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] ?? ''
  }
  return out
}
