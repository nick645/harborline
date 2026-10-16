// Small colour and hashing helpers shared by the drawings.

/** Blend two #rrggbb colours; t = 0 gives a, 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const p = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16)
  const ch = (i: number) =>
    Math.round(p(a, i) + (p(b, i) - p(a, i)) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${ch(1)}${ch(3)}${ch(5)}`
}
export const shade = (c: string, t: number) => mix(c, '#1d1218', t)
export const tint = (c: string, t: number) => mix(c, '#fff3dc', t)

/** A stable 32-bit hash of a string, for picking looks from ids. */
export function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}
