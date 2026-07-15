-- =============================================================================
-- ClearSky AI Decision System
-- Migration 004: 40-Signal Expansion + Consultant Ownership Seed Data
-- =============================================================================
-- Run after 003_consultant_ownership.sql.
--
--   psql clearsky < migrations/004_40_signals_seed.sql
--
-- This file:
--   1. Adds 19 new Action Library entries (expanding from 16 to full library)
--   2. Adds 19 new Signal rules (expanding from 21 to 40 total)
--   3. Adds signal-to-action mappings for all 40 signals
--   4. Updates APEX Contracting with consultant ownership
--   5. Updates APEX client orchestrator profile
-- =============================================================================


-- =============================================================================
-- 1. NEW ACTION LIBRARY ENTRIES
-- Adding Booking, Lead, SEO, Notification, and Task-2 action families
-- =============================================================================

INSERT INTO action_library
    (action_id, action_name, action_domain, plain_description,
     default_execution_mode, default_owner,
     required_parameters, optional_parameters,
     calls_a2p, is_public_facing)
VALUES

    -- Communication (new entries)
    ('ACT-COM-003', 'send_after_hours_acknowledgement', 'COM',
     'Send an after-hours acknowledgement to the customer confirming receipt.',
     'automatic', 'system',
     '["business_id", "customer_id", "channel", "office_hours"]',
     '["thread_id", "message_template"]',
     TRUE, TRUE),

    -- Notification actions
    ('ACT-NOTIFY-001', 'notify_owner_or_employee', 'NOTIFY',
     'Send an internal notification to the business owner or assigned employee.',
     'automatic', 'system',
     '["business_id", "owner_user_id", "message", "priority"]',
     '["consultant_id", "event_id", "signal_name"]',
     TRUE, FALSE),

    -- Task actions (urgent variant)
    ('ACT-TASK-002', 'create_urgent_lead_task', 'TASK',
     'Create an urgent lead recovery task for high-priority opportunities.',
     'automatic', 'business_owner',
     '["business_id", "lead_id", "customer_id", "urgency_reason"]',
     '["consultant_id", "estimated_value", "service_requested"]',
     FALSE, FALSE),

    -- Lead actions
    ('ACT-LEAD-001', 'create_or_update_lead', 'LEAD',
     'Create a new lead record or update an existing one from inbound activity.',
     'automatic', 'system',
     '["business_id", "customer_id", "lead_source", "service_requested"]',
     '["lead_id", "campaign_id", "intent", "urgency_level"]',
     FALSE, FALSE),

    -- Quote actions (follow-up variant)
    ('ACT-QUOTE-002', 'send_quote_follow_up', 'QUOTE',
     'Send or draft a follow-up message for an open or stale quote.',
     'approval_required', 'employee',
     '["business_id", "customer_id", "quote_id", "quote_status"]',
     '["quote_value", "days_since_sent", "consultant_id", "tone"]',
     TRUE, TRUE),

    -- Booking actions
    ('ACT-BOOK-001', 'create_reschedule_task', 'BOOK',
     'Create an appointment reschedule or recovery task after a cancellation.',
     'approval_required', 'employee',
     '["business_id", "customer_id", "appointment_id"]',
     '["cancellation_reason", "rescheduled", "preferred_time", "consultant_id"]',
     FALSE, FALSE),

    -- SEO / Visibility actions
    ('ACT-SEO-001', 'create_visibility_review_task', 'SEO',
     'Create a task to investigate and address a keyword ranking or GBP visibility decline.',
     'manual', 'consultant',
     '["business_id", "keyword", "current_rank", "previous_rank"]',
     '["market_id", "rank_change", "keyword_priority", "gbp_location_id"]',
     FALSE, FALSE),

    ('ACT-SEO-002', 'create_content_opportunity_task', 'SEO',
     'Create a content or campaign opportunity task based on a demand spike or content gap.',
     'manual', 'consultant',
     '["business_id", "keyword", "market_id", "demand_change_percent"]',
     '["service_category", "existing_content_status", "spike_threshold"]',
     FALSE, FALSE),

    -- Review / Reputation (additional entries)
    ('ACT-REV-008', 'request_review_reply_approval', 'REV',
     'Send an approval request to the consultant or business owner for a drafted review reply.',
     'automatic', 'system',
     '["business_id", "review_id", "draft_id", "approver_id"]',
     '["consultant_id", "approval_route", "review_rating"]',
     FALSE, FALSE),

    ('ACT-REV-010', 'create_process_improvement_task', 'REV',
     'Create a process improvement task when a complaint theme has repeated.',
     'approval_required', 'consultant',
     '["business_id", "complaint_theme", "evidence_count"]',
     '["review_ids", "theme_count_90d", "consultant_id"]',
     FALSE, FALSE);

