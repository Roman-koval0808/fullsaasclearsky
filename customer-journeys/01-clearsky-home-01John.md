# 01-clearsky-home-01John

**Origin:** ClearSky pixel — home page (`design/rightflush-site/rightflush-home__3_.html`), 1st arrival at this origin-context
**Persona archetype:** John1 — male, 35, married, 3 kids. Drives behavior only; not necessarily the name revealed below.
**Entry tier:** 2B (per `specs/clearsky-provider-tier-mapping.md` §Stream A row 1 — anonymous session past the 10-second floor, fingerprint + session ID, no identifier)
**Status:** ✅ complete for this installment — Chapters 1–7 (arrival → conversion → urgent-not-emergency classification → 10-min callback confirmed → off-script back-office split → sales order and ongoing status communication → job fulfillment and transaction close → self-service install booking → post-job review, check-in, and Cohort 2 write).

## For Serhii — how to read this

Same format and purpose as Denise's story (`RightFlush-Denise-Customer-Journey.md`) — read her intro if you haven't, the conventions are identical: `→` asides and `ACT-*`/`SIG-*` IDs cite the real spec files (verify before building, don't take the story's word alone), **"LOCKED [date]"** is settled and safe to build against, **"proposed / not yet in the locked library / tracker #NN"** needs your review before it's real, and **"gap / open / flagged"** needs a product/eng decision, not an assumption.

What's different about this one: Barry starts from a different entry point (ClearSky pixel → home page, not the blog/ContentRadar path Denise took) and runs the loop a second time, independently. Two things worth knowing before you read it:

