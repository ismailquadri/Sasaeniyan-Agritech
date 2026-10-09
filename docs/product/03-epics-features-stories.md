# Sasaeniyan Agritech — Epics, Features & User Stories

**Date:** 2026-10-09
**Grounded in:** `01-market-validation-brief.md`, `02-personas-journeys-scenarios.md`
**Demo centerpiece:** Full offtake loop, all three actors (Farmer · Agent · Buyer) end-to-end
**Prioritization:** MoSCoW per story — **M**ust (in demo) · **S**hould (if time) · **C**ould (stretch) · **W**on't (post-demo roadmap)

> Personas: **Musa** (farmer, USSD/SMS/IVR), **Hauwa** (woman farmer, voice/agent-assisted), **Ibrahim** (agent, PWA), **Mrs. Okafor** (buyer, web).

---

## Epic map (10 epics)

| # | Epic | Demo weight |
|---|------|-------------|
| E1 | Farmer Access & Onboarding | **Core** |
| E2 | Demand & Offtake Marketplace | **Core** |
| E3 | Transparent Fair Pricing & Harvest Matching | **Core** |
| E4 | Aggregation, Grading & Logistics (Agent) | **Core** |
| E5 | Embedded Finance (offtake-backed advances) | **Core** |
| E6 | Payments, Wallet & SMS Receipts | **Core** |
| E7 | Vernacular & Advisory Layer (voice/IVR, N-ATLAS) | Supporting |
| E8 | Trust, Ratings & Credit Scoring | Supporting |
| E9 | Buyer Dashboard & Traceability | **Core** |
| E10 | Platform, Admin, Govt (NDFR) & Pitch Analytics | Supporting |

---

## E1 — Farmer Access & Onboarding
*Goal: a feature-phone, low-literacy, Hausa-speaking farmer can join and be verified.*

**Features:** USSD registration · agent-assisted registration · NDFR/NIN verification (optional) · per-person profile + wallet · language selection.

- **US1.1 (M):** As Musa, I can register by dialing `*code#` and following a **Hausa** menu, so I join without reading English or using data.
  - *AC:* USSD flow (sim) in Hausa; captures name, phone, crop, location; no data required; completes in <6 steps; ends with SMS welcome.
- **US1.2 (M):** As Ibrahim, I can register a farmer from my PWA (incl. geo-point + crop), so farmers like Hauwa who can't self-register still join.
  - *AC:* PWA form; captures farm GPS; creates the farmer's **own** profile + wallet; works offline then syncs.
- **US1.3 (S):** As the platform, I can verify a farmer against **NDFR/NIN** and badge them "verified," so buyers trust origin.
  - *AC:* Verification step (mocked NDFR check for demo); "NDFR-verified" badge on profile.
- **US1.4 (C):** As Hauwa, I can be paid into **my own** wallet even on a shared phone, so my income is mine.

## E2 — Demand & Offtake Marketplace
*Goal: buyers post forward demand; supply is planned against it (demand-first).*

- **US2.1 (M):** As Mrs. Okafor, I can post a **forward demand** (crop, volume, grade, price band, delivery window), so farmers grow against guaranteed demand.
  - *AC:* Buyer web form; creates an open contract; visible to agents; shows fill progress.
- **US2.2 (M):** As Ibrahim, I can see open buyer contracts and **enroll my farmers** to fill them, so demand reaches the right growers.
  - *AC:* Agent sees contracts filtered by crop/zone; assigns farmers; capacity tracked.
- **US2.3 (S):** As the platform, I match demand to farming zones automatically, so the right crops go to the right buyers.

## E3 — Transparent Fair Pricing & Harvest Matching
*Goal: kill information asymmetry — the core exploitation lever.*

- **US3.1 (M):** As Musa, when I signal "harvest ready," I'm told **today's transparent fair price** (buyer band + market index) in Hausa, so I'm not at the middleman's mercy.
  - *AC:* USSD/IVR returns a sourced price with a plain explanation; price logged.
- **US3.2 (M):** As the platform, I compute fair price = f(buyer contract band, live market index, grade), so pricing is explainable and defensible.
  - *AC:* Transparent formula; shown as a breakdown on agent/buyer screens.
- **US3.3 (M):** As Musa, I can **accept** the price and schedule agent pickup via USSD, so the sale is locked.
  - *AC:* Confirmation + SMS; creates a harvest lot; notifies agent.
- **US3.4 (C):** As Musa, I see a **price ticker** (SMS/USSD) during the season so I can time my sale.

## E4 — Aggregation, Grading & Logistics (Agent)
- **US4.1 (M):** As Ibrahim, I can record pickup of a farmer's lot with **quantity + quality grade**, so produce is traceable and priced correctly.
  - *AC:* PWA lot entry; grade affects price; works offline + syncs; generates receipt data.
- **US4.2 (M):** As Ibrahim, I can **aggregate lots** against a buyer order and mark ready for delivery.
  - *AC:* Lots roll up to an order; shows fill %; buyer notified.
- **US4.3 (S):** As Ibrahim, I can schedule/record delivery/logistics to the buyer.

## E5 — Embedded Finance (offtake-backed advances)
*Goal: beat the middleman's cash-on-spot without the AFEX/FarmKonnect death zone.*

- **US5.1 (M):** As Musa, I can receive an **input advance** tied to a buyer-backed plan, so I get inputs now and repay at sale.
  - *AC:* Advance created against a signed contract; shown on farmer profile; capped by contract value.
