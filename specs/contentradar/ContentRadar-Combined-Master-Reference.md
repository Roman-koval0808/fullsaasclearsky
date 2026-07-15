**ClearSky Software**

**ContentRadar**

& the Digital Health Diagnostic

**COMBINED MASTER REFERENCE**

*Complete, self-contained record of the entire project — architecture, cohorts, the 72-signal catalogue, scoring engine, database, watch-market intelligence, verticals, locked constants, infrastructure and build status.*

| **Purpose of this document.  **This single file consolidates every ContentRadar and ClearSky diagnostic document, spreadsheet and code file in the source project into one authoritative reference. It is built to be portable: upload it into a merged project and it conveys the whole system without any of the original files present. |
| --- |

| **Field** | **Detail** |
| --- | --- |
| Project owner | ClearSky Software — Rory Dredhart, Founder |
| Contact | r.dredhart@clearskysoftware.net · 705-274-9564 |
| Location | Timmins, Northern Ontario, Canada |
| Classification | **Confidential** |
| Compiled from | 25 source documents, spreadsheets and code files (April–May 2026) |
| Latest source | Session 24 Summary (authoritative) + Cohort 1 Master |
| Status | Engine 1 code built & tested in stub mode; Cohort 1 build & live wiring pending |

# **How to read this document**

This reference is organised so any reader — Rory, a developer, or a future Claude session — can reconstruct the entire project from this file alone. It is compiled from documents written across several months, so where earlier and later sources disagree, the later decision governs and the discrepancy is flagged in Section 15.

| **Authority order.  **When two sources conflict, precedence is: (1) Session 24 Summary, (2) Cohort 1 Master, (3) the 72-signal workbook "Signal Master" sheet (updated_4), (4) the live code files, (5) everything else. Anything marked LOCKED does not change without Rory's explicit approval. |
| --- |

## **Contents**

1.  Project overview — what ClearSky and ContentRadar are

2.  The Digital Health Diagnostic — the 11-layer revenue engine ContentRadar feeds

3.  ContentRadar in two parts — Engine 1 (scoring) and Engine 2 (watch-market)

4.  Architecture fundamentals — cohorts, verticals, signal universe, scoring methods

5.  Cohort 1 — the benchmark moat (selection, gates, tiers, intelligence, cost)

6.  The 72-signal catalogue — contractors vertical (full rubrics)

7.  The scoring engine — three methods, gap-score mechanics, code files

8.  Database architecture — schema, tables, views, setup

9.  Engine 2 — watch-market intelligence (signal types, keyword states, defensibility)

10. Verticals — Contractors, Family Law, and placeholders

11. Locked constants — consolidated master table

12. Infrastructure, APIs, repository and environment

13. Build status and remaining items

14. Working principles and key learnings

15. Source inventory and version reconciliation

16. Appendix — code file signatures and core formulas

# **1.  Project overview**

ClearSky Software is a diagnostic revenue platform for small trades and professional-services businesses, built and led by founder Rory Dredhart out of Timmins, Ontario. Its commercial thesis is simple and load-bearing across the entire product:

| **Commercial thesis (LOCKED).  **All other things equal — same trade, same market, same quality of work, same years in business — the business with the better digital presence makes more money. ContentRadar exists to make that gap measurable, and the diagnostic exists to translate it into recoverable dollars. |
| --- |

The platform has two tightly-coupled halves. The ClearSky Digital Health Diagnostic is the sales-and-measurement engine: it measures a prospect's complete digital presence from external data and outputs a single defensible revenue-gap figure — what they are leaving on the table right now. ContentRadar is the proprietary intelligence layer that powers the one part of that diagnostic no competitor can replicate.

## **1.1  What ContentRadar is**

ContentRadar is ClearSky's content-intelligence and competitive-benchmarking platform. It does three jobs at once:

- A benchmarking engine — it scores any business against a human-vetted cohort of the best operators in its trade and produces a Content Gap Percentage.

- The demand-side engine behind the diagnostic's Layer 4 content-gap calculation — the piece that makes the whole diagnostic defensible.

- The keyword and content-intelligence library that drives the Blog, FAQ, AI-SEO and Local-Ranking modules across the wider platform.

ContentRadar never calculates revenue itself. It scores, compares and surfaces gaps; the diagnostic engine owns all dollar translation.

## **1.2  Who does what**

| **Role** | **Responsibility** |
| --- | --- |
| Rory Dredhart | Founder and architect. Locks decisions, owns the architecture, business thesis, and all pre-hire setup (API accounts, VPS, repo, test URLs, developer brief). Non-developer. |
| Developer | Implements: wires integrations, validates scrapers, calibrates prompts, deploys. Node.js / API-integration contractor. |
| Claude | Architecture, documentation, code generation, and handoff-ready deliverables — not direct deployment. |

# **2.  The Digital Health Diagnostic**

The ClearSky Digital Health Diagnostic is an automated revenue-gap analysis tool. The prospect enters three things — business name, address, website URL — and the system runs eleven diagnostic layers across eight external data sources in under 90 seconds, returning a personalised revenue-gap report with a single combined dollar figure. It is not a survey and not a generic benchmark applied to self-reported numbers; every finding is a real, independently verifiable measurement.

| **Why it is defensible.  **Every number traces to one of three things: a real measurement of the business (Google Places rating, Lighthouse score, Map-Pack position, AI mention count), a published benchmark from a named source (BrightLocal, Invoca, Portent, MIT, Google, Gartner, Semrush, WebFX and others), or a conservative calculation combining both. The diagnostic is designed to be challenged — when a prospect says "prove it," the case gets stronger. |
| --- |

## **2.1  The eleven diagnostic layers**

Layers 1–8 measure revenue lost today across the customer journey; layers 9–11 measure the infrastructure that determines whether gains can be captured and compounded.

| **#** | **Layer** | **Data source** | **What it measures / revenue connection** |
| --- | --- | --- | --- |
| 1 | GBP Health | Google Places API | Star rating, reviews, completeness, response rate. CTR penalty by star band vs 25–40 review threshold. |
| 2A | Local Rank | ClearSky Local Rank Tool | Map-Pack position for 5 trade keywords. Pos 1 = 44% CTR, pos 3 = 17%, not in pack = 3%. |
| 2B | Citation Health | DataForSEO | Citations vs 40+ benchmark, NAP consistency, schema. 19% Map-Pack penalty below 40 citations. |
| 3 | Website Performance | PageSpeed / Lighthouse | Core Web Vitals, mobile load. 1-sec site converts 3× a 5-sec site; ~7% conversion loss per second. |
| 4 | Content Gap | Firecrawl + ContentRadar + SerpAPI | Website keyword coverage vs market demand + People-Also-Ask gap. THE proprietary layer. |
| 5 | AI Visibility | DataForSEO AI Optimization | Mentions in ChatGPT, Gemini, Perplexity, AI Overviews. Risk multiplier 1.00–1.20; AI traffic converts 4.4× organic. |
| 6 | Missed Call Gap | Self-reported + estimated volume | Miss rate × calls × 82% no-callback × job value × 12 (Invoca, MIT). |
| 7 | Social Voice | Facebook API + Data365 + NLP | Sentiment, unanswered mentions, review velocity. Sentiment amplifier on GBP gap. |
| 8 | Paid Marketing | DataForSEO SERP + ScrapeCreators | Competitor LSA / Ads / Meta, SERP displacement cost on organic CTR. |
| 9 | Engagement Readiness | Scraper + page source + NLP | 8 signals (FAQ, click-to-call, booking, chat, trust, emergency, pricing, CTA). Conversion multiplier 0.55–1.00. |
| 10 | Conversion Infrastructure | Scraper + page source + NLP | Auto-response, CTA urgency, form friction, hours. Amplifier on missed-call gap. |
| 11 | Growth Signals | Places API + scraper + Facebook | GBP posts, review cadence, publishing, referral infra, maintenance plans. Growth score 0–6 = compounding rate. |

## **2.2  How the revenue number is built**

| **The master formula** Base Gap  =  GBP + Rank + Performance + Content + Missed-Call + Social + Paid + Engagement Total Gap =  Base Gap × AI-Risk Multiplier × Seasonal Multiplier Projected =  Current Revenue + Total Gap + Capacity Lift *The Engagement Multiplier (0.55–1.00) is applied within the Rank + Content + AI gap calculations.* |
| --- |

### **The four adjusting multipliers**

| **Multiplier** | **Range** | **Basis** |
| --- | --- | --- |
| Seasonal | ~0.74 default | (Peak + Q2 + Q3 + Q4)/4/100 from the prospect's own seasonal inputs. A Northern Ontario trades business defaults to ~74% of theoretical maximum. |
| AI Risk | 1.00–1.20 | Based on visibility across 0–4 AI platforms. Invisible on all four = 20% uplift on total gap. |
| Engagement | 0.55–1.00 | 8 engagement-readiness signals. Poor infrastructure converts only 55% of the traffic rank/content would deliver. |
| Citation | 1.00–1.28 | Applied to the rank gap. Below 10 authoritative citations = 28% uplift (BrightLocal: 40+ citations → 19% higher Map-Pack visibility). |

## **2.3  Where ContentRadar plugs in**

