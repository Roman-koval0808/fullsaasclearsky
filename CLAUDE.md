# CLAUDE.md — ClearSky Blueprint Workspace

Orientation for any session working this folder. Read this first, then `HANDOFF.md` for where we left off, then `specs/00-INTEGRATION-SPEC.md`.

## What ClearSky is

AI-powered managed-growth platform for Northern Ontario small businesses (trades first, then tourism, professional services, manufacturing). Promise: 20% revenue growth in six months or a refund; protected markets. Everything serves **one booked job** — moving one specific person through Discovery → Engagement → Conversion → Growth. Canonical demo client: **RightFlush Plumbing** (Timmins; owner **James Dredhart**). ClearSky consultant / content approver: **Sarah Jenkins** (not the owner). Vertical default: plumbing.

## The five bodies

1. **Marketing Automation** — operating system. 2. **AI Decision System** — pixel → intent → identity → hub → signals → Orchestrator (7-stage pipeline). 3. **A2P (Telnyx)** — voice/SMS, signal source + execution. 4. **ContentRadar** — demand-side intelligence. 5. **Digital Health Diagnostic** — acquisition front-end, deliberately separate from the loop.

## LOCKED DECISIONS — do not re-litigate, do not build against anything else

**Source of truth for identity: `ClearSky_MA_Requirements_v3` §4 (locked 2026-07-02/03).**

- **Four tiers.** Tier 1 (identified — strong identifier resolves), Tier 2 (weak identifier — same-channel response only), Tier 2B (zero identifiers but real + engaged — cleared the 10-second floor), Tier 3 (not a person — bot/spam/Stream B; no cookie/fingerprint stored). The 2B/3 line is **engagement depth, not identifier presence.**
- **Fingerprint + session ID are the persistent identity substrate** for Tiers 1, 2, 2B — never discarded on upgrade. Tier 3 has none.
- **10-second record-creation floor** (§4.5a): no record until 10s cleared. Below = noise, aggregate only.
- **Email hash alone → Tier 1** (§4.2). **Cross-device fingerprint capped below 70%** (§4.7). **SHA-256 normalization** (§4.4).
- **Engagement score is flat additive, capped at 100 — nothing multiplies.** Deltas per event. `+10 recency bonus` if a recognized return happens within 3 days (design decision, calibrate later).
- **Email: clicks only, never opens** — Apple MPP auto-fires open pixels for ~55% of recipients, so opens are false signal. Silence = no click (honest unknown).
- **Call binding (Telnyx):** the dialed number is the key, never caller ID. Two types — **session-bound** dynamic numbers (pooled, TTL) for owned web surfaces; **dedicated permanent** numbers, one per channel, for outside surfaces (GBP, ads, QR). See `specs/clearsky-call-binding-spec.md`.
- **No auto-posting.** Public-facing content needs human approval (Sarah Jenkins, ACT-REV-002). Emergency overrides everything. Light mode mandatory in all demo/design output.
- **Diagnostic stays separate** from the operating loop (only tie: shared ContentRadar Engine 1 gap-scoring component).

## Four "Layer" systems — always name which one

Layer 1 means: **Capture** (Four-Layer Operating Architecture) · **GBP Health** (Diagnostic) · **Behavioural** (Cohort 2). Site Personalization = Layer 4 **Act** output of the operating architecture (not diagnostic Layer 4). See `specs/clearsky-layers-reference.md`.

## Folder map

- `specs/` — canonical reference. Start `00-INTEGRATION-SPEC.md`. Identity = `clearsky-identity-tiers-canonical.md` (mirrors MA v3 §4). Call binding = `clearsky-call-binding-spec.md`. Layers = `clearsky-layers-reference.md`. Open work = `clearsky-open-decisions-tracker.md`.
- `RightFlush-Denise-Customer-Journey.md` — the narrative walkthrough (director's-commentary style).
- `data/`, `design/` (RightFlush site = design language, light mode), `reference-code/` (snapshots; live source is Serhii's repo).

## Working rules

Work against the specs; don't invent architecture. Cite the source doc for any claim. When a decision isn't in the specs, ask — don't guess. Flag conflicts rather than silently resolving. Decisions lock when Rory confirms.
