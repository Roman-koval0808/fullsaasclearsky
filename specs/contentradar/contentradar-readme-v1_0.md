**ContentRadar**

Comprehensive README

Family law vertical · Svelte frontend · Node.js backend

Version 1.0 · April 2026 · ClearSky Software · Confidential

**1. What is ContentRadar**

ContentRadar is ClearSky Software's proprietary content intelligence platform. Its sole responsibility is to identify a cohort of best-performing family law firms, extract best practices, and compare an individual licensed client against those best practices.

ContentRadar produces one primary output: a Content Gap Percentage (scored against a maximum of 147 points across 49 signals) that feeds directly into the ClearSky Digital Health Diagnostic engine at Layer 4. It also produces a separate Referral Network Score and a Content Intelligence layer for licensed clients only.

ContentRadar does not calculate revenue. Revenue translation is entirely handled by the ClearSky diagnostic engine. ContentRadar's job is to score, compare, and surface gaps.

| **Product** | **Description** |
| --- | --- |
| ContentRadar | Signal scoring and benchmarking platform |
| ClearSky Diagnostic | Revenue gap analysis engine — consumes ContentRadar output |
| A2P Platform | Communication layer feeding Content Intelligence signals |

**2. Architecture overview**

| **Critical rule** All API calls must run server-side. API keys are never exposed to the browser. The frontend receives a single scored JSON object and renders from that only. This rule is non-negotiable. |
| --- |

The system has four layers:

- Input layer — a Svelte form where your team enters firm details: name, city, website URL, LinkedIn URL, Facebook URL, Instagram URL, and years in business

- Backend scoring engine — a Node.js/Express server that fetches pages, calls external APIs, passes content to Claude for scoring, and assembles the full scored JSON response

- External APIs — Anthropic Claude API (AI scoring), Google Places API (GBP data), ValueSERP (future, search rank)

- Frontend rendering layer — Svelte components that receive the scored JSON and render the audit tool UI with Signal groups view and Breakdown view

**3. Tech stack**

| **Layer** | **Technology** |
| --- | --- |
| Frontend | Svelte — component-based, no SvelteKit |
| Backend | Node.js + Express — developer implements routing |
| AI scoring | Anthropic Claude API — claude-sonnet-4-20250514 |
| GBP data | Google Places API — findplacefromtext endpoint |
| Search rank | ValueSERP API — future, not required for initial build |
| Page fetching | node-fetch or axios — with 10 second timeout |
| Hosting | Self-hosted VPS — developer manages deployment |
| PDF export | Puppeteer — render audit tool page to PDF |

**4. Project structure**

contentradar/

  src/

    lib/

      components/

        AuditTool.svelte          — Main container, tab switching

        AuditTopBar.svelte        — Firm name, status, download buttons

        SignalGroupsView.svelte   — Signal groups tab

        SignalGroup.svelte        — Collapsible group with score and gap

        SignalRow.svelte          — Individual signal with pips and ? button

        SignalPopup.svelte        — Signal definition, Cohort 1, scoring

        BreakdownView.svelte      — Metrics, gap bar, pie chart

        ReferralSection.svelte    — Referral network signals

        A2PSection.svelte         — A2P intelligence (grayed, pending)

      constants/

        signals.js               — All 60 signal definitions and prompts

        groups.js                — Signal group configuration

      stores/

        auditStore.js            — Svelte writable store

  server/

    index.js                     — Express entry point

    routes/

      audit.js                   — POST /api/audit handler

    scoring/

      claudeScorer.js            — Anthropic API scoring logic

      gbpScorer.js               — Google Places scoring logic

      valueSerpScorer.js         — ValueSERP scoring (future)

      pageFetcher.js             — Page fetch and HTML strip utility

      signalPipeline.js          — Full scoring pipeline orchestrator

    constants/

      signals.js                 — Shared with frontend (same file)

      cohort1Averages.js         — Fixed Cohort 1 benchmark constants

  .env                           — API keys — never commit to git

  .env.example                   — Template for environment variables

  package.json

  README.md

**5. Environment variables**

| **Security** Never commit your .env file to git. Add it to .gitignore immediately. Never paste API keys into chat, email, or any shared document. |
| --- |

