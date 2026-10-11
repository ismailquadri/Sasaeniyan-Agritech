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

/** Ascending price series for a crop (oldest → latest) — sparkline input. */
export const indexHistory = (marketIndex: any[], crop: string): number[] =>
  [...marketIndex]
    .filter((m) => m.crop === crop)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m) => m.indexPrice)

export type AppStatus = 'loading' | 'ready' | 'error'

/** Fetch /api/state and refetch on every server event (live cross-actor sync). */
export function useAppState() {
  const [state, setState] = useState<AppState>(EMPTY)
  const [flash, setFlash] = useState<string | null>(null)
  const [status, setStatus] = useState<AppStatus>('loading')
  const [navOnline, setNavOnline] = useState(true)
  const [sseOk, setSseOk] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      setState(await res.json())
      setStatus('ready')
    } catch {
      // keep last-good state; only the very first load surfaces a hard error
      setStatus((s) => (s === 'loading' ? 'error' : s))
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Browser connectivity (offline banner input #1).
  useEffect(() => {
    const sync = () => setNavOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEvents(
    (e) => {
      if (e.type && e.type !== 'CONNECTED') {
        setFlash(e.type)
        setTimeout(() => setFlash(null), 1200)
      }
      refetch()
    },
    setSseOk, // offline banner input #2: SSE connection health
  )

  return { state, refetch, flash, status, online: navOnline && sseOk }
}
