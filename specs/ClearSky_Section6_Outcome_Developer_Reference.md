| **ClearSky AI Decision System  ·  Section 6: Outcome  ·  Developer Reference** | Session 4  ·  Build Target |
| --- | --- |

ClearSky AI Decision System

**Section 6: Outcome**

**Full Developer Reference + Roadmap**

*Session 4 Build Target  ·  Sections 1–5 Complete and Verified  ·  Pseudocode + SQL + Roadmap*

| **Field** | **Value** |
| --- | --- |
| Completed Sections | 1 Event Intake  ·  2 Signal Detection  ·  3 Orchestrator Decision  ·  4 Action Queue + Parameters  ·  5 Execution |
| Build Target | Section 6: Outcome |
| Working Example | APEX Contracting — 1-star emergency review from Margaret T. — leaking roof, 5 unanswered calls |
| Section 6 Input | exec_out package from Section 5  ·  handoff_status = ready_for_outcome |
| Section 6 Output | out_pkg  ·  handoff_status = ready_for_feedback |
| Key New File | src/lib/server/section-6-outcome.ts |
| DB Table Written | outcomes (in 001_initial_schema.sql — already exists) |
| New Migration Needed | 005_outcome_prisma.sql — adds Prisma-compatible outcome fields |
| Stack | TypeScript · SvelteKit · Prisma · PostgreSQL · OpenAI |

# **1. Pipeline Status Entering Section 6**

| **Section** | **Status** | **Verified Output** |
| --- | --- | --- |
| Section 1 — Event Intake | ✅ Complete | Event stored · handoff_eligible = true · AI extraction complete |
| Section 2 — Signal Detection | ✅ Complete | SIG-TRUST-001 (negative_review_risk) dominant · SIG-TRUST-008 suppressed |
| Section 3 — Orchestrator Decision | ✅ Complete | dec_7e9c81e46d · ACT-REV-001 + ACT-REV-004 selected · ACT-REV-002 blocked |
| Section 4 — Action Queue + Parameters | ✅ Complete | Two queue records created · parameters resolved · handoff_status = ready_for_execution |
| Section 5 — Execution | ✅ Complete & DB-Verified | exec_49dd96a471 (draft_created) · exec_b8326526d5 (completed) · 3 complaint theme rows · approval_pkg created |
| Section 6 — Outcome | 🔨 BUILD TARGET | outcomes table · linked to execution + queue + event + decision |
| Section 7 — Feedback | Design locked, not yet built | — |

## **1.1  Section 5 Records That Section 6 Receives**

| **Record** | **execution_status** | **What Section 6 Must Do** |
| --- | --- | --- |
| exec_49dd96a471 · ACT-REV-001 | draft_created | Create Outcome record · type = draft_created · status = waiting_for_approval |
| exec_b8326526d5 · ACT-REV-004 | automatic_internal_action_completed | Create Outcome record · type = completed · status = completed |
| ACT-REV-002 (blocked, NOT in action_executions) | blocked audit-only | Preserve as blocked_ctx — no outcomes table row — audit context only |

# **2. What Section 6 Does — and Does Not Do**

| **Section 6 DOES** | **Section 6 DOES NOT** |
| --- | --- |
| Receive the Section 5 exec_out package | Re-run Event Intake, Signal Detection, Orchestrator, Action Queue, or Execution |
| Confirm outcome entry eligibility per execution record | Create new execution records or queue records |
| Load outcome type definitions and execution-to-outcome mappings | Post any reply to Google Business Profile or any external platform |
| Create outcome records in the outcomes table | Approve or reject the draft — that is a human action via the API |
| Record the draft_created outcome for ACT-REV-001 | Send any message to any customer |
| Record the completed outcome for ACT-REV-004 | Re-execute any Action |
| Preserve ACT-REV-002 blocked context for audit | Modify or recreate any upstream record |
| Calculate time_to_response_hours and approval_wait_hours | Perform Feedback learning — Feedback belongs to Section 7 |
| Link outcome IDs back to execution records and queue records | Record Feedback — that belongs to Section 7 |
| Validate traceability — every outcome links to event + decision + queue + execution | Change waiting_for_approval to completed — the human has not acted yet |
| Prepare out_pkg with handoff_status = ready_for_feedback | Set posted_externally = true — Section 6 never posts |

