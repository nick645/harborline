// The storybook parts, drawn in Skia in Figure's 56 × 100 space (registry.ts lists them). Each
// part is a few layered shapes: a base, a shadow side (light comes from the upper right, as on
// the classic faces), highlights and fine line work. Figure draws them in its own layer order:
//
//   back hair (behind the head) · coat body (clipped to the torso) · collar · chest accessory ·
//   arms · insignia · head: face → beard → head accessory → front hair → hat
//
// Colours come from the look (hair, hat, scarf, coat), so regional palettes still apply.

import { Circle, Group, Oval, Path, Rect, RoundedRect } from '@shopify/react-native-skia'
import type { Look } from '../looks'
import { shade, tint } from '../paint'
import type { AccessoryPart, BeardPart, CoatPart, HairPart, HatPart } from './registry'

const GOLD = '#e6b85a'
const GOLD_HI = '#f6dc8e'
const LEATHER = '#6e4733'
const FUR = '#eadfca'

/** A brass anchor badge, centred at (x, y), `s` high. */
function Anchor({ x, y, s = 4.6, color = GOLD }: { x: number; y: number; s?: number; color?: string }) {
  const k = s / 4.6
  return (
    <Path
      path={`M${x} ${y - 2.3 * k} v ${4.6 * k} M${x - 1.6 * k} ${y - 1.2 * k} h ${3.2 * k} M${x - 2.4 * k} ${y + 0.8 * k} q ${2.4 * k} ${2.6 * k} ${4.8 * k} 0`}
      color={color}
      style="stroke"
      strokeWidth={0.9 * k}
      strokeCap="round"
    />
  )
}

// ---------- Hair ----------

const CURL_BACK: [number, number, number][] = [[14.6, 44, 5.2], [41.4, 44, 5.2], [14, 51, 4.6], [42, 51, 4.6], [16, 37, 5.4], [40, 37, 5.4]]
const CURL_CROWN: [number, number, number][] = [[15.4, 30, 5.2], [40.6, 30, 5.2], [19.4, 24.4, 5.4], [36.6, 24.4, 5.4], [25, 21.4, 5.6], [31.4, 21.6, 5.4], [28, 25.6, 4.4]]
const CURL_SIDES: [number, number, number][] = [[16.8, 35.4, 3.2], [39.2, 35.4, 3.2], [16.2, 40.8, 2.8], [39.8, 40.8, 2.8]]

/** Behind the head: the hair's volume and length. With a hat on, only what shows below its brim. */
export function HairBack({ part, look, hatless }: { part: HairPart; look: Look; hatless: boolean }) {
  const h = look.hair
  const dark = shade(h, 0.22)
  if (part === 'curls-crown') {
    return (
      <Group>
        {CURL_BACK.filter(([, y]) => hatless || y > 40).map(([x, y, r], i) => (
          <Circle key={i} cx={x} cy={y} r={r} color={i % 2 ? dark : shade(h, 0.12)} />
        ))}
        {hatless && <Circle cx={28} cy={22} r={10} color={dark} />}
      </Group>
    )
  }
  if (part === 'locs') {
    // Locs hang to the shoulders, behind the face and in front of the coat.
    const strand = (x0: number, x1: number, y1: number, i: number) => (
      <Path key={i} path={`M${x0} ${hatless ? 28 : 33} Q ${(x0 + x1) / 2 + (x0 < 28 ? -2 : 2)} ${(y1 + 30) / 2}, ${x1} ${y1}`} color={i % 2 ? dark : shade(h, 0.1)} style="stroke" strokeWidth={3.4} strokeCap="round" />
    )
    return (
      <Group>
        {[
          [16, 13, 63],
          [18.5, 15.6, 65],
          [21, 18.8, 62],
          [40, 43, 63],
          [37.5, 40.4, 65],
          [35, 37.2, 62],
        ].map(([a, b, y], i) => strand(a, b, y, i))}
        {hatless && <Oval x={16} y={20.5} width={24} height={14} color={dark} />}
      </Group>
    )
  }
  return null
}

