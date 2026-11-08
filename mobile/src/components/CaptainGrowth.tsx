// How good a captain is and how good they could become: their sea rating with a potential bar
// (Legend at 90, Mythic at 96 marked on it), and their badges, earned at sea level by level, with
// the ranks and signatures above them as goals. Only what you've learned shows.

import { Text, View } from 'react-native'
import type { CaptainView } from '../../../src/game/captains'
import { ratingTitle } from '../../../src/game/data/captains'
import { fonts, useTheme } from '../theme'

const ROMAN = ['', 'I', 'II', 'III']

/** The big number and the bar beneath it. */
export function RatingBlock({ c }: { c: CaptainView }) {
  const t = useTheme()
  const r = c.rating
  const g = c.growth
  const legendColor = '#e6a53a'
  const mythicColor = t.mythic
  const pos = (v: number) => `${Math.max(0, Math.min(100, v))}%` as const
  const growthText =
    g.known === 'unknown'
      ? `How far they could go: no more than ${g.ordinaryMax} if ordinary; Legend or beyond if they have it in them. Scout them, or sail with them.`
      : g.known === 'exact'
        ? g.band[1] <= r.guess
          ? `At their peak: ${g.band[1]} (${ratingTitle(g.band[1])}) is as high as they go`
          : `The highest they can reach: ${g.band[1]}, ${ratingTitle(g.band[1])}`
        : g.band[1] >= 96
          ? `Could grow to about ${g.band[0]}–${g.band[1]}: Mythic territory`
          : g.band[1] >= 90
            ? `Could grow to about ${g.band[0]}–${g.band[1]}: Legend territory`
            : `Could grow to about ${g.band[0]}–${g.band[1]}: ${ratingTitle(g.band[0]) === ratingTitle(g.band[1]) ? ratingTitle(g.band[1]) : `${ratingTitle(g.band[0])} to ${ratingTitle(g.band[1])}`}`
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Text style={{ fontFamily: fonts.title, fontSize: 40, lineHeight: 42, color: t.accent }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: t.muted }}>LVL </Text>
          {r.guess}
        </Text>
        <View style={{ paddingBottom: 5, flexShrink: 1 }}>
          <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 14 }}>
            {ratingTitle(r.guess)}
          </Text>
          <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
            {r.sure
              ? 'The average of their five skills'
              : r.from === 'reputation'
                ? `By reputation alone: ${r.band[0]}–${r.band[1]}. Scout them to know`
                : `Somewhere ${r.band[0]}–${r.band[1]}: learn more to be sure`}
          </Text>
        </View>
      </View>
      {/* 1–100: where they are, how far they could go, and the ranks above */}
      <View style={{ height: 14, borderRadius: 7, backgroundColor: t.border, overflow: 'hidden' }}>
        {/* Room to grow */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: pos(r.guess),
            width: `${Math.max(0, g.band[1] - r.guess)}%`,
            backgroundColor: t.accent,
            opacity: g.known === 'unknown' ? 0.12 : 0.28,
          }}
        />
        {g.known !== 'unknown' && (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: pos(g.band[0]), width: `${Math.max(1, g.band[1] - g.band[0])}%`, backgroundColor: t.accent, opacity: g.known === 'exact' ? 0.9 : 0.25 }} />
        )}
        {/* Where they are now */}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: pos(r.guess), backgroundColor: t.accent, borderRadius: 7 }} />
        {/* Legend and Mythic marks */}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: '90%', width: 2, backgroundColor: legendColor }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: '96%', width: 2, backgroundColor: mythicColor }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12, flexShrink: 1 }}>{growthText}</Text>
        <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 11 }}>
          <Text style={{ color: legendColor }}>Legend 90</Text> · <Text style={{ color: mythicColor }}>Mythic 96</Text>
        </Text>
      </View>
    </View>
  )
}

