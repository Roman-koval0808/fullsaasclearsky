// Phase 4 — the growth tail: review→testimonial (the #23 fix, live), Cohort 2
// write, and transaction status.

import { describe, it, expect } from "vitest";
import { deniseReview } from "../src/scenarios/denise-review.js";
import { runJourney } from "../src/harness/run.js";
import { buildCohort2Record, redact } from "../src/engine/growth/cohort2.js";
import { Transaction } from "../src/engine/growth/transaction.js";

describe("Review → testimonial + referral (Ch9, #23 fix live)", () => {
  const { trace } = runJourney(deniseReview);
  const p = trace.steps.at(-1)!.pipeline!;

  it("fires both growth signals off the agreeing 5-star review", () => {
    expect(p.signals).toContain("SIG-GROW-002"); // testimonial_candidate_detected
    expect(p.signals).toContain("SIG-GROW-005"); // referral_or_word_of_mouth_detected
  });

  it("wires to the CORRECT actions — ACT-REV-005, never the mismatch action", () => {
    const ids = p.actions.map((a) => a.actionId);
    expect(ids).toContain("ACT-REV-005"); // mark_testimonial_candidate
    expect(ids).toContain("ACT-TASK-001"); // referral follow-up fallback
    expect(ids).not.toContain("ACT-REV-007"); // the mis-wired mismatch draft
  });

  it("marks the testimonial automatically (no approval) and flags #23", () => {
    const testimonial = p.actions.find((a) => a.actionId === "ACT-REV-005")!;
    expect(testimonial.status).toBe("completed");
    expect(p.gaps.some((g) => g.ref === "23")).toBe(true);
  });
});

describe("Cohort 2 write (Ch8)", () => {
  it("strips names and phone numbers but keeps the sentence content", () => {
    const out = redact("Denise booked with Barry, call 705-264-2251 about the reno.");
    expect(out).not.toMatch(/Denise|Barry/);
    expect(out).not.toMatch(/705-264-2251/);
    expect(out).toMatch(/booked with .* about the reno/);
  });

  it("carries the trajectory, redacted transcript, demographic, and the redaction/disclosure gaps", () => {
    const rec = buildCohort2Record(
      { tierPath: ["T2B", "T1"], bucketPath: ["research"], touchesToConvert: 30, channelSequence: ["blog", "faq", "email", "call"], closeValue: 20000, referred: true },
      "Denise said the 20th works.",
      { gender: "female", ageBracket: "45-54", householdIncomeBracket: "80-100k" },
    );
    expect(rec.trajectory.closeValue).toBe(20000);
    expect(rec.redactedTranscript).not.toMatch(/Denise/);
    expect(rec.demographic.gender).toBe("female");
    expect(rec.gaps.length).toBeGreaterThan(0);
  });
});

describe("Transaction status (job fulfillment, #37–#40)", () => {
  it("stays open until both install and balance-collection happen, then closes", () => {
    const tx = new Transaction(2000, 500);
    expect(tx.status).toBe("open");
    expect(tx.balanceDue).toBe(1500);

    tx.supplierDeliveryReceived();
    tx.jobCompleted();
    expect(tx.status).toBe("open"); // installed but not paid off

    tx.collectBalance();
    expect(tx.status).toBe("closed");
    expect(tx.balanceDue).toBe(0);
    // Every fulfillment step is a flagged gap.
    expect(tx.gaps.map((g) => g.ref).sort()).toEqual(["37", "38", "39", "40"]);
  });
});