# **3. Database — outcomes Table**

The outcomes table is already defined in 001_initial_schema.sql. The Prisma model does NOT yet exist in schema.prisma. The migration file 005_outcome_prisma.sql (provided separately with this document) adds the Prisma-compatible model. Add this migration before writing any Section 6 code.

| **Field** | **Type** | **APEX Value — exec_49dd96a471** | **APEX Value — exec_b8326526d5** |
| --- | --- | --- | --- |
| outcome_id | TEXT UNIQUE | out_6001 (generated) | out_6002 (generated) |
| event_id | TEXT FK → events | evt_7001 | evt_7001 |
| decision_id | TEXT FK → orchestrator_decisions | dec_7e9c81e46d | dec_7e9c81e46d |
| action_queue_id | TEXT FK → action_queue | aq_3001 | aq_3002 |
| execution_id | TEXT FK → action_executions (action_execution_id) | exec_49dd96a471 | exec_b8326526d5 |
| outcome_type | TEXT | draft_created | completed |
| outcome_status | TEXT | waiting_for_approval | completed |
| time_to_response_hours | FLOAT | event created_at → exec created_at | event created_at → exec created_at |
| approval_wait_hours | FLOAT | exec created_at → NOW() (still waiting) | NULL — no approval required |
| human_edited | BOOLEAN | FALSE | FALSE |
| posted_externally | BOOLEAN | FALSE — Section 6 never posts | FALSE — Section 6 never posts |
| do_not_count_as_success | BOOLEAN | FALSE | FALSE |
| details | JSONB | Structured detail object | Structured detail object |

| **✕ DO NOT  Prisma Model Required Before Writing Code** The outcomes table exists in PostgreSQL but has no Prisma model yet. Run the 005_outcome_prisma.sql migration and add the Outcome model to schema.prisma before writing section-6-outcome.ts. Section 6 cannot run without it. |
| --- |

## **3.1  Outcome Type Reference**

| **outcome_type** | **outcome_status** | **do_not_count_as_success** | **When Used** |
| --- | --- | --- | --- |
| draft_created | waiting_for_approval | FALSE | AI draft generated and parked. Human has not acted yet. |
| completed | completed | FALSE | Automatic internal action finished successfully. |
| approved | completed | FALSE | Business owner approved the draft. Future — post-Section 5. |
| edited_before_approval | completed | FALSE | Draft was edited before approval. Future. |
| posted | completed | FALSE | Approved reply posted externally. Future. |
| rejected | completed | FALSE | Business owner rejected the draft. Future. |
| failed | failed | TRUE | Execution failed and was not recovered. |
| blocked_preserved | blocked | TRUE | Action blocked by policy. Preserved for audit. ACT-REV-002. |
| no_action_taken | completed | FALSE | observe_only or no eligible records. |

# **4. All 12 Steps — Full Detail**

| **STEP 1** | **Receive Execution Output from Section 5** |
| --- | --- |

### **Purpose**

Receive the Section 5 exec_out package. Confirm handoff_status = ready_for_outcome. Confirm Outcome has not already started for this event. Open the outcome intake record.

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION receiveExecutionOutput(exec_out_package, event_id): |
| CONFIRM exec_out_package.section_5_status = 'completed' |
| CONFIRM exec_out_package.handoff_status = 'ready_for_outcome' |
| CONFIRM exec_out_package.execution_records is not empty |
| CONFIRM exec_out_package.boundary_flags.outcome_recorded = false |
| CONFIRM exec_out_package.boundary_flags.feedback_recorded = false |
|  |
| // Duplicate guard — no outcome records should exist yet |
| FOR EACH exec_record IN exec_out_package.execution_records DO |
| existing ← DB.query(SELECT id FROM outcomes WHERE execution_id = exec_record.execution_id) |
| IF existing is not empty THEN |
| RAISE fatal_error('duplicate_outcome_prevented') |
| END IF |
| END FOR |
|  |
| LOG 'outcome_intake_opened. ' + count(execution_records) + ' records received.' |
| RETURN { safe_to_continue: true, blocked_audit_only: exec_out_package.blocked_audit_only } |
| END FUNCTION |
|  |

### **Expected State**

| **JSON** |
| --- |
| { "section_5_status": "completed", "handoff_status": "ready_for_outcome", |
| "execution_records_present": true, "outcome_recorded": false, |
| "feedback_recorded": false, "safe_to_continue_to_step_2": true } |
|  |