-- Update ACT-REV-001 default owner to reflect consultant-first routing
UPDATE action_library
SET default_owner = 'consultant'
WHERE action_id = 'ACT-REV-001';

UPDATE action_library
SET default_owner = 'consultant'
WHERE action_id = 'ACT-REV-003';


-- =============================================================================
-- 2. NEW SIGNAL RULES (19 new signals expanding from 21 to 40 total)
--
-- Organized by Network Category.
-- All new signals have business_id = NULL (global defaults).
-- Conditions use the condition_evaluator.py format.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- COMMUNICATION SIGNALS (5 new)
-- -----------------------------------------------------------------------------

INSERT INTO signal_rules
    (signal_rule_id, signal_name, signal_bucket, event_type, network_category,
     business_id, scope, conditions, required_fields,
     cooldown_hours, default_priority, description)
VALUES

    ('SIG-COM-001', 'missed_opportunity_detected', 'Risk',
     'missed_call', 'Communication',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "first_response_completed", "operator": "=", "value": false}
     ]',
     '["business_id"]',
     1, 1,
     'An inbound call or inquiry was missed and no first response has been sent. '
     'Highest-priority leakage signal.'),

    ('SIG-COM-002', 'response_delay_risk', 'Risk',
     'inbound_sms', 'Communication',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "ai_context.urgency_level", "operator": "!=", "value": "resolved"}
     ]',
     '["business_id", "thread_id"]',
     1, 1,
     'An inbound message was received and response time is approaching or exceeding SLA.'),

    ('SIG-COM-003', 'urgent_lead_at_risk', 'Risk',
     'inbound_sms', 'Communication',
     NULL, 'global',
     '[
         {"field": "ai_context.urgency_level", "operator": "=", "value": "urgent"},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "ai_context.urgency_level"]',
     1, 1,
     'An urgent inbound lead has not received a first response within SLA.'),

    ('SIG-COM-004', 'after_hours_inquiry_detected', 'Opportunity',
     'inbound_sms', 'Communication',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "occurred_outside_business_hours", "operator": "=", "value": true}
     ]',
     '["business_id", "thread_id"]',
     2, 2,
     'An inbound inquiry arrived outside configured business hours. '
     'Creates after-hours acknowledgement or next-step handling.'),

    ('SIG-COM-005', 'repeat_inbound_no_resolution', 'Bottleneck',
     'inbound_sms', 'Communication',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "thread_id"]',
     6, 2,
     'Customer is sending repeated messages on the same thread without resolution. '
     'Indicates a customer trying again while the issue remains open.'),

    -- NOTE: event_type 'voicemail' is not used by any other signal in this file
    -- (existing Communication signals use 'missed_call' or 'inbound_sms' only) --
    -- flagged as a gap, not assumed to already exist elsewhere.
    -- NOTE: signal_bucket 'Bottleneck' is the closest of the six existing buckets
    -- (Risk / Opportunity / Bottleneck / Momentum / Performance / Competitive) but
    -- none of them really fits a data-attribution/continuity signal like this one.
    ('SIG-COM-006', 'thread_continuation_detected', 'Bottleneck',
     'voicemail', 'Communication',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "ai_context.thread_match_confidence", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "thread_id", "ai_context.thread_match_confidence"]',
     1, 2,
     'An inbound communication was AI-matched to an existing open thread (e.g. a scheduled '
     'appointment) above the confidence threshold. Reconciles thread_id to the existing '
     'thread and surfaces the match to the assigned consultant rather than treating it as '
     'a new, disconnected conversation.'),


