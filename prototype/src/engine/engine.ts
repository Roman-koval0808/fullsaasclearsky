// The Phase 1 engine: identity/tier resolution + engagement scoring + decay.
// One record per device fingerprint. Records never merge across devices
// (cross-device fingerprint cap <70%, MA v3 §4.7).

import type { Identifier, SimEvent, Tier, Bucket } from "../types.js";
import { outranks } from "../types.js";
import type { GapHit } from "./gaps.js";
import type { RecordState, TraceStep } from "../harness/trace.js";
import {
  BUCKET_DECAY,
  IVR_DELTAS,
  LOCKED_DELTAS,
  RECENCY_BONUS,
  SITE_PERSONALIZATION_THRESHOLD,
} from "./scoring/config.js";

interface IdentityRecord {
  fingerprint: string;
  anonymousId: string;
  tier: Tier;
  hubProfileId?: string;
  identifiers: Identifier[];
  scoreRaw: number;
  bucket: Bucket;
  lastTouchDay: number;
  /** Demotion is suspended while an appointment is open + future-dated (Denise Ch4). */
  appointmentOpen: boolean;
}

export class Engine {
  private records = new Map<string, IdentityRecord>();
  private profileSeq = 0;

  /** Process one scripted touchpoint, returning the observable trace step. */
  process(ev: SimEvent): TraceStep {
    const notes: string[] = [];
    const gaps: GapHit[] = [];
    let profileWasNew = false;
    const fingerprint = this.fingerprintFor(ev.device, gaps);
    let rec = this.records.get(fingerprint);

    // ── Identity: 10-second floor, then record creation ──────────────────────
    const clearsFloor = ev.clearsFloor ?? true;
    if (!rec) {
      if (!clearsFloor) {
        notes.push("below 10-second floor (§4.5a) — aggregate noise, no record created");
        return {
          day: ev.day,
          device: ev.device,
          event: ev.type,
          label: ev.label,
          state: {
            fingerprint,
            tier: "T3",
            bucket: "unclassified",
            scoreRaw: 0,
            identifiers: [],
          },
          profileWasNew: false,
          notes,
          gaps,
        };
      }
      rec = this.createRecord(fingerprint);
      notes.push("cleared 10s floor → new Tier 2B record (cookie + fingerprint, no identifier)");
    } else {
      // Return visit: lazily apply any decay-driven demotion before scoring.
      this.applyDemotion(rec, ev.day, notes, gaps);
    }

    const idleDays = ev.day - rec.lastTouchDay;

    // ── Scoring ──────────────────────────────────────────────────────────────
    const { delta: baseDelta, tag } = this.resolveDelta(ev, gaps);
    let delta = baseDelta;

    // +10 recency bonus: a recognized RETURN within 3 days, on a page load.
    // Must be a new session (idle ≥ 1 day) — NOT a same-session page nav
    // (idle 0), which would otherwise add +10 to every page click. George's
    // Ch1 (home → gallery in one sitting) exposed that mis-fire.
    if (
      ev.type === "page_load" &&
      rec.scoreRaw > 0 &&
      idleDays >= 1 &&
      idleDays <= RECENCY_BONUS.withinDays
    ) {
      delta += RECENCY_BONUS.points;
      notes.push(`+${RECENCY_BONUS.points} recency bonus (recognized return within ${RECENCY_BONUS.withinDays} days)`);
      gaps.push({ ref: "14", note: "recency bonus lives only in the Denise story, not the rules config" });
    }

    const before = rec.scoreRaw;
    rec.scoreRaw = Math.min(rec.scoreRaw + delta, 100); // capped, never decrements mid-session
    if (delta !== 0) notes.push(`score ${before} ${delta >= 0 ? "+" : ""}${delta} → ${rec.scoreRaw}`);

    // Bucket escalates only (never fights once it has won).
    if (tag && outranks(tag, rec.bucket)) {
      notes.push(`bucket ${rec.bucket} → ${tag} (${tag} outranks on the ladder)`);
      rec.bucket = tag;
    }

    // Site Personalization unlock note (Tier 2/2B on-page).
    if (before < SITE_PERSONALIZATION_THRESHOLD && rec.scoreRaw >= SITE_PERSONALIZATION_THRESHOLD) {
      notes.push(`crossed ${SITE_PERSONALIZATION_THRESHOLD} → Site Personalization eligible (Tier 2/2B)`);
      gaps.push({ ref: "8", note: "≥35 personalization threshold generalized from §10, not locked" });
    }

    rec.lastTouchDay = ev.day;

    // ── Tier promotion on identifier ─────────────────────────────────────────
    if (ev.identifier) profileWasNew = this.promote(rec, ev.identifier, notes);

    // ── Check for unbuilt system gaps ────────────────────────────────────────
    if (ev.type === "voicemail_received" && ev.amount) gaps.push({ ref: "36", note: "Supplier/inventory purchasing system is outside scope" });
    if (ev.type === "supplier_delivery_received") gaps.push({ ref: "37", note: "No trigger for supplier delivery received" });
    if (ev.type === "job_completed") gaps.push({ ref: "38", note: "No Action for job-completed event" });
    if (ev.type === "invoice_sent" || ev.type === "payment_received") gaps.push({ ref: "39", note: "No Action for sending an invoice or balance collection" });
    if (ev.type === "outbound_call_voicemail") gaps.push({ ref: "42", note: "Outbound call to voicemail capture is inferred" });
    if (ev.type === "scheduling_email_sent" || ev.type === "slot_selected") gaps.push({ ref: "43", note: "Self-service slot selection is proposed" });
    if (ev.type === "review_request_sent") gaps.push({ ref: "24", note: "No Action exists for review request" });

    return {
      day: ev.day,
      device: ev.device,
      event: ev.type,
      label: ev.label,
      state: this.snapshotState(rec),
      profileWasNew,
      notes,
      gaps,
    };
  }

