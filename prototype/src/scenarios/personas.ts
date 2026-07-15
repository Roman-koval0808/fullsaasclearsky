// The five remaining persona archetypes (customer-journeys/00-index.md). Their
// narrative journey files (02–06) are unwritten stubs, so — unlike Denise and
// Barry — these are NOT reproductions of a written story. They're prototype-
// authored trajectories that exercise the engine across different entry points
// and behaviours, to show it generalizes past the two hand-written journeys.
// Deltas follow the same per-page-authored model.

import type { Journey } from "../types.js";

// George's journey is now written in full (customer-journeys/02-…George.md) and
// lives in its own faithful scenario, scenarios/george.ts — no longer a stub here.

// Peter — male, 60, cautious researcher who never converts (stays 2B).
const peter: Journey = {
  id: "peter",
  title: "Peter1 — FAQ research, no conversion",
  source: "customer-journeys/03-clearsky-home-01Peter.md (stub)",
  events: [
    { type: "page_load", day: 0, device: "laptop", page: "/faq", delta: 4, bucketTag: "research" },
    { type: "scroll_25", day: 0, device: "laptop", page: "/faq", delta: 3, bucketTag: "research" },
    { type: "dwell_30", day: 0, device: "laptop", page: "/faq", delta: 4, bucketTag: "research" },
    { type: "page_load", day: 20, device: "laptop", page: "/faq", delta: 4, bucketTag: "research", label: "returns 20 days later — well past grace" },
  ],
};

// Betty — female, 35, teacher; blog → guide download (email_capture → Tier 1).
const betty: Journey = {
  id: "betty",
  title: "Betty1 — blog → guide download",
  source: "customer-journeys/04-clearsky-home-01Betty.md (stub)",
  events: [
    { type: "page_load", day: 0, device: "phone", page: "/blog", delta: 3, bucketTag: "research" },
    { type: "scroll_50", day: 0, device: "phone", page: "/blog", delta: 5, bucketTag: "research" },
    { type: "dwell_60", day: 0, device: "phone", page: "/blog", delta: 7, bucketTag: "research" },
    { type: "email_capture", day: 0, device: "phone", page: "/blog", identifier: { kind: "email", valueHash: "sha256(betty@example.com)" } },
  ],
};

// Francine — female, 45, lawyer; arrives via ad → Lead Grabber email-me (Tier 1).
const francine: Journey = {
  id: "francine",
  title: "Francine1 — ad → Lead Grabber (email-me)",
  source: "customer-journeys/05-clearsky-home-01Francine.md (stub)",
  events: [
    { type: "page_load", day: 0, device: "phone", page: "/", delta: 0, bucketTag: "unclassified", label: "arrives from a Google Ad (2B)" },
    { type: "dwell_30", day: 0, device: "phone", page: "/", delta: 4, bucketTag: "research" },
    { type: "lg_open", day: 0, device: "phone", page: "/", delta: 8, bucketTag: "active" },
    { type: "lg_submit", day: 0, device: "phone", page: "/", delta: 15, bucketTag: "active", identifier: { kind: "email", valueHash: "sha256(francine@example.com)" }, text: "Please email me a quote for a full bathroom renovation." },
  ],
};

// Coreen — female, 60; gallery comparison → Call Now while still anonymous (2B).
const coreen: Journey = {
  id: "coreen",
  title: "Coreen1 — gallery → Call Now (still 2B)",
  source: "customer-journeys/06-clearsky-home-01Coreen.md (stub)",
  events: [
    { type: "page_load", day: 0, device: "laptop", page: "/gallery", delta: 5, bucketTag: "comparison" },
    { type: "scroll_50", day: 0, device: "laptop", page: "/gallery", delta: 5, bucketTag: "comparison" },
    { type: "call_click", day: 0, device: "laptop", page: "/gallery", label: "taps Call Now — anonymous, session-bound number carries her history" },
  ],
};

export const personas: Journey[] = [peter, betty, francine, coreen];