| **STEP 2** | **Confirm Outcome Entry Eligibility** |
| --- | --- |

### **Purpose**

Validate each execution record before creating any outcome record. Records that fail eligibility do not get an outcome record.

### **Eligibility Checklist**

| **Check** | **Pass Condition** | **Fail Action** |
| --- | --- | --- |
| execution_id present | Not null · exists in action_executions | Skip record · log warning |
| execution_status is recordable | draft_created · automatic_internal_action_completed · failed · pending_manual_assignment | Skip · log warning |
| action_queue_id present | Not null · traceable to action_queue | Skip · log error |
| event_id present | Not null · traceable to events | Skip · log error |
| decision_id present | Not null · traceable to orchestrator_decisions | Skip · log error |
| No duplicate outcome | No outcomes row for this execution_id | Skip · do not duplicate |
| ACT-REV-002 excluded | action_id != ACT-REV-002 | Treat as blocked_ctx — no outcomes row |

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION confirmEligibility(execution_records, blocked_audit_only): |
| RECORDABLE_STATUSES ← ['draft_created', 'automatic_internal_action_completed', |
| 'failed', 'pending_manual_assignment'] |
| eligible ← [] |
| ineligible ← [] |
|  |
| FOR EACH rec IN execution_records DO |
| reasons ← [] |
| IF rec.action_id = 'ACT-REV-002' THEN reasons.append('blocked_action') |
| IF rec.execution_id is null THEN reasons.append('missing_execution_id') |
| IF rec.execution_status NOT IN RECORDABLE_STATUSES THEN reasons.append('non_recordable_status') |
| IF rec.action_queue_id is null THEN reasons.append('missing_queue_id') |
| IF reasons is empty THEN eligible.append(rec) |
| ELSE ineligible.append({ rec, reasons }) |
| END FOR |
|  |
| IF eligible is empty THEN RETURN error('no_eligible_records') |
| RETURN { eligible, ineligible, blocked_audit_only } |
| END FUNCTION |
|  |

| **STEP 3** | **Load Outcome Types, Status Rules, and Result Mapping** |
| --- | --- |

### **Purpose**

Build the frozen rules snapshot that maps execution statuses to outcome types and statuses. No DB writes happen in this step.

### **Execution → Outcome Mapping**

| **execution_status** | **outcome_type** | **outcome_status** | **do_not_count_as_success** |
| --- | --- | --- | --- |
| draft_created | draft_created | waiting_for_approval | FALSE |
| automatic_internal_action_completed | completed | completed | FALSE |
| failed_permanently | failed | failed | TRUE |
| pending_manual_assignment | assigned | waiting | FALSE |
| blocked (audit only) | blocked_preserved | blocked | TRUE |

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION loadOutcomeRules(): |
| RETURN { |
| snapshot_id: 'out_rules_snap_' + generate_id(), |
| execution_to_outcome_map: { |
| 'draft_created':                       { type: 'draft_created',   status: 'waiting_for_approval', do_not_count: false }, |
| 'automatic_internal_action_completed': { type: 'completed',       status: 'completed',            do_not_count: false }, |
| 'failed_permanently':                  { type: 'failed',          status: 'failed',               do_not_count: true  }, |
| 'pending_manual_assignment':           { type: 'assigned',        status: 'waiting',              do_not_count: false }, |
| }, |
| blocked_outcome_type:   'blocked_preserved', |
| blocked_outcome_status: 'blocked', |
| } |
| END FUNCTION |
|  |

| **STEP 4** | **Create Outcome Record(s)** |
| --- | --- |

### **Purpose**

Create one outcome record per eligible execution record inside a single database transaction. Both records must succeed or both must rollback.

