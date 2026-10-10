// In-memory SSE hub: publish/subscribe domain events to all open surfaces.
// Best-effort persistence to the Event table for audit + debugging.

import { db } from '@/lib/db'

export interface DomainEvent {
  type: string
  payload?: unknown
}

const encoder = new TextEncoder()
const controllers = new Set<ReadableStreamDefaultController<Uint8Array>>()

export function subscribe(controller: ReadableStreamDefaultController<Uint8Array>) {
  controllers.add(controller)
}

export function unsubscribe(controller: ReadableStreamDefaultController<Uint8Array>) {
  controllers.delete(controller)
}

/** Fan out an event to every open stream, then persist it (best-effort). */
export function publish(event: DomainEvent) {
  const frame = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  for (const c of controllers) {
    try {
      c.enqueue(frame)
    } catch {
      controllers.delete(c)
    }
  }
  // Fire-and-forget audit write; never block or fail the request on this.
  db.event
    .create({ data: { type: event.type, payload: (event.payload ?? {}) as object } })
    .catch(() => {})
}
