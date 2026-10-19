import type { RouteDef } from '../types'
import { HOME_PORT_ID, PORTS } from './ports'

// Every voyage is a round trip out of the home port, so there's one route to each other port.
// Route ids are `home-port`, which keeps the weather the bay's routes have always had.
export const ROUTES: RouteDef[] = PORTS.filter((p) => p.id !== HOME_PORT_ID).map((p) => ({
  id: `${HOME_PORT_ID}-${p.id}`,
  portA: HOME_PORT_ID,
  portB: p.id,
}))
