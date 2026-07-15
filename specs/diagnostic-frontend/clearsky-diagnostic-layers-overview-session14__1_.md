**ClearSky Software**

Diagnostic Layers — Complete Overview

Session 14 — April 2026

Confidential — Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564

*This document describes every layer of the ClearSky diagnostic — what it measures, why it matters, how it collects data, what it feeds into the engine, and its current status. It is the authoritative reference for understanding how the diagnostic works from end to end.*

# **Overview — All 12 Layers**

The diagnostic runs 12 layers in sequence. The first three run live against real APIs. Layers 4–12 are currently mocked pending API integration.

| **Layer** | **Name** | **Pillar** | **API / Source** | **Status** | **Gap it calculates** |
| --- | --- | --- | --- | --- | --- |
| 1 | Google Business Profile | Discovery | Google Places API | Live | GBP gap |
| 2 | Rank / Local Pack | Discovery | ValueSERP | Live | Rank gap |
| 2B | Citations | Discovery | DataForSEO | Live (partial) | Citation multiplier |
| 3 | Site Performance | Discovery | PageSpeed Insights | Live | Performance gap |
| 4 | Content Gap | Discovery | Firecrawl + ContentRadar | Mocked | Content gap |
| 5 | AI Visibility | Discovery | DataForSEO AI API | Mocked | AI risk multiplier |
| 6 | Paid Marketing | Discovery | DataForSEO SERP + ScrapeCreators | Mocked | Paid gap |
| 7 | Social Voice | Engagement | Data365 + Facebook Graph + NLP | Mocked | Social adjustment |
| 8 | Competitive Paid Density | Discovery | DataForSEO SERP | Mocked | Market multiplier input |
| 9 | Engagement Readiness | Engagement | Website scraper + NLP | Mocked | Engagement multiplier |
| 10 | Conversion Infrastructure | Conversion | Website scraper | Mocked | Conversion adjustment |
| 11 | Growth Signals | Growth | Places API + scraper + Facebook | Mocked | Growth score (0–7) |
| 12 | Canonical Health | All pillars | Multi-source audit | Mocked | Canonical suppression multiplier |

**Layer 1  ****Google Business Profile****   Live**   |   Pillar: Discovery

Google Business Profile is the single most important digital asset a trades business has. It determines whether they appear in the local pack of 3, what star rating prospects see before clicking, and how trustworthy the business looks at first glance.

**What it measures:**

- Star rating — drives CTR penalty (0% at 4.5+, up to 60% loss below 3.0)

- Review count — credibility threshold is 25. Below that an additional 15% CTR penalty applies

- GBP post activity — posts in last 90 days signal an active business to Google

- Photo count — minimum 5 photos required to pass

- Hours published — incomplete hours hurt local pack ranking

- Business description present — editorial summary on the GBP listing

- Services listed — whether the business categories are populated

- Website linked — whether the GBP links to the website

**How it works:**

The diagnostic calls the Google Places API using the business name and city as a text query. It returns the first matching candidate and maps the fields above. The API key is stored server-side and never exposed to the browser.

**What it feeds into the engine:**

- calcGbpGap() — calculates revenue lost due to rating penalty, review credibility gap, and listing completeness

- Rating and review count also feed into Layer 11 Brand Equity Index

- CTR penalty from rating flows into rank gap and missed call gap calculations

**Current status — LIVE but finding wrong business:**

**BUG: Layer 1 returned rating 5.0 with 24 reviews for Manito Plumbing. The real Google listing shows 4.8 with 137 reviews. The text query is matching the wrong business. The 1-hour cache is persisting the wrong result across all test calls.**

**BUG: Fix required: improve fuzzy matching in fetchGBPLayer() or switch to Place ID lookup. Every gap calculation is wrong until this is fixed.**

**Layer 2  ****Rank / Local Pack****   Live**   |   Pillar: Discovery

Local pack position is the single biggest revenue lever in the diagnostic. Moving a business from outside the pack into position 2 produces 8 times more clicks from the same number of people searching. This layer measures exactly where the business ranks.

**What it measures:**

- Local pack position — positions 1, 2, 3, or not in pack

- Organic rank — position in the standard search results below the map pack

