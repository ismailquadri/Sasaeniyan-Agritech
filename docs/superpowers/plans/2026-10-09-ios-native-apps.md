# Native iOS Apps in iPhone 16 Pro Frames — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three persona web UIs with native-looking iOS apps (stock Apple design system, `#2E6B3E` tint) rendered inside CSS iPhone 16 Pro frames; farmer keeps USSD via a device switcher.

**Architecture:** One shared `IPhoneFrame` chassis + one iOS component kit (`src/components/ios/`) consumed by three per-persona apps (`src/apps/{farmer,agent,buyer}`). Apps read live state via the existing `useAppState` (SSE) and mutate via existing APIs, plus one new `POST /api/harvest` that shares the USSD route's accept-harvest logic through an extracted domain service.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4 (desktop shell only — apps use dedicated `ios.css`), Prisma 6 + Postgres (Docker, host port **5433**), Vitest, SSE.

**Spec:** `docs/superpowers/specs/2026-10-09-ios-native-apps-design.md`

---

## Environment notes (read first)

- Start DB: `docker compose up -d` (Postgres on `localhost:5433`, creds in `.env`).
- **Never run `prisma migrate reset`** — Prisma's CLI blocks destructive resets from AI agents. Use `POST /api/admin/reset` (or `resetDemo()` in tests) to re-seed; it's what the e2e tests already do.
- Dev server: `npm run dev` → http://localhost:3000. Kill with `pkill -f "next dev"`.
- Baseline check before starting: `npm test` (24 pass) and `npm run test:e2e` (1 pass).
- Screenshots (visual verification): `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --window-size=1280,900 --screenshot=/tmp/<name>.png http://localhost:3000/<route>` then Read the png.

## File structure

```
Create:
  src/domain/offtake/acceptHarvest.ts          shared accept-harvest service (USSD + app)
  src/domain/offtake/acceptHarvest.e2e.test.ts guarded integration test
  src/app/api/harvest/route.ts                 POST /api/harvest
  src/components/ios/ios.css                   iOS design tokens + component classes
  src/components/ios/icons.tsx                 SVG glyphs (SF-symbol style)
  src/components/ios/kit.tsx                   iOS component kit
  src/lib/api.ts                               tiny JSON fetch helper
  src/components/iphone/iphone.css             chassis styles
  src/components/iphone/IPhoneFrame.tsx        iPhone 16 Pro frame
  src/components/featurephone/FeaturePhone.tsx extracted Nokia/USSD device
  src/apps/farmer/FarmerApp.tsx  + HomeTab.tsx + SellTab.tsx + WalletTab.tsx
  src/apps/agent/AgentApp.tsx    + TodayTab.tsx + EnrolTab.tsx + WalletTab.tsx
  src/apps/buyer/BuyerApp.tsx    + OrdersTab.tsx + PostTab.tsx + AccountTab.tsx
Modify:
  src/app/api/ussd/route.ts      call the extracted service
  src/app/api/state/route.ts     wallets include ledger entries
  src/test/hero-path.e2e.test.ts add app-path (POST /api/harvest) variant
  package.json                   test:e2e runs the whole suite with RUN_E2E=1
  src/app/layout.tsx             import ios.css + iphone.css
  src/app/phone/page.tsx         device switcher (iPhone ⇄ Nokia) + persona picker
  src/app/agent/page.tsx         replace page body with framed AgentApp
  src/app/buyer/page.tsx         replace page body with framed BuyerApp
  src/app/page.tsx               launcher copy tweaks
```

---

### Task 1: Extract `acceptHarvest` domain service

**Files:**
- Create: `src/domain/offtake/acceptHarvest.ts`
- Create: `src/domain/offtake/acceptHarvest.e2e.test.ts`
- Modify: `src/app/api/ussd/route.ts`
- Modify: `package.json` (test:e2e script)

- [ ] **Step 1: Write the failing integration test**

```ts
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

    await db.$disconnect()
  })
})
```

- [ ] **Step 2: Point `test:e2e` at the whole suite**

In `package.json`, change:
```json
"test:e2e": "RUN_E2E=1 vitest run src/test/hero-path.e2e.test.ts",
```
to:
```json
"test:e2e": "RUN_E2E=1 vitest run",
```

- [ ] **Step 3: Run to verify it fails**

Run: `docker compose up -d && npm run test:e2e`
Expected: FAIL — `Cannot find module './acceptHarvest'` (hero-path still passes).

- [ ] **Step 4: Implement the service** (logic moved from `src/app/api/ussd/route.ts`)

```ts
// src/domain/offtake/acceptHarvest.ts
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
```

- [ ] **Step 5: Rewire the USSD route to use the service**

Replace the whole of `src/app/api/ussd/route.ts` with:

```ts
import { z } from 'zod'
import { db } from '@/lib/db'
import { formatNaira } from '@/lib/money'
import { newSession, ussdStep } from '@/domain/notify/ussd'
import { sessions } from '@/domain/notify/sessionStore'
import { harvestPricing, acceptHarvest } from '@/domain/offtake/acceptHarvest'

export const dynamic = 'force-dynamic'

const Body = z.object({
  phone: z.string(),
  sessionId: z.string(),
  input: z.string().default(''),
  lang: z.enum(['ha', 'pcm', 'en']).optional(),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const { phone, sessionId, input, lang } = parsed.data

  const session = sessions.get(sessionId) ?? newSession(lang ?? 'ha')
  const pc = session.crop ? await harvestPricing(db, { phone }, session.crop) : null
  const ctx = pc ? { price: formatNaira(pc.price), middleman: formatNaira(pc.index.indexPrice) } : {}

  const result = ussdStep(session, input, ctx)
  sessions.set(sessionId, result.session)

  if (result.action?.type === 'ACCEPT_HARVEST') {
    await acceptHarvest(db, { phone, crop: result.action.crop, baskets: result.action.baskets })
  }

  return Response.json({ prompt: result.prompt, step: result.session.step })
}
```

- [ ] **Step 6: Run the full e2e suite (parity check)**

Run: `npm run test:e2e`
Expected: PASS — new service test AND the existing hero-path (USSD path) both green.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "refactor(domain): extract acceptHarvest service shared by USSD + app"
```

---

### Task 2: `POST /api/harvest` + richer state + app-path e2e

**Files:**
- Create: `src/app/api/harvest/route.ts`
- Modify: `src/app/api/state/route.ts` (wallets include ledger)
- Modify: `src/test/hero-path.e2e.test.ts` (app-path variant)

- [ ] **Step 1: Add the app-path e2e variant**

Append inside the existing `describe` block of `src/test/hero-path.e2e.test.ts`:

```ts
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
    await db.$disconnect()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — `Cannot find module '@/app/api/harvest/route'`.

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/harvest/route.ts
import { z } from 'zod'
import { db } from '@/lib/db'
import { acceptHarvest } from '@/domain/offtake/acceptHarvest'

export const dynamic = 'force-dynamic'

const Body = z.object({
  farmerId: z.string(),
  crop: z.string(),
  baskets: z.number().int().positive(),
})

// Farmer-app Sell flow — same business logic as the USSD channel.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const result = await acceptHarvest(db, parsed.data)
  if (!result) return Response.json({ error: 'no open contract or market index for this crop' }, { status: 404 })

  return Response.json({ lotId: result.lot.id, price: result.price, index: result.index }, { status: 201 })
}
```

- [ ] **Step 4: Enrich `/api/state` wallets with ledger entries**

In `src/app/api/state/route.ts`, change the wallets query from `db.wallet.findMany()` to:

```ts
      db.wallet.findMany({ include: { ledger: { orderBy: { createdAt: 'desc' }, take: 20 } } }),
```

- [ ] **Step 5: Run the suite**

Run: `npm run test:e2e`
Expected: PASS — 3 integration tests + 24 unit tests.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): POST /api/harvest + wallet ledger in state snapshot"
```

---

### Task 3: iOS design tokens, CSS, and icons

**Files:**
- Create: `src/components/ios/ios.css`
- Create: `src/components/ios/icons.tsx`
- Modify: `src/app/layout.tsx` (import the CSS)

- [ ] **Step 1: Write `src/components/ios/ios.css`** (complete file)

