// Harborline's soundtrack and sounds, synthesized from scratch: no samples, no recordings, nothing
// licensed. Run `npm run audio` to rebuild mobile/assets/audio/*.wav (the files are committed, so
// the app builds without running this). Every random choice comes from a fixed seed, so the same
// code always makes the same files.
//
// Instruments are additive (exact pitch at a low sample rate): a plucked string, a squeezebox
// with two beating reeds, a music box, a ship's bell, timpani and a soft pad. Sea, wind, rain,
// fire and a tavern crowd are shaped noise. Loops wrap their tails back onto their start, so
// they repeat without a seam.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SR = 22050
const OUT = join(import.meta.dirname, '..', 'mobile', 'assets', 'audio')

// ---------- basics ----------

let seed = 0x5eed
function rnd(): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}
const range = (a: number, b: number) => a + (b - a) * rnd()
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12)
const buf = (sec: number) => new Float32Array(Math.ceil(sec * SR))

function mixInto(dst: Float32Array, src: Float32Array, atSec: number, gain = 1) {
  const o = Math.round(atSec * SR)
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain
}

/** An RBJ biquad; `set` may be called while running for sweeps. */
class Biquad {
  private b0 = 1
  private b1 = 0
  private b2 = 0
  private a1 = 0
  private a2 = 0
  private x1 = 0
  private x2 = 0
  private y1 = 0
  private y2 = 0
  constructor(type: 'lp' | 'hp' | 'bp', f: number, q = 0.707) {
    this.set(type, f, q)
  }
  set(type: 'lp' | 'hp' | 'bp', f: number, q = 0.707) {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR
    const cos = Math.cos(w)
    const alpha = Math.sin(w) / (2 * q)
    const a0 = 1 + alpha
    if (type === 'lp') {
      this.b0 = (1 - cos) / 2 / a0
      this.b1 = (1 - cos) / a0
      this.b2 = this.b0
    } else if (type === 'hp') {
      this.b0 = (1 + cos) / 2 / a0
      this.b1 = -(1 + cos) / a0
      this.b2 = this.b0
    } else {
      this.b0 = alpha / a0
      this.b1 = 0
      this.b2 = -alpha / a0
    }
    this.a1 = (-2 * cos) / a0
    this.a2 = (1 - alpha) / a0
  }
  run(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

function filter(src: Float32Array, type: 'lp' | 'hp' | 'bp', f: number, q?: number): Float32Array {
  const bq = new Biquad(type, f, q)
  return src.map((x) => bq.run(x))
}

/** A small Schroeder room: four damped combs into two allpasses. */
function reverb(src: Float32Array, wet = 0.25, size = 1): Float32Array {
  const combs = [558, 594, 639, 678].map((d) => ({ d: Math.round(d * size), buf: new Float32Array(Math.round(d * size)), i: 0, lp: 0 }))
  const alls = [278, 220].map((d) => ({ d, buf: new Float32Array(d), i: 0 }))
  const out = new Float32Array(src.length)
  for (let n = 0; n < src.length; n++) {
    let s = 0
    for (const c of combs) {
      const y = c.buf[c.i]
      c.lp = y * 0.7 + c.lp * 0.3
      c.buf[c.i] = src[n] * 0.015 + c.lp * 0.8
      c.i = (c.i + 1) % c.d
      s += y
    }
    for (const a of alls) {
      const y = a.buf[a.i]
      a.buf[a.i] = s + y * 0.5
      a.i = (a.i + 1) % a.d
      s = y - s * 0.5
    }
    out[n] = src[n] * (1 - wet) + s * wet * 4
  }
  return out
}

// ---------- instruments ----------

type Partial = { ratio: number; amp: number; decay: number }

/** Sum of decaying sine partials: plucks, bells, music boxes, drums. */
function struck(freq: number, partials: Partial[], len: number, amp = 1, attack = 0.003): Float32Array {
  const out = buf(len)
  for (const p of partials) {
    const f = freq * p.ratio
    if (f > SR * 0.45) continue
    const w = (2 * Math.PI * f) / SR
    const ph = rnd() * Math.PI * 2
    for (let i = 0; i < out.length; i++) {
      const t = i / SR
      out[i] += Math.sin(w * i + ph) * p.amp * Math.exp(-t * p.decay)
    }
  }
  const a = Math.max(1, attack * SR)
  for (let i = 0; i < out.length; i++) out[i] *= amp * Math.min(1, i / a)
  return out
}

const pluck = (m: number, amp = 0.5, len = 1.6) =>
  struck(
    mtof(m),
    Array.from({ length: 10 }, (_, k) => ({ ratio: k + 1, amp: 0.62 ** k / (1 + k * 0.3), decay: 2.2 + k * 1.4 })),
    len,
    amp,
  )
const harp = (m: number, amp = 0.4) =>
  struck(mtof(m), [1, 2, 3, 4].map((r, k) => ({ ratio: r, amp: [1, 0.35, 0.12, 0.05][k], decay: 1.3 + k * 1.2 })), 3, amp, 0.004)
const musicBox = (m: number, amp = 0.35) =>
  struck(mtof(m), [{ ratio: 1, amp: 1, decay: 2.2 }, { ratio: 3.01, amp: 0.25, decay: 6 }, { ratio: 5.43, amp: 0.1, decay: 10 }], 2.2, amp)
const bass = (m: number, amp = 0.6, len = 1.4) =>
  struck(mtof(m), [{ ratio: 1, amp: 1, decay: 2.4 }, { ratio: 2, amp: 0.35, decay: 4 }, { ratio: 3, amp: 0.12, decay: 6 }], len, amp, 0.006)
/** A ship's bell: hum, prime, tierce, quint, nominal, slightly out of true. */
const shipBell = (m: number, amp = 0.5, len = 4) =>
  struck(
    mtof(m),
    [
      { ratio: 0.5, amp: 0.5, decay: 0.5 },
      { ratio: 1, amp: 1, decay: 0.9 },
      { ratio: 1.19, amp: 0.55, decay: 1.2 },
      { ratio: 1.5, amp: 0.3, decay: 1.6 },
      { ratio: 2.0, amp: 0.45, decay: 1.4 },
      { ratio: 2.51, amp: 0.25, decay: 2.4 },
      { ratio: 2.66, amp: 0.2, decay: 2.8 },
      { ratio: 3.98, amp: 0.12, decay: 4 },
    ],
    len,
    amp,
    0.001,
  )
function timpani(m: number, amp = 0.7): Float32Array {
  const out = struck(mtof(m), [{ ratio: 1, amp: 1, decay: 2.2 }, { ratio: 1.5, amp: 0.5, decay: 3.5 }, { ratio: 1.98, amp: 0.3, decay: 4.5 }, { ratio: 2.44, amp: 0.15, decay: 6 }], 2.5, amp, 0.002)
  const thump = filter(Float32Array.from({ length: Math.round(0.08 * SR) }, (_, i) => (rnd() * 2 - 1) * Math.exp(-i / (0.015 * SR)) * Math.min(1, i / 40)), 'lp', 400)
  mixInto(out, thump, 0, amp * 0.8)
  return out
}

/** A squeezebox note: two reeds a few cents apart, so it breathes. */
function squeeze(m: number, len: number, amp = 0.25): Float32Array {
  const out = buf(len + 0.15)
  const f = mtof(m)
  for (const cents of [-4, 4]) {
    const fv = f * 2 ** (cents / 1200)
    for (let k = 1; k <= 9; k++) {
      if (fv * k > SR * 0.45) break
      const w = (2 * Math.PI * fv * k) / SR
      const a = 1 / k ** 1.25
      for (let i = 0; i < out.length; i++) out[i] += Math.sin(w * i) * a
    }
  }
  const att = 0.045 * SR
  const rel = 0.12 * SR
  const end = len * SR
  for (let i = 0; i < out.length; i++) {
    const env = Math.min(1, i / att) * (i < end ? 1 : Math.max(0, 1 - (i - end) / rel))
    const swell = 1 + 0.08 * Math.sin((2 * Math.PI * i) / SR / Math.max(0.6, len))
    out[i] *= env * swell * amp * 0.35
  }
  return out
}

function pad(ms: number[], len: number, amp = 0.15): Float32Array {
  const out = buf(len + 1.5)
  for (const m of ms) {
    const f = mtof(m)
    for (const [r, a] of [[1, 1], [2, 0.3], [3, 0.1]] as const) {
      const w = (2 * Math.PI * f * r) / SR
      for (let i = 0; i < out.length; i++) out[i] += Math.sin(w * i + r) * a
    }
  }
  const att = 0.8 * SR
  const end = len * SR
  for (let i = 0; i < out.length; i++) {
    const env = Math.min(1, i / att) * (i < end ? 1 : Math.max(0, 1 - (i - end) / (1.4 * SR)))
    out[i] *= env * amp / ms.length
  }
  return out
}

// ---------- noise ----------

const white = (sec: number) => Float32Array.from({ length: Math.ceil(sec * SR) }, () => rnd() * 2 - 1)
function brown(sec: number): Float32Array {
  let b = 0
  return white(sec).map((x) => (b = b * 0.985 + x * 0.12))
}

/** Waves on a shore: swells that each rise, break with a fizz, and drain away. */
function waves(sec: number, strength = 1): Float32Array {
  const n = Math.ceil(sec * SR)
  const env = new Float32Array(n)
  for (let t = range(0, 2); t < sec; t += range(4.5, 8) / strength) {
    const rise = range(1.2, 2)
    const fall = range(2.5, 4)
    const peak = range(0.6, 1)
    for (let i = Math.floor(t * SR); i < Math.min(n, (t + rise + fall) * SR); i++) {
      const u = i / SR - t
      env[i] = Math.max(env[i], peak * (u < rise ? (u / rise) ** 2 : Math.exp(-(u - rise) / (fall / 3))))
    }
  }
  const body = brown(sec)
  const fizz = white(sec)
  const lp = new Biquad('lp', 400)
  const hp = new Biquad('hp', 2500)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const e = 0.25 + env[i] * 0.75
    if (i % 64 === 0) lp.set('lp', 250 + 900 * env[i])
    out[i] = lp.run(body[i]) * e * 1.4 + hp.run(fizz[i]) * env[i] ** 2 * 0.12 * strength
  }
  return out
}

/** A gull: "kee-ow", two or three times. */
function gull(): Float32Array {
  const calls = 2 + Math.floor(rnd() * 2)
  const out = buf(calls * 0.5 + 0.3)
  const base = range(1300, 1700)
  for (let c = 0; c < calls; c++) {
    const d = range(0.26, 0.36)
    const at = c * range(0.38, 0.48)
    let ph = 0
    const o = Math.round(at * SR)
    for (let i = 0; i < d * SR; i++) {
      const u = i / (d * SR)
      const f = base * (1 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.6)) - 0.25 * u)
      ph += (2 * Math.PI * f) / SR
      const a = Math.sin(Math.PI * u) ** 0.6 * (1 - 0.3 * u)
      out[o + i] += (Math.sin(ph) + 0.45 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph)) * a * 0.3
    }
  }
  return reverb(filter(out, 'lp', 4500), 0.2)
}

