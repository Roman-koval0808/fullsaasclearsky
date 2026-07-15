// Asserts the engine reproduces Denise's Chapter 8 touchpoint table (Ch1–2 rows).
// Source: RightFlush-Denise-Customer-Journey.md, Chapter 8.

import { describe, it, expect } from "vitest";
import { denise } from "../src/scenarios/denise.js";
import { runJourney } from "../src/harness/run.js";

describe("Denise — Chapter 8 table (Phase 1: Ch1–2)", () => {
  const { trace, engine } = runJourney(denise);
  const step = (i: number) => trace.steps[i]!;

  it("Ch1 blog (phone): Tier 2B · Research · 15", () => {
    const s = step(3).state; // after dwell_30 on /blog
    expect(s.tier).toBe("T2B");
    expect(s.bucket).toBe("research");
    expect(s.scoreRaw).toBe(15);
  });

  it("Ch1 gallery (laptop, separate record): Tier 2B · Comparison · 17", () => {
    const s = step(7).state; // after dwell_30 on /gallery
    expect(s.tier).toBe("T2B");
    expect(s.bucket).toBe("comparison");
    expect(s.scoreRaw).toBe(17);
    // A genuinely separate record from the phone.
    expect(s.fingerprint).not.toBe(step(3).state.fingerprint);
  });

  it("Ch2 FAQ (phone, day-11 return): Tier 2B · Research · 38 (no recency bonus)", () => {
    const s = step(12).state; // after dwell_60 on /faq
    expect(s.tier).toBe("T2B");
    expect(s.bucket).toBe("research");
    expect(s.scoreRaw).toBe(38); // 48 would mean the ≤3-day bonus wrongly fired
  });

  it("Ch2 guide download: email_capture → Tier 1 · Research · 38", () => {
    const s = step(13).state;
    expect(s.tier).toBe("T1");
    expect(s.bucket).toBe("research"); // guide download isn't a stronger behavioural signal
    expect(s.scoreRaw).toBe(38);
    expect(s.hubProfileId).toBeDefined();
    expect(s.identifiers).toContain("email:sha256(denise@example.com)");
  });

  it("Ch2 laptop stays unmerged and demotes Comparison → Research by day 11", () => {
    const { state } = engine.snapshot("laptop", 11);
    expect(state.tier).toBe("T2B"); // never merged into Denise's Tier 1 profile
    expect(state.hubProfileId).toBeUndefined();
    expect(state.bucket).toBe("research"); // idle 8d > 7d grace, score_live < 20
  });

  it("crosses the ≥35 Site Personalization threshold during the FAQ read", () => {
    const notesAcrossFaq = trace.steps.slice(8, 13).flatMap((s) => s.notes).join(" ");
    expect(notesAcrossFaq).toMatch(/Site Personalization eligible/);
  });
});
