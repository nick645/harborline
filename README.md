# Harborline

A cozy boat-shipping tycoon about risk at sea: storms pay, storms sink, and the rarest hulls only come out of bad weather.

**Built so far:** Phase 1 (core loop) and Phase 2 (full catalog, parts, set crafting), with Phase 3's weather pulled forward because it is where rare parts come from.

Single-player, offline, no network calls. Plain web app (Vite + React + TypeScript) so the loop can be iterated without device builds; the game logic is framework-free and moves to Expo unchanged.

## Run

```bash
npm install
npm run dev        # play at http://localhost:5173  (add ?debug for time-skip + reset)
npm test           # unit tests for the game logic
npm run sim        # balance harness: 6 h of simulated play × 100 seeds
```

`npm run sim -- --minutes 600 --seeds 300 --reaction 15` changes session length, seed count, and the bot's reaction time in seconds.

## Layout

```
src/game/            pure game logic — no React imports
  types.ts           all entities, including Phase 2–4 fields (present, unused)
  data/              content as data: boats, parts, weather, ports, routes, economy constants
  abilities.ts       one registry: abilityId → hooks (new boat = new entry, no logic changes)
  weather.ts         route weather + seasons as pure functions of (seed, route, time)
  parts.ts           part lookup, drop odds, set picking
  economy.ts         payout / duration / repair / sell / salvage formulas
  rolls.ts           seeded RNG; every random roll lives here
  state.ts           actions (send, buy, craft, scrap, melt, repair, salvage) and time settlement
  save.ts            save (de)serialization
src/components/      map, boat card, shipyard, workshop, harbor log
src/storage.ts       localStorage + game clock (the only browser-specific game code)
scripts/sim.ts       balance harness
```

## Rules as built

- You start with 500 coins, one small cargo boat (Dinghy Hauler) and one small passenger boat (Water Taxi).
- 5 ports. Every route is a round trip out of the home port, Saltmarsh Quay (distances 6, 10.1, 14.1, 20.2).
- `payout = capacity × demand × distance × 0.8 − fuelPerLeg × 2`. Cargo boats use the route's cargo demand and passenger boats its passenger demand; both are 0.5–1.5 and reroll when a boat arrives. The payout is locked in at departure and credited when the boat reaches the far port.
- **Queued trips:** send a docked boat on 1–N back-to-back round trips on one route. N is its fuel tank (4 for starters, rising with size). Each trip re-quotes at departure against current demand. When the queue is done the boat docks and waits; there is no auto-pilot. "Return after this trip" cuts a run short.
- **Weather:** each route is Calm, Choppy, Rough or Storm, shifting every 10 minutes and shown on the map before you send a boat. Each trip sails in the weather at its own departure, so a long queue can run into a storm.

  | | Payout | Avg damage | Lose cargo |
  |---|---|---|---|
  | Calm | ×1.0 | 1 | 0% |
  | Choppy | ×1.15 | 3 | 0% |
  | Rough | ×1.3 | 8 | 2% |
  | Storm | ×1.6 | 20 | 8% |

  Seasons last a week each; storms roughly double in winter.
- **Wear:** the weather's damage ±50%, ×1.5 below 50 condition and ×2 below 25. Below 50, cargo pays 20% less. Repair costs 2c per point, is instant, and works only for docked boats.
- **Lost cargo:** no pay, no parts, the rest of the queue is cancelled, and the boat limps home at 10 condition.
- **Sinking:** a boat that reaches 0 sinks on the outbound leg. That trip pays nothing, the rest of the queue is cancelled, and the wreck stays on the map until salvaged for 25% of its price (minimum 100c). It comes back at 10 condition. If nothing else is afloat, salvage never costs more than you have.
- **Catalog:** 6 tiers × 2 tracks × 4 rarities. Common boats cost coins; rare boats cost coins plus their own rare part; legendary boats are built from their own 3-piece set; mythic boats come from mythic sets that only drop in storms, and are never sold for any amount. Abilities whose system doesn't exist yet are shown as not active.
- **Parts:** one roll per completed trip, rarest first: mythic 0.05% (storm), legendary 0.5% (rough) / 2% (storm), rare 8% (rough, storm, or tier-4+ boats), standard 25%. Legendary finds favour sets you've started. Standard fittings scrap for 10c; 3 spare copies of a rare-or-better slot melt into a fresh roll of that slot. Building a set is instant and free.
- Sell common and rare boats for 50%; crafted boats can't be sold. The two starter boats aren't in the shop, and you can't sell your last boat.
- All timers are absolute timestamps. Settling is one event-ordered pass with no tick loop.
- **Away time** earns exactly like present time, at full rate, but only for trips already queued. Coming back shows what finished and what sank.
- The RNG seed and state are stored in the save, so a session can be replayed.

## Pacing targets

Prices are tuned against these targets with `npm run sim`:

| Milestone | Target | Simulated (risk-aware bot, full-tank sends) |
|---|---|---|
| First purchase (a tier-1 Skiff or Launch, 2,000c) | 30–60 min | ~41 min |
| First tier-2 boat (Harbor Skiff / Harbor Ferry, 22,000c) | 4–5 h | ~3.9 h with 8 tier-1 boats, ~5.2 h with 4 |

Tiers 3–6 keep the spec's ~3.5× price step and are not tuned yet. Over 6 h the bot finds ~10–20 rare parts and 1–2 legendary pieces.
