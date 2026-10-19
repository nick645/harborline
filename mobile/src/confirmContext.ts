// The question asked before an action, and the hook that asks it (the sheet is in confirm.tsx).

import { createContext, useContext } from 'react'

export interface Ask {
  title: string
  body?: string
  /** The action button's label, e.g. "Buy · 2,000c". */
  label: string
  /** Red, for things that can't be undone (selling, letting someone go). */
  danger?: boolean
}

export const ConfirmContext = createContext<(ask: Ask) => Promise<boolean>>(async () => true)

export function useConfirm() {
  return useContext(ConfirmContext)
}