  /** Read a record's state at a given day, applying lazy demotion (no new event). */
  snapshot(device: string, day: number): { state: RecordState; notes: string[]; gaps: GapHit[] } {
    const fingerprint = this.fingerprintFor(device, []);
    const rec = this.records.get(fingerprint);
    if (!rec) throw new Error(`no record for device "${device}"`);
    const notes: string[] = [];
    const gaps: GapHit[] = [];
    this.applyDemotion(rec, day, notes, gaps);
    return { state: this.snapshotState(rec), notes, gaps };
  }

  /** Mark a profile as having an open appointment (suspends demotion). */
  setAppointmentOpen(device: string, open: boolean): void {
    const rec = this.records.get(this.fingerprintFor(device, []));
    if (rec) rec.appointmentOpen = open;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private fingerprintFor(device: string, _gaps: GapHit[]): string {
    // GAP #1: real fingerprinting technique unchosen. Mock: device label is a
    // stable per-device id. Two devices never legitimately merge (cap <70%).
    return `fp_${device}`;
  }

  private createRecord(fingerprint: string): IdentityRecord {
    const rec: IdentityRecord = {
      fingerprint,
      anonymousId: `anon_${fingerprint}`,
      tier: "T2B",
      identifiers: [],
      scoreRaw: 0,
      bucket: "unclassified",
      lastTouchDay: 0,
      appointmentOpen: false,
    };
    this.records.set(fingerprint, rec);
    return rec;
  }

  private resolveDelta(ev: SimEvent, gaps: GapHit[]): { delta: number; tag?: Bucket } {
    // Web pixel events carry a page-authored delta + tag.
    if (ev.delta !== undefined) return { delta: ev.delta, tag: ev.bucketTag };
    // IVR keypress — proposed delta table, needs the CallEvent→events bridge.
    if (ev.type === "ivr_dtmf" && ev.dtmf) {
      gaps.push({ ref: "KBS", note: "IVR-selection scoring depends on the unbuilt CallEvent→events bridge" });
      const row = IVR_DELTAS[ev.dtmf];
      return { delta: row?.delta ?? 0, tag: row?.tag };
    }
    // Other locked/provider deltas.
    const locked = LOCKED_DELTAS[ev.type];
    if (locked) return { delta: locked.delta, tag: locked.tag };
    return { delta: 0, tag: ev.bucketTag };
  }

  /** Returns true when a brand-new hub profile was minted by this identifier. */
  private promote(rec: IdentityRecord, id: Identifier, notes: string[]): boolean {
    rec.identifiers.push(id);
    // email hash / phone / forwarded token = strong identifier → Tier 1 immediately.
    if (rec.tier !== "T1") {
      rec.tier = "T1";
      const isNew = !rec.hubProfileId;
      rec.hubProfileId = rec.hubProfileId ?? `hub_${++this.profileSeq}`;
      notes.push(
        `strong identifier (${id.kind}) → Tier 1 immediately; merged this device's anonymous history onto ${rec.hubProfileId}`,
      );
      notes.push("cross-device records are NOT merged (fingerprint cap <70%, §4.7)");
      return isNew;
    }
    return false;
  }

  private applyDemotion(rec: IdentityRecord, day: number, notes: string[], gaps: GapHit[]): void {
    if (rec.appointmentOpen) return; // suspended while an appointment is open
    const idleDays = day - rec.lastTouchDay;
    if (idleDays <= 0) return;
    // A record can demote through multiple levels on one read; the while-loop
    // stops naturally once a bucket isn't both under-threshold and past-grace.
    for (;;) {
      const cfg = BUCKET_DECAY[rec.bucket];
      if (!cfg) return;
      const scoreLive = rec.scoreRaw * Math.pow(0.5, idleDays / cfg.halfLifeDays);
      const under = scoreLive < cfg.threshold;
      const pastGrace = idleDays > cfg.graceDays;
      if (under && pastGrace) {
        notes.push(
          `demote ${rec.bucket} → ${cfg.demoteTo} (score_live ${scoreLive.toFixed(1)} < ${cfg.threshold} AND idle ${idleDays}d > ${cfg.graceDays}d grace)`,
        );
        gaps.push({ ref: "V2", note: "grace/half-life from story; confirm vs current Four Buckets report" });
        rec.bucket = cfg.demoteTo;
      } else {
        return;
      }
    }
  }

  private snapshotState(rec: IdentityRecord): RecordState {
    return {
      fingerprint: rec.fingerprint,
      tier: rec.tier,
      bucket: rec.bucket,
      scoreRaw: rec.scoreRaw,
      hubProfileId: rec.hubProfileId,
      identifiers: rec.identifiers.map((i) => `${i.kind}:${i.valueHash}`),
    };
  }
}
