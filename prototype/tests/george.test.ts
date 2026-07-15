// George Ch1 (customer-journeys/02-clearsky-home-01George.md) — the contrast
// case: reaches `active` through content engagement alone, no identifier, no
// conversion tool. Asserts the story's stated path.

import { describe, it, expect } from "vitest";
import { george } from "../src/scenarios/george.js";
import { runJourney } from "../src/harness/run.js";

describe("George — comparison shopper reaches `active` anonymously (Ch1)", () => {
  const { trace } = runJourney(george);
  const byEvent = (t: string) => trace.steps.filter((s) => s.event === t);
  const final = trace.steps.at(-1)!.state;

  it("arrives Tier 2B and STAYS Tier 2B the whole session (never identifies)", () => {
    expect(trace.steps.every((s) => s.state.tier === "T2B")).toBe(true);
    expect(final.hubProfileId).toBeUndefined();
    expect(final.identifiers).toEqual([]);
  });

  it("moves into `comparison` on the home-page scroll and stays there while shopping", () => {
    const scroll50 = byEvent("scroll_50")[0]!;
    expect(scroll50.state.bucket).toBe("comparison");
  });

  it("reaches `active` on the financing guide download — content, not a conversion tool", () => {
    const dl = byEvent("financing_guide_download")[0]!;
    expect(dl.state.bucket).toBe("active");
    expect(dl.state.tier).toBe("T2B"); // active WITHOUT an identifier — the whole point
    expect(dl.pipeline).toBeUndefined(); // no conversion → no pipeline fires
  });

  it("ends `active`, score 62, still anonymous — then leaves without converting", () => {
    expect(final.bucket).toBe("active");
    expect(final.tier).toBe("T2B");
    expect(final.scoreRaw).toBe(62);
  });

  it("surfaces George's two NEW gaps (content model + active-via-content signal)", () => {
    const allRefs = trace.steps.flatMap((s) => s.gaps.map((g) => g.ref));
    expect(allRefs).toContain("NEW-A"); // services-grid content model
    expect(allRefs).toContain("NEW-B"); // no signal for active-via-content-no-identifier
    expect(allRefs).toContain("8"); // crossing ≥35 still flags the personalization threshold
  });
});
