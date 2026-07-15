# ClearSky Software — Engine Reference SKILL

## Identity
- **Product:** ClearSky Software — invitation-only SaaS diagnostic tool for trades businesses
- **Founder:** Rory Dredhart, Timmins Ontario
- **Contact:** r.dredhart@clearskysoftware.net · 705-274-9564
- **Stack:** SvelteKit
- **Reference client:** Manito Plumbing and Heating Ltd, Timmins Ontario
- **Current session:** Session 20

---

## What ClearSky Does
ClearSky produces a personalised revenue gap analysis in dollars for trades businesses in Northern Ontario. The diagnostic pulls live data from Google Places API, DataForSEO, Google PageSpeed Insights, and Firecrawl. It runs the data through the ClearSky engine and produces a results screen showing the business owner exactly how much revenue they are losing and why.

---

## Codebase Location
- Engine: `src/lib/clearsky/clearsky-engine.js`
- Diagnostic route: `src/routes/api/diagnostic/+server.js`
- Orchestrator: `src/lib/clearsky/api-orchestrator.js`
- Intake form: `src/lib/components/ClearSkyIntakeForm.svelte`
- Results modal: `src/lib/components/ClearSkyResultsModal.svelte`
- Keywords route: `src/routes/api/keywords/+server.js`
- Trades route: `src/routes/api/trades/+server.js`

---

## Watch Markets — MARKET_CLUSTERS

| City | Households | Location Code | Tier |
|---|---|---|---|
| Timmins | 20,941 | 1002836 | active |
| Sudbury | 73,000 | 1002124 | active (index market) |
| North Bay | 30,737 | 1002116 | active |
| Kirkland Lake | 4,064 | 1002557 | active |
| Cochrane | 8,360 | 1002549 | slow |
| Kapuskasing | 8,360 | 1002549 | slow |
| Hearst | 8,360 | 1002549 | slow |
| Englehart | 5,401 | null | slow |
| New Liskeard | 5,401 | null | slow |
| Cobalt | 5,401 | null | slow |

Sudbury (73,000 households, location code 1002124) is the index market. All keyword volumes are queried at Sudbury and scaled to the prospect city.

---

## Trades Taxonomy — Complete

| Trade | Tags | Default avgSale | Active months |
|---|---|---|---|
| Plumbing | 39 | $1,500 | 12 |
| HVAC | 31 | $3,000 | 10 |
| Roofing | 22 | $5,000 | 6 |
| Siding | 15 | $6,000 | 7 |
| Windows and Doors | 17 | $1,200 | 9 |
| Residential Electrical | 30 | $2,000 | 12 |
| Commercial Electrical | 20 | $8,000 | 12 |

Plumbing and HVAC share a competitive threshold — they are often the same business in Northern Ontario (e.g. Manito Plumbing and Heating).

---

## Locked Constants — Session 19

```javascript
// CONVERSION
callToPurchaseRate:       0.048     // 0.12 × 0.40 — was 0.024
websiteToCallRate:        0.12      // was 0.06
winRate:                  0.40      // unchanged

// VOLUME
LongTailMultiplier:       1.35      // renamed from captiveMarketUplift
// captiveMarketUplift RETIRED — do not use
sudburyHouseholds:        73000

// CTR MODEL — CORRECTED SESSION 19
mapPackTotalCTR:          0.44      // total share clicking anywhere in pack
positionOneCTR:           0.255     // 0.44 × 0.58 — WAS 0.44
position2CTR:             0.128     // 0.44 × 0.29
position3CTR:             0.057     // 0.44 × 0.13
notInPackCTR:             0.030
ctrGapFloor:              0.10      // minimum recoverable gap

// EMERGENCY SALE VALUE
emergencyAvgSaleValue:    800       // flat — all trades — service call not project

// DEVICE SPLIT
mobileShare:              0.70
desktopShare:             0.30

// GBP
gbpMaxPenaltyCap:         0.85
gbpNoListingPenalty:      0.60
ultraConservativeDiscount: 0.85

// PENDING SESSION 20
// LSA displacement rates — not yet locked
// Google Ads displacement rates — not yet locked
// AI interception rate — not yet locked
```

---

## CTR Gap Table — Locked Session 19

positionOneCTR = 0.44 × 0.58 = 0.255
gap = max(positionOneCTR - currentCTR, 0.10 floor)

| Current position | CTR | Gap |
|---|---|---|
| Position 1 | 0.255 | 0.10 (floor applied) |
| Position 2 | 0.128 | 0.127 |
| Position 3 | 0.057 | 0.198 |
| Not in pack | 0.030 | 0.225 |

