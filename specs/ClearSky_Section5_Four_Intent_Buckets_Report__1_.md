**CLEARSKY SOFTWARE  ** Section 5 — Four Intent Buckets

**CLEARSKY SOFTWARE**

Business Intelligence Platform

**Section 5**

**Four Intent Buckets**

*A complete explanation of the demo page — what every element shows,
how it works, and why it matters for the ClearSky platform.*

| **Owner** | Rory Dredhart — ClearSky Software |
| --- | --- |
| **Date** | May 2026 |
| **Session** | Session 6 — BI Platform Build |
| **Document type** | Section Explainer Report |
| **Status** | All architecture decisions final — build forward |

**CONFIDENTIAL — INTERNAL DOCUMENT**

# **1. Purpose of This Document**

This document explains every element of the **Section 5 — Four Intent Buckets** demo page built as part of the ClearSky Business Intelligence Platform, Session 6. It is written for Rory Dredhart and any team member who needs to understand what is on the page, why each element is there, and how it connects to the broader ClearSky architecture.

The demo page is a standalone HTML file. It does not require a server. It is used to explain the ClearSky intent classification system to clients and stakeholders. Every interactive element on the page is documented here — what it shows, how it works, and what it is designed to communicate.

| *All architecture decisions documented in this report are final. They were locked across Sessions 1 through 5. Do not re-litigate them. Build forward.* |
| --- |

# **2. What the Page Is and What It Does**

The Section 5 demo page is a **foundation demo** — one of two pages built first because everything else in the BI platform depends on it. The other foundation demo is Section 8 — Engagement Score. Together, Section 5 and Section 8 establish the two core concepts that every other section builds on: how visitors are classified, and how their engagement is measured.

The page has six distinct sections. This report covers each one in the order they appear on the page.

| **Section on page** | What it contains |
| --- | --- |
| **1 — Four Bucket Cards** | Definitions, assignment rules, score ranges for all four buckets |
| **2 — Assignment Rules panels** | No-downgrade rule (with visual) + cross-session demotion table |
| **3 — Emergency Override demo** | Interactive simulation of emergency signal firing |
| **4 — Cross-Session Demotion demo** | Interactive simulation of the two-condition demotion check |
| **5 — Animated Visitor Journey** | Step-by-step animation from Research through to Emergency |
| **6 — Tool Response Matrix** | Every tool shown against every bucket — what runs and what does not |

# **3. The Four Bucket Cards**

The first thing a viewer sees is a row of four cards — one per bucket. Each card is colour-coded and contains the bucket definition, its assignment rules, and its score range. The colour coding matches the rest of the ClearSky platform: red for Emergency, amber for Active Project, blue for Comparison, green for Research.

The cards communicate three things simultaneously: what the bucket means in plain English, what specific behaviours put a visitor into it, and what score range it corresponds to.

## **3.1 Emergency**

**Definition: **Immediate crisis right now. Burst pipe. No heat. Flooding. Every second matters.

Assignment rules shown on the card:

- Any single emergency signal fires immediately — no threshold, no confirmation required

- Overrides all other buckets with no exceptions — a visitor mid-session in any other bucket moves to Emergency the instant an emergency signal fires

- Never demotes cross-session — once Emergency, always Emergency until resolved

- A2P 15-minute SLA triggered instantly — the system notifies a rep within 15 minutes, no human has to be watching

**Score range: **Any score — signal override. The score is irrelevant. The bucket is assigned by signal, not by score accumulation. This is the only bucket that works this way.

## **3.2 Active Project**

**Definition: **Ready to price or book a specific job this week or month. High intent, high conversion probability.

Assignment rules shown on the card:

- Score 50 or above with at least one of: pricing page visited, CTA click, FotoJobber used, or Visualizer result saved

- Two or more Active Project signals in the current session

- Overrides Comparison and Research — a visitor who reaches Active Project does not slide back to Comparison mid-session

**Score range: **50 to 74. Above 74 is reserved for Emergency override scores.

## **3.3 Comparison**

**Definition: **Evaluating contractors before deciding. Reviews, credentials, guarantees. Building confidence to commit.

Assignment rules shown on the card:

- Score 35 to 49, or score above 35 combined with a review page visit

- Multiple sessions without a conversion signal — the visitor keeps coming back but has not pulled the trigger

- Two or more Comparison signals in the current session

**Score range: **35 to 49.

## **3.4 Research**

**Definition: **Learning and gathering information. Not yet ready to act. Needs content, education, and patience from the system.

Assignment rules shown on the card:

