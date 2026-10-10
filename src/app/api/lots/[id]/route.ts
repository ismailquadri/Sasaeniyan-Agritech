import { z } from 'zod'
import { db } from '@/lib/db'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

const Body = z.object({ grade: z.enum(['A', 'B', 'C']) })

// Agent grades + aggregates a picked lot: recompute price at the graded
// quality, attach to the contract's order, advance the contract fill.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const { grade } = parsed.data

  const lot = await db.lot.findUnique({
    where: { id },
    include: { enrollment: { include: { contract: true } } },
  })
  if (!lot) return Response.json({ error: 'lot not found' }, { status: 404 })

  const contract = lot.enrollment.contract
  const index = await db.marketIndex.findFirst({ where: { crop: contract.crop }, orderBy: { date: 'desc' } })
  const unitPrice = fairPrice({
    indexPrice: index?.indexPrice ?? contract.bandMin,
    grade: grade as Grade,
    bandMin: contract.bandMin,
    bandMax: contract.bandMax,
  })

  const result = await db.$transaction(async (tx) => {
    let order = await tx.order.findFirst({ where: { contractId: contract.id, status: 'open' } })
    if (!order) order = await tx.order.create({ data: { contractId: contract.id } })

    const updated = await tx.lot.update({
      where: { id },
      data: { grade, unitPrice, status: 'aggregated', orderId: order.id },
    })

    const filledVolume = contract.filledVolume + lot.quantity
    const status = filledVolume >= contract.volume ? 'filled' : 'filling'
    await tx.contract.update({ where: { id: contract.id }, data: { filledVolume, status } })

    return { lot: updated, orderId: order.id, filledVolume, contractStatus: status }
  })

  publish({ type: 'LOT_GRADED', payload: { lotId: id, grade, unitPrice } })
  publish({ type: 'ORDER_UPDATED', payload: { orderId: result.orderId, filledVolume: result.filledVolume } })
  return Response.json(result)
}
