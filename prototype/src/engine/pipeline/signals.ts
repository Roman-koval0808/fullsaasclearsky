// Signal Library. §6.4 A2P signals (driven by AI analysis) + the web/review
// signals the journeys exercise. Each signal carries the fix/flag the stories
// call out:
//   • #23 — SIG-GROW-002/005 are wired to the CORRECT action (ACT-REV-005
//           mark_testimonial_candidate), not the mis-wired ACT-REV-007.
//   • #32 — SIG-CONV-001/002 are defined twice, differently, across the two seed
//           files. We pick the 004_40_signals_seed definition and flag the conflict.

import type { AiAnalysis } from "./analysis.js";

export type Priority = "Critical" | "High" | "Medium" | "Low";
export const PRIORITY_RANK: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export interface SignalContext {
  analysis?: AiAnalysis;
  /** No prior hub profile before this contact (profile_id = null). */
  isNewCustomer: boolean;
  /** Web conversion type, when the event is a web conversion rather than a call. */
  conversionType?: "email_capture" | "booking";
  tier?: "T1" | "T2" | "T2B" | "T3";
  /** call_outcome for voice events. */
  callOutcome?: "connected" | "voicemail" | "missed";
  /** Review fields, for growth signals. */
  review?: { rating: number; praiseTopics: string[]; ratingContentMismatch: boolean; recommends: boolean; confidence: number };
}

export interface SignalDef {
  code: string;
  priority: Priority;
  /** Primary + secondary actions, in order. */
  actions: string[];
  /** Does the context satisfy this signal? */
  matches(ctx: SignalContext): boolean;
  /** Tracker item to flag when this signal fires (optional). */
  gap?: string;
}

const gte = <T extends string>(order: T[], a: T | undefined, min: T): boolean =>
  a !== undefined && order.indexOf(a) >= order.indexOf(min);

const URGENCY = ["low", "medium", "high", "critical"] as const;
const OPPORTUNITY = ["none", "low", "medium", "high"] as const;
const RISK = ["low", "medium", "high"] as const;

export const SIGNALS: SignalDef[] = [
  // ── §6.4 A2P signals ───────────────────────────────────────────────────────
  {
    code: "EMERGENCY_SERVICE",
    priority: "Critical",
    actions: ["ACT-CALL-003"],
    matches: (c) => !!c.analysis?.emergency,
  },
  {
    code: "SERVICE_URGENCY",
    priority: "High",
    actions: ["ACT-CALL-002"],
    matches: (c) => !!c.analysis && gte(URGENCY as unknown as string[], c.analysis.urgency, "high") && c.analysis.sentiment === "negative",
  },
  {
    code: "NEW_CUSTOMER_OPPORTUNITY",
    priority: "High",
    actions: ["ACT-CALL-002", "ACT-CALL-004", "ACT-CALL-005"],
    matches: (c) => c.isNewCustomer && !!c.analysis && gte(OPPORTUNITY as unknown as string[], c.analysis.opportunity, "medium"),
  },
  {
    code: "CALLBACK_REQUIRED",
    priority: "Medium",
    actions: ["ACT-CALL-001"],
    matches: (c) => (c.callOutcome === "voicemail" || c.callOutcome === "missed") && !!c.analysis && gte(URGENCY as unknown as string[], c.analysis.urgency, "medium"),
  },
  {
    code: "CHURN_RISK",
    priority: "High",
    actions: ["ACT-CALL-007"],
    matches: (c) => !!c.analysis && c.analysis.risk === "high" && !c.isNewCustomer,
  },
  {
    code: "BOOKING_OPPORTUNITY",
    priority: "Medium",
    actions: ["ACT-CALL-001", "ACT-CALL-004"],
    matches: (c) => c.analysis?.momentum === "ready_to_book",
  },
  {
    code: "COMPLAINT_SIGNAL",
    priority: "Medium",
    actions: ["ACT-CALL-006"],
    matches: (c) => c.analysis?.sentiment === "negative" && gte(RISK as unknown as string[], c.analysis?.risk, "medium"),
  },

  // ── Web conversion signals (40-signal seed; #32 conflict flagged) ──────────
  {
    code: "SIG-CONV-001", // = new_lead_captured (004 seed) — NOT 002's lead_form_submitted
    priority: "High",
    actions: ["ACT-NURTURE-ENROLL"],
    gap: "32",
    matches: (c) => c.conversionType === "email_capture" && c.tier === "T1",
  },

  // ── Growth signals off a review (#23 fix: correct action wiring) ───────────
  {
    code: "SIG-GROW-002", // testimonial_candidate_detected
    priority: "Low",
    actions: ["ACT-REV-005", "ACT-TASK-001"], // CORRECT: not ACT-REV-007 (mismatch)
    gap: "23",
    matches: (c) => !!c.review && c.review.rating >= 4 && c.review.praiseTopics.length > 0 && !c.review.ratingContentMismatch && c.review.confidence >= 0.8,
  },
  {
    code: "SIG-GROW-005", // referral_or_word_of_mouth_detected
    priority: "Low",
    actions: ["ACT-TASK-001"], // CORRECT fallback: not ACT-REV-007
    gap: "23",
    matches: (c) => !!c.review && c.review.recommends && c.review.confidence >= 0.75,
  },
];

export function detectSignals(ctx: SignalContext): SignalDef[] {
  return SIGNALS.filter((s) => s.matches(ctx));
}
