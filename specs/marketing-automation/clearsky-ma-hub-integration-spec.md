ClearSky Software — Confidential — Internal Document

**Communication Hub Technical Integration Specification**

Event Schema · Token Format · API Contract · Merge Logic

April 2026 — Developer Reference

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564

| *The communication hub is ClearSky’s proprietary custom-built platform. This document is the specification the hub team builds to directly. No adaptation layer, no third-party constraints, no wrapper.* |
| --- |

# **Component 1 — Event Schema**

Every website activity event written to the hub profile follows this envelope. Consistent schema across every client site so the hub processes events without per-client parsing logic.

{
  "event": "clearsky.website.activity",
  "version": "1.0",
  "timestamp": "2026-04-07T14:23:11Z",
  "anonymousId": "cs_7f3a9b2c1d4e",
  "hubProfileId": "hub_abc123",
  "sessionId": "sess_9d2f1a",
  "clientId": "clearsky_client_042",
  "eventType": "page_view|cta_click|form_start|form_complete|call_click|quote_request|return_visit",
  "intentBucket": "emergency|active_project|comparison|research|unassigned",
  "sessionDepth": 3,
  "sessionDuration": 142,
  "pageUrl": "https://contractor-site.com/emergency-plumber",
  "pageType": "service|pricing|gallery|review|contact|home|content",
  "engagementThresholdMet": true,
  "pixelEventFired": true,
  "sessionCount": 2,
  "isForwardedLink": false,
  "forwardedLinkToken": null,
  "conversionMoment": false,
  "conversionType": null
}

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| anonymousId | string │ null | Populated before conversion. Null for forwarded link sessions (named from first pageview). |
| hubProfileId | string │ null | Populated for forwarded link sessions and after conversion merge. Null before conversion for organic visitors. |
| engagementThresholdMet | boolean | Separate from pixelEventFired. Threshold triggers internal bucket assignment. Pixel fires to ad platforms after bucket confirmed. |
| sessionCount | integer | Cumulative sessions from this device and browser. Drives on-site recognition behavior shifts. |
| conversionType | string │ null | form_complete │ call_click │ quote_request │ booking │ email_capture (LOCKED 2026-07-02 — lead-magnet email-only signups, see Component 6). Null if no conversion this session. |

# **Component 2 — Forwarded Link Token Format**

Every outbound email or SMS link to the contractor’s website carries a signed JWT. The token never carries PII in the URL.

URL: https://contractor-site.com/page?cs_token=<signed_jwt>

JWT Payload:
{
  "sub": "hub_abc123",
  "cid": "clearsky_client_042",
  "iat": 1744041600,
  "exp": 1744128000,
  "purpose": "follow_up|quote_ready|appointment_reminder|seasonal",
  "channel": "email|sms",
  "campaignId": "camp_991"
}

- sub is the hub profile ID only — no name, email, or phone number in the URL. Token is safe if shared, forwarded, or logged by intermediate servers.

- Token expiry: 24 hours for SMS, 7 days for email. Expired tokens fail gracefully — session falls back to anonymous path. No error surfaced to visitor.

- purpose is logged to the hub event stream for communication attribution — which outbound message triggered the return visit.

- cs_token parameter is stripped from the visible URL immediately after the backend validation call resolves.

# **Component 3 — Session Handoff Mechanism**

## **Forwarded link path — exact sequence**

- 1. Visitor clicks link in email or SMS. Browser loads page with cs_token in query string.

- 2. ClearSky pixel fires on page load and checks for cs_token before any other session logic runs.

- 3. Pixel sends token to ClearSky backend via authenticated POST before any other session logic.

- 4. Backend validates JWT signature and expiry. Returns hub profile ID and full prior session state if valid.

- 5. Pixel writes hubProfileId to session. All subsequent events tagged with hubProfileId, not anonymousId.

- 6. cs_token stripped from visible URL immediately after backend call resolves.

- 7. **LOCKED 2026-07-02 — stitching check:** pixel checks this device for an existing anonymousId cookie (prior anonymous browsing, same device, no conversion yet). If found, calls POST /hub/profiles/merge with the resolved hubProfileId, the anonymousId, and its stored session history — contactDetails omitted, since identity is already resolved via the JWT, not a contact-hash match. Runs async; does not block page render. anonymousId cookie is cleared locally regardless of whether there was history to merge. Closes the gap where "no pixel data is lost" (locked platform-wide for any identity-confirmation method) was previously only honoured for the organic-conversion path.

- 8. Push engine receives full session context from first pageview. Named return visit from the start.

## **Expired token handling**

If JWT has expired: pixel logs token_expired event to ClearSky event stream for audit, then falls back to the organic anonymous path. Visitor gets a normal anonymous session. No error surfaced to the visitor.

## **Organic anonymous path**

**Corrected 2026-07-03 — full sequence now matches `ClearSky_MA_Requirements_v3.md` §4.5a. Previously this only described cookie bookkeeping and left tier assignment undefined until conversion, which was wrong.**

