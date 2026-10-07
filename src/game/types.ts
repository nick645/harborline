// Core entities. Fields for Phases 2–4 are present but unused in Phase 1,
// so later phases are additive rather than a rewrite.

export type Track = 'cargo' | 'passenger'
export type Rarity = 'common' | 'rare' | 'legendary' | 'mythic'
/** Parts have one extra, lowest rarity: standard fittings. */
export type PartRarity = 'standard' | Exclude<Rarity, 'common'>
export type SizeTier = 1 | 2 | 3 | 4 | 5 | 6
export type PortTier = 1 | 2 | 3
export type PartType = 'hull' | 'engine' | 'specialty'
export type Weather = 'calm' | 'choppy' | 'rough' | 'storm'

/** A boat is in exactly one of these states. 'sunk' boats wait for salvage. */
export type BoatState = 'idle' | 'sailing' | 'returning' | 'repairing' | 'sunk'

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
  /** Round trips one tank of fuel covers: the most trips a boat can be sent on at once. */
  fuelTankTrips: number
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
  /** Route currently being run, the last route run while idle, or where it sank. */
  currentRoute: string | null
  state: BoatState
  /** Absolute timestamp of the boat's next state change, or null when idle. */
  etaMs: number | null
  /** While docked: when docked-time effects were last settled. Null at sea or sunk. */
  dockedAt: number | null
}

/** One round trip. A boat sent on several trips runs them back to back, one Voyage each. */
export interface Voyage {
  boatId: string
  routeId: string
  /** 1-based position of this trip in the boat's run. */
  tripIndex: number
  /** Trips in the whole run; the boat docks for good after trip `tripsTotal`. */
  tripsTotal: number
  /** Absolute timestamp. */
  startedAt: number
  /** Full round trip: outbound leg + return leg. */
  durationMs: number
  /** Net payout, locked in at departure, credited on arrival at the far port if still afloat. */
  payout: number
  /** True once the outbound leg has completed and the payout was credited. */
  paid: boolean
  /** True if the trip was lost at sea: no payout, no parts, home at low condition. */
  lost: boolean
  weatherAtStart: Weather | null
  /** Part ids found on this trip, recorded when it docks. */
  partRollResult: string[] | null
}

export interface Part {
  id: string
  type: PartType
  /** The boat whose recipe this part belongs to, or `std-<track>` for standard fittings. */
  setId: string
  rarity: PartRarity
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

export type LogKind = 'part' | 'sunk' | 'lost' | 'craft' | 'info'

export interface LogEntry {
  at: number
  kind: LogKind
  text: string
}

export interface GameState {
  version: number
  player: Player
  routes: Route[]
  voyages: Voyage[]
  rng: RngState
  nextBoatSeq: number
  /** Newest first; capped at LOG_LIMIT entries. */
  log: LogEntry[]
}

/** What happened while the player was away. */
export interface AwayReport {
  awayMs: number
  coinsEarned: number
  tripsCompleted: number
  /** Nicknames of boats that sank. */
  sunk: string[]
  /** Nicknames of boats whose trip was lost to the weather. */
  lost: string[]
  /** Part ids found. */
  parts: string[]
}