| **✕ DO NOT  Transaction Rule** All outcome INSERTs must be wrapped in a single transaction. If either fails, rollback both. Never leave partial outcome records in the database. |
| --- |

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION createOutcomeRecords(eligible_records, exec_out, rules_snapshot): |
| created ← [] |
|  |
| BEGIN TRANSACTION |
| FOR EACH rec IN eligible_records DO |
| mapping   ← rules_snapshot.execution_to_outcome_map[rec.execution_status] |
| outcome_id ← 'out_' + generate_id() |
|  |
| time_to_response ← calculate_hours(exec_out.source_event_created_at, rec.created_at) |
| approval_wait    ← IF mapping.status = 'waiting_for_approval' |
| THEN calculate_hours(rec.created_at, NOW()) |
| ELSE NULL |
|  |
| DB.insert INTO outcomes ( |
| outcome_id, |
| event_id          ← exec_out.source_event_id, |
| decision_id       ← exec_out.source_orchestrator_decision_id, |
| action_queue_id   ← rec.action_queue_id, |
| execution_id      ← rec.execution_id, |
| outcome_type      ← mapping.type, |
| outcome_status    ← mapping.status, |
| time_to_response_hours ← time_to_response, |
| approval_wait_hours    ← approval_wait, |
| posted_externally ← FALSE, |
| do_not_count_as_success ← mapping.do_not_count, |
| details           ← build_details_object(rec, mapping), |
| created_at        ← NOW() |
| ) |
| created.append({ outcome_id, ...mapping, action_id: rec.action_id }) |
| LOG outcome_id + ' created for ' + rec.execution_id |
| END FOR |
| COMMIT TRANSACTION |
|  |
| RETURN created |
| END FUNCTION |
|  |

| **STEP 5** | **Record Approval-Required Draft Outcome** |
| --- | --- |

### **Purpose**

Populate the details JSONB field for out_6001 (ACT-REV-001). This is what the cockpit and reporting layer will read to display the draft outcome to the consultant.

### **details Object for out_6001**

| **JSON** |
| --- |
| {  "outcome_type":      "draft_created", |
| "outcome_status":    "waiting_for_approval", |
| "action_id":         "ACT-REV-001", |
| "action_name":       "create_review_reply_draft", |
| "approval_required": true, |
| "approval_owner":    "consultant", |
| "approval_status":   "pending_approval", |
| "approval_package_id": "approval_pkg_f20f4f8701", |
| "draft_exists":      true, |
| "posted_to_google":  false, |
| "external_action_completed": false, |
| "ready_for_feedback_section": true  } |
|  |

| **⚑ RULE  Boundary Rule** out_6001 must have posted_externally = FALSE and do_not_count_as_success = FALSE. The draft exists. The action is not complete. This is a valid, successful outcome — it is simply waiting for a human to act. |
| --- |

| **STEP 6** | **Record Automatic Internal Action Outcome** |
| --- | --- |

### **Purpose**

Populate the details JSONB for out_6002 (ACT-REV-004). This is a completed outcome. The complaint themes are logged. No further human action is required for this record.

### **details Object for out_6002**

| **JSON** |
| --- |
| {  "outcome_type":     "completed", |
| "outcome_status":   "completed", |
| "action_id":        "ACT-REV-004", |
| "action_name":      "log_review_complaint_theme", |
| "internal_action_completed": true, |
| "complaint_themes": ["leaking roof", "lack of response", "emergency situation"], |
| "posted_externally": false, |
| "approval_required": false, |
| "ready_for_feedback_section": true  } |
|  |

| **STEP 7** | **Preserve Blocked / No-External-Action Outcome Context** |
| --- | --- |

### **Purpose**

ACT-REV-002 was blocked by policy and never entered the action_executions table. There is no execution record for it. Section 6 preserves its blocked context in the output package as audit-only — no outcomes table row is created.

| **✕ DO NOT  No DB Row for Blocked Context** Do NOT create an outcomes table row for ACT-REV-002. The blocked context lives only in the out_pkg JSON output. It is audit context, not an outcome record. |
| --- |

### **Blocked Context Object**

| **JSON** |
| --- |
| {  "blocked_context_id":  "blocked_ctx_<generated>", |
| "action_id":           "ACT-REV-002", |
| "action_name":         "post_review_reply", |
| "outcome_type":        "blocked_preserved", |
| "outcome_status":      "blocked", |
| "do_not_count_as_success": true, |
| "posted_to_google":    false, |
| "external_action_completed": false, |
| "blocked_reason": "Business policy requires human approval before posting publicly."  } |
|  |

| **STEP 8** | **Calculate Timing, Completion, and Waiting Metrics** |
| --- | --- |

### **Purpose**

Calculate and store time_to_response_hours and approval_wait_hours. Do not invent missing timestamps. If a timestamp is unavailable, record null and log the reason.

