// src/domain/offtake/acceptHarvest.e2e.test.ts
// Guarded like hero-path: needs Postgres up. Run via `npm run test:e2e`.
import { describe, it, expect } from 'vitest'

const RUN = process.env.RUN_E2E === '1'

;(RUN ? describe : describe.skip)('acceptHarvest service', () => {
  it('creates a lot at the fair price, sends SMS, records the event', async () => {
    const { db } = await import('@/lib/db')
    const { resetDemo, IDS } = await import('@/domain/seed/seed')
    const { acceptHarvest } = await import('./acceptHarvest')

    await resetDemo(db)
    // Open contract + enrollment for Musa (tomato, band ₦5,000–₦9,000).
    const contract = await db.contract.create({
      data: {
        buyerId: IDS.buyer, crop: 'tomato', grade: 'A', volume: 50,
        bandMin: 500_000, bandMax: 900_000,
        windowStart: new Date(), windowEnd: new Date(Date.now() + 14 * 86_400_000),
      },
    })
    await db.enrollment.create({
      data: { contractId: contract.id, farmerId: IDS.musa, agentId: IDS.agent, plannedVolume: 20 },
    })

    const result = await acceptHarvest(db, { farmerId: IDS.musa, crop: 'tomato', baskets: 12 })
    expect(result).toBeTruthy()
    expect(result!.price).toBe(500_000) // glut index ₦3,000 clamped up to band min

    const lot = await db.lot.findFirst({ where: { status: 'picked' } })
    expect(lot!.quantity).toBe(12)
    expect(lot!.unitPrice).toBe(500_000)

    const sms = await db.message.findMany({ where: { toPhone: '+2348030000010', channel: 'SMS' } })
    expect(sms.length).toBe(2) // priceOffer + confirmPickup

    const event = await db.event.findFirst({ where: { type: 'HARVEST_ACCEPTED' } })
    expect(event).toBeTruthy()

    // Unknown crop → null, no lot created
    const none = await acceptHarvest(db, { farmerId: IDS.musa, crop: 'maize', baskets: 5 })
    expect(none).toBeNull()
    expect(await db.lot.count()).toBe(1)

    await db.$disconnect()
  })
})