- Visitor arrives without token. Event validity check runs first — bot/spam pattern fails here, drop and log, nothing below this line runs.
- 10-second floor — visitor leaves before 10 seconds, no record gets created at all, no cookie, no fingerprint capture.
- Past 10 seconds: DB lookup by fingerprint (and cookie, if one exists) before creating anything new.
  - Match found: session state restored from server-side store, attached to the existing record whatever tier it's already at. Session count increments. On-site recognition activates.
  - No match: new anonymousId generated, fingerprint captured, new record created — **Tier 2B, immediately.** Session count = 1.
- All events tagged with anonymousId. hubProfileId is null until conversion — hubProfileId specifically, not tier. The record already has a tier (2B) from creation.

# **Component 4 — API Contract**

## **POST /hub/events — write website activity event to hub profile**

POST /hub/events
Authorization: Bearer <client_api_key>
Content-Type: application/json

Body: event schema object (Component 1)

Response 200: { "received": true, "profileId": "hub_abc123" }
Response 404: { "error": "profile_not_found" }
Response 422: { "error": "invalid_event_schema", "fields": [...] }

## **GET /hub/profiles/resolve — match contact details to hub profile at conversion**

GET /hub/profiles/resolve?email=<sha256_hash>&phone=<sha256_hash>
Authorization: Bearer <client_api_key>

Response 200: { "profileId": "hub_abc123", "isNew": false, "tier": 1, "status": "active" }
Response 200: { "profileId": "hub_xyz789", "isNew": false, "tier": 2, "status": "pending" }
Response 200: { "profileId": null, "isNew": true }

| *LOCKED 2026-07-02: Email and phone are passed as SHA-256 hashes on normalized lowercase-trimmed email and E.164-formatted phone. PII never travels in the query string. Canonical convention: `ClearSky_MA_Requirements_v3.md` §4.4. A mismatch creates silent duplicate profiles that are extremely difficult to debug in production — both teams build against §4.4 exactly, no local variation.* |
| --- |

| *LOCKED 2026-07-02: `tier`/`status` added to the response so one call answers "does a Tier-1 profile exist," "does a pending Tier-2 profile exist," and "does nothing exist" — this is the only lookup `POST /hub/profiles/merge` (below) needs before deciding what to do. Absent when `isNew` is true.* |
| --- |

## **POST /hub/profiles/merge — create, merge, or upgrade a hub profile**

POST /hub/profiles/merge
Authorization: Bearer <client_api_key>
Content-Type: application/json

Body:
{
  "profileId": "hub_abc123",
  "anonymousId": "cs_7f3a9b2c1d4e",
  "sessionHistory": [ array of prior event schema objects ],
  "conversionEvent": { triggering event schema object },
  "contactDetails": {
    "emailHash": "sha256...",
    "phoneHash": "sha256...",
    "nameProvided": "John"
  }
}

contactDetails is optional (LOCKED 2026-07-02) — required for organic-conversion merges (Component 5, identity resolved by hash match), omitted for forwarded-link merges (Component 3 step 7, identity already resolved via JWT `sub`). Within contactDetails, phoneHash and nameProvided are themselves optional — an email-capture conversion (Component 6) sends emailHash only. Per §4.2, a resolved email hash alone is a strong identifier and produces full Tier 1, same as a full quote-form submission.

**LOCKED 2026-07-02 — this single endpoint now covers all three outcomes of a resolve call, replacing what used to be three separate undocumented operations (`createProfile`, `findPendingByContact`, `upgradeTier`):**

| resolve returned | profileId sent | What merge does |
| --- | --- | --- |
| `isNew: true` | `null` | Creates a new Tier-1 profile from `contactDetails` + `sessionHistory`, returns the new `profileId`. |
| `tier: 1` | the existing `profileId` | Merges `sessionHistory` into the existing profile. Tier unchanged. |
| `tier: 2, status: pending` | the pending `profileId` | Merges `sessionHistory` **and** promotes the profile to Tier 1 in the same write — merging real contact-hash data into a pending profile is what earns the upgrade. No separate upgrade call. |

Response 200: { "merged": true, "profileId": "hub_abc123", "created": false, "tierUpgraded": false }
Response 409: { "error": "merge_conflict", "reason": "..." }

## **Authentication and rate limits**

- Each contractor has a unique client_api_key scoped to their hub instance. A key for client 042 cannot write to client 041 profiles.

- Rate limit: 500 requests per minute per client key. Exists to catch runaway pixel misfires before they cause hub performance problems.

# **Component 5 — Profile Merge Logic at Conversion**