- Whether the business appears at all for its primary trade keyword in its city

**The CTR impact by position:**

| **Position** | **Click Through Rate** | **vs Not in Pack** |
| --- | --- | --- |
| Position 1 | 44% | 14.7x more clicks |
| Position 2 | 24% | 8x more clicks |
| Position 3 | 17% | 5.7x more clicks |
| Not in pack | 3% | Baseline |

**How it works:**

The diagnostic calls the ValueSERP API with the query "{primary keyword} {city} {province}" — for example "plumber Timmins Ontario". The response includes the local pack entries and organic results. The business name is fuzzy-matched against those results to determine position. With multi-trade support (Session 14), this call runs twice — once per trade selected.

**What it feeds into the engine:**

- calcRankGap() — calculates revenue lost from not ranking at position 1

- avgCurrentCtr — the average CTR across all keywords, used in missed call and engagement gap calculations

- localPackRank and organicRank — drive the health scorecard status (green/amber/red)

**Current status — LIVE but returning empty results:**

**BUG: Layer 2 returned an empty keywords array and $0 rank gap. The VALUESERP_API_KEY appears to not be set in the production environment, causing silent fallback to mock data with null rank.**

**BUG: Fix required: confirm VALUESERP_API_KEY is set in .env.local on the production server. This is one of the most important gaps in the diagnostic and is currently invisible.**

**Layer 2B  ****Citations / NAP Consistency****   Live (partial)**   |   Pillar: Discovery

Citations are mentions of the business name, address, and phone number (NAP) across the web — directories, review sites, social platforms. Inconsistent NAP confuses Google and suppresses local pack ranking.

**What it measures:**

- Citation count — benchmark is 40 citations. Below 10 applies a 1.28x gap multiplier

- NAP mismatches — any variation in name, address, or phone across citations applies 1.08x multiplier

- Schema markup present — LocalBusiness schema on the website improves AI platform visibility

**How it works:**

Citation data is currently provided through DataForSEO content analysis. The diagnostic counts how many directories list the business and checks for NAP consistency across them. Schema presence is detected by Firecrawl website scraping (Layer 4).

**What it feeds into the engine:**

- citationMult — multiplier applied to the rank gap. More citations = smaller gap

- napMult — applied when NAP mismatches are detected

- schemaAbsentAiMultiplier — increases the AI risk multiplier when schema is missing

**Layer 3  ****Site Performance****   Live**   |   Pillar: Discovery

Website performance directly affects conversion rate. A site that takes 6 seconds to load on mobile loses 50% of visitors before they see anything. Google also uses page speed as a ranking signal for local search.

**What it measures:**

- Performance score — Google Lighthouse score 0–100

- LCP (Largest Contentful Paint) — how long until the main content loads. Pass threshold: under 2.5 seconds

- CLS (Cumulative Layout Shift) — how much the page jumps around while loading. Pass threshold: under 0.1

- TTFB (Time to First Byte) — server response speed

- Mobile friendly — whether the site has a proper viewport meta tag

- SEO score — Lighthouse SEO audit score

- Accessibility score — whether the site is usable for people with disabilities

**The conversion rate impact by performance score:**

| **Lighthouse score** | **Conversion rate** | **Source** |
| --- | --- | --- |
| 90+ | 39% | Portent Page Speed Study 2024 |
| 70–89 | 31% | Portent Page Speed Study 2024 |
| 50–69 | 22% | Portent Page Speed Study 2024 |
| Below 50 | 16% | Portent Page Speed Study 2024 |

**How it works:**

The diagnostic calls the Google PageSpeed Insights API using the website URL provided in the intake form. The call runs on mobile strategy — the dominant signal for local SEO. No API key is required for up to 25 requests per day. The call runs in parallel with Layers 1 and 2 using Promise.all().

**What it feeds into the engine:**

- calcPerformanceGap() — calculates revenue lost from below-benchmark conversion rates

- calculateOrganicHealthScore() — used in paid efficiency gap calculation

- Performance score drives health scorecard status (green: 80+, amber: 50–79, red: below 50)

**Current status — LIVE but returning score 0:**

