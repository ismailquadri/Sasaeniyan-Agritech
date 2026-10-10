import { z } from 'zod'
import { db } from '@/lib/db'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

const Body = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  crop: z.string().default('tomato'),
  language: z.enum(['ha', 'pcm', 'en']).default('ha'),
  geoPoint: z.string().default('11.08,7.70'),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const b = parsed.data

  const existing = await db.farmer.findUnique({ where: { phone: b.phone } })
  if (existing) return Response.json({ error: 'phone already registered' }, { status: 409 })

  const farmer = await db.$transaction(async (tx) => {
    const w = await tx.wallet.create({ data: { ownerType: 'farmer', ownerId: 'pending', balance: 0 } })
    const f = await tx.farmer.create({
      data: { name: b.name, phone: b.phone, crop: b.crop, language: b.language, geoPoint: b.geoPoint, walletId: w.id },
    })
    await tx.wallet.update({ where: { id: w.id }, data: { ownerId: f.id } })
    return f
  })

  publish({ type: 'FARMER_REGISTERED', payload: { farmerId: farmer.id, name: farmer.name } })
  return Response.json({ farmer }, { status: 201 })
}
