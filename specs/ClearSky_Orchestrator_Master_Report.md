**ClearSky AI Decision System**

**Orchestrator Master Report**

Developer Handoff Specification

| **Locked Workflow** Event -> Signal -> Orchestrator Decision -> Action Queue + Parameters -> Execution -> Outcome -> Feedback |
| --- |

# Purpose of This Report

This report explains the Orchestrator Decision stage of the ClearSky AI Decision System. It is intended for a dedicated developer thread focused only on the Orchestrator. The report includes the operating boundary, the deterministic 11-step decision process, JSON examples, edge cases, acceptance criteria, and a handoff prompt for continuing the work in a new thread.

| **Core Principle** The Orchestrator does not receive raw provider data, does not create Events, does not invent Signals, and does not execute actions directly. It receives valid Signal candidates and decides which Signal matters most, what should happen next, whether the action is allowed, what execution mode should be used, and what parameters are required before the work moves into the Action Queue. |
| --- |

# 1. Orchestrator Boundary

The Orchestrator begins only after the Event stage and Signal stage have already completed their responsibilities.

## What Comes Before the Orchestrator

| **Stage** | **Completed Responsibility** |
| --- | --- |
| Event | Raw provider/source activity has been converted into a trusted Event Object. The Event is known, normalized, matched, deduplicated, stored, and marked handoff_eligible where appropriate. |
| Signal | The Event has been evaluated against configured Signal rules. Valid Signal candidates now have known names, buckets, priority, confidence, and possible action mappings. |

### Example Event Input

{
  "event_type": "review_received",
  "network_category": "Trust",
  "provider": "google_business_profile",
  "review_rating_numeric": 4,
  "handoff_eligible": true
}

### Example Valid Signal Candidates

[
  {
    "signal_id": "SIG-REV-001",
    "signal_name": "positive_review_received",
    "signal_bucket": "Momentum",
    "priority": 4
  },
  {
    "signal_id": "SIG-REV-003",
    "signal_name": "positive_review_with_minor_issue",
    "signal_bucket": "Opportunity",
    "priority": 3
  },
  {
    "signal_id": "SIG-REV-004",
    "signal_name": "communication_experience_issue_detected",
    "signal_bucket": "Bottleneck",
    "priority": 2
  }
]

# 2. Orchestrator Decision Process

The Orchestrator follows a deterministic, rules-based decision flow. The steps should be implemented as a controlled decision pipeline so support staff and developers can inspect why an action was recommended, blocked, grouped, or routed to review.

Receive valid Signal candidates

Check safety and compliance rules

Check business configuration

Rank Signals by priority and impact

Identify the dominant Signal

Suppress or group related Signals

Select recommended action

Choose execution mode

Attach parameters

Create decision record

Send approved decision to Action Queue

| **Deterministic Rule** The Orchestrator should evaluate only known structured values: Signal name, Signal Bucket, priority, confidence score, source Event, business configuration, safety/compliance rules, cooldowns, suppression rules, allowed actions, execution modes, owners, and required parameters. |
| --- |

# Step 1 - Receive Valid Signal Candidates

The Orchestrator receives only Signals that have already passed Signal Detection and validation. It should not evaluate raw Events directly or invent missing Signals. Each candidate must carry enough context for deterministic decision-making.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| signal_id | Required input or decision value used by this step. |
| signal_name | Required input or decision value used by this step. |
| signal_bucket | Required input or decision value used by this step. |
| source_event_id | Required input or decision value used by this step. |
| business_id | Required input or decision value used by this step. |
| priority | Required input or decision value used by this step. |
| confidence_score | Required input or decision value used by this step. |
| recommended_action_ids | Required input or decision value used by this step. |
| required_fields_present | Required input or decision value used by this step. |
| cooldown_status | Required input or decision value used by this step. |
| suppression_status | Required input or decision value used by this step. |

## Example JSON

