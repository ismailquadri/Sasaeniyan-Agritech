# Hybrid UI/UX Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the three iOS apps to the approved "Hybrid" register — produce photography, gradient hero cards, sparklines, journey tracking, full state coverage (loading/empty/error/offline), 12-crop catalog, rich deterministic seed, and the rejection/credit/busy-marketplace scenarios.

**Architecture:** No schema migration, no new architecture. New kit components in `src/components/ios/`, a crop catalog in `src/domain/crops.ts` + local images in `public/crops/`, a seed rewrite, three small API changes, then per-app overhauls that compose the kit. Hero demo numbers unchanged (Musa L1 → ₦40,000 advance → ₦57,000).

**Tech Stack:** unchanged (Next 16, React 19, Prisma 6 + Postgres :5433, Vitest, SSE).

**Spec:** `docs/superpowers/specs/2026-10-10-ui-upgrade-hybrid-design.md` — read it in full before any task.

---

## Environment notes (every agent reads this)

- Branch: all work on **`feat/ui-upgrade`** (created from master in Task 1).
- Postgres on `localhost:5433` (docker compose). **Never `prisma migrate reset`** — reset data via `POST /api/admin/reset` or `resetDemo()`.
- Dev servers: use the port assigned in your dispatch (3000 unless told otherwise); kill only your own PID (`lsof -tiTCP:<port> -sTCP:LISTEN`).
- Screenshots: use **Playwright's bundled Chromium** (plain headless-chrome `--screenshot` stalls on SSE pages). **Never `pkill -f Chrome`.**
- Read screenshots/images with the Read tool to verify them — that's the visual gate.
- House pattern: study `src/apps/farmer/*` + `src/components/ios/kit.tsx` before composing any screen.
- Baseline (must stay green): `npm test` 24+, `npm run test:e2e` 27+, `npx tsc --noEmit`, `npm run build`.

## File structure

```
Create:
  public/crops/*.jpg (12) + public/crops/CREDITS.md
  src/domain/crops.ts + src/domain/crops.test.ts
  src/domain/credit.ts + src/domain/credit.test.ts
  src/app/api/messages/route.ts
  src/components/ios/upgrade.tsx     (HeroCard, Chip, Sparkline, JourneyTracker,
                                      PhotoThumb, PhotoCard, Skeleton, Banner, Toast, DayGroup)
Modify:
  src/domain/config.ts               ADVANCE_RATE_BY_LEVEL
  src/domain/i18n/strings.ts         lotRejected, reviewRequested keys
  src/domain/seed/seed.ts            rich cast + 7-day index history
  src/app/api/lots/[id]/route.ts     reject action
  src/app/api/enrollments/route.ts   level-derived advance rate
  src/components/ios/ios.css         styles for the new components
  src/components/ios/kit.tsx         Row `photo` prop
  src/lib/useAppState.ts             status ('loading'|'ready'|'error') + online flag
  src/test/hero-path.e2e.test.ts     delta assertions
  src/apps/farmer/* (4 tabs)         Hybrid overhaul
  src/apps/agent/*  (4 tabs)         Hybrid overhaul + reject flow
  src/apps/buyer/*  (3 tabs)         Hybrid overhaul + grade/window fields
```

---

### Task 1: Branch + crop images (verified by eye)

**Files:** Create `public/crops/*.jpg` ×12, `public/crops/CREDITS.md`.

- [ ] **Step 1:** `git checkout -b feat/ui-upgrade master`
- [ ] **Step 2:** Download 12 crop photos (~800–1600px wide, landscape or square) into `public/crops/`. Try these Unsplash CDN URLs first (append `?w=1200&q=75&fm=jpg&fit=crop`); each is a best-guess ID — **verification is the gate, not the ID**:
  - tomato → `https://images.unsplash.com/photo-1592924357228-91a4daadcfea`
  - pepper → `https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8`
  - onion → `https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31`
  - cabbage → `https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f`
  - watermelon → `https://images.unsplash.com/photo-1587049352846-4a222e784d38`
  - cucumber → `https://images.unsplash.com/photo-1604977042946-1eecc30f269e`
  - maize → `https://images.unsplash.com/photo-1551754655-cd27e38d2076`
  - rice → `https://images.unsplash.com/photo-1586201375761-83865001e31c`
  - sorghum → `https://images.unsplash.com/photo-1631209121750-a9f625f98944`
  - millet → `https://images.unsplash.com/photo-1586201375800-744e8cf7cdea`
  - groundnut → `https://images.unsplash.com/photo-1567892737950-30c4db37cd89`
  - ginger → `https://images.unsplash.com/photo-1615485290382-441e4d049cb5`
  Download with `curl -L -o public/crops/<crop>.jpg "<url>"`.
