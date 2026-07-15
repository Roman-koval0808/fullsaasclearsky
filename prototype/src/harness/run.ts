// Runs a journey through the engine, producing a Trace (and exposing the engine
// so callers can take mid/after snapshots of untouched records, e.g. the laptop).

import { Engine } from "../engine/engine.js";
import { Pipeline, type PipelineInput } from "../engine/pipeline/pipeline.js";
import type { AnalysisEngine } from "../engine/pipeline/analysis.js";
import { SLAMonitor, CallBinding, bridgeMerge } from "../engine/a2p/a2p.js";
import type { Journey, SimEvent } from "../types.js";
import type { Trace, TraceStep, RecordState } from "./trace.js";
import type { GapHit } from "../engine/gaps.js";

export interface RunResult {
  trace: Trace;
  engine: Engine;
}

/** Event types handled by the A2P/SLA time-axis rather than the scoring engine. */
const A2P_TYPES = new Set(["sla_register", "outbound_call", "sla_check", "autocall_authorize", "commitment_extracted"]);

export function runJourney(journey: Journey, analysisEngine?: AnalysisEngine): RunResult {
  const engine = new Engine();
  const pipeline = new Pipeline(analysisEngine);
  const sla = new SLAMonitor();
  const binding = new CallBinding();
  const trace: Trace = { journeyId: journey.id, steps: [] };

  for (const ev of journey.events) {
    if (A2P_TYPES.has(ev.type)) {
      trace.steps.push(handleA2P(ev, engine, sla, binding));
      continue;
    }
    const step = engine.process(ev);
    if (ev.gaps) step.gaps.push(...ev.gaps); // story-specific gaps on this touchpoint
    const input = pipelineInputFor(ev, step);
    if (input) {
      const result = pipeline.process(input);
      step.pipeline = result;
      step.gaps.push(...result.gaps);
    }
    trace.steps.push(step);
  }
  return { trace, engine };
}

/** Drive the SLA clock + autocaller bridge, carrying the current record's state. */
function handleA2P(ev: SimEvent, engine: Engine, sla: SLAMonitor, binding: CallBinding): TraceStep {
  const notes: string[] = [];
  const gaps: GapHit[] = [];
  let state: RecordState;
  try {
    state = engine.snapshot(ev.device, ev.day).state; // read-only peek (idle 0 → no demotion)
  } catch {
    state = { fingerprint: `fp_${ev.device}`, tier: "T1", bucket: "active", scoreRaw: 0, identifiers: [] };
  }
  const minute = ev.minute ?? 0;

  switch (ev.type) {
    case "sla_register": {
      sla.register(ev.taskId!, ev.customerNumber!, ev.slaMinutes ?? 10, minute);
      notes.push(`ACT-CALL-001 callback task created + auto-reply "a rep will call in ${ev.slaMinutes ?? 10} minutes" — SLA clock started`);
      break;
    }
    case "outbound_call": {
      sla.recordOutbound(ev.customerNumber!, minute);
      notes.push(`outbound contact logged to ${ev.customerNumber}`);
      break;
    }
    case "sla_check": {
      const e = sla.checkBreach(ev.taskId!, minute);
      notes.push(e.note);
      if (e.breached) {
        notes.push(`SLA BREACH → escalation channels fire to the rep: ${e.channels.join(", ")}`);
        notes.push(`  1. SMS — "callback to ${ev.customerNumber} is overdue. Call now."`);
        notes.push(`  2. push notification — same content`);
        notes.push(`  3. automated call — "you're in violation of your SLA. Press 1 to be connected now."`);
        gaps.push({ ref: "35", note: "who the breach escalates to when the assigned rep IS the owner (Bert) — and whether escalation repeats — is open" });
      }
      break;
    }
    case "autocall_authorize": {
      const r = bridgeMerge(ev.keypress === "1");
      notes.push(r.note);
      if (r.connected) {
        sla.recordOutbound(ev.customerNumber!, minute); // the bridge IS the recovered callback
        notes.push(`callback recovered ${minute - (ev.slaMinutes ?? 10)} min past the promise, only because the escalation caught what the rep missed`);
      }
      break;
    }
    case "commitment_extracted": {
      notes.push(`post-call transcript → extracted "${ev.label ?? "commitment"}"`);
      notes.push(`ACT-CALL-010 (write to rep calendar, proposed) + ACT-CALL-004 (log to Barry's profile) — both automatic, recap only`);
      gaps.push({ ref: "41", note: "ACT-CALL-010 is a proposed Action; also open whether the rep's 'on my way' text goes through A2P or a personal phone" });
      break;
    }
  }

  return { day: ev.day, minute, device: ev.device, event: ev.type, label: ev.label, state, profileWasNew: false, notes, gaps };
}

/** Decide whether an event runs the S1–S7 pipeline, and with what input. */
function pipelineInputFor(ev: SimEvent, step: TraceStep): PipelineInput | null {
  const profileId = step.state.hubProfileId ?? null;
  const base = {
    eventType: ev.type,
    profileId,
    isNewCustomer: step.profileWasNew,
    tier: step.state.tier,
  };
  if (ev.type === "lg_submit" && ev.text) {
    return { ...base, provider: "lead_grabber", text: ev.text };
  }
  if (ev.type === "email_capture") {
    return { ...base, provider: "web_pixel", conversionType: "email_capture" };
  }
  // A completed live call — transcript runs S1–S7 the same way (A2P §6.6).
  if (ev.type === "call_completed" && ev.text) {
    return { ...base, provider: "telnyx_voice", text: ev.text, callOutcome: "connected" };
  }
  // A voicemail — same pipeline, source_type voicemail.
  if (ev.type === "voicemail" && ev.text) {
    return { ...base, provider: "telnyx_voice", text: ev.text, callOutcome: "voicemail" };
  }
  // A GBP review — drives the growth signals (testimonial / referral).
  if (ev.type === "review_received" && ev.review) {
    return { ...base, provider: "gbp_review", review: ev.review };
  }
  return null;
}

/** Flatten all gaps a run leaned on, de-duplicated by ref+note, for the report. */
export function collectGaps(trace: Trace): GapHit[] {
  const seen = new Set<string>();
  const out: GapHit[] = [];
  for (const step of trace.steps) {
    for (const g of step.gaps) {
      const key = `${g.ref}::${g.note}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(g);
      }
    }
  }
  return out;
}
