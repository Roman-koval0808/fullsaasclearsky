ClearSky Software — Confidential

**Developer Implementation Notes**

Digital Health Diagnostic — Trades Vertical

Version 1.7 — April 2026

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564

| **Field** | **Value** |
| --- | --- |
| Read alongside | clearsky-diagnostic-spec-v2.4.docx |
| Changes from v1.6 | Session 12: Website URL field added to intake form screen 1 (optional). Layer 3 wired to PageSpeed Insights API (free, no key required). websiteUrl passed through intake form → page.jsx → diagnostic route. Layer 2 (Rank) API selected and planned — no code change this session. GMB API OAuth for gbpPostCount planned — no code change this session. onCTA booking destination deferred again pending URL from Rory. |

| *CRITICAL ARCHITECTURE RULE: All API calls must run server-side. API keys must never be exposed in browser JavaScript. The frontend sends prospect inputs to your backend endpoint. The backend runs all data fetches, performs all calculations, and returns structured JSON. The frontend renders from that JSON only.* |
| --- |

*Sections 1–4 are unchanged from v1.5. They cover the system overview, twelve diagnostic layers, processing architecture, API integration details, the revenue gap calculation engine, the results modal UI, and the complete integration layer. Refer to clearsky-developer-notes-v1.5.docx for those sections.*

# **Section 5 — Session 11 Changes**

Unchanged from v1.6. Refer to clearsky-developer-notes-v1.6.docx Section 5 for full detail on Layer 1 GBP live, /api/trades CMS fetch, city lookup table expansion, and onCTA deferral.

# **Section 6 — Session 12 Changes**

## **6.1 — Website URL Field Added to Intake Form (Screen 1)**

A website URL field has been added to screen 1 of ClearSkyIntakeForm.jsx. It sits between the City field and the Trade selector. The field is optional — the form submits and the diagnostic completes normally if left blank. PageSpeed Insights falls back to mock scores silently.

**Field behaviour**

- Label: Website URL

- Hint text: Optional — used to analyse your site performance. Leave blank if you don't have a website.

- Input type: url

- Placeholder: e.g. rempelplumbing.ca

- Required: false — no validation error if blank

- URL normalisation: if the user enters a URL without a scheme (e.g. rempelplumbing.ca), the form prepends https:// before submission

**Data flow**

- Screen 1 form state: form.websiteUrl (string, may be empty)

- onSubmit payload: business.websiteUrl — normalised URL string, or null if blank

- page.jsx: passes business.websiteUrl through to POST /api/diagnostic body unchanged

- diagnostic route: reads body.business.websiteUrl and passes to fetchPageSpeedLayer()

## **6.2 — Layer 3: PageSpeed Insights API (Live)**

Layer 3 site performance has been replaced with a live PageSpeed Insights API call in app/api/diagnostic/route.js. The PSI API is free and requires no API key for basic usage (25 requests/day free tier). The call runs server-side — no key is exposed to the browser.

**Environment variable**

| *No new environment variable required for basic usage. PageSpeed Insights runs keyless at 25 requests/day. If higher quota is needed, obtain a free Google API key (no billing required for PSI), enable the PageSpeed Insights API in Google Cloud Console, and append **&**key=YOUR_KEY to the PSI URL in fetchPageSpeedLayer() in diagnostic-route.js.* |
| --- |

**API call details**

| **Field** | **Value** |
| --- | --- |
| Endpoint | https://www.googleapis.com/pagespeedonline/v5/runPagespeed |
| Strategy | mobile (primary — dominant local SEO signal) |
| Categories | performance, accessibility, best-practices, seo |
| Cache | Next.js revalidate: 3600 (1 hour) — PSI results are stable intraday |
| Timeout | 15 seconds — AbortController. Falls back to mock on timeout. |
| Key required | No — keyless for up to 25 req/day. Append &key=YOUR_KEY for higher quota. |

**Signals now live vs still mocked**

