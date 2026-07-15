ClearSky Software — Confidential — Internal Document

**Default Rules-Based Decisioning Logic**

Plumbing Configuration — Developer Implementation Reference

April 2026

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564

| *This is the baseline configuration every plumbing client starts from. It runs from day one with zero training data. Per-client overrides are applied at onboarding by the ClearSky team. The client never configures this directly.* |
| --- |

# **Bucket Assignment Rules**

Evaluated in priority order. Emergency checked first. First rule that fires wins. Reassignment happens dynamically when behavior changes within the session.

## **Emergency — evaluated first, highest priority**

Assign Emergency if any single one of the following is true:

- Visitor lands on a page whose URL contains: /emergency, /urgent, /burst-pipe, /flood, /no-hot-water, /blocked-drain, /leak — or page title contains: emergency, urgent, same day, 24 hour, after hours

- Visitor is on mobile AND scrolled past 60% of page depth within 30 seconds of landing

- Visitor clicked a call now or text us CTA within the first 60 seconds of the session

- Visitor arrived via search query containing: emergency, urgent, right now, today, 24 hour, same day

## **Active Project — evaluated second**

Assign Active Project if two or more of the following are true:

- Visited a pricing, quote, or estimate page

- Started or partially completed a quote request form

- Clicked a get estimate, book now, request a quote, or schedule CTA

- Visited a service detail page after visiting the homepage

- Session is visit 2 or greater AND prior session included a CTA click or form start

## **Comparison — evaluated third**

Assign Comparison if two or more of the following are true:

- Visited reviews, testimonials, or about page

- Visited a gallery or before/after page

- Spent more than 90 seconds on a reviews page

- Session count is 2 or greater with no prior form start or CTA click

- Arrived from a vs, near me, or best plumber search query

## **Research — evaluated fourth, default bucket**

Assign Research if none of the above and any of the following are true:

- Visited a blog post, FAQ, guide, or informational content page

- Spent more than 120 seconds on a single content page with no CTA interaction

- Viewed three or more pages with no CTA click and no form interaction

## **Dynamic reassignment triggers**

- Emergency signal fires at any point — always overrides any other bucket, no exceptions

- Form start or quote request CTA click mid-session — reassign to Active Project unless Emergency already assigned

- Research visitor navigates to pricing page — reassign to Comparison unless a CTA click follows within 60 seconds

- Research visitor on third session with no explicit signals — reassign to Comparison

# **In-Session Push Decision Table**

Five adaptable elements: hero CTA text and destination, form length and pre-population, proof blocks surfaced or suppressed, content strip relevance, urgency signals. All pushes run inside approved content blocks only.

| **Bucket** | **Visit** | **Hero CTA** | **Form** | **Proof blocks** | **Urgency** |
| --- | --- | --- | --- | --- | --- |
| Emergency | 1 | Call Now — We Answer 24/7 → click-to-call. Secondary: Text Us | Suppress multi-field form. Single field: phone only. Label: We’ll call you back within 15 minutes. | Response time proof above all. Service area confirmation. Suppress review count and warranty. | Available now — call to confirm. Or static fallback if availability not configured. |
| Emergency | 2+ | Same. Add above-hero strip: Welcome back — still need help? | Same as visit 1 | Same as visit 1 | Escalate: We’re available right now |
| Active Project | 1 | Get Your Free Estimate — Takes 2 Minutes → quote form | Full form. Pre-populate service type if inferable from page visited. | Pricing transparency signal. Process overview. One strong review matching apparent service interest. | Book this week — slots filling fast — if scheduling signals configured. Suppress if not. |
| Active Project | 2 | Ready to Book? Let’s Talk → booking or contact page | Shortened. Remove optional fields. Pre-populate from prior session. | Suppress any proof block visitor has already seen. | We held a slot for you this week — if scheduling configured. |
| Active Project | 3+ | Let’s Get This Booked → direct booking link | Single field: phone only. Label: We’ll call to confirm your booking. | Single strongest unseen review. Guarantee or warranty signal. | Maximum appropriate urgency. |
| Comparison | 1 | See Why 200+ Timmins Homeowners Choose Us → reviews page | Do not surface quote form. Soft CTA: Have a question? We’ll answer it — no obligation. | Review count prominent. Warranty. Before/after gallery thumbnail. Trust badges. | Suppress. Replace with: No pressure — happy to answer questions first. |
| Comparison | 2 | Same if reviews not visited. If visited: Get Your Free Estimate | Same as visit 1 | Suppress seen proof blocks. Surface next strongest unseen element. | Suppress |
| Comparison | 3+ | Get Your Free Estimate → quote form | Soft form: name, phone, what are you looking for help with? | Single strongest unseen review. Guarantee. | Soft: Most homeowners who visit three times end up booking. |
| Research | 1 | Not sure what you need? Our free guide explains your options → guide or FAQ | Do not surface quote form. Email capture only if lead magnet exists. | FAQ snippets. Content teasers. Suppress pricing and booking proof. | Suppress. Nurture signal: We send helpful plumbing tips once a month. |
| Research | 2 | Same. If content consumed: Ready to talk through your options? | Same as visit 1 | Same as visit 1. Surface next logical content from prior visit. | Suppress |
| Research | 3+ | Not sure yet? Let’s talk — no pressure → soft contact or callback | Minimal: name and phone. Label: We’ll call to answer your questions. | One strong review addressing common hesitation. Guarantee. | Soft reassurance only |

# **On-Site Recognition — Return Visit Adaptations**

| **Session count** | **Adaptation** |
| --- | --- |
| 1 — First visit | No recognition. Default page state. All four buckets in play. System begins capturing state. |
| 2 — Decision orientation | Emergency: call CTA surfaced immediately above hero on page load. Active Project: pre-surface quote form with pre-populated fields. Comparison: skip informational hero, surface proof blocks immediately. Research: surface next logical content piece in sequence from prior visit. |
| 3+ — Direct close | All buckets except Research: primary conversion CTA in first viewport regardless of page type. Emergency: surface free call-out no obligation if approved. Active Project: direct booking link or held slot message. Comparison: single strongest review alongside primary CTA. Research: reassign to Comparison — third return visit indicates readiness. |

# **Engagement Score Thresholds for Form Length**

| **Engagement score** | **Form presented** | **Rationale** |
| --- | --- | --- |
| 0–30 | Full form, all fields | Early stage visitor. Full context needed. |
| 31–60 | Remove optional fields. Keep: name, phone, service type, preferred timing. | Engaged but not committed. Reduce friction. |
| 61–80 | Name and phone only. Service type pre-populated if inferable. | High engagement. Remove every barrier. |
| 81–100 | Phone only. Label adapted to bucket. | Maximum intent. One field. One action. |

Engagement score calculated per session from: pages viewed weighted by page type, time on site, CTA clicks, form interactions, prior session history including session count, prior bucket, and prior conversion moments.

ClearSky Software — Default Rules-Based Decisioning Logic — Plumbing Configuration — April 2026 — Confidential

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564