import type { BoatClass } from '../types'

// Common hulls, two tracks. Passenger boats mirror their cargo counterpart's stats for now;
// the tracks differ only in which route demand they sell into.
//
// fuelTankTrips caps how many round trips a boat can be sent on before it must come home.
// speed is distance units per minute, written as 10 / (seconds per 10-unit leg / 60).
// Tier 3–4 stats come from the spec's Phase 1 table; tier 1–2 hulls are new, sized from the
// catalog's capacity bands (T1 4–8, T2 8–16).
//
// Prices are tuned with `npm run sim` against these pacing targets:
//   first purchase (a tier-1 boat) after 30–60 min of play, first tier-2 boat after 4–5 h.
// Tiers 3–4 keep the spec's ~3.5× step and are not yet tuned against a target.

const common = () => ({ rarity: 'common' as const, abilityId: null, requiredParts: [] as string[] })

export const BOAT_CLASSES: BoatClass[] = [
  // Tier 1. Starters (price 0) are not sold in the shipyard.
  { ...common(), id: 'dinghy-hauler', name: 'Dinghy Hauler', track: 'cargo', sizeTier: 1, price: 0, capacity: 4, speed: 10 / (45 / 60), fuelPerLeg: 6, fuelTankTrips: 4 },
  { ...common(), id: 'water-taxi', name: 'Water Taxi', track: 'passenger', sizeTier: 1, price: 0, capacity: 4, speed: 10 / (45 / 60), fuelPerLeg: 6, fuelTankTrips: 4 },
  { ...common(), id: 'skiff', name: 'Skiff', track: 'cargo', sizeTier: 1, price: 2000, capacity: 6, speed: 10 / (40 / 60), fuelPerLeg: 8, fuelTankTrips: 5 },
  { ...common(), id: 'launch', name: 'Launch', track: 'passenger', sizeTier: 1, price: 2000, capacity: 6, speed: 10 / (40 / 60), fuelPerLeg: 8, fuelTankTrips: 5 },

  // Tier 2
  { ...common(), id: 'harbor-skiff', name: 'Harbor Skiff', track: 'cargo', sizeTier: 2, price: 22000, capacity: 12, speed: 10 / (50 / 60), fuelPerLeg: 14, fuelTankTrips: 6 },
  { ...common(), id: 'harbor-ferry', name: 'Harbor Ferry', track: 'passenger', sizeTier: 2, price: 22000, capacity: 12, speed: 10 / (50 / 60), fuelPerLeg: 14, fuelTankTrips: 6 },

  // Tier 3
  { ...common(), id: 'coastal-trawler', name: 'Coastal Trawler', track: 'cargo', sizeTier: 3, price: 77000, capacity: 20, speed: 10 / (70 / 60), fuelPerLeg: 24, fuelTankTrips: 7 },
  { ...common(), id: 'tour-boat', name: 'Tour Boat', track: 'passenger', sizeTier: 3, price: 77000, capacity: 20, speed: 10 / (70 / 60), fuelPerLeg: 24, fuelTankTrips: 7 },

  // Tier 4
  { ...common(), id: 'short-sea-freighter', name: 'Short-Sea Freighter', track: 'cargo', sizeTier: 4, price: 270000, capacity: 50, speed: 10 / (110 / 60), fuelPerLeg: 55, fuelTankTrips: 8 },
  { ...common(), id: 'yacht', name: 'Yacht', track: 'passenger', sizeTier: 4, price: 270000, capacity: 50, speed: 10 / (110 / 60), fuelPerLeg: 55, fuelTankTrips: 8 },
]