/** Over the face, under any hat: the hairline, crown and what frames the face. */
export function HairFront({ part, look, hatless }: { part: HairPart; look: Look; hatless: boolean }) {
  const h = look.hair
  const dark = shade(h, 0.25)
  const hi = tint(h, 0.3)
  switch (part) {
    case 'curls-crown':
      return (
        <Group>
          {(hatless ? CURL_CROWN : []).concat(CURL_SIDES).map(([x, y, r], i) => (
            <Group key={i}>
              <Circle cx={x} cy={y} r={r} color={h} />
              <Path path={`M${x - r * 0.55} ${y - r * 0.1} a ${r * 0.6} ${r * 0.6} 0 0 1 ${r * 0.9} ${-r * 0.4}`} color={hi} style="stroke" strokeWidth={0.8} strokeCap="round" opacity={0.8} />
              <Path path={`M${x - r * 0.3} ${y + r * 0.55} a ${r * 0.5} ${r * 0.5} 0 0 0 ${r * 0.7} ${-r * 0.2}`} color={dark} style="stroke" strokeWidth={0.7} strokeCap="round" opacity={0.7} />
            </Group>
          ))}
        </Group>
      )
    case 'headwrap': {
      const wrap = look.hatColor
      return (
        <Group>
          {/* A few strands at the temples, then the wrap over them and its knot on top */}
          <Path path="M17 33 C 16.4 37, 16.8 40, 18 42 M39 33 C 39.6 37, 39.2 40, 38 42" color={h} style="stroke" strokeWidth={1.6} strokeCap="round" />
          <Path path="M15.6 35 C 14.4 22, 20.6 17.6, 28 17.6 C 35.4 17.6, 41.6 22, 40.4 35 C 35 30.6, 21 30.6, 15.6 35 Z" color={wrap} />
          <Path path="M28 17.8 C 35 18, 40.8 22.4, 40.4 35 C 38.6 33.4, 36.8 32.4, 34.6 31.8 C 36.4 26, 34.4 20.6, 28 17.8 Z" color={shade(wrap, 0.18)} />
          <Path path="M17.6 30.4 C 22 27, 34 27, 38.6 30.4 M18.6 25.4 C 23 22.6, 33 22.6, 37.4 25.4" color={shade(wrap, 0.3)} style="stroke" strokeWidth={0.7} opacity={0.8} />
          <Path path="M19.4 23 C 22.4 20.2, 27 19.2, 31 19.6" color={tint(wrap, 0.35)} style="stroke" strokeWidth={1} strokeCap="round" opacity={0.8} />
          <Oval x={20.6} y={12.6} width={8.4} height={6.4} color={wrap} />
          <Oval x={27} y={12.2} width={8.4} height={6.6} color={shade(wrap, 0.14)} />
          <Circle cx={28} cy={17.2} r={2.8} color={shade(wrap, 0.08)} />
          <Path path="M25.6 16.4 C 26.6 15.2, 29.4 15.2, 30.4 16.4" color={tint(wrap, 0.3)} style="stroke" strokeWidth={0.7} strokeCap="round" />
        </Group>
      )
    }
    case 'locs':
      return (
        <Group>
          {hatless && (
            <>
              <Path path="M16.2 36 C 15.6 26.6, 21 23, 28 23 C 35 23, 40.4 26.6, 39.8 36 C 37.4 30.4, 33 28.2, 28 28.2 C 23 28.2, 18.6 30.4, 16.2 36 Z" color={h} />
              <Path path="M22 24.6 L 21.2 29.6 M26 23.2 L 25.8 28.4 M30 23.2 L 30.4 28.4 M34 24.6 L 34.8 29.6" color={dark} style="stroke" strokeWidth={0.8} strokeCap="round" />
            </>
          )}
          {/* Locs falling either side of the face */}
          {[
            [17.6, 16.4, 54],
            [38.4, 39.6, 54],
            [19.6, 18.6, 46],
          ].map(([x0, x1, y1], i) => (
            <Group key={i}>
              <Path path={`M${x0} ${hatless ? 29 : 33} Q ${x0 - 1} ${(y1 + 30) / 2}, ${x1} ${y1}`} color={h} style="stroke" strokeWidth={3} strokeCap="round" />
              <Path path={`M${x0 - 0.6} ${hatless ? 32 : 35} Q ${x0 - 1.4} ${(y1 + 30) / 2}, ${x1 - 0.5} ${y1 - 2}`} color={hi} style="stroke" strokeWidth={0.6} strokeCap="round" opacity={0.6} />
            </Group>
          ))}
        </Group>
      )
    case 'swept-wave':
      return hatless ? (
        <Group>
          <Path
            path="M16.4 37.4 C 14.8 28, 20 22.2, 28.6 22.2 C 35.8 22.2, 40.8 26.6, 39.8 35.4 C 38.4 31.4, 35.6 29.2, 31.6 29 C 33 30.6, 33.2 31.8, 32.6 32.4 C 30 29.8, 25.6 29.2, 22 30.8 C 19.6 32, 18 34.2, 17.6 37.6 Z"
            color={h}
          />
          <Path path="M30 22.6 C 35.6 23.2, 40.6 27, 39.8 35.4 C 38.4 31.4, 35.6 29.2, 31.6 29 C 33.6 27, 33.2 24.6, 30 22.6 Z" color={dark} opacity={0.8} />
          <Path path="M19.4 29 C 21.6 25.6, 25 24.2, 29.4 24.4 M21.4 31.2 C 24 28.4, 27.4 27.6, 31 28" color={hi} style="stroke" strokeWidth={0.9} strokeCap="round" opacity={0.85} />
        </Group>
      ) : (
        <Path path="M16.6 35.6 C 16.2 31, 17.6 28.2, 20.6 27.2 C 19.6 30, 19.8 33, 19.4 36.6 Z M39.4 35.6 C 39.8 31, 38.4 28.2, 35.4 27.2 C 36.4 30, 36.2 33, 36.6 36.6 Z" color={h} />
      )
  }
}

