ClearSky AI Decision System · Developer Technical Specification

**CLEARSKY SOFTWARE**

**ClearSky AI Decision System**

Technical Developer Specification

*Workflow: Event → Signal → Orchestrator Decision → Action Queue + Parameters → Execution → Outcome → Feedback*

Version 0.1  ·  Working Architecture Document  ·  May 2026

| **Field** | **Value** |
| --- | --- |
| Document purpose | Developer-facing technical specification for the ClearSky AI Decision System workflow. |
| Primary audience | Backend developers, AI engineers, systems architects, product owners, implementation leads. |
| Boundary | This document covers the full workflow from provider activity intake through feedback tracking. |
| Locked workflow | Event → Signal → Orchestrator Decision → Action Queue + Parameters → Execution → Outcome → Feedback. |
| Core design principle | Deterministic rules control system movement. AI enriches unstructured content and supports generation where explicitly allowed. |

# **Table of Contents**

**1.  **Executive Overview

**2.  **System Principles and Boundaries

**3.  **Event

**4.  **Signal

**5.  **Orchestrator Decision

**6.  **Action Queue + Parameters

**7.  **Execution

**8.  **Outcome

**9.  **Feedback

**10.  **End-to-End Example: Google Business Profile Review

**11.  **Recommended Data Model

**12.  **Recommended API Surface

**13.  **Developer Acceptance Criteria

**14.  **External Files and Supporting Artifacts

# **1. Executive Overview**

ClearSky Business Platform helps local businesses grow by improving the full customer journey. It connects Discovery, Engagement, Conversion, and Growth into one system that increases visibility, strengthens customer interaction, captures more opportunities, and turns calls, messages, and inquiries into measurable revenue, booked work, and long-term business value.

The ClearSky AI Decision System is the event-driven automation layer that turns provider activity into structured system intelligence and then into controlled action. It receives activity from external and internal providers, converts that activity into a trusted Event Object, evaluates the Event against configured Signal rules, lets the Orchestrator decide what should happen, queues the correct action with required parameters, executes or prepares the work, records the outcome, and feeds the result back into the system.

| **Stage** | **Primary Responsibility** | **Output** |
| --- | --- | --- |
| Event | Convert raw provider/source activity into a trusted ClearSky Event Object. | handoff_eligible Event or blocked Event. |
| Signal | Evaluate known Events against configured rules to determine business meaning. | Signal candidate or no Signal. |
| Orchestrator Decision | Choose what matters most and what should happen under business rules. | Auditable decision record. |
| Action Queue + Parameters | Create the work item with the right execution mode and data. | Queued action with parameters. |
| Execution | Perform, draft, assign, or wait for approval depending on mode. | Execution record. |
| Outcome | Record what happened after execution. | Outcome record. |
| Feedback | Capture whether the decision/action was useful, approved, completed, edited, or suppressed. | Feedback record for rules, templates, priorities, and reporting. |

# **2. System Principles and Boundaries**

## **2.1 Locked Workflow**

Event → Signal → Orchestrator Decision → Action Queue + Parameters → Execution → Outcome → Feedback

## **2.2 Layer Responsibilities**

| **Layer** | **Locked Meaning** | **Relevant Workflow Stages** |
| --- | --- | --- |
| Network Layer | Where ClearSky connects, listens, and collects activity. | Provider connections, raw input intake. |
| Intelligence Layer | Where ClearSky normalizes, interprets, detects signals, applies rules, and decides. | Event, Signal, Orchestrator Decision. |
| Execution Layer | Where ClearSky performs approved actions, tracks outcomes, and feeds results back. | Action Queue, Execution, Outcome, Feedback. |

## **2.3 Deterministic Control + AI Enrichment**

The system should be deterministic by default. Provider identification, registry lookup, event_type assignment, Network Category assignment, relationship matching, duplicate detection, handoff eligibility, Signal rule matching, Orchestrator decision rules, action selection, execution mode selection, ownership, and required parameter validation should be controlled by rules, IDs, configuration, thresholds, and database state.

