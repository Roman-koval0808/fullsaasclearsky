# ClearSky — Callback Request & Response Protocol

Consolidates decisions locked across this session (2026-07-05) into one spec. Previously scattered as incremental patches across `ClearSky_Orchestrator_Master_Report.md` (Step 3 / Step 4 area) and `clearsky-open-decisions-tracker.md`. Those files still carry the individual locked-decision log entries; this document is the canonical, single-read reference for the mechanism itself. Worked example throughout: Barry's Lead Grabber submission (`customer-journeys/01-clearsky-home-01John.md`).

## 1. Scope and trigger

**The trigger is not an urgency or emergency classification — it's that a customer asked to be called back.** Any inbound contact requesting a callback (Lead Grabber, contact form, missed call, voicemail) enters this protocol, regardless of what the AI later determines about how serious the situation is.

This matters because it decouples two things that were previously conflated: *how fast/seriously RightFlush treats the situation* (governed by §4–6 below) versus *whether an automated reply is allowed to fire without a human clicking approve* (governed by §3 — a content-type question, not an urgency question).

## 2. Step 1 — AI classification (no reply drafted here)

The AI Analysis Engine (`ClearSky_A2P_Developer_Spec.md` §5) reads the transcript or submitted text and outputs structured fields — it does **not** draft the customer-facing reply. Relevant fields:

- `emergency` (`true`/`false`) — per §5.4's detection rules. Requires an actual qualifying condition: extreme-cold no-heat/no-hot-water, burst pipe/flooding, sewage backup, gas leak, electrical fire/shock risk, or an explicit trigger word ('emergency', 'fire', 'flooding', 'gas smell', 'no heat'). **A situation described only as "no hot water," with no cold-weather context, does not qualify** — this is Barry's case.
- `emergency_type` — **always populates a value, regardless of the `emergency` boolean** (LOCKED 2026-07-05; supersedes the prior documented behavior where it was `null` whenever `emergency: false`). Examples: `"burst_pipe"`, `"gas_leak"`, `"no_hot_water"`. This is what the Orchestrator keys its template lookup on in §4.
- `urgency`, `opportunity`, `momentum`, `sentiment`, `risk` — unchanged from §5.1, feed Signal Detection (S2) as usual.

## 3. Step 2 — Why the reply can fire without human approval

RightFlush's business configuration (`ClearSky_Orchestrator_Master_Report.md` Step 3) includes `sms_auto_reply_allowed: true`. This alone doesn't authorize *any* content to go out automatically — what makes a specific reply eligible is a separate, content-based rule:

**Approval routing (LOCKED 2026-07-05):** AI-drafted content splits by type, not by urgency.

| Content touches... | Approver | Basis |
| --- | --- | --- |
| Neither pricing nor a technical/service judgment call | **Sarah Jenkins** | Pre-approved **per template**, once, not per send |
| Pricing and/or a technical/service judgment call | **Bert** (owner) | Reviewed **per instance**, every time |

The auto-reply templates in §4 are Sarah's domain — that's what lets them fire instantly, with no wait on a human, for every callback request regardless of urgency.

**Correction (LOCKED 2026-07-06): `ACT-CALL-005` is not an example of Bert's approval domain.** It was previously cited here as a rep's per-call callback script that "touches pricing every time" — that's wrong. ACT-CALL-005 fires the instant the callback request is classified, before any call has happened, so the only content it can contain is a recap of what the customer already said (internal call-context, also logged to the profile). No diagnosis or price exists yet for it to touch. It's automatic, no approval, same bucket as `ACT-CALL-002`/`ACT-CALL-004` — see `ClearSky_A2P_Developer_Spec.md` §6.5. There is currently no worked example of an AI-drafted, customer-facing message that originates a *new* price or diagnosis — Bert's actual pricing/diagnosis happens live, in his own words, during the call itself, which by definition isn't a pre-drafted artifact anything could approve in advance. The Sarah/Bert split below still holds as a rule for if/when such a case arises; it just doesn't have a real example in Barry's story yet.