// ---------- Hats ----------

/** A hat over the hair; `title` 4 and up puts an anchor badge on it. */
export function HatPartArt({ part, look }: { part: HatPart; look: Look }) {
  const badge = (look.title ?? 0) >= 4
  switch (part) {
    case 'officer-cap': {
      const navy = '#1f2f4a'
      return (
        <Group>
          {/* A wide flat crown over a braided band and a black peak */}
          <Path path="M12.4 27 C 11.8 21.4, 18 18, 28 18 C 38 18, 44.2 21.4, 43.6 27 C 38 29, 18 29, 12.4 27 Z" color={navy} />
          <Path path="M30 18.2 C 38.6 18.6, 44.2 21.8, 43.6 27 C 40.6 28, 37 28.5, 33.4 28.7 C 35.6 25.4, 34.6 21, 30 18.2 Z" color={shade(navy, 0.3)} />
          <Path path="M16 20.6 C 21 19, 29 18.8, 33.6 19.6" color={tint(navy, 0.4)} style="stroke" strokeWidth={1} strokeCap="round" />
          <Path path="M16 26.8 C 22 28.6, 34 28.6, 40 26.8 L 40 31.4 C 34 33, 22 33, 16 31.4 Z" color={shade(navy, 0.45)} />
          <Path path="M16 27.6 C 22 29.4, 34 29.4, 40 27.6" color={GOLD} style="stroke" strokeWidth={0.9} />
          <Path path="M16.4 31.2 C 22 33, 34 33, 39.6 31.2 C 37.2 35.6, 18.8 35.6, 16.4 31.2 Z" color="#141219" />
          <Path path="M20 33.2 C 24 34.2, 31 34.2, 35 33.2" color="#ffffff" style="stroke" strokeWidth={0.7} opacity={0.25} />
          <Path path="M16.4 30.9 C 22 32.6, 34 32.6, 39.6 30.9" color={GOLD} style="stroke" strokeWidth={0.8} />
          {/* The badge: a gold wreath, and an anchor in it from title 4 */}
          <Path path="M24.6 29.6 C 24.4 26.4, 26 24.6, 28 24.6 M31.4 29.6 C 31.6 26.4, 30 24.6, 28 24.6" color={GOLD} style="stroke" strokeWidth={0.8} strokeCap="round" />
          {badge ? <Anchor x={28} y={27.4} s={4} color={GOLD_HI} /> : <Circle cx={28} cy={27.4} r={1.3} color={GOLD_HI} />}
        </Group>
      )
    }
    case 'fur-trapper': {
      const cloth = look.hatColor
      return (
        <Group>
          {/* Ear flaps first, then the crown and its rolled fur front */}
          {[
            'M14.4 28.4 C 13.2 35.6, 13.8 42, 16.6 46.4 C 18.6 44.6, 19.6 38, 19.2 29.6 Z',
            'M41.6 28.4 C 42.8 35.6, 42.2 42, 39.4 46.4 C 37.4 44.6, 36.4 38, 36.8 29.6 Z',
          ].map((d, i) => (
            <Group key={i}>
              <Path path={d} color={FUR} />
              <Path path={d} color={shade(FUR, 0.3)} style="stroke" strokeWidth={0.6} />
            </Group>
          ))}
          <Path path="M17 27.6 C 16.6 18.6, 21.6 15, 28 15 C 34.4 15, 39.4 18.6, 39 27.6 Z" color={cloth} />
          <Path path="M29.4 15.2 C 35.4 16, 39.4 19.6, 39 27.6 L 33.6 27.6 C 34.6 22.6, 33.4 18, 29.4 15.2 Z" color={shade(cloth, 0.25)} />
          <Path path="M21 19.6 C 23.6 17.4, 27 16.6, 30.4 17" color={tint(cloth, 0.3)} style="stroke" strokeWidth={0.9} strokeCap="round" />
          <Path path="M14.4 28.4 C 14.4 24, 41.6 24, 41.6 28.4 C 41.6 32.8, 14.4 32.8, 14.4 28.4 Z" color={FUR} />
          <Path path="M30 25 C 37 25.4, 41.6 26.4, 41.6 28.4 C 41.6 31, 37.6 32, 32 32.4 C 34 30, 33.6 27, 30 25 Z" color={shade(FUR, 0.16)} />
          <Path path="M17 27.6 l 1.4 1.6 M20.6 26.4 l 1.2 1.8 M24.4 26 l 1 1.8 M28.4 25.8 l 0.8 1.8 M32.2 26 l 0.8 1.8 M36 26.6 l 0.8 1.8" color={shade(FUR, 0.3)} style="stroke" strokeWidth={0.6} strokeCap="round" />
          {badge && <Anchor x={28} y={20.6} s={4} />}
        </Group>
      )
    }
    case 'straw-sunhat': {
      const straw = '#d9b25e'
      const ribbon = look.scarf
      return (
        <Group>
          {/* A wide straw brim, the crown, its ribbon, and the weave */}
          <Path path="M2 31.4 C 8 26.8, 48 26.8, 54 31.4 C 48 36, 8 36, 2 31.4 Z" color={straw} />
          <Path path="M2 31.4 C 8 36, 48 36, 54 31.4 C 50 33.2, 6 33.2, 2 31.4 Z" color={shade(straw, 0.22)} />
          <Path path="M7 31 C 15 28.4, 41 28.4, 49 31 M11 32.8 C 19 31.2, 37 31.2, 45 32.8" color={shade(straw, 0.3)} style="stroke" strokeWidth={0.55} opacity={0.8} />
          <Path path="M18.2 30.4 C 17.6 21, 22.2 17.8, 28 17.8 C 33.8 17.8, 38.4 21, 37.8 30.4 Z" color={tint(straw, 0.06)} />
          <Path path="M29.6 18 C 34.8 18.6, 38.4 21.6, 37.8 30.4 L 33.4 30.4 C 34.4 25.4, 33.4 20.6, 29.6 18 Z" color={shade(straw, 0.16)} />
          <Path path="M21.4 21.4 L 20.6 30 M25 18.8 L 24.6 30 M31 18.8 L 31.4 30 M34.6 21.4 L 35.4 30" color={shade(straw, 0.28)} style="stroke" strokeWidth={0.5} opacity={0.7} />
          <Path path="M18.2 26.6 C 24 28, 32 28, 37.8 26.6 L 38 30.2 C 32 31.6, 24 31.6, 18 30.2 Z" color={ribbon} />
          <Path path="M35 28.6 l 4.4 4.6 l 1.6 -1 Z" color={shade(ribbon, 0.15)} />
          {badge && <Anchor x={24} y={28.6} s={3.4} />}
        </Group>
      )
    }
  }
}

