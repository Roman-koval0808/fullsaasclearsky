ClearSky Software

**ContentRadar — Engine 1**

Developer Handoff To-Do List

Rory Dredhart  ·  r.dredhart@clearskysoftware.net  ·  May 2026  ·  Confidential

This document is your personal to-do list before handing Engine 1 to a developer. Everything on this list is your responsibility — not the developer's. A developer who receives all of these items completed can start building immediately without asking a single question.

Work through the sections in order. Each item has a checkbox — tick it when done. When every box is ticked, you are ready to hire.

# **A  —  Create API Accounts and Get Keys**

These are the services the scoring pipeline calls. Without these accounts and keys, the developer cannot test a single integration. Create each account, generate a key, and store it somewhere safe — a password manager or a secure notes app. You will hand all keys to the developer on their first day.

| **Variable name** | **Where to get it** | **What it enables** | **Priority** |
| --- | --- | --- | --- |
| **ANTHROPIC_API_KEY** | platform.anthropic.com → API Keys | Claude scoring — 43 signals | **Required now** |
| **GOOGLE_PLACES_API_KEY** | console.cloud.google.com → APIs → Places API → Credentials | GBP data — signals 11–18 (may already exist in ClearSky Layer 1) | **Required now** |
| **YOUTUBE_API_KEY** | console.cloud.google.com → APIs → YouTube Data API v3 | Video signals 44–47. Free quota. | **Required now** |
| **VALUESERP_API_KEY** | valueserp.com → Dashboard | Search signals 40, 43, 51–54 | **Required now** |
| **APIFY_API_TOKEN** | console.apify.com → Settings → Integrations | Facebook, Nextdoor, HomeStars, Houzz, Angi, BBB — signals 19–35 | **Required now** |
| **OPENAI_API_KEY** | platform.openai.com → API Keys | AI authority queries — signals 48–50 (ChatGPT) | **Required now** |
| **GEMINI_API_KEY** | aistudio.google.com → API Keys | AI authority queries — signals 48–50 (Gemini) | **Required now** |
| **PERPLEXITY_API_KEY** | perplexity.ai/settings/api | AI authority + citation detection — Signal 50 critical | **Required now** |

*Google Places API: $200 free monthly credit — sufficient for all testing. No billing charge until you exceed the credit.*

*Anthropic API: ~$5 free credit on signup. Apply at anthropic.com/startups for additional credits.*

*Apify: Free plan available. Test 5 pages before committing. Estimated cost $0.02–$0.08 per contractor at scale.*

*YouTube Data API: Free quota of 10,000 units/day — sufficient for Cohort 1 build.*

**Section A checklist**

| ☐ | **A1. Create Anthropic account and generate API key** platform.anthropic.com → sign up → API Keys → Create Key. Key starts with sk-ant- | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **A2. Confirm Google Places API key exists or create it** Check ClearSky Layer 1 — this key may already exist. If not, console.cloud.google.com → enable Places API → Credentials | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **A3. Enable YouTube Data API v3 and generate key** Same Google Cloud project as Places API. APIs & Services → Library → YouTube Data API v3 → Enable → Credentials | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **A4. Create ValueSERP account and get API key** valueserp.com → sign up → key on dashboard immediately. Add small credit top-up ($10 sufficient for testing) | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **A5. Create Apify account and get API token** console.apify.com → Settings → Integrations → API token. Free plan sufficient to start. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **A6. Create OpenAI account and generate API key** platform.openai.com → API Keys → Create new key. Add $10 credit for testing. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **A7. Create Google AI Studio account and get Gemini key** aistudio.google.com → Get API Key. Free tier sufficient for testing. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **A8. Create Perplexity account and get API key** perplexity.ai → Settings → API → Generate. Add credit for testing. This one is critical for Signal 50. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

# **B  —  Provision the VPS**

The database and scoring pipeline live on a Virtual Private Server. This needs to be set up and running before the developer can deploy anything. The developer will configure it — but you need to have it purchased and accessible.