Create a .env file in the project root. Copy .env.example and fill in your values.

# Anthropic API

ANTHROPIC_API_KEY=sk-ant-...

# Google Places API

GOOGLE_PLACES_API_KEY=AIza...

# ValueSERP (future — leave blank for now)

VALUESERP_API_KEY=

# Server

PORT=3000

NODE_ENV=development

**5.1 Getting your Anthropic API key**

- Go to platform.anthropic.com and sign in or create an account

- Navigate to API Keys in the left menu

- Click Create Key and give it a name (e.g. ContentRadar)

- Copy the key immediately — it is only shown once

- Paste it into your .env file as ANTHROPIC_API_KEY

*The key starts with sk-ant-. You get approximately $5 in free credits on signup. Apply to the Anthropic startup program at anthropic.com/startups for additional credits.*

**5.2 Getting your Google Places API key**

- Go to console.cloud.google.com and sign in

- Create a new project — click the project dropdown top left, then New Project. Name it ClearSky.

- Go to APIs and Services — Library. Search for Places API. Click it and click Enable.

- Go to APIs and Services — Credentials. Click Create Credentials — API Key.

- Copy the key. Then click Edit on the key and under API restrictions, select Restrict key and choose Places API. Save.

- Paste the key into your .env file as GOOGLE_PLACES_API_KEY

*Google gives $200 of free monthly credit — more than sufficient for testing. No billing required to get started.*

**5.3 Getting your ValueSERP API key (future)**

- Go to valueserp.com and create an account

- Your API key is displayed on the dashboard immediately after signup

- No monthly minimum — pay per call at approximately $0.001–$0.003 per call

- Add a small credit top-up to test. Paste key as VALUESERP_API_KEY when ready.

**6. Backend setup**

**6.1 Install dependencies**

npm install express dotenv node-fetch cors

npm install —save-dev nodemon

**6.2 Express server entry point**

Create server/index.js:

const express = require('express');

const cors = require('cors');

require('dotenv').config();

const app = express();

app.use(cors());

app.use(express.json());

app.use('/api/audit', require('./routes/audit'));

app.listen(process.env.PORT || 3000, () => {

  console.log('ContentRadar API running on port ' + (process.env.PORT || 3000));

});

**6.3 POST /api/audit route**

Create server/routes/audit.js. This is the only endpoint ContentRadar exposes.

**Request body**

| **Field** | **Type and description** |
| --- | --- |
| firmName | String — full name of the firm |
| city | String — city and province e.g. Timmins, ON |
| websiteUrl | String — full URL including https:// |
| linkedinUrl | String — LinkedIn company or individual profile URL |
| facebookUrl | String — Facebook page URL |
| instagramUrl | String — Instagram profile URL (optional) |
| yearsInBusiness | Integer — used for Google reviews benchmark |

**Response shape**

{

  firm: { name, city, auditDate },

  summary: {

    contentGapScore,     // Percentage 0–100

    contentGapPts,       // Raw points 0–147

    contentGapMax: 147,

    cohort1AvgPts,       // Fixed 124 until real Cohort 1 is built

    cohort1AvgPct,       // Fixed 84

    referralNetworkScore,  // Percentage 0–100

    referralNetworkPts,    // Raw points 0–18

    referralNetworkMax: 18,

    signalsScoredAuto,   // Count of auto-scored signals

    signalsNeedingReview, // Count of manual signals

    totalGapPts          // cohort1AvgPts minus contentGapPts

  },

  groups: {

    website: { signals: [...], groupScore, groupMax, cohort1Avg },

    linkedin: { ... },

    // ... all 10 groups

  },

  referralNetwork: { signals: [...], groupScore, groupMax },

  a2p: { signals: [...], status: 'pending_onboarding' }

}

**Signal object shape**

{

  num: 1,

  name: 'Value proposition clarity',

  source: 'claude',   // claude | google_places | valueserp | manual | a2p

  score: 1,            // 0–3 integer. -1 = manual or pending

  note: 'Practice area visible but generic.',

  needsReview: false,  // true if manual input required

  cohort1Avg: 2.8      // Fixed constant from cohort1Averages.js

}

**6.4 Page fetcher utility**

