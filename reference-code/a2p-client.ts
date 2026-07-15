/**
 * A2P CLIENT — CLEARSKY FORWARDING MODULE
 *
 * Forwards Telnyx webhook payloads from the A2P Telephony App to
 * the ClearSky Orchestrator App after processing is complete.
 *
 * Voice:  POST /api/signals/telnyx/a2p  (carries transcript + ivr_path + call_priority)
 * SMS:    POST /api/signals/telnyx/sms
 *
 * Gap fixed: previously forwarded to /webhooks/telnyx/voice (deleted shim)
 * Now correctly targets /api/signals/telnyx/a2p — the canonical receiving endpoint.
 */

import { env } from '$env/static/private';

const CLEARSKY_BASE_URL = env.CLEARSKY_API_URL || 'https://clearskysoftware.net';

function url(path: string): string {
    return `${CLEARSKY_BASE_URL}${path}`;
}

/**
 * Forward a voice webhook (with transcript) to the ClearSky Orchestrator.
 * Called after Groq transcription + analysis completes in the A2P app.
 *
 * The rawBody should contain:
 * {
 *   data: {
 *     event_type: 'call.transcription',
 *     payload: {
 *       from, to, call_control_id,
 *       transcription: { text: '...' },
 *       ivr_path: 'Main Menu > Service',
 *       call_priority: 'standard' | 'emergency'
 *     }
 *   }
 * }
 */
export async function forwardVoiceWebhook(
    rawBody: string
): Promise<{ ok: boolean; status: number; body: unknown }> {
    const target = url('/api/signals/telnyx/a2p');
    console.log(`[A2P] Forwarding Voice transcript to: ${target}`);

    const res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody
    });

    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
}

/**
 * Forward an inbound SMS to the ClearSky Orchestrator.
 */
export async function forwardSmsWebhook(
    rawBody: string
): Promise<{ ok: boolean; status: number; body: unknown }> {
    const target = url('/api/signals/telnyx/sms');
    console.log(`[A2P] Forwarding SMS to: ${target}`);

    const res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody
    });

    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
}