```javascript
function getCTRGap(position) {
  const pos1CTR    = 0.255;
  const currentCTR = position === 1 ? 0.255
                   : position === 2 ? 0.128
                   : position === 3 ? 0.057
                   : 0.030;
  return Math.max(pos1CTR - currentCTR, 0.10);
}
```

**LSA displacement table — pending Session 20**
Max 3 LSAs per page. Displacement rates (mobile and desktop) to be sourced and locked in Session 20.

---

## Intent Profiles — Locked Session 19

Every keyword in the taxonomy is pre-assigned to one intent bucket. The engine reads the intent bucket from the keyword data and applies the matching profile.

```javascript
const INTENT_PROFILES = {

  emergency: {
    // avgSaleValue: $800 flat — all trades (overrides intake value)
    mobile:  { directCall: 0.50, webVisit: 0.25, noEngagement: 0.25 },
    desktop: { directCall: 0.25, webVisit: 0.50, noEngagement: 0.25 }
  },

  active_project: {
    // avgSaleValue: intake form value
    mobile:  { directCall: 0.20, webVisit: 0.50, noEngagement: 0.30 },
    desktop: { directCall: 0.20, webVisit: 0.50, noEngagement: 0.30 }
  },

  comparison: {
    // avgSaleValue: intake form value
    mobile:  { directCall: 0.15, webVisit: 0.60, noEngagement: 0.25 },
    desktop: { directCall: 0.10, webVisit: 0.60, noEngagement: 0.30 }
  },

  research: {
    // avgSaleValue: intake form value
    mobile:  { directCall: 0.10, webVisit: 0.60, noEngagement: 0.30 },
    desktop: { directCall: 0.05, webVisit: 0.60, noEngagement: 0.35 }
  }
};
```

### Blended conversion rates per intent bucket

| Intent | Mobile rate | Desktop rate | Blended rate |
|---|---|---|---|
| emergency | 0.210 | 0.120 | 0.183 |
| active_project | 0.100 | 0.100 | 0.100 |
| comparison | 0.084 | 0.064 | 0.078 |
| research | 0.064 | 0.044 | 0.058 |

### Conversion paths
- **Direct callers:** × winRate (0.40) only — no website funnel
- **Website visitors:** × siteRetentionRate × websiteToCallRate × winRate

### Emergency avgSaleValue rule
Emergency intent always uses $800 regardless of trade or intake value. This represents a service call — stop the bleeding — not a project.

```javascript
function getAvgSaleValue(intentBucket, intakeAvgSaleValue) {
  return intentBucket === 'emergency' ? 800 : intakeAvgSaleValue;
}
```

---

## Plumbing and HVAC Keyword Intent Assignments

### Plumbing
| Keyword | Intent |
|---|---|
| plumber sudbury ontario | emergency |
| emergency plumber sudbury ontario | emergency |
| plumbing repair sudbury ontario | active_project |
| drain cleaning sudbury ontario | active_project |
| water heater repair sudbury ontario | active_project |

### HVAC
| Keyword | Intent |
|---|---|
| hvac sudbury ontario | active_project |
| furnace repair sudbury ontario | emergency |
| air conditioning sudbury ontario | active_project |
| heating and cooling sudbury ontario | active_project |
| ac repair sudbury ontario | active_project |

### Remaining trades — PENDING SESSION 20
Roofing, Siding, Windows and Doors, Residential Electrical, Commercial Electrical — intent assignments not yet made.

---

## The Gap Formula

### City scaling
```javascript
scaledVolume = sudburyVolume
             × (cityHouseholds / 73000)
             × LongTailMultiplier;   // 1.35
```

### calcJobsFromClicks()
```javascript
function calcJobsFromClicks(packClicks, intentBucket, siteRetentionRate) {
  const profile = INTENT_PROFILES[intentBucket];

  const mobileClicks      = packClicks * 0.70;
  const mobileDirectCalls = mobileClicks * profile.mobile.directCall;
  const mobileWebVisitors = mobileClicks * profile.mobile.webVisit;

  const desktopClicks      = packClicks * 0.30;
  const desktopDirectCalls = desktopClicks * profile.desktop.directCall;
  const desktopWebVisitors = desktopClicks * profile.desktop.webVisit;

  const directJobs = (mobileDirectCalls + desktopDirectCalls) * 0.40;

  const webJobs = (mobileWebVisitors + desktopWebVisitors)
                * siteRetentionRate
                * 0.12
                * 0.40;

  return directJobs + webJobs;
}
```

### Rank gap per keyword
```javascript
keywordRankGap =
  calcJobsFromClicks(
    scaledVolume × getCTRGap(currentPosition),
    intentBucket,
    siteRetentionRate
  )
  × getAvgSaleValue(intentBucket, intakeAvgSaleValue)
  × activeMonths;
```