AI should be used as a controlled enrichment and generation layer. It can extract meaning from unstructured human content, summarize conversations or reviews, classify intent, sentiment, urgency, service requested, timeline, or complaint topic, and draft content where an approved Action permits it. AI should not guess provider mappings, official event types, Network Categories, duplicate status, handoff eligibility, or final Orchestrator decisions.

| **System Area** | **Deterministic** | **AI-Assisted** |
| --- | --- | --- |
| Provider/source identification | Yes | No |
| Provider Event Registry lookup | Yes | No |
| event_type / Network Category assignment | Yes | No |
| Relationship matching | Yes by default | May suggest, but not final authority |
| Duplicate detection | Yes | No |
| Signal rule evaluation | Yes | AI fields may be inputs if confidence passes |
| Orchestrator decision | Yes | No free-form decision making |
| Content drafting | Rule-selected action | Yes, if action allows generation |
| Feedback pattern analysis | Rules and analytics | Can support recommendations later |

# **3. Event**

## **3.1 Purpose**

The Event stage converts raw provider/source activity into a trusted ClearSky Event Object. An Event answers: what happened, where did it come from, who or what is it connected to, and is it clean enough to be evaluated later?

The Event is not a Signal, not an ACT, not an Outcome, not Feedback, not raw provider data, and not AI judgment.

## **3.2 Provider / Source Groups**

| **#** | **Provider / Source Group** |
| --- | --- |
| 1 | ClearSky Website / Forms |
| 2 | Telnyx Voice |
| 3 | Telnyx SMS / A2P Messaging |
| 4 | Email Provider / Communication Hub |
| 5 | Google Business Profile |
| 6 | DataForSEO / SEO Data Provider |
| 7 | Website Analytics / Matomo |
| 8 | ClearSky ViewRoom |
| 9 | ClearSky Visualizer / FotoJobber |
| 10 | Quote / Proposal System |
| 11 | Booking / Calendar System |
| 12 | CRM / Job Management System |
| 13 | Social Media Providers |
| 14 | Competitor / Cohort Intelligence |
| 15 | ContentRadar / Demand Intelligence |
| 16 | System / Platform Health |

## **3.3 Event Intake Pipeline**

- Raw input arrives from provider/source.

- Provider/source is identified deterministically.

- Provider event name is read exactly as received.

- Provider Event Registry is checked.

- ClearSky event_type and Network Category are assigned from registry.

- Event draft is created.

- Structured fields are normalized.

- Relationships are matched to business, customer, lead, thread, quote, appointment, campaign, or market where applicable.

- Duplicate detection runs.

- AI extraction runs only if configured and content is unstructured.

- raw_payload and normalized_payload are stored.

- processing_status and flags are set.

- handoff_eligible is determined.

## **3.4 Event Object Field Groups**

| **Field Group** | **Representative Fields** |
| --- | --- |
| Identity | event_id, trace_id, provider_event_id, registry_version |
| Provider | provider, provider_event_name, source_channel |
| ClearSky Classification | event_type, network_category |
| Timing | occurred_at, received_at, created_at |
| Relationships | business_id, customer_id, lead_id, thread_id, quote_id, appointment_id, campaign_id, market_id |
| Normalized Fields | clean phone, clean email, keyword, status, source, rating, quote status |
| AI Context | intent, service_requested, problem_type, urgency_level, timeline, sentiment, summary, confidence_score |
| Payloads | raw_payload, normalized_payload |
| Flags | requires_ai_extraction, ai_extraction_completed, is_duplicate, handoff_eligible, match flags |
| Audit / Debug | processing_status, normalization_error, registry_version, retry_count |

## **3.5 Handoff Eligibility**

handoff_eligible = true means the Event is clean enough for later Signal evaluation. It does not mean a Signal has fired, an action has been approved, or a response should be sent.

| **Eligible Event Usually Has** | **Blocked Event May Have** |
| --- | --- |
| Known provider | Unknown provider or source |
| Known provider_event mapping | Failed Provider Event Registry lookup |
| Valid ClearSky event_type | Missing or invalid event_type |
| One official Network Category | No category assigned |
| Business matched where required | Business cannot be matched |
| Required fields normalized | Required fields missing |
| Duplicate check passed | Duplicate webhook retry |

