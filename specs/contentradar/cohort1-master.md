| **ContentRadar** Cohort 1 — Complete Architecture & Intelligence Framework Contractors Vertical — Plumbing · HVAC · Electrical · Roofing ClearSky Software  ·  May 2026  ·  Confidential |
| --- |

| This document is the complete reference for Cohort 1 — what it is, how it is built, what it monitors, what intelligence it produces, and how that intelligence is used to sell and retain licensed clients. Every decision in this document is locked unless explicitly revisited. |
| --- |

# **1. What Cohort 1 Is**

Cohort 1 is a continuously monitored group of 1,200 best-practice trades contractors across Canada and the United States — 300 per trade across plumbing, HVAC, electrical, and roofing. These businesses are not ClearSky clients. They are the external benchmark — the reference point that defines what excellent digital presence looks like in the trades industry.

Cohort 1 answers one question for every licensed client: compared to the best operators in your trade across North America, where are you — and what specifically are they doing that you are not?

| **Cohort 1 — Benchmark** | **Cohort 2 — Licensed Clients** |
| --- | --- |
| 1,200 businesses (300 per trade) | 50–100 licensed clients |
| External signals only — 60 signals scored | All 72 signals scored — includes A2P and referral |
| No private data access | Full A2P platform data access |
| Defines best practice — the ceiling | Compared against Cohort 1 — the gap |
| Monitored continuously — produces intelligence | Improved continuously — consumes intelligence |
| Never mixed with Cohort 2 | Never mixed with Cohort 1 |

# **2. How Cohort 1 Is Built — The Selection Pipeline**

## **2.1 — Starting Pool**

4,000 contractor businesses — 1,000 per trade — identified programmatically via DataForSEO Google Maps endpoint. Geographic spread enforced: no more than 200 businesses from any single city, no more than 400 from any single province or state. Rural and small-market businesses prioritised to match the markets ClearSky serves.

Entry conditions — all three required:

- Has a working website URL

- Has a claimed Google Business Profile listing

- GBP lists the relevant trade as a primary service

## **2.2 — Gate 1: Quality Floor (locked May 2026)**

Applied before any signal scoring. Eliminates businesses that do not represent genuine operational quality. Four locked thresholds:

| **Threshold** | **Value** | **Why** |
| --- | --- | --- |
| Minimum GBP star rating | **≥ 4.2 stars** | Below 4.2 signals genuine service quality problems no digital presence can fix |
| Minimum review count | **Years × 4 reviews** | Tenure-adjusted. A 10yr contractor needs 40 reviews. A 2yr contractor needs 8. |
| Review recency | **≥ 1 review in last 6 months rated ≥ 3 stars** | Confirms business is active. One recent 3-star+ review is the floor. |
| Franchise flags | **Subdomain + location nav → flagged for human review** | Franchise digital presence is not representative of independent operators. |

## **2.3 — Pre-Ranking Pass**

Gate 1 survivors are scored on 20 website and GBP signals. Top 300 per trade advance by score. This ranking is automated — no human involvement. Cost: approximately $732 across 4,000 businesses.

## **2.4 — Full 38-Signal Score**

The top 300 per trade receive a full automated score across all 38 externally-accessible signals. All six integrations run in parallel. Cost: approximately $1,300 across 1,200 businesses at 2026 Apify pay-per-CU pricing.

## **2.5 — Gate 3: Human Review**

The top 400 candidates per trade (300 selected + 100 buffer) are reviewed by a human. Five minutes per business. The reviewer confirms:

- Reviews appear authentic — not purchased or incentivised

- Website content is genuinely useful — not thin SEO padding

- Business is operationally active — recent posts, current hours, live phone

- No evidence of franchise template or agency-manufactured digital presence

- Business size is appropriate — no national chains with $400K marketing budgets

Final 300 per trade are locked as Cohort 1. These do not change until the next quarterly refresh.

# **3. What Cohort 1 Is Scored On — The 60 Signals**

