**ContentRadar**

**Contractors ****&**** Trades Vertical**

Signal Architecture & Scoring Specification

Version 1.0  ·  April 2026  ·  Working Document

| **Document Owner** | ClearSky Software |
| --- | --- |
| **Contact** | Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564 |
| **Version** | 1.0 — April 2026 |
| **Classification** | Confidential — Developer Build Brief |
| **Read alongside** | clearsky-diagnostic-spec-v2.4.docx · clearsky-developer-notes-v1.7.docx · contentradar-familylaw-spec-v1.0.docx |
| **Status** | Working document — subject to revision before developer handoff |
| **Vertical** | Contractors & Trades (Plumbing · HVAC · Electrical · Roofing) |

# **Section 1 — What ContentRadar Is**

ContentRadar is a proprietary signal evaluation and benchmarking platform developed by ClearSky Software. It identifies a cohort of best-performing contractors, finds patterns within that cohort, extracts best practices, and compares an individual licensed client against those best practices.

ContentRadar does not calculate revenue. It produces a Content Gap Percentage that feeds directly into ClearSky's Layer 4 (Content Gap) and drives the revenue gap calculation inside the ClearSky Digital Health Diagnostic engine. The revenue translation belongs entirely to ClearSky.

ContentRadar is the only proprietary tool in the ClearSky ecosystem. ContentRadar's signal framework, scoring model, cohort architecture, and learning network are exclusive intellectual property of ClearSky Software.

## **1.1 — Role in the ClearSky Ecosystem**

**Layer 4 — Content Gap (primary data source): **ContentRadar supplies keyword coverage data, content gap lists, top missing keywords, posting cadence actuals, and the brandedSearchPresent flag. Replaces Firecrawl mock.

**brandedSearchPresent — Discovery Signal: **Passes if ContentRadar detects the business name as a tracked keyword with measurable search volume.

## **1.2 — Vertical Isolation**

ContentRadar maintains completely isolated data pools per vertical. Contractor data never influences lawyer benchmarks. This is non-negotiable. Each vertical launched is a new isolated network — fresh cohort, fresh signal configuration, fresh benchmark pool.

## **1.3 — Intent Bucket Architecture**

Every signal carries two tags: Stage (Discovery / Engagement / Conversion / Growth) and Intent Bucket (Emergency / Active Project / Comparison / Research). The gap report shows overall score plus a breakdown by intent bucket — which visitor types a contractor can convert and which they are failing.

| **Intent Bucket** | **Priority** | **Digital Presence Requirement** |
| --- | --- | --- |
| Emergency | 1 — Highest | Click to call above fold, emergency pathway, after-hours signal, response time commitment. Visitor lost in seconds if friction exists. |
| Active Project | 2 | Quote forms, pricing transparency, booking pathway. Visitor is ready — presence must catch them. |
| Comparison | 3 | Review volume and velocity, before/after galleries, warranties, HomeStars and Houzz presence. Visitor evaluating multiple contractors simultaneously. |
| Research | 4 | Blog posts, FAQs, guides, seasonal content, trade education. Visitor will return — only if content was worth remembering. |

Buckets are evaluated in priority order — Emergency first. They are dynamic: a visitor reassigns mid-session if behaviour changes. Any Emergency signal overrides everything else immediately.

# **Section 2 — Cohort Architecture**

| **Cohort** | **Description │ Purpose │ Size │ Data Access** |
| --- | --- |
| Cohort 1 — Benchmark | Best performing contractors Canada and USA │ Establishes best practice benchmark │ 300 businesses │ External signals only |
| Cohort 2 — Licensed Network | Licensed clients with protective markets across Ontario │ Compared against Cohort 1. Roadmap and content intelligence │ 50–100 businesses │ External + A2P internal data |

## **2.1 — Cohort 1 Build Process**

- 2,000 contractors identified across Canada and USA — programmatic identification across all four trades.

- Programmatic analysis runs ContentRadar signal framework against all 2,000 — highest scorers bubble to top.

- Top 300 candidates identified — same scoring model used for licensed clients ensures apples-to-apples comparison.

- Manual review of all 300 — human judgment validates genuine excellence, not gaming of specific signals.

- Cohort 1 locked — maintained over time, declining businesses replaced, new strong performers added.

## **2.2 — Licensed Client Network**

Invitation-only. One contractor per trade per protected market. 100km radius protective market per licensed contractor. Due diligence conducted before any invitation extended — professionalism is the primary filter. ClearSky Software reserves the right to decline any invitation without explanation.

# **Section 3 — Three Layer Output Structure**

| **Layer / Name** | **Signals / Audience / Output** |
| --- | --- |
| 1 — Content Gap Score | Signals 1–60 (excl. A2P) │ Cohort 1 + Licensed client │ Content Gap % → ClearSky Layer 4 |
| 2 — Referral Network Score | Signals 67–72 │ Licensed client only │ Referral health score — reported separately |
| 3 — Content Intelligence | Signals 61–66 (A2P) │ Licensed client only │ Informs roadmap and marketing automation |

## **3.1 — Layer 1: Content Gap Score**

**Content Gap % = Current Score / 180**

Maximum raw score: 60 signals x 3 = 180 points. This percentage feeds directly into ClearSky Layer 4. ClearSky applies stage weighting and capacity adjustments when translating into recoverable revenue. ContentRadar never touches revenue numbers.

## **3.2 — Layer 2: Referral Network Score**

**Referral Network Score = Signals 67–72 total / 18 — reported as a percentage**

## **3.3 — Layer 3: Content Intelligence**

Signals 61–66 are exclusively available to licensed clients through the ClearSky A2P platform. Not comparable to Cohort 1. Not included in gap score. Inform content strategy roadmap and marketing automation configuration — what the market is actually asking, which content converts, seasonal patterns, intent bucket distribution, and call tracking attribution.

# **Section 4 — Scoring Model**

## **4.1 — Scale**

| **Score** | **Meaning** |
| --- | --- |
| 0 | Not present |
| 1 | Present but weak |
| 2 | Present and functional |
| 3 | Best practice |

## **4.2 — Gap Score Signal Distribution**

| **Stage │ Signals │ Max Points │ % of Total** | **Notes** |
| --- | --- |
| Discovery │ 15 │ 45 │ 25.0% | Getting found |
| Engagement │ 19 │ 57 │ 31.7% | Holding attention |
| Conversion │ 15 │ 45 │ 25.0% | Turning visitors into booked jobs |
| Growth │ 11 │ 33 │ 18.3% | Building long term digital equity |
| TOTAL │ 60 │ 180 │ 100% | Content Gap % = Score / 180 |

## **4.3 — Trade-Aware Scoring**

One universal signal set with trade-aware scoring criteria. All contractors score the same 60 signals. Where a signal varies by trade — seasonal timing, association membership, certification type, emergency urgency — the scoring criteria reference the correct trade. Trade type is passed from the ClearSky engine input at the time of diagnostic.

# **Section 5 — Signal Universe Summary**

| **Category** | **Signals** | **Gap Score** | **Outside Gap** | **Signal #s** |
| --- | --- | --- | --- | --- |
| 1 — Website | 10 | 10 | — | 1–10 |
| 2 — Google Business Profile | 8 | 8 | — | 11–18 |
| 3 — Facebook | 6 | 6 | — | 19–24 |
| 4 — Nextdoor | 3 | 3 | — | 25–27 |
| 5 — Reviews and Reputation | 5 | 5 | — | 28–32 |
| 6 — Trades Directory | 4 | 4 | — | 33–36 |
| 7 — Citation and NAP | 3 | 3 | — | 37–39 |
| 8 — Seasonal and Geographic | 4 | 4 | — | 40–43 |
| 9 — Video | 4 | 4 | — | 44–47 |
| 10 — AI Authority | 3 | 3 | — | 48–50 |
| 11 — Share of Voice | 4 | 4 | — | 51–54 |
| 12 — Contact Friction | 6 | 6 | — | 55–60 |
| 13 — A2P Content Intelligence | 6 | — | 6 | 61–66 |
| 14 — Referral Network | 6 | — | 6 | 67–72 |
| **TOTAL** | **72** | **60** | **12** |  |

*Signal table key: Stage = journey stage. Intent = primary intent bucket served. Source = data source ContentRadar uses to score. 0–3 = scoring criteria per level. Trade note = where criteria vary by trade.*

# **Section 6 — Signal Universe**

## **6.1 — Website Signals (1–10)**

The website is the hub. For contractors it must convert all four intent buckets, often on mobile, often under time pressure. Trust dimensions for contractors: competence, reliability, local roots, and personality.

**Signal 1 — Value Proposition Clarity**   Stage: Discovery   |   Intent: Research / Comparison

**Source: ***Website homepage — NLP*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Trade not identifiable within 5 seconds. Generic contractor or home services language only. Location absent from headline area. |
| **1 — Weak** | Trade visible but requires reading beyond headline. Location present somewhere on page. No differentiation stated. |
| **2 — Functional** | Trade, location, and service type clear above the fold. Some differentiation present but generic — family owned, free estimates, serving the area. |
| **3 — Best Practice** | Within 5 seconds: what trade, what area, who they serve, and what makes them different. Specific and credible. Emergency availability or years in business present in headline area where relevant to trade. |

**Signal 2 — Brand Promise and Trust Statement**   Stage: Discovery   |   Intent: Comparison

**Source: ***Website homepage + about page — NLP*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No articulated promise. Generic taglines only — quality work, great service, call us today. |
| **1 — Weak** | Promise exists but vague. Licensed and insured mentioned without specificity. No accountable commitment. |
| **2 — Functional** | Clear trust statement with some specificity. Licensed, insured, WSIB confirmed. Satisfaction referenced. Not fully ownable. |
| **3 — Best Practice** | Specific accountable promise. Commitments concrete — response time, workmanship guarantee, clean jobsite, no surprise pricing. Promise ownable and consistent across all pages. |

