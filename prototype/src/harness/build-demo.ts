// Regenerates demo/index.html from the live engine output + demo/template.html.
// The page is self-contained (inline CSS/JS + embedded trace JSON), so it opens
// straight from disk with no server. Run: npm run demo
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { barry } from "../scenarios/barry.js";
import { denise } from "../scenarios/denise.js";
import { deniseCall } from "../scenarios/denise-call.js";
import { deniseReview } from "../scenarios/denise-review.js";
import { george } from "../scenarios/george.js";
import { personas } from "../scenarios/personas.js";
import { runJourney } from "./run.js";
import type { Journey } from "../types.js";

// Written & reproduced (Barry, Denise, George) + prototype-authored drafts for
// the still-unwritten persona stubs (Peter, Betty, Francine, Coreen).
const journeys: Journey[] = [barry, denise, deniseCall, deniseReview, george, ...personas];

const trace = journeys.map((j) => {
  const { trace } = runJourney(j);
  return { id: j.id, title: j.title, source: j.source, steps: trace.steps };
});

const dir = join(process.cwd(), "demo");
const template = readFileSync(join(dir, "template.html"), "utf8");
const json = JSON.stringify(trace);
if (/<\/script/i.test(json)) throw new Error("trace JSON contains </script — cannot embed safely");

const out = template.replace("__TRACE_JSON__", json);
const dest = join(dir, "index.html");
writeFileSync(dest, out);
console.log(`demo built → ${dest}`);
console.log(`journeys: ${trace.map((t) => `${t.id} (${t.steps.length})`).join(", ")}`);
console.log(`open it: file://${dest}`);
