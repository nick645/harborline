// Balance harness: simulates N minutes of attentive play with a few buying strategies
// and reports pacing milestones against the spec's targets.
//
//   npm run sim                       # defaults: 6h, 100 seeds, 5s reaction time
//   npm run sim -- --minutes 600 --seeds 300 --reaction 15 --trips 2
//
// --reaction is how long the player takes to notice a docked boat (seconds); --trips is how
// many trips they queue per send ('tank' = as many as the fuel tank allows).
//
// Event-driven: time jumps straight to the next boat event, so a run takes milliseconds.

import type { GameState } from '../src/game/types'
import {
  assignRoute,
  buyBoat,
  newGame,
  quoteVoyage,
  repairBoat,
  salvageBoat,
  settle,
  shopClasses,
} from '../src/game/state'
import { getBoatClass } from '../src/game/economy'
import { ROUTES } from '../src/game/data/routes'
import { LOW_CONDITION_THRESHOLD, STARTING_COINS } from '../src/game/data/economy'

const args = parseArgs(process.argv.slice(2))
const MINUTES = Number(args.minutes ?? 360)
const SEEDS = Number(args.seeds ?? 100)
const REACTION_MS = Number(args.reaction ?? 5) * 1000
/** Trips queued per send: a number, or 'tank' for a full tank. */
const TRIPS = args.trips ?? 'tank'
const T0 = 0

type Strategy = { name: string; describe: string; pickPurchase: (s: GameState) => string | null }

const byPriceDesc = () => [...shopClasses()].sort((a, b) => b.price - a.price)
const maxTier = (s: GameState) => Math.max(...s.player.ownedBoats.map((b) => getBoatClass(b.classId).sizeTier))

const nextTierClass = (s: GameState) =>
  shopClasses()
    .filter((c) => c.sizeTier > maxTier(s))
    .sort((a, b) => a.price - b.price)[0]
const fleetTierCount = (s: GameState, tier: number) =>
  s.player.ownedBoats.filter((b) => getBoatClass(b.classId).sizeTier === tier).length

/** Fill the current top tier up to `width` boats, then save for the next tier. */
function buyWideThenClimb(s: GameState, width: number): string | null {
  const tier = maxTier(s)
  if (fleetTierCount(s, tier) < width) {
    const sameTier = shopClasses().filter((c) => c.sizeTier === tier).sort((a, b) => a.price - b.price)[0]
    if (sameTier) return s.player.coins >= sameTier.price ? sameTier.id : null
  }
  const target = nextTierClass(s) ?? byPriceDesc()[0]
  return s.player.coins >= target.price ? target.id : null
}

const STRATEGIES: Strategy[] = [
  {
    name: 'settle-in',
    describe: 'buy tier-1 boats up to a fleet of 4, then save for the next tier',
    pickPurchase: (s) => buyWideThenClimb(s, 4),
  },
  {
    name: 'climb',
    describe: 'never buy sideways; save straight for the next tier',
    pickPurchase: (s) => {
      const target = nextTierClass(s) ?? byPriceDesc()[0]
      return s.player.coins >= target.price ? target.id : null
    },
  },
  {
    name: 'wide',
    describe: 'buy tier-1 boats up to a fleet of 8, then save for the next tier',
    pickPurchase: (s) => buyWideThenClimb(s, 8),
  },
]

type RunResult = {
  firstPurchaseMin: number | null
  tierReachedMin: Record<number, number | null>
  finalTier: number
  finalBoats: number
  finalCoins: number
  earnedActive: number
  sinkings: number
}

function playOneTurn(s: GameState, strat: Strategy, t: number): GameState {
  // Buy first so a new boat can sail this turn.
  for (let id = strat.pickPurchase(s); id; id = strat.pickPurchase(s)) s = buyBoat(s, id)

  for (const boat of s.player.ownedBoats) {
    if (boat.state === 'sunk') s = salvageBoat(s, boat.id)
  }
  for (const boat of s.player.ownedBoats) {
    if (boat.state !== 'idle') continue
    if (boat.condition < LOW_CONDITION_THRESHOLD) s = repairBoat(s, boat.id)
    const best = ROUTES.map((r) => ({ r, q: quoteVoyage(s, boat.id, r.id) })).sort(
      (a, b) => b.q.perMinute - a.q.perMinute,
    )[0]
    const tank = getBoatClass(boat.classId).fuelTankTrips
    const trips = TRIPS === 'tank' ? tank : Math.min(tank, Number(TRIPS))
    if (best.q.payout > 0) s = assignRoute(s, boat.id, best.r.id, t, trips)
  }
  return s
}

function run(seed: number, strat: Strategy): RunResult {
  let s = newGame(seed, T0)
  const end = T0 + MINUTES * 60_000
  const res: RunResult = {
    firstPurchaseMin: null,
    tierReachedMin: { 1: 0, 2: null, 3: null, 4: null },
    finalTier: 1,
    finalBoats: 1,
    finalCoins: 0,
    earnedActive: 0,
    sinkings: 0,
  }
  let spent = 0
  let t = T0
  while (t <= end) {
    const sunkBefore = s.player.ownedBoats.filter((b) => b.state === 'sunk').length
    s = settle(s, t)
    res.sinkings += Math.max(0, s.player.ownedBoats.filter((b) => b.state === 'sunk').length - sunkBefore)
    const before = s.player.coins
    const boatsBefore = s.player.ownedBoats.length
    s = playOneTurn(s, strat, t)
    spent += Math.max(0, before - s.player.coins)

    const min = (t - T0) / 60_000
    if (res.firstPurchaseMin === null && s.player.ownedBoats.length > boatsBefore) res.firstPurchaseMin = min
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
  res.earnedActive = s.player.coins + spent - STARTING_COINS
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

console.log(`\nHarborline balance harness — ${MINUTES} min (${(MINUTES / 60).toFixed(1)} h) of play, ${SEEDS} seeds, ${REACTION_MS / 1000}s reaction, trips per send: ${TRIPS}\n`)
console.log('Targets: first purchase (a tier-1 boat) at 30–60 min · first tier-2 boat at 4–5 h (240–300 min)\n')

for (const strat of STRATEGIES) {
  const results = Array.from({ length: SEEDS }, (_, i) => run(i + 1, strat))
  console.log(`${strat.name} — ${strat.describe}`)
  row('first purchase', results.map((r) => r.firstPurchaseMin))
  for (const k of [2, 3, 4]) {
    row(`first tier ${k} boat`, results.map((r) => r.tierReachedMin[k]))
  }
  row('tier at end', results.map((r) => r.finalTier), 'tier')
  row('boats at end', results.map((r) => r.finalBoats), 'boats')
  row('coins earned (active)', results.map((r) => r.earnedActive), 'c')
  row('sinkings', results.map((r) => r.sinkings), '  ')
  console.log()
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] ?? ''
  }
  return out
}
