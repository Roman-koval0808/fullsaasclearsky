-- =============================================================================
-- ClearSky AI Decision System
-- Migration 002: Seed Rules
-- =============================================================================
-- Run after 001_initial_schema.sql.
--
--   psql clearsky < migrations/002_seed_rules.sql
--
-- This file populates all configuration tables:
--   1. Provider Event Registry
--   2. Action Library
--   3. Signal Rules (20 MVP Signals + rating_content_mismatch_detected)
--   4. Signal-to-Action Mappings
--   5. Orchestrator Rules
--   6. Safety Compliance Rules
--   7. Business Configurations (APEX Contracting demo business)
--
-- To add a new Signal: INSERT a row into signal_rules and
-- signal_action_mappings. No code changes required.
-- To disable a Signal: UPDATE signal_rules SET active = false WHERE signal_rule_id = '...';
-- To adjust a threshold: UPDATE signal_rules SET conditions = '...' WHERE signal_rule_id = '...';
-- =============================================================================


-- =============================================================================
-- 1. PROVIDER EVENT REGISTRY
-- =============================================================================

INSERT INTO provider_event_registry
    (provider, provider_event_name, event_type, network_category,
     requires_ai_extraction, required_fields, description)
VALUES

    -- -------------------------------------------------------------------------
    -- 1. ClearSky Website / Forms
    -- -------------------------------------------------------------------------
    ('clearsky_website_forms', 'form.submitted', 'lead_form_submitted', 'Conversion',
     TRUE, '["form_id"]',
     'A website lead capture or quote request form was submitted.'),

    ('clearsky_website_forms', 'cta.clicked', 'cta_clicked', 'Engagement',
     FALSE, '["cta_id", "page_url"]',
     'A call-to-action button was clicked on the website.'),

    -- -------------------------------------------------------------------------
    -- 2. Telnyx Voice
    -- -------------------------------------------------------------------------
    ('telnyx_voice', 'call.initiated', 'call_started', 'Communication',
     FALSE, '["from", "to"]',
     'An inbound or outbound call was initiated.'),

    ('telnyx_voice', 'call.answered', 'call_answered', 'Communication',
     FALSE, '["from", "to"]',
     'A call was answered.'),

    ('telnyx_voice', 'call.no_answer', 'missed_call', 'Communication',
     FALSE, '["from", "to"]',
     'An inbound call was not answered.'),

    ('telnyx_voice', 'call.completed', 'call_completed', 'Communication',
     FALSE, '["from", "to"]',
     'A call was completed.'),

    ('telnyx_voice', 'call.voicemail', 'voicemail_received', 'Communication',
     TRUE, '["from", "to"]',
     'A voicemail was left by a caller. AI extracts intent and urgency.'),

    ('telnyx_voice', 'call.recording_available', 'call_recording_available', 'Communication',
     FALSE, '["call_id", "recording_url"]',
     'A call recording is available for review or transcription.'),

    ('telnyx_voice', 'call.transcript_available', 'call_transcript_available', 'Communication',
     TRUE, '["call_id", "transcript_text"]',
     'A call transcript is available. AI extracts intent, service, and outcome.'),

    -- -------------------------------------------------------------------------
    -- 3. Telnyx SMS / A2P Messaging
    -- -------------------------------------------------------------------------
    ('telnyx_sms', 'message.received', 'inbound_sms', 'Communication',
     TRUE, '["from", "to", "text"]',
     'An inbound SMS was received. AI extracts intent and urgency.'),

    ('telnyx_sms', 'message.sent', 'outbound_sms_sent', 'Communication',
     FALSE, '["from", "to", "message_id"]',
     'An outbound SMS was sent via the A2P.'),

    ('telnyx_sms', 'message.delivered', 'outbound_sms_delivered', 'System',
     FALSE, '["message_id"]',
     'An outbound SMS was confirmed delivered.'),

    ('telnyx_sms', 'message.failed', 'outbound_sms_failed', 'System',
     FALSE, '["message_id", "error_code"]',
     'An outbound SMS failed to deliver.'),

    ('telnyx_sms', 'message.opt_out', 'sms_opt_out_received', 'Communication',
     FALSE, '["from", "to"]',
     'A recipient opted out of SMS messaging. Must be honoured immediately.'),

    -- -------------------------------------------------------------------------
    -- 4. Email Provider / Communication Hub
    -- -------------------------------------------------------------------------
    ('email_provider', 'email.received', 'inbound_email', 'Communication',
     TRUE, '["from", "to", "subject"]',
     'An inbound email was received. AI extracts intent, urgency, and topic.'),

    ('email_provider', 'email.sent', 'outbound_email_sent', 'Communication',
     FALSE, '["from", "to", "message_id"]',
     'An outbound email was sent.'),

    ('email_provider', 'email.opened', 'email_opened', 'Engagement',
     FALSE, '["message_id", "recipient"]',
     'An outbound email was opened by the recipient.'),

    ('email_provider', 'email.clicked', 'email_link_clicked', 'Engagement',
     FALSE, '["message_id", "link_url"]',
     'A link inside an outbound email was clicked.'),

    ('email_provider', 'email.bounced', 'email_bounced', 'System',
     FALSE, '["message_id", "bounce_type"]',
     'An outbound email bounced. Hard or soft bounce recorded.'),

    -- -------------------------------------------------------------------------
    -- 5. Google Business Profile
    -- -------------------------------------------------------------------------
    ('google_business_profile', 'review.created', 'review_received', 'Trust',
     TRUE, '["location_id", "rating"]',
     'A new customer review was posted to Google Business Profile.'),

    ('google_business_profile', 'review.updated', 'review_updated', 'Trust',
     TRUE, '["location_id", "rating"]',
     'An existing Google Business Profile review was updated.'),

    ('google_business_profile', 'review.deleted', 'review_deleted', 'Trust',
     FALSE, '["location_id", "review_id"]',
     'A Google Business Profile review was deleted.'),

    ('google_business_profile', 'profile.call_click', 'gbp_call_click', 'Communication',
     FALSE, '["location_id"]',
     'A visitor clicked the call button on the Google Business Profile.'),

    ('google_business_profile', 'profile.website_click', 'gbp_website_click', 'Visibility',
     FALSE, '["location_id"]',
     'A visitor clicked through to the website from the Google Business Profile.'),

    ('google_business_profile', 'profile.direction_request', 'gbp_direction_request', 'Engagement',
     FALSE, '["location_id"]',
     'A visitor requested directions to the business via Google.'),

    ('google_business_profile', 'post.published', 'gbp_post_published', 'Visibility',
     FALSE, '["location_id", "post_id"]',
     'A post was published to the Google Business Profile.'),

    -- -------------------------------------------------------------------------
    -- 6. DataForSEO / SEO Data Provider
    -- -------------------------------------------------------------------------
    ('dataforseo', 'keyword.rank_changed', 'keyword_position_changed', 'Visibility',
     FALSE, '["keyword", "old_rank", "new_rank"]',
     'A tracked keyword changed ranking position in organic search.'),

    ('dataforseo', 'keyword.map_pack_rank_changed', 'map_pack_position_changed', 'Visibility',
     FALSE, '["keyword", "old_rank", "new_rank"]',
     'A tracked keyword changed position in the Google Map Pack.'),

    ('dataforseo', 'serp.feature_detected', 'serp_feature_detected', 'Visibility',
     FALSE, '["keyword", "feature_type"]',
     'A SERP feature (featured snippet, knowledge panel, etc.) was detected for a tracked keyword.'),

    -- -------------------------------------------------------------------------
    -- 7. Website Analytics / Matomo
    -- -------------------------------------------------------------------------
    ('matomo', 'page.viewed', 'page_viewed', 'Engagement',
     FALSE, '["page_url", "session_id"]',
     'A page was viewed on the business website.'),

    ('matomo', 'session.started', 'website_session_started', 'Engagement',
     FALSE, '["session_id", "traffic_source"]',
     'A new website session was started.'),

    ('matomo', 'goal.completed', 'website_goal_completed', 'Conversion',
     FALSE, '["goal_id", "session_id"]',
     'A configured conversion goal was completed on the website.'),

    ('matomo', 'traffic.source_detected', 'traffic_source_detected', 'Visibility',
     FALSE, '["traffic_source", "session_id"]',
     'A traffic source was identified for a new website session.'),

    ('matomo', 'session.bounce', 'website_bounce_detected', 'Engagement',
     FALSE, '["session_id", "page_url"]',
     'A website session ended after one page view with no engagement.'),

    -- -------------------------------------------------------------------------
    -- 8. ClearSky ViewRoom
    -- -------------------------------------------------------------------------
    ('clearsky_viewroom', 'room.created', 'viewroom_created', 'Engagement',
     FALSE, '["room_id", "business_id"]',
     'A virtual showroom session was created for a customer.'),

    ('clearsky_viewroom', 'participant.joined', 'viewroom_participant_joined', 'Engagement',
     FALSE, '["room_id", "participant_id"]',
     'A participant joined a ViewRoom session.'),

    ('clearsky_viewroom', 'asset.shared', 'viewroom_asset_shared', 'Engagement',
     FALSE, '["room_id", "asset_id", "asset_type"]',
     'An asset was shared inside a ViewRoom session.'),

    ('clearsky_viewroom', 'session.completed', 'viewroom_session_completed', 'Conversion',
     FALSE, '["room_id", "duration_seconds"]',
     'A ViewRoom session was completed.'),

    ('clearsky_viewroom', 'booking.requested', 'viewroom_booking_requested', 'Conversion',
     TRUE, '["room_id", "participant_id"]',
     'A booking request was made from inside a ViewRoom session.'),

    -- -------------------------------------------------------------------------
    -- 9. ClearSky Visualizer / FotoJobber
    -- -------------------------------------------------------------------------
    ('clearsky_visualizer', 'image.uploaded', 'project_image_uploaded', 'Engagement',
     FALSE, '["project_id", "image_id"]',
     'A project photo was uploaded to the Visualizer.'),

    ('clearsky_visualizer', 'design.submitted', 'design_submitted', 'Conversion',
     FALSE, '["project_id", "design_id"]',
     'A design was submitted by the customer or team.'),

    ('clearsky_visualizer', 'material.selected', 'material_selected', 'Engagement',
     FALSE, '["project_id", "material_id"]',
     'A material selection was made inside the Visualizer.'),

    ('clearsky_visualizer', 'photo.annotated', 'project_photo_annotated', 'Engagement',
     FALSE, '["project_id", "photo_id"]',
     'A project photo was annotated with notes or markings.'),

    ('clearsky_visualizer', 'scope.submitted', 'project_scope_submitted', 'Conversion',
     TRUE, '["project_id"]',
     'A project scope was submitted. AI extracts service type and requirements.'),

    -- -------------------------------------------------------------------------
    -- 10. Quote / Proposal System
    -- -------------------------------------------------------------------------
    ('quote_system', 'quote.created', 'quote_created', 'Conversion',
     FALSE, '["quote_id", "business_id"]',
     'A new quote or proposal was created.'),

    ('quote_system', 'quote.sent', 'quote_sent', 'Conversion',
     FALSE, '["quote_id", "customer_id"]',
     'A quote was sent to the customer.'),

    ('quote_system', 'quote.opened', 'quote_opened', 'Conversion',
     FALSE, '["quote_id", "customer_id"]',
     'A customer opened a quote for the first time.'),

    ('quote_system', 'quote.accepted', 'quote_accepted', 'Conversion',
     FALSE, '["quote_id", "customer_id"]',
     'A customer accepted a quote. High priority conversion event.'),

    ('quote_system', 'quote.declined', 'quote_declined', 'Conversion',
     FALSE, '["quote_id", "customer_id"]',
     'A customer declined a quote.'),

    ('quote_system', 'quote.expired', 'quote_expired', 'Conversion',
     FALSE, '["quote_id"]',
     'A quote expired without a response.'),

    -- -------------------------------------------------------------------------
    -- 11. Booking / Calendar System
    -- -------------------------------------------------------------------------
    ('booking_system', 'appointment.created', 'appointment_booked', 'Conversion',
     FALSE, '["appointment_id", "business_id", "customer_id"]',
     'A new appointment was booked.'),

    ('booking_system', 'appointment.rescheduled', 'appointment_rescheduled', 'Conversion',
     FALSE, '["appointment_id", "new_datetime"]',
     'An existing appointment was rescheduled.'),

    ('booking_system', 'appointment.cancelled', 'appointment_cancelled', 'Conversion',
     FALSE, '["appointment_id"]',
     'An appointment was cancelled.'),

    ('booking_system', 'appointment.no_show', 'appointment_no_show', 'Conversion',
     FALSE, '["appointment_id", "customer_id"]',
     'A customer did not show up for a scheduled appointment.'),

    ('booking_system', 'availability.requested', 'availability_requested', 'Engagement',
     FALSE, '["business_id"]',
     'A customer requested availability information.'),

    -- -------------------------------------------------------------------------
    -- 12. CRM / Job Management System
    -- -------------------------------------------------------------------------
    ('crm_system', 'lead.created', 'crm_lead_created', 'Conversion',
     FALSE, '["lead_id", "business_id"]',
     'A new lead was created in the CRM.'),

    ('crm_system', 'lead.updated', 'crm_lead_updated', 'Conversion',
     FALSE, '["lead_id"]',
     'An existing lead record was updated.'),

    ('crm_system', 'lead.stage_changed', 'crm_lead_stage_changed', 'Conversion',
     FALSE, '["lead_id", "old_stage", "new_stage"]',
     'A lead moved to a new pipeline stage.'),

    ('crm_system', 'customer.created', 'crm_customer_created', 'Growth',
     FALSE, '["customer_id", "business_id"]',
     'A new customer record was created in the CRM.'),

    ('crm_system', 'job.won', 'job_won', 'Growth',
     FALSE, '["job_id", "customer_id", "job_value"]',
     'A job was marked as won in the CRM. Revenue event.'),

    ('crm_system', 'job.lost', 'job_lost', 'Growth',
     FALSE, '["job_id", "customer_id"]',
     'A job was marked as lost in the CRM.'),

    -- -------------------------------------------------------------------------
    -- 13. Social Media Providers
    -- -------------------------------------------------------------------------
    ('social_media', 'post.published', 'social_post_published', 'Visibility',
     FALSE, '["platform", "post_id", "business_id"]',
     'A post was published on a social media platform.'),

    ('social_media', 'comment.received', 'social_comment_received', 'Engagement',
     TRUE, '["platform", "post_id", "comment_text"]',
     'A comment was received on a social media post. AI extracts sentiment and intent.'),

    ('social_media', 'dm.received', 'social_dm_received', 'Communication',
     TRUE, '["platform", "sender_id", "message_text"]',
     'A direct message was received on a social media platform.'),

    ('social_media', 'lead.created', 'social_lead_created', 'Conversion',
     TRUE, '["platform", "lead_id"]',
     'A lead was generated through a social media platform.'),

    ('social_media', 'mention.detected', 'social_mention_detected', 'Trust',
     TRUE, '["platform", "mention_text"]',
     'The business was mentioned on social media. AI extracts sentiment.'),

    -- -------------------------------------------------------------------------
    -- 14. Competitor / Cohort Intelligence
    -- -------------------------------------------------------------------------
    ('competitor_intelligence', 'competitor.detected', 'competitor_detected', 'Visibility',
     FALSE, '["competitor_id", "market_id"]',
     'A new competitor was detected in the market.'),

    ('competitor_intelligence', 'benchmark.updated', 'cohort_benchmark_updated', 'Growth',
     FALSE, '["benchmark_id", "market_id"]',
     'A cohort benchmark was updated with new market data.'),

    ('competitor_intelligence', 'market.demand_shift_detected', 'market_demand_shift_detected', 'Visibility',
     FALSE, '["market_id", "shift_direction"]',
     'A significant demand shift was detected in the market.'),

    -- -------------------------------------------------------------------------
    -- 15. ContentRadar / Demand Intelligence
    -- ContentRadar is one provider. Cohort, watch market, baseline community,
    -- and client market are scopes inside ContentRadar, not separate providers.
    -- -------------------------------------------------------------------------
    ('contentradar', 'keyword.state_changed', 'keyword_state_changed', 'Visibility',
     FALSE, '["keyword", "old_state", "new_state", "scope"]',
     'A tracked keyword changed state (e.g. emerging to spiking).'),

    ('contentradar', 'keyword.spiking_detected', 'spiking_keyword_detected', 'Visibility',
     FALSE, '["keyword", "change_percent", "scope"]',
     'A demand spike was detected for a tracked keyword. Scope indicates watch market or cohort.'),

    ('contentradar', 'content.gap_detected', 'content_gap_detected', 'Growth',
     FALSE, '["keyword", "gap_type", "market_id"]',
     'A content gap was detected for a keyword the business is not covering.'),

    ('contentradar', 'content.calendar_updated', 'content_calendar_updated', 'Growth',
     FALSE, '["business_id", "calendar_id"]',
     'The content calendar was updated with new recommended content.'),

    ('contentradar', 'module.brief_generated', 'content_brief_generated', 'Growth',
     FALSE, '["brief_id", "keyword", "business_id"]',
     'A content module brief was generated for a target keyword.'),

    -- -------------------------------------------------------------------------
    -- 16. System / Platform Health
    -- -------------------------------------------------------------------------
    ('system_health', 'auth.failed', 'provider_auth_failed', 'System',
     FALSE, '["provider", "error_code"]',
     'A provider authentication attempt failed. Integration may be broken.'),

    ('system_health', 'sync.failed', 'provider_sync_failed', 'System',
     FALSE, '["provider", "sync_type", "error_code"]',
     'A provider data sync failed.'),

    ('system_health', 'webhook.retry', 'webhook_retry_received', 'System',
     FALSE, '["provider", "original_event_id"]',
     'A provider resent a webhook that was not confirmed. Duplicate check required.'),

    ('system_health', 'normalization.failed', 'event_normalization_failed', 'System',
     FALSE, '["provider", "provider_event_name"]',
     'An event could not be normalized. Stored for review and registry update.'),

    ('system_health', 'registry.review_required', 'registry_review_required', 'System',
     FALSE, '["provider", "provider_event_name"]',
     'An unknown provider event was received that is not in the registry. Needs mapping.');


