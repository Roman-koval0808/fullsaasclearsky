ClearSky  ·  A2P Communication & Orchestrator — Developer Specification

**ClearSky**

A2P Communication & Orchestrator

*Developer Technical Specification*

| Version 1.0  ·  May 2026 Provider: Telnyx  ·  Platform: ClearSky AI Decision System **Classification: Internal Developer Document** |
| --- |

# **1. System Overview**

This document describes the ClearSky A2P (Application-to-Person) communication layer and the ClearSky Orchestrator that processes all inbound interactions. The system is built on the Telnyx platform and handles inbound phone calls through a full intelligence pipeline — from call detection to AI analysis to task generation.

## **1.1  Purpose**

The A2P layer is responsible for:

- Receiving inbound calls via Telnyx and identifying whether a caller profile exists

- Routing calls through the IVR to the correct team member or queue

- Recording all calls and capturing voicemails when a call is not connected

- Passing voicemail transcripts and live call transcripts to the ClearSky Orchestrator for AI analysis

- Evaluating sentiment, urgency, emergency risk, opportunity signals, momentum, and risk

- Generating tasks, alerts, and workflow actions through the Orchestrator

## **1.2  Locked Workflow**

The ClearSky AI Decision System follows this locked workflow. No step may be skipped or re-ordered:

| **ℹ  NOTE** Event  →  Signal Detection  →  Orchestrator Decision  →  Action Queue + Parameters  →  Execution  →  Outcome  →  Feedback |
| --- |

## **1.3  Platform Stack**

| **Component** | **Provider / Technology** | **Role** |
| --- | --- | --- |
| Telephony | Telnyx | Inbound call handling, IVR, call recording, voicemail |
| Profile Matching | ClearSky CRM | Caller ID lookup, profile creation/logging |
| IVR | Telnyx TeXML / Call Control | Call routing, menu navigation, queue management |
| Recording | Telnyx | Full call and voicemail recording, storage |
| Transcription | Deepgram | Voicemail and call transcript generation (Nova-2 model recommended) |
| AI Analysis | Claude / LLM | Sentiment, urgency, signal, opportunity, risk evaluation |
| Orchestrator | ClearSky Orchestrator | Receives raw input, generates decisions and tasks |
| Notification | ClearSky | Alerts, task creation, CRM updates |

# **2. Inbound Call Flow**

The following describes the complete lifecycle of an inbound call from first ring to Orchestrator handoff.

## **2.1  High-Level Flow Diagram**

  INBOUND CALL (Telnyx)

       │

       ▼

  ┌─────────────────────────────┐

  │  Profile Lookup             │  ← Match caller to CRM profile

  │  (caller ID → profile DB)   │

  └─────────────────────────────┘

       │                │

   Profile Found    No Profile

       │                │

       │           Create anonymous log entry

       │                │

       └────────┬───────┘

                ▼

  ┌─────────────────────────────┐

  │  Log Call Event             │  ← Record: caller ID, time, profile ID, channel

  └─────────────────────────────┘

                │

                ▼

  ┌─────────────────────────────┐

  │  IVR Routing                │  ← Menu options, department routing

  └─────────────────────────────┘

                │

        ┌───────┴───────┐

    Connected       Not Connected

        │                   │

        ▼                   ▼

  Live Call           Voicemail Capture

  Recording           (recorded + transcribed)

        │                   │

        └───────┬───────────┘

                ▼

  ┌─────────────────────────────┐

  │  AI Analysis Engine         │  ← Sentiment, urgency, emergency,

  │                             │     opportunity, momentum, risk

  └─────────────────────────────┘

                │

                ▼

  ┌─────────────────────────────┐

  │  Orchestrator               │  ← Signal detection, decision, action queue

  └─────────────────────────────┘

## **2.2  Profile Lookup Logic**

When a call arrives, the system performs an immediate caller profile lookup.

| **Condition** | **Action** | **Log Entry** |
| --- | --- | --- |
| Caller ID matches existing profile | Associate call with profile | profile_id, call_id, timestamp, channel: phone |
| Caller ID not found | Create anonymous log entry | caller_id (raw), call_id, timestamp, profile_id: null |
| Caller ID withheld / private | Log as unknown_caller | call_id, timestamp, caller_type: private |