| **Signal** | **Status** | **Source field** |
| --- | --- | --- |
| performanceScore | LIVE | categories.performance.score × 100 |
| accessibilityScore | LIVE | categories.accessibility.score × 100 |
| bestPracticesScore | LIVE | categories['best-practices'].score × 100 |
| seoScore | LIVE | categories.seo.score × 100 |
| lcp (ms) | LIVE | audits['largest-contentful-paint'].numericValue |
| fid (ms) | LIVE | audits['max-potential-fid'].numericValue |
| cls (score) | LIVE | audits['cumulative-layout-shift'].numericValue |
| ttfb (ms) | LIVE | audits['server-response-time'].numericValue |
| tbt (ms) | LIVE | audits['total-blocking-time'].numericValue |
| si (ms) | LIVE | audits['speed-index'].numericValue |
| mobileFriendly | LIVE | audits['viewport'].score === 1 |

**Fallback conditions**

Layer 3 falls back to mock Lighthouse scores silently under any of these conditions:

- websiteUrl is null or blank — no URL provided in intake form

- URL fails validation (invalid protocol, malformed)

- PSI API returns a non-200 HTTP status

- PSI API returns 200 but all scores are null

- Request times out after 15 seconds

- Any network error

Mock values represent a typical underperforming trades site: performance 52, accessibility 71, best-practices 67, SEO 61, LCP 4800ms, CLS 0.18, mobileFriendly false. Diagnostic always completes. Error or warning logged to console only.

**Source metadata**

- results.meta._pageSpeedSource — 'live' or 'mock'. Indicates whether Layer 3 ran against PSI or fell back.

- results.meta._websiteUrl — the URL passed to PSI, or null. Useful for confirming the correct site was analysed.

**Parallel execution**

Layer 1 (GBP) and Layer 3 (PageSpeed) are fetched concurrently using Promise.all(). This keeps total diagnostic time well under 90 seconds even when both live APIs are active. Neither call blocks the other.

## **6.3 — Layer 2: Rank / Local Pack — API Selection and Plan**

Layer 2 is not wired this session. The following decision was made on API selection. No code changes.

**API decision: ValueSERP**

| **Factor** | **ValueSERP** | **BrightLocal** |
| --- | --- | --- |
| Pricing | Pay-per-call (~$0.001–0.003/call). No monthly minimum. | Monthly subscription. Higher cost at low volume. |
| Local Pack data | Returns local pack positions, map results, and organic ranks in one call. | Strong local rank data but heavier integration. |
| Setup | Single API key. REST call. No OAuth. | API key. More complex account setup. |
| Speed | Fast — single SERP call. | Moderate. |
| Decision | ✓ Selected for Session 13 | Deferred — revisit at scale if needed |

**What Layer 2 will return when live**

- localPackRank — position in Google local pack (1–3, or null if not in pack)

- organicRank — organic search position for primary trade keyword + city

- isInLocalPack — boolean

- citationCount — number of directory citations detected

- napConsistency —  0–1 score for Name / Address / Phone consistency across citations

**Environment variable required (Session 13)**

| *Add to .env.local when wiring Layer 2: VALUESERP_API_KEY=your_key_here Obtain from valueserp.com. No monthly minimum — pay per call.* |
| --- |

## **6.4 — GMB API OAuth Plan for gbpPostCount**

gbpPostCount remains mocked at 2 this session. The Google My Business API requires OAuth 2.0 — a separate auth flow from the Places API used in Layer 1. The following plan was agreed for a future session.

**Why it requires OAuth**

The Google My Business API (now Google Business Profile API) requires OAuth 2.0 with a user-granted access token. Unlike the Places API which uses a simple API key, the GMB API requires the business owner to grant ClearSky permission to read their profile data. This is a one-time consent flow per client.

**Planned OAuth flow**

| **Step** | **What happens** |
| --- | --- |
| 1. ClearSky registers OAuth app | Google Cloud Console → OAuth 2.0 credentials → Web application. Authorised redirect URI: https://your-domain.com/api/auth/google/callback |
| 2. Client consent screen | During onboarding, the contractor clicks Connect Google Business Profile. They are redirected to Google's OAuth consent screen and grant ClearSky read access to their GBP. |
| 3. Token exchange | Google returns an auth code to the redirect URI. The backend exchanges it for access_token + refresh_token. Tokens stored securely server-side (never in browser). |
| 4. GMB API call | GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations/{locationId}/localPosts to fetch post count. |
| 5. Token refresh | Access tokens expire in 1 hour. Refresh token used to obtain new access token silently. Store refresh token encrypted at rest. |

