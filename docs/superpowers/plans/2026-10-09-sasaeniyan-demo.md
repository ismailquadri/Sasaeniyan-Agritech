# Sasaeniyan Agritech Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional pitch demo of a demand-first offtake + embedded-finance platform for Northern-Nigeria perishable-crop smallholders, showing the full loop (Farmer/USSD · Agent/PWA · Buyer/web) updating live across screens.

**Architecture:** One Next.js (App Router, TS) app with four surfaces (`/phone`, `/agent`, `/buyer`, `/admin`) over thin API route handlers that call isolated `domain/*` services; Prisma + Postgres single source of truth; SSE for live cross-actor sync.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, Postgres (Neon on Vercel / Docker local), Vitest, SSE.

**Build order (thin-slice first):** Foundation → data model + seed → domain services (TDD) → SSE → APIs → UI surfaces → live-sync wiring → tests/deploy → polish & SHOULD items.

**Spec:** `docs/superpowers/specs/2026-10-09-sasaeniyan-demo-design.md`

---

## Phase 0 — Project Foundation

### Task 0.1: Scaffold Next.js app
**Files:** creates project files at repo root (`/Users/quadri/Sasaeniyan-Agritech`).

- [ ] **Step 1:** From repo root run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack
```
Accept overwrite prompts for the existing dir; keep `docs/`.
- [ ] **Step 2:** Verify dev server: `npm run dev` → open http://localhost:3000 → default page loads. Ctrl-C.
- [ ] **Step 3:** Install deps:
```bash
npm i prisma @prisma/client zod
npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths @types/node
```
- [ ] **Step 4:** Commit:
```bash
git add -A && git commit -m "chore: scaffold Next.js app with Tailwind + TS"
```

### Task 0.2: Vitest config
**Files:** Create `vitest.config.ts`, `src/test/setup.ts`.

- [ ] **Step 1:** Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: 'node', globals: true, include: ['src/**/*.test.ts'] },
})
```
- [ ] **Step 2:** Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] **Step 3:** Create `src/test/sanity.test.ts`:
```ts
import { expect, test } from 'vitest'
test('sanity', () => { expect(1 + 1).toBe(2) })
```
- [ ] **Step 4:** Run `npm test` → expect 1 passing. Delete sanity test.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "chore: vitest setup"`

### Task 0.3: Postgres (Docker local) + env
**Files:** Create `docker-compose.yml`, `.env`, `.env.example`.

- [ ] **Step 1:** `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: sasa
      POSTGRES_PASSWORD: sasa
      POSTGRES_DB: sasaeniyan
    ports: ["5432:5432"]
    volumes: ["sasa_pg:/var/lib/postgresql/data"]
volumes: { sasa_pg: {} }
```
- [ ] **Step 2:** `.env` (gitignored) and `.env.example` (committed, no secrets):
```
DATABASE_URL="postgresql://sasa:sasa@localhost:5432/sasaeniyan?schema=public"
```
- [ ] **Step 3:** `docker compose up -d` → `docker ps` shows postgres healthy.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "chore: local postgres + env"`

---

## Phase 1 — Data Model & Seed

### Task 1.1: Prisma schema
**Files:** Create `prisma/schema.prisma`.

- [ ] **Step 1:** `npx prisma init --datasource-provider postgresql` (keep existing `.env`).
- [ ] **Step 2:** Write `prisma/schema.prisma` models per spec §3: Farmer, Agent, Buyer, Contract, Enrollment, Advance, Lot, Order, Wallet, LedgerEntry, EscrowAccount, MarketIndex, Message, Event. Example core excerpt:
```prisma
model Wallet {
  id        String        @id @default(cuid())
  ownerType String        // farmer|agent|buyer|platform
  ownerId   String
  balance   Int           @default(0) // kobo
  ledger    LedgerEntry[]
}
model Contract {
  id           String       @id @default(cuid())
  buyerId      String
  buyer        Buyer        @relation(fields: [buyerId], references: [id])
  crop         String
  grade        String
  volume       Int          // baskets
  bandMin      Int          // kobo per basket
  bandMax      Int
  windowStart  DateTime
  windowEnd    DateTime
  status       String       @default("open")
  filledVolume Int          @default(0)
  enrollments  Enrollment[]
}
```
Define the remaining models with the fields listed in spec §3 (use `Int` kobo for money, `String` cuid ids, relations wired both ways). Add `Event { id String @id @default(cuid()) type String payload Json createdAt DateTime @default(now()) }`.
- [ ] **Step 3:** `npx prisma migrate dev --name init` → migration applies.
- [ ] **Step 4:** Create `src/lib/db.ts`:
```ts
import { PrismaClient } from '@prisma/client'
const g = globalThis as unknown as { prisma?: PrismaClient }
export const db = g.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') g.prisma = db
```
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(db): prisma schema + client"`