| **⚠  IMPORTANT** Profile matching must complete before the IVR greeting ends. The lookup timeout must not exceed 2 seconds. If lookup fails or times out, the call continues with an anonymous log entry — do not block the call. |
| --- |

## **2.3  Call Event Logging**

Every inbound call generates a Call Event record regardless of outcome. Minimum required fields:

{

  "call_event_id":     "evt_<uuid>",

  "call_id":           "telnyx_call_control_id",

  "caller_id":         "+17051234567",

  "called_number":     "+17059876543",

  "profile_id":        "biz_apex_001" | null,

  "call_started_at":   "2026-05-14T10:23:00Z",

  "channel":           "phone",

  "ivr_path":          "main_menu > service_dept",

  "call_outcome":      "connected" | "voicemail" | "abandoned" | "missed",

  "recording_url":     "https://storage.../recording.mp3" | null,

  "transcript_id":     "trans_<uuid>" | null

}

# **3. IVR — Interactive Voice Response**

The IVR is built on Telnyx TeXML / Call Control. Its job is to route the caller to the correct team member or department efficiently. The IVR does not make business decisions — it routes calls only.

## **3.1  IVR Design Principles**

- Maximum 2 levels of menu depth — no caller should navigate more than 2 menus

- All menus must have a fallback option to reach a live operator

- If no selection is made within 8 seconds, repeat the prompt once then transfer to default queue

- After 2 failed selections, transfer to the operator queue automatically

- All IVR paths must be logged in the call event record under ivr_path

## **3.2  Routing Rules**

| **Selection** | **Route To** | **Fallback** |
| --- | --- | --- |
| 1 — Service / Repairs | Service Team Queue | Operator if queue > 3 min wait |
| 2 — Estimates / Quotes | Sales Team | Voicemail if unavailable |
| 3 — Emergency | Emergency Line (priority) | On-call technician |
| 4 — Billing / Admin | Admin Queue | Voicemail if unavailable |
| 0 — Operator | Operator / Reception | General voicemail |
| No input / Invalid | Repeat menu once | Transfer to operator after 2nd fail |

| **🔒  CRITICAL** Emergency routing (option 3) must bypass standard queue logic entirely and connect immediately to the designated emergency line or on-call number. Emergency calls must be flagged in the call event as call_priority: emergency before IVR routing completes. |
| --- |

## **3.3  IVR Telnyx Implementation Notes**

- Use Telnyx Call Control API for dynamic routing — TeXML for static menus

- Implement DTMF detection with 5-second timeout per digit entry

- All audio prompts must be pre-recorded .mp3 files (not TTS in production)

- Call transfer must use the transfer webhook endpoint to update call_event record in real time

- IVR path must be appended to the call event at each step, not only at the end

# **4. Call Recording and Voicemail**

## **4.1  Recording**

All connected calls are recorded via Telnyx. Recording begins automatically at call connection and stops at call termination. The recording file URL is stored in the call event record.

| **Field** | **Value / Rule** |
| --- | --- |
| Recording format | MP3, mono, 8kHz minimum |
| Recording trigger | Automatic on call_connected webhook |
| Storage | Telnyx storage → then transferred to ClearSky secure bucket |
| Retention | 90 days minimum (confirm with legal/compliance) |
| Consent notification | IVR must play recording notice before connection: 'This call may be recorded' |
| recording_url | Populated in call_event record within 30 seconds of call end |

## **4.2  Voicemail Capture**

When a call is not connected — routed to voicemail, unanswered, or abandoned after the IVR — the system captures a voicemail recording and generates a transcript.

| **Condition** | **Voicemail Trigger** |
| --- | --- |
| Call not answered within 20 seconds | Telnyx transfers to voicemail flow |
| Queue wait exceeds threshold | IVR offers voicemail option |
| After-hours call | IVR routes directly to voicemail with after-hours message |
| Extension not available | Transfer to personal voicemail |

| **ℹ  NOTE** Voicemail greeting must inform the caller that their message will be reviewed and they will receive a callback. Do not promise a specific callback time in the greeting. |
| --- |

## **4.3  Voicemail Processing Pipeline**

After a voicemail is captured, the following processing steps occur automatically:

  Voicemail recorded (Telnyx)

        │

        ▼

  Voicemail uploaded to ClearSky storage

        │

        ▼

  STT Transcription (Speech-to-Text API)

        │

        ▼

  Transcript stored in transcript record

        │

        ▼

  AI Analysis (see Section 5)

        │

        ▼

  Raw input package sent to Orchestrator

