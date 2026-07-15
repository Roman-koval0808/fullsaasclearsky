**CLEARSKY AI DECISION SYSTEM**

**Tourism Vertical Transfer Package**

*Complete Seven-Section Pipeline Reference — Trades Build (APEX Contracting)*

Prepared for: Rory Dredhart

Version 1.0  |  July 2026  |  Source: Trades Pipeline Project (Sections 1–7 complete)

Destination: ClearSky Tourism Project

# **1. Purpose of This Document**

This document transfers the complete, verified ClearSky AI Decision System — all seven pipeline sections as designed, built, and verified in the trades vertical — into a new project dedicated to the tourism sector.

This package describes the pipeline exactly as it stands today. No tourism-specific decisions have been made in this document. All adaptation work (tourism signals, tourism action library entries, tourism demo business, tourism provider sources, seasonality logic) will be decided and locked inside the tourism project, using this document as the authoritative baseline.

**How to use this document: **upload it to the new tourism project as project knowledge, then open the first session with the copy-paste prompt in Section 10.

# **2. Locked Workflow and Layer Model**

The seven-section workflow is locked and carries over to tourism unchanged:

**Event → Signal → Orchestrator Decision → Action Queue + Parameters → Execution → Outcome → Feedback**

| **Layer** | **Locked Meaning** |
| --- | --- |
| Network Layer | Where ClearSky connects, listens, and collects activity. |
| Intelligence Layer | Where ClearSky normalizes, interprets, detects Signals, applies rules, and decides. |
| Execution Layer | Where ClearSky performs approved actions, tracks outcomes, and feeds results back. |

Each section has a hard boundary: it begins only when the previous section has produced a complete, handoff-eligible output, and it ends by producing its own locked output for the next section. No section reaches backward or forward past its boundary.

# **3. Hard Boundaries — Non-Negotiable**

These rules shaped every section of the trades build and apply identically in tourism:

- **Human approval is required for anything capable of posting publicly. **No public-facing action executes without explicit human approval. This is enforced across all pipeline sections, not just Execution.

- No uncontrolled AI model training. Feedback records observations; it never trains a model.

- No automatic production rule changes. Feedback identifies tuning candidates only; a human applies rule changes.

- AI never assigns official event_type, Network Category, final Signal, ACT approval, Orchestrator Decision, or Execution. AI is used only for context extraction from unstructured content (reviews, SMS, emails, voicemails, chat, social).

- Provider events are mapped in advance through the Provider Event Registry. ClearSky never guesses provider event names at runtime.

# **4. Architecture Principles**

- **Database-driven rules over hardcoded logic. **Signal rules, Action Library entries, and Orchestrator configurations live as database rows. Adding tourism means adding rows and configurations — not rewriting the pipeline.

- Multi-tenant by design, with per-client configuration and a consultant/account manager ownership layer (each business is owned by a consultant; the trades demo consultant is Sarah Jenkins).

- Full traceability: every record links Event → Signal → Decision → Action Queue → Execution → Outcome → Feedback via IDs and a trace_id created at raw intake.

- Simulated/demo provider data for PoC; swapping to live API calls (e.g., DataForSEO) is designed as a single-file change.

- Step-by-step lock-in: nothing is considered complete on theory alone — actual logs and direct SQL verification queries confirm each step.

# **5. The Seven Sections — Pipeline Reference**

The working example carried through the entire trades build is a Google Business Profile review for APEX Contracting (biz_apex_001): a 4-star review praising a roof repair but noting slow pre-appointment communication. This single event exercises the full pipeline, including the human-approval boundary and a complaint-theme log.

## **Section 1 — Event Intake**

Purpose: turn raw provider input into a trusted, normalized, stored ClearSky Event Object.

Path: Raw Input → Provider Identification → Provider Event Name Reading → Provider Event Registry Lookup → event_type Assignment → Network Category Assignment → Event Draft Creation → Structured Field Normalization → Relationship Matching → Duplicate Detection → AI Extraction Where Needed → Raw + Normalized Payload Storage → Processing Status → Handoff Eligibility Decision → Final Event Boundary Lock-In.

- The Event answers: what happened, where it came from, who it connects to, and whether it is clean enough to evaluate.

- Each provider event maps to one ClearSky event_type and one of seven Network Categories: Visibility, Trust, Engagement, Communication, Conversion, Growth, System.

- 16 provider/source groups are registered (ClearSky Website/Forms, Telnyx Voice, Telnyx SMS/A2P, Email Hub, Google Business Profile, DataForSEO, Matomo, ViewRoom, FotoJobber, Quote System, Booking/Calendar, CRM/Job Management, Social Media, and others).

