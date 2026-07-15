ClearSky Software

**CONFIDENTIAL · INTERNAL DOCUMENT · VERSION 1.0**

**ClearSky Intent-Aware**

**Decision System**

Master Architecture & Session Handoff Document

May 2026   ·   Rory Dredhart   ·   r.dredhart@clearskysoftware.net   ·   705-274-9564

| **This document captures the complete architecture, tool inventory, build sequence, prototype specification, and contractor profile defined across the founding design session. It is the master reference for all subsequent build sessions. Do not re-litigate any decision contained here — build forward from this foundation.** |
| --- |

# **Section 1 — The Goal**

| **One goal. One booked job. Everything in this system exists to move a specific person from wherever they are in the customer journey to a booked job with this contractor.** |
| --- |

ClearSky is a managed growth platform for Northern Ontario trades contractors. It combines a protected market, a managed website with intent-aware dynamic sections, a signal detection engine, a conversion tool suite, a predictive decision engine, and a programmatic marketing layer — all with a human in the loop at every point where judgment is required and automation everywhere judgment is not.

The contractor runs their trades business. ClearSky runs their growth. The contractor's only obligations are to show up for booked appointments, deliver acceptable service quality, and make their content available for ClearSky to work with. Everything else is ClearSky's responsibility.

# **Section 2 — Platform Foundation**

ClearSky is built on a proprietary portal platform originally developed for a mining sector client. The IP is fully owned by ClearSky Software — no NDA, no non-compete. The platform is production-proven at full complexity and is being applied to the trades contractor vertical as its first commercial deployment.

## **What the platform provides**

- Container-based CMS with full-width, two-section, and three-section layouts. Each section independently configurable with its own content type and format.

- Semantic search engine — understands meaning not just keywords. Indexes all contractor content and surfaces results calibrated to query intent.

- Faceted search — applied to products and services with multiple filter dimensions.

- Scraping and content aggregation pipeline — admin-configured source URLs, cron-scheduled execution, structured content delivered directly to CMS.

- Microsite architecture — multiple distinct sites running on one platform infrastructure with complete data isolation between clients.

- A2P system with Telnyx integration — voice and SMS capability. Existing profile logic for new versus returning contacts.

- Native mobile app — purpose-built for rep multi-camera ViewRoom access and A2P management.

- DataForSEO integration — keyword data, SERP rankings, watch market demand signals.

## **Infrastructure model**

- Each contractor gets a standalone website on their own domain. Not a subdomain. Their domain pointed to ClearSky servers.

- ClearSky owns and manages the infrastructure. Contractor owns the domain and the content.

- When a contractor leaves they take their domain and their content. The platform stays with ClearSky.

- ClearSky operational applications — ViewRoom, A2P, mobile app — run on ClearSky subdomain structure.

- One client management platform sits above all contractor deployments. Gives the ClearSky team visibility and control across every client.

## **The template model**

The platform uses vertical-specific templates. A plumbing contractor template is different from an HVAC template or a roofing template. The template defines the infrastructure — which pages exist, where dynamic sections live, which tools are present and where, how the intent rules are structured. The visual design, content voice, and personality are specific to each contractor and built during onboarding.

No two contractor websites look the same. The infrastructure underneath is identical. The expression on top is unique to each contractor and their market.

# **Section 3 — The Conversion Toolkit**

Every tool in the toolkit serves a specific role in the conversion journey. The Orchestrator sequences them in the order most likely to produce a booked job for this specific person based on their Engagement Score trajectory and the Cohort 2 network pattern.

| **Tool** | **Build state** | **Primary conversion role** |
| --- | --- | --- |
| CMS with dynamic sections | Built — needs intent layer extension | Page composition and intent-aware content delivery |
| Semantic search | Built | Intent signal from search queries · content discovery |
| A2P system — Telnyx | Built | First response · Emergency escalation · follow-up sequences |
| ViewRoom | Built | Virtual showroom · multi-camera · AI knowledge base · appointment booking |
| FotoJobber | Built | Annotated image quote submission · visual job brief |
| Visualizer | Built via Google API · proprietary model in development for roofing · plumbing not yet started | Generative product visualization in homeowner's own space |
| Lead Grabber | Built | Always-on contact capture · AI widget · human escalation with SLA |
| AI widget | Built | Immediate question answering · knowledge base · intent signal capture |
| Mobile app | Built | Rep multi-camera ViewRoom · A2P management on mobile |
| Scraper pipeline | Built | Content aggregation · flag response · watch market content delivery |
| DataForSEO | Built — integrated | Watch market keyword demand · SERP data · ContentRadar input |

## **Tool sequencing by intent bucket**

| **Bucket** | **Primary tool sequence** | **Logic** |
| --- | --- | --- |
| Emergency | A2P immediate → Lead Grabber → ViewRoom if call fails | Speed is the only variable. Every other consideration secondary. |
| Active Project | FotoJobber prompt → ViewRoom quote consultation → appointment | Visual quote initiation → human conversation → booked job. |
| Comparison | Visualizer → ViewRoom proof session → estimate CTA | See the outcome → see the work → make the decision. |
| Research | AI widget → Lead Grabber soft CTA → content nurture | Answer questions → build trust → wait for readiness signal. |

