import { z } from 'zod'
import { db } from '@/lib/db'
import { acceptHarvest } from '@/domain/offtake/acceptHarvest'

export const dynamic = 'force-dynamic'

const Body = z.object({
  farmerId: z.string(),
  crop: z.string(),
  baskets: z.number().int().positive(),
})

// Farmer-app Sell flow — same business logic as the USSD channel.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const result = await acceptHarvest(db, parsed.data)
  if (!result) return Response.json({ error: 'no open contract or market index for this crop' }, { status: 404 })

  return Response.json({ lotId: result.lot.id, price: result.price, index: result.index }, { status: 201 })
}
