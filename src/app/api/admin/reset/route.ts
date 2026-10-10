import { db } from '@/lib/db'
import { resetDemo } from '@/domain/seed/seed'
import { publish } from '@/realtime/hub'

export const dynamic = 'force-dynamic'

// Wipe + re-seed the deterministic demo cast, then notify all surfaces.
export async function POST() {
  await resetDemo(db)
  publish({ type: 'DEMO_RESET' })
  return Response.json({ ok: true })
}
