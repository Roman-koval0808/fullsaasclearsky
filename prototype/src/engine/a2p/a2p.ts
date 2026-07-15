// A2P (Telnyx) mechanisms. Two are modeled here as standalone logic units
// because the journeys describe them as mechanisms, not scored events:
//   • Call binding — the dialed number is the key, never caller ID
//     (clearsky-call-binding-spec). Session-bound numbers carry a live session
//     for a short TTL; dedicated numbers carry their source permanently.
//   • SLA-breach escalation → autocaller bridge-merge (Barry Ch2) — the
//     never-built feature: at sla+5 with no outbound contact, three channels
//     fire; the autocaller bridges the rep to the customer on a keypress.

export type ResolveMode = "session-live" | "cold-caller-id" | "dedicated-source";

interface SessionBinding {
  number: string;
  profileId?: string; // may be absent — a 2B caller still binds
  boundAtMinute: number;
  ttlMinutes: number;
}

export interface DedicatedNumber {
  number: string;
  source: string; // 'gbp' | 'lsa' | 'ad' | 'qr' | ...
}

export interface Resolution {
  mode: ResolveMode;
  profileId?: string;
  source?: string;
  /** True when the rich live-session handoff is gone (TTL lapsed) or off-platform. */
  cold: boolean;
  note: string;
}

export class CallBinding {
  private sessionBindings = new Map<string, SessionBinding>();
  private dedicated = new Map<string, DedicatedNumber>();
  /** caller-ID → profileId, the ordinary inbound lookup (A2P §2.2). */
  private callerIdIndex = new Map<string, string>();

  registerDedicated(d: DedicatedNumber): void {
    this.dedicated.set(d.number, d);
  }
  indexCallerId(callerId: string, profileId: string): void {
    this.callerIdIndex.set(callerId, profileId);
  }
  /** Pull a pooled number and bind it to this session for `ttlMinutes`. */
  bindSession(number: string, profileId: string | undefined, atMinute: number, ttlMinutes = 10): void {
    this.sessionBindings.set(number, { number, profileId, boundAtMinute: atMinute, ttlMinutes });
  }

  /** The dialed number is the key. Caller ID only matters on the cold path. */
  resolve(dialedNumber: string, callerId: string | undefined, atMinute: number): Resolution {
    const b = this.sessionBindings.get(dialedNumber);
    if (b) {
      if (atMinute - b.boundAtMinute <= b.ttlMinutes) {
        return { mode: "session-live", profileId: b.profileId, cold: false, note: "session-bound number within TTL — full live session handed to the rep" };
      }
      // TTL lapsed → cold, resolve by caller ID the ordinary way.
      const p = callerId ? this.callerIdIndex.get(callerId) : undefined;
      return { mode: "cold-caller-id", profileId: p, cold: true, note: "session-bound number past TTL — cold inbound, matched only on caller ID" };
    }
    const d = this.dedicated.get(dialedNumber);
    if (d) {
      const p = callerId ? this.callerIdIndex.get(callerId) : undefined;
      return { mode: "dedicated-source", profileId: p, source: d.source, cold: true, note: `dedicated ${d.source} number — source known instantly, identity by caller-ID match` };
    }
    const p = callerId ? this.callerIdIndex.get(callerId) : undefined;
    return { mode: "cold-caller-id", profileId: p, cold: true, note: "unbound number — ordinary inbound, caller-ID match only" };
  }
}

export interface Escalation {
  breached: boolean;
  channels: string[]; // ['SMS','push','autocall']
  note: string;
}

interface CallbackTask {
  taskId: string;
  customerNumber: string;
  slaMinutes: number;
  createdAtMinute: number;
  outboundAtMinute?: number;
}

export class SLAMonitor {
  private tasks = new Map<string, CallbackTask>();
  /** Extra minutes past the SLA before a breach fires (locked: sla+5). */
  constructor(private breachBufferMinutes = 5) {}

  register(taskId: string, customerNumber: string, slaMinutes: number, createdAtMinute: number): void {
    this.tasks.set(taskId, { taskId, customerNumber, slaMinutes, createdAtMinute });
  }
  /** The rep (or system) actually contacted the customer. */
  recordOutbound(customerNumber: string, atMinute: number): void {
    for (const t of this.tasks.values()) {
      if (t.customerNumber === customerNumber && t.outboundAtMinute === undefined) t.outboundAtMinute = atMinute;
    }
  }

  /** Evaluated at sla+buffer: if no outbound contact happened, escalate. */
  checkBreach(taskId: string, atMinute: number): Escalation {
    const t = this.tasks.get(taskId);
    if (!t) throw new Error(`no callback task ${taskId}`);
    const deadline = t.createdAtMinute + t.slaMinutes + this.breachBufferMinutes;
    const contacted = t.outboundAtMinute !== undefined && t.outboundAtMinute <= atMinute;
    if (atMinute >= deadline && !contacted) {
      return { breached: true, channels: ["SMS", "push", "autocall"], note: `no outbound contact by sla+${this.breachBufferMinutes} (${deadline}m) — three escalation channels fire to the rep` };
    }
    return { breached: false, channels: [], note: contacted ? "callback made in time — no breach" : "still inside the SLA window" };
  }
}

export interface BridgeResult {
  connected: boolean;
  note: string;
}

/**
 * The autocaller bridge-merge. The autocaller can bridge the rep straight to
 * the customer — but only after the rep authorizes it with a keypress; it never
 * connects on its own.
 */
export function bridgeMerge(repAuthorizedKeypress: boolean): BridgeResult {
  if (!repAuthorizedKeypress) {
    return { connected: false, note: "autocaller holds — no keypress, no connection (authorization required first)" };
  }
  return { connected: true, note: "rep pressed 1 → autocaller bridges rep↔customer; IVR plays the merge/recording disclosure before joining" };
}