-- -----------------------------------------------------------------------------
-- CONVERSION SIGNALS (10 new)
-- -----------------------------------------------------------------------------

    ('SIG-CONV-001', 'new_lead_captured', 'Opportunity',
     'lead_form_submitted', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id"]',
     1, 2,
     'A new lead was captured from a form submission or inbound inquiry. '
     'First conversion opportunity from a new inquiry.'),

    ('SIG-CONV-002', 'high_intent_quote_request', 'Opportunity',
     'lead_form_submitted', 'Conversion',
     NULL, 'global',
     '[
         {"field": "ai_context.intent", "operator": "=", "value": "request_quote"},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.80}
     ]',
     '["business_id", "ai_context.intent"]',
     2, 2,
     'AI-extracted intent confirms the customer wants a quote. '
     'High conversion signal.'),

    ('SIG-CONV-003', 'quote_opened_no_action', 'Opportunity',
     'quote_opened', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "quote_id"]',
     6, 2,
     'Customer opened a quote but has not signed or responded after 4+ hours. '
     'Follow-up opportunity.'),

    ('SIG-CONV-004', 'quote_stale_risk', 'Risk',
     'quote_expired', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "quote_id"]',
     24, 2,
     'A sent quote has not been signed and is approaching or past stale threshold. '
     'Prevents open quotes from going cold.'),

    ('SIG-CONV-005', 'appointment_cancelled_recovery_needed', 'Risk',
     'appointment_cancelled', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "appointment_id"]',
     4, 2,
     'An appointment was cancelled and has not been rescheduled. '
     'Recovery and reschedule opportunity.'),

    ('SIG-CONV-006', 'quote_opened_no_response_detected', 'Opportunity',
     'quote_opened', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "quote_id"]',
     6, 2,
     'Customer viewed a proposal but no response was received. '
     'Catches buying intent after proposal view.'),

    ('SIG-CONV-007', 'booking_request_not_confirmed', 'Bottleneck',
     'appointment_booked', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "appointment_id"]',
     4, 2,
     'A booking request was received but appointment has not been confirmed. '
     'Detects scheduling friction before the customer loses interest.'),

    ('SIG-CONV-008', 'lead_stage_stalled_detected', 'Bottleneck',
     'crm_lead_updated', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "lead_id"]',
     24, 2,
     'A lead has been sitting in the same CRM pipeline stage too long. '
     'Shows where leads are stuck in the sales process.'),

    ('SIG-CONV-009', 'proposal_expiring_soon_detected', 'Risk',
     'quote_expired', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "quote_id"]',
     24, 2,
     'An active proposal is approaching its expiration date and has not been signed. '
     'Triggers follow-up before the proposal expires.'),

    ('SIG-CONV-010', 'high_value_opportunity_detected', 'Opportunity',
     'crm_lead_created', 'Conversion',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "lead_id"]',
     4, 1,
     'A lead or quote value exceeds the configured high-value threshold. '
     'Elevates high-value jobs so they do not sit in normal workflow priority.'),


