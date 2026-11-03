// What makes each port itself: what it trades in (and so which boats it pays better), the day
// of the week its market fills the quay, its tavern, and the local who keeps an eye on the
// harbour. Names, leans and the market-day lift are Claude's picks (user-approved 2026-11-03),
// tuned with the sim.

import type { Track } from '../types'

export interface Local {
  name: string
  /** What they do, as the player is told it. */
  role: string
  /** What they say in fair weather and foul. */
  fair: string
  foul: string
}

export interface PortLife {
  /** What the port is known for, in a few words. */
  trade: string
  /** The track it pays better (the other pays a little less); none for an even port. */
  lean: Track | null
  /** Day of the week (0–6, counted from the start of game time) its market is on. */
  marketDay: number
  tavern: string
  local: Local
}

/** A leaning port pays this much more for its own track, and this much less for the other. */
export const LEAN_UP = 1.1
export const LEAN_DOWN = 0.9
/** Market day: everything pays this much more for the day. */
export const MARKET_DAY_MULT = 1.4
export const DAY_MS = 24 * 60 * 60 * 1000

export const PORT_LIFE: Record<string, PortLife> = {
  saltmarsh: {
    trade: 'Your home harbour',
    lean: null,
    marketDay: 5,
    tavern: '',
    local: { name: 'Wick', role: 'harbourmaster', fair: 'Fair wind out there. Go and make something of it.', foul: "Rough out past the light. I'd think twice." },
  },
  gullwick: {
    trade: 'Fish, nets and salt',
    lean: 'cargo',
    marketDay: 1,
    tavern: 'The Mended Net',
    local: { name: 'Nan Pellow', role: 'net-mender', fair: "Herring's running. Every hold in the bay wants filling.", foul: "Nets won't mend themselves after a blow like this." },
  },
  brindle: {
    trade: 'Visitors to the light',
    lean: 'passenger',
    marketDay: 6,
    tavern: "The Keeper's Arms",
    local: { name: 'Jory Treen', role: 'lamp-keeper', fair: 'Folk come from all over to climb my stairs. Bring me more.', foul: "Light's burning bright tonight. It'll need to." },
  },
  cobble: {
    trade: 'Boat blessings and pilgrims',
    lean: 'passenger',
    marketDay: 0,
    tavern: 'The Bell & Bushel',
    local: { name: 'Sister Merrin', role: 'blesses the boats', fair: 'Every keel that comes in here goes out blessed.', foul: "I'll say one for anyone out in this." },
  },
  farhaven: {
    trade: 'The ferry crossing',
    lean: 'passenger',
    marketDay: 3,
    tavern: 'The Waiting Room',
    local: { name: 'Ada Quill', role: 'ferry clerk', fair: "Queue's out the door. We could use another boat.", foul: 'Half the crossings cancelled. Anyone brave pays double.' },
  },
  mistle: {
    trade: 'Peat and fog-cured fish',
    lean: 'cargo',
    marketDay: 2,
    tavern: 'The Drowned Bell',
    local: { name: 'Tam Harrow', role: 'buoy-tender', fair: "Can see a whole mile today. Don't get used to it.", foul: 'Hear that bell? That means stay home.' },
  },
  greyhollow: {
    trade: 'Pilgrims to the abbey',
    lean: 'passenger',
    marketDay: 0,
    tavern: 'The Quiet Cup',
    local: { name: 'Brother Odd', role: 'cellarer', fair: 'The brothers welcome visitors. Quietly.', foul: 'We pray for the boats on nights like these.' },
  },
  wickstone: {
    trade: 'Slate and stone',
    lean: 'cargo',
    marketDay: 4,
    tavern: 'The Lookout',
    local: { name: 'Rue Ashby', role: 'watch-keeper', fair: 'Nothing on the horizon but sails. Good sails.', foul: "I've seen three masts go down off this rock. Mind yours." },
  },
  sealrock: {
    trade: 'Seal-watching trips',
    lean: 'passenger',
    marketDay: 5,
    tavern: 'The Basking Seal',
    local: { name: 'Fen Lowry', role: 'seal-watcher', fair: "They're all out on the rock. Bring folk to see them.", foul: "Seals have the sense to stay in. You don't, I see." },
  },
  coralby: {
    trade: 'Fruit and spice',
    lean: 'cargo',
    marketDay: 2,
    tavern: 'The Fruit Crate',
    local: { name: 'Mama Ossie', role: 'stallholder', fair: 'Mangoes rot if they sit. Carry them quick!', foul: 'Storm or no storm, the market opens.' },
  },
  driftwood: {
    trade: 'Travellers between the keys',
    lean: 'passenger',
    marketDay: 6,
    tavern: 'The Stilts',
    local: { name: 'Kip Varo', role: 'boardwalk-builder', fair: 'Every plank of this walk, I laid. Come and stroll it.', foul: "Water's up to the third rung. Again." },
  },
  saffron: {
    trade: 'Gold, cloth and customs',
    lean: 'cargo',
    marketDay: 4,
    tavern: 'The Gilded Dome',
    local: { name: 'Inspector Lune', role: 'customs', fair: 'Papers in order? Then the city is yours to trade with.', foul: 'Nothing clears customs in this weather. Except the brave.' },
  },
  holdfast: {
    trade: 'Iron and garrison stores',
    lean: 'cargo',
    marketDay: 1,
    tavern: 'The Iron Gate',
    local: { name: 'Brask', role: 'wall-warden', fair: 'The walls want feeding. Supplies, always supplies.', foul: 'Gate stays shut till this passes. Unless you bring stores.' },
  },
  frostgate: {
    trade: 'Travellers through the ice',
    lean: 'passenger',
    marketDay: 3,
    tavern: 'The Thaw',
    local: { name: 'Ysolde Frey', role: 'gatekeeper', fair: "The ice parts for whoever's paid the toll.", foul: 'The gate groans in a gale. So do I.' },
  },
  anvil: {
    trade: 'Forged iron and coal',
    lean: 'cargo',
    marketDay: 5,
    tavern: 'The Iron Kettle',
    local: { name: 'Gunnar Hale', role: 'smith', fair: "Fires never go out here. Neither does the work.", foul: 'Rain on hot iron. Lovely sound. Terrible sailing.' },
  },
  lanternhold: {
    trade: 'Everyone who comes to see the lantern',
    lean: 'passenger',
    marketDay: 0,
    tavern: 'The Last Lamp',
    local: { name: 'Wren Calder', role: 'lamplighter', fair: 'Ten thousand lamps, and I know every one by name.', foul: 'Storms make the lantern burn brighter. Or so we say.' },
  },
  ember: {
    trade: 'Ash, pumice and hot springs',
    lean: 'cargo',
    marketDay: 2,
    tavern: 'The Hot Coal',
    local: { name: 'Old Sulla', role: 'ash-farmer', fair: 'Best soil in the world, if it doesn\'t bury you.', foul: 'Mountain and sky both grumbling. Bad day for it.' },
  },
  lastlight: {
    trade: 'Those who want to see the edge',
    lean: 'passenger',
    marketDay: 6,
    tavern: "World's End",
    local: { name: 'Morrow', role: 'last keeper', fair: 'Past here, the charts go blank. People pay to look.', foul: 'Out there, a storm has no name. Come in.' },
  },
}