- [ ] **Step 3: VERIFY every image** — for each file: `file public/crops/<crop>.jpg` must report JPEG; size must be 20KB–600KB; then **Read the image** and confirm it visually shows that crop (not a wrong subject, not a 404 page). If any fails: try a different Unsplash photo of that crop (search IDs via WebSearch "unsplash <crop> photo" and fetch the page to find the photo id), or a Wikimedia Commons direct file URL. Repeat until all 12 pass the eye test.
- [ ] **Step 4:** Write `public/crops/CREDITS.md` listing each crop → final source URL (license note: Unsplash License / CC source).
- [ ] **Step 5:** Commit: `git add public/crops && git commit -m "feat(assets): local crop photo library (12 crops, offline-safe)"`

### Task 2: Crop catalog + credit levels (TDD)

**Files:** Create `src/domain/crops.ts`, `src/domain/crops.test.ts`, `src/domain/credit.ts`, `src/domain/credit.test.ts`; Modify `src/domain/config.ts`, `src/domain/i18n/strings.ts`.

- [ ] **Step 1:** Write failing tests:

```ts
// src/domain/crops.test.ts
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CROPS, cropById } from './crops'

describe('crop catalog', () => {
  it('has exactly 12 crops with complete fields', () => {
    expect(CROPS.length).toBe(12)
    for (const c of CROPS) {
      expect(c.id).toMatch(/^[a-z]+$/)
      expect(c.name.length).toBeGreaterThan(2)
      expect(c.nameHa.length).toBeGreaterThan(2)
      expect(['basket', 'bag', 'sack']).toContain(c.unit)
      expect(c.photo).toBe(`/crops/${c.id}.jpg`)
      expect(c.fallback).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
  it('every photo file exists on disk', () => {
    for (const c of CROPS) {
      expect(existsSync(join(process.cwd(), 'public', 'crops', `${c.id}.jpg`)), c.id).toBe(true)
    }
  })
  it('cropById falls back to a generic entry for unknown crops', () => {
    expect(cropById('tomato').name).toBe('Tomato')
    expect(cropById('mystery').name).toBe('Mystery') // capitalized id, fallback visuals
  })
})
```

```ts
// src/domain/credit.test.ts
import { describe, it, expect } from 'vitest'
import { creditLevel, advanceRateFor } from './credit'

describe('credit levels', () => {
  it('maps score to level', () => {
    expect(creditLevel(0)).toBe(1)
    expect(creditLevel(8)).toBe(1)
    expect(creditLevel(10)).toBe(2)
    expect(creditLevel(29)).toBe(2)
    expect(creditLevel(30)).toBe(3)
  })
  it('maps level to advance rate', () => {
    expect(advanceRateFor(0)).toBe(0.4)
    expect(advanceRateFor(15)).toBe(0.5)
    expect(advanceRateFor(45)).toBe(0.6)
  })
})
```

- [ ] **Step 2:** Run → fail. Implement:

```ts
// src/domain/crops.ts
export interface Crop {
  id: string
  name: string
  nameHa: string
  unit: 'basket' | 'bag' | 'sack'
  unitLabel: string
  photo: string
  fallback: string
}

export const CROPS: Crop[] = [
  { id: 'tomato', name: 'Tomato', nameHa: 'Tumatir', unit: 'basket', unitLabel: '50kg basket', photo: '/crops/tomato.jpg', fallback: '#c2410c' },
  { id: 'pepper', name: 'Pepper', nameHa: 'Barkono', unit: 'basket', unitLabel: '40kg basket', photo: '/crops/pepper.jpg', fallback: '#dc2626' },
  { id: 'onion', name: 'Onion', nameHa: 'Albasa', unit: 'basket', unitLabel: '50kg basket', photo: '/crops/onion.jpg', fallback: '#7c3aed' },
  { id: 'cabbage', name: 'Cabbage', nameHa: 'Kabeji', unit: 'basket', unitLabel: '45kg basket', photo: '/crops/cabbage.jpg', fallback: '#16a34a' },
  { id: 'watermelon', name: 'Watermelon', nameHa: 'Kankana', unit: 'basket', unitLabel: '60kg basket', photo: '/crops/watermelon.jpg', fallback: '#15803d' },
  { id: 'cucumber', name: 'Cucumber', nameHa: 'Kokwamba', unit: 'basket', unitLabel: '40kg basket', photo: '/crops/cucumber.jpg', fallback: '#4d7c0f' },
  { id: 'maize', name: 'Maize', nameHa: 'Masara', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/maize.jpg', fallback: '#ca8a04' },
  { id: 'rice', name: 'Rice (paddy)', nameHa: 'Shinkafa', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/rice.jpg', fallback: '#a16207' },
  { id: 'sorghum', name: 'Sorghum', nameHa: 'Dawa', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/sorghum.jpg', fallback: '#92400e' },
  { id: 'millet', name: 'Millet', nameHa: 'Gero', unit: 'bag', unitLabel: '100kg bag', photo: '/crops/millet.jpg', fallback: '#b45309' },
  { id: 'groundnut', name: 'Groundnut', nameHa: 'Gyada', unit: 'sack', unitLabel: '80kg sack', photo: '/crops/groundnut.jpg', fallback: '#9a3412' },
  { id: 'ginger', name: 'Ginger', nameHa: 'Citta', unit: 'sack', unitLabel: '60kg sack', photo: '/crops/ginger.jpg', fallback: '#a8540f' },
]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Catalog lookup with a safe fallback for unknown crop ids. */
export function cropById(id: string): Crop {
  return (
    CROPS.find((c) => c.id === id) ?? {
      id, name: cap(id), nameHa: cap(id), unit: 'basket', unitLabel: 'basket',
      photo: `/crops/${id}.jpg`, fallback: '#6b7280',
    }
  )
}
```

```ts
// src/domain/credit.ts
// Credit flywheel: score → level → offtake-advance rate.
export const LEVEL_THRESHOLDS = { 2: 10, 3: 30 } as const

export function creditLevel(score: number): 1 | 2 | 3 {
  if (score >= LEVEL_THRESHOLDS[3]) return 3
  if (score >= LEVEL_THRESHOLDS[2]) return 2
  return 1
}

export function advanceRateFor(score: number): number {
  return ADVANCE_RATE_BY_LEVEL[creditLevel(score)]
}

import { ADVANCE_RATE_BY_LEVEL } from './config'
```
(Put the import at the top in real code.)

- [ ] **Step 3:** In `src/domain/config.ts` add:

```ts
export const ADVANCE_RATE_BY_LEVEL: Record<1 | 2 | 3, number> = { 1: 0.4, 2: 0.5, 3: 0.6 }
```
(Keep the existing `ADVANCE_RATE = 0.4` export — still referenced as the L1/default.)

- [ ] **Step 4:** In `src/domain/i18n/strings.ts` add to all three dictionaries:
  - `lotRejected` — ha: `'An ki kwandon ka: {reason}. Jami’i zai sake duba. Ka tuntubi jami’inka.'`, pcm: `'We no fit accept your basket: {reason}. Talk to your agent.'`, en: `'Your lot was rejected: {reason}. Contact your agent to review.'`
  - `reviewRequested` — ha: `'{name} ya nemi sake duba kwandon da aka ki.'`, pcm: `'{name} don ask make we check the rejected basket again.'`, en: `'{name} requested a review of the rejected lot.'`
- [ ] **Step 5:** `npm test` → all pass (now 24 + 5 new = 29+). Commit: `git add -A && git commit -m "feat(domain): crop catalog, credit levels, rejection i18n"`

### Task 3: Rich seed + e2e delta refactor

