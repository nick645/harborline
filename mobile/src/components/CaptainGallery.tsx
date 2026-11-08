// Dev tool: thirty procedurally assembled captains in the storybook style (parts/), against the
// classic look they'd have without it, every new part on its own, and portrait-size heads. Ten
// animated figures at a time: more than that blanks Skia.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Canvas, Group, Rect } from '@shopify/react-native-skia'
import { RATING_TITLES } from '../../../src/game/data/captains'
import type { RegionId } from '../../../src/game/data/ports'
import { Figure } from '../art/Figure'
import { Walker } from '../art/Walker'
import { lookFor, type Look } from '../art/looks'
import { storybookLook } from '../art/parts/upgrade'
import { ACCESSORY_PARTS, BEARD_PARTS, COAT_PARTS, HAIR_PARTS, HAT_PARTS, type StorybookParts } from '../art/parts/registry'
import { useSceneClock } from '../art/clock'
import { fonts, useTheme } from '../theme'
import { Segments, Strip } from './ui'

const W = 104
const H = 196
const REGIONS: RegionId[] = ['bay', 'fogbanks', 'sunward', 'ironcliffs', 'lantern']
const REGION_SHORT: Record<RegionId, string> = { bay: 'Bay', fogbanks: 'Fogbanks', sunward: 'Sunward', ironcliffs: 'Ironcliffs', lantern: 'Lantern' }

/** Thirty captains across regions and titles; two are rare tavern finds. */
const CAPTAINS = Array.from({ length: 30 }, (_, i) => {
  const id = `gallery-c${i * 7 + 3}`
  const region = REGIONS[i % 5]
  const rare = i === 7 || i === 22
  const title = (i * 3) % 10
  const old = lookFor(id, rare, region, null, title)
  return { id, region, rare, title, old, now: storybookLook(old, id, region) }
})

/** Every new part, on a plain captain, one at a time. */
const PARTS: { label: string; look: Look }[] = (() => {
  const base = (k: string, region: RegionId) => lookFor(`gallery-part-${k}`, false, region, null, 5)
  const wear = (look: Look, parts: StorybookParts): Look => ({
    ...look,
    parts,
    hairStyle: parts.hair ? 'cropped' : look.hairStyle,
    hat: parts.hat || parts.hair === 'headwrap' || (parts.hair && (look.hat === 'bare' || look.hat === 'bun')) ? 'none' : look.hat,
    facialHair: parts.beard ? 'none' : look.facialHair,
    coatStyle: parts.coat ? 'peacoat' : look.coatStyle,
    coat: parts.coat ? { 'naval-officer': '#1f2f4a', 'fur-longcoat': '#5a3f2e', 'island-jacket': '#2f7a7a' }[parts.coat] : look.coat,
    glasses: parts.accessory === 'monocle' ? false : look.glasses,
  })
  return [
    ...HAIR_PARTS.map((p) => ({ label: `Hair · ${p}`, look: wear({ ...base(p, 'bay'), hat: 'bare' }, { hair: p }) })),
    ...HAT_PARTS.map((p) => ({ label: `Hat · ${p}`, look: wear(base(p, 'bay'), { hat: p }) })),
    ...COAT_PARTS.map((p) => ({ label: `Coat · ${p}`, look: wear(base(p, 'bay'), { coat: p }) })),
    ...BEARD_PARTS.map((p) => ({ label: `Beard · ${p}`, look: wear(base(p, 'bay'), { beard: p }) })),
    ...ACCESSORY_PARTS.map((p) => ({ label: `Extra · ${p}`, look: wear(base(p, 'bay'), { accessory: p }) })),
  ]
})()

type Mode = 'new' | 'old' | 'compare' | 'parts' | 'small'
const PAGE: Record<Mode, number> = { new: 10, old: 10, compare: 5, parts: 8, small: 10 }