**Signal 3 — People and Credibility**   Stage: Discovery   |   Intent: Comparison

**Source: ***Website team and about pages — NLP*

**Trade note: ***Trust dimensions: competence, reliability, local roots, personality.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No team page. Stock photography or logo only. No human presence on the website. |
| **1 — Weak** | Owner name and photo present but bio is a credential list only. No personal narrative. One or two trust dimensions at most. |
| **2 — Functional** | Real photo, bio covers credentials plus personal context. Local roots or personality comes through. At least two of four trust dimensions present. |
| **3 — Best Practice** | Owner and key team members visible. Every person: real photo, bio hitting all four dimensions — competence, reliability, local roots, personality. Personal narrative present. Visitor would let them into their home. |

**Signal 4 — Process Transparency**   Stage: Discovery   |   Intent: Research

**Source: ***Website process and service pages — NLP*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No process information anywhere. Visitor has no idea what happens when they call. |
| **1 — Weak** | Some process info exists but buried or generic. Not firm-specific. Does not reduce anxiety. |
| **2 — Functional** | Clear process outlined. Steps visible — call, assessment, quote, work, follow-up. Clinical rather than reassuring. |
| **3 — Best Practice** | Fully demystified. Step by step from first call through job completion. Plain language. Written to reduce anxiety. Trade-specific — an HVAC install process reads differently than an emergency plumbing call. |

**Signal 5 — Service Area Clarity**   Stage: Discovery   |   Intent: Research / Active Project

**Source: ***Website homepage, footer, service pages — geo crawl*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No service area stated. Visitor cannot determine if this contractor serves their location. |
| **1 — Weak** | Vague geographic reference only — serving the area, local contractor. No specific cities or towns named. |
| **2 — Functional** | Primary city or region named. Some surrounding areas mentioned. Coverage clear for main market but incomplete for surrounding communities. |
| **3 — Best Practice** | Full service area explicitly named — cities, towns, and communities within protected market radius. Service area page or map present. Visitor in any part of protected market can confirm coverage immediately. |

**Signal 6 — Emergency Availability Signal**   Stage: Discovery   |   Intent: Emergency

**Source: ***Website homepage, header, service pages — NLP + mobile crawl*

**Trade note: ***Emergency availability is primary for plumbing and HVAC. Secondary for electrical. Less relevant for roofing — scoring criteria reflect this. Trade passed from engine input.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No emergency availability signalled anywhere. Visitor in crisis has no visible path. Business appears unavailable outside office hours. |
| **1 — Weak** | Emergency or after-hours mentioned somewhere but not prominent. Requires hunting. No response time commitment. Mobile experience does not prioritise it. |
| **2 — Functional** | Emergency availability visible on homepage. Phone number clickable. After-hours coverage stated. Response time vague — available 24/7 without specific commitment. |
| **3 — Best Practice** | Emergency signal prominent above the fold on homepage and all key service pages. Click to call immediate. Specific response time commitment stated. For plumbing and HVAC: emergency page with trade-specific urgency language. For electrical: safety-first framing. For roofing: storm damage response with insurance claim pathway. |

**Signal 7 — Before and After Gallery**   Stage: Engagement   |   Intent: Comparison

**Source: ***Website crawl — image detection and volume*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No project photos anywhere. Stock imagery only or no imagery at all. |
| **1 — Weak** | A few photos present but low quality, unorganised, or stock. No before and after structure. |
| **2 — Functional** | Genuine project photos present. Some before and after pairs. Reasonable quality. Organised by project type. Demonstrates real work but limited volume. |
| **3 — Best Practice** | Substantial before and after gallery organised by service type and trade. High quality real photography. Captions describe the problem, solution, and outcome. Updated regularly. Trade-specific. |

**Signal 8 — FAQ Coverage**   Stage: Engagement   |   Intent: Research

**Source: ***Website crawl — NLP vs actual search intent*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No FAQ section anywhere on website. |
| **1 — Weak** | FAQ exists but questions are firm-centric. Not matching real search intent. Brief or unhelpful answers. |
| **2 — Functional** | 10–20 genuine client questions. Plain language. Primary trade topics covered. Some seasonal content. |
| **3 — Best Practice** | 30+ questions matching real search intent for the trade. Thorough plain language answers. Seasonal questions present. Trade-specific questions addressed — cost ranges, timelines, permit requirements. Feeds Google and AI visibility. Updated from A2P inquiry data. |

**Signal 9 — Pricing Transparency**   Stage: Conversion   |   Intent: Active Project

**Source: ***Website crawl — NLP pricing language detection*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No pricing information anywhere. No mention of estimates, service call fees, or how pricing works. |
| **1 — Weak** | Vague pricing reference only — competitive pricing, affordable rates, call for a quote. No specificity. |
| **2 — Functional** | Estimate process explained. Service call fee referenced. Some indication of price ranges. Financing mentioned if offered. |
| **3 — Best Practice** | Clear pricing philosophy stated. Service call or diagnostic fee named. Price ranges present where appropriate. Estimate process fully explained. Financing options visible if offered. No surprise pricing commitment. Trade-specific price ranges. |

**Signal 10 — Credentials Display**   Stage: Discovery   |   Intent: Comparison / Emergency

**Source: ***Website crawl — credential detection across homepage, footer, about, service pages*

**Trade note: ***Plumbing: Master Plumber licence, WSIB, liability insurance. HVAC: TSSA certification, HRAI membership, manufacturer certifications, WSIB, liability insurance. Electrical: ESA licence, ECRA/ESA contractor licence, WSIB, liability insurance. Roofing: CRCA membership, manufacturer certifications (IKO, GAF), WSIB, liability insurance.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No credentials, licences, or insurance information visible anywhere on website. |
| **1 — Weak** | Licensed and insured mentioned in text only. No specific credential names, numbers, or logos. No WSIB mention. |
| **2 — Functional** | Core trade credentials named and visible. WSIB confirmed. Liability insurance stated. Credential logos present on at least one page. |
| **3 — Best Practice** | All relevant trade credentials named, numbered where applicable, and displayed with logos across homepage, footer, and key service pages. WSIB clearance referenced. Trade association membership visible. Manufacturer certifications displayed where held. Visitor in Emergency intent can confirm legitimacy immediately. |

## **6.2 — Google Business Profile Signals (11–18)**

GBP is a primary discovery and conversion tool for contractors — often the first and only thing a prospect sees before calling. GBP review data feeds the Brand Equity Index in ClearSky Layer 11 via the tenure-adjusted benchmark (yearsInBusiness × 6).

**Signal 11 — GBP Completeness**   Stage: Discovery   |   Intent: Research / Comparison

**Source: ***Google Places API — Layer 1 ClearSky feed*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Profile unclaimed or effectively empty. Business name only. No category, no description, no hours, no services. |
| **1 — Weak** | Claimed but incomplete. Primary category set. Basic hours present. Description missing or auto-generated. Service list absent or minimal. |
| **2 — Functional** | Core fields complete — primary and secondary categories set, description written, hours accurate. Service list partially populated. NAP consistent with website. |
| **3 — Best Practice** | Fully optimised. Primary and secondary categories precisely matched. Description keyword-rich and client-facing. Hours complete including holiday hours. Full service list with descriptions. All relevant attributes configured. NAP perfectly consistent. |

**Signal 12 — GBP Photo Volume and Quality**   Stage: Engagement   |   Intent: Comparison

**Source: ***Google Places API — photo count and recency*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No photos on profile or stock imagery only. |
| **1 — Weak** | Fewer than 10 photos. Low quality or poorly representative. No recent uploads. |
| **2 — Functional** | 10–25 photos. Genuine project work visible. Team or owner photo present. Reasonably current. Cover photo and logo configured. |
| **3 — Best Practice** | 25+ photos consistently maintained. High quality real project photography across categories. Trade-specific. New photos added regularly. Owner or team visible. |

**Signal 13 — GBP Review Score and Velocity**   Stage: Engagement   |   Intent: Comparison

**Source: ***Google Places API — Layer 1 ClearSky feed. Tenure benchmark: yearsInBusiness × 6*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No reviews. Profile unclaimed or empty. No rating visible. |
| **1 — Weak** | Below 50% of tenure-adjusted benchmark. Rating below 4.0. Last review 6+ months ago. |
| **2 — Functional** | 50–80% of tenure-adjusted benchmark. Rating 4.0–4.5. At least one review in past 90 days. Positive velocity evident. |
| **3 — Best Practice** | At or above tenure-adjusted benchmark. Rating 4.5 or above. Consistent velocity — multiple reviews per month. Sentiment mirrors brand promise. |

**Signal 14 — GBP Review Response Behaviour**   Stage: Engagement   |   Intent: Comparison

**Source: ***Google Places API — response rate and recency*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No reviews responded to. All reviews unanswered regardless of sentiment. |
| **1 — Weak** | Some responses but inconsistent. Negative reviews ignored or handled defensively. Response time measured in weeks. |
| **2 — Functional** | Responds to most reviews within 7 days. Positive reviews acknowledged personally. Negative reviews addressed professionally. |
| **3 — Best Practice** | Every review responded to within 48 hours. Responses personal and specific — references the job, outcome, client situation. Negative reviews handled with professionalism, accountability, and resolution offer. |

**Signal 15 — GBP Posts and Updates**   Stage: Engagement   |   Intent: Research / Comparison

