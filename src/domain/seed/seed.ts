import type { PrismaClient } from '@prisma/client'
import { naira } from '../../lib/money'

// Fixed ids so the demo cast is deterministic across resets.
export const IDS = {
  walletPlatform: 'wallet_platform',
  walletBuyer: 'wallet_buyer_okafor',
  walletAgent: 'wallet_agent_ibrahim',
  walletMusa: 'wallet_farmer_musa',
  walletHauwa: 'wallet_farmer_hauwa',
  buyer: 'buyer_okafor',
  agent: 'agent_ibrahim',
  musa: 'farmer_musa',
  hauwa: 'farmer_hauwa',
}

type DB = PrismaClient

async function wallet(db: DB, id: string, ownerType: string, ownerId: string, balance = 0) {
  return db.wallet.upsert({
    where: { id },
    update: { balance, ownerType, ownerId },
    create: { id, ownerType, ownerId, balance },
  })
}

/** Create the deterministic demo cast + glut market index. */
export async function seedDemo(db: DB) {
  await wallet(db, IDS.walletPlatform, 'platform', 'platform', 0)
  await wallet(db, IDS.walletBuyer, 'buyer', IDS.buyer, naira(5_000_000))
  await wallet(db, IDS.walletAgent, 'agent', IDS.agent, 0)
  await wallet(db, IDS.walletMusa, 'farmer', IDS.musa, 0)
  await wallet(db, IDS.walletHauwa, 'farmer', IDS.hauwa, 0)

  await db.buyer.upsert({
    where: { id: IDS.buyer },
    update: { orgName: 'Northern Foods Ltd', contactName: 'Mrs. Okafor', walletId: IDS.walletBuyer },
    create: { id: IDS.buyer, orgName: 'Northern Foods Ltd', contactName: 'Mrs. Okafor', walletId: IDS.walletBuyer },
  })

  await db.agent.upsert({
    where: { id: IDS.agent },
    update: { name: 'Ibrahim', phone: '+2348030000001', walletId: IDS.walletAgent, reputation: 5 },
    create: { id: IDS.agent, name: 'Ibrahim', phone: '+2348030000001', walletId: IDS.walletAgent, reputation: 5 },
  })

  await db.farmer.upsert({
    where: { id: IDS.musa },
    update: {
      name: 'Musa', phone: '+2348030000010', language: 'ha', geoPoint: '11.07,7.71',
      crop: 'tomato', ndfrVerified: true, walletId: IDS.walletMusa, creditScore: 10,
    },
    create: {
      id: IDS.musa, name: 'Musa', phone: '+2348030000010', language: 'ha', geoPoint: '11.07,7.71',
      crop: 'tomato', ndfrVerified: true, walletId: IDS.walletMusa, creditScore: 10,
    },
  })
  await db.farmer.upsert({
    where: { id: IDS.hauwa },
    update: {
      name: 'Hauwa', phone: '+2348030000011', language: 'ha', geoPoint: '11.09,7.69',
      crop: 'pepper', ndfrVerified: false, walletId: IDS.walletHauwa, creditScore: 0,
    },
    create: {
      id: IDS.hauwa, name: 'Hauwa', phone: '+2348030000011', language: 'ha', geoPoint: '11.09,7.69',
      crop: 'pepper', ndfrVerified: false, walletId: IDS.walletHauwa, creditScore: 0,
    },
  })

  const indexDate = new Date('2026-10-09T00:00:00.000Z')
  const index: Record<string, number> = {
    tomato: naira(3_000), // glut
    pepper: naira(7_000),
    onion: naira(5_500),
  }
  for (const [crop, indexPrice] of Object.entries(index)) {
    await db.marketIndex.upsert({
      where: { crop_date: { crop, date: indexDate } },
      update: { indexPrice },
      create: { crop, date: indexDate, indexPrice },
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
