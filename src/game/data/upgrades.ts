// Port upgrades. Deliberately few: the port supports the fleet; it is not a second game.
// If a seventh upgrade feels necessary, the ships or captains aren't carrying enough weight.

export type UpgradeId = 'dry-dock' | 'berths' | 'weather-radar' | 'fuel-depot' | 'salvage-yard' | 'scout-office'

export interface UpgradeDef {
  id: UpgradeId
  name: string
  /** Effect value at levels 1, 2 and 3. */
  levels: [number, number, number]
  /** Cost of levels 1, 2 and 3 (level 1 is the spec's; each further level costs 3×). */
  costs: [number, number, number]
  describe: (value: number) => string
}

const costs = (l1: number): [number, number, number] => [l1, l1 * 3, l1 * 9]

export const UPGRADES: UpgradeDef[] = [
  { id: 'dry-dock', name: 'Dry Dock', levels: [0.15, 0.27, 0.4], costs: costs(2000), describe: (v) => `Repairs cost ${Math.round(v * 100)}% less` },
  { id: 'berths', name: 'Berths', levels: [1, 2, 3], costs: costs(3500), describe: (v) => `Room for ${v} more boat${v === 1 ? '' : 's'}` },
  { id: 'weather-radar', name: 'Weather Radar', levels: [1, 2, 3], costs: costs(5000), describe: (v) => `See the weather ${v} change${v === 1 ? '' : 's'} ahead` },
  { id: 'fuel-depot', name: 'Fuel Depot', levels: [0.1, 0.17, 0.25], costs: costs(4000), describe: (v) => `Fuel costs ${Math.round(v * 100)}% less` },
  { id: 'salvage-yard', name: 'Salvage Yard', levels: [0.01, 0.02, 0.03], costs: costs(8000), describe: (v) => `+${Math.round(v * 100)}% standard and rare part chance` },
  { id: 'scout-office', name: 'Scout Office', levels: [1, 1, 2], costs: costs(10000), describe: (v) => `+${v} scout level${v === 1 ? '' : 's'}` },
]

/** Boats the harbour holds, by highest tier reached (1–6), before Berths. */
export const FLEET_CAP_BY_TIER = [0, 6, 10, 16, 24, 32, 40]

/** Highest tier reached that also raises the base scout level (+1 each). */
export const SCOUT_LEVEL_TIERS = [4, 6]
