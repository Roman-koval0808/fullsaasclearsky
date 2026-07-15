// George — Chapter 1 (customer-journeys/02-clearsky-home-01George.md, written by
// Rory). A deliberate contrast case: a cost-conscious comparison shopper who
// reaches the `active` bucket through pure CONTENT engagement — a financing guide
// download (+12, active) — WITHOUT ever touching a conversion tool or leaving an
// identifier. He stays Tier 2B the whole session, then leaves. Deltas/bucket tags
// are the page-authored values cited in the story.

import type { Journey } from "../types.js";

// Two gaps George's story flags — NEW, not yet in the tracker.
const GAP_CONTENT = {
  ref: "NEW-A",
  note: "NEW (Rory, not yet in tracker): the services grid's card copy is written for named/urgent problems (burst pipe, no hot water), not a slow undiagnosed one a homeowner is getting ahead of — the system sees engagement, not the customer's own framing. A content-level echo of Barry's Ch1 Emergency-band gap.",
};
const GAP_ACTIVE_NO_ID = {
  ref: "NEW-B",
  note: "NEW (Rory, not yet in tracker): no signal keys off reaching `active` via content engagement with no conversion tool touched. 'Engaged enough to look like a hot lead but gave us no way to reach them' is indistinguishable, in bucket terms, from a real Lead Grabber/FotoJobber conversion — but one has a phone/email on file and the other doesn't.",
};

export const george: Journey = {
  id: "george",
  title: "George's Story — comparison shopper reaches `active` anonymously (Ch1)",
  source: "customer-journeys/02-clearsky-home-01George.md",
  events: [
    // ── Arrival — Tier 2B, same as anyone ────────────────────────────────────
    { type: "page_load", day: 0, device: "laptop", page: "/", delta: 0, bucketTag: "unclassified", label: "Saturday morning — opens the home page on his laptop" },

    // ── The services grid doesn't quite have his problem ─────────────────────
    { type: "scroll_50", day: 0, device: "laptop", page: "/", delta: 5, bucketTag: "comparison", label: "reads down through all eight service cards" },
    { type: "scroll_75", day: 0, device: "laptop", page: "/", delta: 7, bucketTag: "comparison" },
    { type: "svc_click", day: 0, device: "laptop", page: "/pipe-repair", delta: 0, bucketTag: "comparison", label: "clicks /pipe-repair — the closest match, but a compromise", gaps: [GAP_CONTENT] },

    // ── The FAQ — the two questions that matter to a comparison shopper ──────
    { type: "faq_expand", day: 0, device: "laptop", page: "/faq", delta: 5, bucketTag: "research", label: "'How does flat-rate pricing work?' — the reassurance he needed" },
    { type: "faq_expand", day: 0, device: "laptop", page: "/faq", delta: 5, bucketTag: "research", label: "'Do you charge for estimates?' — a number without committing" },

    // ── Before & After — a page that starts sessions at `comparison` ─────────
    { type: "page_load", day: 0, device: "laptop", page: "/before-after-gallery", delta: 4, bucketTag: "comparison", label: "Before & After gallery — this page's page_load is already tagged comparison" },
    { type: "ba_slider_drag", day: 0, device: "laptop", page: "/before-after-gallery", delta: 8, bucketTag: "comparison", label: "drags the before/after sliders on a few projects" },
    { type: "testimonials_view", day: 0, device: "laptop", page: "/before-after-gallery", delta: 6, bucketTag: "comparison", label: "reads a few testimonials" },

    // ── The financing section — the part that speaks to him ──────────────────
    { type: "fin_plan_view", day: 0, device: "laptop", page: "/before-after-gallery", delta: 5, bucketTag: "comparison", label: "opens the 0%-for-12-months plan" },
    { type: "fin_plan_view", day: 0, device: "laptop", page: "/before-after-gallery", delta: 5, bucketTag: "comparison", label: "opens a second plan — reads the actual terms" },

    // ── The tip: reaches `active` via content, still anonymous ───────────────
    { type: "financing_guide_download", day: 0, device: "laptop", page: "/before-after-gallery", delta: 12, bucketTag: "active", label: "downloads 'Financing Your Home Expansion' → ACTIVE bucket, still Tier 2B (no identifier)", gaps: [GAP_ACTIVE_NO_ID] },

    // ── He leaves anyway ─────────────────────────────────────────────────────
    { type: "tab_close", day: 0, device: "laptop", delta: 0, label: "closes the tab to show his wife the PDF — a highly-engaged 2B session simply goes quiet" },
  ],
};