### Task 1.2: Money + i18n primitives
**Files:** Create `src/lib/money.ts`, `src/domain/i18n/strings.ts`, tests.

- [ ] **Step 1:** Write `src/lib/money.test.ts`:
```ts
import { expect, test } from 'vitest'
import { naira, formatNaira } from './money'
test('naira converts to kobo', () => { expect(naira(6200)).toBe(620000) })
test('formatNaira formats kobo', () => { expect(formatNaira(620000)).toBe('₦6,200') })
```
- [ ] **Step 2:** Run → fails. 
- [ ] **Step 3:** `src/lib/money.ts`:
```ts
export const naira = (n: number) => Math.round(n * 100)
export const formatNaira = (kobo: number) =>
  '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })
```
- [ ] **Step 4:** Run → passes.
- [ ] **Step 5:** `src/domain/i18n/strings.ts`: a `t(key, lang)` with a Hausa-first dictionary (`ha`, `pcm`, `en`) covering USSD/SMS keys (welcome, priceOffer, confirmPickup, paymentReceipt). Minimal to start; extend in Phase 8.
- [ ] **Step 6:** Commit: `git add -A && git commit -m "feat: money + i18n primitives"`

### Task 1.3: Seed script (demo cast)
**Files:** Create `prisma/seed.ts`; add `"seed"` + `"db:reset"` scripts.

- [ ] **Step 1:** Write `prisma/seed.ts` creating the deterministic cast: Buyer (Mrs. Okafor / "Northern Foods Ltd"), Agent (Ibrahim), Farmers (Musa, Hauwa), wallets for each + platform, MarketIndex rows for tomato/pepper/onion reflecting a glut (tomato index low vs. contract band), no contracts yet. Use fixed ids (`farmer_musa`, etc.) for demo determinism.
- [ ] **Step 2:** Add scripts: `"seed": "tsx prisma/seed.ts"`, `"db:reset": "prisma migrate reset --force && npm run seed"`. Install `tsx`: `npm i -D tsx`.
- [ ] **Step 3:** Run `npm run seed` → rows created (verify with `npx prisma studio`).
- [ ] **Step 4:** Commit: `git add -A && git commit -m "feat(db): demo seed cast"`

---

## Phase 2 — Domain Services (TDD)

> All domain services are pure/DB-thin and unit-tested. Money in kobo (integers).

### Task 2.1: Pricing engine
**Files:** Create `src/domain/pricing/pricing.ts` + `.test.ts`.

- [ ] **Step 1:** Write `pricing.test.ts`:
```ts
import { expect, test } from 'vitest'
import { fairPrice, gradeFactor } from './pricing'
test('grade A full index', () => { expect(gradeFactor('A')).toBe(1) })
test('clamps to band min', () => {
  // index*factor below band → clamp up to band min
  expect(fairPrice({ indexPrice: 300000, grade: 'A', bandMin: 500000, bandMax: 900000 })).toBe(500000)
})
test('clamps to band max', () => {
  expect(fairPrice({ indexPrice: 1200000, grade: 'A', bandMin: 500000, bandMax: 900000 })).toBe(900000)
})
test('grade B discounts', () => {
  expect(fairPrice({ indexPrice: 700000, grade: 'B', bandMin: 400000, bandMax: 900000 })).toBe(595000)
})
```
- [ ] **Step 2:** Run → fails.
- [ ] **Step 3:** Implement:
```ts
export type Grade = 'A' | 'B' | 'C'
export const gradeFactor = (g: Grade) => ({ A: 1, B: 0.85, C: 0.7 }[g])
export function fairPrice(i: { indexPrice: number; grade: Grade; bandMin: number; bandMax: number }) {
  const raw = Math.round(i.indexPrice * gradeFactor(i.grade))
  return Math.min(Math.max(raw, i.bandMin), i.bandMax)
}
export function priceBreakdown(i: { indexPrice: number; grade: Grade; bandMin: number; bandMax: number }) {
  return { index: i.indexPrice, grade: i.grade, factor: gradeFactor(i.grade), band: [i.bandMin, i.bandMax], price: fairPrice(i) }
}
```
- [ ] **Step 4:** Run → passes.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(domain): fair-price engine"`

