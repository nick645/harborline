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
  craftableClasses,
  craftBoat,
  newGame,
  quoteVoyage,
  repairBoat,
  salvageBoat,
  salvageQuote,
  scrapStandardParts,
  settleAway,
  shopClasses,
} from '../src/game/state'
import { getBoatClass, repairCostPerPoint } from '../src/game/economy'
import { getPart, hasParts } from '../src/game/parts'
import { ROUTES } from '../src/game/data/routes'
import { LOW_CONDITION_THRESHOLD, STARTING_COINS, WEAR_MULTIPLIERS } from '../src/game/data/economy'
import { WEATHER } from '../src/game/data/weather'

const args = parseArgs(process.argv.slice(2))
const MINUTES = Number(args.minutes ?? 360)
const SEEDS = Number(args.seeds ?? 100)
const REACTION_MS = Number(args.reaction ?? 5) * 1000
/** Trips queued per send: a number, or 'tank' for a full tank. */
const TRIPS = args.trips ?? 'tank'
const DAY_MS = 24 * 3600_000

type Strategy = { name: string; describe: string; pickPurchase: (s: GameState) => string | null }

/** The bot's shipyard: coin-bought commons. Rare boats it buys only when it holds the part. */
const commons = () => shopClasses().filter((c) => c.rarity === 'common')
const byPriceDesc = () => [...commons()].sort((a, b) => b.price - a.price)
const maxTier = (s: GameState) => Math.max(...s.player.ownedBoats.map((b) => getBoatClass(b.classId).sizeTier))

const nextTierClass = (s: GameState) =>
  commons()
    .filter((c) => c.sizeTier > maxTier(s))
    .sort((a, b) => a.price - b.price)[0]
const fleetTierCount = (s: GameState, tier: number) =>
  s.player.ownedBoats.filter((b) => getBoatClass(b.classId).sizeTier === tier).length

/** Fill the current top tier up to `width` boats, then save for the next tier. */
function buyWideThenClimb(s: GameState, width: number): string | null {
  const tier = maxTier(s)
  if (fleetTierCount(s, tier) < width) {
    const sameTier = commons().filter((c) => c.sizeTier === tier).sort((a, b) => a.price - b.price)[0]
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
  lostTrips: number
  rareParts: number
  legendaryParts: number
  mythicParts: number
  crafted: number
}

/** Worst plausible damage for one trip in this weather at this condition (top of the ±50% roll). */
function worstDamage(weather: keyof typeof WEATHER, condition: number) {
  const mult = WEAR_MULTIPLIERS.find((w) => condition < w.below)?.mult ?? 1
  return WEATHER[weather].conditionCost * 1.5 * mult
}

function playOneTurn(s: GameState, strat: Strategy, t: number): GameState {
  s = scrapStandardParts(s)
  for (const cls of craftableClasses()) {
    if (hasParts(s.player.partInventory, cls.requiredParts)) s = craftBoat(s, cls.id, t)
  }
  // Buy first so a new boat can sail this turn.
  for (let id = strat.pickPurchase(s); id; id = strat.pickPurchase(s)) s = buyBoat(s, id, t)

  for (const boat of s.player.ownedBoats) {
    if (boat.state === 'sunk' && s.player.coins >= salvageQuote(s, boat.id)) s = salvageBoat(s, boat.id, t)
  }
  for (const boat of s.player.ownedBoats) {
    if (boat.state !== 'idle') continue
    if (boat.condition < LOW_CONDITION_THRESHOLD) s = repairBoat(s, boat.id)
    const condition = s.player.ownedBoats.find((b) => b.id === boat.id)!.condition
    const perPoint = repairCostPerPoint()
    // Risk-aware: expected pay after loss risk and repair bill, per minute; never risk a sinking.
    const options = ROUTES.map((r) => ({ r, q: quoteVoyage(s, boat.id, r.id, t) }))
      .filter(({ q }) => !q.blocked && condition - worstDamage(q.weather, condition) > 0)
      .map(({ r, q }) => ({
        r,
        q,
        score: (q.payout * (1 - q.lossRisk) - WEATHER[q.weather].conditionCost * perPoint) / q.durationMs,
      }))
      .sort((a, b) => b.score - a.score)
    const best = options[0]
    if (!best || best.q.payout <= 0) continue
    const tank = getBoatClass(boat.classId).fuelTankTrips
    const trips = TRIPS === 'tank' ? tank : Math.min(tank, Number(TRIPS))
    s = assignRoute(s, boat.id, best.r.id, t, trips)
  }
  return s
}

function run(seed: number, strat: Strategy): RunResult {
  // Spread starts across the 4-week season cycle so winters are represented.
  const T0 = (seed % 28) * DAY_MS
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
    lostTrips: 0,
    rareParts: 0,
    legendaryParts: 0,
    mythicParts: 0,
    crafted: 0,
  }
  let spent = 0
  let t = T0
  while (t <= end) {
    const step = settleAway(s, t)
    s = step.state
    res.sinkings += step.report.sunk.length
    res.lostTrips += step.report.lost.length
    for (const id of step.report.parts) {
      const r = getPart(id).rarity
      if (r === 'rare') res.rareParts++
      if (r === 'legendary') res.legendaryParts++
      if (r === 'mythic') res.mythicParts++
    }
    const before = s.player.coins
    const boatsBefore = s.player.ownedBoats.length
    s = playOneTurn(s, strat, t)
    spent += Math.max(0, before - s.player.coins)

    const min = (t - T0) / 60_000
    if (res.firstPurchaseMin === null && s.player.ownedBoats.length > boatsBefore) res.firstPurchaseMin = min
    const tier = maxTier(s)
    for (let k = 2; k <= tier; k++) res.tierReachedMin[k] ??= min

    // Wake at the next boat event, or when the weather turns if every boat is waiting it out.
    const etas = s.player.ownedBoats.map((b) => b.etaMs).filter((x): x is number => x !== null)
    const next = etas.length ? Math.min(...etas) : Math.ceil((t + 1) / (10 * 60_000)) * 10 * 60_000
    t = next + REACTION_MS
  }
  s = settleAway(s, end).state
  res.crafted = s.player.ownedBoats.filter((b) => ['legendary', 'mythic'].includes(getBoatClass(b.classId).rarity)).length
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
  row('trips lost to weather', results.map((r) => r.lostTrips), '  ')
  row('rare parts found', results.map((r) => r.rareParts), '  ')
  row('legendary parts found', results.map((r) => r.legendaryParts), '  ')
  row('mythic parts found', results.map((r) => r.mythicParts), '  ')
  row('legendaries crafted', results.map((r) => r.crafted), '  ')
  console.log()
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] ?? ''
  }
  return out
}
