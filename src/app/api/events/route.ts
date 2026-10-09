import { subscribe, unsubscribe } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

export function GET() {
  const encoder = new TextEncoder()
  let self: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      self = controller
      subscribe(controller)
      // Initial comment + a hello event so clients know they're connected.
      controller.enqueue(encoder.encode(': connected\n\n'))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`))
    },
    cancel() {
      unsubscribe(self)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