// ---------- Facial hair ----------

/** Drawn over the face (and the mouth: full beards bring their own). */
export function BeardArt({ part, look }: { part: BeardPart; look: Look }) {
  const h = look.hair
  const dark = shade(h, 0.25)
  const hi = tint(h, 0.3)
  switch (part) {
    case 'full-beard':
      return (
        <Group>
          <Path
            path="M16.6 38.6 C 16 46, 17.6 54, 21.6 58.4 C 24 61, 26.4 62.2, 28 62.2 C 29.6 62.2, 32 61, 34.4 58.4 C 38.4 54, 40 46, 39.4 38.6 C 37.6 44, 34.6 46.4, 31.2 46.8 C 30 48.6, 26 48.6, 24.8 46.8 C 21.4 46.4, 18.4 44, 16.6 38.6 Z"
            color={h}
          />
          <Path path="M31.2 46.8 C 34.6 46.4, 37.6 44, 39.4 38.6 C 40 46, 38.4 54, 34.4 58.4 C 32 61, 29.6 62.2, 28 62.2 C 31.6 58, 33 52, 31.2 46.8 Z" color={dark} opacity={0.75} />
          <Path path="M20 50.6 q 1.4 2.4 1 4.6 M23.6 53.6 q 1 2.4 0.4 4.6 M33 53.2 q -0.6 2.4 0 4.4 M36.2 49.8 q -1.2 2.4 -0.8 4.4" color={dark} style="stroke" strokeWidth={0.7} strokeCap="round" />
          <Path path="M18.6 44.6 q 1 3 2.6 4.6 M25.4 56.4 q 1.6 1.4 3.2 1.2" color={hi} style="stroke" strokeWidth={0.6} strokeCap="round" opacity={0.7} />
          <Path path="M26 49.6 Q 28 50.8 30 49.6" color="#5a2a24" style="stroke" strokeWidth={1} strokeCap="round" />
          <Path path="M21.4 47.4 C 23.8 44.4, 26.6 44.6, 28 45.8 C 29.4 44.6, 32.2 44.4, 34.6 47.4 C 32.6 49.4, 30 49, 28 47.8 C 26 49, 23.4 49.4, 21.4 47.4 Z" color={shade(h, 0.08)} />
          <Path path="M23.6 46.4 C 25 45.6, 26.4 45.6, 27.4 46.4" color={hi} style="stroke" strokeWidth={0.6} strokeCap="round" />
        </Group>
      )
    case 'handlebar-goatee':
      return (
        <Group>
          <Path path="M25.4 51 C 26.4 50.2, 29.6 50.2, 30.6 51 C 30.8 54.2, 29.8 57.4, 28 58.6 C 26.2 57.4, 25.2 54.2, 25.4 51 Z" color={h} />
          <Path path="M28 50.6 C 29.8 50.6, 30.8 51, 30.6 51 C 30.8 54.2, 29.8 57.4, 28 58.6 Z" color={dark} opacity={0.7} />
          <Path
            path="M20.4 45 C 21.8 47.8, 24.6 47.6, 28 46.2 C 31.4 47.6, 34.2 47.8, 35.6 45 C 36.6 46.8, 36 48.8, 33.8 49 C 31.4 49.2, 29.6 48.2, 28 47.8 C 26.4 48.2, 24.6 49.2, 22.2 49 C 20 48.8, 19.4 46.8, 20.4 45 Z"
            color={h}
          />
          <Path path="M20.6 45.2 c -1.4 -1.8 0 -3.6 1.8 -2.6 M35.4 45.2 c 1.4 -1.8 0 -3.6 -1.8 -2.6" color={h} style="stroke" strokeWidth={1.2} strokeCap="round" />
          <Path path="M23 47.2 C 25 47.4, 26.6 47, 27.6 46.6" color={hi} style="stroke" strokeWidth={0.6} strokeCap="round" />
        </Group>
      )
    case 'whiskers':
      return (
        <Group>
          {/* Mutton chops down to the jaw, joined by a bushy moustache; a clean chin */}
          <Path path="M16.6 35.6 C 16.2 44, 18 50.6, 22.8 51.8 C 25 52.4, 26 50.6, 25.2 48.6 C 22.6 47.6, 20.6 44.2, 20 35.6 Z" color={h} />
          <Path path="M39.4 35.6 C 39.8 44, 38 50.6, 33.2 51.8 C 31 52.4, 30 50.6, 30.8 48.6 C 33.4 47.6, 35.4 44.2, 36 35.6 Z" color={dark} />
          <Path path="M18 40 q 0.6 4 2 6.4 M17.6 45 q 1 3 2.6 4.4" color={hi} style="stroke" strokeWidth={0.6} strokeCap="round" opacity={0.7} />
          <Path path="M22.4 46.8 C 24.6 44.8, 26.8 45.2, 28 46.4 C 29.2 45.2, 31.4 44.8, 33.6 46.8 C 31.8 49.2, 29.6 48.8, 28 47.8 C 26.4 48.8, 24.2 49.2, 22.4 46.8 Z" color={h} />
          <Path path="M24 46.4 C 25.2 45.8, 26.4 45.8, 27.4 46.4" color={hi} style="stroke" strokeWidth={0.6} strokeCap="round" />
        </Group>
      )
  }
}

