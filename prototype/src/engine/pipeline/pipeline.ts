// The S1–S7 pipeline: Event Intake → Signal Detection → Orchestrator Decision →
// Action Queue → Execution → Outcome → Feedback (the one workflow every channel
// feeds into, per the locked pipeline note in every spec).

import { action, type ActionDef } from "./actions.js";
import { AnalysisEngine, StubAnalysisEngine, type AiAnalysis } from "./analysis.js";
import { detectSignals, PRIORITY_RANK, type SignalContext, type SignalDef } from "./signals.js";
import type { Tier } from "../../types.js";
import type { GapHit } from "../gaps.js";

export interface PipelineInput {
  eventType: string;
  provider: string; // 'web_pixel' | 'lead_grabber' | 'telnyx_voice' | 'gbp_review' | ...
  profileId: string | null;
  isNewCustomer: boolean;
  tier?: Tier;
  text?: string;
  conversionType?: SignalContext["conversionType"];
  callOutcome?: SignalContext["callOutcome"];
  review?: SignalContext["review"];
}

export interface QueuedAction {
  actionId: string;
  name: string;
  owner: ActionDef["owner"];
  /** Resolved execution status after safety rules + approval gates. */
  status: "completed" | "waiting_for_approval" | "blocked";
  postedExternally: boolean;
  approvalWaitHours: number | null;
  notes: string[];
}

export interface Feedback {
  signalValidity: "likely_valid" | "likely_invalid" | "uncertain";
  actionExecutionQuality: "worked_as_expected" | "failed" | "n/a";
  humanReviewState: "not_applicable" | "waiting_for_approval" | "approved";
  decisionQuality: "reasonable_so_far";
  productionRulesChanged: boolean;
  tuningCandidates: string[];
}

export interface PipelineResult {
  eventId: string;
  analysis?: AiAnalysis;
  signals: string[];
  dominant?: string;
  suppressed: string[];
  actions: QueuedAction[];
  feedback?: Feedback;
  gaps: GapHit[];
  notes: string[];
}

let seq = 0;

export class Pipeline {
  constructor(private analysisEngine: AnalysisEngine = new StubAnalysisEngine()) {}

  process(input: PipelineInput): PipelineResult {
    const eventId = `evt_${++seq}`;
    const notes: string[] = [];
    const gaps: GapHit[] = [];

    // A live call can only reach S6/S7 once the CallEvent→events bridge fires
    // (fires twice: at DTMF and at completion). Still unbuilt — flag it.
    if (input.provider === "telnyx_voice") {
      gaps.push({ ref: "KBS", note: "CallEvent→events bridge is unbuilt; this call reaches S1–S7 via the story-proposed multi-fire mechanism" });
    }

    // ── S1 Event Intake: normalize, enrich, match, AI extract ────────────────
    const analysis = input.text
      ? this.analysisEngine.analyze(input.text, { isNewCustomer: input.isNewCustomer })
      : undefined;
    if (analysis) {
      notes.push(
        `S1 AI analysis → emergency:${analysis.emergency} urgency:${analysis.urgency} ` +
          `opportunity:${analysis.opportunity} momentum:${analysis.momentum} sentiment:${analysis.sentiment}`,
      );
    }

    // ── S2 Signal Detection ──────────────────────────────────────────────────
    const ctx: SignalContext = {
      analysis,
      isNewCustomer: input.isNewCustomer,
      conversionType: input.conversionType,
      tier: input.tier,
      callOutcome: input.callOutcome,
      review: input.review,
    };
    const candidates = detectSignals(ctx);
    for (const s of candidates) if (s.gap) gaps.push({ ref: s.gap, note: gapNote(s) });

    if (candidates.length === 0) {
      return { eventId, analysis, signals: [], suppressed: [], actions: [], gaps, notes };
    }

    // ── S3 Orchestrator: rank → dominant → suppress → select actions ─────────
    const ranked = [...candidates].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    const dominant = ranked[0]!;
    let supporting = ranked.slice(1);

    // Safety: an emergency signal suppresses all other A2P signals.
    if (dominant.code === "EMERGENCY_SERVICE") {
      notes.push("S3 safety: EMERGENCY_SERVICE suppresses all other signals");
    }
    const suppressed = supporting.map((s) => s.code);

    // Select actions: dominant's + non-suppressed supporting signals', in order, deduped.
    const selectedSignals = dominant.code === "EMERGENCY_SERVICE" ? [dominant] : [dominant, ...supporting];
    const actionIds = dedupe(selectedSignals.flatMap((s) => s.actions));

    // ── S4 Queue + S5 Execution (with safety gates) ──────────────────────────
    const actions: QueuedAction[] = actionIds.map((id) => this.executeAction(id, gaps));

    // ── S6 Outcome is folded into each QueuedAction; ── S7 Feedback aggregates ─
    const anyHeld = actions.some((a) => a.status === "waiting_for_approval");
    const feedback: Feedback = {
      signalValidity: "likely_valid",
      actionExecutionQuality: "worked_as_expected",
      humanReviewState: anyHeld ? "waiting_for_approval" : "not_applicable",
      decisionQuality: "reasonable_so_far",
      productionRulesChanged: false,
      tuningCandidates: [],
    };

    return {
      eventId,
      analysis,
      signals: candidates.map((s) => s.code),
      dominant: dominant.code,
      suppressed,
      actions,
      feedback,
      gaps,
      notes,
    };
  }

  private executeAction(id: string, gaps: GapHit[]): QueuedAction {
    const def = action(id);
    if (def.proposedGap) gaps.push({ ref: def.proposedGap, note: `${def.id} (${def.name}) — proposed/consent basis open` });
    const notes: string[] = [];

    // Safety: never auto-post public content; never auto-execute approval-required.
    const held = def.requiresApproval || !!def.postsExternally;
    if (def.postsExternally) notes.push("no-auto-post safety rule → held for approval");

    if (held) {
      return {
        actionId: id,
        name: def.name,
        owner: def.owner,
        status: "waiting_for_approval",
        postedExternally: false, // not posted until approved
        approvalWaitHours: null,
        notes,
      };
    }
    return {
      actionId: id,
      name: def.name,
      owner: def.owner,
      status: "completed",
      postedExternally: false,
      approvalWaitHours: null,
      notes,
    };
  }
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function gapNote(s: SignalDef): string {
  if (s.gap === "23") return `${s.code} wired to its correct action (${s.actions[0]}), fixing the seed mis-wire to ACT-REV-007`;
  if (s.gap === "32") return `${s.code} is defined twice across the two seed files; using the 004_40_signals_seed definition`;
  return `${s.code} flagged`;
}