Every Cohort 1 business is scored on 60 signals across four customer journey stages. Each signal is scored 0 (not present), 1 (weak), 2 (functional), or 3 (best practice). Maximum possible score: 180 points.

| **Stage** | **Signals** | **Max pts** | **% of 180** | **What it measures** |
| --- | --- | --- | --- | --- |
| Discovery | 15 | 45 | 25.0% | Getting found — GBP, website presence, directories, geographic visibility |
| Engagement | 18 | 54 | 30.0% | Holding attention — content, reviews, social, FAQ, gallery |
| Conversion | 15 | 45 | 25.0% | Turning visitors into booked jobs — contact friction, pricing, schema, seasonal |
| Growth | 12 | 36 | 20.0% | Long-term digital equity — AI authority, share of voice, review footprint, video |
| **TOTAL** | **60** | **180** | **100%** | **Content Gap % = Score / 180** |

The 12 signals outside this gap score (A2P signals 61–66 and referral network signals 67–72) are scored for Cohort 2 licensed clients only and are not part of the Cohort 1 benchmark.

## **3.1 — The Six Data Collection Integrations**

| **Integration** | **Platforms / APIs** | **Signals fed** | **Cost per contractor** | **Method** |
| --- | --- | --- | --- | --- |
| Website fetch + Claude | node-fetch + Anthropic API | 1–10, 55–60 | $0.05–$0.10 | 2 + 3 |
| Google Places API | Google Cloud — Places API | 11–18 | $0.017 | 1 |
| Apify scrapers | Facebook, Nextdoor, HomeStars, Houzz, Angi, BBB | 19–35 | $0.02–$0.08 | 1 + 2 |
| ValueSERP API | valueserp.com | 40, 43, 51–54 | $0.02–$0.09 | 2 |
| YouTube Data API v3 | Google Cloud — YouTube | 44–47 | $0.00 (free) | 1 + 2 |
| AI Platform APIs | OpenAI, Gemini, Perplexity | 48–50 | $0.013 | 3 |
| **TOTAL per contractor** |  | **60 signals** | **$0.10–$0.30** |  |

# **4. What Cohort 1 Produces — The Four Intelligence Outputs**

Cohort 1 monitoring produces four distinct types of intelligence. These are not reports — they are live data streams that update weekly and quarterly. Each one feeds a different part of the ClearSky client relationship.

## **4.1 — Output 1: The Benchmark Score**

The foundational output. For every Cohort 1 business, 60 signals scored 0–3. These scores are averaged per signal, per trade, per benchmark tier to produce the reference point that every licensed client is measured against.

- **Aspirational benchmark  —  **Top 10% tier (top 30 per trade) — aspirational benchmark. Shows what the absolute best operators in the industry do. Displayed to clients as the ceiling.

- **Operational benchmark  —  **Top third tier (top 100 per trade) — operational benchmark. Used in the Content Gap % calculation. Represents achievable best practice for a well-resourced independent operator.

The Content Gap % = Licensed client's score / (Cohort 1 operational tier average × 60 signals). This percentage feeds directly into ClearSky Layer 4 and is translated into a recoverable revenue dollar figure. This is the number on the screen in the client presentation.

## **4.2 — Output 2: The Content Intelligence Feed**

The most commercially valuable output for client retention. Every week, ContentRadar detects what new content is being produced across all 1,200 Cohort 1 businesses and classifies it by topic, trade, and intent bucket.

How it works:

- Weekly scan runs page fetcher across all 1,200 businesses

- SHA-256 hash compared to stored hash — unchanged pages skipped

- Changed pages: text diff extracts what was specifically added

- Claude classifies new content: blog post / video / FAQ / GBP post / new page

- Topic tag assigned from keyword taxonomy: seasonal HVAC / emergency plumbing / electrical safety / roofing storm damage etc.

- Entry written to cr_content_events with timestamp and baseline signal snapshot