-- =============================================================================
-- 2. ACTION LIBRARY
-- =============================================================================

INSERT INTO action_library
    (action_id, action_name, action_domain, plain_description,
     default_execution_mode, default_owner,
     required_parameters, optional_parameters,
     calls_a2p, is_public_facing)
VALUES

    -- Review actions
    ('ACT-REV-001', 'create_review_reply_draft', 'REV',
     'Draft a reply to a Google Business Profile review for human approval.',
     'approval_required', 'business_owner',
     '["review_id", "rating", "review_text", "business_id"]',
     '["praise_topics", "complaint_topics", "service_mentioned", "tone", "rating_content_mismatch"]',
     FALSE, TRUE),

    ('ACT-REV-002', 'post_review_reply', 'REV',
     'Post an approved review reply to Google Business Profile via the A2P.',
     'approval_required', 'business_owner',
     '["review_id", "reply_text", "business_id"]',
     '[]',
     TRUE, TRUE),

    ('ACT-REV-003', 'create_negative_review_escalation_task', 'REV',
     'Create an internal escalation task for a negative or sensitive review.',
     'automatic', 'business_owner',
     '["review_id", "rating", "review_text", "escalation_reason"]',
     '["complaint_topics", "legal_flag", "profanity_flag"]',
     FALSE, FALSE),

    ('ACT-REV-004', 'log_review_complaint_theme', 'REV',
     'Log the complaint topic internally for pattern tracking and reporting.',
     'automatic', 'system',
     '["review_id", "complaint_topics"]',
     '["service_mentioned", "rating", "sentiment"]',
     FALSE, FALSE),

    ('ACT-REV-005', 'mark_testimonial_candidate', 'REV',
     'Flag a positive review as a candidate for use as a testimonial.',
     'automatic', 'system',
     '["review_id", "reviewer_name", "rating"]',
     '["praise_topics", "service_mentioned"]',
     FALSE, FALSE),

    ('ACT-REV-006', 'log_rating_content_mismatch', 'REV',
     'Log a rating/content mismatch for internal tracking. '
     'Adjusts reputation scoring so a conflicting rating does not corrupt intelligence.',
     'automatic', 'system',
     '["review_id", "rating", "ai_sentiment"]',
     '["review_text"]',
     FALSE, FALSE),

    ('ACT-REV-007', 'create_mismatch_review_draft', 'REV',
     'Draft a reply for a review where the star rating and review text conflict. '
     'Reply responds to the content, not the rating.',
     'approval_required', 'business_owner',
     '["review_id", "rating", "review_text", "ai_sentiment"]',
     '["praise_topics", "complaint_topics"]',
     FALSE, TRUE),

    ('ACT-REV-008', 'flag_review_for_human_attention', 'REV',
     'Flag a review for direct human attention. '
     'Used when AI confidence is too low to act or content is ambiguous.',
     'automatic', 'business_owner',
     '["review_id", "flag_reason"]',
     '["ai_confidence_score", "review_text"]',
     FALSE, FALSE),

    ('ACT-REV-009', 'log_legal_threat_detected', 'REV',
     'Log that a review contains legal language and escalate immediately. '
     'No draft is created. System routes directly to manual review.',
     'manual', 'business_owner',
     '["review_id", "review_text", "legal_indicators"]',
     '[]',
     FALSE, FALSE),

    ('ACT-REV-010', 'log_positive_service_proof_point', 'REV',
     'Log a positive service mention as a proof point for marketing and reporting.',
     'automatic', 'system',
     '["review_id", "service_mentioned"]',
     '["praise_topics", "reviewer_name", "rating"]',
     FALSE, FALSE),

    -- Communication actions
    ('ACT-COM-001', 'send_follow_up_message', 'COM',
     'Send an SMS or email follow-up message to a customer via the A2P.',
     'approval_required', 'employee',
     '["customer_phone_or_email", "message_text", "channel"]',
     '["thread_id", "campaign_id"]',
     TRUE, TRUE),

    ('ACT-COM-002', 'notify_owner', 'COM',
     'Send an internal notification to the business owner or assigned employee.',
     'automatic', 'system',
     '["notification_type", "message", "recipient"]',
     '["event_id", "review_id", "urgency"]',
     TRUE, FALSE),

    -- Task actions
    ('ACT-TASK-001', 'create_internal_task', 'TASK',
     'Create an internal task for follow-up, investigation, or manual action.',
     'automatic', 'employee',
     '["task_title", "task_description", "assigned_to"]',
     '["due_date", "priority", "event_id"]',
     FALSE, FALSE),

    -- Quote actions
    ('ACT-QUOTE-001', 'prepare_quote_reminder', 'QUOTE',
     'Prepare a quote follow-up reminder for an open or unopened proposal.',
     'approval_required', 'employee',
     '["quote_id", "customer_name", "quote_value"]',
     '["days_since_sent", "service_type"]',
     FALSE, FALSE),

    -- System actions
    ('ACT-SYS-001', 'create_admin_review_task', 'SYS',
     'Route an issue to admin or support for technical or policy review.',
     'automatic', 'support',
     '["issue_type", "description", "event_id"]',
     '["severity", "provider", "error_detail"]',
     FALSE, FALSE),

    ('ACT-SYS-002', 'log_low_confidence_event', 'SYS',
     'Log an event where AI confidence was below the threshold. '
     'No Signal fires. Event is preserved for human review.',
     'automatic', 'system',
     '["event_id", "ai_confidence_score", "event_type"]',
     '["review_text"]',
     FALSE, FALSE);


