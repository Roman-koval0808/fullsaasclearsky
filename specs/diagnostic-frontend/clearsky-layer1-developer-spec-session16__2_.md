**ClearSky Software**

**Layer 1 — Google Business Profile**

Complete Developer Specification

*Session 15 / 16 — April 2026 — Confidential*

*This document is the authoritative specification for Layer 1. It supersedes all previous Layer 1 documentation. All signal weights, formulas, data sources, and scoring bands in this document are final. Do not implement from any previous spec.*

# **1. What Layer 1 Measures**

Layer 1 measures the health of the business Google Business Profile (GBP) listing. A weak GBP costs the business in two ways: fewer clicks because prospects see a poor listing, and lower local pack ranking because Google deprioritises incomplete profiles.

The output of Layer 1 is a composite score out of 100. That score drives the GBP composite penalty, which is multiplied into the gap formula per keyword alongside the Layer 2 rank gap.

# **2. GBP Existence Check**

Before any signal scoring runs, the engine checks whether a GBP listing exists at all.

| **Condition** | **Penalty** | **Behaviour** |
| --- | --- | --- |
| gbpExists = true | Composite signal scoring | All 9 signals scored. Points deducted for each weakness. Combined composite score drives the GBP penalty. |
| gbpExists = false | 60% opportunity penalty | Business is unknown to Google. No signal scoring. Gap calculated at 60% of available traffic. |

*A business with no GBP is unknown — not bad. A business with a terrible GBP is actively destroying its reputation with every impression. This is why a poor GBP can produce a higher penalty than no GBP at all.*

# **3. The 9 Signals — Final Weights**

Every business starts at 100. Points deducted per signal weakness. Remaining total = composite GBP score.

| **#** | **Signal** | **Max pts** | **Data source** | **Status** |
| --- | --- | --- | --- | --- |
| 1 | Star rating | 35 | Google Places API | Live |
| 2 | Review count | 25 | Google Places API | Live |
| 3 | Photos | 8 | Google Places API | Live |
| 4 | Hours complete | 5 | Google Places API | Live |
| 5 | Owner response rate | 7 | Google Places API | Live |
| 6 | Website linked | 5 | Google Places API | Live |
| 7 | GBP Q&A activity | 4 | GMB API | Needs wiring |
| 8 | Description present | 4 | Google Places API | Live |
| 9 | Services listed | 7 | DataForSEO My Business Info | Needs wiring |
|  | TOTAL | 100 |  |  |

| **Changes from Session 14 spec** Post count (3pts) removed — GMB OAuth not a priority. Photos reduced from 10 to 8. Hours reduced from 8 to 5. Description increased from 2 to 4. Services increased from 1 to 7. Q&A moved from hard number bands to percentage model. Total remains 100 points. |
| --- |

# **4. Signal Formulas — All 9**

## **Signal 1 — Star Rating (35 points)**

Accelerating curve. Small drops at the top cost proportionally less than the same drop near the bottom. Reflects real prospect psychology.

function getGbpRatingScore(rating) {

  if (!rating || rating >= 4.5) return 35;

  if (rating < 3.0) return 0;

  const t = (4.5 - rating) / 1.5;

  const penalty = Math.min(1.0, Math.pow(t, 1.1));

  return Math.round(35 * (1 - penalty));

}

| **Rating** | **Points earned** | **Points lost** | **Zone** |
| --- | --- | --- | --- |
| 5.0 – 4.5 | 35 | 0 | Excellent — no deduction |
| 4.4 | 32 | 3 | Good — slight deduction |
| 4.2 | 29 | 6 | Good — meaningful hesitation |
| 4.0 | 25 | 10 | Good — prospect reads reviews first |
| 3.5 | 17 | 18 | Weak — serious damage |
| 3.0 | 0 | 35 | Critical — maximum deduction |
| Below 3.0 | 0 | 35 | Critical — effectively dead |

## **Signal 2 — Review Count (25 points)**

Dynamic benchmark tied to years in business. A 14-year business needs 84 reviews. A 2-year business needs 12. Accelerating curve.

function getGbpReviewScore(reviewCount, yearsInBusiness) {

  const expected = (yearsInBusiness || 5) * 6;

  const ratio = Math.min(reviewCount / expected, 1.0);

  if (ratio >= 1.0) return 25;

  const gap = 1.0 - ratio;

  const penalty = Math.min(1.0, Math.pow(gap, 0.8));

  return Math.round(25 * (1 - penalty));

}

*Benchmark formula: expected reviews = yearsInBusiness × 6. yearsInBusiness comes from the intake form field. This is Bug 1 — confirm yearsInBusiness is flowing through from request body before testing this signal.*

## **Signal 3 — Photos (8 points)**