**Files:** Modify `src/domain/seed/seed.ts`, `src/test/hero-path.e2e.test.ts`.

- [ ] **Step 1:** Rewrite `seedDemo` keeping ALL existing fixed ids and the `resetDemo` wipe order. Additions (all ids fixed strings, all money kobo via `naira()`):
  - Wallets: add `wallet_farmer_sani` (balance `naira(184_500)`), `wallet_farmer_amina` (`naira(96_200)`), `wallet_farmer_bello` (`naira(12_000)`), `wallet_buyer_dantata` (`naira(3_000_000)`), `wallet_buyer_freshco` (`naira(2_000_000)`).
  - Farmers: Musa `creditScore: 8` (L1 — hero math), Hauwa 4; add `farmer_sani` (Sani Garba, `+2348030000012`, maize, geo `12.00,8.52`, NDFR ✓, creditScore 34), `farmer_amina` (Amina Yusuf, `+2348030000013`, ginger, geo `11.51,8.28`, NDFR ✓, creditScore 16), `farmer_bello` (Bello Adamu, `+2348030000014`, rice, geo `12.10,8.60`, NDFR ✗, creditScore 3).
  - Buyers: add `buyer_dantata` (Kano Agro Exports, Alhaji Dantata), `buyer_freshco` (FreshCo Lagos, Ngozi Eze).
  - Market index: for each of the 12 catalog crops (import `CROPS` from `../crops`), 7 daily rows ending at the seed anchor date `2026-10-09T00:00:00Z` (dates anchor−6d … anchor). Hand-written 7-value walks per crop (no RNG), e.g. tomato `[4200, 4000, 3800, 3600, 3400, 3200, 3000]` (glut story, latest = ₦3,000 preserving hero numbers), maize `[56000, 56500, 57500, 57000, 58500, 59000, 58000]`, etc. Define a `const INDEX_WALKS: Record<string, number[]>` with naira values; a loop creates the rows with `naira()`.
  - History (non-hero): one **delivered** contract `contract_hist_maize` (buyer_dantata, maize, 40 bags, band 55k–65k) with enrollment (Sani, agent Ibrahim), delivered order+lot (40 bags @ naira(58_000), traceRef `NDFR-SANI-00001`), ledger entries + paymentReceipt message for Sani, escrow released; one **delivered** `contract_hist_ginger` (buyer_freshco, Amina, 25 sacks @ naira(14_000) analogous); one **filling** `contract_live_rice` (buyer_okafor, rice, 60 bags, band 70k–85k) with Bello enrolled (advance `naira(12_000)` issued, not netted) and one **rejected** lot (10 bags, status `'rejected'`, traceRef `NDFR-BELO-00009`) + farmer SMS using the `lotRejected` key with reason `'moisture above 14% at pickup'` + Event `LOT_REJECTED`.
  - Keep hero invariants: NO contracts/lots/enrollments for tomato; Musa/Hauwa wallets zero; buyer_okafor wallet `naira(5_000_000)`.
  Use `createMany`/upserts with fixed ids so re-seeding is idempotent (follow the existing upsert pattern; for history rows prefer fixed-id `upsert`).