| **Metric** | **Formula** | **APEX Value** |
| --- | --- | --- |
| time_to_response_hours | (execution.created_at − event.created_at) in hours | ~0.002 hours (seconds for this test run) |
| approval_wait_hours (out_6001) | (NOW() − execution.created_at) in hours — only for waiting_for_approval | Grows as time passes — consultant has not acted yet |
| approval_wait_hours (out_6002) | NULL — automatic action, no approval required | NULL |

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION calculateTimingMetrics(outcome_record, event_created_at, exec_created_at): |
| IF event_created_at is null OR exec_created_at is null THEN |
| LOG warning: outcome_record.outcome_id + ' — timestamp missing. time_to_response = null.' |
| RETURN { time_to_response_hours: null, approval_wait_hours: null } |
| END IF |
|  |
| time_to_response ← (exec_created_at - event_created_at).total_seconds() / 3600 |
|  |
| IF outcome_record.outcome_status = 'waiting_for_approval' THEN |
| approval_wait ← (NOW() - exec_created_at).total_seconds() / 3600 |
| ELSE |
| approval_wait ← NULL |
| END IF |
|  |
| DB.update outcomes SET |
| time_to_response_hours ← time_to_response, |
| approval_wait_hours    ← approval_wait |
| WHERE outcome_id = outcome_record.outcome_id |
|  |
| RETURN { time_to_response_hours: time_to_response, approval_wait_hours: approval_wait } |
| END FUNCTION |
|  |

| **STEP 9** | **Update Related Queue, Execution, and Reporting References** |
| --- | --- |

### **Purpose**

Write the outcome_id back to the execution record so the two layers are linked in both directions. Update the action_queue status to reflect that an outcome has been recorded.

| **⚑ RULE  Do Not Recreate** Step 9 writes references only. It does not recreate execution records, queue records, or events. It adds the outcome_id link to existing rows. |
| --- |

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION updateReferences(created_outcomes): |
| FOR EACH outcome IN created_outcomes DO |
| // Link outcome_id onto the action_executions row |
| // NOTE: requires outcome_id column on action_executions — add in migration |
| DB.update action_executions SET |
| outcome_id ← outcome.outcome_id, |
| updated_at ← NOW() |
| WHERE action_execution_id = outcome.execution_id |
|  |
| // Update action_queue status |
| DB.update action_queue SET |
| status     ← 'outcome_recorded', |
| updated_at ← NOW() |
| WHERE action_queue_id = outcome.action_queue_id |
|  |
| LOG outcome.outcome_id + ' linked to ' + outcome.execution_id |
| END FOR |
| END FUNCTION |
|  |

| **STEP 10** | **Validate Outcome Completeness and Traceability** |
| --- | --- |

### **Purpose**

Confirm every outcome record traces cleanly back to its source. Confirm boundary flags. Confirm posted_externally is false on all records.

| **Validation Check** | **Expected Result** |
| --- | --- |
| outcome IDs exist in outcomes table | SELECT COUNT(*) = 2 for this event's outcomes |
| Each outcome has event_id, decision_id, action_queue_id, execution_id | All FKs resolve to real rows |
| outcome_type and outcome_status are valid values | No null or unknown values |
| posted_externally = FALSE on all outcome rows | SELECT COUNT(*) FROM outcomes WHERE posted_externally = TRUE = 0 |
| ACT-REV-002 has no outcomes table row | No row with execution_id referencing ACT-REV-002 |
| Feedback has not started | No rows in feedback table for this event_id |

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION validateOutcomes(created_outcomes, event_id): |
| FOR EACH outcome IN created_outcomes DO |
| row ← DB.query(SELECT * FROM outcomes WHERE outcome_id = outcome.outcome_id) |
| IF row is null THEN RAISE error('outcome_not_found: ' + outcome.outcome_id) |
| IF row.posted_externally = TRUE THEN RAISE error('boundary_violation_posted_externally') |
| IF row.event_id is null THEN RAISE error('missing_event_id') |
| IF row.execution_id is null THEN RAISE error('missing_execution_id') |
| END FOR |
|  |
| // Confirm ACT-REV-002 has no outcome row |
| blocked_check ← DB.query( |
| SELECT COUNT(*) FROM outcomes o |
| JOIN action_executions ae ON o.execution_id = ae.action_execution_id |
| WHERE ae.action_id = 'ACT-REV-002' AND o.event_id = event_id |
| ) |
| IF blocked_check > 0 THEN RAISE fatal_error('blocked_action_has_outcome_row') |
|  |
| LOG 'All outcome records validated. Traceability confirmed.' |
| RETURN { validation_passed: true } |
| END FUNCTION |
|  |

