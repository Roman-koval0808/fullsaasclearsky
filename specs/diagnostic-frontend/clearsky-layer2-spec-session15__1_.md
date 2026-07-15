**ClearSky Software**

**Layer 2 — Local Pack Rank Gap**

Updated Rank Gap Formula — Session 15 — siteRetentionRate Added

*Session 15 — April 2026 — Confidential*

*This document updates the Layer 2 rank gap formula from Session 14. The keyword-by-keyword architecture, CTR table, multi-trade model, and seasonal divisors are all unchanged. The only change is the addition of siteRetentionRate as a modifier inside calcRankGap(). Read clearsky-layer2-rank-spec-session14.docx for the full model. This document covers the Session 15 change only.*

# **1. What Changed in Session 15**

| **Area** | **Session 14** | **Session 15** |
| --- | --- | --- |
| calcRankGap() signature | calcRankGap(rank, monthlySearches, avgSaleValue, seasonal, citationMult, napMult, engagementMult) | Same + siteRetentionRate = 1.00 as final parameter |
| Gap formula | searches × CTRgap × callToPurchaseRate × value × 12 | searches × CTRgap × siteRetentionRate × callToPurchaseRate × value × 12 |
| Default behaviour | No site retention concept | Default siteRetentionRate = 1.00. 90+ PSI score = no penalty. Backwards compatible. |
| Detail output | avgPosition, status | Same fields plus siteRetentionRate |
| Manito rank gap | $163,520 | $139,042 (at 85% retention) |

# **2. Why siteRetentionRate Applies to Layer 2**

Layer 2 measures the revenue lost from not ranking at position 1. The gap is the clicks the business would earn at position 1 that they are currently not getting.

When those clicks are recovered — when the business moves up in rank — a slow site immediately taxes them. The visitor clicked from the local pack, the site took 5 seconds to load, and they left before seeing anything.

The rank gap formula already accounts for the clicks. siteRetentionRate accounts for what fraction of those clicks actually lead to a call opportunity. A business with a slow site recovers fewer dollars per rank position gained than a business with a fast site.

This makes the gap more accurate. Layer 2 was previously overstating the recovery value for slow-site businesses.

# **3. Updated Formula**

## **3.1 Rank gap per keyword**

keywordRankGap = scaledMonthlySearches

               × (positionOneCTR - currentCTR)

               × siteRetentionRate          // NEW Session 15

               × callToPurchaseRate

               × tradeAvgSaleValue

               × 12

               × tradeRevenueSplit

               × seasonalDivisor

## **3.2 GBP gap per keyword (from Layer 1 — shown for completeness)**

keywordGbpGap = scaledMonthlySearches

              × positionOneCTR

              × gbpCompositePenalty

              × siteRetentionRate          // NEW Session 15

              × callToPurchaseRate

              × tradeAvgSaleValue

              × 12

              × tradeRevenueSplit

              × seasonalDivisor

## **3.3 Code — updated calcRankGap() signature**

function calcRankGap(rank, monthlySearches, avgSaleValue, seasonal,

                     citationMult, napMult, engagementMult,

                     siteRetentionRate = 1.00) {         // NEW

  const retention = siteRetentionRate;

  // ... CTR calculation unchanged ...

  const ctrGap = Math.max(0, targetCtr - avgCurrentCtr);

  const baseGap = monthlySearches

    * ctrGap

    * retention           // NEW

    * BENCHMARKS.callToPurchaseRate

    * avgSaleValue

    * 12;

  const value = Math.round(

    baseGap * seasonal * citationMult * napMult * engagementMult

  );

}

## **3.4 How siteRetentionRate reaches calcRankGap()**

// In calculateDiagnostic():

const siteRetentionRate = getSiteRetentionRate(

  lighthouse?.performanceScore || lighthouse?.performance || 0

);

const rankGapResult = calcRankGap(

  rank, monthlySearches, avgSaleValue, seasonal,

  citationMult, napMult, engagementMult,

  siteRetentionRate   // NEW

);

# **4. Keyword Sets, CTR Table, Seasonal Divisors — Unchanged**

*The following are confirmed unchanged from Session 14. They are reproduced here for reference only.*

## **4.1 CTR by local pack position**

| **Position** | **CTR** | **Gap vs position 1** |
| --- | --- | --- |
| Position 1 | 44% | 0% — baseline |
| Position 2 | 24% | 20% gap |
| Position 3 | 17% | 27% gap |
| Not in pack | 3% | 41% gap — maximum |

## **4.2 Seasonal divisors**

| **Trade** | **Divisor** | **Rationale** |
| --- | --- | --- |
| Plumbing | ÷ 12 | Year round emergency service |
| HVAC | ÷ 10 | Heating and cooling seasons — 2 shoulder months excluded |
| Roofing | ÷ 6 | May to October active season only |
| Electrical | ÷ 12 | Year round emergency service |

# **5. Manito Worked Example — Updated**

PSI score: 52. siteRetentionRate: 0.85. All other inputs identical to Session 14.

## **5.1 Plumbing rank gap**

| **Keyword** | **Scaled searches** | **CTR gap** | **Retention** | **Annual gap** |
| --- | --- | --- | --- | --- |
| plumber timmins | 287 | 41% | 0.85 | $94,350 |
| emergency plumber timmins | 26 | 41% | 0.85 | $8,585 |
| plumbing repair timmins | 20 | 41% | 0.85 | $6,545 |
| drain cleaning timmins | 3 | 41% | 0.85 | $986 |
| water heater repair timmins | 3 | 41% | 0.85 | $986 |
| Plumbing total |  |  |  | $111,452 |

## **5.2 HVAC rank gap**

| **Keyword** | **Scaled searches** | **CTR gap** | **Retention** | **Annual gap** |
| --- | --- | --- | --- | --- |
| hvac timmins | 96 | 41% | 0.85 | $12,070 |
| furnace repair timmins | 52 | 41% | 0.85 | $6,545 |
| air conditioning timmins | 27 | 41% | 0.85 | $3,400 |
| heating and cooling timmins | 27 | 41% | 0.85 | $3,400 |
| ac repair timmins | 17 | 41% | 0.85 | $2,125 |
| HVAC total |  |  |  | $27,540 |

## **5.3 Total technical gap — Session 15**

| **Component** | **Session 14** | **× retention** | **Session 15** |
| --- | --- | --- | --- |
| Plumbing rank gap | $131,120 | × 0.85 | $111,452 |
| HVAC rank gap | $32,400 | × 0.85 | $27,540 |
| Plumbing GBP gap | $32,016 | × 0.85 | $27,214 |
| HVAC GBP gap | $7,898 | × 0.85 | $6,713 |
| TOTAL TECHNICAL GAP | $203,434 |  | $172,919 |

## **5.4 Revised recovery**

| **Scenario** | **Session 14** | **Session 15** |
| --- | --- | --- |
| Capture rate | 17.7% | 17.7% — unchanged |
| Conservative recovery | $36,008 | $30,607 |
| Ultra conservative | $30,607 | $26,016 |

# **6. Files That Change**

| **File** | **Function** | **Change** |
| --- | --- | --- |
| lib/clearsky-engine.js | calcRankGap() | Add siteRetentionRate parameter with default 1.00. Multiply into baseGap before seasonal and citation multipliers. |
| lib/clearsky-engine.js | calculateDiagnostic() | Compute siteRetentionRate using getSiteRetentionRate(). Pass to calcRankGap() as final argument. |

*No other files change for this update. diagnostic-route.js does not change — lighthouse data already flows through to the engine.*

*ClearSky Software — Layer 2 Updated — Session 15 — April 2026 — Confidential*

*Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564*