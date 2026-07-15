# Journey Replay — visual demo

`index.html` is a **self-contained web page** that plays the RightFlush customer
journeys through the ClearSky pipeline, step by step. Every panel is generated
from the **real prototype engine** — it's the code reproducing the stories, not
a mockup.

## Open it

Just open the file in a browser — no server needed:

```text
prototype/demo/index.html
```

(double-click it, or `open demo/index.html` on macOS). It works straight from
disk because the CSS, JS, and the engine's trace data are all inlined.

Or serve it over HTTP (nicer URL, shareable on your network):

```bash
npm run serve        # builds + serves at http://localhost:4173
```

(zero dependencies — a tiny built-in Node static server; `PORT=8080 npm run serve` to change the port.)

## Rebuild it (after the engine changes)

```bash
npm run demo
```

That re-runs every journey through the engine and regenerates `index.html` from
`template.html`. Edit `template.html` for layout/styling; never hand-edit
`index.html` (it's generated).

## How to drive the page

- **Tabs** — Barry · Denise (anonymous→Tier 1) · Denise's call · Denise's review
- **Play** watches a journey unfold · **← / →** step · **space** play/pause
- **Timeline** dots jump to any step; red = SLA breach, green = conversion
- **⚑ tracker #NN** chips are the open gaps, shown where the story hits them (hover for detail)

**The one to show:** open **Barry**, hit **Play** — anonymous arrival → Lead
Grabber → Tier 1 → AI reads it as urgent-not-emergency → 10-minute promise →
**15-minute breach (screen turns red, three alerts)** → **Bert presses 1, the
autocaller bridges the call** → "I'll be out at 3:00 PM" captured.
