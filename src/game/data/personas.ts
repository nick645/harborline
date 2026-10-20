// Who a captain becomes when they rise above five anchors. A Legend takes on one of twenty
// personas, a Mythic one of ten: each a look nobody else on the coast wears (drawn on the
// phone, see mobile/src/art/personas.ts) and a name the harbour knows them by. Names and
// descriptions are Claude's; nothing here changes how they sail.

export interface PersonaDef {
  id: string
  name: string
  /** One line on who they've become. */
  blurb: string
}

export const LEGEND_PERSONAS: PersonaDef[] = [
  { id: 'lamplighter', name: 'The Lamplighter', blurb: 'Lights every lamp on the quay before they sail, and a few no one else can see' },
  { id: 'gull-monarch', name: 'The Gull Monarch', blurb: 'Every gull on the coast seems to answer to them' },
  { id: 'admiral', name: 'The Admiral of Nowhere', blurb: 'Medals from navies that never existed, and every one earned' },
  { id: 'harpooner', name: 'The Harpooner', blurb: 'Came back from the far north with a whale’s tooth and no stories they’ll tell' },
  { id: 'cartographer', name: 'The Cartographer', blurb: 'Draws the coast as it will be, not as it is' },
  { id: 'keeper', name: 'The Lighthouse Keeper', blurb: 'Carries the light with them, and sweeps it across the water' },
  { id: 'diver', name: 'The Deep Diver', blurb: 'Walks the seabed in a brass helmet and comes back with pockets full' },
  { id: 'stormbeard', name: 'The Stormbeard', blurb: 'There’s lightning braided into that beard, and it shows' },
  { id: 'tide-singer', name: 'The Tide-singer', blurb: 'Hums to the water, and the water hums back' },
  { id: 'salt-saint', name: 'The Salt Saint', blurb: 'Dressed in white, crowned in salt, and never once lost a crew' },
  { id: 'smuggler', name: 'The Velvet Smuggler', blurb: 'Gold in every pocket, and a coin for anyone who asks the right question' },
  { id: 'brass-arm', name: 'The Brass-armed', blurb: 'Lost an arm to a winch; built a better one' },
  { id: 'frostbound', name: 'The Frostbound', blurb: 'Their breath freezes in midsummer' },
  { id: 'fisher-king', name: 'The Fisher-King', blurb: 'A straw hat, a line in the water, and a cat that runs the boat' },
  { id: 'bellringer', name: 'The Bellringer', blurb: 'Rings the ship’s bell, and the fog parts' },
  { id: 'old-oak', name: 'The Old Oak', blurb: 'Moss in the beard and bark on the coat: older than the harbour' },
  { id: 'scarlet-sail', name: 'The Scarlet Sail', blurb: 'Wears a sail for a cloak, and it’s always full of wind' },
  { id: 'night-heron', name: 'The Night Heron', blurb: 'Sails only after dark, with a heron on their shoulder' },
  { id: 'rainmaker', name: 'The Rainmaker', blurb: 'Keeps a small cloud of their own, for luck' },
  { id: 'ropewalker', name: 'The Ropewalker', blurb: 'Can splice a line blindfold, and has' },
]

export const MYTHIC_PERSONAS: PersonaDef[] = [
  { id: 'drowned', name: 'The Drowned Captain', blurb: 'Went down with their ship, and came back up with it' },
  { id: 'stormcaller', name: 'The Stormcaller', blurb: 'Walks a hand’s breadth above the deck, and the sky listens' },
  { id: 'lantern-head', name: 'The Lantern-headed', blurb: 'Nobody has seen their face. Only the light' },
  { id: 'kraken-bound', name: 'The Kraken-bound', blurb: 'Something in the deep owes them a favour, and keeps close' },
  { id: 'night-woven', name: 'The Night-woven', blurb: 'Their coat is cut from the sky at midnight' },
  { id: 'coral-crown', name: 'The Coral Crown', blurb: 'The reef grew a crown for them, and the fish followed' },
  { id: 'living-tide', name: 'The Living Tide', blurb: 'More sea than sailor now' },
  { id: 'moon-warden', name: 'The Moon-warden', blurb: 'Keeps the tides by the moon at their back' },
  { id: 'whalesinger', name: 'The Whalesinger', blurb: 'A whale swims the air around them, singing' },
  { id: 'sea-fire', name: 'The Sea-fire Mariner', blurb: 'Burns with the cold blue fire sailors see on the masts before a storm' },
]

export const PERSONAS = [...LEGEND_PERSONAS, ...MYTHIC_PERSONAS]
