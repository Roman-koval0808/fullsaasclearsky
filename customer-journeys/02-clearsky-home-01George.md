# 02-clearsky-home-01George

**Origin:** ClearSky pixel — home page (`design/rightflush-site/rightflush-home__3_.html`), 2nd arrival at this origin-context
**Persona archetype:** George1 — male, 45, married, 2 kids (1 in university, 1 age 15). Drives behavior only; not necessarily the name revealed below.
**Entry tier:** 2B (per `specs/clearsky-provider-tier-mapping.md` §Stream A row 1 — anonymous session past the 10-second floor, fingerprint + session ID, no identifier)
**Status:** ✍️ in progress — Chapters 1–4 (arrival → comparison-shopping session → reaches `active` bucket via content engagement → leaves without converting → recognized return within the recency window → FotoJobber conversion despite a non-photogenic problem → Tier 1 → honest quote-range response → self-service estimate booking → in-person diagnosis confirmed → real price quoted → deferred to spring with an explicit consent ask for a 6-month check-in). Continues if/when Marcus comes back in the spring.

## For Serhii — how to read this

Same conventions as Denise's and Barry's stories — see either of their intros if this is your first one. What's different here: George is a deliberate contrast case, picked to exercise parts of the system neither of the first two stories touched — the **Comparison** bucket as a sustained pattern (not just a passing rank), a session that reaches the **`active`** bucket through pure content engagement (a guide download) without ever touching a conversion tool, and — set up for the next chapter — a **multi-session return visit** to test bucket decay/demotion a second time, independently of Denise's case.

---

## Chapter 1 — A pressure problem with no name

George isn't in a hurry. Water pressure in the house has been dropping for months — not dramatically, just a little worse every season, the kind of thing you notice most standing in the shower on the top floor. He's fairly sure it's the original galvanized pipe, original to a house that's now pushing 50 years old, slowly closing up with corrosion from the inside. He's not calling anyone about this on a whim. His older kid started university this year; the number in his head for "a plumbing job" has to compete with a tuition number that's already uncomfortable. If this is a real job — and he suspects it is — he wants to understand the cost and the options before he talks to anyone on the phone.

Saturday morning, kids still asleep, he opens his laptop at the kitchen table and searches.

### Arrival — Tier 2B, same as anyone

`firePixel('page_load', 'Page load — session started', 0, 'unclassified')` fires the moment RightFlush's home page loads (`rightflush-home__3_.html` line 1218) — identical mechanism to Barry's arrival, because nothing about *how* the system creates a record cares who's visiting. Per `specs/clearsky-identity-tiers-canonical.md` §4.5a, the 10-second floor is what actually gates a record's existence, not intent or persona. George clears it — he's reading, not bouncing — and a Tier 2B record gets created: cookie, fingerprint, session ID, no identifier yet, matching `clearsky-provider-tier-mapping.md` row 1 (ClearSky pixel → 2B) the same way Barry's did. The system doesn't know it's a cost-conscious father of a university student. It knows: session started, device fingerprinted, nothing else.

### The services grid doesn't quite have his problem

Barry scrolled past the services grid without stopping — he already knew what he needed. George stops. He reads all eight cards, because he's not sure which one describes his situation. **Pipe Repair** (`rightflush-home__3_.html` lines 842–849) is the closest match — *"Burst pipes, frozen pipes, pinhole leaks. Fast response. Full replacement if needed"* — but the copy is written for someone with an active, urgent pipe problem. George doesn't have a burst pipe. He has a pipe that's been quietly failing for years and hasn't burst yet. "Full replacement if needed" is the only phrase in the whole card that's actually about him, and it's the last four words.

**This is a smaller version of the same gap Barry's story already named**: the site's content model is built around named, current problems (no hot water, a blocked drain, a burst pipe) more than a slow, undiagnosed one a homeowner is trying to get ahead of. George clicks into `/pipe-repair` anyway — it's the closest thing on offer — but the click is a compromise, not a confident match.