**Server requirements**

- Ubuntu 22.04 LTS or later

- Node.js 18 or later (developer installs this)

- At least 1GB RAM — Claude API responses can be large

- HTTPS — required for API key security

- A domain name or subdomain pointing to the VPS IP address

- PostgreSQL 14+ — developer installs this

*Recommended providers: DigitalOcean, Hetzner, Vultr. A $12–20/month droplet is sufficient for development and early production. You will need SSH access — the developer will connect remotely.*

**Section B checklist**

| ☐ | **B1. Purchase a VPS from a hosting provider** DigitalOcean ($12/mo), Hetzner ($5/mo), or Vultr ($10/mo). Choose Ubuntu 22.04. 1GB RAM minimum, 2GB recommended. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **B2. Point a domain or subdomain at the VPS IP** e.g. contentradar.clearskysoftware.net → VPS IP address. Set in your DNS provider. Developer needs this for HTTPS setup. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **B3. Confirm SSH access works** Provider gives you root credentials or SSH key. Test that you can log in. Share access credentials securely with developer on day one. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

# **C  —  Set Up a GitHub Repository**

The code files from Sessions 1–24 exist as content inside Word documents and session summaries. They have never been placed in an actual code repository. The developer needs a GitHub repo with the correct folder structure and all existing code files in place before they can start.

**What needs to go in the repo**

Ask Claude to produce all of the following files in a single session, ready to paste into GitHub. The folder structure is:

| **File path** | **What it contains** |
| --- | --- |
| server/scoring/gate1.js | Gate 1 quality floor — 4 thresholds, batch runner, audit trail |
| server/scoring/pageFetcher.js | Smart website fetcher — 10 page types, parallel fetch |
| server/scoring/scorersMethod1.js | 19 deterministic formula scoring functions |
| server/scoring/scorersMethod2.js | 26 gate+Claude scoring functions |
| server/scoring/scorersMethod3.js | 15 pure Claude scoring functions |
| server/scoring/signalPipeline.js | Master orchestrator — currently stub mode, needs live wiring |
| server/scoring/valueSerpScorer.js | ValueSERP integration — signals 40, 43, 51–54 |
| server/scoring/apifyScorer.js | Apify integration — 6 platforms, schema validator |
| server/scoring/aiPlatformScorer.js | ChatGPT, Gemini, Perplexity — signals 48–50 |
| server/scoring/youtubeScorer.js | YouTube Data API v3 — signals 44–47 |
| database/contentradar_schema.sql | PostgreSQL schema — 8 tables, 3 views |
| .env.example | Template with all 13 variable names, no actual values |
| .gitignore | Must include .env — never commit API keys |
| package.json | Node.js dependencies: express, dotenv, node-fetch, cors, pg |
| README.md | Developer setup instructions |

**Section C checklist**

| ☐ | **C1. Create a private GitHub repository named contentradar** github.com → New repository → Private → Name: contentradar. Do not initialise with a README yet. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **C2. Ask Claude to produce all code files ready for GitHub** In a new session, ask: "Produce all Engine 1 code files for the ContentRadar contractors vertical, ready to paste into GitHub." Copy each file into the correct folder structure. | Rory + Claude | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **C3. Create .env.example with all 13 variable names, no values** All 8 API keys + CR_DB_HOST, CR_DB_PORT, CR_DB_NAME, CR_DB_USER, CR_DB_PASSWORD. Never put real values in this file. | Rory + Claude | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **C4. Add .gitignore that excludes .env** Critical. If .env ever gets committed, all API keys are exposed. Developer handles this but confirm it is in place before they start. | Rory | **Do first** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **C5. Give developer access to the private repo** GitHub → repository → Settings → Collaborators → Add by email or username. Give write access. | Rory | **Before dev starts** | ___________ |
| --- | --- | --- | --- | --- |

# **D  —  Choose 5 Test Contractor Websites**

The developer needs real contractor URLs to validate Apify integrations and calibrate Method 3 Claude prompts. These should be real businesses — not your own clients — with genuine websites and active Facebook/HomeStars/Google presence. Choose one per trade.

