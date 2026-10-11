import { z } from 'zod'
import { db } from '@/lib/db'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

const Body = z.object({
  toPhone: z.string().min(6),
  body: z.string().min(2),
  lang: z.enum(['ha', 'pcm', 'en']).default('ha'),
})

// Demo-level dispute logging: the farmer app's "Request review" posts here.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const message = await db.message.create({ data: { channel: 'SMS', ...parsed.data } })
  publish({ type: 'REVIEW_REQUESTED', payload: { toPhone: parsed.data.toPhone } })
  return Response.json({ message }, { status: 201 })
}
