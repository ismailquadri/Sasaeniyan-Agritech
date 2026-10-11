# Sasaeniyan — "Hybrid" UI/UX Upgrade (top-tier visual pass)

**Date:** 2026-10-10
**Status:** Approved by founder → ready for implementation plan
**Builds on:** `2026-10-09-ios-native-apps-design.md` (three iOS apps in iPhone 16 Pro frames, merged to master). This spec upgrades their visual richness, data realism, and scenario coverage; it does not change the architecture.

## 1. Objective

Raise the three apps from "clean stock iOS" to **top-tier fintech/agritech register** (direction C "Hybrid", chosen from researched probes): elevated-iOS structure + meaningful produce photography + live status storytelling — plus a rich deterministic dataset, 12-crop catalog with real images, full state coverage (loading/empty/error/offline), and the rejection/credit/busy-marketplace scenarios.

**Unchanged:** domain services, SSE realtime, Prisma schema (no migration), admin page, USSD/Nokia channel, deploy targets. The hero demo script and its exact ledger numbers still work from a clean reset.

## 2. Visual system additions (`src/components/ios/`)

New kit components (consumed by all three apps; all a11y-complete — roles, labels, contrast ≥4.5:1 for text, ≥3:1 for chips/glyphs):

- **`HeroCard`** — gradient wallet card (`linear-gradient(135deg, <from>, <to> 75%)`), per persona: farmer `#2E6B3E→#17402A`, agent `#C05A2E→#7A3418`, buyer `#B8811F→#7A5410`. Contains: label row with trailing chips, 34px `tnum` balance, action row (one gold `#E2A63B` primary + translucent secondaries). Soft colored shadow (`0 6px 16px` tint at 35%).
- **`QuickAction`** — icon + label pill used inside HeroCard's action row (min 44pt).
- **`Chip`** — small status pill with optional leading icon; tones: success/warning/danger/info/neutral/gold + `onDark` variant for use inside HeroCard.
- **`Sparkline`** — pure-SVG polyline from `number[]` (last 7 index prices), stroke `#1F9D4D` rising / `#C0392B` falling; paired delta text `▲ x%` / `▼ x%` colored to match; `aria-label` describes the trend ("tomato up 4% this week").
- **`JourneyTracker`** — horizontal step dots+bars for a lot's lifecycle: `accepted → agent en route → graded → paid` (or `rejected` terminal, danger-colored). Current step pulses (reduced-motion safe). Steps derived from lot status + order status.
- **`PhotoThumb`** — produce image in a rounded square (26–40px, `object-fit:cover`, solid fallback bg per crop, mandatory `alt`).
- **`PhotoCard`** — larger image card with bottom gradient overlay + white label (used in Sell crop grid and buyer lot headers).
- **`Skeleton`** — shimmer blocks (`prefers-reduced-motion`: static); page-level skeleton layouts for each tab's first load (`state` empty + no fetch error).
- **`Banner`** — full-width inline notice: `offline` (gold, "You're offline — showing last known data", driven by `navigator.onLine` + SSE `onerror`), `error` (danger, with Retry button wired to `refetch`).
- **`Toast`** — bottom-floating transient confirmation ("Harvest accepted ✓"), `aria-live="polite"`, auto-dismiss 3.5s; one Toast host per app shell.
- **`DayGroup`** — section header that groups list items by calendar day ("Today", "Yesterday", "8 Oct").

Existing components keep their APIs (Row gains optional `photo` prop that renders a PhotoThumb in place of icon square).

## 3. Crop catalog + imagery (`src/domain/crops.ts` + `public/crops/`)

A typed catalog, single source of truth for crop presentation:

```ts
export interface Crop {
  id: string            // 'tomato'
  name: string          // 'Tomato'
  nameHa: string        // 'Tumatir'
  unit: string          // 'basket' | 'bag' | 'sack'
  unitLabel: string     // '50kg basket'
  photo: string         // '/crops/tomato.jpg'
  fallback: string      // hex bg if image missing
}
```