- Score below 35 with content page engagement

- No conversion actions taken in any session

- Default bucket — any informational signal puts a visitor into Research until they demonstrate higher intent

**Score range: **9 to 34. Below 9 is Unclassified — insufficient signal to classify.

## **3.5 Bucket Reference Summary**

| **Bucket** | **Score Range** | **Assignment Rule** | **System Response** |
| --- | --- | --- | --- |
| **Emergency** | Any score | Any single emergency signal — score irrelevant | A2P 15-min SLA · Phone CTA · Minimal form · Rep notified |
| **Active Project** | 50 – 74 | Score 50+ with pricing, CTA, FotoJobber, or Visualizer result | FotoJobber prompt · Appointment booking · Quote CTA |
| **Comparison** | 35 – 49 | Score 35–49 or 35+ with review page or multi-session without conversion | Reviews · Gallery · Guarantee · Estimate button |
| **Research** | 9 – 34 | Score below 35 with content engagement — default bucket | Educational content · Soft CTA · AI widget · Blog nurture |

# **4. Assignment Rules — Two Panels**

Below the bucket cards are two side-by-side panels explaining the two rules that govern how buckets change over time. These are the most architecturally important rules in the system.

## **4.1 No-Downgrade Rule — Within Session**

The left panel explains the no-downgrade rule. Within a single session, buckets can only move **up** the priority hierarchy — Research → Comparison → Active Project → Emergency. They cannot move down.

Why this matters: a visitor who reaches Active Project and then reads a blog article does not drop back to Research because of that. The system locks in the highest intent signal reached during the session. Demotions only happen after the session ends, and only when specific cross-session conditions are met.

The visual on the page shows this as a flow diagram. Green arrows show allowed upgrades (Research → Comparison → Active Project → Emergency). A red blocked arrow shows the downgrade that cannot happen within a session (Active Project cannot revert to Comparison mid-session).

| *The no-downgrade rule protects the conversion path. If the system could demote mid-session, a visitor who paused to read supporting content would lose their classification and receive the wrong experience on their next click.* |
| --- |

## **4.2 Cross-Session Demotion — Both Conditions Required**

The right panel explains cross-session demotion. After a session ends, the system can evaluate whether a bucket should move down. The critical rule is that **both conditions must be met simultaneously** — score decay alone is not enough, and idle time alone is not enough.

The two conditions are:

- **Condition 1: **score_live has fallen below the demotion threshold for that bucket

- **Condition 2: **idle time has exceeded the grace period for that bucket

The demotion table on the page shows all four buckets:

| **Bucket** | **score_live Threshold** | **Demotes To** | **Note** |
| --- | --- | --- | --- |
| **Active Project** | < 35 | **Comparison** | Both conditions required — score below threshold AND idle beyond grace period |
| **Comparison** | < 20 | **Research** | Same two-condition requirement applies |
| **Research** | < 8 | **Unclassified** | Visitor re-enters at base Research minimum if they return |
| **Emergency** | — | **Never demotes** | Flags as inactive-emergency after 14 days. Re-enters at Comparison minimum on return. |

**Why two conditions are required: **Score decays exponentially when a visitor is idle. A visitor might have a low score_live simply because they visited 10 days ago and the score has naturally faded. That does not mean they have lost interest — it means time has passed. The grace period protects against penalising visitors for normal gaps between sessions. Only when both score and idle time cross their respective thresholds simultaneously does the system conclude the visitor is genuinely cooling.

# **5. Emergency Override Demo — Interactive**

This is the first interactive element on the page. It demonstrates the emergency override rule in a simplified visual format.

## **5.1 What the Demo Shows**

The demo shows three elements in a row:

- **Current bucket: **COMPARISON — a visitor who is mid-session, evaluating options

- **Signal: **hero_call_click fires — delta +20, flagged as an emergency signal

- **Result: **EMERGENCY — the override fires immediately, current bucket irrelevant

When the user clicks the "Simulate Emergency Signal" button, the Emergency bucket label animates in and a confirmation message appears showing what the system does next: A2P triggered, 15-minute SLA clock started, all other queued actions suspended, rep notified.

## **5.2 Why This Demo Exists**

The override rule is counter-intuitive. Most scoring systems accumulate points gradually and transition through states over time. Emergency breaks that model entirely — it fires instantly regardless of where the visitor was. The demo makes this visible so a client or stakeholder watching a presentation understands immediately that Emergency is not the top end of a scoring scale. It is a separate classification triggered by signal, not score.

# **6. Cross-Session Demotion Demo — Interactive**