## **4.4  Voicemail Record Schema**

{

  "voicemail_id":       "vm_<uuid>",

  "call_event_id":      "evt_<uuid>",

  "profile_id":         "biz_apex_001" | null,

  "recording_url":      "https://storage.../voicemail.mp3",

  "transcript_id":      "trans_<uuid>",

  "transcript_text":    "Hi, this is John calling about...",

  "transcript_status":  "completed" | "pending" | "failed",

  "captured_at":        "2026-05-14T10:28:00Z",

  "duration_seconds":   42,

  "ai_analysis_id":     "ai_<uuid>" | null

}

# **5. AI Analysis Engine**

When a voicemail transcript or live call transcript is available, it is passed to the ClearSky AI Analysis Engine. The engine evaluates the content across six dimensions and produces a structured analysis record that is sent to the Orchestrator.

## **5.1  Analysis Dimensions**

| **Dimension** | **Definition** | **Output Values** |
| --- | --- | --- |
| Sentiment | Overall emotional tone of the caller | positive / neutral / negative / mixed |
| Urgency | How time-sensitive the caller's need is | low / medium / high / critical |
| Emergency | Whether the situation poses immediate risk | true / false + emergency_type. **`emergency_type` always populates a value (LOCKED 2026-07-05, `ClearSky_Orchestrator_Master_Report.md` § Callback-request auto-reply protocol) — not just when `emergency: true`.** Drives the Orchestrator's deterministic auto-reply template lookup regardless of the emergency verdict. |
| Opportunity | Whether a revenue or growth opportunity is present | none / low / medium / high |
| Momentum | Whether the caller is ready to move forward | passive / interested / ready_to_book |
| Risk | Likelihood of churn, complaint escalation, or negative outcome | low / medium / high |

## **5.2  AI Analysis Input**

The AI engine receives a structured input package containing the transcript, caller profile context (if available), call metadata, and the IVR path taken.

{

  "analysis_input_id":   "ai_in_<uuid>",

  "source_type":         "voicemail" | "live_call",

  "transcript_text":     "Hi, I need someone urgently...",

  "caller_profile":      { "profile_id": "biz_apex_001", "history": [...] } | null,

  "call_event_id":       "evt_<uuid>",

  "ivr_path":            "main_menu > service_dept",

  "called_number":       "+17059876543",

  "call_duration_sec":   42,

  "call_time":           "2026-05-14T10:28:00Z"

}

## **5.3  AI Analysis Output**

{

  "ai_analysis_id":     "ai_<uuid>",

  "source_type":        "voicemail",

  "call_event_id":      "evt_<uuid>",

  "sentiment":          "negative",

  "urgency":            "high",

  "emergency":          false,

  "emergency_type":     "no_hot_water",

  "opportunity":        "medium",

  "momentum":           "ready_to_book",

  "risk":               "medium",

  "summary":            "Caller reports no heat. Frustrated. First-time caller. Wants same-day service.",

  "signals_detected":   ["service_urgency", "new_customer_opportunity", "churn_risk_if_missed"],

  "confidence":         0.91,

  "analyzed_at":        "2026-05-14T10:28:45Z"

}

## **5.4  Emergency Detection Rules**

The AI must flag emergency = true when any of the following are detected in the transcript:

- No heat / no hot water in extreme cold conditions

- Gas leak suspected or detected

- Flooding or active water damage

- Electrical issue with fire or shock risk

- Caller explicitly uses the word 'emergency', 'fire', 'flooding', 'gas smell', 'no heat'

| **🔒  CRITICAL** If emergency = true, the Orchestrator must generate an IMMEDIATE_ALERT action and notify the on-call technician before any other task is processed. Emergency actions bypass the standard action queue priority. |
| --- |

# **6. The ClearSky Orchestrator**

The Orchestrator is the intelligence hub of the ClearSky system. It receives raw input from every channel — phone calls, voicemails, live call transcripts, messages, and future channels — and runs the full ClearSky AI Decision workflow to determine what actions to take.

## **6.1  Orchestrator Inputs**

The Orchestrator accepts raw input packages from the following sources:

