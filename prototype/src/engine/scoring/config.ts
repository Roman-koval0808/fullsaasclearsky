// Scoring configuration. Web pixel deltas are page-authored (they ride on the
// event); the values here are the *locked/provider* deltas the engine supplies
// itself, plus the per-bucket decay/demotion parameters.

import type { Bucket } from "../../types.js";

/** Flat +10 for a recognized return within this many days (Denise Ch2). GAP #14. */
export const RECENCY_BONUS = { points: 10, withinDays: 3 };

/** Score at/above which Tier 2/2B on-page Site Personalization unlocks. GAP #8. */
export const SITE_PERSONALIZATION_THRESHOLD = 35;

/** Locked, page-independent deltas (Comprehensive Platform Report scoring table). */
export const LOCKED_DELTAS: Record<string, { delta: number; tag: Bucket }> = {
  call_click: { delta: 15, tag: "active" },
  // conversionType: booking — highest single delta in the system (+20).
  booking: { delta: 20, tag: "active" },
  // email_capture promotes tier but is not a stronger behavioural signal → no score delta.
  email_capture: { delta: 0, tag: "research" },
};

/** Proposed IVR-selection delta table (Denise Ch3). Needs the CallEvent→events bridge. */
export const IVR_DELTAS: Record<string, { delta: number; tag: Bucket }> = {
  "1": { delta: 6, tag: "active" }, // Service/Repairs
  "2": { delta: 10, tag: "active" }, // Estimates/Quotes
  "3": { delta: 20, tag: "emergency" }, // Emergency → existing +20 override
  "4": { delta: 2, tag: "unclassified" }, // Billing/Admin (tag unchanged)
  "0": { delta: 0, tag: "unclassified" }, // Operator / no input
};

export interface BucketDecay {
  /** Demotion threshold: score_live below this satisfies condition 1. */
  threshold: number;
  /** Grace period in days: idle beyond this satisfies condition 2. */
  graceDays: number;
  /** Half-life in days for the decayed read of score_raw. */
  halfLifeDays: number;
  /** Bucket demoted to when both conditions hold. */
  demoteTo: Bucket;
}

// Values from the Denise story (Ch2). GAP V2: confirm against the current Four
// Buckets report — the working copy may be stale.
export const BUCKET_DECAY: Partial<Record<Bucket, BucketDecay>> = {
  comparison: { threshold: 20, graceDays: 7, halfLifeDays: 30, demoteTo: "research" },
  research: { threshold: 8, graceDays: 14, halfLifeDays: 60, demoteTo: "unclassified" },
  // active-bucket decay is not specified in either story — placeholder, flagged.
  active: { threshold: 35, graceDays: 3, halfLifeDays: 14, demoteTo: "comparison" },
};