### Task 2.2: Finance (advance + netting)
**Files:** Create `src/domain/finance/finance.ts` + `.test.ts`.

- [ ] **Step 1:** Write `finance.test.ts`:
```ts
import { expect, test } from 'vitest'
import { maxAdvance, netPayout } from './finance'
test('advance capped at 40% of planned value', () => {
  expect(maxAdvance({ plannedVolume: 20, bandMin: 500000, rate: 0.4 })).toBe(4000000)
})
test('net payout subtracts advance, fee, commission', () => {
  expect(netPayout({ saleValue: 10800000, advance: 2200000, feeRate: 0.03, commissionRate: 0.02 }))
    .toEqual({ platformFee: 324000, agentCommission: 216000, advanceNetted: 2200000, farmerPayout: 8060000 })
})
```
- [ ] **Step 2:** Run → fails.
- [ ] **Step 3:** Implement `maxAdvance` = `round(rate*plannedVolume*bandMin)`; `netPayout` computing fee=round(saleValue*feeRate), commission=round(saleValue*commissionRate), farmerPayout=saleValue-fee-commission-advance.
- [ ] **Step 4:** Run → passes.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(domain): finance advance + netting"`

### Task 2.3: Escrow state machine
**Files:** Create `src/domain/escrow/escrow.ts` + `.test.ts`.

- [ ] **Step 1:** Test transitions: `none→funded` on fund; `funded→released` on confirmDelivery; illegal transitions throw.
- [ ] **Step 2:** Run → fails.
- [ ] **Step 3:** Implement pure reducer `escrowReduce(state, action)` with states `['none','funded','released']` and guarded actions `fund|release`.
- [ ] **Step 4:** Run → passes.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(domain): escrow state machine"`

### Task 2.4: USSD session state machine
**Files:** Create `src/domain/notify/ussd.ts` + `.test.ts`.

- [ ] **Step 1:** Test: given a session + keypad input, returns next prompt (Hausa) + any emitted action. Flow: main menu → "1 Sayar da amfani" (sell) → choose crop → enter baskets → hear fair price → "1 Amince" (accept) → confirmation. Assert accept step emits `{action:'ACCEPT_HARVEST', crop, baskets}`.
- [ ] **Step 2:** Run → fails.
- [ ] **Step 3:** Implement `ussdStep(session, input): { session, prompt, action? }` as a pure reducer keyed by `session.step`. Prompts come from i18n (`ha` default).
- [ ] **Step 4:** Run → passes.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(domain): USSD session machine"`

### Task 2.5: Impact metrics
**Files:** Create `src/domain/metrics/metrics.ts` + `.test.ts`.

- [ ] **Step 1:** Test `incomeUplift({ ourPrice, middlemanPrice })` = `(our-mm)/mm`; `revenueSplit({ saleValue, feeRate, financeSpread })`.
- [ ] **Step 2–4:** Fail → implement → pass.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(domain): impact metrics"`

---

## Phase 3 — Realtime SSE Hub

### Task 3.1: In-memory event hub + SSE route
**Files:** Create `src/realtime/hub.ts`, `src/app/api/events/route.ts`.

- [ ] **Step 1:** `src/realtime/hub.ts`: a module-level `Set<ReadableStreamDefaultController>`; `publish(event)` writes `data: JSON\n\n` to all; `subscribe(controller)`/`unsubscribe`. Also persist event via `db.event.create` (best-effort).
- [ ] **Step 2:** `src/app/api/events/route.ts`: `GET` returns a `text/event-stream` ReadableStream, subscribes controller, cleans up on cancel. `export const dynamic = 'force-dynamic'`.
- [ ] **Step 3:** Manual check: `curl -N localhost:3000/api/events` stays open. (Add a temporary publish to verify, then remove.)
- [ ] **Step 4:** Create `src/lib/useEvents.ts` client hook: opens `EventSource('/api/events')`, calls `onEvent`; polling fallback (`setInterval` fetch `/api/state`) if `EventSource` errors.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(realtime): SSE hub + client hook"`

---

## Phase 4 — API Route Handlers (thin adapters)

> Each handler validates with zod, calls domain + db in a transaction, then `publish()` an event. Keep handlers <40 lines.

### Task 4.1: State + contracts APIs
**Files:** Create `src/app/api/state/route.ts`, `src/app/api/contracts/route.ts`.