| **Input Source** | **Trigger** | **Package Type** |
| --- | --- | --- |
| Voicemail transcript | Voicemail AI analysis complete | voicemail_analysis_package |
| Live call transcript | Call ended + transcript ready | live_call_analysis_package |
| Missed call (no voicemail) | Call missed, no message left | missed_call_event |
| IVR abandoned | Caller hung up during IVR | abandoned_call_event |
| Future: SMS / message | Message received | message_analysis_package |
| Future: Form submission | Web form submitted | form_event_package |

## **6.2  Orchestrator Workflow (Locked)**

The Orchestrator processes every input through the locked ClearSky decision workflow:

  RAW INPUT RECEIVED

        │

        ▼

  ┌─────────────────────────────────────┐

  │  Step 1: Event Intake               │

  │  Normalize, validate, profile match │

  └─────────────────────────────────────┘

        │

        ▼

  ┌─────────────────────────────────────┐

  │  Step 2: Signal Detection           │

  │  Parse AI analysis, detect Signals  │

  └─────────────────────────────────────┘

        │

        ▼

  ┌─────────────────────────────────────┐

  │  Step 3: Orchestrator Decision      │

  │  Select dominant Signal, map Actions│

  └─────────────────────────────────────┘

        │

        ▼

  ┌─────────────────────────────────────┐

  │  Step 4: Action Queue + Parameters  │

  │  Queue approved actions with params │

  └─────────────────────────────────────┘

        │

        ▼

  ┌─────────────────────────────────────┐

  │  Step 5: Execution                  │

  │  Execute approved actions            │

  └─────────────────────────────────────┘

        │

        ▼

  ┌─────────────────────────────────────┐

  │  Step 6: Outcome                    │

  │  Record result of each action       │

  └─────────────────────────────────────┘

        │

        ▼

  ┌─────────────────────────────────────┐

  │  Step 7: Feedback                   │

  │  Evaluate quality, flag candidates  │

  └─────────────────────────────────────┘

## **6.3  Orchestrator Raw Input Package**

The Orchestrator receives a standardized raw input package for every event. This package contains the call event, AI analysis results, and caller profile context.

{

  "orchestrator_input_id":  "orch_in_<uuid>",

  "source_channel":         "phone",

  "source_type":            "voicemail" | "live_call" | "missed_call",

  "call_event_id":          "evt_<uuid>",

  "voicemail_id":           "vm_<uuid>" | null,

  "ai_analysis_id":         "ai_<uuid>" | null,

  "profile_id":             "biz_apex_001" | null,

  "caller_id":              "+17051234567",

  "called_number":          "+17059876543",

  "ai_summary":             "Caller reports no heat. Frustrated...",

  "sentiment":              "negative",

  "urgency":                "high",

  "emergency":              false,

  "emergency_type":         "no_hot_water",

  "opportunity":            "medium",

  "momentum":               "ready_to_book",

  "risk":                   "medium",

  "signals_detected":       ["service_urgency", "new_customer_opportunity"],

  "received_at":            "2026-05-14T10:29:00Z"

}

## **6.4  Signal Detection**

The Orchestrator maps AI analysis results to ClearSky Signals. Signals are the structured intent/situation identifiers that drive action selection.

| **Signal Name** | **Trigger Conditions** | **Priority** |
| --- | --- | --- |
| EMERGENCY_SERVICE | emergency = true, any emergency_type | Critical |
| SERVICE_URGENCY | urgency = high or critical, sentiment = negative | High |
| NEW_CUSTOMER_OPPORTUNITY | profile_id = null, opportunity ≥ medium | High |
| CALLBACK_REQUIRED | call_outcome = voicemail or missed, urgency ≥ medium | Medium |
| CHURN_RISK | risk = high, existing customer profile | High |
| BOOKING_OPPORTUNITY | momentum = ready_to_book | Medium |
| COMPLAINT_SIGNAL | sentiment = negative, risk ≥ medium | Medium |
| GENERAL_INQUIRY | urgency = low, sentiment = neutral or positive | Low |

## **6.5  Action Mapping**

Each Signal maps to one or more Actions. Actions are always queued and executed within their approved execution mode.