# **4. Signal**

## **4.1 Purpose**

The Signal stage evaluates a known, handoff-eligible Event against configured rules to determine whether the Event has business meaning. The Event says what happened. The Signal asks whether what happened matters.

## **4.2 Signal Buckets**

| **Signal Bucket** | **Meaning** |
| --- | --- |
| Opportunity | Potential revenue, engagement, demand, content, or growth upside. |
| Risk | Potential revenue loss, customer loss, trust damage, missed opportunity, or escalation need. |
| Bottleneck | A delay, friction point, process weakness, or customer journey blockage. |
| Performance | A measurable change in marketing, operational, reputation, or conversion performance. |
| Competitive | Competitor movement, market displacement, ranking pressure, or benchmark gap. |
| Momentum | Repeated positive movement, increased engagement, demand acceleration, or buying intent. |

## **4.3 Event vs Signal Classification**

| **Concept** | **Assigned In** | **Answers** |
| --- | --- | --- |
| Network Category | Event stage | Where in the customer journey did the activity happen? |
| Signal Bucket | Signal stage | What business meaning does the activity suggest? |

## **4.4 Signal Evaluation Flow**

| Known Event Object   → Confirm handoff_eligible = true   → Identify event_type and Network Category   → Load Signal rules configured for this event_type/business context   → Evaluate rule conditions       → No match: log evaluation, no Signal       → Match: create Signal candidate   → Validate required fields, confidence, cooldown, suppression, permissions   → Valid Signal moves to Orchestrator |
| --- |

## **4.5 Example Signal Rule Object**

| {   "signal_rule_id": "SIG-REV-004",   "signal_name": "communication_experience_issue_detected",   "event_type": "review_received",   "provider": "google_business_profile",   "network_category": "Trust",   "signal_bucket": "Bottleneck",   "active": true,   "conditions": {     "ai_context.complaint_topics": {       "operator": "contains_any",       "value": ["communication", "slow response", "poor follow-up"]     },     "ai_context.confidence_score": {       "operator": ">=",       "value": 0.8     }   },   "required_fields": [     "business_id",     "review_text",     "ai_context.complaint_topics"   ],   "cooldown_hours": 72,   "default_priority": 2 } |
| --- |

# **5. Orchestrator Decision**

## **5.1 Purpose**

The Orchestrator receives valid Signal candidates and decides which Signal matters most, whether action is allowed, which action should be selected, what execution mode applies, who owns it, and what parameters must be attached. The Orchestrator should remain rules-based and auditable.

## **5.2 Decision Process**

- Receive valid Signal candidates.

- Check safety, compliance, consent, channel, and public-facing action rules.

- Check business-specific configuration.

- Rank Signals by priority, confidence, revenue impact, urgency, and bucket rules.

- Identify dominant Signal where multiple Signals came from one Event or cluster.

- Suppress, group, or preserve related Signals as context.

- Map Signal to allowed Action IDs.

- Select action or actions based on business settings and decision rules.

- Choose execution mode: automatic, approval_required, manual, blocked, or observe_only.

- Attach required parameters.

- Create auditable Orchestrator Decision record.

- Send selected action to Action Queue.

## **5.3 Known Values Required**

For the Orchestrator to be rules-based, all decision inputs must be known, structured, and identifiable. Missing required values should block automation or route to manual review.

| **Configuration Domain** | **Examples** |
| --- | --- |
| Signal Configuration | signal_id, signal_name, bucket, active flag, priority, required_fields, confidence threshold, cooldown. |
| Business Configuration | automation level, review reply policy, public response approval, SLA, office hours, brand tone. |
| Action Configuration | Action Library, allowed execution modes, required parameters, owner defaults. |
| Safety / Compliance | public reply approvals, sensitive topics, low-confidence handling, consent rules. |
| Suppression / Cooldown | avoid duplicate tasks, group Signals from same Event, block noisy repeats. |
| Ownership | system, employee, business owner, consultant, support, technical team. |

