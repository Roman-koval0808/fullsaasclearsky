# Provider → Tier Mapping

The "Who did it → Where does it go" answer for every provider, against the **current** four-tier model (`MA v3 §4`, locked 2026-07-02/03). Replaces the stale "Tier 2 pending" language in the Session 10 handoff, which predates the 2B formalization.

**Rule of thumb:** tier is set by *what the provider can attribute at the moment of the event*, not by the provider itself. Most Stream A providers can produce different tiers as identifiers appear. The tier shown is the **entry tier** (what the event creates on arrival); the "upgrades to" column shows where it goes when an identifier follows.

## Stream A — contact events (individuals)

| # | Provider | What it attributes on arrival | Entry tier | Upgrades to |
|---|---|---|---|---|
| 1 | ClearSky pixel | Anonymous session past the 10s floor; fingerprint + session ID | **2B** | Tier 1 on conversion (form/`cs_token`/phone) |
| 2 | Google Ads | `ad_session_start` — UTM'd session, no identifier | **2B** | Tier 1 on in-session conversion |
| 3 | Bing Ads | `ad_session_start` — same as Google | **2B** | Tier 1 on conversion |
| 4 | Facebook Ads | `ad_session_start` + Graph API; audience segment doesn't survive click | **2B** | Tier 1 on conversion (Graph match = aggregate only) |
| 5 | YouTube Paid | `ad_session_start` + nonSkip | **2B** | Tier 1 on conversion |
| 6 | GBP Review | Display name only (a weak identifier) | **Tier 2** | Tier 1 if name resolves to a known profile |
| 6b | GBP Ask-a-Question (Q&A) | Public question, **display name only**. NLP-extracted. Public + answerable by anyone. | **Tier 2** | Tier 1 if name resolves. *Answer is public content → human approval (ACT-REV-002), never auto-posted. Also fires ContentRadar queue as a demand signal.* |
| 7 | GBP Message | Sender handle, no verified identity | **Tier 2** ⚠️ | Tier 1 on identifier |
| 8 | GBP Phone Call | Caller ID (may be present, blocked, or shared) | **Tier 2** if caller ID matches; **2B** if blocked/unmatched ⚠️ | Tier 1 on match |
| 9 | GBP Website Click | `gbp_session_start` — referral session, no identifier | **2B** | Tier 1 on conversion |
| 10 | Google LSA + Telnyx | Caller ID via Telnyx tracking number | **Tier 2** if matched; **2B** if not ⚠️ | Tier 1 on match |
| 11 | AI Chat widget | Rides the pixel; answers from KB, no identifier unless it asks | **2B** (inherits session) | Tier 1 if it captures an identifier |
| 12 | Lead Grabber | Two modes — AI widget (no ID) / speak-now (phone) or **email-me** | **2B** before submission | Tier 1 on submission — phone (speak-now) and email (email-me) are equally valid Tier 1 identifiers (LOCKED 2026-07-05); no distinction between the two modes on tier outcome. Emergency → 15-min escalation regardless of tier |
| 13 | Email personalised link | `cs_token` → resolves to the hub profile | **Tier 1** | — (already named) |
| 14 | SMS A2P personalised | `cs_token` → resolves to the hub profile | **Tier 1** | — |
| 15 | QR Code | `qr_session_start` — physical placement, no identifier | **2B** | Tier 1 on conversion |
| — | Contact Form | Form submit — name/email/phone | **Tier 1** | — |
| — | **ViewRoom** | **Name captured at entry = attribution attempt.** 54 possible signals, 28–35/session. `entered` +10 active, `invitation sent` +8 active | **Tier 1** if the name resolves; else 2B | Tier 1 on resolve |
| — | **Visualizer** | Photo upload = commitment signal; **result save = attribution attempt** (Bathroom Renos only) | **2B**; Tier 1 on save-resolve | Tier 1 on resolve |
| — | FotoJobber | Photo + AI-read annotation; one of the strongest Active Project signals; no direct identifier | **2B** (inherits session) | Tier 1 if the session converts |