| **STEP 11** | **Prepare Outcome Output for Feedback** |
| --- | --- |

### **Purpose**

Build the out_pkg object that Section 7 Feedback will receive. This is the official Section 6 handoff object.

### **out_pkg — Full Output Package**

| **JSON** |
| --- |
| {  "section_6_completion_result": { |
| "section":                    "Section 6: Outcome", |
| "section_6_status":           "completed", |
| "outcome_output_package_id":  "out_pkg_<generated>", |
| "source_event_id":            "evt_7001", |
| "source_orchestrator_decision_id": "dec_7e9c81e46d", |
| "business_id":                "biz_apex_001", |
| "outcome_records": [ |
| { "outcome_id": "out_6001", "action_id": "ACT-REV-001", |
| "outcome_type": "draft_created", "outcome_status": "waiting_for_approval", |
| "posted_to_google": false, "approval_status": "pending_approval" }, |
| { "outcome_id": "out_6002", "action_id": "ACT-REV-004", |
| "outcome_type": "completed", "outcome_status": "completed", |
| "internal_action_completed": true } |
| ], |
| "blocked_no_external_action_context": [ |
| { "action_id": "ACT-REV-002", "outcome_type": "blocked_preserved", |
| "posted_to_google": false, "do_not_count_as_success": true } |
| ], |
| "boundary_flags": { |
| "outcome_records_created": true, "public_reply_posted": false, |
| "feedback_recorded": false, "feedback_learning_performed": false |
| }, |
| "handoff_status":    "ready_for_feedback", |
| "next_section":      "Section 7: Feedback", |
| "section_stop_reason": "Section 6 stops before Feedback begins." |
| } } |
|  |

| **STEP 12** | **Stop Before Feedback** |
| --- | --- |

### **Purpose**

Section 6 ends here. Confirm boundary flags. Return OutcomeResult to the runner. Do not enter Section 7.

### **Pseudocode**

| **PSEUDOCODE** |
| --- |
| FUNCTION stopBeforeFeedback(out_pkg, created_outcomes): |
| IF out_pkg.boundary_flags.public_reply_posted = TRUE THEN |
| RAISE fatal_error('boundary_violation_posted_externally') |
| END IF |
| IF out_pkg.boundary_flags.feedback_recorded = TRUE THEN |
| RAISE fatal_error('boundary_violation_feedback_in_section_6') |
| END IF |
|  |
| LOG 'Section 6 complete. outcome_records=' + count(created_outcomes) |
| LOG 'posted_externally=false on all records.' |
| LOG 'handoff_status=ready_for_feedback. Stopping before Section 7.' |
|  |
| RETURN OutcomeResult { |
| completed:             true, |
| outcome_records:       created_outcomes, |
| blocked_context:       blocked_audit_only, |
| out_pkg:               out_pkg, |
| handoff_status:        'ready_for_feedback', |
| pipeline_status:       'outcome_ready', |
| stop_reason:           null, |
| } |
| END FUNCTION |
|  |

# **5. Public Entry Point — runOutcome()**