{
  "signal_id": "SIG-REV-004",
  "signal_name": "communication_experience_issue_detected",
  "signal_bucket": "Bottleneck",
  "source_event_id": "evt_7001",
  "business_id": "biz_apex_001",
  "priority": 2,
  "confidence_score": 0.92,
  "recommended_action_ids": [
    "ACT-REV-001",
    "ACT-REV-004"
  ],
  "required_fields_present": true,
  "cooldown_status": "clear",
  "suppression_status": "not_suppressed"
}

# Step 2 - Check Safety and Compliance Rules

Before selecting an action, the Orchestrator checks whether the system is allowed to act. This is essential for public replies, sensitive content, customer-facing messages, legal/financial/healthcare scenarios, complaints, negative reviews, urgent issues, and low-confidence AI results.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| public_facing_action | Required input or decision value used by this step. |
| approval_required | Required input or decision value used by this step. |
| sensitive_content_detected | Required input or decision value used by this step. |
| automation_allowed | Required input or decision value used by this step. |
| safe_execution_modes | Required input or decision value used by this step. |
| minimum_confidence_met | Required input or decision value used by this step. |

## Example JSON

{
  "safety_check_passed": true,
  "public_facing_action": true,
  "approval_required": true,
  "sensitive_content_detected": false,
  "automation_allowed": false,
  "safe_execution_modes": [
    "approval_required",
    "manual"
  ]
}

# Step 3 - Check Business Configuration

Each business can have different policies for automation, approvals, public replies, owner routing, office hours, SLA windows, channels, and brand tone. The Orchestrator applies this configuration before selecting an action or execution mode.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| automation_level | Required input or decision value used by this step. |
| review_reply_policy | Required input or decision value used by this step. |
| public_response_requires_approval | Required input or decision value used by this step. |
| sms_auto_reply_allowed | Required input or decision value used by this step. |
| email_auto_reply_allowed | Required input or decision value used by this step. |
| office_hours | Required input or decision value used by this step. |
| default_owner | Required input or decision value used by this step. |
| brand_tone | Required input or decision value used by this step. |
| sla_minutes | Required input or decision value used by this step. |

## Example JSON

{
  "business_id": "biz_apex_001",
  "automation_level": "assisted",
  "review_reply_policy": "draft_only",
  "public_response_requires_approval": true,
  "negative_review_escalation": true,
  "sms_auto_reply_allowed": true,
  "email_auto_reply_allowed": true,
  "office_hours": {
    "timezone": "America/Toronto",
    "monday_friday": "08:00-17:00"
  },
  "default_owner": "business_owner",
  "brand_tone": "professional, warm, accountable",
  "sla_minutes": 15
}

## Callback-request auto-reply protocol (LOCKED 2026-07-05, supersedes the emergency/urgent-only framing below)

> **Consolidated canonical reference:** `specs/clearsky-callback-response-protocol.md`. This section and the ones below it (Template library, Time-of-day gating, Approval routing, SLA breach escalation) remain here as the original locked-decision record, but read the consolidated doc for the full mechanism in one place.

**The trigger is not "emergency or urgent" — it's "the customer asked to be called back."** Any inbound contact requesting a callback (Lead Grabber, form, missed call, voicemail) gets an automated, immediate, no-approval reply. What makes it eligible to fire automatically isn't the urgency classification — it's that the reply content itself is **non-financial and non-technical**, the same content-type boundary Sarah Jenkins already owns for approvals (see "Approval routing," below). Pre-approving the reply *by content type* is what allows it to go out untouched, for a routine callback request exactly the same as an urgent one.

### How the AI and the Orchestrator divide the work

The AI Analysis Engine does not compose this reply. It classifies. Per `ClearSky_A2P_Developer_Spec.md` §5.3, its output already includes an `emergency_type` field — **extended by this decision to always populate a value, not just when `emergency: true`** (previously documented as `null` whenever `emergency: false`; that behavior is superseded here). The Orchestrator then does a **deterministic lookup** against `emergency_type` and sends the matching pre-approved template — no generation happens on the reply side at all.