| Example output: In the last 14 days, 18 of the top 30 HVAC contractors in Cohort 1 published furnace preparation content. First detected October 1st. ValueSERP shows demand for furnace-related keywords spiking 40% above baseline. Your licensed HVAC clients should be publishing this content now — 4–6 weeks before peak. |
| --- |

## **4.3 — Output 3: The Question Intelligence Feed**

Captures what homeowners are asking — derived from what the best contractors are actively answering. When 40 of the top 300 plumbers add a new FAQ question in the same 30-day window, that question is being asked in the market. It becomes a brief.

- New FAQ questions detected via page diff and NLP extraction

- New GBP Q&A entries detected via Places API count change

- Google People Also Ask boxes captured via ValueSERP for primary trade keywords

- YouTube video titles parsed for question formats — 'How to...', 'What causes...', 'Why does...'

- AI platform question mining — Perplexity surfaces what homeowners ask AI before they call a contractor

Questions are deduplicated across the cohort and ranked by how many businesses addressed the same question in the same period. The top 10 questions per trade per week become the FAQ brief, the blog brief, and the GBP Q&A brief delivered to licensed clients.

## **4.4 — Output 4: The Attribution Intelligence Layer**

Closes the loop between content recommendation and business outcome. This is what separates ContentRadar from a content calendar tool. Without it, content recommendations are opinions. With it, they are observed industry evidence.

**The measurement timeline**

Every piece of content detected in the feed is tracked against business outcomes at five time points:

| **Point** | **When** | **What is measured** |
| --- | --- | --- |
| **T=0** | At content detection | Baseline snapshot: Map Pack position, GBP views (7-day), review count, YouTube views on recent videos, AI platform mention status |
| **T+14** | 14 days after | Page indexed by Google? GBP view delta. YouTube view velocity (organic vs subscriber views). Early indicator pass/fail. |
| **T+30** | 30 days after | AI platform re-query — did contractor enter responses for topic-relevant queries? YouTube organic discovery rate. |
| **T+60** | 60 days after | Map Pack position for closest matching keyword. Search share of voice delta. Review velocity change. |
| **T+90** | 90 days after | Gap score delta on signals most related to content type. A2P inquiry delta for licensed Cohort 2 clients. |

| The pattern that emerges: 40 HVAC contractors published furnace preparation content in October. By December, 34 of those 40 showed improved Map Pack position for furnace-related keywords — an average improvement of 1.4 positions. 28 of 40 showed increased GBP views in November vs October. This is not proof — but it is observed correlation across 40 independent data points. That is a defensible, actionable brief. |
| --- |

**Signal correlation analysis — what actually moves the needle**

With 1,200 businesses scored on 60 signals, Cohort 1 is a dataset large enough to run meaningful correlation analysis. This answers the most important question: which signals are most strongly associated with dominant search presence and high overall gap scores?

- Signal importance ranking — correlation between each signal's score and overall gap score across all 1,200 businesses. Signals that are tightly correlated with high performers are the ones that matter most.

- Signal cluster analysis — which signals always move together? These become recommended action sequences for licensed clients.

- Differentiation analysis — signals with high variance across the cohort are the ones where best operators separate from the pack. Low-variance signals are table stakes.

- Lag analysis — after quarterly re-scores, compare signal improvements between Q1 and Q2 against business outcome changes between Q2 and Q3. This is the strongest attribution available without a controlled experiment.

# **5. Database Architecture — What Gets Stored**

All Cohort 1 data lives in PostgreSQL alongside the existing ClearSky database. All tables are prefixed cr_ to avoid collision. Schema is live — run contentradar_schema.sql once to create.