- [ ] **Step 1:** `GET /api/state` → aggregate snapshot (farmers, contracts, lots, orders, wallets, messages) for dashboards + polling fallback.
- [ ] **Step 2:** `POST /api/contracts` (buyer posts demand): zod-validate {crop,grade,volume,bandMin,bandMax,window}; create Contract; publish `CONTRACT_CREATED`.
- [ ] **Step 3:** Smoke test each with `curl`; verify event appears on the SSE stream.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "feat(api): state + contracts"`

### Task 4.2: Enrollment + advance API
**Files:** Create `src/app/api/enrollments/route.ts`.

- [ ] **Step 1:** `POST /api/enrollments` {contractId, farmerId, agentId, plannedVolume, withAdvance}: create Enrollment; if withAdvance, compute `maxAdvance`, create Advance, credit farmer wallet + LedgerEntry (`advance`); publish `ENROLLED` + `ADVANCE_ISSUED`.
- [ ] **Step 2:** `curl` test: farmer wallet increases by advance.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "feat(api): enrollment + advance"`

### Task 4.3: USSD + harvest API
**Files:** Create `src/app/api/ussd/route.ts`.

- [ ] **Step 1:** `POST /api/ussd` {phone, sessionId, input}: load/seed session; call `ussdStep`; when action `ACCEPT_HARVEST`, compute `fairPrice` from MarketIndex + the farmer's open contract band + grade default A, create Lot(status `picked`), create a `priceOffer`+`accepted` Message (SMS), publish `HARVEST_ACCEPTED`. Return next prompt.
- [ ] **Step 2:** Test full USSD flow via `curl` sequence → ends with a Lot + SMS row.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "feat(api): USSD harvest flow"`

### Task 4.4: Aggregation + grading API
**Files:** Create `src/app/api/lots/route.ts`.

- [ ] **Step 1:** `PATCH /api/lots/:id` (agent grades/aggregates): set grade (recompute unitPrice via `fairPrice`), set status `aggregated`, attach to Order (create if none for contract), update `contract.filledVolume`; publish `LOT_GRADED`/`ORDER_UPDATED`.
- [ ] **Step 2:** `curl` test; buyer state reflects fill.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "feat(api): aggregation + grading"`

### Task 4.5: Escrow + payout API
**Files:** Create `src/app/api/escrow/route.ts`, `src/app/api/payout/route.ts`.

