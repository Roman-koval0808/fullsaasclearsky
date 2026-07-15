# Serhii's implementation vs. the customer journeys — comparison findings

**Date:** 2026-07-07 · **Compared by:** running the two canonical journeys
(`RightFlush-Denise-Customer-Journey.md`, `customer-journeys/01-clearsky-home-01John.md`)
against Serhii's live code and against our prototype engine (`prototype/`).

**Serhii's code:** `/Users/{user}/code/projects/a2p` — a pnpm monorepo with two apps:

- **`lead-grabber-v1`** — SvelteKit A2P side: Telnyx voice/SMS, orchestrator, IVR, calendar, a pipeline simulator — **and now the CDP too.** The `profiledb` engine (identity/tier, scoring, event registry, telemetry intake) has been **merged into** `lead-grabber-v1/src/lib/server/profiledb/`, wired to the `/api/v1/telemetry/events` route. That merged copy is the **live** path — every citation below points to it.
- **`profiledb`** (standalone `apps/profiledb`) — still present as a **stale duplicate**, not the wired-up path. Verified 2026-07-07: `scoring.service.ts` and `eventRegistry.ts` are byte-identical between the two copies, and `identity.service.ts` differs only in imports/whitespace — so every finding below holds against the live merged code.

This is the _"run it through and compare — is it doing what we're supposed to be
doing, where are the bottlenecks?"_ pass. Severity: 🔴 contradicts a **locked**
decision · 🟠 real behavioural divergence · 🟡 minor / reconcile · ⚠️ verify.

> One suspicion was **checked and cleared**: I thought `page_load` was hard-coded
> to a flat `0` delta (ignoring the site's page-specific values). It isn't — the
> telemetry controller uses the client-supplied delta when it's `> 0`
> (`telemetry.ts:301`), so page-authored deltas (blog `+3`, gallery
> `+5`) _are_ honored. Not a divergence. Left here so it isn't re-raised.

---

## 1 · Where Serhii matches the stories ✅

These build confidence that the two sides share a common model.

| Area                                    | Story / prototype                                                                             | Serhii                                 | Where                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| Decay grace / half-life                 | comparison 7d/30d · research 14d/60d · active 3d/14d                                          | **identical**                          | `lead-grabber-v1/src/lib/server/profiledb/scoring.service.ts:6`          |
| Demotion thresholds                     | active<35 · comparison<20 · research<8, multi-level, needs past-grace **and** under-threshold | identical                              | `scoring.service.ts:77`, `:94`                         |
| Score cap / escalate-only bucket        | `min(…,100)`, bucket never downgrades in-session                                              | identical                              | `scoring.service.ts:74`, `telemetry.ts:305` |
| Core pixel deltas                       | scroll_25=3 · scroll_50=5 · scroll_75=7 · dwell_30=4 · dwell_60=7 · phone_click=15            | identical                              | `lead-grabber-v1/src/lib/server/profiledb/eventRegistry.ts`                |
| Page-authored deltas honored            | client delta wins when `>0`                                                                   | yes                                    | `telemetry.ts:301`                          |
| Email/phone → Tier 1 immediately        | strong identifier resolves                                                                    | yes                                    | `identity.service.ts:152`, `:256`                      |
| Cross-device: no fingerprint-only merge | <70% cap → merge only on identifier match                                                     | yes (merges only on email/phone match) | `identity.service.ts:144`–`211`                        |
| Review is a signal, not a score event   | delta 0                                                                                       | `gbp_review_received: delta 0`         | `eventRegistry.ts`                                     |

**This resolves tracker V2** — the story's grace/half-life numbers were correct.

---

## 2 · Divergences — where his code does _not_ do what the stories say

### 🔴 D1 · A non-canonical "Tier 2A" exists

**Story/locked:** the model is **Tier 1 / 2 / 2B / 3**. There is no 2A.
(`CLAUDE.md` LOCKED DECISIONS; `HANDOFF.md` even records fixing a "2A" typo in the specs.)
**Serhii:** a name-only visitor (no email/phone) is set to **`Tier 2A`**, group 4.

- `lead-grabber-v1/src/lib/server/profiledb/identity.service.ts:156`, `:260`, `:303`
- `lead-grabber-v1/src/lib/server/profiledb/telemetry.ts:272`, `:275`, `:550`
- `lead-grabber-v1/src/lib/server/profiledb/offline.ts:128`
  **Impact:** a whole tier exists in production that the canonical model doesn't define.
  **Recommendation:** decide — does "name-only" collapse into Tier 2B, or is 2A a
  real tier that needs adding to the locked model? Right now code and spec disagree.

### 🔴 D2 · The engagement score decrements (the story says it can't)

**Story/locked:** _"the Engagement Score has no decrement mechanism, by design"_
(Denise Ch3). Flat-additive, never decrements mid-session.
**Serhii:** the registry has **negative deltas** and they are applied (floored at 0):
`form_abandon −8`, `rage_click −5`, `dead_click −3`, `chat_close_no_send −4`,
`page_exit_fast −6`, `apt_form_abandon −12`, `appointment_noshow −20`.

- `lead-grabber-v1/src/lib/server/profiledb/eventRegistry.ts` (friction/disengagement rows)
- applied at `telemetry.ts:305` — `Math.min(Math.max(0, scoreRaw + delta), 100)`
  **Impact:** the score _drops_ on friction events. Directly contradicts the locked design.
  **Recommendation:** reconcile. Either the "no decrement" rule is stale and friction
  penalties are intended (then update the spec/story), or the negatives should be
  removed / moved to a separate friction axis. Someone has to pick.

### 🟠 D3 · Bucket is derived from score bands, not the event's page/tag

**Story/prototype:** each event carries a page-authored bucket tag; the bucket
**escalates only** on the priority ladder (blog `page_load`→research, gallery→comparison).
**Serhii:** `getNextBucket` computes the bucket from **live-score bands** plus an
active-signal count and keyword checks — it does **not** use the event's own
`bucketSignal`:

- `≥45 + conversion → active` · `≥25 → comparison` · `≥9 → research`
- `scoring.service.ts:40`–`75`; active-signal count assembled in `telemetry.ts:314`
  **Impact:** same events → different buckets. Concrete case: **Denise's gallery
  session at score 17 lands in `research` in Serhii's code, but `comparison` in the
  story** (17 < the 25 comparison band). The registry defines a `bucketSignal` per
  event, but the scoring function ignores it for bucket assignment.
  **Recommendation:** decide which model is canonical — page-tag escalate-only (story)
  or score-band (Serhii). They will disagree on live traffic.

### 🟠 D4 · Decay formula subtracts grace before decaying

**Prototype:** `score_live = score_raw · 0.5^(idleDays / halfLife)`.
**Serhii:** `score_raw · 0.5^((idleDays − grace) / halfLife)` — decay starts _after_
grace ends (`scoring.service.ts:33`).
**Impact:** the two produce different intermediate `score_live` values (Serhii's is
higher for the same idle time). Outcomes agreed on the cases checked (Denise's
laptop still demotes comparison→research by day 11), but a demotion near a
threshold boundary could flip. Minor but real.
**Recommendation:** pick one formula; our prototype can adopt Serhii's if his is canonical.

### 🟡 D5 · A few registry defaults differ from the story deltas

`form_submit = 20` (story Lead Grabber submit is **+15**); `appointment_booked = 25`
(story "Appointment booked" is **+20**) — `eventRegistry.ts`.
**Caveat:** the client-supplied delta wins when `>0` (`telemetry.ts:301`),
so if the site fires these events with the story's delta, the registry default is
never used and this is moot. **Verify what the site actually sends** before treating
it as a real gap.

---

## 3 · Missing — as Rory expected

### ⛔ No SLA-breach → escalation → autocaller bridge-merge

Barry's centerpiece (10-min callback SLA → 15-min breach → SMS + push + automated
call → owner presses 1 → Telnyx bridge-merge) is **not implemented anywhere** in
Serhii's code — no `sla`, `breach`, `escalat`, `bridge`, or `merge` logic in the
A2P source. This matches Rory's own note: _"this is something we don't have."_
`call-state.ts` only does session-TTL cleanup, not SLA tracking.
Our prototype models the whole sequence (`prototype/src/engine/a2p/a2p.ts`); his
code is the place to build it.