/** Wood and rope under load: stick-slip pulses through a hollow resonance. */
function creak(len = 0.9): Float32Array {
  const out = buf(len + 0.1)
  let t = 0
  while (t < len) {
    const u = t / len
    out[Math.round(t * SR)] += Math.sin(Math.PI * u) * range(0.6, 1)
    t += (0.006 + 0.007 * Math.sin(u * 5) ** 2) * range(0.85, 1.15)
  }
  const a = filter(out, 'bp', range(320, 480), 9)
  const b = filter(out, 'bp', range(900, 1200), 7)
  return a.map((x, i) => x * 2.4 + b[i] * 0.8)
}

function wind(sec: number, strength = 1): Float32Array {
  const src = white(sec)
  const bq = new Biquad('bp', 500, 1.2)
  const out = new Float32Array(src.length)
  const p1 = range(5, 9)
  const p2 = range(2.5, 4)
  for (let i = 0; i < src.length; i++) {
    const t = i / SR
    const gust = 0.5 + 0.35 * Math.sin((2 * Math.PI * t) / p1) + 0.15 * Math.sin((2 * Math.PI * t) / p2 + 1)
    if (i % 64 === 0) bq.set('bp', 300 + 700 * gust * strength, 1.4)
    out[i] = bq.run(src[i]) * (0.3 + gust) * 1.6
  }
  return out
}

