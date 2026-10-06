import type { RouteDef } from '../types'

// Phase 1: every voyage is a round trip out of the home port.
export const ROUTES: RouteDef[] = [
  { id: 'saltmarsh-gullwick', portA: 'saltmarsh', portB: 'gullwick' },
  { id: 'saltmarsh-brindle', portA: 'saltmarsh', portB: 'brindle' },
  { id: 'saltmarsh-cobble', portA: 'saltmarsh', portB: 'cobble' },
  { id: 'saltmarsh-farhaven', portA: 'saltmarsh', portB: 'farhaven' },
]
