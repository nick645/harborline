import type { BoatClass, PartType, SizeTier, Track } from '../types'

// The full catalog. Names are placeholders to be replaced before launch.
//
// Size tier drives capacity, speed, fuel and price; rarity drives how a boat is obtained
// and whether it has an ability (see abilities.ts). Rarity is independent of tier.
//
//   common     bought with coins
//   rare       coins + its one specific rare part
//   legendary  crafted from its own full 3-part set; never sold
//   mythic     crafted from its own mythic set (storm drops only); never sold, for any amount
//
// Prices are tuned with `npm run sim` against the pacing targets: first purchase after
// 30–60 min of play, first tier-2 boat after 4–5 h. Tiers 3–6 keep a ~3.5× price step and
// ~2.5× earnings per trip, and are not yet tuned against a target.

type TierStats = {
  capacity: number
  /** Seconds per 10-distance-unit leg. */
  legSeconds: number
  fuelPerLeg: number
  fuelTankTrips: number
  price: number
}

const TIERS: Record<SizeTier, TierStats> = {
  1: { capacity: 6, legSeconds: 40, fuelPerLeg: 8, fuelTankTrips: 5, price: 2000 },
  2: { capacity: 12, legSeconds: 50, fuelPerLeg: 14, fuelTankTrips: 6, price: 22000 },
  3: { capacity: 20, legSeconds: 70, fuelPerLeg: 24, fuelTankTrips: 7, price: 77000 },
  4: { capacity: 50, legSeconds: 110, fuelPerLeg: 55, fuelTankTrips: 8, price: 270000 },
  5: { capacity: 115, legSeconds: 140, fuelPerLeg: 100, fuelTankTrips: 9, price: 945000 },
  6: { capacity: 260, legSeconds: 170, fuelPerLeg: 170, fuelTankTrips: 10, price: 3300000 },
}

/** Rare boats cost this multiple of their tier's common price, plus their rare part. */
const RARE_PRICE_MULT = 1.5

/** Hull variants give each tier a second common with a different trade-off at the same price. */
type Variant = 'base' | 'big' | 'fast'
const VARIANTS: Record<Variant, { capacity: number; legSeconds: number }> = {
  base: { capacity: 1, legSeconds: 1 },
  big: { capacity: 1.2, legSeconds: 1.15 },
  fast: { capacity: 0.85, legSeconds: 0.85 },
}

type Overrides = Partial<Omit<BoatClass, 'id' | 'name' | 'track' | 'sizeTier' | 'rarity'>>

function hull(id: string, name: string, track: Track, tier: SizeTier, variant: Variant = 'base'): BoatClass {
  const t = TIERS[tier]
  const v = VARIANTS[variant]
  return {
    id,
    name,
    track,
    sizeTier: tier,
    rarity: 'common',
    price: t.price,
    capacity: Math.round(t.capacity * v.capacity),
    speed: 10 / ((t.legSeconds * v.legSeconds) / 60),
    fuelPerLeg: t.fuelPerLeg,
    fuelTankTrips: t.fuelTankTrips,
    abilityId: null,
    requiredParts: [],
  }
}

const common = (id: string, name: string, track: Track, tier: SizeTier, variant: Variant = 'base', o: Overrides = {}) => ({
  ...hull(id, name, track, tier, variant),
  ...o,
})

/** A rare boat needs coins plus one specific rare part, `<id>-<slot>`. */
const rare = (id: string, name: string, track: Track, tier: SizeTier, slot: PartType, o: Overrides = {}): BoatClass => ({
  ...hull(id, name, track, tier),
  rarity: 'rare',
  price: Math.round(TIERS[tier].price * RARE_PRICE_MULT),
  abilityId: id,
  requiredParts: [`${id}-${slot}`],
  ...o,
})

const fullSet = (id: string) => [`${id}-hull`, `${id}-engine`, `${id}-specialty`]

const legendary = (id: string, name: string, track: Track, tier: SizeTier, o: Overrides = {}): BoatClass => ({
  ...hull(id, name, track, tier),
  rarity: 'legendary',
  price: 0,
  abilityId: id,
  requiredParts: fullSet(id),
  ...o,
})

const mythic = (id: string, name: string, track: Track, tier: SizeTier, o: Overrides = {}): BoatClass => ({
  ...legendary(id, name, track, tier, o),
  rarity: 'mythic',
})

