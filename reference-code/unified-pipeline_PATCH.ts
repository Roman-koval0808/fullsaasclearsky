/**
 * UNIFIED PIPELINE — PROFILE LOOKUP TIMEOUT PATCH
 *
 * Replace the existing customerProfile lookup in Step 3 of UnifiedPipelineEngine.process()
 * with this Promise.race() implementation.
 *
 * Spec ref: A2P Developer Spec §2.2 — 2-second hard timeout on profile lookup
 * Gap: Profile lookup had no timeout — RESOLVED
 *
 * Also documents the business resolution fix — removal of unsafe findFirst() fallback.
 */

/*
// ── STEP 2: Business Resolution ────────────────────────────────────────────
// DO NOT use findFirst() as a fallback — this can resolve the wrong business.
// If business cannot be resolved, fail fast with a clear error.

let business = null;
if (payload.business_id) {
    business = await prisma.business.findUnique({ where: { id: payload.business_id } });
} else if (payload.business_external_id) {
    business = await prisma.business.findUnique({ where: { business_id: payload.business_external_id } });
}

if (!business) {
    log(`[Step 2] Business resolution ERROR: Could not find business for ${payload.business_external_id || payload.business_id}`);
    throw new Error(`Business not found: ${payload.business_external_id || payload.business_id}`);
}

// ── STEP 3: Identity Resolution — 2-second timeout (spec §2.2) ────────────
if (payload.customer_phone || payload.customer_email) {
    log(`[Step 3] Identity Resolution: Attempting to bind to customer profile...`);

    const lookupPromise = prisma.customerProfile.findFirst({
        where: {
            business_id: business.id,
            OR: [
                payload.customer_phone ? { phone_number: payload.customer_phone } : undefined,
                payload.customer_email ? { email: payload.customer_email } : undefined,
            ].filter(Boolean) as any[]
        }
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 2000)
    );

    try {
        customerProfile = await Promise.race([lookupPromise, timeoutPromise]) as any;
    } catch (err: any) {
        log(`[Step 3] Identity resolution ${err.message === 'timeout' ? 'TIMED OUT (2s)' : 'FAILED'}. Continuing as anonymous.`);
        // customerProfile remains null — call continues, spec §2.2
    }

    if (customerProfile) {
        log(`[Step 3] Identity Resolved: Linked to "${customerProfile.display_name || customerProfile.first_name || 'Customer'}"`);
    } else {
        log(`[Step 3] Identity Resolution: No profile found. Anonymous event.`);
    }
}

// ── Event.metadata field (added to schema) ────────────────────────────────
// The Event record now includes a metadata Json field.
// This carries A2P-specific context through the pipeline:
// {
//   call_control_id: string,
//   ivr_path: string,
//   call_priority: 'standard' | 'emergency'
// }
//
// Prisma schema addition:
// model Event {
//   ...
//   metadata  Json?  @default("{}")
// }
//
// In the Event.create() call, pass:
// metadata: payload.metadata || {}
*/

export {};