function rain(sec: number, density = 1): Float32Array {
  const out = filter(white(sec), 'hp', 1800).map((x) => x * 0.08 * density)
  const drops = Math.round(sec * 160 * density)
  for (let d = 0; d < drops; d++) {
    const drop = struck(range(1800, 4800), [{ ratio: 1, amp: 1, decay: 260 }], 0.03, range(0.02, 0.09))
    mixInto(out, drop, range(0, sec))
  }
  return filter(out, 'lp', 7000)
}

/** Sustained distant rumble with a crack in front. */
function thunder(): Float32Array {
  const len = range(3.5, 5)
  const out = buf(len)
  const crack = filter(white(0.25), 'hp', 900)
  for (let i = 0; i < crack.length; i++) out[i] += crack[i] * Math.exp(-i / (0.04 * SR)) * 0.5
  const rum = brown(len)
  const lp = new Biquad('lp', 180)
  let a = 0
  for (let i = 0; i < out.length; i++) {
    if (i % 512 === 0) a = Math.max(0, Math.min(1, a + range(-0.25, 0.3)))
    const u = i / out.length
    out[i] += lp.run(rum[i]) * 3.2 * (0.35 + 0.65 * a) * Math.min(1, i / (0.08 * SR)) * (1 - u) ** 1.4
  }
  return reverb(out, 0.3, 1.3)
}

