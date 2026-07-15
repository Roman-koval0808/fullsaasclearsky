ClearSky Software

**Digital Health Diagnostic**

*Technical Specification **&** Revenue Valuation Model — Trades Vertical — Version 2.4*

| **Document owner** | ClearSky Software |
| --- | --- |
| **Contact** | Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564 |
| **Version** | 2.4 — April 2026 |
| **Classification** | Confidential — Developer Build Brief |
| **Scope** | Contractors & Trades vertical (Plumbing · HVAC · Electrical · Roofing) |
| **Changes from v2.3** | Session 7: Brand Tenure Modifier (unconditional capture rate amplifier), Market Opportunity Multiplier (demand × competitive density), Diagnostic Confidence scoring + uncertainty spread, Three-Scenario Recovery Model (Current Reality / Market Opportunity / Full Potential), Brand Equity Index (Layer 11 seventh signal), brandedSearchPresent (Discovery signal 15). New onboarding inputs: yearsInBusiness, marketTierOverride. Total signals: 59 content + 4 NLP = 63 evaluations. |

| *Executive Summary: The ClearSky Digital Health Diagnostic analyses the complete digital presence of a small business contractor in under 90 seconds. It combines twelve external data sources with business-specific inputs to produce a personalised revenue gap analysis expressed in dollars, with a three-scenario recovery model showing what is possible given current demand, supply, and capacity.* |
| --- |

| **Section 1 — Revenue Valuation Formula (v2.4)** |
| --- |

**Complete Formula**

| **Step** | **Formula** |
| --- | --- |
| Step 1 — Canonical pre-adjustment | GBP_Gap_Adj = GBP_Gap × Canonical_Mult Rank_Gap_Adj = Rank_Gap × Canonical_Mult |
| Step 2 — Base gap | Base_Gap = GBP_Gap_Adj + Rank_Gap_Adj + Performance_Gap + Content_Gap + MissedCall_Gap + Social_Adjustment + Paid_Gap + Engagement_Gap |
| Step 3 — Total gap | Total_Gap = Base_Gap × AI_Risk_Multiplier × Seasonal_Multiplier × Market_Opportunity_Multiplier |
| Step 4 — Projected revenue | Projected_Revenue = Current_Annual_Revenue + Total_Gap + Capacity_Lift |
| Step 5 — Capture rate | Capture_Rate = (Weighted_Score / 3.0) × 0.85 × Brand_Tenure_Modifier Range 0%–85%. No floor. |
| Step 6 — Recoverable revenue | Recoverable_Revenue = Total_Gap × Capture_Rate |
| Step 7 — Personalization lift | Personalization_Lift = Recoverable_Revenue_at_full_score − Recoverable_Revenue_at_current_score |
| Step 8 — Capacity lift (v2.3) | Capacity_Lift = Idle_Capacity_Value + Annual_Cost_Saving Saved_Hrs = adminStaffCount × adminHoursPerWeek × 0.40 |
| Step 9 — Social_Adjustment (v2.3) | Social_Adjustment = Sentiment_Mult + Unanswered_Mentions + Posting_Gap + Engagement_Gap_Social + Response_Gap |
| Step 10 — Market Opportunity Multiplier (v2.4) | Market_Opportunity_Multiplier = Market_Demand_Index × Competitive_Density_Index |

**The Six Multipliers (v2.4)**

| **Multiplier** | **Range** | **Applied to** |
| --- | --- | --- |
| Seasonal | (Peak + Q2 + Q3 + Q4) / 4 / 100. Default Northern Ontario profile: 0.7375 | Base Gap → Total Gap |
| AI Risk | 1.00–1.20 based on AI platform visibility (0–4 platforms) | Base Gap → Total Gap |
| Engagement | 0.55–1.00 based on 8 engagement signals | Within rank, content, AI gap calculations |
| Citation | 1.00–1.28 applied to rank gap | Rank Gap (via calcRankGap) |
| Canonical (Layer 12) | 1.00–1.35 based on surface alignment. Duplicate GBP adds 1.05×, capped at 1.35× | GBP Gap + Rank Gap (pre-adjustment) |
| Market Opportunity (v2.4) | Market_Demand_Index × Competitive_Density_Index. Range ~0.64–1.32 | Total Gap (after AI + Seasonal) |
| Brand Tenure (v2.4) | 0.85–1.15 based on years in business. Unconditional. | Capture Rate only — not the gap |

