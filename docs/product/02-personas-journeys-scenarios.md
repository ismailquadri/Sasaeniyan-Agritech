# Sasaeniyan Agritech — Personas, Journey Mapping & Scenarios

**Date:** 2026-10-09
**Grounded in:** `docs/research/01-market-validation-brief.md`
**Locked context:** Perishables (tomato/pepper/onion) · Northern belt, Hausa-first · USSD/SMS/voice primary for farmers, PWA for agents/buyers · Embedded finance (offtake-backed advances) core · NDFR identity as moat

---

## Part A — Personas

Four personas span the whole value loop. **Design priority order:** Farmer (Musa/Hauwa) → Agent (Ibrahim) → Buyer (Mrs. Okafor). Government (NDFR) is a *stakeholder*, not a user.

### 1. PRIMARY — Musa Garba · smallholder tomato/pepper farmer
- **Age/location:** 41, village near Kano / Plateau (tomato-onion belt). Married, 6 children.
- **Farm:** ~1.5 ha, tomato + pepper, 2 cycles/yr. Yield swings wildly with rain & pests.
- **Tech:** Tecno feature phone (no data), shares a son's cheap Android occasionally. Buys ₦100–200 airtime at a time. Charges phone at a kiosk (₦50) — often off.
- **Literacy/language:** Speaks Hausa; limited English reading; can dial USSD codes and recognize numbers; uses `*901#`-style banking.
- **Money:** Has a dormant MFB account; mostly cash. Owes an input dealer who pre-financed his seeds → **must sell to that dealer's middleman at his price.**
- **Goals:** Sell his harvest before it rots, at a fair price; get cash to repay debt and feed family; afford good seed/fertilizer next cycle.
- **Pains:** Middleman dictates price exploiting the spoilage clock; no idea what Lagos/PH price is; glut crashes; no storage; no transport.
- **Fears/objections:** "Will I actually get paid?" "Is this another scam?" "Can I trust a price from a phone?" Distrust of anything that isn't cash-in-hand today.
- **Trigger to adopt:** A **guaranteed buyer + visible fair price + cash advance** that beats the middleman. Social proof from a neighbor/agent he knows.
- **Success for Musa:** Gets ₦X more per basket than the middleman, paid reliably, with an SMS receipt he can show.

### 2. PRIMARY (inclusion) — Hauwa Ibrahim · woman pepper/leafy-veg farmer
- **Age/location:** 34, same belt. Farms a smaller plot; also trades small volumes.
- **Tech:** No personal smartphone; **shares her husband's/brother's feature phone**; lowest literacy tier → relies on **voice/IVR and spoken Hausa**, icons, and the agent.
- **Goals:** Independent income; sell without traveling far (mobility/cultural constraints); be paid into her *own* wallet.
- **Pains:** Phone-sharing limits access; can't read menus; most dependent on middlemen who come to her; excluded from formal finance (no sole ID/account).
- **Design implication:** She is the **acid test for inclusion** — if the flow works for Hauwa (voice, agent-assisted, resumable, no-personal-smartphone, pay-to-her-wallet), it works for everyone. Strong investor "financial inclusion / gender" story.

### 3. ENABLER — Ibrahim Danladi · field agent / aggregator (our PWA power user)
- **Age/location:** 27, lives in a market town; completed secondary school; owns an Android smartphone with data.
- **Role:** Trusted local who already knows 40–150 farmers. Today may *be* a small middleman — we **convert the middleman into a transparent, commission-earning agent** instead of fighting him.
- **Tech:** Smartphone PWA, comfortable with apps, moderate data; needs **offline-capable** PWA for field areas.
- **Goals:** Earn more, reliably, with less risk and less cash tied up; grow his roster; status in community.
- **Pains:** Carries price risk & cash; spoilage losses; chasing scattered buyers; disputes with farmers.
- **Why he's the wedge:** Agents let us scale farmer onboarding **without a costly field army**, provide trust/last-mile, do quality grading, and resolve the literacy gap for farmers like Hauwa.
- **Success for Ibrahim:** Steady commission, guaranteed buyer demand to fill, tools that make him look trustworthy, no cash-float risk.

### 4. DEMAND — Mrs. Okafor · procurement lead, mid-size processor/trader (buyer)
- **Role:** Sources tomato/pepper for a paste processor (or large urban trader / institutional kitchen).
- **Tech:** Laptop + smartphone, web dashboard, WhatsApp, fully data-literate.
- **Goals:** **Reliable volume, consistent quality, predictable price, traceability** — her factory starves when supply is erratic.
- **Pains:** Unreliable aggregators, quality variance, no forward visibility, side-selling when spot prices spike, no traceability for standards/export.
- **Why she matters:** **Demand-first** — her signed offtake commitment is what lets us guarantee farmers a buyer and back advances. She pays for reliability; our highest-margin, most defensible side.
- **Success for Mrs. Okafor:** Fills her volume on time, at agreed quality/price, with traceable, verifiable supply.

**Stakeholder (not a persona): FMAFS / NDFR** — provides NIN-verified, geo-tagged farmer identity. We integrate for verification + credibility; design must *not* depend on it operationally.

---

## Part B — The End-to-End Journey (the Offtake Loop)

The core loop runs **demand → plan → grow → harvest-match → aggregate → pay → repeat**. Each stage lists the channel per actor.

