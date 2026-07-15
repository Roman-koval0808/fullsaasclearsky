// Asserts the engine reproduces Barry's Chapter 1 narrated transitions.
// Source: customer-journeys/01-clearsky-home-01John.md, Chapter 1.

import { describe, it, expect } from "vitest";
import { barry } from "../src/scenarios/barry.js";
import { runJourney } from "../src/harness/run.js";

describe("Barry — Chapter 1 (Phase 1)", () => {
  const { trace } = runJourney(barry);
  const step = (i: number) => trace.steps[i]!;

  it("arrives anonymous: Tier 2B on the home page", () => {
    expect(step(0).state.tier).toBe("T2B");
    expect(step(0).state.bucket).toBe("unclassified"); // page_load tag doesn't outrank
    expect(step(0).state.scoreRaw).toBe(0); // home page_load delta is 0
  });

  it("Lead Grabber open flips the bucket to active for the first time", () => {
    expect(step(6).state.bucket).toBe("active"); // lg_open
  });

  it("Lead Grabber submit (phone) promotes to Tier 1", () => {
    const s = step(7).state;
    expect(s.tier).toBe("T1");
    expect(s.bucket).toBe("active");
    expect(s.hubProfileId).toBeDefined();
    expect(s.identifiers).toContain("phone:sha256(+17052642251)");
    // Score 45 is our engine's deterministic sum (not a story-asserted figure).
    expect(s.scoreRaw).toBe(45);
  });
});

describe("Barry — Chapter 2 SLA breach → bridge-merge (inline time-axis)", () => {
  const { trace } = runJourney(barry);
  const notesOf = (event: string) => trace.steps.find((s) => s.event === event)!.notes.join(" ");

  it("at 15 min with no callback, the breach fires all three escalation channels", () => {
    const n = notesOf("sla_check");
    expect(n).toMatch(/SLA BREACH/);
    expect(n).toMatch(/SMS/);
    expect(n).toMatch(/push notification/);
    expect(n).toMatch(/automated call/);
  });

  it("the autocaller bridges only after Bert presses 1, recovering the callback", () => {
    const step = trace.steps.find((s) => s.event === "autocall_authorize")!;
    expect(step.notes.join(" ")).toMatch(/bridges rep.*customer/);
    expect(step.minute).toBe(15);
  });

  it("the 3:00 PM commitment is extracted to calendar + profile (flags #41)", () => {
    const step = trace.steps.find((s) => s.event === "commitment_extracted")!;
    expect(step.notes.join(" ")).toMatch(/ACT-CALL-010.*ACT-CALL-004/);
    expect(step.gaps.some((g) => g.ref === "41")).toBe(true);
  });
});
