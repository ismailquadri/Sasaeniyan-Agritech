# Sasaeniyan Agritech — Demo Technical Design Spec

**Date:** 2026-10-09
**Status:** For review → then implementation plan
**Grounds:** `docs/research/01-market-validation-brief.md`, `docs/product/02-personas-journeys-scenarios.md`, `docs/product/03-epics-features-stories.md`

## 1. Objective
Build a **functional, market-ready pitch demo** of the demand-first offtake + embedded-finance platform for Northern-Nigeria perishable-crop smallholders. One live run must show the **full loop across all three actors** (Farmer · Agent · Buyer) with real business logic, updating live across screens. Deployed to Vercel with an offline local backup.

**Non-goals (explicit, honest roadmap):** real USSD/telco, live NDFR API, real payment settlement, full KYC/credit underwriting, logistics optimization. These are **simulated/mocked** and labeled as such.

## 2. Architecture
Single **Next.js (App Router) + TypeScript** application, four surfaces sharing one backend and database:

- `/phone` — **Farmer surface:** realistic on-screen feature-phone that runs the **USSD session** (`*code#`, Hausa menus) and shows an **SMS inbox**. This is the Musa/Hauwa experience. Clearly labeled "Simulated — production via Africa's Talking."
- `/agent` — **Agent PWA (Ibrahim):** farmer registration, enrollment to contracts, lot pickup + grading, aggregation. Installable, offline-capable (service worker + cache), syncs on reconnect.
- `/buyer` — **Buyer dashboard (Mrs. Okafor):** post forward demand, live supply pipeline, traceable graded lots, escrow pay.
- `/admin` — **Presenter tools:** impact dashboard (income uplift, loss avoided, GMV, revenue split) + one-click demo **seed/reset**.

**Backend:** Next.js Route Handlers (`/api/*`) encapsulating domain services. **No business logic in the UI.**