**Refinement (LOCKED 2026-07-05, same day):** the test is not "does this message contain a dollar figure or technical fact" — it's **who is originating it**. Bert's queue is for content that makes a *new* pricing or technical/service judgment call for the first time (quoting a price, diagnosing a problem, deciding a repair approach). Once Bert has made that call and it's logged against the customer's record, a message that only *relays* the already-decided figure back to the customer — order confirmations, balance-due reminders, status updates quoting numbers Bert already set — is Sarah's domain: she isn't originating pricing, she's confirming data that's already locked. See `customer-journeys/01-clearsky-home-01John.md` Chapter 4 for the worked example (Barry's $2,000 water heater / $500 deposit / $1,500 balance, all Bert's own figures, routed to Sarah rather than Bert).

**Scope limit on this refinement — routing, not approval-skipping.** This only decides *whose queue* a message lands in. It does not extend the §3 "pre-approved template, fires without a human click" exception to anything beyond the callback-ack scenario it was built for. That exception exists to solve a specific problem: a customer *asked* to be called back, so the ack has to fire before a human can review it, and the fixed, variable-free wording makes that safe. Order-status content routed to Sarah under this refinement still goes through her normal `ACT-COM-001` approval — nobody asked her to reply instantly, so there's no reason to bypass her review. "Routes to Sarah, not Bert" and "fires without approval" are two separate questions; only the callback ack in §4–5 answers yes to both.

## 4. Step 3 — Deterministic template lookup (Orchestrator, not AI)

The Orchestrator reads `emergency_type` and does a plain lookup — no generation happens on the reply side.

| `emergency_type` | Template sent | Status |
| --- | --- | --- |
| `burst_pipe` / `flooding` | *"Turn off your main water valve — usually in the basement near where the water line enters the house. A representative will call you in `sla_minutes` minutes."* | Locked |
| `gas_leak` | *"Leave the building immediately and call 911. Once you're safe, call us back and we'll help right away."* (matches the existing FAQ gas-safety line) | Locked |
| `sewage_backup` | Not yet written | **Open — tracker #33** |
| `electrical_fire_or_shock` | Not yet written | **Open — tracker #34** |
| `no_hot_water` / anything else | Generic, time-of-day-gated acknowledgment (§5) | Locked (fallback) |

## 5. Step 4 — Time-of-day gating (only reached when `emergency: false`)