- **US5.2 (M):** As the platform, I **auto-net the advance** from sale proceeds at payment, so repayment is frictionless.
  - *AC:* Payment = sale − advance − fees; shown clearly; SMS breakdown.
- **US5.3 (S):** As a finance **partner** (bank/MFB/NADF), I can see the risk-reduced advance book, so capital is partner-provided (asset-light).
  - *AC:* Partner view of advances backed by contracts (mock for demo).
- **US5.4 (W):** Full KYC/credit underwriting engine — *post-demo.*

## E6 — Payments, Wallet & SMS Receipts
- **US6.1 (M):** As Musa, I receive **payment to my wallet** on delivery, with an **SMS receipt** (qty, grade, price, loan netted, balance), so I trust the system.
  - *AC:* Wallet balance updates; SMS receipt at every money event; readable without data.
- **US6.2 (M):** As Mrs. Okafor, I pay into platform **escrow** and funds release to farmers/agent on confirmed delivery.
  - *AC:* Escrow state machine (demo); release triggers farmer payment + agent commission.
- **US6.3 (S):** As Hauwa, I can cash out / use my wallet balance via a partner (mobile money/MFB).
- **US6.4 (C):** Real payment-rail integration (Paystack/Flutterwave/mobile money) — *stretch; mocked in demo.*

## E7 — Vernacular & Advisory Layer (voice/IVR, N-ATLAS)
- **US7.1 (S):** As Hauwa, I can interact by **IVR voice in Hausa** (callback on missed call), so low literacy doesn't exclude me.
  - *AC:* IVR voice flow (sim) for confirm/price; keypad responses.
- **US7.2 (C):** As Musa, I can ask a **Hausa voice/chat assistant** (N-ATLAS-style) a farming/price question and get an answer.
- **US7.3 (S):** As the platform, all farmer-facing text/voice is **Hausa-first** with Pidgin/English toggle.

## E8 — Trust, Ratings & Credit Scoring
- **US8.1 (S):** As Mrs. Okafor, I can rate a delivered lot (quality/reliability), building supplier reputation.
- **US8.2 (S):** As the platform, each completed cycle improves a farmer's **credit score** → larger future advances (the retention/moat flywheel).
- **US8.3 (C):** As Ibrahim, my agent reputation score grows with reliable fulfillment.

## E9 — Buyer Dashboard & Traceability
- **US9.1 (M):** As Mrs. Okafor, I see a **live supply pipeline** against my contract (expected vs. delivered, by zone), so I can plan my factory.
  - *AC:* Dashboard with fill %, incoming graded lots, delivery ETA.
- **US9.2 (M):** As Mrs. Okafor, I can see **traceable origin** (NDFR-verified farmer, geo, grade) per lot, so I meet standards/export needs.
- **US9.3 (S):** As Mrs. Okafor, I can re-contract high-performing zones for next cycle.

## E10 — Platform, Admin, Govt (NDFR) & Pitch Analytics
- **US10.1 (M):** As the platform, I maintain shared state so an action in one actor's view **reflects live** in the others, so the full-loop demo is convincing.
  - *AC:* Single source of truth; farmer USSD action → agent PWA → buyer dashboard update in real time.
- **US10.2 (S):** As a presenter, I can show an **impact dashboard** (farmer income uplift %, loss avoided, GMV, take + finance revenue), so investors see the numbers.
- **US10.3 (S):** As an admin, I can **seed/reset demo data** to run the pitch cleanly.
- **US10.4 (C):** NDFR integration (real) — *mocked for demo, real post-pilot.*

---

## Demo build cut (MoSCoW → the <1-week slice)

**MUST (the spine that proves the whole thesis in one live run — Scenario 1 + buyer + agent + finance):**
US1.1, US1.2, US2.1, US2.2, US3.1, US3.2, US3.3, US4.1, US4.2, US5.1, US5.2, US6.1, US6.2, US9.1, US9.2, US10.1

**SHOULD (if time, big narrative lift):** US1.3 (NDFR badge), US5.3 (finance partner view), US7.1 (IVR Hausa — Hauwa inclusion), US8.2 (credit flywheel), US10.2 (impact dashboard), US10.3 (demo reset).

**COULD (stretch polish):** price ticker, Hausa AI assistant, ratings, real payment rail.

**WON'T (explicit roadmap — say so on a slide, don't pretend):** real USSD/telco integration, full KYC/credit engine, live NDFR API, real escrow/settlement, logistics optimization.

### Build sequence (thin-slice first, never empty-handed)
1. **Day 1:** Data model + shared backend/state (US10.1); seed data. Skeleton of 3 actor views.
2. **Day 2:** Buyer posts demand (E2) + buyer dashboard shell (E9); agent enrolls farmers (E1.2, E2.2).
3. **Day 3:** Farmer USSD/SMS flow simulator (E1.1, E3.1/3.3) + fair-price engine (E3.2).
4. **Day 4:** Agent grading/aggregation (E4) + finance advance & netting (E5.1/5.2).
5. **Day 5:** Payments + SMS receipts + escrow (E6); live cross-actor sync polish (US10.1).
6. **Day 6:** SHOULD items (NDFR badge, IVR/Hauwa, impact dashboard), visual polish, Hausa copy.
7. **Day 7:** Demo script rehearsal, reset flow, buffer.

> **Scope guard:** USSD/IVR are **on-screen simulators** (realistic `*code#` phone + SMS log), not real telco — correct for a demo and clearly labeled as "simulated; production uses Africa's Talking." Payments/NDFR are **mocked** with honest roadmap framing. This keeps "full loop, all actors" achievable while staying credible.
