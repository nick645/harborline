import type { BoatClass } from '../types'

// Phase 1 boat table. Speeds are derived from the spec's "Voyage (1 leg)" times at the
// reference distance of 10 units: speed = 10 / (legSeconds / 60).
//   Dinghy Hauler 45s, Harbor Skiff 40s, Coastal Trawler 70s, Short-Sea Freighter 110s.
export const BOAT_CLASSES: BoatClass[] = [
  {
    id: 'dinghy-hauler',
    name: 'Dinghy Hauler',
    track: 'cargo',
    sizeTier: 1,
    rarity: 'common',
    price: 0,
    capacity: 4,
    speed: 10 / (45 / 60),
    fuelPerLeg: 6,
    abilityId: null,
    requiredParts: [],
  },
  {
    id: 'harbor-skiff',
    name: 'Harbor Skiff',
    track: 'cargo',
    sizeTier: 2,
    rarity: 'common',
    price: 400,
    capacity: 8,
    speed: 10 / (40 / 60),
    fuelPerLeg: 10,
    abilityId: null,
    requiredParts: [],
  },
  {
    id: 'coastal-trawler',
    name: 'Coastal Trawler',
    track: 'cargo',
    sizeTier: 3,
    rarity: 'common',
    price: 1400,
    capacity: 20,
    speed: 10 / (70 / 60),
    fuelPerLeg: 24,
    abilityId: null,
    requiredParts: [],
  },
  {
    id: 'short-sea-freighter',
    name: 'Short-Sea Freighter',
    track: 'cargo',
    sizeTier: 4,
    rarity: 'common',
    price: 5000,
    capacity: 50,
    speed: 10 / (110 / 60),
    fuelPerLeg: 55,
    abilityId: null,
    requiredParts: [],
  },
]