```css
/* Stock iOS design system, scoped under .ios-screen. Tint: Sasaeniyan green. */
.ios-screen {
  --ios-tint: #2e6b3e;
  --ios-bg: #f2f2f7;
  --ios-card: #ffffff;
  --ios-label: #000000;
  --ios-label2: rgba(60, 60, 67, 0.6);
  --ios-label3: rgba(60, 60, 67, 0.3);
  --ios-sep: rgba(60, 60, 67, 0.29);
  --ios-fill: rgba(118, 118, 128, 0.12);
  width: 393px;
  height: 852px;
  background: var(--ios-bg);
  color: var(--ios-label);
  font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-radius: 48px;
}

/* Status bar (rendered by the frame) */
.ios-statusbar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 32px 10px;
  font-size: 16px;
  font-weight: 600;
}
.ios-statusicons { display: flex; align-items: center; gap: 7px; }

/* Scrollable app content */
.ios-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 110px;
}

/* Navigation / titles */
.ios-nav { display: flex; justify-content: space-between; align-items: center; padding: 6px 0 10px; }
.ios-largetitle { font-size: 34px; font-weight: 700; letter-spacing: -0.4px; margin: 0; }
.ios-title2 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
.ios-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--ios-tint); color: #fff;
  font-size: 16px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.ios-sectionheader {
  font-size: 13px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--ios-label2); margin: 22px 16px 7px;
}
.ios-footnote { font-size: 13px; color: var(--ios-label2); margin: 7px 16px 0; line-height: 1.35; }
.ios-caption1 { font-size: 12px; color: var(--ios-label2); }

/* Inset grouped lists */
.ios-group { background: var(--ios-card); border-radius: 10px; overflow: hidden; }
.ios-row {
  min-height: 44px; display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; text-align: left; width: 100%;
  background: transparent; border: 0; font: inherit; color: inherit; cursor: default;
}
button.ios-row { cursor: pointer; }
button.ios-row:active { background: #d1d1d6; }
.ios-row + .ios-row, .ios-row + button.ios-row, button.ios-row + .ios-row {
  border-top: 0.5px solid var(--ios-sep);
}
.ios-iconsq {
  width: 29px; height: 29px; border-radius: 6.5px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.ios-rowbody { flex: 1; min-width: 0; }
.ios-rowtitle { font-size: 17px; line-height: 1.3; }
.ios-rowsub { font-size: 13px; color: var(--ios-label2); }
.ios-rowvalue { font-size: 17px; color: var(--ios-label2); font-variant-numeric: tabular-nums; }
.ios-rowvalue.strong { color: var(--ios-label); font-weight: 600; }
.ios-rowvalue.struck { text-decoration: line-through; color: var(--ios-label3); font-size: 14px; }
.ios-chevron { color: var(--ios-label3); flex-shrink: 0; }

/* Balance card */
.ios-balancecard { background: var(--ios-card); border-radius: 12px; padding: 16px; }
.ios-balance { font-size: 40px; font-weight: 700; letter-spacing: -1px; font-variant-numeric: tabular-nums; margin: 2px 0 6px; }
.ios-balance-actions { display: flex; gap: 10px; margin-top: 12px; }

/* Buttons */
.ios-btn-primary, .ios-btn-secondary {
  flex: 1; height: 50px; border-radius: 12px; border: 0; cursor: pointer;
  font: inherit; font-size: 17px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: opacity 0.15s;
}
.ios-btn-primary { background: var(--ios-tint); color: #fff; }
.ios-btn-secondary { background: var(--ios-fill); color: var(--ios-tint); }
.ios-btn-primary:active, .ios-btn-secondary:active { opacity: 0.75; }
.ios-btn-primary:disabled, .ios-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

/* Tab bar */
.ios-tabbar {
  position: absolute; left: 0; right: 0; bottom: 0; height: 84px;
  background: rgba(249, 249, 249, 0.92); backdrop-filter: blur(16px);
  border-top: 0.5px solid var(--ios-sep);
  display: flex; padding: 6px 8px 0;
}
.ios-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding-top: 4px; background: none; border: 0; cursor: pointer;
  color: var(--ios-label2); font: inherit; font-size: 10px; font-weight: 500;
}
.ios-tab.active { color: var(--ios-tint); }
.ios-homeindicator {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  width: 140px; height: 5px; border-radius: 3px; background: #000; opacity: 0.9;
}

/* Sheet (slide-up modal inside the screen) */
.ios-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 40; border-radius: 48px; }
.ios-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 41;
  background: var(--ios-bg); border-radius: 20px 20px 48px 48px;
  padding: 8px 16px 40px; max-height: 88%; overflow-y: auto;
  animation: ios-sheet-up 0.3s cubic-bezier(0.2, 0.9, 0.3, 1);
}
@keyframes ios-sheet-up { from { transform: translateY(40%); opacity: 0.5; } to { transform: none; opacity: 1; } }
.ios-grabber { width: 36px; height: 5px; border-radius: 3px; background: var(--ios-label3); margin: 4px auto 12px; }
@media (prefers-reduced-motion: reduce) { .ios-sheet { animation: none; } }

/* Segmented control */
.ios-seg { display: flex; background: var(--ios-fill); border-radius: 9px; padding: 2px; }
.ios-seg button {
  flex: 1; border: 0; background: none; border-radius: 7px; padding: 6px 0;
  font: inherit; font-size: 15px; font-weight: 500; cursor: pointer; color: var(--ios-label);
}
.ios-seg button.active { background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12); font-weight: 600; }

/* Stepper */
.ios-stepper { display: flex; align-items: center; background: var(--ios-fill); border-radius: 9px; }
.ios-stepper button {
  width: 44px; height: 36px; border: 0; background: none; cursor: pointer;
  font-size: 20px; font-weight: 500; color: var(--ios-label);
}
.ios-stepper button:disabled { color: var(--ios-label3); }
.ios-stepper .val {
  min-width: 48px; text-align: center; font-size: 17px; font-weight: 600;
  font-variant-numeric: tabular-nums; border-left: 0.5px solid var(--ios-sep); border-right: 0.5px solid var(--ios-sep);
  padding: 6px 8px;
}

/* Toggle (iOS switch) */
.ios-toggle {
  width: 51px; height: 31px; border-radius: 16px; border: 0; cursor: pointer;
  background: rgba(120, 120, 128, 0.16); position: relative; transition: background 0.2s; flex-shrink: 0;
}
.ios-toggle.on { background: var(--ios-tint); }
.ios-toggle::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px;
  border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25); transition: transform 0.2s;
}
.ios-toggle.on::after { transform: translateX(20px); }

/* Pills, progress, empty state */
.ios-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 99px; }
.ios-pill.green { background: rgba(46, 107, 62, 0.12); color: var(--ios-tint); }
.ios-pill.orange { background: rgba(255, 149, 0, 0.14); color: #c93400; }
.ios-pill.blue { background: rgba(0, 122, 255, 0.12); color: #007aff; }
.ios-pill.gray { background: var(--ios-fill); color: var(--ios-label2); }
.ios-progress { height: 5px; border-radius: 3px; background: var(--ios-fill); overflow: hidden; }
.ios-progress > div { height: 100%; border-radius: 3px; background: var(--ios-tint); transition: width 0.5s; }
.ios-empty { text-align: center; padding: 56px 24px; color: var(--ios-label2); }
.ios-empty h3 { font-size: 17px; font-weight: 600; color: var(--ios-label); margin: 10px 0 4px; }
.ios-empty p { font-size: 14px; margin: 0; line-height: 1.4; }
.tnum { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 2: Write `src/components/ios/icons.tsx`** (complete file)

```tsx
// SF-symbol-style SVG glyphs. All stroke-based, currentColor, 24×24 viewBox.
import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' as const,
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  ...p,
})

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
)
export const IconSell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h13l-3-3M20 17H7l3 3" /></svg>
)
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h.01" strokeWidth="3" /></svg>
)
export const IconPerson = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4.5 20c1.6-3.2 4.3-5 7.5-5s5.9 1.8 7.5 5" /></svg>
)
export const IconToday = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 9.5h16M8 3.5v3M16 3.5v3" /></svg>
)
export const IconEnrol = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 19c1.4-2.8 3.7-4.3 6.5-4.3s5.1 1.5 6.5 4.3" /><path d="M18 6v6M15 9h6" /></svg>
)
export const IconOrders = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></svg>
)
export const IconPost = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
)
export const IconBuilding = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20v-3.5h4V20" /></svg>
)
export const IconChevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 14, height: 14, strokeWidth: 2.4, ...p })}><path d="m9 5 7 7-7 7" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2.4, ...p })}><path d="m4.5 12.5 5 5 10-11" /></svg>
)
export const IconLeaf = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z" /><path d="M5 19c3-5 7-9 11-11" /></svg>
)
export const IconTray = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 13.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4.5M3 13.5h5l1.5 2.5h5l1.5-2.5h5M12 4v7M9.5 8.5 12 11l2.5-2.5" /></svg>
)
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3 5 6v5c0 5 3.2 8.4 7 10 3.8-1.6 7-5 7-10V6z" /><path d="m9 11.5 2 2 4-4.5" /></svg>
)
export const IconSignal = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0.5" width="3" height="11.5" rx="1" /></svg>
)
export const IconWifi = () => (
  <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 4.2a10.5 10.5 0 0 1 14 0M4 7a7 7 0 0 1 9 0M6.5 9.6a3.5 3.5 0 0 1 4 0" /><circle cx="8.5" cy="11" r="0.8" fill="currentColor" stroke="none" /></svg>
)
export const IconBattery = () => (
  <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" /><path d="M24.5 4.5v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity="0.4" /></svg>
)

