**ClearSky Software**

**Layer 3 — Site Performance**

Site Retention Modifier — Developer Specification

*Session 15 — April 2026 — Confidential*

*This document defines the Layer 3 site performance model as redesigned in Session 15. Layer 3 no longer produces a standalone dollar gap. It produces a siteRetentionRate that is applied as a modifier inside the Layer 1 GBP gap and Layer 2 rank gap calculations. This document must be read alongside clearsky-layer1-gbp-spec-session15.docx and clearsky-layer2-rank-spec-session15.docx.*

# **1. What Changed in Session 15**

| **Area** | **Old model** | **New model** |
| --- | --- | --- |
| Layer 3 output | Standalone dollar gap added to technical gap | siteRetentionRate modifier applied inside Layer 1 and Layer 2 |
| Gap formula | estMonthlyVisitors x convGap x avgSaleValue x 12 | No standalone gap. Retention rate reduces Layer 1 and Layer 2 values. |
| Portent conversion table | Used to calculate conversion rate gap | Retired. Replaced with abandonment table. |
| What it measures | Revenue lost from lower conversion rate | Clicks earned through rank that bail before seeing the site |
| Benchmark | 90+ score = 39% conversion rate | 90+ score = 100% retention, no penalty |
| Results screen | Dollar gap line | Health signal only — score, band, what it means |

# **2. The Funnel Model**

Layer 3 sits between Layer 2 and the call. The correct sequence is:

Searches

  → Clicks  (Layer 2 — rank position determines CTR)

    → Actually see the site  (Layer 3 — speed determines retention)

      → Call  (intent + site quality)

        → Job  (callToPurchaseRate)

A slow site means a percentage of people who already clicked never actually see the business. They clicked, they waited, they left. The business paid for that click with their rank position and got nothing in return.

Layer 3 is the leak between the click and the first impression. It taxes the clicks that Layer 2 is recovering. The two layers are sequential steps in the same funnel and the formula reflects that.

Key distinction: Layer 3 is NOT about conversion rate once on the site. It is about abandonment before the site loads. These are different phenomena.

# **3. Site Retention Rate**

## **3.1 Definition**

siteRetentionRate = the percentage of clicks that actually see the site, given the PageSpeed performance score.

A score of 90+ means the site loads fast. Virtually no one bails. Retention is 100% — no penalty.

A score below 50 means the site is slow on mobile. A meaningful percentage of high-intent local searchers bail before the site loads. In a small Northern Ontario market, these searchers have limited alternatives — so the abandonment rate is lower than national averages. The worst case is 20% abandonment.

## **3.2 Abandonment table — locked Session 15**

| **Performance score** | **Abandonment** | **Site retention rate** | **Gap vs benchmark** |
| --- | --- | --- | --- |
| 90+ | 0% | 100% | 0% — no penalty |
| 70–89 | 10% | 90% | 10% of clicks wasted |
| 50–69 | 15% | 85% | 15% of clicks wasted |
| Below 50 | 20% | 80% | 20% of clicks wasted |

*Rationale: Small market, high intent. Someone searching **"**plumber Timmins**"** is not going to bail as quickly as a Toronto searcher who has 40 alternatives. The 20% worst-case floor reflects this. National Google data (53% abandonment at 3+ seconds) does not apply to this audience.*

## **3.3 getSiteRetentionRate() function**

function getSiteRetentionRate(performanceScore) {

  const score = performanceScore || 0;

  if (score >= 90) return 1.00;

  if (score >= 70) return 0.90;

  if (score >= 50) return 0.85;

  return 0.80;

}

# **4. How siteRetentionRate Is Applied**

siteRetentionRate is passed into calcGbpGap() and calcRankGap() as a parameter. It is multiplied into every keyword-level gap calculation.

## **4.1 Layer 1 GBP gap formula — updated**

keywordGbpGap = scaledMonthlySearches

              x positionOneCTR (44%)

              x gbpCompositePenalty

              x siteRetentionRate          // NEW Session 15

              x callToPurchaseRate

              x tradeAvgSaleValue

              x 12

              x tradeRevenueSplit

              x seasonalDivisor

## **4.2 Layer 2 rank gap formula — updated**

keywordRankGap = scaledMonthlySearches

               x (positionOneCTR - currentCTR)

               x siteRetentionRate          // NEW Session 15

               x callToPurchaseRate

               x tradeAvgSaleValue

               x 12

               x tradeRevenueSplit

               x seasonalDivisor

## **4.3 Why siteRetentionRate applies to both**

The slow site does not care whether the click came from a strong rank or a weak GBP. A visitor who clicked because they saw the business in position 1 and a visitor who clicked because they saw a well-optimised listing both experience the same slow load. Both bail at the same rate. siteRetentionRate taxes every click equally regardless of its origin.

