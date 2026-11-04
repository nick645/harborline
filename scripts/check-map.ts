// Checks the chart's land (mobile/src/map/geography.ts) against the sea lanes: every route from
// Saltmarsh must stay at sea until it reaches its own port, and every port must sit on a shore.
// Run: npx tsx scripts/check-map.ts

import { PORTS, HOME_PORT_ID } from '../src/game/data/ports'
import { LAND, inside } from '../mobile/src/map/geography'

const home = PORTS.find((p) => p.id === HOME_PORT_ID)!
let bad = 0
for (const p of PORTS) {
  if (p.id === home.id) continue
  const len = Math.hypot(p.x - home.x, p.y - home.y)
  for (let d = 30; d < len - 14; d += 6) {
    const x = home.x + ((p.x - home.x) * d) / len
    const y = home.y + ((p.y - home.y) * d) / len
    const hit = LAND.find((l) => inside(x, y, l.pts))
    if (hit) {
      console.log(`lane to ${p.id} crosses ${hit.id} at (${x.toFixed(0)}, ${y.toFixed(0)})`)
      bad++
      break
    }
  }
}
// A port is on a shore when land lies within a short step of it.
for (const p of PORTS) {
  const near = Array.from({ length: 16 }, (_, i) => [p.x + Math.cos((i / 16) * Math.PI * 2) * 30, p.y + Math.sin((i / 16) * Math.PI * 2) * 30] as const)
  if (!near.some(([x, y]) => LAND.some((l) => inside(x, y, l.pts)))) {
    console.log(`${p.id} has no shore`)
    bad++
  }
}
console.log(bad ? `${bad} problems` : 'Chart OK: every lane at sea, every port on a shore')
process.exit(bad ? 1 : 0)
