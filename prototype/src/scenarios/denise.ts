// Denise — the full-loop journey. Phase 1 covers Chapters 1–2 (two devices,
// the record that couldn't survive the silence, email-capture → Tier 1).
// Deltas mirror the site's per-page firePixel() calls; days are simulation days.

import type { Journey } from "../types.js";

export const denise: Journey = {
  id: "denise",
  title: "Denise's Story — RightFlush full loop",
  source: "RightFlush-Denise-Customer-Journey.md",
  events: [
    // ── Chapter 1 — blog, on her phone (late February = day 0) ──────────────
    { type: "page_load", day: 0, device: "phone", page: "/blog", delta: 3, bucketTag: "research", label: "reads the ContentRadar-seeded blog post" },
    { type: "scroll_25", day: 0, device: "phone", page: "/blog", delta: 3, bucketTag: "research" },
    { type: "scroll_50", day: 0, device: "phone", page: "/blog", delta: 5, bucketTag: "research" },
    { type: "dwell_30", day: 0, device: "phone", page: "/blog", delta: 4, bucketTag: "research", label: "~35s, closes the tab" },

    // ── Chapter 1 — before/after gallery, on her laptop (day 3) ─────────────
    // Different device → different fingerprint → a second, unconnected 2B record.
    { type: "page_load", day: 3, device: "laptop", page: "/gallery", delta: 5, bucketTag: "comparison", label: "different device — looks like a different person" },
    { type: "scroll_25", day: 3, device: "laptop", page: "/gallery", delta: 3, bucketTag: "comparison" },
    { type: "scroll_50", day: 3, device: "laptop", page: "/gallery", delta: 5, bucketTag: "comparison" },
    { type: "dwell_30", day: 3, device: "laptop", page: "/gallery", delta: 4, bucketTag: "comparison" },

    // ── Chapter 2 — returns on the phone, day 11 (idle 11d → no recency bonus) ─
    { type: "page_load", day: 11, device: "phone", page: "/faq", delta: 4, bucketTag: "research", label: "day-11 return, straight to FAQ" },
    { type: "scroll_25", day: 11, device: "phone", page: "/faq", delta: 3, bucketTag: "research" },
    { type: "scroll_50", day: 11, device: "phone", page: "/faq", delta: 5, bucketTag: "research" },
    { type: "dwell_30", day: 11, device: "phone", page: "/faq", delta: 4, bucketTag: "research" },
    { type: "dwell_60", day: 11, device: "phone", page: "/faq", delta: 7, bucketTag: "research", label: "reads past a minute → crosses 35" },

    // The Site Personalization lead-magnet banner → she enters her email.
    {
      type: "email_capture",
      day: 11,
      device: "phone",
      page: "/faq",
      identifier: { kind: "email", valueHash: "sha256(denise@example.com)" },
      label: "downloads the Homeowner's Guide — email only",
    },
  ],
};