**Source: ***Google Places API — post frequency and recency*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No posts ever published. Profile static since claimed. |
| **1 — Weak** | One or two old posts. No consistent cadence. Promotional only. No community or educational value. |
| **2 — Functional** | Monthly minimum posting. Mix of promotional and informational content. Some seasonal relevance. Cadence inconsistent but pattern visible. |
| **3 — Best Practice** | Weekly minimum. Deliberate content mix — seasonal tips, completed project highlights, offers, emergency reminders, trade education. Posts timed to demand peaks. |

**Signal 16 — GBP Services and Products**   Stage: Discovery   |   Intent: Active Project

**Source: ***Google Places API — service list completeness and descriptions*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No services listed. Profile gives no indication of what the contractor actually does. |
| **1 — Weak** | A few services listed with no descriptions. Generic service names only. |
| **2 — Functional** | Core services listed with basic descriptions. Primary trade services represented. Some specificity. |
| **3 — Best Practice** | Comprehensive service list covering all trade offerings with descriptive text. Trade-specific depth. Descriptions written in client language. Consistent with website service pages. |

**Signal 17 — GBP Q****&****A**   Stage: Engagement   |   Intent: Research

**Source: ***Google Places API — Q**&**A presence and response rate*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No Q&A activity. Questions from the public unanswered. Business has never seeded or monitored the section. |
| **1 — Weak** | A few questions present — public-generated and unanswered or poorly answered. |
| **2 — Functional** | Business has seeded at least 5 questions and answers. Public questions answered within reasonable time. Core trade questions covered. |
| **3 — Best Practice** | Q&A actively managed and seeded with 10+ high-value questions matching real search intent. All public questions answered promptly. Trade-specific concerns addressed. Section functions as secondary FAQ feeding AI visibility. |

**Signal 18 — GBP Contact and Conversion Features**   Stage: Conversion   |   Intent: Emergency / Active Project

**Source: ***Google Places API — feature detection*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No contact or conversion features configured. Messaging disabled. No booking button. No quote request capability. |
| **1 — Weak** | One feature enabled but not optimised. Messaging on but slow to respond. No booking or quote configured. |
| **2 — Functional** | Two features active. Messaging enabled with automated acknowledgement. Get a quote or booking button configured. |
| **3 — Best Practice** | All three features active and optimised — messaging with instant acknowledgement and response time commitment, get a quote monitored, booking button linked to live scheduling. Emergency-intent visitors can initiate contact directly from GBP without visiting website. Integrated with A2P platform where licensed client. |

## **6.3 — Facebook Signals (19–24)**

Facebook is primary for contractors. This is where trades businesses live in their community, where word of mouth amplifies, and where Comparison and Research intent visitors spend time evaluating before they call.

**Signal 19 — Facebook Page Completeness**   Stage: Discovery   |   Intent: Research / Comparison

**Source: ***Facebook Graph API — page completeness audit*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No Facebook page exists or page is unclaimed. Business has no Facebook presence. |
| **1 — Weak** | Page exists but incomplete. Inconsistent branding. Missing business information. No CTA button configured. |
| **2 — Functional** | Claimed and reasonably complete. Consistent branding with website. Core business information accurate. CTA button configured. About section populated. |
| **3 — Best Practice** | Fully optimised. Visual identity consistent across all content. All business information complete and accurate. CTA button linked to highest-converting destination. NAP perfectly consistent with GBP and website. |

**Signal 20 — Facebook Content and Community Voice**   Stage: Engagement   |   Intent: Research / Comparison

**Source: ***Facebook Graph API — post frequency, content type, NLP tone, group activity monitoring*

**Trade note: ***Includes participation in local Facebook community groups. Value-first contributions — never promotional in group context.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No content published. Silent page. No group participation visible. |
| **1 — Weak** | Occasional posts — fewer than twice monthly. Promotional only. No community voice. No group participation. |
| **2 — Functional** | Weekly minimum posting. Mix of promotional and community content. Accessible language. Some seasonal relevance. Occasional genuine group participation. |
| **3 — Best Practice** | Multiple times weekly. Community-first content strategy — project highlights, seasonal tips, community involvement, trade education, team moments. Active participant in local Facebook groups — genuine value, never promotional in group context. Content drives organic reach beyond follower base. |

**Signal 21 — Facebook Engagement and Response Rate**   Stage: Engagement   |   Intent: Comparison

**Source: ***Facebook Graph API — engagement rate, response rate, response time, sentiment*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No engagement. Comments and messages unanswered. |
| **1 — Weak** | Some engagement but inconsistent. Firm rarely responds. Messages unanswered for days. Below 1% engagement rate. |
| **2 — Functional** | Responds to most comments and messages within 24 hours. 1–3% engagement rate. Mostly positive sentiment. |
| **3 — Best Practice** | Responds to every comment and message within hours. Above 3% engagement rate. Personal and conversational. Trade advice given freely. After-hours messages acknowledged with response time expectation set. |

**Signal 22 — Facebook Reviews and Recommendations**   Stage: Engagement   |   Intent: Comparison

**Source: ***Facebook Graph API — recommendation count, rating, sentiment, response rate*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No recommendations on page. Reviews disabled or empty. |
| **1 — Weak** | Fewer than 5 recommendations. Generic and brief. No responses from business. |
| **2 — Functional** | 5–15 recommendations. Some describe specific work or trade service. Business responds to some. Overall positive sentiment. |
| **3 — Best Practice** | 15+ recommendations with consistent velocity. Detailed recommendations referencing specific jobs, technician names, response time, and work quality. Sentiment mirrors brand promise. Business responds to every recommendation personally. |

**Signal 23 — Facebook Events**   Stage: Engagement   |   Intent: Research

**Source: ***Facebook Graph API — event presence, frequency, type, attendance signals*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No events created or promoted. |
| **1 — Weak** | One or two old or poorly described events. Promotional not community value. No attendance signals. |
| **2 — Functional** | Quarterly events minimum. Mix of educational and promotional. Good descriptions. Some attendance interest. Seasonal relevance present. |
| **3 — Best Practice** | Regular events cadence — minimum quarterly, ideally monthly in peak seasons. Events serve community value first. Post-event content published. Strong attendance signals. Events timed to seasonal demand peaks and trade-specific calendar. |

**Signal 24 — Facebook Video and Reels**   Stage: Engagement   |   Intent: Research / Comparison

**Source: ***Facebook Graph API — video presence, frequency, view counts, engagement*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No video content on Facebook page. Static content only. |
| **1 — Weak** | One or two old or poorly produced videos. Not adapted for Facebook format. Low view counts. |
| **2 — Functional** | Twice monthly minimum. Genuine trade content. Reasonable production quality. Above average engagement for page size. |
| **3 — Best Practice** | Weekly minimum. Purpose-built for Facebook — short, mobile-optimised, first 3 seconds designed to stop the scroll. Content mix spans trade education, project reveals, team personality, seasonal tips. Authentic. Driving reach beyond follower base. |

## **6.4 — Nextdoor Signals (25–27)**

Nextdoor has no equivalent in the family law spec. For trades businesses in smaller markets like Timmins, Nextdoor is where the most trusted word-of-mouth happens. A neighbour recommending the same contractor to three people asking is a conversion event no paid campaign can replicate.

**Signal 25 — Nextdoor Business Page Presence**   Stage: Discovery   |   Intent: Research / Comparison

**Source: ***Nextdoor Business API — page completeness audit*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No Nextdoor business page. Contractor has no presence. Any community mentions are unmanaged. |
| **1 — Weak** | Page exists but unclaimed or incomplete. Business information missing or inaccurate. No service area configured. |
| **2 — Functional** | Claimed and reasonably complete. Core business information accurate. Branding consistent with GBP and website. Connected to primary service neighbourhoods. |
| **3 — Best Practice** | Fully optimised. Complete business information. Service area configured to match protected market geography. Visual identity consistent across all platforms. About section warm, local, approachable. Connected to all relevant neighbourhood communities. Business actively monitors and responds to mentions. |

**Signal 26 — Nextdoor Recommendations**   Stage: Engagement   |   Intent: Comparison

**Source: ***Nextdoor Business API — recommendation count, recency, sentiment*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No recommendations on Nextdoor page. No social proof visible on platform. |
| **1 — Weak** | Fewer than 5 recommendations. Brief and generic. Business does not respond. |
| **2 — Functional** | 5–15 recommendations. Some detail visible — references specific job type, response time, or technician. Business responds to some. |
| **3 — Best Practice** | 15+ recommendations with consistent velocity. Detailed recommendations referencing specific trade work, reliability, cleanliness, and value. Neighbours tagging the business proactively. Business responds to every recommendation personally and promptly. |

**Signal 27 — Nextdoor Community Visibility**   Stage: Growth   |   Intent: Comparison

**Source: ***Nextdoor monitoring — organic mention tracking across neighbourhood posts and recommendation threads*

**Trade note: ***Measures unprompted organic mentions. Distinct from Brand Equity Index pass/fail threshold in ClearSky Layer 11 — no double counting.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No organic mentions in any neighbourhood community. Invisible on Nextdoor outside own page. |
| **1 — Weak** | One or two isolated mentions in past 90 days. Passive — tagged by an existing customer without detail. |
| **2 — Functional** | Regular organic mentions across at least two neighbourhood communities. Business named in response to trade-specific recommendation requests. |
| **3 — Best Practice** | Dominant organic presence across all neighbourhood communities in protected market. Business is the automatic first recommendation when neighbours ask for the trade. Unprompted mentions feeding branded search and brandedSearchPresent signal. |

## **6.5 — Reviews and Reputation Signals (28–32)**

Third-party platform reviews only — HomeStars, Houzz, Angi, and aggregate reputation signals. This category measures whether the contractor has presence and review velocity on the platforms Comparison-intent visitors use when specifically shopping for a contractor.

