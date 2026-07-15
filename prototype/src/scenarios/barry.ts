// Barry — the Lead Grabber journey (persona archetype "John1"). Phase 1 covers
// Chapter 1: anonymous 2B arrival on the home page → FAQ price check → Lead
// Grabber "Call me back" submission promoting to Tier 1.
// Deltas mirror rightflush-home__3_.html / rightflush-faq__2_.html firePixel() calls.

import type { Journey } from "../types.js";

export const barry: Journey = {
  id: "barry",
  title: "Barry's Story — ClearSky pixel → home page → Lead Grabber",
  source: "customer-journeys/01-clearsky-home-01John.md",
  events: [
    // ── Chapter 1 — home page, phone, Tuesday morning (day 0) ────────────────
    { type: "page_load", day: 0, device: "phone", page: "/", delta: 0, bucketTag: "unclassified", label: "no hot water — lands on the home page" },
    { type: "scroll_25", day: 0, device: "phone", page: "/", delta: 3, bucketTag: "research" },
    { type: "scroll_50", day: 0, device: "phone", page: "/", delta: 5, bucketTag: "research", label: "past the services grid, no card clicks" },
    { type: "dwell_30", day: 0, device: "phone", page: "/", delta: 4, bucketTag: "research", label: "pauses on 'How it works'" },

    // FAQ price check — two persona-tagged expands.
    { type: "faq_expand", day: 0, device: "phone", page: "/faq", delta: 5, bucketTag: "research", label: "hot water tank replacement cost" },
    { type: "faq_expand", day: 0, device: "phone", page: "/faq", delta: 5, bucketTag: "research", label: "emergency plumbing cost" },

    // ── Conversion — Lead Grabber, "Call me back" ───────────────────────────
    { type: "lg_open", day: 0, device: "phone", page: "/", delta: 8, bucketTag: "active", label: "opens the Lead Grabber panel" },
    {
      type: "lg_submit",
      day: 0,
      device: "phone",
      page: "/",
      delta: 15,
      bucketTag: "active",
      identifier: { kind: "phone", valueHash: "sha256(+17052642251)" },
      text: "I have no hot water, can I have your company give me a call right away.",
      label: "submits name + phone + 'no hot water, call me right away'",
    },

    // ── Chapter 2 — the 10-minute callback SLA, and the breach ───────────────
    { type: "sla_register", day: 0, minute: 0, device: "phone", taskId: "cb-1", customerNumber: "705-264-2251", slaMinutes: 10, label: "callback committed" },
    { type: "sla_check", day: 0, minute: 15, device: "phone", taskId: "cb-1", customerNumber: "705-264-2251", label: "10 min pass, then 11… still no call. At 15 min the system checks the logs" },
    { type: "autocall_authorize", day: 0, minute: 15, device: "phone", customerNumber: "705-264-2251", slaMinutes: 10, keypress: "1", label: "Bert presses 1 — authorizes the bridge" },

    // ── The recovered call, five minutes late ────────────────────────────────
    {
      type: "call_completed",
      day: 0,
      minute: 16,
      device: "phone",
      text: "Owner confirmed the water heater has been rumbling for a week and there is no hot water this morning; flat-rate pricing applies, with no extra charge for same-day. He committed to arrive at the customer's home at 3:00 PM and to text when on the way.",
      label: "bridge connects — Bert talks to Barry",
    },
    { type: "commitment_extracted", day: 0, minute: 16, device: "phone", customerNumber: "705-264-2251", label: "I'll be out at 3:00 PM" },

    // ── Chapter 3 — Off-script: the parts ClearSky was never built to handle ─
    {
      type: "voicemail_received",
      day: 0,
      minute: 200, // around 3:20 PM
      device: "phone",
      text: "Order a new water heater for Barry Smith, took a cash deposit of $500. Prepare a purchase order for the model number.",
      amount: 500,
      label: "Bert's operational voicemail — $500 deposit logged to Barry's profile (Gap 36)",
    },

    // ── Chapter 4 — The sales order, and keeping Barry in the loop ───────────
    { type: "send_follow_up_message", day: 0, minute: 210, device: "phone", label: "Order confirmed: $500 deposit received, $1,500 balance due on installation." },
    { type: "send_follow_up_message", day: 10, device: "phone", label: "Arrival notice: Your water heater has arrived." },
    { type: "send_follow_up_message", day: 13, device: "phone", label: "Installation day reminder: installation is tomorrow at 4:00 PM." },

    // ── Chapter 5 — Closing the transaction ──────────────────────────────────
    { type: "supplier_delivery_received", day: 10, device: "phone", label: "Supplier delivery lands at shop (Gap 37)" },
    { type: "job_completed", day: 14, device: "phone", label: "Job completed (Gap 38)" },
    { type: "invoice_sent", day: 14, device: "phone", amount: 1500, label: "Invoice sent (Gap 39)" },
    { type: "payment_received", day: 14, device: "phone", amount: 1500, label: "Balance collected (Gap 39)" },

    // ── Chapter 6 — Two weeks later: booking the install, the human way ──────
    // (Happens before the install day reminder, around day 10, but logically we place the narrative sequence here)
    { type: "outbound_call_voicemail", day: 10, device: "phone", label: "Bert leaves voicemail offering time slots (Gap 42)" },
    { type: "scheduling_email_sent", day: 10, device: "phone", label: "Scheduling email sent with available slots (Gap 43)" },
    { type: "slot_selected", day: 10, device: "phone", label: "Barry clicks and chooses 4:00 PM Monday (Gap 43 / Gap 41)" },

    // ── Chapter 7 — The next two months: review, check-in, and the network ───
    { type: "review_request_sent", day: 44, device: "phone", label: "One month later: review ask sent (Gap 24)" },
    { type: "relationship_check_in_sent", day: 74, device: "phone", label: "Two months later: relationship check-in (KBS Post-job system)" },
    { type: "facebook_follow_ask", day: 74, device: "phone", label: "Bert asks Barry to follow RightFlush on Facebook" },
    { type: "facebook_followed", day: 75, device: "phone", label: "Barry follows Facebook page → reciprocal follow-back triggered" },
  ],
};