Create server/scoring/pageFetcher.js. Always strip HTML before passing to Claude — raw HTML wastes tokens and produces poor scores.

const fetch = require('node-fetch');

async function fetchPageContent(url, timeoutMs = 10000) {

  if (!url) return '';

  try {

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {

      signal: controller.signal,

      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentRadar/1.0)' }

    });

    clearTimeout(timeout);

    const html = await res.text();

    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 8000);

  } catch (e) {

    return '';   // Silent fallback — signal scores 0 if page not fetched

  }

}

module.exports = { fetchPageContent };

**6.5 Claude AI scorer**

Create server/scoring/claudeScorer.js. Every signal scored by Claude uses this function. Always wrap JSON.parse in try/catch — malformed responses return score 0.

const fetch = require('node-fetch');

const SYSTEM_PROMPT = `You are a ContentRadar signal scorer for family law firms.

Score signals strictly on a 0-3 scale based on the provided criteria.

Respond ONLY with valid JSON: {"score": 0, "note": "one sentence under 20 words"}.

No other text. No markdown. No explanation outside the JSON.`;

async function scoreSignal(pageContent, prompt) {

  if (!pageContent || !prompt) return { score: 0, note: 'No content to score.' };

  try {

    const res = await fetch('https://api.anthropic.com/v1/messages', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'x-api-key': process.env.ANTHROPIC_API_KEY,

        'anthropic-version': '2023-06-01'

      },

      body: JSON.stringify({

        model: 'claude-sonnet-4-20250514',

        max_tokens: 200,

        system: SYSTEM_PROMPT,

        messages: [{ role: 'user', content: `${prompt}\n\nPage content:\n${pageContent.substring(0, 3000)}` }]

      })

    });

    const data = await res.json();

    const text = data.content?.[0]?.text || '{"score":0,"note":"Scoring error"}';

    return JSON.parse(text);

  } catch (e) {

    return { score: 0, note: 'Scoring error. Manual review required.' };

  }

}

module.exports = { scoreSignal };

**6.6 Google Places scorer**

Create server/scoring/gbpScorer.js. Signal 9 (Google reviews, tenure adjusted) is the only signal using this.

Family law benchmark is yearsInBusiness × 2. This differs from the contractor vertical which uses × 6 due to confidentiality constraints in the legal profession.

const fetch = require('node-fetch');

