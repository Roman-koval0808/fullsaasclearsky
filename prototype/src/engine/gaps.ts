// Gap ledger. Per the locked decision (2026-07-06): we build the story-proposed
// mechanisms so journeys run end-to-end, but every one that stands on an *unbuilt*
// or *proposed* spec gets tagged here, so a journey run doubles as a live report
// against specs/clearsky-open-decisions-tracker.md.

export interface GapHit {
  /** Tracker number, e.g. 14 for "+10 recency bonus", or a "KBS" known-build-status tag. */
  ref: string;
  note: string;
}

/** One-line catalogue of the tracker items this prototype touches, for the report. */
export const GAP_CATALOG: Record<string, string> = {
  "1": "Fingerprint technique/library unchosen — mocked here as a stable per-device id.",
  "8": "Site Personalization ≥35 threshold generalized from §10, not locked.",
  "14": "+10 recency bonus (recognized return ≤3 days) lives only in the Denise story, not the rules config.",
  "24": "No Action exists for a post-completion referral request or review request.",
  "30": "Consent basis for the auto-reply SMS is undefined for transactional replies.",
  "31": "No signal covers sustained dwell on the home page's Emergency band.",
  "36": "Supplier/inventory purchasing system is outside ClearSky scope, but unresolved.",
  "37": "No trigger for supplier delivery received.",
  "38": "No Action for job-completed event.",
  "39": "No Action for sending an invoice or balance collection.",
  "40": "No open/closed transaction status concept in specs.",
  "41": "Write appointment commitment to rep calendar is a proposed Action, not locked.",
  "42": "Outbound call to voicemail capture is inferred from general recording rule, not explicit.",
  "43": "Self-service slot selection and scheduling email generation are proposed, not locked.",
  V2: "Grace/half-life values (Comparison 7d/30d, Research 14d/60d) taken from the story; confirm vs current Four Buckets report.",
};
