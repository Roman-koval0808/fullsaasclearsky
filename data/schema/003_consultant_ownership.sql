-- =============================================================================
-- ClearSky AI Decision System
-- Migration 003: Consultant Ownership + Schema Updates
-- =============================================================================
-- Run after 001 and 002.
--
--   psql clearsky < migrations/003_consultant_ownership.sql
--
-- Changes:
--   1. Add consultant ownership fields to business_configurations
--   2. Add business_management_context to signal_events
--   3. Add consultant fields to client_orchestrator_profiles
--   4. Add new execution mode enum value: consultant_review_required
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Add consultant ownership fields to business_configurations
--
-- These fields tell the Orchestrator:
--   - Who manages this client account
--   - Who should review alerts and actions first
--   - Who approves sensitive work
--   - Who handles escalations
--   - Whether the business owner sees actions directly or through the consultant
-- -----------------------------------------------------------------------------

ALTER TABLE business_configurations
    ADD COLUMN IF NOT EXISTS consultant_id              TEXT,
    ADD COLUMN IF NOT EXISTS consultant_name            TEXT,
    ADD COLUMN IF NOT EXISTS consultant_email           TEXT,
    ADD COLUMN IF NOT EXISTS consultant_phone           TEXT,
    ADD COLUMN IF NOT EXISTS consultant_role            TEXT DEFAULT 'account_manager',
                                                        -- account_manager | seo_consultant |
                                                        -- support_lead | implementation_specialist
    ADD COLUMN IF NOT EXISTS primary_internal_owner     TEXT DEFAULT 'consultant',
                                                        -- consultant | support | seo_team |
                                                        -- automation_team | business_owner
    ADD COLUMN IF NOT EXISTS default_escalation_owner   TEXT DEFAULT 'consultant',
                                                        -- consultant | business_owner |
                                                        -- on_call_support | none
    ADD COLUMN IF NOT EXISTS client_notification_mode   TEXT DEFAULT 'consultant_review_first',
                                                        -- consultant_review_first | consultant_only |
                                                        -- client_direct | both
    ADD COLUMN IF NOT EXISTS approval_route             TEXT DEFAULT 'consultant_then_client',
                                                        -- consultant_then_client | consultant_only |
                                                        -- business_owner_only | auto_if_allowed
    ADD COLUMN IF NOT EXISTS consultant_review_required BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS auto_notify_consultant     BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS auto_notify_business_owner BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS after_hours_escalation_owner TEXT DEFAULT 'consultant',
                                                        -- consultant | business_owner |
                                                        -- on_call_support | none
    ADD COLUMN IF NOT EXISTS business_owner_id          TEXT,
    ADD COLUMN IF NOT EXISTS business_owner_name        TEXT,
    ADD COLUMN IF NOT EXISTS business_owner_email       TEXT;

COMMENT ON COLUMN business_configurations.consultant_id IS
    'Assigned ClearSky consultant or account manager ID. '
    'Used by the Orchestrator to route reviews, alerts, escalations, and approvals.';

COMMENT ON COLUMN business_configurations.primary_internal_owner IS
    'Default internal owner for ClearSky-side review and action routing. '
    'consultant = consultant reviews before anything goes to client. '
    'business_owner = client sees actions directly.';

COMMENT ON COLUMN business_configurations.client_notification_mode IS
    'Controls whether the business owner is notified directly or through the consultant. '
    'consultant_review_first: consultant sees it first, decides whether to notify client. '
    'client_direct: business owner notified immediately. '
    'both: both notified simultaneously.';

COMMENT ON COLUMN business_configurations.approval_route IS
    'Approval path for sensitive/client-facing work. '
    'consultant_then_client: consultant approves first, then client confirms. '
    'consultant_only: consultant approves, client is not involved in approval. '
    'business_owner_only: client approves directly. '
    'auto_if_allowed: automatic if business policy permits.';


-- -----------------------------------------------------------------------------
-- 2. Add business_management_context to signal_events
--
-- When a Signal fires, it carries the consultant ownership context forward
-- so the Orchestrator does not need to reload it. This keeps the audit
-- trail complete — the Signal record shows what ownership context was
-- in place when the Signal was created.
-- -----------------------------------------------------------------------------

ALTER TABLE signal_events
    ADD COLUMN IF NOT EXISTS business_management_context JSONB;

COMMENT ON COLUMN signal_events.business_management_context IS
    'Snapshot of consultant ownership context at Signal creation time. '
    'Example: {"primary_internal_owner": "consultant", '
    '"consultant_review_required": true, '
    '"client_notification_mode": "consultant_review_first"}. '
    'Carried forward to the Orchestrator. Signal Detection does not use '
    'this to decide whether the Signal is valid — only to carry context.';


-- -----------------------------------------------------------------------------
-- 3. Add consultant fields to client_orchestrator_profiles
--
-- Extends the per-client Orchestrator profile with consultant-aware
-- notification and routing preferences.
-- -----------------------------------------------------------------------------

ALTER TABLE client_orchestrator_profiles
    ADD COLUMN IF NOT EXISTS consultant_notifications_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS consultant_digest_mode           BOOLEAN DEFAULT FALSE,
                                                             -- if true, batch notifications
                                                             -- rather than per-event alerts
    ADD COLUMN IF NOT EXISTS client_facing_tone              TEXT DEFAULT 'professional';
                                                             -- professional | friendly | formal


-- -----------------------------------------------------------------------------
-- 4. Add consultant_review_required to orchestrator_decisions
--    so every decision record shows whether consultant review was required
-- -----------------------------------------------------------------------------

ALTER TABLE orchestrator_decisions
    ADD COLUMN IF NOT EXISTS consultant_review_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consultant_id              TEXT,
    ADD COLUMN IF NOT EXISTS approval_route             TEXT;

COMMENT ON COLUMN orchestrator_decisions.consultant_review_required IS
    'True when the Orchestrator determined consultant review is required '
    'before any client-facing action proceeds. '
    'Set from business_configurations.consultant_review_required.';


-- -----------------------------------------------------------------------------
-- 5. Add consultant ownership to action_queue
--    so queued actions know exactly who owns them and the approval path
-- -----------------------------------------------------------------------------

ALTER TABLE action_queue
    ADD COLUMN IF NOT EXISTS consultant_id              TEXT,
    ADD COLUMN IF NOT EXISTS consultant_review_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS approval_route             TEXT,
    ADD COLUMN IF NOT EXISTS client_notification_mode   TEXT;

COMMENT ON COLUMN action_queue.consultant_review_required IS
    'When true, the action cannot proceed to the client until the '
    'consultant has reviewed and approved or forwarded it.';


-- -----------------------------------------------------------------------------
-- Record migration
-- -----------------------------------------------------------------------------

INSERT INTO schema_migrations (version, description)
VALUES ('003', 'Consultant ownership fields on business_configurations, '
               'business_management_context on signal_events, '
               'consultant fields on client_orchestrator_profiles, '
               'orchestrator_decisions, and action_queue');
