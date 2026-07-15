// Phase 3 — A2P: call binding, the SLA-breach bridge-merge, and the
// transcript→pipeline path.

import { describe, it, expect } from "vitest";
import { CallBinding, SLAMonitor, bridgeMerge } from "../src/engine/a2p/a2p.js";
import { deniseCall } from "../src/scenarios/denise-call.js";
import { runJourney } from "../src/harness/run.js";

describe("Call binding — the dialed number is the key", () => {
  it("session-bound number within TTL hands over the live session", () => {
    const cb = new CallBinding();
    cb.bindSession("+1705TRACK01", "hub_1", 0, 10);
    const r = cb.resolve("+1705TRACK01", "+17055550000", 3);
    expect(r.mode).toBe("session-live");
    expect(r.profileId).toBe("hub_1");
    expect(r.cold).toBe(false);
  });

  it("past its TTL the same number lands cold, matched only on caller ID", () => {
    const cb = new CallBinding();
    cb.bindSession("+1705TRACK01", "hub_1", 0, 10);
    cb.indexCallerId("+17055551234", "hub_1"); // caller ID on file since first call
    const r = cb.resolve("+1705TRACK01", "+17055551234", 4 * 24 * 60); // 4 days later
    expect(r.mode).toBe("cold-caller-id");
    expect(r.cold).toBe(true);
    expect(r.profileId).toBe("hub_1"); // still resolves, just without the live handoff
  });

  it("a dedicated GBP number is known by its source the instant it rings", () => {
    const cb = new CallBinding();
    cb.registerDedicated({ number: "+1705GBP0001", source: "gbp" });
    const r = cb.resolve("+1705GBP0001", undefined, 0);
    expect(r.mode).toBe("dedicated-source");
    expect(r.source).toBe("gbp");
  });
});

describe("SLA breach → autocaller bridge-merge (Barry Ch2)", () => {
  it("no breach when the callback happens inside the window", () => {
    const sla = new SLAMonitor();
    sla.register("task-1", "+17052642251", 10, 0);
    sla.recordOutbound("+17052642251", 8); // called at 8 min
    expect(sla.checkBreach("task-1", 15).breached).toBe(false);
  });

  it("breaches at sla+5 with three escalation channels when no one called", () => {
    const sla = new SLAMonitor();
    sla.register("task-1", "+17052642251", 10, 0); // sla 10, breach at 15
    const e = sla.checkBreach("task-1", 15);
    expect(e.breached).toBe(true);
    expect(e.channels).toEqual(["SMS", "push", "autocall"]);
  });

  it("the autocaller never connects without the rep's keypress", () => {
    expect(bridgeMerge(false).connected).toBe(false);
    expect(bridgeMerge(true).connected).toBe(true);
  });
});

describe("Transcript → pipeline (Ch3–5)", () => {
  const { trace } = runJourney(deniseCall);
  const byEvent = (t: string) => trace.steps.find((s) => s.event === t)!;

  it("call_click + IVR press-2 score onto her active-bucket profile", () => {
    const ivr = byEvent("ivr_dtmf");
    expect(ivr.state.bucket).toBe("active"); // call_click flipped it, IVR reinforces
    // call_click +15, IVR +10 → 25 on top of the guide-era profile
    expect(ivr.state.scoreRaw).toBe(25);
  });

  it("the live call books: BOOKING_OPPORTUNITY, and the bridge gap is flagged", () => {
    const call = byEvent("call_completed");
    const p = call.pipeline!;
    expect(p.analysis?.momentum).toBe("ready_to_book");
    expect(p.signals).toContain("BOOKING_OPPORTUNITY");
    const ids = p.actions.map((a) => a.actionId);
    expect(ids).toContain("ACT-CALL-004"); // log opportunity
    expect(ids).toContain("ACT-CALL-001"); // task for the towel-rack mention
    expect(p.gaps.some((g) => g.ref === "KBS")).toBe(true); // CallEvent bridge
  });

  it("the reschedule voicemail fires CALLBACK_REQUIRED", () => {
    const vm = byEvent("voicemail");
    expect(vm.pipeline!.signals).toContain("CALLBACK_REQUIRED");
  });
});
