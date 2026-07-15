# Call Binding — Session & Source (Telnyx tracking numbers)

**Purpose.** Carry identity and/or source across the jump to the phone network, so an inbound call lands at the contractor with the right context — whoever the caller is (Tier 1 or 2B) and wherever they came from (owned site or a channel we don't control).

**Core principle.** The **number the caller dials is the key**, never the caller ID. What that number carries depends on which of two types it is.

*Status: consolidation of existing Telnyx call tracking into the identity/attribution flow. Verify against the current A2P spec before build.*

## Two number types

| | **Session-bound (dynamic)** | **Source-bound (dedicated)** |
|---|---|---|
| Used on | Owned web surfaces (the pixel'd site) | Outside channels we don't control — GBP, Local Services Ads, paid ads, directories, QR codes |
| Assignment | Pulled from a **pool** at call-button tap, bound to `sessionId` for a TTL, released after | **One persistent number per channel**, never dynamic, never reassigned |
| What it carries | The **live session** — full web history + `hubProfileId` (Tier 1) or fingerprint/session history (2B) | The **source** — "this call came from GBP / LSA / the truck QR" |
| Identity resolution | Direct: the bound session already knows who she is | By **caller-ID match** against known profiles; no match → new inbound, tiered on the voice side |
| Also feeds | — | **ContentRadar / attribution** — which off-platform surface drives calls |

The website session is the *richest* case (live page context + known identity), not a separate mechanism. Off-platform is the leaner case: certain about *where*, identity only as good as a caller-ID match.

## Session-bound flow (owned web)

1. On call-button tap, Orchestrator pulls a pool number, writes `{ trackingNumber, sessionId, hubProfileId|null, boundAt, ttl }`, displays it to dial.
2. Caller dials it → Telnyx routes inbound.
3. Lookup binding by **dialed number** → resolve session → screen-pop:
   - Tier 1: name + full profile + history.
   - Tier 2B: anonymous history — "returning visitor · [bucket] · viewed X, Y · no name yet."
4. Release number to pool after call / TTL expiry.

## Source-bound flow (outside channels)

1. Each channel is provisioned its own permanent Telnyx number (GBP listing number, LSA number, per-campaign ad number, QR number).
2. Inbound on that number → source is known with certainty (it *is* the GBP number).
3. Caller-ID matched against known profiles: match to a Tier 1 → resolve + screen-pop; no match → ordinary new inbound, tiered on the voice side, source recorded.
4. Source + outcome feed attribution / ContentRadar.

## Fallbacks

| Condition | Behaviour |
|---|---|
| Session number dialed **after TTL** | No binding → treat as inbound; caller-ID match only. 2B with no number on file → cold. |
| Session **pool exhausted** | Serve main line, no session bind; call still connects. |
| Source-bound call, caller ID **matches Tier 1** | Resolve to that profile even without a session. |
| Source-bound call, **no match** | New inbound; real caller → 2B-equivalent on voice, source recorded. |

## Open parameters (see decisions tracker)

- Session-bound **TTL** (default 10 min) · **pool size** (trivial at RightFlush, sized at scale).
- **Rep screen** must render Tier 1, 2B, and unknown-inbound cleanly.
- **Caller-ID match policy** for source-bound calls — how confidently a caller ID resolves to a stored profile (and what happens on a shared/family number).
- **Channel → number map** — which outside surfaces get dedicated numbers at launch.
