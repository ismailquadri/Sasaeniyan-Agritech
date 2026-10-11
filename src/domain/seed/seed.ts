import type { PrismaClient } from '@prisma/client'
import { naira } from '../../lib/money'
import { CROPS } from '../crops'

// Fixed ids so the demo cast is deterministic across resets.
export const IDS = {
  walletPlatform: 'wallet_platform',
  walletBuyer: 'wallet_buyer_okafor',
  walletAgent: 'wallet_agent_ibrahim',
  walletMusa: 'wallet_farmer_musa',
  walletHauwa: 'wallet_farmer_hauwa',
  walletSani: 'wallet_farmer_sani',
  walletAmina: 'wallet_farmer_amina',
  walletBello: 'wallet_farmer_bello',
  walletDantata: 'wallet_buyer_dantata',
  walletFreshco: 'wallet_buyer_freshco',
  buyer: 'buyer_okafor',
  buyerDantata: 'buyer_dantata',
  buyerFreshco: 'buyer_freshco',
  agent: 'agent_ibrahim',
  musa: 'farmer_musa',
  hauwa: 'farmer_hauwa',
  sani: 'farmer_sani',
  amina: 'farmer_amina',
  bello: 'farmer_bello',
}

type DB = PrismaClient

// Seed anchor — all dates derive from this so the cast is deterministic.
const ANCHOR = new Date('2026-10-09T00:00:00.000Z')
const daysAgo = (n: number) => new Date(ANCHOR.getTime() - n * 86_400_000)

// 7-day market-index walks (naira per unit, oldest → latest).
// Latest values preserve the hero numbers (tomato glut ₦3,000 vs ₦5,000 band floor).
const INDEX_WALKS: Record<string, number[]> = {
  tomato: [4200, 4000, 3800, 3600, 3400, 3200, 3000], // glut story
  pepper: [6600, 6700, 6800, 6900, 6900, 7000, 7000],
  onion: [5200, 5300, 5250, 5400, 5450, 5500, 5500],
  cabbage: [3900, 3850, 3900, 4000, 4050, 4100, 4100],
  watermelon: [4800, 4700, 4750, 4600, 4650, 4700, 4650],
  cucumber: [5100, 5200, 5150, 5300, 5250, 5350, 5400],
  maize: [56000, 56500, 57500, 57000, 58500, 59000, 58000],
  rice: [74000, 74500, 75000, 76000, 75500, 76500, 77000],
  sorghum: [52000, 51500, 52500, 53000, 52800, 53500, 54000],
  millet: [48000, 48500, 48200, 49000, 49500, 49200, 50000],
  groundnut: [88000, 87500, 89000, 90000, 89500, 91000, 92000],
  ginger: [135000, 136000, 138000, 137000, 139000, 141000, 140000],
}

async function wallet(db: DB, id: string, ownerType: string, ownerId: string, balance = 0) {
  return db.wallet.upsert({
    where: { id },
    update: { balance, ownerType, ownerId },
    create: { id, ownerType, ownerId, balance },
  })
}

async function ledger(db: DB, id: string, walletId: string, amount: number, type: string, ref: string, createdAt: Date) {
  return db.ledgerEntry.upsert({
    where: { id },
    update: { walletId, amount, type, ref, createdAt },
    create: { id, walletId, amount, type, ref, createdAt },
  })
}

async function farmer(db: DB, data: {
  id: string; name: string; phone: string; geoPoint: string; crop: string
  ndfrVerified: boolean; walletId: string; creditScore: number
}) {
  const { id, ...rest } = data
  return db.farmer.upsert({ where: { id }, update: { ...rest, language: 'ha' }, create: { id, ...rest, language: 'ha' } })
}

