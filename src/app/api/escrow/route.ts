import { z } from 'zod'
import { db } from '@/lib/db'
import { adjust } from '@/domain/wallet/wallet'
import { escrowReduce } from '@/domain/escrow/escrow'
import { PLATFORM_WALLET_ID } from '@/domain/config'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

const Body = z.object({ orderId: z.string() })

// Buyer funds escrow for an order: debit buyer wallet, hold in platform escrow.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { lots: true, contract: { include: { buyer: true } }, escrow: true },
  })
  if (!order) return Response.json({ error: 'order not found' }, { status: 404 })

  escrowReduce(order.escrow ? (order.escrow.status as 'funded') : 'none', 'fund') // guard

  const amount = order.lots.reduce((s, l) => s + l.unitPrice * l.quantity, 0)

  await db.$transaction(async (tx) => {
    await adjust(tx, order.contract.buyer.walletId, -amount, 'escrow_fund', order.id)
    await adjust(tx, PLATFORM_WALLET_ID, amount, 'escrow_fund', order.id)
    await tx.escrowAccount.create({ data: { orderId: order.id, amount, status: 'funded' } })
    await tx.order.update({ where: { id: order.id }, data: { status: 'funded' } })
  })

  publish({ type: 'ESCROW_FUNDED', payload: { orderId: order.id, amount } })
  return Response.json({ orderId: order.id, amount, status: 'funded' }, { status: 201 })
}
