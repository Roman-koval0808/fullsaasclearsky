ClearSky AI Decision System · Section 7: Feedback · Full Developer Documentation

**ClearSky AI Decision System**

**Section 7: Feedback — Full Developer Documentation**

 

*Session 6  ·  Build Target  ·  Sections 1–6 Complete and Verified*

Stack: TypeScript · SvelteKit · Prisma · PostgreSQL

Demo Business: APEX Contracting · Consultant: Sarah Jenkins

## **Table of Contents**

1.  Section Purpose and Boundary

2.  Pipeline Status Entering Section 7

3.  Working Example

4.  Database Schema

5.  Prisma Models

6.  Feedback Category and State Reference

7.  All 12 Steps — Full Detail

    Step 1 — Receive Outcome Output from Section 6

    Step 2 — Confirm Feedback Entry Eligibility

    Step 3 — Load Feedback Categories, Questions, and Evaluation Rules

    Step 4 — Create Feedback Records

    Step 5 — Record Signal Validity Feedback

    Step 6 — Record Orchestrator Decision Feedback

    Step 7 — Record Action and Execution Feedback

    Step 8 — Record Outcome Result Feedback

    Step 9 — Record Human Approval, Edit, Rejection, or Waiting Feedback

    Step 10 — Identify Tuning Candidates

    Step 11 — Prepare Feedback Output Package

    Step 12 — Stop After Feedback Completion

8.  Public Entry Point — runFeedback()

9.  Developer Roadmap

10. DB Verification Queries

11. Common Mistakes

# **1. Section Purpose and Boundary**

Section 7 answers one question:

***What does the system learn about what happened, and how is that learning recorded in a structured, auditable, non-destructive way?***

Section 7 begins only when Section 6 Outcome has produced its out_pkg with handoff_status = ready_for_feedback. It evaluates Signal validity, Decision quality, Action and Execution quality, Outcome result, and human review state. It identifies tuning candidates. It packages everything for dashboards and future optimization. Then it stops.

### **What Section 7 DOES and DOES NOT DO**

| **Section 7 DOES** | **Section 7 DOES NOT DO** |
| --- | --- |
| Receive the Section 6 out_pkg and confirm handoff_status = ready_for_feedback | Re-run any upstream section (1–6) |
| Confirm Feedback entry eligibility per Outcome record before any DB write | Approve, edit, reject, or post the review reply draft |
| Load frozen Feedback categories, evaluation questions, and rules snapshot | Set posted_externally = true (only a human approval event can do this) |
| Create feedback_records rows in a single DB transaction | Change waiting_for_approval to completed without a real human action |
| Write feedback_id back to outcomes for bi-directional linking | Perform uncontrolled AI model training |
| Record Signal validity, Decision quality, Action/Execution, and Outcome evaluations per record | Automatically change Signal rules, templates, mappings, or approval policies |
| Lock human_review_state as waiting_for_human_approval — never invent approval | Modify historical Outcome records (they are immutable after Section 6) |
| Identify tuning candidates as candidate_only — no production changes | Create feedback_records rows for blocked actions (ACT-REV-002 etc.) |
| Build fb_pkg with summary states derived from actual records | Create new Action Queue records or re-execute Actions |
| Set handoff_status = workflow_loop_closed and stop | Start Reporting Dashboard, Optimization, or any next section automatically |

### **Section Boundary**

Section 7 starts when:  handoff_status = ready_for_feedback

Section 7 ends when:    handoff_status = workflow_loop_closed

# **2. Pipeline Status Entering Section 7**

| **Section** | **Status** | **Verified Output** |
| --- | --- | --- |
| Section 1 — Event Intake | ✅ Complete | Event stored · handoff_eligible = true · AI extraction complete |
| Section 2 — Signal Detection | ✅ Complete | SIG-TRUST-001 (negative_review_risk) dominant · SIG-TRUST-008 suppressed |
| Section 3 — Orchestrator Decision | ✅ Complete | dec_7e9c81e46d · ACT-REV-001 + ACT-REV-004 selected · ACT-REV-002 blocked |
| Section 4 — Action Queue + Parameters | ✅ Complete | Two queue records created · parameters resolved · handoff_status = ready_for_execution |
| Section 5 — Execution | ✅ Complete | exec_49dd96a471 (draft_created) · exec_b8326526d5 (completed) · approval_pkg created |
| Section 6 — Outcome | ✅ Complete | out_6001 (waiting_for_approval) · out_6002 (completed) · blocked_ctx_6001 preserved |
| Section 7 — Feedback | 🔨 BUILD TARGET | feedback_records table · feedback_context_items · tuning candidates · fb_pkg |

### **Section 6 Records That Section 7 Receives**

| **Record** | **outcome_status** | **What Section 7 Must Do** |
| --- | --- | --- |
| out_6001 · ACT-REV-001 | waiting_for_approval | Create feedback_records row · evaluate all categories · lock human_review_state = waiting_for_human_approval |
| out_6002 · ACT-REV-004 | completed | Create feedback_records row · evaluate as completed internal action |
| blocked_ctx_6001 · ACT-REV-002 | blocked | Create feedback_context_items row · record as blocked_by_policy · NOT an execution failure |

# **3. Working Example**

Business: APEX Contracting (biz_apex_001)

Provider: Google Business Profile

Consultant: Sarah Jenkins

Event: 1-star emergency review from Margaret T. — leaking roof after repair, called 5 times with no answer, water coming into kitchen

### **Expected Feedback Records After Section 7**