// ---------- Coats ----------

/** Where a coat's details go, for the portrait torso (to y 100) and the full-length one (to 111). */
function frame(legs: boolean) {
  return legs ? { top: 60, bottom: 111, hw: 15, waist: 93 } : { top: 61, bottom: 100, hw: 22, waist: 90 }
}

/** On the torso (clipped to it): lapels, trims, buttons, the coat's own character. */
export function CoatBody({ part, look, legs }: { part: CoatPart; look: Look; legs: boolean }) {
  const c = look.coat
  const f = frame(legs)
  const cx = 28
  switch (part) {
    case 'naval-officer':
      return (
        <Group>
          {/* Double-breasted: wide lapels edged in gold, two rows of brass buttons, a gold hem */}
          <Path path={`M${cx - 6.5} ${f.top} L ${cx} ${f.top + 18} L ${cx - 3.4} ${f.top + 23} L ${cx - 12} ${f.top + 6} Z`} color={shade(c, 0.35)} />
          <Path path={`M${cx + 6.5} ${f.top} L ${cx} ${f.top + 18} L ${cx + 3.4} ${f.top + 23} L ${cx + 12} ${f.top + 6} Z`} color={tint(c, 0.08)} />
          <Path path={`M${cx - 12} ${f.top + 6} L ${cx - 3.4} ${f.top + 23} M${cx + 12} ${f.top + 6} L ${cx + 3.4} ${f.top + 23}`} color={GOLD} style="stroke" strokeWidth={0.9} />
          <Path path={`M${cx} ${f.top + 18} V ${f.bottom}`} color={shade(c, 0.45)} style="stroke" strokeWidth={0.8} />
          {[0, 1, 2].map((i) => (
            <Group key={i}>
              <Circle cx={cx - 4.8} cy={f.top + 26 + i * 7} r={1.3} color={GOLD} />
              <Circle cx={cx + 4.8} cy={f.top + 26 + i * 7} r={1.3} color={GOLD} />
              <Circle cx={cx - 5.1} cy={f.top + 25.7 + i * 7} r={0.45} color={GOLD_HI} />
              <Circle cx={cx + 4.5} cy={f.top + 25.7 + i * 7} r={0.45} color={GOLD_HI} />
            </Group>
          ))}
          <Rect x={-4} y={f.bottom - 3.6} width={64} height={1.6} color={GOLD} />
          {/* Pocket flaps */}
          <Path path={`M${cx - f.hw + 3} ${f.top + 27} h 7 l -1 2.4 h -5 Z M${cx + f.hw - 10} ${f.top + 27} h 7 l -1 2.4 h -5 Z`} color={shade(c, 0.3)} />
          <Path path={`M${cx + f.hw - 4} ${f.top + 6} C ${cx + f.hw + 2} ${f.top + 14}, ${cx + f.hw + 3} ${f.top + 26}, ${cx + f.hw + 3} ${f.top + 36}`} color="#ffffff" style="stroke" strokeWidth={2} opacity={0.12} strokeCap="round" />
        </Group>
      )
    case 'fur-longcoat':
      return (
        <Group>
          {/* A heavy coat with fur running down its opening and horn toggles across it */}
          <Path path={`M${cx - 3.4} ${f.top} V ${f.bottom} H ${cx + 3.4} V ${f.top} Z`} color={shade(c, 0.4)} />
          {Array.from({ length: Math.ceil((f.bottom - f.top) / 4.4) }, (_, i) => (
            <Group key={i}>
              <Circle cx={cx - 3.2 + (i % 2) * 0.8} cy={f.top + 4 + i * 4.4} r={2.5} color={i % 2 ? FUR : shade(FUR, 0.1)} />
              <Circle cx={cx + 3.2 - (i % 2) * 0.8} cy={f.top + 4 + i * 4.4} r={2.5} color={i % 2 ? shade(FUR, 0.14) : FUR} />
            </Group>
          ))}
          {[0, 1, 2].map((i) => (
            <RoundedRect key={i} x={cx - 4.4} y={f.top + 16 + i * 9} width={8.8} height={2} r={1} color="#e9dcc4" />
          ))}
          <Path path={`M${cx - f.hw + 4} ${f.top + 30} h 8 v 6 h -8 Z`} color={shade(c, 0.22)} />
          <Path path={`M${cx - f.hw + 4} ${f.top + 30} h 8`} color={tint(c, 0.25)} style="stroke" strokeWidth={0.7} />
          {/* Weathered: a few worn creases */}
          <Path path={`M${cx + 7} ${f.top + 12} q 3 6 2 12 M${cx - 9} ${f.top + 16} q -2 5 -1 10`} color={shade(c, 0.35)} style="stroke" strokeWidth={0.6} opacity={0.7} />
          {legs && Array.from({ length: 9 }, (_, i) => <Circle key={`h${i}`} cx={13 + i * 3.8} cy={f.bottom - 1} r={2.4} color={i % 2 ? FUR : shade(FUR, 0.12)} />)}
        </Group>
      )
    case 'island-jacket': {
      const shirt = '#efe3d2'
      const sash = look.scarf
      return (
        <Group>
          {/* An open jacket over a light shirt, trimmed and stitched, a sash knotted at the waist */}
          <Path path={`M${cx - 8} ${f.top} L ${cx + 8} ${f.top} L ${cx + 5.5} ${f.bottom} L ${cx - 5.5} ${f.bottom} Z`} color={shirt} />
          <Path path={`M${cx + 1} ${f.top} L ${cx + 8} ${f.top} L ${cx + 5.5} ${f.bottom} L ${cx + 2} ${f.bottom} Z`} color={shade(shirt, 0.12)} />
          <Path path={`M${cx} ${f.top + 2} V ${f.top + 14}`} color={shade(shirt, 0.35)} style="stroke" strokeWidth={0.6} />
          <Path path={`M${cx - 8} ${f.top} L ${cx - 5.5} ${f.bottom} M${cx + 8} ${f.top} L ${cx + 5.5} ${f.bottom}`} color={GOLD} style="stroke" strokeWidth={1.2} />
          {Array.from({ length: 6 }, (_, i) => (
            <Group key={i}>
              <Circle cx={cx - 10.4 + i * 0.4} cy={f.top + 6 + i * 6} r={0.7} color={tint(c, 0.5)} />
              <Circle cx={cx + 10.4 - i * 0.4} cy={f.top + 6 + i * 6} r={0.7} color={tint(c, 0.5)} />
            </Group>
          ))}
          <Rect x={-4} y={f.waist - 0.6} width={64} height={4.4} color={sash} />
          <Rect x={-4} y={f.waist - 0.6} width={64} height={1.2} color={tint(sash, 0.3)} />
          <Path path={`M${cx + 4} ${f.waist + 3.6} l -1.6 7 l 3 0.6 Z M${cx + 6} ${f.waist + 3.6} l 1.6 6 l 2.6 -0.8 Z`} color={shade(sash, 0.15)} />
          <Circle cx={cx + 5} cy={f.waist + 2.2} r={2} color={shade(sash, 0.1)} />
        </Group>
      )
    }
  }
}