**BUG: Layer 3 returned lighthouseScore: 0 and performance gap: $0 in the Manito test. The website URL https://manitoplumbing.ca/ was passed but PSI returned null scores. Either the URL validation failed, the site blocked the PSI crawler, or the API timed out. Investigate server logs.**

**Layer 4  ****Content Gap****   Mocked**   |   Pillar: Discovery

Content is how a trades business gets found for everything beyond their primary trade keyword. A plumber with no content about sump pumps, frozen pipes, or water heater installation is invisible to everyone searching for those specific services.

**What it measures:**

- Page count — total indexed pages on the website

- Blog post count — active content publishing

- FAQ count — question and answer pairs on the site

- Keyword coverage — what percentage of the target keyword set the site has content for

- Missing keywords — specific high-value searches the site has no content for

- PAA gaps — "People Also Ask" questions on Google that the site does not answer

- Branded search present — whether the business name appears as a searchable keyword (Discovery signal 15)

**How it works (when live):**

Firecrawl crawls the business website and returns the full text content of every page. ContentRadar analyses the content against the target keyword set for the trade and city. The gap between what they have and what they should have drives the content gap dollar value.

**What it feeds into the engine:**

- calcContentGap() — revenue lost from missing keyword coverage, weighted by monthly search volume and urgency

- personalizationSignals.faqPresent, blogPresent, blogPostLast90d — discovery stage signals

- brandedSearchPresent — 15th discovery personalization signal

**Current status — MOCKED:**

*Mock defaults: pageCount=8, blogPostCount=3, faqCount=2, brandedSearchPresent=false. The mock is returning content coverage at 100% and $0 content gap — which is wrong. A real business with 8 pages and 3 blog posts almost certainly has significant content gaps. Do not trust the content gap number until Firecrawl is wired.*

**Layer 5  ****AI Visibility****   Mocked**   |   Pillar: Discovery

AI platforms — ChatGPT, Google Gemini, Perplexity, Google AI Overviews — are increasingly the first place people go when they have a home service problem. A business invisible on AI platforms is missing a growing share of demand that never reaches Google search at all.

**What it measures:**

- ChatGPT mentions — does the business appear when asked for a plumber in their city

- Gemini mentions — same for Google Gemini

- Perplexity mentions — same for Perplexity

- AI Overviews — does the business appear in Google AI-generated search summaries

- Competitor comparison — how many platforms mention the top competitor vs this business

**How it works (when live):**

DataForSEO AI Optimization API queries each platform for "{trade} in {city}" and checks whether the business name appears in the response. The score is 0–4 based on how many platforms return a mention.

**What it feeds into the engine:**

- aiRiskMultiplier — 1.20x at 0/4 platforms, down to 1.00x at 4/4. Applied to the total gap

- schemaAbsentAiMultiplier — if schema is missing from the website, the AI multiplier increases further (capped at 1.20x)

**Current status — MOCKED:**

*Mock defaults to 0/4 platforms — all false. This applies the maximum 1.20x AI risk multiplier to every diagnostic. For most small trades businesses in Northern Ontario this is probably accurate — they are genuinely invisible on AI platforms. The multiplier direction is correct even if the data is mocked.*

**Layer 6  ****Paid Marketing****   Mocked**   |   Pillar: Discovery

Paid advertising by competitors displaces organic results and steals clicks that would otherwise go to this business. A competitor running Google LSAs pushes the organic results down the page. This layer measures how much paid pressure the business faces.

**What it measures:**

- Competitor LSAs (Local Services Ads) — premium placement above everything else in local search

- Competitor Google Ads — standard paid search ads

- Competitor Meta Ads — Facebook and Instagram ads targeting the same audience

- SERP displacement — how many paid positions push the business down for each keyword

**How it works (when live):**

DataForSEO SERP analysis identifies which businesses are running paid ads for the target keywords. ScrapeCreators identifies active Meta ad campaigns. The diagnostic counts competitors per channel and calculates the paid efficiency gap — revenue lost because the business is not countering paid pressure with its own ads or stronger organic presence.

**What it feeds into the engine:**

- calcPaidGap() — revenue lost from competitor paid displacement