# **Section 4 — Two Provider Streams**

All 16 providers split into two streams before any processing runs. This split is the first decision every event faces.

| **Stream A — Contact events: something a specific person did** |
| --- |

| **Provider group** | **Providers** | **Key characteristic** |
| --- | --- | --- |
| Webhook push | GBP reviews · SMS · Email · Forms · Booking · Quote | Provider calls ClearSky when event occurs. |
| Real-time stream | Voice calls · Live chat | Transcription must complete before extraction runs. |
| Platform native | Website pixel events | Pre-classified with sessionId and intentBucket. Skips most inference. |
| Polling pull | Social mentions · CRM · Competitor mentions | ClearSky fetches on schedule. May reference an individual. |

| **Stream B — Market intelligence: no individual attached or possible** |
| --- |

| **Provider group** | **Providers** | **What it contributes** |
| --- | --- | --- |
| Analytics | Matomo · ViewRoom aggregate | Aggregate traffic patterns. No individual identity. |
| Market data | DataForSEO · Watch market · Competitor | SERP rankings, keyword demand states. Always Tier 3. |
| Intelligence feeds | ContentRadar · System events | Benchmark scoring, demand signals, platform health. |

Stream B events route directly to the Context Store. They never create profiles, never receive session IDs, and never trigger customer-facing actions. They inform how the system interprets Stream A contact events.

# **Section 5 — Two Confidence Dimensions**

| **Critical: these are two completely separate confidence questions. Never combine them into a single score. Never confuse them with each other.** |
| --- |

| **Confidence 1 — Event validity: did this event actually occur?** |
| --- |

Resolved in Layer 1 during normalization and the noise filter. Has nothing to do with who the event belongs to. A low event confidence event is dropped immediately, logged for audit, and not recoverable.

| **High event confidence — proceed** | **Low event confidence — drop and log** |
| --- | --- |
| Real provider payload with valid authentication | Bot pattern detected in traffic signature |
| Payload schema well-formed and complete | Spam content detected in form submission |
| No duplicate match on provider ID and timestamp | Duplicate event ID already processed |
| Voice transcription complete and parseable | Payload malformed or incomplete |

| **Confidence 2 — Attribution: does this event belong to a specific person?** |
| --- |

Evaluated only on events that passed event validity. Exists on a spectrum from zero to high based on the strength of available identifiers. Determines the identification tier.

The GBP review example: a one-star review from Margaret T. has high event confidence — Google confirmed the post, it definitely occurred. Attribution confidence may be low — the name is common, timing is plausible but not definitive. Two separate scores. Two separate decisions.

| **Identifier** | **Attribution confidence** |
| --- | --- |
| Forwarded link JWT token | High — Tier 1 |
| Phone number matching known contact | High — Tier 1 |
| Email hash matching known contact | High — Tier 1 |
| Fingerprint / cookie matching a session already tied to a **named** profile | High — Tier 1 (re-identification of a known person) |
| Fingerprint / session ID present but **no name/email attached** | Real person, unidentified — **Tier 2B** |
| Reviewer name + job timing correlation | Low — Tier 2 |
| Partial form field matching probable contact | Low — Tier 2 |
| No identifiable data point after all attempts | None — Tier 3 |

# **Section 6 — Three Identification Tiers**

After event validity is confirmed, attribution confidence determines the tier. The tier governs everything that follows. Tier 3 is not a default — it is the result of exhausting all available attribution attempts.

| **Tier** | **Attribution condition** | **What happens** |
| --- | --- | --- |
| Tier 1 — High attribution | A strong **naming** identifier resolves cleanly: phone, email hash, or forwarded token — **or** a fingerprint/cookie that re-identifies an already-named profile. | Profile created or updated. Fingerprint + session ID retained as identity. Full pipeline. All actions permitted. |
| Tier 2 — Real person, weak identifier | A weak identifier is present: a name, a partial form field, a review display name. | Profile created, status=pending. **Same-channel response only** until a stronger identifier upgrades to Tier 1. Fingerprint + session ID retained. |
| Tier 2B — Real person, zero identifiers | Validity + clearing the 10-second floor confirm a real individual (anonymous web visitor past 10s, or blocked-caller-ID voicemail). The 2B/3 line is engagement depth, not identifier presence. | Created immediately (§4.5a: validity → 10s floor → fingerprint/cookie lookup → create or attach). Cookie + fingerprint are its only marks; both retained on upgrade. No customer-facing action — no channel to reach them on. Log and wait; upgrades to Tier 2 or Tier 1 the moment an identifier appears. |
| Tier 3 — Not a real individual | One undivided bucket: Stream B market data (never has an individual), confirmed bot/spam (fails validity), and thin/instant-bounce Stream A (bounces before the 10-second floor). | **No profile, no cookie, no fingerprint stored.** Context Store only. Never a customer-facing action. Ever. |

## **The same-channel response rule for Tier 2**

Tier 2 events can receive a response through the same channel the event came from. They cannot cross channels until attribution upgrades to Tier 1.

