import { z } from 'zod'
import { db } from '@/lib/db'
import { formatNaira } from '@/lib/money'
import { newSession, ussdStep } from '@/domain/notify/ussd'
import { sessions } from '@/domain/notify/sessionStore'
import { harvestPricing, acceptHarvest } from '@/domain/offtake/acceptHarvest'

export const dynamic = 'force-dynamic'

const Body = z.object({
  phone: z.string(),
  sessionId: z.string(),
  input: z.string().default(''),
  lang: z.enum(['ha', 'pcm', 'en']).optional(),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const { phone, sessionId, input, lang } = parsed.data

  const session = sessions.get(sessionId) ?? newSession(lang ?? 'ha')
  const pc = session.crop ? await harvestPricing(db, { phone }, session.crop) : null
  const ctx = pc ? { price: formatNaira(pc.price), middleman: formatNaira(pc.index.indexPrice) } : {}

  const result = ussdStep(session, input, ctx)
  sessions.set(sessionId, result.session)

  if (result.action?.type === 'ACCEPT_HARVEST') {
    await acceptHarvest(db, { phone, crop: result.action.crop, baskets: result.action.baskets })
  }

  return Response.json({ prompt: result.prompt, step: result.session.step })
}
