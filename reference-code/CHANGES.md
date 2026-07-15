# call-webhook/+server.ts — Key Changes Summary

This documents every significant change made to the A2P call-webhook handler
during the gap resolution process. Apply these to the full file from your A2P codebase.

---

## 1. ivrPath now carried in client_state from call.initiated

When answering the call and storing client_state, include ivrPath:

```typescript
const clientState = Buffer.from(JSON.stringify({
    ivrFlowId: active.flow.id,
    ivrRuleId: active.rule.id,
    ivrPath: active.flow.title        // ← ADDED: start building the IVR path
})).toString('base64');
```

---

## 2. encodeClientState helper now preserves ivrPath

```typescript
const encodeClientState = (extra: Record<string, unknown>) => {
    // ← CHANGED: decode existing client_state to preserve ivrPath
    let ivrPath = (payload?.client_state
        ? JSON.parse(Buffer.from(payload.client_state as string, 'base64').toString('utf8')).ivrPath
        : '') || '';
    return Buffer.from(JSON.stringify({ ivrFlowId, ivrRuleId, ivrPath, ...extra })).toString('base64');
};
```

---

## 3. Emergency detection in call.gather.ended

```typescript
const digit = digits.trim().charAt(0);

// ← ADDED: Emergency bypass and flag
const isEmergency = digit === '3' || match?.name?.toLowerCase().includes('emergency');
const callPriority = isEmergency ? 'emergency' : 'standard';
```

When routing to extension after emergency detection:

```typescript
// Build updated ivr_path
const currentPath = (payload?.client_state
    ? JSON.parse(Buffer.from(payload.client_state as string, 'base64').toString('utf8')).ivrPath
    : '') || '';
const newPath = currentPath
    ? `${currentPath} > ${match.name || digit}`
    : (match.name || digit);

// Encode with emergency flag
const transferState = Buffer.from(JSON.stringify({
    afterPlaybackTransfer: true,
    transferTo: to,
    ivrFlowId,
    ivrRuleId,
    ivrPath: newPath,       // ← ADDED
    callPriority            // ← ADDED: 'emergency' | 'standard'
})).toString('base64');
```

---

## 4. # digit now starts a voicemail recording (not hangup)

```typescript
if (digit === '#') {
    try {
        // ← CHANGED: was hangup, now starts recording for voicemail
        await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/recording_start`, {
            method: 'POST',
            headers: TELNYX_HEADERS,
            body: JSON.stringify({ format: 'mp3', channels: 'single' })
        });

        await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`, {
            method: 'POST',
            headers: TELNYX_HEADERS,
            body: JSON.stringify({
                payload: 'Please leave your message after the tone. When finished, you may hang up.',
                voice: 'female',
                language: 'en-US'
            })
        });
        console.log('📞 IVR voicemail recording started (#)');
    } catch (err) {
        console.error('❌ Failed to start voicemail recording:', err);
        await telnyxHangup(callControlId);
    }
    break;
}
```

---

## 5. Forward to ClearSky now targets /api/signals/telnyx/a2p

After Groq transcription completes in call.recording.saved handler:

```typescript
// ← CHANGED: was /api/signals/telnyx/voice (deleted endpoint)
// NOW correctly targets the canonical A2P receiving endpoint
fetch('https://clearskysoftware.net/api/signals/telnyx/a2p', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        data: {
            event_type: 'call.transcription',
            payload: {
                from: contactNumber || 'Unknown',
                to: companyNumber || 'Unknown',
                call_control_id: callControlId,
                transcription: { text: transcript },
                ivr_path: finalIvrPath,         // ← ADDED: resolved from client_state
                call_priority: finalPriority     // ← ADDED: 'standard' | 'emergency'
            }
        }
    })
}).catch(err => console.error('[A2P] ClearSky forward failed:', err));
```

Resolve finalIvrPath and finalPriority from client_state:

```typescript
let finalIvrPath = 'Direct Call';
let finalPriority = 'standard';
if (payload?.client_state) {
    try {
        const decoded = JSON.parse(
            Buffer.from(payload.client_state as string, 'base64').toString('utf8')
        );
        finalIvrPath = decoded.ivrPath || finalIvrPath;
        finalPriority = decoded.callPriority || finalPriority;
    } catch (e) {}
}
```

---

## 6. a2p-client.ts forwarding target updated

```typescript
// BEFORE:
const target = url('/webhooks/telnyx/voice');

// AFTER:
const target = url('/api/signals/telnyx/a2p');
```

---

## Security: Ed25519 Webhook Signature Validation

This is already implemented using TELNYX_PUBLIC_KEY env var.
Ensure this env var is set in production — validation runs on every
incoming webhook before any processing begins.
