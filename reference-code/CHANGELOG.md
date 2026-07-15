# ClearSky Digital Health Diagnostic — Changelog

**Project:** ClearSky Revenue Model — Trades Vertical  
**Owner:** Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564  
**Classification:** Confidential

---

## Current State — Session 13 (April 2026)

### Live API Layers
| Layer | What it measures | API | Status |
|---|---|---|---|
| Layer 1 | Google Business Profile | Google Places API | ✅ Live |
| Layer 2 | Rank / Local Pack | ValueSERP | ✅ Live |
| Layer 3 | Site Performance | PageSpeed Insights | ✅ Live |
| Layer 4 | Content | Firecrawl | 🔲 Mocked |
| Layer 5 | AI Visibility | — | 🔲 Mocked |
| Layer 6 | Paid | — | 🔲 Mocked |
| Layer 7 | Social | Data365 + Facebook Graph | 🔲 Mocked |
| Layer 8 | Competitive Paid Density | — | 🔲 Mocked |
| Layer 9 | Engagement | — | 🔲 Mocked |
| Layer 10 | Conversion | — | 🔲 Mocked |
| Layer 11 | Growth / Brand Equity | — | 🔲 Mocked |
| Layer 12 | Canonical | — | 🔲 Mocked |

### File State
| File | Last changed | Status |
|---|---|---|
| `app/page.jsx` | Session 12 | onCTA stub — wire when Calendly URL confirmed |
| `app/api/diagnostic/route.js` | Session 13 | Layers 1–3 live. Layers 4–12 mocked |
| `app/api/trades/route.js` | Session 13 | Keywords array added per trade |
| `lib/clearsky-engine.js` | Session 11 | Locked — lookup table patch only |
| `lib/clearsky-engine.mjs` | Session 9 | Locked — never touch |
| `components/ClearSkyIntakeForm.jsx` | Session 12 | Final — minor styling only |
| `components/ClearSkyResultsModal.jsx` | Session 8 | Final — never touch |
| `app/layout.jsx` | Session 9 | Final — never touch |
| `jsconfig.json` | Session 9 | Final — never touch |
| `next.config.mjs` | Session 9 | Final — never touch |
| `package.json` | Session 9 | Final — never touch |

### Open Items
| Item | Description | Priority |
|---|---|---|
| onCTA | Wire Calendly booking URL in `app/page.jsx` | Next session — URL pending from Rory |
| GMB OAuth | Build OAuth flow for live `gbpPostCount` | Session 14 or 15 |
| Layer 4 | Wire Firecrawl for live page/blog/FAQ counts | Future |
| Layers 5–12 | Wire one at a time | Future |
| Bayesian coefficients | Update benchmark multipliers with real client data | After ~50 clients |

---

## Session 13 (April 2026)

### Changes
- **Layer 2 wired** — ValueSERP API integration in `app/api/diagnostic/route.js`
  - Query constructed as `{primaryKeyword} {city} {province}`
  - Geo-biased to Canada (`gl=ca`), 1-hour cache, 15s timeout
  - Business name fuzzy-matched against local pack + organic SERP titles
  - Falls back to mock silently if `VALUESERP_API_KEY` not set
  - Raw SERP entries exposed in `results.meta` for testing and debug
- **Keywords array added** to each trade in `app/api/trades/route.js`
  - `keywords[0]` = primary keyword used for ValueSERP call
  - Alternates stored for future multi-keyword ranking runs
  - Plumbing: `['plumber', 'plumbing', 'emergency plumber', 'drain cleaning', 'water heater']`
  - HVAC: `['hvac', 'heating and cooling', 'furnace repair', 'air conditioning', 'hvac contractor']`
  - Electrical: `['electrician', 'electrical contractor', 'electrical repair', 'panel upgrade', 'licensed electrician']`
  - Roofing: `['roofer', 'roofing contractor', 'roof repair', 'roof replacement', 'roofing company']`
- **All three live layers** now run in one `Promise.all()` — no increase in diagnostic time
- **onCTA** — remains stubbed, Calendly URL not yet confirmed

### Files changed
- `app/api/diagnostic/route.js` — Layer 2 added
- `app/api/trades/route.js` — keywords array added

### Environment variables added
- `VALUESERP_API_KEY` — required for Layer 2

---

## Session 12 (April 2026)

