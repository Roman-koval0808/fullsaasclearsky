-- =============================================================================
-- ClearSky AI Decision System
-- Migration 005: Outcome Table — Prisma-Compatible Model
-- =============================================================================
-- Run after 004_40_signals_seed.sql
--
--   psql clearsky < migrations/005_outcome_prisma.sql
--
-- This migration:
--   1. Creates the outcomes table in Prisma-compatible form (UUID PK)
--   2. Creates the blocked_outcome_context table for audit-only blocked records
--   3. Adds outcome_id column to action_executions for bi-directional linking (Step 9)
--   4. Adds outcome_recorded status support to action_queue
--   5. Creates reporting indexes
--
-- The outcomes table already exists in 001_initial_schema.sql with a SERIAL PK.
-- If your database was created from 001_initial_schema.sql, drop that table first:
--   DROP TABLE IF EXISTS outcomes CASCADE;
-- Then run this migration.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Drop old outcomes table if it exists (from 001_initial_schema.sql)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS outcomes CASCADE;


-- -----------------------------------------------------------------------------
-- outcomes
-- Section 6 output. One row per eligible execution record.
-- Records what happened after execution in a structured, auditable form.
-- ACT-REV-002 (blocked) does NOT get a row here — see blocked_outcome_context.
-- -----------------------------------------------------------------------------

CREATE TABLE outcomes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outcome_id              TEXT UNIQUE NOT NULL,       -- out_<generated>
    event_id                TEXT NOT NULL,              -- FK → events.event_id (TEXT)
    decision_id             TEXT NOT NULL,              -- FK → orchestrator_decisions.decision_id
    action_queue_id         TEXT NOT NULL,              -- FK → action_queue.action_queue_id
    execution_id            TEXT NOT NULL,              -- FK → action_executions.action_execution_id
    action_id               TEXT NOT NULL,              -- e.g. ACT-REV-001
    outcome_type            TEXT NOT NULL,
        -- draft_created | approved | edited_before_approval | posted |
        -- sent | assigned | completed | rejected | failed |
        -- no_action_taken | blocked_preserved
    outcome_status          TEXT NOT NULL,
        -- completed | waiting_for_approval | waiting | blocked | failed
    time_to_response_hours  FLOAT,                     -- event.created_at → exec.created_at
    approval_wait_hours     FLOAT,                     -- exec.created_at → NOW() if waiting
    human_edited            BOOLEAN NOT NULL DEFAULT FALSE,
    posted_externally       BOOLEAN NOT NULL DEFAULT FALSE,   -- ALWAYS false in Section 6
    do_not_count_as_success BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE for blocked/failed
    details                 JSONB,                     -- structured detail object per outcome type
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outcomes_event_id          ON outcomes(event_id);
CREATE INDEX idx_outcomes_decision_id       ON outcomes(decision_id);
CREATE INDEX idx_outcomes_execution_id      ON outcomes(execution_id);
CREATE INDEX idx_outcomes_outcome_status    ON outcomes(outcome_status);
CREATE INDEX idx_outcomes_outcome_type      ON outcomes(outcome_type);
CREATE INDEX idx_outcomes_posted_externally ON outcomes(posted_externally);

COMMENT ON TABLE outcomes IS
    'Section 6 output. One row per eligible execution record. '
    'ACT-REV-002 blocked context lives in blocked_outcome_context, not here. '
    'posted_externally is always FALSE in Section 6. '
    'Linked back to action_executions via action_executions.outcome_id (Step 9).';

COMMENT ON COLUMN outcomes.do_not_count_as_success IS
    'TRUE for blocked_preserved and failed outcome types. '
    'Prevents blocked actions from being counted as successful completions in reporting.';

COMMENT ON COLUMN outcomes.posted_externally IS
    'Must always be FALSE at Section 6 insert time. '
    'Only set to TRUE after human approval and external posting, outside Section 6.';


-- -----------------------------------------------------------------------------
-- blocked_outcome_context
-- Audit-only records for actions that were blocked by policy.
-- ACT-REV-002 (post_review_reply) goes here, not into outcomes.
-- Section 6 reads these from the exec_out package and persists them here
-- so they are queryable for reporting without polluting the outcomes table.
-- -----------------------------------------------------------------------------

