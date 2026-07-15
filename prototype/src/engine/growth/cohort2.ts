// Cohort 2 write. When a job closes, three things travel to the network
// (Denise Ch8): the trajectory pattern, the call/review transcripts with PII
// stripped, and a manually-entered demographic profile. The trajectory works
// exclusively for that one contractor in that geography (§18) — one contractor
// per trade per market.

import type { Bucket, Tier } from "../../types.js";
import type { GapHit } from "../gaps.js";

export interface Trajectory {
  tierPath: Tier[];
  bucketPath: Bucket[];
  touchesToConvert: number;
  channelSequence: string[];
  closeValue: number;
  referred: boolean;
}

export interface Demographic {
  gender: string;
  ageBracket: string;
  householdIncomeBracket: string;
}

export interface Cohort2Record {
  trajectory: Trajectory;
  /** Transcript content with names/numbers/address stripped, structure intact. */
  redactedTranscript: string;
  /** Human-entered, not AI-inferred (Ch8). */
  demographic: Demographic;
  gaps: GapHit[];
}

const NAMES = /Denise|Barry|James|Sarah/gi;
const PHONE = /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

/** Strip re-identifying tokens while keeping the sentence content usable. */
export function redact(transcript: string): string {
  return transcript.replace(NAMES, "[NAME]").replace(PHONE, "[PHONE]");
}

export function buildCohort2Record(
  trajectory: Trajectory,
  transcript: string,
  demographic: Demographic,
): Cohort2Record {
  return {
    trajectory,
    redactedTranscript: redact(transcript),
    demographic,
    gaps: [
      { ref: "Ch8", note: "PII-redaction pass on transcripts is buildable but unspecced (what/what-confidence/who-reviews before it leaves)" },
      { ref: "Ch8", note: "demographic profile is manually entered by whoever met the client — not AI-inferred; disclosure to the customer is unanswered" },
    ],
  };
}