/** Round the neck, over the scarf: the fur coat's ruff and the officer's standing collar. */
export function CoatCollar({ part, look }: { part: CoatPart; look: Look }) {
  if (part === 'fur-longcoat') {
    return (
      <Group>
        {Array.from({ length: 9 }, (_, i) => (
          <Circle key={i} cx={16 + i * 3} cy={61.4 + Math.abs(i - 4) * 0.7} r={3} color={i % 2 ? FUR : shade(FUR, 0.12)} />
        ))}
      </Group>
    )
  }
  if (part === 'naval-officer') {
    return <Path path="M20 58.6 C 24 61.6, 32 61.6, 36 58.6 L 36.4 61 C 32 64.2, 24 64.2, 19.6 61 Z" color={shade(look.coat, 0.2)} />
  }
  return null
}

// ---------- Accessories ----------

/** An accessory on the head: a monocle on its chain, or a gold hoop. */
export function HeadAccessory({ part }: { part: AccessoryPart }) {
  if (part === 'monocle') {
    return (
      <Group>
        <Circle cx={32.5} cy={39.6} r={3.5} color="#d8ecf2" opacity={0.25} />
        <Circle cx={32.5} cy={39.6} r={3.5} color={GOLD} style="stroke" strokeWidth={0.9} />
        <Path path="M34.6 42.4 C 37 46, 37.6 50, 37 55" color={GOLD} style="stroke" strokeWidth={0.5} />
        <Path path="M30.8 37.6 l 1.4 -0.6" color="#ffffff" style="stroke" strokeWidth={0.6} strokeCap="round" opacity={0.8} />
      </Group>
    )
  }
  if (part === 'gold-hoop') {
    return (
      <Group>
        <Circle cx={16.2} cy={45.2} r={1.9} color={GOLD} style="stroke" strokeWidth={0.9} />
        <Circle cx={16.2} cy={47.2} r={0.7} color={GOLD_HI} />
      </Group>
    )
  }
  return null
}

