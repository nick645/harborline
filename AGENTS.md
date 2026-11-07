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
npx tsx scripts/check-map.ts # the chart: every sea lane from home at sea, every port on a shore
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
  If Expo's run fails with "No profiles for 'com.nick645.harborline'", build with Xcode so it can
  renew the profile: `xcodebuild -workspace ios/Harborline.xcworkspace -scheme Harborline
  -destination id=<UDID> -derivedDataPath ios/build -allowProvisioningUpdates build`, then
  `xcrun devicectl device install app --device <UDID> ios/build/Build/Products/Debug-iphoneos/Harborline.app`.
- Expo's native modules build from source (`plugins/withSourceBuiltModules`), so Xcode updates
  don't break the build. After an Xcode update, if ExpoModulesJSI fails with a Swift version
  mismatch, clear its stale cache: `bash node_modules/expo-modules-jsi/apple/scripts/clear-caches.sh`.

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

- Start (user-approved 2026-11-03): no boats and no captain, just 750 coins. Wick the
  harbourmaster walks a new player through it (`src/game/guide.ts`, phone `guideLine.ts`): buy a
  starter (Dinghy Hauler or Water Taxi, 400c, sold only as a first boat), court the keen captain on
  the quay (drink, then a walk round the harbour), sign them, put them aboard, send her out, then
  buy the cottage on the quay (150c, `buyHome`). No skipping; the sea chart is under cloud until
  the first boat sails, and the Home tab is shut until the walk-through reaches it. When
  the first boat sails, Wick gives you his old boat (the other starter), and the quay keeps a keen
  captain (half fee) until a new harbour has two. Every boat needs a captain to sail, managed boats
  included. Starter capacity 5 and the half fee are Claude's picks to hold pacing: sim (6 h) first
  purchase 59 → 55 min, tier 2 5.3 → 4.9 h (settle-in) / 4.9 → 4.7 h (wide), with the cottage.
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

- Skills and ranks (user-approved 2026-10-19): five sea skills (Helm, Charts, Trade, Nerve,
  Command) on a greyed-out page that scouting fills in a skill at a time; a lodestone marks
  Legend or Mythic potential (much likelier for the tavern's unusual captains); skills grow by
  doing; Legend (overall 90) and Mythic (96) are ranks above five anchors with signature
  abilities. Numbers are Claude's picks. Sim (wide, 6 h): tier 2 4.8 → 4.96 h, first purchase
  58 → 60 min (both at the edge of their targets).
- Legend and Mythic looks (user-approved 2026-10-20): 20 Legend and 10 Mythic personas
  (`src/game/data/personas.ts` names them; `mobile/src/art/personas.ts` + `Flourish.tsx` draw
  them). A persona keeps the captain's face and replaces outfit, props, companions and effects.
  The dev tools' gallery shows them ten at a time (thirty animated figures at once blanks Skia).

- Keepsakes (user-approved 2026-10-29): a new harbour is a bare cottage and plain tavern; every
  other look is a keepsake hand-run boats bring home, each from one region's waters, rarest in
  storms (`data/keepsakes.ts`; odds, names and which waters are Claude's picks). Quay
  decorations keep their milestones. Sim (wide): ~15 found by 6 h, ~55 of 66 by 40 h.
- Sound (user-approved 2026-11-03): everything synthesized in code by `scripts/audio.ts` (committed
  WAVs in `mobile/assets/audio/`), music by time and weather (day / night / storm), ambience by
  place, effects from log entries and actions (`mobile/src/sound/`). On by default, silent switch
  mutes, mixes with other apps. Needs `expo-audio` (native: rebuild after adding it).

- Climates and ports (user-approved 2026-11-03): each region has a climate (`climate` in
  `data/ports.ts`): the bay temperate, the Fogbanks a rainy pine-forest coast, Sunward tropical
  (calm, but summer squalls), the Ironcliffs snow (worst in winter), Lantern Reach a desert coast
  (glassy seas, sandstorms). Weather odds lean by climate and season; scenes draw rain, snow or
  dust and alerts name it (a squall, a blizzard, a sandstorm). Every port is its own town with a
  landmark (`mobile/src/art/port/`), and leans to cargo or passengers (×1.1/×0.9) with a weekly
  market day (×1.4) in `data/portLife.ts`. Numbers are Claude's picks. Sim (6 h): first purchase
  48 min, tier 2 4.4 h (settle-in) / 4.2 h (wide); 40 h (wide): tier 3 11.4 h, tier 4 29.4 h,
  Sunward 7 h, Ironcliffs 26 h.

- The chart (user-approved 2026-11-03): a mainland coast (temperate west and south, forest in
  the north-west, tropical then desert to the east), a snowy northern coast with Frostgate's
  fjord, and islands for the other ports (`mobile/src/map/geography.ts`; shapes are Claude's).
  Ports keep their positions; islands fit themselves clear of every lane from Saltmarsh, and
  `scripts/check-map.ts` checks it. Uncharted regions lie under cloud. Pinch to zoom, drag to pan.

- Captain growth (user-approved 2026-11-06): the captain page leads with a sea rating (best guess
  from what you've learned, by reputation until then) and a potential bar marking Legend 90 and
  Mythic 96 that narrows as you learn them (`growthOf` in captains.ts; user-approved 2026-11-07):
  at first the most an ordinary captain could reach (rating + 40, at most 88), then a rough ±5
  range once scouted or after 20 voyages, then their exact highest at 40. Badges (`data/badges.ts`):
  Storm Hand, Long Hauler, Market Trader, Steady Keel, Old Salt, Chart-maker, three levels each,
  earned at sea, never hidden. Grades once known: Pearl of the fleet, Seasoned, Able, Driftwood,
  Barnacle. Tabs: Skills, Badges, Record, Log, Orders. Numbers and names are Claude's picks. Sim
  (6 h): tier 2 4.4 → 4.1 h (settle-in), 4.2 → 4.0 h (wide).

- Boats at sea (user-approved 2026-11-06): three views, Ship · Deck · Helm. Deck: passengers
  strolling, tap for chatter; Helm: inside the wheelhouse, tap the wheel to steady her and the
  captain to hear them (`mobile/src/chatter.ts`, known facts only). Flotsam drifts past; tap it
  for a small find (`src/game/flotsam.ts`: 5–15% of the trip's pay, sometimes a fitting, rarely
  a keepsake, better in storms, one per boat per 10 min). Numbers are Claude's picks.

- Telling the player (user-approved 2026-11-06): the welcome-back card is a full summary (trips'
  pay and spending, finds by name with set progress, fittings counted, who signed or went to
  rivals, prospects leaning your way, badges and rank/reputation rises, charting, losses). While
  playing, rare-or-better finds get a banner that opens the Workshop. Find alerts (their own
  switch) notify while away: the seeded game is run forward on a copy to see what comes home when.
  Send cards show what each weather is good for (`src/game/upside.ts`).

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