| **Trade** | **Business name** | **Website URL** | **Notes** |
| --- | --- | --- | --- |
| **Plumbing** | ________________________ | https://__________________________ | Has Facebook page? Y / N |
| **HVAC** | ________________________ | https://__________________________ | Has Facebook page? Y / N |
| **Electrical** | ________________________ | https://__________________________ | Has Facebook page? Y / N |
| **Roofing** | ________________________ | https://__________________________ | Has Facebook page? Y / N |
| **Mixed (any)** | ________________________ | https://__________________________ | Has Facebook page? Y / N |

*Pick businesses that look reasonably active — a website with real content, a real Facebook page, and at least 10 Google reviews. Avoid franchise locations. Northern Ontario or similar markets preferred.*

**Section D checklist**

| ☐ | **D1. Identify and record 5 test contractor URLs** One per trade. Fill in the table above. Confirm each has a website, a Facebook page, and Google reviews. | Rory | **Before dev starts** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **D2. Check each URL loads cleanly in a browser** Make sure none return 404 errors or redirect loops. The developer will point the pipeline at these URLs on day one. | Rory | **Before dev starts** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **D3. Add the 5 URLs to the GitHub README** A section called "Test URLs" with the business name, trade, and URL. Developer needs these without having to ask. | Rory + Claude | **Before dev starts** | ___________ |
| --- | --- | --- | --- | --- |

# **E  —  Produce the Developer Brief Document**

The developer needs one master document they can read on day one that tells them exactly what to build, what is already built, and what done looks like for each item. This document does not exist yet. Claude can produce it in a single session.

**What the developer brief must contain**

- What ContentRadar Engine 1 is and what it produces — one page, plain English

- What is already built and tested — the 10 existing code files with a one-line description of each

- What is not built yet — the 5 Phase 1 items with exact acceptance criteria for each

- The exact stub locations in signalPipeline.js that need replacing with live calls

- The folder structure and where each file lives

- How to run the pipeline locally for the first time

- How to run the Apify schema validator

- What a passing Method 3 calibration result looks like

- The database schema and how to run the SQL file

- All locked architectural decisions the developer must not change

**Section E checklist**

| ☐ | **E1. In a new Claude session, ask for the developer brief document** Say: "Produce the Engine 1 developer handoff brief for ContentRadar contractors vertical. Include what is built, what is not built, stub locations in signalPipeline.js, acceptance criteria for each Phase 1 item, and all locked decisions." | Rory + Claude | **Before dev starts** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **E2. Review the brief and confirm it is accurate** Read it. Flag anything that contradicts the locked decisions in the session 24 summary. Ask Claude to correct it. | Rory | **Before dev starts** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **E3. Add the brief to the GitHub repository as DEVELOPER_BRIEF.md** This is the first thing the developer reads. It belongs in the root of the repo alongside the README. | Rory | **Before dev starts** | ___________ |
| --- | --- | --- | --- | --- |

# **F  —  Find and Brief a Developer**

Once Sections A through E are complete you are ready to hire. The right developer for this project is a Node.js backend developer with API integration experience. They do not need to know ContentRadar — the brief tells them everything.

**Where to find the right developer**

- Upwork — search "Node.js API integration" — filter by $40–80/hr, 90%+ job success, 1000+ hours worked

- Toptal — premium vetted developers, higher cost but faster onboarding

- Local referral — ask your network in Timmins or Northern Ontario tech community

- LinkedIn — post a contract role for a Node.js developer, 2–4 weeks, remote

**What to tell them in the job post**

Copy this text into your job post:

| **Node.js Backend Developer — Contract (2–4 weeks, remote)** We have a complete Node.js scoring pipeline for a digital marketing intelligence platform. The code is written and tested in stub mode. We need a developer to wire 4 live API integrations into the master orchestrator, validate Apify scrapers against live pages, and calibrate 15 Claude AI scoring prompts against real websites. Full developer brief, existing code, and spec documents provided. VPS is provisioned. All API keys will be supplied. Skills required: Node.js, Express, REST API integration, PostgreSQL, Anthropic Claude API. Experience with Apify a plus. |
| --- |