function fire(sec: number): Float32Array {
  const out = filter(brown(sec), 'lp', 300).map((x) => x * 0.6)
  for (let t = 0; t < sec; t += range(0.02, 0.25)) {
    const pop = struck(range(900, 3200), [{ ratio: 1, amp: 1, decay: 300 }, { ratio: 1.7, amp: 0.5, decay: 400 }], 0.03, range(0.03, 0.2) ** 1.4 * 2)
    mixInto(out, pop, t)
  }
  return out
}

const glass = (amp = 0.15) =>
  struck(range(2200, 3200), [{ ratio: 1, amp: 1, decay: 8 }, { ratio: 2.71, amp: 0.4, decay: 12 }, { ratio: 5.1, amp: 0.15, decay: 20 }], 1, amp, 0.001)

/** A room of people talking, never in words: buzz and breath through moving vowels. */
function murmur(sec: number, voices = 6): Float32Array {
  const out = buf(sec)
  const vowels = [
    [700, 1150],
    [400, 1900],
    [300, 2200],
    [500, 900],
    [600, 1700],
    [350, 800],
  ]
  for (let v = 0; v < voices; v++) {
    const pitch = range(95, 230)
    const f1 = new Biquad('bp', 500, 5)
    const f2 = new Biquad('bp', 1500, 6)
    let ph = 0
    let t = range(0, 1.5)
    while (t < sec) {
      const phrase = range(0.8, 2.6)
      for (let s = t; s < Math.min(sec, t + phrase); ) {
        const syl = range(0.11, 0.24)
        const [a, b] = vowels[Math.floor(rnd() * vowels.length)]
        const drift = range(0.9, 1.15)
        for (let i = Math.floor(s * SR); i < Math.min(out.length, (s + syl) * SR); i++) {
          const u = (i / SR - s) / syl
          if (i % 32 === 0) {
            f1.set('bp', a * drift, 5)
            f2.set('bp', b * drift, 6)
          }
          ph += (2 * Math.PI * pitch * (1 + 0.06 * Math.sin(u * 3))) / SR
          const src = ((ph / Math.PI) % 2) - 1 + (rnd() * 2 - 1) * 0.3
          out[i] += (f1.run(src) + f2.run(src) * 0.5) * Math.sin(Math.PI * u) * 0.5
        }
        s += syl + (rnd() < 0.15 ? range(0.05, 0.2) : 0)
      }
      t += phrase + range(0.6, 2.5)
    }
  }
  return filter(out, 'lp', 1800)
}