-- =============================================================================
-- 3. SIGNAL RULES
-- =============================================================================
-- Conditions use the condition_evaluator.py format:
--   {"field": "field_name", "operator": "operator", "value": value}
--
-- Supported operators:
--   =, !=, >=, <=, >, <
--   contains, contains_any, contains_all
--   in, not_in
--   exists, not_exists
--
-- Fields reference the Event Object and its ai_context JSONB.
-- Use dot notation for nested fields: "ai_context.sentiment"
--
-- All conditions in the array are AND logic.
-- For OR logic, create separate Signal rules.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- TRUST SIGNALS (GBP Reviews)
-- -----------------------------------------------------------------------------

INSERT INTO signal_rules
    (signal_rule_id, signal_name, signal_bucket, event_type, network_category,
     conditions, required_fields, cooldown_hours, default_priority, description)
VALUES

    -- SIG-TRUST-001: Positive review received
    ('SIG-TRUST-001', 'positive_review_received', 'Momentum',
     'review_received', 'Trust',
     '[
         {"field": "rating", "operator": ">=", "value": 4},
         {"field": "rating_content_mismatch", "operator": "=", "value": false}
     ]',
     '["rating", "business_id"]',
     0, 3,
     'A 4 or 5 star review was received with no rating/content conflict. '
     'Signals a positive customer experience worth acknowledging.'),

    -- SIG-TRUST-002: Negative review risk
    ('SIG-TRUST-002', 'negative_review_risk', 'Risk',
     'review_received', 'Trust',
     '[
         {"field": "rating", "operator": "<=", "value": 2},
         {"field": "rating_content_mismatch", "operator": "=", "value": false},
         {"field": "ai_context.legal_threat", "operator": "=", "value": false}
     ]',
     '["rating", "business_id"]',
     0, 1,
     'A 1 or 2 star review was received. High priority. '
     'Requires prompt attention to protect business reputation.'),

    -- SIG-TRUST-003: Positive review with minor complaint
    ('SIG-TRUST-003', 'positive_review_with_minor_issue', 'Opportunity',
     'review_received', 'Trust',
     '[
         {"field": "rating", "operator": ">=", "value": 4},
         {"field": "ai_context.complaint_topics", "operator": "exists", "value": true},
         {"field": "ai_context.sentiment", "operator": "=", "value": "mixed"},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75},
         {"field": "rating_content_mismatch", "operator": "=", "value": false}
     ]',
     '["rating", "business_id", "ai_context.complaint_topics"]',
     0, 2,
     'A positive review that contains a minor complaint buried in otherwise '
     'good feedback. Opportunity to acknowledge and improve.'),

    -- SIG-TRUST-004: Communication experience issue
    ('SIG-TRUST-004', 'communication_experience_issue_detected', 'Bottleneck',
     'review_received', 'Trust',
     '[
         {"field": "ai_context.complaint_topics", "operator": "contains_any",
          "value": ["communication", "slow response", "poor follow-up",
                    "never called back", "no callback", "hard to reach",
                    "did not respond", "ignored", "waiting", "no follow up"]},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "ai_context.complaint_topics"]',
     72, 2,
     'Review mentions a communication or follow-up failure. '
     'Fires regardless of rating. Logged for pattern tracking.'),

    -- SIG-TRUST-005: Service proof point detected
    ('SIG-TRUST-005', 'service_proof_point_detected', 'Opportunity',
     'review_received', 'Trust',
     '[
         {"field": "ai_context.service_mentioned", "operator": "exists", "value": true},
         {"field": "ai_context.sentiment", "operator": "in",
          "value": ["positive", "mixed"]},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75},
         {"field": "rating", "operator": ">=", "value": 3}
     ]',
     '["business_id", "ai_context.service_mentioned"]',
     0, 4,
     'Review mentions a specific service with positive or mixed sentiment. '
     'Useful as a proof point for marketing and credibility.'),

    -- SIG-TRUST-006: Rating content mismatch detected
    ('SIG-TRUST-006', 'rating_content_mismatch_detected', 'Risk',
     'review_received', 'Trust',
     '[
         {"field": "rating_content_mismatch", "operator": "=", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["rating", "business_id", "ai_context.sentiment"]',
     0, 2,
     'The star rating and review text sentiment conflict. '
     'Example: 1-star with positive text, or 5-star with negative text. '
     'May indicate an accidental rating. Requires special handling. '
     'Reply responds to content not rating. Internal scoring adjusted.'),

    -- SIG-TRUST-007: Legal threat detected
    ('SIG-TRUST-007', 'legal_threat_detected', 'Risk',
     'review_received', 'Trust',
     '[
         {"field": "ai_context.legal_threat", "operator": "=", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "review_text"]',
     0, 1,
     'Review contains language suggesting legal action. '
     'Highest priority. No draft created. Immediate manual escalation.'),

    -- SIG-TRUST-008: Ambiguous low confidence review
    ('SIG-TRUST-008', 'low_confidence_review_flagged', 'Risk',
     'review_received', 'Trust',
     '[
         {"field": "ai_context.confidence_score", "operator": "<", "value": 0.75},
         {"field": "requires_ai_extraction", "operator": "=", "value": true},
         {"field": "ai_extraction_completed", "operator": "=", "value": true}
     ]',
     '["business_id", "ai_context.confidence_score"]',
     0, 3,
     'AI extracted context from this review but confidence is below threshold. '
     'Signals are suppressed. Review is flagged for human attention.'),

    -- SIG-TRUST-009: Five star no text (rating only)
    ('SIG-TRUST-009', 'five_star_no_text_received', 'Momentum',
     'review_received', 'Trust',
     '[
         {"field": "rating", "operator": "=", "value": 5},
         {"field": "review_text", "operator": "not_exists", "value": true},
         {"field": "rating_content_mismatch", "operator": "=", "value": false}
     ]',
     '["rating", "business_id"]',
     0, 4,
     'A 5-star rating with no review text. Still worth acknowledging '
     'with a short thank-you reply. Simpler draft than a full text review.'),

    -- SIG-TRUST-010: Repeated complaint theme
    ('SIG-TRUST-010', 'repeated_complaint_theme_detected', 'Bottleneck',
     'review_received', 'Trust',
     '[
         {"field": "ai_context.complaint_topics", "operator": "exists", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "ai_context.complaint_topics"]',
     0, 2,
     'Review contains complaint topics. Logged for pattern analysis. '
     'When the same theme appears across multiple reviews, a bottleneck '
     'pattern emerges in reporting. Fires on any complaint topic.'),


