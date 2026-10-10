import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Aggregate snapshot for dashboards + the polling fallback.
export async function GET() {
  const [farmers, agents, buyers, contracts, lots, orders, wallets, messages, marketIndex, events] =
    await Promise.all([
      db.farmer.findMany({ orderBy: { name: 'asc' } }),
      db.agent.findMany(),
      db.buyer.findMany(),
      db.contract.findMany({
        orderBy: { createdAt: 'desc' },
        include: { buyer: true, enrollments: { include: { farmer: true, advance: true } } },
      }),
      db.lot.findMany({
        orderBy: { createdAt: 'desc' },
        include: { enrollment: { include: { farmer: true, contract: true } }, agent: true },
      }),
      db.order.findMany({ include: { lots: true, contract: true, escrow: true } }),
      db.wallet.findMany(),
      db.message.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      db.marketIndex.findMany(),
      db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    ])

  return Response.json({ farmers, agents, buyers, contracts, lots, orders, wallets, messages, marketIndex, events })
}