// ---------- loops and files ----------

/** Fold everything past `len` back onto the start: notes ring across the loop point. */
function wrap(src: Float32Array, len: number): Float32Array {
  const n = Math.round(len * SR)
  const out = src.slice(0, n)
  for (let i = n; i < src.length; i++) out[(i - n) % n] += src[i]
  return out
}

/** Crossfade the overhang into the start, for noise beds that shouldn't double up. */
function seam(src: Float32Array, len: number, fade = 2.5): Float32Array {
  const n = Math.round(len * SR)
  const f = Math.round(fade * SR)
  const out = src.slice(0, n)
  for (let i = 0; i < f; i++) {
    const u = i / f
    out[i] = src[i] * Math.sin((u * Math.PI) / 2) + src[n + i] * Math.cos((u * Math.PI) / 2)
  }
  return out
}

function write(name: string, data: Float32Array, peak = 0.89) {
  let max = 0
  for (const x of data) {
    if (!Number.isFinite(x)) throw new Error(`${name}: not a number`)
    max = Math.max(max, Math.abs(x))
  }
  const g = max > 0 ? peak / max : 1
  const pcm = Buffer.alloc(44 + data.length * 2)
  pcm.write('RIFF', 0)
  pcm.writeUInt32LE(36 + data.length * 2, 4)
  pcm.write('WAVEfmt ', 8)
  pcm.writeUInt32LE(16, 16)
  pcm.writeUInt16LE(1, 20)
  pcm.writeUInt16LE(1, 22)
  pcm.writeUInt32LE(SR, 24)
  pcm.writeUInt32LE(SR * 2, 28)
  pcm.writeUInt16LE(2, 32)
  pcm.writeUInt16LE(16, 34)
  pcm.write('data', 36)
  pcm.writeUInt32LE(data.length * 2, 40)
  for (let i = 0; i < data.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i] * g)) * 32767), 44 + i * 2)
  writeFileSync(join(OUT, `${name}.wav`), pcm)
  console.log(`${name.padEnd(16)} ${(data.length / SR).toFixed(1).padStart(5)} s  ${(pcm.length / 1024).toFixed(0).padStart(5)} KB`)
}

// ---------- the music ----------

type Bar = [number | null, number][]
const humanize = () => range(0.002, 0.014)

/** "The Harbour Waltz": D major, 3/4, a mandolin-ish pluck over squeezebox chords. */
function harbourWaltz(): Float32Array {
  const bpm = 104
  const beat = 60 / bpm
  const chords: number[][] = [
    [50, 54, 57], [50, 54, 57], [43, 47, 50], [50, 54, 57], [47, 50, 54], [43, 47, 50], [45, 49, 52], [45, 49, 52],
    [50, 54, 57], [50, 54, 57], [43, 47, 50], [50, 54, 57], [43, 47, 50], [45, 49, 52], [50, 54, 57], [50, 54, 57],
  ]
  const tune: Bar[] = [
    [[69, 2], [66, 1]], [[69, 1], [71, 1], [69, 1]], [[67, 2], [71, 1]], [[69, 3]],
    [[71, 2], [69, 1]], [[67, 1], [66, 1], [64, 1]], [[64, 1], [66, 1], [67, 1]], [[69, 3]],
    [[74, 2], [73, 1]], [[71, 1], [69, 1], [66, 1]], [[67, 1], [71, 1], [74, 1]], [[69, 2], [66, 1]],
    [[67, 2], [64, 1]], [[66, 1], [64, 1], [61, 1]], [[62, 3]], [[null, 3]],
  ]
  const bars = 32
  const len = bars * 3 * beat
  const out = buf(len + 4)
  for (let b = 0; b < bars; b++) {
    const t0 = b * 3 * beat
    const ch = chords[b % 16]
    const second = b >= 16
    mixInto(out, bass(ch[0] - 12, 0.55), t0 + humanize())
    if (b % 2 === 1) mixInto(out, bass(ch[0] - 5, 0.3), t0 + 2 * beat + humanize())
    for (const k of [1, 2]) for (const m of ch) mixInto(out, squeeze(m + 12, beat * 0.55, second ? 0.12 : 0.1), t0 + k * beat + humanize())
    let t = t0
    for (const [m, beats] of tune[b % 16]) {
      if (m !== null) {
        if (second) {
          mixInto(out, squeeze(m, beats * beat * 0.92, 0.32), t + humanize())
          mixInto(out, pluck(m - 12 + (b % 2 ? 4 : 0), 0.18), t + humanize())
        } else {
          mixInto(out, pluck(m + 12, range(0.42, 0.5)), t + humanize())
          if (beats >= 2) mixInto(out, pluck(m + 12, 0.22), t + beat + humanize())
        }
      }
      t += beats * beat
    }
  }
  return wrap(reverb(out, 0.22), len)
}

