// The storybook parts must never move an existing captain's look: lookFor gives exactly what it
// gave before the library (looks.baseline.json, taken first), and the upgrade is deterministic,
// keeps regional dress, rare captains and personas, and pairs parts without clashes.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lookFor } from '../looks'
import { storybookLook, storybookLookFor } from './upgrade'
import { ACCESSORY_PARTS, BEARD_PARTS, COAT_PARTS, COAT_REGIONS, HAIR_PARTS, HAT_PARTS, HAT_REGIONS } from './registry'

const REGIONS = ['bay', 'fogbanks', 'sunward', 'ironcliffs', 'lantern'] as const
const plain = (x: unknown) => JSON.parse(JSON.stringify(x))

describe('classic looks', () => {
  it('are exactly as they were before the parts library', () => {
    const baseline = JSON.parse(readFileSync(join(__dirname, 'looks.baseline.json'), 'utf8')) as Record<string, unknown>
    for (const [key, want] of Object.entries(baseline)) {
      if (key.startsWith('persona|')) {
        const p = key.slice(8)
        expect(plain(lookFor(`p-${p}`, false, 'bay', p))).toEqual(want)
        continue
      }
      const [id, region, rare] = key.split('|')
      expect(plain(lookFor(id, rare === 'true', region as (typeof REGIONS)[number]))).toEqual(want)
    }
  })
})

describe('storybook looks', () => {
  const sample = Array.from({ length: 600 }, (_, i) => ({ id: `c${i}`, region: REGIONS[i % 5], rare: i % 11 === 0 }))

  it('are the same every time for the same captain', () => {
    for (const c of sample.slice(0, 100)) expect(storybookLookFor(c.id, c.rare, c.region)).toEqual(storybookLookFor(c.id, c.rare, c.region))
  })

  it('keep the face: skin, age, build, brow, nose and glasses never change', () => {
    for (const c of sample) {
      const a = lookFor(c.id, c.rare, c.region)
      const b = storybookLook(a, c.id, c.region)
      for (const k of ['skin', 'age', 'build', 'brow', 'nose', 'glasses', 'hair', 'prop', 'trousers', 'boots'] as const) expect(b[k]).toEqual(a[k])
    }
  })

  it('dress by region, leave rare captains their tricorn and Legends their persona', () => {
    for (const c of sample) {
      const b = storybookLookFor(c.id, c.rare, c.region)
      if (b.parts?.hat) expect(HAT_REGIONS[b.parts.hat]).toContain(c.region)
      if (b.parts?.coat) expect(COAT_REGIONS[b.parts.coat]).toContain(c.region)
      if (c.rare) {
        expect(b.hat).toBe('tricorn')
        expect(b.coatStyle).toBe('greatcoat')
        expect(b.parts?.hat).toBeUndefined()
        expect(b.parts?.coat).toBeUndefined()
      }
    }
    expect(storybookLookFor('p1', false, 'bay', 'admiral')).toEqual(lookFor('p1', false, 'bay', 'admiral'))
  })

  it('never clash: one thing on the head, no monocle over glasses, beards only for the bearded', () => {
    for (const c of sample) {
      const a = lookFor(c.id, c.rare, c.region)
      const b = storybookLook(a, c.id, c.region)
      const p = b.parts ?? {}
      if (p.hat || p.hair === 'headwrap') expect(b.hat).toBe('none')
      if (p.hat) expect(p.hair).not.toBe('headwrap')
      if (p.accessory === 'monocle') expect(b.glasses).toBe(false)
      if (p.accessory === 'gold-hoop') expect(b.extra).not.toBe('earring')
      if (p.beard) expect(a.facialHair).not.toBe('none')
      if (p.hair) expect(b.hairStyle).toBe('cropped')
    }
  })

  it('use every new part somewhere, and leave some captains classic', () => {
    const seen = new Set<string>()
    let classic = 0
    for (const c of sample) {
      const p = storybookLookFor(c.id, false, c.region).parts
      if (!p) classic++
      for (const v of Object.values(p ?? {})) seen.add(v)
    }
    for (const id of [...HAIR_PARTS, ...HAT_PARTS, ...COAT_PARTS, ...BEARD_PARTS, ...ACCESSORY_PARTS]) expect(seen).toContain(id)
    expect(classic).toBeGreaterThan(0)
  })
})
