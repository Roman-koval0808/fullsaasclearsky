# ClearSky — Job Fulfillment Task Chain (Post-Sale Workflow)

**Status: PROPOSED, not locked.** Drafted 2026-07-05 against Barry's case (`customer-journeys/01-clearsky-home-01John.md`) as the worked example. Distinct from `clearsky-callback-response-protocol.md`, which governs the *initial* contact reply — this workflow picks up once a price is set and a deposit taken, and governs everything until the transaction actually closes.

## 1. Why this exists

Chapter 3–4 of Barry's journey established: $2,000 water heater, $500 deposit logged, three status messages sent. That's not the end of the transaction — it's the start of a fulfillment chain with real open steps: the unit has to be ordered, arrive, get installed, and the $1,500 balance has to be collected. **Nothing in the current specs tracks a sale as open vs. closed** — `ACT-CALL-004` (log opportunity to CRM) writes a fact once; nothing represents "this transaction has N remaining steps before it's done."

## 2. The task chain, keyed by `thread_id`

| # | Step | Owner | Mechanism | Built? |
|---|---|---|---|---|
| 1 | Order placed with supplier | Bert, back-office | Outside ClearSky entirely (tracker #36) | N/A — not ClearSky's job |
| 2 | Unit arrives | Bert confirms arrival → triggers step 3 | New trigger, no event type defined for "supplier delivery received" | ❌ missing |
| 3 | Arrival notice sent to Barry | Sarah | `ACT-COM-001`, her queue (relaying Bert's already-set data, per the refined approval rule) | ✅ mechanism exists |
| 4 | Install appointment scheduled | Bert/Sarah + Barry | Needs the appointment/technician-calendar system | ❌ not built — same gap Denise's story (Ch6) and Barry's Ch2 already flagged; nothing new here, just a second worked case hitting the same wall |
| 5 | Install day reminder sent | Sarah | `ACT-COM-001`, same thread_id | ✅ mechanism exists |
| 6 | Install completed | Bert (on-site) | No Action logs "job completed" as a discrete event distinct from the original CRM opportunity log | ❌ missing |
| 7 | Balance collected ($1,500) | Bert or Sarah, at time of install | **No Action anywhere covers taking or logging a payment against an existing balance.** `ACT-CALL-004` logs an opportunity; nothing logs a payment or closes one out. | ❌ missing — new gap, not previously logged |
| 8 | Transaction marked closed | System | No `transaction_status` (open/closed) concept exists on a profile or job record — `thread_id` links messages, but nothing rolls those steps up into a single open/closed state | ❌ missing — new gap |
| 9 | Referral ask | Sarah | Closest existing gap is tracker #24 (no Action sends a review request post-completion) — a referral ask is a sibling of that, not identical (review request vs. asking the customer to refer someone else). Neither is built. | ❌ missing |
| 10 | Ongoing keep-in-touch | — | Tracker's Known Build Status already flags this whole category as unbuilt ("Post-job relationship-maintenance system") | ❌ missing |

## 3. What this proposes that's genuinely new

Steps 4, 9, and 10 are gaps this session already knew about (appointment system, review-request Action, relationship-maintenance system) — this workflow doesn't add new information there, it just shows a second real case landing on the same wall. Steps 2, 6, 7, and 8 are **new** gaps, not previously logged anywhere:

- No event/trigger exists for "supplier delivery received."
- No Action exists for "job completed" as its own loggable event.
- No Action exists for collecting/logging a payment against a balance.
- No concept exists for a transaction's open/closed status, distinct from the CRM opportunity log that started it.

These four are logged as new tracker items (see tracker #37–#40).

## 4. Close condition

A transaction is **not closed** until both step 6 (install completed) and step 7 (balance collected) have happened — order-placed and arrival alone don't close it, and neither does a status message going out. Until then, Barry's profile carries an open task chain, not a completed job.

## 5. Open question this raises, not answered here

Whether the task chain itself is a new schema entity (e.g., a `Job` or `Transaction` table with a status field and ordered sub-tasks) or whether it's better modeled as a sequence of `ACT-TASK-001` generic tasks chained by `thread_id` — same blunt-instrument tradeoff already flagged for referral-to-lead creation (tracker #25) and Denise Ch9. Not decided here; flagged for Rory + Serhii.