- **Where it repeats Denise's findings, that's confirmation, not duplication** — most notably, the appointment/technician-capacity system gap shows up again here from a completely different angle (an SLA-breach callback commitment, then a two-week-later self-service reschedule), which is a stronger signal that it's a real hole than either story alone would be.
- **Several decisions got refined mid-story**, in response to real pushback while writing it — most importantly, `ACT-CALL-005` was originally documented as a customer-facing draft needing approval and turned out, on closer inspection, to be an internal call-context summary that never should have been approval-gated at all (see Chapter 2 and `ClearSky_A2P_Developer_Spec.md` §6.5's correction note). If you're cross-referencing against an older read of this file or the A2P spec, check the "corrected"/"LOCKED 2026-07-06" notes before trusting an earlier impression.

Same consolidated list as before: `specs/clearsky-open-decisions-tracker.md`, now carrying items from both stories through #43. Same punch-list version too: `specs/clearsky-serhii-issues-list.md`.

---

## Chapter 1 — No hot water on a Tuesday morning

It's not a burst pipe. It's worse in the way that matters to a father of three on a school morning: the water heater has been making a low rumbling sound for about a week, and this morning nobody's shower ran hot. Three kids, one bathroom, and a wife who has an 8am meeting. Barry doesn't know yet that a rumbling tank and cooling water are two of the five textbook warning signs a water heater gives before it fails outright — he just knows there's no hot water and he has forty minutes before everyone needs to be out the door.

He does what most people do first: he searches on his phone in the kitchen, standing in front of a running-cold tap. RightFlush's home page (`rightflush-home__3_.html`) is what he lands on.

### Arrival — Tier 2B, by design

The moment the page loads, `firePixel('page_load', 'Page load — session started', 0, 'unclassified')` fires (`rightflush-home__3_.html` line 1218). Nothing about Barry — not his name, not his situation, not even that this is a water-heater problem — exists anywhere in ClearSky yet. Per `specs/clearsky-identity-tiers-canonical.md` §4.5a, the 10-second floor is the actual gate on whether a record exists at all; below it, this is aggregate noise only. Barry clears it without trying — he's not glancing and leaving, he's reading.

Once the floor clears, per the same spec: *"A qualifying anonymous visitor is Tier 2B immediately, not held in an undefined state until they convert."* A record is created now — cookie + fingerprint, no identifier, real and engaged. This matches `clearsky-provider-tier-mapping.md` row 1 (ClearSky pixel → entry tier **2B**) exactly. The system does not know a father with three kids and a dead water heater just walked in. It knows: session started, device fingerprinted, nothing else.

### What he actually does on the page

Barry doesn't linger on the hero. He's not here to be sold — he's here to find out if this is going to be a $200 problem or a $2,000 problem, and whether these people will actually show up. His attention goes almost immediately to two places on the page:

- The **Emergency band** (`rightflush-home__3_.html` line 937): *"Burst pipe? Flooding? No hot water?"* — his exact situation, named directly.
- The **Trust bar** and **Trust strip**: licensed & insured, 4.7★/64 reviews, flat-rate pricing, no surprises.

He scrolls past the services grid without clicking anything — he already knows what he needs, he's not browsing eight service categories. `scroll_25` and `scroll_50` fire (lines 1203–1204, `+3` research, `+5` research). He pauses on the "How it works" section — four steps, no ambiguity about what happens next — and dwell_30 fires (`+4` research, line 1213).

This is a deliberately different read than a Comparison-bucket visitor scrolling deep and hovering over service cards. Barry's pattern — direct scroll to the trust signals and the emergency band, no service-card hovers, no tool clicks — doesn't cleanly match `SIG-ENG-003` (`high_intent_page_visit_detected`, triggered on visiting "a high-intent page such as quote, pricing, or contact" per `004_40_signals_seed.sql` line 358) because he hasn't left the home page yet. **This is a gap worth naming rather than papering over**: the pixel-bucket model (research/comparison/active/emergency) captures *how engaged* he is, but nothing in the 40-signal library seems to fire purely from *dwelling on the emergency band of the home page itself* before any navigation or form submission. Logged below.

### Checking the cost before calling — the FAQ detour

Before picking up the phone, Barry does the thing a budget-conscious parent does: he wants a number in his head before a stranger gives him one on the phone. He navigates to `/faq` (`rightflush-faq__2_.html`).

Two questions get expanded — and both are ones we tagged `data-persona="john,..."` earlier this session, for exactly this reason:

1. **"What does a hot water tank replacement cost?"** (`data-persona="john,george,peter,coreen"`) — he reads the $1,200–$1,800 range for a conventional tank, feels the number is survivable.
2. **"What does emergency plumbing cost?"** (`data-persona="john,george"`) — he reads that there's no separate emergency surcharge, just the flat-rate quote before anything starts.

Each expand fires `toggleFAQ()` → `firePixel('faq_expand', 'FAQ expanded [john,george,...]: ...', 5, 'research')` (`rightflush-faq__2_.html` lines 501–507) — the persona tag riding along in the event label, exactly as built. Two expands, two `research` deltas, still 2B, still anonymous. The system has now seen a pattern — pricing-question engagement on hot water and emergency cost — without knowing who's asking or why. That gap (system sees the *pattern*, narrator knows the *reason*) is the tier-honesty boundary working as designed, not a bug.

### Conversion — Lead Grabber, "Call me back"

Reassured on price, Barry doesn't want to keep researching — he wants a callback before the morning gets away from him. He opens the **Lead Grabber** panel (`rightflush-home__3_.html` line 1098), which fires `firePixel('lg_open', 'Lead Grabber opened', 8, 'active')` (line 1276) — the bucket moves to `active` for the first time this session.

He leaves the default "Call me back" mode selected. Three fields, all filled in under pressure, standing in the kitchen:

- **Name:** Barry
- **Phone:** 705-264-2251
- **What's the job?:** *"I have no hot water, can I have your company give me a call right away."*

That third field only exists because of a same-session fix — the site previously hid the "What's the job?" box in speak-now mode, showing it only for email-me. There was no way for a "Call me back" submitter to describe their situation at all. Fixed across all 14 site pages that carry the Lead Grabber widget, not just the home page, since it was the same copy-pasted bug everywhere.

He submits. `submitLG()` fires `firePixel('lg_submit', 'Lead Grabber submitted', 15, 'active')` (line 1287).

This is the identifier moment, and it's also the reveal: **Barry**, not "John." The persona archetype (John1 — 35, married, 3 kids) was always our simulation label for how this person behaves; the name on the actual form was never required to match it, and here it doesn't. Per `clearsky-provider-tier-mapping.md` row 12 (updated 2026-07-05): speak-now (phone) and email-me are **equally valid Tier 1 identifiers** on Lead Grabber submission — no distinction between the two modes on tier outcome. Barry's phone number, entered via the default "Call me back" mode, promotes the session to Tier 1 exactly the same way an email address would have.

`POST /hub/profiles/merge` is called with `profileId: null` (nothing existed for this fingerprint before) — a new hub profile is created and the anonymous 2B session history (page load, scroll, dwell, both FAQ expands) is merged onto it in chronological order, per `clearsky-ma-hub-integration-spec.md` Component steps 3–4. The session is now named: Barry, phone 705-264-2251, job description on file verbatim — *"I have no hot water, can I have your company give me a call right away."*

## Chapter 2 — What the system actually does with it

### AI Analysis — reading Barry's own words

Barry's job-description text — *"I have no hot water, can I have your company give me a call right away"* — goes to the AI Analysis Engine (Claude/LLM, per `ClearSky_A2P_Developer_Spec.md` §5.3-5.4). It's judged against the emergency detection rules, not scanned for a magic word:

- No extreme-cold context mentioned (just "no hot water," not "no hot water and it's -30°C").
- No burst pipe, flooding, sewage backup, or gas leak.
- No trigger words ('emergency', 'fire', 'flooding', 'gas smell', 'no heat').

Result: **`emergency: false`, `urgency: high`, `emergency_type: "no_hot_water"`**. Not a true emergency by the site's own detection rules — but `emergency_type` populates regardless (extended this session to always carry a value, not just when `emergency: true`), because the Orchestrator needs it either way to pick the right auto-reply template. The spec's own worked example (`ClearSky_A2P_Developer_Spec.md` §5.3) is a near match — a caller reporting "no heat," frustrated, wanting same-day service, comes out `emergency: false, urgency: high` too. Barry's case follows the same precedent.

`opportunity: high` (a real repair job, brand-new customer) and `momentum: ready_to_book` (he's not browsing, he wants a callback now) both read cleanly off his message. Sentiment is genuinely ambiguous — his words are plain and direct, not visibly upset — and this journey doesn't resolve that either way.

### Signal Detection and the Orchestrator (S1–S7)

Per `clearsky-master-architecture.md`'s pipeline, every event runs the same seven stages — nothing about Barry's event skips a step:

- **S1 Event intake** — his submission normalizes into an Event, phone matched (no prior profile → new one, already covered in Chapter 1).
- **S2 Signal detection** — `NEW_CUSTOMER_OPPORTUNITY` (`profile_id = null`, `opportunity ≥ medium`) and `BOOKING_OPPORTUNITY` (`momentum = ready_to_book`) both fire, per `ClearSky_A2P_Developer_Spec.md` §6.4. `EMERGENCY_SERVICE` does not — `emergency` is false.
- **S3 Orchestrator — deterministic template lookup, then Business Configuration check** — the Orchestrator reads `emergency_type: "no_hot_water"` and looks it up against the template library (`ClearSky_Orchestrator_Master_Report.md` § Callback-request auto-reply protocol). No `burst_pipe` or `gas_leak` template applies — Barry falls to the generic fallback, which is then gated by time of day against RightFlush's config: `office_hours` (weekday mornings are inside them), `sms_auto_reply_allowed: true`, `sla_minutes: 10` (locked this session, not the generic example's 15). This isn't an emergency-only path — the identical lookup-then-gate sequence runs for *any* callback request; what made the reply eligible to fire untouched is that its content is non-financial and non-technical (Sarah's approval domain, pre-approved per template), not how urgent Barry's case was classified.
- **S4 Action queue** — because Barry's inside office hours, the automated reply fires: ***"A representative will call you in 10 minutes."*** Alongside it: `ACT-CALL-001` (create callback task, automatic), `ACT-CALL-002` (send urgent alert to team, automatic), `ACT-CALL-004` (log opportunity to CRM, automatic), and `ACT-CALL-005` (generate call-context summary, automatic) — all four fire without waiting on a human. None of them are customer-facing drafts; `ACT-CALL-005` just recaps Barry's own submitted words for Bert's benefit before he calls. There's no diagnosis or price to gate on approval yet, since the call hasn't happened.