### Template library (by `emergency_type`)

| `emergency_type` | Template sent | Status |
| --- | --- | --- |
| `burst_pipe` / `flooding` | *"Turn off your main water valve — usually in the basement near where the water line enters the house. A representative will call you in `sla_minutes` minutes."* | Locked |
| `gas_leak` | *"Leave the building immediately and call 911. Once you're safe, call us back and we'll help right away."* (matches the existing FAQ gas-safety line) | Locked |
| `sewage_backup` | Not yet written | Open |
| `electrical_fire_or_shock` | Not yet written | Open |
| `no_hot_water` / anything else not listed above | Generic, time-of-day-gated acknowledgment (see table below) — this is the fallback, not the default *rule* | Locked |

### Time-of-day gating applies only when `emergency: false` (LOCKED 2026-07-05, clarifies the table below)

**A true `emergency: true` classification bypasses time-of-day gating entirely — the callback/dispatch commitment is immediate, 24/7, no exceptions.** This isn't new; it's already established elsewhere and this protocol doesn't override it: `CLAUDE.md`'s "Emergency overrides everything," the site's own FAQ ("we answer 24 hours a day, 7 days a week... no voicemail"; emergencies are explicitly *"situations that can't wait until regular business hours"*), the IVR emergency routing rule (`ClearSky_A2P_Developer_Spec.md` line 210, bypasses standard queue logic and connects immediately, no time-of-day carve-out), and `ACT-CALL-003` (`Create emergency dispatch alert`, `Automatic (immediate)`). Since `burst_pipe`/`flooding` and most `gas_leak` cases will typically co-occur with `emergency: true` per §5.4's detection rules, their follow-up commitment is this immediate 24/7 path, not the table below — the table only governs the case where `emergency: false`, regardless of which `emergency_type` or how high the `urgency` value is (Barry's `no_hot_water` case included):

