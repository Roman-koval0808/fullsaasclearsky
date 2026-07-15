// Phase 2 — the S1–S7 pipeline. Asserts the signals/actions the journeys say
// should fire, and the two seed-bug fixes (#23, #32).

import { describe, it, expect } from "vitest";
import { barry } from "../src/scenarios/barry.js";
import { denise } from "../src/scenarios/denise.js";
import { runJourney } from "../src/harness/run.js";
import { SIGNALS } from "../src/engine/pipeline/signals.js";

describe("Barry lg_submit — full S1–S7 (Ch2)", () => {
  const { trace } = runJourney(barry);
  const lg = trace.steps.find((s) => s.event === "lg_submit")!;
  const p = lg.pipeline!;

  it("S1 AI analysis matches the story: emergency false, urgency high, ready_to_book", () => {
    expect(p.analysis?.emergency).toBe(false);
    expect(p.analysis?.emergencyType).toBe("no_hot_water");
    expect(p.analysis?.urgency).toBe("high");
    expect(p.analysis?.momentum).toBe("ready_to_book");
  });

  it("S2 fires NEW_CUSTOMER_OPPORTUNITY + BOOKING_OPPORTUNITY, not EMERGENCY_SERVICE", () => {
    expect(p.signals).toContain("NEW_CUSTOMER_OPPORTUNITY");
    expect(p.signals).toContain("BOOKING_OPPORTUNITY");
    expect(p.signals).not.toContain("EMERGENCY_SERVICE");
  });

  it("S3 dominant is NEW_CUSTOMER_OPPORTUNITY (High outranks Medium)", () => {
    expect(p.dominant).toBe("NEW_CUSTOMER_OPPORTUNITY");
  });

  it("S4/S5 fires ACT-CALL-001/002/004/005, all automatic (no approval)", () => {
    const byId = Object.fromEntries(p.actions.map((a) => [a.actionId, a]));
    for (const id of ["ACT-CALL-001", "ACT-CALL-002", "ACT-CALL-004", "ACT-CALL-005"]) {
      expect(byId[id], `${id} should be queued`).toBeDefined();
      expect(byId[id]!.status).toBe("completed");
    }
  });

  it("S7 feedback: nothing waited on a human", () => {
    expect(p.feedback?.humanReviewState).toBe("not_applicable");
  });
});

describe("Denise email_capture — NurtureSequence enrollment (#32 flagged)", () => {
  const { trace } = runJourney(denise);
  const capture = trace.steps.at(-1)!; // email_capture is the last event
  const p = capture.pipeline!;

  it("fires SIG-CONV-001 → ACT-NURTURE-ENROLL, executed automatically", () => {
    expect(p.signals).toContain("SIG-CONV-001");
    const enroll = p.actions.find((a) => a.actionId === "ACT-NURTURE-ENROLL");
    expect(enroll?.status).toBe("completed");
  });

  it("flags the #32 double-definition conflict", () => {
    expect(p.gaps.some((g) => g.ref === "32")).toBe(true);
  });
});

describe("#23 — SIG-GROW signals wired to the correct action", () => {
  it("SIG-GROW-002 maps to ACT-REV-005 (testimonial), not the mismatch action ACT-REV-007", () => {
    const g2 = SIGNALS.find((s) => s.code === "SIG-GROW-002")!;
    expect(g2.actions).toContain("ACT-REV-005");
    expect(g2.actions).not.toContain("ACT-REV-007");
    expect(g2.gap).toBe("23");
  });

  it("SIG-GROW-005 falls back to ACT-TASK-001, not ACT-REV-007", () => {
    const g5 = SIGNALS.find((s) => s.code === "SIG-GROW-005")!;
    expect(g5.actions).toContain("ACT-TASK-001");
    expect(g5.actions).not.toContain("ACT-REV-007");
  });
});