| **Section 2 — Prospect Input Flow (v2.4)** |
| --- |

Existing inputs unchanged from v2.3. Two new inputs added in Session 7:

| **Input** | **Type** | **Default** | **Purpose** |
| --- | --- | --- | --- |
| yearsInBusiness | Integer — onboarding intake | 5 | Drives Brand Tenure Modifier and Brand Equity Index review depth benchmark |
| marketTierOverride | Dropdown — onboarding intake (optional) | Lookup by city, falls back to neutral | Overrides city lookup table for Market Demand Index. Options: booming / strong / neutral / slow / depressed |
| adminHoursPerWeek | Integer — onboarding intake | 8 | Replaces retired nonBillablePct. Used in admin time cost saving formula. |

| **Section 3 — Session 7 Model Components** |
| --- |

**Brand Tenure Modifier**

The Brand Tenure Modifier is an unconditional multiplier applied to the capture rate based on years in business. It reflects earned offline trust that exists independent of digital presence.

Design principle: the absence of digital brand equity signals does not reduce this modifier. A 20-year trades business in Timmins has a pool of past customers who know them by name — whether or not that shows up in Data365 or branded search volume. That trust exists. The modifier reflects it.

The modifier amplifies existing capture rate. It does not create implied revenue above zero. Zero digital signals × 1.08 = zero. The moment ClearSky starts closing digital gaps and capture rate rises above zero, the tenure modifier compounds every point of improvement.

| **Years in business** | **Modifier** | **Label** |
| --- | --- | --- |
| 21+ | 1.15× | Established — multi-generational recognition |
| 11–20 | 1.08× | Recognised — meaningful local recognition, inherited trust |
| 6–10 | 1.00× | Established — neutral baseline |
| 3–5 | 0.95× | Building — starting to build local name recognition |
| 0–2 | 0.85× | New — no ambient recognition, every conversion earned from scratch |

**Market Opportunity Multiplier**

Small markets with low competitor density and captive demand run hotter than neutral urban markets for a trades business. Fixing your digital presence in a market where you have two competitors is worth more per dollar than fixing it in a saturated urban market with forty competitors.

**Component 1 — Market Demand Index**

Economic tier from city lookup table or prospect override. Timmins = strong (1.10). Lookup table covers key Canadian trades markets. Extensible. Prospect override takes priority.

| **Tier** | **Multiplier** | **Profile** |
| --- | --- | --- |
| Booming | 1.15 | Resource boom, major development, fast-growing suburb |
| Strong | 1.10 | Small market, captive demand, low competition — Timmins |
| Neutral | 1.00 | Stable mid-size market, average competitor density |
| Slow | 0.90 | Flat economy, higher competition, softer consumer spending |
| Depressed | 0.75 | Severe contraction, major employer left, long-term decline |

**Component 2 — Competitive Density Index**

Derived from paid competitors in Layer 8 only — LSA + Google Ads + Meta Ads. Organic-only players are a lesser threat. Someone running LSAs is a committed competitor.

| **Paid competitors** | **Multiplier** | **Label** |
| --- | --- | --- |
| 0–1 | 1.15 | Near-monopoly — captures almost all recovered demand |
| 2–3 | 1.08 | Low density — strong capture advantage |
| 4–6 | 1.00 | Neutral — average competitive market |
| 7–10 | 0.92 | High density — harder to differentiate |
| 11+ | 0.85 | Very high density — significant share dilution |

| *Market_Opportunity_Multiplier = Market_Demand_Index × Competitive_Density_Index Total_Gap = Base_Gap × AI_Risk_Multiplier × Seasonal_Multiplier × Market_Opportunity_Multiplier* |
| --- |

**Diagnostic Confidence and Uncertainty Spread**

The engine scores data confidence per layer (1.0 / 0.5 / 0.25) and calculates an overall diagnosticConfidence score. This drives the uncertainty spread for the three-scenario recovery range shown in the results modal.

| *uncertaintySpread = 0.20 + (0.25 × (1 − diagnosticConfidence))  Full confidence (1.0) → ±20% band. Low confidence (0.5) → ±32.5% band. Minimum confidence (0.0) → ±45% band. The range narrows as the prospect provides more data — framing it as an invitation, not a disclaimer.* |
| --- |

