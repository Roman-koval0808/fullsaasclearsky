**CLEARSKY SOFTWARE  **Developer Brief — Serhii

**CLEARSKY SOFTWARE  ·  Developer Brief**

**For Serhii — ClearSky BI Platform · Sections 5, 8 and 6**

| **Prepared by** | Rory Dredhart — ClearSky Software |
| --- | --- |
| **Date** | May 2026 — Session 6 Handoff |
| **Priority** | Start immediately — Sections 5 and 8 are the foundation for everything else |
| **Primary reference** | ClearSky_Developer_Roadmap.docx — read this first, before anything else |
| **Questions to** | r.dredhart@clearskysoftware.net · 705-274-9564 |

# **What You Are Building**

Three standalone HTML demo files for the ClearSky Business Intelligence Platform. These are not connected to a backend — they are self-contained interactive demos used to present the platform to clients and stakeholders. All architecture decisions are locked. Your job is to build from the spec, not design the system.

| *Visual language is locked. Use IBM Plex Mono for all labels, values, and code. Use DM Sans for body and UI. Light mode only. Colour tokens: green #0A7C45, red #B91C1C, amber #92600A, blue #1D4ED8, purple #6D28D9, teal #0D7F78, background #F2F4F7. Reference clearsky-simulator__2_.html and clearsky-section5-intent-buckets.html for the exact component patterns.* |
| --- |

# **File 1 — clearsky-section5-intent-buckets.html**

**Status: COMPLETE — already built. Add to project folder as-is. No changes needed.**

This file demonstrates the Four Intent Bucket system — the classification engine that drives every content and action decision in the platform. It is one of the two foundation demos. Everything else depends on the concepts shown here.

## **What is in the file**

- Four bucket definition cards — Emergency, Active Project, Comparison, Research — colour-coded with definitions and assignment rules

- No-downgrade rule panel — visual showing that within a session buckets can only rise, never fall

- Cross-session demotion demo — interactive slider advancing through Day 4, Day 7, Day 21 — shows that both score decay AND idle time must exceed their thresholds simultaneously before demotion fires

- Emergency override demo — click the button, watch the system fire immediately from a Comparison bucket session regardless of score

- Animated visitor journey — four steps from Research through Emergency with the RightFlush website adapting its layout at each stage. Auto-play button included.

- Tool response matrix — every tool (A2P, FotoJobber, ViewRoom, Visualizer, AI Widget, Lead Grabber, Booking, ContentRadar) shown against every bucket

# **File 2 — clearsky-section8-engagement-score.html**

**Status: COMPLETE — already built. Add to project folder as-is. No changes needed.**

This file demonstrates the Engagement Score — the real-time deterministic number (0–100) that drives bucket assignment and all Orchestrator decisions. It is the second foundation demo.

## **What is in the file**

- Dual score display — score_raw (cumulative, never decays, audit trail) vs score_live (what the Orchestrator reads, decays when visitor is idle)

- **Interactive decay simulator — **bucket selector (Emergency / Active Project / Comparison / Research), day-slider from 0 to 90, shows grace period in green before decay begins, then decay curve in real time across all four buckets simultaneously

- Full delta table — every event with its base delta, negative events (form_abandon −8, rage_click −5, appt_no_show −15) highlighted in red, path multipliers with calibration caveats

- **Trajectory visualiser — **two visitors both at score 55. Marie T. rising (Orchestrator fires FotoJobber prompt). Anonymous visitor cooling after a form abandon (Orchestrator holds — do not push). Same score, opposite decisions.

- Score history with negative event stream — shows the full event log for both visitors with friction labels visible

# **File 3 — clearsky-section6-customer-journey.html**

**Status: COMPLETE — already built. Add to project folder as-is. No changes needed.**

This file tells Marie Tremblay's complete story — one honest day from an anonymous visit at Tim Hortons through to a confirmed appointment booking that evening. Every identity signal is shown at its accurate confidence level.

## **The seven timeline nodes**

| **Node 1 · 7:42 AM** | Tim Hortons · Bell LTE. Carrier NAT IP discarded. Cookie set. Fingerprint collected. Tier 5 anonymous. Score 0→24. |
| --- | --- |
| **Node 2 · 9:15 AM** | Office · corporate WiFi · same iPhone. Cookie + FP match 94%. Corporate IP discarded. Tier 3 clean. Score →43. |
| **Node 3 · 12:30 PM** | Lunch · same iPhone. Path multiplier 2.5× fires. Gallery → review sequence. Score →63. |
| **Node 4 · 7:15 PM** | Home WiFi · iPhone. Residential IP classified and stored to co-occurrence register. 30-min window open. Score →77. |
| **Node 5 · 7:22 PM** | Laptop · no cookie · no FP match. IP co-occurrence 62% — candidate only. Score starts fresh at 0. FotoJobber prompt surfaces. |
| **Node 6 · 7:45 PM** | Laptop form submitted. hub_rf_0091 created. iPhone sessions linked at 62% INFERRED. Tier 1 confirmed on laptop. |
| **Node 7 · 8:20 PM** | Rep calls iPhone. Phone call confirms profile. INFERRED → CONFIRMED. All four iPhone sessions now verified history. |

