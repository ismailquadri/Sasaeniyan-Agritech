# Sasaeniyan Agritech — pitch demo

A functional demo of a **demand-first offtake + embedded-finance** platform for
Northern-Nigeria perishable-crop smallholders. One live run shows the full loop
across three actors, updating live across screens:

- **`/phone`** — Farmer (Musa / Hauwa): feature-phone **USSD** in Hausa + **SMS** inbox
- **`/agent`** — Agent (Ibrahim): installable **PWA** — register, enrol + advance, grade, aggregate
- **`/buyer`** — Buyer (Mrs. Okafor): post demand, watch supply fill live, fund escrow
- **`/admin`** — Presenter: impact metrics (income uplift, loss avoided, GMV, revenue split) + **Reset demo**
- **`/`** — launcher

> **Simulated & labeled:** USSD/telco, payment settlement, and NDFR verification are
> mocked for the demo. Production runs over Africa's Talking + a licensed PSP.

## Architecture

Single **Next.js (App Router, TypeScript)** app. Thin `/api/*` route handlers validate
with zod, call isolated `src/domain/*` services (pricing, finance, escrow, USSD, metrics —
all unit-tested, money in integer kobo), and persist via **Prisma + Postgres**. Every
mutation publishes a **Server-Sent Event**; all open surfaces refetch within ~1–2s
(polling fallback if SSE drops).

```
src/domain/*      pure business logic (TDD)      src/app/api/*   thin adapters + publish()
src/realtime/hub  SSE publish/subscribe          src/lib/useAppState  live client state
prisma/schema     data model                     src/domain/seed  deterministic demo cast
```

## Prerequisites

- Node 20+
- Docker (for local Postgres) — or a Neon connection string

## Run locally (development)

```bash
docker compose up -d                 # Postgres on host port 5433
cp .env.example .env                 # DATABASE_URL points at localhost:5433
npx prisma migrate deploy            # apply migrations (non-destructive)
npm install
npm run seed                         # load the demo cast
npm run dev                          # http://localhost:3000
```

Open `/buyer`, `/agent`, and `/phone` in three windows side by side to see live sync.

## Run offline (venue backup — no internet)

Fully self-contained; works with venue wifi down.

```bash
docker compose up -d
npx prisma migrate deploy && npm run seed
npm run build
npm start                            # production server on :3000
```

During the pitch, use the **Reset demo** button on `/admin` to return to a clean cast
between runs (this uses the app's own reset — always available).

## Demo script (~4 min, Scenario 1)

1. **Buyer** posts demand (tomato, Grade A, band ₦5,000–₦9,000, 50 baskets).
2. **Agent** enrols Musa (20 baskets) and disburses a 40% input advance (₦40,000).
3. **Phone**: Musa dials `*347*55#` → 1 (sell) → tomato → 12 baskets → hears the **fair
   price (₦5,000)** vs the middleman glut price (₦3,000) → 1 (accept).
4. **Agent** grades the lot A; the **buyer** dashboard fills live.
5. **Buyer** funds escrow → confirms delivery → Musa's wallet is credited, the advance
   is auto-netted, and an itemised **SMS receipt** arrives (SMS tab).
6. **Admin**: income uplift %, loss avoided, GMV, revenue split.

Expected ledger for the run above: Musa ₦57,000 (advance + net payout ₦17,000),
agent ₦1,200 (2% commission), platform ₦1,800 (3% fee, advance recouped).

## Tests

```bash
npm test          # domain unit tests (no DB)
npm run test:e2e  # hero-path integration test — drives the real handlers against Postgres
```

The e2e test resets via the app's own seed module and asserts the full ledger settles.

## Deploy to Vercel + Neon

1. Create a **Neon** Postgres database; copy its pooled connection string.
2. In the Vercel project, set `DATABASE_URL` to the Neon string.
3. Apply schema + seed against Neon (run once, locally):
   ```bash
   DATABASE_URL="<neon-url>" npx prisma migrate deploy
   DATABASE_URL="<neon-url>" npm run seed
   ```
4. Push to GitHub and import the repo into Vercel. `postinstall` runs `prisma generate`
   automatically during the build. Deploy and verify the hero flow on the live URL.

## Note on `npm run db:reset`

`db:reset` runs `prisma migrate reset`, which **drops and recreates the database**.
Prisma's CLI refuses this when invoked by an AI coding agent, so run it yourself from a
normal shell when you want a full wipe. For day-to-day resets (including during the demo),
use the **Reset demo** button on `/admin` — it re-seeds without touching migrations.
