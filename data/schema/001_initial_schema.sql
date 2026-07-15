-- =============================================================================
-- ClearSky AI Decision System
-- Migration 001: Initial Schema
-- =============================================================================
-- Run once to create all tables.
--
--   psql clearsky < migrations/001_initial_schema.sql
--
-- Tables follow the locked seven-section workflow:
--   Event → Signal → Orchestrator Decision → Action Queue + Parameters
--   → Execution → Outcome → Feedback
--
-- Plus the configuration tables that drive deterministic rule evaluation:
--   provider_event_registry, signal_rules, orchestrator_rules,
--   action_library, signal_action_mappings, business_configurations,
--   safety_compliance_rules
-- =============================================================================


-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search on review content


-- =============================================================================
-- CONFIGURATION TABLES
-- Rules, policies, and mappings that drive the engine.
-- These are populated by 002_seed_rules.sql.
-- To add a new Signal, insert a row here. No code changes required.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- network_categories
-- Reference table for the seven locked Network Categories.
-- Every event_type must map to exactly one of these seven.
-- The foreign key on provider_event_registry enforces this at the database
-- level — a typo in a category name is rejected immediately, not silently
-- stored as an unmapped event.
-- -----------------------------------------------------------------------------

CREATE TABLE network_categories (
    name        TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT INTO network_categories (name, description) VALUES
    ('Communication', 'Inbound and outbound voice, SMS, and email activity'),
    ('Trust',         'Reviews, reputation, and public credibility signals'),
    ('Visibility',    'Search rankings, demand, and market presence'),
    ('Engagement',    'Website sessions, content interaction, and platform activity'),
    ('Conversion',    'Quotes, bookings, forms, and revenue-generating actions'),
    ('Growth',        'Jobs won, customer creation, and long-term business expansion'),
    ('System',        'Platform health, sync errors, and internal operational events');

COMMENT ON TABLE network_categories IS
    'The seven locked Network Categories. Every provider event must map to '
    'exactly one. Adding a new category requires a deliberate change here — '
    'not just a string in the registry. This is intentional.';


-- -----------------------------------------------------------------------------
-- provider_event_registry
-- Maps provider + provider_event_name to ClearSky event_type and Network
-- Category. The engine checks this table deterministically. If a provider
-- event is not found here, it is blocked and never reaches Signal Detection.
-- -----------------------------------------------------------------------------

CREATE TABLE provider_event_registry (
    id                      SERIAL PRIMARY KEY,
    provider                TEXT NOT NULL,
    provider_event_name     TEXT NOT NULL,
    event_type              TEXT NOT NULL,
    network_category        TEXT NOT NULL REFERENCES network_categories(name),
    requires_ai_extraction  BOOLEAN DEFAULT FALSE,
    required_fields         JSONB DEFAULT '[]',
    description             TEXT,
    registry_version        TEXT NOT NULL DEFAULT '1.0',
    active                  BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_name)
);

COMMENT ON TABLE provider_event_registry IS
    'Deterministic lookup table. Maps provider + provider_event_name to '
    'ClearSky event_type and Network Category. No guessing. No AI. '
    'network_category is a foreign key — only the seven locked categories '
    'are accepted. Any other value is rejected by the database.';


-- -----------------------------------------------------------------------------
-- signal_rules
-- Defines all Signal rules. The engine queries this table at runtime for
-- rules matching the event_type of a handoff-eligible Event.
--
-- MULTI-TENANT PATTERN:
--   business_id IS NULL  = global default rule (applies to all clients)
--   business_id = 'xyz'  = client-specific override
--
-- Clients can override:
--   - conditions (adjust thresholds)
--   - cooldown_hours
--   - default_priority
--   - active (disable a Signal entirely for their business)
--
-- To add a new global Signal: INSERT with business_id = NULL.
-- To customize for a client: INSERT with business_id = 'biz_xyz'.
-- To disable a Signal for a client: INSERT override with active = FALSE.
-- -----------------------------------------------------------------------------

