import { z } from 'zod'
import { db } from '@/lib/db'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { t, type Lang } from '@/domain/i18n/strings'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

const Body = z.union([
  z.object({ grade: z.enum(['A', 'B', 'C']) }),
  z.object({ action: z.literal('reject'), reason: z.string().min(4) }),
])

// Agent grades + aggregates a picked lot — or rejects it with a reason.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const lot = await db.lot.findUnique({
    where: { id },
    include: { enrollment: { include: { contract: true, farmer: true } } },
  })
  if (!lot) return Response.json({ error: 'lot not found' }, { status: 404 })

  // ---- Reject branch ---------------------------------------------------------
  if ('action' in parsed.data) {
    if (lot.status !== 'picked') {
      return Response.json({ error: 'only picked lots can be rejected' }, { status: 409 })
    }
    const { reason } = parsed.data
    const farmer = lot.enrollment.farmer
    const lang = (farmer.language as Lang) ?? 'ha'
    const updated = await db.$transaction(async (tx) => {
      const u = await tx.lot.update({ where: { id }, data: { status: 'rejected' } })
      await tx.message.create({
        data: { toPhone: farmer.phone, channel: 'SMS', lang, body: t('lotRejected', lang, { reason }) },
      })
      return u
    })
    publish({ type: 'LOT_REJECTED', payload: { lotId: id, farmerId: farmer.id, reason } })
    return Response.json({ lot: updated })
  }

  // ---- Grade branch ----------------------------------------------------------
  const { grade } = parsed.data
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
