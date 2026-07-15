// Denise — the A2P slice (Chapters 3–5). She's already Tier 1 (email capture),
// clicks Call Now, presses 2 in the IVR, books on the live call, then leaves a
// reschedule voicemail four days later. Exercises call scoring, the transcript→
// pipeline path, BOOKING_OPPORTUNITY, and CALLBACK_REQUIRED.

import type { Journey } from "../types.js";

export const deniseCall: Journey = {
  id: "denise-call",
  title: "Denise's Story — the call (Ch3–5)",
  source: "RightFlush-Denise-Customer-Journey.md",
  events: [
    // Re-establish her as a known Tier-1 contact (email capture, day 0).
    {
      type: "email_capture",
      day: 0,
      device: "phone",
      identifier: { kind: "email", valueHash: "sha256(denise@example.com)" },
      label: "already Tier 1 from the guide download",
    },

    // ── Chapter 3 — Bathroom Renovations page → Call Now ─────────────────────
    { type: "call_click", day: 30, device: "phone", page: "/bathroom-renovations", label: "taps Call Now (+15, active)" },
    { type: "ivr_dtmf", day: 30, device: "phone", dtmf: "2", label: "presses 2 — Estimates/Quotes (+10)" },

    // ── Chapters 3–4 — the live call, consultation booked ────────────────────
    {
      type: "call_completed",
      day: 30,
      device: "phone",
      text: "Homeowner wants a full bathroom renovation and is ready to book an in-home consultation for July 20th at 10am. Mentioned a heated towel rack if it fits the budget.",
      label: "live call — consultation booked",
    },

    // ── Chapter 5 — reschedule voicemail, four days later ────────────────────
    {
      type: "voicemail",
      day: 34,
      device: "phone",
      text: "Hi it's Denise. Something came up on the 20th in the morning. Any chance we could move the consultation to noon instead? Give me a call when you can.",
      label: "reschedule request",
    },
  ],
};
