// Core domain vocabulary for the ClearSky journey simulator.
// Terms mirror the specs: identity tiers (MA v3 §4), engagement buckets/score (§3.2),
// decay/demotion (Four Intent Buckets report).

/** Identity tiers — locked model, MA v3 §4.2. No stray "2A". */
export type Tier = "T1" | "T2" | "T2B" | "T3";

/**
 * Engagement buckets, highest→lowest priority. The bucket only ever *escalates*
 * within a session: a new event's tag replaces the current bucket only if it
 * outranks it on this fixed ladder (index 0 = highest). Denise Ch1 asides.
 */
export const BUCKET_LADDER = [
  "emergency",
  "active",
  "comparison",
  "research",
  "unclassified",
] as const;
export type Bucket = (typeof BUCKET_LADDER)[number];

/** Lower number = higher priority. */
export function bucketRank(b: Bucket): number {
  return BUCKET_LADDER.indexOf(b);
}
/** Does `candidate` outrank `current` on the ladder? */
export function outranks(candidate: Bucket, current: Bucket): boolean {
  return bucketRank(candidate) < bucketRank(current);
}

/** A strong or weak identifier that can promote a session's tier. */
export interface Identifier {
  kind: "email" | "phone" | "token";
  /** SHA-256 normalized hash in the real system (MA v3 §4.4); opaque string here. */
  valueHash: string;
}

/**
 * A single scripted touchpoint in a journey. Web pixel events carry a
 * page-authored `delta` + `bucketTag` (exactly as the site's firePixel() call
 * would); provider/locked events (call_click, ivr_dtmf, booking) leave delta
 * undefined and the engine supplies the locked value.
 */
export interface SimEvent {
  type: string;
  /** Simulation day, used for decay + the ≤3-day recency bonus. */
  day: number;
  /** Minute-within-day, for the A2P SLA clock (Barry Ch2). Defaults to 0. */
  minute?: number;
  /** Device label → one fingerprint → one identity record. e.g. "phone", "laptop". */
  device: string;
  page?: string;
  /** Page-authored engagement delta for web pixel events. */
  delta?: number;
  /** Page-authored bucket tag for web pixel events. */
  bucketTag?: Bucket;
  /** Present when this touchpoint yields an identifier (promotes tier). */
  identifier?: Identifier;
  /** IVR keypress for ivr_dtmf events. */
  dtmf?: string;
  // ── A2P / SLA fields (Barry Ch2) ──────────────────────────────────────────
  /** Callback SLA in minutes (sla_register). */
  slaMinutes?: number;
  /** Callback task id (sla_register / sla_check). */
  taskId?: string;
  /** Customer phone number the SLA tracks. */
  customerNumber?: string;
  /** Rep's authorization keypress for the autocaller bridge (autocall_authorize). */
  keypress?: string;
  /** Free-text the AI Analysis Engine reads (Lead Grabber job description, transcript, review). */
  text?: string;
  /** Financial amount (for deposits, invoices). */
  amount?: number;
  /** Transaction or PO ID. */
  transactionId?: string;
  /** Structured review fields, for review_received events. */
  review?: {
    rating: number;
    praiseTopics: string[];
    ratingContentMismatch: boolean;
    recommends: boolean;
    confidence: number;
  };
  /**
   * Whether this session cleared the 10-second record-creation floor (§4.5a).
   * Defaults true for real sessions; set false to model sub-floor noise.
   */
  clearsFloor?: boolean;
  /** Human-readable note for the trace. */
  label?: string;
  /** Story-specific gaps this touchpoint surfaces (attached to the trace step). */
  gaps?: Array<{ ref: string; note: string }>;
}

export interface Journey {
  id: string;
  title: string;
  source: string;
  events: SimEvent[];
}