async function scoreGoogleReviews(firmName, city, yearsInBusiness = 5) {

  const query = encodeURIComponent(`${firmName} ${city} family law`);

  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json

    ?input=${query}&inputtype=textquery

    &fields=name,rating,user_ratings_total

    &key=${process.env.GOOGLE_PLACES_API_KEY}`;

  try {

    const res = await fetch(url);

    const data = await res.json();

    const place = data.candidates?.[0];

    if (!place) return { score: -1, note: 'GBP not found. Manual review required.', source: 'manual', needsReview: true };

    const reviewCount = place.user_ratings_total || 0;

    const rating = place.rating || 0;

    const benchmark = yearsInBusiness * 2;

    let score = 0;

    if (reviewCount >= benchmark && rating >= 4.5) score = 3;

    else if (reviewCount >= benchmark * 0.8 && rating >= 4.0) score = 2;

    else if (reviewCount >= benchmark * 0.5) score = 1;

    return {

      score,

      note: `${reviewCount} reviews · ${rating} rating · benchmark: ${benchmark} for ${yearsInBusiness} yrs`,

      source: 'google_places',

      needsReview: false

    };

  } catch (e) {

    return { score: -1, note: 'GBP fetch failed. Manual review required.', source: 'manual', needsReview: true };

  }

}

module.exports = { scoreGoogleReviews };

**6.7 Scoring pipeline**

Create server/scoring/signalPipeline.js. This orchestrates the full audit — fetching pages in parallel, scoring all signals in order, and assembling the response.

**Pipeline execution order**

- Fetch all pages in parallel using Promise.all — website, LinkedIn, Facebook, Instagram

- Fetch GBP data via Google Places

- Score website signals 1–8 and 11 via Claude using website content

- Score Google reviews signal 9 via GBP data

- Mark AI authority signal 10 as manual

- Score LinkedIn signals 12–15 via Claude using LinkedIn content

- Score Facebook signals 16–19 via Claude using Facebook content

- Score Instagram signals 20–23 via Claude using Instagram content

- Score video signals 24–26 via Claude using website content

- Score community signals 27–30 via Claude using website content

- Score directory signals 31–35 via Claude using website content

- Score citation signals 36–38 via Claude, mark 39 as manual

- Mark search SOV 40 as manual, score social SOV 41–42 via Claude, mark AI SOV 43 as manual

- Score contact friction signals 55–60 via Claude using website content

- Mark all referral signals 49–54 as manual

- Mark all A2P signals 44–48 as pending onboarding

- Calculate totals, apply Cohort 1 averages, build response JSON

| **Performance note** Step 1 (page fetching) runs all fetches in parallel via Promise.all. This is the most important performance optimisation — do not fetch pages sequentially. Total audit time with parallel fetching is typically 60–120 seconds. |
| --- |

**7. Signal scoring reference**

**7.1 Signal source types**

| **Source** | **Description** |
| --- | --- |
| claude | 43 signals scored by Claude AI from fetched page content |
| google_places | Signal 9 only — Google reviews tenure adjusted |
| manual | 6 signals requiring human review — AI authority, referral signals, search SOV, AI SOV |
| a2p | 5 signals — licensed clients only, pending onboarding |
| valueserp | Future — signals 40 and others when ValueSERP is integrated |

**7.2 Manual signals**

The following signals cannot be auto-scored. They return score: -1 with needsReview: true and must be entered by your team before Meeting 2.

| **Signal** | **Reason manual** |
| --- | --- |
| 10 — AI authority | Requires live queries to ChatGPT, Gemini, and Perplexity |
| 39 — Referral network citation visibility | Self-reported — confirmed in Meeting 1 |
| 40 — Search share of voice | ValueSERP — not yet integrated |
| 43 — AI share of voice | Requires manual AI platform monitoring |
| 49–54 — All referral network signals | Self-reported in Meeting 1 and community research |

**7.3 Cohort 1 benchmark averages**

These are fixed constants representing the average score of top-performing family law firms across Canada and the USA. They are updated as real Cohort 1 data is built. Located in server/constants/cohort1Averages.js and imported by both the backend and frontend.

Current values are calibrated estimates based on the signal architecture. Priority signals to validate first once Cohort 1 is built: Value proposition clarity (1), People (3), Google reviews (9), AI authority (10), Contact friction (55–60).

**7.4 Gap score formula**

Content Gap % = Client current score / 147

Where 147 = 49 gap score signals × 3 (maximum per signal)

Total gap points = Cohort 1 average points − client current points

                 = 124 − client score (using current Cohort 1 estimate)

This percentage feeds directly into ClearSky Layer 4. The ClearSky engine handles all revenue translation — ContentRadar never touches dollar figures.

**7.5 Referral network score formula**

Referral Network Score = Signals 49–54 total / 18

Reported separately. Not compared to Cohort 1.

Not included in the content gap % calculation.

**8. Frontend setup**

**8.1 Install and run**

npm create svelte@latest contentradar-frontend

cd contentradar-frontend

npm install

npm run dev

**8.2 Component architecture**

| **Component** | **Purpose** |
| --- | --- |
| AuditTool.svelte | Root container. Receives auditData prop. Switches between Signal groups and Breakdown tabs. |
| AuditTopBar.svelte | Firm name, audit date, status pill, Save draft, Download PDF, Download data export buttons. |
| SignalGroupsView.svelte | Renders all 10 signal groups in order plus Referral network and A2P below separator. |
| SignalGroup.svelte | Collapsible group row showing group title, signal count, firm score vs Cohort 1, point gap, and chevron. |
| SignalRow.svelte | Individual signal with numbered label, signal name, ? button, 0–3 pips, and source tag. |
| SignalPopup.svelte | Modal popup showing signal definition, why it was chosen, Cohort 1 score bars, scoring criteria with Cohort 1 marker, and plain-English gap summary. |
| BreakdownView.svelte | Four metric cards, content gap bar, donut pie chart of gap by signal group, referral network signals, A2P signals. |

**8.3 Passing data to the audit tool**

AuditTool.svelte accepts a single auditData prop — the full scored JSON returned by POST /api/audit. Pass it from your parent page or store.

<script>

  import AuditTool from '$lib/components/AuditTool.svelte';

  let auditData = null;

  async function runAudit(firmDetails) {

    const res = await fetch('/api/audit', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(firmDetails)

    });

    auditData = await res.json();

  }

</script>

{#if auditData}

  <AuditTool {auditData} />

{/if}

**8.4 Svelte store**

Import and use auditStore.js to share audit state across components:

import { writable } from 'svelte/store';

export const auditStore = writable({

  status: 'idle',   // idle | running | complete | error

  firm: null,

  summary: null,

  groups: {},

  referralNetwork: null,

  a2p: null,

  activeTab: 'signals',

  progress: 0,

  progressLabel: ''

});

**9. Running locally**

**9.1 Start the backend**

cd server

npm install

node index.js

# or with auto-reload:

npx nodemon index.js

The API will be available at http://localhost:3000. Test it with:

curl -X POST http://localhost:3000/api/audit \

  -H "Content-Type: application/json" \

  -d '{"firmName":"Test Firm","city":"Timmins, ON","websiteUrl":"https://example.com","yearsInBusiness":5}'

**9.2 Start the frontend**

cd contentradar-frontend

npm run dev

The frontend will be available at http://localhost:5173. Configure the API base URL in your environment:

# .env (frontend)

VITE_API_URL=http://localhost:3000

**9.3 Test a full audit**

- Start the backend on port 3000

- Start the frontend on port 5173

- Open http://localhost:5173 in your browser

- Enter a real family law firm’s details in the form

- Click Run audit and wait 60–120 seconds

- Review the Signal groups view — check that scores look reasonable

- Open the Breakdown view — verify the pie chart and gap calculations

- Click the ? on several signals — verify Cohort 1 comparison is correct

**10. VPS deployment**

**10.1 Server requirements**

- Ubuntu 22.04 LTS or later

- Node.js 18 or later

- At least 1GB RAM — Claude API responses can be large

- HTTPS — required for API key security

- A domain name pointing to your VPS IP

**10.2 Backend deployment**

- SSH into your VPS

- Install Node.js: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs

- Clone or upload your project to the VPS

- Create your .env file on the server — never transfer it via git

- Install PM2 for process management: npm install -g pm2

- Start the backend: pm2 start server/index.js —name contentradar-api

- Save the PM2 process list: pm2 save && pm2 startup

**10.3 Frontend deployment**

- Build the Svelte app: npm run build

- The build output goes to dist/ (or build/ depending on your adapter)

- Serve the static files with Nginx or Caddy

- Configure your web server to proxy API requests to localhost:3000

**10.4 Nginx configuration example**

server {

  listen 443 ssl;

  server_name contentradar.yourdomain.com;

  location /api {

    proxy_pass http://localhost:3000;

    proxy_http_version 1.1;

    proxy_set_header Host $host;

  }

  location / {

    root /var/www/contentradar/dist;

    try_files $uri /index.html;

  }

}

**10.5 SSL with Certbot**

sudo apt install certbot python3-certbot-nginx

sudo certbot —nginx -d contentradar.yourdomain.com

**11. Download outputs**

**11.1 PDF report**

The PDF export should render the full audit tool at a fixed viewport width and print to PDF. Recommended approach: Puppeteer on the backend.

const puppeteer = require('puppeteer');

async function generatePDF(auditId) {

  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.goto(`http://localhost:3000/audit/${auditId}?print=true`);

  await page.waitForSelector('.audit-tool');

  const pdf = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();

  return pdf;

}

