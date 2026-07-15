// CLI: `npm run sim -- denise` (denise | denise-call | barry | all). Prints the
// stage-by-stage trace and the gap report. If ANTHROPIC_API_KEY is set, the AI
// Analysis Engine is real Claude (cached to .cache/); otherwise the deterministic
// stub is used, so the sim always runs offline.

import { denise } from "../scenarios/denise.js";
import { deniseCall } from "../scenarios/denise-call.js";
import { deniseReview } from "../scenarios/denise-review.js";
import { barry } from "../scenarios/barry.js";
import { george } from "../scenarios/george.js";
import { personas } from "../scenarios/personas.js";
import type { Journey } from "../types.js";
import { runJourney, collectGaps } from "./run.js";
import { renderTrace } from "./trace.js";
import { CachedClaudeAnalysisEngine } from "../engine/pipeline/claude.js";
import type { AnalysisEngine } from "../engine/pipeline/analysis.js";

const journeys: Record<string, Journey> = {
  denise,
  "denise-call": deniseCall,
  "denise-review": deniseReview,
  barry,
  george,
  ...Object.fromEntries(personas.map((p) => [p.id, p])),
};

const arg = (process.argv[2] ?? "all").toLowerCase();
const selected =
  arg === "all" ? Object.values(journeys) : ([journeys[arg]].filter(Boolean) as Journey[]);

if (selected.length === 0) {
  console.error(`unknown journey "${arg}". options: ${Object.keys(journeys).join(", ")}, all`);
  process.exit(1);
}

// Real cached Claude when a key is present; deterministic stub otherwise.
let analysisEngine: AnalysisEngine | undefined;
if (process.env.ANTHROPIC_API_KEY) {
  const claude = new CachedClaudeAnalysisEngine();
  const items = selected
    .flatMap((j) => j.events)
    .filter((e) => e.text)
    .map((e) => ({ text: e.text!, ctx: { isNewCustomer: false } }));
  console.log(`[AI Analysis] real Claude (claude-opus-4-8), caching ${items.length} transcripts…`);
  await claude.prewarm(items);
  analysisEngine = claude;
} else {
  console.log("[AI Analysis] no ANTHROPIC_API_KEY — using deterministic stub");
}

for (const journey of selected) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`${journey.title}`);
  console.log(`source: ${journey.source}`);
  console.log("=".repeat(72));

  const { trace } = runJourney(journey, analysisEngine);
  console.log(renderTrace(trace));

  const gaps = collectGaps(trace);
  if (gaps.length) {
    console.log(`\n— Gaps this run leaned on —`);
    for (const g of gaps) console.log(`  ⚑ GAP #${g.ref}: ${g.note}`);
  }
}
console.log("");
