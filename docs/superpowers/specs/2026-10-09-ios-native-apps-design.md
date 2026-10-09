# Sasaeniyan — Native iOS Apps in iPhone 16 Pro Frames (UI Redesign)

**Date:** 2026-10-09
**Status:** Approved by founder → ready for implementation plan
**Supersedes:** the UI layer of `2026-10-09-sasaeniyan-demo-design.md` §5–6 (surfaces + visual). Backend, domain, realtime, data model, and admin are unchanged.

## 1. Objective

Replace the current web-page UIs for the three personas with **three separate native-looking iOS apps**, each rendered inside a CSS **iPhone 16 Pro mockup frame** on its existing route. The farmer additionally keeps the **feature-phone USSD channel** via a device switcher — smartphone farmers use the app, Nokia farmers dial; both hit identical business logic.

**Design language:** stock **Apple design system** (iOS HIG) — no custom styling language.
- SF typography via `-apple-system` (large title 34pt bold, body 17pt, footnote 13pt metrics scaled to frame)
- System grouped background `#F2F2F7`, white inset-grouped cards (10pt radius), hairline separators `rgba(60,60,67,.29)`, secondary label `rgba(60,60,67,.6)`
- Standard iOS patterns: large-title nav, Settings-style rows with colored icon squares, translucent tab bar, slide-up sheets, segmented controls, steppers, empty states
- **Tint:** Sasaeniyan deep green `#2E6B3E` everywhere an iOS app would use its tint color
- Touch targets ≥ 44pt-equivalent within the frame; SVG glyphs only (no emoji icons)

## 2. Shared foundation

### `IPhoneFrame` (`src/components/iphone/IPhoneFrame.tsx`)
CSS-only iPhone 16 Pro chassis: titanium side rails, rounded display (~55px device-corner radius at full scale), **Dynamic Island**, iOS status bar (9:41, signal/wifi/battery). Logical viewport **393×852**, scaled responsively (CSS `transform: scale()` against a fixed-size inner canvas) to fit ~85vh. Children render as the app screen. Content scrolls inside the frame; the page itself doesn't scroll the app.

### iOS component kit (`src/components/ios/`)
One kit consumed by all three apps. Components: `NavLargeTitle`, `InsetGroup`, `Row` (icon square / title / subtitle / value / chevron), `TabBar` + `TabItem` (SVG glyphs, active tint), `PrimaryButton` / `SecondaryButton`, `Sheet` (slide-up modal with grabber + dim scrim), `Segmented`, `Stepper`, `ListEmptyState`, `SectionHeader` (uppercase 13pt), `StatusPill`. iOS color/typography tokens live in a `ios.css` (or CSS-module) scoped to the frame so the desktop admin/launcher keep the existing Tailwind theme.

### Route shape
Each persona route renders its app centered on a quiet desktop backdrop (`#E5E5EA`-ish, small caption naming the persona):
- `/phone` → `<DeviceSwitcher>` (segmented: **iPhone ⇄ Nokia**) → `<IPhoneFrame><FarmerApp/></IPhoneFrame>` or the existing feature-phone chassis (component kept, moved under `src/components/featurephone/`)
- `/agent` → `<IPhoneFrame><AgentApp/></IPhoneFrame>`
- `/buyer` → `<IPhoneFrame><BuyerApp/></IPhoneFrame>`
- `/` launcher and `/admin` remain desktop pages (copy updated to reference the apps)

All apps use the existing `useAppState` (SSE-driven refetch) — the three-window live-sync demo behavior is unchanged.

## 3. The apps (Approach: hero flows functional + honest stubs)

Non-hero tabs ship as proper iOS empty states, not dead links.

### Farmer app — Musa (tabs: Home · Sell · Wallet · Profile)
- **Home (live):** greeting + NDFR verified pill; balance card (Apple-Cash style: balance, `Sell harvest` / `History` actions); "Today's prices" inset group — per crop: fair price vs farm-gate glut price (struck through), chevron to Sell.
- **Sell (hero, 3 steps):** crop picker (inset rows w/ icon squares) → basket quantity stepper → **offer sheet** with full fair-price breakdown (market index × grade factor, band clamp, vs middleman price) → `Accept offer` → confirmation screen ("Agent will collect"). Calls `POST /api/harvest`.
- **Wallet (live):** balance; ledger rows (advance, payout, fees — signed amounts, tabular figures); tapping a payout opens an **itemised receipt** detail (sale value, advance netted, fees, net payout — the SMS as a native screen).
- **Profile (stub):** farm info, language, credit score — empty-state v1.
- **Device switcher:** Nokia mode renders the existing USSD dialer + SMS inbox unchanged ("Simulated — production via Africa's Talking" label kept).

### Agent app — Ibrahim (tabs: Today · Enrol · Wallet · Profile)
- **Today (hero):** pickup queue — lot cards (farmer, crop, baskets, offered price) → **grade sheet** (A/B/C segmented + live recomputed unit price via the pricing engine) → confirm. Below: aggregated lots with order status pills.
- **Enrol (hero):** contract picker, farmer picker (+ `New farmer` sheet: name/phone/crop), planned-volume stepper, advance toggle showing the computed 40% max → confirm → success screen with disbursed amount.
- **Wallet (live):** commission balance + per-lot ledger.
- **Profile (stub).**

### Buyer app — Mrs. Okafor (tabs: Orders · Post · Account)
- **Orders (hero):** contract cards with fill progress bar; expandable traceable lots (farmer name, geo, NDFR badge, trace ref, grade, value); order footer actions `Fund escrow` → `Confirm delivery`; delivered state pill.
- **Post (live):** inset-group form — crop, grade, volume stepper, price-band min/max, window → posts contract.
- **Account (stub):** org info + wallet balance row; rest empty-state.

## 4. API change (one)

**`POST /api/harvest`** `{farmerId, crop, baskets}` — the farmer app's Sell accept. Extract the accept-harvest logic currently inline in the USSD route (fair-price lookup, lot creation, SMS messages, `HARVEST_ACCEPTED` publish) into a shared domain service `src/domain/offtake/acceptHarvest.ts`; both `/api/ussd` and `/api/harvest` call it. No other endpoint changes. All reads remain `/api/state`.

## 5. Removed / kept

- **Removed:** current page UIs of `/agent` and `/buyer`; the farmer context panel on `/phone`. (Git history preserves them.)
- **Kept:** feature-phone chassis component (inside the switcher), admin page, launcher page (copy/links updated), all APIs, domain services, SSE hub, seed, tests.

## 6. Testing

- Existing 24 unit tests + hero-path e2e must stay green (API behavior unchanged).
- New unit test for `acceptHarvest` service (lot + messages + event, USSD/app parity).
- e2e: keep the existing USSD-path test and add an app-path variant that drives `POST /api/harvest`; both must settle the same ledger.
- Visual verification: headless-Chrome screenshots of `/phone` (both devices), `/agent`, `/buyer` at 1280×900 and a mobile-ish width; reviewed before finishing.
- Manual: full hero flow across three windows via the new apps.

## 7. Risks

- **Scale/typography fidelity:** iOS look collapses if metrics are off — the kit centralizes all metrics; screenshots gate the result.
- **Font fallback off-Apple:** `-apple-system` degrades on non-Apple browsers; acceptable for a pitch run from a Mac. (Optional later: bundle Inter as fallback.)
- **Scope creep:** stubs are deliberately empty states; no new features beyond this spec.