| **Tier 2 event type** | **Same-channel response permitted** |
| --- | --- |
| GBP review | Respond on GBP. Cannot call or text the reviewer. |
| Houzz review | Respond on Houzz. Cannot cross to any other channel. |
| TripAdvisor review | Respond on TripAdvisor. Cannot cross channels. |
| Open forum question | Respond in the forum thread. Cannot cross channels. |
| Blocked caller ID — Tier 2B | No same-channel response possible. Log and wait. Re-enter when caller calls back unblocked. |

## **True Tier 2 candidates**

SMS and voice calls are NOT Tier 2 in normal circumstances — the phone number in the payload is a high-confidence identifier that produces Tier 1 attribution immediately. True Tier 2 events are those where the channel carries no direct PII.

- GBP reviews — display name only.

- Houzz reviews — platform username only.

- TripAdvisor reviews — platform identity only.

- Open forum questions — handle or anonymous post.

- Blocked caller ID — Tier 2B. No response channel available.

# **Section 7 — The Engagement Score**

| **The Engagement Score is the barometer that determines execution. Its goal is to reflect the truth of where the customer is at that moment in the customer journey.** |
| --- |

The Engagement Score is deterministic at the event level. Each event type contributes a defined score delta. The score at any moment is the sum of all event contributions weighted by recency and channel. The bucket follows the score — not the other way around.

The score carries three values simultaneously: current score (where they are now), velocity (how fast the score is moving and in which direction), and trajectory confidence (how reliable the current direction signal is based on accumulated data points).

## **Engagement Score input table**

| **Event type** | **Score delta** | **Notes** |
| --- | --- | --- |
| Page view — base page | 2 points | Homepage, about, general pages |
| Page view — service page | 4 points | Any specific service page |
| Page view — pricing page | 6 points | Strong Active Project signal |
| Page view — emergency page | 8 points | Immediate bucket evaluation |
| Dwell time — 30 seconds | 1 point | Per page |
| Dwell time — 60 seconds | 2 points | Per page |
| Dwell time — 120 seconds | 3 points | Per page |
| Scroll depth — 50% | 1 point | Per page |
| Scroll depth — 75% | 2 points | Per page |
| Scroll depth — 100% | 3 points | Per page |
| CTA hover | 1 point | Interest signal |
| CTA click | 5 points | Strong intent signal |
| Search query — general | 3 points | Any semantic search |
| Search query — service specific | 5 points | Named service in query |
| Search query — urgency language | 8 points | Today, emergency, now, urgent |
| AI widget — general question | 4 points | Any question asked |
| AI widget — service specific question | 6 points | Specific service named |
| AI widget — urgency language detected | 10 points | Immediate Emergency evaluation |
| AI widget — additional questions | 2 points each | Per question after first |
| Lead Grabber — email request | 8 points | Willing to engage, lower urgency |
| Lead Grabber — speak to someone now | 14 points | Near-conversion signal |
| Lead Grabber — phone number provided | 10 points + Tier 1 | Immediate attribution upgrade |
| ViewRoom — entry | 10 points | Name captured at entry |
| ViewRoom — AI question asked | 3 points each | Per question |
| ViewRoom — PDF downloaded | 6 points | Document type weighted |
| ViewRoom — rep invited | 12 points | Near-conversion signal |
| ViewRoom — appointment booked | 25 points | Conversion event |
| FotoJobber — submission | 15 points | Near-conversion signal |
| FotoJobber — urgency in annotation | 8 points additional | AI reads annotation text |
| Visualizer — session opened | 8 points | Active Project signal |
| Visualizer — own photo uploaded | 12 points | Personal commitment signal |
| Visualizer — product selected | 4 points each | Per selection |
| Visualizer — result saved | 15 points | Near-conversion. Attribution attempt. |
| Visualizer — result shared | 18 points | Strong purchase intent |
| Return session — second visit | 5 points | Added to carried score |
| Return session — third visit | 8 points | Added to carried score |
| Return session — fourth or more | 10 points | Added to carried score |
| A2P inbound — SMS received | 10 points | Tier 1 attribution from phone number |
| A2P inbound — call received | 12 points | Tier 1 attribution from caller ID |
| A2P inbound — after hours contact | 8 points additional | Time-of-day urgency weight |

## **Bucket assignment thresholds**

| **Bucket** | **Assignment condition** |
| --- | --- |
| Emergency | Any single Emergency page visit, urgency search query, urgency AI widget message, or after-hours call. Score irrelevant. Immediate override of all other buckets. |
| Active Project | Score 50 and above with at least one of: pricing page visit, CTA click, FotoJobber submission, or Visualizer result saved. |
| Comparison | Score 35 to 49. Or score above 35 with review page visit or multiple sessions without conversion action. |
| Research | Score below 35 with content page engagement and no conversion actions. |
| Unclassified | Score below 15 with insufficient signal to assign a bucket. |

## **Bucket transition rules**

- Emergency fires at any point and overrides all other buckets immediately. No exceptions.

- Buckets move forward toward conversion or laterally to Emergency. They do not downgrade.

- Research → Comparison: third session with no CTA, or first review page visit, or score crosses 35 threshold.

