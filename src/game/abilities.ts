// Boat abilities. A boat class's abilityId maps to one entry here; game logic only ever
// asks for hooks, so a new boat with a new ability is one entry, not a code change elsewhere.
//
// Abilities whose system doesn't exist yet carry an `inactiveReason` and no hooks.

import type { Boat, BoatClass, GameState, Weather } from './types'
import { BOAT_CLASSES } from './data/boats'

export interface TripContext {
  state: GameState
  boat: Boat
  cls: BoatClass
  routeId: string
  weather: Weather
  /** Departure time (absolute ms). */
  t: number
}

export interface AbilityHooks {
  // ---- this boat's own trips ----
  /** This boat's demand never goes below this. */
  demandFloor?: number
  /** This boat always sells at exactly this demand. */
  demandLock?: number
  demandMult?: (ctx: TripContext) => number
  capacityMult?: (ctx: TripContext) => number
  payoutMult?: (ctx: TripContext) => number
  durationMult?: (ctx: TripContext) => number
  /** Returns a reason when the boat may not leave at time t. */
  departureBlock?: (t: number) => string | null
  /** Adjusts the condition this boat loses on a trip. */
  damage?: (loss: number, ctx: TripContext) => number
  lossRiskMult?: (ctx: TripContext) => number
  /** A lost trip brings the boat straight home instead of a slow limp back. */
  instantReturnOnLoss?: boolean
  extraPartRolls?: (ctx: TripContext) => number
  rareChanceBonus?: number
  legendaryChanceBonus?: (ctx: TripContext) => number
  /** Chance a rare part found aboard comes with a duplicate. */
  rareDuplicateChance?: number
  /** A legendary find delivers every missing piece of the set at once. */
  fullSetOnLegendary?: boolean
  repairCostMult?: number
  /** When this boat arrives, the route's demand rerolls no lower than this. */
  demandRerollFloor?: number
  /** While docked, earns this share of its per-minute rate on its last route at average demand. */
  dockedIncomeShare?: number
  /** Any route this boat is running turns to storm. */
  bringsStorms?: boolean

  // ---- auras on the rest of the fleet ----
  /** While owned: every boat's demand is multiplied by this. */
  fleetDemandMult?: number
  /** While docked at home: every other boat departing home is paid this multiple. */
  dockedPortPayoutMult?: number
  /** While at sea on a route: other boats departing on that route are paid this multiple. */
  sameRoutePayoutMult?: number
}

export interface Ability {
  id: string
  name: string
  description: string
  /** Set when the system this ability needs doesn't exist yet. */
  inactiveReason?: string
  hooks: AbilityHooks
}

const localHour = (t: number) => new Date(t).getHours()
const PHASE_4_CAPTAINS = 'Arrives with captains (Phase 4)'
const PHASE_4_PORTS = 'Arrives with port upgrades (Phase 4)'
const PHASE_4_DELEGATION = 'Arrives with delegation (Phase 4)'

