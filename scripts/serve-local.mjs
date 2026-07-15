// Run the full ClearSky demo locally, exactly like the Vercel deploy:
// builds dist/, then serves it applying the vercel.json pretty-route rewrites
// (a plain static server can't do those). Zero dependencies — just Node.
//
//   node scripts/serve-local.mjs            → http://localhost:3000
//   PORT=8000 node scripts/serve-local.mjs  → choose a port
//
// Reachable once it's up:
//   /            the RightFlush site (live monitoring HUD, bottom-left)
//   /control     the demo hub
//   /replay      the journey replay (Barry, Denise, George + drafts)
//   /findings    code-vs-stories report

import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const START_PORT = Number(process.env.PORT) || 3000;

// 1. Build a fresh dist/ (pulls in the latest engine replay + site + findings).
console.log("building dist/ …");
execSync("node scripts/build-site.mjs", { cwd: ROOT, stdio: "inherit" });

// 2. Load the pretty-route rewrites Vercel would apply.
const { rewrites } = JSON.parse(await readFile(join(DIST, "vercel.json"), "utf8"));
const MAP = Object.fromEntries(rewrites.map((r) => [r.source, r.destination]));

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png", ".jpg": "image/jpeg",
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  const key = p !== "/" ? p.replace(/\/$/, "") : p;
  if (MAP[key]) p = MAP[key];                 // apply Vercel rewrite
  else if (p === "/") p = MAP["/"] || "/index.html";
  const file = join(DIST, p.replace(/^\/+/, ""));
  if (!file.startsWith(DIST)) { res.writeHead(403).end("Forbidden"); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("404 — " + p);
  }
});

function listen(port, tries) {
  server.once("error", (e) => {
    if (e.code === "EADDRINUSE" && tries > 0) { console.log(`port ${port} busy, trying ${port + 1}…`); listen(port + 1, tries - 1); }
    else throw e;
  });
  server.listen(port, () => {
    console.log(`\n  ClearSky demo is live (Vercel-accurate):\n`);
    console.log(`    →  http://localhost:${port}\n`);
    console.log(`  /  site  ·  /control  hub  ·  /replay  journeys  ·  /findings  report`);
    console.log(`  Ctrl+C to stop.\n`);
  });
}
listen(START_PORT, 10);