/** Create the deterministic demo cast + 7-day market history + marketplace history. */
export async function seedDemo(db: DB) {
  // ---- Wallets --------------------------------------------------------------
  // Platform/agent balances equal the sum of their seeded history ledgers.
  await wallet(db, IDS.walletPlatform, 'platform', 'platform', naira(174_600)) // retained fees (maize 69,600 + ginger 105,000)
  await wallet(db, IDS.walletBuyer, 'buyer', IDS.buyer, naira(5_000_000))
  await wallet(db, IDS.walletDantata, 'buyer', IDS.buyerDantata, naira(3_000_000))
  await wallet(db, IDS.walletFreshco, 'buyer', IDS.buyerFreshco, naira(2_000_000))
  await wallet(db, IDS.walletAgent, 'agent', IDS.agent, naira(116_400)) // commissions (46,400 + 70,000)
  await wallet(db, IDS.walletMusa, 'farmer', IDS.musa, 0) // hero: zero start
  await wallet(db, IDS.walletHauwa, 'farmer', IDS.hauwa, 0)
  await wallet(db, IDS.walletSani, 'farmer', IDS.sani, naira(184_500))
  await wallet(db, IDS.walletAmina, 'farmer', IDS.amina, naira(96_200))
  await wallet(db, IDS.walletBello, 'farmer', IDS.bello, naira(12_000))

  // ---- Buyers ---------------------------------------------------------------
  const buyers = [
    { id: IDS.buyer, orgName: 'Northern Foods Ltd', contactName: 'Mrs. Okafor', walletId: IDS.walletBuyer },
    { id: IDS.buyerDantata, orgName: 'Kano Agro Exports', contactName: 'Alhaji Dantata', walletId: IDS.walletDantata },
    { id: IDS.buyerFreshco, orgName: 'FreshCo Lagos', contactName: 'Ngozi Eze', walletId: IDS.walletFreshco },
  ]
  for (const { id, ...rest } of buyers) {
    await db.buyer.upsert({ where: { id }, update: rest, create: { id, ...rest } })
  }

  // ---- Agent ----------------------------------------------------------------
  await db.agent.upsert({
    where: { id: IDS.agent },
    update: { name: 'Ibrahim', phone: '+2348030000001', walletId: IDS.walletAgent, reputation: 5 },
    create: { id: IDS.agent, name: 'Ibrahim', phone: '+2348030000001', walletId: IDS.walletAgent, reputation: 5 },
  })

  // ---- Farmers (Musa stays L1 / creditScore 8 — hero advance math unchanged) --
  await farmer(db, { id: IDS.musa, name: 'Musa Abdullahi', phone: '+2348030000010', geoPoint: '11.07,7.71', crop: 'tomato', ndfrVerified: true, walletId: IDS.walletMusa, creditScore: 8 })
  await farmer(db, { id: IDS.hauwa, name: 'Hauwa Bala', phone: '+2348030000011', geoPoint: '11.09,7.69', crop: 'pepper', ndfrVerified: false, walletId: IDS.walletHauwa, creditScore: 4 })
  await farmer(db, { id: IDS.sani, name: 'Sani Garba', phone: '+2348030000012', geoPoint: '12.00,8.52', crop: 'maize', ndfrVerified: true, walletId: IDS.walletSani, creditScore: 34 })
  await farmer(db, { id: IDS.amina, name: 'Amina Yusuf', phone: '+2348030000013', geoPoint: '11.51,8.28', crop: 'ginger', ndfrVerified: true, walletId: IDS.walletAmina, creditScore: 16 })
  await farmer(db, { id: IDS.bello, name: 'Bello Adamu', phone: '+2348030000014', geoPoint: '12.10,8.60', crop: 'rice', ndfrVerified: false, walletId: IDS.walletBello, creditScore: 3 })

  // ---- Market index: 7 daily rows per catalog crop ---------------------------
  for (const crop of CROPS) {
    const walk = INDEX_WALKS[crop.id]
    if (!walk) continue
    for (let i = 0; i < walk.length; i++) {
      const date = daysAgo(walk.length - 1 - i)
      await db.marketIndex.upsert({
        where: { crop_date: { crop: crop.id, date } },
        update: { indexPrice: naira(walk[i]) },
        create: { crop: crop.id, date, indexPrice: naira(walk[i]) },
      })
    }
  }

  // ---- History 1: delivered maize contract (Sani → Kano Agro Exports) --------
  // 40 bags @ ₦58,000 = ₦2,320,000 sale; fees 3%+2%; no advance.
  {
    const saleValue = naira(40 * 58_000)
    await db.contract.upsert({
      where: { id: 'contract_hist_maize' },
      update: {},
      create: {
        id: 'contract_hist_maize', buyerId: IDS.buyerDantata, crop: 'maize', grade: 'A',
        volume: 40, bandMin: naira(55_000), bandMax: naira(65_000),
        windowStart: daysAgo(14), windowEnd: daysAgo(4), status: 'filled', filledVolume: 40,
        createdAt: daysAgo(14),
      },
    })
    await db.enrollment.upsert({
      where: { id: 'enrol_hist_maize' },
      update: {},
      create: { id: 'enrol_hist_maize', contractId: 'contract_hist_maize', farmerId: IDS.sani, agentId: IDS.agent, plannedVolume: 40, createdAt: daysAgo(13) },
    })
    await db.order.upsert({
      where: { id: 'order_hist_maize' },
      update: {},
      create: { id: 'order_hist_maize', contractId: 'contract_hist_maize', status: 'delivered', deliveredAt: daysAgo(5), createdAt: daysAgo(8) },
    })
    await db.lot.upsert({
      where: { id: 'lot_hist_maize' },
      update: {},
      create: {
        id: 'lot_hist_maize', enrollmentId: 'enrol_hist_maize', agentId: IDS.agent,
        quantity: 40, grade: 'A', unitPrice: naira(58_000), status: 'delivered',
        traceRef: 'NDFR-SANI-00001', orderId: 'order_hist_maize', createdAt: daysAgo(8),
      },
    })
    await db.escrowAccount.upsert({
      where: { orderId: 'order_hist_maize' },
      update: {},
      create: { id: 'escrow_hist_maize', orderId: 'order_hist_maize', amount: saleValue, status: 'released', createdAt: daysAgo(6) },
    })
    const fee = Math.round(saleValue * 0.03)
    const com = Math.round(saleValue * 0.02)
    await ledger(db, 'led_sani_payout', IDS.walletSani, saleValue - fee - com, 'payout', 'lot_hist_maize', daysAgo(5))
    await ledger(db, 'led_sani_withdraw', IDS.walletSani, -(saleValue - fee - com - naira(184_500)), 'withdrawal', 'cashout', daysAgo(4))
    await ledger(db, 'led_agent_com_maize', IDS.walletAgent, com, 'commission', 'lot_hist_maize', daysAgo(5))
    await db.message.upsert({
      where: { id: 'msg_sani_receipt' },
      update: {},
      create: {
        id: 'msg_sani_receipt', toPhone: '+2348030000012', channel: 'SMS', lang: 'ha',
        body: 'An biya ka. Sayarwa: ₦2,320,000. Cire bashi: ₦0. Kudin aiki: ₦116,000. Nasan hannunka: ₦2,204,000.',
        createdAt: daysAgo(5),
      },
    })
  }

  // ---- History 2: delivered ginger contract (Amina → FreshCo) ----------------
  {
    const saleValue = naira(25 * 140_000)
    await db.contract.upsert({
      where: { id: 'contract_hist_ginger' },
      update: {},
      create: {
        id: 'contract_hist_ginger', buyerId: IDS.buyerFreshco, crop: 'ginger', grade: 'A',
        volume: 25, bandMin: naira(130_000), bandMax: naira(160_000),
        windowStart: daysAgo(12), windowEnd: daysAgo(2), status: 'filled', filledVolume: 25,
        createdAt: daysAgo(12),
      },
    })
    await db.enrollment.upsert({
      where: { id: 'enrol_hist_ginger' },
      update: {},
      create: { id: 'enrol_hist_ginger', contractId: 'contract_hist_ginger', farmerId: IDS.amina, agentId: IDS.agent, plannedVolume: 25, createdAt: daysAgo(11) },
    })
    await db.order.upsert({
      where: { id: 'order_hist_ginger' },
      update: {},
      create: { id: 'order_hist_ginger', contractId: 'contract_hist_ginger', status: 'delivered', deliveredAt: daysAgo(3), createdAt: daysAgo(6) },
    })
    await db.lot.upsert({
      where: { id: 'lot_hist_ginger' },
      update: {},
      create: {
        id: 'lot_hist_ginger', enrollmentId: 'enrol_hist_ginger', agentId: IDS.agent,
        quantity: 25, grade: 'A', unitPrice: naira(140_000), status: 'delivered',
        traceRef: 'NDFR-AMIN-00004', orderId: 'order_hist_ginger', createdAt: daysAgo(6),
      },
    })
    await db.escrowAccount.upsert({
      where: { orderId: 'order_hist_ginger' },
      update: {},
      create: { id: 'escrow_hist_ginger', orderId: 'order_hist_ginger', amount: saleValue, status: 'released', createdAt: daysAgo(4) },
    })
    const fee = Math.round(saleValue * 0.03)
    const com = Math.round(saleValue * 0.02)
    await ledger(db, 'led_amina_payout', IDS.walletAmina, saleValue - fee - com, 'payout', 'lot_hist_ginger', daysAgo(3))
    await ledger(db, 'led_amina_withdraw', IDS.walletAmina, -(saleValue - fee - com - naira(96_200)), 'withdrawal', 'cashout', daysAgo(2))
    await ledger(db, 'led_agent_com_ginger', IDS.walletAgent, com, 'commission', 'lot_hist_ginger', daysAgo(3))
  }

  // ---- History 3: live rice contract (Bello, advance out, one rejected lot) ---
  {
    await db.contract.upsert({
      where: { id: 'contract_live_rice' },
      update: {},
      create: {
        id: 'contract_live_rice', buyerId: IDS.buyer, crop: 'rice', grade: 'A',
        volume: 60, bandMin: naira(70_000), bandMax: naira(85_000),
        windowStart: daysAgo(7), windowEnd: daysAgo(-7), status: 'open', filledVolume: 0,
        createdAt: daysAgo(7),
      },
    })
    await db.enrollment.upsert({
      where: { id: 'enrol_live_rice' },
      update: {},
      create: { id: 'enrol_live_rice', contractId: 'contract_live_rice', farmerId: IDS.bello, agentId: IDS.agent, plannedVolume: 20, createdAt: daysAgo(6) },
    })
    await db.advance.upsert({
      where: { id: 'adv_bello' },
      update: {},
      create: { id: 'adv_bello', enrollmentId: 'enrol_live_rice', amount: naira(12_000), status: 'issued', issuedAt: daysAgo(6) },
    })
    await ledger(db, 'led_bello_adv', IDS.walletBello, naira(12_000), 'advance', 'enrol_live_rice', daysAgo(6))
    await db.lot.upsert({
      where: { id: 'lot_rejected_rice' },
      update: {},
      create: {
        id: 'lot_rejected_rice', enrollmentId: 'enrol_live_rice', agentId: IDS.agent,
        quantity: 10, grade: 'A', unitPrice: naira(70_000), status: 'rejected',
        traceRef: 'NDFR-BELO-00009', createdAt: daysAgo(2),
      },
    })
    await db.message.upsert({
      where: { id: 'msg_bello_rejected' },
      update: {},
      create: {
        id: 'msg_bello_rejected', toPhone: '+2348030000014', channel: 'SMS', lang: 'ha',
        body: "An ki kwandon ka: moisture above 14% at pickup. Jami'i zai sake duba. Ka tuntubi jami'inka.",
        createdAt: daysAgo(2),
      },
    })
    await db.event.upsert({
      where: { id: 'evt_bello_rejected' },
      update: {},
      create: { id: 'evt_bello_rejected', type: 'LOT_REJECTED', payload: { lotId: 'lot_rejected_rice', farmerId: IDS.bello, reason: 'moisture above 14% at pickup' }, createdAt: daysAgo(2) },
    })
  }
}

/** Wipe all demo data (FK-safe order) and re-seed. */
export async function resetDemo(db: DB) {
  await db.ledgerEntry.deleteMany()
  await db.escrowAccount.deleteMany()
  await db.advance.deleteMany()
  await db.lot.deleteMany()
  await db.order.deleteMany()
  await db.enrollment.deleteMany()
  await db.contract.deleteMany()
  await db.message.deleteMany()
  await db.event.deleteMany()
  await db.marketIndex.deleteMany()
  await db.farmer.deleteMany()
  await db.agent.deleteMany()
  await db.buyer.deleteMany()
  await db.wallet.deleteMany()
  await seedDemo(db)
}