export function CaptainGallery() {
  const t = useTheme()
  const clock = useSceneClock()
  const [mode, setMode] = useState<Mode>('compare')
  const [page, setPage] = useState(0)
  const total = mode === 'parts' ? PARTS.length : CAPTAINS.length
  const pages = Math.ceil(total / PAGE[mode])
  const at = Math.min(page, pages - 1)
  const from = at * PAGE[mode]
  const caption = (c: (typeof CAPTAINS)[number]) =>
    `${c.rare ? '✦ ' : ''}${REGION_SHORT[c.region]} · ${RATING_TITLES[c.title]}${c.now.parts ? ` · ${Object.values(c.now.parts).join(', ')}` : ' · classic'}`

  const figure = (look: Look, key: string, i: number) => (
    <Canvas key={key} style={{ width: W, height: H, borderRadius: 8 }}>
      <Rect x={0} y={0} width={W} height={H} color="#2b1f2c" />
      <Figure look={look} x={(W - 56 * 1.15) / 2} y={H - 145 * 1.15 - 8} scale={1.15} clock={clock} offset={i * 377} legs rimLight="#ffd27a" />
    </Canvas>
  )

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 14 }}>Captain art: storybook parts</Text>
      <Segments
        items={[
          { id: 'compare', label: 'Compare' },
          { id: 'new', label: 'New' },
          { id: 'old', label: 'Old' },
          { id: 'parts', label: 'Parts' },
          { id: 'small', label: 'Small' },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m)
          setPage(0)
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setPage(Math.max(0, at - 1))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous page">
          <Text style={{ color: at > 0 ? t.accent : t.border, fontFamily: fonts.bold, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 12 }}>
          {mode === 'parts' ? 'Parts' : 'Captains'} {from + 1}–{Math.min(total, from + PAGE[mode])} of {total}
        </Text>
        <Pressable onPress={() => setPage(Math.min(pages - 1, at + 1))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next page">
          <Text style={{ color: at < pages - 1 ? t.accent : t.border, fontFamily: fonts.bold, fontSize: 18 }}>›</Text>
        </Pressable>
      </View>

      {mode === 'compare' && (
        // The first of the page walking, old and new, to check the stride and arm swing.
        <Canvas style={{ width: 330, height: 120, borderRadius: 8 }}>
          <Rect x={0} y={0} width={330} height={120} color="#2b1f2c" />
          <Group>
            <Walker look={CAPTAINS[from].old} clock={clock} x0={10} x1={130} footY={112} scale={0.62} speed={14} pauseMs={1600} />
            <Walker look={CAPTAINS[from].now} clock={clock} x0={180} x1={290} footY={112} scale={0.62} speed={14} pauseMs={1600} offset={700} />
          </Group>
        </Canvas>
      )}

      <Strip gap={6}>
        {mode === 'parts' &&
          PARTS.slice(from, from + PAGE.parts).map((p, i) => (
            <View key={p.label} style={{ width: W, gap: 2 }}>
              {figure(p.look, p.label, i)}
              <Text numberOfLines={2} style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 11 }}>{p.label}</Text>
            </View>
          ))}
        {(mode === 'new' || mode === 'old') &&
          CAPTAINS.slice(from, from + PAGE[mode]).map((c, i) => (
            <View key={c.id} style={{ width: W, gap: 2 }}>
              {figure(mode === 'new' ? c.now : c.old, c.id + mode, i)}
              <Text numberOfLines={3} style={{ color: c.rare ? t.legendary : t.muted, fontFamily: fonts.body, fontSize: 10 }}>{caption(c)}</Text>
            </View>
          ))}
        {mode === 'compare' &&
          CAPTAINS.slice(from, from + PAGE.compare).map((c, i) => (
            <View key={c.id} style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {figure(c.old, `${c.id}-old`, i)}
                {figure(c.now, `${c.id}-new`, i)}
              </View>
              <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 10 }}>Old · New</Text>
              <Text numberOfLines={3} style={{ width: W * 2, color: c.rare ? t.legendary : t.muted, fontFamily: fonts.body, fontSize: 10 }}>{caption(c)}</Text>
            </View>
          ))}
        {mode === 'small' &&
          CAPTAINS.slice(from, from + PAGE.small).map((c, i) => (
            // The roster's portrait size: does the new art still read this small?
            <View key={c.id} style={{ gap: 2, alignItems: 'center' }}>
              <Canvas style={{ width: 56, height: 64, borderRadius: 8 }}>
                <Rect x={0} y={0} width={56} height={64} color="#433145" />
                <Figure look={c.now} x={-6} y={-8} scale={1.2} clock={clock} offset={i * 311} rimLight="#ffd27a" />
              </Canvas>
              <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 9 }}>{REGION_SHORT[c.region]}</Text>
            </View>
          ))}
      </Strip>
    </View>
  )
}