**Section F checklist**

| ☐ | **F1. Confirm Sections A–E are fully complete before posting the job** Do not post until all API keys exist, the VPS is live, the repo is set up, test URLs are documented, and the developer brief is written. | Rory | **Last step** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **F2. Post the developer job on Upwork or LinkedIn** Use the job description above. Budget for 2–4 weeks of part-time work. Include the GitHub repo link in the application instructions. | Rory | **Last step** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **F3. Share API keys securely on developer day one** Use a password manager shared link (1Password, Bitwarden) or a secure file transfer. Never email API keys. Never paste them in chat. | Rory | **Day one** | ___________ |
| --- | --- | --- | --- | --- |

| ☐ | **F4. Share VPS SSH access securely on developer day one** Provider's control panel → Access → Add developer's SSH public key, OR create a new user account with sudo access. | Rory | **Day one** | ___________ |
| --- | --- | --- | --- | --- |

# **Summary — All Items at a Glance**

| **☐** | **Ref** | **Task** | **Section** | **Done date** |
| --- | --- | --- | --- | --- |
| ☐ | **A1** | Create Anthropic API account and key | A — API Accounts | ____________ |
| ☐ | **A2** | Confirm or create Google Places API key | A — API Accounts | ____________ |
| ☐ | **A3** | Enable YouTube Data API v3 and get key | A — API Accounts | ____________ |
| ☐ | **A4** | Create ValueSERP account and get key | A — API Accounts | ____________ |
| ☐ | **A5** | Create Apify account and get API token | A — API Accounts | ____________ |
| ☐ | **A6** | Create OpenAI account and get API key | A — API Accounts | ____________ |
| ☐ | **A7** | Create Gemini API key via Google AI Studio | A — API Accounts | ____________ |
| ☐ | **A8** | Create Perplexity API key | A — API Accounts | ____________ |
| ☐ | **B1** | Purchase a VPS (Ubuntu 22.04, 1–2GB RAM) | B — VPS | ____________ |
| ☐ | **B2** | Point domain/subdomain at VPS IP | B — VPS | ____________ |
| ☐ | **B3** | Confirm SSH access works | B — VPS | ____________ |
| ☐ | **C1** | Create private GitHub repo: contentradar | C — GitHub | ____________ |
| ☐ | **C2** | Ask Claude to produce all code files for GitHub | C — GitHub | ____________ |
| ☐ | **C3** | Create .env.example with all 13 variable names | C — GitHub | ____________ |
| ☐ | **C4** | Add .gitignore excluding .env | C — GitHub | ____________ |
| ☐ | **C5** | Give developer write access to the repo | C — GitHub | ____________ |
| ☐ | **D1** | Identify and record 5 test contractor URLs | D — Test URLs | ____________ |
| ☐ | **D2** | Verify each URL loads cleanly | D — Test URLs | ____________ |
| ☐ | **D3** | Add test URLs to GitHub README | D — Test URLs | ____________ |
| ☐ | **E1** | Ask Claude to produce the developer brief document | E — Dev Brief | ____________ |
| ☐ | **E2** | Review brief and confirm accuracy | E — Dev Brief | ____________ |
| ☐ | **E3** | Add brief to repo as DEVELOPER_BRIEF.md | E — Dev Brief | ____________ |
| ☐ | **F1** | Confirm A–E complete before posting job | F — Hire | ____________ |
| ☐ | **F2** | Post developer job on Upwork or LinkedIn | F — Hire | ____________ |
| ☐ | **F3** | Share API keys securely on day one | F — Hire | ____________ |
| ☐ | **F4** | Share VPS SSH access securely on day one | F — Hire | ____________ |

ClearSky Software  ·  ContentRadar Engine 1 Developer Handoff  ·  May 2026  ·  Confidential