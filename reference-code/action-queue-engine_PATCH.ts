/**
 * ACTION QUEUE ENGINE — A2P PARAMETER PATCH
 *
 * This file documents the cases to ADD to the resolveParameters switch
 * inside ActionQueueEngine. Merge these into your existing action-queue-engine.ts
 * after the existing 'complaint_topics' case and before the default.
 *
 * Spec ref: A2P Developer Spec §6.3, Blueprint Task 7.2
 * Gap: resolveParameters missing A2P fields — RESOLVED
 */

// ── ADD THESE CASES to the resolveParameters switch ──────────────────────────
//
// Location: inside the switch(key) block, after case 'complaint_topics'
//

/*
case 'ivr_path':
    // The IVR path the caller navigated. Carried through client_state in A2P app.
    // Forwarded to ClearSky in the transcript payload metadata.
    params[key] = (event.metadata as any)?.ivr_path || 'unknown';
    break;

case 'call_priority':
    // 'emergency' | 'standard'. Set by A2P when digit=3 or name contains 'emergency'.
    params[key] = (event.metadata as any)?.call_priority || 'standard';
    break;

case 'call_event_id':
    // The Telnyx call_control_id. Passed in metadata.call_control_id.
    params[key] = (event.metadata as any)?.call_control_id || null;
    break;

case 'opportunity':
    // Derived from AI enrichment. If praise detected → medium opportunity.
    params[key] = enrichment.ai_praise_detected ? 'medium' : 'none';
    break;

case 'momentum':
    // Derived from AI urgency level. High urgency → ready_to_book.
    params[key] = enrichment.ai_urgency_level === 'high' ? 'ready_to_book' : 'passive';
    break;

case 'risk_level':
    // Derived from AI complaint detection.
    params[key] = enrichment.ai_complaint_detected ? 'high' : 'low';
    break;

case 'sms_opted_in':
    // SAFE DEFAULT: always false until profile UI is built.
    // SAF-003 will suppress ACT-A2P-007 when this is false.
    // TODO: resolve from CustomerProfile.sms_opted_in once UI exists.
    params[key] = false;
    break;

case 'emergency_type':
    // Derived from call_priority. If emergency priority → service_emergency.
    params[key] = (event.metadata as any)?.call_priority === 'emergency'
        ? 'service_emergency'
        : null;
    break;
*/

// ── ALSO ADD 'automatic_immediate' to KNOWN_MODES ────────────────────────────
//
// Location: top of section-5-execution.ts
// Required for ACT-A2P-004 (create_emergency_dispatch_alert) to pass eligibility check.
//
// BEFORE:
// const KNOWN_MODES = ['approval_required', 'automatic', 'manual', 'observe_only'];
//
// AFTER:
// const KNOWN_MODES = ['approval_required', 'automatic', 'automatic_immediate', 'manual', 'observe_only'];

export {};