| *gbpPostCount stays mocked at 2 until the OAuth flow is built. The diagnostic is unaffected — mock value is used silently. Wire in a future session after Layer 2 (ValueSERP) is live.* |
| --- |

## **6.5 — onCTA: Booking Destination Deferred Again**

The onCTA callback in app/page.jsx remains as the console.log stub. Booking destination URL not confirmed by Rory. No changes to page.jsx onCTA handler this session. Wire in a future session once URL is confirmed.

# **Section 7 — File Map (Session 12)**

| **File path** | **What it does** | **Session** | **Developer may touch?** |
| --- | --- | --- | --- |
| app/page.jsx | Hero + intake form + modal wiring. websiteUrl now passed through to diagnostic call. onCTA stub unchanged. | Session 12 | Yes — onCTA wire only |
| app/api/diagnostic/route.js | Runs engine. Layer 1 live (GBP). Layer 3 live (PageSpeed Insights). Layers 2, 4–12 mocked. Promise.all for parallel Layer 1 + 3 fetch. | Session 12 | Yes — swap mock layers |
| app/api/trades/route.js | Returns trade + season config. CMS fetch with hardcoded fallback. | Session 11 | Yes — update fallback if CMS shape changes |
| lib/clearsky-engine.js | Diagnostic engine. 179 tests. marketDemandLookup expanded Session 11. Never modify except lookup table. | Session 11 | No — lookup table patch only |
| lib/clearsky-engine.mjs | ESM shim. Unchanged. | Session 9 | No — never touch |
| components/ClearSkyIntakeForm.jsx | 3-screen intake form. websiteUrl field added to screen 1 (optional). | Session 12 | Minor styling only |
| components/ClearSkyResultsModal.jsx | Results modal. Final. Unchanged. | Session 8 | No — never touch |
| app/layout.jsx | Next.js root layout. Unchanged. | Session 9 | No — never touch |
| jsconfig.json | Path alias config. Unchanged. | Session 9 | No — never touch |
| next.config.mjs | Next.js config. Unchanged. | Session 9 | No — never touch |
| package.json | Dependencies. Unchanged. | Session 9 | No — never touch |

# **Section 8 — Environment Variables (Session 12)**

| **Variable** | **Required for** | **Notes** |
| --- | --- | --- |
| GOOGLE_PLACES_API_KEY | Layer 1 GBP live fetch | Google Cloud Console. Enable Places API. If not set, Layer 1 falls back to mock silently. |
| CLEARSKY_CMS_URL | /api/trades CMS fetch | Base URL of your CMS. If not set, hardcoded fallback is used. |
| CLEARSKY_CMS_KEY | /api/trades CMS fetch | API key sent as X-API-Key header. Omit if CMS endpoint is open. |
| PAGEINSIGHTS_KEY (optional) | Layer 3 PageSpeed higher quota | Not required for basic usage (25 req/day keyless). Add &key=YOUR_KEY to PSI URL in diagnostic-route.js if needed. Free key, no billing required. |
| VALUESERP_API_KEY (Session 13) | Layer 2 Rank / Local Pack | Not yet used. Obtain from valueserp.com. Add when Layer 2 is wired. |

# **Section 9 — Session 13 Agenda**

| **Item** | **Description** | **Priority** |
| --- | --- | --- |
| onCTA — booking destination | Wire onCTA callback in page.jsx once Rory confirms URL (Calendly, CRM, or internal booking page). | Primary — Session 13 |
| Layer 2 — Rank / Local Pack | Wire ValueSERP API. Replace mock localPackRank and organicRank with live SERP data. Requires VALUESERP_API_KEY in .env.local. | Session 13 |
| Layer 4 — Content (Firecrawl) | Replace mock page/blog/FAQ counts with live Firecrawl crawl of contractor site. | Future |
| GMB API OAuth — gbpPostCount | Build OAuth consent flow and GMB API call for live post count. Plan agreed in Session 12. | Session 13 or 14 |
| Remaining layers 5–12 | Wire one at a time: AI visibility, social, paid, engagement, conversion, growth, canonical. | Future — layer by layer |

ClearSky Software — Developer Implementation Notes — Version 1.7 — April 2026 — Confidential

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564