- Research → Active Project: quote request, pricing page visit, FotoJobber submission, or Visualizer result saved.

- Comparison → Active Project: form start, estimate CTA click, or booking language in any channel.

- Any bucket → Emergency: urgency language detected, after-hours contact, emergency page visit.

- Inactivity reset: Emergency 14 days, Active Project 90 days, Comparison 60 days, Research 180 days. After expiry bucket resets to Unclassified on next contact. History retained.

# **Section 8 — The Intent Reader**

The Intent Reader is a real-time evaluation layer that sits between the event stream and the Classify layer. It watches every signal as it arrives — within a session, across channels, across time — and continuously asks: has this person's intent shifted since the last classification.

It is not a replacement for CL1, CL2, and CL3. It is the continuous feed that keeps classification current between events. CL2 Event Mining is a point-in-time snapshot. The Intent Reader is the live feed.

## **What it watches**

- Behavioral velocity — how fast the person is moving through the session. Slow and broad is Research. Fast and focused is Active Project. Rapid and urgent is Emergency.

- Language shift — urgency language, pricing language, comparison language, research language. Weighted by recency. Last 30 seconds matters more than 2 minutes ago.

- Channel escalation — moving from low-commitment to high-commitment channel mid-session. Reading the website then calling is Active Project or Emergency signal.

- Tool engagement — ViewRoom entry, FotoJobber submission, Visualizer photo upload. Each tool interaction produces a score delta and may trigger immediate bucket reassignment.

## **What it outputs**

A confidence delta on the current Engagement Score. When the delta crosses a threshold in either direction, a bucket transition fires. Below threshold, the system holds the current bucket and keeps watching. The Intent Reader writes the current state back to the hub in real time so abrupt session endings preserve the last known state.

# **Section 9 — The Four-Layer Architecture**

| **Layer** | **Name** | **What happens** |
| --- | --- | --- |
| Layer 1 | Capture | Providers split into two streams. Contact events normalized, validity checked, attributed, and tiered. Market intelligence routed to Context Store. Noise filtered. |
| Layer 2 | Classify | Tier 1 and 2 events classified. Intent inferred via hub lookup and event mining. Context Store read to enrich inference. Confidence scored. Context package sealed. |
| Layer 3 | Decide | 7-stage pipeline runs against classified context. Intent bucket and both confidence scores are live inputs at every stage. Tier 2 events held until confidence upgrades. |
| Layer 4 | Act | Right action through right channel at right moment. **Outbound** actions (immediate response, sequence trigger) require Tier 1 — Tier 2/2B never reach these, as there is no channel to reach them on. **On-page Site Personalization is not channel-based** and does reach Tier 2/2B (Tier 1 unconditional; Tier 2/2B once score crosses 35) — it changes what a live visitor sees, it doesn't contact anyone. Tier 3 never reaches this layer under any circumstances. |

## **Layer 2 components**

| **Component** | **What it does** |
| --- | --- |
| CL1 — Hub lookup | Hub resolve call using all identifiers. Reads existing bucket, session history, relationship tier. Upgrades Tier 2 if new event increases confidence past threshold. |
| CL2 — Event mining | Infers intent from event content and Context Store. Service type, channel, time, content analysis, watch market demand state. Runs on all Tier 1 and 2 events. |
| CL3 — Classification output | Seals context package. Locks: intent bucket, event confidence score, attribution confidence score, relationship tier, context package. |

## **Layer 3 — 7-stage pipeline intent integration**

| **Stage** | **Current behavior** | **Intent integration** |
| --- | --- | --- |
| S1 — Event intake | Normalize, enrich, match, AI extract. | Both confidence scores and context package already attached. No change to existing 15 steps. |
| S2 — Signal detection | Evaluate 40 signal rules. | Bucket is a rule condition. Emergency suppresses low-urgency signals. Attribution confidence can suppress signals below threshold. |
| S3 — Orchestrator | Rank signals, select action. | Bucket modifies action selection. Emergency hardcoded first. Low attribution confidence restricts action set to same-channel only for Tier 2. |
| S4 — Action queue | Attach parameters, set SLA, assign lane. | Bucket sets execution lane. Emergency → auto, compressed SLA. Research → manual or blocked. |
| S5 — Execution | Run auto, create drafts, preserve blocked. | No change. |
| S6 — Outcome | Record, preserve, log. | Both confidence scores and bucket recorded in outcome. |
| S7 — Feedback | Signal validity, tuning candidates. | Both confidence dimensions and bucket accuracy added as feedback metrics. |

## **Layer 4 outputs**

| **Output** | **When it applies** |
| --- | --- |
| Immediate response | Tier 1, Emergency or Active Project, auto lane cleared. A2P within defined SLA. |
| Sequence trigger | Tier 1, Research or Comparison. Nurture sequence. Soft follow-up. |
| Site personalization | Website-originated Tier 1 events. Push engine receives bucket and Engagement Score. Dynamic sections update. |
| No action | Noise. Tier 2 held. Tier 3. Low confidence. Blocked by safety rule. Log only. |

# **Section 10 — The Orchestrator**

