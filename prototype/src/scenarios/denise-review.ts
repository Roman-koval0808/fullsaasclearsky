// Denise — the review (Chapter 9). A 5-star review whose stars and words agree,
// with recommendation language ("told my sister to call them"). Fires both
// growth signals; the point is that they wire to the CORRECT actions (the #23
// fix), not the mismatch-draft action the seed file mis-pointed them at.

import type { Journey } from "../types.js";

export const deniseReview: Journey = {
  id: "denise-review",
  title: "Denise's Story — the 5-star review (Ch9)",
  source: "RightFlush-Denise-Customer-Journey.md",
  events: [
    {
      type: "review_received",
      day: 0,
      device: "phone",
      text: "RightFlush was fantastic — showed up when they said they would, kept the place clean, finished on time. Already told my sister to call them for her kitchen.",
      review: {
        rating: 5,
        praiseTopics: ["punctuality", "cleanliness", "on-time completion"],
        ratingContentMismatch: false,
        recommends: true,
        confidence: 0.85,
      },
      label: "5 stars, praise + referral language",
    },
  ],
};
