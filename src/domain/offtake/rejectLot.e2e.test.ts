// Lot rejection + level-derived advance — drives the real route handlers.
import { describe, it, expect, afterAll } from 'vitest'

const RUN = process.env.RUN_E2E === '1'
const json = (body: unknown, method = 'POST') =>
  new Request('http://test.local', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

;(RUN ? describe : describe.skip)('lot rejection + credit-aware advance', () => {
  it('rejects with reason, notifies farmer, records event, leaves fill unchanged', async () => {
    const { db } = await import('@/lib/db')
    const { resetDemo, IDS } = await import('@/domain/seed/seed')
    const { POST: createContract } = await import('@/app/api/contracts/route')
    const { POST: enroll } = await import('@/app/api/enrollments/route')
    const { POST: harvest } = await import('@/app/api/harvest/route')
    const { PATCH: patchLot } = await import('@/app/api/lots/[id]/route')

    await resetDemo(db)
    const c = await (await createContract(json({ crop: 'tomato', grade: 'A', volume: 50, bandMin: 5000, bandMax: 9000 }))).json()
    await enroll(json({ contractId: c.contract.id, farmerId: IDS.musa, plannedVolume: 20, withAdvance: false }))
    await harvest(json({ farmerId: IDS.musa, crop: 'tomato', baskets: 12 }))
    const lot = await db.lot.findFirst({ where: { status: 'picked', enrollment: { farmerId: IDS.musa } } })

    const r = await (await patchLot(json({ action: 'reject', reason: 'moisture above 14%' }, 'PATCH'), { params: Promise.resolve({ id: lot!.id }) })).json()
    expect(r.lot.status).toBe('rejected')

    const updated = await db.lot.findUnique({ where: { id: lot!.id } })
    expect(updated!.status).toBe('rejected')
    expect(updated!.orderId).toBeNull()

    const sms = await db.message.findFirst({ where: { toPhone: '+2348030000010', body: { contains: 'moisture' } } })
    expect(sms).toBeTruthy()
    const ev = await db.event.findFirst({ where: { type: 'LOT_REJECTED', createdAt: { gt: new Date(Date.now() - 60_000) } } })
    expect(ev).toBeTruthy()

    const contract = await db.contract.findUnique({ where: { id: c.contract.id } })
    expect(contract!.filledVolume).toBe(0)

    // Double-reject guarded
    const again = await patchLot(json({ action: 'reject', reason: 'duplicate attempt' }, 'PATCH'), { params: Promise.resolve({ id: lot!.id }) })
    expect(again.status).toBe(409)
  })

  it('level-derived advance: L3 farmer gets 60%', async () => {
    const { db } = await import('@/lib/db')
    const { resetDemo } = await import('@/domain/seed/seed')
    const { POST: createContract } = await import('@/app/api/contracts/route')
    const { POST: enroll } = await import('@/app/api/enrollments/route')

    await resetDemo(db)
    const c = await (await createContract(json({ crop: 'maize', grade: 'A', volume: 50, bandMin: 55000, bandMax: 65000 }))).json()
    const e = await (await enroll(json({ contractId: c.contract.id, farmerId: 'farmer_sani', plannedVolume: 10, withAdvance: true }))).json()
    expect(e.advance.amount).toBe(33_000_000) // 0.6 × 10 × 5,500,000 kobo
  })
})

afterAll(async () => {
  const { db } = await import('@/lib/db')
  await db.$disconnect()
})