## **5.4 Orchestrator Rule Example**

| IF   signal_name = communication_experience_issue_detected AND  signal_bucket = Bottleneck AND  confidence_score >= 0.80 AND  business.review_reply_policy = draft_only AND  public_response_requires_approval = true AND  cooldown_active = false THEN selected_action  = ACT-REV-001 AND  execution_mode   = approval_required AND  owner            = employee_or_business_owner |
| --- |

# **6. Action Queue + Parameters**

## **6.1 Purpose**

The Action Queue converts an Orchestrator Decision into an executable or reviewable work item. It stores the selected Action ID, execution mode, owner, priority, status, source IDs, and all required parameters.

## **6.2 Action Library**

ACTION IDs should be created in a controlled Action Library. Each Action ID represents a reusable capability, not a one-off instruction. Parameters make the action specific.

| **Action ID** | **Action Name** | **Plain Meaning** |
| --- | --- | --- |
| ACT-REV-001 | create_review_reply_draft | Draft a reply to a review. |
| ACT-REV-002 | post_review_reply | Post an approved review reply. |
| ACT-REV-003 | create_negative_review_escalation_task | Escalate a negative review. |
| ACT-REV-004 | log_review_complaint_theme | Record complaint theme for pattern tracking. |
| ACT-REV-005 | mark_testimonial_candidate | Mark review as possible testimonial. |
| ACT-COM-001 | send_follow_up_message | Send SMS/email follow-up. |
| ACT-COM-002 | notify_owner | Notify business owner or assigned employee. |
| ACT-TASK-001 | create_internal_task | Create internal task. |
| ACT-QUOTE-001 | prepare_quote_reminder | Prepare quote follow-up reminder. |
| ACT-SYS-001 | create_admin_review_task | Route issue to admin/support review. |

## **6.3 Signal-to-Action Mapping**

Signals do not directly execute actions. Each Signal maps to one or more allowed or recommended Action IDs. The Orchestrator chooses the final action based on rules, safety, priority, execution mode, ownership, cooldowns, and parameters.

| **Signal ID** | **Signal Name** | **Bucket** | **Primary Action** | **Secondary Actions** |
| --- | --- | --- | --- | --- |
| SIG-REV-001 | positive_review_received | Momentum | ACT-REV-001 | ACT-REV-007 report note |
| SIG-REV-002 | negative_review_risk | Risk | ACT-REV-003 | ACT-REV-001, ACT-REV-008 |
| SIG-REV-003 | positive_review_with_minor_issue | Opportunity | ACT-REV-001 | ACT-REV-004 |
| SIG-REV-004 | communication_experience_issue_detected | Bottleneck | ACT-REV-001 | ACT-REV-004, ACT-REV-010 |
| SIG-COM-001 | missed_opportunity_detected | Risk | ACT-COM-002 | ACT-COM-001, ACT-TASK-001 |
| SIG-QUOTE-001 | quote_reengagement_opportunity | Opportunity | ACT-QUOTE-001 | ACT-COM-001 |

## **6.4 Queue Record Example**

| {   "action_queue_id": "aq_3001",   "business_id": "biz_apex_001",   "source_event_id": "evt_7001",   "source_decision_id": "dec_9001",   "action_id": "ACT-REV-001",   "action_type": "create_review_reply_draft",   "execution_mode": "approval_required",   "priority": 2,   "status": "pending_approval",   "assigned_to": "employee_or_business_owner",   "parameters": {     "review_id": "gbp_review_88421",     "review_rating": 4,     "service_mentioned": "roof repair",     "praise_topics": ["professional crew", "good job quality"],     "complaint_topics": ["slow communication before appointment"],     "tone": "professional, appreciative, accountable"   } } |
| --- |

# **7. Execution**

## **7.1 Purpose**

Execution performs the queued action or prepares it for human review depending on the execution mode. Execution is not the same as the Orchestrator Decision. The Orchestrator decides; Execution performs or prepares.

## **7.2 Execution Modes**