The second interactive element on the page demonstrates the two-condition demotion check. This is one of the most important architecture points to communicate to clients — that the system does not carelessly downgrade a visitor just because time has passed.

## **6.1 Starting State**

The demo opens with a fixed visitor state:

- Current bucket: Active Project

- score_raw: 52 (frozen — never decays)

- Days since last event: 4

- Grace period for Active Project: 3 days

- Demotion threshold for Active Project: score_live below 35

At 4 days idle, the score_live has decayed slightly but is still above 35. The grace period has technically been exceeded (4 > 3) but the score has not crossed the threshold. The demo shows one condition met and one unmet — no demotion.

## **6.2 Advance to Day 7**

Clicking "Advance to Day 7" updates the display. At 7 days idle:

- Idle time is 7 days — beyond the 3-day grace period (Condition 1 met)

- score_live has decayed further but is still above 35 for Active Project with a 14-day half-life (Condition 2 not yet met)

- Result: no demotion. The warning message shows that decay is continuing but the bucket holds.

This is the key educational moment — showing that idle time alone is not enough. A client who sees this understands the system is not aggressive about downgrading visitors.

## **6.3 Advance to Day 21**

Clicking "Advance to Day 21" shows the demotion trigger:

- Idle time is 21 days — well beyond the 3-day grace period (Condition 1 met)

- score_live has decayed below 35 — the Active Project demotion threshold (Condition 2 met)

- Both conditions met simultaneously — demotion fires on next return visit profile read

- Result: Active Project → Comparison. The display updates and the demotion message appears.

| *The demotion does not fire in the background. It fires at read time — when the visitor returns and their profile is loaded. This is consistent with the lazy-evaluation approach used throughout the scoring system.* |
| --- |

# **7. Animated Visitor Journey**

The third interactive element is the most visually complex part of the page. It shows a single visitor moving through all four buckets across multiple sessions, with the website adapting its content and CTAs at each stage.

## **7.1 Structure**

The journey is split into two panels side by side:

- **Left panel — Journey Steps: **A vertical list of four steps, each showing the bucket, the trigger events, and the score at that point. Steps can be clicked individually or played through automatically.

- **Right panel — Website Preview: **A simulated browser window showing the RightFlush Plumbing website adapting its layout and content to match the current bucket. The URL bar also updates to show which page the visitor is on.

## **7.2 The Four Journey Steps**

| **Step** | **Bucket** | **Trigger Events** | **Website Response** |
| --- | --- | --- | --- |
| **1** | **RESEARCH** | First visit — blog post via Google organic. Scroll 75%, 60s dwell, AI widget question asked. score_live: 24. | Educational content strips. Soft CTA (Ask our AI). No conversion pressure. Content discovery mode. |
| **2** | **COMPARISON** | Return visit — reviews page. Review section 30s dwell. Before/after gallery slider drag. Service areas check. score_live: 41. | Social proof front and centre. Reviews, guarantee, credentials. Gallery CTA prominent. Estimate button visible. |
| **3** | **ACTIVE PROJECT** | Third session — Hero CTA click. Form name field focused. Form phone field focused. FotoJobber viewed. score_live: 63. | FotoJobber prompt surfaced. Appointment booking prominent. Next available slot shown. Quote CTA primary. |
| **4** | **EMERGENCY** | Emergency CTA clicked — burst pipe navigation. nav_emergency fires. hero_call_click fires. Score override immediate. | Full emergency layout. Phone number front and centre. 15-minute SLA prominent. A2P triggered. Form collapsed to name and address only. |

## **7.3 The Website Preview States**

Each bucket triggers a different website layout in the preview panel. This is the visual proof of the intent-aware website concept. The same business, the same domain — four completely different experiences depending on where the visitor is in their journey.

### **Research State**

Educational content strips — three topic cards (Frozen Pipe Prevention, Water Heater Guide, Drain Maintenance). Soft CTA: "Have a question? Ask our AI." No estimate form, no booking prompt, no urgency signals. The website is in information-delivery mode. The green RESEARCH badge is visible in the bottom corner of the preview.

### **Comparison State**

Social proof is front and centre. Two proof cards — Customer Reviews (5-star with a testimonial) and Our Guarantee. A green credentials strip below confirms licensed, insured, years in business, and review count. The CTA shifts from soft to direct: "See Before & After Gallery." The blue COMPARISON badge appears.

### **Active Project State**