**12 crops:** tomato, pepper, onion, cabbage, watermelon, cucumber (fresh · basket); maize, rice, sorghum, millet (staples · 100kg bag); groundnut, ginger (cash · sack). Photos are downloaded once from Unsplash (free license) into `public/crops/*.jpg` (~1200px wide, quality-checked by eye) so the **offline venue backup keeps its imagery**. Plain `<img>` with explicit width/height inside the fixed 393px canvas (no next/image: the frame is CSS-transformed and the canvas is fixed-size).

USSD menu stays on the original 3 crops (feature-phone menu depth); the app Sell grid shows all 12 with demand badges.

## 4. Rich deterministic seed (`src/domain/seed/seed.ts` rewrite)

All ids remain fixed strings; `resetDemo()` contract unchanged. Additions:

- **Farmers (5):** Musa (hero, NDFR ✓, creditScore 8 = L1, **zero starting balance** — hero math unchanged), Hauwa (pepper, L1), + Sani Garba (maize, L3, long history), Amina Yusuf (ginger, L2), Bello Adamu (rice, L1, one rejected lot).
- **Buyers (3):** Northern Foods Ltd (Mrs. Okafor — hero buyer, funded ₦5M), Kano Agro Exports (Alhaji Dantata), FreshCo Lagos (Ngozi Eze).
- **Market index:** 7 daily rows per crop (dates: seed day −6 … seed day), deterministic pseudo-random walk (hand-written values, no RNG) with tomato in glut (declining into the band story). Latest-day values preserve the hero numbers (tomato ₦3,000 glut vs ₦5,000 band floor).
- **History (non-hero actors only):** 2 delivered contracts (Sani→Kano Agro maize, Amina→FreshCo ginger) with full order/lot/ledger/receipt trails; 1 filling contract (Bello→Northern Foods rice, partial); 1 **rejected lot** (Bello, reason "moisture above 14% at pickup") with the farmer-facing SMS + `LOT_REJECTED` event; populated SMS inboxes and wallets (Sani ₦184,500; Amina ₦96,200; Bello ₦12,000 advance outstanding).
- **Credit journey data:** creditScore drives a derived level — L1 (0–9), L2 (10–29), L3 (30+); advance rate by level: 40% / 50% / 60% (surfaced in `src/domain/config.ts` as `ADVANCE_RATE_BY_LEVEL`, default path for the hero stays 40%).

**Test impact:** e2e assertions change from absolute balances to **deltas from post-reset snapshots** (hero numbers remain the asserted deltas: Musa +5,700,000, agent +120,000, platform +180,000 from their seed values). The enrolment advance for Musa (L2) at 50% would change hero math — **exception:** to keep the scripted ₦40,000 advance, Musa seeds at L1-boundary creditScore 8 (L1, 40%); Sani demonstrates L3/60% in the agent app instead.

## 5. API changes (three, all small) + rejection/dispute flow

1. `PATCH /api/lots/:id` body becomes `{grade: 'A'|'B'|'C'} | {action: 'reject', reason: string (min 4)}`.
2. `POST /api/messages` — tiny route for the farmer's "Request review" action (below).
3. `POST /api/enrollments` — advance rate derived from the farmer's credit level via `ADVANCE_RATE_BY_LEVEL` (L1 40% keeps every existing number; L3 farmers demo 60% in the agent app).

