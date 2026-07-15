# ClearSky — Trades Vertical: Integrated Build Specification

**Read this first.** It is the integration layer — how the five bodies of work connect. Detailed schemas live in the referenced spec docs; this document is the map and the seams.

- Canonical demo client: RightFlush Plumbing (Timmins, ON). Vertical default: plumbing rules config.
- Detail sources: `ClearSky_MA_Requirements_v3.md` (the spine — pixel, identity, storage, orchestrator, signals, ContentRadar), `ClearSky_A2P_Developer_Spec.md`, `contentradar/ContentRadar-Combined-Master-Reference.md`, `diagnostic-frontend/`.

## The five bodies and where each sits

| Body | Role | In the loop? | Detail |
|---|---|---|---|
| Marketing Automation | Operating system — owns the client, provisions the site, runs the rep workflow | Yes — the container | `ClearSky_MA_Requirements_v3.md`, `marketing-automation/` |
| AI Decision System | The brain — pixel, intent, identity, hub, signals, Orchestrator | Yes — the decision engine | MA v3 §3–7, pipeline + orchestrator docs |
| A2P (Telnyx) | The voice — calls/SMS become signals; approved voice/SMS actions execute | Yes — signal source + execution | `ClearSky_A2P_Developer_Spec.md` |
| ContentRadar | The fuel — demand-side intelligence, content supply | Yes — Discovery supply | `contentradar/` |
| Digital Health Diagnostic | Acquisition front-end — prices the revenue gap to close the sale | **No — front door** | `diagnostic-frontend/` |

Locked pipeline, identical across every system feeding it:
`Event → Signal → Orchestrator Decision → Action Queue + Parameters → Execution → Outcome → Feedback`

## 1. Acquisition front-end — Diagnostic (SEPARATE)

Runs once, at acquisition. Pulls the prospect's live data (GBP health, local-pack rank gap, site performance, content gap), computes a dollar revenue gap layer by layer, and presents it with the protected-market promise and the 20%-or-refund guarantee.

**Boundary:** the diagnostic does not read/write the Communication Hub during operation. No pixel loop, no Orchestrator, no Action Queue. It produces an output package and hands it forward at signup — then it's done.

**The one hand-off seam (one-way, one-time):**
`Diagnostic output { revenue_gap_total, layer_scores[1..11], protected_market, trade, market_cluster, guarantee_baseline } → MA onboarding runbook → site provisioning`

**The one shared component (not a runtime link):** ContentRadar Engine 1 gap scoring powers *both* the diagnostic's Layer 4 content-gap calc (acquisition) *and* client-facing content intelligence (loop). Shared library, not shared state. This is the only tie between front-end and loop — keep it that way.

## 2. Operating system — Marketing Automation

Two tiers: the **client-management platform** (net-new — provisions sites, isolates content per client, monitors the book, runs support, handles ContentRadar flags, tracks guarantee) and the **per-client managed site** (template model driven by `window.PAGE`). ClearSky ops apps (ViewRoom, A2P, mobile) run on the ClearSky subdomain; the contractor site runs on its own domain. Economics: one rep, ~30 clients, ~4 hrs each/month — every automated path must be safe to run without a human except where the non-negotiables demand approval. Detail: `ClearSky_MA_Requirements_v3.md`, `marketing-automation/`.

## 3. Intent Layer — pixel, Engagement Score, four buckets

Pixel fires on every significant behaviour, computes Engagement Score (0–100, hard cap, **never decrements**), assigns/escalates an intent bucket (**escalate-only**), POSTs to `/hub/events`. Wired to no third-party analytics.

Four buckets, priority order, first strong signal wins: **Emergency** (any single signal, overrides all) → **Active Project** (≥2 signals) → **Comparison** (≥2 signals) → **Research** (default). Emergency URL rule fires on load, before scroll/dwell, and locks the bucket. Engagement Score drives form-length adaptation (0–30 full form → 81–100 phone-only). Full pixel code, all 25 page configs, and the plumbing rules config: MA v3 §3.

## 4. Identity Layer — two confidence dimensions, three tiers

**C1 Event Validity** (did it occur — spam/bot/dup) resolved first; on fail drop+log. **C2 Attribution** (whose is it) resolved after; produces a Tier. **Never combined.**