- paidCompetitorCount — feeds into the Market Opportunity Multiplier competitive density calculation

**Current status — MOCKED AND CRASHING:**

**BUG: Layer 6/8 is crashing with error: ****"****Cannot read properties of undefined (reading id)****"****. Both social and paid gaps return $0. The competitive density shows ****"****Near-monopoly****"**** because paidCompetitorCount=0 — which is wrong. Fix this bug before any gap numbers can be trusted.**

**Layer 7  ****Social Voice****   Mocked**   |   Pillar: Engagement

Social presence for a trades business is not about follower counts. It is about whether the business is part of the conversation in its community — responding to mentions, posting consistently, and generating the kind of engagement that signals trustworthiness to new prospects.

**What it measures:**

- Sentiment score — NLP analysis of review text to identify themes (response speed, reliability, work quality)

- Unanswered mentions — customer mentions of the business that received no response

- Review response rate — what percentage of reviews the owner responds to

- Review velocity — how many new reviews in the last 90 days

- Posting cadence — how often the business posts on Facebook

- Social engagement rate — likes, comments, shares as a percentage of followers

- Unanswered comments — customer questions on posts with no owner reply within 72 hours

**How it works (when live):**

Data365 pulls Facebook post and engagement data. Facebook Graph API pulls follower count and post frequency. Claude NLP analyses review text to extract sentiment score and identify recurring themes. The five-component Social Adjustment model calculates a dollar gap from each signal.

**The five social adjustment components:**

| **Component** | **Fires when** | **Coefficient** |
| --- | --- | --- |
| Sentiment penalty | Sentiment score < 0.70 | 0.10 of GBP gap |
| Unanswered mentions | Unanswered mentions > 5 | Per mention × avg sale value |
| Posting gap | Posts per month below benchmark | Capacity-weighted gap × 0.10 |
| Engagement gap | Engagement rate < 2% | Gap to benchmark × 0.03 |
| Response gap | Unanswered comments > 0 | Per comment × avg sale value × 0.10 |

**Current status — MOCKED AND CRASHING:**

**BUG: Same crash as Layer 6. Social gap returns $0. Fix the undefined property error in the market/social lookup function.**

**Layer 8  ****Competitive Paid Density****   Mocked**   |   Pillar: Discovery

How saturated is the paid advertising environment for this trade in this market? A plumber in a market with no paid competitors has a fundamentally different opportunity than one fighting three LSA competitors. This layer drives the Market Opportunity Multiplier.

**What it measures:**

- Total paid competitor count — LSAs + Google Ads + Meta Ads combined

- Density tier — Near-monopoly (0-1), Low (2-3), Neutral (4-6), High (7-10), Very high (11+)

**What it feeds into the engine:**

- competitiveDensityIndex — one half of the Market Opportunity Multiplier

- Market Opportunity Multiplier = Market Demand Index × Competitive Density Index

- Applied to the total gap — low density markets amplify the gap, high density markets reduce it

| **Density** | **Competitor count** | **Index** |
| --- | --- | --- |
| Near-monopoly | 0–1 | 1.15x |
| Low | 2–3 | 1.10x |
| Neutral | 4–6 | 1.00x |
| High | 7–10 | 0.90x |
| Very high | 11+ | 0.85x |

**Current status — MOCKED AND CRASHING:**

**BUG: The crash in Layers 7/8 is returning paidCompetitorCount=0 and triggering ****"****Near-monopoly****"**** density. This is almost certainly wrong for most markets. Fix the crash — this is a priority.**

**Layer 9  ****Engagement Readiness****   Mocked**   |   Pillar: Engagement

Getting found is only half the battle. A prospect who clicks through to a website that has no FAQ, no click-to-call button, no booking widget, and no trust signals is unlikely to convert. This layer measures how ready the website is to turn a visitor into a call.

**What it measures — 8 signals:**

- FAQ present — does the site answer common questions before the prospect asks them

- Click to call — a tappable phone number on mobile

- Booking widget — online booking capability

- Live chat — real-time chat or chatbot

- Trust signals — licences, insurance, awards, associations

- Emergency availability — 24/7 or after-hours messaging

- Pricing transparency — any indication of typical costs