## **Also in File 3**

- Profile creation — animated six-step merge sequence. Run it, watch each API call fire in sequence with realistic timing.

- Scenario C — two-person household false positive risk. Side-by-side cards, four outcome panels, architectural principle callout.

# **File 4 — clearsky-section6b-orchestrator-dynamic.html**

**Status: COMPLETE — already built. Add to project folder as-is. No changes needed.**

Three scenarios showing the Orchestrator making decisions in real time. Navigated via three header pills.

## **Scenario A — Dynamic Sections**

- Full Orchestrator input/output panel — six inputs (page, session, web history, tier, ContentRadar, context) → six content manifest decisions

- 1440px viewport simulation — 130px left margin, 1180px content container, 130px right margin carrying the banner

- All six dynamic sections render from the manifest with decision badges showing which Orchestrator output produced each section

- Right-side banner starts collapsed (15% OFF). Tap to expand or simulate dwell_90s trigger

## **Scenario B — SMS Discount Code Reconciliation**

- Four-step animated chain — phone entered on laptop → hub resolves → A2P SMS fires with code RF-7742 → code entered on iPhone → both devices Tier 1

- Chain of custody panel explains exactly why this is deterministic (not probabilistic)

## **Scenario C — GBP Click-to-Call**

- Path A (matched caller) — tap GBP number, Telnyx intercepts, resolve timer counts to 347ms, Marie's profile surfaces in rep dashboard before call connects, live session panel shows what she is doing on the website during the call

- Path B (unknown caller) — no match, Tier 2 pending created, anonymous session visible in dashboard, "Connect session to this call" button, admin confirmation prompt with rep ID and timestamp logging

# **Critical Constraints — Do Not Change These**

| *All architecture decisions across Sessions 1–6 are locked. If something in the spec seems wrong, raise it with Rory before changing it. Do not re-litigate architecture in the build.* |
| --- |

| **score_raw** | Never decays. Only increases. Audit trail. Not what the Orchestrator reads. |
| --- | --- |
| **score_live** | Decays at read time using exponential formula. Orchestrator reads this. |
| **Mobile carrier IP** | Always discard. Never use as identity signal. Must be classified by IP block classifier. |
| **Cross-device FP match** | Cannot claim 70%+ from device signals alone when switching iOS Safari to Desktop Chrome. |
| **IP co-occurrence** | 62% candidate only. Never triggers stitch. Never transfers history. Conversion data is the only arbiter. |
| **A2P — Tier requirement** | A2P requires Tier 1. Cannot fire to Tier 3 sessions. |
| **Review replies** | AI draft only. Must queue for human approval. Cannot auto-post to GBP. |
| **No-downgrade rule** | Within a single session, buckets can only rise. Never fall. Demotion is cross-session only. |
| **Emergency bucket** | Never demotes. Never score-based. Any single emergency signal overrides everything. |

# **Three Questions That Need Answers Before Production**

The demo files work without these. But before any of this goes to production, Rory needs answers to these three items.

| **Hub session-end events** | Does the hub server write session-end events, or only receive pixel events? Bucket demotion logic must run at session end. If session-end events do not exist, they need to be added. |
| --- | --- |
| **SHA-256 normalisation** | Email and phone must be normalised identically on both frontend and hub before hashing. Email: lowercase + trim. Phone: E.164 format (+17052740988). A mismatch creates silent duplicate profiles. This must be agreed in writing before contact forms go live. |
| **IP block classifier** | A provider (MaxMind or equivalent) must be selected and integrated at the hub server. Every incoming IP must be classified as mobile-carrier, residential-broadband, or business before any identity logic runs. This blocks the co-occurrence register build. |

# **Files in the Project Folder — What to Read**

| **ClearSky_Developer_Roadmap.docx** | READ FIRST. Complete blueprint for all 8 sections. Section-by-section spec, locked values, open items. |
| --- | --- |
| **ClearSky_Session6_Handoff_Report.docx** | Session record. Architecture decisions made. Open questions. |
| **ClearSky_MA_Requirements_v3.docx** | Developer requirements v3. Pixel spec, bucket rules, hub API schema, QA test cases. |
| **clearsky-ma-hub-integration-spec.docx** | Hub integration spec. Event schema, API endpoints, merge logic, cs_token format. |
| **rightflush-pixel-readme.md** | Pixel implementation reference. firePixel() function, all events, hub payload. |
| **clearsky-simulator__2_.html** | Visual reference — component patterns, colour tokens, fonts. |
| **clearsky-section5-intent-buckets.html** | Completed Section 5 demo — visual baseline for all future builds. |
| **clearsky-section6-customer-journey.html** | Completed Section 6A — Marie's day. |
| **clearsky-section6b-orchestrator-dynamic.html** | Completed Section 6B — Orchestrator, SMS reconciliation, GBP call. |
| **clearsky-section8-engagement-score.html** | Completed Section 8 demo. |

	CONFIDENTIAL  	  Page  of