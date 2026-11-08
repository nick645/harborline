// Welcome back: everything that happened while you were away, in one card. What the trips paid
// and what went out, what came home (rare finds by name, fittings counted), who signed on and
// who went elsewhere, which prospects lean your way now, who rose, new waters, and what was lost.

import { Pressable, Text, View } from 'react-native'
import type { AwayReport, GameState } from '../../../src/game/types'
import { getPart, partName, setProgress } from '../../../src/game/parts'
import { getKeepsake } from '../../../src/game/data/keepsakes'
import { courtedPeople } from '../../../src/game/crew'
import { coins, duration } from '../../../src/format'
import { fonts, useTheme } from '../theme'
import { Card } from './ui'

function Line({ mark, color, children }: { mark: string; color: string; children: React.ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Text style={{ width: 16, textAlign: 'center', color, fontSize: 14, lineHeight: 20 }}>{mark}</Text>
      <Text style={{ flex: 1, color: t.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  )
}

function B({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: fonts.bold }}>{children}</Text>
}

const list = (names: string[]) => (names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`)

export function AwaySummary({ report: r, game, now, onDismiss }: { report: AwayReport; game: GameState; now: number; onDismiss: () => void }) {
  const t = useTheme()
  const spent = Math.max(0, r.tripPay - r.coinsEarned)
  const notable = r.finds.filter((f) => f.part && getPart(f.part).rarity !== 'standard')
  const fittings = r.finds.filter((f) => f.part && getPart(f.part).rarity === 'standard').length
  const leaning = courtedPeople(game, now).filter((p) => p.court.forecast === 'you' && p.budget.status !== 'passed')
  const bad = r.sunk.length + r.lost.length + r.captainsLost.length + r.resigned.length > 0
  return (
    <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityHint="Dismisses the summary">
      <Card accent={bad ? t.bad : t.accent} style={{ gap: 6 }}>
        <Text style={{ color: t.text, fontFamily: fonts.title, fontSize: 20 }}>Welcome back</Text>
        <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12, marginTop: -4 }}>While you were away · {duration(r.awayMs)}</Text>

        {r.tripsCompleted > 0 && (
          <Line mark="⚓︎" color={t.accent}>
            {r.tripsCompleted} trip{r.tripsCompleted === 1 ? '' : 's'} paid <B>{coins(r.tripPay)}c</B>
            {spent > 0 ? ` · ${coins(spent)}c went on fees and upkeep` : ''}
          </Line>
        )}
        {notable.map((f, i) => {
          const part = getPart(f.part!)
          const set = setProgress(game.player.partInventory, f.part!)
          const color = part.rarity === 'mythic' ? t.mythic : part.rarity === 'legendary' ? t.legendary : t.rare
          return (
            <Line key={`p${i}`} mark="✦" color={color}>
              <Text style={{ color, fontFamily: fonts.bold }}>{part.rarity === 'mythic' ? 'Mythic' : part.rarity === 'legendary' ? 'Legendary' : 'Rare'}:</Text> {f.boat} found{' '}
              <B>{partName(f.part!)}</B>
              {set && set.need > 1 ? ` · ${set.have} of ${set.need} for the ${set.boat}` : ''}
            </Line>
          )
        })}
        {r.finds
          .filter((f) => f.keepsake)
          .map((f, i) => (
            <Line key={`k${i}`} mark="❖" color={t.accent}>
              {f.boat} brought home <B>{getKeepsake(f.keepsake!)?.name}</B> for the house
            </Line>
          ))}
        {fittings > 0 && (
          <Line mark="•" color={t.muted}>
            {fittings} standard fitting{fittings === 1 ? '' : 's'}, in the Workshop
          </Line>
        )}
        {r.signed.length > 0 && (
          <Line mark="✓" color={t.good}>
            <B>{list(r.signed)}</B> signed on with your line
          </Line>
        )}
        {leaning.length > 0 && (
          <Line mark="➚" color={t.good}>
            Leaning your way: {list(leaning.map((p) => p.name))}
            {leaning.some((p) => p.budget.status === 'short') ? ' (not all covered by your coins)' : ''}
          </Line>
        )}
        {r.wentElsewhere.length > 0 && (
          <Line mark="✗" color={t.bad}>
            {list(r.wentElsewhere)} went to rival lines
          </Line>
        )}
        {r.risen.map((x, i) => (
          <Line key={`r${i}`} mark="▲" color={t.legendary}>
            {x}
          </Line>
        ))}
        {r.charted.map((x) => (
          <Line key={x} mark="✧" color={t.accent}>
            Charted <B>{x}</B>: new waters to sail
          </Line>
        ))}
        {r.sunk.length > 0 && (
          <Line mark="✗" color={t.bad}>
            Sunk: <B>{list(r.sunk)}</B>
          </Line>
        )}
        {r.lost.length > 0 && (
          <Line mark="✗" color={t.bad}>
            Cargo lost to the weather: {list(r.lost)}
          </Line>
        )}
        {r.resigned.map((x, i) => (
          <Line key={`q${i}`} mark="✗" color={t.bad}>
            <B>{x.name}</B> resigned and signed with {x.rival}
          </Line>
        ))}
        {r.shaken
          .filter((x) => !r.resigned.some((q) => q.name === x.name))
          .map((x, i) => (
            <Line key={`s${i}`} mark="⚠" color={t.warn}>
              <B>{x.name}</B> is close to quitting: give them calm, safe voyages
            </Line>
          ))}
        {r.captainsLost.length > 0 && (
          <Line mark="✗" color={t.bad}>
            Lost at sea: <B>{list(r.captainsLost)}</B>
          </Line>
        )}
        <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>Tap to dismiss</Text>
      </Card>
    </Pressable>
  )
}