### The internal alert — before anyone calls anyone

Two things happen automatically, in parallel, the instant the Orchestrator clears S4 — neither one waits on a human:

- **To Barry** — the auto-reply fires: ***"A representative will call you in 10 minutes."*** This is the customer-facing half — pre-approved by Sarah as a template, not approved fresh for this send.
- **To Bert** — `ACT-CALL-002` (`Send urgent alert to team`, automatic, no approval needed) fires the *internal* half: his phone lights up with a ClearSky notification — new lead, urgent, phone 705-264-2251, job description attached verbatim. He didn't have to be watching a dashboard. The Orchestrator pushed it to him the moment S2/S3 ranked the signal and S4 assigned it the compressed, automatic lane.

`ACT-CALL-005` fires alongside it — automatic, no approval, same as `ACT-CALL-002`. It's not a script for what Bert should say; it's an internal summary of Barry's own submitted words, generated for call-prep and also written to his profile. There's no diagnosis or price in it to gate behind approval, because neither exists yet — that only gets formed once Bert is actually on the call, in his own words.

### Ten minutes pass. Then eleven.

Barry's phone stays quiet. The SMS already landed — *"A representative will call you in 10 minutes"* — but ten minutes come and go, and so does the eleventh, and no one has called. He's still standing in the kitchen, water still cold.

Nothing about this is visible to Barry yet, and nothing about it should be treated as fiction later smoothed over: **Bert did not call.** Whatever happened on his end — another job, a bad moment to see the alert, anything — the commitment made in his name didn't get kept.

### Fifteen minutes — the SLA breach fires

Per `ClearSky_Orchestrator_Master_Report.md` § SLA breach escalation (locked this session): at `sla_minutes + 5` — 10 + 5, **fifteen minutes** after the callback task was created — the system checks Telnyx/A2P call and SMS logs for any outbound contact from RightFlush to Barry's number. There is none. The task is in breach.

Three escalation channels fire together, all aimed at Bert, not Barry:

1. **SMS** — *"SLA VIOLATION — callback to Barry (705-264-2251) is overdue. Call now."*
2. **Push notification** — same content, on whatever device carries the ClearSky app.
3. **Automated phone call** — Bert's phone rings. It isn't Barry, and it isn't a person. It's the ClearSky autocaller, playing a recorded message: *"This is ClearSky. You are in violation of your response SLA for Barry. Press 1 to be connected to the customer now."*

The autocaller can bridge Bert straight to Barry's number the instant he presses 1 — no dialing, no looking up the number, no second call to place. It just needs his authorization first; it doesn't connect on its own. Bert presses 1.

### The callback, five minutes late

Before the bridge actually connects the two of them, the IVR plays a disclosure Barry has no way of anticipating — he's expecting an ordinary callback, not a merge: *"I am merging your call with Bert, owner of RightFlush, for quality assurance. This call is recorded."* This is on top of, not instead of, the standing generic recording notice every connected call gets (`ClearSky_A2P_Developer_Spec.md` §4.1) — that one doesn't name who's joining or explain that a merge just happened, and here Barry needs both.

