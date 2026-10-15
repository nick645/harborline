// Small shared building blocks in the Lantern style.

import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { bodyFont, fonts, useTheme } from '../theme'

/** Text in Barlow; a fontWeight in `style` picks the matching family. */
function styled(base: TextStyle, style?: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten([base, style]) ?? {}
  const { fontWeight, ...rest } = flat
  return [rest, { fontFamily: flat.fontFamily ?? bodyFont(fontWeight) }]
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: accent ?? t.border },
        style,
      ]}
    >
      {children}
    </View>
  )
}

type ButtonKind = 'primary' | 'secondary' | 'danger'

export function Button({
  label,
  onPress,
  disabled,
  kind = 'primary',
  small,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  kind?: ButtonKind
  small?: boolean
}) {
  const t = useTheme()
  const bg = kind === 'primary' ? t.accent : kind === 'secondary' ? t.surface2 : 'transparent'
  const fg = kind === 'primary' ? t.accentText : kind === 'danger' ? t.bad : t.text
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, borderColor: kind === 'primary' ? bg : t.border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme()
  return <Text style={styled({ color: t.muted, fontSize: 13 }, style)}>{children}</Text>
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme()
  return <Text style={styled({ color: t.text, fontSize: 15 }, style)}>{children}</Text>
}

/** A name or title in Cormorant. */
export function Title({ children, size = 22, color, italic }: { children: ReactNode; size?: number; color?: string; italic?: boolean }) {
  const t = useTheme()
  return <Text style={{ fontFamily: italic ? fonts.titleItalic : fonts.title, fontSize: size, color: color ?? t.text }}>{children}</Text>
}

export function Heading({ children }: { children: ReactNode }) {
  const t = useTheme()
  return <Text style={[styles.heading, { color: t.muted }]}>{children}</Text>
}

export function Tag({ label, color, dark }: { label: string; color: string; dark?: boolean }) {
  return (
    <View style={[styles.tag, { backgroundColor: color }]}>
      <Text style={[styles.tagText, { color: dark ? '#2b1f2c' : '#fff' }]}>{label}</Text>
    </View>
  )
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>
}

/** Reputation as anchors, the unearned ones faint. */
export function Anchors({ n, size = 14 }: { n: number; size?: number }) {
  const t = useTheme()
  return (
    <Text accessibilityLabel={`Reputation ${n} of 5`} style={{ fontSize: size, letterSpacing: 1 }}>
      <Text style={{ color: t.accent }}>{'⚓︎'.repeat(n)}</Text>
      <Text style={{ color: t.muted, opacity: 0.35 }}>{'⚓︎'.repeat(5 - n)}</Text>
    </Text>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  button: { borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 10, minHeight: 36 },
  buttonText: { fontSize: 15, fontFamily: fonts.semibold },
  buttonTextSmall: { fontSize: 13 },
  heading: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
})