/** "Lamplight": F major, slow 3/4, harp arpeggios, a music box and a pad. */
function lamplight(): Float32Array {
  const bpm = 72
  const beat = 60 / bpm
  const chords: number[][] = [
    [53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55], [53, 57, 60], [45, 48, 52], [46, 50, 53], [48, 52, 55],
    [53, 57, 60], [50, 53, 57], [46, 50, 53], [53, 57, 60], [46, 50, 53], [48, 52, 55], [53, 57, 60], [53, 57, 60],
  ]
  const tune: Bar[] = [
    [[72, 2], [69, 1]], [[74, 2], [69, 1]], [[70, 2], [74, 1]], [[72, 3]],
    [[69, 2], [65, 1]], [[64, 1], [69, 1], [72, 1]], [[74, 2], [72, 1]], [[67, 3]],
    [[72, 2], [77, 1]], [[74, 2], [69, 1]], [[70, 1], [72, 1], [74, 1]], [[72, 2], [69, 1]],
    [[70, 2], [67, 1]], [[69, 1], [67, 1], [64, 1]], [[65, 3]], [[null, 3]],
  ]
  const bars = 16
  const len = bars * 3 * beat
  const out = buf(len + 5)
  for (let b = 0; b < bars; b++) {
    const t0 = b * 3 * beat
    const ch = chords[b]
    mixInto(out, pad([ch[0] - 12, ch[1], ch[2]], 3 * beat, 0.22), t0)
    const arp = [ch[0] - 12, ch[0], ch[1], ch[2], ch[1] + 12, ch[1]]
    arp.forEach((m, k) => mixInto(out, harp(m, k === 0 ? 0.35 : 0.22), t0 + k * beat * 0.5 + humanize()))
    let t = t0
    for (const [m, beats] of tune[b]) {
      if (m !== null) mixInto(out, musicBox(m + 12, 0.3), t + humanize())
      t += beats * beat
    }
  }
  return wrap(reverb(out, 0.35, 1.2), len)
}

/** "Squall": D minor, driving 3/4, low ostinato, timpani and a reedy cry over it. */
function squall(): Float32Array {
  const bpm = 126
  const beat = 60 / bpm
  const roots = [38, 38, 34, 33, 38, 31, 33, 33]
  const chords: number[][] = [[62, 65, 69], [62, 65, 69], [58, 62, 65], [57, 61, 64], [62, 65, 69], [55, 58, 62], [57, 61, 64], [57, 61, 64]]
  const tune: Bar[] = [
    [[69, 2], [65, 1]], [[74, 3]], [[74, 1], [72, 1], [70, 1]], [[69, 2], [64, 1]],
    [[65, 1], [67, 1], [69, 1]], [[70, 2], [67, 1]], [[73, 2], [76, 1]], [[69, 3]],
  ]
  const bars = 24
  const len = bars * 3 * beat
  const out = buf(len + 4)
  mixInto(out, pad([38, 45, 50], len + 0.5, 0.25), 0)
  for (let b = 0; b < bars; b++) {
    const t0 = b * 3 * beat
    const r = roots[b % 8]
    const pattern = [0, 0, 7, 0, 8, 7]
    pattern.forEach((iv, k) => mixInto(out, bass(r + iv, k === 0 ? 0.6 : 0.38, 0.5), t0 + k * beat * 0.5 + humanize()))
    mixInto(out, timpani(r + 12, 0.55), t0)
    if (b % 8 === 3 || b % 8 === 7) for (let k = 0; k < 6; k++) mixInto(out, timpani(r + 12, 0.18 + k * 0.05), t0 + beat + k * beat * 0.33)
    if (b % 2 === 0) for (const m of chords[b % 8]) mixInto(out, squeeze(m - 12, beat * 2.6, 0.08), t0 + humanize())
    if (b >= 8) {
      let t = t0
      for (const [m, beats] of tune[b % 8]) {
        if (m !== null) mixInto(out, squeeze(m + (b >= 16 ? 12 : 0), beats * beat * 0.95, b >= 16 ? 0.24 : 0.3), t + humanize())
        t += beats * beat
      }
    }
  }
  return wrap(reverb(out, 0.25, 1.1), len)
}

