import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Orchestrator data...');

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Business
    // ─────────────────────────────────────────────────────────────────────────
    const business = await prisma.business.upsert({
        where: { business_id: 'biz_apex_001' },
        update: {},
        create: {
            business_id: 'biz_apex_001',
            name: 'APEX Contracting',
            market_id: 'market_timmins',
            gbp_location_id: 'gbp_location_1199'
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Business Configuration
    // ─────────────────────────────────────────────────────────────────────────
    await prisma.businessConfiguration.upsert({
        where: { business_id: business.id },
        update: {},
        create: {
            business_id: business.id,
            consultant_id: 'cons_sarah_001',
            consultant_name: 'Sarah Jenkins',
            consultant_review_required: true,
            primary_internal_owner: 'consultant',
            approval_route: 'consultant_then_client',
            review_reply_policy: 'draft_only',
            brand_tone: 'professional'
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Client Orchestrator Profile
    // ─────────────────────────────────────────────────────────────────────────
    await prisma.clientOrchestratorProfile.upsert({
        where: { business_id: business.id },
        update: {},
        create: {
            business_id: business.id,
            automation_level: 'standard'
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Action Library
    // Spec ref: A2P Developer Spec §6.5 (Action Mapping table)
    // Domain prefix convention:
    //   ACT-REV-  = Review domain (public-facing reply actions)
    //   ACT-A2P-  = Telephony / A2P domain (inbound call actions)
    // ─────────────────────────────────────────────────────────────────────────
    const actions = [

        // ── REV Domain ───────────────────────────────────────────────────────

        {
            // Spec: ACT-CALL-005 equivalent — draft callback script / review reply
            action_id: 'ACT-REV-001',
            name: 'create_review_reply_draft',
            domain: 'REV',
            is_public_facing: true,
            default_execution_mode: 'approval_required',
            default_owner: 'consultant',
            required_params: ['customer_name', 'rating', 'platform', 'brand_tone', 'review_text']
        },
        {
            // Spec: Post approved reply — always approval_required, never automatic
            action_id: 'ACT-REV-002',
            name: 'post_review_reply',
            domain: 'REV',
            is_public_facing: true,
            default_execution_mode: 'approval_required',
            default_owner: 'consultant',
            required_params: ['customer_name', 'rating', 'platform']
        },
        {
            // Spec: ACT-CALL-006 equivalent — log complaint theme internally
            action_id: 'ACT-REV-004',
            name: 'log_review_complaint_theme',
            domain: 'REV',
            is_public_facing: false,
            default_execution_mode: 'automatic',
            default_owner: 'system',
            required_params: ['ai_summary', 'sentiment', 'complaint_topics']
        },

        // ── A2P Domain ───────────────────────────────────────────────────────
        // Spec ref: §6.5 Action Mapping table (ACT-CALL-001 through ACT-CALL-008)
        // Renamed to ACT-A2P- prefix to separate telephony domain from REV domain

        {
            // Spec: ACT-CALL-002 — Send urgent alert to team
            // Fires automatically. Notifies business owner of inbound call/voicemail.
            // Signal: SIG-COMM-001 (SERVICE_URGENCY), SIG-COMM-003 (COMPLAINT / CHURN_RISK)
            action_id: 'ACT-A2P-001',
            name: 'alert_business_owner',
            domain: 'A2P',
            is_public_facing: false,
            default_execution_mode: 'automatic',
            default_owner: 'system',
            required_params: ['customer_name', 'ai_summary', 'urgency_level']
        },
        {
            // Spec: ACT-CALL-004 — Log opportunity to CRM / create CRM lead
            // Fires automatically for new callers with opportunity signal.
            // Signal: SIG-COMM-002 (NEW_CUSTOMER_OPPORTUNITY)
            action_id: 'ACT-A2P-002',
            name: 'create_crm_lead',
            domain: 'A2P',
            is_public_facing: false,
            default_execution_mode: 'automatic',
            default_owner: 'system',
            // CORRECTED: added ivr_path, ai_summary, opportunity — needed for CRM context
            required_params: [
                'customer_name',
                'phone_number',
                'intent',
                'ivr_path',
                'ai_summary',
                'opportunity'
            ]
        },
        {
            // Spec: ACT-CALL-001 — Create callback task
            // Fires automatically. Creates a follow-up task for any missed/voicemail call.
            // Signal: SIG-COMM-001, SIG-COMM-002, SIG-COMM-003, SIG-COMM-004
            action_id: 'ACT-A2P-003',
            name: 'log_a2p_interaction',
            domain: 'A2P',
            is_public_facing: false,
            default_execution_mode: 'automatic',
            default_owner: 'system',
            required_params: ['provider', 'event_type', 'ai_summary']
        },
        {
            // Spec: ACT-CALL-003 — Create emergency dispatch alert
            // CRITICAL: execution_mode is 'automatic' AND 'immediate' — bypasses all queue priority
            // Must fire before any other action when emergency = true
            // Signal: SIG-COMM-000 (EMERGENCY_SERVICE)
            action_id: 'ACT-A2P-004',
            name: 'create_emergency_dispatch_alert',
            domain: 'A2P',
            is_public_facing: false,
            default_execution_mode: 'automatic_immediate', // bypasses standard queue
            default_owner: 'system',
            required_params: [
                'caller_id',
                'customer_name',
                'emergency_type',
                'ai_summary',
                'call_event_id'
            ]
        },
        {
            // Spec: ACT-CALL-005 — Draft callback script (human review required)
            // Must NEVER execute automatically — sits in human review queue
            // Signal: SIG-COMM-001 (SERVICE_URGENCY), SIG-COMM-004 (BOOKING_OPPORTUNITY)
            action_id: 'ACT-A2P-005',
            name: 'draft_callback_script',
            domain: 'A2P',
            is_public_facing: false,
            default_execution_mode: 'approval_required', // human review — never automatic
            default_owner: 'consultant',
            required_params: [
                'customer_name',
                'phone_number',
                'ai_summary',
                'urgency_level',
                'momentum',
                'brand_tone'
            ]
        },
        {
            // Spec: ACT-CALL-007 — Flag churn risk in profile
            // Fires automatically. Updates profile record with churn risk flag.
            // Signal: SIG-COMM-003 (CHURN_RISK)
            action_id: 'ACT-A2P-006',
            name: 'flag_churn_risk_in_profile',
            domain: 'A2P',
            is_public_facing: false,
            default_execution_mode: 'automatic',
            default_owner: 'system',
            required_params: ['profile_id', 'risk_level', 'ai_summary']
        },
        {
            // Spec: ACT-CALL-008 — Send SMS follow-up (if opted in)
            // Must NEVER execute automatically — sits in human review queue
            // GUARD: must check sms_opted_in = true on profile before queuing
            // Signal: SIG-COMM-004 (BOOKING_OPPORTUNITY)
            action_id: 'ACT-A2P-007',
            name: 'send_sms_followup',
            domain: 'A2P',
            is_public_facing: false,
            default_execution_mode: 'approval_required', // human approval — never automatic
            default_owner: 'consultant',
            required_params: [
                'customer_name',
                'phone_number',
                'sms_opted_in',   // must = true or action is suppressed
                'ai_summary',
                'brand_tone'
            ]
        }
    ];

    for (const action of actions) {
        await prisma.actionLibrary.upsert({
            where: { action_id: action.action_id },
            update: action,
            create: action
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Signal Action Mappings
    // Spec ref: §6.4 (Signal Detection table), §6.5 (Action Mapping table)
    //
    // Signal naming convention (A2P domain):
    //   SIG-COMM-000 = EMERGENCY_SERVICE    (Critical — bypasses all queue)
    //   SIG-COMM-001 = SERVICE_URGENCY      (High)
    //   SIG-COMM-002 = NEW_CUSTOMER_OPPORTUNITY (High)
    //   SIG-COMM-003 = CHURN_RISK           (High)
    //   SIG-COMM-004 = BOOKING_OPPORTUNITY  (Medium)
    //   SIG-COMM-005 = CALLBACK_REQUIRED    (Medium)
    //   SIG-COMM-006 = COMPLAINT_SIGNAL     (Medium)
    //   SIG-COMM-007 = GENERAL_INQUIRY      (Low — default fallback)
    // ─────────────────────────────────────────────────────────────────────────
    const mappings = [

        // ── SIG-COMM-000: EMERGENCY_SERVICE ──────────────────────────────────
        // Trigger: emergency = true, any emergency_type
        // Priority: Critical — ACT-A2P-004 must execute before all other actions
        { signal_rule_id: 'SIG-COMM-000', action_id: 'ACT-A2P-004', is_primary: true,  is_secondary: false }, // emergency dispatch — immediate
        { signal_rule_id: 'SIG-COMM-000', action_id: 'ACT-A2P-001', is_primary: false, is_secondary: true  }, // alert owner
        { signal_rule_id: 'SIG-COMM-000', action_id: 'ACT-A2P-003', is_primary: false, is_secondary: true  }, // log interaction

        // ── SIG-COMM-001: SERVICE_URGENCY ─────────────────────────────────────
        // Trigger: urgency = high or critical, sentiment = negative
        { signal_rule_id: 'SIG-COMM-001', action_id: 'ACT-A2P-001', is_primary: true,  is_secondary: false }, // alert owner
        { signal_rule_id: 'SIG-COMM-001', action_id: 'ACT-A2P-005', is_primary: false, is_secondary: true  }, // draft callback script (approval required)
        { signal_rule_id: 'SIG-COMM-001', action_id: 'ACT-A2P-003', is_primary: false, is_secondary: true  }, // log interaction

        // ── SIG-COMM-002: NEW_CUSTOMER_OPPORTUNITY ────────────────────────────
        // Trigger: profile_id = null, opportunity >= medium
        { signal_rule_id: 'SIG-COMM-002', action_id: 'ACT-A2P-002', is_primary: true,  is_secondary: false }, // create CRM lead
        { signal_rule_id: 'SIG-COMM-002', action_id: 'ACT-A2P-003', is_primary: false, is_secondary: true  }, // log interaction

        // ── SIG-COMM-003: CHURN_RISK ──────────────────────────────────────────
        // Trigger: risk = high, existing customer profile
        { signal_rule_id: 'SIG-COMM-003', action_id: 'ACT-A2P-001', is_primary: true,  is_secondary: false }, // alert owner
        { signal_rule_id: 'SIG-COMM-003', action_id: 'ACT-A2P-006', is_primary: false, is_secondary: true  }, // flag churn risk on profile
        { signal_rule_id: 'SIG-COMM-003', action_id: 'ACT-A2P-003', is_primary: false, is_secondary: true  }, // log interaction

        // ── SIG-COMM-004: BOOKING_OPPORTUNITY ────────────────────────────────
        // Trigger: momentum = ready_to_book
        { signal_rule_id: 'SIG-COMM-004', action_id: 'ACT-A2P-005', is_primary: true,  is_secondary: false }, // draft callback script (approval required)
        { signal_rule_id: 'SIG-COMM-004', action_id: 'ACT-A2P-007', is_primary: false, is_secondary: true  }, // SMS follow-up draft (approval required + opt-in guard)
        { signal_rule_id: 'SIG-COMM-004', action_id: 'ACT-A2P-003', is_primary: false, is_secondary: true  }, // log interaction

        // ── SIG-COMM-005: CALLBACK_REQUIRED ──────────────────────────────────
        // Trigger: call_outcome = voicemail or missed, urgency >= medium
        { signal_rule_id: 'SIG-COMM-005', action_id: 'ACT-A2P-001', is_primary: true,  is_secondary: false }, // alert owner
        { signal_rule_id: 'SIG-COMM-005', action_id: 'ACT-A2P-003', is_primary: false, is_secondary: true  }, // log interaction

        // ── SIG-COMM-006: COMPLAINT_SIGNAL ───────────────────────────────────
        // Trigger: sentiment = negative, risk >= medium
        { signal_rule_id: 'SIG-COMM-006', action_id: 'ACT-A2P-001', is_primary: true,  is_secondary: false }, // alert owner
        { signal_rule_id: 'SIG-COMM-006', action_id: 'ACT-A2P-006', is_primary: false, is_secondary: true  }, // flag churn risk on profile
        { signal_rule_id: 'SIG-COMM-006', action_id: 'ACT-A2P-003', is_primary: false, is_secondary: true  }, // log interaction

        // ── SIG-COMM-007: GENERAL_INQUIRY ────────────────────────────────────
        // Trigger: urgency = low, sentiment = neutral or positive (default fallback)
        { signal_rule_id: 'SIG-COMM-007', action_id: 'ACT-A2P-003', is_primary: true,  is_secondary: false }, // log interaction only

        // ── REV Domain Mappings (unchanged from original) ─────────────────────

        // Negative / Risk
        { signal_rule_id: 'SIG-TRUST-001', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-001', action_id: 'ACT-REV-004', is_primary: false, is_secondary: true  },
        { signal_rule_id: 'SIG-TRUST-008', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-017', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-017', action_id: 'ACT-REV-004', is_primary: false, is_secondary: true  },

        // Neutral / Mixed
        { signal_rule_id: 'SIG-TRUST-002', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-004', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-004', action_id: 'ACT-REV-004', is_primary: false, is_secondary: true  },
        { signal_rule_id: 'SIG-TRUST-009', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },

        // Positive / Raving Fan
        { signal_rule_id: 'SIG-TRUST-003', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-006', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-015', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-016', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },

        // Bottlenecks
        { signal_rule_id: 'SIG-TRUST-005', action_id: 'ACT-REV-004', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-010', action_id: 'ACT-REV-004', is_primary: true,  is_secondary: false },

        // Performance / Competitive / Momentum
        { signal_rule_id: 'SIG-TRUST-007', action_id: 'ACT-REV-001', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-011', action_id: 'ACT-REV-004', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-012', action_id: 'ACT-REV-004', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-013', action_id: 'ACT-REV-004', is_primary: true,  is_secondary: false },
        { signal_rule_id: 'SIG-TRUST-014', action_id: 'ACT-REV-004', is_primary: true,  is_secondary: false }
    ];

    for (const mapping of mappings) {
        const existing = await prisma.signalActionMapping.findFirst({
            where: {
                signal_rule_id: mapping.signal_rule_id,
                action_id: mapping.action_id,
                business_id: null
            }
        });

        if (!existing) {
            await prisma.signalActionMapping.create({ data: mapping });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Safety Rules
    // Spec ref: §5.4 (Emergency Detection — CRITICAL), §6.5 (Approval CRITICAL)
    // ─────────────────────────────────────────────────────────────────────────
    const safetyRules = [
        {
            // ADDED: Emergency actions must never be blocked by any other safety rule.
            // Spec ref: §5.4 CRITICAL — emergency bypasses standard queue priority entirely.
            // severity: 0 means this rule overrides all others for emergency signals.
            rule_id: 'SAF-000',
            rule_name: 'Emergency actions bypass all safety blocks',
            conditions: {
                signal_rule_id: { operator: '=', value: 'SIG-COMM-000' }
            },
            block_reason: null, // never blocked
            severity: 0         // lowest severity number = highest override priority
        },
        {
            // Original SAF-001 — unchanged
            // Spec ref: §6.5 CRITICAL — ACT-REV-002 must never be automatic
            rule_id: 'SAF-001',
            rule_name: 'Block automatic posting of public replies',
            conditions: {
                action_id: { operator: '=', value: 'ACT-REV-002' },
                execution_mode: { operator: '=', value: 'automatic' }
            },
            block_reason: 'Safety policy prevents automatic public posting without human review.',
            severity: 10
        },
        {
            // ADDED: ACT-A2P-005 and ACT-A2P-007 must never execute automatically.
            // Spec ref: §6.5 CRITICAL — approval_required actions must never auto-execute.
            rule_id: 'SAF-002',
            rule_name: 'Block automatic execution of approval-required A2P actions',
            conditions: {
                action_id: { operator: 'IN', value: ['ACT-A2P-005', 'ACT-A2P-007'] },
                execution_mode: { operator: '=', value: 'automatic' }
            },
            block_reason: 'Callback script drafts and SMS follow-ups require human review before execution.',
            severity: 10
        },
        {
            // ADDED: SMS opt-in guard — ACT-A2P-007 must be suppressed if caller not opted in.
            // Spec ref: §10.1 (SMS opt-in open item), Blueprint Task 7.5
            rule_id: 'SAF-003',
            rule_name: 'Block SMS follow-up if caller not opted in',
            conditions: {
                action_id: { operator: '=', value: 'ACT-A2P-007' },
                sms_opted_in: { operator: '=', value: false }
            },
            block_reason: 'SMS opt-in not confirmed for this caller. ACT-A2P-007 suppressed.',
            severity: 9
        },
        {
            // Original SAF-004 — unchanged but must not apply to SIG-COMM-000 (covered by SAF-000)
            rule_id: 'SAF-004',
            rule_name: 'Low confidence AI block',
            conditions: {
                ai_confidence_score: { operator: '<', value: 0.75 },
                action_is_public_facing: { operator: '=', value: true }
            },
            block_reason: 'AI confidence is too low for public-facing actions.',
            severity: 8
        }
    ];

    for (const rule of safetyRules) {
        await prisma.safetyComplianceRule.upsert({
            where: { rule_id: rule.rule_id },
            update: rule,
            create: rule
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Orchestrator Rules
    // ─────────────────────────────────────────────────────────────────────────
    const orchestratorRules = [
        {
            // Original rule — unchanged
            rule_id: 'ORC-REV-001',
            rule_name: 'Suppress Response Needed if Risk Detected',
            signal_rule_id: 'SIG-TRUST-001',
            suppress_signals: ['SIG-TRUST-008'],
            scope: 'global'
        },
        {
            // ADDED: Emergency signal suppresses all other A2P signals in same event.
            // Spec ref: §5.4 CRITICAL — emergency must be processed before all other tasks.
            rule_id: 'ORC-A2P-001',
            rule_name: 'Emergency signal suppresses all other A2P signals',
            signal_rule_id: 'SIG-COMM-000',
            suppress_signals: [
                'SIG-COMM-001',
                'SIG-COMM-002',
                'SIG-COMM-003',
                'SIG-COMM-004',
                'SIG-COMM-005',
                'SIG-COMM-006',
                'SIG-COMM-007'
            ],
            scope: 'global'
        },
        {
            // ADDED: Churn risk signal suppresses general inquiry in same event.
            // A caller flagged as churn risk must not be treated as a general inquiry.
            rule_id: 'ORC-A2P-002',
            rule_name: 'Churn risk suppresses general inquiry',
            signal_rule_id: 'SIG-COMM-003',
            suppress_signals: ['SIG-COMM-007'],
            scope: 'global'
        }
    ];

    for (const rule of orchestratorRules) {
        await prisma.orchestratorRule.upsert({
            where: { rule_id: rule.rule_id },
            update: rule,
            create: rule
        });
    }

    console.log('✅ Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