- CTA strength — strength of call to action (scored 1–5)

**How it works (when live):**

Firecrawl scrapes the website and Claude NLP evaluates the page content against each signal. The engagement score (0–8) determines the engagement multiplier applied to all gap calculations.

**The engagement multiplier:**

| **Score** | **Multiplier** | **Meaning** |
| --- | --- | --- |
| 7–8 | 1.00x | No reduction — fully engagement ready |
| 5–6 | 0.85x | Minor reduction |
| 3–4 | 0.70x | Moderate reduction |
| 1–2 | 0.60x | Significant reduction |
| 0 | 0.55x | Maximum reduction — site is not converting |

**Current status — MOCKED:**

*Mock defaults all 8 signals to false — score 0, multiplier 0.55x. This is the most conservative assumption and it is being applied to every diagnostic. For a business with a decent website this understates their real engagement readiness.*

**Layer 10  ****Conversion Infrastructure****   Mocked**   |   Pillar: Conversion

Engagement gets the prospect to reach out. Conversion infrastructure determines what happens next. A business with no auto-response, one contact pathway, and no booking confirmation loses prospects who expected an immediate reply.

**What it measures — 5 signals:**

- Auto-response present — does the business send an immediate acknowledgement to web enquiries

- CTA urgency — how compelling is the call to action (scored 1–5)

- Form field count — how many fields on the contact form (too many = lower conversion)

- Contact pathways — how many ways can a prospect reach the business (phone, form, chat, booking)

- Hours visible — are business hours clearly shown on the website

**How it works (when live):**

Firecrawl scrapes the website and maps each signal. Auto-response is inferred from booking platform integration. The conversion adjustment modifies the missed call gap — if auto-response is present, fewer missed calls result in lost jobs because the system captures them.

**What it feeds into the engine:**

- calcConversionInfrastructureAdjustment() — reduces the missed call gap if auto-response is present

- 11 conversion personalization signals fed into the capture rate model

**Current status — MOCKED:**

*Mock defaults all signals to worst case — 0 adjustment. Conversion score shows 0/5. The missed call gap is not being reduced by any conversion infrastructure credit.*

**Layer 11  ****Growth Signals****   Mocked**   |   Pillar: Growth

Growth signals measure whether the business has the infrastructure to turn one-time clients into repeat clients and referral sources. A plumber who does great work but has no follow-up system, no review request process, and no referral programme is leaving significant revenue on the table.

**What it measures — 7 signals:**

- GBP posts in last 90 days — active profile management

- Reviews in last 90 days — review velocity and request system

- Content publishing active — blog or social posting

- Referral infrastructure present — formal referral programme or tracking

- Social post frequency — consistent social presence

- Maintenance plan present — recurring service agreements

- Brand Equity Index (score 0–4) — whether offline word-of-mouth is being captured digitally

**The Brand Equity Index — 4 signals:**

| **Signal** | **Pass condition** | **Source** |
| --- | --- | --- |
| Review depth | reviewCount >= yearsInBusiness × 6 | Layer 1 GBP |
| Branded search | Business name has measurable search volume | ContentRadar (Layer 4) |
| Social following | Followers >= 200 (markets under 50K population) | Facebook Graph (Layer 7) |
| Unprompted mentions | >= 2 mentions in 90 days without being tagged | Data365 (Layer 7) |

**Growth score scale:**

| **Score** | **Label** | **Meaning** |
| --- | --- | --- |
| 6–7 | Growth-ready | Strong infrastructure for repeat and referral |
| 4–5 | Partially ready | Some systems in place |
| 2–3 | Early stage | Minimal infrastructure |
| 0–1 | Not started | No growth systems detected |

**Current status — MOCKED:**

*Mock defaults all signals to false — score 0, label **"**Not started**"**. Brand Equity is null. Growth score produces a statement but no dollar gap — it feeds the personalization capture model instead.*

**Layer 12  ****Canonical Health****   Mocked**   |   Pillar: All pillars

Canonical health measures whether the business information is consistent everywhere Google looks. If the business name on Google is "Manito Plumbing" but the website says "Manito Plumbing and Heating Ltd." and HomeStars says "Manito Plumbing Ltd." — Google cannot confidently rank the business because it cannot confirm these are all the same entity.