/** The Badges tab: what they've earned and what's next, then the ranks above five anchors. */
export function BadgesPanel({ c }: { c: CaptainView }) {
  const t = useTheme()
  const earned = c.badges.filter((b) => b.level > 0).length
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
        {earned ? `${earned} of ${c.badges.length} earned.` : 'None earned yet.'} Badges come from what they do at sea, and grow in three levels.
      </Text>
      {c.badges.map((b) => {
        const lit = b.level > 0
        const progress = b.next ? Math.min(1, b.count / b.next) : 1
        return (
          <View key={b.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: lit ? t.accent : t.border, padding: 10 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: lit ? t.accent : t.surface2,
                borderWidth: 2,
                borderColor: lit ? '#f6d28a' : t.border,
              }}
            >
              <Text style={{ fontSize: 20, color: lit ? '#2b1f2c' : t.muted, opacity: lit ? 1 : 0.6 }}>{b.mark}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: lit ? t.text : t.muted, fontFamily: fonts.bold, fontSize: 15 }}>
                  {b.name} {lit && <Text style={{ color: t.accent }}>{ROMAN[b.level]}</Text>}
                </Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3].map((lv) => (
                    <View key={lv} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.level >= lv ? t.accent : t.border }} />
                  ))}
                </View>
              </View>
              <Text style={{ color: lit ? t.good : t.muted, fontFamily: fonts.medium, fontSize: 13 }}>{b.bonus ?? `Level I: ${b.bonuses[0]}`}</Text>
              {b.next ? (
                <>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden', marginTop: 2 }}>
                    <View style={{ width: `${progress * 100}%`, height: 5, backgroundColor: t.accent }} />
                  </View>
                  <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
                    {b.earn}: {b.count} of {b.next} for level {ROMAN[b.level + 1]}
                    {lit && b.level < 3 ? ` (${b.bonuses[b.level as 0 | 1 | 2]})` : ''}
                  </Text>
                </>
              ) : (
                <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>Mastered: {b.count} {b.earn.toLowerCase()}</Text>
              )}
            </View>
          </View>
        )
      })}

      <Text style={{ color: t.text, fontFamily: fonts.title, fontSize: 20, marginTop: 6 }}>Above five anchors</Text>
      {c.rankGoals.map((g) => {
        const color = g.rank === 'legend' ? '#e6a53a' : t.mythic
        const name = g.rank === 'legend' ? 'Legend' : 'Mythic'
        const status = g.reached
          ? `${name}: earned`
          : g.open === 'yes'
            ? `Rating ${g.at} makes them a ${name}: ${Math.max(0, g.at - c.rating.guess)} to go`
            : g.open === 'no'
              ? `Not in them to become a ${name}`
              : `Rating ${g.at}, if they have it in them (you don't know yet)`
        const mine = c.rankAbilities.map((a) => a.id)
        return (
          <View key={g.rank} style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: g.reached ? color : t.border, padding: 10, gap: 4, opacity: g.open === 'no' && !g.reached ? 0.6 : 1 }}>
            <Text style={{ color, fontFamily: fonts.bold, fontSize: 15 }}>{status}</Text>
            {!g.reached && g.open !== 'no' && (
              <View style={{ height: 5, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, (c.rating.guess / g.at) * 100)}%`, height: 5, backgroundColor: color }} />
              </View>
            )}
            <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>{g.reached ? 'Their signature:' : 'The sea gives them one of these signatures:'}</Text>
            {g.abilities
              .filter((a) => !g.reached || mine.includes(a.id))
              .map((a) => (
                <Text key={a.id} style={{ color: mine.includes(a.id) ? t.text : t.muted, fontFamily: fonts.body, fontSize: 13 }}>
                  <Text style={{ fontFamily: fonts.semibold, color: mine.includes(a.id) ? color : t.text }}>{a.name}</Text> · {a.description}
                </Text>
              ))}
          </View>
        )
      })}
    </View>
  )
}

/** The Record tab: what they've sailed, and the grade it's earned them. */
export function RecordPanel({ c }: { c: CaptainView }) {
  const t = useTheme()
  const rec = c.record
  const rows: [string, number, string][] = [
    ['Calm', rec.calm, t.calm],
    ['Choppy', rec.choppy, t.choppy],
    ['Rough', rec.rough, t.rough],
    ['Storm', rec.storm, t.storm],
  ]
  const most = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <View style={{ gap: 10 }}>
      <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: c.grade ? t.accent : t.border, padding: 12, gap: 4 }}>
        <Text style={{ color: t.muted, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1 }}>GRADE</Text>
        {c.grade ? (
          <>
            <Text style={{ color: t.accent, fontFamily: fonts.title, fontSize: 26 }}>{c.grade.name}</Text>
            <Text style={{ color: t.text, fontFamily: fonts.body, fontSize: 14 }}>{c.grade.blurb}</Text>
          </>
        ) : (
          <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 14 }}>
            Not known yet.{' '}
            {c.gradeIn > 0 ? `${c.gradeIn} more voyage${c.gradeIn === 1 ? '' : 's'} together, ` : ''}
            {c.rating.sure ? '' : 'and a surer read of their skills (scouting helps), '}
            then you'll know what sort of captain they are.
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(
          [
            ['Voyages', c.voyageCount],
            ['Cargo', rec.cargo],
            ['Passengers', rec.passenger],
            ['By night', rec.night],
          ] as [string, number][]
        ).map(([label, n]) => (
          <View key={label} style={{ flex: 1, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingVertical: 8, alignItems: 'center' }}>
            <Text style={{ color: t.text, fontFamily: fonts.title, fontSize: 24 }}>{n}</Text>
            <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 11 }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 12, gap: 6 }}>
        <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 14 }}>Weather they've sailed through</Text>
        {rows.map(([label, n, color]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ width: 56, color: t.muted, fontFamily: fonts.body, fontSize: 13 }}>{label}</Text>
            <View style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: t.border, overflow: 'hidden' }}>
              <View style={{ width: `${(n / most) * 100}%`, height: 9, borderRadius: 5, backgroundColor: color }} />
            </View>
            <Text style={{ width: 30, textAlign: 'right', color: t.text, fontFamily: fonts.semibold, fontSize: 13 }}>{n}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const MOOD_WORDS = { good: 'In good heart', steady: 'Steady', unsettled: 'Unsettled', quitting: 'Close to quitting' } as const

/** Their morale: a meter, how it reads, and what moves it (or that they'll never leave). */
export function MoraleBlock({ c }: { c: CaptainView }) {
  const t = useTheme()
  const m = c.morale
  const color = m.mood === 'good' ? t.good : m.mood === 'steady' ? t.accent : m.mood === 'unsettled' ? t.warn : t.bad
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 14 }}>Morale</Text>
        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.border, overflow: 'hidden' }}>
          <View style={{ width: `${m.value}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
        </View>
        <Text style={{ color, fontFamily: fonts.bold, fontSize: 13 }}>{MOOD_WORDS[m.mood]}</Text>
      </View>
      <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
        {m.steadfast
          ? 'They\'ll never leave you, whatever the sea does.'
          : m.mood === 'quitting'
            ? 'One more bad voyage and they could resign to a rival line. Calm, safe voyages steady them.'
            : 'Sinkings, battered hulls and storms wear it down; calm, safe voyages build it back. At nothing they resign.'}
      </Text>
    </View>
  )
}