CREATE TABLE signal_rules (
    id                  SERIAL PRIMARY KEY,
    signal_rule_id      TEXT NOT NULL,              -- e.g. SIG-TRUST-001
    signal_name         TEXT NOT NULL,              -- e.g. positive_review_received
    signal_bucket       TEXT NOT NULL,              -- Opportunity | Risk | Bottleneck |
                                                    -- Performance | Competitive | Momentum
    event_type          TEXT NOT NULL,              -- matches events.event_type
    network_category    TEXT NOT NULL REFERENCES network_categories(name),
    business_id         TEXT,                       -- NULL = global, populated = client override
    scope               TEXT NOT NULL DEFAULT 'global',
                                                    -- global | client
    conditions          JSONB NOT NULL DEFAULT '[]',-- evaluated by condition_evaluator.py
    required_fields     JSONB NOT NULL DEFAULT '[]',-- fields that must be present to fire
    cooldown_hours      INTEGER DEFAULT 0,          -- minimum hours between fires
    default_priority    INTEGER DEFAULT 3,          -- 1 = highest, 5 = lowest
    active              BOOLEAN DEFAULT TRUE,
    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    -- Global rules must have unique signal_rule_id
    -- Client overrides can share signal_rule_id with the global rule
    CONSTRAINT uq_signal_rule_per_business
        UNIQUE (signal_rule_id, business_id)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_signal_rules_event_type ON signal_rules(event_type);
CREATE INDEX idx_signal_rules_business_id ON signal_rules(business_id);
CREATE INDEX idx_signal_rules_active ON signal_rules(active);

COMMENT ON TABLE signal_rules IS
    'All Signal rules. Global rules have business_id IS NULL. '
    'Client overrides have business_id set and share signal_rule_id '
    'with the global rule they override. '
    'Evaluated at runtime by the condition evaluator. '
    'Add rows to add new Signals. No code changes required.';

COMMENT ON COLUMN signal_rules.conditions IS
    'Array of condition objects evaluated by condition_evaluator.py. '
    'Example: [{"field": "rating", "operator": ">=", "value": 4}]. '
    'All conditions in the array must be true for the Signal to fire (AND logic). '
    'For OR logic, create separate Signal rules.';

COMMENT ON COLUMN signal_rules.business_id IS
    'NULL = global default that applies to all clients. '
    'Populated = client-specific override. Client override wins over global. '
    'To disable a Signal for one client: INSERT with active = FALSE.';


-- -----------------------------------------------------------------------------
-- action_library
-- Controlled catalog of Action IDs. Every action the system can take
-- must exist here. The Orchestrator selects from this table only.
-- -----------------------------------------------------------------------------

CREATE TABLE action_library (
    id                  SERIAL PRIMARY KEY,
    action_id           TEXT UNIQUE NOT NULL,       -- e.g. ACT-REV-001
    action_name         TEXT NOT NULL,              -- e.g. create_review_reply_draft
    action_domain       TEXT NOT NULL,              -- REV | COM | TASK | QUOTE | SYS
    plain_description   TEXT NOT NULL,
    default_execution_mode TEXT NOT NULL,           -- automatic | approval_required |
                                                    -- manual | blocked | observe_only
    default_owner       TEXT,                       -- system | employee | business_owner |
                                                    -- consultant | support | technical
    required_parameters JSONB DEFAULT '[]',         -- parameter names that must be present
    optional_parameters JSONB DEFAULT '[]',
    calls_a2p           BOOLEAN DEFAULT FALSE,      -- true if this action sends via A2P
    is_public_facing    BOOLEAN DEFAULT FALSE,      -- true if visible to customers/public
    active              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE action_library IS
    'Controlled catalog of all actions ClearSky can take. '
    'The Orchestrator selects from this table only. '
    'is_public_facing = true triggers approval_required by default '
    'unless business_configurations explicitly allows automation.';


-- -----------------------------------------------------------------------------
-- signal_action_mappings
-- Maps each Signal to its allowed/recommended Action IDs.
-- Signals do not directly execute actions. The Orchestrator uses this
-- mapping combined with business rules to select the final action.
--
-- MULTI-TENANT PATTERN:
--   business_id IS NULL  = global default mapping
--   business_id = 'xyz'  = client remaps which actions their Signals trigger
-- -----------------------------------------------------------------------------

CREATE TABLE signal_action_mappings (
    id              SERIAL PRIMARY KEY,
    signal_rule_id  TEXT NOT NULL REFERENCES signal_rules(signal_rule_id),
    action_id       TEXT NOT NULL REFERENCES action_library(action_id),
    business_id     TEXT,                   -- NULL = global, populated = client override
    is_primary      BOOLEAN DEFAULT FALSE,
    is_secondary    BOOLEAN DEFAULT FALSE,
    conditions      JSONB DEFAULT '[]',     -- optional extra conditions for this mapping
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_signal_action_per_business
        UNIQUE (signal_rule_id, action_id, business_id)
        DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON COLUMN signal_action_mappings.business_id IS
    'NULL = global default mapping. '
    'Populated = client has remapped this Signal to different Actions. '
    'Client mappings replace global mappings for that Signal entirely.';


-- -----------------------------------------------------------------------------
-- client_orchestrator_profiles
-- Master profile per client defining their Orchestrator personality.
-- The single source of truth for what each client has customized.
--
-- This is the top-level configuration that governs how the Orchestrator
-- behaves for a specific business. Think of it as the client's
-- "Orchestrator settings page" in the SaaS admin panel.
-- -----------------------------------------------------------------------------

CREATE TABLE client_orchestrator_profiles (
    id                          SERIAL PRIMARY KEY,
    business_id                 TEXT UNIQUE NOT NULL
                                REFERENCES business_configurations(business_id),
    profile_name                TEXT NOT NULL DEFAULT 'Default',

    -- Automation personality
    automation_level            TEXT NOT NULL DEFAULT 'standard',
                                -- conservative | standard | aggressive
                                -- conservative: everything requires approval
                                -- standard:     internal actions auto, public needs approval
                                -- aggressive:   most actions auto, exceptions require approval

    -- Allowed action domains (NULL = all allowed)
    allowed_action_domains      JSONB DEFAULT NULL,
                                -- e.g. ["REV", "COM"] to restrict to review and comm actions only

    -- Disabled Signals for this client (global Signals they have turned off)
    disabled_signal_ids         JSONB DEFAULT '[]',
                                -- e.g. ["SIG-TRUST-005"] to disable proof point tracking

    -- Default execution mode overrides by action domain
    domain_execution_modes      JSONB DEFAULT '{}',
                                -- e.g. {"REV": "approval_required", "TASK": "automatic"}

    -- Default owner overrides by action domain
    domain_owners               JSONB DEFAULT '{}',
                                -- e.g. {"REV": "business_owner", "TASK": "employee"}

    -- Whether this client has a dedicated consultant who handles escalations
    has_consultant              BOOLEAN DEFAULT FALSE,
    consultant_email            TEXT,

    -- Notification preferences
    notify_owner_on_escalation  BOOLEAN DEFAULT TRUE,
    notify_owner_on_draft       BOOLEAN DEFAULT TRUE,
    notify_owner_on_auto        BOOLEAN DEFAULT FALSE,

    -- AI draft preferences
    preferred_reply_length      TEXT DEFAULT 'medium',
                                -- short | medium | long
    include_business_name       BOOLEAN DEFAULT TRUE,
    include_call_to_action      BOOLEAN DEFAULT FALSE,

    active                      BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE client_orchestrator_profiles IS
    'Master per-client Orchestrator configuration. '
    'Controls automation level, allowed actions, disabled Signals, '
    'execution mode overrides, and AI draft preferences. '
    'This is what a client configures in their SaaS settings panel. '
    'The Orchestrator reads this before applying any rules.';

COMMENT ON COLUMN client_orchestrator_profiles.automation_level IS
    'conservative: all actions require human approval. '
    'standard: internal/logging actions run automatically, '
    '          public-facing actions require approval. '
    'aggressive: most actions run automatically, '
    '            only sensitive actions require approval. '
    'Safety rules always override this setting.';


-- -----------------------------------------------------------------------------
-- orchestrator_rules
-- Decision logic for the Orchestrator. Controls Signal ranking, suppression,
-- dominant Signal selection, execution mode overrides, and ownership.
--
-- MULTI-TENANT PATTERN:
--   business_id IS NULL  = global default rule (applies to all clients)
--   business_id = 'xyz'  = client-specific override (applies to that client only)
--
-- Loading order at runtime:
--   1. Global defaults loaded first  (business_id IS NULL)
--   2. Client overrides loaded second (business_id = client)
--   3. Client overrides win where they conflict with global defaults
--   4. Safety compliance rules always win over everything
--
-- Clients can customize:
--   - execution_mode per Signal (approval_required -> automatic, etc.)
--   - owner per Signal (business_owner -> employee)
--   - priority_override per Signal
--   - suppress_signals (disable certain Signals for their business)
--   - block specific actions entirely
--
-- Clients cannot customize:
--   - Safety compliance rules (those are global and non-negotiable)
--   - Adding new Action IDs not in the Action Library
-- -----------------------------------------------------------------------------

CREATE TABLE orchestrator_rules (
    id                  SERIAL PRIMARY KEY,
    rule_id             TEXT UNIQUE NOT NULL,
    rule_name           TEXT NOT NULL,
    business_id         TEXT,                   -- NULL = global, populated = client override
    scope               TEXT NOT NULL DEFAULT 'global',
                                                -- global | client
    signal_rule_id      TEXT REFERENCES signal_rules(signal_rule_id),
    conditions          JSONB DEFAULT '[]',
    execution_mode      TEXT,                   -- overrides action_library default if set
    owner               TEXT,                   -- overrides action_library default if set
    priority_override   INTEGER,
    suppress_signals    JSONB DEFAULT '[]',      -- signal_rule_ids to suppress if this fires
    block_reason        TEXT,                   -- populated if execution_mode = blocked
    is_safety_rule      BOOLEAN DEFAULT FALSE,  -- TRUE = cannot be overridden by client
    active              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    -- A client can only have one override rule per signal_rule_id
    CONSTRAINT uq_client_signal_rule
        UNIQUE (business_id, signal_rule_id)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_orchestrator_rules_business_id
    ON orchestrator_rules(business_id);
CREATE INDEX idx_orchestrator_rules_signal_rule_id
    ON orchestrator_rules(signal_rule_id);
CREATE INDEX idx_orchestrator_rules_scope
    ON orchestrator_rules(scope);

COMMENT ON TABLE orchestrator_rules IS
    'Orchestrator decision rules. Global defaults have business_id IS NULL. '
    'Client overrides have business_id set. Client overrides win over globals. '
    'Safety rules (is_safety_rule = TRUE) cannot be overridden by clients.';

COMMENT ON COLUMN orchestrator_rules.business_id IS
    'NULL = global default rule that applies to all clients. '
    'Populated = client-specific override that applies to that client only. '
    'Client overrides take precedence over global defaults.';

COMMENT ON COLUMN orchestrator_rules.is_safety_rule IS
    'Safety rules are global and non-negotiable. '
    'They cannot be disabled or overridden by client configuration. '
    'Example: no auto-posting of public replies without human approval.';


-- -----------------------------------------------------------------------------
-- business_configurations
-- Per-business automation policies, approval requirements, SLA, tone,
-- and channel permissions. The Orchestrator reads this table to determine
-- whether an action can proceed automatically or requires approval.
-- -----------------------------------------------------------------------------

CREATE TABLE business_configurations (
    id                          SERIAL PRIMARY KEY,
    business_id                 TEXT UNIQUE NOT NULL,
    business_name               TEXT NOT NULL,
    automation_level            TEXT DEFAULT 'standard',
                                -- standard | conservative | aggressive
    review_reply_policy         TEXT DEFAULT 'draft_only',
                                -- draft_only | auto_post | manual_only
    public_response_requires_approval BOOLEAN DEFAULT TRUE,
    sms_requires_approval       BOOLEAN DEFAULT TRUE,
    email_requires_approval     BOOLEAN DEFAULT TRUE,
    office_hours_start          TIME DEFAULT '08:00',
    office_hours_end            TIME DEFAULT '17:00',
    office_timezone             TEXT DEFAULT 'America/Toronto',
    brand_tone                  TEXT DEFAULT 'professional',
                                -- professional | friendly | formal | casual
    sla_response_hours          INTEGER DEFAULT 24,
    escalation_contact          TEXT,
    active                      BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE business_configurations IS
    'Per-business automation policies. The Orchestrator reads this table '
    'to determine execution mode. public_response_requires_approval = true '
    'means nothing is posted publicly without human approval, regardless '
    'of what the action_library default says.';


-- -----------------------------------------------------------------------------
-- safety_compliance_rules
-- Global safety rules that override everything else.
-- If a safety rule matches, the action is blocked regardless of business config.
-- -----------------------------------------------------------------------------

CREATE TABLE safety_compliance_rules (
    id              SERIAL PRIMARY KEY,
    rule_id         TEXT UNIQUE NOT NULL,
    rule_name       TEXT NOT NULL,
    description     TEXT,
    conditions      JSONB DEFAULT '[]',
    block_reason    TEXT NOT NULL,
    severity        TEXT DEFAULT 'high',    -- high | medium | low
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- WORKFLOW TABLES
-- Records produced by the seven-section engine as it processes each Event.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- raw_inputs
-- Stores the untouched provider payload exactly as received.
-- Never overwritten. Source of truth for what the provider sent.
-- Used for audit, debugging, replay, and compliance.
-- -----------------------------------------------------------------------------

CREATE TABLE raw_inputs (
    id              SERIAL PRIMARY KEY,
    trace_id        TEXT NOT NULL,
    provider        TEXT NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload     JSONB NOT NULL,
    source_ip       TEXT,
    webhook_headers JSONB
);

CREATE INDEX idx_raw_inputs_trace_id ON raw_inputs(trace_id);
CREATE INDEX idx_raw_inputs_provider ON raw_inputs(provider);
CREATE INDEX idx_raw_inputs_received_at ON raw_inputs(received_at);


-- -----------------------------------------------------------------------------
-- events
-- Section 1 output. The normalized ClearSky Event Object.
-- The official record of what happened, cleaned and structured.
-- -----------------------------------------------------------------------------

CREATE TABLE events (
    id                      SERIAL PRIMARY KEY,
    event_id                TEXT UNIQUE NOT NULL,
    trace_id                TEXT NOT NULL,
    provider                TEXT NOT NULL,
    provider_event_name     TEXT NOT NULL,
    provider_event_id       TEXT,                   -- provider's own ID for dedup
    event_type              TEXT,
    network_category        TEXT REFERENCES network_categories(name),
    registry_version        TEXT DEFAULT '1.0',

    -- Timing
    occurred_at             TIMESTAMPTZ,
    received_at             TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Relationships
    business_id             TEXT,
    customer_id             TEXT,
    lead_id                 TEXT,
    thread_id               TEXT,
    quote_id                TEXT,
    appointment_id          TEXT,
    campaign_id             TEXT,
    market_id               TEXT,

    -- GBP-specific normalized fields
    gbp_location_id         TEXT,
    gbp_review_id           TEXT,
    reviewer_name           TEXT,
    rating                  INTEGER,
    review_text             TEXT,

    -- AI extraction
    requires_ai_extraction  BOOLEAN DEFAULT FALSE,
    ai_extraction_completed BOOLEAN DEFAULT FALSE,
    ai_context              JSONB,
    ai_confidence_score     FLOAT,
    ai_context_quality      TEXT,                   -- high | medium | low

    -- Payloads
    raw_payload             JSONB NOT NULL,
    normalized_payload      JSONB,

    -- Flags
    business_matched        BOOLEAN DEFAULT FALSE,
    customer_matched        BOOLEAN DEFAULT FALSE,
    lead_matched            BOOLEAN DEFAULT FALSE,
    thread_matched          BOOLEAN DEFAULT FALSE,
    is_duplicate            BOOLEAN DEFAULT FALSE,
    duplicate_of_event_id   TEXT,
    rating_content_mismatch BOOLEAN DEFAULT FALSE,  -- true when rating/sentiment conflict
    handoff_eligible        BOOLEAN DEFAULT FALSE,

    -- Audit
    processing_status       TEXT DEFAULT 'received',
    normalization_error     TEXT,
    retry_count             INTEGER DEFAULT 0
);

CREATE INDEX idx_events_event_id ON events(event_id);
CREATE INDEX idx_events_trace_id ON events(trace_id);
CREATE INDEX idx_events_business_id ON events(business_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_handoff_eligible ON events(handoff_eligible);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_gbp_review_id ON events(gbp_review_id);
CREATE INDEX idx_events_is_duplicate ON events(is_duplicate);

COMMENT ON COLUMN events.rating_content_mismatch IS
    'Set to true when star rating and AI-extracted sentiment conflict. '
    'Example: 1-star rating with positive review text, or 5-star with '
    'negative sentiment. Triggers rating_content_mismatch_detected Signal.';


-- -----------------------------------------------------------------------------
-- event_processing_logs
-- Status change trail for each Event as it moves through intake.
-- Used for debugging, retry logic, and admin review of failed Events.
-- -----------------------------------------------------------------------------

CREATE TABLE event_processing_logs (
    id          SERIAL PRIMARY KEY,
    event_id    TEXT NOT NULL,
    status      TEXT NOT NULL,
    message     TEXT,
    detail      JSONB,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_processing_logs_event_id ON event_processing_logs(event_id);


-- -----------------------------------------------------------------------------
-- signal_events
-- Section 2 output. Signal candidates that fired for a handoff-eligible Event.
-- Multiple Signals can fire from one Event. The Orchestrator receives all of
-- them and selects the dominant Signal.
-- -----------------------------------------------------------------------------

CREATE TABLE signal_events (
    id                  SERIAL PRIMARY KEY,
    signal_event_id     TEXT UNIQUE NOT NULL,
    event_id            TEXT NOT NULL REFERENCES events(event_id),
    signal_rule_id      TEXT NOT NULL REFERENCES signal_rules(signal_rule_id),
    signal_name         TEXT NOT NULL,
    signal_bucket       TEXT NOT NULL,
    priority            INTEGER,
    confidence_score    FLOAT,
    conditions_met      JSONB,              -- snapshot of which conditions matched
    ai_fields_used      JSONB,              -- which AI context fields contributed
    status              TEXT DEFAULT 'candidate',   -- candidate | valid | suppressed | expired
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signal_events_event_id ON signal_events(event_id);
CREATE INDEX idx_signal_events_signal_rule_id ON signal_events(signal_rule_id);
CREATE INDEX idx_signal_events_status ON signal_events(status);


-- -----------------------------------------------------------------------------
-- orchestrator_decisions
-- Section 3 output. The auditable record of what the Orchestrator decided
-- and why. Every field that influenced the decision is stored here.
-- -----------------------------------------------------------------------------

CREATE TABLE orchestrator_decisions (
    id                      SERIAL PRIMARY KEY,
    decision_id             TEXT UNIQUE NOT NULL,
    event_id                TEXT NOT NULL REFERENCES events(event_id),
    dominant_signal_id      TEXT REFERENCES signal_events(signal_event_id),
    supporting_signal_ids   JSONB DEFAULT '[]',
    selected_action_ids     JSONB DEFAULT '[]',
    blocked_action_ids      JSONB DEFAULT '[]',
    execution_mode          TEXT NOT NULL,
    owner                   TEXT,
    priority                INTEGER,
    reason                  TEXT,
    business_config_snapshot JSONB,         -- snapshot of business config at decision time
    safety_checks_passed    BOOLEAN DEFAULT TRUE,
    cooldown_active         BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orchestrator_decisions_event_id ON orchestrator_decisions(event_id);
CREATE INDEX idx_orchestrator_decisions_decision_id ON orchestrator_decisions(decision_id);


-- -----------------------------------------------------------------------------
-- action_queue
-- Section 4 output. The work items created from Orchestrator decisions.
-- Each queue record maps to one Action ID with all required parameters.
-- -----------------------------------------------------------------------------

CREATE TABLE action_queue (
    id                  SERIAL PRIMARY KEY,
    action_queue_id     TEXT UNIQUE NOT NULL,
    event_id            TEXT NOT NULL REFERENCES events(event_id),
    decision_id         TEXT NOT NULL REFERENCES orchestrator_decisions(decision_id),
    action_id           TEXT NOT NULL REFERENCES action_library(action_id),
    action_type         TEXT NOT NULL,
    execution_mode      TEXT NOT NULL,
    execution_lane      TEXT NOT NULL,      -- automatic | approval_required | manual |
                                            -- blocked | observe_only
    priority            INTEGER,
    status              TEXT DEFAULT 'pending',
                                            -- pending | pending_approval | ready_for_execution |
                                            -- executing | completed | rejected | blocked | failed
    assigned_to         TEXT,
    parameters          JSONB DEFAULT '{}',
    block_reason        TEXT,               -- populated if execution_lane = blocked
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_action_queue_event_id ON action_queue(event_id);
CREATE INDEX idx_action_queue_decision_id ON action_queue(decision_id);
CREATE INDEX idx_action_queue_status ON action_queue(status);
CREATE INDEX idx_action_queue_execution_lane ON action_queue(execution_lane);


-- -----------------------------------------------------------------------------
-- executions
-- Section 5 output. Records what happened when an action was executed
-- or prepared for human review.
-- -----------------------------------------------------------------------------

CREATE TABLE executions (
    id                          SERIAL PRIMARY KEY,
    execution_id                TEXT UNIQUE NOT NULL,
    action_queue_id             TEXT NOT NULL REFERENCES action_queue(action_queue_id),
    execution_status            TEXT NOT NULL,
                                -- draft_created | sent_to_a2p | completed | failed |
                                -- pending_approval | rejected | blocked
    execution_mode              TEXT NOT NULL,
    generated_output            JSONB,      -- the draft reply, message content, etc.
    requires_human_approval     BOOLEAN DEFAULT FALSE,
    approved_at                 TIMESTAMPTZ,
    approved_by                 TEXT,
    rejected_at                 TIMESTAMPTZ,
    rejected_by                 TEXT,
    human_edited                BOOLEAN DEFAULT FALSE,
    edited_output               JSONB,      -- stores the edited version if human changed draft
    a2p_request_payload         JSONB,      -- what was sent to the A2P simulator
    a2p_response_payload        JSONB,      -- what the A2P returned
    posted_externally           BOOLEAN DEFAULT FALSE,
    external_post_id            TEXT,       -- GBP reply ID, SMS ID, etc.
    failure_reason              TEXT,
    retry_count                 INTEGER DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_executions_action_queue_id ON executions(action_queue_id);
CREATE INDEX idx_executions_execution_status ON executions(execution_status);
CREATE INDEX idx_executions_requires_human_approval ON executions(requires_human_approval);


-- -----------------------------------------------------------------------------
-- outcomes
-- Section 6 output. Records what happened after execution.
-- Closes the action loop and gives ClearSky a measurable record.
-- -----------------------------------------------------------------------------

CREATE TABLE outcomes (
    id                      SERIAL PRIMARY KEY,
    outcome_id              TEXT UNIQUE NOT NULL,
    event_id                TEXT NOT NULL REFERENCES events(event_id),
    decision_id             TEXT NOT NULL REFERENCES orchestrator_decisions(decision_id),
    action_queue_id         TEXT NOT NULL REFERENCES action_queue(action_queue_id),
    execution_id            TEXT NOT NULL REFERENCES executions(execution_id),
    outcome_type            TEXT NOT NULL,
                            -- draft_created | approved | edited_before_approval | posted |
                            -- sent | assigned | completed | rejected | failed |
                            -- no_action_taken | blocked_preserved
    outcome_status          TEXT NOT NULL,
                            -- completed | partial | waiting | blocked | failed
    time_to_response_hours  FLOAT,
    approval_wait_hours     FLOAT,
    human_edited            BOOLEAN DEFAULT FALSE,
    posted_externally       BOOLEAN DEFAULT FALSE,
    details                 JSONB,
    do_not_count_as_success BOOLEAN DEFAULT FALSE,  -- true for blocked/preserved outcomes
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outcomes_event_id ON outcomes(event_id);
CREATE INDEX idx_outcomes_outcome_status ON outcomes(outcome_status);


-- -----------------------------------------------------------------------------
-- feedback
-- Section 7 output. Records whether the system made a useful decision.
-- Drives rule tuning, template improvement, and reporting.
-- No automatic rule changes. Tuning candidates only.
-- -----------------------------------------------------------------------------

CREATE TABLE feedback (
    id                          SERIAL PRIMARY KEY,
    feedback_id                 TEXT UNIQUE NOT NULL,
    event_id                    TEXT NOT NULL REFERENCES events(event_id),
    decision_id                 TEXT NOT NULL REFERENCES orchestrator_decisions(decision_id),
    action_queue_id             TEXT NOT NULL REFERENCES action_queue(action_queue_id),
    signal_validated            BOOLEAN,
    dominant_signal_correct     BOOLEAN,
    action_appropriate          BOOLEAN,
    approval_mode_correct       BOOLEAN,
    ai_output_edited            BOOLEAN,
    action_completed            BOOLEAN,
    time_to_completion_hours    FLOAT,
    tuning_candidates           JSONB DEFAULT '[]',
                                -- list of suggested rule/threshold adjustments for review
    completion_state            TEXT DEFAULT 'waiting',
                                -- waiting | partial | complete
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_event_id ON feedback(event_id);
CREATE INDEX idx_feedback_completion_state ON feedback(completion_state);


-- =============================================================================
-- VIEWS
-- Convenience views for the cockpit and reporting.
-- =============================================================================


-- Pending approvals — what the business owner needs to act on
CREATE VIEW pending_approvals AS
    SELECT
        e.execution_id,
        e.action_queue_id,
        aq.event_id,
        aq.action_id,
        aq.action_type,
        aq.parameters,
        e.generated_output,
        ev.reviewer_name,
        ev.rating,
        ev.review_text,
        ev.gbp_location_id,
        ev.ai_context,
        ev.rating_content_mismatch,
        aq.created_at AS queued_at
    FROM executions e
    JOIN action_queue aq ON e.action_queue_id = aq.action_queue_id
    JOIN events ev ON aq.event_id = ev.event_id
    WHERE e.execution_status = 'draft_created'
      AND e.requires_human_approval = TRUE
      AND e.approved_at IS NULL
      AND e.rejected_at IS NULL
    ORDER BY aq.priority ASC, aq.created_at ASC;

COMMENT ON VIEW pending_approvals IS
    'All items waiting for business owner approval. '
    'Ordered by priority then age. Used by the cockpit approval panel.';


-- Activity feed — everything that has come through the system
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
        o.outcome_status,
        o.outcome_type
    FROM events ev
    LEFT JOIN orchestrator_decisions od ON ev.event_id = od.event_id
    LEFT JOIN outcomes o ON ev.event_id = o.event_id
    ORDER BY ev.created_at DESC;

COMMENT ON VIEW activity_feed IS
    'Full activity feed for the cockpit. One row per Event with '
    'joined decision and outcome status. Used by the left column of the cockpit.';


-- Blocked actions — what the system refused to do and why
CREATE VIEW blocked_actions_log AS
    SELECT
        aq.action_queue_id,
        aq.event_id,
        aq.action_id,
        aq.action_type,
        aq.block_reason,
        aq.created_at,
        ev.reviewer_name,
        ev.rating,
        ev.review_text
    FROM action_queue aq
    JOIN events ev ON aq.event_id = ev.event_id
    WHERE aq.execution_lane = 'blocked'
    ORDER BY aq.created_at DESC;

COMMENT ON VIEW blocked_actions_log IS
    'All actions the system blocked and why. '
    'Used by the blocked and auto-handled panel in the cockpit.';


-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================

CREATE TABLE schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Initial schema — network_categories, multi-tenant signal_rules, '
               'orchestrator_rules with global/client scope, '
               'client_orchestrator_profiles, all workflow tables, '
               'indexes, views, and foreign key constraints');

-- =============================================================================
-- END OF MIGRATION 001
-- Run 002_seed_rules.sql next to populate configuration tables.
-- =============================================================================