**Three-Scenario Recovery Model**

The results modal shows three recovery scenarios. Each displays low/mid/high range on both Technical Gap and Recoverable Revenue. The framing: "what is possible given current demand, supply, and capacity."

| **Scenario** | **What it shows** | **Key variables** |
| --- | --- | --- |
| Current Reality | What the business recovers right now with current digital gaps and current capacity | Current capture rate × brand tenure modifier × current capacity utilization |
| Market Opportunity | What becomes recoverable as idle capacity fills to 85% ceiling via ClearSky | Current capture rate × brand tenure modifier × full capacity (85% ceiling) |
| Full Potential | What the market can sustain at full personalization score with market multiplier applied | personalizationCaptureCeiling (0.85) × brand tenure modifier × market opportunity multiplier |

| *The three-scenario model is displayed to the prospect in the results modal. It is not a confidence interval — it is strategic scenario planning grounded in real variables the engine already calculates.* |
| --- |

**Brand Equity Index (Layer 11)**

Scores whether an established business's offline word-of-mouth reputation is being captured digitally. Four signals, each pass/fail. Total index 0–4. Lives in Layer 11 as the seventh growth signal.

| **Signal** | **Pass condition** | **Data source** |
| --- | --- | --- |
| Review depth | reviewCount >= yearsInBusiness × 6 | GBP review count (Layer 1) |
| Branded search | ContentRadar detects business name as keyword with search volume | ContentRadar (Layer 4) |
| Social following | Follower count >= population-adjusted benchmark (200 for <50K market) | Facebook Graph API (Layer 7) |
| Unprompted mentions | >= 2 mentions in 90 days where business named without being tagged | Data365 (Layer 7) |

brandEquityEstablished (the seventh growth signal) passes if brandEquity.score >= 2. Growth score is now 0–7. Label bands: 6–7 Growth-ready, 4–5 Partially ready, 2–3 Early stage, 0–1 Not started.

**brandedSearchPresent — Discovery Signal 15**

Whether the business name appears as a tracked keyword with measurable search volume in ContentRadar. Branded searches are people who heard the name somewhere and looked it up — pure word-of-mouth converted to digital intent. The 15th Discovery-stage personalization signal.

Source: ContentRadar keyword data (Layer 4) or ps.brandedSearchPresent (Firecrawl pre-evaluated flag). No new API calls required.

| **Section 4 — Signal Counts (v2.4)** |
| --- |

| **Stage** | **Signals** | **NLP calls** | **Session 7 change** |
| --- | --- | --- | --- |
| Discovery | 15 | 1 | +1 brandedSearchPresent |
| Engagement | 19 | 1 | +3 in Session 6 (social signals) |
| Conversion | 11 | 1 | No change |
| Growth | 14 | 1 | +1 in Session 6 (socialPostingCadence) |
| Total | 59 content signals | 4 NLP calls | 63 total evaluations |

| **Section 5 — BENCHMARKS Constants (v2.4 Additions)** |
| --- |

| **Constant** | **Value** | **Purpose** |
| --- | --- | --- |
| brandTenureTiers | Array — see modifier table | Brand Tenure Modifier tiers by years in business |
| marketDemandTiers | Object — booming/strong/neutral/slow/depressed | Market Demand Index values |
| marketDemandLookup | Object — city name → tier key (expanded Session 11 to full Canadian coverage) | City lookup table, extensible. 100km/1-hour radius rule applied. |
| competitiveDensityTiers | Array — 0-1/2-3/4-6/7-10/11+ competitors | Competitive Density Index values |
| scenarioLabels | { current, market, potential } | Display labels for three scenarios |
| confidenceSpreadMin | 0.20 | Minimum uncertainty spread at full confidence |
| confidenceSpreadMax | 0.45 | Maximum uncertainty spread at zero confidence |
| reviewsPerYearBenchmark | 6 | Expected review accumulation rate for active trades business |
| brandedSearchFollowerMin | 200 | Minimum follower count for branded social presence in market <50K |
| brandEquityMentionsMin | 2 | Unprompted community mentions in 90 days to pass signal |
| yearsInBusinessDefault | 5 | Default when yearsInBusiness not provided at onboarding |
| adminHoursPerWeekDefault | 8 | Default admin hours per week — replaces retired nonBillablePct |
| capacityTimeSavingRate | 0.40 | ClearSky returns 40% of admin hours. Updated v2.3 (was 0.80). |
| socialPostingGapRate | 0.10 | Posting_Gap coefficient. v1 estimate. |
| socialEngagementGapRate | 0.03 | Engagement_Gap_Social coefficient. v1 estimate. |
| socialResponseGapRate | 0.10 | Response_Gap coefficient. v1 estimate. |