**Signal 28 — HomeStars Presence and Score**   Stage: Engagement   |   Intent: Comparison

**Source: ***HomeStars programmatic monitoring — profile completeness, Star Score, review volume, recency, response rate*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No HomeStars profile. Contractor absent from Canada's primary trades review platform. |
| **1 — Weak** | Profile exists but unclaimed or auto-generated. Incomplete. No photos. No responses. Star Score below 7. Review volume minimal or stale. |
| **2 — Functional** | Claimed profile with core information complete. Star Score 7 to 8.5. Review volume present and reasonably current. Business responds to some reviews. |
| **3 — Best Practice** | Fully optimised claimed profile. Star Score 8.5 or above. Review volume at or above tenure-adjusted benchmark. Consistent velocity. Business responds to every review personally and promptly. Project portfolio populated. Best of HomeStars designation where achieved. |

**Signal 29 — Houzz Presence and Reviews**   Stage: Engagement   |   Intent: Comparison

**Source: ***Houzz programmatic monitoring — profile completeness, review volume, project portfolio*

**Trade note: ***Most relevant for electricians and plumbers doing renovation and finish work, and HVAC on new builds. Scoring expectations calibrated lower for roofing.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No Houzz profile. Contractor absent from platform. |
| **1 — Weak** | Profile exists but unclaimed or minimal. No project portfolio. No reviews. |
| **2 — Functional** | Claimed profile with basic information complete. Some project photos. A few reviews. Trade category accurate. |
| **3 — Best Practice** | Fully optimised profile. Substantial project portfolio with high quality photos and descriptions. Review volume consistent with platform benchmark for trade. Houzz badge or recognition where achieved. |

**Signal 30 — Angi Presence and Reviews**   Stage: Engagement   |   Intent: Comparison

**Source: ***Angi programmatic monitoring — profile completeness, review volume, certification status*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No Angi profile. Contractor absent from platform. |
| **1 — Weak** | Profile exists but unclaimed or incomplete. No reviews. Angi certification not pursued. |
| **2 — Functional** | Claimed profile with core information complete. Some reviews present and reasonably current. Angi certification in progress or achieved. |
| **3 — Best Practice** | Fully optimised claimed profile. Angi certified or Super Service Award where applicable. Review volume consistent with platform benchmark. Consistent velocity. Business responds to reviews. |

**Signal 31 — Aggregate Review Footprint**   Stage: Growth   |   Intent: Comparison

**Source: ***Programmatic monitoring across all review platforms — GBP, HomeStars, Houzz, Angi, Facebook, Nextdoor*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Reviews concentrated on a single platform only or absent entirely. No meaningful cross-platform review presence. |
| **1 — Weak** | Reviews present on two platforms. One platform dominant. Total cross-platform volume below tenure-adjusted benchmark. |
| **2 — Functional** | Reviews present across three to four platforms. No single platform overwhelmingly dominant. Total cross-platform volume approaching tenure-adjusted benchmark. |
| **3 — Best Practice** | Reviews present across five or more platforms with meaningful volume on each. Total at or above tenure-adjusted benchmark. Consistent velocity across platforms. Breadth reinforcing legitimacy to AI platforms — multiple independent sources citing the same contractor signals authority. |

**Signal 32 — Review Sentiment Consistency**   Stage: Growth   |   Intent: Comparison

**Source: ***NLP sentiment analysis across all review platforms — GBP, HomeStars, Houzz, Angi, Facebook, Nextdoor*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No reviews or severe sentiment inconsistency across platforms. Trust narrative contradicts itself. |
| **1 — Weak** | Generally positive but inconsistent trust narrative. Recurring negative themes on some platforms not present on others. |
| **2 — Functional** | Consistent positive sentiment across most platforms. Recurring themes align with brand promise on primary platforms. |
| **3 — Best Practice** | Consistent positive sentiment narrative across all platforms. Recurring themes mirror brand promise precisely — competent, reliable, local, personable. Sentiment consistency contributing to AI authority — multiple platforms telling the same trust story. |

## **6.6 — Trades Directory Signals (33–36)**

Trades directories signal legitimacy, safety, and consumer protection. A contractor listed and verified on the right directories is one a homeowner can trust in their house.

**Signal 33 — Tier 1 Trades Directory Presence**   Stage: Discovery   |   Intent: Comparison

**Source: ***Programmatic monitoring — HomeAdvisor, Houzz Pro, Angi Pro, municipal business registries, regional home builder association directories*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Not listed in any Tier 1 trades directory. Absent from all primary consumer-facing legitimacy platforms. |
| **1 — Weak** | Listed in one or two but unclaimed or auto-generated. No photos, no service descriptions. NAP inconsistency present. |
| **2 — Functional** | Claimed profiles in two to three Tier 1 directories. Core information accurate and consistent. Basic content present. NAP reasonably consistent. |
| **3 — Best Practice** | Claimed, complete, and actively maintained across all relevant Tier 1 directories. Full service descriptions, real project photos, accurate service area. NAP perfectly consistent. Regional home builder association listed where contractor does new construction or renovation work. |

**Signal 34 — Trade Association Directory Presence**   Stage: Discovery   |   Intent: Comparison / Emergency

**Source: ***Programmatic monitoring — HRAI, ECRA/ESA contractor registry, PHCC, CRCA member directories*

**Trade note: ***HVAC: HRAI. Electrical: ECRA/ESA. Plumbing: PHCC. Roofing: CRCA.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Not listed in any trade association directory. Absent from the directories consumers and insurance companies use to verify legitimacy. |
| **1 — Weak** | Listed in primary trade association directory but profile incomplete or unclaimed. Membership not prominently featured on website or GBP. |
| **2 — Functional** | Active membership with complete directory listing. Membership badge or logo displayed on website. Membership current and verifiable. |
| **3 — Best Practice** | Active membership with fully optimised directory listing. Membership prominently displayed across website, GBP, and all directory profiles. Additional relevant association memberships where applicable. Association standing featured in brand promise. |

**Signal 35 — BBB Accreditation and Rating**   Stage: Discovery   |   Intent: Comparison

**Source: ***BBB programmatic monitoring — accreditation status, rating, complaint history, response record*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No BBB profile. Contractor absent from BBB entirely. |
| **1 — Weak** | BBB profile exists but not accredited. Rating below A. Complaint history present and unresolved or poorly resolved. |
| **2 — Functional** | BBB profile present. Rating A or above. Accreditation in progress or achieved. Complaints resolved professionally. |
| **3 — Best Practice** | BBB accredited with A or A+ rating. Zero unresolved complaints. Complaint resolution record demonstrates professionalism. BBB accreditation badge displayed on website and GBP. Accreditation featured as part of brand trust statement. |

**Signal 36 — NAP Consistency Across Directories**   Stage: Discovery   |   Intent: Research

**Source: ***Automated NAP audit across all directories, social platforms, website, and GBP*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No consistent NAP detectable. Multiple conflicting name, address, and phone variations across platforms. |
| **1 — Weak** | Widespread inconsistency across directories. Multiple name variations. Address and phone format conflicts. |
| **2 — Functional** | Reasonably consistent across claimed and actively managed listings. Some variations in unclaimed listings. Primary platforms consistent. |
| **3 — Best Practice** | Perfect NAP consistency across every directory, social platform, website, and GBP profile — claimed and unclaimed. Audit conducted regularly. NAP consistency reinforcing citation authority, search ranking, and AI platform recognition. |

## **6.7 — Citation and NAP Signals (37–39)**

This category covers breadth and authority of third party citations pointing to the contractor — independent of review platforms and directories already scored.

**Signal 37 — Citation Volume and Trajectory**   Stage: Growth   |   Intent: Comparison

**Source: ***Programmatic web monitoring — citation tracking across all third party source types excluding review platforms and directories already scored*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No third party citations anywhere. Contractor exists only on own channels. Invisible to AI platforms assembling contractor recommendations. |
| **1 — Weak** | Fewer than 10 citations. Directory listings only — not genuine third party mentions. No diversity of source type. Flat or no trajectory. |
| **2 — Functional** | 10–30 genuine citations across multiple source types. Positive trajectory. Source diversity present. Contributing to search ranking and beginning to influence AI visibility. |
| **3 — Best Practice** | 30+ genuine citations across high authority and diverse sources. Consistently growing trajectory. Source mix spans local media, supplier websites, community platforms, trade publications. Contributing directly to search ranking, AI platform recognition, and brandedSearchPresent signal. |

**Signal 38 — Local Media and Community Citations**   Stage: Growth   |   Intent: Research / Comparison

**Source: ***Google News API, local media monitoring, community website crawl — Timmins Press, Northern Ontario news outlets, community platforms*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No local media or community citations anywhere. Never mentioned in local news or community websites outside paid placements. |
| **1 — Weak** | One or two isolated mentions — directory listings in local business features or paid advertorial placements. Not genuine editorial citations. |
| **2 — Functional** | Genuine citations in local or regional media. Quoted or featured in at least one local publication. Community website mentions present. |
| **3 — Best Practice** | Regular citations across multiple local and regional media outlets and community platforms. Go-to contractor source for trade-related local stories. Contributing directly to AI visibility. |

**Signal 39 — Supplier and Manufacturer Citations**   Stage: Growth   |   Intent: Comparison / Emergency

**Source: ***Programmatic monitoring — manufacturer and supplier dealer locator pages, certified installer directories, authorised service provider listings*

