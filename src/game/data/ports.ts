import type { Port } from '../types'

export const HOME_PORT_ID = 'saltmarsh'

/** Map units per distance unit. Map is 1000 × 700 units. */
export const MAP_UNITS_PER_DISTANCE = 40
export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 700

// Positions are chosen so the four routes from home land near distances 6, 10, 14 and 20.
export const PORTS: Port[] = [
  { id: 'saltmarsh', name: 'Saltmarsh Quay', x: 100, y: 600, tier: 1, unlocked: true },
  { id: 'gullwick', name: 'Gullwick', x: 300, y: 470, tier: 1, unlocked: true },
  { id: 'brindle', name: 'Brindle Point', x: 260, y: 230, tier: 2, unlocked: true },
  { id: 'cobble', name: 'Cobble Cove', x: 650, y: 480, tier: 2, unlocked: true },
  { id: 'farhaven', name: 'Farhaven', x: 860, y: 330, tier: 3, unlocked: true },
]
