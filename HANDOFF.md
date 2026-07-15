# HANDOFF — as of 2026-07-04

Where we left off, for the next session. Read `CLAUDE.md` first, then this.

## ✅ Divergence reconciled

The web-side/Code-side split described in earlier drafts of this file is resolved. `RightFlush-Denise-Customer-Journey.md` is now the single canonical copy: corrected Chapters 1–3 (scoring fixes, citations, clicks-only nurture) with the Chapter 3 ending (call lands → rep screen-pop → Outcome → Feedback → Cohort 2) grafted in, plus the call-binding wrinkle. The duplicate `RightFlush-Corrected-Denise-Customer-Journey.md` file has been retired.

The ending was re-checked line-by-line against the locked rules and is clean:
- Tiers used correctly (Tier 1 / 2 / 2B only, no stray "2A").
- Clicks-only email tracking holds through Ch3 (emails 1–2 silent, email 3's click is the real signal).
- Call binding matches `clearsky-call-binding-spec.md` verbatim (dialed number is the key, not caller ID; session-bound dynamic number for the on-site tap; the anonymous-caller case explained).
- `anonymousId` (not `sessionId`) is the field used for the persistent-cookie merge, consistent with the hub integration spec — the field-name confusion this file used to flag isn't present in the narrative.

One remaining spec-only fix made along the way: `clearsky-master-architecture.md` §9 and `clearsky-open-decisions-tracker.md` #8 both had a "Tier 2A" typo (not a real tier — canonical model only has 1/2/2B/3). Corrected to "Tier 2/2B" in both files.

**This folder is now a git repo** (it wasn't before). Initial commit + these cleanups are checkpointed; use `git log`/`git diff` going forward instead of narrating divergences in this file.

## What changed this session (web side)

**Denise story (`RightFlush-Denise-Customer-Journey.md`):**
- Sarah Jenkins corrected to ClearSky consultant (James Dredhart = owner).
- Ch1 gallery scoring fixed: page_load +5 comparison, all events comparison, total **17** (was +4 / mixed tags / 16).
- Ch2 scoring corrected to real deltas — removed the fabricated 2.5× multiplier and +10 return-weighting; recomputed to **38**.
- Added **+10 recency bonus** rule (recognized return ≤3 days).
- Citations fixed to real sources (email→Tier 1 = master architecture; cross-device cap = Serhii brief).
- Nurture rewritten to **clicks-only** — emails 1–2 honest silence, only email 3's click is real signal.
- Added the **call-binding wrinkle** (session-bound vs dedicated numbers; works for 2B too).

**Specs synced/created:**
- `clearsky-identity-tiers-canonical.md` — resynced to mirror locked MA v3 §4 (Tier 2/2B, 10s floor, substrate).
- `clearsky-master-architecture.md` — tier table + §9 Layer 4 Act split (on-page Site Personalization reaches Tier 2/2B).
- `clearsky-call-binding-spec.md` — NEW: session-bound + source-bound Telnyx call binding.
- `clearsky-layers-reference.md` — NEW: the four "Layer" systems disambiguated.
- `clearsky-open-decisions-tracker.md` — NEW: all open items + resolved decisions.

## Locked this session
Clicks-only email tracking · two-type call-binding model · tier model synced to MA v3 §4 · +10 recency bonus.

## Open (see `clearsky-open-decisions-tracker.md` for full list)
- 🔴 Fingerprint technique + where computed (MA v3 §4.7).
- 🟡 Nurture sequenceType table, tone model, exec-mode confirm · call-binding TTL / caller-ID match policy / channel→number map · Site Personalization ≥35 threshold lock.
- Verify: grace/half-life values against current Four Buckets report; `call_click` scored delta.

## Next up
1. Pick: fingerprinting decision (MA v3 §4.7 — technique + where computed), or next vertical (tourism).

## Note on my stale copies
My web-side copies of MA v3, master architecture, and Four Buckets were months behind the Code versions. Treat the **Code/desktop files as authoritative** where they conflict with anything in this bundle except the specific corrections listed above.