**Trade note: ***HVAC: Carrier Premier Dealer, Lennox Dealer, Trane Comfort Specialist. Roofing: GAF Master Elite, IKO Shield Pro, CertainTeed ShingleMaster. Electrical: Square D authorised installer, Generac authorised dealer. Plumbing: Bradford White preferred contractor, Navien authorised dealer.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Not listed on any manufacturer or supplier website. No certified dealer or authorised service provider status on any platform. |
| **1 — Weak** | Listed in one manufacturer or supplier dealer locator but profile incomplete. Not prominently featured on own digital presence. |
| **2 — Functional** | Active listing on one to two manufacturer or supplier platforms. Certification or dealer status displayed on website and GBP. |
| **3 — Best Practice** | Active and fully optimised listings across all relevant manufacturer and supplier platforms. Certification badges prominently displayed across website, GBP, and directory profiles. Manufacturer citations contributing to third party authority signal. Emergency-intent visitor can verify authorised service status immediately. |

## **6.8 — Seasonal and Geographic Signals (40–43)**

No equivalent in family law. The Seasonal Multiplier in the ClearSky revenue formula reflects demand peaks by trade. ContentRadar measures whether the contractor's digital presence is aligned to capture that demand when it peaks.

| **Trade** | **Primary Seasonal Demand Peaks** |
| --- | --- |
| HVAC | AC tune-up April–May │ Furnace season September–October │ Emergency freeze calls December–February |
| Roofing | Spring inspection April–May │ Storm damage response June–August │ Pre-winter assessment September |
| Plumbing | Spring thaw March–April │ Outdoor plumbing activation May │ Freeze prevention November–December |
| Electrical | Renovation season April–September │ Generator demand October–November │ Holiday lighting November–December |

**Signal 40 — Seasonal Content Alignment**   Stage: Growth   |   Intent: Research / Active Project

**Source: ***Website crawl, GBP post monitoring, Facebook and social content monitoring — NLP seasonal keyword detection and content calendar analysis*

**Trade note: ***Trade-specific demand peaks noted in table above.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No seasonal content anywhere. Website, GBP, and social presence static year-round. Invisible when demand peaks and competitors are capturing all available intent. |
| **1 — Weak** | Occasional seasonal reference but no deliberate strategy. Content appears after the demand peak rather than before it. Misses the research and comparison window. |
| **2 — Functional** | Seasonal content present across at least two channels. Timed reasonably to demand peaks. Trade-specific seasonal topics covered for primary season. Some gaps in secondary windows. |
| **3 — Best Practice** | Deliberate seasonal content strategy executed across all channels. Content appears 2–4 weeks before seasonal demand peaks to capture Research and Comparison intent. Full trade-specific seasonal calendar covered. Website has evergreen seasonal pages ranking year-round. GBP posts timed to seasonal search spikes. Seasonal content feeding AI visibility for seasonal trade queries in protected market. |

**Signal 41 — Seasonal Offer and Campaign Visibility**   Stage: Conversion   |   Intent: Active Project

**Source: ***Website crawl, GBP offer posts, Facebook content monitoring — offer detection and seasonal timing analysis*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No seasonal offers or campaigns anywhere. No tune-up specials, inspection packages, maintenance programs, or seasonal promotions visible. |
| **1 — Weak** | One or two isolated offers. Not timed deliberately to demand peaks. Offers on one channel only. No maintenance program visible. |
| **2 — Functional** | Seasonal offers present across at least two channels timed reasonably to demand peaks. Core trade seasonal promotions covered. Maintenance program referenced if offered. |
| **3 — Best Practice** | Comprehensive seasonal offer and campaign strategy visible across all channels. Offers timed precisely to demand peaks and promoted 2–4 weeks in advance. Trade-specific seasonal packages clearly described. Maintenance program prominently featured. Campaign visibility contributing to conversion rate during peak demand windows when marketing automation is driving highest traffic volume. |

**Signal 42 — Service Area Content Coverage**   Stage: Discovery   |   Intent: Research / Active Project

**Source: ***Website crawl — geo-specific page detection, GBP service area configuration, social content geo-tagging analysis*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No service area content beyond primary city. Communities within protected market find no content addressing them specifically. |
| **1 — Weak** | Primary city well covered. One or two surrounding communities named but no dedicated content. Service area page lists town names only. |
| **2 — Functional** | Service area page present with communities named and described. GBP service area configured. Some geo-specific content present for two to three surrounding communities. |
| **3 — Best Practice** | Full service area content coverage across all communities in protected market. Dedicated service area pages or geo-specific content for each primary community. GBP service area perfectly configured. Social content regularly references surrounding communities. Geo-specific content feeding local search visibility across all communities. |

**Signal 43 — Geographic Search Visibility**   Stage: Discovery   |   Intent: Research / Emergency

**Source: ***ValueSERP API — local pack and organic search position monitoring across all communities in protected market*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Contractor appears in search results for primary city only or not at all. Invisible across surrounding communities. |
| **1 — Weak** | Visible in primary city search results. Occasional appearance for one or two surrounding communities but inconsistent. Not in local pack outside primary city. |
| **2 — Functional** | Consistent visibility in primary city. Appearing in search results for two to three surrounding communities. Local pack presence inconsistent outside primary city. |
| **3 — Best Practice** | Dominant search visibility across all primary communities in protected market. Local pack presence or page 1 organic for trade-specific queries in each major community. Emergency-intent searches surface this contractor consistently across the full protected market radius. |

## **6.9 — Video Signals (44–47)**

Video earned its own category for contractors because visual proof of work is the primary trust mechanism in the trades. A contractor establishes authority by showing the job. Video extends that proof into the most consumed content format on every platform contractors use.

**Signal 44 — Video Content Production**   Stage: Engagement   |   Intent: Research / Comparison

**Source: ***YouTube Data API, Facebook Graph API, website crawl — video presence, volume, quality, recency*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No video content produced anywhere. Contractor has no video presence across any platform. Static content only. |
| **1 — Weak** | One or two old or poorly produced videos on a single platform. Generic promotional content only. Low quality. Not recent. |
| **2 — Functional** | Regular video production — twice monthly minimum. Genuine trade content visible. Real jobs and real people. Reasonable production quality. At least two platforms receiving video content. |
| **3 — Best Practice** | Consistent video production cadence — weekly minimum across platforms. High quality and authentic. Content spans full range of trade-specific topics. Video library substantial enough to serve every intent bucket. |

**Signal 45 — Video Platform Distribution**   Stage: Engagement   |   Intent: Research / Comparison

**Source: ***YouTube Data API, Facebook Graph API, website crawl — cross-platform presence and format adaptation detection*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Video on one platform only or no video present. No cross-platform distribution strategy. |
| **1 — Weak** | Video present on two platforms but no adaptation. Same video reposted identically. No optimisation per platform. Videos not embedded on website. |
| **2 — Functional** | Video present across three platforms with some adaptation. YouTube channel claimed and reasonably optimised. Videos embedded on relevant website pages. |
| **3 — Best Practice** | Full cross-platform video distribution strategy. Content adapted deliberately per platform — full length walkthroughs on YouTube, short reels on Facebook, embedded on relevant website service pages. YouTube channel fully optimised with playlists organised by trade service and topic. |

**Signal 46 — Video Content Strategy and Topics**   Stage: Engagement   |   Intent: Emergency / Active Project / Comparison / Research

**Source: ***YouTube Data API, Facebook Graph API — NLP topic analysis of video titles, descriptions, and transcripts*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No video content to analyse or content entirely promotional. No educational, trust-building, or intent-specific topics present. |
| **1 — Weak** | Video content present but single-topic or entirely promotional. No deliberate intent bucket coverage. |
| **2 — Functional** | Video topics cover two to three intent buckets. Some educational content present. Some trust-building content. Comparison and Research intent partially served. |
| **3 — Best Practice** | Deliberate video content strategy covering all four intent buckets. Emergency — what to do when your furnace stops, signs of a serious electrical fault. Active Project — what to expect during an AC installation, how our quoting process works. Comparison — full project walkthroughs, customer testimonials. Research — seasonal maintenance guides, trade education. Content calendar aligned to seasonal demand peaks. |

**Signal 47 — Video Engagement and Search Visibility**   Stage: Growth   |   Intent: Research

**Source: ***YouTube Data API — search ranking, view trajectory, subscriber growth, engagement rate, transcript NLP*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No video ranking for any relevant trade query. Zero organic video search visibility. View counts negligible. No subscriber base. |
| **1 — Weak** | Video exists but not optimised for search. Generic titles and descriptions. Views primarily from existing followers only. No ranking for any trade-specific query. |
| **2 — Functional** | Some organic video search visibility emerging. Ranking for branded queries. A few videos appearing for trade-specific how-to searches. View trajectory positive. Subscriber count growing slowly. |
| **3 — Best Practice** | Ranking for non-branded trade-specific queries in protected market. View trajectory consistently growing. Subscriber base growing organically. Titles, descriptions, tags, and thumbnails fully optimised. Transcripts available supporting search indexing and AI retrieval. Video content contributing directly to AI share of voice. |

## **6.10 — AI Authority Signals (48–50)**

AI authority transfers from family law but scoring criteria shift significantly for contractors. The search behaviour is more urgent and more specific. Emergency and Active Project intent dominate. A contractor appearing consistently in AI responses for trade-specific and location-specific queries is capturing demand increasingly bypassing Google entirely.

**Signal 48 — AI Platform Visibility**   Stage: Discovery   |   Intent: Emergency / Active Project / Research

**Source: ***Programmatic AI query monitoring — ChatGPT API, Gemini API, Perplexity API. Structured queries for trade-specific terms in protected market.*