The Orchestrator is a predictive decision engine. It reads the full picture — the Engagement Score, its velocity and trajectory, the individual's session history, and the anonymized trajectory patterns from the Cohort 2 network — and determines the most probable path to a booked job.

## **Three inputs to every Orchestrator decision**

- Individual trajectory — current Engagement Score, velocity, direction, full session history from hub. How fast has this score grown. Has it stalled. How many sessions. How many channels touched. How long since last contact.

- Cohort 2 network pattern — across all licensed ClearSky clients, what does the Engagement Score trajectory look like for contacts that converted at this score level with this bucket. What action was taken. Did it result in a booked job. The network grows more accurate every month.

- Current context — watch market demand state from ContentRadar. Time of year. Local competitive signal. Business availability. Open quotes.

## **Prototype Orchestrator — rules-based decision table**

At launch the Cohort 2 network has no data. The prototype Orchestrator uses a rules-based decision table. As the network matures, the decision table is replaced by the predictive model. The interface stays the same. The intelligence deepens over time.

| **Condition** | **Action selected** |
| --- | --- |
| Emergency bucket · any score · Tier 1 | Immediate A2P response. Call within 15 minutes. |
| Active Project · score above 65 · Tier 1 · no FotoJobber submitted | FotoJobber prompt. Surface with show-us-your-space CTA. |
| Active Project · score above 65 · Tier 1 · FotoJobber submitted | ViewRoom invitation. Quote consultation with rep. |
| Comparison · score above 50 · Tier 1 · no Visualizer session | Visualizer prompt. See what's possible in your own home. |
| Comparison · score above 60 · Tier 1 · Visualizer result saved | ViewRoom invitation. Saved design pre-loaded in room. |
| Research · score above 35 · Tier 2 | Soft content offer. No ViewRoom. No FotoJobber. Nurture path. |
| Research · score below 35 · Tier 3 | No action. Context only. |

# **Section 11 — ContentRadar**

| **ContentRadar is a signal detector. Not a content factory. It identifies when something is worth paying attention to — and then a human evaluates whether and how to act on it.** |
| --- |

Sudbury is the primary watch market for Timmins — the canary. A Northern Ontario city that shares the same climate, housing stock profile, and trades service economy but sits 4 to 6 weeks ahead of Timmins in search behaviour due to population size and proximity to southern Ontario demand patterns.

## **Flag taxonomy — deterministic conditions**

| **Flag type** | **Condition that triggers it** |
| --- | --- |
| Content gap flag | 5 or more FAQ-type questions on the same topic submitted through any channel in 48 hours. |
| Spiking flag | Watch market keyword crosses 200% above 90-day baseline in Sudbury or other watch markets. |
| Rising flag | Watch market keyword crosses 50% above 90-day baseline. |
| Cluster flag | Multiple related keywords spiking simultaneously. Indicates broader demand event. |
| Query flag | 3 or more Emergency bucket visitors arriving via the same search query in 24 hours. |
| Page gap flag | High Engagement Score visitors leaving without converting after visiting a specific page. |
| Competitor gap flag | Cohort 1 business publishes content on topic where licensed client has no coverage. |
| Trend flag | Multiple top-performing Cohort 1 businesses publish on the same topic within a short window. |
| Compliance flag | Regulatory change announced affecting the trade in this market. |
| Seasonal flag | Seasonal trigger approaching — temperature forecast, permit season, rebate program. |

## **The flag response process**

Flag fires → support person receives flag with triggering condition, signal data, affected clients, recommended content response, and urgency window → support person evaluates signal quality and confirms content response is appropriate → selects source URLs from pre-vetted library tagged by topic → directs scraper at those sources → structured content delivered to CMS → editor light review → publishes to contractor site content strip.

ViewRoom AI questions are a ContentRadar signal source. Questions visitors ask in the ViewRoom feed the deterministic flag conditions. The system learns from its own conversations.

# **Section 12 — Storage: Hub and Context Store**

## **Communication Hub — profile and session persistence**

The hub stores everything attributable to an individual. It is a profile and session database — not an AI memory system. The Classify layer reads from it on every incoming event to avoid starting from zero on known contacts.

- Tier 1 events write complete session record: both confidence scores, bucket, Engagement Score, velocity, relationship tier, tools used, outcome.

- Tier 2 events write pending profile with attribution confidence score and all available data. Status: pending_attribution.

- Tier 2 profiles activate when a subsequent touch upgrades attribution confidence to Tier 1 threshold. All prior Tier 2 data becomes available to the full pipeline.

- Outcome data from S7 Feedback feeds back into CL1 hub lookup on future events from the same contact.

## **Context Store — market and environmental intelligence**

Holds data with no individual attribution. Read-only resource for CL2 Event Mining. Never connects to profiles, session IDs, or customer-facing actions.

- Watch market keyword demand states from ContentRadar and DataForSEO.

- SERP rankings, competitor signals, aggregate analytics.

- Stream B events and Tier 3 Stream A events that carried service or urgency signals but no attributable identity.

# **Section 13 — The Intent-Aware Dynamic Website**