Every layer except Layer 4 uses public APIs any developer could access. Layer 4 — the content-gap analysis — is the differentiator, and it only works because ContentRadar supplies the demand side. The supply side (scraping a prospect's website) is available to anyone; the demand side (what customers are about to search for, by trade, market and season) is ClearSky's proprietary edge. The diagnostic is the product demonstration, the revenue-gap number is the sales argument, the module mapping is the close, and market-availability is the urgency.

# **3.  ContentRadar in two parts**

"ContentRadar" refers to two related but distinct engines. Both are documented across the source files; keeping them separate prevents the most common confusion in the project.

| **Engine** | **What it is** |
| --- | --- |
| **Engine 1 — Scoring ****&**** Benchmark** | The signal-scoring pipeline. Scores a business on 72 signals (60 in the gap score), compares it to the Cohort 1 benchmark of best operators, and produces the Content Gap %. This is the part that is BUILT (10 Node.js files, tested in stub mode). It feeds diagnostic Layer 4 as a score. |
| **Engine 2 — Watch-Market Intelligence** | The demand-side system. Monitors businesses in "watch markets" that run ahead of a client's market in search behaviour, detecting which keywords are spiking 4–6 weeks before demand arrives locally. Concept fully designed; data pipeline NOT yet built. Supplies the demand side of Layer 4 and the content calendar. |

| **The relationship.  **Engine 1 answers "how good is this business's digital presence versus the best?" Engine 2 answers "what should they publish, and when, to get ahead of demand?" Together they make Layer 4 both measurable (Engine 1) and predictive (Engine 2). |
| --- |

# **4.  Architecture fundamentals**

## **4.1  Two cohorts (never mixed)**

| **Cohort 1 — Benchmark** | **Cohort 2 — Licensed clients** |
| --- | --- |
| ~1,200 businesses (300 per trade) | 50–100 licensed paying clients |
| External signals only — 60 signals scored | All 72 signals — includes A2P + referral network |
| No private data access | Full A2P platform data access |
| Defines best practice — the ceiling | Compared against Cohort 1 — the gap |
| Monitored continuously — produces intelligence | Improved continuously — consumes intelligence |
| *Never mixed with Cohort 2* | *Never mixed with Cohort 1* |

| **Cohort isolation is non-negotiable.  **The benchmark is always external; client data is always private. Conflating the two cohorts is an architectural error. |
| --- |

## **4.2  Two active verticals**

- Contractors / Trades (active) — four trades in scope: Plumbing, HVAC, Electrical, Roofing. Timmins is the reference market. This is the primary build focus. 72-signal architecture.

- Family Law (active) — a separate, earlier-designed vertical with its own 49-signal architecture (147-point max). Untouched in the most recent sessions but fully specified.

- Manufacturing and Tourism — placeholder names only. No scope defined, no work done. (A vertical-agnostic "content tells a story, ContentRadar reads it" framing has been stress-tested conceptually against professional services.)

## **4.3  The signal universe (contractors)**

| **Set** | **Signals** | **Notes** |
| --- | --- | --- |
| Gap-score signals | 60 | Signals 1–60. Scored for both Cohort 1 and Cohort 2. Max 180 points (60 × 3). |
| A2P signals | 6 | Signals 61–66. Cohort 2 licensed clients only. Private inquiry data. Not in gap score. |
| Referral-network signals | 6 | Signals 67–72. Self-reported at Meeting 1. Reported separately. Not in gap score. |
| **Total** | **72** | Scoring scale 0/1/2/3 (four levels): 0 = not present, 1 = weak, 2 = functional, 3 = best practice. |

## **4.4  Four journey stages and structural weighting**

There are no per-signal multipliers. Weighting is structural — achieved purely through how many signals sit in each stage. The gap score is a flat sum of 0–3 signal scores (confirmed in calculateGapScore in signalPipeline.js).

| **Stage** | **Signals** | **Max pts** | **% of 180** | **Measures** |
| --- | --- | --- | --- | --- |
| Discovery | 15 | 45 | 25.0% | Getting found — GBP, website, directories, geographic visibility |
| Engagement | 17 | 51 | 28.3% | Holding attention — content, reviews, social, FAQ, gallery |
| Conversion | 15 | 45 | 25.0% | Turning visitors into booked jobs — contact friction, pricing, schema, seasonal |
| Growth | 13 | 39 | 21.7% | Long-term equity — AI authority, share of voice, review footprint, video |
| **Total** | **60** | **180** | **100%** | *Content Gap % = Score / 180* |

| **Corrected 2026-07-02.** This table previously read Engagement 18/54 (30.0%) and Growth 12/36 (20.0%), inherited from a stale hardcoded rollup in `contentradar_72_signals_updated_4.xlsx`'s "Stage Summary" tab. That tab's per-signal Stage column (the actual authoritative "Signal Master" sheet) already had Signal 26 (Nextdoor Recommendations) tagged Growth — the reclassification below did happen and is correctly reflected signal-by-signal — but the summary tab's roll-up numbers were never recomputed afterward, so they no longer matched the underlying data. Verified by direct count against Signal Master: 15/17/15/13. The Stage Summary tab now computes these live via COUNTIFS instead of a hardcoded figure, so it can't drift again. |
| --- |

| **Signal 26 (LOCKED May 2026).  **Nextdoor Recommendations was reclassified from Engagement to Growth. Rationale: Nextdoor recommendations compound over time, cannot be manufactured quickly, and represent durable community equity — Growth characteristics. |
| --- |

## **4.5  Three scoring methods**

| **Method** | **Signals** | **How it works** |
| --- | --- | --- |
| 1 — Deterministic | 19 | Formula from structured API data. No Claude calls. 100% consistent. Never use Claude for what a formula can decide. |
| 2 — Rules gate + Claude | 28 | Gate checks existence/volume, returns 0 or 1 instantly. Claude is only called when the gate passes, to assess quality (2 or 3). All run in parallel via Promise.all. |
| 3 — Pure Claude | 15 | Holistic content judgment. Sub-question prompt pattern — never "is this good?", always specific measurable sub-questions. JSON output locked. |

| **The golden rule.  ***Never ask Claude what a formula can decide.* |
| --- |

# **5.  Cohort 1 — the benchmark moat**

Cohort 1 is a continuously monitored group of ~1,200 best-practice trades contractors across Canada and the US — 300 per trade across plumbing, HVAC, electrical and roofing. They are not ClearSky clients; they are the external reference that defines what excellent digital presence looks like. Cohort 1 answers, for every licensed client: compared to the best operators in your trade across North America, where are you, and what specifically are they doing that you are not? This human-vetted cohort is the credibility spine of the whole product — not a footnote.

## **5.1  The selection pipeline**

| **Stage** | **What happens** |
| --- | --- |
| Starting pool | 4,000 businesses (1,000 per trade) identified via the DataForSEO Google Maps endpoint. Entry conditions (all three): working website URL; claimed GBP listing; GBP lists the relevant trade as a primary service. Geographic spread enforced (≤200 per city, ≤400 per province/state); rural and small-market businesses prioritised. |
| Gate 1 — quality floor | Applied before any scoring. Four locked thresholds (see 5.2). Eliminates businesses that do not represent genuine operational quality. Franchise indicators flagged for human review. |
| Pre-ranking pass | Gate 1 survivors scored on 20 website + GBP signals. Top 300 per trade advance by score. Fully automated. ≈ $732 across 4,000. |
| Full signal score | Top 300 per trade scored on all 38 externally-accessible signals, all six integrations in parallel. ≈ $1,300 across 1,200 (2026 Apify pay-per-CU). |
| Gate 3 — human review | Top 400 per trade (300 + 100 buffer) reviewed by a human, ~5 min each: reviews authentic, content genuinely useful, business operationally active, no franchise template, no national chains. Final 300 per trade locked as Cohort 1. |

| **Selection philosophy (LOCKED).  **Cohort 1 selects on digital presence, not operational quality — intentionally. ContentRadar measures digital presence. Gate 1 ensures the 300 are not signal-gamers; Gate 3 validates genuine quality; the algorithm in between selects on digital-presence strength, which is exactly the variable being benchmarked. |
| --- |

## **5.2  Gate 1 — four locked thresholds**

| **Threshold** | **Value** | **Why** |
| --- | --- | --- |
| Minimum GBP star rating | ≥ 4.2 stars | Below 4.2 signals genuine service-quality problems no digital presence can fix. |
| Minimum review count | Years × 4 | Tenure-adjusted. A 10-yr contractor needs 40; a 2-yr needs 8. (Fallback 12 if tenure unknown.) |
| Review recency | ≥ 1 review in last 180 days rated ≥ 3.0 | Confirms the business is active. |
| Franchise flags | Subdomain + location nav → human review | Franchise digital presence is not representative of independent operators. |

## **5.3  Two benchmark tiers**

| **Tier** | **Size** | **Purpose** |
| --- | --- | --- |
| Aspirational (Top 10%) | Top 30 per trade | Display only — the ceiling shown to clients. NOT used in the gap calculation. |
| Operational (Top third) | Top 100 per trade | Used in the Content Gap % formula. Achievable best practice for a well-resourced independent operator. |

| **Gap formula.  **Content Gap % = client score / (Cohort 1 operational-tier average × 60 signals). This feeds diagnostic Layer 4 and is translated into a recoverable dollar figure — the number on the screen in the client presentation. Comparing a Timmins plumber to the top third of 300 representative businesses is actionable; comparing them to the absolute top 30 in North America is demoralising — hence two tiers. |
| --- |

## **5.4  The four intelligence outputs**

| **Output** | **What it produces** |
| --- | --- |
| 1 — Benchmark Score | 60 signals scored 0–3 per business, averaged per signal/trade/tier. The reference every client is measured against. Feeds Layer 4. |
| 2 — Content Intelligence Feed | Weekly detection of new content across all 1,200 businesses via SHA-256 hash comparison + text diff + Claude classification (blog / video / FAQ / GBP post / new page) with topic tags. The retention driver: "18 of the top 30 HVAC contractors published furnace-prep content — your clients should publish now, 4–6 weeks before peak." |
| 3 — Question Intelligence Feed | What homeowners are asking, derived from what the best contractors are actively answering (new FAQs, GBP Q&A, Google People-Also-Ask, YouTube titles, AI-platform mining). Top 10 questions per trade per week become FAQ / blog / GBP-Q&A briefs. |
| 4 — Attribution Intelligence Layer | Closes the loop. Every detected content piece is tracked at T=0, T+14, T+30, T+60, T+90 against Map-Pack position, GBP views, review velocity, AI-mention status and gap-score deltas. Turns recommendations from opinion into observed correlation across dozens of independent data points. |

## **5.5  Maintenance cadence and cost**

| **Cadence** | **What runs** | **Cost** |
| --- | --- | --- |
| Weekly | Content-detection scan — fetch, hash-compare, diff, Claude classify | ~$5–15/wk ($260–780/yr) |
| Monthly | Review-velocity check, YouTube deltas, competitor LSA monitoring | ~$20–40/mo ($240–480/yr) |
| Quarterly | Full hash-based re-score (~20% of pages), cohort composition review + drop-and-replace | ~$30–55/qtr ($90–165/yr) |
| Annual | Full re-score of all 1,200 regardless of hashes; signal calibration; composition audit | ~$120–180/yr |

| **Cost item** | **Figure** |
| --- | --- |
| Initial Cohort 1 build (API costs) | $130–$370 (revised down 95% under Apify 2026 pay-per-CU). Earlier full-pipeline estimate: ~$2,032. |
| Total annual running cost | ~$710–$1,605/year |
| Cost per licensed client (at 50 clients) | ~$14–$32/client/year — negligible vs licence revenue |

| **The moat.  **After two years, Cohort 1 is ~4.8M signal data-points/year, a weekly content-event stream, an attribution pattern library, and a validated 1,200-business benchmark. A competitor starting today cannot replicate two years of quarterly data quickly. The longer it runs, the wider it gets. |
| --- |

# **6.  The 72-signal catalogue (contractors)**

The authoritative source is the "Signal Master" sheet in contentradar_72_signals_updated_4.xlsx. Signals 1–60 are in the gap score; 61–72 are Cohort-2-only and excluded from the gap score. Scoring scale is 0/1/2/3. The full 0→3 rubric, rationale and audit method for every signal are reproduced below so this reference is self-contained.

## **6.1  Category map**

| **Cat** | **Category** | **Signals** | **Max** | **Data source method** |
| --- | --- | --- | --- | --- |
| 1 | Website | 1–10 | 30 | Direct fetch → Claude NLP |
| 2 | Google Business Profile | 11–18 | 24 | Google Places API → formula + Claude |
| 3 | Facebook | 19–24 | 18 | Apify Facebook Scraper → Claude NLP |
| 4 | Nextdoor | 25–27 | 9 | Apify Nextdoor Scraper → Claude NLP |
| 5 | Reviews & Reputation | 28–32 | 15 | Apify (HomeStars, Houzz, Angi) + NLP sentiment |
| 6 | Trades Directory | 33–36 | 12 | Apify directory scraper + ValueSERP (LSA) |
| 7 | Citation & NAP | 37–39 | 9 | Directory crawl + cross-reference + website audit |
| 8 | Seasonal & Geographic | 40–43 | 12 | ValueSERP + website content audit |
| 9 | Video | 44–47 | 12 | YouTube Data API + Apify Facebook → Claude |
| 10 | AI Authority | 48–50 | 9 | Live API queries — ChatGPT, Gemini, Perplexity |
| 11 | Share of Voice | 51–54 | 12 | ValueSERP + Apify social monitoring |
| 12 | Contact Friction | 55–60 | 18 | Direct fetch + PageSpeed → Claude UX audit |
| 13 | A2P Content Intelligence | 61–66 | 18 | A2P platform live feed — licensed clients only |
| 14 | Referral Network | 67–72 | 18 | Self-reported Meeting 1 + community research |

## **6.2  Full signal detail (1–72)**

Each signal below: number, name, category, stage, intent bucket, whether it is in the gap score, its 0→3 scoring anchors, and why it exists.

| **#** | **Signal / stage / intent** | **Scoring  0 → 3** | **Why it exists** |
| --- | --- | --- | --- |
| **1** | **Value Proposition Clarity**  Website Discovery · Research / Comparison *In gap score* | **0 **Trade not identifiable within 5 seconds. Generic language only. Location absent. Trade visible but requires reading beyond headline. Location present. No differentiation. Trade, location, and service type clear above the fold. Some differentiation present but generic. Within 5 seconds: trade, area, who they serve, and differentiator. Specific and credible. Emergency availability or years in business in headline area. | A visitor decides in 5 seconds whether they're in the right place. If it isn't immediately clear, they bounce to the next result. |
| **2** | **Brand Promise ****&**** Trust Statement**  Website Discovery · Comparison *In gap score* | **0 **No articulated promise. Generic taglines only — quality work, great service, call us today. Promise exists but vague. Licensed and insured mentioned without specificity. Clear trust statement with some specificity — response time or pricing commitment visible. Specific, accountable promise — response time guarantee, clean jobsite, no-surprise pricing. A commitment a homeowner can hold you to. | All contractors say the same thing. A specific, accountable promise is a differentiator competitors can't easily copy. |
| **3** | **People ****&**** Credibility**  Website Discovery · Comparison / Emergency *In gap score* | **0 **No team information. No owner story. Business is faceless. Owner or team mentioned by name only. No photos. No backstory. Owner photo and brief bio present. Team referenced. Local roots mentioned. Owner and team introduced with real photos, personal story, local roots, and trade background. Visitor feels they know who is coming to their home. | A contractor is letting a stranger into someone's home. Before the call is made, the visitor wants to know who is coming through the door. |
| **4** | **Process Transparency**  Website Discovery · Research / Active Project *In gap score* | **0 **No process information. Visitor has no idea what happens after they call. Vague reference to a process — 'we'll get back to you.' No specifics. Basic process outlined — call, quote, schedule, complete. Steps identifiable. Full process explained with timeline expectations — how long the assessment takes, when the quote arrives, when work starts, what a reasonable price looks like. | Most homeowners don't hire trades regularly. Uncertainty about what happens next creates hesitation that kills conversions. |
| **5** | **Service Area Clarity**  Website Discovery · Research / Active Project *In gap score* | **0 **No service area mentioned. Visitor cannot tell if the contractor serves their location. City mentioned in footer only. Surrounding communities not listed. Primary city and some surrounding communities listed. Service area page exists. All communities in the 100km protected market clearly listed. Service area page optimised for each community. Geographic coverage explicit. | If a homeowner can't tell in 10 seconds whether the contractor serves their area, they move on. Service area ambiguity is an invisible conversion killer. |
| **6** | **Before ****&**** After Gallery**  Website Engagement · Comparison *In gap score* | **0 **No before/after content. No project photography anywhere on website. A few generic project photos. No before/after pairing. Low quality. Before/after gallery exists with at least 10 paired images. Trade-specific. Reasonably current. Extensive, well-organised before/after gallery with captions describing the project, challenge, and outcome. Trade-specific categories. Updated regularly. | In trades, proof of work is the most powerful conversion tool available. A homeowner considering a bathroom reno wants to see what you've actually done. |
| **7** | **Blog ****&**** Educational Content**  Website Engagement · Research *In gap score* | **0 **No blog or educational content. Website is purely promotional. A few articles present but outdated (12+ months). Generic topics. Low value. Blog present with content updated in last 6 months. Some trade-specific educational topics. Active blog or resource section. Trade-specific content targeting real homeowner questions. Updated monthly minimum. Content mapped to seasonal demand peaks. | Educational content is the mechanism by which a contractor captures Research-intent visitors — the ones planning ahead who become the highest-value, least price-sensitive customers. |
| **8** | **FAQ Coverage**  Website Engagement · Research *In gap score* | **0 **No FAQ section. Common homeowner questions unanswered. FAQ exists but shallow — fewer than 5 questions. Generic. Not trade-specific. FAQ covers 5–10 genuine homeowner questions with substantive answers. Comprehensive FAQ covering 15+ real homeowner questions across all intent buckets — Emergency (how fast can you come?), Pricing (do you offer free estimates?), Process (how long does X take?), Credentials (are you licensed?). | FAQ is a dual-purpose signal — it answers homeowner objections before they become phone call hesitations, and it is indexed by both Google and AI platforms as authoritative question-answer content. |
| **9** | **Credentials ****&**** Licensing Visibility**  Website Engagement · Comparison / Emergency *In gap score* | **0 **No credentials, licences, or insurance information visible anywhere. Licensed and insured mentioned in text only. No specific credential names or logos. Core trade credentials named and visible. WSIB confirmed. Liability insurance stated. All relevant credentials named, numbered where applicable, displayed with logos across homepage, footer, and key service pages. WSIB, liability insurance, trade association membership, manufacturer certifications all visible. | Before letting someone into their home, homeowners want confirmation the contractor is licenced, insured, and accountable. Credential gaps trigger abandonment at the last moment. |
| **10** | **Pricing Transparency**  Website Conversion · Comparison / Active Project *In gap score* | **0 **No pricing information. No indication of how pricing works or what to expect. Vague pricing language — 'competitive rates' or 'call for a quote.' No ranges or structure. Pricing approach explained — flat rate, hourly, or project-based. Some indication of cost ranges for common jobs. Clear pricing structure with honest ranges for common services. Diagnostic fee policy stated. No-surprise guarantee present. Homeowner knows what to expect before they call. | Price uncertainty is the second most common reason homeowners delay calling a contractor. They don't want to feel ambushed by the number when the tech arrives. |
| **11** | **GBP Completeness**  Google Business Profile Discovery · Research / Comparison *In gap score* | **0 **Profile unclaimed or empty. Business name only. No category, hours, or description. Claimed but incomplete. Primary category set. Basic hours present. Description missing. Core fields complete — categories, description, hours, partial service list. NAP consistent. Fully optimised. Primary and secondary categories precise. Description keyword-rich. Full service list with descriptions. All attributes configured. NAP perfect. | For most contractor searches, the GBP Map Pack result is the first and sometimes only thing a prospect sees. An incomplete profile gets deprioritised by Google's algorithm. |
| **12** | **GBP Photo Volume ****&**** Quality**  Google Business Profile Engagement · Comparison *In gap score* | **0 **No photos or stock imagery only. Fewer than 10 photos. Low quality. No recent uploads. 10–25 photos. Genuine project work visible. Team photo present. Cover photo configured. 25+ photos consistently maintained. High quality real project photography. Trade-specific categories. New photos added regularly — at least monthly. | Photos are the fastest trust signal on GBP. A profile with no photos signals inactivity. Prospects judge the quality of your work by the quality of your photos. |
| **13** | **GBP Review Score ****&**** Velocity**  Google Business Profile Engagement · Comparison *In gap score* | **0 **Fewer than 5 reviews or average below 3.5 stars. 5–15 reviews. Average 3.5–4.0. No recent reviews in last 90 days. 15–40 reviews. Average 4.0–4.5. Some recent reviews. Velocity inconsistent. 40+ reviews at or above tenure benchmark (years × 6). Average 4.5+. Consistent recent velocity — at least 2 new reviews per month. Score and velocity both reinforcing. | Review score and velocity are the most-viewed signals on GBP. They directly determine Map Pack position and conversion rate once a prospect lands on the profile. |
| **14** | **GBP Review Response Behaviour**  Google Business Profile Engagement · Comparison *In gap score* | **0 **No responses to any reviews — positive or negative. Occasional responses to negative reviews only. Positive reviews ignored. Responds to most reviews. Some personal detail. Response time within a week. Responds to every review — positive and negative — promptly and personally. Responses add context, thank the customer by name, and address any concern raised. Signals an accountable, attentive business. | Responding to reviews is a public act — every prospect reads how you treat existing customers. Ignoring reviews, especially negative ones, signals that complaints go unaddressed. |
| **15** | **GBP Posts ****&**** Updates**  Google Business Profile Engagement · Research *In gap score* | **0 **No posts in last 90 days. Profile appears inactive. 1–2 posts in last 90 days. Sporadic. No pattern. Posts at least twice monthly. Mix of promotional and informational content. Some seasonal relevance. Weekly minimum. Deliberate content mix — seasonal tips, completed projects, offers, emergency reminders, trade education. Posts timed to demand peaks. | GBP posts signal an active, engaged business. Google prioritises profiles with recent post activity in Map Pack rankings. Posts also appear directly in search results. |
| **16** | **GBP Services ****&**** Products**  Google Business Profile Discovery · Active Project *In gap score* | **0 **No services listed. Profile gives no indication of what the contractor does. A few services listed with no descriptions. Generic service names only. Core services listed with basic descriptions. Primary trade services represented. Comprehensive service list covering all trade offerings with descriptive text. Trade-specific depth. Descriptions written in client language. Consistent with website service pages. | The services section is indexed by Google and directly matches search queries. It is a free keyword expansion layer most contractors leave empty. |
| **17** | **GBP Q****&****A**  Google Business Profile Engagement · Research *In gap score* | **0 **No Q&A activity. Public questions unanswered. Business has never seeded the section. A few public-generated questions, unanswered or poorly answered. Business has seeded at least 5 questions and answers. Public questions answered. Q&A actively managed with 10+ high-value questions matching real search intent. All public questions answered promptly. Trade-specific concerns addressed. Functions as secondary FAQ. | GBP Q&A is indexed by Google and increasingly referenced by AI search platforms. Seeding it with real homeowner questions is a free authority-building mechanism. |
| **18** | **GBP Contact ****&**** Conversion Features**  Google Business Profile Conversion · Emergency / Active Project *In gap score* | **0 **No contact or conversion features configured. Messaging disabled. No booking button. One feature enabled but not optimised. Messaging on but slow to respond. Two features active. Messaging with automated acknowledgement. Quote or booking button configured. All three features active — messaging with instant acknowledgement, get-a-quote monitored, booking button linked to live scheduling. Emergency-intent visitors can initiate contact without visiting website. | Emergency-intent searchers need to reach a contractor in under 60 seconds. Conversion features on GBP eliminate the need to navigate to a website before making contact. |
| **19** | **Facebook Page Completeness**  Facebook Discovery · Research / Comparison *In gap score* | **0 **No Facebook page or page is unclaimed. Page exists but incomplete. Inconsistent branding. No CTA button. Claimed and reasonably complete. Consistent branding. CTA button configured. About section populated. Fully optimised. Visual identity consistent. All business information complete. CTA button linked to highest-converting destination. NAP perfectly consistent with GBP and website. | In Northern Ontario markets, Facebook is where trades businesses live in their community. When someone asks in a local group 'who's a good plumber?' the first thing people do is click the page. |
| **20** | **Facebook Content ****&**** Community Voice**  Facebook Engagement · Research / Comparison *In gap score* | **0 **No content published. Silent page. No group participation. Fewer than 2 posts per month. Promotional only. No community voice. Weekly minimum posting. Mix of promotional and community content. Some group participation. Multiple times weekly. Community-first content — project highlights, seasonal tips, community involvement, trade education, team moments. Active in local Facebook groups — genuine value, never promotional in group context. | Facebook reach for trades comes from community relevance, not follower count. Contractors who participate genuinely in local groups get organic recommendations from neighbours who've never hired them. |
| **21** | **Facebook Review Score ****&**** Velocity**  Facebook Engagement · Comparison *In gap score* | **0 **No reviews or average below 3.5 stars. Fewer than 10 reviews. Average 3.5–4.0. No recent reviews. 10–25 reviews. Average 4.0–4.5. Some recent velocity. 25+ reviews. Average 4.5+. Consistent recent velocity. Score mirrors GBP — cross-platform consistency reinforces trust narrative. | Facebook reviews are read by people who discovered the contractor through community groups or friend recommendations — the highest-trust discovery path in the trades. |
| **22** | **Facebook Review Response Behaviour**  Facebook Engagement · Comparison *In gap score* | **0 **No responses to any Facebook reviews. Occasional responses. No consistent pattern. Responds to most reviews within a week. Some personalisation. Responds to every review promptly and personally. Adds context and thanks by name. Negative reviews handled professionally and publicly. | Facebook review responses are visible to the contractor's entire follower community. How you respond to a bad review tells the community more about your character than the review itself. |
| **23** | **Facebook Events**  Facebook Engagement · Research *In gap score* | **0 **No events ever created. Events feature unused. 1–2 events in last 12 months. Low attendance or generic. 3–5 events in last 12 months. Trade-relevant. Some community participation. Regular events tied to seasonal demand peaks and community involvement — furnace check-up clinics, free home safety inspections, community sponsorship events. Events drive organic reach to non-followers. | Events are one of the few organic reach mechanisms remaining on Facebook. A 'Free Winter Furnace Safety Check' event reaches people who have never followed the page through event discovery and friend shares. |
| **24** | **Facebook Video ****&**** Reels**  Facebook Engagement · Research / Comparison *In gap score* | **0 **No video content. Video feature entirely unused. 1–2 videos. Low quality. No reels. No strategy. 5–10 videos present. Mix of before/after and educational. Some reels. Regular video content — weekly minimum. Mix of short-form reels (15–60 seconds) and longer project reveals. Educational tips performing organically. Video content cross-posted from YouTube where channel exists. | Facebook's algorithm prioritises video content over static posts. Short-form video (reels) is the highest-organic-reach format available to a trades contractor on the platform in 2026. |
| **25** | **Nextdoor Business Page Presence**  Nextdoor Discovery · Research / Comparison *In gap score* | **0 **No Nextdoor business page. Contractor absent from platform. Page exists but unclaimed or incomplete. No service area configured. Claimed page. Service area configured to match protected market. Basic information complete. Fully optimised. Complete business information. Service area matches protected market. Visual identity consistent. Connected to all relevant neighbourhood communities. | Nextdoor is hyper-local neighbour-to-neighbour recommendation. When someone posts 'does anyone know a good electrician?' the contractors with a claimed, complete page are the ones that get recommended. |
| **26** | **Nextdoor Recommendations**  Nextdoor Growth · Comparison *In gap score* | **0 **No recommendations on Nextdoor page. Fewer than 5 recommendations. Brief and generic. 5–15 recommendations with some detail — job type, response time, or technician referenced. 15+ recommendations with consistent velocity. Detailed recommendations referencing specific trade work, reliability, cleanliness, and value. Neighbours tagging the business proactively. | Nextdoor recommendations are the digital equivalent of a neighbour knocking on the door and saying 'I know a great plumber.' They carry social proof no paid platform can manufacture. |
| **27** | **Nextdoor Community Visibility**  Nextdoor Growth · Comparison *In gap score* | **0 **No organic mentions in any neighbourhood community. 1–2 isolated mentions in past 90 days. Passive tagging only. Regular mentions across at least 2 neighbourhood communities. Named in response to trade requests. Dominant organic presence across all communities in protected market. The automatic first recommendation when neighbours ask for the trade. Unprompted mentions feeding branded search volume. | Organic mentions in community posts are distinct from recommendations on the business page. They represent the contractor being the first name that comes to mind when a neighbour has a problem. |
| **28** | **HomeStars Presence ****&**** Score**  Reviews & Reputation Engagement · Comparison *In gap score* | **0 **No HomeStars profile. Absent from Canada's primary trades review platform. Profile exists but unclaimed. Incomplete. Star Score below 7. Reviews minimal. Claimed profile. Core information complete. Star Score 7–8.5. Reviews present and current. Fully optimised. Star Score 8.5+. Review volume at tenure benchmark. Consistent velocity. Responds to every review. Project portfolio populated. Best of HomeStars designation where achieved. | HomeStars is the primary Canadian trades review platform. A contractor absent here is invisible to the segment of homeowners who specifically use HomeStars to find vetted contractors. |
| **29** | **Houzz Presence ****&**** Reviews**  Reviews & Reputation Engagement · Comparison *In gap score* | **0 **No Houzz profile. Profile exists but unclaimed or minimal. No project portfolio. No reviews. Claimed with basic information. Some project photos. A few reviews. Fully optimised. Substantial project portfolio with high-quality photos and descriptions. Review volume consistent with benchmark for trade. Houzz badge or recognition achieved. | Houzz is the primary renovation and remodel discovery platform. Most relevant for plumbing, electrical, and HVAC on new builds and renovations. High-value homeowners use Houzz to find contractors for significant projects. |
| **30** | **Angi Presence ****&**** Reviews**  Reviews & Reputation Engagement · Comparison *In gap score* | **0 **No Angi profile. Profile exists but unclaimed or incomplete. No reviews. Angi certification not pursued. Claimed profile. Core information complete. Some reviews. Certification in progress. Fully optimised. Angi certified or Super Service Award where applicable. Review volume at benchmark. Consistent velocity. Responds to reviews. | Angi (formerly HomeAdvisor) is a major leads platform, particularly strong in the US market. The Angi Certified badge is a visible trust signal that homeowners actively look for. |
| **31** | **Aggregate Review Footprint**  Reviews & Reputation Growth · Comparison *In gap score* | **0 **Reviews concentrated on a single platform only or absent entirely. Reviews present on two platforms. One platform overwhelmingly dominant. Reviews across 3–4 platforms. No single platform overwhelming. Volume approaching benchmark. Reviews across 5+ platforms with meaningful volume on each. Total at or above tenure benchmark. Consistent velocity across platforms. Breadth signals authority to AI platforms. | A contractor with reviews on only one platform is vulnerable — if that platform degrades or the algorithm changes, their social proof disappears. Multi-platform presence is a durable competitive advantage. |
| **32** | **Review Sentiment Consistency**  Reviews & Reputation Growth · Comparison *In gap score* | **0 **No reviews or severe sentiment inconsistency across platforms. Generally positive but inconsistent trust narrative. Recurring negative themes on some platforms. Consistent positive sentiment across most platforms. Recurring themes align with brand promise on primary platforms. Consistent positive sentiment narrative across all platforms. Recurring themes mirror brand promise precisely — competent, reliable, local, personable. Sentiment consistency contributing to AI authority. | AI search platforms don't just count reviews — they read them. A contractor with 100 reviews saying 'fast, clean, honest' across every platform is surfaced by AI as the authoritative answer in their trade. |
| **33** | **Tier 1 Trades Directory Presence**  Trades Directory Discovery · Comparison *In gap score* | **0 **No presence on any Tier 1 trades directory. Listed on 1 platform but unclaimed. Profile incomplete. Claimed and reasonably complete on 2 Tier 1 directories. Fully claimed, complete, and optimised on all relevant Tier 1 directories. Photos, descriptions, and service lists populated. Review velocity maintained. | HomeAdvisor, Angi Pro, Houzz Pro — these are where homeowners go specifically to find vetted contractors. Being absent misses an entire segment of searchers who will never visit Google. |
| **34** | **Trade Association Directory Presence**  Trades Directory Discovery · Comparison / Emergency *In gap score* | **0 **Not a member of any relevant trade association. Not listed in any association directory. Member but listing is minimal — name and phone only. Listed with core information. Some service detail. Association membership visible on website. Full listing on all relevant association directories — HRAI (HVAC), ECRA/ESA (electrical), PHCC (plumbing), CRCA (roofing). Membership prominently displayed on website, GBP, and all directories. | These are the directories insurance companies, property managers, and informed homeowners use to verify a contractor is licensed, regulated, and accountable. Absence raises a red flag that reviews can't offset. |
| **35** | **BBB Accreditation ****&**** Rating**  Trades Directory Discovery · Comparison *In gap score* | **0 **No BBB listing. Not accredited. Listed but not accredited. Rating below A. BBB accredited. Rating A or above. No open complaints. BBB accredited with A+ rating. Zero complaint history or all complaints resolved. Accreditation displayed on website. | BBB matters less than a decade ago but remains a specific trust trigger for older homeowners — a demographic making up a significant portion of the trades customer base in Northern Ontario. |
| **36** | **Google Local Services Ad Presence**  Trades Directory Discovery · Emergency / Active Project *In gap score* | **0 **No LSA presence. Contractor not verified through Google's LSA process. LSA application in progress. Not yet verified or active. LSA verified and active for primary trade keywords in primary city. Google Guaranteed — verified and actively running LSA ads for all primary trade keywords across the full protected market. Badge prominently displayed in search results above Map Pack and organic. | LSA ads appear above both the Map Pack and organic results for trades searches. A contractor absent from LSA is losing positions 1, 2, and 3 on the page to verified competitors. |
| **37** | **Citation Volume ****&**** Consistency**  Citation & NAP Conversion · Research *In gap score* | **0 **Fewer than 10 citations across all directories. NAP inconsistent. 10–25 citations. Some inconsistency in name, address, or phone across directories. 25–50 citations. NAP mostly consistent. Major directories covered. 50+ citations across all major and trade-specific directories. NAP perfectly consistent. No duplicate listings. All citations claimed and up to date. | Citation volume and consistency are foundational local SEO signals. Every citation is a vote that this business is real, legitimate, and located where it says it is. |
| **38** | **NAP Consistency Score**  Citation & NAP Conversion · Research *In gap score* | **0 **Name, address, or phone inconsistent across 3+ major sources. One or two inconsistencies. Minor variations — abbreviated vs full street name. NAP consistent across all major sources. 1–2 minor inconsistencies in secondary directories. Perfect NAP consistency across every citation, directory, GBP, website, and social profile. Business name, address, and phone identical everywhere. No variations. | Google uses NAP consistency as a trust signal to confirm a business is legitimate and its information is accurate. Inconsistencies create ranking penalties that no other optimisation can overcome. |
| **39** | **Schema Markup**  Citation & NAP Conversion · Research *In gap score* | **0 **No schema markup present on website. Basic LocalBusiness schema present but incomplete. LocalBusiness schema complete. Service schema on key service pages. Full LocalBusiness schema with all fields populated. Service schema on every service page. Review schema pulling GBP rating. FAQ schema on FAQ page. All validated via Google Rich Results Test. | Schema markup is the language that tells search engines and AI platforms exactly what a business does, where it is, what it charges, and what its customers say. Without it, Google infers — often incorrectly. |
| **40** | **Seasonal Content Readiness**  Seasonal & Geographic Discovery · Research / Active Project *In gap score* | **0 **No seasonal content. Website and GBP are static regardless of season. Some seasonal mentions but reactive — published after demand peaks. Seasonal content visible for 1–2 seasons. Published approximately on time. Seasonal content strategy executed 4–6 weeks before each demand peak. Content published, GBP posts live, and LSA adjusted before the spike hits. | Contractor demand is not flat. Furnace tune-ups spike in September. Pipe thaw calls spike in February. A contractor with content ready before the spike captures it. One who publishes after captures nothing. |
| **41** | **Service Area Content Coverage**  Seasonal & Geographic Conversion · Research / Active Project *In gap score* | **0 **No service area pages. Content references primary city only. Primary city service page only. Surrounding communities not addressed. Service area pages exist for 2–3 communities. Basic content. Not fully optimised. Fully optimised service area pages for every community in the 100km protected market. Each page unique, locally relevant, and targeting trade keywords specific to that community. | A contractor visible only in their primary city is leaving the surrounding communities to competitors. Service area content coverage converts protected market exclusivity into actual revenue. |
| **42** | **Seasonal Offer ****&**** Campaign Execution**  Seasonal & Geographic Conversion · Active Project *In gap score* | **0 **No seasonal offers or campaigns. Business makes no effort to capitalise on seasonal demand. 1–2 seasonal offers in last 12 months. Reactive — launched at or after demand peak. 3–4 seasonal campaigns per year. Launched approximately on time. Promoted on at least 2 channels. Full seasonal campaign calendar executed 4–6 weeks before each demand peak. Coordinated across website, GBP posts, Facebook, and LSA. Offers specific and compelling. Results tracked. | Seasonal demand peaks are predictable and repeating. A contractor with a campaign live before the spike converts at a multiple of the conversion rate of one who isn't visible until demand has already peaked. |
| **43** | **Geographic Search Visibility**  Seasonal & Geographic Discovery · Research / Emergency *In gap score* | **0 **Contractor visible only in primary city. No Map Pack presence in surrounding communities. Map Pack presence in primary city. 1–2 surrounding communities only. Map Pack presence in primary city and half of surrounding communities. Map Pack presence in top 3 for primary trade keywords across all communities in the 100km protected market. Dominant geographic visibility matching the protected market boundary. | The licensed market is 100km. A contractor visible only in their primary city has paid for exclusivity they're not using. Geographic search visibility quantifies the gap. |
| **44** | **Video Content Production**  Video Conversion · Research / Comparison *In gap score* | **0 **No video content on any platform. 1–2 videos. Low production quality. No strategy. 5–10 videos across at least 2 platforms. Mix of project work and educational content. Regular video production — weekly minimum. Mix of short-form (reels/shorts) and long-form (project reveals, how-to guides). Published across YouTube and Facebook simultaneously. | Video is the fastest-growing discovery and trust format for trades. A 60-second before/after reel demonstrates competence in a way that no amount of text or photos can match. |
| **45** | **YouTube Channel Presence**  Video Conversion · Research *In gap score* | **0 **No YouTube channel. Channel exists but inactive — last upload 6+ months ago. Fewer than 10 videos. Active channel. 10–25 videos. Updated in last 90 days. Subscriber count growing. Active channel with 25+ videos. Regular upload cadence — weekly or bi-weekly. Mix of educational, project, and community content. Optimised titles, descriptions, and tags. Subscriber growth consistent. | YouTube is the second largest search engine. Homeowners researching 'how much does a furnace replacement cost' or 'what causes low water pressure' will find contractors with YouTube channels before they find those without. |
| **46** | **Video Content Quality ****&**** Strategy**  Video Growth · Research *In gap score* | **0 **Video content is random and unstrategic. No connection between videos and business goals. Content is project-based only. No educational angle. Titles generic. No series or themes. Content mix beginning to emerge — some educational, some project reveals. Titles include trade keywords. Some seasonal relevance. Deliberate content strategy. Educational series targeting homeowner questions. Project reveals building credibility. Seasonal content timed to demand peaks. Titles and descriptions optimised for search. Thumbnails consistent and branded. | Video content quality determines whether the channel builds a sustainable audience or is ignored. Trade videos that answer real homeowner questions rank in search, get shared, and position the contractor as the local authority. |
| **47** | **Video Platform Cross-Posting**  Video Growth · Research *In gap score* | **0 **Video produced for one platform only. No cross-posting. Occasional cross-posting. No systematic approach. Videos cross-posted to at least 2 platforms consistently. All video content systematically cross-posted — YouTube → Facebook Reels → GBP posts → website embeds. Each platform optimised (captions for Facebook, chapters for YouTube, thumbnail for GBP). | Producing a video and publishing it on only one platform means producing the same content multiple times to reach different audiences. Cross-posting multiplies reach from a single production investment. |
| **48** | **AI Authority — ChatGPT/Gemini/Perplexity**  AI Authority Growth · Research *In gap score* | **0 **Not mentioned in any AI platform response for any trade or location query. Mentioned in AI response for branded queries (business name) only. Mentioned in AI response for trade + location queries on at least 1 platform. Consistently surfaces across ChatGPT, Gemini, and Perplexity for multiple trade + location query variations. Mentioned by name, with specifics about what makes them a recommended choice. | AI search is the fastest-growing discovery channel for trades in 2026. When a homeowner asks ChatGPT 'who is the best plumber in Timmins?' and the contractor doesn't appear, they are invisible to a growing segment of searchers. |
| **49** | **AI Citation Readiness**  AI Authority Growth · Research *In gap score* | **0 **Content not structured for AI citation. No schema. No FAQ. No structured Q&A. Basic structure present. Some schema. FAQ exists but thin. Solid FAQ, schema markup, and Q&A content present. Beginning to appear in AI-generated answers. Content fully structured for AI citation — comprehensive FAQ, complete schema, GBP Q&A seeded, educational blog content targeting high-intent questions. AI platforms have abundant, structured, authoritative content to cite. | AI platforms prefer to cite content that is structured, specific, and authoritative. A contractor whose website has comprehensive schema, FAQ, and Q&A is far more likely to be cited than one whose content is thin and unstructured. |
| **50** | **AI Share of Voice**  AI Authority Growth · Research / Comparison *In gap score* | **0 **Competitor contractors mentioned in all AI responses. This contractor never appears. This contractor appears in some AI responses. Competitors mentioned more frequently. Mentioned in AI responses as frequently as leading competitors. Dominant AI share of voice — mentioned first or exclusively in AI responses for primary trade + location query combinations. Competitors cited less frequently or not at all. | AI share of voice is the measure of competitive dominance in the fastest-growing search channel. A contractor who is always the first recommendation when a homeowner asks AI 'who should I call?' has an insurmountable advantage over one who never appears. |
| **51** | **Search Share of Voice**  Share of Voice Growth · Research / Emergency *In gap score* | **0 **Contractor ranked outside top 10 for primary trade keywords in primary city. Ranking in top 10 for some primary keywords. Map Pack inconsistent. Competitors dominate. Ranking top 5 for most primary keywords. Map Pack top 3 for primary city. Dominant search share of voice — top 3 organic and Map Pack position 1 for all primary trade keywords across the full protected market. Competitors cannot displace without significant sustained effort. | Search share of voice is the sum of all SEO and GBP investments made over time. A contractor who dominates search for their trade keywords in their market is generating a continuous flow of high-intent inbound leads at zero marginal cost. |
| **52** | **Social Share of Voice**  Share of Voice Growth · Research / Comparison *In gap score* | **0 **Competitors mentioned in community groups. This contractor never mentioned. Occasionally mentioned. Competitors dominate social recommendations. Mentioned as frequently as leading competitors in community conversations. Dominant social share of voice — first recommendation in community groups, most mentioned contractor in neighbourhood conversations, highest engagement on trade-relevant posts. | Social share of voice is the measure of community dominance — whose name comes up first when a neighbour asks 'who should I call?' This cannot be bought. It is earned through presence, quality, and community engagement over time. |
| **53** | **Competitor Ad ****&**** LSA Pressure**  Share of Voice Growth · Emergency / Active Project *In gap score* | **0 **Multiple competitors running aggressive LSA and paid ad campaigns for primary trade keywords. 2–3 competitors active in LSA or paid ads. Significant top-of-page pressure. 1–2 competitors in LSA. Some paid activity. This contractor's organic and Map Pack positions mitigate pressure. This contractor holds LSA top position and dominant Map Pack and organic positions. Competitor paid activity cannot displace top-of-page presence. Branded search volume insulates against paid competitor pressure. | Understanding competitor paid and LSA pressure is essential for correctly interpreting a contractor's search share of voice. A contractor ranking second in a market with zero competitor LSA is in a different position than one ranking second against three Google Guaranteed competitors. |
| **54** | **Branded Search Presence**  Share of Voice Growth · Comparison *In gap score* | **0 **Searching the contractor's own business name produces no clear result or surfaces competitors. Business name search produces the website result only. GBP not appearing for branded search. Business name search produces website + GBP. Some branded search volume measurable. Strong branded search presence — business name search produces GBP, website, multiple directory listings, and social profiles. Branded search volume growing consistently. No competitor ads appearing on branded terms. | Branded search volume is the digital measure of word-of-mouth. A contractor whose satisfied customers tell their neighbours generates branded searches — people searching the business name directly rather than the trade + city combination. |
| **55** | **Click-to-Call Above the Fold**  Contact Friction Conversion · Emergency *In gap score* | **0 **No click-to-call button. Phone number not visible above the fold on mobile. Phone number visible but not click-to-call enabled. Requires scrolling on mobile. Click-to-call button present above the fold on mobile. Functional. Standard design. Click-to-call button prominent, high-contrast, and persistent (sticky header on mobile). Available on every page. Number formatted for tap-to-call. Emergency-specific CTA visible — 'Call Now — 24/7 Emergency Service'. | A homeowner with a burst pipe in January is on their phone. If they can't tap to call within 3 seconds of landing on the website, they're calling the next contractor. Click-to-call friction is a direct revenue leak. |
| **56** | **Emergency Pathway Clarity**  Contact Friction Conversion · Emergency *In gap score* | **0 **No emergency content. No indication of 24/7 availability. Homepage treats all visitors the same. Emergency availability mentioned but buried. No dedicated emergency page or CTA. Emergency availability visible on homepage. Basic emergency page exists. Clear emergency pathway from every entry point — homepage banner, GBP, Facebook, and directory profiles all communicate 24/7 availability. Emergency page answers all urgent questions. Response time committed. | Emergency intent visitors are worth multiple times the revenue of non-emergency visitors — they need help now and are not price shopping. A website that doesn't immediately signal emergency availability loses this segment entirely. |
| **57** | **Quote/Booking Friction**  Contact Friction Conversion · Active Project *In gap score* | **0 **No online quote or booking capability. Phone-only contact. No form. Basic contact form exists. No online booking. Form asks for too much information. Quote request form present. Reasonably simple. Response time stated. Frictionless quote or booking path — form under 4 fields, response time committed to, integrated with calendar booking, confirmation sent immediately. Available on website, GBP, and Facebook. | Active Project intent visitors are comparing 3–5 contractors. The one who makes it easiest to request a quote without committing to a call gets the first appointment — and first appointments convert at significantly higher rates. |
| **58** | **After-Hours Availability Signal**  Contact Friction Conversion · Emergency *In gap score* | **0 **No after-hours availability indicated. Business appears to operate 9–5 only. After-hours mentioned vaguely — 'we try to accommodate urgent calls.' No commitment. After-hours availability stated. Emergency contact method specified. After-hours availability clearly communicated with specific hours, contact method, and response time commitment. Integrated into GBP hours (mark as open 24 hours where true). Emergency line distinct from main number where applicable. | A significant portion of trades emergencies happen outside business hours — burst pipes on Sunday evenings, furnace failures on statutory holidays. A contractor who communicates after-hours availability captures this segment. One who doesn't loses it to a competitor who does. |
| **59** | **Response Time Commitment**  Contact Friction Conversion · Emergency / Active Project *In gap score* | **0 **No response time commitment anywhere. Visitor has no idea when to expect a callback. Vague commitment — 'we'll get back to you soon.' No specific timeframe. Response time stated — 'within 2 hours during business hours.' Some specificity. Specific, accountable response time commitment prominently displayed — 'Emergency calls answered within 15 minutes. Quote requests responded to within 2 hours.' Commitment consistent across all platforms. Backed by A2P tracking. | Uncertainty about when someone will call back is the second most common reason homeowners contact multiple contractors simultaneously. A contractor who commits to a specific response time and keeps it earns the job before the competition arrives. |
| **60** | **Mobile Experience Quality**  Contact Friction Conversion · Emergency *In gap score* | **0 **Website fails on mobile — broken layout, unreadable text, non-functional forms. Mobile-accessible but poor experience. Slow load time (5+ seconds). Small tap targets. Functional mobile experience. Loads in under 4 seconds. Core conversion paths work. Excellent mobile experience. Loads in under 2 seconds. All conversion paths optimised for touch. Click-to-call persistent. Forms thumb-friendly. No horizontal scrolling. Google Core Web Vitals passing. | Over 70% of emergency trades searches happen on mobile. A website that is slow or broken on mobile loses the majority of its highest-value visitors before they see a single piece of content. |
| **61** | **Inbound Inquiry Volume ****&**** Trajectory**  A2P Content Intelligence Engagement · All buckets *Not in gap score* | **0 **No measurable inbound inquiry volume through any digital touchpoint. Sporadic and unpredictable. Significantly below tenure/market benchmark. Single touchpoint only. Moderate and consistent. Approaching benchmark. Seasonal patterns beginning to emerge. Strong inquiry volume at or above tenure/market benchmark. Consistent and growing. Full seasonal pattern mapped. Multiple channels contributing. Inquiry data feeding content calendar directly. | Inquiry volume is the ultimate measure of whether all other signals are working. A contractor can score well on every content signal and still have a broken conversion path somewhere in the funnel. |
| **62** | **Inquiry Channel Diversity**  A2P Content Intelligence Engagement · All buckets *Not in gap score* | **0 **All inquiries from single channel only. Total channel concentration risk. Two channels contributing. One dominates overwhelmingly. 3–4 channels actively generating inquiries. No single channel overwhelming. Full channel diversity across all A2P touchpoints. Channel mix reflects intent distribution — Emergency via phone/SMS, Active Project via form/chat, Comparison via social message, Research via content engagement. | A contractor relying on a single channel for all inquiries is one algorithm change or platform change away from a revenue crisis. Channel diversity is business continuity planning. |
| **63** | **Anonymous Web Visit Behaviour**  A2P Content Intelligence Discovery · All buckets *Not in gap score* | **0 **No anonymous web visit data. No tracking or negligible traffic. Fewer than 50 unique visits/month in protected market. High bounce rate. 50–200 unique visits/month. Some multi-page behaviour. Key service pages receiving traffic. 200+ unique visits/month. Strong multi-page behaviour. Intent bucket classification operational. Return visit detection identifying warm prospects. Exit page analysis driving content improvements. | Anonymous web visits represent the top of the funnel — visitors who haven't yet made contact. Understanding their behaviour reveals which content is working and which is causing abandonment before contact. |
| **64** | **Inquiry to Conversion Rate**  A2P Content Intelligence Conversion · All buckets *Not in gap score* | **0 **Conversion rate below 30% or untracked. Most inquiries not converting to booked jobs. Conversion rate 30–50%. Some drop-off in follow-up. Cause unidentified. Conversion rate 50–70%. Drop-off identifiable by channel or intent bucket. Conversion rate 70%+. Full attribution by channel and intent bucket. Drop-off points identified and addressed. Content adjustments driven by conversion data. | A contractor with a 50% conversion rate is losing one in two inquiries they've already paid to acquire. Understanding where the drop-off happens is more valuable than generating more inquiries at the same conversion rate. |
| **65** | **Intent Bucket Distribution**  A2P Content Intelligence Engagement · All buckets *Not in gap score* | **0 **No intent bucket classification. Same message to every visitor regardless of intent. Emergency intent distinguishable. Active Project, Comparison, and Research not reliably classified. Three of four intent buckets reliably classified. Automation serving differentiated content to 2 buckets. Full four-bucket intent classification across all A2P touchpoints. Distribution cross-referenced with gap score — if 40% of traffic is Emergency-intent and Emergency signals are weak, gap report surfaces this as highest priority. | Not all inquiries are equal. An Emergency-intent visitor is worth 3× a Research-intent visitor in immediate revenue. Understanding intent distribution informs where to invest content improvement effort first. |
| **66** | **Call Tracking Attribution**  A2P Content Intelligence Growth · Active Project *Not in gap score* | **0 **No call tracking. Inbound calls unattributed. No visibility into what is driving calls. Basic call tracking on primary number. Source attribution limited to direct vs referral. Call tracking across primary number and at least one campaign channel. Some content attribution. Full call tracking attribution across all channels and campaigns. Every inbound call source identified. Campaign-level attribution confirming which spend is producing calls at what cost per call. Seasonal attribution patterns mapped. | A contractor spending $2,000/month on Google Ads with no call tracking has no idea whether that spend is generating calls or being wasted. Call attribution is the foundation of any rational marketing investment decision. |
| **67** | **Realtor ****&**** Real Estate Network**  Referral Network Growth · Active Project *Not in gap score* | **0 **No relationship with any realtor or real estate professional in protected market. 1–2 informal relationships. No systematic referral process. Pre-sale and move-in work arriving by chance. 3–5 active referral relationships with realtors. Contractor is known to the local real estate community. Established referral network with 10+ active realtor relationships. Featured on realtor websites. Preferred contractor list inclusions. Pre-sale repair and buyer move-in work arriving consistently through the network. | Realtors are the highest-volume single referral source available to a trades contractor. Every property transaction generates potential repair and renovation work. A contractor embedded in the local real estate community captures this flow systematically. |
| **68** | **Property Manager Network**  Referral Network Growth · Active Project *Not in gap score* | **0 **No relationship with any property manager in the protected market. 1–2 informal relationships. No preferred contractor status. Work arriving sporadically. 3–5 property management companies with active referral relationship. Some preferred contractor status. Preferred contractor status with 10+ property management companies. On-call relationship for emergency and routine maintenance. Consistent volume of work from managed properties across the protected market. | Property managers control a predictable, recurring maintenance and repair budget across multiple properties. A single preferred contractor relationship with a property management company can represent dozens of jobs per year. |
| **69** | **Insurance Adjuster ****&**** Restoration Network**  Referral Network Growth · Emergency *Not in gap score* | **0 **No relationship with any insurance company or restoration contractor. 1–2 informal insurance relationships. Not on any preferred contractor list. On preferred contractor list for 1–2 insurance providers. Some restoration contractor relationships. On preferred contractor list for 5+ insurance providers. Active restoration contractor partnerships. Insurance adjuster direct referral relationship established. Emergency restoration work arriving consistently. | Insurance-referred work is the highest-value emergency category. Water damage, fire damage, and storm damage restoration jobs are large-ticket, urgent, and typically insurance-paid — no price negotiation required. |
| **70** | **Building Inspector ****&**** Municipal Network**  Referral Network Growth · Active Project *Not in gap score* | **0 **No relationship with building inspectors or municipal staff. Known to local inspection department but no formal relationship or referral history. Positive relationships with 2–3 building inspectors. Mentioned informally for permit-related work. Established relationships with building inspection department and municipal staff. Listed on municipal contractor registries. Recommended by inspectors for upgrade and remediation work. Permit process relationships generating referrals. | Building inspectors encounter non-compliant systems in the course of their work. A contractor they know, trust, and recommend receives the remediation job that results. This referral source has near-zero competition. |
| **71** | **Hardware Store ****&**** Supplier Network**  Referral Network Growth · Emergency / Active Project *Not in gap score* | **0 **No relationship with any hardware store or trade supplier in the protected market. Known to staff at 1–2 hardware stores. No formal referral arrangement. Active referral relationship with 2–3 hardware stores. Business cards or materials available at counter. Formal referral partnerships with primary hardware stores and trade suppliers across the protected market. Business materials at point of sale. Staff trained to recommend. Reciprocal referral relationship maintained. | Hardware stores are the first stop for many homeowners attempting DIY repairs. When the project exceeds their capability, the hardware store staff recommendation is the most trusted referral source in the trade. |
| **72** | **Cross-Trade Referral Network**  Referral Network Growth · Active Project *Not in gap score* | **0 **No referral relationships with any complementary trade. 1–2 informal cross-trade relationships. Work arrives by chance, not systematically. Active referral exchange with 2–3 complementary trades. Reciprocal relationship maintained. Reciprocal referral relationships with at least one contractor in every complementary trade — plumber refers to HVAC, electrician refers to plumber, roofer refers to gutter installer. Referral volume tracked and balanced. Cross-trade network generating consistent inquiry flow. | When a plumber discovers an electrical problem, they refer to an electrician — and vice versa. A contractor embedded in a reciprocal cross-trade referral network captures work that digital search will never surface. |

# **7.  The scoring engine**

## **7.1  Gap-score mechanics (flat sum)**

calculateGapScore() in signalPipeline.js filters to in-gap-score signals with a valid 0–3 score, then flat-sums them. Max = 180. Content Gap % = totalScore / 180 × 100. Per-stage sums are computed against fixed stage maxima (45 / 54 / 45 / 36). There are no per-signal multipliers — weighting is entirely a function of how many signals live in each stage.

| const gapSignals = scores.filter(s => s.in_gap_score && s.score !== null && s.score >= 0); const totalScore = gapSignals.reduce((sum, s) => sum + (s.score ││ 0), 0); contentGapPct = round(totalScore / 180 * 100, 1) |
| --- |

## **7.2  The ten Engine-1 code files**

All files live in server/scoring/ within the ClearSky Node.js backend. All were built and tested in stub mode; live wiring and calibration remain.

| **File** | **Status** | **Purpose** |
| --- | --- | --- |
| gate1.js | Complete | Gate 1 quality floor — 4 locked thresholds, batch runner, franchise detection, full audit trail with constants snapshot. 7 test cases passing. Exports runGate1, runGate1Batch, GATE1, FRANCHISE_SIGNALS. |
| pageFetcher.js | Complete | Smart website fetcher — discovers internal links, classifies into 10 page types, fetches in parallel, assembles labelled content sections. getContentForSignal() maps signals to relevant pages. |
| scorersMethod1.js | Complete | 19 deterministic formula functions. No Claude. GBP 11–18, Facebook counts, Nextdoor, HomeStars/Houzz/Angi, citations, video counts. |
| scorersMethod2.js | Validate schemas | 26–28 gate + Claude functions. Gate returns 0/1 instantly; Claude only on pass (2/3). Parallel via Promise.all. Validate Apify schemas before production. |
| scorersMethod3.js | Calibrate | 15 pure-Claude functions. Sub-question prompt pattern, JSON output locked. All fire simultaneously. Calibrate against real sites before production. |
| valueSerpScorer.js | Complete | ValueSERP integration — signals 40, 43, 51–54. 18 keyword templates × 4 trades. Geographic visibility across protected-market communities. |
| apifyScorer.js | Validate | 6 platforms (Facebook, Nextdoor, HomeStars, Houzz, Angi, BBB). Schema validator + cost estimator. Validate selectors against live pages. |
| aiPlatformScorer.js | Complete | AI-platform automation — signals 48–50. ChatGPT (gpt-4o-mini), Gemini (1.5-flash), Perplexity (sonar-small). 18 queries/platform. Citation-source detection. ~$0.013/contractor. |
| youtubeScorer.js | Complete | YouTube Data API v3 — signals 44–47. Free quota (~155 units/contractor). Intent-bucket NLP (4 buckets, 30+ patterns), upload frequency, view trajectory. |
| signalPipeline.js | Wire integrations | Master orchestrator: Gate 1 → parallel fetches → all three method scorers → manual placeholders → gap score → DB write. Tested in stub mode (72 signals, gap score calculated). Integration stubs need live calls. |
| buildCandidatePool.js | Ready | DataForSEO candidate-pool builder (Google Maps search, entry-condition validation, CSV/DB writer). Developer to run for plumbing first. |

## **7.3  Model and locked engine constants**

| **Constant** | **Value** | **Notes** |
| --- | --- | --- |
| Scoring model | claude-sonnet-4-6 | Method 2 & 3 (earlier family-law build used claude-sonnet-4-20250514). |
| callToPurchaseRate | 0.048 | Engine constant — locked Session 19. |
| websiteToCallRate | 0.12 | Engine constant — locked Session 19. |
| winRate | 0.40 | Locked Session 19. |
| LongTailMultiplier | 1.35 | Locked Session 19. |
| positionOneCTR | 0.255 | 0.44 × 0.58 — locked Session 19. |
| ctrGap (not in pack) | 0.225 | Pending LSA / AI-displacement adjustments. |
| emergencyAvgSaleValue | $800 | Flat across all trades — locked Session 19. |

# **8.  Database architecture**

ContentRadar shares the existing ClearSky PostgreSQL instance. All tables are prefixed cr_ to avoid collision; running contentradar_schema.sql once creates the full structure (8 live tables + 3 views + 8 ENUM types) with zero impact on existing ClearSky tables. Database name: contentradar-scoped tables inside the ClearSky DB.

## **8.1  Live tables (created by the schema file)**

| **Table** | **Stores** |
| --- | --- |
| cr_businesses | All 1,200 Cohort 1 businesses — name, trade (ENUM), city, province/state, country, URLs, place_id, years in business, gate1 result, cohort + cohort_tier, clearsky_client_id, is_active. |
| cr_page_snapshots | Every page fetched — url, page_type (ENUM), content_text, SHA-256 content_hash, fetch status. Hash enables quarterly change detection. |
| cr_score_runs | One row per scoring run — run_type (ENUM), timing, cost, pages fetched vs skipped, Claude calls, gap_score, gap_percent, status. |
| cr_signal_scores | Primary read table — one row per signal per business per run: signal_num (1–72), score (0–3), scoring_method (ENUM), stage, in_gap_score, note, claude_prompt_used. |
| cr_benchmark_averages | Cohort 1 averages per signal/trade/tier. Updated each quarterly refresh. Replaces the old cohort1Averages.js. |
| cr_gbp_data | Raw Google Places response — rating, reviews, photos, hours, services, Q&A count, raw_json (JSONB). |
| cr_apify_data | Raw Apify results per platform (ENUM) — apify_run_id, status, result_count, cost, raw_json (JSONB). |
| cr_gate1_log | Gate 1 audit trail per evaluation — inputs, result (ENUM), franchise flag, and constants_snapshot (JSONB) at evaluation time. |

## **8.2  Tables to build (Session 25)**

| **Table** | **Stores** |
| --- | --- |
| cr_content_events | New content detected — content_type (ENUM), topic_tag, intent_bucket, published_at, t0_signal_snapshot (JSONB). |
| cr_signal_snapshots | Attribution readings at T=0/14/30/60/90 per content event — Map-Pack position, GBP views, review count, YouTube views, AI-mention flag. |
| cr_content_outcomes | Pattern library — content type X in trade Y correlated with outcome Z at N days (sample size, avg deltas, % improved). |
| cr_cohort_trends | Weekly aggregation — top content topics, top questions, event counts, % of businesses publishing. |

## **8.3  Views**

| **View** | **Purpose** |
| --- | --- |
| cr_latest_scores | Most recent signal scores per business (no run_id needed). |
| cr_content_gap | Content-gap computation per business. |
| cr_benchmark_comparison | Joins latest scores to benchmark averages — signal-by-signal gap vs the operational tier. Primary view for Layer 4. |

## **8.4  Setup (run once on the VPS)**

| **Step** | **Action** |
| --- | --- |
| 1 | Upload contentradar_schema.sql to the VPS (scp into the ClearSky project). |
| 2 | psql -U postgres -d clearsky_db -f contentradar_schema.sql, then \dt cr_* to confirm 8 tables. |
| 3 | Add all ContentRadar env vars to .env on the VPS (see Section 12). |
| 4 | npm install pg node-fetch; run the connection test — expect "cr_businesses rows: 0". |

| **Connection pooling.  **A separate crPool (max 5, higher timeout) sits alongside the existing clearSkyPool (max 10) — same PostgreSQL server, independently managed. All scoring files import crPool; signalPipeline.js uses it for every write. |
| --- |

# **9.  Engine 2 — watch-market intelligence**

Engine 2 is the demand-side system: the only component of the platform no competitor can replicate, because it is built on data that does not exist anywhere else. Small trades businesses have no way to know what customers will search for before they search. Engine 2 inverts this by monitoring businesses in watch markets that sit ahead of each client's market for **reactive demand** — the publishing window. Concept fully designed; the data-ingestion pipeline is NOT yet built.

## **9.1  The watch-market mechanism and the Sudbury canary**

Watch markets are selected on geographic proximity (similar weather / seasonal profile), economic similarity (population, housing stock age, income), and — **for reactive demand specifically** — a demonstrable temporal lead in search behaviour. That lead is not universal; see the correction below.

| **Sudbury is the canary, not a peer.  **For Timmins, Sudbury is the PRIMARY leading indicator — a larger Northern Ontario city sharing climate, housing stock and trades economy. It is not one market among many; accumulating Sudbury data across seasonal cycles is a proprietary moat. DataForSEO location code 1002124; Sudbury households ~73,000. |
| --- |

| **Corrected 2026-07-03 — Sudbury does not universally lead Timmins by 4–6 weeks.** That figure was stated in earlier drafts as a blanket property of the canary relationship. It only holds for **reactive demand triggered by a physical weather threshold** — frozen pipes, sump pumps activating with snowmelt — where the trigger event genuinely propagates south to north because Sudbury crosses the temperature threshold first. It does not hold for **planned/seasonal demand** — roofing, renovations, anything scheduled by calendar rather than triggered by a break. A homeowner deciding in February to book a new roof for summer isn't reacting to an event that has to travel from Sudbury; Timmins search activity for that kind of work can run in parallel with Sudbury's, or lead it — a shorter northern work season can push Timmins homeowners to book *sooner*, not later, to secure a contractor before the window closes. The lag is real and useful specifically for the Geo-lag signal type (§9.2); it is not a property of the Sudbury/Timmins relationship in general. |
| --- |

| **Why population size matters — measurability, not just speed (corrected 2026-07-03).** A "200% of 90-day baseline" spike is only a meaningful signal if the baseline itself has enough query volume for a real demand shift to be statistically distinguishable from ordinary week-to-week noise. Timmins' own search volume for a specific long-tail trade keyword is too thin for this — a good week and a genuine spike look identical in the data. Timmins could not detect its own spike even in real time, let alone early — this isn't solved by watching Timmins harder, it's a hard floor set by population. Sudbury's larger population (~73,000 households) supplies a baseline with enough volume that a spike is legible as signal at all. Separately, its climate/housing-stock/trades-economy similarity to Timmins is what makes that legible signal a valid predictive proxy, and its geographic lag (§9.2) is what turns the proxy into a usable early-publishing window. Population size and temporal lead are two different jobs Sudbury does, not one — a market could have the right lead time and still be useless as a canary if it were too small to generate a readable signal in the first place. |
| --- |

## **9.2  Three signal types**

| **Type** | **Lead time** | **Trigger / example** |
| --- | --- | --- |
| Geo-lag (reactive demand only) | 4–6 weeks | Weather events, seasonal transitions, temperature thresholds. Cold snap hits Sudbury → frozen-pipe searches spike; Timmins follows 4–6 weeks behind. Does not apply to planned/seasonal work (roofing, renovations) — see §9.1 correction. |
| Regulatory / economic lag | 2–8 weeks | Building codes, rebates, insurance requirements, bylaw enforcement. Urban markets spike immediately; small markets follow. |
| Life-event triggers | 2–12 weeks | Home purchases, insurance renewals, renovation season. Spring closings → pre-purchase plumbing searches spike 6–8 weeks later. |

## **9.3  Four keyword states**

| **State** | **Threshold** | **Client action** |
| --- | --- | --- |
| Spiking | 200%+ above 90-day baseline | Publish within 5–7 days. Critical gap — window open and closing fast. |
| Rising | 50–200% above baseline | Draft and schedule within 2–3 weeks. High priority. |
| Evergreen | Consistent year-round | Publish as part of the baseline programme if missing. |
| Dormant | Below baseline and declining | No action. Monitor for reactivation next cycle. |

## **9.4  What Engine 2 produces per client**

- Prioritised Content Calendar — rolling 90 days, updated weekly, ranked by urgency × revenue value.

- Content Gap Report — the client's website vs the demand database; the input to diagnostic Layer 4.

- Keyword State Dashboard — Spiking Now, Rising Soon, Coverage Status, Competitor Presence.

- Module Integration Briefs — structured briefs feeding Blog, FAQs, AI SEO and the Local Ranking Tool.

## **9.5  Watch keyword taxonomy (locked)**

| **Item** | **Detail** |
| --- | --- |
| Taxonomy scale | 174 tags / 518 keywords across 7 trades. |
| Intent split | 88 emergency · 341 active project · 45 comparison · 44 research. |
| Plumbing taxonomy | 115 keywords, 39 service tags, all intent buckets assigned. |
| Sudbury plumbing SERP baseline | 131 keywords, Week 1 captured (separate system from Cohort 1 ValueSERP — do not conflate). |
| HVAC keyword list | 92 keywords, 31 tags — NOT started. |

## **9.6  PAA architecture (locked, Sessions 20–21)**

- Content-state pipeline: Gap → Briefed → In Production → Published (a database-state problem, not a scraping problem).

- Prototype scope: Plumbing and HVAC. PAA does not feed the revenue-gap formula.

- Intent inherited from the parent keyword. ClearSky controls all client managed presence end-to-end.

- Opportunity Window signal (on the horizon): a keyword rising/spiking while LSA and Ad competition is absent — an organic capture window before competitors move.

## **9.7  Four pillars of defensibility**

| **Pillar** | **Why a competitor cannot copy it quickly** |
| --- | --- |
| Time to build | Watch-market correlation needs multiple seasonal cycles across market pairs to validate geo-lag. Not replicable in 12 months. |
| Market specificity | Value is not generic keyword data (anyone has that) — it is knowing which keywords matter for a specific trade in a specific small market in a specific season. |
| Diagnostic integration | Embedded as the demand side of Layer 4; every diagnostic run reinforces it. Competitors cannot copy the diagnostic without copying ContentRadar. |
| Network effect | Every licensed client adds a data point to the demand database. The system becomes more valuable as it grows. |

# **10.  Verticals**

## **10.1  Contractors / Trades (active — primary build)**

The vertical documented throughout this reference: four trades (plumbing, HVAC, electrical, roofing), 72-signal architecture, 180-point gap score, Timmins as reference market, Sudbury as canary. Google-reviews benchmark uses years × 4 (Gate 1). This is where all recent build effort has gone.

## **10.2  Family Law (active — separate architecture)**

A distinct, earlier-designed vertical with its own signal set and a Svelte frontend + Node/Express backend. It has been stress-tested to confirm ContentRadar's architecture is vertical-agnostic ("content tells a story, ContentRadar reads it"). Key differences from contractors:

| **Aspect** | **Family Law** |
| --- | --- |
| Signal count / max | 49 gap-score signals, 147-point max (49 × 3). |
| Signal groups | Website (1–11), LinkedIn (12–15), Facebook (16–19), Instagram (20–23), Video (24–26), Community (27–30), Legal Directory (31–35), Citation (36–39), Share of Voice (40–43), Contact Friction (55–60), A2P (44–48, Layer 3), Referral (49–54, Layer 2). |
| Reviews benchmark | years × 2 (vs × 4/×6 for trades) — reflects legal-profession confidentiality constraints on review volume. |
| Cohort 1 (as documented) | 300 benchmark firms, manually reviewed; fixed cohort1Averages.js estimates until real data is built (interim avg 124 pts / 84%). |
| Scoring model (README) | claude-sonnet-4-20250514 (earlier build). Contractors build standardises on claude-sonnet-4-6. |
| Frontend | Svelte (no SvelteKit): AuditTool, SignalGroupsView, BreakdownView, SignalPopup, ReferralSection, A2PSection. Single POST /api/audit endpoint returns one scored JSON object; all API calls server-side. |

| **Two output layers beyond the gap score.  **Both verticals separate: Layer 1 Content Gap Score (in the gap %), Layer 2 Referral Network Score (reported separately, not in gap %), and Layer 3 Content Intelligence (A2P — licensed clients only). A two-meeting onboarding (Meeting 1 discovery; Meeting 2 four-act structure) is part of the product design. |
| --- |

## **10.3  Manufacturing and Tourism (placeholders)**

Named verticals only — no scope, no build. A "Manufacturing variant" and a "Know Your Customer" phase are sketched in the ContentRadar spec but not developed. ContentRadar's four target verticals are ultimately tourism, professional services, manufacturing and trades.

# **11.  Locked constants — master table**

Consolidated from the Session 24 Summary, Cohort 1 Master and code. Do not change any of these without Rory's explicit approval.

| **Constant** | **Value** | **Notes** |
| --- | --- | --- |
| COHORT1_TOTAL_SIZE | 1,200 | 300 per trade × 4 trades. Hard cap. |
| COHORT1_PER_TRADE | 300 | Enforced independently per trade before combining. |
| CANDIDATE_POOL_TOTAL | 4,000 | 1,000 per trade for pre-ranking. |
| GATE1_MIN_RATING | 4.2 stars | Below this = eliminated. |
| GATE1_REVIEWS_PER_YEAR | × 4 | Years × 4 = minimum reviews (fallback 12). |
| GATE1_RECENCY_WINDOW | 180 days | ≥ 1 review in last 6 months. |
| GATE1_RECENCY_MIN_RATING | 3.0 stars | That recent review must be ≥ 3.0. |
| ASPIRATIONAL_TIER | Top 30 per trade | Display only. Not in gap formula. |
| OPERATIONAL_TIER | Top 100 per trade | Used in Content Gap % formula. |
| GAP_SCORE_MAX | 180 | 60 signals × 3. |
| SIGNAL_SCALE | 0, 1, 2, 3 | Four levels, not three. |
| STAGE_WEIGHTS | 25 / 30 / 25 / 20 % | Discovery / Engagement / Conversion / Growth. Locked May 2026. |
| SIGNAL_26_STAGE | Growth | Nextdoor Recommendations, reclassified from Engagement. Locked May 2026. |
| REFRESH_CADENCE | Quarterly + annual | Hash-based quarterly; full annual re-score. |
| GEOGRAPHIC_METRO_CAP | 200 per city | Starting-pool spread cap. |
| GEOGRAPHIC_REGION_CAP | 400 per province/state | Prevents regional concentration. |
| callToPurchaseRate | 0.048 | Engine — locked Session 19. |
| websiteToCallRate | 0.12 | Engine — locked Session 19. |
| winRate | 0.40 | Locked Session 19. |
| LongTailMultiplier | 1.35 | Locked Session 19. |
| positionOneCTR | 0.255 | 0.44 × 0.58. Locked Session 19. |
| ctrGap (not in pack) | 0.225 | Pending LSA / AI adjustments. |
| emergencyAvgSaleValue | $800 | Flat, all trades. Locked Session 19. |
| sudburyHouseholds | 73,000 | Index / watch market. |
| sudburyLocationCode | 1002124 | All DataForSEO watch-market queries. |
| MODEL | claude-sonnet-4-6 | Contractors build (family-law README used claude-sonnet-4-20250514). |
| DB PREFIX | cr_ | All ContentRadar tables in the ClearSky PostgreSQL DB. |

# **12.  Infrastructure, APIs and repository**

## **12.1  Infrastructure**

| **Item** | **Detail** |
| --- | --- |
| VPS | Contabo, IP 66.94.101.213, Ubuntu 24.04 LTS. PostgreSQL + Node.js. (Docs also reference generic Ubuntu 22.04+ / 1GB RAM minimum.) |
| DNS | contentradar.clearskysoftware.net → server (GoDaddy DNS). Active. |
| Repository | Private GitHub under RoryClearSky. 21 committed code files. Structure server/scoring/ + database/contentradar_schema.sql + .env.example + .gitignore (must exclude .env). |
| Process mgmt | PM2 (pm2 start index.js --name clearsky-api; pm2 save && pm2 startup). |
| Web server | Nginx reverse proxy to localhost:3000; Certbot for SSL. |

## **12.2  API accounts (7 of 8 created; Perplexity deferred)**

| **Service** | **Env var** | **Enables** |
| --- | --- | --- |
| Anthropic (Claude) | ANTHROPIC_API_KEY | Method 2 & 3 scoring + weekly content classification. |
| Google Places | GOOGLE_PLACES_API_KEY | GBP signals 11–18. $200/mo free credit. |
| YouTube Data v3 | YOUTUBE_API_KEY | Video signals 44–47. Free quota 10,000 units/day. |
| ValueSERP | VALUESERP_API_KEY | Signals 40, 43, 51–54. |
| Apify | APIFY_API_TOKEN | Facebook, Nextdoor, HomeStars, Houzz, Angi, BBB. |
| OpenAI | OPENAI_API_KEY | ChatGPT — signal 48. |
| Gemini | GEMINI_API_KEY | Gemini — signal 49. |
| Perplexity (deferred) | PERPLEXITY_API_KEY | Perplexity — signal 50 + citation-source detection. |

| **Security.  **All scoring runs server-side; API keys never reach the browser. .env is never committed to git and never shared over an insecure channel. Rate-limit POST /api/audit — each audit costs real credits. |
| --- |

## **12.3  Additional data sources referenced**

DataForSEO (candidate-pool builder + Google Maps + AI Optimization), Firecrawl (scraping), SerpAPI, Wayback Machine CDX API, Meta Ad Library API, Google Transparency Center, PageSpeed Insights, Avvo / Martindale (legal), Data365 + Facebook API (social sentiment), ScrapeCreators (paid-marketing).

# **13.  Build status and remaining items**

## **13.1  Complete**

- Engine 1: 10 scoring files + buildCandidatePool.js, tested in stub mode (72 signals returned, gap score calculated).

- PostgreSQL schema live on the VPS (8 tables, 3 views, 8 ENUMs).

- DNS active; private GitHub repo with 21 files; 7 of 8 API accounts created.

- 60-signal catalogue locked (Signal Master, updated_4). Watch keyword taxonomy locked (174 tags / 518 keywords). PAA architecture locked (Sessions 20–21).

- Cohort 1 replication handoff package (methodology spec + 5-tab Excel). Family Law vertical fully specified.

## **13.2  Remaining — priority for Session 25**

| **Item** | **Priority** | **Unlocks** |
| --- | --- | --- |
| Wire all integrations into signalPipeline.js | High | First end-to-end live score on a real site. |
| Apify schema validation (5 platforms) | High | Reliable Facebook/Nextdoor/HomeStars/Houzz/Angi scores. |
| Method 3 prompt calibration (15 signals) | High | Consistent Claude scoring before Cohort 1 build. |
| cr_content_events table + detection scanner | High | Content intelligence feed (retention driver). |
| cr_signal_snapshots + cr_content_outcomes | High | Attribution layer (T=0 → T+90). |
| LSA + Ad monitoring integration spec | High | Blocks Opportunity Window; may affect ctrGap 0.225. |
| Bucket 2 competitor cohort build | High | Architecture locked; build not started. |
| Bucket 2 channel monitoring pipelines (Phase 2) | High | YouTube, social, forum, blog, FAQ, LSA monitoring. |
| Watch-market keyword pipeline | High | Largest remaining build item (Engine 2 core). |
| Seed file production (518 rows, JSON/SQL) | High | Plumbing + HVAC priority. |
| DataForSEO candidate-pool run | Pre-launch | Developer to run for plumbing first. |
| Cohort 1 scoring run + human review | Pre-launch | Locks 1,200 businesses; produces benchmark averages. |
| ClearSky Layer 4 wiring | Pre-launch | Replace Firecrawl mock with live gap-score endpoint. |
| Meeting 1 intake form (referral network) | Pre-launch | Enables signals 67–72 for Cohort 2. |
| HVAC keyword list (92 kw / 31 tags) | Pre-launch | Same process as plumbing taxonomy. |
| Weekly brief generation | Post-launch | Content + question brief — weekly deliverable. |
| 90-day attribution report | Post-launch | Proof of value at renewal. |
| Signal correlation analysis engine | Post-launch | Ranks signals by observed Map-Pack impact. |
| A2P data connector | Post-launch | Signals 61–66 — closes the loop for Cohort 2. |

# **14.  Working principles and key learnings**

- Correlation vs causation discipline — distinguish signals that correlate with the best operators from those that merely identify digitally sophisticated ones. Attribution claims require honest assessment, not optimistic framing.

- The benchmark moat is the credibility spine — the human-vetted 300-per-trade cohort with drop-and-replace is the core differentiator, not a footnote.

- Trending keywords are confirmation, not forecasting — they confirm genuine market shifts rather than predict them.

- Seasonality is not a differentiator for trades — operators already understand their cycles; deprioritised.

- Sudbury is the canary, not a peer market — the primary leading indicator, not one market among many.

- Cohort separation is strict — Cohort 1 and Cohort 2 are architecturally separate; conflating them is an error.

- Trust verification before delivery — 2–3 weeks of confirmation before any signal reaches a client; every brief carries a confidence rating and supporting evidence.

- ClearSky controls managed presence end-to-end — content-state tracking is a database-state problem, not a website-scraping problem.

- Decision-locking discipline — decisions are locked explicitly and documented before moving on; locked constants are immutable across sessions.

- Honest over optimistic — Rory explicitly prefers honest assessments; challenge-first working style, corrections internalised.

- Handoff-ready deliverables — everything structured for developer handoff with clear build-status indicators and next steps.

- Clean project-folder discipline — extraneous files removed; each session replaces the prior summary rather than accumulating.

- Conceptual grounding before specification — establish the business/philosophical framing before technical detail.

# **15.  Source inventory and version reconciliation**

This document was compiled from the following 25 source files. Where sources disagree, the reconciliation notes state which governs.

| **Source file** | **Role** |
| --- | --- |
| contentradar-session24-summary.docx | AUTHORITATIVE — primary handoff through Session 24. |
| cohort1-master.docx | Cohort 1 complete architecture (10 sections). |
| contentradar_72_signals_updated_4.xlsx | Signal Master — authoritative 72-signal catalogue + rubrics. |
| contentradar_signal_reference_updated_3.xlsx | Integration reference — method, code file, DB table, env vars, costs. |
| contentradar-db-setup.docx | Database setup guide (4 steps, pools, table reference). |
| contentradar-engine1-handoff-todo.docx | Pre-hire developer handoff checklist (API accounts, VPS, repo, test URLs). |
| contentradar-readme-v1_0.docx | Family-law build README (Svelte + Node, 49 signals). Earlier vertical. |
| contentradar-contractors-spec-v1_0.docx | Original contractors spec (signal-by-signal). |
| contentradar-familylaw-spec-v1_0.docx | Family Law vertical spec (49 signals, onboarding). |
| clearsky-contentradar-spec.docx | Engine 2 watch-market spec + manufacturing variant. |
| clearsky-diagnostic-spec.docx / -summary.docx | 11-layer diagnostic engine + benchmark source library. |
| contentradar-cohort1-spec-update.docx | Locked 300-per-trade decision (superseded by master). |
| contentradar-weighting-amendment.docx | Signal 26 reclassification record (superseded). |
| contentradar-session-summary.docx / contentradar-summary.docx | Earlier session + product summaries (superseded). |
| Code: gate1, pageFetcher, scorersMethod1/2/3, valueSerpScorer, apifyScorer, aiPlatformScorer, youtubeScorer, signalPipeline, buildCandidatePool (.js) + contentradar_schema.sql | Engine 1 implementation. |

## **15.1  Version reconciliation notes**

- Cohort 1 size: earlier spec said 300 total; LOCKED to 1,200 (300 per trade). 1,200 governs.

- Stage weights: earlier 25/31.7/25/18.3 → LOCKED 25/30/25/20 after Signal 26 moved to Growth. Latter governs.

- Method counts: variously 18/28/14 and 19/26/15 across sources; treat as ~19 / ~28 / ~15. Code and Session 24 govern.

- Cohort 1 build cost: full-pipeline estimate ~$2,032 (spec-update) vs $130–$370 (master, after 95% Apify reduction). The lower current figure governs; the higher remains valid if Apify is run across all 1,200 rather than deferred.

- Signal numbering differs between the family-law vertical (49 signals) and contractors (72). They are separate architectures — not a conflict.

- Scoring model: family-law README = claude-sonnet-4-20250514; contractors build = claude-sonnet-4-6. Contractors governs current work.

- Diagnostic layers: summarised as both "8" and "11" — 8 revenue layers + 3 infrastructure layers = 11 total.

# **16.  Appendix — code signatures and core formulas**

## **16.1  Key function signatures**

| **File** | **Functions / exports** |
| --- | --- |
| signalPipeline.js | runPipeline(business, options), runBatchPipeline, calculateGapScore(scores), writeScoresToDB, normaliseScore, fetchGBP, manualPlaceholder, fetchApifyPlatform + content heuristics (estimateImageCount, estimateBlogPosts, estimateFAQCount, hasClickToCall, hasEmergencyCTA, hasBookingWidget). |
| gate1.js | runGate1(params), runGate1Batch(businesses); helpers extractDomain, isSubdomain, analyseRecentReviews, detectLocationNav. Exports { runGate1, runGate1Batch, GATE1, FRANCHISE_SIGNALS }. |
| buildCandidatePool.js | buildCandidatePool(options); searchGoogleMaps(keyword, locationCode, country), validateEntryConditions(business, trade), parseBusiness, writeCandidates(dryRun), writeCsv. |

## **16.2  Core formulas**

| Content Gap %  =  totalScore / 180 × 100      (flat sum of in-gap 0–3 scores) Content Gap % (benchmark)  =  client score / (Cohort 1 operational avg × 60) Gate 1 pass  =  rating ≥ 4.2  AND  reviews ≥ years×4  AND  ≥1 review ≤180d rated ≥3.0  AND  not franchise-flagged Diagnostic Total Gap  =  (Σ eight layer gaps) × AI-Risk × Seasonal;  Projected = Current + Total + Capacity Lift Content-gap revenue  =  Σ (monthly searches × pos-1 CTR × conversion × avg sale value × 12 × seasonal) |
| --- |

## **16.3  Session-25 start prompt (from the Session 24 summary)**

| *"**I am Rory Dredhart, founder of ClearSky Software, Timmins Ontario. I am starting a new ContentRadar session. Read all documents in the ContentRadar project folder — specifically the Session 24 summary. Everything there is locked unless I explicitly reopen it. Session 25 picks up at the open items: wire all integrations into signalPipeline.js and run the first end-to-end live score on a real contractor website.**"* |
| --- |

*End of combined master reference · ClearSky Software · ContentRadar **&** Digital Health Diagnostic · Confidential*

ClearSky Software · ContentRadar Combined Master Reference · Confidential · Page