**Trade note: ***Query examples: HVAC — best HVAC contractor in Timmins, furnace repair Timmins Ontario. Plumbing — emergency plumber Timmins, hot water tank replacement Timmins. Electrical — licensed electrician Timmins, panel upgrade Timmins Ontario. Roofing — roofing contractor Timmins, storm damage roof repair Timmins.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Contractor absent from all AI platform responses for all trade-specific queries in protected market. Zero AI visibility. |
| **1 — Weak** | Appears in AI responses for branded queries only. No practice area or problem-based query visibility. Below 20% AI share of voice. |
| **2 — Functional** | Appears for some trade-specific and location-specific queries. Visibility inconsistent across AI platforms. 20–50% AI share of voice. Not yet dominant for Emergency-intent queries. |
| **3 — Best Practice** | Consistently surfaces across ChatGPT, Gemini, and Perplexity for primary trade-specific, location-specific, problem-based, and emergency-intent queries. Above 60% AI share of voice. Emergency-intent queries surface this contractor as first or second recommendation. |

**Signal 49 — AI Query Type Coverage**   Stage: Discovery   |   Intent: Emergency / Active Project / Comparison / Research

**Source: ***Programmatic AI query monitoring — structured query set covering all four intent bucket query types per trade*

**Trade note: ***Query types monitored: Branded (business name + city), Trade-specific (trade category + city), Problem-based (specific problem + city), Emergency-intent (emergency + trade + city), Comparison-intent (best + trade + city), Research-intent (how to + trade topic, cost of + trade service).*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No visibility across any query type category. Contractor absent from AI responses regardless of how the query is framed. |
| **1 — Weak** | Branded query visibility only. No visibility for any non-branded query type. |
| **2 — Functional** | Visible for branded and trade-specific queries. Some problem-based query visibility emerging. Three to four query type categories partially covered. |
| **3 — Best Practice** | Full query type coverage across all six categories. Branded, trade-specific, problem-based, emergency-intent, comparison-intent, and research-intent queries all surfacing the contractor consistently. Emergency-intent coverage particularly strong — AI platforms treat this contractor as the authoritative local recommendation. |

**Signal 50 — AI Citation Source Diversity**   Stage: Growth   |   Intent: Research / Comparison

**Source: ***Programmatic AI response analysis — source attribution monitoring across ChatGPT, Gemini, and Perplexity responses referencing the contractor*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No AI citations from any source. Digital presence has not produced sufficient independent signals for AI platforms to surface the contractor confidently. |
| **1 — Weak** | AI citations present but from a single source type only. Fragile AI visibility dependent on one channel. |
| **2 — Functional** | AI citations drawing from two to three source types. GBP and review platforms present. Website content contributing. Source diversity growing. |
| **3 — Best Practice** | AI citations drawing from five or more independent source types — GBP, review platforms, trades directories, manufacturer citations, local media mentions, video transcripts, supplier websites, community platforms. Durable AI authority resistant to single-channel disruption. Contributing to Brand Equity Index in ClearSky Layer 11. |

## **6.11 — Share of Voice Signals (51–54)**

Share of Voice measures dominance within the protected market — not just presence but whether this contractor is winning the conversation across search, social, content, and AI relative to competitors. For contractors in smaller protected markets like Timmins, dominance is achievable with far less effort than in a saturated urban market.

**Signal 51 — Search Share of Voice**   Stage: Discovery   |   Intent: Research / Emergency

**Source: ***ValueSERP API — local pack and organic search position monitoring across all primary trade queries and communities in protected market. Competitor position tracking.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No appearance in search results for any relevant trade query in protected market. Competitors capturing all available search share of voice. |
| **1 — Weak** | Appearing for branded queries only. Below 20% search share of voice. Not in local pack for primary city. |
| **2 — Functional** | Consistent local pack or page 1 organic in primary city. 20–50% search share of voice. Appearing for some surrounding community queries. |
| **3 — Best Practice** | Dominant search presence across full protected market. Above 60% search share of voice for primary trade queries across all major communities. Consistent local pack in primary city. Emergency-intent searches surface this contractor first or second consistently. |

**Signal 52 — Social Share of Voice**   Stage: Engagement   |   Intent: Comparison

**Source: ***Facebook Graph API, Nextdoor monitoring, community platform monitoring — conversation volume, mention tracking, engagement comparison relative to competitors in protected market*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No social conversation generated. Competitors capturing all social share of voice. Invisible in community conversations where buying decisions are made. |
| **1 — Weak** | Minimal social conversation. Below 20% social share of voice. Occasional post engagement but no community mention behaviour. |
| **2 — Functional** | Moderate social presence generating genuine community conversation. 20–50% social share of voice. Facebook engagement above competitor average for at least one content category. |
| **3 — Best Practice** | Dominant social share of voice above 60% in protected market. Facebook content generating more community engagement and shares than any competitor. Nextdoor recommendation threads consistently naming this contractor first. Social share of voice feeding branded search volume. |

**Signal 53 — Content Share of Voice**   Stage: Growth   |   Intent: Research

**Source: ***Content gap analysis vs competitors — website page count, blog volume, FAQ coverage, video library, keyword topic coverage relative to competitors in protected market*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No content presence beyond basic website. Competitors capturing all content share of voice. Contractor has no content answer for any Research-intent topic. |
| **1 — Weak** | Below 20% content share of voice. Fewer than 20% of relevant trade topics addressed. Basic website only. |
| **2 — Functional** | 20–50% content share of voice. 40–60% of relevant trade topics covered. Publishing cadence consistent but not dominant. |
| **3 — Best Practice** | Above 60% content share of voice in protected market. 80%+ of relevant trade topics covered across all content formats. All channels working together. New topics identified from A2P inquiry data and addressed before competitors. Seasonal content calendar fully executed ahead of demand peaks. |

**Signal 54 — AI Share of Voice**   Stage: Discovery   |   Intent: Emergency / Active Project / Comparison / Research

**Source: ***Programmatic AI query monitoring — ChatGPT API, Gemini API, Perplexity API. Contractor mention frequency relative to competitors across full structured query set for protected market.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | Zero AI share of voice. Contractor absent from all AI responses while competitors are being recommended. |
| **1 — Weak** | Below 20% AI share of voice. Appearing occasionally but competitors named first and more consistently. |
| **2 — Functional** | 20–50% AI share of voice. Appearing alongside competitors for primary trade and location-specific queries. |
| **3 — Best Practice** | Dominant AI share of voice above 60% across all query types in protected market. Named first or second recommendation by ChatGPT, Gemini, and Perplexity for primary trade queries, problem-based queries, emergency-intent queries, and comparison-intent queries. AI share of voice compounding month over month. |

## **6.12 — Contact Friction Signals (55–60)**

Contact friction in the trades vertical is not an inconvenience — it is a lost job. A burst pipe, a furnace out in a Northern Ontario winter, a live electrical fault. Every second of friction between intent and contact is revenue walking to a competitor.

**Signal 55 — Click to Call**   Stage: Conversion   |   Intent: Emergency

**Source: ***Website crawl — mobile optimisation audit, click to call detection across all pages*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No click to call functionality. Phone number listed as text only. Emergency-intent visitor on mobile must manually dial — maximum friction at the highest value moment in the conversion funnel. |
| **1 — Weak** | Phone number present but not consistently clickable on mobile. Visible on homepage only. Not present on service pages where Emergency-intent visitors frequently land. |
| **2 — Functional** | Clickable phone number present and works on mobile. Visible on homepage and most key pages. Above the fold on homepage. Not yet persistent across entire site. |
| **3 — Best Practice** | Click to call prominent above the fold on every page. Persistent visibility — header or sticky bar. Mobile optimised without exception. Emergency-intent visitor on any page can call in one tap with zero hunting. For HVAC and plumbing: emergency phone number visually distinct from general enquiry number where separate lines exist. |

**Signal 56 — Contact Form Friction**   Stage: Conversion   |   Intent: Active Project

**Source: ***Website crawl — form field count, placement audit, mobile optimisation, accessibility testing*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No contact form anywhere. Active Project intent visitor ready to request a quote has no self-serve pathway. |
| **1 — Weak** | Form exists but high friction — 6 or more required fields. Buried on contact page only. Not mobile friendly. No instant confirmation on submission. |
| **2 — Functional** | Form present and reasonably accessible. 3–5 fields. Available on contact page and at least one other key page. Mobile functional. Confirmation message on submission. |
| **3 — Best Practice** | Low friction quote request form on every key page. 2–3 fields maximum for initial contact. Mobile optimised without exception. Instant confirmation with specific response time commitment. Integrated with A2P platform for licensed clients — inquiry routed immediately to conversational AI acknowledgement and human follow-up queue. |

**Signal 57 — Chat Capability**   Stage: Conversion   |   Intent: Emergency / Active Project

**Source: ***Website crawl — chat widget detection, responsiveness testing, after-hours behaviour audit*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No chat capability anywhere. Visitor who prefers chat has no pathway. |
| **1 — Weak** | Chat widget present but offline or unresponsive. Bot with no useful responses. Worse than no chat — visitor initiates contact and receives nothing. |
| **2 — Functional** | Functional chat present. Responsive during business hours. Basic bot handles after-hours with useful fallback. Core trade questions answered. |
| **3 — Best Practice** | Live chat during business hours with fast response — under 2 minutes. Intelligent after-hours bot captures inquiry details, confirms receipt, and sets specific response time expectation. Bot trained on trade-specific common questions. Integrated with A2P platform for licensed clients. |

**Signal 58 — SMS Contact Option**   Stage: Conversion   |   Intent: Emergency / Active Project

