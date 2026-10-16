// Which legendary and mythic classes have their own drawing.

import type { ReactNode } from 'react'
import { Stormchaser, TheErrand, Kingfisher, TheGull, Salvager, TheCormorant, Nightrunner, TheMeridian, Ironjaw, TheMirabel, TheColossus, GrandDame, TheGhost, DerelictQueen, TheLongNight, TheUnmoored, SaintElmo, type SP } from './Specials'

export const SPECIALS: Record<string, (p: SP) => ReactNode> = {
  stormchaser: Stormchaser,
  'the-errand': TheErrand,
  kingfisher: Kingfisher,
  'the-gull': TheGull,
  salvager: Salvager,
  'the-cormorant': TheCormorant,
  nightrunner: Nightrunner,
  'the-meridian': TheMeridian,
  ironjaw: Ironjaw,
  'the-mirabel': TheMirabel,
  'the-colossus': TheColossus,
  'grand-dame': GrandDame,
  'the-ghost': TheGhost,
  'derelict-queen': DerelictQueen,
  'the-long-night': TheLongNight,
  'the-unmoored': TheUnmoored,
  'saint-elmo': SaintElmo,
}
