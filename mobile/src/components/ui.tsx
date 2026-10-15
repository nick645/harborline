// Small shared building blocks, styled from the theme.

import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: t.border },
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
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
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, borderColor: kind === 'primary' ? bg : t.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  const t = useTheme()
  return <Text style={[{ color: t.muted, fontSize: 13 }, style]}>{children}</Text>
}

export function Body({ children, style }: { children: ReactNode; style?: object }) {
  const t = useTheme()
  return <Text style={[{ color: t.text, fontSize: 15 }, style]}>{children}</Text>
}

export function Heading({ children }: { children: ReactNode }) {
  const t = useTheme()
  return <Text style={[styles.heading, { color: t.muted }]}>{children}</Text>
}

export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color }]}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  )
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  button: { borderRadius: 8, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center' },
  buttonSmall: { paddingVertical: 6, paddingHorizontal: 10 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  buttonTextSmall: { fontSize: 13 },
  heading: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
})