**Source: ***Website crawl — SMS invitation detection across all pages and digital presence*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No SMS contact option anywhere. Visitor who cannot or prefers not to call has no text pathway. |
| **1 — Weak** | SMS number listed somewhere but not prominently featured. No explicit invitation to text. No response time commitment for SMS. |
| **2 — Functional** | SMS contact option visible on contact page. Dedicated SMS number or shared line with SMS capability indicated. Response time for texts referenced. |
| **3 — Best Practice** | SMS prominently invited across all key pages. Dedicated SMS number visible. Explicit invitation to text. Response time commitment for SMS stated specifically. After-hours SMS acknowledged immediately with response time expectation set. Integrated with A2P conversational AI for licensed clients. |

**Signal 59 — Response Time Commitment**   Stage: Conversion   |   Intent: Emergency / Active Project

**Source: ***Website crawl — NLP response time promise detection across all pages and digital presence*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No response time commitment stated anywhere. For Emergency-intent visitors this is disqualifying — a contractor who cannot commit to a response time loses to one who can. |
| **1 — Weak** | Vague commitment only — we respond promptly, same day service. No specific timeframe. No accountability. |
| **2 — Functional** | Specific response time stated on contact page — within 24 hours or similar. Commitment present but not reinforced elsewhere. After-hours response expectation absent or vague. |
| **3 — Best Practice** | Specific and accountable response time commitment stated prominently across all key pages. Emergency response time separate and more aggressive for HVAC and plumbing. Stated adjacent to every contact method. For licensed clients — A2P platform enforces the commitment through automated follow-up triggering if response window is approaching without human action. |

**Signal 60 — After Hours Availability Signal**   Stage: Conversion   |   Intent: Emergency

**Source: ***Website crawl — availability messaging detection, after-hours pathway audit, mobile optimisation*

**Trade note: ***After-hours availability is critical for HVAC and plumbing — a furnace failure at midnight in Timmins in January is a genuine emergency. Roofing and electrical after-hours expectations calibrated lower but still present.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No hours published anywhere. No after-hours messaging. Business appears unavailable outside office hours with no alternative. For HVAC and plumbing this is a critical gap. |
| **1 — Weak** | Business hours listed but no after-hours option. Prospective client in crisis outside office hours has no visible path to contact. |
| **2 — Functional** | Business hours listed. After-hours messaging present — leave a message, email after hours. For HVAC and plumbing: emergency line referenced but not prominently featured. |
| **3 — Best Practice** | Clear after-hours capability signalled across all key pages. For HVAC and plumbing: dedicated emergency line prominent above the fold — visible at midnight on mobile without scrolling. A2P platform integrated for licensed clients — after-hours inquiries acknowledged immediately. Emergency-intent visitor at any hour on any device knows they have been heard and knows exactly what happens next. |

## **6.13 — A2P Content Intelligence Signals (61–66) — Layer 3**

*These signals are exclusive to licensed clients through the ClearSky A2P platform. Not scored against Cohort 1. Not included in Content Gap % calculation. Inform content strategy roadmap and marketing automation configuration only.*

**Signal 61 — Inbound Inquiry Volume and Trajectory**   Stage: Engagement   |   Intent: All buckets

**Source: ***A2P platform — aggregated inbound inquiry count across all touchpoints, tenure and market adjusted benchmark, seasonal pattern analysis*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No measurable inbound inquiry volume through any digital touchpoint. Digital presence is not producing any measurable lead flow regardless of traffic. |
| **1 — Weak** | Sporadic and unpredictable inquiry volume. Significantly below tenure and market adjusted benchmark. Single touchpoint generating all inquiries — typically phone only. |
| **2 — Functional** | Moderate and consistent inquiry volume. Approaching tenure and market adjusted benchmark. Seasonal patterns beginning to emerge. Multiple touchpoints contributing. |
| **3 — Best Practice** | Strong inquiry volume at or above tenure and market adjusted benchmark. Consistent and growing month over month. Full seasonal pattern mapped. Multiple channels actively contributing. Inquiry volume data feeding content calendar and marketing automation configuration directly. |

**Signal 62 — Inquiry Channel Diversity**   Stage: Engagement   |   Intent: All buckets

**Source: ***A2P platform — channel breakdown across phone, SMS, form, chat, social message, anonymous web visit, and direct booking*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | All inquiries from single channel only. No digital channel diversity. Channel concentration risk is total. |
| **1 — Weak** | Two channels contributing. One dominates overwhelmingly. Digital channels present but not generating inquiries. |
| **2 — Functional** | Three to four channels actively generating inquiries. No single channel overwhelming. SMS or chat beginning to produce inquiry flow. |
| **3 — Best Practice** | Full channel diversity across all A2P touchpoints. Channel mix reflects intent bucket distribution — Emergency via phone and SMS, Active Project via form and chat, Comparison via social message and return web visits, Research via content engagement and soft callback. |

**Signal 63 — Anonymous Web Visit Behaviour**   Stage: Discovery   |   Intent: All buckets

**Source: ***A2P platform — anonymous visit tracking, page depth, time on site, content engagement scoring, return visit detection, exit page analysis, intent bucket classification*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No anonymous web visit data. Website has no tracking or negligible traffic. Marketing automation has no behavioural signal to act on. |
| **1 — Weak** | Fewer than 50 unique visits per month in protected market. High bounce rate. Single page visits dominant. Intent bucket classification producing no actionable signal. |
| **2 — Functional** | 50–200 unique visits monthly. Some multi-page behaviour. Key service pages receiving meaningful traffic. Intent bucket classification producing partial signal. |
| **3 — Best Practice** | 200+ unique visits per month in protected market. Full intent bucket classification operational. Exit data feeding content gap identification. Anonymous visit behaviour data driving content calendar and marketing automation trigger configuration. |

**Signal 64 — Inquiry to Booking Conversion Rate**   Stage: Conversion   |   Intent: Active Project

**Source: ***A2P platform — inquiry volume versus booked jobs, conversion rate by channel and intent bucket, response time impact analysis*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No measurable conversion from digital inquiries to booked jobs. Conversion process entirely unmeasured. |
| **1 — Weak** | Some conversion occurring but significantly below benchmark. High friction in conversion process. Channel variation not understood. |
| **2 — Functional** | Conversion rate approaching benchmark. Response time reasonable. Channel variation understood. Basic follow-up process in place. |
| **3 — Best Practice** | Conversion rate at or above benchmark. Fast response via A2P conversational AI. Frictionless booking pathway. Channel conversion data fully mapped. Content source conversion data driving content strategy. Marketing automation configured to nurture Comparison and Research intent visitors toward conversion without pushing prematurely. |

**Signal 65 — Intent Bucket Distribution**   Stage: Engagement   |   Intent: All buckets

**Source: ***A2P platform — intent bucket classification across all inbound touchpoints, anonymous web visit behaviour, inquiry content NLP, channel and timing analysis*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No intent bucket classification data available. Marketing automation operating without behavioural context — same message to every visitor regardless of where they are in the decision journey. |
| **1 — Weak** | Partial intent bucket classification. Emergency intent distinguishable. Active Project, Comparison, and Research intent not reliably distinguished. |
| **2 — Functional** | Three of four intent buckets reliably classified. Marketing automation serving differentiated content to at least two intent buckets. |
| **3 — Best Practice** | Full four-bucket intent classification operational across all A2P touchpoints. Distribution data cross-referenced with gap score signals — if 40% of traffic is Emergency-intent and Emergency signal scores are weak, gap report surfaces this misalignment as the highest priority roadmap item. |

**Signal 66 — Call Tracking Attribution**   Stage: Growth   |   Intent: Active Project

**Source: ***A2P platform — call tracking data, campaign attribution, channel source analysis, content piece attribution*

**Trade note: ***Call tracking is not externally observable on GBP and is therefore excluded from gap score to maintain apples-to-apples Cohort 1 comparison. Resides in A2P Content Intelligence layer only.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No call tracking in place. Inbound calls unattributed. No visibility into which campaigns, channels, or content pieces are driving phone inquiries. |
| **1 — Weak** | Basic call tracking active on primary number. Source attribution limited to direct versus referral. Campaign-level attribution absent. |
| **2 — Functional** | Call tracking active across primary contact number and at least one campaign channel. Some content piece attribution visible. Call volume by source informing marketing spend decisions. |
| **3 — Best Practice** | Full call tracking attribution across all channels and campaigns. Every inbound call source identified. Campaign-level attribution confirming which spend is producing calls and at what cost per call. Seasonal attribution patterns mapped. Call tracking integrated with A2P platform — call outcomes recorded and feeding conversion rate analysis by source. |

## **6.14 — Referral Network Signals (67–72) — Layer 2**

*These signals measure the strength and visibility of the contractor**'**s referral network across six categories. Reported separately from the gap score. Not comparable to Cohort 1. Referral Network Score = Total / 18 expressed as a percentage.*

**Signal 67 — Realtor and Real Estate Network Referral Visibility**   Stage: Growth   |   Intent: Active Project

**Source: ***Self-reported onboarding data + realtor website monitoring, real estate association directories, LinkedIn monitoring, A2P inquiry source tracking*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No relationship with any realtor or real estate professional in protected market. Pre-sale repair work and buyer move-in jobs arriving exclusively through digital discovery. |
| **1 — Weak** | Informal awareness among one or two realtors based on personal relationships. Not listed as recommended contractor on any realtor website. |
| **2 — Functional** | Active relationships with three to five realtors. Listed as recommended contractor on at least one realtor website. Mutual referral relationship established. |
| **3 — Best Practice** | Systematic realtor referral network across protected market. Known as the go-to contractor recommendation among the real estate community. Listed as preferred contractor across multiple realtor websites. Contractor content speaks to real estate specific needs. Referral volume from real estate channel is primary driver of Active Project inquiry flow. |

**Signal 68 — Property Manager Referral Visibility**   Stage: Growth   |   Intent: Active Project / Emergency

