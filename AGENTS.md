# Harborline — context for coding agents

A cozy boat-shipping tycoon about risk at sea: storms pay, storms sink, and the rarest hulls only
come out of bad weather. Single-player and offline (no accounts, no server, no network calls).
`README.md` documents the rules as built; this file is what an agent needs to work here.

## Status

- Spec phases 1–4 are built (core loop, catalog + parts + crafting, weather/storms, captains + port
  upgrades + delegation), in the web app and its tests.
- **The game is mobile only.** `mobile/` (Expo SDK 57, "Lantern" art style) is the product; the
  web UI in `src/App.tsx` and `src/components/` is the old prototype and gets no new work.
  `src/game/` stays: it is the shared logic the phone runs, with its tests and the sim.
- The phone runs as an Expo **dev build** (not Expo Go). Storm alerts are local notifications
  scheduled when the app goes to the background (`upcomingAlerts` in `src/game/alerts.ts`) and
  withdrawn when it returns. The Log tab has dev-only play-test tools.
- Everything left in the spec (friend trading, seasons/leaderboards, monetization) needs a backend.
  Don't start it without asking.
- The original spec and boat catalog PDFs are the user's (not in the repo). Where a number is
  missing, ask rather than invent one; where you must pick, say so plainly.

## Run

Node is installed per-user, not on PATH: prefix commands with `PATH="$HOME/.local/node/bin:$PATH"`.

```bash
npm test                    # vitest: game logic
npm run lint                # oxlint (covers mobile/ too)
npx tsc -b                  # typecheck web + scripts
npm run sim                 # balance harness (pacing); --mode storms compares weather play styles
cd mobile && npx expo start --dev-client   # dev server the installed app loads from (port 8081)
cd mobile && npx tsc --noEmit              # typecheck the phone app
```

