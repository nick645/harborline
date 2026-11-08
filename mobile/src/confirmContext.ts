// The question asked before an action, and the hook that asks it (the sheet is in confirm.tsx).

import { createContext, useContext } from 'react'

export interface Ask {
  title: string
  body?: string
  /** The action button's label, e.g. "Buy · 2,000c". */
  label: string
  /** Red, for things that can't be undone (selling, letting someone go). */
  danger?: boolean
  /** A warning in red above the buttons: what could go wrong. */
  warning?: string
  /** A second, safer way to go ahead (e.g. "Repair, then send"); answering with it resolves 'alt'. */
  alt?: string
}

export const ConfirmContext = createContext<(ask: Ask) => Promise<boolean | 'alt'>>(async () => true)

export function useConfirm() {
  return useContext(ConfirmContext)
}