Straight lookup table. Benchmark is 8 photos based on BrightLocal research.

function getGbpPhotoScore(photoCount) {

  if (photoCount >= 8) return 8;

  if (photoCount >= 4) return 6;

  if (photoCount >= 1) return 3;

  return 0;

}

| **Photos** | **Points earned** | **Points lost** | **Notes** |
| --- | --- | --- | --- |
| 8+ | 8 | 0 | Benchmark — no penalty |
| 4 – 7 | 6 | 2 | Adequate |
| 1 – 3 | 3 | 5 | Minimal |
| 0 | 0 | 8 | No visual presence |

## **Signal 4 — Hours Complete (5 points)**

Binary. Either hours are published or they are not. Missing hours = invisible to all "open now" searches (15–20% of local searches).

function getGbpHoursScore(hoursPublished) {

  return hoursPublished ? 5 : 0;

}

| **Condition** | **Points earned** | **Points lost** |
| --- | --- | --- |
| Hours published | 5 | 0 — no penalty |
| Hours missing | 0 | 5 |

## **Signal 5 — Owner Response Rate (7 points)**

Measures how often the owner responds to reviews. Formula: ownerResponseCount ÷ totalReviewCount.

function getGbpResponseScore(ownerResponseCount, reviewCount) {

  if (!reviewCount || reviewCount === 0) return 7;

  const rate = ownerResponseCount / reviewCount;

  if (rate >= 0.40) return 7;

  if (rate >= 0.20) return 4;

  if (rate > 0)     return 2;

  return 0;

}

| **Response rate** | **Points earned** | **Points lost** | **Notes** |
| --- | --- | --- | --- |
| 40%+ | 7 | 0 | Benchmark — no penalty |
| 20 – 39% | 4 | 3 | Responding but inconsistently |
| Below 20% | 2 | 5 | Rarely responds |
| 0% | 0 | 7 | Complete silence |

*Manito example: 137 reviews, 23 responses = 17% rate. Below 20% band. 2 points earned, 5 points lost.*

## **Signal 6 — Website Linked (5 points)**

Binary. Either the GBP listing has a website URL or it does not.

function getGbpWebsiteScore(websiteLinked) {

  return websiteLinked ? 5 : 0;

}

| **Condition** | **Points earned** | **Points lost** |
| --- | --- | --- |
| Website linked | 5 | 0 — no penalty |
| No website linked | 0 | 5 |

| **Secondary impact** No website linked also breaks Layer 3. ClearSky cannot run a PageSpeed Insights audit without a URL. The diagnostic falls back to mock siteRetentionRate scores. One missing field costs 5 GBP points AND leaves Layer 3 inaccurate. |
| --- |

## **Signal 7 — GBP Q****&****A Activity (4 points)**

Percentage model. Measures owner answer rate across all questions posted on the GBP listing. No questions = full marks by default.

function getGbpQaScore(totalQuestions, ownerAnswered) {

  if (!totalQuestions || totalQuestions === 0) return 4;

  const rate = ownerAnswered / totalQuestions;

  if (rate >= 0.60) return 4;

  if (rate >= 0.40) return 3;

  if (rate >= 0.20) return 2;

  return 0;

}

| **Answer rate** | **Points earned** | **Points lost** | **Notes** |
| --- | --- | --- | --- |
| No questions | 4 | 0 | Default — nothing to answer |
| 60%+ | 4 | 0 | Benchmark — no penalty |
| 40 – 59% | 3 | 1 | Most answered |
| 20 – 39% | 2 | 2 | Occasional responses |
| Below 20% | 0 | 4 | Rarely or never answers |

| **Data source not yet wired** Q&A data requires the GMB API. Currently mocked at 0 answered for all businesses — meaning every business loses all 4 points on this signal. GMB API wiring is required before this signal produces accurate results. |
| --- |

## **Signal 8 — Description Present (4 points)**

Binary. The description field on the GBP listing is either populated or blank. Carries 4 points because it does two jobs: tells Google what the business does (ranking signal) and tells the prospect who to call (conversion signal).

function getGbpDescriptionScore(descriptionPresent) {

  return descriptionPresent ? 4 : 0;

}

| **Condition** | **Points earned** | **Points lost** |
| --- | --- | --- |
| Description present | 4 | 0 — no penalty |
| Description missing | 0 | 4 |

*Manito: No description on listing. Loses all 4 points. Five-minute fix worth $X,XXX annually on the GBP repair list.*

## **Signal 9 — Services Listed (7 points)**

Measures how many services the business has populated on their GBP listing. Data comes from DataForSEO My Business Info endpoint — returns service categories directly from the GBP profile. No Firecrawl required for this signal.