The contractor website is not a static marketing site with swapped content blocks. It is a responsive surface that reconfigures itself around each specific visitor's position in the customer journey, updated in real time by the Intent Reader.

## **Six dynamic elements that adapt**

| **Element** | **How it adapts** |
| --- | --- |
| Hero | Full above-the-fold reconfiguration. Headline, imagery, primary CTA, trust signal all shift together based on bucket and persona. |
| Proof block | Selects 2-3 proof points most likely to resonate with this persona at this bucket position. Not all proof points — the right ones. |
| Content strip | Educational for Research. Differentiating for Comparison. Process-oriented for Active Project. Watch market signal content when ContentRadar flags are active. |
| Form | Length determined by Engagement Score. 0-30 full form. 31-60 reduced. 61-80 name and phone. 81-100 phone only. Pre-populated from prior session data. |
| CTA | Text, placement, and destination adapt to bucket. Emergency: single CTA, all else suppressed. Research: soft no-obligation CTA only. |
| Urgency signal | Used selectively when real demand exists. Calibrated to persona. Never manufactured urgency. |

## **The visitor state data source**

The existing dynamic section engine watches database objects for state changes — jobs, products, news, promotions. For ClearSky, visitor state is added as a new data source alongside the existing ones. When visitor state changes — Engagement Score crosses a threshold, bucket transitions — the relevant sections re-render exactly the same way they do when a job status changes.

## **Persona calibration layer**

Within each bucket variant, persona conditions refine the content further. Two visitors in the same bucket at the same Engagement Score see different pages if their persona profiles differ.

| **Persona input** | **What it drives** |
| --- | --- |
| Age band | Communication style and channel preference. Older homeowners: phone-first, longevity proof points. Younger: text-first, speed and transparency. |
| Property type and age | Service relevance. 1960s housing stock has different plumbing profile than 2010 build. Surfaces relevant service proof points. |
| Income band | Price sensitivity and form framing. Financing options surfaced for price-sensitive segments. |
| Family status | Urgency weighting. Family with young children treats Emergency differently. Safety proof points elevated. |
| Communication history | Channel preference from prior interactions. Respects what has worked before. |
| ViewRoom engagement | Questions asked, PDFs downloaded. Informs what the visitor already knows and what objections they likely have. |

# **Section 14 — Marketing Execution Engine**

The Marketing Execution Engine translates the Orchestrator's predicted path into a sequenced marketing programme for this specific person — messages, channels, timing, and content all generated programmatically from the Engagement Score, persona profile, ContentRadar signals, and Cohort 2 conversion patterns.

## **Programmatic marketing triggers**

| **Trigger** | **Response** |
| --- | --- |
| Engagement Score crossing bucket threshold | Bucket-appropriate content delivered through persona-preferred channel. |
| ContentRadar Spiking flag for relevant service | Watch market content served to Research and Comparison visitors in that service category. |
| Stalled trajectory — score flat 3+ weeks | Reactivation touchpoint. Not another push. A different angle. |
| Visualizer result saved, no ViewRoom entry in 48 hours | ViewRoom invitation referencing the saved design. |
| FotoJobber submitted, no response in defined SLA | Escalation to human rep. A2P notification. |
| ViewRoom appointment booked | Confirmation sequence. Pre-appointment content. Post-appointment follow-up. |

The goal is one thing. A booked job. The Marketing Execution Engine exists to move this specific person toward that outcome using everything the system knows about where they are, who they are, and what has worked for similar people at similar points in their journey.

# **Section 15 — The Prototype Contractor**

| **Everything is real except the name. Real market, real trade, real competitive context, real proof points, real seasonal signals. Abstract name only.** |
| --- |

## **Business profile**

| **Field** | **Value** |
| --- | --- |
| Market | Timmins, Ontario |
| Trade | Plumbing |
| Years in business | 6 years |
| Team | 2 licensed plumbers + 1 office support person |
| Owner status | Owner still on the tools. Hands-on. Knows every job personally. |
| Service area | Timmins · Schumacher · South Porcupine · Matheson · Iroquois Falls |
| Emergency response | 45 minutes within Timmins proper. 24/7/365. |
| Licensing | Both plumbers fully licensed. TSSA certified for gas work. Full liability insurance. |
| Name placeholder | [Surname] Plumbing |

## **Service mix**

| **Service** | **Priority** |
| --- | --- |
| Emergency plumbing — burst pipes, frozen pipes, flooding, no hot water | Highest urgency. Highest immediate conversion rate. |
| Water heater replacement and repair | Second highest demand. Strong seasonal signal in aging housing stock. |
| Drain cleaning and repair | Consistent year-round. High repeat customer rate. |
| Bathroom renovation | Higher ticket. Longer cycle. Strong Visualizer use case. Peak in shoulder seasons. |
| Sump pump installation and replacement | Strong spring demand. Watch market signal arrives 4-6 weeks early from Sudbury. |
| General plumbing — fixtures, pipe repair, kitchen, maintenance | Bread and butter. Fills schedule between larger jobs. |

## **Proof points ranked by conversion weight**

