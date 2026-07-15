// Trace: the stage-by-stage record a journey run emits, and which the Ch8
// touchpoint tables are asserted against.

import type { Bucket, Tier } from "../types.js";
import type { GapHit } from "../engine/gaps.js";
import type { PipelineResult } from "../engine/pipeline/pipeline.js";

/** The observable state of one identity record after an event is processed. */
export interface RecordState {
  fingerprint: string;
  tier: Tier;
  bucket: Bucket;
  /** Frozen raw engagement score (never decays, never decrements mid-session). */
  scoreRaw: number;
  hubProfileId?: string;
  identifiers: string[];
}

/** One processed touchpoint. */
export interface TraceStep {
  day: number;
  /** Minute-within-day, for A2P/SLA steps. */
  minute?: number;
  device: string;
  event: string;
  label?: string;
  /** State of the record this event touched, right after processing. */
  state: RecordState;
  /** True when this event created the hub profile (profile_id was null before). */
  profileWasNew: boolean;
  /** Human-readable notes explaining what the engine did. */
  notes: string[];
  /** Gaps this step leaned on. */
  gaps: GapHit[];
  /** S1–S7 pipeline result, when this event ran the pipeline. */
  pipeline?: PipelineResult;
}

export interface Trace {
  journeyId: string;
  steps: TraceStep[];
}

export function renderTrace(trace: Trace): string {
  const lines: string[] = [];
  lines.push(`# Trace — ${trace.journeyId}`);
  for (const s of trace.steps) {
    const id = s.state.hubProfileId ? ` ${s.state.hubProfileId}` : "";
    const when = s.minute !== undefined ? `day ${s.day} +${s.minute}m` : `day ${s.day}`;
    lines.push(
      `\n${when} · ${s.device} · ${s.event}${s.label ? ` — ${s.label}` : ""}`,
    );
    lines.push(
      `  → ${tierLabel(s.state.tier)} · ${s.state.bucket} · score ${s.state.scoreRaw}` +
        `  [fp:${s.state.fingerprint}${id}]`,
    );
    for (const n of s.notes) lines.push(`     • ${n}`);
    if (s.pipeline) renderPipeline(s.pipeline, lines);
    for (const g of s.gaps) lines.push(`     ⚑ GAP #${g.ref}: ${g.note}`);
  }
  return lines.join("\n");
}

function renderPipeline(p: PipelineResult, lines: string[]): void {
  for (const n of p.notes) lines.push(`     • ${n}`);
  if (p.signals.length) {
    lines.push(`     • S2 signals: ${p.signals.join(", ")}${p.dominant ? `  (dominant: ${p.dominant})` : ""}`);
  }
  for (const a of p.actions) {
    const flag = a.status === "completed" ? "✓ executed" : a.status === "waiting_for_approval" ? `⏸ awaits ${a.owner}` : "blocked";
    lines.push(`     • S4/S5 ${a.actionId} ${a.name} — ${flag}`);
  }
  if (p.feedback) {
    lines.push(`     • S7 feedback: ${p.feedback.signalValidity} · ${p.feedback.actionExecutionQuality} · review:${p.feedback.humanReviewState}`);
  }
}

function tierLabel(t: Tier): string {
  return { T1: "Tier 1", T2: "Tier 2", T2B: "Tier 2B", T3: "Tier 3" }[t];
}