- [ ] **Step 2:** Refactor `src/test/hero-path.e2e.test.ts` to delta assertions: after `resetDemo`, snapshot `const before = { musa: (await db.wallet.findUnique({ where: { id: IDS.walletMusa } }))!.balance, agent: ..., platform: ... }`; final assertions become `expect(musaWallet!.balance - before.musa).toBe(5_700_000)` etc. (both tests in the file). The advance assertion `e.advance.amount === 4_000_000` stays absolute (Musa is L1 → 40%).
- [ ] **Step 3:** `npm run test:e2e` → all pass. `npm run seed` then eyeball via `npx prisma studio` optional; better: `curl /api/state` after dev-up in later tasks.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "feat(seed): busy-marketplace cast, 7-day price history, rejected-lot story"`

### Task 4: API changes (reject · messages · level-derived advance)

**Files:** Modify `src/app/api/lots/[id]/route.ts`, `src/app/api/enrollments/route.ts`; Create `src/app/api/messages/route.ts`; Create `src/domain/offtake/rejectLot.e2e.test.ts`.

- [ ] **Step 1:** Failing test:

```ts
// src/domain/offtake/rejectLot.e2e.test.ts
import { describe, it, expect, afterAll } from 'vitest'
const RUN = process.env.RUN_E2E === '1'
const json = (body: unknown, method = 'POST') =>
  new Request('http://test.local', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

;(RUN ? describe : describe.skip)('lot rejection', () => {
  it('rejects with reason, notifies farmer, records event', async () => {
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
    const ev = await db.event.findFirst({ where: { type: 'LOT_REJECTED' } })
    expect(ev).toBeTruthy()
    // contract fill unchanged
    const contract = await db.contract.findUnique({ where: { id: c.contract.id } })
    expect(contract!.filledVolume).toBe(0)
  })

  it('level-derived advance: L3 farmer gets 60%', async () => {
    const { db } = await import('@/lib/db')
    const { resetDemo, IDS } = await import('@/domain/seed/seed')
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
```

- [ ] **Step 2:** Run → fails. Implement:
  - **lots route:** zod becomes `z.union([z.object({ grade: z.enum(['A','B','C']) }), z.object({ action: z.literal('reject'), reason: z.string().min(4) })])`. Reject branch: load lot (+enrollment.farmer, +enrollment.contract), 409 if lot not `picked`; update `status: 'rejected'` (leave `orderId` null); create farmer SMS via `t('lotRejected', lang, { reason })`; `publish({ type: 'LOT_REJECTED', payload: { lotId, farmerId, reason } })`; return `{ lot }`. Grade branch unchanged.
  - **enrollments route:** replace `ADVANCE_RATE` with `advanceRateFor(farmer.creditScore)` from `@/domain/credit` (import; keep everything else).
  - **messages route** (`src/app/api/messages/route.ts`): zod `{ toPhone: string, body: string(min 2), lang: enum default 'ha' }` → `db.message.create({ channel: 'SMS', ... })`, `publish({ type: 'REVIEW_REQUESTED', payload: { toPhone } })`, 201 `{ message }`. (The farmer app composes the body with `t('reviewRequested', ...)` client-side.)
- [ ] **Step 3:** `npm run test:e2e` all pass (now 29+ e2e-mode tests incl. hero deltas). `npx tsc --noEmit` clean.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "feat(api): lot rejection + review-request message + level-derived advance"`

### Task 5: Kit upgrade components + state infra

**Files:** Create `src/components/ios/upgrade.tsx`; Modify `src/components/ios/ios.css`, `src/components/ios/kit.tsx` (Row photo prop), `src/lib/useAppState.ts`.

- [ ] **Step 1:** `useAppState` additions (keep existing API):

```ts
// inside useAppState(): new state
const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
const [online, setOnline] = useState(true)
// refetch: on success setStatus('ready'); on catch setStatus((s) => (s === 'loading' ? 'error' : s))
// mount effect: window 'online'/'offline' listeners → setOnline(navigator.onLine); SSE onerror (via a callback
// param added to useEvents opts or simply setOnline(false) on 'POLL' events? NO —) add to useEvents a second
// optional arg onConnectionChange?: (ok: boolean) => void wired to es.onerror (false) and es.onopen (true);
// useAppState passes it through to setOnline alongside navigator.onLine (online = navigatorOnline && sseOk).
// return { state, refetch, flash, status, online }
```
Implement exactly that contract (status transitions: `loading` only until first success/failure; later failures keep `ready` with stale data — Banner shows offline instead).

- [ ] **Step 2:** `kit.tsx` Row: add optional `photo?: { src: string; alt: string; fallback?: string }`; when set, render `<img className="ios-rowphoto" src alt style={{ background: fallback }} width={32} height={32} loading="lazy" />` instead of the icon square.

- [ ] **Step 3:** Create `src/components/ios/upgrade.tsx` ('use client') with complete implementations — key contracts:

```tsx
export function HeroCard({ gradient = 'farmer', label, chips, balance, children }:{
  gradient?: 'farmer' | 'agent' | 'buyer'; label: string; chips?: ReactNode; balance: number; children?: ReactNode })
// renders .ios-hero.ios-hero--<gradient>; label row (uppercase 11px white/75 + chips right);
// 34px tnum white formatNaira(balance); children = action row

export function HeroAction({ children, onClick, primary }: ...) // gold solid when primary, white/16 translucent otherwise; min-height 44

export function Chip({ tone = 'neutral', onDark, icon, children }: ...) // .ios-chip.<tone>[.ondark]

export function Sparkline({ points, width = 34, height = 14, 'aria-label': ariaLabel }: { points: number[]; ... })
// normalizes points to the viewBox; stroke #1F9D4D if last >= first else #C0392B; role="img"

export function Delta({ points }: { points: number[] })
// (last-first)/first as ±x.x%; renders ▲/▼ + % in matching color, .tnum, font 11

export function JourneyTracker({ steps, current, rejected }: { steps: string[]; current: number; rejected?: boolean })
// dots+bars; done=tint, current pulses (animation disabled under prefers-reduced-motion), future=#ddd;
// rejected=true renders the current dot/bars in danger red; aria-label=`${steps[current]}, step ${current+1} of ${steps.length}`

export function PhotoThumb({ crop, size = 32 }: { crop: Crop; size?: number })
// <img src={crop.photo} alt={crop.name} width height style={{ background: crop.fallback, borderRadius: 8, objectFit: 'cover' }} />

export function PhotoCard({ crop, label, sub, badge, onClick, selected, height = 96 }: ...)
// button (if onClick) with cover img + bottom gradient overlay; white 13px bold label + 10px sub; optional Chip badge
// top-right; selected = 2px gold inset ring; alt = crop.name

export function Skeleton({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) // .ios-skel shimmer block
export function SkeletonList({ rows = 3 }) // group of row-shaped skeletons inside .ios-group

export function Banner({ tone, children, onRetry }: { tone: 'offline' | 'error'; ... })
// offline: gold bg, "You're offline — showing last known data" default copy; error: danger + Retry button; role="alert" for error

export function Toast({ msg }: { msg: string | null }) // fixed bottom-center inside .ios-screen, aria-live polite
export function useToast(): { toast: string | null; show: (m: string) => void } // 3.5s auto-clear, cleanup on unmount

export function DayGroup({ date, children }: { date: string | Date; children: ReactNode })
// SectionHeader rendering 'Today' | 'Yesterday' | 'd MMM' (en-NG) + children
```

Write these in full (no TODOs), ~250 lines, importing `Crop` from `@/domain/crops` and `formatNaira` from `@/lib/money`.

- [ ] **Step 4:** `ios.css` additions (complete classes): `.ios-hero` (+ `--farmer/--agent/--buyer` gradient variants per spec §2 colors, radius 16, padding 14, colored shadow), `.ios-hero-balance` (34px/800/−1px tnum white), `.ios-heroaction` (+ `.primary` gold `#E2A63B` ink text), `.ios-chip` tones + `.ondark`, `.ios-rowphoto`, `.ios-journey` (dots/bars/pulse keyframes + reduced-motion), `.ios-photocard` (+ overlay, `.selected` gold ring), `.ios-skel` (shimmer keyframes + reduced-motion static), `.ios-banner` (+`.offline`/`.error`), `.ios-toast`. Contrast: chip text colors from the existing tone palette (≥4.5:1 on their backgrounds).

- [ ] **Step 5:** `npm run build` clean, `npm test` green. Commit: `git add -A && git commit -m "feat(ios): hybrid kit — hero card, sparkline, journey, photos, states"`

### Task 6: Farmer app overhaul

**Files:** Modify `src/apps/farmer/{FarmerApp,HomeTab,SellTab,WalletTab}.tsx`; Create `src/apps/farmer/ProfileTab.tsx`.

Compose per spec §6-Farmer using ONLY kit + upgrade components. Requirements checklist (each must be visible in screenshots):

- [ ] **FarmerApp:** add `const { toast, show } = useToast()` passed down via props (`onToast`); render `<Toast msg={toast} />`; accept `status`/`online` props from the page (page passes them from `useAppState`) and render: `status==='loading'` → per-tab `SkeletonList` layout; `!online` → offline `Banner` pinned above content; `status==='error'` → error `Banner` with retry (page passes `refetch` down as `onRetry`).
- [ ] **HomeTab:** greeting row (`Barka da safiya ☀️ · Kano` — time-of-day greeting fn: safiya <12h, rana <17h, yamma after; location hardcoded 'Kano'), avatar + unread dot (dot when any SMS for this farmer is <24h old); `HeroCard` (NDFR chip + `L{level}` credit chip via `creditLevel`, gold `Sell harvest` action → sell tab, `History` → wallet tab); **active-sale card** (most recent lot of this farmer with status ≠ delivered/rejected: PhotoThumb + qty + `JourneyTracker steps={['Accepted','Agent en route','Graded','Paid']}` where current = picked→1, aggregated→2, order funded→2, delivered→3; value right); market board: rows for ALL 12 crops (PhotoThumb, name, unitLabel sub, `Sparkline`+`Delta` from that crop's 7 `latestIndex` history — add helper `indexHistory(marketIndex, crop)` in `useAppState.ts` returning the 7 ascending prices — `demand` Chip when an open contract exists for the crop), capped at 5 rows + "See all" footer row opening a `Sheet` with the full 12; recent activity: last 2 ledger entries under `DayGroup`.
- [ ] **SellTab:** step 1 = 2-col grid of `PhotoCard`s (all 12; badge `demand` where open contract; selected ring); non-enrolled note preserved; offer sheet gains `Sparkline points={history} width={120} height={28}` + Delta above the breakdown rows; on success `onToast('Harvest accepted — agent notified')` (keep confirmation screen).
- [ ] **WalletTab:** `HeroCard` (balance; chips: level + NDFR); **credit journey card** (InsetGroup: current level row, progress `Progress pct` toward next threshold from `LEVEL_THRESHOLDS`, "Advance cap now 40% → next level 50%" footnote via `ADVANCE_RATE_BY_LEVEL`); ledger grouped by `DayGroup`, each payout row with PhotoThumb of the lot's crop; rejected lots of this farmer render a danger Chip row + `Request review` button → `call('/api/messages','POST',{ toPhone: agentPhone, body: t('reviewRequested','en',{name: farmer.name}) })` + toast; receipt sheet unchanged (entry-derived).
- [ ] **ProfileTab (new file, replaces inline stub):** farm card (InsetGroup: location row, crops row, member-since row, NDFR row with chip); language row with `Segmented` EN/HA toggling a local `lang` state that switches the tab's own labels via a tiny inline dict (display-only demo); credit history list (static rows derived from creditScore: "Reached L{level}" entries); keep an EmptyState-free, real-content feel.
- [ ] **Verify:** dev server; reset; the usual hero flow still works through the UI; screenshots (Playwright, 1280×900) of: Home (skeleton state — throttle or shoot immediately after nav), Home (ready, with active sale mid-flow), Sell grid, offer sheet, Wallet (credit card + grouped ledger), Profile. Read each; iterate until projector-ready.
- [ ] Commit: `git add -A && git commit -m "feat(farmer-app): hybrid upgrade — hero, journey, 12-crop market, credit, profile"`

### Task 7: Agent app overhaul

**Files:** Modify `src/apps/agent/{AgentApp,TodayTab,EnrolTab,WalletTab}.tsx`; Create `src/apps/agent/ProfileTab.tsx`.

- [ ] **AgentApp:** same Toast/status/online wiring as FarmerApp (agent page passes props).
- [ ] **TodayTab:** queue cards gain `PhotoThumb` + farmer credit Chip (`L{level}`); grade sheet gains a danger `Reject…` secondary button → inline reason picker (3 quick Chips: 'moisture above 14% at pickup', 'poor grading quality', 'short quantity at pickup' + free-text input, min 4 chars) → `call PATCH {action:'reject', reason}` → toast 'Lot rejected — farmer notified'; **Rejected** `DayGroup` below Aggregated listing rejected lots with reason sub; aggregated rows gain a small `JourneyTracker` (Graded→Funded→Paid mapped from order status).
- [ ] **EnrolTab:** farmer rows gain history chips (`{n} cycles` from delivered-lot count in state, `L{level}`, `{rate}% advance` via `advanceRateFor`); terms footer shows the selected farmer's actual rate; the advance preview uses `advanceRateFor(farmer.creditScore)` (matching the API change — verify preview === actual in the flow); contract rows gain buyer org sub + PhotoThumb.
- [ ] **WalletTab:** summary chips row (This week / All time totals); ledger under DayGroup.
- [ ] **ProfileTab:** reputation row (★×reputation), coverage area row ('Kano North LGA cluster'), farmers-served stat (count of distinct enrolled farmers from state), member-since.
- [ ] **Verify + screenshots:** Today with queue + a rejected lot visible (use seed's Bello rejection + reject one live), grade sheet with reject picker open, Enrol with history chips, Wallet, Profile. Full suite + build green.
- [ ] Commit: `git add -A && git commit -m "feat(agent-app): hybrid upgrade — reject flow, credit-aware enrol, journey chips"`

### Task 8: Buyer app overhaul

**Files:** Modify `src/apps/buyer/{BuyerApp,OrdersTab,PostTab,AccountTab}.tsx`.

- [ ] **BuyerApp:** same Toast/status/online wiring.
- [ ] **OrdersTab:** contract section header becomes a compact `PhotoCard` strip (height 72, crop image, label `{Crop} · grade {g}`, sub `band`, badge = status Chip); fill row keeps Progress; lot rows gain PhotoThumb + **grade-variance note** (`sub: 'graded B vs contract A'` + warning Chip when different); delivered orders collapse under `DayGroup 'History'` (most recent first below active); keep per-order footers/actions/errors; escrow/payout success → toasts.
- [ ] **PostTab:** crop picker becomes the 12-crop `PhotoCard` grid; add `Segmented` grade picker (A/B/C → posted in body) and window `Stepper` 7–30 days `step={1}` (posted as `windowDays`); band steppers unchanged; post success toast.
- [ ] **AccountTab:** org card (initials avatar, org + contact rows); stats chips (total volume delivered, total spend from delivered orders, active contracts count — computed from state); wallet row; settings EmptyState stays.
- [ ] **Verify + screenshots:** Orders with history + active order + variance case (grade one lot B against an A contract live), Post grid with grade/window fields, Account. Suite + build green.
- [ ] Commit: `git add -A && git commit -m "feat(buyer-app): hybrid upgrade — photo pipeline, variance, real form fields"`

### Task 9: Final verification + deploy

- [ ] **Step 1:** Full suites: `npm test`, `npm run test:e2e`, `npx tsc --noEmit`, `npm run build` — all green; `npm run lint` not worse than baseline.
- [ ] **Step 2:** Seeded three-window live-sync run (hero script end-to-end through the new UIs) + state screenshots: each app's each tab, PLUS skeleton (first paint), offline banner (DevTools offline or `window.dispatchEvent(new Event('offline'))` via Playwright), rejected-lot states, busy-marketplace richness visible (Sani/Amina/Bello history). Read every png.
- [ ] **Step 3:** Whole-implementation review (fresh reviewer, spec coverage sweep incl. the §7 a11y checklist item-by-item).
- [ ] **Step 4:** Push branch; PR to master; after approval/merge: `vercel deploy --prod`; live hero-flow verification; `POST /api/admin/reset` on prod.

---

## Self-Review notes

- **Spec coverage:** §2→Task 5; §3→Tasks 1–2; §4→Task 3; §5→Task 4; §6→Tasks 6–8; §7 a11y→component contracts in Task 5 + review gate in Task 9; §8→Tasks 3–4 tests + Task 9.
- **Hero-math invariants:** Musa creditScore 8 (L1/40%) in Task 3; delta assertions keep exact scripted numbers; tomato has no seeded contracts.
- **Type consistency:** `Crop` from `crops.ts` used by PhotoThumb/PhotoCard; `creditLevel`/`advanceRateFor` shared by UI and enrollments route; `indexHistory` helper added once in `useAppState.ts` (Task 6) and reused by agent/buyer tabs.
- **Known judgment call:** app-tab compositions are specified by checklist + component contracts rather than full JSX (house pattern is established across 11 reviewed files); every data derivation, prop, and copy string is specified.