-- -----------------------------------------------------------------------------
-- COMMUNICATION SIGNALS
-- -----------------------------------------------------------------------------

    -- SIG-COM-001: Missed opportunity detected
    ('SIG-COM-001', 'missed_opportunity_detected', 'Risk',
     'missed_call', 'Communication',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id"]',
     4, 1,
     'An inbound call was missed. Potential revenue opportunity lost. '
     'Requires prompt follow-up via SMS or callback.'),

    -- SIG-COM-002: Inbound SMS received
    ('SIG-COM-002', 'inbound_message_received', 'Opportunity',
     'inbound_sms', 'Communication',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id"]',
     0, 2,
     'An inbound SMS was received and business is identified. '
     'May require a response depending on intent and content.'),

    -- SIG-COM-003: Urgent inbound message
    ('SIG-COM-003', 'urgent_inbound_message_detected', 'Risk',
     'inbound_sms', 'Communication',
     '[
         {"field": "ai_context.urgency_level", "operator": "=", "value": "urgent"},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "ai_context.urgency_level"]',
     0, 1,
     'An inbound SMS contains urgent language. '
     'Elevated priority. Prompt response required.'),

    -- SIG-COM-004: Voicemail received
    ('SIG-COM-004', 'voicemail_received', 'Opportunity',
     'voicemail_received', 'Communication',
     '[
         {"field": "business_matched", "operator": "=", "value": true}
     ]',
     '["business_id"]',
     0, 2,
     'A voicemail was left by a caller. Transcription and AI extraction '
     'determine intent and urgency for follow-up prioritization.'),


