// Opt-in integration test — runs ONLY when ANTHROPIC_API_KEY is set. It calls
// real Claude (claude-opus-4-8) through the CachedClaudeAnalysisEngine and
// asserts its six-dimension classification matches the locked story precedents.
// This is the "does Claude actually do what the spec says?" check. Responses
// are cached to .cache/, so a second run is instant and free.
//
//   npm test                       # skips this (no key) — stays hermetic
//   ANTHROPIC_API_KEY=… npm test   # runs it against real Claude

import { describe, it, expect, beforeAll } from "vitest";
import { CachedClaudeAnalysisEngine } from "../src/engine/pipeline/claude.js";
import type { AnalysisContext } from "../src/engine/pipeline/analysis.js";

const HAS_KEY = !!process.env.ANTHROPIC_API_KEY;

const BARRY = "I have no hot water, can I have your company give me a call right away.";
const DENISE_BOOKING =
  "Homeowner wants a full bathroom renovation and is ready to book an in-home consultation for July 20th at 10am. Mentioned a heated towel rack if it fits the budget.";

describe.skipIf(!HAS_KEY)("Real Claude vs. the locked story precedents", () => {
  const engine = new CachedClaudeAnalysisEngine();
  const newCtx: AnalysisContext = { isNewCustomer: true };
  const knownCtx: AnalysisContext = { isNewCustomer: false };

  beforeAll(async () => {
    await engine.prewarm([
      { text: BARRY, ctx: newCtx },
      { text: DENISE_BOOKING, ctx: knownCtx },
    ]);
  }, 60_000);

  it("Barry's 'no hot water' is NOT an emergency, but urgency is high (A2P §5.4)", () => {
    const a = engine.analyze(BARRY, newCtx);
    expect(a.emergency).toBe(false); // "no hot water" alone doesn't qualify
    expect(a.urgency).toBe("high");
    expect(a.momentum).toBe("ready_to_book"); // he wants a callback now
  });

  it("Denise's booking transcript reads as ready_to_book (Ch4 BOOKING_OPPORTUNITY)", () => {
    const a = engine.analyze(DENISE_BOOKING, knownCtx);
    expect(a.momentum).toBe("ready_to_book");
    expect(a.emergency).toBe(false);
  });
});

// A visible marker when the suite runs without a key, so the skip is obvious.
describe.runIf(!HAS_KEY)("Real Claude integration", () => {
  it.skip("skipped — set ANTHROPIC_API_KEY to run against real Claude", () => {});
});