| **PSEUDOCODE** |
| --- |
| FUNCTION runOutcome(exec_out_package, event_id, decision_id, business_id): |
| LOG 'Section 6 started. decision_id=' + decision_id |
|  |
| TRY: |
| // Step 1 |
| intake ← receiveExecutionOutput(exec_out_package, event_id) |
| IF NOT intake.safe_to_continue THEN RETURN OutcomeResult { completed: false, stop_reason: intake.error } |
|  |
| // Step 2 |
| { eligible, blocked_audit_only } ← confirmEligibility( |
| exec_out_package.execution_records, |
| exec_out_package.blocked_audit_only |
| ) |
| IF eligible is empty THEN RETURN OutcomeResult { completed: false, stop_reason: 'no_eligible_records' } |
|  |
| // Step 3 |
| rules ← loadOutcomeRules() |
|  |
| // Steps 4–6: create records with details |
| created_outcomes ← createOutcomeRecords(eligible, exec_out_package, rules) |
|  |
| // Step 7: preserve blocked context (no DB row) |
| blocked_ctx ← buildBlockedContext(blocked_audit_only) |
|  |
| // Step 8: timing metrics |
| FOR EACH outcome IN created_outcomes DO |
| calculateTimingMetrics(outcome, event_created_at, exec_created_at) |
| END FOR |
|  |
| // Step 9: update references |
| updateReferences(created_outcomes) |
|  |
| // Step 10: validate |
| validateOutcomes(created_outcomes, event_id) |
|  |
| // Step 11: build out_pkg |
| out_pkg ← buildOutcomePackage(created_outcomes, blocked_ctx, exec_out_package) |
|  |
| // Step 12: stop |
| RETURN stopBeforeFeedback(out_pkg, created_outcomes) |
|  |
| CATCH fatal_error: |
| LOG 'Section 6 fatal error: ' + error.message |
| RETURN OutcomeResult { completed: false, stop_reason: error.message, handoff_status: 'failed' } |
| END TRY |
| END FUNCTION |
|  |

# **6. Developer Roadmap — Step-by-Step Build Plan**

Follow this roadmap in order. Do not skip phases. Each phase must be verified before the next begins.

## **Phase 1 — Database and Schema (Do First)**

| **Task** | **Detail** | **Done When** |
| --- | --- | --- |
| Add Outcome model to schema.prisma | Copy the Outcome model from 005_outcome_prisma.sql into your schema.prisma. Run prisma migrate dev. | prisma studio shows the Outcome table with all fields |
| Add outcome_id column to ActionExecution model | Step 9 writes outcome_id back to action_executions. Add outcome_id String? to the ActionExecution model. | prisma studio shows outcome_id column on action_executions |
| Add outcome_recorded status to action_queue | Step 9 sets action_queue status = outcome_recorded. Confirm this status is accepted by your status validation. | No validation errors when setting outcome_recorded |
| Run 005_outcome_prisma.sql migration | Execute the SQL file provided with this document. | All tables exist · no FK errors |
| Confirm outcomes table is empty | SELECT COUNT(*) FROM outcomes = 0 | Zero rows — clean starting point |

## **Phase 2 — Build section-6-outcome.ts**

| **Task** | **Detail** | **Done When** |
| --- | --- | --- |
| Create the file | src/lib/server/section-6-outcome.ts. Follow the exact same class/log pattern as section-5-execution.ts. | File exists · TypeScript compiles |
| Define OutcomeResult interface | executed, outcome_records, blocked_context, out_pkg, handoff_status, pipeline_status, stop_reason, log | Interface defined |
| Define OutcomeLog class | Same pattern as ExecutionLog. step(status, message, description) method. | Log class works |
| Implement all 12 step functions | One function per step. Follow pseudocode in Section 4 of this document. | Each function has a clean signature and compiles |
| Implement runOutcome() entry point | Chains all 12 steps. Returns OutcomeResult. Handles fatal errors. | Function defined and compiles |

## **Phase 3 — Wire into review-pipeline.ts**

| **Task** | **Detail** | **Done When** |
| --- | --- | --- |
| Import runOutcome | import { runOutcome } from './section-6-outcome' | Import resolves |
| Call runOutcome after Section 5 | Pass exec_out from executionResult into runOutcome. Store result. | outcomeResult populated in pipeline result |
| Add OutcomeResult to pipeline return | Include outcome in the final pipeline return object. | /api/simulate returns outcome field |
| Add Step 18 log line | log('[Step 18] Outcome: completed=' + outcomeResult.completed) | Log line appears in trace |
| Handle Section 6 failure | If outcomeResult.completed = false, set pipeline_status = outcome_failed and return. | Pipeline stops cleanly on Section 6 failure |

## **Phase 4 — Test and Verify**