FotoJobber is the primary CTA — a prominent amber card prompting the visitor to upload a photo and describe their job for an accurate quote. Appointment booking strips show next availability and turnaround time. The primary button becomes "Book an Appointment." The amber ACTIVE PROJECT badge appears.

### **Emergency State**

The layout transforms completely. A full-width red hero shows the phone number in large type with the 15-minute response guarantee. An A2P confirmation strip confirms a text has been sent and a plumber will call within 15 minutes. The form is stripped to the minimum — name and address only. No gallery, no reviews, no FotoJobber. Speed is the only variable. The red pulsing EMERGENCY badge appears.

## **7.4 Auto-Play**

The "Auto-Play Journey" button steps through all four stages automatically with a 2.2-second pause between steps. This is the presentation mode — the demo can be played through in front of a client without requiring the presenter to click through each step manually.

# **8. System Response by Bucket — Tool Matrix**

The final section of the page is a reference table showing every tool and channel against every bucket. It answers the question: for this visitor state, what does the system do?

This table is the operational heart of the bucket system. The bucket definitions tell you what a visitor is. The tool matrix tells you what the system does about it.

| **Tool / Channel** | **EMERGENCY** | **ACTIVE PROJECT** | **COMPARISON** | **RESEARCH** |
| --- | --- | --- | --- | --- |
| **A2P SMS / Voice** | Immediate — 15-min SLA | Follow-up sequence | *Off* | *Off* |
| **FotoJobber** | *Off* | Primary CTA — prompted | Secondary — after gallery | *Off* |
| **ViewRoom** | Off — speed only | Quote consultation | Proof session — design tour | *Off* |
| **Visualizer** | *Off* | *Off* | Primary — see result in your space | *Off* |
| **AI Widget** | Off — call only | Answer final questions | Active — answer objections | Primary — education mode |
| **Lead Grabber** | Call mode only | Email + call | Email mode | Soft — email only |
| **Appointment Booking** | Off — call SLA first | Prominent — next available | Secondary — after proof | *Off* |
| **ContentRadar Nurture** | *Off* | *Off* | Seasonal content alerts | Primary — content sequences |

## **8.1 Reading the Table**

Each cell shows either an active state (with a description of how the tool behaves) or "Off" (the tool is suppressed for this bucket). The column for Emergency is the most restrictive — most tools are turned off. The column for Research is the least urgent — no direct conversion tools are active, only education and soft capture.

The table is used in two ways:

- **In demos: **to show clients that the system makes deliberate choices about what to show and what to suppress — not everything fires at once

- **In development: **as a specification reference for which tools the Orchestrator should activate or suppress for each bucket

# **9. Key Architecture Principles Demonstrated**

The Section 5 demo is designed to communicate five principles that are non-negotiable in the ClearSky architecture. Every element on the page reinforces at least one of these.

| **Principle** | How the page demonstrates it |
| --- | --- |
| **The bucket follows the score — never the other way around** | The bucket cards show score ranges. The journey animation shows score accumulating before each transition. The score drives the bucket, not a manual override. |
| **Emergency is a signal override, not a score threshold** | The Emergency card shows "Any score — signal override." The Emergency override demo fires from a Comparison bucket visitor with a mid-range score. |
| **Within-session upgrades only — no mid-session downgrades** | The no-downgrade visual shows the blocked downgrade arrow explicitly. The rule panel explains why. |
| **Demotion requires two conditions simultaneously** | The demotion table shows both conditions. The demotion demo lets the user advance through states where only one condition is met to see that demotion does not fire. |
| **The website responds differently to each bucket** | The website preview panel shows four completely different layouts — same business, same domain, four different experiences based on visitor state. |

# **10. How to Present This Page**

This section covers the recommended walkthrough sequence when presenting the Section 5 demo to a client or stakeholder.

## **Recommended Order**

Start at the top — the four bucket cards. Let the client read the definitions. Most clients recognise their own customers in one or two of the buckets immediately. This creates the initial hook.

Move to the assignment rules panels. Explain the no-downgrade rule first — it is intuitive and confirms that the system protects high-intent visitors. Then explain demotion — it reframes inactivity as information rather than failure.

Run the Emergency override demo. Click the button. The animation is brief and the rule is clear. Most clients find this the most memorable moment — the idea that a burst pipe at 11pm triggers an immediate automated response without anyone watching a dashboard.

Run the demotion demo. Advance through Day 7 first to show that one condition is not enough. Then advance to Day 21 to show the demotion trigger. The two-condition requirement builds confidence that the system is careful about downgrading visitors.

Run the animated journey. Use auto-play. Let the client watch the website transform through all four states. This is the moment the whole system clicks into place — they can see their own website behaving differently depending on who is on it.