`scroll_50` and `scroll_75` fire on the home page as he reads down through the grid (`+5`/`+7`, both tagged `comparison` per lines 1204–1205) — his second scroll threshold already outranks where Barry's session ever got. Barry's pattern was a direct beeline to two things (Emergency band, trust bar); George's is a slower, wider read of everything on offer. Bucket moves from `unclassified` to `comparison` on `scroll_50` alone — comparison outranks unclassified on the priority list `[emergency, active, comparison, research, unclassified]`, so nothing else needs to happen for the bucket to already be set correctly for how he's actually behaving.

### The FAQ — reading the two questions that actually matter to him

He navigates to `/faq`. Two questions there carry `data-persona="john,george,peter"` — tagged for exactly this reason:

1. **"How does flat-rate pricing work?"** (`rightflush-faq__2_.html` line 307-309) — *"We assess the complete job before quoting and give you a single flat-rate price... If we open something up and find a problem that changes the scope, we stop, tell you, and get your approval before continuing."* For a job he half-expects to turn into "worse than we thought once we open the wall," this is the specific reassurance he needed.
2. **"Do you charge for estimates?"** (line 311-313) — *"Free estimates on all jobs over $500... The estimate visit costs nothing and there's no obligation to proceed."* This is the sentence that matters most to a comparison shopper: he can get a number without committing to anything.

Both expands fire `firePixel('faq_expand', ...)`, tagged `research` per the FAQ page's own delta table — a reminder that a page's default bucket assumptions (FAQ engagement reads `research`) and a visitor's actual sustained pattern (George is comparison-shopping, not researching a decision he's already made) aren't always the same tag, and don't need to be. The system logs what the event is; it doesn't need to agree with the narrator about what it means.

### Before & After — the page Barry never visited

Curious what a finished job like this actually looks like, George clicks through to `/before-after-gallery`. This page's own `page_load` fires already tagged `comparison` at `+4` (`rightflush-before-after-gallery.html` line 1084) — unlike the home page, which starts every session `unclassified`. Different pages carry different default assumptions about who's likely to land there; a visitor arriving at a gallery of finished jobs is assumed to already be past the "do I have a problem" stage.

He drags the before/after slider on a couple of project photos (`firePixel('ba_slider_drag', ..., 8, 'comparison')`, line 1122) and reads a few testimonials (`testimonials_view`, `+6`, `comparison`, line 723) — nothing here is Lead Grabber, nothing here is a form. It's just looking.

### The financing section — the part that actually speaks to him

Then he hits the section titled *"A bigger job doesn't need to wait"* (`rightflush-before-after-gallery.html` lines 757–786) — RightFlush's financing content, three plans laid out: 0% for 12 months, a low monthly payment spread over 24–60 months, and pay-in-full. He clicks into two of the three plan cards (`fin_plan_view`, `+5` each, `comparison`, lines 766/770), reading the actual terms rather than skimming.

**This is the moment the story tips.** George downloads the linked guide — *"Financing Your Home Expansion"* — and `downloadFinancingGuide()` fires `firePixel('financing_guide_download', 'Financing guide downloaded — device: desktop', 12, 'active')` (line 1046). `active` outranks `comparison` on the priority list. **George's session reaches the `active` bucket without ever touching Lead Grabber, FotoJobber, or any conversion tool at all** — just by engaging deeply enough with content that answers his actual question (can I afford this, and how). Nothing about the bucket-priority mechanism requires a conversion action to reach `active`; it requires an event tagged `active`, and this one legitimately is — a financing guide download is a real signal that someone is seriously evaluating a purchase, arguably a stronger one than a first-touch page load ever could be.

### He leaves anyway

George closes the tab. He didn't fill out Lead Grabber. He didn't try FotoJobber, even though `/faq` told him it's the fastest way to get a quote (`rightflush-faq__2_.html` line 419-421, tagged `data-persona="francine,coreen,george"` — this exact FAQ answer was written with someone like him in mind, and he read it, and still didn't act on it this session). He wants to show his wife the financing PDF before he commits to anything, even something as low-stakes as submitting for a quote. That's not hesitation the system can see — from ClearSky's side, a highly engaged 2B session simply goes quiet.

