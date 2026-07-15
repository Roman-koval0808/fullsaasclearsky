// Builds dist/ — a single static site for Vercel that bundles everything the
// client should see: the RightFlush customer website (with the live ClearSky
// monitoring HUD), the journey-replay engine demo, the findings report, and a
// hub ("control room") that ties them together.
//
//   node scripts/build-site.mjs      → writes ./dist
//
// Source HTML files are never modified; the HUD + demo-menu launcher are added
// only in the built copies.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "design", "rightflush-site");
const DIST = join(ROOT, "dist");

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// ── 1. Parse the pretty-route table out of _serve.py (single source of truth) ──
const serve = readFileSync(join(SITE, "_serve.py"), "utf8");
const ROUTES = {};
for (const m of serve.matchAll(/"(\/[a-z0-9-]*)":\s*"([^"]+\.html)"/g)) ROUTES[m[1]] = m[2];

// ── 2. Copy the RightFlush pages, injecting the HUD + demo-menu launcher ───────
const LAUNCHER =
  '<a href="/control" aria-label="ClearSky demo menu" style="position:fixed;bottom:16px;left:16px;z-index:99998;' +
  "font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;color:#fff;" +
  "background:#0d7f78;padding:9px 15px;border-radius:999px;box-shadow:0 10px 26px -8px rgba(13,127,120,.55);" +
  'text-decoration:none;display:inline-flex;align-items:center;gap:7px">▸ ClearSky demo menu</a>';
const INJECT = '<script src="/_clearsky-hud.js"></script>' + LAUNCHER;

let pageCount = 0;
for (const f of readdirSync(SITE)) {
  if (!f.endsWith(".html")) continue;
  let html = readFileSync(join(SITE, f), "utf8");
  const i = html.lastIndexOf("</body>");
  html = i !== -1 ? html.slice(0, i) + INJECT + html.slice(i) : html + INJECT;
  writeFileSync(join(DIST, f), html);
  pageCount++;
}
copyFileSync(join(SITE, "_clearsky-hud.js"), join(DIST, "_clearsky-hud.js"));

// ── 3. The journey-replay demo (self-contained) ────────────────────────────────
copyFileSync(join(ROOT, "prototype", "demo", "index.html"), join(DIST, "replay.html"));

// ── 4. Render the findings report to a styled page ─────────────────────────────
writeFileSync(join(DIST, "findings.html"),
  docPage("Serhii's code vs. the stories — findings", mdToHtml(readFileSync(join(ROOT, "specs", "serhii-vs-stories-findings.md"), "utf8"))));

// (The written customer-journey docs are Serhii-facing dev specs — not client-facing — so they are NOT published here.)

// ── 6. The hub ("control room") ────────────────────────────────────────────────
writeFileSync(join(DIST, "control.html"), hubPage());

// ── 7. vercel.json — pretty-route rewrites, static ─────────────────────────────
const rewrites = [
  ...Object.entries(ROUTES).map(([source, file]) => ({ source, destination: "/" + file })),
  { source: "/control", destination: "/control.html" },
  { source: "/replay", destination: "/replay.html" },
  { source: "/findings", destination: "/findings.html" },
  { source: "/book", destination: "/rightflush-contact-quote__1_.html" },
  { source: "/privacy", destination: "/rightflush-home__3_.html" },
];
// Root config: Vercel runs the build and serves dist/ (deploy from repo root).
writeFileSync(join(ROOT, "vercel.json"),
  JSON.stringify({ $schema: "https://openapi.vercel.sh/vercel.json", buildCommand: "node scripts/build-site.mjs", outputDirectory: "dist", framework: null, rewrites }, null, 2));
// Also drop a config INSIDE dist/, so `vercel deploy dist` (prebuilt) works too.
writeFileSync(join(DIST, "vercel.json"), JSON.stringify({ rewrites }, null, 2));

console.log(`dist/ built — ${pageCount} site pages + replay + findings + hub`);
console.log(`routes: ${Object.keys(ROUTES).length} pretty routes wired in vercel.json`);
console.log(`preview locally:  npx serve dist   (or)  python3 -m http.server -d dist 3000`);

// ─────────────────────────────────────────────────────────────────────────────
// helpers

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// Compact Markdown → HTML (headings, bold, inline code, code fences, hr, tables,
// blockquotes, lists, links, paragraphs). Enough for these docs.
function mdToHtml(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  let out = "", i = 0;
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) { let b = ""; i++; while (i < lines.length && !/^```/.test(lines[i])) b += lines[i++] + "\n"; i++; out += `<pre><code>${esc(b)}</code></pre>`; continue; }
    if (/^#{1,6}\s/.test(l)) { const n = l.match(/^#+/)[0].length; out += `<h${n}>${inline(l.slice(n + 1))}</h${n}>`; i++; continue; }
    if (/^---+$/.test(l.trim())) { out += "<hr>"; i++; continue; }
    if (/^\s*>/.test(l)) { let b = ""; while (i < lines.length && /^\s*>/.test(lines[i])) b += lines[i++].replace(/^\s*>\s?/, "") + " "; out += `<blockquote>${inline(b)}</blockquote>`; continue; }
    if (/^\s*\|.*\|/.test(l) && /\|/.test(lines[i + 1] || "") && /^[\s|:-]+$/.test(lines[i + 1])) {
      const row = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = row(l); i += 2; let body = "";
      while (i < lines.length && /^\s*\|.*\|/.test(lines[i])) { body += "<tr>" + row(lines[i++]).map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>"; }
      out += `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`; continue;
    }
    if (/^\s*[-*]\s/.test(l)) { let b = ""; while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) b += `<li>${inline(lines[i++].replace(/^\s*[-*]\s/, ""))}</li>`; out += `<ul>${b}</ul>`; continue; }
    if (/^\s*\d+\.\s/.test(l)) { let b = ""; while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) b += `<li>${inline(lines[i++].replace(/^\s*\d+\.\s/, ""))}</li>`; out += `<ol>${b}</ol>`; continue; }
    if (l.trim() === "") { i++; continue; }
    let p = l; i++; while (i < lines.length && lines[i].trim() !== "" && !/^(#|```|\s*[-*]\s|\s*\d+\.\s|\s*>|\s*\|)/.test(lines[i])) p += " " + lines[i++];
    out += `<p>${inline(p)}</p>`;
  }
  return out;
}

