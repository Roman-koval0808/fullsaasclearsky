# ClearSky — Issues List for Serhii

A flat, developer-facing punch list — no narrative. Everything here is pulled from `specs/clearsky-open-decisions-tracker.md` (Rory's working log, kept up to date as the two customer-journey stories get written) and tagged by where it came from. If you want the full reasoning behind any single line, the tracker has it; this doc exists so you don't have to read two long stories to find out what actually needs your attention.

**Source tags:** `[Denise]` / `[Barry]` — surfaced specifically while writing that story. `[Both]` — hit independently by both, which is a stronger signal it's a real gap, not a one-off. `[General]` — architecture questions unrelated to either story.

**Priority:** 🔴 blocks build · 🟡 needed before that feature builds · 🟢 refine later.

---

## Section A — New/changed Action IDs needing your review

This is the actual buildable surface from both stories: every Action that's new, proposed, or got corrected this round. None of these are in whatever you consider the "locked" library yet — check for ID collisions against what you've already built before treating any of these as final.

| Action ID | Name | Mode | Approval | Source | Note |
|---|---|---|---|---|---|
| `ACT-CALL-005` | Generate call-context summary (internal) | Automatic | No | `[Barry]` | **Correction, not new** — was previously documented as "Draft callback script," Requires Approval: Yes. Wrong: it fires before any call happens, so it can only recap what the customer already said. Internal only, never customer-facing. If you built it as approval-gated, that needs to change. |
| `ACT-CALL-009` | Draft appointment change confirmation (email/SMS) | Draft — human review | Yes | `[Denise]` | Proposed. No existing Action covers a customer-facing draft needing approval on a reschedule. |
| `ACT-CALL-010` | Write appointment commitment to rep calendar | Automatic | No | `[Barry]` | Proposed. Extracts a rep's spoken commitment ("I'll be there at 3PM") from a call transcript, writes to the rep's own calendar. |
| `ACT-CALL-011` | Generate available-slots scheduling email from rep calendar | — (feeds `ACT-COM-001`) | No (Sarah's queue) | `[Barry]` | Proposed. Reads rep's calendar for openings, drafts the slot-options email. |
| `ACT-CALL-012` | Customer self-service slot selection → write rep calendar, notify rep | Automatic | No | `[Barry]` | Proposed. Mirror of `ACT-CALL-010` — customer's click writes the calendar instead of the rep's spoken words. No conflict-resolution behavior specified if two customers claim the same slot near-simultaneously. |
| `ACT-REV-008` | Send review request (GBP link) | — (Sarah's queue) | No | `[Denise]` `[Barry]` | Proposed. Resolves a long-open gap (#24 below) — nothing previously generated a review *ask*, only handled reviews once they existed. Timing depends on a "job completed" event that itself doesn't exist yet (#38). |
| `ACT-COM-004` | Post-job relationship check-in | — (Sarah's queue) | No | `[Barry]` | Proposed. Resolves the "post-job relationship-maintenance system" gap (Section D). |

---

## Section B — Open decisions sourced from the two stories

These block or shape the stories' mechanisms directly.

| # | Area | Decision needed | Priority | Source |
|---|---|---|---|---|
| 8 | Site Personalization | Lock the ≥35 threshold for Tier 2/2B on-page personalization — currently just "generalized from an example," not a locked value. | 🟡 | `[Denise]` Ch2 |
| 14 | Scoring | Formalize the +10 recency bonus (recognized return ≤3 days) into the plumbing rules config — currently lives only in the story. | 🟢 | `[Denise]` Ch2 |
| 15 | A2P / SMS | `ACT-CALL-008`'s approval gate doesn't read `sms_consent` — requires approval unconditionally, a strange fit for a transactional reminder once consent's confirmed. Needs an automatic sibling or a consent-based carve-out. | 🟡 | `[Denise]` Ch4 |
| 17 | AI Analysis Engine | `opportunity`/`momentum` have no clean value for an existing customer adjusting an existing booking — both dimensions assume new-inquiry/complaint calls. | 🟢 | `[Denise]` Ch5 |
| 18 | A2P / Hub integration | Is "ClearSky CRM" profile matching the same profile as the hub's `hubProfileId`, or two separate systems that happen to share a phone number? | 🟡 | `[Denise]` Ch5 |
| 20 | Thread matching | Confirm the 0.75 confidence threshold proposed for `SIG-COM-006` (`thread_continuation_detected`) — set by precedent from other signals, not independently calibrated. | 🟡 | `[Denise]` Ch5 |
| 21 | Signal rules | `SIG-COM-006` uses `event_type: 'voicemail'`, which no other signal in the library uses. Confirm it should be added as a recognized type. | 🟢 | `[Denise]` Ch5 |
| 22 | Signal rules | `SIG-COM-006`'s bucket (`Bottleneck`) is the closest fit among six, but none cleanly describe a data-attribution/continuity signal. New bucket warranted? | 🟢 | `[Denise]` Ch5 |
| 23 | Signal-action mapping **bug** | `SIG-GROW-002`/`005` are wired to the wrong Action (`ACT-REV-007`, for conflicting rating/text) when they should hit `ACT-REV-005` (already built, for agreeing rating/text). Looks like a copy-paste error — fix, don't follow. | 🟡 | `[Denise]` Ch9 |
| 24 | Action Library | No Action anywhere generates a review *request* — every `ACT-REV-*` assumes a review already exists. See `ACT-REV-008` in Section A. | 🟡 | `[Denise]` Ch9 / `[Barry]` Ch7 |
| 25 | Action Library | No Action turns a referral mention in a review into an actual lead record — falls back to generic `ACT-TASK-001`. | 🟢 | `[Denise]` Ch9 |
| 30 | A2P / Consent | Consent basis for the new emergency/urgent auto-reply SMS is undefined — existing `sms_consent` framework was built for marketing/follow-up, not a request-initiated transactional reply. | 🟡 | `[Barry]` |
| 31 | Signal detection | No signal covers sustained dwell on the home page's Emergency band specifically, distinct from generic scroll/dwell deltas. | 🟢 | `[Barry]` Ch1 |
| 32 | Signal-schema **conflict** | `SIG-CONV-001`/`002` are defined twice, differently, under the same IDs across `004_40_signals_seed.sql` and `002_seed_rules.sql` — `004` even references an Action (`ACT-LEAD-001`) that doesn't exist in `002`. Needs reconciling: does `004` supersede `002`, or do they serve different scopes? | 🟡 | `[Barry]` |
| 33 | A2P / Templates | `sewage_backup` auto-reply template not yet written. | 🟡 | `[Barry]` |
| 34 | A2P / Templates | `electrical_fire_or_shock` auto-reply template not yet written. | 🟡 | `[Barry]` |
| 35 | SLA escalation | Who does an SLA breach escalate to when the assigned rep *is* Bert himself (two-person shop, no third person)? Does escalation repeat if unanswered? | 🟡 | `[Barry]` Ch2 |
| 36 | Scope boundary | Back-office PO/invoice/supplier-order process stays outside ClearSky (not disputed) — but `ACT-CALL-004`'s exact field schema is undocumented beyond its name, so every "logged against the record" claim in the stories is inferred shape, not a confirmed field name. | 🟡 | `[Barry]` Ch3–6 |
| 37 | Job fulfillment | No trigger exists for "supplier delivery received." | 🟡 | `[Barry]` Ch5 |
| 38 | Job fulfillment | No Action logs "job completed" as its own event, distinct from the original sale-time opportunity log. Multiple other proposed items (`ACT-REV-008`, invoice timing) depend on this existing. | 🟡 | `[Barry]` Ch5 |
| 39 | Job fulfillment | No Action logs invoicing or a payment closing out a balance. | 🟡 | `[Barry]` Ch5–6 |
| 40 | Job fulfillment | No concept of a transaction's open/closed status exists anywhere — new schema entity, or reuse `ACT-TASK-001` chains via `thread_id`? | 🟡 | `[Barry]` Ch5 |
| 43 | Action Library | See `ACT-CALL-011`/`012` in Section A — no slot-collision handling specified. | 🟡 | `[Barry]` Ch6 |

---

## Section C — Open decisions unrelated to either story (general backlog)

Not blocking the stories specifically, but open regardless.

| # | Area | Decision needed | Priority | Source |
|---|---|---|---|---|
| 1 | Fingerprinting | Which fingerprint technique/library — nothing named, no implementation in `reference-code/`. | 🔴 | `[General]` |
| 2 | Fingerprinting | Where same-device vs. cross-device gets computed — client pixel heuristic, or hub-side comparison. | 🔴 | `[General]` |
| 3 | Fingerprinting | `/hub/fingerprint/...` endpoint + fingerprint field in pixel state — blocked on #1. | 🟡 | `[General]` |
| 4 | Normalization | Phone E.164 edge cases — malformed numbers, default-to-+1 policy. | 🟡 | `[General]` |
| 5 | NurtureSequence | `sequenceType` config — own table, or hub-side only? | 🟡 | `[General]` |
| 6 | NurtureSequence | Tone-selection model — direction set (bucket-driven), not locked. | 🟡 | `[General]` |
| 7 | NurtureSequence | Confirm Automate-not-Approve execution mode holds once the send pipeline is scoped. | 🟡 | `[General]` |
| 9 | Call binding | TTL on session→tracking-number binding — default proposed 10 min, needs locking. | 🟡 | `[General]` |
| 10 | Call binding | Tracking-number pool size at scale. | 🟢 | `[General]` |
| 11 | Call binding | Rep screen renders both Tier 1 and anonymous 2B states. | 🟡 | `[General]` |
| 12 | Call binding | Caller-ID match policy, shared/family number handling. | 🟡 | `[General]` |
| 13 | Call binding | Channel → dedicated-number map for launch. | 🟡 | `[General]` |
| 26 | Tier routing | GBP Phone Call/LSA on a blocked or shared caller ID — Tier 2B or held differently? | 🟡 | `[General]` |
| 27 | Tier routing | GBP Message — Tier 2 on send, or 2B until a reply identifies them? | 🟡 | `[General]` |
| 28 | Tier routing | Facebook Graph API single in-window click — Tier 1 promotion or stays 2B? | 🟡 | `[General]` |
| 29 | Tier routing | ViewRoom/Visualizer attribution — does a successful attribution upgrade the whole session to Tier 1? (Lead Grabber itself already resolved — see Section E.) | 🟡 | `[General]` |

---

## Section D — Known build status (not decisions — just not built yet)

| Item | State | Source |
|---|---|---|
| ContentRadar Engine 2 (Watch Market Intelligence) | Designed; data pipeline not built | `[General]` |
| AI content-quality baseline | Not established; full human review Months 1–4 | `[General]` |
| Diagnostic Layers 4–12 | Mostly mocked (1, 2, 2B, 3 live) | `[General]` |
| `CallEvent` → `events` bridge | Missing link between call records and the events table — needed for any call to reach Outcome/Feedback at all. Two-fire mechanism proposed, not built. | `[Denise]` Ch3–4 |
| IVR-selection scoring delta table | Proposed (deterministic delta per menu option), depends on the bridge above. | `[Denise]` Ch3 |
| Appointment-reminder comm-id linkage | Proposed: reminder email + SMS share `events.thread_id` back to the originating call. Reuses an existing field; not shown implemented anywhere. | `[Denise]` Ch4, reused `[Barry]` Ch4 |
| **Appointment scheduling / technician-capacity system** | **No spec anywhere describes the real calendar/availability system.** Both stories hit this independently — Denise needs a slot release/rebook, Barry's mechanism (`ACT-CALL-010`/`011`/`012`) only works because he's a single rep with nothing to conflict-check. This is the single biggest shared gap between the two stories. | `[Both]` |
| **Post-job relationship-maintenance system** | Holiday/anniversary touches, follow invites — nothing generates these. `ACT-COM-004` proposed (Section A) as a partial answer. | `[Both]` |
| **Facebook Page follow-back automation** | Webhook-driven (`page.follows.added` → automatic follow-back), reciprocal-only. Proposed, not built. Also unconfirmed: whether Meta's platform even permits a business Page to programmatically follow an individual back. | `[Both]` |
| Birthday/anniversary date capture | No schema stores this beyond `completed_at`. Would need deliberate manual capture. | `[Denise]` Ch8 |

---

## Section E — Already locked (FYI, no action needed — just don't relitigate)

Condensed; full reasoning for each is in the tracker's "Already resolved this session" log if you want it.

- Identity tiers (1/2/2B/3), 10-second record floor, email-hash→Tier 1, cross-device 70% cap, SHA-256 normalization, NurtureSequence schema, `POST /hub/profiles/merge` — all pre-existing, confirmed against MA v3.
- Call-tracking model: two number types (session-bound dynamic for owned surfaces, dedicated permanent for outside channels).
- Email engagement tracked on clicks only, never opens (Apple MPP makes opens false signal).
- `CallEvent.sms_consent` — nullable boolean, populated by AI reading the transcript, not asserted by IVR or entered manually.
- Repeat IVR-selection deltas on an already-converted contact are harmless noise — not suppressed at Event Intake (that's Signal Detection's job).
- Bucket demotion suspends entirely while an appointment is open; resumes when it closes.
- Lead Grabber: both speak-now (phone) and email-me reach Tier 1 on submission — no mode distinction.
- Facebook follow-back is reciprocal-only, never proactive — RightFlush never follows an individual first.
- Emergency detection requires an actual qualifying condition (cold context, trigger word, or a listed hazard) — "no hot water" alone isn't enough.
- Callback-request auto-reply fires automatically based on content type (non-financial/non-technical = Sarah's pre-approved template), not urgency classification.
- `emergency_type` always populates a value, even when `emergency: false` — the Orchestrator needs it either way for template lookup.
- Approval routing: Sarah handles non-financial/non-technical content; Bert handles anything originating a *new* pricing/technical judgment call. Relaying an already-set figure back to a customer is Sarah's domain, not Bert's, even if it's a dollar amount — but it still goes through her review, doesn't skip approval.
- SLA breach escalation: at `sla_minutes + 5`, three channels fire together at the rep (SMS, push, automated call with DTMF bridge option) if no outbound contact is found in the logs.
- SLA-bridge connect now plays a merge/recording disclosure to the customer before joining the call, on top of the standing generic recording notice.
- Outbound calls landing on the customer's own carrier voicemail are still captured under the existing generic `call_connected` recording trigger — no new mechanism needed, this was a documentation-reading question, not a build gap.

---

## Verification items (confirm a value, no new decision)

| # | Item | What to check |
|---|---|---|
| V1 | `call_click` scored delta | Confirm its pixel score delta + bucket tag (+active, strong, per the story). |
| V2 | Grace/half-life values | Comparison grace 7d/half-life 30d, Research half-life 60d — confirm against the current Four Buckets report (Rory's copy may be stale). |

---

**Sync note:** Rory's copies of the Four Buckets report and possibly the master architecture doc may be behind whatever's actually current on your side — if anything in Sections B/C looks already resolved in your repo, flag it back rather than assuming this list is current.