### GBP gap per keyword
```javascript
keywordGbpGap =
  calcJobsFromClicks(
    scaledVolume × positionOneCTR × appliedPenalty,
    intentBucket,
    siteRetentionRate
  )
  × getAvgSaleValue(intentBucket, intakeAvgSaleValue)
  × activeMonths;
```

### Base gap formula
```
baseGap = layer1Gap + layer2Gap + contentGap
totalRecoverable = baseGap + (baseGap × tenureRate) + (baseGap × ecoRate)
ultraConservative = totalRecoverable × 0.85
```

---

## Brand Tenure Modifier Tiers

| Years | Rate | Label |
|---|---|---|
| 16+ | +0.16 | Legacy |
| 11–15 | +0.09 | Trusted |
| 6–10 | +0.04 | Established |
| 2–5 | -0.05 | Building |
| 0–1 | -0.15 | New |

## Economic Modifier Tiers

| Tier | Rate | Cities |
|---|---|---|
| Booming | +0.15 | — |
| Active | +0.05 | Timmins, Sudbury, North Bay, Kirkland Lake |
| Neutral | 0.00 | default |
| Slow | -0.15 | Cochrane, Kapuskasing, Hearst, Englehart, New Liskeard, Cobalt |
| Depressed | -0.30 | — |

---

## GBP Signal Scoring — 9 Signals (100 points)

| # | Signal | Max pts | Scoring |
|---|---|---|---|
| 1 | Star rating | 35 | Accelerating curve. 4.5+=35, below 3.0=0. Exponent 1.1. |
| 2 | Review count | 25 | Dynamic benchmark: yearsInBusiness × 6. Concave curve exponent 0.8. + recency decay + velocity nudge. NEW SESSION 19. |
| 3 | Photos | 8 | 8+=8, 4-7=6, 1-3=3, 0=0 |
| 4 | Hours complete | 5 | Binary |
| 5 | Owner response rate | 7 | Rate base + response recency decay + recent rate on last 20 reviews. NEW SESSION 19. |
| 6 | Website linked | 5 | Binary |
| 7 | GBP Q&A activity | 4 | answeredCount / totalQuestions. No questions = full marks. |
| 8 | Description present | 4 | Binary |
| 9 | Services listed | 7 | 5+=7, 3-4=5, 1-2=2, 0=0 |

### Signal 2 — Review scoring update (Session 19)
- **New data source:** DataForSEO Google Maps Reviews endpoint
- `POST https://api.dataforseo.com/v3/business_data/google/reviews/live`
- depth: 100, sort_by: newest
- Layer 1: volume score (existing curve — unchanged)
- Layer 2: recency decay (primary) — days since last review, 1.00→0.30 over 180 days
- Layer 3: velocity nudge (secondary) — reviews in last 90 days, nudge ±0.05

### Signal 5 — Response rate update (Session 19)
- Same data source as Signal 2 — reviewItems[] array
- Layer 1: all-time response rate (existing)
- Layer 2: response recency decay (primary, tighter thresholds — decay starts at 14 days)
- Layer 3: recent response rate on last 20 reviews (secondary nudge ±0.10)

### Signal 7 — Q&A (unchanged — mocked)
- Currently mocked — GMB API not yet wired
- No changes needed — correct as designed

---

## Session 19 Manito Reference Numbers — LOCKED

**Baseline before LSA, Ads, AI displacement. Session 20 will adjust downward.**

```
Inputs:
  scalingFactor:     0.3873
  ctrGap:            0.225 (not in pack)
  GBP penalty:       15% (85/100 composite)
  siteRetentionRate: 0.85

Layer 2 — Rank Gap:
  plumber (Emergency $800):           $27,480
  emergency plumber (Emergency $800): $2,492
  plumbing repair (Active $1,500):    $3,132
  drain cleaning (Active $1,500):     $469
  water heater repair (Active $1,500):$469
  PLUMBING RANK TOTAL:                $34,042

  hvac (Active $3,000):               $25,110
  furnace repair (Emergency $800):    $8,280
  air conditioning (Active $3,000):   $7,080
  heating and cooling (Active $3,000):$7,080
  ac repair (Active $3,000):          $4,440
  HVAC RANK TOTAL:                    $50,331

  Layer 2 total:                      $102,353

Layer 1 — GBP Gap:
  Plumbing GBP gap:                   $8,839
  HVAC GBP gap:                       $8,552
  Layer 1 total:                      $17,391

Content Gap:                          $0 (not yet live)

Base gap:                             $119,744
Tenure (+0.09 — 14 years Trusted):   +$10,777
Economic (+0.05 — Timmins Active):   +$5,987
Total recoverable:                    $136,508
Ultra conservative (×0.85):          $116,032
```