function shell(title, body, extraCss = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
:root{--teal:#0d7f78;--ink:#111827;--muted:#4b5563;--faint:#9ca3af;--border:#e3e7ef;--bg:#f7f8fa;--surface:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.55}
a{color:var(--teal)}${extraCss}</style></head><body>${body}
<a href="/control" style="position:fixed;bottom:16px;left:16px;z-index:9;font-size:12px;font-weight:600;color:#fff;background:var(--teal);padding:9px 15px;border-radius:999px;box-shadow:0 10px 26px -8px rgba(13,127,120,.55);text-decoration:none">▸ demo menu</a>
</body></html>`;
}

function docPage(title, inner) {
  return shell(title,
    `<div class="doc"><a class="back" href="/control">← back to the demo menu</a><article>${inner}</article></div>`,
    `.doc{max-width:820px;margin:0 auto;padding:40px 22px 96px}.back{display:inline-block;font-size:.85rem;margin-bottom:18px;text-decoration:none}
     article h1{font-size:1.7rem;letter-spacing:-.02em;margin:.2em 0 .5em}article h2{font-size:1.25rem;margin:1.6em 0 .4em;border-top:1px solid var(--border);padding-top:1em}
     article h3{font-size:1.02rem;margin:1.3em 0 .3em}article p,article li{color:#1f2937}article code{font-family:ui-monospace,Menlo,monospace;font-size:.86em;background:#eef1f5;padding:.1em .35em;border-radius:5px}
     article pre{background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:10px;overflow:auto}article pre code{background:none;color:inherit;padding:0}
     article table{border-collapse:collapse;width:100%;font-size:.86rem;margin:1em 0;display:block;overflow-x:auto}article th,article td{border:1px solid var(--border);padding:7px 10px;text-align:left;vertical-align:top}article th{background:#f1f5f9}
     article blockquote{border-left:3px solid var(--teal);margin:1em 0;padding:.2em 0 .2em 14px;color:var(--muted)}article hr{border:none;border-top:1px solid var(--border);margin:1.6em 0}`);
}

function hubPage() {
  const card = (href, tag, title, desc, accent) =>
    `<a class="card" href="${href}"><span class="tag" style="color:${accent};background:${accent}18;border-color:${accent}55">${tag}</span>
     <h3>${title}</h3><p>${desc}</p><span class="go" style="color:${accent}">Open →</span></a>`;
  const body = `<div class="hub">
    <header><div class="logo">📡</div><div><h1>ClearSky — RightFlush demo</h1>
      <p>The whole loop, live: a customer browses the site, the AI decision system scores and decides, and the code refereed against the plan.</p></div></header>
    <div class="grid">
      ${card("/", "customer site", "The RightFlush website", "Browse it like a real visitor — the live monitoring HUD (top-right) shows tier, bucket, and engagement score climbing as you click. Open the Lead Grabber to flip to Tier 1.", "#0d7f78")}
      ${card("/replay", "engine", "Journey replay", "Watch Barry, Denise & George run through the 7-stage AI pipeline — identity, scoring, signals, actions, the SLA breach → autocaller bridge-merge, and every flagged gap.", "#6d28d9")}
      ${card("/findings", "review", "Code vs. the stories", "Where the live implementation diverges from what the journeys say it should do — 7 findings, cited to file & line (Tier 2A, score decrements, the missing bridge-merge…).", "#b45309")}
    </div>
    <footer>Generated from the prototype engine and the RightFlush design site · nothing here is a mockup.</footer>
  </div>`;
  return shell("ClearSky — RightFlush demo", body,
    `.hub{max-width:960px;margin:0 auto;padding:56px 22px 96px}
     header{display:flex;gap:16px;align-items:flex-start;margin-bottom:34px}
     .logo{width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,#0d7f78,#0aa39a);display:grid;place-items:center;font-size:22px;flex:none}
     header h1{font-size:1.5rem;letter-spacing:-.02em;margin:0 0 4px}header p{margin:0;color:var(--muted);max-width:64ch}
     .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
     .card{display:flex;flex-direction:column;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px;text-decoration:none;color:inherit;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:.16s}
     .card:hover{border-color:#c8cdd8;transform:translateY(-2px);box-shadow:0 12px 30px -14px rgba(16,24,40,.25)}
     .card .tag{align-self:flex-start;font-family:ui-monospace,Menlo,monospace;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:3px 9px;border-radius:6px;border:1px solid}
     .card h3{margin:2px 0 0;font-size:1.12rem}.card p{margin:0;color:var(--muted);font-size:.9rem;flex:1}.card .go{font-weight:600;font-size:.85rem}
     footer{margin-top:32px;color:var(--faint);font-size:.8rem}
     @media(max-width:640px){.grid{grid-template-columns:1fr}}`);
}