| **Proof point** | **Value** |
| --- | --- |
| Google review score | 4.7 stars. 64 reviews. Recent reviews weighted prominently. |
| Owner-operated | You deal with the owner directly. Personal accountability on every job. |
| Response time | Emergency calls answered within 45 minutes. Owner often responds personally. |
| Licensed and insured | Both plumbers fully licensed. TSSA certified. Full liability insurance. |
| Local and independent | Started in Timmins. Built in Timmins. Not a franchise. Not a chain. |
| Warranty | 1 year parts and labor on installations. 90 days on service calls. |
| Growth | From one person to a team of three in 6 years. Built on referrals and reputation. |
| Office support | A real person answers every call during business hours. No voicemail. |

## **Voice and personality**

Direct and honest. No upselling pressure. Explains what the problem is and what it costs to fix it before starting work. Owner-operated means the person who answers the phone is the same person who stands behind every job. Timmins-genuine. Knows the housing stock in this town personally. Slightly dry Northern Ontario matter-of-factness. Never slick. Never corporate.

## **Visual direction**

Deep charcoal and warm amber. Professional without being corporate. Strong without being aggressive. Real job photos, real team, real Timmins locations. No stock imagery. Clean readable typography. Legibility over elegance. A website that looks like it belongs to a real contractor who has been working in this community for six years.

## **Watch market**

Sudbury is the primary canary. Sault Ste. Marie and Thunder Bay as secondary watch markets. Key seasonal signals: frozen pipe demand spiking in Sudbury 4-6 weeks before Timmins peak. Sump pump demand rising with snowmelt forecast. Water heater failures accelerating with temperature drops in aging housing stock.

# **Section 16 — Prototype Build Sequence**

Seven builds in strict priority order. Each verified before the next begins. The goal is a working demonstration that tells the complete story from anonymous first touch to booked job.

| **Build** | **Component** | **What gets built** |
| --- | --- | --- |
| Build 1 | Pixel | JavaScript behavioral event capture. Fires on page load, scroll depth, dwell time, CTA interactions, form field engagement, semantic search queries, ViewRoom entry, FotoJobber submission, Visualizer events. Passes all events to Intent Reader with session ID and timestamp. |
| Build 2 | Intent Reader | Receives pixel events. Calculates Engagement Score from deterministic input table. Evaluates bucket assignment rules. Fires bucket transitions at defined thresholds. Pushes visitor state to dynamic section rendering layer. Connects to existing A2P profile logic for identity resolution. |
| Build 3 | Visitor state data source in CMS | Extend dynamic section configuration to accept visitor state as content source alongside existing database state sources. Add bucket and Engagement Score range as rule conditions. Three sections on contractor homepage: hero, proof block, content strip. |
| Build 4 | Contractor homepage variant library | Five variants per dynamic section — Emergency, Active Project, Comparison, Research, Default. Fifteen content configurations total. Content work in the CMS. Not engineering. Must complete before Build 3 can be tested. |
| Build 5 | Profile creation with two confidence dimensions | Extend existing profile logic with event validity confidence check and attribution confidence check as separate sequential evaluations. Implement tier assignment logic. Tier 2 hold and upgrade triggers. |
| Build 6 | ContentRadar flag interface | Simplified flag detection monitoring two deterministic conditions: 5+ FAQ questions on same topic in 48 hours, and watch market keyword crossing 200% above baseline. Support dashboard for flag review, source URL selection, scraper direction, and content approval. |
| Build 7 | Simplified Orchestrator and integrations | Rules-based decision table connecting Engagement Score and bucket to tool selection. Lead Grabber SLA rules connected to A2P bucket-aware escalation. ViewRoom, FotoJobber, and Visualizer events connected to Intent Reader. AI widget knowledge base populated from contractor CMS content. |

# **Section 17 — Prototype Demonstration Flow**

The prototype tells a complete story in two parallel paths demonstrated simultaneously. The live contractor site on one side. The dashboard showing visitor state, session ID, Engagement Score, bucket assignment, and profile creation on the other.

## **Path A — The engaged visitor**

Anonymous visitor arrives on the contractor homepage. Pixel fires. Session ID assigned. Intent Reader starts watching. Score: 0. Bucket: Unclassified.

Visitor browses homepage. Scrolls. Dwell time accumulates. Score rises to 18. Research bucket assigned. Dynamic sections respond — educational hero, FAQ proof block, helpful content strip.

Visitor uses semantic search — 'how much does bathroom renovation cost.' Score rises to 26. Content strip updates to surface relevant cost guide content.

Visitor navigates to bathroom renovation service page. Score rises to 32. Dwell time 90 seconds. Score hits 38. Comparison threshold crossed. Bucket transitions. Dashboard shows the transition. Hero shifts to social proof. Proof block surfaces review count and trust badges.

Visualizer prompt appears in content strip. Visitor clicks. Opens Visualizer. Score jumps to 46. Uploads own bathroom photo. Score jumps to 58. Active Project threshold met. Bucket transitions. Dashboard shows it. Hero shifts to estimate CTA. Form shortens.