**Status: Chapter 1 complete for this installment.** George reaches the `active` bucket through content engagement alone — no form, no tool, no identifier — then leaves without converting. Nothing about this is a bug or a gap in the bucket mechanism; it's the system correctly reading a real, if unusual, engagement pattern. What happens next — whether this session decays the normal way, and what a recognized return visit looks like a second time, independently of Denise's case — is Chapter 2.

---

## Chapter 2 — The return, and a photo that doesn't quite prove anything

### Two days, not thirty

He shows the financing PDF to his wife that evening. They talk about it the way people talk about a $2,000–$4,000 decision that isn't urgent yet — not a fight, just a real conversation, the kind that takes a couple of days to actually land on "yes, let's find out what this costs for real." Two days later, he's back.

**Honest gap, not resolved here:** the tracker's verification items document a decay/grace rule for the `comparison` bucket (7-day grace, 30-day half-life) and `research` (60-day half-life) — nothing for `active`. George's session left in `active`, and there's no documented rate for how that would decay if he'd stayed away longer. It doesn't matter for this chapter specifically — two days is well inside any plausible grace window — but it's a real hole for a case where the gap is longer, flagged rather than papered over with an invented number.

### Recognized, not identified

The system doesn't know George came back for a reason. It knows a fingerprint it already has a record for just showed up again. Per the recency-bonus design decision from Denise's story (Ch2) — a recognized return within 3 days adds `+10` — this return qualifies. Still Tier 2B. Still no name. Just a device the system has seen before, showing up sooner than a cold visitor would, which is itself a real signal even before he does anything else.

### Straight to the Contact & Quote page

This time he doesn't start at the home page — he goes straight to `/contact` (`rightflush-contact-quote__1_.html`), which is what the FAQ told him to do two days ago. The page offers four routes side by side: FotoJobber ("Fastest"), book an on-site estimate, call directly, or send a message (lines 504–537). FotoJobber is marked **Recommended** and sits first.

### The photo problem

He picks FotoJobber. And immediately hits the same wall Chapter 1 already named: **his actual problem doesn't photograph well.** A burst pipe photographs itself. Declining water pressure over eighteen months doesn't. He ends up photographing the only physical thing he can point a camera at — an exposed fitting on the old galvanized line under the basement sink — and uploads it. `firePixel('fj_photo_upload', 'FotoJobber: photo uploaded', 10, 'active')` fires (line 1054). It's supporting evidence, not proof of anything. The real diagnostic content is going to have to come from what he types, not what he shows.

He clicks a service category chip — nothing on the list says "declining pressure, suspected corrosion" any more than the home page's service cards did, so he picks the closest one (`fj_service_select`, `+3`, `active`, line 1060) — and focuses the annotation field to actually describe it (`fj_note_focus`, `+6`, `active`, line 1027): the rumbling, the years of gradual decline, what he suspects and why.

### The identifier — and a real inconsistency worth flagging

He fills in his name and phone number. `fj_name_focus` (`+8`, `active`, line 1028) and `fj_phone_focus` (`+12`, `active`, line 1029) fire as he does. This is the reveal: **Marcus Webb**, not "George" — the persona archetype (George1 — 45, married, 2 kids) was always the simulation label for how he behaves, same as Barry's form never had to say "John."