**What it measures:**

- Surfaces checked — how many managed digital surfaces were audited (benchmark: 18)

- Surfaces aligned — how many surfaces exactly match the canonical NAP

- NAP mismatches — name, address, or phone variations across surfaces

- Duplicate GBP — a second Google Business Profile for the same business

- Canonical tags missing — website pages without canonical URL tags

- Schema NAP mismatch — LocalBusiness schema on website conflicts with GBP

- AI accuracy score — how accurately AI platforms represent the business (0–1)

- Remediation list — specific surfaces with specific issues, prioritised by severity

**The suppression multiplier:**

Canonical misalignment suppresses GBP gap and rank gap because Google reduces ranking authority for businesses with inconsistent information. The suppression multiplier is applied to both gaps.

| **Alignment** | **Duplicate GBP** | **Suppression multiplier** |
| --- | --- | --- |
| 90%+ aligned | No | 1.00x — no suppression |
| 75–89% aligned | No | 1.04x |
| 50–74% aligned | No | 1.08x |
| Below 50% | No | 1.12x |
| Any alignment | Yes | +0.08x additional |
| Default (no data) | — | 1.08x amber default |

**Current status — MOCKED:**

*Default amber suppression of 1.08x applied to all diagnostics. This means all GBP and rank gaps are inflated by 8% regardless of the actual canonical health of the business. Until Layer 12 is wired, this is the conservative assumption.*

# **Known Bugs — Fix Before First Client**

These three bugs must be fixed before showing the diagnostic to any prospect. Every number on the results screen is affected by at least one of them.

| **Priority** | **Bug** | **Effect on results** | **Fix** |
| --- | --- | --- | --- |
| 1 — Critical | annualRevenue and yearsInBusiness not passed to engine | All gaps calculated against $300K default. For Manito at $1.2M every gap is 4x too low. | In diagnostic-route.js, confirm inputs.annualRevenue and inputs.yearsInBusiness are being passed to runDiagnostic() |
| 2 — Critical | Layer 1 finding wrong business | Rating and review count are wrong. GBP gap is based on a different business entirely. | Fix fuzzy matching in fetchGBPLayer() or switch to Place ID lookup. Disable the 1-hour cache during testing. |
| 3 — High | Layer 7 and 8 crashing | Social and paid gaps return $0. Competitive density shows Near-monopoly incorrectly. | Find and fix "Cannot read properties of undefined (reading id)" in the market/social lookup function. Add null check. |

# **How the Layers Flow Into the Gap Calculation**

Understanding which layer feeds which calculation helps diagnose why any particular gap number looks wrong.

| **Gap calculated** | **Primary layer** | **Modifiers applied from** |
| --- | --- | --- |
| GBP gap | Layer 1 — rating, review count | Layer 12 canonical suppression multiplier |
| Rank gap | Layer 2 — local pack position | Layer 2B citation multiplier, Layer 9 engagement multiplier, Layer 12 canonical suppression |
| Performance gap | Layer 3 — Lighthouse score | None — standalone calculation |
| Content gap | Layer 4 — keyword coverage | Layer 9 engagement multiplier |
| AI risk multiplier | Layer 5 — platform visibility | Layer 2B schema multiplier. Applied to total gap. |
| Paid gap | Layer 6/8 — competitor count and spend | Layer 3 organic health score |
| Social adjustment | Layer 7 — sentiment, mentions, posting | Layer 1 GBP gap as base, capacity gaps for posting component |
| Engagement multiplier | Layer 9 — 8 website signals | Applied to rank gap and content gap |
| Missed call gap | Self-reported inputs + Layer 2 CTR | Layer 10 conversion adjustment reduces if auto-response present |
| Capacity lift | Self-reported inputs | Seasonal divisor per trade (Session 14 change) |
| Market multiplier | Layer 8 density + city lookup | Applied to total gap after AI multiplier |
| Canonical suppression | Layer 12 — surface alignment | Applied to GBP gap and rank gap only |

ClearSky Software — Diagnostic Layers Complete Overview — Session 14 — April 2026 — Confidential

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564