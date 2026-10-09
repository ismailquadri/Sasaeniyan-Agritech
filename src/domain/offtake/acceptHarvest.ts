// Shared accept-harvest logic for both channels (USSD + farmer app):
// fair-price lookup, lot creation, SMS messages, HARVEST_ACCEPTED event.
import type { PrismaClient } from '@prisma/client'
import { fairPrice, type Grade } from '../pricing/pricing'
import { formatNaira } from '../../lib/money'
import { t, type Lang } from '../i18n/strings'
import { publish } from '../../realtime/hub'

type DB = PrismaClient

export interface HarvestPricing {
  farmer: { id: string; phone: string; language: string }
  enrollment: { id: string; agentId: string }
  contract: { id: string; grade: string; bandMin: number; bandMax: number }
  index: { indexPrice: number }
  price: number
}

/** Find the farmer's open contract for a crop + latest market index → fair price. */
export async function harvestPricing(
  db: DB,
  by: { farmerId?: string; phone?: string },
  crop: string,
): Promise<HarvestPricing | null> {
  const farmer = await db.farmer.findUnique({
    where: by.farmerId ? { id: by.farmerId } : { phone: by.phone! },
    include: { enrollments: { include: { contract: true } } },
  })
  const enrollment = farmer?.enrollments.find(
    (e) => e.contract.crop === crop && e.contract.status !== 'closed',
  )
  const index = await db.marketIndex.findFirst({ where: { crop }, orderBy: { date: 'desc' } })
  if (!farmer || !enrollment || !index) return null
  const contract = enrollment.contract
  const price = fairPrice({
    indexPrice: index.indexPrice,
    grade: contract.grade as Grade,
    bandMin: contract.bandMin,
    bandMax: contract.bandMax,
  })
  return { farmer, enrollment, contract, index, price }
}

/** Create the picked lot + farmer SMS messages, publish HARVEST_ACCEPTED. */
export async function acceptHarvest(
  db: DB,
  input: { farmerId?: string; phone?: string; crop: string; baskets: number },
) {
  const pc = await harvestPricing(db, input, input.crop)
  if (!pc) return null

  const traceRef = `NDFR-${pc.farmer.id.slice(-4).toUpperCase()}-${Date.now().toString().slice(-5)}`
  const lot = await db.lot.create({
    data: {
      enrollmentId: pc.enrollment.id,
      agentId: pc.enrollment.agentId,
      quantity: input.baskets,
      grade: pc.contract.grade,
      unitPrice: pc.price,
      status: 'picked',
      traceRef,
    },
  })

  const lang = (pc.farmer.language as Lang) ?? 'ha'
  await db.message.createMany({
    data: [
      {
        toPhone: pc.farmer.phone,
        channel: 'SMS',
        lang,
        body: t('priceOffer', lang, {
          price: formatNaira(pc.price),
          baskets: input.baskets,
          middleman: formatNaira(pc.index.indexPrice),
        }),
      },
      {
        toPhone: pc.farmer.phone,
        channel: 'SMS',
        lang,
        body: t('confirmPickup', lang, { baskets: input.baskets, crop: input.crop }),
      },
    ],
  })

  publish({ type: 'HARVEST_ACCEPTED', payload: { farmerId: pc.farmer.id, crop: input.crop, baskets: input.baskets } })
  return { lot, price: pc.price, index: pc.index.indexPrice, farmer: pc.farmer }
}
