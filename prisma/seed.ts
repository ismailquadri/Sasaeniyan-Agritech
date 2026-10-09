import { PrismaClient } from '@prisma/client'
import { naira } from '../src/lib/money'

const db = new PrismaClient()

// Fixed ids so the demo cast is deterministic across resets.
const IDS = {
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

async function wallet(id: string, ownerType: string, ownerId: string, balance = 0) {
  return db.wallet.upsert({
    where: { id },
    update: { balance, ownerType, ownerId },
    create: { id, ownerType, ownerId, balance },
  })
}

async function main() {
  // Wallets. Buyer funded so she can post demand + fund escrow during the demo.
  await wallet(IDS.walletPlatform, 'platform', 'platform', 0)
  await wallet(IDS.walletBuyer, 'buyer', IDS.buyer, naira(5_000_000))
  await wallet(IDS.walletAgent, 'agent', IDS.agent, 0)
  await wallet(IDS.walletMusa, 'farmer', IDS.musa, 0)
  await wallet(IDS.walletHauwa, 'farmer', IDS.hauwa, 0)

  // Buyer — Mrs. Okafor, Northern Foods Ltd.
  await db.buyer.upsert({
    where: { id: IDS.buyer },
    update: { orgName: 'Northern Foods Ltd', contactName: 'Mrs. Okafor', walletId: IDS.walletBuyer },
    create: { id: IDS.buyer, orgName: 'Northern Foods Ltd', contactName: 'Mrs. Okafor', walletId: IDS.walletBuyer },
  })

  // Agent — Ibrahim.
  await db.agent.upsert({
    where: { id: IDS.agent },
    update: { name: 'Ibrahim', phone: '+2348030000001', walletId: IDS.walletAgent, reputation: 5 },
    create: { id: IDS.agent, name: 'Ibrahim', phone: '+2348030000001', walletId: IDS.walletAgent, reputation: 5 },
  })

  // Farmers — Musa (literate, tomato) and Hauwa (low-literacy, pepper; IVR path).
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

  // Market index — glut: tomato index well below a fair contract band (the anti-asymmetry hook).
  const indexDate = new Date('2026-10-09T00:00:00.000Z')
  const index: Record<string, number> = {
    tomato: naira(3_000), // glut price per basket
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

  console.log('Seeded demo cast: Mrs. Okafor, Ibrahim, Musa, Hauwa + glut market index.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