-- -----------------------------------------------------------------------------
-- CONVERSION SIGNALS
-- -----------------------------------------------------------------------------

    -- SIG-CONV-001: Lead form submitted
    ('SIG-CONV-001', 'lead_form_submitted', 'Opportunity',
     'lead_form_submitted', 'Conversion',
     '[
         {"field": "business_matched", "operator": "=", "value": true},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id"]',
     0, 1,
     'A website lead form was submitted. High priority conversion opportunity. '
     'Intent, service requested, and urgency extracted by AI.'),

    -- SIG-CONV-002: Urgent lead form submitted
    ('SIG-CONV-002', 'urgent_lead_detected', 'Opportunity',
     'lead_form_submitted', 'Conversion',
     '[
         {"field": "ai_context.urgency_level", "operator": "=", "value": "urgent"},
         {"field": "ai_context.confidence_score", "operator": ">=", "value": 0.75}
     ]',
     '["business_id", "ai_context.urgency_level"]',
     0, 1,
     'A lead form was submitted with urgent language. '
     'Same-day or immediate response strongly recommended.'),


-- -----------------------------------------------------------------------------
-- VISIBILITY SIGNALS
-- -----------------------------------------------------------------------------

    -- SIG-VIS-001: Keyword demand spike
    ('SIG-VIS-001', 'keyword_demand_spike_detected', 'Opportunity',
     'spiking_keyword_detected', 'Visibility',
     '[
         {"field": "change_percent", "operator": ">=", "value": 100}
     ]',
     '["keyword", "change_percent"]',
     24, 3,
     'A tracked keyword has spiked in search demand by 100% or more. '
     'Opportunity to create content or adjust campaigns.'),

    -- SIG-VIS-002: Keyword ranking dropped
    ('SIG-VIS-002', 'keyword_ranking_dropped', 'Risk',
     'keyword_position_changed', 'Visibility',
     '[
         {"field": "new_rank", "operator": ">", "value": 10},
         {"field": "old_rank", "operator": "<=", "value": 10}
     ]',
     '["keyword", "old_rank", "new_rank"]',
     24, 2,
     'A keyword that was ranking in the top 10 has dropped out. '
     'Visibility risk requiring SEO attention.');


