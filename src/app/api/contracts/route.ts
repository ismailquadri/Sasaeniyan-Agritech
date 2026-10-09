import { z } from 'zod'
import { db } from '@/lib/db'
import { naira } from '@/lib/money'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

// Money fields arrive in naira (human-facing) and are stored as kobo.
const Body = z.object({
  buyerId: z.string().default('buyer_okafor'),
  crop: z.string(),
  grade: z.string().default('A'),
  volume: z.number().int().positive(),
  bandMin: z.number().positive(), // naira per basket
  bandMax: z.number().positive(),
  windowDays: z.number().int().positive().default(14),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const b = parsed.data

  const now = new Date()
  const windowEnd = new Date(now.getTime() + b.windowDays * 86_400_000)

  const contract = await db.contract.create({
    data: {
      buyerId: b.buyerId,
      crop: b.crop,
      grade: b.grade,
      volume: b.volume,
      bandMin: naira(b.bandMin),
      bandMax: naira(b.bandMax),
      windowStart: now,
      windowEnd,
    },
  })

  publish({ type: 'CONTRACT_CREATED', payload: { contractId: contract.id, crop: contract.crop } })
  return Response.json({ contract }, { status: 201 })
}
