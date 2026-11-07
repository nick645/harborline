// What people say aboard: passengers and hands on deck, and your captain at the helm. Picked by
// the weather, the trip and what you know of the captain; `n` steps through them so each tap
// brings something new. Only known things about a captain are used (captainView).

import type { CaptainView } from '../../src/game/captains'
import type { Track, Weather } from '../../src/game/types'

const pick = <T,>(list: T[], n: number) => list[((n % list.length) + list.length) % list.length]

const PASSENGER: Record<Weather, string[]> = {
  calm: [
    "Smooth as a millpond. I could sail like this every day.",
    'Is that {dest} already? No, too soon. Isn’t it?',
    'My aunt swore she saw a whale out here once. I’m keeping watch.',
    'Best seat on the boat, this. Don’t tell anyone.',
    'The captain hasn’t spilled a drop of my tea yet.',
  ],
  choppy: [
    'Bit of a bounce today, isn’t there?',
    'I’ll just hold on to this rail, if no one minds.',
    'They said it would be calm. They always say that.',
    'Ooh. That one got my shoes.',
  ],
  rough: [
    'Is it meant to do that?',
    'I have decided to love the sea from a safe distance. Next time.',
    'Hold my hat! No, hold me!',
    'The crew don’t look worried, so I won’t be. Much.',
  ],
  storm: [
    'I am never, ever buying the cheap ticket again.',
    'If we make {dest}, I’m buying the captain a drink.',
    'Was that thunder or my stomach?',
    'Somebody tell the sea we’ve paid!',
  ],
}

const HAND: Record<Weather, string[]> = {
  calm: ['Fair day for it. Lines are coiled, cargo’s snug.', 'Quiet trip. I could get used to quiet.', 'Saw a seal off the bow a while back.'],
  choppy: ['Lashings are holding. Checked them twice.', 'Keep your feet wide on a deck like this.', 'Bit of spray. Good for the complexion.'],
  rough: ['Hands to the lines! She’s pitching.', 'Mind the crates: they’re trying to leave without us.', 'Hold fast, she’s a good old boat.'],
  storm: ['Everything not tied down is going over!', 'I’ve seen worse. Not much worse.', 'Pump’s working. Pray it keeps on.'],
}

/** Something said on deck: a passenger on a passenger boat, a hand on a cargo boat. */
export function deckLine(track: Track, weather: Weather, dest: string, n: number): { who: string; text: string } {
  const list = track === 'passenger' ? PASSENGER[weather] : HAND[weather]
  return { who: track === 'passenger' ? 'A passenger' : 'A deckhand', text: pick(list, n).replace('{dest}', dest) }
}

/** What your captain says at the helm: the weather, the trip, and what you know of them. */
export function captainLine(c: CaptainView, weather: Weather, dest: string, n: number): string {
  const lines: string[] = []
  const weatherLines: Record<Weather, string[]> = {
    calm: [`Easy going to ${dest}. I could steer this with my elbow.`, 'Calm as you like. Enjoy it while it lasts.'],
    choppy: ['A little lively. Nothing she can’t take.', `Bit of chop. We’ll be in ${dest} all the same.`],
    rough: ['Hold on. I’ve got her.', 'Rough out here. Steady hands, steady hull.'],
    storm: [`This is the sort of weather they write songs about. Bad songs.`, 'Keep low and keep faith. I’ll get her through.'],
  }
  lines.push(...weatherLines[weather])
  const proven = c.traits.filter((t) => t.status === 'proven').map((t) => t.name.toLowerCase())
  if (proven.length) lines.push(`They call me ${proven[0]}. Fair enough, I suppose.`)
  if (c.grade?.id === 'pearl') lines.push('Best line on the coast, this. Best boat too, nearly.')
  if (c.grade?.id === 'barnacle') lines.push('Same old water. Same old me.')
  if (c.rank) lines.push(c.rank === 'mythic' ? 'The sea knows my name. Listen: it’s saying it now.' : 'They tell stories about me in the taverns. Some of them are true.')
  if (c.potential && !c.rank) lines.push('I’ve a feeling the best of me is still out here somewhere.')
  if (c.voyageCount < 5) lines.push('Still learning her ways. She’s learning mine.')
  if (c.voyageCount >= 50) lines.push(`${c.voyageCount} voyages, and I still look forward to the next.`)
  return pick(lines, n)
}

/** What the captain says when you steady the wheel with them. */
export function steadyLine(weather: Weather, n: number): string {
  return pick(
    weather === 'storm' || weather === 'rough'
      ? ['Thank you. Two hands on this one.', 'That’s it, hold her there!', 'Steady… steady… good.']
      : ['Gently does it.', 'You’ve a feel for it.', 'Easy now. That’s right.'],
    n,
  )
}