| **Mode** | **Meaning** | **Example** |
| --- | --- | --- |
| automatic | System executes without human approval. | Log review complaint theme, update report note, send allowed confirmation. |
| approval_required | System drafts/prepares; human approves before external action. | Draft Google review reply. |
| manual | Human must perform directly. | Legal/sensitive issue escalation. |
| blocked | Action cannot proceed. | Missing required policy or unsafe action. |
| observe_only | Record insight, no task or external action. | Low-priority momentum signal. |

## **7.3 Execution Record Example**

| {   "action_execution_id": "exec_5001",   "action_queue_id": "aq_3001",   "execution_status": "draft_created",   "execution_mode": "approval_required",   "generated_output": {     "review_reply_draft": "Thank you for the thoughtful review. We are glad       the roof repair went well and appreciate the feedback about       communication before the appointment."   },   "posted_to_google": false,   "requires_human_approval": true } |
| --- |

# **8. Outcome**

## **8.1 Purpose**

Outcome records what happened after execution. It closes the action loop and gives ClearSky a measurable record of completion, delay, rejection, approval, edit, posting, booking, revenue movement, or unresolved status.

| **Outcome Type** | **Meaning** |
| --- | --- |
| draft_created | System successfully created a draft. |
| approved | Human approved prepared action. |
| edited_before_approval | Human edited generated output before approval. |
| posted | External platform post/reply/message was completed. |
| sent | SMS/email/message was sent. |
| assigned | Task assigned to an employee or owner. |
| completed | Task completed. |
| rejected | Human rejected or cancelled action. |
| failed | Execution failed due to API, validation, or policy issue. |
| no_action_taken | Signal acknowledged, no execution occurred. |

## **8.2 Outcome Record Example**

| {   "outcome_id": "out_6001",   "source_event_id": "evt_7001",   "source_decision_id": "dec_9001",   "action_queue_id": "aq_3001",   "execution_id": "exec_5001",   "outcome_type": "review_reply_posted",   "outcome_status": "completed",   "posted_to_google": true,   "time_to_response_hours": 3.5,   "human_edited": true } |
| --- |

# **9. Feedback**

## **9.1 Purpose**

Feedback captures whether the system made a useful decision. It can improve Signal priorities, suppression logic, action mappings, templates, approval policies, dashboards, and reporting. Feedback does not have to mean model training; it can be rule tuning, analytics, reporting, and template refinement.

| **Feedback Question** | **Reason** |
| --- | --- |
| Was the Signal valid? | Tests whether the rule correctly identified business meaning. |
| Was the dominant Signal right? | Improves Orchestrator ranking and grouping. |
| Was the action appropriate? | Validates Signal-to-Action mapping. |
| Was approval needed? | Improves execution mode settings. |
| Was AI output edited? | Improves templates and prompt parameters. |
| Was action completed quickly? | Measures operational performance. |
| Did outcome improve? | Supports reporting and ROI. |
| Did similar issues repeat? | Detects unresolved bottlenecks. |

## **9.2 Feedback Record Example**

| {   "feedback_id": "fb_8001",   "source_event_id": "evt_7001",   "source_signal": "communication_experience_issue_detected",   "decision_id": "dec_9001",   "action_id": "ACT-REV-001",   "signal_validated": true,   "action_approved": true,   "human_edited_output": true,   "action_completed": true,   "time_to_completion_hours": 3.5,   "notes": "Business owner approved recommendation but softened wording before posting." } |
| --- |

# **10. End-to-End Example: Google Business Profile Review**

## **10.1 Scenario**

A Google Business Profile review arrives with a 4-star rating and this comment: “Great work on our roof repair. The crew was professional and the job looks good. Only reason I am giving 4 stars is because communication before the appointment was a little slow.”

## **10.2 Event Stage**

| **Step** | **Result** |
| --- | --- |
| Provider identified | google_business_profile |
| Provider event | review.created |
| Registry mapping | review_received |
| Network Category | Trust |
| Business match | GBP location_id → business_id |
| Duplicate check | review_id not seen before |
| AI extraction | sentiment, praise_topics, complaint_topics, service_mentioned, summary |
| Handoff | handoff_eligible = true |