Close on the tool matrix. This grounds everything in operational reality. The client can see that Emergency suppresses FotoJobber and Visualizer — of course it does, speed is all that matters. Research suppresses A2P — of course, you do not text someone who is casually reading a blog post. The matrix makes the system feel considered and professional.

## **Likely Questions and Answers**

| **Question** | Answer |
| --- | --- |
| **"****Can a visitor be in two buckets at once?****"** | No. One bucket at any time. The highest-priority bucket that applies always wins. Emergency always beats everything. Active Project beats Comparison and Research. |
| **"****What happens if someone clears their cookies?****"** | The session ID is lost. The device fingerprint may still match if the system has a prior fingerprint on file. If fingerprint also fails, the visitor re-enters as a new session at Research. Their prior history is not lost — it is linked to their profile via fingerprint once they are identified again. |
| **"****How long does it take to assign a bucket?****"** | Within the current session, in real time. The pixel fires on every behavioural event and the bucket is evaluated immediately. There is no batch processing. |
| **"****Does the contractor see which bucket a visitor is in?****"** | Not directly — the contractor does not log into a dashboard. Their assigned rep sees the bucket in the hub. The contractor receives the outcome: a booked appointment, a FotoJobber submission, a review response. The bucket is the system's internal classification, not a client-facing metric. |
| **"****What if someone is always in Research and never converts?****"** | The system continues to serve educational content. Over time, if score_live decays below 8 and idle time exceeds the Research grace period (14 days), the visitor demotes to Unclassified. If they return they re-enter at Research. The system does not chase Research visitors aggressively — it waits for a readiness signal. |

# **11. Locked Values Referenced on This Page**

The following values are used in the demotion demo and the bucket assignment rules. They are locked — do not change without a new session decision.

| **Value** | Notes |
| --- | --- |
| **Emergency grace: 24 hours · half-life: 2 days** | Starting points — calibrate against real Cohort 2 conversion data |
| **Active Project grace: 3 days · half-life: 14 days** | Starting points — calibrate against real Cohort 2 conversion data |
| **Comparison grace: 7 days · half-life: 30 days** | Starting points — calibrate against real Cohort 2 conversion data |
| **Research grace: 14 days · half-life: 60 days** | Starting points — calibrate against real Cohort 2 conversion data |
| **Active Project demotion threshold: score_live ****<**** 35** | Calibrate: at what score do Active Project visitors stop converting? |
| **Comparison demotion threshold: score_live ****<**** 20** | Calibrate: at what score do Comparison visitors stop returning? |
| **Research demotion threshold: score_live ****<**** 8** | Calibrate: at what score does continued nurture become futile? |
| **Emergency: never demotes** | Locked — Emergency flags as inactive-emergency after 14 days. Re-enters at Comparison minimum on return. |
| **No-downgrade rule: within-session only** | Locked — bucket can only rise within a session. Demotion is cross-session only. |

| *Half-life and grace period values are configuration parameters, not constants. They must be calibrated against real Cohort 2 conversion data as the network accumulates. The values shown are directionally sound starting points.* |
| --- |

# **12. What Comes Next**

Section 5 and Section 8 (Engagement Score) are the two foundation demos. With both complete, the build sequence continues:

| **Next build** | Notes |
| --- | --- |
| **Section 6 — Customer Journey** | Timeline visualiser. One named customer from anonymous first touch through to repeat job. Every touchpoint as a node. |
| **Section 1 — Orchestrator Pipeline** | The decision engine made visible. Event → Signal → Orchestrator → Action Queue → Execution → Outcome → Feedback as a live flow. |
| **Section 2 — ContentRadar** | Question collector, topic clustering, 48h rolling window, DataForSEO keyword monitor, flag interface. |
| **Section 4 — Fingerprinting** | Profile reconciliation visualiser. Anonymous mobile + desktop sessions collapsing into a single named profile at conversion. |
| **Section 7 — A2P Messaging** | Message thread demo. Emergency 15-min SLA demonstrated. Rep notification visible alongside profile. |
| **Section 3 — Pixel Platform** | Already substantially covered by the existing simulator. Supplement with dedicated pixel event reference. |

**Owner: **Rory Dredhart — ClearSky Software · r.dredhart@clearskysoftware.net · 705-274-9564

**Date: **May 2026 · Session 6 · CONFIDENTIAL — INTERNAL DOCUMENT

	CONFIDENTIAL — INTERNAL DOCUMENT  	  Page  of