- Boundary output: Event stored with handoff_eligible = true.

## **Section 2 — Signal Detection**

Purpose: evaluate handoff-eligible Events against the signal rule layer and produce valid Signal Events.

- 40-signal layer spanning all seven Network Categories, stored as database rules (not code).

- Includes compound/contextual signals such as rating_content_mismatch_detected (e.g., a 4-star rating whose text contains a complaint theme).

- Condition evaluation is deterministic against normalized Event fields and AI-extracted context; AI does not decide the final Signal.

- Boundary output: valid Signal Event(s) ready for Orchestrator Decision.

## **Section 3 — Orchestrator Decision**

Purpose: answer one question — what should ClearSky do about the valid Signal Event(s), if anything?

- Database-driven decision rules, multi-tenant with per-client configuration.

- Selects the dominant Signal, groups related Signals, selects Actions from the Action Library, and sets execution modes — including whether human approval is required.

- Consultant/account manager ownership layer determines who reviews and approves.

- Boundary output: official Orchestrator Decision record prepared for Action Queue + Parameters. Section 3 does not create queue items, generate drafts, or execute anything.

## **Section 4 — Action Queue + Parameters**

Purpose: convert the Orchestrator Decision into concrete queued Action items with fully resolved parameters.

- Each queued item carries its Action Library reference, parameters, execution mode, and approval requirement.

- Anything public-facing is queued in a waiting-for-approval state — it cannot skip the approval gate.

- Boundary output: Action Queue items ready for Execution.

## **Section 5 — Execution**

Purpose: perform approved actions and only approved actions.

- In the APEX example, Execution generates the review reply draft and holds it for business owner approval; public posting remains blocked by policy.

- Internal actions (e.g., complaint theme logging) execute without a public gate because they never leave the system.

- Boundary output: execution results (completed, waiting, blocked, failed) ready for Outcome.

## **Section 6 — Outcome**

Purpose: record what actually happened as a locked, traceable Outcome layer.

- Outcome records capture completion, waiting states, blocked contexts, failures, and no-external-action results (APEX: out_6001, out_6002, blocked_ctx_6001).

- Prisma outcome models and SQL migration (005_outcome_prisma.sql) implemented and verified.

- Boundary output: Outcome output package with handoff_status = ready_for_feedback.

## **Section 7 — Feedback**

Purpose: close the loop — evaluate and record how well every layer performed, without changing anything automatically.

| **Step** | **Purpose** |
| --- | --- |
| 1 | Receive Outcome output package from Section 6; confirm Feedback has not started. |
| 2 | Confirm Feedback entry eligibility and traceability. |
| 3 | Load feedback categories, questions, and evaluation rules. |
| 4 | Create feedback records linked across all six upstream layers. |
| 5 | Record Signal validity feedback. |
| 6 | Record Orchestrator Decision feedback (dominant signal, grouping, actions, modes). |
| 7 | Record Action and Execution feedback. |
| 8 | Record Outcome result feedback (completed / waiting / blocked / failed / no external action). |
| 9 | Record human approval, edit, rejection, or waiting feedback. |
| 10 | Identify rule, template, suppression, or mapping tuning candidates — no automatic changes. |
| 11 | Prepare Feedback output for reporting and future optimization. |
| 12 | Stop after Feedback completion — the workflow loop closes here. |

**Known implementation lesson (carry forward): **Section 7 Steps 5–9 all write to JSONB details fields. Stale spread operators caused writes to overwrite each other. In the tourism build, always confirm JSONB write isolation and verify with direct SQL, and watch for out-of-order DB writes, missing operators in condition evaluators, and duplicate records — these bugs surface in logs, not in theory.

# **6. Technical Stack and Environment**

| **Component** | **Detail** |
| --- | --- |
| Language / Framework | TypeScript, SvelteKit |
| ORM / Database | Prisma, PostgreSQL |
| AI Provider | OpenAI API (intentional choice — used for context extraction only) |
| Rules & Config | Database rows: signal rules, Action Library, Orchestrator configs, Provider Event Registry |
| Provider Data | Simulated/demo for PoC (Google FAQ, GBP data); DataForSEO planned for production |
| Delivery Layer | Downstream A2P platform (integration not yet built) |

# **7. Current Build State (Trades Project)**

| **Status** | **Items** |
| --- | --- |
| Complete & verified | All seven pipeline sections (Event Intake, Signal Detection, Orchestrator Decision, Action Queue + Parameters, Execution, Outcome, Feedback), verified across multiple event types with logs and SQL. |
| Partially built | Approval workflow; Cockpit / command center UI. |
| Not started | Post-approval Google posting; reporting dashboard; admin panel; additional provider integrations; multi-business production setup; A2P integration; feedback optimization review cycle. |