| **Test** | **How to Run** | **Pass Condition** |
| --- | --- | --- |
| Happy path — 1-star emergency review | POST /api/simulate with Margaret T. payload | Two outcome rows in DB · out_pkg.handoff_status = ready_for_feedback |
| Outcome records have correct types | SELECT outcome_type, outcome_status FROM outcomes ORDER BY created_at DESC LIMIT 2 | draft_created + completed · no null values |
| posted_externally = FALSE | SELECT COUNT(*) FROM outcomes WHERE posted_externally = TRUE | Must return 0 |
| ACT-REV-002 has no outcome row | SELECT COUNT(*) FROM outcomes o JOIN action_executions ae ON o.execution_id = ae.action_execution_id WHERE ae.action_id = 'ACT-REV-002' | Must return 0 |
| outcome_id linked back to execution | SELECT outcome_id FROM action_executions WHERE action_execution_id = 'exec_49dd96a471' | Returns the out_6001 ID |
| Duplicate guard | Run the same payload twice | Second run: completed = false · stop_reason = duplicate_outcome_prevented |
| Timing metrics populated | SELECT time_to_response_hours, approval_wait_hours FROM outcomes | time_to_response_hours is a float · approval_wait_hours is a float for draft_created row |
| Pipeline log shows Step 18 | Check trace output | [Step 18] Outcome: completed=true handoff=ready_for_feedback |

## **Phase 5 — DB Verification Queries (Run After Build)**

| **SQL** |
| --- |
| -- Check 1: Outcome records created with correct types |
| SELECT outcome_id, outcome_type, outcome_status, |
| posted_externally, do_not_count_as_success, time_to_response_hours |
| FROM outcomes ORDER BY created_at DESC LIMIT 5; |
| -- Expected: 2 rows · draft_created + completed · posted_externally = false |
|  |
| -- Check 2: Outcome links back to execution records |
| SELECT o.outcome_id, o.outcome_type, ae.action_execution_id, ae.execution_status |
| FROM outcomes o |
| JOIN action_executions ae ON o.execution_id = ae.action_execution_id |
| ORDER BY o.created_at DESC LIMIT 5; |
| -- Expected: each outcome joins cleanly to its execution record |
|  |
| -- Check 3: No outcome row for ACT-REV-002 |
| SELECT COUNT(*) FROM outcomes o |
| JOIN action_executions ae ON o.execution_id = ae.action_execution_id |
| WHERE ae.action_id = 'ACT-REV-002'; |
| -- Expected: 0 |
|  |
| -- Check 4: posted_externally = FALSE on all outcome rows |
| SELECT COUNT(*) FROM outcomes WHERE posted_externally = TRUE; |
| -- Expected: 0 |
|  |
| -- Check 5: outcome_id written back to action_executions |
| SELECT action_execution_id, outcome_id FROM action_executions |
| WHERE outcome_id IS NOT NULL ORDER BY updated_at DESC LIMIT 5; |
| -- Expected: 2 rows with outcome_id populated |
|  |

# **7. Common Mistakes — Do Not Make These**

| **Mistake** | **Why It Is Wrong** | **Correct Approach** |
| --- | --- | --- |
| Creating an outcomes row for ACT-REV-002 | ACT-REV-002 was never executed. It has no execution record. Outcomes must link to execution records. | Preserve ACT-REV-002 as blocked_ctx in the out_pkg only. No DB row. |
| Setting posted_externally = TRUE | Section 6 never posts. This flag is only set after human approval, outside Section 6. | Hardcode posted_externally = FALSE on every INSERT. Verify in Step 12. |
| Recording Feedback in Section 6 | Feedback belongs to Section 7. | Section 6 stops at handoff_status = ready_for_feedback. Nothing more. |
| Running Section 6 before Prisma model is added | Prisma will throw at runtime if the Outcome model is not in schema.prisma. | Add the model and run prisma migrate dev before writing any Section 6 code. |
| Not wrapping Step 4 in a transaction | Partial outcome records leave the system inconsistent. | BEGIN TRANSACTION · INSERT all records · COMMIT. Rollback on any failure. |
| Changing waiting_for_approval to completed | The human has not acted. Section 6 records what is, not what should be. | Record outcome_status = waiting_for_approval and stop. The status changes when the human acts. |
| Skipping Step 9 reference updates | Without outcome_id on action_executions, traceability is broken and the cockpit cannot link outcomes to drafts. | Always write outcome_id back to action_executions after Step 4 succeeds. |

| **Section 6: Outcome — Final Boundary** *Section 6 starts when handoff_status = ready_for_outcome and ends when handoff_status = ready_for_feedback.* It does not post. It does not approve. It does not perform Feedback learning. |
| --- |

ClearSky  ·  Section 6 Outcome Reference  ·  Confidential  ·  Page