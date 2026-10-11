'use client'

import { useEffect, useRef } from 'react'

export interface AppEvent {
  type: string
  payload?: unknown
}

/**
 * Subscribe to the server event stream. Calls onEvent for every event.
 * Falls back to polling (via onEvent({type:'POLL'})) if SSE errors.
 * onConnectionChange reports SSE health (true = live stream open).
 */
export function useEvents(onEvent: (e: AppEvent) => void, onConnectionChange?: (ok: boolean) => void) {
  const cb = useRef(onEvent)
  cb.current = onEvent
  const conn = useRef(onConnectionChange)
  conn.current = onConnectionChange

  useEffect(() => {
    let es: EventSource | null = null
    let poll: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (poll) return
      poll = setInterval(() => cb.current({ type: 'POLL' }), 3000)
    }

    try {
      es = new EventSource('/api/events')
      es.onopen = () => conn.current?.(true)
      es.onmessage = (ev) => {
        conn.current?.(true)
        try {
          cb.current(JSON.parse(ev.data) as AppEvent)
        } catch {
          /* ignore malformed frame */
        }
      }
      es.onerror = () => {
        // EventSource auto-reconnects; add polling as a safety net.
        conn.current?.(false)
        startPolling()
      }
    } catch {
      conn.current?.(false)
      startPolling()
    }

    return () => {
      es?.close()
      if (poll) clearInterval(poll)
    }
  }, [])
}