## **10.3 Signal Stage**

| **Signal** | **Bucket** | **Reason** |
| --- | --- | --- |
| positive_review_received | Momentum | Rating is 4 stars. |
| positive_review_with_minor_issue | Opportunity | Positive review includes complaint topic. |
| communication_experience_issue_detected | Bottleneck | Review mentions slow communication before appointment. |
| service_quality_praise_detected | Momentum | Review praises work and crew. |
| service_proof_point_detected | Opportunity | Review supports roof repair credibility. |

## **10.4 Orchestrator Decision**

The Orchestrator groups the review-related Signals, suppresses duplicate/noisy actions, selects communication_experience_issue_detected as the dominant Signal, and chooses ACT-REV-001 create_review_reply_draft as the primary action with approval_required execution mode. It may also select ACT-REV-004 log_review_complaint_theme as an automatic secondary action.

## **10.5 Action, Execution, Outcome, Feedback**

| **Workflow Stage** | **Example Result** |
| --- | --- |
| Action Queue + Parameters | ACT-REV-001 queued with rating, review text, praise topics, complaint topics, tone, review_id, business_id. |
| Execution | Review reply draft created and routed for approval. |
| Outcome | Reply approved, optionally edited, and posted to Google Business Profile. |
| Feedback | System records Signal validity, approval/edit status, completion time, and whether communication complaints repeat. |

# **11. Recommended Data Model**

The following tables are recommended as a starting schema for a PostgreSQL implementation. Additional indexes, partitioning, and integration-specific tables can be added as implementation requirements become clearer.

| **Table** | **Purpose** |
| --- | --- |
| provider_event_registry | Maps provider + provider_event_name to ClearSky event_type, Network Category, required fields, AI extraction flags, and registry version. |
| raw_inputs | Optional staging/audit table for unmodified provider payloads. |
| events | Stores official Event Objects and handoff status. |
| event_processing_logs | Records status changes, errors, retries, and debug trace. |
| event_duplicates | Tracks duplicate detection decisions and idempotency keys. |
| ai_extraction_results | Stores AI-enriched context linked to events. |
| signal_rules | Defines configured Signal rules by event_type, conditions, buckets, thresholds, active status. |
| signal_events | Stores generated Signal candidates and validation status. |
| orchestrator_rules | Defines decision logic, priority, suppression, safety, action selection, and execution mode logic. |
| orchestrator_decisions | Stores auditable decisions and dominant/supporting Signals. |
| action_library | Controlled catalog of Action IDs and required parameters. |
| signal_action_mappings | Maps Signals to allowed/recommended Action IDs. |
| action_queue | Stores queued actions, execution mode, ownership, priority, parameters, and state. |
| action_executions | Stores execution attempts, outputs, errors, approvals, and external IDs. |
| outcomes | Stores final or interim results after execution. |
| feedback | Stores learning, validation, edits, approvals, performance notes, and rule-tuning evidence. |
| business_configurations | Stores business-specific automation policies, SLA, tone, permissions, approval requirements. |
| safety_compliance_rules | Stores global/channel-specific safety, compliance, consent, and approval rules. |

# **12. Recommended API Surface**

| **Endpoint** | **Method** | **Purpose** |
| --- | --- | --- |
| /webhooks/{provider} | POST | Receive raw provider events. |
| /events | POST | Create Event from validated raw input, mainly internal. |
| /events/{event_id} | GET | Read Event Object and processing status. |
| /events/{event_id}/reprocess | POST | Re-run normalization/AI extraction/eligibility where safe. |
| /signals/evaluate | POST | Evaluate a handoff-eligible Event against configured Signal rules. |
| /signals/{signal_id} | GET | Read Signal candidate and validation output. |
| /orchestrator/decide | POST | Run Orchestrator decision against valid Signals. |
| /actions/queue | POST | Create queued action from Orchestrator Decision. |
| /actions/{action_queue_id}/approve | POST | Approve prepared action. |
| /actions/{action_queue_id}/reject | POST | Reject or cancel queued action. |
| /executions/{execution_id} | GET | Read execution status and generated outputs. |
| /outcomes | POST | Record outcome for an execution. |
| /feedback | POST | Record validation, edits, approvals, or tuning notes. |