export const BOAT_CLASSES: BoatClass[] = [
  // ---------- Tier 1: smallest hulls ----------
  // Starters (price 0) are given at the start and never sold in the shipyard.
  common('dinghy-hauler', 'Dinghy Hauler', 'cargo', 1, 'base', { price: 0, capacity: 4, speed: 10 / (45 / 60), fuelPerLeg: 6, fuelTankTrips: 4 }),
  common('water-taxi', 'Water Taxi', 'passenger', 1, 'base', { price: 0, capacity: 4, speed: 10 / (45 / 60), fuelPerLeg: 6, fuelTankTrips: 4 }),
  common('skiff', 'Skiff', 'cargo', 1),
  common('launch', 'Launch', 'passenger', 1),
  rare('bootlegger', 'Bootlegger', 'cargo', 1, 'engine'),
  rare('pelican', 'Pelican', 'cargo', 1, 'hull'),
  rare('day-tripper', 'Day Tripper', 'passenger', 1, 'specialty'),
  rare('dawn-patrol', 'Dawn Patrol', 'passenger', 1, 'engine'),
  legendary('stormchaser', 'Stormchaser', 'cargo', 1),
  legendary('the-errand', 'The Errand', 'passenger', 1, { capacity: 4 }),

  // ---------- Tier 2: small craft ----------
  common('harbor-skiff', 'Harbor Skiff', 'cargo', 2),
  common('mudlark', 'Mudlark', 'cargo', 2, 'big'),
  common('harbor-ferry', 'Harbor Ferry', 'passenger', 2),
  common('shuttle', 'Shuttle', 'passenger', 2, 'fast'),
  rare('quickstep', 'Quickstep', 'cargo', 2, 'engine'),
  rare('tin-pail', 'Tin Pail', 'cargo', 2, 'hull'),
  rare('sunliner', 'Sunliner', 'passenger', 2, 'specialty'),
  rare('promenade', 'Promenade', 'passenger', 2, 'specialty'),
  legendary('kingfisher', 'Kingfisher', 'cargo', 2),
  legendary('the-gull', 'The Gull', 'passenger', 2),
  mythic('the-ghost', 'The Ghost', 'cargo', 2),

  // ---------- Tier 3: working boats ----------
  common('coastal-trawler', 'Coastal Trawler', 'cargo', 3),
  common('hauler', 'Hauler', 'cargo', 3, 'big'),
  common('tour-boat', 'Tour Boat', 'passenger', 3),
  common('bay-cruiser', 'Bay Cruiser', 'passenger', 3, 'fast'),
  rare('netmender', 'Netmender', 'cargo', 3, 'specialty'),
  rare('longhaul', 'Longhaul', 'cargo', 3, 'engine'),
  rare('sightline', 'Sightline', 'passenger', 3, 'specialty'),
  rare('gala', 'Gala', 'passenger', 3, 'hull'),
  legendary('salvager', 'Salvager', 'cargo', 3),
  legendary('the-cormorant', 'The Cormorant', 'passenger', 3),
  mythic('derelict-queen', 'Derelict Queen', 'cargo', 3),

  // ---------- Tier 4: mid fleet ----------
  common('short-sea-freighter', 'Short-Sea Freighter', 'cargo', 4),
  common('boxrunner', 'Boxrunner', 'cargo', 4, 'fast'),
  common('yacht', 'Yacht', 'passenger', 4),
  common('coastliner', 'Coastliner', 'passenger', 4, 'big'),
  rare('deckhand', 'Deckhand', 'cargo', 4, 'specialty'),
  rare('ironside', 'Ironside', 'cargo', 4, 'hull'),
  rare('azure', 'Azure', 'passenger', 4, 'specialty'),
  rare('vista', 'Vista', 'passenger', 4, 'hull'),
  legendary('nightrunner', 'Nightrunner', 'cargo', 4),
  legendary('the-meridian', 'The Meridian', 'passenger', 4),
  mythic('the-long-night', 'The Long Night', 'cargo', 4),

  // ---------- Tier 5: heavy ----------
  common('tanker', 'Tanker', 'cargo', 5),
  common('bulk-carrier', 'Bulk Carrier', 'cargo', 5, 'big'),
  common('mid-size-cruiser', 'Mid-Size Cruiser', 'passenger', 5),
  common('oceanliner', 'Oceanliner', 'passenger', 5, 'fast'),
  rare('deepdraft', 'Deepdraft', 'cargo', 5, 'hull'),
  rare('anchorhold', 'Anchorhold', 'cargo', 5, 'hull'),
  rare('belle', 'Belle', 'passenger', 5, 'specialty'),
  rare('continental', 'Continental', 'passenger', 5, 'engine'),
  legendary('ironjaw', 'Ironjaw', 'cargo', 5),
  legendary('the-mirabel', 'The Mirabel', 'passenger', 5),
  mythic('the-unmoored', 'The Unmoored', 'cargo', 5, { fuelPerLeg: 0, fuelTankTrips: 20 }),

  // ---------- Tier 6: flagships ----------
  common('container-ship', 'Container Ship', 'cargo', 6),
  common('megahauler', 'Megahauler', 'cargo', 6, 'big'),
  common('cruise-ship', 'Cruise Ship', 'passenger', 6),
  common('grand-liner', 'Grand Liner', 'passenger', 6, 'fast'),
  rare('leviathan', 'Leviathan', 'cargo', 6, 'hull'),
  rare('keystone', 'Keystone', 'cargo', 6, 'engine'),
  rare('pageant', 'Pageant', 'passenger', 6, 'specialty'),
  rare('monarch', 'Monarch', 'passenger', 6, 'hull'),
  legendary('the-colossus', 'The Colossus', 'cargo', 6),
  legendary('grand-dame', 'Grand Dame', 'passenger', 6),
  mythic('saint-elmo', 'Saint Elmo', 'passenger', 6),
  // One mythic slot is held back for the first live-ops season.
]