Native builds (`cd mobile && npx expo run:ios --device <UDID>`; `xcrun devicectl list devices`
lists the user's iPhone and the simulators):

- Export `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` and put `/opt/homebrew/bin` on PATH, or CocoaPods
  crashes. Rebuild only when native config changes (plugins, packages); JS reloads live.
- `ios/` is generated and git-ignored; native fixes live as config plugins in `mobile/plugins/`
  (scene life cycle for iOS 27; no push entitlement, which the free Apple team can't sign).
- Free-team builds expire after 7 days: rebuild to the phone when the user says it stopped opening.

Before calling work done: tests, both typechecks and lint pass. After changing pacing, economy or
captains, re-run `npm run sim` and report the numbers against the targets below.

## Layout

```
src/game/      pure game logic, NO React or browser APIs — shared by web and phone
  data/        content as data: boats, parts, weather, ports, routes, economy, captains,
               upgrades, managers. A new boat/trait/upgrade should be data, not code.
  abilities.ts boat abilities: abilityId → hooks (one registry)
  captains.ts  generation, scouting, effects, growth/reveals, captainView()
  crew.ts      captain/manager/upgrade actions + the views the UI reads
  state.ts     core actions and settle(); weather.ts, parts.ts, economy.ts, upgrades.ts, rolls.ts
src/           web UI (React + Vite); storage.ts, notify.ts are the only browser-specific bits
scripts/sim.ts balance harness
mobile/        Expo app; mobile/src/art = Skia scenes, theme.ts = Lantern palette and fonts
```

## Rules that must hold

- Game logic is pure: every action takes a state and returns a new one (`structuredClone`); never
  mutate the input. UI code calls actions; it never edits state directly (debug tools aside).
- All timers are absolute timestamps. Catching up after any gap is one event-ordered `settle()`
  pass — never a tick loop.
- Every random roll goes through `rolls.ts` with the seeded RNG stored in the save. Weather is a
  pure hash of (seed, route, time slot), so past/future weather needs no stored history.
- Captains' hidden truth (`trueSkill`, `ceiling`, `hiddenTraits`, unknown development) never
  reaches UI code: components use `captainView()` and quotes with view `'known'` (the default).
  A test scans `src/App.tsx` and `src/components/` for hidden fields; keep the phone app to the
  same rule.
- Mythic boats are never purchasable, for any amount, in any form. Legendary/mythic boats are
  only crafted from their exact part set.
- Bump `SAVE_VERSION` in `state.ts` when the save shape changes (old saves then start fresh).

## Design decisions the user made (they override the spec)

- Start: 500 coins, a Dinghy Hauler (cargo) and a Water Taxi (passenger), and ONE 1-anchor
  captain. Every boat needs a captain to sail, managed boats included.
- Pacing targets: first purchase (a tier-1 boat) after 30–60 min of play; first tier-2 boat after
  4–5 h. Tier-1 boats cost 2,000c, tier-2 22,000c.
- No auto-pilot for hand-run boats: players queue 1..N trips (N = fuel tank); trips run at full
  rate while away, then the boat docks and waits. Managed boats are the exception (85% pay, avoid
  rough water, no rare parts, keep working while away).
- Damage is non-linear (weather cost ±50%, worse below 50/25 condition). At 0 a boat sinks and is
  salvaged for a fee. Repairs cost 0.1% of boat value per point.
- No automatic queue guard: players get a storm alert when a route they have trips queued on turns
  rough or stormy. Only weather that has arrived is reported; seeing ahead is Weather Radar's job.
- Standard parts scrap for coins. Berths raise a fleet cap (6 at tier 1, growing with tier;
  stepping up a tier always fits).
- Captains (the user called this "incredibly important"): Reputation in anchors, usually right;
  hidden skill/traits/ceiling/development revealed at sea; scouting spends **watches**; verdicts
  are **Sleeper / All talk / True to form**. Reputation limits boat tiers (rep r sails r−1..r+1)
  and drifts toward true ability every 10 voyages. The quay offers captains around your level.
  Managers hire and fire crew for their boats; the player can take over or switch that off.
- The map (user-approved 2026-10-18): 5 regions / 18 ports (`data/ports.ts`), opened by charting at
  sea (trips to the prior region's outer ports; stormier = faster); round trips from home; every
  port has a quay and tavern sized by population, people dressed by region; home can be moved to
  any charted town or city (harbour office, price by region). Chart sizes, pay discount and home
  prices are Claude's picks. Sim (wide, 40 h): tier 2 at 4.6 h; Fogbanks 1.7 h, Sunward 7 h,
  Ironcliffs 24 h, Lantern Reach > 40 h.
- Phone tabs (user-approved 2026-10-18): Fleet · Captains (your roster) · Ports (chips for every
  charted port → town, quay, tavern, harbour office) · Shipyard · Home (customizable harbour:
  name, colours, bunting, earned decorations in 3 spots, upgrades drawn in the scene, captains
  ashore; your own tavern: name, panelling, floor, tablecloth, wall hanging; then upgrades,
  workshop, log). Home customization is cosmetic (`src/game/home.ts`).
- Lost at sea (user-approved 2026-10-16): a sunk boat's captain is lost if she isn't raised within
  6 h (absolute time, runs while away); the wreck stays salvageable; bonded captains are spared;
  managed boats get no exception. Phone warns 1 h before; the sunk boat shows an underwater scene.
- Deckhands (user-approved 2026-10-16): tier t needs t − 1; one-off fee of 5% of tier price per
  hand, no wages; short-handed = +20% trip time per missing hand, never blocked; managers hire
  them. Since 2026-10-18 they're characters hired at the tavern, each with one hidden trait
  (`data/hands.ts`; rumour 70% right, a drink for 1 watch or 5 voyages reveals it; numbers are
  Claude's picks). The tavern also has a rare captain 1 slot in 10, +2 anchors over the quay,
  with a distinct look (`lookFor(id, rare)`). Sim: first tier 2 unchanged at ~4.85 h, tier 3 13.5 → 13.8 h.
  Full crew: −15% hull damage in rough/storm, tier 2+ only (all-in storm chasers: sinkings
  14 → 12, coins +8%; pacing unchanged).

- Courting crew (user-approved 2026-10-19): everyone looking for work is courted by named rival
  lines and decides at a deadline (by anchors: 1.5 h … 60 h; hands 3 h), signing with you only if
  you courted them and are level with every rival; hidden wants, learned over a drink, decide
  what moves them; fees stay, better terms raise them. Numbers in `data/courting.ts` are Claude's
  picks. A new game has one keen captain who's easy to win. Managers don't court. Sim (wide,
  6 h): first purchase 50 → 58 min, tier 2 4.6 → 4.8 h; 40 h: tier 4 31.8 → 33.3 h.

## Originality

The user does not want this to read as a copy of Pocket Planes or of EA's college football
recruiting. Lead with what's ours (storms, sinking, mythics, captains). Avoid job boards,
class-locked ports, premium-currency assembly fees, "crew" social groups, and the words
stars/diamonds/gem/bust/hours for captains. Use original names and copy; no real ships or people.

## Art (direction C, "Lantern")

Warm plum and honey with amber lamplight, Cormorant (titles) and Barlow (body). Light follows the
device clock: dawn 5–8, day 8–17, golden hour 17–20, lamplit night otherwise. Storms are a cold
violet with magenta lightning, a deliberate contrast to the warm harbour. Scenes are drawn in code
(Skia on the phone), not pixel art, animate on their own clock, and hold still with Reduce Motion.
Living scenes: your boat live, your captain (helm at sea / tavern ashore, traits as a logbook), the
scouting quay. Mockups: https://claude.ai/artifact/84vbBnBj5FVLDaowMeJxys

## Working with the user

- Commit when a piece of work is done; push to `main` only when the user says so (they usually do).
- Ask before decisions that change how the game plays; present options with a recommendation.
- Stop dev servers and simulators you started when asked; don't leave a second copy of the game
  open on the same origin (saves clobber each other — test on another port).
- Report balance with simulator numbers against the targets, not impressions.