| **Table** | **Status** | **What it stores** |
| --- | --- | --- |
| cr_businesses | **Live** | All 1,200 Cohort 1 businesses — name, trade, city, URLs, years in business, Gate 1 result, cohort tier assignment |
| cr_page_snapshots | **Live** | Every page fetched — extracted text, SHA-256 hash, fetch status. Hash enables quarterly change detection. |
| cr_score_runs | **Live** | Every scoring run — timing, cost, pages changed vs skipped, Claude calls made. |
| cr_signal_scores | **Live** | Primary read table — one row per signal per business per run. Score, note, Claude prompt stored. |
| cr_benchmark_averages | **Live** | Cohort 1 averages per signal per trade per tier. Updated after each quarterly refresh. Replaces cohort1Averages.js. |
| cr_gbp_data | **Live** | Raw Google Places API response — rating, reviews, photos, hours, services, Q&A count. |
| cr_apify_data | **Live** | Raw Apify scraper results per platform — Facebook, Nextdoor, HomeStars, Houzz, Angi, BBB. |
| cr_gate1_log | **Live** | Complete Gate 1 audit trail with locked constants snapshot at evaluation time. |
| cr_content_events | **To build** | New content detected: blog post / video / FAQ / GBP post / new page. Topic tag, intent bucket, published_at, T=0 signal baseline snapshot. |
| cr_signal_snapshots | **To build** | Fast-moving signal readings at T=0, T+14, T+30, T+60, T+90 for each content event. Map Pack position, GBP views, review velocity. |
| cr_content_outcomes | **To build** | Pattern table — content type X in trade Y correlated with outcome Z at N days. This produces the attribution intelligence. |
| cr_cohort_trends | **To build** | Weekly aggregation — what content topics are spiking, what questions are emerging, what's changing across the cohort. |

# **6. Maintenance Cadence**

| **Frequency** | **What runs** | **Cost** | **Output** |
| --- | --- | --- | --- |
| **Weekly** | Content detection scan — page fetch, hash compare, diff, Claude classify | ~$5–15/week | cr_content_events updated. Question feed refreshed. cr_cohort_trends updated. |
| **Monthly** | Review velocity check — GBP + Facebook review counts. YouTube subscriber/view delta. Competitor LSA monitoring. | ~$20–40/month | cr_signal_snapshots for T+30 points. Market change alerts for licensed clients. |
| **Quarterly** | Full signal re-score (hash-based diff). ~20% of pages re-scored. Cohort composition review — declining businesses replaced. | ~$30–55/quarter | cr_signal_scores updated. cr_benchmark_averages recalculated. Gap scores refreshed for all licensed clients. |
| **Annual** | Full re-score of all 1,200 businesses regardless of hashes. Signal calibration review. Cohort composition audit. | ~$120–180 | Benchmark recalibrated. Prompt improvements applied retroactively. Annual intelligence report produced. |

# **7. Total Cost Model**

| **Item** | **Cost** | **Notes** |
| --- | --- | --- |
| Initial Cohort 1 build — API costs | **$130–$370** | Revised down 95% from original estimate. Apify 2026 pay-per-CU model. |
| Weekly content detection scan | ~$5–15/week | $260–$780/year |
| Monthly signal monitoring | ~$20–40/month | $240–$480/year |
| Quarterly hash-based re-score (3×) | ~$30–55/quarter | $90–$165/year |
| Annual full re-score (1×) | ~$120–180 | Once per year |
| **TOTAL annual running cost** | **~$710–$1,605/year** | Full weekly content feed + monthly + quarterly + annual re-score |
| **Cost per licensed client (at 50 clients)** | **~$14–$32/client/year** | Benchmark intelligence cost is negligible relative to licence revenue |

# **8. How Cohort 1 Sells the SaaS**

Cohort 1 is not just a technical asset — it is the primary sales tool. Every component of the Cohort 1 intelligence framework has a direct translation into a reason a contractor pays for a ClearSky licence.

## **8.1 — The Diagnostic Presentation (Meeting 1)**

The gap score is the hook. When a prospect sees their score compared to the top 300 contractors in their trade across North America, they understand two things simultaneously: where they are, and what the gap costs them in revenue.

