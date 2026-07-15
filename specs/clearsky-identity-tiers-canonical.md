# Identity Tiers — Canonical (synced to MA v3 §4)

**Source of truth: `ClearSky_MA_Requirements_v3` §4, locked 2026-07-02, floor corrected 2026-07-03.** This file mirrors that section. If the two ever diverge, MA v3 §4 wins.

## 4.1 Two Confidence Dimensions — Never Combined

| Dimension | Question | Resolved | On failure |
|---|---|---|---|
| C1 — Event Validity | Did this event actually occur? (not spam, bot, duplicate) | Layer 1, before anything else | Drop and log. Not recoverable. |
| C2 — Attribution | Does it belong to a specific person? | Layer 2, after validity | Produces a Tier assignment (1, 2, 2B, or 3) |

## 4.2 Four Identification Tiers

**Tier 2B is a real rung, not a Tier-2 sub-case.** The line between 2B and 3 is **engagement depth, not identifier presence** — neither has an identifier; 2B has proven itself a real, engaged individual, Tier 3 hasn't. The floor separating them is **10 seconds on-site** (not dwell_30/60 — those are richer milestones a 2B record accumulates *after* creation). Below 10 seconds, or a bot, nothing is created — not even a cookie.

| Tier | Attribution | Profile action | Actions permitted |
|---|---|---|---|
| **1** | High — strong identifier resolves cleanly (visible caller ID, email hash, device cookie, forwarded token). Resolves on first contact; no prior history needed. | Full profile created/updated. Full pipeline. | All actions, all channels |
| **2** | Low — weak identifier present (a name, a partial form field, a review display name). | Profile created, `status=pending`. Reactivates when a stronger identifier appears. | **Same-channel response only** until Tier 1 |
| **2B** | Zero identifiers, but validity + clearing the 10-second floor confirm a real individual (Stream A) — not a bot, not an instant bounce. E.g. anonymous site visitor past 10s with no form; blocked-caller-ID voicemail with no name. | **Created immediately** on first qualifying visit (see §4.5a: validity → 10s floor → DB lookup by fingerprint/cookie → create or attach). Cookie + fingerprint are its only marks. Session stays live and trackable. Upgrades to Tier 2 or Tier 1 the moment an identifier appears. | **No customer-facing action** — no channel to reach them on. Log and wait. |
| **3** | Doesn't clear the bar to be a real, trackable individual. One undivided bucket: Stream B market data (never has an individual), confirmed bot/spam (fails C1), and thin/instant-bounce Stream A (call drops with no history; site visit bounces before 10s). Treatment identical regardless of door. | **No profile, no cookie, no fingerprint stored.** Context Store only. | No customer-facing action. Ever. No exceptions. |

## 4.3 The Same-Channel Response Rule

A Tier 2 event is answered only on the channel it arrived on (a GBP review → GBP), and cannot cross to SMS/voice until identity upgrades to Tier 1 — enforced in the Orchestrator before action selection. **Tier 2B has no channel to apply this to** — no identifier to reach them on — so the Orchestrator logs and holds until an identifier appears (weak → Tier 2, strong → Tier 1).

## Persistent identity substrate

Fingerprint + session ID are the identity thread for **Tier 1, 2, and 2B** — the real-individual tiers. They are never discarded on upgrade: a 2B or 2 promoting to Tier 1 keeps its fingerprint, session ID, and full history; the identifier is layered on top. **Tier 3 stores no cookie or fingerprint** — no individual identity substrate, by design.

## Related locked sections (live in MA v3 §4)

- **§4.4** SHA-256 Normalisation Convention (email lowercased+trimmed; phone E.164) — LOCKED 2026-07-02
- **§4.5a** The Anonymous Visit Sequence — the 10-second floor + fingerprint DB lookup — LOCKED 2026-07-03
- **§4.6** Session State Expiry — Emergency 14d · Comparison 60d · Active 90d · Research 180d
- **§4.7** Device Fingerprint Matching — same-device re-match 90–96% (Tier 1 eligible), cross-device capped below 70% — confidence LOCKED 2026-07-02, technique OPEN