**Real-time cross-actor sync (E10 — the demo's magic):** Server-Sent Events (`/api/events` stream) with a short-polling fallback. Any state mutation publishes an event; all open surfaces update within ~1–2s. (SSE chosen over WebSockets: simpler, Vercel-friendly, one-way is sufficient.)

**Data layer:** **Prisma + Postgres.** Vercel → Neon serverless Postgres. Local offline backup → Postgres in Docker (`docker compose up`), seeded identically. Single provider, no dual-schema hacks.

### Module boundaries (each independently testable)
| Module | Responsibility | Depends on |
|---|---|---|
| `domain/pricing` | Fair-price engine: `price = f(contract band, market index, grade)` | market index data |
| `domain/finance` | Advance issuance (capped by contract), repayment netting | contracts, wallets |
| `domain/escrow` | Escrow state machine: funded → released on delivery | payments, orders |
| `domain/offtake` | Contracts, enrollment, demand↔supply matching | farmers, contracts |
| `domain/aggregation` | Lots, grading, roll-up to orders | farmers, orders |
| `domain/wallet` | Balances, ledger entries, payouts | — |
| `domain/notify` | USSD session state machine + SMS message generation (Hausa/Pidgin/EN) | i18n |
| `domain/identity` | Farmer/agent/buyer profiles, mock NDFR/NIN verification | — |
| `realtime` | SSE hub: publish/subscribe domain events | all domains |
| `i18n` | Hausa-first strings, Pidgin/EN toggle, number/price formatting | — |

Each domain module exposes a small typed service interface; Route Handlers are thin adapters; UI calls APIs only. This keeps units small, isolated, and testable.

## 3. Data model (Prisma, core entities)
- **Farmer** (id, name, phone, language, geoPoint, crop, ndfrVerified, walletId, creditScore)
- **Agent** (id, name, phone, walletId, reputation)
- **Buyer** (id, orgName, contactName, walletId)
- **Contract** (id, buyerId, crop, grade, volume, priceBandMin/Max, windowStart/End, status, filledVolume)
- **Enrollment** (id, contractId, farmerId, agentId, plannedVolume, advanceId?)
- **Advance** (id, enrollmentId, amount, status[issued|netted], issuedAt)
- **Lot** (id, enrollmentId, agentId, quantity, grade, unitPrice, status[picked|aggregated|delivered], traceRef)
- **Order** (id, contractId, lots[], status, deliveredAt)
- **Wallet** (id, ownerType, ownerId, balance) + **LedgerEntry** (walletId, amount, type, ref)
- **EscrowAccount** (id, orderId, amount, status[funded|released])
- **MarketIndex** (crop, date, indexPrice) — seeded from research figures
- **Message** (id, toPhone, channel[USSD|SMS|IVR], lang, body, createdAt) — the farmer-facing comms log
- **Event** (id, type, payload, createdAt) — audit + SSE source

## 4. Core business logic (real, not faked)
- **Fair price:** `unitPrice = clamp(marketIndex[crop] × gradeFactor, contract.bandMin, contract.bandMax)`. Shown with a plain-language breakdown (the anti-asymmetry feature). Grade factors e.g. A=1.0, B=0.85, C=0.7.
- **Advance:** `amount ≤ advanceRate × (plannedVolume × contract.bandMin)` (e.g., 40%). Issued at enrollment; recorded against the contract (offtake-backed — never retail).
- **Repayment netting at payout:** `farmerPayout = saleValue − outstandingAdvance − platformFee − agentCommission`; SMS receipt itemizes every line.
- **Escrow:** buyer funds on order; releases to farmer wallet(s) + agent commission on delivery confirmation.
- **Credit flywheel:** completed cycle → `creditScore += f(reliability)` → higher future advance cap (retention/moat; SHOULD-tier).
- **Impact metrics:** income uplift = `(ourPrice − middlemanPrice) / middlemanPrice`; loss avoided; GMV; revenue = take + finance spread + (mock) input margin.

## 5. Channels & i18n
- **USSD simulator:** server-side session state machine (step → prompt → input), Hausa default. Realistic `*347*...#` styling.
- **SMS:** every money/produce event emits a Message; rendered in the phone's SMS inbox; readable without "data."
- **IVR (SHOULD):** scripted Hausa voice prompts with keypad input for Hauwa's low-literacy path.
- **i18n:** Hausa-first dictionary; Pidgin + English toggle; the phone surface defaults to Hausa.

## 6. UI / visual
Warm, trustworthy, African-modern: earthy green/gold palette, bold friendly type, strong iconography, high contrast for low-literacy legibility. Tailwind + a small component kit. A UI/design skill will be used during build for polish. Three visually distinct but cohesive surfaces so judges instantly read "three real users."

## 7. Deployment & ops
- **Vercel** (Next.js) + **Neon Postgres**; env via `.env`.
- **Local backup:** `docker compose up` (local Postgres) + `npm run build && npm start`; seed script loads demo data; works with venue wifi down.
- **Seed/reset:** `/admin` button + `npm run seed` → deterministic demo cast (Musa, Hauwa, Ibrahim, Mrs. Okafor, a glut-priced market index).

## 8. Testing
- Unit tests (Vitest) for every `domain/*` service: pricing clamps, advance caps, netting math, escrow transitions, USSD session steps. These are pure functions — high ROI, fast.
- A scripted **end-to-end happy-path** check for Scenario 1 (the hero run) so the demo can't silently break.
- Manual verification of live SSE sync across three browser windows.

## 9. Demo script (Scenario 1 + supporting, ~4 min)
1. Buyer posts demand (tomato, Grade A, price band). 2. Agent enrolls Musa, disburses input advance. 3. On the phone, Musa dials `*code#` (Hausa), signals harvest, hears transparent fair price (vs. middleman glut price shown for contrast), accepts. 4. Agent grades & aggregates the lot; buyer dashboard fills live. 5. Buyer funds escrow → delivery confirmed → Musa's wallet credited, advance auto-netted, SMS receipt. 6. Admin impact dashboard: income uplift %, loss avoided, revenue split. 7. (If built) Hauwa IVR inclusion beat + NDFR-verified badge + credit flywheel.

## 10. Risks & mitigations
- **Scope (full loop in <1 wk):** thin-slice build order; MUST slice first; SHOULD/COULD only if ahead.
- **Live-sync fragility on stage:** SSE + polling fallback + local backup + rehearsed reset.
- **Over-claiming to investors:** every simulated/mocked part is labeled; a roadmap slide states what's real vs. next.
- **Name/region nuance:** "Sasaeniyan" reads Yoruba while we launch Hausa-first — flagged for founder; not a blocker.