| **Section 6 — Terminology Reference (Sessions 1–7)** |
| --- |

| **Term** | **Definition** |
| --- | --- |
| Brand Tenure Modifier | Unconditional capture rate multiplier based on years in business. Reflects earned offline trust independent of digital presence. Range 0.85× (0–2 years) to 1.15× (21+ years). Applied to capture rate, not the gap. |
| Market Opportunity Multiplier | Market_Demand_Index × Competitive_Density_Index. Applied to Total_Gap. Reflects that fixing digital presence in a small captive market is worth more per dollar than in a saturated market. |
| Market Demand Index | Economic tier multiplier (0.75–1.15) from city lookup table or prospect override. Timmins = strong = 1.10. |
| Competitive Density Index | Multiplier based on count of paid competitors (LSA + Google Ads + Meta Ads). Range 0.85–1.15. |
| Diagnostic Confidence | Average data quality score across all 15 scored inputs (0.0–1.0). Drives uncertainty spread for three-scenario range. |
| Uncertainty Spread | 0.20 + (0.25 × (1 − diagnosticConfidence)). Determines low/mid/high range width in results modal. |
| Current Reality | Scenario 1. Recovery at current capture rate × brand tenure modifier, constrained by current capacity utilization. |
| Market Opportunity | Scenario 2. Recovery as idle capacity fills to 85% ceiling. Capture rate held at current. |
| Full Potential | Scenario 3. Recovery at full personalization score (85% capture) × brand tenure modifier × market opportunity multiplier. |
| Brand Equity Index | Score 0–4 measuring whether offline word-of-mouth is being captured digitally. Four signals: review depth, branded search, social following, unprompted mentions. Lives in Layer 11 as seventh growth signal. |
| brandedSearchPresent | Discovery signal 15. Pass if ContentRadar detects business name as keyword with search volume. Branded searches = people who heard the name and looked it up. |
| yearsInBusiness | Prospect onboarding input. Integer, default 5. Drives Brand Tenure Modifier and Brand Equity Index review depth benchmark (yearsInBusiness × 6 expected reviews). |
| marketTierOverride | Optional prospect onboarding input. Overrides city lookup for Market Demand Index. Options: booming / strong / neutral / slow / depressed. |
| adminHoursPerWeek | Prospect onboarding input replacing retired nonBillablePct. Integer, default 8. Used in: Saved_Hrs_Per_Week = adminStaffCount × adminHoursPerWeek × 0.40. |
| capacityTimeSavingRate | 0.40 as of v2.3 (was 0.80). ClearSky returns 40% of admin hours to the owner. Named BENCHMARKS constant. Recalibrate with real client data. |
| Social_Adjustment | Five-component Layer 7 output in Base Gap: Sentiment multiplier + Unanswered mentions + Posting_Gap + Engagement_Gap_Social + Response_Gap. |
| contentBenchmark() | Utility function: contentBenchmark(capacityGap, minVal, baseVal, maxVal). Floors at min at ceiling (gap ≤ 0.05), ramps to max at maximum idle capacity. |
| Posting_Gap | Quarterly capacity-weighted gap between actual and benchmark posting frequency. Uses actualPostsPerMonth and contentBenchmark(). |
| Engagement_Gap_Social | Revenue gap from social engagement rate below 2% trades benchmark. engagementRateScore = clamp(rate / 0.02, 0, 1.0). |
| Response_Gap | unansweredComments × avgSaleValue × 0.10. Comments where a customer asked a question with no owner reply within 72 hours. |

ClearSky Software — Digital Health Diagnostic Technical Specification — Version 2.4 — April 2026 — Confidential

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564