-- -----------------------------------------------------------------------------
-- ENGAGEMENT SIGNALS (7 new)
-- -----------------------------------------------------------------------------

    ('SIG-ENG-001', 'high_intent_engagement_detected', 'Momentum',
     'website_session_started', 'Engagement',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "session_id"]',
     12, 3,
     'A returning high-engagement user started a new session. '
     'May indicate buying intent.'),

    ('SIG-ENG-002', 'visualizer_project_saved', 'Opportunity',
     'project_scope_submitted', 'Engagement',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "project_id"]',
     12, 3,
     'A customer saved a Visualizer project. '
     'Contact available triggers consult or follow-up opportunity.'),

    ('SIG-ENG-003', 'high_intent_page_visit_detected', 'Opportunity',
     'page_viewed', 'Engagement',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "session_id"]',
     12, 3,
     'A visitor viewed a high-intent page such as quote, pricing, or contact. '
     'Identifies buying intent before a form is submitted.'),

    ('SIG-ENG-004', 'returning_visitor_interest_detected', 'Momentum',
     'website_session_started', 'Engagement',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "session_id"]',
     24, 3,
     'A returning visitor is browsing again with prior high-intent page views. '
     'Shows the same person is warming up.'),

    ('SIG-ENG-005', 'form_abandonment_detected', 'Risk',
     'website_bounce_detected', 'Engagement',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "session_id"]',
     6, 2,
     'A visitor started but did not complete a form. '
     'Detects lost lead intent.'),

    ('SIG-ENG-006', 'visualizer_project_interest_detected', 'Opportunity',
     'project_image_uploaded', 'Engagement',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "project_id"]',
     12, 3,
     'Customer is actively using the Visualizer or FotoJobber. '
     'Turns project activity into a consult opportunity.'),

    ('SIG-ENG-007', 'viewroom_engaged_session_detected', 'Momentum',
     'viewroom_session_completed', 'Engagement',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "viewroom_session_id"]',
     12, 3,
     'A customer completed a meaningful ViewRoom session. '
     'Supports follow-up after showroom-style engagement.'),


-- -----------------------------------------------------------------------------
-- VISIBILITY SIGNALS (5 new, in addition to 2 already seeded)
-- -----------------------------------------------------------------------------

    ('SIG-VIS-003', 'google_profile_visibility_decline_detected', 'Performance',
     'gbp_website_click', 'Visibility',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "gbp_location_id"]',
     24, 3,
     'GBP profile actions (views, calls, website clicks, directions) are declining. '
     'Detects visibility erosion before revenue impact is obvious.'),

    ('SIG-VIS-004', 'competitor_visibility_gain_detected', 'Competitive',
     'market_demand_shift_detected', 'Visibility',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "market_id"]',
     24, 3,
     'A competitor has improved their search ranking above the client on a high-priority keyword. '
     'Supports market defense planning.'),

    ('SIG-VIS-005', 'content_gap_opportunity_detected', 'Opportunity',
     'content_gap_detected', 'Visibility',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "keyword"]',
     24, 3,
     'A content gap was detected for a keyword with real demand. '
     'Finds missing FAQ, service page, blog, or local content.'),

    ('SIG-VIS-006', 'local_pack_absence_detected', 'Risk',
     'map_pack_position_changed', 'Visibility',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "keyword"]',
     24, 2,
     'Business is absent from the local pack for a high-priority keyword '
     'while a competitor is present.'),

    ('SIG-VIS-007', 'ai_search_visibility_gap_detected', 'Competitive',
     'content_gap_detected', 'Visibility',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id"]',
     48, 3,
     'The business is not being mentioned in AI search results for relevant prompts '
     'while competitors are. Prototype signal for AI-search visibility gaps.'),


-- -----------------------------------------------------------------------------
-- GROWTH SIGNALS (5 new)
-- -----------------------------------------------------------------------------

    ('SIG-GROW-001', 'review_theme_repeating_detected', 'Performance',
     'review_received', 'Growth',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.80}
     ]',
     '["business_id", "ai_context.complaint_topics"]',
     24, 3,
     'The same review theme has appeared multiple times in the past 90 days. '
     'Turns repeated praise or complaints into operational intelligence.'),

    ('SIG-GROW-002', 'testimonial_candidate_detected', 'Opportunity',
     'review_received', 'Growth',
     NULL, 'global',
     '[
         {"field": "rating", "operator": ">=", "value": 4},
         {"field": "ai_context.praise_topics", "operator": "exists", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.80},
         {"field": "rating_content_mismatch", "operator": "=", "value": false}
     ]',
     '["business_id", "review_id", "ai_context.praise_topics"]',
     24, 3,
     'A high-quality review with specific praise topics can become a testimonial, '
     'proof point, or website/social content.'),

    ('SIG-GROW-003', 'customer_reactivation_opportunity_detected', 'Opportunity',
     'crm_customer_created', 'Growth',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "customer_id"]',
     168, 3,
     'A past customer may be ready for seasonal or related service follow-up. '
     'Finds reactivation opportunities from the customer base.'),

    ('SIG-GROW-004', 'service_demand_pattern_detected', 'Momentum',
     'spiking_keyword_detected', 'Growth',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id", "keyword"]',
     48, 3,
     'Repeated demand for the same service is detected across search, site, forms, or CRM. '
     'Shows a pattern worth acting on.'),

    ('SIG-GROW-005', 'referral_or_word_of_mouth_detected', 'Momentum',
     'review_received', 'Growth',
     NULL, 'global',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "review_id"]',
     24, 3,
     'A review, form message, or social mention contains referral or recommendation language. '
     'Detects when trust is spreading through word of mouth.');