// ---------- ambience ----------

function harbourBed(): Float32Array {
  const len = 30
  const out = waves(len + 3)
  for (const t of [4, 17.5]) mixInto(out, gull(), t, 0.5)
  for (const t of [10, 24]) mixInto(out, creak(range(0.7, 1.1)), t, 0.35)
  return seam(out, len)
}

function nightBed(): Float32Array {
  const len = 30
  const out = waves(len + 3, 0.7).map((x) => x * 0.8)
  mixInto(out, reverb(shipBell(55, 0.3, 5), 0.4, 1.4), 12, 0.25)
  mixInto(out, creak(1), 22, 0.2)
  return seam(out, len)
}

function stormBed(): Float32Array {
  const len = 24
  const w = wind(len + 3)
  const r = rain(len + 3)
  const s = waves(len + 3, 1.6)
  return seam(w.map((x, i) => x * 0.8 + r[i] * 0.7 + s[i] * 0.9), len)
}

function tavernBed(): Float32Array {
  const len = 30
  const out = murmur(len + 3).map((x) => x * 1.3)
  const f = fire(len + 3)
  for (let i = 0; i < out.length; i++) out[i] += f[i] * 0.55
  for (const t of [3.2, 3.35, 9.8, 15.1, 21.6, 21.7, 26.3]) mixInto(out, glass(), t)
  return seam(reverb(out, 0.18), len)
}

// ---------- effects ----------