| **Step** | **Action** | **Outcome** |
| --- | --- | --- |
| 1 — Conversion detected | Pixel identifies conversion: form complete, call click, quote request, booking | Conversion event logged to ClearSky event stream immediately |
| 2 — Contact details extracted | Name, email, phone extracted from conversion form. Email and phone hashed client-side. | PII never transmitted in plaintext |
| 3 — Hub resolve call | GET /hub/profiles/resolve called with hashed contact details, returns tier/status (LOCKED 2026-07-02) | Tier-1 match or pending Tier-2 match: proceed to merge with that profileId. No match: proceed to merge with profileId null. Multiple matches: flag, hold, escalate to support. |
| 4 — Merge call | POST /hub/profiles/merge sends complete anonymous session history — same call creates (profileId null), merges (Tier-1 match), or merges-and-upgrades (pending Tier-2 match) depending on what step 3 returned | Hub appends history to profile timeline in chronological order interleaved with prior communication history; Tier-2 profiles are promoted to Tier 1 in the same write |
| 5 — Anonymous ID retirement | anonymousId cookie updated to carry resolved hubProfileId. Anonymous records retained 30 days. | Anonymous ID retained for audit trail then expired per tiered schedule |
| 6 — Push engine context update | Push engine notified session is now named | Full hub profile context available for remainder of visit — communication history, prior conversations, open quotes |

# **Component 6 — NurtureSequence Schema LOCKED 2026-07-02**

Closes the §12 integration-spec gap. Backs the Layer 4 "Sequence trigger" output (`clearsky-master-architecture.md` Section on Layer 4 outputs: *"Tier 1, Research or Comparison. Nurture sequence. Soft follow-up."*) and the lead-magnet email-capture behaviour already described in `clearsky-ma-rules-config-plumbing.md`'s Research/visit-1 row (*"Email capture only if lead magnet exists"* → *"we send helpful plumbing tips once a month"*).

**Enrollment trigger:** a profile is Tier 1 AND its current bucket is Research or Comparison. Checked whenever bucket or tier changes (conversion, merge, pixel bucket reassignment) — not gated specifically on the email-capture event; any route to Tier 1 (forwarded link, full conversion, or email-only capture) qualifies if the bucket condition holds. This matches the Layer 4 output table's condition exactly, rather than narrowing it further.

**Record:**
{
  "nurtureSequenceId": "nurt_4f2a9c",
  "hubProfileId": "hub_abc123",
  "sequenceType": "plumbing_monthly_tips",
  "triggerConversionType": "email_capture",
  "enrolledAt": "2026-07-02T14:23:11Z",
  "cadence": "monthly",
  "currentStep": 1,
  "nextSendAt": "2026-08-02T14:23:11Z",
  "lastSentAt": null,
  "status": "active",
  "exitReason": null
}

| Field | Notes |
| --- | --- |
| sequenceType | Maps to the client's vertical/trade rules config — `plumbing_monthly_tips` is RightFlush's default per the plumbing rules config. |
| triggerConversionType | The conversionType (Component 1) that caused enrollment — usually `email_capture`, but any conversionType is valid if it produced Tier 1 while the bucket condition held. |
| cadence | `monthly`, per the plumbing rules config's stated cadence. Other verticals may differ — not locked platform-wide, only for the plumbing default. |
| status | `active` │ `paused` │ `completed` │ `unsubscribed` │ `exited` |

**Exit conditions (any one fires immediately, checked before each scheduled send):**
- Bucket promotes to Active Project or Emergency — `status: exited`. Nurture is for not-yet-ready visitors; a promoted bucket means direct treatment (push decision table, possibly Orchestrator-driven outreach) takes over instead.
- Conversion / booked job recorded (Outcome) — `status: completed`.
- Explicit unsubscribe — `status: unsubscribed`. Required for CASL/CAN-SPAM compliance regardless of platform design; every nurture send carries an unsubscribe link.
- Sequence exhausted with no re-engagement — `status: completed`. Re-enrollment is possible on a fresh trigger later (mirrors the Research bucket's 180-day session expiry philosophy, §4.6 — a cold nurture contact isn't lost, just dormant).

**Execution mode:** Automate, not Approve. Per the Orchestrator's four execution modes (§6.3), Approve exists for customer-facing content that's novel or public each time (a GBP reply, a review response) — the non-negotiable "no auto-posting" boundary is about content posted to a public/external channel without review. A monthly nurture email uses a fixed, pre-approved template per sequence step; sending step N to profile X on schedule isn't generating new public content, it's executing an already-approved private 1:1 send. This is an inference consistent with the existing Attention Model, not a new non-negotiable — flag if that reasoning doesn't hold once the hub team scopes the actual send pipeline.

**Not specified — flag before building, don't guess:** whether `sequenceType` needs its own configuration table analogous to `business_configurations` in the AI Decision System schema (`data/schema/001_initial_schema.sql`) or lives entirely hub-side with no representation in that schema at all — this doc treats NurtureSequence as hub-side state, consistent with profiles/tiers having no SQL presence in `data/schema/` today.

**Direction, not yet locked (2026-07-02):** sequence tone/subject should be selected by bucket, not by tracking what content the visitor consumed — 3–4 tones total, matching the existing bucket-driven tone split already implicit in the Push Decision Table (Emergency: urgent/directive; Active Project: transactional; Comparison: reassuring/no-pressure; Research: educational/soft). Bucket itself stays entirely score/action-driven, per §3.1's escalate-only rule — this only decides which tone a given step uses, not whether/when someone advances or exits. To be specced out in full separately.

ClearSky Software — Communication Hub Technical Integration Specification — April 2026 — Confidential

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564