### Changes
- **Website URL field** added to intake form screen 1 (`ClearSkyIntakeForm.jsx`) — optional
- **Layer 3 wired** — PageSpeed Insights API (free, no key required for 25 req/day)
  - Runs `strategy=mobile` — dominant local SEO signal for trades
  - Returns 4 Lighthouse scores + 6 Core Web Vitals + `mobileFriendly`
  - Falls back to mock silently if URL blank, invalid, or PSI fails
- **Layer 1 + Layer 3** run in parallel via `Promise.all()`
- **ValueSERP selected** for Layer 2 (over BrightLocal) — plan only, no code change
- **GMB OAuth plan** agreed for `gbpPostCount` — plan only, no code change
- **onCTA** deferred again — Calendly URL not confirmed

### Files changed
- `app/api/diagnostic/route.js` — Layer 3 added, Promise.all introduced
- `components/ClearSkyIntakeForm.jsx` — websiteUrl field added
- `app/page.jsx` — websiteUrl passed through to diagnostic call

### Environment variables added
- `PAGEINSIGHTS_KEY` — optional, only needed above 25 req/day

---

## Session 11 (April 2026)

### Changes
- **Layer 1 wired** — Google Business Profile via Places API
  - Returns: rating, review count, photos count, hours, description, services, website link
  - `gbpPostCount` mocked at 2 (requires GMB OAuth — separate flow)
  - Falls back to mock silently if `GOOGLE_PLACES_API_KEY` not set
- **`/api/trades` route** — CMS fetch added with hardcoded fallback
- **City lookup table** expanded to full Canadian coverage
- **`adminHoursPerWeek`** input added, replacing retired `nonBillablePct`

### Files changed
- `app/api/diagnostic/route.js` — Layer 1 added
- `app/api/trades/route.js` — CMS fetch added
- `lib/clearsky-engine.js` — city lookup table expanded

### Environment variables added
- `GOOGLE_PLACES_API_KEY` — required for Layer 1
- `CLEARSKY_CMS_URL` — optional
- `CLEARSKY_CMS_KEY` — optional

---

## Sessions 1–10 (Sessions 1–9: April 2026)

### What was built across Sessions 1–10
- **12-layer diagnostic engine** (`lib/clearsky-engine.js`) — 179 tests, locked
- **Revenue valuation formula** — 10-step formula, six multipliers
- **Personalization Capture Model** — 59 content signals + 4 NLP calls = 63 evaluations
- **Three-scenario recovery model** — Current Reality / Market Opportunity / Full Potential
- **Brand Equity Index** — Layer 11 seventh growth signal
- **Brand Tenure Modifier** — unconditional capture rate amplifier by years in business
- **Market Opportunity Multiplier** — Market Demand Index × Competitive Density Index
- **Diagnostic Confidence scoring** — uncertainty spread drives scenario range width
- **Results modal UI** (`components/ClearSkyResultsModal.jsx`) — final, never touch
- **Three-screen intake form** (`components/ClearSkyIntakeForm.jsx`) — screens 1–3
- **Next.js app shell** — `app/layout.jsx`, `app/page.jsx`, `next.config.mjs`, `jsconfig.json`
- **ESM shim** (`lib/clearsky-engine.mjs`) — never touch
- **`/api/trades` route** — base trade and season config

---

## Key Decisions Log (permanent record)

| Decision | What was decided | Session |
|---|---|---|
| Engine locked | `clearsky-engine.js` is never modified except lookup table | Session 9 |
| ESM shim locked | `clearsky-engine.mjs` is never touched | Session 9 |
| Results modal locked | `ClearSkyResultsModal.jsx` is final | Session 8 |
| Website URL optional | Silent fallback to mock PSI if blank | Session 12 |
| PSI runs mobile strategy | Dominant local SEO signal for trades | Session 12 |
| PSI runs keyless | Free at 25 req/day. Key optional for higher quota | Session 12 |
| ValueSERP over BrightLocal | Pay-per-call, no monthly minimum, single API key | Session 12 |
| GMB OAuth deferred | `gbpPostCount` mocked at 2 until OAuth built | Session 12 |
| Keywords in trades config | `keywords[]` array per trade, `keywords[0]` = primary | Session 13 |
| Rank matching is fuzzy | Strip trade words + suffixes, match on remaining words | Session 13 |
| All layers run in parallel | `Promise.all()` across all live API layers | Session 13 |
| Layers 4–12 mocked | Wire one at a time in future sessions | Session 13 |
| onCTA stubbed | Wire when Calendly URL confirmed by Rory | Sessions 11–13 |