**Source: ***Self-reported onboarding data + property management company websites, landlord association directories, A2P inquiry source tracking*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No relationship with any property manager or property management company. Recurring maintenance work arriving exclusively through digital discovery. |
| **1 — Weak** | Informal awareness among one or two property managers from personal encounters. Not listed as preferred contractor on any property management resource. |
| **2 — Functional** | Active relationships with at least two property management companies. Listed as preferred or on-call contractor for at least one operation. Service agreement or preferred vendor arrangement in place. |
| **3 — Best Practice** | Systematic property manager referral network across protected market. Known as the reliable on-call contractor among property management community. Preferred vendor agreements with multiple companies. Contractor digital presence speaks to property management specific needs — rapid response SLAs, after-hours availability, multi-unit experience. |

**Signal 69 — Insurance Adjuster and Restoration Referral Visibility**   Stage: Growth   |   Intent: Emergency

**Source: ***Self-reported onboarding data + insurance company preferred contractor directories, restoration company websites, A2P inquiry source tracking*

**Trade note: ***Highest value for plumbing (water damage) and roofing (storm damage). Significant for HVAC (fire and flood damage equipment replacement). Trade-specific scoring calibrated accordingly.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No relationship with any insurance adjuster or restoration company. Emergency restoration work arriving exclusively through digital discovery. |
| **1 — Weak** | Informal awareness among one or two adjusters from previous job encounters. Not listed on any insurer preferred contractor list. |
| **2 — Functional** | Active relationships with at least two insurance adjusters or one restoration company. Listed on at least one insurer preferred contractor list. Contractor understands insurance claim process and documentation requirements. |
| **3 — Best Practice** | Systematic insurance and restoration referral network across protected market. Known as the reliable emergency response contractor among local adjusters and restoration companies. Listed on multiple insurer preferred contractor directories. Contractor documentation capability speaks to insurance industry requirements. For roofing: storm damage assessment and insurance claim navigation prominently featured. |

**Signal 70 — Building Inspector and Municipal Referral Visibility**   Stage: Growth   |   Intent: Active Project

**Source: ***Self-reported onboarding data + municipal contractor registry monitoring, home inspector association directories, A2P inquiry source tracking*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No relationship with any building inspector, home inspector, or municipal permit office. Deficiency correction work arriving exclusively through digital discovery. |
| **1 — Weak** | Informal awareness among one or two home inspectors from job site encounters. Contractor not known in permit office as a reliable licensed trades professional. |
| **2 — Functional** | Active relationships with at least two home inspectors. Known at municipal permit office as a licensed and compliant contractor. Listed as recommended contractor by at least one home inspector. |
| **3 — Best Practice** | Systematic inspector and municipal referral network across protected market. Home inspectors automatically recommending this contractor for deficiency corrections. Known at municipal permit office as the contractor who does the work correctly and pulls permits properly. Deficiency correction work providing consistent Active Project inquiry flow. |

**Signal 71 — Hardware Store and Supplier Referral Visibility**   Stage: Growth   |   Intent: Active Project / Emergency

**Source: ***Self-reported onboarding data + local hardware store and supplier monitoring, community platform monitoring, A2P inquiry source tracking*

**Trade note: ***For small markets like Timmins this channel is particularly high-trust — a hardware store recommendation carries significant community credibility.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No relationship with any hardware store or trade supplier. Customers asking who to call receive no recommendation for this contractor. |
| **1 — Weak** | Informal awareness at one or two hardware stores based on personal shopping relationship. Not listed as recommended contractor at any retail location. |
| **2 — Functional** | Active relationships with at least two hardware stores or trade suppliers. Business cards or referral materials present at trade desk or contractor counter. Some Emergency and Active Project referrals arriving through this channel. |
| **3 — Best Practice** | Systematic hardware store and supplier referral network across protected market. Staff at Home Hardware, Home Depot trade desk, and independent trade suppliers automatically recommending this contractor. Business cards and referral materials present at multiple retail locations. Contractor reciprocates — recommending these suppliers to customers. |

**Signal 72 — Cross-Trade Referral Network Visibility**   Stage: Growth   |   Intent: Active Project / Emergency

**Source: ***Self-reported onboarding data + complementary trade business monitoring, LinkedIn monitoring where applicable, A2P inquiry source tracking*

**Trade note: ***Plumbing refers to: electricians, HVAC for radiant heat, roofers for roof penetration flashing. HVAC refers to: electricians for panel upgrades, plumbers for humidifier lines. Electrical refers to: plumbers for generator transfer switch plumbing. Roofing refers to: eavestroughs and siding contractors, plumbers for roof drain penetrations.*

| **Score** | **Criteria** |
| --- | --- |
| **0 — Not present** | No cross-trade referral relationships in protected market. Contractor operates in complete isolation from complementary trades. |
| **1 — Weak** | Informal awareness among one or two complementary trade businesses from job site encounters. Occasional ad-hoc referral in either direction but no reliable pattern. |
| **2 — Functional** | Active reciprocal referral relationships with at least two complementary trade businesses. Regular referral flow in both directions. Some digital visibility confirming the relationships. |
| **3 — Best Practice** | Systematic cross-trade referral network across all relevant complementary trades in protected market. Known among the local trades community as the reliable professional who refers correctly. Reciprocal referral relationships producing consistent inquiry flow from every complementary trade category. brandedSearchPresent signal strengthened as cross-trade referral network drives branded search volume through word of mouth. |

# **Section 7 — Data Sources and APIs**

ContentRadar accesses the following external data sources programmatically. All API calls run server-side. No API keys are exposed to the browser. This is consistent with the critical architecture rule established in clearsky-developer-notes-v1.7.docx.

| **Data Source** | **Signals Fed** | **Access Method** | **Cost** | **Notes** |
| --- | --- | --- | --- | --- |
| Google Places API | GBP signals via ClearSky Layer 1 | REST API — GOOGLE_PLACES_API_KEY | Per call | Already live in ClearSky Layer 1 |
| PageSpeed Insights API | Site performance via ClearSky Layer 3 | REST API — keyless up to 25/day | Free / per call | Already live in ClearSky Layer 3 |
| ValueSERP API | Search share of voice, local pack, organic rank, geographic visibility | REST API — VALUESERP_API_KEY | ~$0.001–0.003/call | Session 13 priority |
| Facebook Graph API | Page completeness, content, engagement, events, recommendations, video | Graph API — Meta App credentials | Free with app approval | Business page and content data |
| Nextdoor Business API | Page presence, recommendations, organic mentions | Nextdoor Business API | Partner access | Hyper-local trust signals |
| YouTube Data API | Video presence, views, subscribers, search ranking, transcripts | YouTube Data API v3 | Free quota 10,000 units/day | Channel and video data |
| AI Query Monitoring | AI authority and share of voice signals | ChatGPT API, Gemini API, Perplexity API | Per query cost | Structured queries for trade terms in protected market |
| HomeStars API | Star Score, review volume, recency, response rate | HomeStars programmatic monitoring | Per call | Primary Canadian trades review platform |
| Trades Directory Crawl | Houzz, Angi, HomeAdvisor, BBB, trade association directories | Web crawl — Firecrawl or equivalent | Per crawl | Profile completeness, NAP consistency |
| Manufacturer Directory Monitoring | Supplier and manufacturer citations | Programmatic monitoring — dealer locator pages | Included in crawl cost | Carrier, GAF, ESA, HRAI and others |
| News and Media Monitoring | Local media citations, community mentions | Google News API, media database | Subscription or per query | Track contractor mentions across local outlets |
| NAP Audit | NAP consistency across all listings | Aggregated from directory crawl + GBP + website | Included in crawl cost | Cross-reference name, address, phone across all sources |
| ClearSky A2P Platform | Signals 61–66 — inquiry volume, channel diversity, conversion, intent bucket distribution, call tracking | Internal — direct platform data access | No additional cost | Licensed clients only — Layer 3 Content Intelligence |

# **Section 8 — Development Agenda**

ContentRadar development for the Contractors vertical is sequenced to complement the ClearSky diagnostic build. The following items are outstanding before developer handoff of this spec.

| **Item** | **Priority** | **Status** |
| --- | --- | --- |
| Signal weighting review — confirm equal weighting across 60 gap score signals is correct or adjust stage composition | Pre-handoff | Open |
| Cohort 1 build — identify 2,000 contractors across Canada and USA for programmatic analysis funnel. All four trades represented | Pre-launch | Open |
| Cohort 1 programmatic scoring — run ContentRadar signal framework against 2,000 contractors. Identify top 300 candidates | Pre-launch | Open |
| Cohort 1 manual review — manual review of 300 candidates. Lock Cohort 1 benchmark pool | Pre-launch | Open |
| ContentRadar API integrations — wire Facebook, Nextdoor, YouTube, HomeStars, trade directory crawl, AI monitoring, news monitoring APIs | Session 14+ | Open |
| Layer 4 ClearSky wiring — replace Firecrawl mock with live ContentRadar output in diagnostic route | Session 14+ | Open |
| Referral score reporting — build separate referral network score report — Signals 67–72 | Session 15+ | Open |
| Content Intelligence dashboard — build A2P content intelligence layer — Signals 61–66 — into licensed client dashboard | Session 15+ | Open |
| Intent bucket gap reporting — build intent bucket breakdown in gap report showing Emergency / Active Project / Comparison / Research gap visibility per contractor | Session 15+ | Open |
| Onboarding digital audit automation — automate ContentRadar audit to run on invitation acceptance. Results ready before Meeting 2 | Session 14+ | Open |

ClearSky Software · ContentRadar Contractors Specification · v1.0 · April 2026 · Confidential

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564