Visitor selects three fixture combinations. Score rises to 66. Saves result. Popup: 'Send this to your email.' Email provided. Event confidence: high. Attribution confidence: high. Tier 1. Profile created instantly. Dashboard shows profile creation with full session history attached.

Orchestrator reads state. Active Project, score 68, Visualizer result saved, Tier 1. Decision table: ViewRoom invitation. 'Let's talk through your design.' Invitation appears on page.

Visitor clicks. ViewRoom opens. Saved design pre-loaded. AI knowledge base ready. Visitor asks two questions about fixture costs and installation time. Score rises to 74. Rep notified on mobile. Rep joins on back camera showing comparable completed bathroom renovation.

Visitor asks about booking. Appointment calendar opens in ViewRoom. Appointment booked. Score hits maximum. Conversion event recorded. Profile updated with full session trace. Pattern recorded in Cohort 2 network.

## **Path B — The direct contact visitor**

Different visitor. Lands on homepage. Doesn't browse. Types into Lead Grabber AI widget: 'I need a plumber today my pipe is leaking.' Urgency language detected immediately. Score: 18 plus 10 urgency bonus = 28. Emergency bucket evaluation fires. Emergency confirmed.

AI widget responds immediately: 'We can help right now. Can I get your phone number so our team can call you within 15 minutes?' Phone number provided. Attribution confidence: high immediately. Tier 1. Profile created. Emergency bucket. A2P fires. Dashboard shows the entire sequence in real time. Human calls within 15 minutes.

## **ContentRadar demonstration**

Separately from both paths — show the ContentRadar flag flow. Five FAQ questions about frozen pipes submitted across platform in 48 hours. Flag fires in support dashboard. Support person sees: flag type, triggering condition, affected client markets, recommended content response, urgency window. Support person selects source URLs from pre-vetted Sudbury plumbing sources library. Scraper runs immediately outside cron schedule. Structured content lands in CMS. Editor light review. Publishes to content strip. Research visitors on the contractor site now see frozen pipe content in real time.

# **Section 18 — The Business Model**

## **The protected market**

One contractor per trade per market. The Timmins plumber on ClearSky is the only plumber in Timmins on ClearSky. Every tool, every signal, every Cohort 2 trajectory pattern works exclusively for them in their geography. A competitor cannot buy the same advantage in the same market.

## **The performance guarantee**

6-month money-back guarantee if ClearSky cannot produce a 20% increase in revenue. Rory chooses whether to extend it to each client based on selection criteria. The guarantee is a quality control mechanism — it forces rigorous client selection and keeps the success rate high.

## **Selection criteria before extending the guarantee**

- Business must have capacity to absorb 20% more work.

- Minimum Google review score of 4.2.

- Technical onboarding requirements met within 30 days or guarantee clock pauses.

- Market must not have a structural problem outside the system's control.

- Service quality must be maintainable under increased volume.

## **The 90-day assessment gate**

At 90 days an internal assessment runs. System technically healthy, all integrations working, Engagement Score data accumulating correctly, trajectory pointing toward 20% by month 6. If client obligations are unmet the guarantee pauses with documented evidence. If system is underperforming despite healthy conditions there are 3 months to recalibrate before the window closes.

## **Revenue growth levers**

| **Lever** | **Timeline** |
| --- | --- |
| Conversion rate improvement — right response at right moment through right channel. 20-40% lift on qualified contacts. | 30-90 days |
| Lead capture improvement — intent-matched content captures contacts that would have bounced. 15-35% more identified contacts from same traffic. | 60-180 days |
| Emergency response speed — responding within 5 minutes versus 1 hour. 80%+ conversion rate difference. | Day 1 |
| Stalled contact reactivation — Engagement Score trajectory identifies stalled vs. lost. 20-30% of stalled contacts reactivated. | 60-120 days |
| Watch market content advantage — appearing in search 4-6 weeks before competitors for rising keywords. | 90-180 days |

# **Section 19 — What Does Not Change**

| **These items are locked. No build work modifies them without explicit instruction.** |
| --- |

- The 7-stage pipeline workflow: Event, Signal, Orchestrator Decision, Action Queue, Execution, Outcome, Feedback. Do not rename or reorder.

- The non-negotiable system boundaries: public replies require human approval, every decision is auditable, blocked actions are preserved, nothing posts automatically.

- The hub integration spec: event schema, JWT token format, three API endpoints, five-step merge logic. Additions are additive only.

- The marketing automation rules configuration for plumbing: bucket assignment rules, push decision table, on-site recognition, engagement score thresholds.

- The ContentRadar architecture: two cohorts, 72 signals, three scoring methods. Not modified. Its outputs feed the Context Store.

- The SHA-256 hashing convention for profile resolution. Must be formally agreed between teams before Phase 1 build begins.

- The two confidence dimensions. Event validity confidence and attribution confidence are permanently separate scores. Never combine them.

- The same-channel response rule for Tier 2. Tier 2 events can respond in the same channel only. Cross-channel actions require Tier 1 attribution.

ClearSky Software  ·  Intent-Aware Decision System  ·  Master Architecture Document  ·  May 2026  ·  Confidential

Rory Dredhart  ·  r.dredhart@clearskysoftware.net  ·  705-274-9564