The bridge connects. It's **Bert** — the owner. Per `rightflush-home__3_.html`'s About section (*"The owner still takes jobs. Every call gets a real person"*) and the FAQ (*"The owner answers emergency calls personally"*), and per the protocol locked this session that emergency and urgent get identical treatment: with only two licensed plumbers on staff and no separate dispatcher documented anywhere on the site, Bert is the one who picks up urgent calls too, not just the technically-classified emergencies. Working from `ACT-CALL-005`'s call-context summary — Barry's own words, recapped, not a script telling Bert what to say — he confirms the situation: water heater's been rumbling for a week, no hot water this morning, three kids needing showers before school (this call, recorded and transcribed, is also where Bert gets Barry's full name — **Barry Smith**). Flat-rate pricing applies, same as the FAQ answers Barry already read; there's no separate "emergency surcharge" since this isn't classified as one. He doesn't mention the missed SLA. Barry never has to know the automated system is what actually got him connected, five minutes past what he was promised.

Before hanging up, Bert commits to something concrete: *"I'll be out at your place at 3:00 PM. I'll text you when I'm on my way."*

### What happens to that commitment after the call ends

Per `ClearSky_A2P_Developer_Spec.md` §6.6, the call — recorded from connection to hang-up — gets transcribed once it ends and handed to the AI Analysis Engine and Orchestrator the same way a voicemail would (`source_type: live_call`). Bert's "3:00 PM" isn't just something he said and Barry has to trust he remembers — the transcript is where the AI finds it, and it triggers two writes, both automatic, neither waiting on a human, because neither originates anything new — they only record what Bert already said on his own recorded call:

- **Bert's calendar** — a new proposed Action, `ACT-CALL-010` ("write appointment commitment to rep calendar"), not yet in the locked library (tracker #41).
- **Barry's profile** — reuses `ACT-CALL-004` (`Log opportunity to CRM`), the appointment time added as another logged fact against his record.

**Worth being honest about scope here:** this is a real mechanism, but a narrow one. It resolves *this* case — one rep, stating his own availability out loud on a call he's already on, no scheduling conflict to check because there's no second technician competing for the same slot. It does not resolve the broader gap already flagged elsewhere (no appointment/technician-capacity system exists for cases that *do* need conflict-checking or multi-tech coordination) — that stays open. Also left open: whether Bert's promised "I'll text you when I'm on my way" goes out through A2P (tracked, consent-gated) or from his own personal phone (untracked, outside ClearSky entirely) — not specified either way (tracker #41).

**Status: Chapter 2 complete for this installment.** Barry goes from anonymous 2B arrival to a confirmed same-day callback — five minutes later than promised, recovered only because the SLA-breach escalation caught what a human missed — entirely inside a business-hours window, classified urgent-not-emergency per the site's own detection rules. The call itself is now fully accounted for: disclosed, recorded, transcribed, and its one concrete commitment (3:00 PM) written to both Bert's calendar and Barry's profile before either of them does anything else.

---

## Chapter 3 — Off-script: the parts ClearSky was never built to handle

### 3:00 PM, as promised

Chapter 2 already covered the call itself and the commitment that came out of it — 3:00 PM, logged to Bert's calendar and Barry's profile straight from the transcript. This chapter picks up from there: Bert shows up on time.

He looks at the tank, and makes the call a licensed plumber makes: it's not a repair, it needs replacing.

### The voicemail to his own office

Driving home, Bert calls the RightFlush office line and leaves himself a voicemail: *"Order a new water heater for Barry Smith, took a cash deposit of $500. Prepare a purchase order for the model number."*

Mechanically, nothing distinguishes this from any other inbound voicemail in what's documented — Telnyx records it, transcribes it (`ClearSky_A2P_Developer_Spec.md` §8, `call.recording.saved` → `call.transcription.ready`), and the transcript is handed to the AI Analysis Engine the same way a customer's voicemail would be.

**And that's exactly where this stops fitting.** The AI Analysis Engine's entire output schema (§5.1) — `sentiment`, `urgency`, `emergency`, `opportunity`, `momentum`, `risk` — is built to answer questions about a *customer's* state of mind: how upset are they, how fast do they need help, are they ready to book. None of those dimensions have a sensible answer for *"order a water heater, log a $500 deposit, draft a purchase order."* There's no customer on this call to have sentiment or momentum. Running Bert's own operational voicemail through the same pipeline a lead voicemail goes through would, per the documented schema, produce a classification that doesn't mean anything — the AI has nothing coherent to output for `momentum` or `emergency` on an internal supply-chain instruction.

**Bigger than a classification mismatch — the Action Library doesn't have this at all.** Nothing in `002_seed_rules.sql` or `004_40_signals_seed.sql` covers: creating a purchase order, recording a customer deposit against a job, or triggering a supplier/inventory order. The closest existing action is `ACT-TASK-001` (`create_internal_task`, automatic, generic) — it could crudely catch this as "someone needs to do something," but it's the same blunt-instrument gap already logged elsewhere in the tracker for comparable cases (referral-to-lead creation, Denise Ch9). It wasn't built to carry a dollar amount, a model number, or a purchase-order workflow.