**11.2 Data export (JSON)**

Return the full scored audit JSON as a downloadable file. The Svelte AuditTopBar component handles the download button — it creates a Blob from the audit JSON and triggers a download.

Filename format: contentradar-audit-[firm-name]-[date].json

**12. Future integrations**

**12.1 ValueSERP — search rank and share of voice**

When ValueSERP is integrated, it replaces manual scoring for signals 40 (search share of voice) and potentially others requiring SERP data.

| **Signal** | **What ValueSERP provides** |
| --- | --- |
| 40 — Search share of voice | Local pack position, organic rank, share of voice estimate |
| Future signals | Competitor density, ad presence, featured snippets |

**12.2 Your existing SEO tool**

If your existing SEO data tool returns local pack position, organic rank, and keyword data, it may replace ValueSERP entirely. Wire it into the signalPipeline.js the same way — call the API server-side, parse the response, return a 0–3 score and note.

**12.3 GMB API OAuth (GBP post count)**

The Google My Business API requires OAuth 2.0 — a separate user-consent flow from the Places API. This enables reading GBP post count (gbpPostCount) for the GBP signals. The OAuth flow plan is documented in clearsky-developer-notes-v1.7.docx. Wire after the core scoring pipeline is stable.

**12.4 Cohort 1 database**