# **13. Developer Acceptance Criteria**

## **13.1 Event**

- Every provider input receives a trace_id and immutable raw_payload.

- Provider/source and provider_event_name are identified deterministically.

- Unknown providers or provider events are stored but blocked from handoff.

- Each eligible Event has event_type, Network Category, business_id where required, duplicate status, processing_status, and handoff_eligible flag.

- AI extraction failures do not erase the Event and are reflected in status/flags.

## **13.2 Signal**

- Only handoff_eligible Events are evaluated.

- Signal rules are selected by event_type, Network Category, business configuration, and relationship context.

- Signals only fire when configured conditions are met.

- AI-extracted fields are used only when confidence thresholds and required fields pass.

- No rule match results in logged evaluation and no Signal creation.

## **13.3 Orchestrator**

- The Orchestrator evaluates only valid Signal candidates.

- All decision inputs are known, structured, and identifiable.

- Missing required configuration routes to blocked or manual_review_required, not automatic action.

- Dominant Signal, supporting Signals, selected action, execution mode, owner, priority, and reason are stored.

- Suppression and cooldown rules prevent noisy duplicate actions.

## **13.4 Action Queue, Execution, Outcome, Feedback**

- Every queued action uses an Action ID from the Action Library.

- Required parameters are validated before execution begins.

- Public-facing generated actions default to approval_required unless business configuration allows otherwise.

- Execution records generated output, API attempts, approval state, and external platform result IDs where available.

- Outcome and Feedback records link back to source_event_id, source_signal_id/decision_id, action_queue_id, and execution_id.

# **14. External Files and Supporting Artifacts**

The following supporting artifacts should be included in the project folder alongside this technical specification. They are not embedded as attachments in this DOCX; they should be stored as separate source files so developers can open, query, and maintain them directly.

| **Artifact** | **Recommended Use** |
| --- | --- |
| ClearSky_Event_Sections_1_2_Handoff_for_Section_3.docx | Locked Event mental model, Raw Input vs Event distinction, Provider Event Registry concepts, Event Object fields, handoff eligibility, and Section 3 starter prompt. |
| clearsky_contractor_thread_summary.docx | Contractor/trades platform positioning, Discovery/Engagement/Conversion/Growth framing, GBP role, feature inventory, and design decisions. |
| contractor_marketing_automation_summary.docx | Intent detection, anonymous tracking, identity stitching, AI-assisted personalization, and closed-loop automation model. |
| clearsky-gbp-signals-2-5-spec.docx | GBP review count and owner response rate scoring updates, recency/velocity logic, DataForSEO review data source, and test checklist. |
| CLEARSKY MODEL SUMMARY - DEMAND + GBP SCORING WORKING NOTES.docx | Demand model, review timeline/velocity discussion, keyword universe workflow, and broader GBP scoring context. |
| Signal / Parameter / Action workbooks produced in earlier sessions | Should be attached as controlled spreadsheets for Signal dictionaries, Action Library, Signal-to-Action mappings, and parameter definitions. |
| Orchestrator developer spec / schema documents produced earlier | Should be attached for database schema, API endpoints, ERD/PNG renders, and implementation scenarios. |

## **14.1 Recommended Folder Structure**

| /clearsky-ai-decision-system/   00-readme/   01-event/   02-signal/   03-orchestrator/   04-action-library/   05-execution-outcome-feedback/   06-schemas-and-api/   07-examples/   08-supporting-artifacts/       ClearSky_Event_Sections_1_2_Handoff_for_Section_3.docx       clearsky_contractor_thread_summary.docx       contractor_marketing_automation_summary.docx       clearsky-gbp-signals-2-5-spec.docx       CLEARSKY_MODEL_SUMMARY_DEMAND_GBP_SCORING_WORKING_NOTES.docx       signal_action_parameter_workbooks/       orchestrator_schema_specs/ |
| --- |

*— End of document —*

Confidential working specification · Prepared for developer handoff