| Condition (only reached when `emergency: false`) | Automated reply |
| --- | --- |
| Inside `office_hours` | "A representative will call you in `sla_minutes` minutes." (RightFlush: **`sla_minutes: 10`**, not the generic example's 15) |
| Outside `office_hours` | Asks the customer directly: "Is this an emergency or do you need this looked at right away?" — a yes routes to immediate after-hours dispatch (after-hours rate applies) |
| Outside `office_hours`, customer confirms it can wait | "A representative will call you by 9:00 AM." |

This auto-reply fires under `sms_auto_reply_allowed`, distinct from `ACT-CALL-008` (`Send SMS follow-up (if opted in)`, `ClearSky_A2P_Developer_Spec.md` §6.5) — `ACT-CALL-008` is a marketing-style follow-up gated on SMS opt-in and human approval; this is a transactional acknowledgment of a request the customer just initiated themselves, sent automatically, with its own consent basis (see open item below).

### Approval routing (LOCKED 2026-07-05; corrected 2026-07-06)

Bert and Sarah split AI-drafted content by type, not by urgency: **Sarah approves anything non-financial and non-technical; Bert approves anything that touches pricing or a technical/service judgment call.** The auto-reply templates above are Sarah's domain (pre-approved once, per template, not per send).

**Correction:** `ACT-CALL-005` was previously cited here as the example of Bert's domain (a per-call callback script "touching pricing and diagnosis every time"). That's wrong — it fires before any call happens, so it can only summarize what the customer already said (internal call-context, logged to profile), never a price or diagnosis. It's automatic, no approval, per `ClearSky_A2P_Developer_Spec.md` §6.5. Bert's actual pricing/diagnosis is formed live, in his own words, during the call — not a pre-drafted artifact, so nothing exists yet for the "Bert must approve it first" rule to actually apply to in Barry's story. The rule stands for a future case where AI drafts a customer-facing message that originates new pricing/diagnosis; it just isn't `ACT-CALL-005`.

### SLA breach escalation (LOCKED 2026-07-05)

Nothing prior to this decision monitored whether a callback commitment (`sla_minutes`) was actually kept — `ACT-CALL-001` (create callback task) and `ACT-CALL-002` (alert the team) fire once, at task creation, and nothing watched afterward. This closes that gap.

**Monitoring:** at `sla_minutes + 5` minutes after task creation (RightFlush: 10 + 5 = **15 minutes**), the system checks Telnyx/A2P call and SMS logs (`ClearSky_A2P_Developer_Spec.md` §8, webhook events) for any outbound call or SMS from RightFlush to the customer's number. If none is found, the task is in breach.

**Escalation — three channels, increasing in intensity, all firing together (not sequential steps waiting on each other):**

1. **SMS** to the assigned rep (Bert): e.g. *"SLA VIOLATION — callback to [customer name/number] is overdue. Call now."*
2. **Push notification** to the assigned rep, same content.
3. **Automated outbound phone call** to the assigned rep, playing a recorded message: *"This is ClearSky. You are in violation of your response SLA for [customer name]. Press 1 to be connected to the customer now."* — a DTMF option bridges the call directly to the customer's number on press, rather than requiring the rep to hang up and dial manually.

**Open — not yet decided:** who this escalates *to* when the assigned rep is Bert himself (the two-person-shop problem — there's no third person to escalate to if Bert is unreachable). Also open: what happens if the escalation itself goes unanswered (does it repeat? escalate to Sarah despite the content being neither financial nor technical, purely as a human-in-the-loop backstop? something else?). Flagging rather than guessing past it.

# Step 4 - Rank Signals by Priority and Impact

The Orchestrator ranks valid Signals using configured priority, revenue impact, customer risk, reputation risk, urgency, timing/SLA state, confidence, and business settings. Ranking is used to decide which Signal should drive the next action.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| configured_priority | Required input or decision value used by this step. |
| revenue_impact | Required input or decision value used by this step. |
| customer_risk | Required input or decision value used by this step. |
| reputation_risk | Required input or decision value used by this step. |
| urgency | Required input or decision value used by this step. |
| sla_state | Required input or decision value used by this step. |
| confidence_score | Required input or decision value used by this step. |
| business_context | Required input or decision value used by this step. |

## Example JSON

{
  "ranked_signals": [
    {
      "signal_name": "communication_experience_issue_detected",
      "rank": 1,
      "priority": 2,
      "reason": "Customer praised work but mentioned communication delay."
    },
    {
      "signal_name": "positive_review_with_minor_issue",
      "rank": 2,
      "priority": 3,
      "reason": "Review is positive but includes a fixable complaint."
    },
    {
      "signal_name": "positive_review_received",
      "rank": 3,
      "priority": 4,
      "reason": "Positive reputation momentum."
    }
  ]
}

# Step 5 - Identify the Dominant Signal

When one Event creates multiple Signals, the Orchestrator identifies the dominant Signal. The dominant Signal is the primary business meaning that should drive the next decision. Supporting Signals remain attached as context.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| dominant_signal | Required input or decision value used by this step. |
| dominant_signal_bucket | Required input or decision value used by this step. |
| supporting_signals | Required input or decision value used by this step. |
| dominance_reason | Required input or decision value used by this step. |

## Example JSON

{
  "dominant_signal": "communication_experience_issue_detected",
  "dominant_signal_bucket": "Bottleneck",
  "reason": "The review is mostly positive, but the actionable issue is slow communication before the appointment.",
  "supporting_signals": [
    "positive_review_with_minor_issue",
    "positive_review_received",
    "service_quality_praise_detected"
  ]
}

# Step 6 - Suppress or Group Related Signals

The Orchestrator should avoid creating multiple noisy tasks from one Event. Related Signals can be grouped into one decision, and lower-priority or duplicate Signals can be suppressed into context.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| grouping_applied | Required input or decision value used by this step. |
| primary_signal | Required input or decision value used by this step. |
| grouped_signals | Required input or decision value used by this step. |
| suppressed_signals | Required input or decision value used by this step. |
| suppression_reason | Required input or decision value used by this step. |

## Example JSON

{
  "grouping_applied": true,
  "primary_signal": "communication_experience_issue_detected",
  "grouped_signals": [
    "positive_review_with_minor_issue",
    "positive_review_received",
    "service_quality_praise_detected"
  ],
  "suppressed_signals": [
    {
      "signal_name": "positive_review_received",
      "reason": "Covered by mixed-review response workflow."
    }
  ]
}

# Step 7 - Select Recommended Action

The Orchestrator uses Signal-to-Action mappings to select one or more allowed actions. A Signal can map to several possible actions, but the Orchestrator selects the final action based on safety, configuration, priority, current state, and required parameters.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| signal_to_action_mapping | Required input or decision value used by this step. |
| allowed_actions | Required input or decision value used by this step. |
| selected_actions | Required input or decision value used by this step. |
| primary_action | Required input or decision value used by this step. |
| secondary_actions | Required input or decision value used by this step. |

## Example JSON

{
  "selected_actions": [
    {
      "action_id": "ACT-REV-001",
      "action_name": "create_review_reply_draft",
      "role": "primary"
    },
    {
      "action_id": "ACT-REV-004",
      "action_name": "log_review_complaint_theme",
      "role": "secondary"
    }
  ]
}

# Step 8 - Choose Execution Mode

Execution mode determines whether the selected action happens automatically, requires human approval, must be performed manually, is blocked, or should be observed only. Public-facing and sensitive actions should default to approval or manual handling unless explicitly configured otherwise.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| execution_mode | Required input or decision value used by this step. |
| allowed_modes | Required input or decision value used by this step. |
| approval_reason | Required input or decision value used by this step. |
| automation_allowed | Required input or decision value used by this step. |
| manual_required | Required input or decision value used by this step. |

## Example JSON

{
  "primary_action": {
    "action_id": "ACT-REV-001",
    "execution_mode": "approval_required",
    "reason": "Google review replies are public-facing and require human validation."
  },
  "secondary_action": {
    "action_id": "ACT-REV-004",
    "execution_mode": "automatic",
    "reason": "Internal complaint-theme logging only; no customer-facing action."
  }
}

# Step 9 - Attach Parameters

The Orchestrator attaches the data required to execute the selected action correctly. Parameters should be structured and complete before the Action Queue receives the decision.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| business_id | Required input or decision value used by this step. |
| business_name | Required input or decision value used by this step. |
| review_id | Required input or decision value used by this step. |
| review_rating_numeric | Required input or decision value used by this step. |
| review_text | Required input or decision value used by this step. |
| reviewer_display_name | Required input or decision value used by this step. |
| brand_tone | Required input or decision value used by this step. |
| praise_topics | Required input or decision value used by this step. |
| complaint_topics | Required input or decision value used by this step. |
| reply_goal | Required input or decision value used by this step. |

## Example JSON

{
  "parameters": {
    "business_id": "biz_apex_001",
    "business_name": "APEX Contracting",
    "review_id": "gbp_review_88421",
    "reviewer_display_name": "Sarah M.",
    "review_rating_numeric": 4,
    "review_text": "The team was professional and the work turned out great. The only issue was that communication before the appointment was slow.",
    "praise_topics": [
      "professional team",
      "work quality"
    ],
    "complaint_topics": [
      "communication delay"
    ],
    "brand_tone": "professional, warm, accountable",
    "reply_goal": "thank_customer_acknowledge_delay_and_reinforce_service_quality"
  }
}

# Step 10 - Create Decision Record

The Orchestrator stores an auditable decision record explaining what it decided and why. This record is essential for debugging, support review, reporting, and later feedback loops.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| orchestrator_decision_id | Required input or decision value used by this step. |
| source_event_id | Required input or decision value used by this step. |
| business_id | Required input or decision value used by this step. |
| dominant_signal | Required input or decision value used by this step. |
| supporting_signals | Required input or decision value used by this step. |
| selected_actions | Required input or decision value used by this step. |
| decision_reason | Required input or decision value used by this step. |
| decision_status | Required input or decision value used by this step. |
| created_at | Required input or decision value used by this step. |

## Example JSON

{
  "orchestrator_decision_id": "dec_9001",
  "source_event_id": "evt_7001",
  "business_id": "biz_apex_001",
  "dominant_signal": "communication_experience_issue_detected",
  "dominant_signal_bucket": "Bottleneck",
  "supporting_signals": [
    "positive_review_with_minor_issue",
    "positive_review_received",
    "service_quality_praise_detected"
  ],
  "selected_actions": [
    {
      "action_id": "ACT-REV-001",
      "action_name": "create_review_reply_draft",
      "execution_mode": "approval_required"
    },
    {
      "action_id": "ACT-REV-004",
      "action_name": "log_review_complaint_theme",
      "execution_mode": "automatic"
    }
  ],
  "decision_reason": "The review is mostly positive but includes a communication delay complaint. The best next step is to draft a public reply for approval and log the complaint theme internally.",
  "decision_status": "approved_for_action_queue",
  "created_at": "2026-05-08T14:20:00Z"
}

# Step 11 - Send Approved Decision to Action Queue

When the decision is approved for movement, the Orchestrator sends a structured payload to the Action Queue. The Action Queue prepares the work for approval, assignment, or execution.

## Required / Important Fields

| **Field** | **Purpose** |
| --- | --- |
| action_queue_id | Required input or decision value used by this step. |
| source_decision_id | Required input or decision value used by this step. |
| source_event_id | Required input or decision value used by this step. |
| business_id | Required input or decision value used by this step. |
| action_id | Required input or decision value used by this step. |
| execution_mode | Required input or decision value used by this step. |
| priority | Required input or decision value used by this step. |
| status | Required input or decision value used by this step. |
| owner | Required input or decision value used by this step. |
| parameters | Required input or decision value used by this step. |

## Example JSON

{
  "action_queue_id": "aq_3001",
  "source_decision_id": "dec_9001",
  "source_event_id": "evt_7001",
  "business_id": "biz_apex_001",
  "action_id": "ACT-REV-001",
  "action_name": "create_review_reply_draft",
  "execution_mode": "approval_required",
  "priority": 2,
  "status": "pending_approval",
  "owner": "consultant",
  "parameters": {
    "review_id": "gbp_review_88421",
    "review_rating_numeric": 4,
    "review_text": "The team was professional and the work turned out great. The only issue was that communication before the appointment was slow.",
    "brand_tone": "professional, warm, accountable",
    "reply_goal": "thank_customer_acknowledge_delay_and_reinforce_service_quality"
  }
}

# 14. Orchestrator Failure / Fallback Handling

| **Failure Case** | **Required Handling** |
| --- | --- |
| No valid Signals received | Do not create Orchestrator Decision. |
| Required Signal field missing | Reject Signal or send to admin review. |
| Business configuration missing | Route to manual review. |
| Safety check failed | Block automation. |
| Public action without approval policy | Require manual review. |
| No action mapping exists | Create manual review decision. |
| Required parameters missing | Do not send to Action Queue. |
| Cooldown active | Suppress or delay action. |
| Duplicate decision exists | Group or suppress. |
| AI confidence too low | Require human validation. |

## Fallback JSON Example

{
  "orchestrator_decision_id": "dec_9002",
  "source_event_id": "evt_7001",
  "decision_status": "manual_review_required",
  "reason": "Missing required business configuration for Google review reply policy.",
  "action_queue_created": false
}

# 15. Developer Acceptance Criteria

| **#** | **Acceptance Criteria** |
| --- | --- |
| 1 | Receive valid Signal candidates from the Signal stage. |
| 2 | Reject invalid or incomplete Signals. |
| 3 | Apply safety and compliance rules before action selection. |
| 4 | Apply business-specific configuration. |
| 5 | Rank Signals by priority and impact. |
| 6 | Identify a dominant Signal. |
| 7 | Group or suppress related Signals. |
| 8 | Select allowed actions from Signal-to-Action mappings. |
| 9 | Choose the correct execution mode. |
| 10 | Attach all required parameters. |
| 11 | Create a complete auditable decision record. |
| 12 | Send approved decisions to Action Queue. |
| 13 | Block or route unknown cases to manual review. |
| 14 | Explain why a decision was made. |

# 16. Orchestrator Report Handoff Summary

Use this summary when starting the dedicated Orchestrator thread.

| **Thread Handoff Summary** We are continuing the ClearSky AI Decision System design, focused specifically on the Orchestrator Decision stage. The locked workflow is: Event -> Signal -> Orchestrator Decision -> Action Queue + Parameters -> Execution -> Outcome -> Feedback. The Orchestrator receives valid Signal candidates and makes deterministic, rules-based decisions using known structured values. It selects the dominant meaning, applies safety and business rules, chooses allowed actions, attaches required parameters, records the decision, and hands approved work to the Action Queue. |
| --- |

## Orchestrator Process to Preserve

Receive valid Signal candidates

Check safety and compliance rules

Check business configuration

Rank Signals by priority and impact

Identify the dominant Signal

Suppress or group related Signals

Select recommended action

Choose execution mode

Attach parameters

Create decision record

Send approved decision to Action Queue

# 17. Copy/Paste Prompt for New Orchestrator Thread

You are helping me continue the ClearSky AI Decision System design. We are now working only on the Orchestrator Decision section.

Do not rename the core workflow or introduce new layers unless I ask.

Locked workflow:
Event -> Signal -> Orchestrator Decision -> Action Queue + Parameters -> Execution -> Outcome -> Feedback

ClearSky Business Platform purpose:
ClearSky Business Platform helps local businesses grow by improving the full customer journey. It connects Discovery, Engagement, Conversion, and Growth into one system that increases visibility, strengthens customer interaction, captures more opportunities, and turns calls, messages, and inquiries into measurable revenue, booked work, and long-term business value.

Current focus:
Build and refine the Orchestrator Decision section.

The Orchestrator receives valid Signal candidates. It does not create Events, does not invent Signals, and does not execute actions directly.

The Orchestrator decision process is:
1. Receive valid Signal candidates
2. Check safety and compliance rules
3. Check business configuration
4. Rank Signals by priority and impact
5. Identify the dominant Signal
6. Suppress or group related Signals
7. Select recommended action
8. Choose execution mode
9. Attach parameters
10. Create decision record
11. Send approved decision to Action Queue

The Orchestrator must be deterministic, rules-based, auditable, and explainable.

It should evaluate only known structured values such as Signal name, Signal Bucket, priority, confidence score, source Event, business configuration, safety/compliance rules, cooldowns, suppression rules, allowed actions, execution modes, owners, and required parameters.

If required values are missing, unknown, low-confidence, blocked by safety rules, or not configured, the Orchestrator should not guess. It should block, suppress, route to manual review, or create a safe internal task.

Use the Google Business Profile review example as the working example: A 4-star Google Business Profile review includes praise and a minor complaint about slow communication. The Event is review_received, Network Category is Trust, and likely Signals include positive_review_received, positive_review_with_minor_issue, communication_experience_issue_detected, and mixed_review_reply_needed.

Help me refine this Orchestrator section into a developer-ready specification with JSON examples, rules, edge cases, database fields, acceptance criteria, and plain-English explanations.

ClearSky AI Decision System - Orchestrator Master Report