const ABILITIES: Ability[] = [
  // ---- Tier 1 ----
  { id: 'bootlegger', name: 'Contraband hold', description: '+1 part roll on choppy routes', hooks: { extraPartRolls: (c) => (c.weather === 'choppy' ? 1 : 0) } },
  { id: 'pelican', name: 'Thick skin', description: 'Ignores the first 3 condition lost per trip', hooks: { damage: (loss) => Math.max(0, loss - 3) } },
  { id: 'day-tripper', name: 'Regulars', description: 'Demand never drops below 0.8', hooks: { demandFloor: 0.8 } },
  { id: 'dawn-patrol', name: 'Early bird', description: '+25% payout when leaving before 9am (device time)', hooks: { payoutMult: (c) => (localHour(c.t) < 9 ? 1.25 : 1) } },
  { id: 'stormchaser', name: 'Stormchaser', description: 'Takes no condition damage in storms', hooks: { damage: (loss, c) => (c.weather === 'storm' ? 0 : loss) } },
  { id: 'the-errand', name: 'Express', description: 'Trips take half the time; capacity is 4 forever', hooks: { durationMult: () => 0.5 } },

  // ---- Tier 2 ----
  { id: 'quickstep', name: 'Light hull', description: '−20% trip time', hooks: { durationMult: () => 0.8 } },
  { id: 'tin-pail', name: 'Easy fix', description: 'Repairs cost half', hooks: { repairCostMult: 0.5 } },
  { id: 'sunliner', name: 'Fair-weather favourite', description: '+15% demand in calm weather', hooks: { demandMult: (c) => (c.weather === 'calm' ? 1.15 : 1) } },
  { id: 'promenade', name: 'Patient passengers', description: 'No happiness loss on delays', inactiveReason: 'Passenger happiness is not designed yet', hooks: {} },
  { id: 'kingfisher', name: 'Outruns storms', description: 'Never loses a trip to the weather', hooks: { lossRiskMult: () => 0 } },
  { id: 'the-gull', name: 'Homing', description: 'Returns instantly if a trip is lost', hooks: { instantReturnOnLoss: true } },
  { id: 'the-ghost', name: 'The Ghost', description: 'Only sails between midnight and 4am (device time)', hooks: { departureBlock: (t) => (localHour(t) < 4 ? null : 'The Ghost only sails between midnight and 4am') } },

  // ---- Tier 3 ----
  { id: 'netmender', name: 'Keen eye', description: '+1% rare part chance', hooks: { rareChanceBonus: 0.01 } },
  { id: 'longhaul', name: 'Flat fuel', description: 'Fuel cost flat regardless of distance', inactiveReason: 'Fuel is already flat per leg in this build', hooks: {} },
  { id: 'sightline', name: 'Scenic route', description: '+20% payout on routes over 3 ports', inactiveReason: 'Needs multi-stop routes', hooks: {} },
  { id: 'gala', name: 'Social season', description: 'Captain traits reveal 25% faster aboard', inactiveReason: PHASE_4_CAPTAINS, hooks: {} },
  { id: 'salvager', name: 'Salvager', description: '15% chance a rare part found aboard comes with a duplicate', hooks: { rareDuplicateChance: 0.15 } },
  { id: 'the-cormorant', name: 'Fishes at anchor', description: 'Earns at half rate while docked', hooks: { dockedIncomeShare: 0.5 } },
  { id: 'derelict-queen', name: 'Derelict Queen', description: 'Arrives with a bonded legendary captain who cannot be fired', inactiveReason: PHASE_4_CAPTAINS, hooks: {} },

  // ---- Tier 4 ----
  { id: 'deckhand', name: 'Runs itself', description: 'Automated at 95% instead of 85%', inactiveReason: PHASE_4_DELEGATION, hooks: {} },
  { id: 'ironside', name: 'Ironside', description: 'Condition loss capped at 5 per trip', hooks: { damage: (loss) => Math.min(loss, 5) } },
  { id: 'azure', name: 'Port darling', description: '+10% demand at upgraded ports', inactiveReason: PHASE_4_PORTS, hooks: {} },
  { id: 'vista', name: 'Evergreen', description: 'Ignores seasonal demand dips', inactiveReason: 'Seasons change weather, not demand, so far', hooks: {} },
  { id: 'nightrunner', name: 'Nightrunner', description: 'Trips 30% faster when leaving between 10pm and 6am (device time)', hooks: { durationMult: (c) => (localHour(c.t) >= 22 || localHour(c.t) < 6 ? 0.7 : 1) } },
  { id: 'the-meridian', name: 'Two at the helm', description: "Carries two captains; both captains' traits apply", inactiveReason: PHASE_4_CAPTAINS, hooks: {} },
  { id: 'the-long-night', name: 'The Long Night', description: 'Leaves no wake; never loses a trip to the weather, ever', hooks: { lossRiskMult: () => 0 } },

  // ---- Tier 5 ----
  { id: 'deepdraft', name: 'Deep keel', description: '+2% legendary part chance on storm runs', hooks: { legendaryChanceBonus: (c) => (c.weather === 'storm' ? 0.02 : 0) } },
  { id: 'anchorhold', name: 'Anchorhold', description: 'Never loses a trip in weather below Storm', hooks: { lossRiskMult: (c) => (c.weather === 'storm' ? 1 : 0) } },
  { id: 'belle', name: 'Belle of the route', description: '+5% payout to other boats leaving on her route while she sails it', hooks: { sameRoutePayoutMult: 1.05 } },
  { id: 'continental', name: 'Steady trade', description: 'Routes she arrives on never reroll below 1.0 demand', hooks: { demandRerollFloor: 1.0 } },
  { id: 'ironjaw', name: 'Ironjaw', description: 'Rolls for parts twice per trip', hooks: { extraPartRolls: () => 1 } },
  { id: 'the-mirabel', name: 'The Mirabel', description: 'Always sells at 1.5 demand', hooks: { demandLock: 1.5 } },
  { id: 'the-unmoored', name: 'The Unmoored', description: 'Never needs fuel. Ever', hooks: {} },

  // ---- Tier 6 ----
  { id: 'leviathan', name: 'Leviathan', description: '+40% capacity in calm weather', hooks: { capacityMult: (c) => (c.weather === 'calm' ? 1.4 : 1) } },
  { id: 'keystone', name: 'Keystone', description: 'Counts as 2 boats for leaderboard efficiency', inactiveReason: 'Needs the online leaderboard', hooks: {} },
  { id: 'pageant', name: 'Pageant', description: '+10% demand across the whole fleet', hooks: { fleetDemandMult: 1.1 } },
  { id: 'monarch', name: 'Monarch', description: 'Port upgrades cost 20% less while docked', inactiveReason: PHASE_4_PORTS, hooks: {} },
  { id: 'the-colossus', name: 'The Colossus', description: 'A legendary find aboard delivers the whole set', hooks: { fullSetOnLegendary: true } },
  { id: 'grand-dame', name: 'Grand Dame', description: '+10% payout to every boat leaving her port while she is docked', hooks: { dockedPortPayoutMult: 1.1 } },
  { id: 'saint-elmo', name: 'Saint Elmo', description: 'Storms follow her: every route she runs turns to storm', hooks: { bringsStorms: true } },
]

const byId = new Map(ABILITIES.map((a) => [a.id, a]))
const classAbility = new Map(BOAT_CLASSES.map((c) => [c.id, c.abilityId]))

export function getAbility(id: string | null): Ability | undefined {
  return id ? byId.get(id) : undefined
}

export function abilityOf(boat: Boat | undefined): Ability | undefined {
  return boat ? getAbility(classAbility.get(boat.classId) ?? null) : undefined
}

export function hooksOf(boat: Boat | undefined): AbilityHooks {
  return abilityOf(boat)?.hooks ?? {}
}

/** Every abilityId in the catalog must resolve; checked by tests. */
export function missingAbilityIds(): string[] {
  return BOAT_CLASSES.filter((c) => c.abilityId && !byId.has(c.abilityId)).map((c) => c.id)
}
