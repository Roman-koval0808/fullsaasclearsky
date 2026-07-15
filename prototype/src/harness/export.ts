// Dumps the journeys' real engine traces as JSON, for the visual walkthrough.
//   npx tsx src/harness/export.ts > trace.json
import { barry } from "../scenarios/barry.js";
import { denise } from "../scenarios/denise.js";
import { deniseCall } from "../scenarios/denise-call.js";
import { deniseReview } from "../scenarios/denise-review.js";
import { runJourney } from "./run.js";
import type { Journey } from "../types.js";

const journeys: Journey[] = [barry, denise, deniseCall, deniseReview];

const out = journeys.map((j) => {
  const { trace } = runJourney(j);
  return { id: j.id, title: j.title, source: j.source, steps: trace.steps };
});

process.stdout.write(JSON.stringify(out));