- Their Content Gap % expressed as a dollar figure via ClearSky Layer 4 revenue formula

- Their signal scores vs Cohort 1 operational benchmark — signal by signal

- The three signals with the largest gap — these become the roadmap

- What the top 10% of contractors in their trade do differently — the aspirational benchmark

| Sales moment: 'These 300 contractors are the best operators in your trade across North America. Here is exactly where you sit relative to them — and here is what that gap costs you in bookings you're not getting.' No competitor can make this statement with real data behind it. |
| --- |

## **8.2 — The Retention Tool (Ongoing)**

The content intelligence feed is why clients stay. Every week they receive a brief derived from what the best operators in their industry just published. This is not opinion — it is observed market behaviour from 1,200 monitored businesses.

- Weekly content brief — top 5 topics being published in their trade this week, timed to demand peaks

- Weekly question brief — top questions homeowners are asking that are not answered on their website

- Monthly market change report — what is shifting in their competitive landscape

- Quarterly gap score update — are they closing the gap or falling further behind

| Retention moment: 'Last week 18 of the top 30 HVAC contractors we monitor published furnace preparation content. Demand for furnace keywords is spiking. We briefed you on this 4 weeks ago and your content went live yesterday. Here is what we expect to see happen to your Map Pack position over the next 60 days — and we will report back.' This is why clients do not cancel. |
| --- |

## **8.3 — The Proof of Value (90-Day Check-In)**

The attribution intelligence layer closes the loop. At 30, 60, and 90 days after any content action, clients see measured outcomes on the signals most likely to move. This turns content marketing from faith into evidence.

- Map Pack position before and after content published

- GBP view delta in the 30 days following content publication

- Review velocity change — are more customers calling and reviewing?

- AI platform visibility — did they start appearing in responses they weren't in before?

- For A2P clients — inquiry volume and intent bucket distribution before and after

| Proof moment: 'You published furnace preparation content on October 3rd. Today is December 1st. Your Map Pack position for furnace repair Timmins moved from position 4 to position 2. Your GBP views in November were up 34% vs September. 34 of the 40 contractors we tracked who published this same content type showed similar improvements. The content worked.' This is what makes the renewal conversation effortless. |
| --- |

## **8.4 — The Competitive Moat**

After two years of quarterly re-scores and weekly content monitoring, the Cohort 1 dataset becomes an asset that is effectively impossible for a competitor to replicate quickly. It takes time to build — and the longer it runs, the more valuable it becomes.

- 1,200 businesses scored on 60 signals quarterly — 4.8 million signal data points per year

- Weekly content event stream — what the industry's best operators produce and when

- Attribution pattern library — which content types correlate with which outcomes in which trades

- Trend data showing how best practice is evolving — AI authority signals growing, Facebook video dominant, LSA pressure increasing

A competitor starting today cannot replicate two years of quarterly data, a trained attribution pattern library, and a validated 1,200-business benchmark cohort. This is the moat. The longer it runs, the wider it gets.

# **9. Build Agenda — What Remains**

## **9.1 — Complete (built this session)**

- Gate 1 quality floor — 4 locked thresholds, fully coded and tested (gate1.js)

- pageFetcher.js — smart page discovery, classification, parallel fetch, labelled content sections

- scorersMethod1.js — 19 deterministic formula functions, zero Claude dependency

- scorersMethod2.js — 26 rules-gate + Claude functions, parallel execution

- scorersMethod3.js — 15 pure Claude prompt functions, sub-question pattern

- valueSerpScorer.js — 6 signals automated, 18 keyword templates × 4 trades

- apifyScorer.js — 6 platforms, schema validator, cost estimator

- aiPlatformScorer.js — 3 AI platform APIs, 18 queries, citation source detection

- youtubeScorer.js — 4 signals, intent bucket NLP, upload frequency, view trajectory

- signalPipeline.js — master orchestrator, all methods, DB writes, gap score calculation

