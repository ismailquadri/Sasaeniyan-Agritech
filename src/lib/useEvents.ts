'use client'

import { useEffect, useRef } from 'react'

export interface AppEvent {
  type: string
  payload?: unknown
}

/**
 * Subscribe to the server event stream. Calls onEvent for every event.
 * Falls back to polling /api/state (via onEvent({type:'POLL'})) if SSE errors.
 */
export function useEvents(onEvent: (e: AppEvent) => void) {
  const cb = useRef(onEvent)
  cb.current = onEvent

  useEffect(() => {
    let es: EventSource | null = null
    let poll: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (poll) return
      poll = setInterval(() => cb.current({ type: 'POLL' }), 3000)
    }

    try {
      es = new EventSource('/api/events')
      es.onmessage = (ev) => {
        try {
          cb.current(JSON.parse(ev.data) as AppEvent)
        } catch {
          /* ignore malformed frame */
        }
      }
      es.onerror = () => {
        // EventSource auto-reconnects; add polling as a safety net.
        startPolling()
      }
    } catch {
      startPolling()
    }

    return () => {
      es?.close()
      if (poll) clearInterval(poll)
    }
  }, [])
}