-- =============================================================================
-- 4. SIGNAL-TO-ACTION MAPPINGS
-- =============================================================================

INSERT INTO signal_action_mappings
    (signal_rule_id, action_id, is_primary, is_secondary)
VALUES

    -- SIG-TRUST-001: positive_review_received
    ('SIG-TRUST-001', 'ACT-REV-001', TRUE, FALSE),   -- draft reply (primary)
    ('SIG-TRUST-001', 'ACT-REV-005', FALSE, TRUE),   -- mark testimonial candidate
    ('SIG-TRUST-001', 'ACT-REV-010', FALSE, TRUE),   -- log service proof point

    -- SIG-TRUST-002: negative_review_risk
    ('SIG-TRUST-002', 'ACT-REV-003', TRUE, FALSE),   -- escalation task (primary)
    ('SIG-TRUST-002', 'ACT-REV-001', FALSE, TRUE),   -- draft reply (secondary)
    ('SIG-TRUST-002', 'ACT-REV-004', FALSE, TRUE),   -- log complaint theme

    -- SIG-TRUST-003: positive_review_with_minor_issue
    ('SIG-TRUST-003', 'ACT-REV-001', TRUE, FALSE),   -- draft reply
    ('SIG-TRUST-003', 'ACT-REV-004', FALSE, TRUE),   -- log complaint theme

    -- SIG-TRUST-004: communication_experience_issue_detected
    ('SIG-TRUST-004', 'ACT-REV-004', TRUE, FALSE),   -- log complaint theme (primary)
    ('SIG-TRUST-004', 'ACT-REV-001', FALSE, TRUE),   -- draft reply (secondary)

    -- SIG-TRUST-005: service_proof_point_detected
    ('SIG-TRUST-005', 'ACT-REV-010', TRUE, FALSE),   -- log proof point
    ('SIG-TRUST-005', 'ACT-REV-005', FALSE, TRUE),   -- mark testimonial candidate

    -- SIG-TRUST-006: rating_content_mismatch_detected
    ('SIG-TRUST-006', 'ACT-REV-007', TRUE, FALSE),   -- mismatch draft reply (primary)
    ('SIG-TRUST-006', 'ACT-REV-006', FALSE, TRUE),   -- log mismatch (secondary)

    -- SIG-TRUST-007: legal_threat_detected
    ('SIG-TRUST-007', 'ACT-REV-009', TRUE, FALSE),   -- log legal threat, manual escalation
    ('SIG-TRUST-007', 'ACT-COM-002', FALSE, TRUE),   -- notify owner immediately

    -- SIG-TRUST-008: low_confidence_review_flagged
    ('SIG-TRUST-008', 'ACT-REV-008', TRUE, FALSE),   -- flag for human attention
    ('SIG-TRUST-008', 'ACT-SYS-002', FALSE, TRUE),   -- log low confidence event

    -- SIG-TRUST-009: five_star_no_text_received
    ('SIG-TRUST-009', 'ACT-REV-001', TRUE, FALSE),   -- simple draft reply

    -- SIG-TRUST-010: repeated_complaint_theme_detected
    ('SIG-TRUST-010', 'ACT-REV-004', TRUE, FALSE),   -- log complaint theme

    -- SIG-COM-001: missed_opportunity_detected
    ('SIG-COM-001', 'ACT-COM-002', TRUE, FALSE),     -- notify owner
    ('SIG-COM-001', 'ACT-COM-001', FALSE, TRUE),     -- follow-up message
    ('SIG-COM-001', 'ACT-TASK-001', FALSE, TRUE),    -- internal task

    -- SIG-COM-002: inbound_message_received
    ('SIG-COM-002', 'ACT-COM-001', TRUE, FALSE),     -- follow-up message
    ('SIG-COM-002', 'ACT-TASK-001', FALSE, TRUE),    -- internal task

    -- SIG-COM-003: urgent_inbound_message_detected
    ('SIG-COM-003', 'ACT-COM-002', TRUE, FALSE),     -- notify owner immediately
    ('SIG-COM-003', 'ACT-COM-001', FALSE, TRUE),     -- follow-up message

    -- SIG-COM-004: voicemail_received
    ('SIG-COM-004', 'ACT-COM-002', TRUE, FALSE),     -- notify owner
    ('SIG-COM-004', 'ACT-TASK-001', FALSE, TRUE),    -- internal task

    -- SIG-CONV-001: lead_form_submitted
    ('SIG-CONV-001', 'ACT-COM-001', TRUE, FALSE),    -- follow-up message
    ('SIG-CONV-001', 'ACT-TASK-001', FALSE, TRUE),   -- internal task

    -- SIG-CONV-002: urgent_lead_detected
    ('SIG-CONV-002', 'ACT-COM-002', TRUE, FALSE),    -- notify owner immediately
    ('SIG-CONV-002', 'ACT-COM-001', FALSE, TRUE),    -- follow-up message

    -- SIG-VIS-001: keyword_demand_spike_detected
    ('SIG-VIS-001', 'ACT-TASK-001', TRUE, FALSE),    -- internal task for content team

    -- SIG-VIS-002: keyword_ranking_dropped
    ('SIG-VIS-002', 'ACT-TASK-001', TRUE, FALSE),    -- internal task for SEO review
    ('SIG-VIS-002', 'ACT-COM-002', FALSE, TRUE);     -- notify owner