When Cohort 1 is built (300 benchmark firms manually reviewed), the fixed cohort1Averages.js constants are replaced with live averages from the database. The scoring pipeline stays identical — only the benchmark reference changes.

**12.5 ContentRadar into ClearSky Layer 4**

The final integration: replace the Firecrawl mock in app/api/diagnostic/route.js with a call to the ContentRadar API. ContentRadar returns the Content Gap % and the ClearSky engine uses it in the revenue formula. This is a future session item documented in the developer notes.

**13. Troubleshooting**

**13.1 All signals score 0**

This means page fetching or Claude scoring is failing silently. Check:

- ANTHROPIC_API_KEY is set correctly in .env

- The backend is running and accessible at localhost:3000

- Test the Claude API directly: curl the /v1/messages endpoint with your key

- Check server console for fetch errors or Claude API error responses

**13.2 GBP not found**

Google Places cannot find the firm. This is common for small firms with incomplete GBP profiles. Options:

- Try a different search query — add the street address to the firm name

- Mark signal 9 as manual and enter the review count and rating by hand

- The client may need to claim their GBP profile first

**13.3 Audit takes more than 3 minutes**

Page fetching or Claude scoring is slower than expected. Check:

- Pages are being fetched in parallel (Promise.all) not sequentially

- The 10 second timeout is set on each fetch — adjust if needed

- LinkedIn and Instagram may block automated fetching — silent failures return empty strings which score 0

- Consider a page caching layer for repeat audits of the same firm

**13.4 Claude returns malformed JSON**

The system prompt is very specific but Claude occasionally returns text before or after the JSON. The scorer wraps JSON.parse in try/catch and returns score: 0, note: 'Scoring error' on failure. If this happens frequently, add a cleaning step:

const text = data.content?.[0]?.text || '{"score":0,"note":"error"}';

const clean = text.replace(/```json|```/g, '').trim();

return JSON.parse(clean);

**13.5 LinkedIn and Instagram content not scoring well**

These platforms actively block automated fetching. If page content returns empty, Claude scores 0 by default. Options:

- Use a headless browser (Puppeteer) to render JavaScript-heavy pages before extracting text

- Flag these signals as manual and score them by visual inspection

- In future: use a commercial scraping service like Apify or Bright Data for social platform data

**14. Security checklist**

- Never commit .env to git — add it to .gitignore on day one

- Never expose API keys in browser JavaScript or Svelte components

- Never log full API responses to console in production — they may contain firm data

- Restrict your Google Places API key to the Places API only in Google Cloud Console

- Run the backend behind HTTPS — never serve the API over plain HTTP in production

- Rotate your Anthropic API key if you ever suspect it has been exposed

- Add rate limiting to POST /api/audit — each audit costs real API credits

- Store audit results in a database, not in memory — server restarts lose in-memory data

**15. Contact and support**

ContentRadar is a proprietary product of ClearSky Software. All questions about the architecture, scoring logic, signal definitions, or Cohort 1 data should go directly to Rory Dredhart.

| **Contact** | **Details** |
| --- | --- |
| Name | Rory Dredhart |
| Company | ClearSky Software |
| Email | r.dredhart@clearskysoftware.net |
| Phone | 705-274-9564 |
| Location | Timmins, Northern Ontario, Canada |

ClearSky Software · ContentRadar README · v1.0 · April 2026 · Confidential