/** An accessory over the coat: a satchel slung from the near shoulder to the far hip. */
export function ChestAccessory({ part, legs }: { part: AccessoryPart; legs: boolean }) {
  if (part !== 'satchel') return null
  const [sx, sy] = legs ? [17, 61] : [15, 63]
  const [bx, by] = legs ? [35, 92] : [36, 84]
  return (
    <Group>
      <Path path={`M${sx} ${sy} L ${bx + 4} ${by}`} color={LEATHER} style="stroke" strokeWidth={2.4} strokeCap="round" />
      <Path path={`M${sx} ${sy} L ${bx + 4} ${by}`} color={tint(LEATHER, 0.3)} style="stroke" strokeWidth={0.4} />
      <RoundedRect x={bx} y={by} width={11} height={9} r={1.6} color={LEATHER} />
      <Path path={`M${bx} ${by + 1.6} C ${bx} ${by - 0.4}, ${bx + 11} ${by - 0.4}, ${bx + 11} ${by + 1.6} L ${bx + 11} ${by + 4.6} L ${bx} ${by + 4.6} Z`} color={shade(LEATHER, 0.2)} />
      <RoundedRect x={bx + 4.4} y={by + 3.6} width={2.2} height={2.4} r={0.5} color={GOLD} />
      <Path path={`M${bx + 1} ${by + 8} h 9`} color={shade(LEATHER, 0.35)} style="stroke" strokeWidth={0.5} />
    </Group>
  )
}
