# Harborline

A cozy boat-shipping tycoon about risk at sea: storms pay, storms sink, and the rarest hulls only come out of bad weather.

**Built so far:** Phase 1 (core loop), Phase 2 (full catalog, parts, set crafting), Phase 3 (weather, seasons, storm alerts, storm balance) and Phase 4 (captains, recruiting, port upgrades, delegation).

Single-player, offline, no network calls. Plain web app (Vite + React + TypeScript) so the loop can be iterated without device builds; the game logic is framework-free and moves to Expo unchanged.

## Run

```bash
npm install
npm run dev        # play at http://localhost:5173  (add ?debug for time-skip + reset)
npm test           # unit tests for the game logic
npm run sim        # balance harness: 6 h of simulated play × 100 seeds
npm run sim -- --mode storms --minutes 1200   # how play styles fare against the weather
```

`npm run sim -- --minutes 600 --seeds 300 --reaction 15` changes session length, seed count, and the bot's reaction time in seconds.

## Phone app (Expo)

`mobile/` is an Expo app that imports the same game logic from `src/game/` (Metro watches `../src`), so the rules can't drift between web and phone.

```bash
cd mobile
npm install
npx expo start          # scan the QR code with Expo Go on your phone (same Wi-Fi)
npx expo start --ios    # or open in the iOS Simulator
```

Install **Expo Go** from the App Store / Play Store first. Saves live on the phone (AsyncStorage) in the same format as the web build.

**Art (direction C, "Lantern"):** warm plum and honey, Cormorant and Barlow type, and light that follows the phone's clock — dawn, day, golden hour, lamplit night — with storms as a cold violet contrast. Scenes are drawn in code with Skia (`mobile/src/art/`) and animate on their own clock (still when Reduce Motion is on):

- **Your boat, live** (tap a boat): side on in the weather of her current trip, bobbing harder in rough water, with wake, funnel smoke, rain and lightning in storms, moored at the pier when docked, a wreck when sunk. Boats are drawn from their class: longer and taller by tier, crates and cranes for cargo, decks of lit windows for passengers, a trim for rarity.
- **Your captain** (tap a captain): at the helm when at sea, at the Gull & Lantern window with a steaming mug when ashore; traits as a logbook — proven inked, rumours pencilled, disproven struck through.
- **The quay** (Captains tab): recruits under the harbour lamps, each with a look generated from their id (the same look everywhere); scouting actions play out as small moments.

The phone app doesn't have the workshop, port upgrades, manager controls or storm notifications yet.

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
  captains.ts        captain generation, scouting, effects, growth and reveals; captainView()
  crew.ts            captain, manager and port-upgrade actions, plus the views the UI reads
  upgrades.ts        port upgrade effects, fleet cap, scout level
  state.ts           actions (send, buy, craft, scrap, melt, repair, salvage) and time settlement
  save.ts            save (de)serialization