-- =============================================================================
-- 3. SIGNAL-TO-ACTION MAPPINGS (new signals only)
-- =============================================================================

INSERT INTO signal_action_mappings
    (signal_rule_id, action_id, business_id, is_primary, is_secondary)
VALUES

    -- SIG-COM-001: missed_opportunity_detected
    ('SIG-COM-001', 'ACT-COM-001', NULL, TRUE, FALSE),
    ('SIG-COM-001', 'ACT-TASK-001', NULL, FALSE, TRUE),
    ('SIG-COM-001', 'ACT-COM-002', NULL, FALSE, TRUE),

    -- SIG-COM-002: response_delay_risk
    ('SIG-COM-002', 'ACT-COM-002', NULL, TRUE, FALSE),
    ('SIG-COM-002', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-COM-003: urgent_lead_at_risk
    ('SIG-COM-003', 'ACT-COM-001', NULL, TRUE, FALSE),
    ('SIG-COM-003', 'ACT-TASK-002', NULL, FALSE, TRUE),
    ('SIG-COM-003', 'ACT-NOTIFY-001', NULL, FALSE, TRUE),

    -- SIG-COM-004: after_hours_inquiry_detected
    ('SIG-COM-004', 'ACT-COM-003', NULL, TRUE, FALSE),
    ('SIG-COM-004', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-COM-005: repeat_inbound_no_resolution
    ('SIG-COM-005', 'ACT-TASK-001', NULL, TRUE, FALSE),
    ('SIG-COM-005', 'ACT-NOTIFY-001', NULL, FALSE, TRUE),

    -- SIG-COM-006: thread_continuation_detected
    -- ACT-NOTIFY-001 already carries consultant_id/event_id/signal_name as optional
    -- parameters -- exact fit for "surface this reconciliation to Sarah," no new
    -- Action needed. The reconciliation itself already happened in Event Intake by
    -- the time this signal fires; this mapping is the visibility step, not the merge.
    ('SIG-COM-006', 'ACT-NOTIFY-001', NULL, TRUE, FALSE),

    -- SIG-CONV-001: new_lead_captured
    ('SIG-CONV-001', 'ACT-LEAD-001', NULL, TRUE, FALSE),
    ('SIG-CONV-001', 'ACT-COM-001', NULL, FALSE, TRUE),
    ('SIG-CONV-001', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-002: high_intent_quote_request
    ('SIG-CONV-002', 'ACT-QUOTE-001', NULL, TRUE, FALSE),
    ('SIG-CONV-002', 'ACT-COM-001', NULL, FALSE, TRUE),
    ('SIG-CONV-002', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-003: quote_opened_no_action
    ('SIG-CONV-003', 'ACT-QUOTE-002', NULL, TRUE, FALSE),
    ('SIG-CONV-003', 'ACT-COM-002', NULL, FALSE, TRUE),
    ('SIG-CONV-003', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-004: quote_stale_risk
    ('SIG-CONV-004', 'ACT-QUOTE-002', NULL, TRUE, FALSE),
    ('SIG-CONV-004', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-005: appointment_cancelled_recovery_needed
    ('SIG-CONV-005', 'ACT-BOOK-001', NULL, TRUE, FALSE),
    ('SIG-CONV-005', 'ACT-COM-002', NULL, FALSE, TRUE),
    ('SIG-CONV-005', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-006: quote_opened_no_response_detected
    ('SIG-CONV-006', 'ACT-QUOTE-002', NULL, TRUE, FALSE),
    ('SIG-CONV-006', 'ACT-COM-002', NULL, FALSE, TRUE),
    ('SIG-CONV-006', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-007: booking_request_not_confirmed
    ('SIG-CONV-007', 'ACT-BOOK-001', NULL, TRUE, FALSE),
    ('SIG-CONV-007', 'ACT-COM-002', NULL, FALSE, TRUE),
    ('SIG-CONV-007', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-008: lead_stage_stalled_detected
    ('SIG-CONV-008', 'ACT-TASK-001', NULL, TRUE, FALSE),
    ('SIG-CONV-008', 'ACT-COM-002', NULL, FALSE, TRUE),

    -- SIG-CONV-009: proposal_expiring_soon_detected
    ('SIG-CONV-009', 'ACT-QUOTE-002', NULL, TRUE, FALSE),
    ('SIG-CONV-009', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-CONV-010: high_value_opportunity_detected
    ('SIG-CONV-010', 'ACT-TASK-002', NULL, TRUE, FALSE),
    ('SIG-CONV-010', 'ACT-COM-002', NULL, FALSE, TRUE),
    ('SIG-CONV-010', 'ACT-NOTIFY-001', NULL, FALSE, TRUE),

    -- SIG-ENG-001: high_intent_engagement_detected
    ('SIG-ENG-001', 'ACT-TASK-001', NULL, TRUE, FALSE),
    ('SIG-ENG-001', 'ACT-COM-002', NULL, FALSE, TRUE),

    -- SIG-ENG-002: visualizer_project_saved
    ('SIG-ENG-002', 'ACT-COM-002', NULL, TRUE, FALSE),
    ('SIG-ENG-002', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-ENG-003: high_intent_page_visit_detected
    ('SIG-ENG-003', 'ACT-TASK-001', NULL, TRUE, FALSE),
    ('SIG-ENG-003', 'ACT-COM-002', NULL, FALSE, TRUE),

    -- SIG-ENG-004: returning_visitor_interest_detected
    ('SIG-ENG-004', 'ACT-TASK-001', NULL, TRUE, FALSE),
    ('SIG-ENG-004', 'ACT-COM-002', NULL, FALSE, TRUE),

    -- SIG-ENG-005: form_abandonment_detected
    ('SIG-ENG-005', 'ACT-TASK-001', NULL, TRUE, FALSE),
    ('SIG-ENG-005', 'ACT-COM-002', NULL, FALSE, TRUE),

    -- SIG-ENG-006: visualizer_project_interest_detected
    ('SIG-ENG-006', 'ACT-COM-002', NULL, TRUE, FALSE),
    ('SIG-ENG-006', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-ENG-007: viewroom_engaged_session_detected
    ('SIG-ENG-007', 'ACT-TASK-001', NULL, TRUE, FALSE),
    ('SIG-ENG-007', 'ACT-COM-002', NULL, FALSE, TRUE),

    -- SIG-VIS-003: google_profile_visibility_decline_detected
    ('SIG-VIS-003', 'ACT-SEO-001', NULL, TRUE, FALSE),
    ('SIG-VIS-003', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-VIS-004: competitor_visibility_gain_detected
    ('SIG-VIS-004', 'ACT-SEO-001', NULL, TRUE, FALSE),
    ('SIG-VIS-004', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-VIS-005: content_gap_opportunity_detected
    ('SIG-VIS-005', 'ACT-SEO-002', NULL, TRUE, FALSE),
    ('SIG-VIS-005', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-VIS-006: local_pack_absence_detected
    ('SIG-VIS-006', 'ACT-SEO-001', NULL, TRUE, FALSE),
    ('SIG-VIS-006', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-VIS-007: ai_search_visibility_gap_detected
    ('SIG-VIS-007', 'ACT-SEO-002', NULL, TRUE, FALSE),
    ('SIG-VIS-007', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-GROW-001: review_theme_repeating_detected
    ('SIG-GROW-001', 'ACT-REV-004', NULL, TRUE, FALSE),
    ('SIG-GROW-001', 'ACT-REV-010', NULL, FALSE, TRUE),
    ('SIG-GROW-001', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-GROW-002: testimonial_candidate_detected
    ('SIG-GROW-002', 'ACT-REV-007', NULL, TRUE, FALSE),
    ('SIG-GROW-002', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-GROW-003: customer_reactivation_opportunity_detected
    ('SIG-GROW-003', 'ACT-COM-002', NULL, TRUE, FALSE),
    ('SIG-GROW-003', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-GROW-004: service_demand_pattern_detected
    ('SIG-GROW-004', 'ACT-SEO-002', NULL, TRUE, FALSE),
    ('SIG-GROW-004', 'ACT-TASK-001', NULL, FALSE, TRUE),

    -- SIG-GROW-005: referral_or_word_of_mouth_detected
    ('SIG-GROW-005', 'ACT-REV-007', NULL, TRUE, FALSE),
    ('SIG-GROW-005', 'ACT-TASK-001', NULL, FALSE, TRUE);


-- =============================================================================
-- 4. UPDATE APEX CONTRACTING WITH CONSULTANT OWNERSHIP
-- =============================================================================

UPDATE business_configurations
SET
    consultant_id               = 'consultant_001',
    consultant_name             = 'Sarah Jenkins',
    consultant_email            = 'sarah@clearskysoftware.net',
    consultant_phone            = '+17055550001',
    consultant_role             = 'account_manager',
    primary_internal_owner      = 'consultant',
    default_escalation_owner    = 'consultant',
    client_notification_mode    = 'consultant_review_first',
    approval_route              = 'consultant_then_client',
    consultant_review_required  = TRUE,
    auto_notify_consultant      = TRUE,
    auto_notify_business_owner  = FALSE,
    after_hours_escalation_owner = 'consultant',
    business_owner_id           = 'owner_apex_001',
    business_owner_name         = 'John Smith',
    business_owner_email        = 'john@apexcontracting.ca',
    updated_at                  = NOW()
WHERE business_id = 'biz_apex_001';


-- =============================================================================
-- 5. UPDATE APEX CLIENT ORCHESTRATOR PROFILE
-- =============================================================================

UPDATE client_orchestrator_profiles
SET
    consultant_notifications_enabled = TRUE,
    consultant_digest_mode           = FALSE,
    client_facing_tone               = 'professional',
    updated_at                       = NOW()
WHERE business_id = 'biz_apex_001';


-- =============================================================================
-- RECORD MIGRATION
-- =============================================================================

INSERT INTO schema_migrations (version, description)
VALUES ('004', '40-Signal expansion — 19 new actions, 19 new signal rules, '
               'signal-to-action mappings for all 40 signals, '
               'consultant ownership seeded for APEX Contracting');


-- =============================================================================
-- END OF MIGRATION 004
--
-- Signal count is now 40 total:
--   Trust: 8 (SIG-TRUST-001 through SIG-TRUST-008 + rating_content_mismatch)
--   Communication: 5 (SIG-COM-001 through SIG-COM-005)
--   Conversion: 10 (SIG-CONV-001 through SIG-CONV-010)
--   Engagement: 7 (SIG-ENG-001 through SIG-ENG-007)
--   Visibility: 7 (SIG-VIS-001 through SIG-VIS-007)
--   Growth: 5 (SIG-GROW-001 through SIG-GROW-005)
--   System: 1 (SIG-SYS-001)
--
-- To add a new Signal: INSERT into signal_rules + signal_action_mappings.
-- To add consultant to a new client: UPDATE business_configurations.
-- =============================================================================
