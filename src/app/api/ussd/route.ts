import { z } from 'zod'
import { db } from '@/lib/db'
import { formatNaira } from '@/lib/money'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { newSession, ussdStep } from '@/domain/notify/ussd'
import { sessions } from '@/domain/notify/sessionStore'
import { t, type Lang } from '@/domain/i18n/strings'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

const Body = z.object({
  phone: z.string(),
  sessionId: z.string(),
  input: z.string().default(''),
  lang: z.enum(['ha', 'pcm', 'en']).optional(),
})

// Look up the farmer's open contract for a crop, with its market index, to
// compute the fair-price offer shown on the phone.
async function pricingCtx(phone: string, crop: string) {
  const farmer = await db.farmer.findUnique({
    where: { phone },
    include: { enrollments: { include: { contract: true } } },
  })
  const enrollment = farmer?.enrollments.find(
    (e) => e.contract.crop === crop && e.contract.status !== 'closed',
  )
  const contract = enrollment?.contract
  const index = await db.marketIndex.findFirst({ where: { crop }, orderBy: { date: 'desc' } })
  if (!contract || !index) return null
  const price = fairPrice({
    indexPrice: index.indexPrice,
    grade: contract.grade as Grade,
    bandMin: contract.bandMin,
    bandMax: contract.bandMax,
  })
  return { farmer, enrollment, contract, index, price }
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const { phone, sessionId, input, lang } = parsed.data

  const session = sessions.get(sessionId) ?? newSession(lang ?? 'ha')
  const cropForOffer = session.crop
  const ctxData = cropForOffer ? await pricingCtx(phone, cropForOffer) : null
  const ctx = ctxData
    ? { price: formatNaira(ctxData.price), middleman: formatNaira(ctxData.index.indexPrice) }
    : {}

  const result = ussdStep(session, input, ctx)
  sessions.set(sessionId, result.session)

  if (result.action?.type === 'ACCEPT_HARVEST') {
    const { crop, baskets } = result.action
    const pc = await pricingCtx(phone, crop)
    if (pc?.enrollment) {
      const traceRef = `NDFR-${pc.farmer!.id.slice(-4).toUpperCase()}-${Date.now().toString().slice(-5)}`
      await db.lot.create({
        data: {
          enrollmentId: pc.enrollment.id,
          agentId: pc.enrollment.agentId,
          quantity: baskets,
          grade: pc.contract.grade,
          unitPrice: pc.price,
          status: 'picked',
          traceRef,
        },
      })
      const flang = (pc.farmer!.language as Lang) ?? 'ha'
      await db.message.createMany({
        data: [
          {
            toPhone: phone,
            channel: 'SMS',
            lang: flang,
            body: t('priceOffer', flang, {
              price: formatNaira(pc.price),
              baskets,
              middleman: formatNaira(pc.index.indexPrice),
            }),
          },
          { toPhone: phone, channel: 'SMS', lang: flang, body: t('confirmPickup', flang, { baskets, crop }) },
        ],
      })
      publish({ type: 'HARVEST_ACCEPTED', payload: { phone, crop, baskets } })
    }
  }

  return Response.json({ prompt: result.prompt, step: result.session.step })
}
