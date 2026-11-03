// What Wick, the harbourmaster, says at each step of a new player's walk-through (the steps
// are src/game/guide.ts), given where the player is looking, and which tab he points at.

import type { GameState } from '../../src/game/types'
import type { GuideStep } from '../../src/game/guide'
import { captainViewById, courtingOf, recruitViewById } from '../../src/game/crew'
import { getPortDef, homeOf } from '../../src/game/regions'
import { getBoatClass } from '../../src/game/economy'
import { BOAT_CLASSES } from '../../src/game/data/boats'
import { coins, duration } from '../../src/format'

export type GuideTab = 'fleet' | 'captains' | 'ports' | 'shipyard' | 'home'

/** Where the player is: which tab, whether a boat is open, which page of the home port ('away' elsewhere). */
export type GuideWhere = { tab: GuideTab; boatOpen: boolean; portPage: string }

export type GuideLine = { text: string; target: GuideTab | null; done?: boolean }

const firstName = (name: string | undefined) => name?.split(' ')[0] ?? 'them'

/** What Wick says now, and which tab he points at. */
export function guideLine(game: GameState, step: GuideStep, where: GuideWhere, now: number): GuideLine {
  const home = getPortDef(homeOf(game)).name
  switch (step.id) {
    case 'buy': {
      const price = Math.min(...BOAT_CLASSES.filter((c) => c.starter).map((c) => c.price))
      if (where.tab !== 'shipyard')
        return {
          text: `Welcome to ${home}. I'm Wick, harbourmaster. A shipping line starts with a boat, and you've ${coins(game.player.coins)} coins: enough for a small one at ${coins(price)}. The shipyard's down there.`,
          target: 'shipyard',
        }
      return {
        text: 'Two to choose from. The Dinghy Hauler carries cargo, the Water Taxi carries passengers; both pay much the same. Swipe to see the other, then buy one.',
        target: null,
      }
    }
    case 'court': {
      const r = step.recruitId ? recruitViewById(game, step.recruitId) : null
      const name = firstName(r?.name)
      const onQuay = where.tab === 'ports' && where.portPage === 'quay'
      if (!r) return { text: "The quay's quiet just now. Someone keen will turn up soon; check back in a little while.", target: 'ports' }
      if (!onQuay) {
        if (where.tab === 'ports' && where.portPage === 'away') return { text: `${name} is on your own quay, at home. Tap ⚓︎ ${home}.`, target: null }
        if (where.tab === 'ports' && where.portPage === 'menu')
          return { text: `Captains looking for work wait on the quay. Tap The quay.`, target: null }
        return {
          text: "She won't sail herself: every boat needs a captain. They wait on the quay, and the rival lines are after them too. Ports, then the quay.",
          target: 'ports',
        }
      }
      if (step.next === 'drink')
        return {
          text: `That's ${name} at the front, keen on you already, though the other lines are sniffing about. Under Win them over, stand them a Drink. It costs a watch; you get a few each day, and people tell you what they want over one.`,
          target: null,
        }
      if (step.next === 'harbour') return { text: `Now walk ${name} round your harbour: tap Harbour. People weigh up what a line has to show them.`, target: null }
      if (step.next === 'sign') return { text: `${name}'s won over. Sign them on, before anyone else does.`, target: null }
      const v = courtingOf(game, r.id, now)
      return {
        text: `${name} is weighing it up. Stay level with the rival flags on the compass and they'll sign with you${v ? ` when they decide, in ${duration(Math.max(0, v.decidesAt - now))}` : ''}.`,
        target: null,
      }
    }
    case 'aboard': {
      const name = firstName(captainViewById(game, step.captainId)?.name)
      const boat = game.player.ownedBoats.find((b) => b.id === step.boatId)
      if (where.boatOpen) return { text: `Under Crew, put ${name} aboard.`, target: null }
      return { text: `${name} is ashore, waiting. Open ${boat?.nickname ?? 'your boat'} in the Fleet and put them aboard.`, target: 'fleet' }
    }
    case 'send': {
      const boat = game.player.ownedBoats.find((b) => b.id === step.boatId)
      if (where.boatOpen)
        return {
          text: "Under Send, pick a port. Farther pays more and takes longer. Fill her tank and she runs the trips back to back, even while you're away, then docks and waits for you.",
          target: null,
        }
      return { text: `Time ${boat?.nickname ?? 'she'} earned her keep. Open her in the Fleet and send her out.`, target: 'fleet' }
    }
    case 'farewell': {
      const gift = game.player.ownedBoats.find((b) => getBoatClass(b.classId).starter && !b.captainId)
      return {
        text: [
          "She's away. Pay lands when she's home.",
          'Watch the weather: storms pay best and wear a hull hard, and a boat at nought goes down. The rarest hulls only come out of bad weather.',
          gift ? `And I'm too old for my ${getBoatClass(gift.classId).name}. ${gift.nickname} is yours. There's someone else keen on the quay to captain her.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        target: null,
        done: true,
      }
    }
  }
}
