# Customer Journey Index

Filename pattern: `NN-origin-context-MMPersonaName.md`. Three independent counters, none related to each other:

- **`NN`** — arrival sequence scoped to that specific origin-context slug only (e.g. `clearsky-home` has its own counter, separate from `clearsky-pixel-emergency`'s counter). Counts how many people have started at that origin-context point.
- **`origin-context`** — where/how they arrived (e.g. `clearsky-home`).
- **`MM`** — a separate counter scoped to that specific persona archetype only (how many `John`s exist across the whole simulation, independent of how many `Betty`s exist, and independent of `NN`).
- **`PersonaName`** — which archetype (see Personas table below) drives this session's implied behavior. This is a simulation label, not necessarily the name the story reveals once the person converts — a `John2` session may turn out to be "Fred" once identified. The system itself never knows the persona or the archetype; a 2B session is fingerprint + session ID only, no identifiers, regardless of what the narrator/reader knows about who they really are.

Status legend: 📝 not started · ✍️ in progress · ✅ complete · 🔍 needs review

## Personas (archetype reference)

| Archetype | Profile |
|---|---|
| John | Male, 35, married, 3 kids |
| George | Male, 45, married, 2 kids (1 in university, 1 age 15) |
| Peter | Male, 60, married, 2 kids moved out, retiring in 2 years |
| Betty | Female, 35, married, no kids, teacher |
| Francine | Female, 45, divorced, custody of 1 child (age 12), lawyer |
| Coreen | Female, 60, married, works full time, few years from retirement |

## Reference: known origins (lookup only — these numbers are NOT file numbers)

Seeded from `specs/clearsky-provider-tier-mapping.md`. Use this to pick which origin+context a person arrived through; the person's own sequence number is unrelated to this table.

| Origin | Entry tier |
|---|---|
| ClearSky pixel | 2B |
| Google Ads | 2B |
| Bing Ads | 2B |
| Facebook Ads | 2B |
| YouTube Paid | 2B |
| GBP Review | Tier 2 |
| GBP Ask-a-Question (Q&A) | Tier 2 |
| GBP Message | Tier 2 ⚠️ |
| GBP Phone Call | Tier 2 / 2B ⚠️ |
| GBP Website Click | 2B |
| Google LSA + Telnyx | Tier 2 / 2B ⚠️ |
| AI Chat widget | 2B |
| Lead Grabber | 2B / Tier 1 |
| Email personalised link | Tier 1 |
| SMS A2P personalised | Tier 1 |
| QR Code | 2B |
| Contact Form | Tier 1 |
| ViewRoom | Tier 1 / 2B |
| Visualizer | 2B / Tier 1 |
| FotoJobber | 2B |

*(New origins you come up with go here too — add a row, mark tier as TBD, and flag it for folding back into `clearsky-provider-tier-mapping.md` once confirmed.)*

## Journeys

Grouped by origin-context slug, since each slug has its own counter (not a site-wide sequence).

| Origin + context | # within this slug | Persona | File | Status | Tracker items logged |
|---|---|---|---|---|---|
| (all-touchpoint, full-loop narrative — not origin-specific) | — | — | `../RightFlush-Denise-Customer-Journey.md` | ✅ complete | Tracker #1–29 |
| clearsky-home | 01 | John1 (revealed as Barry Smith) | `01-clearsky-home-01John.md` | ✅ complete for this installment | Tracker #30–#43 + approval-routing refinement; new spec `clearsky-job-fulfillment-workflow.md`; worked examples for tracker #24 and the post-job relationship-maintenance gap |
| clearsky-home | 02 | George1 (revealed as Marcus Webb) | `02-clearsky-home-01George.md` | ✍️ in progress (Ch1–5) | Tracker #44–#52; Ch4 applies #36–#40 to a second job, no new items; Ch5 adds #50–#52 (IVR/PIN mechanism, employee-instruction parsing, deferred-case Cohort 2 write) |
| clearsky-home | 03 | Peter1 | `03-clearsky-home-01Peter.md` | 📝 not started | — |
| clearsky-home | 04 | Betty1 | `04-clearsky-home-01Betty.md` | 📝 not started | — |
| clearsky-home | 05 | Francine1 | `05-clearsky-home-01Francine.md` | 📝 not started | — |
| clearsky-home | 06 | Coreen1 | `06-clearsky-home-01Coreen.md` | 📝 not started | — |