The tourism project inherits this same state as its baseline. The pipeline machinery does not need to be rebuilt for tourism — the adaptation is configuration, rules, and content.

# **8. Demo Business Pattern**

The trades build used one consistent demo business through every section: APEX Contracting (biz_apex_001), managed by consultant Sarah Jenkins. Every section's working example, database record, and verification query referenced this single business, which kept traceability simple and made cross-section verification possible.

The tourism project should establish its own equivalent on day one: one named tourism demo business (e.g., a lodge, outfitter, or tour operator — to be chosen in the tourism project), one business_id, one assigned consultant, and one working example event carried through all seven sections.

# **9. Tourism Adaptation Areas — To Be Decided in the Tourism Project**

Nothing below is decided here. This is the checklist of what must be re-examined for tourism, in the order the pipeline runs:

| **Area** | **What to decide in the tourism project** |
| --- | --- |
| Provider / source groups | Which of the 16 registered sources apply to tourism, and which tourism-specific sources are needed (OTAs, booking engines such as Airbnb/Booking/TripAdvisor/Expedia, seasonal inquiry channels). |
| Provider Event Registry | New provider + provider_event mappings for tourism sources, each mapped to one event_type and one Network Category. |
| Event types | Tourism-specific event types (booking inquiry, availability request, cancellation, seasonal review patterns, OTA review received). |
| Signal layer | Which of the 40 trades signals carry over unchanged, which need tourism thresholds, and which new tourism signals are needed (seasonality, occupancy, booking-window signals). |
| Orchestrator rules | Tourism decision rules and per-client configurations; consultant ownership for tourism accounts. |
| Action Library | Tourism actions and templates (review replies in a hospitality voice, booking follow-ups, seasonal posts) — all public-facing actions still require human approval. |
| Demo business | Named tourism demo business, business_id, consultant, and a working example event to carry through all seven sections. |
| Seasonality | Whether tourism requires season-aware rule conditions or suppression windows anywhere in the pipeline. |
| Diagnostic engine | Whether ClearSky's diagnostic layer (GBP health gap, rank gap) applies to tourism as-is; locked engine constants remain locked unless a new session decision changes them. |

# **10. Opening Prompt for the Tourism Project (Copy-Paste)**

Paste the following as the first message in the tourism project after uploading this document:

You are continuing the ClearSky AI Decision System build. A transfer document titled

"ClearSky AI Decision System — Tourism Vertical Transfer Package" is in project knowledge.

Read it before responding.

 

Context: The full seven-section pipeline (Event -> Signal -> Orchestrator Decision ->

Action Queue + Parameters -> Execution -> Outcome -> Feedback) is complete and verified

in the trades vertical (demo business: APEX Contracting, biz_apex_001). Stack:

TypeScript, SvelteKit, Prisma, PostgreSQL, OpenAI. Rules are database-driven.

 

Hard boundaries (never violate): (1) anything capable of posting publicly requires

human approval before execution; (2) no AI model training; (3) no automatic production

rule changes; (4) AI never assigns official event_type, Network Category, final Signal,

or Orchestrator Decision.

 

Goal of this project: adapt the same seven-section pipeline to the TOURISM sector.

The pipeline machinery is not rebuilt — we adapt configuration, registry mappings,

signals, orchestrator rules, and the Action Library.

 

Session 1 agenda:

1. Choose and lock the tourism demo business (name, business_id, consultant).

2. Define the tourism working example event to carry through all seven sections.

3. Review Section 9 of the transfer document (Tourism Adaptation Areas) and lock

   decisions area by area, starting with provider/source groups and the Provider

   Event Registry.

 

Work step-by-step with explicit lock-in. Do not proceed to the next area until the

current one is confirmed. Produce a session handoff DOCX at the end.

# **11. Key Learnings Carried Forward**

- Human approval is inviolable for public-facing actions — design every tourism action with the approval gate in mind from the start.

- Database-driven rules made multi-vertical expansion possible; tourism is the proof of that decision.

- Simulated data is the right PoC approach — defer live API integration until production is warranted.

- JSONB writes require careful management — confirm write isolation on every step that touches a shared details field.

- Implementation issues surface in logs, not theory — require actual logs and SQL verification before locking any step.

- Session continuity via handoff documents — every tourism session should end with a structured summary and a copy-paste opening prompt for the next session.

ClearSky AI Decision System — Tourism Vertical Transfer Package  |  Page