/** Crop glyph + its iOS icon-square color. */
export function cropGlyph(crop: string) {
  if (crop === 'tomato')
    return { color: '#FF3B30', icon: <svg {...base({ width: 16, height: 16 })}><circle cx="12" cy="14" r="7" /><path d="M12 7V4.5M9.5 6.5 12 7l2.5-.5" /></svg> }
  if (crop === 'pepper')
    return { color: '#FF9500', icon: <svg {...base({ width: 16, height: 16 })}><path d="M12 6c3.5 2 4.5 7.5 0 13.5C7.5 13.5 8.5 8 12 6Z" /><path d="M12 6V3.5" /></svg> }
  return { color: '#AF52DE', icon: <svg {...base({ width: 16, height: 16 })}><circle cx="12" cy="13" r="6.5" /><path d="M12 6.5c-1.5-1.5-1.5-3 0-4 1.5 1 1.5 2.5 0 4Z" /></svg> }
}
```

- [ ] **Step 3: Import the CSS in `src/app/layout.tsx`**

Below `import "./globals.css";` add:

```ts
import "@/components/ios/ios.css";
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: compiles clean, TypeScript OK.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ios): design tokens, component CSS, SF-style icon set"
```

---

### Task 4: iOS component kit + fetch helper

**Files:**
- Create: `src/components/ios/kit.tsx`
- Create: `src/lib/api.ts`

- [ ] **Step 1: Write `src/lib/api.ts`**

```ts
export async function call(url: string, method: 'POST' | 'PATCH', body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}
```

- [ ] **Step 2: Write `src/components/ios/kit.tsx`** (complete file)

```tsx
'use client'

import type { ReactNode } from 'react'
import { IconChevron } from './icons'

export function NavLargeTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="ios-nav">
      <h1 className="ios-largetitle">{title}</h1>
      {trailing}
    </div>
  )
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return <div className="ios-sectionheader">{children}</div>
}

export function InsetGroup({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div>
      <div className="ios-group">{children}</div>
      {footer ? <div className="ios-footnote">{footer}</div> : null}
    </div>
  )
}

export function Row({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  struckValue,
  chevron,
  selected,
  onClick,
  trailing,
}: {
  icon?: ReactNode
  iconBg?: string
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  struckValue?: ReactNode
  chevron?: boolean
  selected?: boolean
  onClick?: () => void
  trailing?: ReactNode
}) {
  const Tag: any = onClick ? 'button' : 'div'
  return (
    <Tag className="ios-row" onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon ? <span className="ios-iconsq" style={{ background: iconBg ?? 'var(--ios-tint)' }}>{icon}</span> : null}
      <span className="ios-rowbody">
        <span className="ios-rowtitle">{title}</span>
        {subtitle ? <span className="ios-rowsub" style={{ display: 'block' }}>{subtitle}</span> : null}
      </span>
      {struckValue ? <span className="ios-rowvalue struck">{struckValue}</span> : null}
      {value ? <span className="ios-rowvalue strong">{value}</span> : null}
      {trailing}
      {selected ? <span style={{ color: 'var(--ios-tint)' }}>✓</span> : null}
      {chevron ? <IconChevron className="ios-chevron" /> : null}
    </Tag>
  )
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button className="ios-btn-primary" onClick={onClick} disabled={disabled || loading} type="button">
      {loading ? '…' : children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="ios-btn-secondary" onClick={onClick} disabled={disabled} type="button">
      {children}
    </button>
  )
}

export interface TabItem {
  key: string
  label: string
  icon: ReactNode
}

export function TabBar({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (k: string) => void }) {
  return (
    <nav className="ios-tabbar" aria-label="Tab bar">
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`ios-tab${t.key === active ? ' active' : ''}`}
          onClick={() => onChange(t.key)}
          aria-label={t.label}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
      <span className="ios-homeindicator" />
    </nav>
  )
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="ios-scrim" onClick={onClose} />
      <div className="ios-sheet" role="dialog" aria-modal="true">
        <div className="ios-grabber" />
        {children}
      </div>
    </>
  )
}