---

## Competitive Threshold Data

| Trade | Households per company (competitive) | Status |
|---|---|---|
| Plumbing / HVAC combined | 560 | Confirmed |
| Roofing | TBD | Pending Session 20 |
| Siding | TBD | Pending Session 20 |
| Windows and Doors | TBD | Pending Session 20 |
| Residential Electrical | TBD | Pending Session 20 |
| Commercial Electrical | TBD | Pending Session 20 |

Timmins plumbing/HVAC: 35 businesses, 20,941 households = 598 households per company = essentially competitive (threshold 560). captiveMarketModifier retired — capital flows to opportunity, markets self-correct. winRate stays flat at 0.40 for all markets. Competitor count used for results screen display only.

---

## Known Bugs in Codebase

### Bug 1 — yearsInBusiness
Partially fixed in diagnostic route via intakeInputs mapping. Needs live Manito test to confirm value reaches engine correctly.

### Bug 2 — GBP wrong business
fetchGooglePlacesIdentity() still uses findplacefromtext without proper Place ID by URL lookup. May return wrong business. Not fixed.

### Bug 3 — Null guards
Appears resolved via optional chaining throughout orchestrator. Confirm with live test.

### Bug 4 — organicConversionRate missing
calcContentGap() references BENCHMARKS.organicConversionRate which does not exist in the BENCHMARKS object. Produces NaN silently. Add to BENCHMARKS or remove the reference.

---

## Retired Functions — Remove from Engine

- `calculateSeasonalMultiplier()` — retired. Seasonal divisor now expressed as activeMonths directly.
- `calcCapacityLift()` — retired. Agreed to remove.
- `calcConversionInfrastructureAdjustment()` — retired.
- `calcMissedCallGap()` from baseGap — move to display-only context on results screen.

---

## Extended Pipeline — Currently Gated

Firecrawl, PageSpeed Insights, AI visibility, and market data only run when `inputs?.debug?.fullPipeline === true`. For a normal diagnostic run these are all null. This means siteRetentionRate always defaults to 0.80 (zero PSI score). Needs to be unwired from the debug flag.

---

## NLP — Switch from OpenAI to Claude

Both the scraper layer and AI visibility layer currently call `api.openai.com` with `gpt-4o-mini`. All NLP tasks should use Claude API (`claude-sonnet-4-6`) instead.

---

## DataForSEO Endpoints in Use

| Endpoint | Purpose |
|---|---|
| `/v3/keywords_data/google_ads/search_volume/live` | Sudbury keyword volumes |
| `/v3/serp/google/organic/live/advanced` | Rank positions + LSA/Ad detection |
| `/v3/business_data/google/questions_and_answers/live` | Q&A for Signal 7 |
| `/v3/business_data/google/my_business_info/live` | Services for Signal 9 |
| `/v3/business_data/google/reviews/live` | NEW Session 19 — full review history for Signals 2 and 5 |

Sudbury location code: **1002124** (locked — all volume queries use this)

---

## Documents Produced — Session 19

| Document | Contents |
|---|---|
| clearsky-gbp-signals-2-5-spec.docx | Signal 2 and Signal 5 review scoring update. New DataForSEO endpoint, recency decay, velocity nudge. |
| clearsky-constants-update-session19.docx | Two constant changes, CTR model correction, emergency avgSaleValue, Manito reference numbers. |
| clearsky-revenue-model-intent-spec.docx | Complete developer spec for intent profiles and device split. Four functions with full code, worked examples, test checklist. |

**Superseded — discard:**
- clearsky-gbp-signal2-review-spec.docx — Signal 2 only, superseded by combined doc

---

## Session 20 Agenda — Pending

1. **LSA displacement rates** — source from BrightLocal or research. Build full table: position × LSA count × device. Max 3 LSAs per page.
2. **Google Ads displacement rates** — same approach. Ads appear below LSAs above Map Pack.
3. **AI interception rate** — lock defensible value. Current estimate 5% blended. Varies by intent bucket.
4. **Intent bucket assignments** — remaining trades: Roofing, Siding, Windows and Doors, Residential Electrical, Commercial Electrical. Each keyword needs emergency / active_project / comparison / research.
5. **Competitive threshold data** — remaining trades. Roofing, Siding, Windows, Electrical — TBD. Results screen display only.
6. **Rebuild constants document** — incorporate all Session 20 additions.

---

## How to Use This Skill

At the start of each session:
1. Read this file completely before responding to any request
2. Treat all locked constants as immutable unless Rory explicitly changes them
3. Always verify Manito reference numbers against the locked values above
4. Do not implement Session 20 pending items until confirmed in that session
5. When producing documents always use the docx skill at /mnt/skills/public/docx/SKILL.md