| **Action ID** | **Action Name** | **Execution Mode** | **Requires Approval** |
| --- | --- | --- | --- |
| ACT-CALL-001 | Create callback task | Automatic | No |
| ACT-CALL-002 | Send urgent alert to team | Automatic | No |
| ACT-CALL-003 | Create emergency dispatch alert | Automatic (immediate) | No |
| ACT-CALL-004 | Log opportunity to CRM | Automatic | No |
| ACT-CALL-005 | Generate call-context summary (internal) | Automatic | No |
| ACT-CALL-006 | Log complaint theme internally | Automatic | No |
| ACT-CALL-007 | Flag churn risk in profile | Automatic | No |
| ACT-CALL-008 | Send SMS follow-up (if opted in) | Draft — human approval | Yes |

| **🔒  CRITICAL** Actions marked 'Requires Approval = Yes' must never be executed automatically. They must be placed in the human review queue and await explicit approval before sending or posting. The system must not invent an approval event. |
| --- |

**Correction, LOCKED 2026-07-06:** ACT-CALL-005 was previously documented as "Draft callback script," Requires Approval: Yes, on the reasoning that it touches pricing/diagnosis. That reasoning doesn't hold — ACT-CALL-005 fires the instant an inbound contact is classified, before any call has happened. At that point no diagnosis or price exists to touch; the only content available is a recap of what the customer already said. It's an internal call-context summary for the rep (also written to the customer's profile), not a customer-facing draft — so it was miscategorized into the approval-required bucket. There is no Action anywhere for "the technical/pricing response," and there can't be one that fires in advance: that content only comes into existence live, in the rep's own words, during the call itself.

## **6.6  Live Call Handling**

When a call connects and is completed (not voicemail), the full call recording is transcribed after the call ends. The transcript is then passed to the AI Analysis Engine and then to the Orchestrator using the same pipeline as voicemail, with source_type: live_call.

| **Step** | **Action** |
| --- | --- |
| 1 | Call connects, recording begins |
| 2 | Call ends, Telnyx fires call_ended webhook |
| 3 | Recording URL captured and stored in call_event |
| 4 | Recording sent to STT for transcription |
| 5 | Transcript sent to AI Analysis Engine |
| 6 | AI analysis package sent to Orchestrator |
| 7 | Orchestrator runs full 7-step workflow |
| 8 | Tasks, alerts, and CRM updates generated |

# **7. Profile and Data Management**

## **7.1  Profile Matching**

The ClearSky profile represents a business or caller in the CRM. Profile matching occurs at the start of every call and every Orchestrator event.

| **Match Type** | **Logic** | **Result** |
| --- | --- | --- |
| Exact phone match | caller_id matches profile.phone | Full profile loaded |
| Fuzzy match (same area, similar name) | Manual review flagged | Partial match — confirm before merge |
| No match | Anonymous log entry created | profile_id = null |
| New customer detected | No match + opportunity signal | Prompt to create profile post-call |

## **7.2  Call-to-Profile Linkage**

Every call event, voicemail record, AI analysis, and Orchestrator input package must carry profile_id where available. This ensures the full interaction history is visible on the profile record.

- call_event.profile_id links the call to the business profile

- voicemail.profile_id links the voicemail to the profile

- ai_analysis.profile_id links the analysis to the profile

- orchestrator_input.profile_id links the Orchestrator decision chain to the profile

| **⚠  IMPORTANT** Profile records must never be merged automatically. If two profiles appear to belong to the same caller, flag for human review. Automatic merges can cause data loss and incorrect task attribution. |
| --- |

# **8. Telnyx Webhook Events**

The ClearSky backend must handle the following Telnyx webhook events. Each webhook must be acknowledged with a 200 response within 5 seconds.

| **Webhook Event** | **When Fired** | **ClearSky Action** |
| --- | --- | --- |
| call.initiated | Incoming call detected | Begin profile lookup, create call_event |
| call.answered | Call connected by agent | Update call_event status, start recording |
| call.hangup | Call ended by either party | Finalize call_event, trigger transcription |
| call.recording.saved | Recording file ready | Store recording_url in call_event |
| call.transcription.ready | Transcript complete | Store transcript, trigger AI analysis |
| call.machine.detection.ended | Voicemail detected | Trigger voicemail capture flow |
| call.dtmf.received | Caller pressed a key | Log IVR selection, advance routing |
| call.gather.ended | IVR gather completed | Process selection, update ivr_path |

| **🔒  CRITICAL** All webhook payloads must be logged raw before processing. If a webhook fails processing, the raw log allows replay without data loss. Webhook signature validation (Telnyx-Signature header) must be enforced in production. |
| --- |

# **9. Error Handling and Edge Cases**

| **Scenario** | **Behaviour** | **Developer Action Required** |
| --- | --- | --- |
| Profile lookup timeout > 2s | Proceed with null profile, log warning | Alert if sustained over 5 calls |
| Transcription fails | Mark transcript_status: failed, alert ops team | Implement retry — 3 attempts, 30s delay |
| AI analysis returns no signals | Log no_signals_detected, pass to Orchestrator as GENERAL_INQUIRY | Ensure Orchestrator handles empty signal array |
| Emergency flag = true | Bypass queue — immediate alert | Test emergency routing in staging before launch |
| Telnyx webhook not received | Poll recording status after 60s | Implement fallback polling, do not assume delivery |
| Recording URL unavailable | Log recording_url: null, continue pipeline | Never block transcription on recording failure |
| Orchestrator timeout | Log orch_status: timeout, retry once | Set Orchestrator timeout to 30s max |
| Duplicate webhook received | Idempotency check on call_id + event_type | Deduplicate by call_id — process once only |

# **10. Open Items and Developer Notes**

## **10.1  Items Requiring Decision Before Build**

- Confirm recording storage bucket (Telnyx storage vs. AWS S3 vs. GCS)

- Define recording retention policy and confirm legal/compliance review

- Confirm SMS opt-in status per profile before enabling ACT-CALL-008

- Define SLA thresholds for callback urgency (e.g., CALLBACK_REQUIRED: respond within X minutes)

- Confirm voicemail greeting audio files and recording notice wording with business owner

## **10.2  Build Order Recommendation**

| **Phase** | **Components** | **Status** |
| --- | --- | --- |
| Phase 1 | Telnyx inbound call handling, call_event logging, profile lookup | Ready to build |
| Phase 2 | IVR routing (TeXML), call recording, voicemail capture | Ready to build |
| Phase 3 | STT transcription pipeline, transcript storage (Deepgram) | Ready to build |
| Phase 4 | AI Analysis Engine (6 dimensions), analysis record schema | Ready to design |
| Phase 5 | Orchestrator raw input receiver, Event Intake, Signal Detection | Document complete |
| Phase 6 | Action Queue, Execution, Outcome, Feedback | Document complete |
| Phase 7 | Dashboard, reporting, support cockpit | Future phase |

## **10.3  Security Requirements**

- All call recordings must be stored in a private, access-controlled bucket — never public URLs

- Telnyx webhook signature validation must be enabled in production

- AI analysis payloads may contain PII — ensure encryption in transit (TLS 1.2+) and at rest

- Profile access must be role-restricted — technicians cannot access full call history unless authorized

- All API keys (Telnyx, STT, AI) must be stored in environment variables — never hardcoded

# **11. Glossary**

| **Term** | **Definition** |
| --- | --- |
| A2P | Application-to-Person. Communications system where a software application manages person-to-business interactions. |
| Call Event | The primary record created for every inbound call, regardless of outcome. |
| IVR | Interactive Voice Response. The automated phone menu system that routes callers. |
| Orchestrator | The ClearSky AI decision hub that processes all input events and generates actions. |
| Profile | A CRM record representing a caller or business entity in the ClearSky system. |
| Signal | A structured intent/situation identifier detected by the Orchestrator from AI analysis. |
| Action | A task or workflow step generated by the Orchestrator as a result of Signal detection. |
| Sentiment | The overall emotional tone detected in a voicemail or call transcript. |
| Urgency | How time-sensitive the caller's situation is, as determined by AI analysis. |
| Emergency | A flag indicating the caller's situation poses immediate safety or service risk. |
| Momentum | Whether the caller is ready to take action (book, purchase, escalate). |
| Risk | The likelihood of churn, complaint escalation, or negative business outcome. |
| Opportunity | A signal that a revenue or growth opportunity exists with this caller. |
| Feedback | Section 7 of the ClearSky workflow — evaluates the quality and completeness of the decision chain. |
| Telnyx | The telephony platform providing call handling, IVR, recording, and webhooks. |
| TeXML | Telnyx XML — markup language for defining IVR and call control flows. |

	Internal — May 2026	Page