Tiers (locked 2026-07-02, four): **1** high → full pipeline, all channels. **2** low/pending → **same-channel response only** until upgrade. **2B** confirmed-real, zero identifiers (web visitor past the 10-second floor, unnamed voicemail) → **profile created immediately on the qualifying visit** (corrected 2026-07-03 — not deferred until conversion), keyed to cookie + fingerprint only; no channel exists to reach them, log and hold until an identifier appears. **3** doesn't clear the bar → no profile, no cookie, no fingerprint stored, Context Store only, no customer-facing action ever — one undivided bucket covering Stream B, bots, and instant-bounce (under 10s)/dropped-call noise.

Two paths to a named profile: **forwarded link** (signed JWT `cs_token`, hub-profile-id only, no PII, Tier 1 from first pageview) and **organic conversion** (normalise email/phone → SHA-256 match → stitch or create Tier-1 → upgrade any matching pending Tier-2). Detail + code: MA v3 §4.

## 5. Storage Layer — two systems, three endpoints

**Communication Hub** = master record (profiles, sessions, conversions, Tier 1/2). **Context Store** = market intel + Tier 3, enrichment only, **never joined to profiles or customer-facing actions**.

Endpoints:
- `POST /hub/events` — pixel activity (full Hub Event Schema in MA v3 §5.2)
- `POST /hub/contentradar/queue` — Blog/FAQ question forms POST here, **not** `/hub/events`; flag fires on 5+ same-topic in 48h
- `GET /hub/validate-token?cs_token=<jwt>` — forwarded-link validation

## 6. Signal Detection

Event ≠ Signal. Event = cleaned/classified/stored record; Signal = rule-matched indicator of something meaningful. Six buckets: Opportunity, Risk, Bottleneck, Performance, Competitive, Momentum. Detection runs only after `handoff_eligible = true`, loads matching rules by `event_type + network_category + provider`, returns a candidate array to the Orchestrator. Detail: MA v3 §7.

## 7. Decision Layer — Orchestrator

Deterministic 11-step process (receive → safety → business config → rank → dominant → suppress → select action → choose mode → resolve params → write record → hand to queue). It never creates Events, invents Signals, executes directly, or posts externally.

Four execution modes: **Ignore** / **Automate** (no human) · **Approve** (customer-facing — never auto-posts, rep approves) · **Escalate** (urgency/complaint — manager). Decision record written BEFORE any action executes; blocked actions preserved for audit. Detail + schema: MA v3 §6.

## 8. A2P integration — the voice seam

Both a **signal source** and an **execution channel**, feeding the same Orchestrator.

Inbound: call (Telnyx) → **profile lookup** (caller-ID → CRM, ≤2s, non-blocking; miss → anonymous log) → **log call event** (always) → IVR → recording/voicemail → **AI analysis** (transcript, incl. emergency detection) → **Orchestrator**.

Signal-ingestion endpoints (canonical; the old `/webhooks/telnyx/voice` shim is retired):
- `POST /api/signals/telnyx/a2p` — voice: transcript + ivr_path + call_priority
- `POST /api/signals/telnyx/sms` — SMS

Tier logic and same-channel rule apply to phone the same as web. Detail: `ClearSky_A2P_Developer_Spec.md`.

## 9. ContentRadar integration — the fuel seam

The one component no competitor can replicate. Three jobs: client content intelligence/publishing, diagnostic Layer 4 gap calc (shared component, §1), and the keyword library behind Blog/FAQ/AI-SEO/Local-Ranking.

**Canary:** Sudbury's larger population makes a keyword spike statistically legible at all — Timmins' own volume is too thin to tell a real spike from noise. That's the primary reason Sudbury is watched, and it holds for every trigger type. The **4–6 week lead is secondary and conditional** (corrected 2026-07-03) — real specifically for reactive demand triggered by a physical weather threshold (frozen pipes, sump pumps), where the trigger genuinely arrives in Timmins later. It does not hold for planned/seasonal work (roofing, renovations) — that demand is calendar-driven, not triggered by an event that has to travel north, so Timmins can lead or run in parallel. When a Sudbury keyword exceeds 200% of its 90-day baseline, ContentRadar flags Timmins → scraper runs against topic-tagged sources → contractor publishes before local demand arrives, where a lead time applies.

**Two engines:** Engine 1 Gap Scoring (90% built) — 72-signal catalogue, **60 in the gap score**, 4 stages = 180 pts, Content Gap % = Score/180 (Discovery 15/45, Engagement 17/51, Conversion 15/45, Growth 13/39 — corrected 2026-07-02, verified against `contentradar_72_signals_updated_4.xlsx` Signal Master; previously stated 18/54 and 12/36 from a stale hardcoded rollup). Engine 2 Watch Market (designed, pipeline not built). Detail: `contentradar/ContentRadar-Combined-Master-Reference.md`.