-- =============================================================================
-- 5. ORCHESTRATOR RULES
-- =============================================================================

INSERT INTO orchestrator_rules
    (rule_id, rule_name, business_id, scope, signal_rule_id, conditions,
     execution_mode, owner, priority_override,
     suppress_signals, block_reason, is_safety_rule)
VALUES

    -- Legal threat overrides everything — no drafts, manual only
    -- GLOBAL + SAFETY: cannot be overridden by any client
    ('ORC-001', 'legal_threat_forces_manual_review',
     NULL, 'global', 'SIG-TRUST-007',
     '[]',
     'manual', 'business_owner', 1,
     '["SIG-TRUST-001", "SIG-TRUST-002", "SIG-TRUST-003",
       "SIG-TRUST-004", "SIG-TRUST-006"]',
     NULL, TRUE),

    -- Low confidence suppresses all AI-dependent signals
    -- GLOBAL: clients can override if they trust lower confidence
    ('ORC-002', 'low_confidence_suppresses_ai_signals',
     NULL, 'global', 'SIG-TRUST-008',
     '[]',
     'observe_only', 'business_owner', 3,
     '["SIG-TRUST-003", "SIG-TRUST-004", "SIG-TRUST-005"]',
     NULL, FALSE),

    -- Rating mismatch: suppress standard positive/negative signals
    -- GLOBAL: clients can override if they want different mismatch handling
    ('ORC-003', 'mismatch_suppresses_standard_review_signals',
     NULL, 'global', 'SIG-TRUST-006',
     '[{"field": "rating_content_mismatch", "operator": "=", "value": true}]',
     'approval_required', 'business_owner', 2,
     '["SIG-TRUST-001", "SIG-TRUST-002"]',
     NULL, FALSE),

    -- Public reply always requires approval
    -- GLOBAL + SAFETY: cannot be overridden by any client
    ('ORC-004', 'public_reply_always_requires_approval',
     NULL, 'global', NULL,
     '[{"field": "action_is_public_facing", "operator": "=", "value": true}]',
     'approval_required', 'business_owner', NULL,
     '[]',
     NULL, TRUE),

    -- Negative review: escalation task fires automatically, draft is secondary
    -- GLOBAL: clients can override execution mode or owner
    ('ORC-005', 'negative_review_escalation_first',
     NULL, 'global', 'SIG-TRUST-002',
     '[{"field": "rating", "operator": "<=", "value": 2}]',
     'automatic', 'business_owner', 1,
     '[]',
     NULL, FALSE),

    -- Block ACT-REV-002 (post reply) if public_response_requires_approval = true
    -- GLOBAL + SAFETY: cannot be overridden by any client
    ('ORC-006', 'block_auto_post_if_approval_required',
     NULL, 'global', NULL,
     '[{"field": "business_config.public_response_requires_approval",
        "operator": "=", "value": true},
       {"field": "action_id", "operator": "=", "value": "ACT-REV-002"}]',
     'blocked', NULL, NULL,
     '[]',
     'Business policy requires human approval before posting publicly. '
     'ACT-REV-001 draft must be approved first.',
     TRUE);