CREATE TABLE blocked_outcome_context (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocked_context_id      TEXT UNIQUE NOT NULL,      -- blocked_ctx_<generated>
    event_id                TEXT NOT NULL,
    decision_id             TEXT NOT NULL,
    action_id               TEXT NOT NULL,             -- e.g. ACT-REV-002
    action_name             TEXT,
    blocked_reason          TEXT,
    outcome_type            TEXT NOT NULL DEFAULT 'blocked_preserved',
    outcome_status          TEXT NOT NULL DEFAULT 'blocked',
    posted_to_google        BOOLEAN NOT NULL DEFAULT FALSE,
    external_action_completed BOOLEAN NOT NULL DEFAULT FALSE,
    do_not_count_as_success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocked_ctx_event_id    ON blocked_outcome_context(event_id);
CREATE INDEX idx_blocked_ctx_decision_id ON blocked_outcome_context(decision_id);
CREATE INDEX idx_blocked_ctx_action_id   ON blocked_outcome_context(action_id);

COMMENT ON TABLE blocked_outcome_context IS
    'Audit-only context for blocked actions. '
    'ACT-REV-002 post_review_reply is the primary use case. '
    'No row in outcomes for these — they were never executed. '
    'do_not_count_as_success is always TRUE here.';


-- -----------------------------------------------------------------------------
-- Add outcome_id to action_executions
-- Step 9 writes the outcome_id back to the execution record so the
-- two layers are linked in both directions for cockpit and reporting.
-- -----------------------------------------------------------------------------

ALTER TABLE action_executions
    ADD COLUMN IF NOT EXISTS outcome_id TEXT;

CREATE INDEX IF NOT EXISTS idx_action_executions_outcome_id
    ON action_executions(outcome_id);

COMMENT ON COLUMN action_executions.outcome_id IS
    'Written by Section 6 Step 9. Links the execution record to its outcome record. '
    'NULL until Section 6 runs for this execution.';


-- -----------------------------------------------------------------------------
-- Ensure outcome_recorded is a valid status in action_queue
-- Step 9 sets action_queue.status = outcome_recorded after the outcome is created.
-- No schema change needed if status is free TEXT, but add a comment for clarity.
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN action_queue.status IS
    'pending | pending_approval | ready_for_execution | executing | '
    'completed | rejected | blocked | failed | '
    'draft_ready_pending_approval | execution_completed | outcome_recorded';


-- -----------------------------------------------------------------------------
-- Updated activity_feed view — include outcome_type and outcome_status
-- Replaces the view from 001_initial_schema.sql to join the new outcomes table.
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS activity_feed;

CREATE VIEW activity_feed AS
    SELECT
        ev.event_id,
        ev.provider,
        ev.event_type,
        ev.network_category,
        ev.reviewer_name,
        ev.rating,
        ev.review_text,
        ev.rating_content_mismatch,
        ev.handoff_eligible,
        ev.is_duplicate,
        ev.processing_status,
        ev.ai_confidence_score,
        ev.created_at,
        od.decision_id,
        od.execution_mode,
        o.outcome_id,
        o.outcome_status,
        o.outcome_type,
        o.time_to_response_hours,
        o.approval_wait_hours,
        o.posted_externally
    FROM events ev
    LEFT JOIN orchestrator_decisions od ON ev.event_id = od.event_id
    LEFT JOIN outcomes o ON ev.event_id = o.event_id
    ORDER BY ev.created_at DESC;

COMMENT ON VIEW activity_feed IS
    'Full activity feed for the cockpit. One row per Event with '
    'joined decision and outcome status. Updated in migration 005 to '
    'join the Prisma-compatible outcomes table.';


-- -----------------------------------------------------------------------------
-- pending_approvals view — updated to join outcomes
-- Shows drafts waiting for consultant or business owner approval.
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS pending_approvals;

CREATE VIEW pending_approvals AS
    SELECT
        ae.id                   AS execution_row_id,
        ae.action_execution_id,
        ae.action_id,
        ae.execution_status,
        ae.approval_owner,
        ae.approval_status,
        ae.generated_output,
        ae.created_at           AS execution_created_at,
        aq.event_id,
        aq.parameters,
        aq.priority,
        ev.reviewer_name,
        ev.rating,
        ev.review_text,
        o.outcome_id,
        o.outcome_type,
        o.outcome_status,
        o.approval_wait_hours
    FROM action_executions ae
    JOIN action_queue aq       ON ae.action_queue_id = aq.id
    JOIN events ev             ON aq.event_id = ev.event_id
    LEFT JOIN outcomes o       ON ae.action_execution_id = o.execution_id
    WHERE ae.requires_human_approval = TRUE
      AND ae.approved_at IS NULL
      AND ae.rejected_at IS NULL
    ORDER BY ae.created_at ASC;

COMMENT ON VIEW pending_approvals IS
    'All execution records waiting for human approval. '
    'Ordered oldest first. Used by the cockpit approval panel. '
    'Updated in migration 005 to include outcome fields.';


-- -----------------------------------------------------------------------------
-- Record migration
-- -----------------------------------------------------------------------------

INSERT INTO schema_migrations (version, description)
VALUES ('005', 'Section 6 Outcome — Prisma-compatible outcomes table (UUID PK), '
               'blocked_outcome_context table, outcome_id on action_executions, '
               'updated activity_feed and pending_approvals views');


-- =============================================================================
-- END OF MIGRATION 005
--
-- After running this migration:
--   1. Add the Outcome and BlockedOutcomeContext models to schema.prisma
--   2. Run: npx prisma db pull   (or manually add the models)
--   3. Run: npx prisma generate
--   4. Verify in Prisma Studio that both tables appear correctly
--   5. Then build section-6-outcome.ts
-- =============================================================================
