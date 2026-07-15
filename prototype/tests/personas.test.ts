// Phase 5 — the engine generalizes past the two hand-written journeys. These
// personas are prototype-authored (their narrative files are unwritten stubs),
// so we assert engine invariants and each trajectory's endpoint, not a Ch8 table.

import { describe, it, expect } from "vitest";
import { personas } from "../src/scenarios/personas.js";
import { runJourney } from "../src/harness/run.js";
import { BUCKET_LADDER } from "../src/types.js";

describe("Persona archetypes — engine invariants", () => {
  for (const journey of personas) {
    it(`${journey.id}: runs, score stays 0..100, bucket stays valid`, () => {
      const { trace } = runJourney(journey);
      expect(trace.steps.length).toBe(journey.events.length);
      for (const s of trace.steps) {
        expect(s.state.scoreRaw).toBeGreaterThanOrEqual(0);
        expect(s.state.scoreRaw).toBeLessThanOrEqual(100);
        expect(BUCKET_LADDER).toContain(s.state.bucket);
      }
    });
  }

  const endpoint = (id: string) => {
    const j = personas.find((p) => p.id === id)!;
    return runJourney(j).trace.steps.at(-1)!.state;
  };

  it("Peter never identifies himself — stays Tier 2B", () => {
    expect(endpoint("peter").tier).toBe("T2B");
  });

  it("Betty converts to Tier 1 on the guide download", () => {
    expect(endpoint("betty").tier).toBe("T1");
  });

  it("Francine converts to Tier 1 via Lead Grabber email-me", () => {
    expect(endpoint("francine").tier).toBe("T1");
  });

  it("Coreen calls while still anonymous — Tier 2B, active bucket from Call Now", () => {
    const s = endpoint("coreen");
    expect(s.tier).toBe("T2B");
    expect(s.bucket).toBe("active"); // call_click flips the bucket even anonymously
  });
});