function getGbpServicesScore(serviceCount) {

  if (serviceCount >= 5) return 7;

  if (serviceCount >= 3) return 5;

  if (serviceCount >= 1) return 2;

  return 0;

}

| **Services on GBP** | **Points earned** | **Points lost** | **Notes** |
| --- | --- | --- | --- |
| 5+ | 7 | 0 | Benchmark — no penalty |
| 3 – 4 | 5 | 2 | Partial coverage |
| 1 – 2 | 2 | 5 | Minimal listing |
| 0 | 0 | 7 | No services listed |

*Services listed on GBP influences which service-specific searches the listing appears for. A plumber who lists water heater repair, drain cleaning and sump pumps appears for all three searches separately. Zero services = invisible to all service-specific searches beyond the primary trade keyword.*

| **Data source not yet wired** DataForSEO My Business Info endpoint returns service categories. Endpoint: /v3/business_data/google/my_business_info/live. Pass cid or place_id. Map returned service_categories array length to scoring bands above. Hardcoded to pass (0 deduction) until wired. |
| --- |

# **5. Composite Score to Gap Calculation**

## **5.1 Sum all signal scores**

const compositeScore =

  ratingScore + reviewScore + photoScore + hoursScore +

  responseScore + websiteScore + qaScore +

  descriptionScore + servicesScore;

## **5.2 Calculate composite penalty**

const compositePenalty = (100 - compositeScore) / 100;

## **5.3 Apply max penalty cap**

const MAX_PENALTY = 0.85;

const appliedPenalty = Math.min(compositePenalty, MAX_PENALTY);

*The 85% cap prevents unrealistic projections. Even a business that scores 0 on every signal cannot produce a penalty higher than 85%. When gbpExists = false the penalty is fixed at 60% and signal scoring does not run.*

## **5.4 Apply to gap formula per keyword**

keywordGbpGap = scaledMonthlySearches

              × positionOneCTR (0.44)

              × appliedPenalty

              × siteRetentionRate        // from Layer 3 PSI score

              × callToPurchaseRate (0.40) // fixed constant

              × tradeAvgSaleValue

              × 12

              × tradeRevenueSplit

              × seasonalDivisor

# **6. GBP Repair List — Per Signal Cost**

The GBP repair list is a new output added this session. It calculates the annual dollar cost of each individual signal weakness and surfaces it on the results screen ranked highest to lowest.

## **6.1 Cost per point**

function calcCostPerPoint(gbpGap, pointsLost) {

  if (!pointsLost || pointsLost === 0) return 0;

  return Math.round(gbpGap / pointsLost);

}

## **6.2 Repair list builder**

function calcGbpRepairList(signals, costPerPoint) {

  return signals

    .filter(s => s.pointsLost > 0)

    .map(s => ({

      signal: s.name,

      pointsLost: s.pointsLost,

      annualCost: s.pointsLost * costPerPoint

    }))

    .sort((a, b) => b.annualCost - a.annualCost);

}

## **6.3 Results screen display**

Label: "Your GBP repair list". Shows signal name and annual cost only. No fix instructions. No explanations. Ranked highest cost to lowest.

| **Signal** | **Annual cost** |
| --- | --- |
| Owner response rate | $X,XXX |
| Services listed | $X,XXX |
| Photos | $X,XXX |
| Description missing | $X,XXX |
| GBP Q&A activity | $X,XXX |

*Dollar amounts are business-specific. They depend on the business GBP gap, which depends on their city, trade, avg job value, and composite score. The repair list is always accurate to that specific business.*

# **7. Fixed Constants — Not User Inputs**

The following values were previously intake form fields. They are now fixed constants in the engine. Remove corresponding form fields.

| **Constant** | **Value** | **Notes** |
| --- | --- | --- |
| callToPurchaseRate | 0.40 | Invoca national home services average. Was intake form question — removed. Self-reported answers were unreliable. |
| adminHoursPerYear | 480 | Fixed at 40 hours per month. Admin staff count and hours per week fields removed from form. |
| capacityTimeSavingRate | 0.40 | ClearSky recovers 40% of admin hours through automation. |
| adminHourlyRate | $30 | Fixed. Was optional input — removed. |
| annualAdminSaving | $5,760 | Fixed output: 480 × 0.40 × $30. Same for every business. |

# **8. Intake Form — Final Field List**

These are the only fields remaining on the intake form after this session.

