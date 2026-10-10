import { z } from 'zod'
import { db } from '@/lib/db'
import { formatNaira } from '@/lib/money'
import { netPayout } from '@/domain/finance/finance'
import { adjust } from '@/domain/wallet/wallet'
import { escrowReduce } from '@/domain/escrow/escrow'
import { PLATFORM_FEE_RATE, AGENT_COMMISSION_RATE, PLATFORM_WALLET_ID } from '@/domain/config'
import { t, type Lang } from '@/domain/i18n/strings'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'
// The per-lot transaction can legitimately run long on serverless Postgres.
export const maxDuration = 30

const Body = z.object({ orderId: z.string() })

// Confirm delivery: release escrow, net each lot's payout, pay farmers +
// agent, retain platform fee + recoup advances, SMS an itemised receipt.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: {
      escrow: true,
      lots: { include: { enrollment: { include: { farmer: true, advance: true } }, agent: true } },
    },
  })
  if (!order) return Response.json({ error: 'order not found' }, { status: 404 })
  if (!order.escrow) return Response.json({ error: 'escrow not funded' }, { status: 400 })

  escrowReduce(order.escrow.status as 'funded', 'release') // guard: must be funded

  const receipts: { toPhone: string; farmerPayout: number }[] = []

  await db.$transaction(async (tx) => {
    // The order snapshot is pre-transaction, so two lots on the same
    // enrollment would both see the advance as 'issued' — net it only once.
    const netted = new Set<string>()
    for (const lot of order.lots) {
      const saleValue = lot.unitPrice * lot.quantity
      const adv = lot.enrollment.advance
      const advance = adv && adv.status === 'issued' && !netted.has(adv.id) ? adv.amount : 0
      const np = netPayout({
        saleValue,
        advance,
        feeRate: PLATFORM_FEE_RATE,
        commissionRate: AGENT_COMMISSION_RATE,
      })

      const farmer = lot.enrollment.farmer
      // Pay farmer + agent out of the platform-held escrow; platform retains
      // fee + recouped advance.
      await adjust(tx, farmer.walletId, np.farmerPayout, 'payout', lot.id)
      await adjust(tx, PLATFORM_WALLET_ID, -np.farmerPayout, 'payout', lot.id)
      await adjust(tx, lot.agent.walletId, np.agentCommission, 'commission', lot.id)
      await adjust(tx, PLATFORM_WALLET_ID, -np.agentCommission, 'commission', lot.id)

      if (adv && adv.status === 'issued' && !netted.has(adv.id)) {
        await tx.advance.update({ where: { id: adv.id }, data: { status: 'netted' } })
        netted.add(adv.id)
      }
      await tx.lot.update({ where: { id: lot.id }, data: { status: 'delivered' } })
      // Credit flywheel: reliable completed cycle.
      await tx.farmer.update({ where: { id: farmer.id }, data: { creditScore: { increment: 5 } } })

      const flang = (farmer.language as Lang) ?? 'ha'
      await tx.message.create({
        data: {
          toPhone: farmer.phone,
          channel: 'SMS',
          lang: flang,
          body: t('paymentReceipt', flang, {
            saleValue: formatNaira(saleValue),
            advance: formatNaira(advance),
            fees: formatNaira(np.platformFee + np.agentCommission),
            payout: formatNaira(np.farmerPayout),
          }),
        },
      })
      receipts.push({ toPhone: farmer.phone, farmerPayout: np.farmerPayout })
    }

    await tx.escrowAccount.update({ where: { id: order.escrow!.id }, data: { status: 'released' } })
    await tx.order.update({ where: { id: order.id }, data: { status: 'delivered', deliveredAt: new Date() } })
    // Per-lot ledger writes + SMS add up; default 5s can P2028 on a slow/serverless DB.
  }, { timeout: 20_000 })

  publish({ type: 'PAID', payload: { orderId: order.id, receipts } })
  return Response.json({ orderId: order.id, status: 'delivered', receipts })
}
