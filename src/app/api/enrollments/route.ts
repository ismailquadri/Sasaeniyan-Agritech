import { z } from 'zod'
import { db } from '@/lib/db'
import { maxAdvance } from '@/domain/finance/finance'
import { adjust } from '@/domain/wallet/wallet'
import { PLATFORM_WALLET_ID } from '@/domain/config'
import { advanceRateFor } from '@/domain/credit'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

const Body = z.object({
  contractId: z.string(),
  farmerId: z.string(),
  agentId: z.string().default('agent_ibrahim'),
  plannedVolume: z.number().int().positive(),
  withAdvance: z.boolean().default(true),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const b = parsed.data

  const [contract, farmer] = await Promise.all([
    db.contract.findUnique({ where: { id: b.contractId } }),
    db.farmer.findUnique({ where: { id: b.farmerId } }),
  ])
  if (!contract || !farmer) return Response.json({ error: 'contract or farmer not found' }, { status: 404 })

  const existing = await db.enrollment.findFirst({ where: { contractId: b.contractId, farmerId: b.farmerId } })
  if (existing) return Response.json({ error: 'farmer already enrolled on this contract' }, { status: 409 })

  const result = await db.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: {
        contractId: b.contractId,
        farmerId: b.farmerId,
        agentId: b.agentId,
        plannedVolume: b.plannedVolume,
      },
    })

    let advance = null
    if (b.withAdvance) {
      const amount = maxAdvance({
        plannedVolume: b.plannedVolume,
        bandMin: contract.bandMin,
        rate: advanceRateFor(farmer.creditScore), // credit flywheel: L1 40% / L2 50% / L3 60%
      })
      advance = await tx.advance.create({ data: { enrollmentId: enrollment.id, amount } })
      await adjust(tx, farmer.walletId, amount, 'advance', enrollment.id)
      await adjust(tx, PLATFORM_WALLET_ID, -amount, 'advance', enrollment.id)
    }
    return { enrollment, advance }
  })

  publish({ type: 'ENROLLED', payload: { enrollmentId: result.enrollment.id, farmerId: b.farmerId } })
  if (result.advance)
    publish({ type: 'ADVANCE_ISSUED', payload: { farmerId: b.farmerId, amount: result.advance.amount } })

  return Response.json(result, { status: 201 })
}