- contentradar_schema.sql — 8 tables, 3 views, all ENUMs and indexes

## **9.2 — To Build Next**

| **Item** | **Priority** | **What it unlocks** |
| --- | --- | --- |
| Wire all integrations into signalPipeline.js | **High** | First end-to-end working score on a real contractor website |
| Apify schema validation (5 platforms) | **High** | Facebook, Nextdoor, HomeStars, Houzz, Angi scores become reliable |
| Method 3 prompt calibration (15 signals) | **High** | Claude scoring consistency across all pure-judgment signals |
| cr_content_events table + detection scanner | **High** | Content intelligence feed — what Cohort 1 is publishing this week |
| cr_signal_snapshots + cr_content_outcomes | **High** | Attribution intelligence layer — what moved after content was published |
| Cohort 1 candidate pool build (DataForSEO) | **Pre-launch** | The actual 4,000 businesses to score |
| Cohort 1 scoring run + human review | **Pre-launch** | Locks the 1,200 businesses and produces benchmark_averages |
| ClearSky Layer 4 wiring | **Pre-launch** | Replaces Firecrawl mock with live ContentRadar gap score |
| Meeting 1 intake form — referral network | **Pre-launch** | Enables signals 67–72 to be scored for Cohort 2 clients |
| Weekly brief generation (content + question) | **Post-launch** | The weekly deliverable that drives client retention |
| 90-day attribution report | **Post-launch** | Proof of value at renewal conversations |
| Signal correlation analysis engine | **Post-launch** | Ranked list of signals by observed impact on Map Pack position |
| A2P data connector | **Post-launch** | Signals 61–66. Closes the loop for Cohort 2 with private inquiry data. |

# **10. Locked Constants — Do Not Change Without Explicit Approval**

| **Constant** | **Value** | **Notes** |
| --- | --- | --- |
| COHORT1_TOTAL_SIZE | **1,200** | 300 per trade × 4 trades. Locked. |
| COHORT1_PER_TRADE | **300** | Hard cap. Applied independently per trade before combining. |
| CANDIDATE_POOL_TOTAL | **4,000** | 1,000 per trade for pre-ranking pass. |
| GATE1_MIN_RATING | **4.2 stars** | Overall GBP star rating. Below this = eliminated. |
| GATE1_REVIEWS_PER_YEAR | **× 4** | Years in business × 4 = minimum review count. |
| GATE1_RECENCY_WINDOW | **180 days** | At least 1 review in last 6 months. |
| GATE1_RECENCY_MIN_REVIEWS | **1** | Minimum 1 review in recency window. |
| GATE1_RECENCY_MIN_RATING | **3.0 stars** | That recent review must be 3 stars or higher. |
| ASPIRATIONAL_TIER | **Top 30 per trade** | Display only — not used in gap calculation. |
| OPERATIONAL_TIER | **Top 100 per trade** | Used in Content Gap % formula. |
| GAP_SCORE_MAX | **180** | 60 signals × 3 points maximum. |
| SIGNAL_SCALE | **0, 1, 2, 3** | Four levels. 0=not present, 1=weak, 2=functional, 3=best practice. |
| STAGE_WEIGHTS | **25/30/25/20%** | Discovery/Engagement/Conversion/Growth. Locked May 2026. |
| SIGNAL_26_STAGE | **Growth** | Nextdoor Recommendations reclassified from Engagement. Locked May 2026. |
| REFRESH_CADENCE | **Quarterly + annual** | Hash-based quarterly. Full re-score annually. |
| GEOGRAPHIC_METRO_CAP | **200 per city** | No single city contributes more than 200 to the starting pool. |
| GEOGRAPHIC_REGION_CAP | **400 per province/state** | Prevents regional concentration. |

ClearSky Software  ·  ContentRadar Cohort 1 Master Document  ·  May 2026  ·  Confidential

Rory Dredhart  ·  r.dredhart@clearskysoftware.net  ·  705-274-9564