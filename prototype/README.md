# ClearSky Journey Simulator (prototype)

Runs the customer-journey narratives through a real implementation of the ClearSky
pipeline and asserts the engine reproduces them. **The journeys are the tests** —
each one's Chapter 8 touchpoint table (exact tier / bucket / score at every step)
is the acceptance criteria.

- `RightFlush-Denise-Customer-Journey.md` — the full loop
- `customer-journeys/01-clearsky-home-01John.md` — Barry (Lead Grabber → callback → SLA breach → bridge-merge)

## Run it

```bash
npm install
npm test                     # 43 assertions across all six phases
npm run sim -- denise        # Ch1–2: two devices, decay, email→Tier 1, nurture
npm run sim -- denise-call   # Ch3–5: call scoring, transcript→pipeline, booking, voicemail
npm run sim -- denise-review # Ch9: review → testimonial + referral (the #23 fix, live)
npm run sim -- barry         # full identity → scoring → S1–S7 pipeline, with GAP tags
npm run sim -- all
npm run typecheck

npm run demo                 # regenerate the visual replay page → demo/index.html
npm run serve                # build it + serve at http://localhost:4173
```

**Visual demo:** either open [`demo/index.html`](demo/index.html) directly in a
browser, or run `npm run serve` and visit <http://localhost:4173> — a
self-contained page that plays each journey through the engine, step by step
(Barry's SLA breach → autocaller bridge-merge is the one to show). See
[`demo/README.md`](demo/README.md).

Set `ANTHROPIC_API_KEY` to run the AI Analysis Engine on **real Claude**
(`claude-opus-4-8`, responses cached to `.cache/`); without it, the deterministic
stub is used so the sim runs offline. Tests always use the stub.

## How it's built

- **Deltas are page-authored.** Web pixel events carry the exact `delta` + `bucketTag`
  the site's `firePixel()` call would emit; the engine supplies only the locked/provider
  deltas (`call_click` +15, IVR table, `booking` +20).
- **Two parallel engines off the same events** — identity/tier (1 / 2 / 2B / 3, 10-second
  floor, one record per device fingerprint, no cross-device merge) and engagement scoring
  (flat additive, capped 100, escalate-only bucket ladder), plus lazy decay/demotion.
- **Gaps are tagged, not hidden.** Every mechanism that stands on a proposed/unbuilt spec
  emits a `GAP #NN` line keyed to `specs/clearsky-open-decisions-tracker.md`, so a run
  doubles as a live gap report.

## Decisions (locked 2026-07-06)

TypeScript runtime (aligns with Serhii's SvelteKit/Prisma repo) · AI Analysis Engine will
use real Claude, cached (Phase 3) · build the story-proposed mechanisms end-to-end but tag
each as a gap.

## Status — all phases complete, **43 tests green**

- ✅ **Phase 0** — harness (scenario format, trace, assertions)
- ✅ **Phase 1** — identity + scoring + decay; reproduces Denise Ch1–2 & Barry Ch1
- ✅ **Phase 2** — S1–S7 pipeline (§6.4 signals, §6.5 actions, orchestrator + safety rules); fixes seed bug #23, flags #32
- ✅ **Phase 3** — A2P: call-binding (session vs dedicated, TTL), transcript→pipeline, real cached Claude, and the **SLA-breach → 3-channel escalation → autocaller bridge-merge → 3PM commitment**, woven inline into Barry's minute-level trace (`npm run sim -- barry`)
- ✅ **Phase 4** — growth tail: review → testimonial + referral (#23 live), Cohort 2 write (PII redaction), transaction status (#37–#40)
- ✅ **Phase 5** — the five remaining persona archetypes (engine-generalization scenarios; their narrative files are unwritten stubs)

See `../HANDOFF.md` and `../specs/clearsky-open-decisions-tracker.md`.
