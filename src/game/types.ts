// Core entities. Fields for Phases 2–4 are present but unused in Phase 1,
// so later phases are additive rather than a rewrite.

export type Track = 'cargo' | 'passenger'
export type Rarity = 'common' | 'rare' | 'legendary' | 'mythic'
export type SizeTier = 1 | 2 | 3 | 4 | 5 | 6
export type PortTier = 1 | 2 | 3
export type PartType = 'hull' | 'engine' | 'specialty'
export type Weather = 'calm' | 'choppy' | 'rough' | 'storm'

/** A boat is in exactly one of these states. */
export type BoatState = 'idle' | 'sailing' | 'returning' | 'repairing'

export interface Port {
  id: string
  name: string
  x: number
  y: number
  tier: PortTier
  unlocked: boolean
}

/** Static route definition (content). Distance is derived from port positions. */
export interface RouteDef {
  id: string
  portA: string
  portB: string
}

/** Live route state. Demand is 0.5–1.5 and rerolls each time a boat docks. */
export interface Route extends RouteDef {
  demandCargo: number
  demandPassenger: number
}

export interface BoatClass {
  id: string
  name: string
  track: Track
  sizeTier: SizeTier
  rarity: Rarity
  /** Coin price. 0 means starter-only, not sold in the shop. */
  price: number
  capacity: number
  /** Distance units per minute. */
  speed: number
  fuelPerLeg: number
  abilityId: string | null
  /** Exact part ids required to craft (a set, not a count). Empty for purchasable boats. */
  requiredParts: string[]
}

export interface Boat {
  id: string
  classId: string
  nickname: string
  /** 0–100 */
  condition: number
  captainId: string | null
  /** Route currently being run, or the last route run while idle. */
  currentRoute: string | null
  state: BoatState
  /** Absolute timestamp of the boat's next state change, or null when idle. */
  etaMs: number | null
}

export interface Voyage {
  boatId: string
  routeId: string
  /** Absolute timestamp. */
  startedAt: number
  /** Full round trip: outbound leg + return leg. */
  durationMs: number
  /** Net payout, locked in at departure, credited on arrival at the far port. */
  payout: number
  /** True once the outbound leg has completed and the payout was credited. */
  paid: boolean
  weatherAtStart: Weather | null
  partRollResult: string | null
}

export interface Part {
  id: string
  type: PartType
  setId: string
  rarity: Rarity
  track: Track
}

export interface Captain {
  id: string
  name: string
  trueSkill: number
  revealedTraits: string[]
  hiddenTraits: string[]
  voyageCount: number
  scoutLevel: number
}

export interface Player {
  coins: number
  scoutingLevel: number
  ownedBoats: Boat[]
  partInventory: string[]
  roster: Captain[]
  portUpgrades: Record<string, number>
  /** Absolute timestamp of the last settle while the player was present. */
  lastSeenAt: number
}

export interface RngState {
  seed: number
  state: number
}

export interface GameState {
  version: number
  player: Player
  routes: Route[]
  voyages: Voyage[]
  rng: RngState
  nextBoatSeq: number
}

export interface OfflineReport {
  awayMs: number
  /** Away time that actually earned (capped). */
  creditedMs: number
  coinsEarned: number
  voyages: number
}