- [ ] **Step 1:** `POST /api/escrow` {orderId}: buyer funds escrow (debit buyer wallet, EscrowAccount `funded`); publish `ESCROW_FUNDED`.
- [ ] **Step 2:** `POST /api/payout` {orderId}: confirm delivery → escrow `released`; for each lot compute `netPayout`, credit farmer wallet (net), credit agent commission, mark Advance `netted`, create `paymentReceipt` Message (itemized, Hausa), set Order `delivered`; publish `PAID`.
- [ ] **Step 3:** `curl` end-to-end: farmer wallet = advance + netPayout; SMS receipt row present.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "feat(api): escrow + payout + netting"`

---

## Phase 5 — UI Surfaces

> Shared: `src/components/*` (Button, Card, Badge, Stat, PriceBreakdown). Warm African-modern theme in `tailwind.config` + `globals.css` (green/gold). Use the live `useEvents` hook to refetch `/api/state` on any event. **During this phase, invoke a UI design skill (e.g. `ui-ux-pro-max` or `high-end-visual-design`) for visual polish.**

### Task 5.1: Theme + shared components + home
- [ ] **Step 1:** Configure Tailwind theme tokens (earthy green `#2E6B3E`-ish, gold `#E8B04B`, high-contrast text). Add Inter/− display font.
- [ ] **Step 2:** Build shared components (Button, Card, Stat, Badge, PriceBreakdown).
- [ ] **Step 3:** Home `/` = launcher linking the 4 surfaces with persona labels.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "feat(ui): theme + shared components + launcher"`

### Task 5.2: Buyer dashboard `/buyer`
- [ ] **Step 1:** Form to post demand (POST /api/contracts). List contracts with live fill %, incoming graded lots (traceable origin: farmer name, geo, NDFR badge), and a "Fund escrow / Confirm delivery" control. Subscribes to events.
- [ ] **Step 2:** Manual check against seeded data.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "feat(ui): buyer dashboard"`

### Task 5.3: Agent PWA `/agent`
- [ ] **Step 1:** Open contracts list; register farmer form; enroll-farmer-with-advance; lot pickup + grade control; aggregation view. Add PWA manifest + service worker (cache shell + last `/api/state`) for offline.
- [ ] **Step 2:** Manual check; toggle offline in devtools → shell still loads.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "feat(ui): agent PWA"`

### Task 5.4: Farmer phone `/phone`
- [ ] **Step 1:** Realistic feature-phone frame with: a **USSD dialer** that POSTs to `/api/ussd` and renders prompts (Hausa) step-by-step, and an **SMS inbox** rendering that phone's Messages live. Prominent "Simulated — production via Africa's Talking" label. Show middleman glut price vs. our fair price for contrast.
- [ ] **Step 2:** Manual check: run the USSD sell flow; SMS receipt appears after payout.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "feat(ui): farmer phone (USSD + SMS)"`

### Task 5.5: Admin `/admin`
- [ ] **Step 1:** Impact dashboard (income uplift %, loss avoided, GMV, revenue split from `domain/metrics`) + "Reset demo" button (`POST /api/admin/reset` → re-run seed) + event log.
- [ ] **Step 2:** Commit: `git add -A && git commit -m "feat(ui): admin impact + reset"`

---

## Phase 6 — Live-Sync Integration & Hero Path

### Task 6.1: Cross-actor live sync verification
- [ ] **Step 1:** Open `/buyer`, `/agent`, `/phone` in three windows. Run the full hero flow manually; confirm each action propagates to the others within ~2s via SSE.
- [ ] **Step 2:** Fix any missing `publish()` calls / stale state.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "fix: live cross-actor sync"`

### Task 6.2: Scripted hero-path e2e test
**Files:** Create `src/test/hero-path.test.ts`.
- [ ] **Step 1:** Write a test that drives the APIs in order (seed → contract → enroll+advance → ussd accept → grade → escrow → payout) and asserts: Lot delivered, farmer wallet = advance + netPayout, contract.filledVolume increased, paymentReceipt Message exists. Use a test DB (`DATABASE_URL` test schema) reset before run.
- [ ] **Step 2:** Run → passes.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "test: hero-path end-to-end"`

---

## Phase 7 — Deploy & Backup

### Task 7.1: Vercel + Neon
- [ ] **Step 1:** Create a Neon Postgres DB; set `DATABASE_URL` in Vercel project env. `npx prisma migrate deploy` against Neon; run seed once (`DATABASE_URL=<neon> npm run seed`).
- [ ] **Step 2:** Push to GitHub remote `https://github.com/ismailquadri/Sasaeniyan-Agritech.git`; import to Vercel; deploy; verify the live URL runs the hero flow.
- [ ] **Step 3:** Commit any config: `git commit -am "chore: vercel + neon deploy config"`

### Task 7.2: Local offline backup
- [ ] **Step 1:** Document in `README.md`: `docker compose up -d && npm run db:reset && npm run build && npm start` → fully offline demo. Verify with wifi off.
- [ ] **Step 2:** Commit: `git add -A && git commit -m "docs: local backup runbook"`

---

## Phase 8 — Polish & SHOULD Items (only if ahead of schedule)

- [ ] **8.1 Hausa copy pass** — complete all USSD/SMS/UI strings in Hausa; Pidgin/EN toggle. Commit.
- [ ] **8.2 IVR / Hauwa inclusion** — voice-prompt styled flow + pay-to-her-own-wallet beat. Commit.
- [ ] **8.3 NDFR verified badge** — mock verification toggle + badge on buyer traceability. Commit.
- [ ] **8.4 Credit flywheel** — bump `creditScore` on completed cycle; show higher next-cycle advance cap. Commit.
- [ ] **8.5 Visual polish** — invoke UI design skill; refine the three surfaces for projector impact. Commit.
- [ ] **8.6 Demo rehearsal** — walk the §9 script end-to-end; time it; fix rough edges. Commit.

---

## Self-Review notes
- **Spec coverage:** MUST stories map to Phases 1–7 — US1.1/1.2→4.3/5.4 & 4.2/5.3; US2.x→4.1/4.2/5.2; US3.x→2.1/4.3/5.4; US4.x→4.4/5.3; US5.x→2.2/4.2/4.5; US6.x→4.5/5.4; US9.x→4.4/5.2; US10.1→Phase 3 & 6; US10.2/10.3→5.5/4.1. SHOULD→Phase 8.
- **Money:** integer kobo everywhere (`naira()`), formatted only at the edge.
- **Mocked/labeled:** USSD, payments, NDFR — all simulated and labeled per spec non-goals.
- **No hidden caps:** Phase 8 is explicitly "only if ahead"; WON'T items remain roadmap-only.
