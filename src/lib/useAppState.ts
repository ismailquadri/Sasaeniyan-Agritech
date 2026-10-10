'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEvents } from './useEvents'

// Loose shapes — enough for the surfaces; the API is the source of truth.
export interface AppState {
  farmers: any[]
  agents: any[]
  buyers: any[]
  contracts: any[]
  lots: any[]
  orders: any[]
  wallets: any[]
  messages: any[]
  marketIndex: any[]
  events: any[]
}

const EMPTY: AppState = {
  farmers: [], agents: [], buyers: [], contracts: [], lots: [], orders: [], wallets: [], messages: [], marketIndex: [], events: [],
}

/** Most recent market-index row for a crop — /api/state returns them unordered. */
export const latestIndex = (marketIndex: any[], crop: string) =>
  [...marketIndex]
    .filter((m) => m.crop === crop)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

/** Fetch /api/state and refetch on every server event (live cross-actor sync). */
export function useAppState() {
  const [state, setState] = useState<AppState>(EMPTY)
  const [flash, setFlash] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      setState(await res.json())
    } catch {
      /* keep last-good state */
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEvents((e) => {
    if (e.type && e.type !== 'CONNECTED') {
      setFlash(e.type)
      setTimeout(() => setFlash(null), 1200)
    }
    refetch()
  })

  return { state, refetch, flash }
}
