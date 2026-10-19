import type { RouteDef } from '../types'
import { HOME_PORT_ID, PORTS } from './ports'

// Every voyage is a round trip out of the home port, so there's one route to each other port.
// Route ids are `home-port`, which keeps the weather the bay's routes have always had.
export function routesFrom(home: string): RouteDef[] {
  return PORTS.filter((p) => p.id !== home).map((p) => ({ id: `${home}-${p.id}`, portA: home, portB: p.id }))
}

/** Routes from the starting home, Saltmarsh Quay. */
export const ROUTES: RouteDef[] = routesFrom(HOME_PORT_ID)
