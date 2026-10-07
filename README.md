# Harborline

A cozy boat-shipping tycoon. **Phase 1 prototype:** answers one question — is "assign boat to route, watch it earn" fun with placeholder art?

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
  data/              content as data: boats, ports, routes, economy constants, nicknames
  economy.ts         payout / duration / repair / sell formulas
  rolls.ts           seeded RNG; every random roll lives here
  state.ts           actions (assign, buy, sell, repair) and time settlement
  save.ts            save (de)serialization
src/components/      map, boat card, shipyard
src/storage.ts       localStorage + game clock (the only browser-specific game code)
scripts/sim.ts       balance harness
```

## Phase 1 rules as built

- You start with 500 coins, one small cargo boat (Dinghy Hauler) and one small passenger boat (Water Taxi).
- 5 ports. Every route is a round trip out of the home port, Saltmarsh Quay (distances 6, 10.1, 14.1, 20.2).
- `payout = capacity × demand × distance × 0.8 − fuelPerLeg × 2`. Cargo boats use the route's cargo demand and passenger boats its passenger demand; both are 0.5–1.5 and reroll when a boat arrives. The payout is locked in at departure and credited when the boat reaches the far port.
- Each voyage costs 1–3 condition. Below 50, cargo pays 20% less. Repair costs 2c per point, is instant, and works only for docked boats.
- Sell for 50%. The two starter boats aren't sold in the shop, and you can't sell your last boat.
- All timers are absolute timestamps. Settling is one event-ordered pass with no tick loop.
- **Offline:** voyages already under way finish at full pay. After that, each boat re-runs its last route at 50% until 8h after you left. Hiding the tab counts as leaving.
- The RNG seed and state are stored in the save, so a session can be replayed.

## Pacing targets

Prices are tuned against these targets with `npm run sim`:

| Milestone | Target | Simulated (5s reaction) |
|---|---|---|
| First purchase (a tier-1 Skiff or Launch, 2,000c) | 30–60 min | ~42 min |
| First tier-2 boat (Harbor Skiff / Harbor Ferry, 22,000c) | 4–5 h | ~4.0 h with 8 tier-1 boats, ~5.2 h with 4 |

Tiers 3–4 keep the spec's ~3.5× price step and are not tuned yet.