| # | Stage | Farmer (USSD/SMS/voice, Hausa) | Agent (PWA) | Buyer (web) | System / Govt |
|---|-------|-------------------------------|-------------|-------------|---------------|
| 0 | **Demand signed** | — | sees open buyer contracts to fill | posts forward demand: crop, volume, quality, price band, window | matches demand to farming zones |
| 1 | **Onboard/verify** | dials `*code#` or agent registers him; consents by voice | registers farmer, captures farm geo-point, phone, crop | — | NIN/NDFR check (optional); creates farmer profile |
| 2 | **Plan + input credit** | gets SMS/voice offer: "Grow X, buyer guaranteed, inputs on credit" | enrolls farmer to a buyer-backed plan; disburses input package | commits to buy the output | advance underwritten vs. the offtake contract |
| 3 | **Grow + advisory** | voice/SMS tips in Hausa (N-ATLAS layer); pest alerts; live price ticker | monitors roster, logs progress | tracks expected supply pipeline | price feed, weather/pest alerts |
| 4 | **Harvest + list** | dials in "ready: N baskets tomato"; hears today's **transparent fair price** | confirms, grades quality, schedules pickup | sees incoming graded lots | computes fair price from buyer band + market index |
| 5 | **Aggregate + QC** | hands produce to agent at collection point; gets **SMS receipt (quantity, grade, price)** | aggregates lots, quality-grades, assigns to buyer order | accepts lot, sees traceable origin | generates receipt, locks price, traceability record |
| 6 | **Pay + net repay** | receives payment to his wallet; loan auto-netted; **SMS confirmation** | commission credited | pays into escrow/platform on delivery | disburses, nets advance, records |
| 7 | **Repeat/trust loop** | rating, next-cycle offer, savings nudge | roster grows, reputation score | re-contracts reliable zones | credit score improves → bigger advances |

**Key design truths embedded in the loop:**
- **Buyer is signed BEFORE the farmer grows** (demand-first, asset-light).
- **Fair price is transparent and sourced** (buyer band + market index) → beats information asymmetry, the core exploitation lever.
- **Advance is backed by the offtake contract**, not retail crowdfunding → avoids the FarmKonnect/AFEX death zone.
- **SMS receipt at every money/produce event** → rebuilds trust after Nigeria's failed-USSD history.
- **Agent absorbs literacy + last-mile + QC** → lets Musa and Hauwa participate at all.

---

## Part C — Scenarios (narrative walkthroughs)

### Scenario 1 — "The glut that didn't ruin Musa" (happy path, core demo)
Tomato glut hits; village middleman offers ₦3,000/basket (down from ₦9,000). Musa dials `*code#`, hears in Hausa: *"Today's guaranteed price for your buyer: ₦6,200/basket. Agent Ibrahim will collect tomorrow 9am."* He confirms. Ibrahim grades 18 baskets, logs them; Musa gets an SMS receipt. Two days later: *"₦108,000 paid to your wallet. ₦22,000 input loan repaid. Balance ₦86,000."* **Musa earns ~2× the glut price and repays his debt without a distress sale.** → *This is the hero flow for the pitch demo.*

### Scenario 2 — "Hauwa, no smartphone, can't read" (inclusion path)
Hauwa has 6 baskets of pepper and a shared phone. Ibrahim visits, registers her under her *own* profile + wallet, records her plot. At harvest she gives a missed-call/USSD; the system calls back with an **IVR voice prompt in Hausa**; she confirms by keypad. Payment lands in **her** wallet (not her husband's). **A low-literacy woman with no smartphone completes a fair, independent sale.** → *The inclusion/gender slide.*

### Scenario 3 — "The side-selling temptation" (defensibility)
A spot buyer offers Musa ₦7,000 cash on the spot vs. our ₦6,200. Because (a) he already took an **input advance tied to the offtake contract**, (b) the price gap is small and **transparent**, and (c) reliable payment + next-cycle credit are at stake, side-selling costs more than it earns. **Transparent pricing + embedded finance solves side-selling without a costly enforcement army.** → *Answers the investor's "what stops leakage?" question.*

### Scenario 4 — "Mrs. Okafor fills her factory" (demand side)
Her paste line needs 40 tonnes/week at Grade A. She posts forward demand; the platform matches it across zones and shows a live pipeline with **traceable, graded, NDFR-verified** origin. She gets consistent volume at an agreed band, pays into escrow on delivery. **Reliable, traceable supply — she pays a premium for it.** → *The revenue/defensibility slide.*

### Scenario 5 — "No network, low battery" (resilience)
Ibrahim is in a 2G dead-zone with 12% battery. The PWA works **offline**, caches his gradings, and syncs when signal returns; Musa's confirmations go via **USSD session + SMS**, needing no data. **The product survives the real infrastructure.** → *Proves we built for the actual Nigeria, not a demo-day fantasy.*

---

## Part D — Access Alignment Matrix (does the solution fit the user?)

| Constraint (from research) | How the design respects it |
|---|---|
| Feature phones, 2G, 23% rural internet | USSD + SMS + IVR as the farmer's primary channel; no data needed |
| Literacy 45–54%, lower for women | Voice/IVR in Hausa, icon UI, agent-assisted onboarding |
| Hausa/Pidgin, not English | Vernacular-first; N-ATLAS language layer for voice/chat |
| Phone-sharing, women excluded | Per-person profile + wallet; agent-assisted; resumable sessions |
| 26% rural power, charging is paid | Offline-first PWA; lightweight USSD; no long online sessions |
| Failed-USSD trust scars | SMS receipt + confirmation at every money/produce event |
| No ID / dormant accounts | NDFR/NIN optional path + agent-assisted no-ID onboarding |
| Distress-sale trap | Offtake-backed input advances; guaranteed buyer |
| Side-selling risk | Transparent sourced price + credit/relationship stakes |

**Open questions to resolve before epics:** payment rail (wallet vs. bank vs. mobile money partner), who holds the agent trust/float, and the exact fair-price formula. Flagged for the next step.