---

## 4 · Built _beyond_ the story (a stale tracker gap)

Serhii built a **real Google Calendar availability + reschedule system**:
`lead-grabber-v1/src/lib/server/google-calendar.ts`, `calendar.ts`,
`orchestrator.ts` (`resolveReschedule`, availability lookups, booking links).
The stories flag the **"appointment/technician-capacity system"** as an _unbuilt_
gap — so that tracker item is at least **partially stale**. His orchestrator (555
lines) is really a **conversational SMS engine** (reschedule detection, appointment
history, availability, self-service booking links) — a different emphasis than the
story's §6.4 signal→action pipeline.

Also present and not in the story model: a **`method` (1–5)** multi-method scoring
dimension and a **`group` (2/3/4)** dimension alongside `tier` (`eventRegistry.ts`,
`identity.service.ts`).

---

## 5 · Needs verification ⚠️

- **10-second record-creation floor (§4.5a).** Not found in `identity.service.ts`
  (creates a profile on first fingerprint, no dwell gate) or in the merged
  `telemetry.ts` / `/api/v1/telemetry/events` route (re-checked in the live copy).
  **Appears not implemented.** If a visitor below the
  10-second floor still gets a record, that locked rule is being skipped — confirm
  across the full telemetry path before concluding.
- **D5 deltas** — confirm what the RightFlush site actually sends for `lg_submit` /
  `appointment_booked`.
- **Bucket path (D3)** — confirm `getNextBucket` is the live path and the registry's
  per-event `bucketSignal` isn't consumed elsewhere.

---

## 6 · How to reproduce

Our prototype (`prototype/`, `npm run sim` / `npm test`) reproduces the stories'
expected outcomes. To diff against Serhii: run the same example through his
`pipeline-simulator.ts` (`lead-grabber-v1/src/lib/server/pipeline-simulator.ts`) and
compare tier/bucket/score/actions at each step against the Ch8 touchpoint tables.
The divergences above (D1–D4 especially) will show up as different tier/bucket/score
for the same input.