| **Field** | **fb_7001 (ACT-REV-001)** | **fb_7002 (ACT-REV-004)** |
| --- | --- | --- |
| feedback_id | fb_<generated> | fb_<generated> |
| event_id | evt_7001 | evt_7001 |
| decision_id | dec_7e9c81e46d | dec_7e9c81e46d |
| outcome_id | out_6001 | out_6002 |
| action_id | ACT-REV-001 | ACT-REV-004 |
| signal_validity | likely_valid | likely_valid |
| decision_quality | reasonable_so_far | reasonable_so_far |
| action_execution_quality | worked_as_expected_so_far | worked_as_expected |
| outcome_result | partial_completion | completed |
| human_review_state | waiting_for_human_approval | not_applicable |
| tuning_candidates | JSONB array — candidate_only | JSONB array — candidate_only |
| production_rules_changed | false | false |

# **4. Database Schema**

### **Migration 006 — feedback_records Table**

-- =============================================================================

-- feedback_records

-- Section 7 output. One row per eligible Outcome record.

-- blocked_ctx items go to feedback_context_items, not here.

-- production_rules_changed is ALWAYS false at Section 7 insert time.

-- =============================================================================

CREATE TABLE feedback_records (

    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    feedback_id                 TEXT UNIQUE NOT NULL,       -- fb_<generated>

    event_id                    TEXT NOT NULL,              -- FK → events.event_id

    decision_id                 TEXT NOT NULL,              -- FK → orchestrator_decisions.decision_id

    action_queue_id             TEXT NOT NULL,              -- FK → action_queue.action_queue_id

    execution_id                TEXT NOT NULL,              -- FK → action_executions.action_execution_id

    outcome_id                  TEXT NOT NULL,              -- FK → outcomes.outcome_id

    action_id                   TEXT NOT NULL,              -- e.g. ACT-REV-001

    signal_validity             TEXT,

        -- likely_valid | invalid | uncertain

    decision_quality            TEXT,

        -- reasonable_so_far | questionable | not_applicable

    action_execution_quality    TEXT,

        -- worked_as_expected | worked_as_expected_so_far | did_not_work | not_applicable

    outcome_result              TEXT,

        -- completed | partial_completion | failed | blocked_by_policy | waiting

    human_review_state          TEXT,

        -- waiting_for_human_approval | approved | rejected | edited | not_applicable

    tuning_candidates           JSONB DEFAULT '[]',

    production_rules_changed    BOOLEAN NOT NULL DEFAULT FALSE,   -- ALWAYS false in Section 7

    feedback_rules_snapshot_id  TEXT,

    details                     JSONB,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE INDEX idx_feedback_records_event_id        ON feedback_records(event_id);

CREATE INDEX idx_feedback_records_decision_id     ON feedback_records(decision_id);

CREATE INDEX idx_feedback_records_outcome_id      ON feedback_records(outcome_id);

CREATE INDEX idx_feedback_records_signal_validity ON feedback_records(signal_validity);

CREATE INDEX idx_feedback_records_outcome_result  ON feedback_records(outcome_result);

### **feedback_context_items Table**

Audit-only records for blocked context items. blocked_ctx_6001 (ACT-REV-002) goes here. No corresponding feedback_records row — blocked actions were never executed.

CREATE TABLE feedback_context_items (

    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    feedback_context_id   TEXT UNIQUE NOT NULL,      -- fb_ctx_<generated>

    event_id              TEXT NOT NULL,

    decision_id           TEXT NOT NULL,

    blocked_context_id    TEXT NOT NULL,             -- FK → blocked_outcome_context

    action_id             TEXT NOT NULL,             -- e.g. ACT-REV-002

    feedback_context_type TEXT NOT NULL DEFAULT 'blocked_by_policy',

    is_execution_failure  BOOLEAN NOT NULL DEFAULT FALSE,

    notes                 TEXT,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE INDEX idx_fb_ctx_event_id    ON feedback_context_items(event_id);

CREATE INDEX idx_fb_ctx_decision_id ON feedback_context_items(decision_id);

CREATE INDEX idx_fb_ctx_action_id   ON feedback_context_items(action_id);

### **feedback_id Column on outcomes**

Step 4 writes the feedback_id back to the Outcome record for bi-directional linking.

ALTER TABLE outcomes

    ADD COLUMN IF NOT EXISTS feedback_id TEXT;

CREATE INDEX IF NOT EXISTS idx_outcomes_feedback_id

    ON outcomes(feedback_id);

### **Updated Views**

-- full_pipeline_trace — complete chain from event through feedback

CREATE VIEW full_pipeline_trace AS

    SELECT

        ev.event_id, ev.provider, ev.event_type,

        ev.reviewer_name, ev.rating, ev.review_text,

        ev.processing_status, ev.created_at AS event_created_at,

        od.decision_id, od.execution_mode,

        o.outcome_id, o.outcome_status, o.outcome_type,

        o.time_to_response_hours, o.approval_wait_hours, o.posted_externally,

        fr.feedback_id, fr.signal_validity, fr.decision_quality,

        fr.action_execution_quality, fr.outcome_result, fr.human_review_state,

        fr.production_rules_changed

    FROM events ev

    LEFT JOIN orchestrator_decisions od ON ev.event_id = od.event_id

    LEFT JOIN outcomes o                ON ev.event_id = o.event_id

    LEFT JOIN feedback_records fr       ON o.outcome_id = fr.outcome_id

    ORDER BY ev.created_at DESC;

-- feedback_summary — fast dashboard read for completed feedback

CREATE VIEW feedback_summary AS

    SELECT

        fr.feedback_id, fr.event_id, fr.action_id,

        fr.signal_validity, fr.decision_quality,

        fr.outcome_result, fr.human_review_state,

        fr.production_rules_changed,

        fr.created_at

    FROM feedback_records fr

    ORDER BY fr.created_at DESC;

# **5. Prisma Models**

Add these to schema.prisma and run npx prisma generate before writing any Section 7 code.

// Add feedback_id to your existing Outcome model:

// model Outcome {

//   ...existing fields...

//   feedback_id     String?         // written by Section 7 Step 4

//   feedback_record FeedbackRecord? @relation(fields: [feedback_id], references: [feedback_id])

// }

// Add to your existing Event model:

// model Event {

//   ...existing fields...

//   feedback_records       FeedbackRecord[]

//   feedback_context_items FeedbackContextItem[]

// }

model FeedbackRecord {

  id                        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  feedback_id               String   @unique

  event_id                  String

  decision_id               String

  action_queue_id           String

  execution_id              String

  outcome_id                String

  action_id                 String

  signal_validity           String?

  // likely_valid | invalid | uncertain

  decision_quality          String?

  // reasonable_so_far | questionable | not_applicable

  action_execution_quality  String?

  // worked_as_expected | worked_as_expected_so_far | did_not_work | not_applicable

  outcome_result            String?

  // completed | partial_completion | failed | blocked_by_policy | waiting

  human_review_state        String?

  // waiting_for_human_approval | approved | rejected | edited | not_applicable

  tuning_candidates         Json     @default("[]")

  production_rules_changed  Boolean  @default(false)   // ALWAYS false at Section 7 insert

  feedback_rules_snapshot_id String?

  details                   Json?

  created_at                DateTime @default(now()) @db.Timestamptz(6)

  updated_at                DateTime @default(now()) @db.Timestamptz(6)

  event                     Event    @relation(fields: [event_id], references: [event_id], onDelete: Cascade)

  outcomes                  Outcome[]

  @@map("feedback_records")

}

model FeedbackContextItem {

  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  feedback_context_id   String   @unique

  event_id              String

  decision_id           String

  blocked_context_id    String

  action_id             String

  feedback_context_type String   @default("blocked_by_policy")

  is_execution_failure  Boolean  @default(false)

  notes                 String?

  created_at            DateTime @default(now()) @db.Timestamptz(6)

  event                 Event    @relation(fields: [event_id], references: [event_id], onDelete: Cascade)

  @@map("feedback_context_items")

}

# **6. Feedback Category and State Reference**

### **Evaluation Category States**

| **Category** | **Allowed Values** | **Derivation Rule** | **Notes** |
| --- | --- | --- | --- |
| signal_validity | likely_valid · uncertain · invalid | Worst result across all records wins | uncertain beats likely_valid; invalid beats both |
| decision_quality | reasonable_so_far · questionable · not_applicable | If any record is questionable, summary is questionable | so_far suffix used when outcome is still partial |
| action_execution_quality | worked_as_expected · worked_as_expected_so_far · did_not_work · not_applicable | Worst result across all records wins | so_far when draft exists but approval pending |
| outcome_result | completed · partial_completion · failed · blocked_by_policy · waiting | Worst result across all records wins | failed beats partial_completion beats completed |
| human_review_state | waiting_for_human_approval · approved · rejected · edited · not_applicable | If any record is waiting, summary is waiting | Never invented — only recorded if real event exists |

### **Outcome → Feedback State Mapping (APEX)**

| **Outcome Record** | **outcome_type** | **outcome_status** | **feedback outcome_result** | **feedback human_review_state** |
| --- | --- | --- | --- | --- |
| out_6001 · ACT-REV-001 | draft_created | waiting_for_approval | partial_completion | waiting_for_human_approval |
| out_6002 · ACT-REV-004 | completed | completed | completed | not_applicable |
| blocked_ctx_6001 · ACT-REV-002 | blocked_preserved | blocked | blocked_by_policy | not_applicable — context item only |

# **7. All 12 Steps — Full Detail**

## **Step 1 — Receive Outcome Output from Section 6**

**Purpose:**

Accept the Section 6 out_pkg as the official input into Feedback. Confirm handoff_status = ready_for_feedback. Confirm Feedback has not already started for this event. This is a read-and-validate-only step — no DB writes.

### **Checks Performed in Step 1**

| **Check** | **Pass Condition** | **Fail Action** |
| --- | --- | --- |
| section_6_status | Must equal completed | Raise fatal_error |
| handoff_status | Must equal ready_for_feedback | Raise fatal_error |
| outcome_records | Must be non-empty | Raise fatal_error |
| boundary_flags.feedback_recorded | Must be false | Raise fatal_error('duplicate_feedback_prevented') |
| Duplicate guard | No existing rows in feedback_records for any outcome_id in the package | Raise fatal_error('duplicate_feedback_prevented') |

### **Pseudocode**

FUNCTION receiveFeedbackInput(out_pkg, event_id):

  CONFIRM out_pkg.section_6_status = 'completed'

  CONFIRM out_pkg.handoff_status = 'ready_for_feedback'

  CONFIRM out_pkg.outcome_records is not empty

  CONFIRM out_pkg.boundary_flags.feedback_recorded = false

  FOR EACH outcome IN out_pkg.outcome_records DO

    existing ← DB.query(SELECT id FROM feedback_records WHERE outcome_id = outcome.outcome_id)

    IF existing is not empty THEN

      RAISE fatal_error('duplicate_feedback_prevented')

    END IF

  END FOR

  RETURN { safe_to_continue: true, blocked_context: out_pkg.blocked_no_external_action_context }

END FUNCTION

## **Step 2 — Confirm Feedback Entry Eligibility**

**Purpose:**

Validate each Outcome record before creating any Feedback record. Separate eligible Outcome records from blocked/no-external-action context. blocked_ctx_6001 always routes to context-only — it has no execution record and must never generate a feedback_records row.

### **Eligibility Checklist**

| **Check** | **Pass Condition** | **Fail Action** |
| --- | --- | --- |
| outcome_id present | Not null · exists in outcomes table | Skip · log warning |
| outcome_status is recordable | waiting_for_approval · completed · failed · waiting | Skip · log warning |
| execution_id present | Not null · traceable to action_executions | Skip · log error |
| event_id present | Not null · traceable to events | Skip · log error |
| No duplicate Feedback | No feedback_records row for this outcome_id | Skip · do not duplicate |
| Blocked context excluded | outcome_type != blocked_preserved | Route to feedback_context_items — no feedback_records row |

### **APEX Result of Step 2**

{

  "eligible_outcome_records": [

    {

      "outcome_id": "out_6001",

      "action_id": "ACT-REV-001",

      "outcome_status": "waiting_for_approval",

      "proposed_feedback_handling": "partial_completion_waiting_for_human_approval"

    },

    {

      "outcome_id": "out_6002",

      "action_id": "ACT-REV-004",

      "outcome_status": "completed",

      "proposed_feedback_handling": "completed_internal_action"

    }

  ],

  "context_only_items": [

    {

      "blocked_context_id": "blocked_ctx_6001",

      "action_id": "ACT-REV-002",

      "eligible_for_feedback_record": false,

      "route_to": "feedback_context_items"

    }

  ]

}

## **Step 3 — Load Feedback Categories, Questions, and Evaluation Rules**

**Purpose:**

Build the frozen rules snapshot that defines what Feedback is allowed to evaluate and how. No DB writes in this step. This snapshot is the authoritative reference for Steps 4–10.

### **Frozen Rules Snapshot — APEX**

{

  "feedback_rules_snapshot_id": "fb_rules_snap_<generated>",

  "categories": [

    "signal_validity", "decision_quality", "action_execution_quality",

    "outcome_result", "human_review_state", "tuning_candidate", "reporting_value"

  ],

  "outcome_to_feedback_map": {

    "waiting_for_approval": {

      "outcome_result": "partial_completion",

      "human_review_state": "waiting_for_human_approval",

      "do_not_mark_failed": true

    },

    "completed": {

      "outcome_result": "completed",

      "human_review_state": "not_applicable"

    },

    "failed": {

      "outcome_result": "failed",

      "human_review_state": "not_applicable"

    }

  },

  "boundary_rules": {

    "automatic_rule_changes_allowed": false,

    "uncontrolled_model_training_allowed": false,

    "production_rules_changed_default": false

  }

}

## **Step 4 — Create Feedback Records**

**Purpose:**

Create one Feedback record per eligible Outcome record inside a single database transaction. Both records must succeed or both must roll back. Also create the context item for blocked_ctx_6001. Write feedback_id back to the Outcome record for bi-directional linking.

| **⚠️  CRITICAL RULE — Transaction Required** All feedback_records INSERTs must be wrapped in a single transaction. If either INSERT fails, rollback both. Never leave partial Feedback records in the database. |
| --- |

### **TypeScript Snippet**

async function createFeedbackRecords(

  eligibleRecords: EligibleOutcomeRecord[],

  outPkg: OutcomePackage,

  rulesSnapshot: FeedbackRulesSnapshot

): Promise<CreatedFeedbackRecord[]> {

  const created: CreatedFeedbackRecord[] = [];

  await prisma.$transaction(async (tx) => {

    for (const rec of eligibleRecords) {

      const mapping = rulesSnapshot.outcome_to_feedback_map[rec.outcome_status];

      const feedback_id = `fb_${generateId()}`;

      await tx.feedbackRecord.create({

        data: {

          feedback_id,

          event_id:                   outPkg.source_event_id,

          decision_id:                outPkg.source_orchestrator_decision_id,

          action_queue_id:            rec.action_queue_id,

          execution_id:               rec.execution_id,

          outcome_id:                 rec.outcome_id,

          action_id:                  rec.action_id,

          outcome_result:             mapping.outcome_result,

          human_review_state:         mapping.human_review_state,

          production_rules_changed:   false,     // HARDCODED

          feedback_rules_snapshot_id: rulesSnapshot.snapshot_id,

          tuning_candidates:          [],

        },

      });

      // Write feedback_id back to outcomes

      await tx.outcome.update({

        where: { outcome_id: rec.outcome_id },

        data:  { feedback_id },

      });

      created.push({ feedback_id, ...mapping, action_id: rec.action_id });

    }

  });

  return created;

}

## **Step 5 — Record Signal Validity Feedback**

**Purpose:**

Populate the signal_validity field on each Feedback record. Evaluate whether the Signal correctly identified a real, actionable event. Signal validity is evaluated against what the Outcome showed — not by re-running Section 2.

### **Signal Validity Logic**

IF outcome_result = 'completed' OR outcome_result = 'partial_completion' THEN

  signal_validity = 'likely_valid'

ELSE IF outcome_result = 'failed' AND signal_may_have_been_false THEN

  signal_validity = 'uncertain'

ELSE IF signal_was_clearly_incorrect THEN

  signal_validity = 'invalid'

### **APEX details Update for Signal Validity (fb_7001)**

{

  "signal_validity_evaluation": {

    "signal_id": "SIG-TRUST-001",

    "signal_type": "negative_review_risk",

    "signal_validity": "likely_valid",

    "reason": "Real 1-star emergency review received. Specific complaint identified. Actions were appropriate to Signal type.",

    "flag_for_review": false

  }

}

## **Step 6 — Record Orchestrator Decision Feedback**

**Purpose:**

Populate the decision_quality field. Evaluate whether the Orchestrator selected the correct dominant Signal, grouped Signals appropriately, chose the right Actions, and applied the correct execution modes.

For APEX: ACT-REV-001 (draft reply) and ACT-REV-004 (log complaint theme) were selected. ACT-REV-002 was correctly blocked by policy. No unnecessary Actions were triggered.

### **APEX details Update for Decision Quality**

{

  "decision_quality_evaluation": {

    "orchestrator_decision_id": "dec_7e9c81e46d",

    "dominant_signal_appropriate": true,

    "action_selection_appropriate": true,

    "execution_mode_appropriate": true,

    "unnecessary_actions_triggered": false,

    "policy_enforcement_correct": true,

    "decision_quality": "reasonable_so_far",

    "reason": "Actions matched the review Signal type. ACT-REV-002 correctly blocked. No unnecessary Actions triggered.",

    "flag_for_review": false

  }

}

## **Step 7 — Record Action and Execution Feedback**

**Purpose:**

Populate the action_execution_quality field. Evaluate whether each Action executed as expected given what the Execution and Outcome records show.

### **Action / Execution Quality Logic**

IF draft_created AND approval_pending THEN

  action_execution_quality = 'worked_as_expected_so_far'

IF internal_action_completed THEN

  action_execution_quality = 'worked_as_expected'

IF correctly_blocked_by_policy THEN

  action_execution_quality = 'not_applicable'   // on context item only

IF execution_failed THEN

  action_execution_quality = 'did_not_work'

### **APEX details Update**

{

  "action_execution_quality_evaluation": {

    "exec_49dd96a471": {

      "action_id": "ACT-REV-001",

      "result": "worked_as_expected_so_far",

      "draft_created": true,

      "sent_for_approval": true

    },

    "exec_b8326526d5": {

      "action_id": "ACT-REV-004",

      "result": "worked_as_expected",

      "complaint_theme_logged": true

    },

    "blocked_ACT_REV_002": {

      "result": "correctly_blocked",

      "count_as_execution_failure": false

    },

    "overall": "worked_as_expected_so_far"

  }

}

## **Step 8 — Record Outcome Result Feedback**

**Purpose:**

Populate the outcome_result field by mapping from the Outcome status. Record what the Outcome section shows about completion, partial completion, waiting, failure, or blocked state. Do not invent states not present in the Outcome records.

### **Outcome → Feedback outcome_result Mapping**

| **Outcome Record** | **outcome_status** | **feedback outcome_result** |
| --- | --- | --- |
| out_6001 · ACT-REV-001 | waiting_for_approval | partial_completion |
| out_6002 · ACT-REV-004 | completed | completed |
| blocked_ctx_6001 · ACT-REV-002 | blocked | blocked_by_policy (context item only) |

## **Step 9 — Record Human Approval, Edit, Rejection, or Waiting Feedback**

**Purpose:**

Populate the human_review_state field. Lock the current human review state for out_6001 as waiting_for_human_approval. Do not invent approval, rejection, or editing that has not occurred.

| **⚠️  CRITICAL BOUNDARY** Section 7 must never set human_review_state to approved, rejected, or edited unless a real human approval event is present in the input data. If no such event exists, the state is waiting_for_human_approval and it stays there. |
| --- |

### **Human Review State Logic**

function resolveHumanReviewState(outcomeRecord: OutcomeRecord): string {

  if (!outcomeRecord.requires_human_approval) return 'not_applicable';

  if (outcomeRecord.approved_at)  return 'approved';

  if (outcomeRecord.rejected_at)  return 'rejected';

  if (outcomeRecord.human_edited) return 'edited';

  return 'waiting_for_human_approval';  // default when no action taken

}

### **APEX details Update (fb_7001)**

{

  "human_review_state_evaluation": {

    "outcome_id": "out_6001",

    "approval_required": true,

    "approval_owner": "consultant",

    "current_approval_status": "pending_approval",

    "human_review_state": "waiting_for_human_approval",

    "draft_approved": false,

    "draft_rejected": false,

    "draft_human_edited": false,

    "draft_posted_to_google": false,

    "locked_state": "waiting_for_human_approval"

  }

}

## **Step 10 — Identify Tuning Candidates**

**Purpose:**

Populate the tuning_candidates JSONB field on each Feedback record. Identify possible future improvements as candidate_only items. No production rules are changed. No models are retrained.

| **⚠️  CRITICAL RULE** Every item in tuning_candidates must have automatic_change: false. If a developer changes a production rule based on a tuning candidate without explicit approval, that is a boundary violation. |
| --- |

### **APEX Tuning Candidates for fb_7001**

{

  "tuning_candidates": [

    {

      "type": "signal_priority_review_if_repeated",

      "reason": "Communication-delay complaints may justify Signal priority review if pattern repeats.",

      "automatic_change": false

    },

    {

      "type": "review_reply_template_review_after_human_action",

      "reason": "Draft template quality can only be evaluated after owner approves, edits, or rejects.",

      "automatic_change": false

    },

    {

      "type": "approval_wait_time_review",

      "reason": "If drafts consistently sit in waiting_for_human_approval beyond a threshold, the approval workflow design should be reviewed.",

      "automatic_change": false

    },

    {

      "type": "action_mapping_review_if_future_feedback_negative",

      "reason": "If similar events produce consistent negative Feedback, the Action Library mapping should be reviewed.",

      "automatic_change": false

    },

    {

      "type": "review_approval_policy_review",

      "reason": "If a high proportion of public replies remain blocked, the approval policy may need design review. Current policy is intentionally conservative.",

      "automatic_change": false,

      "current_policy_preserved": true

    }

  ],

  "production_rules_changed": false,

  "candidate_only": true

}

## **Step 11 — Prepare Feedback Output Package**

**Purpose:**

Package all Feedback records, context items, evaluation summaries, dashboard states, and tuning candidates into a single fb_pkg object for dashboards, support review, and future optimization.

| **⚠️  BOUNDARY RULE** The package must explicitly mark public_reply_posted = false and external_action_completed = false. Reports must never imply the review reply was publicly posted when it was only drafted. |
| --- |

### **buildFeedbackPackage() — Key Derivation Rules**

| **Field** | **Derivation Rule** | **APEX Value** |
| --- | --- | --- |
| signal_validity | Worst result across all records wins (invalid > uncertain > likely_valid) | likely_valid |
| decision_quality | If any record is questionable, summary is questionable | reasonable_so_far |
| action_execution_quality | Worst result wins (did_not_work > so_far > worked_as_expected) | worked_as_expected_so_far |
| outcome_result | Worst result wins (failed > partial_completion > completed) | partial_completion |
| human_review_state | If any record is waiting, summary is waiting | waiting_for_human_approval |
| public_posting_state | context_items.length > 0 ? blocked_by_policy : not_applicable | blocked_by_policy |
| overall dashboard state | Mirrors outcome_result | partial_completion |
| review_reply dashboard | Mirrors human_review_state | waiting_for_approval |
| complaint_theme dashboard | Hardcoded logged if ACT-REV-004 completed | logged |

### **Full fb_pkg — APEX Example**

{

  "feedback_output_package_id": "fb_pkg_<generated>",

  "business_id": "biz_apex_001",

  "source_event_id": "evt_7001",

  "feedback_records": ["fb_7001", "fb_7002"],

  "feedback_context_items": ["fb_ctx_7001"],

  "summary_states": {

    "signal_validity": "likely_valid",

    "decision_quality": "reasonable_so_far",

    "action_execution_quality": "worked_as_expected_so_far",

    "outcome_result": "partial_completion",

    "human_review_state": "waiting_for_human_approval",

    "public_posting_state": "blocked_by_policy"

  },

  "dashboard_states": {

    "review_reply": "waiting_for_approval",

    "complaint_theme": "logged",

    "public_posting": "blocked_by_policy",

    "overall": "partial_completion"

  },

  "reporting_boundary_check": {

    "public_reply_posted": false,

    "external_action_completed": false

  },

  "tuning_candidates": "candidate_only",

  "production_changes_applied": false,

  "ready_for_reporting": true,

  "handoff_status": "workflow_loop_closed"

}

## **Step 12 — Stop After Feedback Completion**

**Purpose:**

Close the full workflow loop. Confirm all boundary flags are clean. Return FeedbackResult to the runner. Set handoff_status = workflow_loop_closed. The pipeline loop is now closed.

### **Boundary Check Pseudocode**

FUNCTION stopAfterFeedback(fb_pkg, created_records):

  IF fb_pkg.production_changes_applied = TRUE THEN

    RAISE fatal_error('boundary_violation_production_rules_changed_in_section_7')

  END IF

  IF fb_pkg.reporting_boundary_check.public_reply_posted = TRUE THEN

    RAISE fatal_error('boundary_violation_posted_in_section_7')

  END IF

  LOG 'Section 7 complete. feedback_records=' + count(created_records)

  LOG 'production_rules_changed=false on all records.'

  LOG 'handoff_status=workflow_loop_closed. Full pipeline loop closed.'

  RETURN FeedbackResult {

    completed:        true,

    feedback_records: created_records,

    fb_pkg:           fb_pkg,

    handoff_status:   'workflow_loop_closed',

    pipeline_status:  'feedback_complete',

    stop_reason:      null

  }

END FUNCTION

# **8. Public Entry Point — runFeedback()**

### **TypeScript Interface**

interface FeedbackResult {

  completed:        boolean;

  feedback_records: CreatedFeedbackRecord[];

  context_items:    CreatedFeedbackContextItem[];

  fb_pkg:           FeedbackPackage | null;

  handoff_status:   'workflow_loop_closed' | 'failed';

  pipeline_status:  'feedback_complete' | 'feedback_failed';

  stop_reason:      string | null;

  log:              FeedbackLog;

}

### **Full runFeedback() Entry Point — Pseudocode**

FUNCTION runFeedback(out_pkg, event_id, decision_id, business_id):

  LOG 'Section 7 started. decision_id=' + decision_id

  TRY:

    // Step 1

    intake ← receiveFeedbackInput(out_pkg, event_id)

    IF NOT intake.safe_to_continue THEN

      RETURN FeedbackResult { completed: false, stop_reason: intake.error }

    // Step 2

    { eligible, context_only, blocked_context } ← confirmFeedbackEligibility(

      out_pkg.outcome_records,

      out_pkg.blocked_no_external_action_context

    )

    IF eligible is empty THEN

      RETURN FeedbackResult { completed: false, stop_reason: 'no_eligible_outcome_records' }

    // Step 3

    rules ← loadFeedbackRules()

    // Step 4: create records inside transaction, writes feedback_id back to outcomes

    createdRecords ← createFeedbackRecords(eligible, out_pkg, rules)

    // Step 4b: create context items for blocked context

    contextItems ← createFeedbackContextItems(blocked_context, out_pkg)

    // Steps 5-10: compute all evaluations in memory, write in single UPDATE per record

    FOR EACH record IN createdRecords DO

      signalValidity   ← buildSignalValidityFeedback(record)

      decisionQuality  ← buildDecisionQualityFeedback(record)

      actionExecution  ← buildActionExecutionFeedback(record)

      outcomeResult    ← buildOutcomeResultFeedback(record)

      humanReview      ← buildHumanReviewStateFeedback(record)

      tuning           ← buildTuningCandidates()

      DB.update feedback_records SET

        signal_validity           = signalValidity.result,

        decision_quality          = decisionQuality.result,

        action_execution_quality  = actionExecution.result,

        tuning_candidates         = tuning.candidates,

        details                   = merge(all evaluation details)

      WHERE feedback_id = record.feedback_id

      LOG 'Evaluations written for ' + record.feedback_id

    END FOR

    // Step 11: build fb_pkg (derive all values from actual records)

    fb_pkg ← buildFeedbackPackage(createdRecords, contextItems, out_pkg, rules)

    // Step 12: stop

    RETURN stopAfterFeedback(fb_pkg, createdRecords)

  CATCH fatal_error:

    LOG 'Section 7 fatal error: ' + error.message

    RETURN FeedbackResult {

      completed:      false,

      stop_reason:    error.message,

      handoff_status: 'failed',

      pipeline_status: 'feedback_failed'

    }

  END TRY

END FUNCTION

# **9. Developer Roadmap**

Follow this roadmap in order. Do not skip phases. Each phase must be verified before the next begins.

### **Phase 1 — Database and Schema**

| **Task** | **Detail** | **Done When** |
| --- | --- | --- |
| Write and run 006_feedback.sql migration | Creates feedback_records, feedback_context_items tables, adds feedback_id to outcomes, creates all indexes | All tables exist · no FK errors |
| Add FeedbackRecord model to schema.prisma | Copy the model from Section 5 of this document | prisma studio shows FeedbackRecord table with all fields |
| Add FeedbackContextItem model | Copy from Section 5 of this document | prisma studio shows feedback_context_items table |
| Add feedback_id String? to existing Outcome model | Step 4 writes feedback_id back to outcomes | prisma studio shows feedback_id column on outcomes |
| Run npx prisma generate | Regenerate the Prisma client | TypeScript types include FeedbackRecord and FeedbackContextItem |
| Confirm feedback_records table is empty | SELECT COUNT(*) FROM feedback_records = 0 | Zero rows — clean starting point |

### **Phase 2 — Build section-7-feedback.ts**

| **Task** | **Detail** | **Done When** |
| --- | --- | --- |
| Create the file | src/lib/server/section-7-feedback.ts. Match the class/log pattern of section-6-outcome.ts | File exists · TypeScript compiles |
| Define FeedbackResult interface | completed, feedback_records, context_items, fb_pkg, handoff_status, pipeline_status, stop_reason, log | Interface defined |
| Define FeedbackLog class | Same pattern as OutcomeLog. step(status, message, description) method | Log class works |
| Implement Steps 1–3 | receiveFeedbackInput, confirmFeedbackEligibility, loadFeedbackRules | Each function compiles · correct signatures |
| Implement Step 4 | createFeedbackRecords with Prisma transaction · feedback_id write-back to outcomes | Transaction works · both records created or neither |
| Implement Step 4b | createFeedbackContextItems for blocked context | Context item created for blocked_ctx_6001 |
| Implement Steps 5–10 | build* functions compute in memory. Single UPDATE per record with all evaluations merged | Each evaluation field populated correctly · no stale details overwrite |
| Implement Step 11 | buildFeedbackPackage. Derives all summary states from created_records. No hardcoded values. | fb_pkg complete · public_reply_posted = false confirmed |
| Implement Step 12 | stopAfterFeedback. Boundary checks. Returns FeedbackResult. | Boundary violations raise fatal errors |
| Implement runFeedback() | Chains all 12 steps. Returns FeedbackResult. Handles fatal errors. | Function defined and compiles |

### **Phase 3 — Wire into review-pipeline.ts**

| **Task** | **Detail** | **Done When** |
| --- | --- | --- |
| Import runFeedback | import { runFeedback } from './section-7-feedback' | Import resolves |
| Call runFeedback after Section 6 | Pass out_pkg from outcomeResult into runFeedback. Store result. | feedbackResult populated in pipeline result |
| Add FeedbackResult to pipeline return | Include feedback in the final pipeline return object | /api/simulate returns feedback field |
| Add Step 19 log line | log('[Step 19] Feedback: completed=' + feedbackResult.completed) | Log line appears in trace |
| Handle Section 7 failure | If feedbackResult.completed = false, set pipeline_status = feedback_failed and return | Pipeline stops cleanly on Section 7 failure |

### **Phase 4 — Test and Verify**

| **Test** | **How to Run** | **Pass Condition** |
| --- | --- | --- |
| Happy path — 1-star emergency review | POST /api/simulate with Margaret T. payload | Two feedback rows in DB · one context item · fb_pkg.handoff_status = workflow_loop_closed |
| Feedback records have correct evaluation states | SELECT signal_validity, decision_quality, outcome_result, human_review_state FROM feedback_records | likely_valid · reasonable_so_far · partial_completion/completed · waiting_for_human_approval/not_applicable |
| production_rules_changed = FALSE on all rows | SELECT COUNT(*) FROM feedback_records WHERE production_rules_changed = TRUE | Must return 0 |
| No feedback row for ACT-REV-002 | SELECT COUNT(*) FROM feedback_records WHERE action_id = 'ACT-REV-002' | Must return 0 |
| Context item created for ACT-REV-002 | SELECT * FROM feedback_context_items WHERE action_id = 'ACT-REV-002' | Returns one row · is_execution_failure = false |
| feedback_id written back to outcomes | SELECT feedback_id FROM outcomes WHERE outcome_id = 'out_6001' | Returns the fb_7001 ID |
| Tuning candidates are candidate-only | SELECT tuning_candidates FROM feedback_records | All items have automatic_change: false |
| Two different execution values in trace | Check Step 19 log output | fb_xxx: execution=worked_as_expected_so_far AND fb_yyy: execution=worked_as_expected |
| Duplicate guard | Run same payload twice | Second run: completed = false · stop_reason = duplicate_feedback_prevented |
| Pipeline log shows Step 19 | Check trace output | [Step 19] Feedback: completed=true handoff=workflow_loop_closed |

# **10. DB Verification Queries**

Run these after every build and test run.

-- Check 1: Feedback records with correct evaluation states

SELECT feedback_id, action_id, signal_validity, decision_quality,

       action_execution_quality, outcome_result, human_review_state,

       production_rules_changed

FROM feedback_records

ORDER BY created_at DESC LIMIT 5;

-- Expected: 2 rows · likely_valid · reasonable_so_far

-- · partial_completion + completed · waiting_for_human_approval + not_applicable

-- · production_rules_changed = false on both

-- Check 2: Feedback links back to Outcome records

SELECT fr.feedback_id, fr.outcome_result, fr.human_review_state,

       o.outcome_id, o.outcome_type, o.outcome_status

FROM feedback_records fr

JOIN outcomes o ON fr.outcome_id = o.outcome_id

ORDER BY fr.created_at DESC LIMIT 5;

-- Expected: each feedback joins cleanly to its outcome record

-- Check 3: MUST return 0 — no feedback row for ACT-REV-002

SELECT COUNT(*) FROM feedback_records WHERE action_id = 'ACT-REV-002';

-- Check 4: Context item exists for ACT-REV-002

SELECT feedback_context_id, action_id, feedback_context_type, is_execution_failure

FROM feedback_context_items WHERE action_id = 'ACT-REV-002';

-- Expected: 1 row · blocked_by_policy · is_execution_failure = false

-- Check 5: MUST return 0 — production_rules_changed always false

SELECT COUNT(*) FROM feedback_records WHERE production_rules_changed = TRUE;

-- Check 6: feedback_id written back to outcomes

SELECT outcome_id, feedback_id FROM outcomes WHERE feedback_id IS NOT NULL

ORDER BY updated_at DESC LIMIT 5;

-- Expected: 2 rows with feedback_id populated

-- Check 7: Tuning candidates are candidate-only

SELECT feedback_id, tuning_candidates FROM feedback_records

ORDER BY created_at DESC LIMIT 2;

-- Expected: JSONB arrays present · all items have automatic_change = false

-- Check 8: Full pipeline traceability audit

SELECT

  fr.feedback_id, fr.signal_validity, fr.outcome_result, fr.human_review_state,

  o.outcome_id, o.outcome_type, o.outcome_status,

  ae.action_execution_id, ae.execution_status,

  aq.action_queue_id, aq.status AS queue_status,

  ev.event_id, ev.reviewer_name, ev.rating

FROM feedback_records fr

JOIN outcomes o              ON fr.outcome_id = o.outcome_id

JOIN action_executions ae   ON fr.execution_id = ae.action_execution_id

JOIN action_queue aq        ON fr.action_queue_id = aq.action_queue_id

JOIN events ev              ON fr.event_id = ev.event_id

WHERE fr.event_id = 'evt_7001'

ORDER BY fr.created_at;

-- Expected: 2 rows · full chain from event through queue through execution

-- through outcome through feedback

# **11. Common Mistakes**

| **Mistake** | **Why It Is Wrong** | **Correct Approach** |
| --- | --- | --- |
| Creating a feedback_records row for blocked_ctx_6001 / ACT-REV-002 | ACT-REV-002 was never executed. It has no execution record. Feedback records must link to execution records via outcomes. | Create a feedback_context_items row instead. No feedback_records row. |
| Setting production_rules_changed = TRUE | Section 7 never changes production rules. This field is always false at insert time. | Hardcode production_rules_changed = FALSE on every INSERT. Verify in Step 12. |
| Setting human_review_state to approved, rejected, or edited without a real approval event | The human has not acted. Section 7 records what IS, not what should be. | Set human_review_state = waiting_for_human_approval and stop. Only update when a real approval event arrives. |
| Adding tuning candidates with automatic_change: true | Feedback must never trigger automatic rule changes. | Every item in tuning_candidates must have automatic_change: false. |
| Not wrapping Step 4 in a transaction | Partial Feedback records leave the system inconsistent and traceability broken. | prisma.$transaction — all records created together or none at all. |
| Skipping the feedback_id write-back to outcomes | Without feedback_id on outcomes, bi-directional traceability is broken and the cockpit cannot link outcomes to their feedback. | Always update outcomes.feedback_id inside the same transaction as Step 4. |
| Running Section 7 before Prisma models are added | Prisma throws at runtime if FeedbackRecord is not in schema.prisma. | Add both models and run npx prisma generate before writing any Section 7 code. |
| Marking outcome_result = failed for a waiting approval draft | waiting_for_approval is not a failure. The draft exists. The system worked. | Map waiting_for_approval → partial_completion, not failed. |
| Using sequential individual DB updates for Steps 5–10 | Each update spreads stale record.details, causing later evaluations to overwrite earlier ones. | Compute all evaluations in memory first (Steps 5–10), then write in a single prisma.feedbackRecord.update call. |
| Hardcoding summary states in buildFeedbackPackage() | When a different event type runs, the package will report wrong states regardless of what actually happened. | Derive all summary states from created_records fields using worst-result reduction logic. |
| Recording Feedback before all Outcome steps are confirmed complete | Feedback must not start mid-Outcome. | Confirm out_pkg.boundary_flags.feedback_recorded = false and section_6_status = completed in Step 1. |

| **Section 7 Final Boundary** Section 7 starts when handoff_status = ready_for_feedback and ends when handoff_status = workflow_loop_closed. It does not post. It does not approve. It does not change rules. It does not train models. It records what happened and stops. |
| --- |

*ClearSky AI Decision System · Section 7 Feedback · Full Developer Documentation · Session 6*

Session 6 · Stack: TypeScript · SvelteKit · Prisma · PostgreSQL · APEX Contracting