# **5. Worked Example — Manito Plumbing, Timmins ON**

## **5.1 PSI score and retention rate**

Manito website: https://manitoplumbing.ca

PageSpeed performance score: 52 (mobile strategy)

Score band: 50–69

siteRetentionRate: 0.85

Abandonment: 15% of earned clicks bail before seeing the site

## **5.2 Impact on technical gap**

| **Component** | **Session 14 amount** | **x retention rate** | **Session 15 amount** |
| --- | --- | --- | --- |
| Plumbing rank gap (5 keywords) | $131,120 | x 0.85 | $111,452 |
| HVAC rank gap (5 keywords) | $32,400 | x 0.85 | $27,540 |
| Plumbing GBP gap | $32,016 | x 0.85 | $27,214 |
| HVAC GBP gap | $7,898 | x 0.85 | $6,713 |
| TOTAL TECHNICAL GAP | $203,434 |  | $172,919 |

The slow site costs Manito $30,515 in reduced recovery — the difference between $203,434 and $172,919. This is not a new gap line. It is the existing gap reduced by site performance.

## **5.3 Revised capture rate calculation**

| **Variable** | **Value** |
| --- | --- |
| Available capacity (Normal) | 0.30 |
| Call to purchase rate (5–7 of 10) | 0.60 |
| Brand tenure modifier (14 years — Trusted) | 1.09 |
| Market demand index (Timmins — Strong) | 1.10 |
| Digital presence score (GBP 82) | 0.82 |
| Capture rate | 0.30 x 0.60 x 1.09 x 1.10 x 0.82 = 17.7% |
| Conservative recovery | $172,919 x 17.7% = $30,607 |
| Ultra conservative | $30,607 x 0.85 = $26,016 |

# **6. Layer 3 on the Results Screen**

## **6.1 What the prospect sees**

Layer 3 does NOT show a dollar gap line. It appears as a health signal on the results screen scorecard.

| **Signal** | **Status** | **Message** |
| --- | --- | --- |
| Site performance | Green (90+) | Your site loads fast. No clicks lost to abandonment. |
| Site performance | Amber (70–89) | Your site is average. About 1 in 10 visitors bail before it loads. |
| Site performance | Amber (50–69) | Your site is slow on mobile. About 1 in 7 visitors bail before it loads. |
| Site performance | Red (below 50) | Your site is very slow. About 1 in 5 visitors bail before it loads. |

*The results screen does not show a 5-year loss figure for Layer 3. The annual gap is already embedded in the technical gap total. No separate call-out is needed.*

## **6.2 ClearSky advisor view**

The advisor dashboard shows the full PSI signal breakdown:

- performanceScore — 0 to 100

- siteRetentionRate — 0.80, 0.85, 0.90, or 1.00

- abandonmentPct — 0%, 10%, 15%, or 20%

- lcpMs — Largest Contentful Paint in milliseconds

- clsScore — Cumulative Layout Shift

- mobileFriendly — true or false

- seoScore — Lighthouse SEO audit

- status — green / amber / red

# **7. What Changes in the Code**

| **File** | **Function** | **Change** |
| --- | --- | --- |
| lib/clearsky-engine.js | getSiteRetentionRate() | NEW function — returns retention rate from PSI score |
| lib/clearsky-engine.js | calcGbpGap() | Add siteRetentionRate parameter. Multiply into gap formula. |
| lib/clearsky-engine.js | calcRankGap() | Add siteRetentionRate parameter. Multiply into gap formula. |
| lib/clearsky-engine.js | calcPerformanceGap() | RETIRED. Function remains in file but returns { value: 0, detail: "retired — see siteRetentionRate" } |
| lib/clearsky-engine.js | calculateDiagnostic() | Calculate siteRetentionRate from lighthouse.performanceScore. Pass to calcGbpGap() and calcRankGap(). |
| app/api/diagnostic/route.js | Main handler | No change — lighthouse data already flows through. Engine handles the rest. |

# **8. Status After Session 15**

| **Layer** | **What it measures** | **Status after Session 15** |
| --- | --- | --- |
| Layer 1 | GBP health — 10 signal composite | Updated — siteRetentionRate added to calcGbpGap() |
| Layer 2 | Local pack rank — 5 keywords per trade | Updated — siteRetentionRate added to calcRankGap() |
| Layer 3 | Site performance — PSI score | Redesigned — produces siteRetentionRate modifier, no standalone gap |
| Layer 4 | Content gap — service category coverage | Next — design this session after Layer 3 locked |

*ClearSky Software — Session 15 — April 2026 — Confidential*

*Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564*