// The Lantern palette: warm plum shadows, honey and amber light. One theme, day or night;
// the scenes themselves follow the clock. Storms are the cold exception, by design.

export const theme = {
  bg: '#2b1f2c',
  surface: '#36283a',
  surface2: '#433145',
  text: '#f3e7d8',
  muted: '#c9b6ae',
  border: '#56404f',
  accent: '#f2b45a',
  accentText: '#2b1f2c',
  good: '#7fd1a8',
  bad: '#ff8fa6',
  warn: '#f5a35a',
  paper: '#f3e7d8',
  ink: '#2b1f2c',
  pencil: '#6b5a52',
  calm: '#5a8fb0',
  choppy: '#4aa39a',
  rough: '#d07a1e',
  storm: '#c4344a',
  rare: '#5aa2ea',
  legendary: '#e6a53a',
  mythic: '#b07be6',
}

export type Theme = typeof theme

export function useTheme(): Theme {
  return theme
}

/** Font families by role. Custom fonts carry their weight in the family name. */
export const fonts = {
  body: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  title: 'Cormorant_700Bold',
  titleItalic: 'Cormorant_600SemiBold_Italic',
}

/** Map a fontWeight to the matching Barlow family. */
export function bodyFont(weight?: string | number): string {
  const w = Number(weight ?? 400)
  return w >= 700 ? fonts.bold : w >= 600 ? fonts.semibold : w >= 500 ? fonts.medium : fonts.body
}