**This is also where a real cross-document inconsistency surfaces, not just a narrative beat.** `clearsky-provider-tier-mapping.md` describes FotoJobber as having "no direct identifier" — riding the existing session unless it happens to capture one elsewhere. But the actual built form (`rightflush-contact-quote__1_.html`'s `submitFJ()`, lines 1062–1067) won't submit at all without both a name and a phone number — `if (!name || !phone) { ...focus the missing field, return; }`. The implementation and the tier-mapping doc disagree: as actually built, FotoJobber *always* captures a direct identifier on submission, the same as Lead Grabber does. This should be corrected in the tier-mapping doc, not treated as a quirk of Marcus's specific session — logged below.

He submits. `firePixel('fj_submit', 'FotoJobber: submitted', 15, 'active')` fires (line 1067), and the button confirms: *"Received — quote within 2 hours."* `POST /hub/profiles/merge` runs the same way it did for Barry — Marcus's entire 2B history from two sessions (the home page read, the gallery visit, the financing engagement, this return visit) merges onto a newly-identified Tier 1 profile. Two sessions, four days apart, now one continuous record.

### What happens in the two hours — a gap, not a script

Per the Contact page's own FAQ, *"FotoJobber quotes are reviewed and sent back within 2 hours during business hours"* (line 797) — a licensed plumber, not an AI, reviews the photo and the note and responds. **This is where the story runs out of a documented mechanism to point to.** `ACT-QUOTE-001` (`prepare_quote_reminder`, `002_seed_rules.sql` line 511) is the only Quote-domain Action that exists — and it's explicitly for *reminding* about a quote that already exists and has gone quiet (`SIG-QUOTE-001`, `quote_reengagement_opportunity`). Nothing covers drafting and sending the *first* quote response to a fresh FotoJobber submission. A new Action — call it `ACT-QUOTE-002` — is the shape this needs, sitting in Bert's approval queue rather than Sarah's: reading a photo and a written symptom and putting a number on it is exactly the kind of new pricing/technical judgment call the refined approval-routing rule (Barry's Ch4) puts in his domain, not hers.

**Worth being honest about what that quote can actually say.** A photo of one exposed fitting doesn't confirm system-wide corrosion the way a photo of an actual leak would. Bert's response, even inside the 2-hour window, realistically can't be a firm flat-rate number sight-unseen — it's a range, plus the same offer the FAQ already told Marcus about two days ago: a free on-site estimate for anything over $500, no obligation to proceed. FotoJobber got him a fast, real response. It didn't — and structurally couldn't — replace an actual look at the pipe.

**Status: Chapter 2 complete for this installment.** Marcus returns within the recency window, converts through FotoJobber despite a problem that doesn't photograph cleanly, and reaches Tier 1 — merging both sessions into one profile. A real doc/implementation inconsistency (FotoJobber's identifier capture) and a real Action Library gap (no Action drafts a first-time FotoJobber quote) are both flagged rather than guessed past. Continues if/when the on-site estimate and the actual job get written.

---

## Chapter 3 — A range, not a number, and a slot he picks himself

### An hour and forty minutes later

Bert reviews the submission from his phone between jobs. Whatever AI image analysis FotoJobber ran against the photo (per `ClearSky_Comprehensive_Platform_Report__1_.md`'s own field list — "photo, annotation, note text verbatim, AI image analysis, service type, severity" — the exact scoring behind "severity" isn't documented anywhere read for this story, worth a lighter flag below), it can't have concluded much from a photo of one exposed fitting. The real content is Marcus's own note: pressure declining for the better part of two years, original galvanized supply line, a house pushing fifty.

Using `ACT-QUOTE-002` (proposed in Chapter 2 — still not a real Action, just the shape this needs) Bert drafts a response that's honest about what a photo can and can't tell him: a broad range, not a firm number, plus the same free-estimate offer the FAQ already put in front of Marcus four days ago. This is squarely Bert's queue, not Sarah's — a price range is a new technical judgment call, even a wide and hedged one, and the refined approval rule from Barry's story doesn't carve out an exception for "I'm not sure yet."

It goes out as a text to the phone number captured at FotoJobber submission. **Same open question as Barry's auto-reply (tracker #30):** this is a transactional response to a request Marcus initiated himself, not a marketing message, but the consent basis for texting him at all is still undefined — nothing new here, just the identical unresolved question showing up on a second, unrelated conversion path, which is itself worth knowing. It's not a FotoJobber-specific gap; it's the same gap the system has everywhere it sends a first transactional text.

The message: *"Hi Marcus — thanks for the photo. Based on what you've described, a job like this typically runs $3,000–$7,000, but we can't give you an exact number without seeing it in person. Free on-site estimate, no obligation — want us to take a look?"*

### Booking it himself

Marcus reads it on his phone at work. He doesn't call. He taps the link in the text, which opens the same kind of available-slots picker Barry's story already built for a completely different situation — `ACT-CALL-011` (generate available-slots email/link from the rep's calendar) and `ACT-CALL-012` (customer self-service slot pick, writes the calendar directly). Those two were introduced in Barry's Chapter 6 to solve a scheduling-email problem after a water heater arrived. Reusing them here, for a first-time estimate visit instead of a return install appointment, is a reasonable sign they're actually general-purpose — not something built narrowly for Barry's exact situation and coincidentally reused. **Worth being honest that this is still the same proposed, unbuilt mechanism from before, not a second independent confirmation of it working** — it's one mechanism now appearing in two different stories, which is useful evidence it generalizes, but it hasn't been built either time.

He picks a Thursday afternoon slot. `ACT-CALL-012` fires automatically — no approval, same logic as before: Marcus is confirming his own choice among options Bert's calendar already offered, nothing new is being decided. Bert's calendar gets the appointment; Marcus gets a confirmation.

**Status: Chapter 3 complete for this installment.** Bert's FotoJobber response is honest about its own limits — a range, not a number — and routes through his queue because a price range is still a pricing judgment call. Booking the estimate reuses Barry's proposed self-service scheduling mechanism in a genuinely different context (a first estimate, not a return install), which is a small point in favor of it being a real general-purpose tool rather than a one-off. Continues with the actual estimate visit.

---

## Chapter 4 — Thursday afternoon, and a real number

### What a photo couldn't tell him

Bert shows up on time. He doesn't just look at the one fitting Marcus photographed — he checks pressure at a few fixtures, looks at the pipe runs he can access, and confirms what a photo of a single joint never could: it's the original galvanized supply line, narrowing from the inside as decades of mineral buildup close it off. Marcus's own read on it back in Chapter 1 — a rumbling tank, a house pushing fifty, pressure that's been fading for years — turns out to be exactly right. He didn't need the visit to be told he had a real problem; he needed it to be told what it actually costs to fix.

### A number, not a range

Bert quotes **$4,600**, flat-rate, for the affected runs — inside the $3,000–$7,000 range FotoJobber gave four days ago, but an actual number this time, not a hedge. This is the distinction Chapter 3 was honest about in advance: a photo could only ever produce a range; a licensed plumber standing in the basement can produce a price. Nothing new in the approval-routing logic here — this is still Bert originating a fresh pricing/technical judgment call, same as it's been since Barry's Chapter 4, just the second half of a quote that started four days earlier instead of arriving all at once.

### Not now — spring

Marcus doesn't say no. He does the math the same way he's done everything else in this story: out loud, carefully, with his actual budget in front of him. His older kid graduates in the spring — the biggest tuition payment he'll ever make lands in the same few months. $4,600 is a real number he can plan around, but not one he wants sitting next to a graduation. He tells Bert he wants to hold off.

Bert doesn't push it into a close. He asks Marcus directly: *can I check back with you in about six months?* Marcus says yes.

**This is the moment the story has been quietly missing since Chapter 1.** Every consent question flagged so far in either story — Barry's transactional auto-reply (tracker #30), Marcus's own quote-range text (Chapter 3) — was left open because nobody ever actually asked. This is what asking looks like: specific, out loud, on the record, for a specific kind of contact (a check-in in roughly six months), not a blanket opt-in buried in a form. It's a real answer to what those other gaps were missing, just not one that retroactively resolves them — a phone-based transactional reply and an in-person deferred-quote conversation are different moments needing their own consent, not one answer covering both.

**A gap this does surface: there's no mechanism for capturing that consent at all.** `CallEvent.sms_consent` (locked earlier this session) is populated by the AI Analysis Engine reading a *call transcript* — but this conversation happened in person, standing in Marcus's basement, with no call and no transcript. Bert is the only record of what was actually agreed to. Nothing in the specs describes how an in-person consent exchange gets captured — it's the same "Bert has to enter it himself" pattern as the water heater deposit voicemail in Barry's story, just for a fact that's arguably more important to get right, since it's the only thing authorizing a future contact at all.

### On the way home

Bert logs the visit against Marcus's profile — same `ACT-CALL-004` bucket as always: job scope confirmed (galvanized repipe), price quoted ($4,600), outcome (deferred to spring), consent on file for a check-in in roughly six months.

Then, driving, he calls the company's own line. The IVR answers with the standard greeting — but instead of a customer's routing options, Bert presses **5, for an internal message.** The IVR prompts him for a 4-digit PIN. Every employee has their own; his authenticates him as Bert, not as a caller who happens to know the number. At the tone: *"Comm ID [Marcus's thread ID] — Marcus Webb, repipe quote, $4,600, deferred to spring, consented to a check-in. Email him in six months. And send a review request in one month."*

**This is new — nothing in the specs describes an internal-message IVR path or employee PIN authentication at all.** Worth flagging as its own gap, not folded into anything that already exists.

**It also does something Barry's Chapter 3 flagged as a real problem.** Back then, Bert's voicemail-to-himself about the water heater purchase order had no way to be distinguished from an ordinary customer voicemail — the AI Analysis Engine's whole schema (sentiment, urgency, emergency, opportunity, momentum) had nothing coherent to say about an internal supply-chain instruction. A PIN-authenticated internal message is the shape of an actual fix: the system would know, before transcription even starts, that this is Bert speaking as an employee, not a customer describing a problem — so it could route to a different pipeline entirely instead of forcing an internal instruction through a schema built for customer state of mind. **What this doesn't resolve:** there's still no documented schema for what *that* pipeline does with an authenticated internal message — parsing "comm ID X, email in six months, review request in one month" into two actual scheduled actions isn't described anywhere. The authentication problem has a real answer here; the parsing problem doesn't.

**The six-month email is Bert working around a gap, not the gap resolving itself.** `ACT-QUOTE-001` (`prepare_quote_reminder`) is the right Action for an open, unaccepted quote — but Chapter 4's own open question stands: nothing documents whether `SIG-QUOTE-001` can hold a customer-specific date the way Marcus actually gave one, versus a generic staleness timer. Bert isn't relying on the signal to notice anything — he's manually instructing the system with a date a real person asked for. That's a workaround, not proof the underlying mechanism supports it.

**The one-month review request is `ACT-REV-008` — reused from Barry's Chapter 7, in a context it wasn't built for.** Barry's review ask happened after a completed, paid-for job. Marcus hasn't bought anything yet — this is a review request for an estimate visit that didn't convert. Whether that's actually in scope for the Action, or whether asking for a review on a non-purchase interaction is even the right call, isn't answered anywhere — flagged as an open question, not resolved by reusing the ID.

**Status: Chapter 4 complete for this installment.** Marcus's diagnosis is confirmed in person and the range becomes a real number — and then the story doesn't close, because that's the honest version of how a $4,600 quote against a spring tuition bill actually goes. A real consent ask happens on the page, exposing that nothing captures it when it's not a phone call. Bert's internal-message IVR path is a genuinely new mechanism that partially resolves Barry's flagged voicemail-schema problem — the authentication half, not the parsing half.

---

## Chapter 5 — One month, and what gets sent to the network

### The review request fires

A month out, per Bert's own instruction, the review request goes out — `ACT-REV-008`, the same proposed Action Barry's story introduced. This journey doesn't narrate whether Marcus actually leaves one; that's not the thread this story is following. What matters here is just that the request went out on the date Bert set, not a date the system inferred on its own.

### The trajectory, incomplete

Per `clearsky-layers-reference.md` §System C (Cohort 2 Trajectory Layers), the same mechanism that closed out Barry's story writes Marcus's history into `cohort2_trajectories` too — bucket path, tier progression (2B twice, then Tier 1), the FotoJobber conversion, the quote, the deferral, the consent on file.

**This is the first time either story has reached this point without a closed, completed job.** Barry's write happened after a paid, finished repipe. Marcus's is a trajectory that stops at "quoted and deferred" — no purchase, no installation, just a real relationship with a real future date attached to it. Whether Cohort 2 only captures completed jobs, or whether it's meant to snapshot open, in-progress relationships like this one too, isn't answered anywhere read for this story. If it's the former, Marcus's case has nowhere to write to yet; if it's the latter, this is exactly what it should look like.

**Status: Chapter 5 complete for this installment.** The review request goes out on Bert's own schedule, not a system-inferred one, and Marcus's incomplete trajectory raises a real question about whether Cohort 2 was ever meant to capture a deferred relationship, not just a finished job. Continues if/when Marcus actually calls back in the spring.

---

## Gaps flagged (folded into `specs/clearsky-open-decisions-tracker.md`)

1. **Open, not yet in tracker** — the services grid's card copy is written for active/named problems (burst pipe, blocked drain, no hot water) more than a slow, undiagnosed one a homeowner is trying to get ahead of. A smaller, content-level version of the same "system sees engagement, not the customer's actual framing of their problem" gap Barry's Ch1 already named for the Emergency band. Not urgent to fix — just worth naming since a second persona hit a version of it independently.
2. **Open, not yet in tracker** — no signal in the 40-signal library appears to key specifically off reaching the `active` bucket via content engagement (a guide download) with no conversion tool ever touched in the same session. Worth checking whether `SIG-ENG-*` or a comparison-bucket-specific signal should distinguish "engaged enough to look like a hot lead, but never gave us a way to reach them" from an actual Lead Grabber/FotoJobber conversion — these look identical in bucket terms (`active`) but are operationally very different: one has a phone number or email on file, the other doesn't.
3. **Open, not yet in tracker** — no documented decay/grace rule exists for the `active` bucket (only `comparison` and `research` have one per the tracker's verification items). Doesn't affect this chapter's outcome, since George's return happens well inside any plausible window, but a longer gap would hit an undefined case.
4. **Real inconsistency, not yet in tracker** — `clearsky-provider-tier-mapping.md` documents FotoJobber as having "no direct identifier," riding the session unless one is captured elsewhere. The actual built form (`rightflush-contact-quote__1_.html`'s `submitFJ()`) requires both name and phone before it will submit at all — the doc should be corrected to match the implementation, not the other way around.
5. **Open, not yet in tracker** — no Action exists for drafting and sending the *first* quote response to a fresh FotoJobber submission. `ACT-QUOTE-001` (`prepare_quote_reminder`) only covers reminding about a quote that already exists and has gone quiet. A new Action (proposed here as `ACT-QUOTE-002`) is needed, sitting in Bert's approval queue since it originates a new pricing/technical judgment call.
6. **Not a new gap — same open item resurfacing (tracker #30)** — the consent basis for a first transactional text is still undefined. Already flagged from Barry's auto-reply; Marcus's FotoJobber quote-range text hits the identical unresolved question on a completely different conversion path, which is worth knowing (it's systemic, not tool-specific) but doesn't need a second tracker entry.
7. **Open, not yet in tracker** — the exact scoring/output behind FotoJobber's "AI image analysis" and "severity" fields (per `ClearSky_Comprehensive_Platform_Report__1_.md`'s field list) isn't documented anywhere read for this story. Not load-bearing here since Marcus's photo couldn't have told the AI much anyway, but the mechanism itself has no spec to point to.
8. **Open, not yet in tracker** — no mechanism exists for capturing consent given in an in-person conversation. `CallEvent.sms_consent` is populated by the AI Analysis Engine reading a *call* transcript; Bert's consent ask to Marcus happened in person, with no transcript at all. Bert has to log it himself — the same manual-entry pattern already flagged for off-script moments in Barry's story, applied to a fact that's arguably more load-bearing than most.
9. **Open, not yet in tracker** — `SIG-QUOTE-001` (`quote_reengagement_opportunity`) triggers `ACT-QUOTE-001`, but nothing documents the timing rule: a generic staleness timer versus something that can hold a customer-specific date. Marcus gave Bert an actual date (~6 months); whether the system can represent that specific commitment, rather than just "this quote has gone quiet for N days," isn't answered anywhere read for this story.