export function Segmented({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="ios-seg" role="tablist">
      {options.map((o) => (
        <button key={o.key} type="button" className={o.key === value ? 'active' : ''} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 1, max = 999 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="ios-stepper">
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span className="val">{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      className={`ios-toggle${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label ?? 'Toggle'}
    />
  )
}

export function Pill({ tone = 'gray', children }: { tone?: 'green' | 'orange' | 'blue' | 'gray'; children: ReactNode }) {
  return <span className={`ios-pill ${tone}`}>{children}</span>
}

export function Progress({ pct }: { pct: number }) {
  return (
    <div className="ios-progress">
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, message }: { icon?: ReactNode; title: string; message: string }) {
  return (
    <div className="ios-empty">
      {icon}
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): component kit (nav, groups, rows, tabbar, sheet, controls)"
```

---

### Task 5: `IPhoneFrame` chassis

**Files:**
- Create: `src/components/iphone/iphone.css`
- Create: `src/components/iphone/IPhoneFrame.tsx`
- Modify: `src/app/layout.tsx` (import iphone.css)

- [ ] **Step 1: Write `src/components/iphone/iphone.css`**

```css
/* iPhone 16 Pro chassis. Canvas is fixed 393×852; the wrapper scales it. */
.iphone-wrap { position: relative; }
.iphone-chassis {
  width: 421px;
  height: 886px;
  border-radius: 62px;
  background: linear-gradient(145deg, #5a5a5e, #3a3a3c 40%, #48484a);
  padding: 14px;
  box-shadow:
    0 0 0 2px #2c2c2e,
    0 25px 60px rgba(0, 0, 0, 0.35),
    inset 0 0 4px rgba(255, 255, 255, 0.25);
  transform-origin: top center;
  position: relative;
}
/* side buttons */
.iphone-chassis::before {
  content: '';
  position: absolute; left: -2.5px; top: 190px; width: 3px; height: 100px;
  border-radius: 2px; background: #48484a;
  box-shadow: 0 -70px 0 #48484a, 0 -108px 0 -0.5px #48484a; /* volume + action */
}
.iphone-chassis::after {
  content: '';
  position: absolute; right: -2.5px; top: 230px; width: 3px; height: 72px;
  border-radius: 2px; background: #48484a;
}
.iphone-display {
  width: 393px; height: 852px; border-radius: 48px; overflow: hidden;
  background: #000; position: relative;
}
.iphone-island {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  width: 125px; height: 36px; border-radius: 20px; background: #000; z-index: 50;
}
.iphone-caption {
  text-align: center; margin-top: 14px; font-size: 13px; font-weight: 600; color: #6b6560;
}
```

- [ ] **Step 2: Write `src/components/iphone/IPhoneFrame.tsx`**

```tsx
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { IconSignal, IconWifi, IconBattery } from '@/components/ios/icons'

const CHASSIS_W = 421
const CHASSIS_H = 886

function useFrameScale() {
  const [scale, setScale] = useState(0.8)
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(1, (window.innerHeight * 0.88) / CHASSIS_H, (window.innerWidth * 0.92) / CHASSIS_W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

/** CSS iPhone 16 Pro. Children render as the app inside a .ios-screen. */
export function IPhoneFrame({ children, caption }: { children: ReactNode; caption?: string }) {
  const scale = useFrameScale()
  return (
    <div className="iphone-wrap" style={{ width: CHASSIS_W * scale, height: CHASSIS_H * scale + (caption ? 34 : 0) }}>
      <div className="iphone-chassis" style={{ transform: `scale(${scale})` }}>
        <div className="iphone-display">
          <div className="iphone-island" />
          <div className="ios-screen">
            <div className="ios-statusbar">
              <span>9:41</span>
              <span className="ios-statusicons">
                <IconSignal />
                <IconWifi />
                <IconBattery />
              </span>
            </div>
            {children}
          </div>
        </div>
      </div>
      {caption ? (
        <div className="iphone-caption" style={{ transform: `translateY(${CHASSIS_H * (scale - 1)}px)` }}>{caption}</div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 3: Import CSS in `src/app/layout.tsx`** — below the ios.css import add:

```ts
import "@/components/iphone/iphone.css";
```

- [ ] **Step 4: Verify build, commit**

Run: `npm run build` → clean, then:
```bash
git add -A && git commit -m "feat(iphone): iPhone 16 Pro chassis with Dynamic Island + scaling"
```

---

### Task 6: Extract the feature phone into a component

**Files:**
- Create: `src/components/featurephone/FeaturePhone.tsx`
- Modify: `src/app/phone/page.tsx` (use the component; page otherwise unchanged for now)

- [ ] **Step 1: Create `src/components/featurephone/FeaturePhone.tsx`**

Move from `src/app/phone/page.tsx` — exactly the existing chassis JSX (the `rounded-[2.2rem]` phone div with status bar, screen, keypad), the `Keypad` component, the `ussd()` fetch helper, the USSD session state (`session/prompt/step/buffer/busy`), and the `tab` (`'ussd' | 'sms'`) state. Export:

```tsx
'use client'
// Props: the farmer's phone number and their SMS messages (passed from the page).
export function FeaturePhone({ phone, messages }: { phone: string; messages: any[] }) {
  // ... moved state + handlers (dial, send, endSession) unchanged ...
  // ... moved chassis JSX; `messages` prop replaces the page-level filter ...
  // Keep the USSD/SMS tab buttons directly under the chassis (moved too).
}
```

The page keeps: farmer selection, market-contrast panel, how-to card — and now renders `<FeaturePhone phone={phone} messages={messages} />` where the chassis block was. Reset the internal USSD session when `phone` changes (`useEffect` on `phone` calling `endSession()`).

- [ ] **Step 2: Verify behavior unchanged**

Run: `npm run dev`, open http://localhost:3000/phone → dial `*347*55#`, step through to the crop screen, switch to SMS tab. Expected: identical to before.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor(ui): extract FeaturePhone component from phone page"
```

---

### Task 7: Farmer app — Home + Wallet tabs

**Files:**
- Create: `src/apps/farmer/FarmerApp.tsx`
- Create: `src/apps/farmer/HomeTab.tsx`
- Create: `src/apps/farmer/WalletTab.tsx`

- [ ] **Step 1: Write `src/apps/farmer/FarmerApp.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/useAppState'
import { TabBar, NavLargeTitle, EmptyState } from '@/components/ios/kit'
import { IconHome, IconSell, IconWallet, IconPerson } from '@/components/ios/icons'
import { HomeTab } from './HomeTab'
import { SellTab } from './SellTab'
import { WalletTab } from './WalletTab'

export function FarmerApp({ farmerId }: { farmerId: string }) {
  const { state } = useAppState()
  const [tab, setTab] = useState('home')
  const farmer = state.farmers.find((f) => f.id === farmerId)
  if (!farmer) return <div className="ios-content" />

  return (
    <>
      {tab === 'home' && <HomeTab state={state} farmer={farmer} onSell={() => setTab('sell')} />}
      {tab === 'sell' && <SellTab state={state} farmer={farmer} onDone={() => setTab('wallet')} />}
      {tab === 'wallet' && <WalletTab state={state} farmer={farmer} />}
      {tab === 'profile' && (
        <div className="ios-content">
          <NavLargeTitle title="Profile" />
          <EmptyState
            icon={<IconPerson width={40} height={40} />}
            title="Nothing here yet"
            message="Farm details, language and credit score arrive in the next release."
          />
        </div>
      )}
      <TabBar
        items={[
          { key: 'home', label: 'Home', icon: <IconHome /> },
          { key: 'sell', label: 'Sell', icon: <IconSell /> },
          { key: 'wallet', label: 'Wallet', icon: <IconWallet /> },
          { key: 'profile', label: 'Profile', icon: <IconPerson /> },
        ]}
        active={tab}
        onChange={setTab}
      />
    </>
  )
}
```

> Note: `SellTab` is created in Task 8. To keep this task's build green, create a minimal placeholder now (replaced next task):
> ```tsx
> // src/apps/farmer/SellTab.tsx
> 'use client'
> export function SellTab(_: { state: any; farmer: any; onDone: () => void }) {
>   return <div className="ios-content" />
> }
> ```

- [ ] **Step 2: Write `src/apps/farmer/HomeTab.tsx`**

```tsx
'use client'

import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, SecondaryButton, Pill } from '@/components/ios/kit'
import { cropGlyph, IconShield } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function HomeTab({ state, farmer, onSell }: { state: AppState; farmer: any; onSell: () => void }) {
  const wallet = state.wallets.find((w) => w.ownerId === farmer.id)
  const openContract = (crop: string) => state.contracts.find((c) => c.crop === crop && c.status !== 'closed')

  return (
    <div className="ios-content">
      <NavLargeTitle title="Home" trailing={<div className="ios-avatar">{farmer.name[0]}</div>} />

      <div className="ios-balancecard">
        <div className="ios-caption1">Wallet balance</div>
        <div className="ios-balance">{formatNaira(wallet?.balance ?? 0)}</div>
        {farmer.ndfrVerified ? (
          <Pill tone="green"><IconShield width={12} height={12} /> NDFR verified</Pill>
        ) : (
          <Pill tone="gray">NDFR pending</Pill>
        )}
        <div className="ios-balance-actions">
          <PrimaryButton onClick={onSell}>Sell harvest</PrimaryButton>
          <SecondaryButton onClick={onSell}>Prices</SecondaryButton>
        </div>
      </div>

      <SectionHeader>Today&apos;s prices</SectionHeader>
      <InsetGroup footer="Fair price = market index × grade factor, kept inside your contract band. The struck price is the farm-gate glut offer.">
        {state.marketIndex.map((m) => {
          const c = openContract(m.crop)
          const fp = c
            ? fairPrice({ indexPrice: m.indexPrice, grade: c.grade as Grade, bandMin: c.bandMin, bandMax: c.bandMax })
            : null
          const g = cropGlyph(m.crop)
          return (
            <Row
              key={m.id}
              icon={g.icon}
              iconBg={g.color}
              title={cap(m.crop)}
              subtitle={c ? 'open contract' : 'no open contract'}
              struckValue={fp && fp !== m.indexPrice ? formatNaira(m.indexPrice) : undefined}
              value={formatNaira(fp ?? m.indexPrice)}
              chevron
              onClick={onSell}
            />
          )
        })}
      </InsetGroup>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/apps/farmer/WalletTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { netPayout } from '@/domain/finance/finance'
import { PLATFORM_FEE_RATE, AGENT_COMMISSION_RATE } from '@/domain/config'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Sheet, EmptyState } from '@/components/ios/kit'
import { IconWallet } from '@/components/ios/icons'

const LEDGER_LABEL: Record<string, string> = {
  advance: 'Input advance',
  payout: 'Harvest payout',
  commission: 'Commission',
  fee: 'Platform fee',
  escrow_fund: 'Escrow',
  escrow_release: 'Escrow release',
}

export function WalletTab({ state, farmer }: { state: AppState; farmer: any }) {
  const wallet = state.wallets.find((w) => w.ownerId === farmer.id)
  const ledger: any[] = wallet?.ledger ?? []
  const [receiptLot, setReceiptLot] = useState<any | null>(null)

  // Delivered lots for this farmer → receipt detail source.
  const deliveredLots = state.lots.filter(
    (l) => l.enrollment?.farmer?.id === farmer.id && l.status === 'delivered',
  )
  const lotForLedger = (entry: any) => deliveredLots.find((l) => l.id === entry.ref)

  return (
    <div className="ios-content">
      <NavLargeTitle title="Wallet" />
      <div className="ios-balancecard">
        <div className="ios-caption1">Available balance</div>
        <div className="ios-balance">{formatNaira(wallet?.balance ?? 0)}</div>
      </div>

      <SectionHeader>Activity</SectionHeader>
      {ledger.length === 0 ? (
        <EmptyState icon={<IconWallet width={40} height={40} />} title="No activity yet" message="Advances and payouts appear here." />
      ) : (
        <InsetGroup footer="Tap a payout for the itemised receipt.">
          {ledger.map((e) => {
            const lot = e.type === 'payout' ? lotForLedger(e) : null
            return (
              <Row
                key={e.id}
                title={LEDGER_LABEL[e.type] ?? e.type}
                subtitle={new Date(e.createdAt).toLocaleString()}
                value={
                  <span style={{ color: e.amount >= 0 ? 'var(--ios-tint)' : '#c93400' }}>
                    {e.amount >= 0 ? '+' : ''}{formatNaira(e.amount)}
                  </span>
                }
                chevron={!!lot}
                onClick={lot ? () => setReceiptLot(lot) : undefined}
              />
            )
          })}
        </InsetGroup>
      )}

      <Sheet open={!!receiptLot} onClose={() => setReceiptLot(null)}>
        {receiptLot && <Receipt lot={receiptLot} />}
      </Sheet>
    </div>
  )
}

function Receipt({ lot }: { lot: any }) {
  const saleValue = lot.unitPrice * lot.quantity
  const advance = lot.enrollment?.advance?.amount ?? 0
  const np = netPayout({ saleValue, advance, feeRate: PLATFORM_FEE_RATE, commissionRate: AGENT_COMMISSION_RATE })
  return (
    <div>
      <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Payment receipt</h2>
      <div className="ios-caption1" style={{ marginBottom: 14 }}>
        {lot.quantity} baskets · {lot.enrollment?.contract?.crop} · grade {lot.grade} · {lot.traceRef}
      </div>
      <InsetGroup>
        <Row title="Sale value" value={formatNaira(saleValue)} />
        <Row title="Advance repaid" value={`−${formatNaira(np.advanceNetted)}`} />
        <Row title="Platform fee (3%)" value={`−${formatNaira(np.platformFee)}`} />
        <Row title="Agent commission (2%)" value={`−${formatNaira(np.agentCommission)}`} />
        <Row title={<b>Paid to you</b>} value={<b style={{ color: 'var(--ios-tint)' }}>{formatNaira(np.farmerPayout)}</b>} />
      </InsetGroup>
    </div>
  )
}
```

- [ ] **Step 4: Build check + commit**

Run: `npm run build` → clean.
```bash
git add -A && git commit -m "feat(farmer-app): shell, Home and Wallet tabs with receipt sheet"
```

---

### Task 8: Farmer Sell flow + `/phone` device switcher

**Files:**
- Create (replace placeholder): `src/apps/farmer/SellTab.tsx`
- Modify: `src/app/phone/page.tsx`

- [ ] **Step 1: Write `src/apps/farmer/SellTab.tsx`** (replaces the Task-7 placeholder)

```tsx
'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { priceBreakdown, type Grade } from '@/domain/pricing/pricing'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, SecondaryButton, Stepper, Sheet, EmptyState } from '@/components/ios/kit'
import { cropGlyph, IconCheck, IconLeaf } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function SellTab({ state, farmer, onDone }: { state: AppState; farmer: any; onDone: () => void }) {
  const [crop, setCrop] = useState<string | null>(null)
  const [baskets, setBaskets] = useState(10)
  const [offerOpen, setOfferOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sold, setSold] = useState(false)

  const contract = crop ? state.contracts.find((c) => c.crop === crop && c.status !== 'closed') : null
  const index = crop ? state.marketIndex.find((m) => m.crop === crop) : null
  const bd =
    contract && index
      ? priceBreakdown({ indexPrice: index.indexPrice, grade: contract.grade as Grade, bandMin: contract.bandMin, bandMax: contract.bandMax })
      : null

  async function accept() {
    if (!crop) return
    setBusy(true)
    const r = await call('/api/harvest', 'POST', { farmerId: farmer.id, crop, baskets })
    setBusy(false)
    if (!r.error) {
      setOfferOpen(false)
      setSold(true)
    }
  }

  if (sold) {
    return (
      <div className="ios-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ios-empty">
          <span className="ios-iconsq" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto', background: 'var(--ios-tint)' }}>
            <IconCheck width={30} height={30} />
          </span>
          <h3>Harvest accepted</h3>
          <p>{baskets} baskets of {crop}. Your agent will come to collect. You&apos;ll get an SMS at every step.</p>
        </div>
        <PrimaryButton onClick={() => { setSold(false); setCrop(null); onDone() }}>View wallet</PrimaryButton>
      </div>
    )
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Sell harvest" />

      <SectionHeader>1 · Choose crop</SectionHeader>
      <InsetGroup>
        {state.marketIndex.map((m) => {
          const g = cropGlyph(m.crop)
          const hasContract = state.contracts.some((c) => c.crop === m.crop && c.status !== 'closed')
          return (
            <Row
              key={m.id}
              icon={g.icon}
              iconBg={g.color}
              title={cap(m.crop)}
              subtitle={hasContract ? 'buyer demand open' : 'no open demand'}
              selected={crop === m.crop}
              onClick={() => setCrop(m.crop)}
            />
          )
        })}
      </InsetGroup>

      <SectionHeader>2 · How many baskets?</SectionHeader>
      <InsetGroup>
        <Row title="Baskets" trailing={<Stepper value={baskets} onChange={setBaskets} min={1} max={200} />} />
      </InsetGroup>

      <div style={{ marginTop: 24, display: 'flex' }}>
        <PrimaryButton disabled={!crop || !bd} onClick={() => setOfferOpen(true)}>
          {crop && !bd ? 'No open contract for this crop' : 'See your fair price'}
        </PrimaryButton>
      </div>
      {!crop && (
        <EmptyState icon={<IconLeaf width={36} height={36} />} title="Pick a crop to start" message="We only buy against real buyer demand — that's what guarantees your price." />
      )}

      <Sheet open={offerOpen && !!bd} onClose={() => setOfferOpen(false)}>
        {bd && index && (
          <div>
            <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Your fair price</h2>
            <div className="ios-caption1" style={{ marginBottom: 14 }}>{baskets} baskets · {cap(crop!)} · grade {bd.grade}</div>
            <InsetGroup footer="The farm-gate price is what the middleman offers in a glut. Your contract band protects you from it.">
              <Row title="Market index" value={formatNaira(bd.index)} />
              <Row title={`Grade ${bd.grade} factor`} value={`×${bd.factor}`} />
              <Row title="Contract band" value={`${formatNaira(bd.band[0])}–${formatNaira(bd.band[1])}`} />
              <Row title="Farm-gate (middleman)" struckValue={formatNaira(index.indexPrice)} value="" />
              <Row title={<b>Per basket</b>} value={<b style={{ color: 'var(--ios-tint)' }}>{formatNaira(bd.price)}</b>} />
              <Row title={<b>Total ({baskets} baskets)</b>} value={<b>{formatNaira(bd.price * baskets)}</b>} />
            </InsetGroup>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <SecondaryButton onClick={() => setOfferOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton loading={busy} onClick={accept}>Accept offer</PrimaryButton>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/app/phone/page.tsx`** — device switcher + persona picker:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { LiveDot, SimLabel } from '@/components/ui'
import { IPhoneFrame } from '@/components/iphone/IPhoneFrame'
import { FarmerApp } from '@/apps/farmer/FarmerApp'
import { FeaturePhone } from '@/components/featurephone/FeaturePhone'

export default function PhonePage() {
  const { state, flash } = useAppState()
  const [device, setDevice] = useState<'iphone' | 'nokia'>('iphone')
  const [farmerId, setFarmerId] = useState('farmer_musa')
  const farmer = state.farmers.find((f) => f.id === farmerId) ?? state.farmers[0]
  const messages = state.messages.filter((m) => m.toPhone === farmer?.phone && m.channel === 'SMS')

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-6">
      <header className="mb-4 flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Farmer</h1>
            <p className="text-sm text-muted">{farmer?.name} · {device === 'iphone' ? 'Sasaeniyan app' : 'any feature phone'}</p>
          </div>
        </div>
        <LiveDot flash={flash} />
      </header>

      <div className="mb-4 flex w-full max-w-sm flex-col gap-2">
        <div className="flex rounded-xl border border-line bg-surface p-1">
          {(['iphone', 'nokia'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold ${device === d ? 'bg-brand text-white' : 'text-muted'}`}
            >
              {d === 'iphone' ? 'iPhone app' : 'Nokia · USSD'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {state.farmers.map((f) => (
            <button
              key={f.id}
              onClick={() => setFarmerId(f.id)}
              className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold ${farmerId === f.id ? 'border-brand bg-brand-light text-brand-dark' : 'border-line text-muted'}`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {device === 'iphone' ? (
        farmer ? <IPhoneFrame caption={`${farmer.name} · Farmer app`}><FarmerApp farmerId={farmer.id} /></IPhoneFrame> : null
      ) : (
        <div className="flex flex-col items-center gap-3">
          <FeaturePhone phone={farmer?.phone ?? ''} messages={messages} />
          <div className="max-w-xs">
            <SimLabel>Simulated USSD/SMS — production via Africa&apos;s Talking on any feature phone.</SimLabel>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify the hero farmer flow in the app**

Run: `npm run dev`; `curl -s -X POST localhost:3000/api/admin/reset` for a clean cast. In the browser: `/buyer` old UI still works — post a tomato contract (or use `curl` as in the README demo script) and enrol Musa via `/agent`; then on `/phone` (iPhone mode): Sell → tomato → 12 baskets → See your fair price (sheet shows ₦5,000 vs struck ₦3,000) → Accept → confirmation → Wallet shows the advance entry. Switch to Nokia mode: SMS inbox shows the price-offer + pickup SMS.

- [ ] **Step 4: Screenshot check**

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --window-size=1280,900 --screenshot=/tmp/farmer-app.png http://localhost:3000/phone
```
Read `/tmp/farmer-app.png` — verify: chassis + Dynamic Island render, iOS typography, tab bar at bottom, no horizontal overflow.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(farmer-app): Sell flow with fair-price sheet + /phone device switcher"
```

---

### Task 9: Agent app + `/agent`

**Files:**
- Create: `src/apps/agent/AgentApp.tsx`, `src/apps/agent/TodayTab.tsx`, `src/apps/agent/EnrolTab.tsx`, `src/apps/agent/WalletTab.tsx`
- Modify: `src/app/agent/page.tsx`

- [ ] **Step 1: Write `src/apps/agent/AgentApp.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/useAppState'
import { TabBar, NavLargeTitle, EmptyState } from '@/components/ios/kit'
import { IconToday, IconEnrol, IconWallet, IconPerson } from '@/components/ios/icons'
import { TodayTab } from './TodayTab'
import { EnrolTab } from './EnrolTab'
import { WalletTab } from './WalletTab'

const AGENT_ID = 'agent_ibrahim'

export function AgentApp() {
  const { state } = useAppState()
  const [tab, setTab] = useState('today')
  const agent = state.agents.find((a) => a.id === AGENT_ID) ?? state.agents[0]
  if (!agent) return <div className="ios-content" />

  return (
    <>
      {tab === 'today' && <TodayTab state={state} />}
      {tab === 'enrol' && <EnrolTab state={state} agent={agent} />}
      {tab === 'wallet' && <WalletTab state={state} agent={agent} />}
      {tab === 'profile' && (
        <div className="ios-content">
          <NavLargeTitle title="Profile" />
          <EmptyState icon={<IconPerson width={40} height={40} />} title="Nothing here yet" message="Reputation and coverage area arrive in the next release." />
        </div>
      )}
      <TabBar
        items={[
          { key: 'today', label: 'Today', icon: <IconToday /> },
          { key: 'enrol', label: 'Enrol', icon: <IconEnrol /> },
          { key: 'wallet', label: 'Wallet', icon: <IconWallet /> },
          { key: 'profile', label: 'Profile', icon: <IconPerson /> },
        ]}
        active={tab}
        onChange={setTab}
      />
    </>
  )
}
```

- [ ] **Step 2: Write `src/apps/agent/TodayTab.tsx`** (pickup queue + grade sheet)

```tsx
'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { fairPrice, type Grade } from '@/domain/pricing/pricing'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Sheet, Segmented, PrimaryButton, Pill, EmptyState } from '@/components/ios/kit'
import { cropGlyph, IconTray } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function TodayTab({ state }: { state: AppState }) {
  const picked = state.lots.filter((l) => l.status === 'picked')
  const done = state.lots.filter((l) => l.status !== 'picked')
  const [gradingLot, setGradingLot] = useState<any | null>(null)
  const [grade, setGrade] = useState<Grade>('A')
  const [busy, setBusy] = useState(false)

  const contract = gradingLot?.enrollment?.contract
  const index = contract ? state.marketIndex.find((m) => m.crop === contract.crop) : null
  const preview =
    contract && index
      ? fairPrice({ indexPrice: index.indexPrice, grade, bandMin: contract.bandMin, bandMax: contract.bandMax })
      : null

  async function confirmGrade() {
    setBusy(true)
    await call(`/api/lots/${gradingLot.id}`, 'PATCH', { grade })
    setBusy(false)
    setGradingLot(null)
    setGrade('A')
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Today" />

      <SectionHeader>Pickups to grade</SectionHeader>
      {picked.length === 0 ? (
        <EmptyState icon={<IconTray width={40} height={40} />} title="Queue is clear" message="When a farmer accepts an offer, the pickup lands here." />
      ) : (
        <InsetGroup>
          {picked.map((l) => {
            const g = cropGlyph(l.enrollment?.contract?.crop ?? '')
            return (
              <Row
                key={l.id}
                icon={g.icon}
                iconBg={g.color}
                title={`${l.enrollment?.farmer?.name} · ${cap(l.enrollment?.contract?.crop ?? '')}`}
                subtitle={`${l.quantity} baskets · offered ${formatNaira(l.unitPrice)}/basket`}
                chevron
                onClick={() => setGradingLot(l)}
              />
            )
          })}
        </InsetGroup>
      )}

      <SectionHeader>Aggregated</SectionHeader>
      {done.length === 0 ? (
        <InsetGroup><Row title="Nothing aggregated yet" subtitle="Graded lots roll into buyer orders" /></InsetGroup>
      ) : (
        <InsetGroup>
          {done.map((l) => (
            <Row
              key={l.id}
              title={`${l.enrollment?.farmer?.name} · ${l.quantity} baskets`}
              subtitle={l.traceRef}
              trailing={<Pill tone={l.status === 'delivered' ? 'green' : 'orange'}>{l.status}</Pill>}
              value={`${l.grade}`}
            />
          ))}
        </InsetGroup>
      )}

      <Sheet open={!!gradingLot} onClose={() => setGradingLot(null)}>
        {gradingLot && (
          <div>
            <h2 className="ios-title2" style={{ margin: '4px 0 2px' }}>Grade this lot</h2>
            <div className="ios-caption1" style={{ marginBottom: 14 }}>
              {gradingLot.enrollment?.farmer?.name} · {gradingLot.quantity} baskets · {gradingLot.traceRef}
            </div>
            <Segmented
              options={[{ key: 'A', label: 'Grade A' }, { key: 'B', label: 'Grade B' }, { key: 'C', label: 'Grade C' }]}
              value={grade}
              onChange={(k) => setGrade(k as Grade)}
            />
            <div style={{ marginTop: 14 }}>
              <InsetGroup footer="Price recomputes from the market index at the graded quality, clamped to the contract band.">
                <Row title="Unit price at this grade" value={preview ? formatNaira(preview) : '—'} />
                <Row title={<b>Lot value</b>} value={preview ? <b>{formatNaira(preview * gradingLot.quantity)}</b> : '—'} />
              </InsetGroup>
            </div>
            <div style={{ display: 'flex', marginTop: 16 }}>
              <PrimaryButton loading={busy} onClick={confirmGrade}>Confirm grade {grade}</PrimaryButton>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/apps/agent/EnrolTab.tsx`** (enrol + advance + new-farmer sheet)

```tsx
'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { maxAdvance } from '@/domain/finance/finance'
import { ADVANCE_RATE } from '@/domain/config'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Stepper, Toggle, PrimaryButton, SecondaryButton, Sheet } from '@/components/ios/kit'
import { cropGlyph, IconCheck, IconEnrol } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function EnrolTab({ state, agent }: { state: AppState; agent: any }) {
  const open = state.contracts.filter((c) => c.status !== 'closed')
  const [contractId, setContractId] = useState<string | null>(null)
  const [farmerId, setFarmerId] = useState<string | null>(null)
  const [volume, setVolume] = useState(20)
  const [withAdvance, setWithAdvance] = useState(true)
  const [busy, setBusy] = useState(false)
  const [doneMsg, setDoneMsg] = useState<string | null>(null)
  const [newFarmerOpen, setNewFarmerOpen] = useState(false)

  const contract = open.find((c) => c.id === contractId)
  const advance = contract ? maxAdvance({ plannedVolume: volume, bandMin: contract.bandMin, rate: ADVANCE_RATE }) : 0

  async function enrol() {
    setBusy(true)
    const r = await call('/api/enrollments', 'POST', { contractId, farmerId, agentId: agent.id, plannedVolume: volume, withAdvance })
    setBusy(false)
    if (!r.error) {
      setDoneMsg(withAdvance ? `${formatNaira(r.advance.amount)} advance disbursed` : 'Enrolled — no advance')
      setContractId(null); setFarmerId(null)
    }
  }

  if (doneMsg) {
    return (
      <div className="ios-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ios-empty">
          <span className="ios-iconsq" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto', background: 'var(--ios-tint)' }}>
            <IconCheck width={30} height={30} />
          </span>
          <h3>Farmer enrolled</h3>
          <p>{doneMsg}. The farmer got an SMS and can now sell into this contract.</p>
        </div>
        <PrimaryButton onClick={() => setDoneMsg(null)}>Enrol another</PrimaryButton>
      </div>
    )
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Enrol" />

      <SectionHeader>Contract</SectionHeader>
      <InsetGroup>
        {open.length === 0 && <Row title="No open contracts" subtitle="Buyer must post demand first" />}
        {open.map((c) => {
          const g = cropGlyph(c.crop)
          return (
            <Row key={c.id} icon={g.icon} iconBg={g.color}
              title={`${cap(c.crop)} · ${c.volume} baskets`}
              subtitle={`band ${formatNaira(c.bandMin)}–${formatNaira(c.bandMax)} · filled ${c.filledVolume}/${c.volume}`}
              selected={contractId === c.id} onClick={() => setContractId(c.id)} />
          )
        })}
      </InsetGroup>

      <SectionHeader>Farmer</SectionHeader>
      <InsetGroup>
        {state.farmers.map((f) => (
          <Row key={f.id} title={f.name} subtitle={`${f.crop} · ${f.phone}`} selected={farmerId === f.id} onClick={() => setFarmerId(f.id)} />
        ))}
        <Row icon={<IconEnrol width={16} height={16} />} title="New farmer…" onClick={() => setNewFarmerOpen(true)} chevron />
      </InsetGroup>

      <SectionHeader>Terms</SectionHeader>
      <InsetGroup footer={contract ? `Advance cap = ${Math.round(ADVANCE_RATE * 100)}% × planned volume × band floor.` : 'Pick a contract to compute the advance.'}>
        <Row title="Planned volume" trailing={<Stepper value={volume} onChange={setVolume} min={1} max={200} />} />
        <Row title="Input advance" subtitle={contract ? `up to ${formatNaira(advance)}` : undefined} trailing={<Toggle on={withAdvance} onChange={setWithAdvance} label="Input advance" />} />
      </InsetGroup>

      <div style={{ display: 'flex', marginTop: 24 }}>
        <PrimaryButton disabled={!contractId || !farmerId} loading={busy} onClick={enrol}>
          {withAdvance && contract ? `Enrol + disburse ${formatNaira(advance)}` : 'Enrol farmer'}
        </PrimaryButton>
      </div>

      <NewFarmerSheet open={newFarmerOpen} onClose={() => setNewFarmerOpen(false)} />
    </div>
  )
}

function NewFarmerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [crop, setCrop] = useState('tomato')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const r = await call('/api/farmers', 'POST', { name, phone, crop })
    setBusy(false)
    if (!r.error) { setName(''); setPhone(''); onClose() }
  }

  const input = {
    width: '100%', border: 0, background: 'transparent', font: 'inherit',
    fontSize: 17, outline: 'none', padding: '12px 0',
  } as const

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="ios-title2" style={{ margin: '4px 0 12px' }}>New farmer</h2>
      <InsetGroup>
        <div className="ios-row"><input style={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="ios-row"><input style={input} placeholder="Phone (+234…)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </InsetGroup>
      <div style={{ marginTop: 12 }}>
        <InsetGroup>
          {['tomato', 'pepper', 'onion'].map((c) => (
            <Row key={c} icon={cropGlyph(c).icon} iconBg={cropGlyph(c).color} title={cap(c)} selected={crop === c} onClick={() => setCrop(c)} />
          ))}
        </InsetGroup>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton disabled={!name || !phone} loading={busy} onClick={save}>Register</PrimaryButton>
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 4: Write `src/apps/agent/WalletTab.tsx`**

```tsx
'use client'

import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, EmptyState } from '@/components/ios/kit'
import { IconWallet } from '@/components/ios/icons'

export function WalletTab({ state, agent }: { state: AppState; agent: any }) {
  const wallet = state.wallets.find((w) => w.ownerId === agent.id)
  const ledger: any[] = wallet?.ledger ?? []

  return (
    <div className="ios-content">
      <NavLargeTitle title="Wallet" />
      <div className="ios-balancecard">
        <div className="ios-caption1">Commission balance</div>
        <div className="ios-balance">{formatNaira(wallet?.balance ?? 0)}</div>
      </div>
      <SectionHeader>Commissions</SectionHeader>
      {ledger.length === 0 ? (
        <EmptyState icon={<IconWallet width={40} height={40} />} title="No commissions yet" message="You earn 2% on every delivered lot." />
      ) : (
        <InsetGroup>
          {ledger.map((e) => (
            <Row key={e.id} title="Lot commission" subtitle={new Date(e.createdAt).toLocaleString()}
              value={<span style={{ color: 'var(--ios-tint)' }}>+{formatNaira(e.amount)}</span>} />
          ))}
        </InsetGroup>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Replace `src/app/agent/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { LiveDot } from '@/components/ui'
import { IPhoneFrame } from '@/components/iphone/IPhoneFrame'
import { AgentApp } from '@/apps/agent/AgentApp'

export default function AgentPage() {
  const { flash } = useAppState()
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-6">
      <header className="mb-4 flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Agent</h1>
            <p className="text-sm text-muted">Ibrahim · field app</p>
          </div>
        </div>
        <LiveDot flash={flash} />
      </header>
      <IPhoneFrame caption="Ibrahim · Agent app">
        <AgentApp />
      </IPhoneFrame>
    </div>
  )
}
```

> Note: this removes the old PWA page including its service-worker registration. Keep `public/sw.js` and `public/manifest.webmanifest` (harmless; still linked in layout metadata), but the page no longer registers the SW — acceptable per spec (the "installable PWA" talking point is superseded by "native app" framing).

- [ ] **Step 6: Verify + screenshot + commit**

`npm run build` → clean. Dev-run the agent flow: reset → post contract (curl) → `/agent`: Enrol (pick contract, Musa, advance toggle shows ₦40,000) → confirm → success; farmer sells (curl `/api/harvest` or via `/phone`) → Today shows pickup → grade A → aggregated list updates. Screenshot `/tmp/agent-app.png` of `/agent` and inspect.
```bash
git add -A && git commit -m "feat(agent-app): Today/Enrol/Wallet tabs in iPhone frame, replace /agent"
```

---

### Task 10: Buyer app + `/buyer`

**Files:**
- Create: `src/apps/buyer/BuyerApp.tsx`, `src/apps/buyer/OrdersTab.tsx`, `src/apps/buyer/PostTab.tsx`, `src/apps/buyer/AccountTab.tsx`
- Modify: `src/app/buyer/page.tsx`

- [ ] **Step 1: Write `src/apps/buyer/BuyerApp.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/useAppState'
import { TabBar } from '@/components/ios/kit'
import { IconOrders, IconPost, IconBuilding } from '@/components/ios/icons'
import { OrdersTab } from './OrdersTab'
import { PostTab } from './PostTab'
import { AccountTab } from './AccountTab'

export function BuyerApp() {
  const { state } = useAppState()
  const [tab, setTab] = useState('orders')
  const buyer = state.buyers[0]
  if (!buyer) return <div className="ios-content" />

  return (
    <>
      {tab === 'orders' && <OrdersTab state={state} buyer={buyer} />}
      {tab === 'post' && <PostTab buyer={buyer} onPosted={() => setTab('orders')} />}
      {tab === 'account' && <AccountTab state={state} buyer={buyer} />}
      <TabBar
        items={[
          { key: 'orders', label: 'Orders', icon: <IconOrders /> },
          { key: 'post', label: 'Post', icon: <IconPost /> },
          { key: 'account', label: 'Account', icon: <IconBuilding /> },
        ]}
        active={tab}
        onChange={setTab}
      />
    </>
  )
}
```

- [ ] **Step 2: Write `src/apps/buyer/OrdersTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, PrimaryButton, Pill, Progress, EmptyState } from '@/components/ios/kit'
import { cropGlyph, IconShield, IconOrders } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function OrdersTab({ state, buyer }: { state: AppState; buyer: any }) {
  const [busy, setBusy] = useState<string | null>(null)
  const contracts = state.contracts.filter((c) => c.buyerId === buyer.id)
  const orderFor = (cid: string) => state.orders.find((o) => o.contractId === cid)
  const lotsFor = (oid: string) => state.lots.filter((l) => l.orderId === oid)

  return (
    <div className="ios-content">
      <NavLargeTitle title="Orders" trailing={<div className="ios-avatar">{buyer.contactName?.[0] ?? 'B'}</div>} />

      {contracts.length === 0 && (
        <EmptyState icon={<IconOrders width={40} height={40} />} title="No demand posted" message="Post a forward contract and watch supply fill in real time." />
      )}

      {contracts.map((c) => {
        const order = orderFor(c.id)
        const lots = order ? lotsFor(order.id) : []
        const pct = Math.round((c.filledVolume / c.volume) * 100)
        const total = lots.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
        const g = cropGlyph(c.crop)
        return (
          <div key={c.id} style={{ marginBottom: 18 }}>
            <SectionHeader>{cap(c.crop)} · grade {c.grade}</SectionHeader>
            <InsetGroup>
              <Row icon={g.icon} iconBg={g.color}
                title={`${c.filledVolume}/${c.volume} baskets`}
                subtitle={`band ${formatNaira(c.bandMin)}–${formatNaira(c.bandMax)}/basket`}
                trailing={<Pill tone={c.status === 'filled' ? 'green' : c.status === 'filling' ? 'orange' : 'gray'}>{c.status}</Pill>} />
              <div className="ios-row"><div style={{ width: '100%' }}><Progress pct={pct} /></div></div>
              {lots.map((l) => (
                <Row key={l.id}
                  title={<span>{l.enrollment?.farmer?.name}{' '}
                    {l.enrollment?.farmer?.ndfrVerified ? <Pill tone="green"><IconShield width={10} height={10} /> NDFR</Pill> : null}</span>}
                  subtitle={`${l.traceRef} · ${l.enrollment?.farmer?.geoPoint}`}
                  value={`${l.quantity} × ${formatNaira(l.unitPrice)}`} />
              ))}
              {order && (
                <div className="ios-row" style={{ gap: 10 }}>
                  <span className="ios-rowbody">
                    <span className="ios-rowtitle"><b>{formatNaira(total)}</b></span>
                    <span className="ios-rowsub">order total · {order.status}</span>
                  </span>
                  {order.status === 'open' && (
                    <PrimaryButton loading={busy === order.id} onClick={async () => { setBusy(order.id); await call('/api/escrow', 'POST', { orderId: order.id }); setBusy(null) }}>
                      Fund escrow
                    </PrimaryButton>
                  )}
                  {order.status === 'funded' && (
                    <PrimaryButton loading={busy === order.id} onClick={async () => { setBusy(order.id); await call('/api/payout', 'POST', { orderId: order.id }); setBusy(null) }}>
                      Confirm delivery
                    </PrimaryButton>
                  )}
                  {order.status === 'delivered' && <Pill tone="green">Paid ✓</Pill>}
                </div>
              )}
            </InsetGroup>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/apps/buyer/PostTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { call } from '@/lib/api'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, Stepper, PrimaryButton } from '@/components/ios/kit'
import { cropGlyph } from '@/components/ios/icons'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function PostTab({ buyer, onPosted }: { buyer: any; onPosted: () => void }) {
  const [crop, setCrop] = useState('tomato')
  const [volume, setVolume] = useState(50)
  const [bandMin, setBandMin] = useState(5000)
  const [bandMax, setBandMax] = useState(9000)
  const [busy, setBusy] = useState(false)

  async function post() {
    setBusy(true)
    const r = await call('/api/contracts', 'POST', { buyerId: buyer.id, crop, grade: 'A', volume, bandMin, bandMax, windowDays: 14 })
    setBusy(false)
    if (!r.error) onPosted()
  }

  return (
    <div className="ios-content">
      <NavLargeTitle title="Post demand" />

      <SectionHeader>Crop</SectionHeader>
      <InsetGroup>
        {['tomato', 'pepper', 'onion'].map((c) => (
          <Row key={c} icon={cropGlyph(c).icon} iconBg={cropGlyph(c).color} title={cap(c)} selected={crop === c} onClick={() => setCrop(c)} />
        ))}
      </InsetGroup>

      <SectionHeader>Volume &amp; price band (₦/basket)</SectionHeader>
      <InsetGroup footer="The band is the farmer's protection: the fair price is clamped inside it whatever the market does.">
        <Row title="Volume (baskets)" trailing={<Stepper value={volume} onChange={setVolume} min={10} max={500} />} />
        <Row title="Band floor" trailing={<Stepper value={bandMin} onChange={(n) => setBandMin(Math.min(n, bandMax - 500))} min={1000} max={20000} />} />
        <Row title="Band ceiling" trailing={<Stepper value={bandMax} onChange={(n) => setBandMax(Math.max(n, bandMin + 500))} min={1500} max={30000} />} />
      </InsetGroup>

      <div style={{ display: 'flex', marginTop: 24 }}>
        <PrimaryButton loading={busy} onClick={post}>Post forward contract</PrimaryButton>
      </div>
    </div>
  )
}
```

> Steppers move ₦ amounts by 1 — too slow for price bands. In the `Stepper` calls above for band floor/ceiling, step by 500: wrap onChange — `onChange={(n) => setBandMin(...)}` receives ±1; instead pass `value={bandMin}` with custom buttons? Keep it simple: change the two band rows to use `step`-aware stepper. **Add a `step` prop to `Stepper` in `src/components/ios/kit.tsx`:**
> ```tsx
> export function Stepper({ value, onChange, min = 1, max = 999, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
>   return (
>     <div className="ios-stepper">
>       <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
>       <span className="val">{value.toLocaleString()}</span>
>       <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
>     </div>
>   )
> }
> ```
> Then use `step={500}` on the two band rows and `step={10}` on volume.

- [ ] **Step 4: Write `src/apps/buyer/AccountTab.tsx`**

```tsx
'use client'

import type { AppState } from '@/lib/useAppState'
import { formatNaira } from '@/lib/money'
import { NavLargeTitle, SectionHeader, InsetGroup, Row, EmptyState } from '@/components/ios/kit'
import { IconBuilding, IconWallet, IconPerson } from '@/components/ios/icons'

export function AccountTab({ state, buyer }: { state: AppState; buyer: any }) {
  const wallet = state.wallets.find((w) => w.ownerId === buyer.id)
  return (
    <div className="ios-content">
      <NavLargeTitle title="Account" />
      <InsetGroup>
        <Row icon={<IconBuilding width={16} height={16} />} iconBg="#E2A63B" title={buyer.orgName} subtitle={buyer.contactName} />
        <Row icon={<IconWallet width={16} height={16} />} iconBg="var(--ios-tint)" title="Wallet" value={formatNaira(wallet?.balance ?? 0)} />
      </InsetGroup>
      <SectionHeader>Settings</SectionHeader>
      <EmptyState icon={<IconPerson width={40} height={40} />} title="Nothing here yet" message="Team, invoices and settings arrive in the next release." />
    </div>
  )
}
```

- [ ] **Step 5: Replace `src/app/buyer/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAppState } from '@/lib/useAppState'
import { LiveDot } from '@/components/ui'
import { IPhoneFrame } from '@/components/iphone/IPhoneFrame'
import { BuyerApp } from '@/apps/buyer/BuyerApp'

export default function BuyerPage() {
  const { flash } = useAppState()
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-6">
      <header className="mb-4 flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-black/[0.04]" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Buyer</h1>
            <p className="text-sm text-muted">Mrs. Okafor · Northern Foods Ltd</p>
          </div>
        </div>
        <LiveDot flash={flash} />
      </header>
      <IPhoneFrame caption="Mrs. Okafor · Buyer app">
        <BuyerApp />
      </IPhoneFrame>
    </div>
  )
}
```

- [ ] **Step 6: Verify + commit**

`npm run build` → clean. Dev check: reset → `/buyer` Post tab → post tomato contract → Orders shows it; run the loop (enrol on `/agent`, sell on `/phone`) → Orders fills live → Fund escrow → Confirm delivery → Paid ✓.
```bash
git add -A && git commit -m "feat(buyer-app): Orders/Post/Account tabs in iPhone frame, replace /buyer"
```

---

### Task 11: Launcher copy, full verification, visual pass

**Files:**
- Modify: `src/app/page.tsx` (descriptions only)

- [ ] **Step 1: Update launcher card copy** in `src/app/page.tsx`: change the farmer card `desc` to `"Native app for smartphone farmers — plus the same flow by USSD on any ₦5,000 Nokia."`, the agent card persona to `'Ibrahim · Agent app'` and desc to `"Enrol farmers with input advances, grade pickups, track commissions — in the field."`, the buyer desc to `"Post forward demand and fund escrow from a native mobile app, with live traceable supply."`

- [ ] **Step 2: Full test suite**

Run: `npm test` → 24 unit pass. Run: `npm run test:e2e` → all integration tests pass (USSD path + app path + acceptHarvest).

- [ ] **Step 3: Production build**

Run: `npm run build` → compiles, TypeScript clean.

- [ ] **Step 4: Screenshot pass** (dev server running, after `POST /api/admin/reset` + one posted contract so screens have content)

```bash
for r in phone agent buyer; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars \
    --window-size=1280,900 --screenshot=/tmp/final-$r.png http://localhost:3000/$r
done
```
Read each png. Check: chassis renders with Dynamic Island; iOS typography/groups look native; tab bar pinned at bottom; nothing overflows the display; tint is `#2E6B3E` throughout.

- [ ] **Step 5: Manual live-sync run** — three windows (`/phone`, `/agent`, `/buyer`): full hero loop; each action appears on the other screens within ~2s; farmer Nokia mode still shows SMS receipts.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(ui): launcher copy for native apps + final verification pass"
```

---

## Self-Review notes

- **Spec coverage:** §2 foundation → Tasks 3–5; §3 farmer → Tasks 7–8, agent → Task 9, buyer → Task 10; §4 API → Tasks 1–2; §5 removals → Tasks 8–10 (page replacements); §6 testing → Tasks 1–2 (service + app-path e2e) and Task 11 (screenshots, manual run).
- **Type consistency:** kit props (`Row`, `Stepper step`, `Sheet open/onClose`, `TabBar items/active/onChange`) used identically across all app tasks; `acceptHarvest`/`harvestPricing` signatures in Task 1 match usages in Tasks 2 and the USSD route.
- **Known judgment calls:** agent page drops SW registration (noted inline, spec-consistent); `/api/state` wallets now include ledger (spec §3 wallet tabs need it); Task 7 creates a temporary `SellTab` placeholder so the build stays green between tasks.
