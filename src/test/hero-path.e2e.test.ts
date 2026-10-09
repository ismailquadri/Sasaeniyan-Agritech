// Hero-path integration test: drives the REAL route handlers end-to-end
// against the dev Postgres, so the demo can't silently break.
// Guarded behind RUN_E2E=1 (needs the database up); run with `npm run test:e2e`.
import { describe, it, expect, afterAll } from 'vitest'

const RUN = process.env.RUN_E2E === '1'

const json = (body: unknown) =>
  new Request('http://test.local', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

;(RUN ? describe : describe.skip)('hero path (Scenario 1)', () => {
  it('runs the full loop and settles the ledger', async () => {
    const { db } = await import('@/lib/db')
    const { resetDemo, IDS } = await import('@/domain/seed/seed')
    const { POST: createContract } = await import('@/app/api/contracts/route')
    const { POST: enroll } = await import('@/app/api/enrollments/route')
    const { POST: ussd } = await import('@/app/api/ussd/route')
    const { PATCH: gradeLot } = await import('@/app/api/lots/[id]/route')
    const { POST: fundEscrow } = await import('@/app/api/escrow/route')
    const { POST: payout } = await import('@/app/api/payout/route')

    await resetDemo(db)

    // 1. Buyer posts demand: tomato, Grade A, 50 baskets, ₦5,000–₦9,000/basket.
    const c = await (await createContract(json({ crop: 'tomato', grade: 'A', volume: 50, bandMin: 5000, bandMax: 9000, windowDays: 14 }))).json()
    const contractId = c.contract.id

    // 2. Agent enrols Musa (planned 20 baskets) with a 40% advance.
    const e = await (await enroll(json({ contractId, farmerId: IDS.musa, plannedVolume: 20, withAdvance: true }))).json()
    expect(e.advance.amount).toBe(4_000_000) // 0.4 * 20 * ₦5,000

    // 3. Musa dials USSD and sells 12 baskets.
    const phone = '+2348030000010'
    const sid = 'e2e-session'
    await ussd(json({ phone, sessionId: sid, input: '1' })) // sell
    await ussd(json({ phone, sessionId: sid, input: '1' })) // tomato
    await ussd(json({ phone, sessionId: sid, input: '12' })) // baskets -> offer
    const acc = await (await ussd(json({ phone, sessionId: sid, input: '1' }))).json() // accept
    expect(acc.step).toBe('done')

    const lot = await db.lot.findFirst({ where: { status: 'picked' } })
    expect(lot).toBeTruthy()
    expect(lot!.unitPrice).toBe(500_000) // glut ₦3,000 clamped up to band min ₦5,000

    // 4. Agent grades the lot A → aggregates into the buyer order.
    const g = await (await gradeLot(json({ grade: 'A' }), { params: Promise.resolve({ id: lot!.id }) })).json()
    const orderId = g.orderId
    expect(g.filledVolume).toBe(12)

    // 5. Buyer funds escrow.
    const esc = await (await fundEscrow(json({ orderId }))).json()
    expect(esc.amount).toBe(6_000_000) // 12 × ₦5,000

    // 6. Confirm delivery → payout with advance netting.
    const pay = await (await payout(json({ orderId }))).json()
    expect(pay.status).toBe('delivered')

    // Assertions: ledger + state transitions.
    const order = await db.order.findUnique({ where: { id: orderId } })
    expect(order!.status).toBe('delivered')
    expect(order!.deliveredAt).toBeTruthy()

    const contract = await db.contract.findUnique({ where: { id: contractId } })
    expect(contract!.filledVolume).toBe(12)

    const musaWallet = await db.wallet.findUnique({ where: { id: IDS.walletMusa } })
    // advance ₦40,000 + net payout ₦17,000 = ₦57,000
    expect(musaWallet!.balance).toBe(5_700_000)

    const agentWallet = await db.wallet.findUnique({ where: { id: IDS.walletAgent } })
    expect(agentWallet!.balance).toBe(120_000) // 2% commission on ₦60,000

    const platformWallet = await db.wallet.findUnique({ where: { id: IDS.walletPlatform } })
    expect(platformWallet!.balance).toBe(180_000) // 3% fee net of advance recoup

    const deliveredLot = await db.lot.findUnique({ where: { id: lot!.id } })
    expect(deliveredLot!.status).toBe('delivered')

    const receipt = await db.message.findFirst({ where: { toPhone: phone, body: { contains: 'biya' } } })
    expect(receipt).toBeTruthy()

    const advance = await db.advance.findFirst({ where: { enrollmentId: e.enrollment.id } })
    expect(advance!.status).toBe('netted')
  })

  it('app path (POST /api/harvest) settles the same ledger', async () => {
    const { db } = await import('@/lib/db')
    const { resetDemo, IDS } = await import('@/domain/seed/seed')
    const { POST: createContract } = await import('@/app/api/contracts/route')
    const { POST: enroll } = await import('@/app/api/enrollments/route')
    const { POST: harvest } = await import('@/app/api/harvest/route')
    const { PATCH: gradeLot } = await import('@/app/api/lots/[id]/route')
    const { POST: fundEscrow } = await import('@/app/api/escrow/route')
    const { POST: payout } = await import('@/app/api/payout/route')

    await resetDemo(db)
    const c = await (await createContract(json({ crop: 'tomato', grade: 'A', volume: 50, bandMin: 5000, bandMax: 9000, windowDays: 14 }))).json()
    await (await enroll(json({ contractId: c.contract.id, farmerId: IDS.musa, plannedVolume: 20, withAdvance: true }))).json()

    const h = await (await harvest(json({ farmerId: IDS.musa, crop: 'tomato', baskets: 12 }))).json()
    expect(h.price).toBe(500_000)

    const lot = await db.lot.findFirst({ where: { status: 'picked' } })
    const g = await (await gradeLot(json({ grade: 'A' }), { params: Promise.resolve({ id: lot!.id }) })).json()
    await (await fundEscrow(json({ orderId: g.orderId }))).json()
    await (await payout(json({ orderId: g.orderId }))).json()

    const musaWallet = await db.wallet.findUnique({ where: { id: IDS.walletMusa } })
    expect(musaWallet!.balance).toBe(5_700_000) // identical to the USSD path
  })
})

afterAll(async () => {
  const { db } = await import('@/lib/db')
  await db.$disconnect()
})
