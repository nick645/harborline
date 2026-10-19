// Every action the player takes is asked about first: a small sheet in the Lantern style that
// says what will happen and what it costs, with Cancel and the action itself.

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { fonts, useTheme } from './theme'
import { Button } from './components/ui'
import { ConfirmContext, type Ask } from './confirmContext'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useTheme()
  const [ask, setAsk] = useState<Ask | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback(
    (a: Ask) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false)
        resolver.current = resolve
        setAsk(a)
      }),
    [],
  )
  const answer = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setAsk(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={!!ask} transparent animationType="fade" onRequestClose={() => answer(false)}>
        <Pressable style={styles.backdrop} onPress={() => answer(false)} accessibilityLabel="Cancel">
          <Pressable style={[styles.sheet, { backgroundColor: t.surface, borderColor: ask?.danger ? t.bad : t.accent }]} onPress={() => undefined}>
            <Text style={{ color: t.text, fontFamily: fonts.title, fontSize: 24 }}>{ask?.title}</Text>
            {ask?.body ? <Text style={{ color: t.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{ask.body}</Text> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button kind="secondary" label="Cancel" onPress={() => answer(false)} />
              </View>
              <View style={{ flex: 1.4 }}>
                {ask?.danger ? (
                  <Pressable
                    onPress={() => answer(true)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.danger, { backgroundColor: t.bad, opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15 }}>{ask.label}</Text>
                  </Pressable>
                ) : (
                  <Button label={ask?.label ?? ''} onPress={() => answer(true)} />
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,10,18,0.6)', justifyContent: 'flex-end', padding: 12, paddingBottom: 40 },
  sheet: { borderWidth: 1.5, borderRadius: 18, padding: 18, gap: 12 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  danger: { borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
})