-- =============================================================================
-- 6. SAFETY COMPLIANCE RULES
-- =============================================================================

INSERT INTO safety_compliance_rules
    (rule_id, rule_name, description, conditions, block_reason, severity)
VALUES

    ('SAF-001', 'block_auto_post_public_reply',
     'Automatically posting a public reply without human approval is never allowed. '
     'ACT-REV-002 must always be preceded by an approved ACT-REV-001 draft.',
     '[{"field": "action_id", "operator": "=", "value": "ACT-REV-002"},
       {"field": "execution_mode", "operator": "=", "value": "automatic"}]',
     'Automatic posting of public replies is prohibited. '
     'Human approval is required before any public-facing response is posted.',
     'high'),

    ('SAF-002', 'block_action_on_legal_threat',
     'When a legal threat is detected, no automated communication actions '
     'may be taken. Manual review only.',
     '[{"field": "ai_context.legal_threat", "operator": "=", "value": true},
       {"field": "action_id", "operator": "in",
        "value": ["ACT-REV-001", "ACT-REV-002", "ACT-COM-001"]}]',
     'Legal threat detected in review content. No automated communication '
     'actions are permitted. Manual review by business owner required.',
     'high'),

    ('SAF-003', 'require_business_match_for_communication',
     'No customer-facing communication action may proceed if the business '
     'cannot be matched from the incoming provider data.',
     '[{"field": "business_matched", "operator": "=", "value": false},
       {"field": "action_is_public_facing", "operator": "=", "value": true}]',
     'Business identity could not be confirmed. '
     'No customer-facing action permitted without a verified business match.',
     'high'),

    ('SAF-004', 'block_on_low_ai_confidence_public_action',
     'Public-facing actions that depend on AI-extracted context must not '
     'proceed if AI confidence is below the configured threshold.',
     '[{"field": "ai_context.confidence_score", "operator": "<", "value": 0.75},
       {"field": "action_is_public_facing", "operator": "=", "value": true}]',
     'AI confidence score is below the required threshold for a public-facing action. '
     'Human review required before any response is generated or posted.',
     'medium');


-- =============================================================================
-- 7. BUSINESS CONFIGURATIONS
-- Demo business: APEX Contracting
-- =============================================================================

INSERT INTO business_configurations
    (business_id, business_name, automation_level,
     review_reply_policy, public_response_requires_approval,
     sms_requires_approval, email_requires_approval,
     office_hours_start, office_hours_end, office_timezone,
     brand_tone, sla_response_hours, escalation_contact)
VALUES
    ('biz_apex_001', 'APEX Contracting',
     'standard',
     'draft_only',
     TRUE,           -- all public replies need approval
     TRUE,           -- all SMS needs approval
     TRUE,           -- all email needs approval
     '08:00', '17:00', 'America/Toronto',
     'professional',
     24,
     'owner@apexcontracting.ca');


-- =============================================================================
-- 8. CLIENT ORCHESTRATOR PROFILES
-- =============================================================================

INSERT INTO client_orchestrator_profiles
    (business_id, profile_name, automation_level,
     allowed_action_domains, disabled_signal_ids,
     domain_execution_modes, domain_owners,
     has_consultant, notify_owner_on_escalation,
     notify_owner_on_draft, notify_owner_on_auto,
     preferred_reply_length, include_business_name,
     include_call_to_action)
VALUES
    ('biz_apex_001', 'APEX Contracting — Standard Profile',
     'standard',
     NULL,           -- all action domains allowed
     '[]',           -- no Signals disabled
     '{"REV": "approval_required", "COM": "approval_required", "TASK": "automatic", "SYS": "automatic"}',
     '{"REV": "business_owner", "COM": "business_owner", "TASK": "employee", "SYS": "system"}',
     FALSE,          -- no dedicated consultant
     TRUE,           -- notify owner on escalations
     TRUE,           -- notify owner when draft is ready
     FALSE,          -- do not notify on auto-handled items
     'medium',       -- medium length replies
     TRUE,           -- include business name in replies
     FALSE           -- no call-to-action in replies
    );


-- =============================================================================
-- RECORD MIGRATION
-- =============================================================================

INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Seed rules — provider registry, action library, signal rules, '
               'signal-action mappings, orchestrator rules (global/safety scoped), '
               'safety compliance rules, business configuration, '
               'and client orchestrator profile for APEX Contracting demo');


-- =============================================================================
-- END OF MIGRATION 002
--
-- ADDING A NEW SIGNAL (global):
--   INSERT INTO signal_rules (signal_rule_id, ..., business_id, scope)
--   VALUES ('SIG-NEW-001', ..., NULL, 'global');
--
-- CUSTOMIZING A SIGNAL FOR ONE CLIENT:
--   INSERT INTO signal_rules (signal_rule_id, ..., business_id, scope)
--   VALUES ('SIG-TRUST-001', ..., 'biz_apex_001', 'client');
--
-- DISABLING A SIGNAL FOR ONE CLIENT:
--   UPDATE client_orchestrator_profiles
--   SET disabled_signal_ids = disabled_signal_ids || '["SIG-TRUST-005"]'::jsonb
--   WHERE business_id = 'biz_apex_001';
--
-- ADDING A CLIENT ORCHESTRATOR RULE OVERRIDE:
--   INSERT INTO orchestrator_rules
--   (rule_id, rule_name, business_id, scope, signal_rule_id, execution_mode, owner)
--   VALUES ('ORC-APEX-001', 'apex_auto_internal_tasks',
--           'biz_apex_001', 'client', 'SIG-TRUST-010', 'automatic', 'employee');
--
-- =============================================================================