function sfx(): Record<string, Float32Array> {
  const out: Record<string, Float32Array> = {}

  // A soft tap of wood.
  const tap = filter(white(0.05), 'bp', 2100, 3).map((x, i) => x * Math.exp(-i / (0.006 * SR)) * 1.6)
  mixInto(tap, struck(820, [{ ratio: 1, amp: 1, decay: 60 }], 0.05, 0.25), 0)
  out.tap = tap

  // Yes: two plucked notes, rising.
  const yes = buf(1.1)
  mixInto(yes, pluck(74, 0.5, 1), 0)
  mixInto(yes, pluck(81, 0.5, 1), 0.085)
  out.confirm = reverb(yes, 0.2)

  // No: a dull knock, falling.
  const no = buf(0.4)
  let ph = 0
  for (let i = 0; i < no.length; i++) {
    const u = i / SR
    ph += (2 * Math.PI * (180 - 70 * Math.min(1, u * 6))) / SR
    no[i] = Math.sin(ph) * Math.exp(-u * 11)
  }
  mixInto(no, filter(white(0.05), 'lp', 600).map((x, i) => x * Math.exp(-i / (0.01 * SR))), 0, 0.5)
  out.error = no

  // Coins: a handful of small bright rings.
  const coin = () => struck(range(2400, 3600), [{ ratio: 1, amp: 1, decay: 14 }, { ratio: 2.4, amp: 0.5, decay: 20 }, { ratio: 4.1, amp: 0.25, decay: 30 }], 0.6, range(0.2, 0.35), 0.001)
  const coins = buf(1.1)
  for (let k = 0; k < 6; k++) mixInto(coins, coin(), k * range(0.04, 0.07))
  out.coins = reverb(coins, 0.15)

  // A purchase: a pour of coins, then the shop bell.
  const buy = buf(2.6)
  for (let k = 0; k < 14; k++) mixInto(buy, coin(), k * 0.035 + range(0, 0.02), 0.8)
  mixInto(buy, shipBell(84, 0.35, 2), 0.5)
  out.buy = reverb(buy, 0.2)

  // Casting off: a low horn with a little wobble.
  const horn = buf(2)
  ph = 0
  for (let i = 0; i < horn.length; i++) {
    const u = i / SR
    const f = 110 * (1 + 0.004 * Math.sin(u * 30))
    ph += (2 * Math.PI * f) / SR
    let s = 0
    for (let k = 1; k <= 12; k++) s += Math.sin(ph * k) / k
    const env = Math.min(1, u / 0.15) * (u < 1.3 ? 1 : Math.max(0, 1 - (u - 1.3) / 0.6))
    horn[i] = s * env * 0.4
  }
  out.depart = reverb(filter(horn, 'lp', 900), 0.3, 1.3)

  // Two bells: new waters charted.
  const bells = buf(4)
  mixInto(bells, shipBell(76, 0.5, 3.5), 0)
  mixInto(bells, shipBell(76, 0.45, 3.5), 0.42)
  out.bell = reverb(bells, 0.25)

  // A find: a music box running up the scale, and a shimmer.
  const find = buf(2)
  ;[74, 78, 81, 86, 90].forEach((m, k) => mixInto(find, musicBox(m, 0.35), k * 0.075))
  mixInto(find, filter(white(1), 'hp', 6000).map((x, i) => x * Math.sin((Math.PI * i) / SR) * 0.05), 0.1)
  out.find = reverb(find, 0.3)

  // Someone signs on: a quick bright chord on squeezebox and pluck.
  const signed = buf(1.8)
  ;[62, 66, 69].forEach((m, k) => mixInto(signed, pluck(m + 12, 0.35, 1.2), k * 0.06))
  ;[62, 66, 69, 74].forEach((m) => mixInto(signed, squeeze(m, 0.7, 0.18), 0.18))
  out.signed = reverb(signed, 0.25)

  // A Legend rises (or a legendary hull is built): bell, run, full chord.
  const rank = buf(4)
  mixInto(rank, shipBell(62, 0.5, 3.5), 0)
  ;[62, 66, 69, 74, 78, 81].forEach((m, k) => mixInto(rank, pluck(m + 12, 0.35), 0.15 + k * 0.07))
  ;[50, 62, 66, 69, 74].forEach((m) => mixInto(rank, squeeze(m, 1.6, 0.2), 0.6))
  mixInto(rank, timpani(38, 0.6), 0.6)
  out.rankup = reverb(rank, 0.3, 1.2)

  out.thunder = thunder()

  // Going down: a groan, then bubbles rising.
  const sink = buf(2.6)
  const groan = creak(1.4)
  mixInto(sink, filter(groan, 'lp', 700), 0, 1.4)
  for (let k = 0; k < 18; k++) {
    const len = range(0.04, 0.09)
    const b = buf(len)
    let p = 0
    const f0 = range(300, 700)
    for (let i = 0; i < b.length; i++) {
      const u = i / b.length
      p += (2 * Math.PI * f0 * (1 + u * 1.5)) / SR
      b[i] = Math.sin(p) * Math.sin(Math.PI * u) * 0.4
    }
    mixInto(sink, b, 0.6 + k * range(0.05, 0.1))
  }
  mixInto(sink, filter(brown(2), 'lp', 250), 0.4, 0.8)
  out.sink = reverb(filter(sink, 'lp', 2500), 0.25)

  return out
}

// ---------- write it all ----------

mkdirSync(OUT, { recursive: true })
write('music-day', harbourWaltz(), 0.8)
write('music-night', lamplight(), 0.8)
write('music-storm', squall(), 0.8)
write('amb-harbour', harbourBed(), 0.7)
write('amb-night', nightBed(), 0.7)
write('amb-storm', stormBed(), 0.75)
write('amb-tavern', tavernBed(), 0.7)
for (const [name, data] of Object.entries(sfx())) write(`sfx-${name}`, data)