Reject behavior:
- Reject → `lot.status = 'rejected'`, SMS to farmer (`lotRejected` i18n key: reason + "a jami'in zai sake duba" / review note), `publish LOT_REJECTED`, contract fill unchanged.
- Rejected lots: agent Today shows them under a "Rejected" group with reason; farmer Activity shows a danger chip + **"Request review"** action → `POST /api/messages` (new tiny route) creating a Message (channel `SMS`, to the agent's phone, "review requested") + `REVIEW_REQUESTED` event — demo-level dispute logging, no new tables.
- i18n: add `lotRejected`, `reviewRequested` keys (ha/pcm/en).

## 6. Per-app upgrades

### Farmer
- **Home:** Hausa greeting + location ("Barka da safiya ☀️ · Kano") + avatar with unread dot; HeroCard (balance, NDFR + credit-level chips, gold "Sell harvest", "History" secondary); **active-sale JourneyTracker card** (most recent non-delivered lot, photo + value); market board: photo rows + sparkline + delta + "demand" chip for crops with open contracts, "See all" opens full list (sheet) of 12 crops; recent activity preview (2 items, DayGroup).
- **Sell:** step 1 becomes a **2-col photo-card grid** of all 12 crops (demand badge overlay; non-enrolled crops show "see your agent" footnote); offer sheet adds a 7-day sparkline above the breakdown; Toast on accept.
- **Wallet:** HeroCard variant + **credit journey card** (level, progress to next level, advance cap now vs next); ledger with DayGroup + PhotoThumb per lot receipt; rejected-lot entries show danger chip + Request review.
- **Profile (real now):** farm card (location, crops, member since), language row (EN/HA display toggle for app strings — static copy switch, Hausa dictionary already exists), credit history list (level changes), NDFR status row.

### Agent
- **Today:** queue cards gain PhotoThumb + farmer credit chip; grade sheet adds **Reject** (danger secondary → reason sheet with 3 quick reasons + free text) alongside A/B/C; "Rejected" DayGroup below aggregated; JourneyTracker on aggregated lots.
- **Enrol:** farmer rows gain history chips ("3 cycles · L3 · 60% advance") and per-level advance rate in the terms footer; contract rows gain buyer org + PhotoThumb.
- **Wallet:** commissions with DayGroup; summary chips (this week / all time).
- **Profile (real now):** reputation stars, coverage area, farmers served count.

### Buyer
- **Orders:** contract header becomes a PhotoCard strip (crop image + band + buyer-facing fill ring); lot rows show grade-variance note when graded ≠ contract grade; delivered orders collapse under a DayGroup "History".
- **Post:** photo crop grid (12 crops), **grade picker (A/B/C segmented)** and **window stepper (7–30 days)** become real fields (API already accepts them); band steppers keep cross-clamp.
- **Account:** org card with initials avatar + stats (total volume, total spend, active contracts); wallet row; settings stub remains.

### All apps
- First-load **Skeletons**; **offline Banner**; fetch-failure Banner with Retry; **Toast** confirmations on every mutation; empty states keep current quality.

## 7. Accessibility (explicit checklist for review gates)

- Every `<img>` has meaningful `alt` (crop name) or `alt=""` + `aria-hidden` when decorative next to a text label.
- Chips/deltas never color-only: ▲/▼ glyphs + text accompany color.
- Toasts `aria-live="polite"`; error Banners `role="alert"`.
- JourneyTracker has `aria-label` describing current step.
- All new interactive elements ≥44pt, visible `:focus-visible` rings, `cursor-pointer`.
- Dark-gradient HeroCard text is white/90%+ (contrast ≥4.5:1 verified against both gradient stops).
- Reduced-motion: skeleton shimmer and tracker pulse become static.

## 8. Testing & verification

- Existing suites stay green with the delta-assertion refactor (`src/test/hero-path.e2e.test.ts`); new unit tests: crops catalog integrity (12 entries, files exist on disk), reject flow (service-level: status, SMS, event), credit-level derivation.
- Visual gates per round: screenshots at 1280×900 + 900×700 of every changed tab **including** skeleton (throttled), offline banner (SW/navigator mock or JS override), and rejected-lot states.
- Final: whole-implementation review + production redeploy + prod hero-flow verification + reset.

## 9. Non-goals

Real auth, push notifications, server-driven i18n switching, dark mode, chart libraries (sparklines are hand-rolled SVG), schema migrations, changes to admin/launcher beyond copy.
