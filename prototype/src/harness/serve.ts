// Dependency-free static server for the demo page. Run: npm run serve
// Serves prototype/demo/ at http://localhost:<PORT> (default 4173).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), "demo");
const START_PORT = Number(process.env.PORT) || 4173;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    // Map URL → file, defaulting to index.html; block path traversal.
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]!);
    const rel = normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
    const file = join(ROOT, rel);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});

function listen(port: number, triesLeft: number): void {
  server.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && triesLeft > 0) {
      console.log(`port ${port} in use, trying ${port + 1}…`);
      listen(port + 1, triesLeft - 1);
    } else {
      throw err;
    }
  });
  server.listen(port, () => {
    console.log(`\n  ClearSky journey replay is live:\n`);
    console.log(`    →  http://localhost:${port}\n`);
    console.log(`  (serving prototype/demo/ · Ctrl+C to stop)\n`);
  });
}

listen(START_PORT, 10);