src/components/      map, boat card, captains, shipyard, workshop, port, harbor log
src/storage.ts       localStorage + game clock
src/notify.ts        browser notifications for storm alerts
mobile/              Expo phone app sharing src/game
scripts/sim.ts       balance harness
```

## Rules as built

- You start with 500 coins, one small cargo boat (Dinghy Hauler), one small passenger boat (Water Taxi), and one green 1-anchor captain. **Every boat needs a captain to sail**, managed boats included, so the second boat waits for your first hire.
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
- **Wear:** the weather's damage ±50%, ×1.5 below 50 condition and ×2 below 25. Below 50, cargo pays 20% less. Repair is instant, only for docked boats, and costs 0.1% of the boat's value per point (2c minimum): cheap on a skiff, a real bill on a freighter, so cheap boats make the natural storm runners.
- **Storm alerts:** when a route turns rough or stormy and a boat still has trips queued there, the game says so, with a button to bring it home after the current trip. In a background tab this is a system notification (opt in from the header). Only weather that has arrived is reported; seeing it coming is the Weather Radar upgrade's job.
- **Lost cargo:** no pay, no parts, the rest of the queue is cancelled, and the boat limps home at 10 condition.
- **Sinking:** a boat that reaches 0 sinks on the outbound leg. That trip pays nothing, the rest of the queue is cancelled, and the wreck stays on the map until salvaged for 25% of its price (minimum 100c). It comes back at 10 condition. If nothing else is afloat, salvage never costs more than you have.
- **Catalog:** 6 tiers × 2 tracks × 4 rarities. Common boats cost coins; rare boats cost coins plus their own rare part; legendary boats are built from their own 3-piece set; mythic boats come from mythic sets that only drop in storms, and are never sold for any amount. Abilities whose system doesn't exist yet are shown as not active.
- **Parts:** one roll per completed trip, rarest first: mythic 0.05% (storm), legendary 0.5% (rough) / 2% (storm), rare 8% (rough, storm, or tier-4+ boats), standard 25%. Legendary finds favour sets you've started. Standard fittings scrap for 10c; 3 spare copies of a rare-or-better slot melt into a fresh roll of that slot. Building a set is instant and free.
- Sell common and rare boats for 50%; crafted boats can't be sold. The two starter boats aren't in the shop, and you can't sell your last boat.
- All timers are absolute timestamps. Settling is one event-ordered pass with no tick loop.
- **Away time** earns exactly like present time, at full rate, but only for trips already queued. Coming back shows what finished and what sank.
- The RNG seed and state are stored in the save, so a session can be replayed.

## Lost at sea

- When a boat sinks, her captain clings to the wreckage. Raise her within **6 hours** (the clock runs while you're away) or the captain is lost at sea and leaves your roster. The wreck itself stays on the seabed and can still be raised. Bonded captains wait with their ship. With alerts on, the phone warns you an hour before.

## The map

- The chart grows as you sail. You start in **Saltmarsh Bay** (5 ports). Beyond it lie **the Fogbanks**, **Sunward Shoals**, **the Ironcliffs** and **Lantern Reach**: 18 ports in all, villages, towns and cities.
- Each region opens when its chart fills, from completed trips to the outer ports of the region before (calm +1, choppy +2, rough +4, storm +7 points; 150 / 700 / 2,200 / 5,000 to open). The map shows the next region under fog, the ports that chart it, and the progress.
- Every voyage is a round trip from home. Farther ports pay more per trip but take longer; far waters pay slightly less per load so pay per minute stays level. Each region's sea leans its own way: stormy Ironcliffs, calm Shoals, restless Fogbanks.
- **Every open port can be visited**: its town (each region looks different), weather and demand, a quick send for docked boats, and its own quay and tavern, as big as the port (village 2 captains/2 hands, town 3/3, city 5/4). People dress like their region. Watches are shared.
- **Moving home**: buy the harbour office in any charted town or city (25k in the bay up to 2M in Lantern Reach) and your fleet sails from there; upgrades come with you, and moving back to an office you own is free. Every boat must be in port first.

## Your home harbour

- The phone's tabs: **Fleet** (map and boats) · **Captains** (your captains) · **Ports** (every charted port: its town, quay, tavern and harbour office) · **Shipyard** · **Home** (your harbour, upgrades, workshop and log).
- Home is yours to dress: name it, pick wall, roof and sign colours and the bunting, and place decorations on three spots on the quay. Decorations are earned: flower barrels from the start, an old anchor (own three boats), a storm flag (bring a boat home from a storm), a wreck figurehead (raise a sunk boat), a harbour bell (chart new waters), a lantern arch (own a tier 3 boat), a statue (build a legendary or mythic). All cosmetic.
- **Your tavern** too: give it a name (on the quay and over the window), pick its wall panelling, floor and tablecloth, and what hangs on the wall (a ship's wheel, a mounted fish, crossed oars, a painting, an old flag). Other ports keep their region's tavern.
- Port upgrades show in the scene (slipway, mooring posts, fuel tanks, salvage crane, scout hut, radar mast), and your captains ashore wander the quay.

## Deckhands and the tavern

- A boat of tier *t* needs *t − 1* deckhands (none on tier 1, five on a tier-6). They're found at the tavern (4 at home; someone new comes in whenever one signs) and courted like captains (see Courting crew). Signing one onto a boat is a one-off fee of 5% of the boat's tier price; there are no wages.
- Short-handed boats still sail, but each missing hand makes trips 20% longer. A full crew takes 15% less hull damage in rough water and storms (tier 2+ only). Managers hire hands from the tavern for the boats they run.
- Each hand has **one hidden trait**: *Steady in a blow* (−8% hull damage in rough water and storms), *Quick on the lines* (−5% trip time), *Easy on the fuel* (−10% fuel), *Green* (nothing yet) or *Butterfingers* (+6% hull damage). The tavern talk about them is right 70% of the time. **Buying them a drink** (1 watch, shared with the quay) shows the truth (and what they want), and so do 5 voyages. Quotes only count traits you know.
- **Now and then (1 slot in 10) a rare captain sits by the fire**: two anchors above the best the quay offers you (capped at 5), in a look nobody else wears. Scout and court them like anyone on the quay.

## Courting crew

Nobody joins on the spot. Everyone looking for work, captains and hands, is also being courted by rival lines (Merrow & Daughters, The Gull Street Line, Black Lantern Shipping, Tallow & Brine), and you have to win them over.

- **A bearing and a deadline.** Each person leans between you and their rivals (a compass on their card). Rivals gain ground steadily until the person decides: about 1.5 h for a 1-anchor captain, 3 h for 2, 12 h for 3, 30 h for 4, 60 h for 5, and 3 h for a hand. At their deadline they sign with you if you courted them and are level with or ahead of every rival (paying their fee from your coins), otherwise with the rival they lean toward most. Anyone so sold on you (80+, 20 clear of every rival) signs on the spot.
- **What they want.** Captains want two or three things (hands one): good pay, a fine ship, a line that comes home, storm work, staying close to home, a proper harbour, good company. The quay says what one of them is (right 70% of the time).
- **Winning them over.** *Stand them a drink* (1 watch; once per watch period; they tell you one thing they want, and a hand shows what they're really like). *Walk them round your harbour* (free): counts for anyone who wants a line that comes home (no boat lost in 3 days, or it counts against you), storm work (storm trips you've completed), close to home (your home port is in their region), or a proper harbour (upgrade levels and decorations). *Show them a boat* (free): your best docked boat they'd sail on, which counts with anyone who wants a fine ship (more for bigger and rarer). *Better terms* (twice at most): +25% on their fee each time, which counts for a lot with anyone who wants good pay. Aimed at what they want, an effort moves them a long way; otherwise only a little.
- **Hands who choose you** join your biggest boat short of hands; if she's at sea they wait at home and come aboard when she docks.
- **A new game** starts with one keen 1-anchor captain on the quay who already leans your way: a drink and a walk round the harbour win them over.
- **Managers don't court:** they sign only people the rival lines haven't got a hold on yet.

## Captains

Every captain starts mostly unknown. Only the sea tells you who they really are.

- **On the quay** (5 recruits; someone new arrives whenever one signs) you see a name, a home port, a **Reputation** of 1–5 anchors, an asking fee, and one dockside rumour. Reputation is right about 70% of the time; the rest are under- or oversold by an anchor. The quay offers captains around your level: 1–2 anchors at tier 1, rising to 3–5 at tier 5+.
- **Reputation decides which boats a captain will take:** 1 anchor sails tiers 1–2, 2 → 1–3, 3 → 2–4, 4 → 3–5, 5 → 4–6. A cruise director won't captain a dinghy, and a deckhand can't take a liner. Every 10 voyages reputation moves an anchor toward the captain's true ability, so a Sleeper works their way up to bigger ships and an overrated captain slips down.
- **Hidden underneath:** skill (1–100), 2–4 traits, a ceiling, and a development style (Steady learner, Quick study, Late bloomer, Peaked). None of these ever reach the UI directly; a test enforces it.
- **Scouting spends watches** (6 per pool at scout level 1, +2 per level): *Ask around the docks* (1) adds a trait rumour that's right 60–85% of the time by scout level; *Read their logbook* (2) gives a skill range 60→10 points wide, never exact; *Take them out on a run* (3) gives a verdict — **Sleeper**, **All talk**, or **True to form** — and another rumour.
- **Fees follow reputation, not skill**, so Sleepers are bargains. Letting a captain go costs severance that grows with voyages served.
- **At sea:** skill 50 is neutral; 100 pays +20% and takes −15% storm damage. Every 5 voyages the skill range narrows and a trait the sea has tested may prove itself (storm traits only show in storms); rumours of traits they don't have fall apart once tested; the development style shows after 30 voyages. A superstitious captain gives themselves away by refusing to sail into a storm.
- **Traits:** Steady, Reckless, Beloved, Green, Superstitious, Lucky (rare), Navigator, Thrifty, Heavy-handed, Fair-weather, Night owl, Haggler.
- **Desk jobs:** a captain with 100+ voyages can be promoted — Dockhand (1 tier 1–2 boat, from tier 3), Harbormaster (up to 6 boats below your top tier, from tier 4), Fleet Manager (a whole track below your top tier, from tier 5). Managed boats re-run their last route at 85% pay, wait out rough water, repair themselves, find no rare parts, and keep working while you're away. Managers also crew the boats they run: they put a captain who's ashore aboard, or hire from the quay (best reputation that fits, within a quarter of the boat's value), and let go captains they hired who prove poor or outgrow the boat. Those captains are on your roster marked "hired by"; **Take over** one and their manager leaves them alone, or switch a manager's crew handling off entirely.

## Port upgrades

Six, three levels each (level 2 costs 3× level 1, level 3 costs 9×): Dry Dock (repairs −15/27/40%), Berths (+1/2/3 boats), Weather Radar (see 1/2/3 weather changes ahead, with storm alerts that much earlier), Fuel Depot (fuel −10/17/25%), Salvage Yard (+1/2/3% standard and rare parts), Scout Office (+1/1/2 scout levels). The harbour holds 6 boats at tier 1, growing with the tier you reach (to 40 at tier 6); stepping up a tier always fits.

## Pacing targets

Prices are tuned against these targets with `npm run sim`:

| Milestone | Target | Simulated (risk-aware bot, full-tank sends) |
|---|---|---|
| First purchase (a tier-1 Skiff or Launch, 2,000c) | 30–60 min | ~48 min |
| First tier-2 boat (Harbor Skiff / Harbor Ferry, 22,000c) | 4–5 h | ~4.9 h building wide, ~5.4 h with 4 (captain fees now part of the cost) |

Tiers 3–6 keep the spec's ~3.5× price step and are not tuned yet. Over 6 h the bot finds ~10–20 rare parts and 1–2 legendary pieces.

## Storm balance

`npm run sim -- --mode storms --minutes 1200 --seeds 30`: 20 h of play, all buying wide, differing only in how they treat the weather (the bot heeds storm alerts unless it is chasing storms):

| Style | Median coins | Legendary pieces | Sets built | Sinkings |
|---|---|---|---|---|
| Avoid rough water | 590k | 0 | 0 | 0 |
| Best risk-adjusted pay | 636k | 4 | 0 | 0 |
| Storm-bait (starters only) | 514k | 10 | 1 | 0 |
| Everything into storms | 365k | 35 | 6 | 23 |

Storms trade coins and progress for parts: the spec's "viable but slow" cheap-boat strategy sits in the middle.