**A true `emergency: true` classification bypasses this section entirely** — see §6. This table only governs the case where `emergency: false`, regardless of `emergency_type` or how high `urgency` reads (Barry's `no_hot_water` case included):

| Condition | Automated reply |
| --- | --- |
| Inside `office_hours` | *"A representative will call you in `sla_minutes` minutes."* (RightFlush: **`sla_minutes: 10`**) |
| Outside `office_hours` | Asks directly: *"Is this an emergency or do you need this looked at right away?"* — yes routes to immediate after-hours dispatch (after-hours rate applies) |
| Outside `office_hours`, confirms it can wait | *"A representative will call you by 9:00 AM."* |

This auto-reply fires under `sms_auto_reply_allowed`, distinct from `ACT-CALL-008` (`Send SMS follow-up (if opted in)`) — that action is a marketing-style follow-up gated on SMS opt-in and human approval. This is a transactional acknowledgment of a request the customer just initiated themselves. **Consent basis for this specific transactional reply is still undefined — tracker #30, open.**

## 6. True emergencies bypass all of the above timing logic

Already established elsewhere, not overridden by anything in this document: `CLAUDE.md` — *"Emergency overrides everything."* The FAQ — RightFlush answers *"24 hours a day, 7 days a week... no voicemail,"* and emergencies are explicitly *"situations that can't wait until regular business hours."* The IVR emergency-routing rule (`ClearSky_A2P_Developer_Spec.md` line 210) bypasses standard queue logic and connects immediately, with no time-of-day carve-out. `ACT-CALL-003` (create emergency dispatch alert) is `Automatic (immediate)`.

So: `emergency: true` → immediate response, 24/7, always. The §5 table never applies to it.

## 7. SLA breach escalation

Nothing prior to this protocol monitored whether a callback commitment was actually *kept* — `ACT-CALL-001` (create callback task) and `ACT-CALL-002` (alert the team) fire once, at task creation, and nothing watched afterward.

**Monitoring:** at `sla_minutes + 5` minutes after task creation (RightFlush: 10 + 5 = **15 minutes**), check Telnyx/A2P call and SMS logs (`ClearSky_A2P_Developer_Spec.md` §8) for any outbound call or SMS from RightFlush to the customer's number. None found → breach.

**Escalation — three channels, firing together, all aimed at the assigned rep (not the customer):**

1. **SMS** — *"SLA VIOLATION — callback to [customer] is overdue. Call now."*
2. **Push notification** — same content.
3. **Automated phone call** — recorded message: *"This is ClearSky. You are in violation of your response SLA for [customer]. Press 1 to be connected to the customer now."* A DTMF press bridges the rep directly to the customer's number — the system does not connect on its own; it requires the rep's authorization first.

**When the bridge connects — disclosure to the customer (LOCKED 2026-07-06).** The customer didn't ask for a bridge — they're expecting an ordinary callback, not to be merged into a call placed by an autocaller. Before the rep and customer are actually connected, the IVR plays a short disclosure naming who's joining and confirming the call is recorded: *"I am merging your call with [rep name], [role] of [business]. This call is recorded."* This is in addition to, not a replacement for, the standing generic recording notice already required on every connected call (`ClearSky_A2P_Developer_Spec.md` §4.1, "This call may be recorded") — that generic notice doesn't identify who's joining or that a merge is happening, which the customer has no way of anticipating here.

**After the call ends — appointment commitment extraction (LOCKED 2026-07-06, proposed mechanism).** Per `ClearSky_A2P_Developer_Spec.md` §6.6, a completed live call is recorded, transcribed, and passed to the AI Analysis Engine and Orchestrator the same as a voicemail (`source_type: live_call`). If the rep states a concrete commitment on the call — a date/time they'll be on-site, a callback time, anything schedulable — the AI extracts it from the transcript and triggers two writes, both automatic/no-approval since neither originates a new judgment call, they just record what the rep already said on his own recorded call:

1. **Rep's calendar** — a new proposed Action, not yet in the locked library: `ACT-CALL-010` ("Write appointment commitment to rep calendar"). Automatic, no approval — same reasoning as `ACT-CALL-005`/`ACT-CALL-004`: it only recaps what was already said, nothing new is being decided.
2. **Customer's profile** — reuses `ACT-CALL-004` (`Log opportunity to CRM`), with the appointment time as an additional logged fact. Same field-schema caveat as before: `ACT-CALL-004`'s exact schema isn't documented beyond its one-line name, so "appointment logged against the record" is the sensible shape, not a field name to point to directly.

**This is a narrow mechanism, not the full appointment/technician-capacity system** still flagged as unbuilt elsewhere (tracker's Known Build Status list). It only covers a single rep stating his own availability on a call he's already on — no capacity check, no conflict detection, no multi-technician coordination. The broader system gap stays open.

**Open — tracker #35:** who this escalates to when the assigned rep is Bert himself (the two-person-shop problem — no third person to escalate to). Also open: whether the escalation repeats if unanswered, or eventually routes to Sarah as a human-in-the-loop backstop despite the content being neither financial nor technical.

## 8. Worked example — Barry

See `customer-journeys/01-clearsky-home-01John.md` Chapter 2 for the full narrative trace: `emergency: false`, `emergency_type: "no_hot_water"`, inside business hours → generic acknowledgment fires instantly (Sarah's pre-approved template) → `ACT-CALL-002` alerts Bert → Bert doesn't act within 10 minutes → breach fires at 15 minutes → the autocaller reaches Bert, he authorizes the bridge, the IVR discloses the merge and recording to Barry, and the callback happens five minutes late. On the call, Bert commits to an on-site visit at 3:00 PM and promises to text when he's on his way; once the call ends, the transcript is analyzed and the commitment is written to Bert's calendar (`ACT-CALL-010`) and Barry's profile (`ACT-CALL-004`).

## 9. Open items index

All logged in `clearsky-open-decisions-tracker.md`:

- **#30** — consent basis for the transactional auto-reply SMS
- **#31** — no signal covers sustained dwell on the home page's Emergency band (unrelated pixel-layer gap, not part of this protocol, cross-referenced from Barry's journey)
- **#33** / **#34** — `sewage_backup` / `electrical_fire_or_shock` templates not yet written
- **#35** — who backstops Bert on an unresolved SLA escalation