## Stream B — market intelligence (no individual)

| # | Provider | What it attributes | Tier |
|---|---|---|---|
| 16 | DataForSEO | Market/SERP data — never an individual | **Tier 3** (Context Store only) |
| — | Matomo | Aggregate analytics | **Tier 3** |
| — | ContentRadar | Demand signals, watch-market | **Tier 3** |

## Outgoing communication — identity-creating channels

**Principle: you cannot send without an identifier.** Every outgoing message means a phone or email was captured — a Tier-1-strength identifier. If the contact isn't already in the hub, the send **creates the profile**; if a 2B session or Tier-2 pending record matches, it **upgrades and merges** their history (`POST /hub/profiles/merge` — create when `profileId` null, merge on Tier-1 match, merge-and-upgrade on pending Tier-2 match). These aren't inbound providers — they're Act-layer outputs that write identity.

| Channel | Requires | Transport | Tier | Profile behaviour | Return trip (inbound provider) |
|---|---|---|---|---|---|
| **Outgoing Email** | email address | Postmark | **Tier 1** (email hash alone) | Create-if-not-exists, else upgrade + merge | `cs_token` click-back → `owned_channel_session_start` (#13) |
| **Outgoing SMS** | phone (E.164) | Telnyx A2P | **Tier 1** (phone) | Create-if-not-exists, else upgrade + merge | `cs_token` click-back → `owned_channel_session_start` (#14) |
| **Outgoing Phone (rep call)** | phone (E.164) | Telnyx A2P | **Tier 1** (phone) | Create-if-not-exists, else upgrade + merge | Inbound call on that number → resolves straight to the profile |

- Every outbound email/SMS carries a signed **`cs_token` JWT** (no PII in the URL); `purpose` is logged for communication attribution — which message drove the return.
- Identifier is keyed by **SHA-256** on the normalized value (email lowercased + trimmed; phone E.164) for create/match.
- **No-auto-posting does not apply** — these are private 1:1 sends, not public content. The NurtureSequence (Component 6, the primary automated outbound email) runs in Automate mode for exactly this reason; tracking is **clicks-only**.
- Consequence: an outbound send is the phone/email equivalent of the in-story email capture — the moment an anonymous 2B or partial Tier-2 becomes a named **Tier 1** with the identifier as the anchor.

## Cross-cutting rules (tier-regardless)

- **Emergency** action fires on a 15-min SLA **regardless of tier** — even a 2B or unmatched caller.
- **Tier 3 never triggers a customer-facing action**, any provider, ever.
- **Same-channel rule** applies to every Tier 2 entry: respond only on the arriving channel until Tier 1.
- **Call binding:** GBP Phone Call / LSA arrive on **dedicated** Telnyx numbers (source-bound); on-site call taps use **session-bound** numbers (see `clearsky-call-binding-spec`).

## ⚠️ Open — tier routing not cleanly decided (flag, don't guess)

1. **GBP Phone Call / LSA on a blocked or shared caller ID** — is an unmatched real caller **2B** (real, engaged, no identifier) or held differently? A shared/family number that *matches* a profile is a false-positive risk.
2. **GBP Message** — does a message sender clear the bar for Tier 2, or 2B until a reply identifies them?
3. **Facebook Graph API match** — the handoff calls a single in-window click "high confidence"; confirm that promotes to Tier 1 vs. stays 2B (aggregate-only otherwise).
4. **Tool-triggered attribution attempts** — ViewRoom (name at entry) and Visualizer (result save) each *attempt* attribution. Confirm the promotion path: a successful attribution should upgrade the whole session (and merge history) to Tier 1, not just tag the tool event. AI Chat/FotoJobber ride the session unless they capture an identifier. (Lead Grabber resolved 2026-07-05 — see row 12 above: both modes promote to Tier 1 on submission.)