## 10. The seams — every inter-system boundary

| From → To | Mechanism | Direction |
|---|---|---|
| Diagnostic → MA onboarding | Output package at signup | One-time, one-way |
| ContentRadar Engine 1 ↔ Diagnostic Layer 4 | Shared scoring library | Shared component (not runtime link) |
| Pixel → Hub | `POST /hub/events` | Per event |
| Blog/FAQ forms → ContentRadar | `POST /hub/contentradar/queue` | Per question |
| Forwarded link → Hub | `GET /hub/validate-token` → Tier 1 | Per session |
| Organic conversion → Hub | `GET /hub/profiles/resolve` (tier/status) → `POST /hub/profiles/merge` (create/merge/upgrade), SHA-256, E.164 | Per conversion |
| A2P → Orchestrator | `POST /api/signals/telnyx/a2p` \| `/sms` | Per call/SMS |
| Signal Detection → Orchestrator | Candidate array | Per event |
| Orchestrator → Execution | Action Queue → site / GBP / A2P / email | Per approved action |
| ContentRadar flag → Scraper → Site | Topic-tagged publish | Per flag |
| Anything Tier 3 → Context Store | Write-only, never joined to profiles | Per event |

## 11. End-to-end trace — one booked job

1. **ContentRadar** catches a Sudbury frozen-pipe spike → flags Timmins → prevention post publishes on `/blog`. *(Discovery)*
2. Homeowner lands, reads. **Pixel** scores engagement, holds `research`. A FAQ question → `/hub/contentradar/queue`. *(Engagement)*
3. Days later a pipe bursts → `/burst-pipe` → **Emergency URL rule** fires (+20, locked) → `/hub/events`. Form collapses to phone-only. *(Conversion begins)*
4. They call. **A2P** caller-ID links to the step-2 profile → call event logged → transcript → emergency detected → `/api/signals/telnyx/a2p`.
5. **Signal Detection** → **Orchestrator** (Emergency override, `escalate`) → rep connected. *(Conversion)*
6. Job booked. **Outcome** → **Feedback**; the client's trajectory feeds the Cohort 2 network. *(Growth)*

## 12. Open gaps before "marketing to one" is live

ContentRadar Engine 1 unstub with Cohort 1 data build; fingerprint generation technique/library (policy is locked, see below — the "what generates it" decision is not).

~~SHA-256 normalisation convention across front/back end~~ — **closed 2026-07-02**, see `ClearSky_MA_Requirements_v3.md` §4.4.

~~`POST /hub/profiles/merge` sanity check~~ — **closed 2026-07-02**: the sanity check found the pseudocode (MA v3 §4.5 Path 2) called four hub operations against an API contract that only defined two endpoints, plus a field-name bug (`sessionId` sent where `anonymousId` was needed). Fixed by extending `GET /hub/profiles/resolve` to return `tier`/`status` and `POST /hub/profiles/merge` to create/merge/upgrade depending on what resolve returned — no new endpoints. See `ClearSky_MA_Requirements_v3.md` §4.5 and `clearsky-ma-hub-integration-spec.md` Components 4–5.

~~NurtureSequence schema + email-capture trigger~~ — **closed 2026-07-02**: `email_capture` added as a `conversionType`; a lead-magnet email-only signup produces full Tier 1 (an email hash is a strong identifier per §4.2, same as a full quote-form submission) and reuses the existing resolve/merge flow. NurtureSequence schema, enrollment trigger (Tier 1 + Research/Comparison bucket), exit conditions, and execution mode are in `clearsky-ma-hub-integration-spec.md` Component 6.

~~Fingerprint production wiring~~ — **policy half-closed 2026-07-02**: confidence tiers, same/cross-device handling, and stitching rules are locked in `ClearSky_MA_Requirements_v3.md` §4.7. Technique/library selection remains open — see that section's flagged list.

~~`cs_token` forwarded-link stitching~~ — **closed 2026-07-02**: Path 1 (`ClearSky_MA_Requirements_v3.md` §4.5) now checks for a pre-existing anonymousId cookie after token validation and merges it via `POST /hub/profiles/merge` (contactDetails omitted). See also `clearsky-ma-hub-integration-spec.md` Component 3 step 7.