**This reads as a genuine scope boundary, not just an undocumented feature.** Per `CLAUDE.md`, ClearSky is *"an AI-powered managed-growth platform"* — Discovery → Engagement → Conversion → Growth. Ordering inventory, taking deposits, and cutting purchase orders is back-office job/operations management, not customer growth. It's plausible this was never meant to live in ClearSky at all — RightFlush likely has (or needs) a separate system for this, the way most trades businesses run accounting/inventory through something like QuickBooks rather than their marketing platform. But nothing in the specs says that explicitly either — it's an assumption, not a documented boundary.

### What ClearSky's job actually is here

Splitting the voicemail in two resolves the scope question for the part that's actually ClearSky's to handle: **ordering the water heater, cutting the purchase order, and managing the supplier relationship stay outside ClearSky entirely** (tracker #36, unresolved as a system, but not ClearSky's job to solve). What *is* ClearSky's job — squarely inside its documented scope — is updating Barry's customer profile with the parts of that voicemail that are actually about him: the job scope was determined, and a deposit was taken.

That's `ACT-CALL-004` (`Log opportunity to CRM`, automatic, no approval per `ClearSky_A2P_Developer_Spec.md` §6.5) — narrower in what it should touch than the full voicemail content, but it's the right-shaped action: Barry's hub profile gets updated with `service_requested: water heater replacement` and the $500 deposit logged against his record. The purchase order, the model number, the supplier order — none of that touches Barry's profile at all. It's RightFlush's internal operations, not ClearSky's customer record. **Caveat, same honesty check as before:** `ACT-CALL-004`'s exact field schema isn't documented beyond its one-line name in §6.5 — unlike `ACT-COM-001`/`ACT-LEAD-001`/`ACT-TASK-001`, which have full field breakdowns in the seed SQL files. So "deposit logged against his record" is the sensible shape of what this action should do, not a field name I can point to directly.

**Status: Chapter 3 complete for this installment.** The scope boundary is resolved for what touches Barry specifically — his profile gets updated via `ACT-CALL-004` — while the back-office purchasing question (tracker #36) stays open as RightFlush's problem, not ClearSky's.

---

## Chapter 4 — The sales order, and keeping Barry in the loop

### The numbers are Bert's, not Sarah's

Bert finalizes the sales order: a new unit at **$2,000**, the **$500** cash deposit already taken (Chapter 3), **$1,500** balance due on installation. He's the one who priced it — on the visit, looking at the actual tank — and he's the one who logs it against Barry's record. Nothing about that figure passes through Sarah at any point before it's already fixed.

This is exactly the distinction the approval-routing rule needed sharpening on. The original framing — Sarah handles non-financial content, Bert handles anything touching pricing — reads too broadly if taken to mean *any message that contains a dollar figure* needs Bert's per-instance review. That's not the actual concern. The concern is **who is making the pricing call**. Bert made it once, on the visit. Every message from here on that just repeats his number back to Barry isn't a new judgment call — it's a status update quoting a fact that's already locked. Sarah confirming "$500 deposit received, $1,500 balance due" isn't Sarah deciding anything about price; she's relaying what Bert already decided and already entered into the record. (Refined and locked this session — see `clearsky-callback-response-protocol.md` §3.)

**That's a routing question, not an approval-skipping one.** Nobody asked to be called back here — there's no SLA, no urgency forcing a message out before a human can look at it. So none of these three messages get the callback-ack's special "pre-approved template, fires without a click" treatment; that exception exists to solve a speed problem that isn't present in this chapter. What the refinement decides is only *whose desk it lands on*. Since none of these three originate a new price or technical call, they route to Sarah rather than Bert — but they still sit in her `ACT-COM-001` approval queue exactly like any other customer message, and she reviews and sends each one herself.

### Three touches, one thread

Per the same comm-id-linkage pattern proposed for Denise's appointment reminders (`events.thread_id`, tying related messages to one originating record — proposed in that story, still not built as an actual mechanism anywhere in the schema), all three of the following share Barry's original Lead Grabber `thread_id` and go out as `ACT-COM-001` (`send_follow_up_message`) — routed to Sarah's queue, reviewed and approved by her individually, since none of them originate a new figure:

1. **Order confirmed** — *"Thanks Barry — we've ordered your new water heater. $500 deposit received, $1,500 balance due on installation. Estimated arrival: [date]."*
2. **Arrival notice** — *"Your water heater has arrived. We'll be in touch to schedule installation."*
3. **Installation day reminder** — *"Reminder: your water heater installation is tomorrow at [time]."*

Barry gets three plain, predictable messages between the morning he had no hot water and the day someone shows up to install the replacement — no gap where he's left wondering if the $500 he handed over that afternoon actually went anywhere.

### What's still not ClearSky's problem

The purchase order itself, the model number, the supplier relationship — none of that changed this chapter. That stays exactly where Chapter 3 left it: outside ClearSky, unresolved as a system, tracker #36. What's newly resolved here is narrower and squarely inside ClearSky's job: the *customer-facing* communication that keeps Barry informed while that back-office process plays out in the background, using figures Bert already set.

**Status: Chapter 4 complete for this installment.** Sales order finalized at $2,000 / $500 / $1,500, all Bert's own numbers; three status messages carry Barry through to installation day, each reviewed and sent by Sarah, tied together by `thread_id`. The approval-routing rule is refined, not broken: Bert originates pricing, Sarah relays it — and relaying still means she approves each send, since nothing here is urgent enough to skip that step.

---

## Chapter 5 — Closing the transaction

### Not done at the deposit

Chapter 4 sent three messages; it didn't close anything. Per `clearsky-job-fulfillment-workflow.md` (new this session), Barry's $2,000 water heater is an **open transaction**: ordered and paid a deposit against, but not installed and not paid off. That distinction matters enough to formalize — nothing before this session tracked a sale as open vs. closed at all.

### The unit arrives

A supplier delivery lands at RightFlush's shop. **Nothing in the Action library has an event for this** — "supplier delivery received" doesn't exist as a trigger anywhere (tracker #37, new this session). In the specs as they stand, Bert simply knows, the way he'd know any stock arrived, and that knowledge is what lets Chapter 4's arrival notice go out to Barry at all. The gap isn't in the message that fires — it's that nothing upstream of Bert noticing is actually instrumented.

### Scheduling the install

Getting an install date on the calendar hits the same wall Chapter 2 already flagged and Denise's story (Ch6) hit before that: **there is no appointment/technician-capacity system documented anywhere in the specs.** This chapter doesn't invent one. What it can say, consistent with how Chapter 2 handled the same gap, is that an install date gets set the way Barry's original callback did — confirmed as having happened, without asserting a booking mechanism that doesn't exist yet. Chapter 4's install-day reminder is what actually reaches Barry once that date exists.

### Install day: two things happen that nothing logs

**Refined in Chapter 6:** Bert doesn't collect the $1,500 in cash on the spot — he installs the unit and sends an invoice. The distinction matters (invoicing implies the balance is settled *after* the visit, not necessarily during it), but the underlying gap is the same either way. Both of these are real events with no home in the current Action library:

- **"Job completed" isn't a loggable event.** `ACT-CALL-004` logged the opportunity back at the deposit stage; nothing logs the job actually finishing (tracker #38, new).
- **Sending an invoice, and whatever eventually closes the balance, isn't a loggable event either.** Every existing Action assumes a single opportunity-logging moment — nothing represents generating an invoice or a later payment closing out a balance already on the books (tracker #39, refined).

Both are real business facts (job's done, money's collected) that would, if this were a working system, need to write somewhere. Right now they don't have anywhere to write to.

### Closing the transaction — a status that doesn't exist yet

Once install and balance-collection both happen, the transaction should read as closed. **No concept of open/closed transaction status exists anywhere in the specs** (tracker #40, new) — `thread_id` ties Barry's messages together, but nothing rolls those steps up into a single state. This journey treats the transaction as closed at this point in the narrative, while flagging plainly that "closed" isn't a status any documented system actually sets.

### Referral ask and keeping in touch — both land on known gaps, not new ones

Two things RightFlush would actually want to do next: ask Barry for a referral, and stay in touch beyond this one job.

- **Referral ask** — the closest existing gap is tracker #24 (no Action sends a review request after job completion). A referral ask is a sibling of that, not the same thing — review request and referral request are different asks — and neither is built.
- **Keep in touch** — already flagged in the tracker's Known Build Status list as an entirely unbuilt category ("Post-job relationship-maintenance system... nothing was ever asked to solve 'stay in touch after the job's done'"). Barry's case doesn't change that; it just puts a second name against the same gap Denise's story (Ch10) already found.

**Status: Chapter 5 complete for this installment.** The transaction closes narratively — heater installed, balance collected — while four of the mechanisms that would need to exist for a real system to track this (delivery-received trigger, job-completed event, balance-collection event, open/closed transaction status) are logged as new gaps rather than invented. Referral ask and ongoing keep-in-touch both land on gaps this session already knew about, not new ones.

---

## Chapter 6 — Two weeks later: booking the install, the human way

### Bert calls, working from paper

Two weeks after the 3:00 PM visit, the water heater comes in. Bert has the supplier invoice in hand — model number, Barry's name — and calls Barry's home number straight off it. Worth noting plainly: Barry's number is already in his ClearSky profile, has been since Chapter 1's Lead Grabber submission. Bert just doesn't use it — he works from his own paperwork, the way a two-person shop actually runs, not the way a CRM assumes it will. Nothing wrong is happening here; it's just off-script in the same sense Chapter 3 already named.

### The voicemail that still gets captured

Barry isn't home. Bert leaves a message: he's going to email over some open time slots, pick one that works.

This looked like a gap at first read, but it isn't. Recording (`ClearSky_A2P_Developer_Spec.md` §4.1) triggers "automatically on `call_connected` webhook" — a generic Telnyx event that fires the instant the far end picks up, whether that's Barry or Barry's carrier's voicemail system. Telnyx doesn't need Barry personally on the line to connect and record its own leg of the call. And §6.6's "Live Call Handling (not voicemail)" carve-out is written to exclude RightFlush's own *inbound* voicemail-capture flow (§4.2 — calls arriving at RightFlush that go unanswered) — it was never written with this direction in mind, but nothing in it actually excludes an outbound call that happens to end with Bert talking to an answering machine instead of a person.

So: the call is recorded, transcribed, and run through the AI Analysis Engine the same as any completed call. The extracted fact — Bert will email over time slots — gets logged to Barry's profile, reusing `ACT-CALL-004` again: the same flexible logging bucket that already carries `service_requested`, the $500 deposit, and the 3:00 PM appointment. No new Action needed for this piece.

**Honest caveat, not a full gap:** nothing in the spec names this exact scenario verbatim — an outbound call terminating on the recipient's own external voicemail. This reading applies the generic `call_connected` recording rule and the general-purpose logging shape of `ACT-CALL-004`, which is a reasonable inference, not something spelled out word-for-word.

### The scheduling email

Bert's message becomes real: an email goes out to Barry with a handful of open time slots. **New proposed mechanism** — call it `ACT-CALL-011` ("generate available-slots scheduling email from rep calendar"), not in the locked library. It reads Bert's calendar (the same one Chapter 2's `ACT-CALL-010` writes to) for open windows and drafts an email offering them. Nothing about this content touches pricing or a technical judgment call — it's logistics, Sarah's domain, reviewed and sent by her like any other `ACT-COM-001` message, not auto-fired.

### Barry picks a slot

Barry gets home, plays the voicemail, hears there's an email waiting. He opens it, clicks the calendar invite, and chooses 4:00 PM Monday.

That click does two things at once, automatically, no approval needed on either — Barry is just confirming his own choice among options RightFlush already offered, nothing new is being decided:

- **Writes to Bert's calendar.** A second new proposed mechanism, `ACT-CALL-012` ("customer self-service slot selection → write rep calendar, notify rep") — the mirror image of Chapter 2's `ACT-CALL-010`. That one captured a *rep's* spoken commitment from a call transcript; this one captures a *customer's* direct selection from a structured list. Same automatic, no-approval logic applies: nobody's originating a new fact, Barry's just picking one of the options Bert already offered.
- **Notifies Bert.** A push or SMS that Barry booked 4:00 PM Monday — he doesn't have to check the email himself to find out.

**Worth flagging honestly:** nothing here specifies what happens if two customers try to claim the same slot at nearly the same time — no locking or conflict-resolution behavior is described. Low-odds for a two-person shop's install slots, but genuinely undefined.

### Monday morning

The existing mechanism from Chapter 4 handles this cleanly — no new gap. RightFlush sends an email and SMS Monday morning: *"Bert will be there at 4:00 PM today."* Same `ACT-COM-001`, same `thread_id`, Sarah's queue.

### The visit, and the invoice

Bert shows up at 4:00, completes the job. He doesn't collect $1,500 in cash on the spot — he sends Barry an invoice. This refines what Chapter 5 assumed (on-site collection); the underlying gap is the same either way — see Chapter 5's updated note. Neither "job completed" nor "invoice sent" is a loggable event anywhere in the current Action library (tracker #38/#39).

**Status: Chapter 6 complete for this installment.** The install gets booked and completed through a real, narrated mechanism — an outbound call captured under the existing generic recording rule and logged to Barry's profile via `ACT-CALL-004`, a scheduling email, and a self-service slot pick that writes straight to Bert's calendar. Two new proposed Actions (`ACT-CALL-011`, `ACT-CALL-012`) are logged rather than invented past; the outbound-call question resolved to "yes, captured" on a close read of the existing rules rather than staying an open gap.

---

## Chapter 7 — The next two months: review, check-in, and the network

### One month later — the review ask

Bert sends Barry a message with a link to RightFlush's GBP profile, asking if he'd leave a review. **This is the worked example that finally exercises tracker #24** — "no Action anywhere covers sending a review request after job completion" was flagged as far back as Denise's story and repeated in Barry's own gap list. Proposed here: `ACT-REV-008` ("send review request, GBP link"), timed off job completion plus some number of days. Not financial, not technical — Sarah's queue, same as everything else in this family. **Honest caveat:** its timing depends on the "job completed" event from Chapter 6/Chapter 5's tracker #38 — which still doesn't formally exist as a loggable event anywhere. The mechanism is proposed; what it's supposed to fire *off of* is still a gap underneath it.

### Two months later — the check-in

Bert follows up again: how are things going, call him if there's any issue, and thanks Barry once more. **This exercises the other long-standing gap** — the tracker's Known Build Status list has flagged a "Post-job relationship-maintenance system" as entirely unbuilt since Denise's story (Ch10): "nothing was ever asked to solve 'stay in touch after the job's done.'" Proposed here: `ACT-COM-004` ("post-job relationship check-in"), timed some number of days after completion, same non-financial/non-technical bucket, Sarah's queue.

### The Facebook ask — no new gap, just the existing rule applied

Bert asks Barry to follow RightFlush on Facebook. Barry does. RightFlush's Page follows him back.

Nothing new here — this is precisely the rule already locked this session: *"Facebook follow-back is reciprocal-only, never proactive... RightFlush follows a past customer back only after they follow first — never seeks out or follows an individual's personal profile unprompted."* Bert *asking* Barry to follow isn't RightFlush proactively following Barry's personal profile — that's just an ordinary invitation, same category as the review ask. Barry following first is what authorizes the reciprocal follow-back, via the webhook Action already proposed in Denise's story (`page.follows.added` → automatic follow-back). Barry's case is simply the second worked example of a rule that was already settled, not a new decision.

### The log goes to the network

Per `clearsky-layers-reference.md` §System C (Cohort 2 Trajectory Layers), Barry's full trajectory — bucket history, `score_live` path, tier progression, persona/demographic band, language and sentiment signals off his calls, touch timestamps, channel sequence, booked-job outcome — gets written to `cohort2_trajectories`. This isn't Barry's data being broadcast anywhere identifiable; it's the same anonymized, aggregate model the Orchestrator queries across every booked job to recognize patterns in future customers. "Sent to the network" is real, and it's this — not a new mechanism, just the first time this journey has actually reached the point where a job closes and the existing Cohort 2 write applies.

**Status: Chapter 7 complete for this installment.** The review ask and the relationship check-in both finally exercise gaps this project has been naming since Denise's story — proposed as `ACT-REV-008` and `ACT-COM-004`, neither built. The Facebook exchange applies an already-locked rule rather than needing a new one. Barry's trajectory closes into Cohort 2 the same way any completed job's would.

---

## Gaps flagged (folded into `specs/clearsky-open-decisions-tracker.md`)

1. **Open — logged as tracker item #31** — no signal in `004_40_signals_seed.sql` covers sustained dwell on the home page's Emergency band specifically, distinct from `page_load`/`scroll`/`dwell` pixel deltas.
2. **Resolved (LOCKED 2026-07-05)** — Lead Grabber's "speak-now" (phone) mode is confirmed to reach Tier 1 on submission, same as email-me. See `clearsky-provider-tier-mapping.md` row 12 and the tracker's "Already resolved this session" log.
3. **Open — logged as tracker item #30** — consent basis for the auto-reply SMS is still undefined; the existing `sms_consent` framework was built for marketing/follow-up, not this transactional reply, and broadening the trigger to "any callback request" doesn't by itself resolve what the consent basis is.
4. **Open — logged as tracker item #32** — `SIG-CONV-001`/`SIG-CONV-002` are defined twice, differently, across `004_40_signals_seed.sql` and `002_seed_rules.sql`. Not resolved which is authoritative — flagged, not guessed past.
5. **Open — logged as tracker items #33/#34** — `sewage_backup` and `electrical_fire_or_shock` auto-reply templates are not yet written.
6. **Partially resolved (this session) — narrow mechanism only.** Chapter 2 now narrates how Barry's specific 3:00 PM visit got booked: stated verbally on the recorded call, extracted from the transcript, written to Bert's calendar (`ACT-CALL-010`, tracker #41) and Barry's profile (`ACT-CALL-004`). **Still open:** the full appointment/technician-capacity system — conflict-checking, multi-technician coordination — doesn't exist in any spec (same gap Denise's story hit). This mechanism only works because Bert is a single rep stating his own availability with nothing to conflict-check against.
7. **Open — logged as tracker items #37/#38/#39/#40** — no trigger for supplier delivery received, no Action for job-completed, no Action for balance collection, no open/closed transaction status concept. See `specs/clearsky-job-fulfillment-workflow.md`.
8. **Open — same gap as tracker #24, distinct ask** — no Action exists for a post-completion referral request (sibling gap to #24's missing review-request Action, not identical).
9. **Open — logged as tracker item #41** — `ACT-CALL-010` (write appointment commitment to rep calendar) is a new proposed Action, not yet in the locked library; also open whether Bert's promised "on my way" SMS goes through A2P or his personal phone.
10. **Resolved (this session) — tracker item #42.** An outbound call from RightFlush that lands on the customer's own carrier voicemail is still captured: recording triggers on the generic `call_connected` webhook regardless of who/what answers, and the content gets logged to the customer's profile via `ACT-CALL-004`. Caveat: this scenario isn't spelled out verbatim in the spec — it's a reasonable inference from the generic recording rule, not an explicit case.
11. **Open — logged as tracker item #43** — `ACT-CALL-011` (generate available-slots scheduling email) and `ACT-CALL-012` (customer self-service slot selection → write rep calendar) are new proposed Actions, not yet in the locked library. No conflict-resolution behavior is specified if two customers select the same slot near-simultaneously.
12. **Resolved this session (worked example) — tracker #24.** `ACT-REV-008` (send review request, GBP link) is proposed as the mechanism that finally exercises this long-open gap; it still depends on the "job completed" event (tracker #38), which remains undefined.
13. **Resolved this session (worked example) — the Known Build Status "Post-job relationship-maintenance system" gap.** `ACT-COM-004` (post-job relationship check-in) is proposed as the mechanism. The Facebook follow-back exchange applies the already-locked reciprocal-only rule directly — no new decision needed there.