| **Field** | **Screen** | **Maps to** |
| --- | --- | --- |
| Business name | 1 | GBP lookup via Google Places API |
| City | 1 | Search volume scaling. citySearches = sudburyVolume × (cityHouseholds ÷ 73,000) × 1.20 |
| Website URL | 1 | PageSpeed Insights audit (Layer 3). Optional. |
| Trade(s) | 1 | Keyword sets for Layer 2 rank gap |
| Revenue split % per trade | 1 | tradeRevenueSplit in gap formula |
| Avg job value per trade | 1 | tradeAvgSaleValue in gap formula — not blended |
| Service categories (Choose 5) | 1 | Layer 4 content gap only — NOT Layer 2 rank tracking |
| Annual revenue | 2 | Capacity model baseline |
| Current capacity | 2 | Available capacity variable in capture rate. Drives Mode 1 or Mode 2. |
| Years in business | 3 | Review count benchmark (yearsInBusiness × 6) and brand tenure tier |

| **Fields removed this session** Remove from form: Number of technicians, Admin staff count, Admin hours per week, Call to purchase rate (10 calls question). These are now fixed constants in the engine. |
| --- |

# **9. Data Sources and API Calls**

| **Signal** | **API** | **Call details** |
| --- | --- | --- |
| Rating, review count, photos, hours, response rate, website, description | Google Places API | Single call per business using Place ID lookup. Bug 2: currently using text query — returns wrong business. Fix: switch to Place ID lookup. Remove 1-hour cache. |
| GBP Q&A activity | GMB API | Not yet wired. Returns totalQuestions and ownerAnsweredCount. Required for accurate Q&A scoring. |
| Services listed | DataForSEO My Business Info | Endpoint: /v3/business_data/google/my_business_info/live. Returns service_categories array. Count array length for scoring. |

# **10. Three Critical Bugs — Fix Before Testing**

| **#** | **Bug** | **Impact on Layer 1** | **Fix** |
| --- | --- | --- | --- |
| 1 | annualRevenue and yearsInBusiness not flowing to engine | Review benchmark uses default yearsInBusiness=5 for every business. Manito at 14 years gets expected=30 instead of 84. Wrong score on Signal 2. | Trace from request body through diagnostic-route.js to engine call. Verify with console.log before and after. |
| 2 | Layer 1 finding wrong business | All 9 signal scores based on wrong business data. Every gap calculation is wrong. | Replace text query with Place ID lookup. Use websiteUrl to find correct Place ID first. Remove next: { revalidate: 3600 } cache from fetchGBPLayer(). |
| 3 | Layer 7/8 crash on undefined property | Social and paid gaps return $0. Does not affect Layer 1 directly but crashes the diagnostic before results are returned. | Add null guards before all nested property access in social and paid gap calculations. |

# **11. Worked Example — Manito Plumbing, Timmins ON**

14 years in business. Real GBP: 4.8 stars, 137 reviews, 7 photos, hours published, website linked, no description, ~17% response rate. Q&A and services not yet wired.

| **Signal** | **Value** | **Points lost** | **Points earned** |
| --- | --- | --- | --- |
| Star rating | 4.8 stars | 0 | 35 |
| Review count | 137 (expected 84) | 0 | 25 |
| Photos | 7 photos | 2 | 6 |
| Hours complete | Published | 0 | 5 |
| Owner response rate | ~17% | 5 | 2 |
| Website linked | Yes | 0 | 5 |
| GBP Q&A activity | Not wired — 0 answered assumed | 4 | 0 |
| Description present | No | 4 | 0 |
| Services listed | Not wired — 0 assumed | 7 | 0 |
| TOTAL |  | 22 | 78 / 100 |

**Composite score: 78 out of 100**

Composite penalty: (100 − 78) ÷ 100 = 22%

Applied penalty: 22% — well below 85% cap

*Note: Q**&**A and services are currently unmeasured. When wired, if Manito has strong Q**&**A and services, their score improves. If weak, it drops further. The 78 score is a floor estimate, not final.*

# **12. Files That Change**

| **File** | **What changes** |
| --- | --- |
| lib/clearsky-engine.js | Replace all 9 signal functions with updated versions in this spec. Update calcGbpGap() to use new composite score. Add calcCostPerPoint() and calcGbpRepairList() functions. Update fixed constants: callToPurchaseRate = 0.40, adminHoursPerYear = 480, capacityTimeSavingRate = 0.40, adminHourlyRate = 30. |
| app/api/diagnostic/route.js | Fix Bug 1: pass annualRevenue and yearsInBusiness from request body to engine. Fix Bug 2: replace text query with Place ID lookup in fetchGBPLayer(). Remove 1-hour cache. Add DataForSEO My Business Info call for services data. Add GMB API call for Q&A data when available. |
| app/ClearSkyIntakeForm.jsx | Remove fields: number of technicians, admin staff count, admin hours per week, call to purchase rate. Keep all remaining fields listed in Section 8. |

*ClearSky Software — Layer 1 Developer Specification — Session 15/16 — April 2026 — Confidential*

*Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564*