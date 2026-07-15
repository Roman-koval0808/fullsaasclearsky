**CLEARSKY SOFTWARE**

**MARKETING AUTOMATION SYSTEM**

*Complete Developer Requirements, Architecture **&** Implementation Reference*

Version 3.0  |  May 2026  |  Session 3 Handoff

Rory Dredhart  |  r.dredhart@clearskysoftware.net  |  705-274-9564

**CONFIDENTIAL — INTERNAL DEVELOPER REFERENCE**

# **1. Executive Overview**

ClearSky is a proprietary managed growth platform for Northern Ontario trades contractors, tourism operators, and manufacturers. It is not a website builder, a CRM, or a marketing tool. It is a complete managed growth infrastructure that a business owner rents access to — guaranteed to produce 20% revenue growth in six months or their money back.

This document is the definitive developer reference for every layer of the platform. It covers requirements, pseudocode, implementation strategies, data schemas, and wiring specifications drawn from all project sessions and the complete file set.

## **1.1  The Core Promise**

The contractor runs their trades business. ClearSky runs their growth. One rep manages 30 clients. Four hours per client per month. AI generates all content and responses. The rep reviews and approves. The contractor never logs in, configures anything, or manages any part of the platform.

## **1.2  The Locked Pipeline — Non-Negotiable**

This sequence is locked across all sessions, all clients, all verticals. Never rename. Never reorder.

Event  →  Signal  →  Orchestrator Decision  →  Action Queue + Parameters  →  Execution  →  Outcome  →  Feedback

## **1.3  System Layers**

| **Layer** | **Name** | **Responsibility** |
| --- | --- | --- |
| 1 | Network Layer | ClearSky connects, listens, and collects activity from all providers (GBP, phone, SMS, forms, email, ads, QR codes) |
| 2 | Intelligence Layer | Normalises, interprets, detects Signals, applies rules, decides what to do. Intent Reader + Orchestrator live here. |
| 3 | Execution Layer | Performs approved actions, tracks outcomes, feeds results back for learning. |

## **1.4  Three Proprietary Moats**

- The platform — production-proven on a mining portal. No competitor builds this from scratch in under two years.

- The Cohort 2 trajectory network — every licensed client contributes anonymised Engagement Score trajectory data. Every data point makes the Orchestrator's predictions more accurate. Cannot be bought. Has to be accumulated.

- The ML model — roofing trained, plumbing in development. Each trained vertical adds a new Visualizer use case. Every Visualizer session is training data.

## **1.5  The Prototype — Seven Build Sequence**

One contractor. One market. Timmins. Plumbing. Six years in business. Two licensed plumbers. RightFlush Plumbing. Real voice, real market.

- Pixel first

- Intent Reader second

- Visitor state in CMS third

- Variant library fourth

- Profile creation with two confidence dimensions fifth

- ContentRadar flag interface sixth

- Simplified Orchestrator and tool integrations seventh

# **2. Platform Infrastructure**

## **2.1  Foundation**

Built on a proprietary portal platform originally developed for a mining sector client. IP fully owned by ClearSky Software. No NDA, no non-compete. Production-proven at full complexity. The trades contractor vertical is the first commercial deployment.

## **2.2  Infrastructure Components**

| **Component** | **Specification** |
| --- | --- |
| Proprietary CMS | Container-based page composition. Semantic search. Faceted search. Microsite architecture with complete data isolation between clients. |
| Client management platform | Sits above all contractor deployments. Provisions new sites. Manages content isolation. Monitors performance across every client. Runs support workflow. Handles ContentRadar flags. Manages billing and guarantee tracking. NEW — nothing like it exists yet. |
| A2P system — Telnyx | Voice and SMS. Existing profile logic for new vs returning contacts. |
| Native mobile app | Rep multi-camera ViewRoom access. Back camera shows work while front camera shows face. A2P management on mobile. |
| DataForSEO | Keyword data, SERP rankings, watch market demand signals. |
| Scraper pipeline | Already built. Cron-scheduled + signal-triggered mode. When a ContentRadar flag fires the scraper runs immediately against relevant topic-tagged source URLs. |

## **2.3  Domain and Ownership Model**

- Each contractor gets a standalone website on their own domain. Not a subdomain.

- Contractor owns the domain and the content. ClearSky owns the platform infrastructure.

- When a contractor leaves: they take their domain and content. Platform stays with ClearSky.

- ClearSky operational apps (ViewRoom, A2P, mobile) run on ClearSky subdomain structure.

## **2.4  Template Model and window.PAGE Config**

Vertical-specific templates define the infrastructure: which pages exist, where dynamic sections live, which tools are present, how intent rules are structured. Visual design and personality are unique per contractor.

Two template files cover 12 pages via window.PAGE config:

- rightflush-service-pages.html — 5 pages via: window.PAGE = 'hot-water' | 'blocked-drains' | 'leak-detection' | 'gas-plumbing' | 'water-filtration'

- rightflush-market-pages.html — 7 market pages via: window.PAGE.id = 'timmins' | 'cochrane' | 'south-porcupine' | 'iroquois-falls' | 'kapuskasing' | 'matheson' | 'kirkland-lake'

Rule: Only ONE page block uncommented at a time. All others must be commented out.

## **2.5  Pseudocode — Site Provisioning**

async function provisionContractorSite(contractorData) {

  const { businessName, city, primaryTrade, domain } = contractorData;

 

  // Step 1 — Create client record

  const client = await db.clients.create({

    businessName, city, trade: primaryTrade, domain, status: 'provisioning'

  });

 

  // Step 2 — Load vertical template

  const template = await templates.load(primaryTrade); // 'plumbing' | 'hvac' | 'roofing'

 

  // Step 3 — Apply contractor identity

  const site = await template.instantiate({

    clientId: client.id,

    voice: contractorData.brandVoice,

    colors: contractorData.brandColors || template.defaultColors

  });

 

  // Step 4 — Load default intent rules for trade

  await intentRules.loadDefault(client.id, primaryTrade);

 

  // Step 5 — Provision pixel and hub profile

  const pixel = await pixelService.provision(client.id);

  await hub.createClientProfile(client.id);

 

  // Step 6 — Point domain to ClearSky servers

  await dns.point(domain, 'clearsky-servers');

 

  return { client, site, pixel };

}

# **3. The Intent Layer**

## **3.1  The Four Intent Buckets**

Evaluated in priority order. Bucket can only escalate — never downgrade within a session. First strong signal wins.

| **Bucket** | **Priority** | **Assignment Threshold** | **Override Behaviour** |
| --- | --- | --- | --- |
| Emergency | 1 | Any SINGLE Emergency signal | Always overrides all other buckets. No exceptions. |
| Active Project | 2 | TWO or more Active Project signals | Overrides Comparison and Research. |
| Comparison | 3 | TWO or more Comparison signals | Overrides Research only. |
| Research | 4 — default | Any informational content signal | Lowest priority. Default when insufficient signal. |

## **3.2  The ClearSky Pixel — Requirements**

**Added 2026-07-03 — the scoring is deterministic by design at launch, not by conviction.** Every delta value in §3.2.3/§3.4 (page_load, scroll, dwell) and every bucket-assignment threshold in §3.6 (e.g. "≥2 signals" for Active Project) is a fixed rule because there is no Cohort 2 conversion data yet to calibrate against — same reasoning already applied to the Orchestrator's rules-based decision table (§10 of `clearsky-master-architecture.md`, replaced by a predictive model as the network matures) and to the demotion/grace-period values in `ClearSky_Section5_Four_Intent_Buckets_Report__1_.md` §"starting points — calibrate against real Cohort 2 conversion data." These numbers are directionally sound, not empirically proven — once enough licensed clients accumulate enough conversion outcomes, the deltas and thresholds get recalibrated against what actually predicted a booked job, not what seemed reasonable at design time. The interface (Engagement Score, four buckets) stays the same; the numbers underneath it are expected to move.

- Fires on every significant behavioural signal across every page.

- Calculates Engagement Score (0–100 hard cap) in real time.

- Assigns and escalates intent bucket. Never downgrades within a session.

- POSTs state to ClearSky hub after every event via /hub/events endpoint.

- NOT connected to any third-party analytics (no GA, no GTM, no Meta Pixel for data).

- Session ID: _sessionId = crypto.randomUUID() — generated once per page load, stored in memory.

- DEMO ONLY: pixel toast element (.pixel-toast) — REMOVE from all 25 pages before production.

### **3.2.1  Pixel State Variables — Every Page**

// ─── PAGE-LEVEL STATE (declare at top of every page's script) ───────

let _score = 0;                              // Engagement Score, 0–100

let _bucket = 'unclassified';               // Current intent bucket

let _scrollDepth = 0;                        // Highest scroll % reached

let _dwellStart = Date.now();                // Session start timestamp

const _sessionId = crypto.randomUUID();      // UUID — unique per page load

const _bucketPriority = [                    // Priority order — index 0 = highest

  'emergency','active','comparison','research','unclassified'

];

let _d30=false, _d60=false, _d120=false;     // Dwell flags — fire once only

### **3.2.2  Core firePixel() Function**

function firePixel(event, label, delta, bucket) {

  // 1. Update Engagement Score (hard cap at 100, never decrements)

  _score = Math.min(_score + delta, 100);

 

  // 2. Bucket escalation only — never downgrade

  if (bucket && bucket !== 'unclassified') {

    const cur = _bucketPriority.indexOf(_bucket);

    const nxt = _bucketPriority.indexOf(bucket);

    if (cur === -1 || nxt < cur || _bucket === 'unclassified') {

      _bucket = bucket;

    }

  }

 

  // 3. POST to hub endpoint (PRODUCTION)

  // Replace console.log with this fetch before deployment:

  fetch('/hub/events', {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({

      event, label, delta, bucket,

      score: _score,

      sessionId: _sessionId,

      timestamp: Date.now(),

      page: window.location.pathname

    })

  });

 

  // DEMO ONLY — REMOVE IN PRODUCTION:

  // console.log('[ClearSky Pixel]', { event, score: _score, bucket: _bucket, delta });

}

### **3.2.3  Standard Events Wired on All 25 Pages**

// ─── SCROLL DEPTH ──────────────────────────────────────────────────

// Note: 75% and 90% always fire 'comparison' regardless of page type

window.addEventListener('scroll', () => {

  const doc = document.documentElement.scrollHeight - window.innerHeight;

  if (doc <= 0) return;

  const pct = Math.round((window.scrollY / doc) * 100);

  if (pct > _scrollDepth) {

    if (pct >= 25 && _scrollDepth < 25) firePixel('scroll_25','Scroll 25%', 3, PAGE_BUCKET);

    if (pct >= 50 && _scrollDepth < 50) firePixel('scroll_50','Scroll 50%', 5, PAGE_BUCKET);

    if (pct >= 75 && _scrollDepth < 75) firePixel('scroll_75','Scroll 75%', 7, 'comparison');

    if (pct >= 90 && _scrollDepth < 90) firePixel('scroll_90','Scroll 90%', 8, 'comparison');

    _scrollDepth = pct;

  }

});

 

// ─── DWELL TIME ─────────────────────────────────────────────────────

setInterval(() => {

  const s = Math.round((Date.now() - _dwellStart) / 1000);

  if (s >= 30  && !_d30)  { _d30=true;  firePixel('dwell_30', '30s dwell',  4, PAGE_BUCKET); }

  if (s >= 60  && !_d60)  { _d60=true;  firePixel('dwell_60', '60s dwell',  7, PAGE_BUCKET); }

  if (s >= 120 && !_d120) { _d120=true; firePixel('dwell_120','2min dwell', 8, PAGE_BUCKET); }

}, 1000);

 

// ─── SECTION VISIBILITY (IntersectionObserver) ──────────────────────

// HTML: <section data-pixel-event="scope_view" data-pixel-label="Scope section"

//                data-pixel-delta="5" data-pixel-bucket="active">

const _obs = new IntersectionObserver((entries) => {

  entries.forEach(entry => {

    if (entry.isIntersecting) {

      const el = entry.target;

      firePixel(

        el.dataset.pixelEvent,

        el.dataset.pixelLabel || el.dataset.pixelEvent,

        parseInt(el.dataset.pixelDelta || '0'),

        el.dataset.pixelBucket || PAGE_BUCKET

      );

      _obs.unobserve(el); // fires exactly once per element

    }

  });

}, { threshold: 0.3 });

document.querySelectorAll('[data-pixel-event]').forEach(el => _obs.observe(el));

 

// ─── NAV CTAs — wired on every page ─────────────────────────────────

document.getElementById('navEmergencyBtn')

  ?.addEventListener('click', () => firePixel('nav_emergency','Nav: Emergency',15,'emergency'));

document.getElementById('navBookBtn')

  ?.addEventListener('click', () => firePixel('nav_book','Nav: Book Now',10,'active'));

## **3.3  Emergency URL Rule**

// Emergency URL patterns — trigger Emergency bucket on page load

// Evaluated BEFORE any scroll or dwell — first thing that runs

const EMERGENCY_URL_PATTERNS = [

  '/emergency', '/burst-pipe', '/flood',

  '/no-hot-water', '/blocked-drain', '/leak', '/urgent'

];

 

function checkEmergencyUrlRule() {

  const path = window.location.pathname.toLowerCase();

  if (EMERGENCY_URL_PATTERNS.some(pattern => path.includes(pattern))) {

    firePixel('page_load', 'Emergency URL rule — session started', 20, 'emergency');

    return true; // Emergency bucket is now locked for this session

  }

  return false;

}

 

// Page load sequence — every emergency page:

document.addEventListener('DOMContentLoaded', () => {

  checkEmergencyUrlRule(); // FIRST — before any other init

  // ... rest of page init

});

## **3.4  Page-Level Pixel Configuration — All 25 Pages**

| **Page / URL** | **page_load delta** | **PAGE_BUCKET** | **Key Rules / Notes** |
| --- | --- | --- | --- |
| Homepage / | none | none | No bucket on load. All 4 in play. First signal wins. |
| About Us /about | +5 | comparison | Named Comparison bucket rule on load — visiting About = evaluating. |
| Contact/Quote /contact | +8 | active | Active Project on load — reaching this page demonstrates intent. |
| Emergency 24/7 /emergency | +20 | emergency | URL rule fires Emergency immediately. Locked. Lead Grabber = speak-now only. |
| Burst Pipe /burst-pipe | +20 | emergency | URL rule fires Emergency. scroll_25 = +20 emergency (not +3). |
| Hot Water /hot-water | +6 | active | FotoJobber present. Appointment form present. |
| Blocked Drains /blocked-drains | +6 | active | FotoJobber present. |
| Leak Detection /leak-detection | +4 | research | Research intent — investigating not acting. FotoJobber present. |
| Gas Plumbing /gas-plumbing | +6 | active | FotoJobber present. |
| Water Filtration /water-filtration | +4 | research | Research intent. FotoJobber NOT present. |
| Bathroom Renovations /bathroom-renos | +6 | active | Visualizer + ViewRoom both present. |
| Before & After /gallery | +5 | comparison | Gallery views = comparison signals. ViewRoom present. |
| Reviews /reviews | +4 | comparison | dwell_60 fires named 90s Comparison named rule. |
| Our Guarantee /our-guarantee | +4 | comparison | All sections fire comparison signals. |
| Blog /blog | +3 | research | 3x ContentRadar forms. dwell_120 = key research classification. |
| FAQ /faq | +4 | research | 1x ContentRadar form. scroll_75 escalates to comparison. |
| Service Areas /service-areas | +3 | research | Area chips = research. dwell_60 escalates to comparison. |
| Specials /specials | +6 | comparison | Critical transition page: Comparison → Active Project on booking submit (+20). |
| Timmins /timmins | +4 | comparison | Primary market. All services. |
| South Porcupine /south-porcupine | +4 | comparison | Within Timmins city limits — same response time. |
| Iroquois Falls /iroquois-falls | +4 | comparison | ~45 min drive. Comparison on load. |
| Cochrane /cochrane | +4 | comparison | ~80km north. Comparison on load. |
| Matheson /matheson | +4 | comparison | Comparison on load. |
| Kapuskasing /kapuskasing | +3 | research | 90-120 min ETA. Research on load — honest positioning. |
| Kirkland Lake /kirkland-lake | +3 | research | Research on load — honest ETA. |

## **3.5  Engagement Score → Form Length Adaptation**

| **Score Range** | **Form Presented** | **Rationale** |
| --- | --- | --- |
| 0 – 30 | Full form — all fields | Early stage. Need full context to qualify and serve the lead. |
| 31 – 60 | Remove optional fields only | Warming up. Reduce friction. Required fields only. |
| 61 – 80 | Name and phone only | High engagement. Minimum barrier to contact. |
| 81 – 100 | Phone only — one field | Maximum intent. One tap to connect. Do not delay. |

## **3.6  Dynamic Bucket Assignment — Rules Config (Plumbing Default)**

Evaluated in priority order. First rule that fires wins. Dynamic reassignment fires mid-session when behaviour changes.

// EMERGENCY — highest priority, evaluated first

function isEmergencyBucket(session) {

  return (

    EMERGENCY_URL_PATTERNS.some(p => session.currentUrl.includes(p)) ||

    (session.device === 'mobile' && session.scrollDepth > 60 && session.timeOnPage < 30) ||

    (session.ctaType === 'call_now' && session.timeOnPage < 60) ||

    session.searchQuery?.match(/emergency|urgent|right now|today|24 hour|same day/i)

  );

}

 

// ACTIVE PROJECT — evaluated second

function isActiveProjectBucket(session) {

  const signals = [

    session.visitedPricingPage,

    session.quoteFormStarted,

    session.clickedEstimateOrBookCTA,

    (session.visitedServicePage && session.visitedHomepage),

    (session.sessionCount >= 2 && session.priorSessionHadCTAOrFormStart)

  ];

  return signals.filter(Boolean).length >= 2; // two or more signals required

}

 

// COMPARISON — evaluated third

function isComparisonBucket(session) {

  const signals = [

    session.visitedReviewsOrAboutPage,

    session.visitedGallery,

    (session.reviewsPageDwellSeconds > 90),

    (session.sessionCount >= 2 && !session.priorFormOrCTA),

    session.searchQuery?.match(/vs|near me|best plumber/i)

  ];

  return signals.filter(Boolean).length >= 2;

}

 

// RESEARCH — default, evaluated last

function isResearchBucket(session) {

  return (

    session.visitedBlogOrFaqPage ||

    (session.singlePageDwellSeconds > 120 && !session.hadCTAInteraction) ||

    (session.pagesViewed >= 3 && !session.ctaClick && !session.formInteraction)

  );

}

# **4. The Identity Layer**

## **4.1  Two Confidence Dimensions — Never Combined**

| **Dimension** | **Question** | **Resolved At** | **On Failure** |
| --- | --- | --- | --- |
| Confidence 1 — Event Validity | Did this event actually occur? (not spam, bot, duplicate) | Layer 1 — before anything else | Drop and log. Not recoverable. |
| Confidence 2 — Attribution | Does this event belong to a specific person? | Layer 2 — after validity passes | Produces a Tier assignment (1, 2, 2B, or 3). |

## **4.2  Four Identification Tiers**

**Locked 2026-07-02, floor corrected 2026-07-03.** Tier 2B is a real rung, not a Tier-2 sub-case — the line between 2B and 3 is engagement depth, not identifier presence. Neither has an identifier; 2B has proven itself a real, engaged individual, Tier 3 hasn't proven anything either way. **The floor separating them is 10 seconds on-site, not dwell_30 or dwell_60** — those are richer engagement milestones a 2B record accumulates afterward (multi-page browsing, video watched, dwell_60+), not the creation threshold itself. Below 10 seconds, or a bot, nothing gets created at all — not even a cookie.

| **Tier** | **Attribution Confidence** | **Profile Action** | **Actions Permitted** |
| --- | --- | --- | --- |
| Tier 1 | High — strong identifier resolves cleanly (visible caller ID, email hash, device cookie, forwarded token). Resolves on first contact — no prior history required. | Full profile created or updated. Full pipeline active. | All actions permitted. All channels. |
| Tier 2 | Low — weak identifier present (a name, a partial form field, a display name on a review). | Profile created, status=pending. Reactivates when a stronger identifier appears. | Same-channel response ONLY. Cannot cross channels until Tier 1. |
| Tier 2B | Zero identifiers, but event validity + clearing the 10-second floor confirm a real, individual person (Stream A) — not a bot, not an instant bounce. Example: anonymous site visitor past 10 seconds with no form filled; blocked-caller-ID voicemail with no name given. | **Created immediately** on first qualifying visit — not deferred until conversion. See §4.5a for the exact sequence (validity check → 10s floor → DB lookup by fingerprint/cookie → create or attach). Cookie + fingerprint are its only identifying marks. Session stays live and trackable. Upgrades to Tier 2 (weak identifier appears) or Tier 1 (strong identifier appears) the moment one does. | No customer-facing action — there is no channel to reach them on. Log and wait. |
| Tier 3 | Doesn't clear the bar to be treated as a real, trackable individual. One undivided bucket — covers Stream B market data (never has an individual, by design), confirmed bot/spam (fails Confidence 1, never reaches attribution), and thin/instant-bounce Stream A (call drops immediately with no history, site visit bounces before the 10-second floor). No internal segmentation — treatment is identical regardless of which door it came through. | No profile, no cookie, no fingerprint stored. Routes to Context Store only. | No customer-facing action. Ever. No exceptions. |

## **4.3  The Same-Channel Response Rule**

A GBP review with Tier 2 attribution gets a response on GBP. It cannot trigger an SMS or voice response until identity upgrades to Tier 1. This is a non-negotiable boundary enforced in the Orchestrator before any action selection. Tier 2B has no channel to apply this rule to — by definition there is no identifier to reach them on, so the Orchestrator logs and holds until an identifier (weak → Tier 2, strong → Tier 1) appears.

function routeResponse(event, signal, profile) {

  if (profile.tier === 1) {

    // All actions permitted — full pipeline

    return signal.recommendedActions;

  }

  if (profile.tier === 2) {

    // Same-channel only — cannot cross to another channel

    return signal.recommendedActions.filter(action =>

      action.channel === event.sourceChannel

    );

  }

  if (profile.tier === 3) {

    // No customer-facing action — route to Context Store only

    contextStore.write(event);

    return [];

  }

}

## **4.4  SHA-256 Normalisation Convention — LOCKED 2026-07-02**

Closes the §12 integration-spec gap. This was never actually in dispute — `ClearSky_Developer_Session9_SvelteKit.md`, `ClearSky_Serhii_Developer_Brief.md`, and `clearsky-ma-hub-integration-spec.md` all independently stated the same rule; it just hadn't been written down as one canonical spec both sides build against. This section is that spec.

**The rule, in order, applied identically on frontend (before a hash ever leaves the browser) and hub backend:**

| Field | Normalise | Then |
| --- | --- | --- |
| Email | `email.toLowerCase().trim()` | SHA-256, output lowercase hex |
| Phone | Convert to E.164 — e.g. `"(705) 700-1234"` → `"+17057001234"` | SHA-256, output lowercase hex |

**Why this matters:** a normalization mismatch between frontend and hub produces two different hashes for the same real person, which the matcher will never reconcile — it silently creates a duplicate profile instead of stitching to the existing one. This is not a validation error that surfaces anywhere; it fails quietly in production. That's why every doc that mentions this convention flags it as "must be agreed in writing before contact forms go live" — this section is that agreement.

**Boundary:** raw email/phone never travels in a query string or unhashed payload between frontend and hub — only the SHA-256 hash. PII stays out of logs and URLs by construction. See `clearsky-ma-hub-integration-spec.md` `GET /hub/profiles/resolve?email=<sha256_hash>&phone=<sha256_hash>`.

**Not specified — flag before building, don't guess:** malformed/unparseable phone numbers (too short, non-North-American format), and whether a number with no country code defaults to +1 in all cases or only for recognizably North American area codes. The one worked example in this doc (§4.5 `toE164()`) only covers the happy path.

## **4.5a  The Anonymous Visit Sequence — Every Pageload, LOCKED 2026-07-03**

Runs before either path below, on every single visit, token or no token. This is the sequence that decides whether a record gets created at all, and closes a real gap — the previous version of this doc said an anonymous visitor's "Tier is unknown until conversion," which was wrong. A qualifying anonymous visitor is Tier 2B immediately, not held in an undefined state until they convert.

1. **Event validity check (Confidence 1).** Bot or spam pattern detected? Drop, log for audit, done. Nothing below this line runs.
2. **The 10-second floor.** Visitor leaves before 10 seconds on-site? No record gets created — not a cookie, not a fingerprint capture, nothing. This is the actual Tier 2B/Tier 3 boundary, not any of the dwell_30/dwell_60/dwell_120 engagement-scoring milestones — those measure engagement *quality* on an already-existing record, they don't gate whether a record exists.
3. **DB lookup, before creating anything new.** Once the 10-second floor is cleared, check for an existing match by fingerprint (and cookie, if one already exists) — has this device been seen before, under any anonymous or named record?
   - **Match found** → attach this visit to the existing record, whatever tier it's already at. Session history accumulates there.
   - **No match** → create a new record right now. Cookie + fingerprint are its only identifying marks. **Tier 2B**, immediately.

Everything from here follows the normal Tier 2B rules (§4.2): no customer-facing action, session stays live and trackable, upgrades to Tier 2 or Tier 1 the instant a stronger identifier appears — whether that's ten seconds later or three months and twenty pageviews later.

## **4.5  Two Paths to a Named Profile**

### **Path 1 — Forwarded Link (Known Hub Contact)**

// Hub sends email or SMS with signed JWT token in link URL:

// https://rightflush.ca/specials?cs_token=<signed_jwt>

 

// JWT payload (no PII in URL — only hub profile ID):

const jwtPayload = {

  sub: "hub_abc123",         // hub profile ID — NOT the person's name/email/phone

  cid: "clearsky_client_042",

  iat: 1744041600,

  exp: 1744128000,           // 24hr for SMS, 7 days for email

  purpose: "follow_up|quote_ready|appointment_reminder|seasonal",

  channel: "email|sms",

  campaignId: "camp_991"

};

 

// Pixel: check for cs_token BEFORE any other session logic

function initSession() {

  const params = new URLSearchParams(window.location.search);

  const token = params.get('cs_token');

 

  if (token) {

    // Validate with hub (async)

    validateForwardedLink(token).then(profile => {

      _hubProfileId = profile.id;

      _sessionTier = 1; // Named from first pageview — Tier 1 immediately

      // Stitching — LOCKED 2026-07-02, closes the §12 integration-spec gap.
      // This device may already carry an anonymousId cookie from prior
      // anonymous browsing (same device, different visit, no conversion yet).
      // "No pixel data is lost" is a locked promise for ANY identity-confirmation
      // method (ClearSky_Comprehensive_Platform_Report__1_.md), including this
      // one — Path 1 previously never honoured it. Runs async; does not block
      // page render or the Tier-1 state already set above.
      const priorAnonymousId = readCookie('anonymousId');

      if (priorAnonymousId) {

        hub.mergeProfile({

          profileId: profile.id,

          anonymousId: priorAnonymousId,

          sessionHistory: getStoredSessionHistory(priorAnonymousId)

          // contactDetails omitted — identity is already resolved via the
          // JWT `sub` claim, not a contact-hash match. POST /hub/profiles/merge
          // treats contactDetails as optional for this reason.

        });

      }

      // Anonymous ID retirement mirrors Component 5 step 5 of the hub
      // integration spec: cookie retired locally once merge is issued,
      // regardless of whether there was history to merge.
      clearCookie('anonymousId');

    });

    // Strip token from URL — never in browser history

    window.history.replaceState({}, '', window.location.pathname);

  }

  // If no token: run the Anonymous Visit Sequence (§4.5a) — validity check,
  // 10s floor, DB lookup by fingerprint/cookie, create-or-attach as Tier 2B.
  // Not "Tier unknown until conversion" — a qualifying visitor is Tier 2B
  // from the moment the record is created, well before any conversion.

}

### **Path 2 — Organic Conversion (Anonymous → Named)**

**Rewritten LOCKED 2026-07-02 — closes the §12 `POST /hub/profiles/merge` sanity-check gap.** The previous version of this pseudocode called four hub operations (`findProfile`, `stitch`, `createProfile`, `findPendingByContact`, `upgradeTier`) against an API contract (`clearsky-ma-hub-integration-spec.md` Component 4) that only ever defined two endpoints. It also passed `sessionId` — a fresh UUID generated every pageload, §3.2.1 — where the hub needed `anonymousId`, the persistent per-browser cookie; `sessionId` could never have found any prior history. Rewritten below against exactly the two endpoints that exist, with `GET /hub/profiles/resolve` extended to return `tier`/`status` and `POST /hub/profiles/merge` extended to create-or-merge-or-upgrade depending on what resolve found. See Component 4/5 of the hub integration spec for the endpoint side of this.

async function handleFormConversion(formData) {

  const { name, phone, email } = formData;

 

  // 1. Normalise (SHA-256 for matching — must match hub team convention exactly, §4.4)

  const normEmail = email?.toLowerCase().trim();

  const normPhone = toE164(phone); // "(705) 700-1234" → "+17057001234"

 

  // 2. One resolve call answers three questions at once: no match / full Tier-1 match / pending Tier-2 match

  const match = await hub.resolveProfile({ email: normEmail, phone: normPhone });

  // match = { profileId, isNew, tier, status } — tier/status absent when isNew is true

 

  // 3. One merge call handles all three outcomes:
  //    - match.isNew            → profileId: null tells the hub to create a new Tier-1 profile
  //    - match.tier === 1       → merges session history into the existing profile, tier unchanged
  //    - match.tier === 2, status: 'pending' → same merge call promotes the profile to Tier 1 —
  //      merging real contact-hash data into a pending profile IS what earns the upgrade,
  //      no separate upgrade call needed

  await hub.mergeProfile({

    profileId: match.isNew ? null : match.profileId,

    anonymousId: _anonymousId,               // persistent cookie — NOT _sessionId

    sessionHistory: _sessionHistory,

    conversionEvent: currentEvent,

    contactDetails: { emailHash: normEmail, phoneHash: normPhone, nameProvided: name }

  });

}

## **4.6  Session State Expiry**

| **Intent Bucket** | **Expiry** | **Rationale** |
| --- | --- | --- |
| Emergency | 14 days | May patch temporarily while still shopping. Two weeks catches the tail. |
| Comparison | 60 days | Evaluating actively. Decisions resolve relatively fast at this stage. |
| Active Project | 90 days | Full quote and decision cycle. Covers multiple return visits. |
| Research | 180 days | Slow movers. October furnace researcher is a warm prospect the following September. |

## **4.7  Device Fingerprint Matching — Confidence Policy LOCKED 2026-07-02, Technique OPEN**

Consolidates policy already stated independently in `ClearSky_Comprehensive_Platform_Report__1_.md` and `ClearSky_Serhii_Developer_Brief.md` into the identity spine. **The confidence numbers below are locked. The technique that generates the fingerprint is not decided — flagged below, don't guess it.**

| Scenario | Confidence | Tier outcome | Stitching behaviour |
| --- | --- | --- | --- |
| Same-device re-match — cookie cleared, same browser/device reopens | 90–96%, High | Tier 1 eligible (device match is a listed Tier 1 identifier, §4.2) | Retroactive stitch of all anonymous-session events to the profile. No pixel data lost. |
| Cross-device match — different physical device (e.g. iOS Safari → Desktop Chrome) | Hard capped below 70% — never claim high confidence | Not sufficient alone for Tier 1, at any accumulation of corroborating weak signals. Candidate only. | No auto-stitch. Held as an unverified candidate until an actual conversion event (matching contact hash, forwarded token) occurs on that device. |
| IP co-occurrence — same household/network, no cookie or FP match | 62%, candidate only | Never triggers a Tier assignment on its own | Never auto-stitches, never transfers history. Conversion data is the only arbiter — a real conversion event on that device is required before any merge. |

**Why the cross-device cap is non-negotiable:** this is the concrete mechanism behind CLAUDE.md's "honest signals" rule — never overclaim cross-device identity. A cross-device fingerprint match cannot promote itself to Tier 1 no matter how much corroborating signal piles up; only an actual conversion event can do that.

**Open — flag before building, do not guess:**
- Fingerprint generation technique/library. No doc names one (FingerprintJS Pro/OSS, custom canvas+WebGL+audio hash, or otherwise) and no implementation exists anywhere in `reference-code/`.
- Where same-device-vs-cross-device is actually computed — client-side heuristic at pixel level, or hub-side comparison against stored fingerprints. Undefined.
- No `/hub/fingerprint/...` endpoint exists yet, unlike `/hub/profiles/resolve` and `/hub/validate-token` (§5.3).
- No fingerprint field exists in the pixel state variables (§3.2.1) — needs to be added once a technique is chosen.

# **5. The Storage Layer**

## **5.1  Two Storage Systems**

| **System** | **What It Stores** | **Who Writes** | **Who Reads** |
| --- | --- | --- | --- |
| Communication Hub | Visitor profiles, session history, conversion events, Tier 1/2 records. Master record system. | Pixel (/hub/events), A2P, email, phone, forms, GBP | Orchestrator, Intent Reader, Marketing Execution Engine, Rep dashboard |
| Context Store | Market intelligence, watch market keyword demand, SERP data, competitor signals, aggregate analytics, Tier 3 events. | Stream B providers (Matomo, DataForSEO, ContentRadar) | Intent Reader enrichment only. Never connected to profiles or customer-facing actions. |

## **5.2  Hub Event Schema — Every Pixel POST**

// Every pixel event sent to /hub/events uses this exact schema:

{

  "event":                 "clearsky.website.activity",

  "version":               "1.0",

  "timestamp":             "2026-05-19T14:23:11Z",    // ISO 8601

  "anonymousId":           "cs_7f3a9b2c1d4e",          // null after forwarded link

  "hubProfileId":          "hub_abc123",                // null before conversion (organic)

  "sessionId":             "sess_9d2f1a",

  "clientId":              "clearsky_client_042",

  "eventType":             "page_view|cta_click|form_start|form_complete|call_click|booking",

  "intentBucket":          "emergency|active_project|comparison|research|unclassified",

  "sessionDepth":          3,                           // pages viewed this session

  "sessionDuration":       142,                         // seconds so far

  "pageUrl":               "https://rightflush.ca/emergency",

  "pageType":              "service|emergency|contact|review|home|content|market",

  "engagementScore":       67,

  "engagementThresholdMet": true,

  "pixelEventFired":       true,

  "sessionCount":          2,                           // cumulative sessions from device

  "isForwardedLink":       false,

  "forwardedLinkToken":    null,

  "conversionMoment":      false,

  "conversionType":        null  // form_complete|call_click|quote_request|booking|email_capture

}

## **5.3  Hub API — Three Endpoints**

// ENDPOINT 1 — Website activity events (pixel)

POST /hub/events

Body: { ...hubEventSchema }

Response: 200 OK | 422 Unprocessable

 

// ENDPOINT 2 — ContentRadar question queue

// CRITICAL: Blog and FAQ forms POST HERE — not to /hub/events

POST /hub/contentradar/queue

Body: {

  "question_text": "How do I prevent frozen pipes in winter?",

  "source_page":   "/blog",

  "source_form":   "hero|per_post|sidebar|still_have_question",

  "timestamp":     "2026-05-19T14:23:11Z",

  "session_id":    "sess_9d2f1a"

}

Response: 200 OK | flag_fired (if 5+ same-topic in 48hr window)

 

// ENDPOINT 3 — Forwarded link token validation

GET /hub/validate-token?cs_token=<jwt>

Response: { "valid": true, "profileId": "hub_abc123", "purpose": "follow_up" }

# **6. The Decision Layer — Orchestrator**

## **6.1  Orchestrator Boundaries**

| **The Orchestrator DOES** | **The Orchestrator DOES NOT** |
| --- | --- |
| Receive valid Signal candidates from Signal Detection | Receive raw provider data or create Events |
| Apply deterministic 11-step decision process | Invent Signals or guess at intent |
| Select dominant Signal, suppress related ones | Execute actions directly |
| Choose allowed actions from the Action Library | Post to any external channel automatically |
| Attach all required parameters | Make unilateral decisions without rules |
| Create a full auditable decision record | Change production rules automatically |
| Hand approved work to the Action Queue | Skip human approval for public-facing actions |

## **6.2  The 11-Step Decision Process**

- Receive valid Signal candidates (from Signal Detection)

- Check safety and compliance rules

- Check business configuration (hours, capacity, active services)

- Rank Signals by priority and impact

- Identify the dominant Signal

- Suppress or group related Signals

- Select recommended action from the Action Library

- Choose execution mode: Ignore | Automate | Approve | Escalate

- Resolve all required parameters

- Create auditable decision record

- Hand off to Action Queue

## **6.3  Attention Model — Four Execution Modes**

| **Mode** | **When Used** | **Human Required?** |
| --- | --- | --- |
| Ignore | Signal does not warrant a response. Research visitor, no engagement pattern. | No |
| Automate | Low-risk action with established quality baseline. Score updates, profile tags. | No — post-hoc review only |
| Approve | Customer-facing content. Review response, follow-up message. NEVER auto-posts. | Yes — rep approves before anything goes out |
| Escalate | High urgency, complaint, policy edge case. Manager judgment required. | Yes — manager, immediately |

## **6.4  Orchestrator Decision Record Schema**

// Every Orchestrator decision writes this record BEFORE any action executes

{

  "decision_id":              "dec_8001",

  "session_id":               "sess_9d2f1a",

  "client_id":                "clearsky_client_042",

  "timestamp":                "2026-05-19T14:23:11Z",

  "dominant_signal": {

    "signal_id":              "SIG-REV-001",

    "signal_name":            "positive_review_received",

    "signal_bucket":          "Momentum",

    "priority":               4

  },

  "suppressed_signals":       ["SIG-REV-003", "SIG-REV-004"],

  "selected_actions":         ["ACT-REV-001", "ACT-REV-004"],

  "blocked_actions": [

    { "action": "ACT-REV-002", "reason": "requires_manager_approval" }

  ],

  "execution_mode":           "approve",

  "parameters_resolved":      true,

  "safety_check_passed":      true,

  "business_config_check":    true,

  "handoff_status":           "ready_for_queue"

}

## **6.5  Non-Negotiable System Boundaries**

- Public replies require human approval before posting. No exceptions ever.

- Every decision is auditable and traceable back to the source Event.

- Blocked actions are preserved for audit — never silently discarded.

- Nothing posts automatically to any external channel.

- Tuning candidates are review-only. Production rules never change automatically.

- Record what IS — not what should be. Never invent approval or posting that did not occur.

# **7. Signal Detection**

## **7.1  Signal vs Event — The Critical Distinction**

| **Concept** | **What It Is** | **What It Is NOT** |
| --- | --- | --- |
| Event | ClearSky's cleaned, classified, matched, stored record of what happened. | Raw provider data. Not a Signal. Not an AI guess. |
| Signal | A structured, rule-matched indicator that something meaningful occurred. | A notification. Not an alert. Not an Action. |

## **7.2  Signal Buckets**

| **Signal Bucket** | **What It Means** | **Example Signals** |
| --- | --- | --- |
| Opportunity | Positive opening for action | New lead form submitted, FotoJobber quote received, Specials booking submitted |
| Risk | Potential harm to relationship or reputation | Negative review received, complaint detected in message, missed call pattern |
| Bottleneck | Process breakdown that needs fixing | Communication delay flagged, form abandonment pattern, unanswered GBP message |
| Performance | Metric change worth recording | Engagement Score threshold crossed, bucket upgraded from Research to Active |
| Competitive | Market positioning signal | Watch market keyword spike, competitor review pattern shift |
| Momentum | Positive trajectory worth amplifying | Positive review received, repeat visitor on 3rd session approaching booking |

## **7.3  Signal Detection — Step-by-Step Pseudocode**

// Signal Detection begins only after Event Intake is complete

// and handoff_eligible = true

 

async function detectSignals(event) {

  // Step 1 — Confirm Event is handoff_eligible (do not skip this check)

  if (!event.handoff_eligible) {

    throw new Error('Event not eligible for signal detection: ' + event.event_id);

  }

 

  // Step 2 — Load matching signal rules for this event_type + category

  const rules = await signalRules.findMatching({

    event_type: event.event_type,

    network_category: event.network_category,

    provider: event.provider

  });

 

  // Step 3 — Evaluate each rule against event data + AI-extracted context

  const candidates = [];

  for (const rule of rules) {

    const evaluation = evaluateRule(rule, event, event.aiContext);

    if (evaluation.passed) {

      candidates.push({

        signal_id:       rule.signal_id,

        signal_name:     rule.signal_name,

        signal_bucket:   rule.signal_bucket,

        priority:        rule.priority,

        confidence:      evaluation.confidence,

        possible_actions: rule.action_mappings

      });

    }

  }

 

  // Step 4 — Write result and return candidates (or no-signal record)

  if (candidates.length === 0) {

    await db.signalLog.create({

      event_id: event.event_id,

      result: 'no_signal_created',

      rules_evaluated: rules.length

    });

    return [];

  }

 

  return candidates; // passed to Orchestrator

}

# **8. ContentRadar**

## **8.1  What ContentRadar Is**

ContentRadar is the only ClearSky component no competitor can replicate. Every other part uses publicly available APIs (Google Places, Lighthouse, DataForSEO, Firecrawl). ContentRadar's demand-side intelligence cannot be bought, licensed, or scraped.

ContentRadar simultaneously: (1) drives client-facing content intelligence and publishing, (2) powers the diagnostic content gap calculation at Layer 4, and (3) provides the keyword library driving Blog, FAQs, AI SEO, and Local Ranking Tool across all modules.

## **8.2  The Core Mechanism — Sudbury as the Canary**

Sudbury is the primary watch market for Timmins. Same climate, housing stock, and trades economy — but sits 4 to 6 weeks ahead in search behaviour. When frozen pipe searches spike in Sudbury, Timmins follows in 4 to 6 weeks. ContentRadar catches the Sudbury signal and the contractor publishes before local demand arrives.

Secondary platform-level trigger: when a keyword in Sudbury exceeds 200% of its 90-day baseline, ContentRadar flags for the Timmins account. No site code required for this trigger.

## **8.3  Two Engines**

| **Engine** | **Name** | **Status** | **What It Produces** |
| --- | --- | --- | --- |
| 1 | Gap Scoring System | 90% built — wiring in progress | Content Gap % from 60 signals across 4 stages. Feeds ClearSky Layer 4 directly. |
| 2 | Watch Market Intelligence | Designed — data pipeline not yet built | Keyword demand signals 4-6 weeks ahead. Drives content calendar for licensed clients. |

## **8.4  Gap Scoring Architecture — Engine 1**

| **Stage** | **Signals** | **Max Points** | **% of Total** | **Focus** |
| --- | --- | --- | --- | --- |
| Discovery | 15 | 45 pts | 25.0% | Getting found — search, GBP, digital footprint |
| Engagement | 18 | 54 pts | 30.0% | Holding attention — content depth, social, reviews |
| Conversion | 15 | 45 pts | 25.0% | Turning visitors into booked jobs — CTAs, friction, trust |
| Growth | 12 | 36 pts | 20.0% | Building long-term equity — AI authority, referrals, SOV |
| TOTAL | 60 | 180 pts | 100% | Content Gap % = Score / 180 |

## **8.5  On-Site ContentRadar Sources — RightFlush**

| **Form** | **Page** | **Location** | **Pixel Event** |
| --- | --- | --- | --- |
| Blog hero question form | /blog | Top of page, right column | blog_question_submit — +12 research |
| Blog per-post question form | /blog (post view) | Bottom of each expanded post | post_question_submit — +12 research |
| Blog sidebar question form | /blog | Sticky right sidebar | sidebar_question_submit — +10 research |
| FAQ still-have-a-question | /faq | Right sidebar | faq_question_submit — +10 research |

## **8.6  ContentRadar Queue — Implementation**

// ALL four forms POST to /hub/contentradar/queue

// NOT to /hub/events — different endpoint, different queue

 

async function submitToContentRadar(questionData) {

  const payload = {

    question_text: questionData.text,

    source_page:   window.location.pathname,   // '/blog' or '/faq'

    source_form:   questionData.formId,        // 'hero'|'per_post'|'sidebar'|'still_have_question'

    timestamp:     new Date().toISOString(),

    session_id:    _sessionId

  };

 

  await fetch('/hub/contentradar/queue', {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(payload)

  });

 

  // Also fire pixel event for Engagement Score

  firePixel('blog_question_submit', 'Blog question submitted', 12, 'research');

}

 

// Server-side: evaluate flag condition on every queue write

async function evaluateContentRadarFlag(question) {

  const topic = await nlp.extractTopic(question.question_text);

 

  // Flag fires when 5+ questions on same topic arrive within 48 hours

  const count = await db.contentRadarQueue.count({

    where: {

      client_id: question.client_id,

      topic: topic,

      timestamp: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }

    }

  });

 

  if (count >= 5) {

    await contentRadarFlags.create({

      client_id:     question.client_id,

      topic,

      trigger_count: count,

      flag_type:     'question_volume_spike',

      status:        'pending_rep_review'

    });

    // Also check watch market trigger:

    // When Sudbury keyword exceeds 200% of 90-day baseline → flag fires automatically

  }

}

# **9. Conversion Tool Inventory ****&**** Placement**

## **9.1  Tool Placement — All 25 Pages**

| **Page** | **AI Chat** | **Lead Grabber** | **FotoJobber** | **Appointments** | **Special Tools** |
| --- | --- | --- | --- | --- | --- |
| Homepage | ✔ | Both | ✔ | ✔ | ViewRoom, Visualizer (disabled) |
| Emergency 24/7 | ✔ | SPEAK-NOW only | ✗ absent | ✗ | — |
| Burst Pipe | ✔ | SPEAK-NOW only | ✗ absent | ✗ | — |
| Bathroom Renovations | ✔ | Both | ✔ | ✔ | Visualizer ✔ │ ViewRoom ✔ |
| Contact / Quote | ✔ | Both | ✔ | ✔ | — |
| Before & After Gallery | ✔ | Both | ✗ | ✔ | ViewRoom ✔ |
| Hot Water | ✔ | Both | ✔ | ✔ | — |
| Blocked Drains | ✔ | Both | ✔ | ✔ | — |
| Leak Detection | ✔ | Both | ✔ | ✔ | — |
| Gas Plumbing | ✔ | Both | ✔ | ✔ | — |
| Water Filtration | ✔ | Both | ✗ absent | ✔ | — |
| Reviews | ✔ | Both | ✗ | ✗ | — |
| Our Guarantee | ✔ | Both | ✗ | ✗ | — |
| Blog | ✔ | Both | ✗ | ✗ | ContentRadar ×3 |
| FAQ | ✔ | Both | ✗ | ✗ | ContentRadar ×1 |
| Service Areas | ✔ | Both | ✗ | ✗ | — |
| Specials | ✔ | Both | ✗ | ✔ | — |
| About Us | ✔ | Both | ✗ | ✗ | — |
| 7 Market Pages | ✔ | Both | ✗ | ✔ | — |

## **9.2  Tool Descriptions**

### **ViewRoom**

Virtual showroom. Multi-camera streaming. Rep uses mobile app to show back-camera work while face is still streamed. AI knowledge base answers questions from contractor CMS content. Appointment booking within the room. Name captured at entry = first attribution attempt. Every interaction feeds Engagement Score.

### **FotoJobber**

Annotated image quote submission. Homeowner photos, circles, notes — contractor gets a precise visual brief. One of the strongest Active Project signals. Annotation text read by AI for urgency and service type. Absent from emergency pages and Water Filtration by design decision.

### **Visualizer**

Generative product visualization. Homeowner uploads space photo, selects product options, sees rendered result. Currently using Google API for plumbing. Proprietary ML model trained on roofing; plumbing model in development. Photo upload is a significant personal commitment signal. Result save triggers attribution attempt. Bathroom Renovations only.

### **Lead Grabber**

Two modes: (1) AI widget — immediate response from knowledge base; (2) speak-now or email-me — human escalation. Emergency contacts escalated within 15 minutes regardless of time of day. Email mode suppressed on Emergency and Burst Pipe pages — speak-now only.

# **10. Developer Implementation Checklist**

## **10.1  Before Production — Required**

### **Pixel Wiring**

- Replace console.log in firePixel() with POST to /hub/events

- Add _sessionId = crypto.randomUUID() to every page

- Remove .pixel-toast element and toast logic from all 25 pages

- Verify score caps at 100 and never decrements

- Verify bucket escalation never downgrades within session

### **ContentRadar Routing**

- Blog hero question form → /hub/contentradar/queue (NOT /hub/events)

- Blog per-post question form → /hub/contentradar/queue

- Blog sidebar question form → /hub/contentradar/queue

- FAQ still-have-a-question → /hub/contentradar/queue

- Confirm payload: question_text, source_page, source_form, timestamp, session_id

### **Emergency URL Rules — Register with Hub**

- Register: /emergency, /burst-pipe, /flood, /no-hot-water, /blocked-drain, /leak, /urgent

- Confirm /burst-pipe fires Emergency bucket BEFORE any scroll (page_load +20)

### **Template Config (window.PAGE)**

- Market pages: exactly ONE block uncommented per deployment

- Kapuskasing and Kirkland Lake: pixel_bucket = 'research'

- All other 5 markets: pixel_bucket = 'comparison'

- Service pages: Leak Detection and Water Filtration: bucket = 'research'

- Water Filtration: confirm FotoJobber absent

## **10.2  QA Test Cases**

| **Test** | **Action** | **Expected Result** |
| --- | --- | --- |
| Emergency URL — burst-pipe | Navigate to /burst-pipe | Emergency bucket fires on page load. Score +20. Before any scroll. |
| Emergency URL — emergency | Navigate to /emergency | Emergency bucket fires on page load. Score +20. |
| Comparison — About load | Load /about | page_load fires comparison. Score +5. |
| Comparison — Reviews dwell | Load /reviews, wait 60s | dwell_60 fires comparison +8. Named rule confirmed. |
| Active transition — Specials | Load /specials, submit apt form | spl_apt_submit fires active +20. Bucket moves Comparison → Active. |
| Bucket never downgrades | Land /emergency, navigate /blog | Bucket stays emergency. Never reassigns to research. |
| Score cap | Fire events until score > 100 | Score stops at exactly 100. |
| Lead Grabber email suppressed | Open LG on /emergency | Email mode not visible. Speak-now only rendered. |
| FotoJobber absent | Visit /water-filtration | FotoJobber widget not present in DOM. |
| ContentRadar endpoint | Submit blog question | POST goes to /hub/contentradar/queue. Not to /hub/events. |
| Hub POST production | Fire any pixel event | POST to /hub/events with correct schema. No console.log. |
| Toast removed | Load any page in production | No .pixel-toast element in DOM. |

# **11. RightFlush Plumbing — Locked Contractor Profile**

Locked. Do not change without a new session decision.

| **Field** | **Value** |
| --- | --- |
| Business name | RightFlush Plumbing |
| Owner | James Dredhart |
| Business phone | (705) 700-1234 |
| Business email | info@rightflush.ca |
| Domain | rightflush.ca |
| ClearSky contact | Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564 |
| City | Timmins, Ontario |
| Established | 2018 — 6 years in business |
| Google rating | 4.7 stars · 64 verified reviews |
| Team | James Dredhart (owner/plumber), Kevin Walsh (licensed plumber), Sandra Kowalski (office/scheduling) |
| Certification | Ontario College of Trades 306A Journeyperson — both plumbers |
| Gas certification | TSSA certified — both plumbers |
| Emergency response Timmins | 15 minutes |
| Pricing model | Flat-rate — quoted before work starts |
| Service area | Timmins ON + Cochrane, South Porcupine, Iroquois Falls, Kapuskasing, Matheson, Kirkland Lake |
| Watch markets | Sudbury (primary), Sault Ste. Marie, Thunder Bay |

## **11.1  Design System — Locked**

| **Token** | **Hex** | **Usage** |
| --- | --- | --- |
| --green | #1B5E3B | Primary brand, CTAs, nav active states, icons |
| --green-mid | #2D7A52 | Hover states on green elements |
| --green-lt | #EBF5EF | Light green backgrounds, chip backgrounds |
| --rust | #C24A1E | Emergency ONLY — never used for non-emergency CTAs |
| --gold | #B8862A | Trust signals, star ratings, proof numbers, Specials page hero |
| --ink | #0D1F14 | Dark section backgrounds, hero backgrounds |
| --surface | #F8F6F1 | Alternate section background |
| --border | #E8E4DC | All borders |

## **11.2  Typography and Navigation — Locked**

- Headlines: Barlow Condensed Bold 700-900, all uppercase

- Body: Barlow Regular 300-500, sentence case

- Icons: Lucide library ONLY — no other icon sources

- NAVIGATION RULE: Emergency is NEVER inside a dropdown. Always a standalone, always visible, always rust red button in top-right nav. Applies to all 25 pages including mobile views. No exceptions.

# **12. Build Sequence — Next Verticals**

## **12.1  RightFlush Plumbing — Complete**

All 25 pages built. All pixel wiring documented. Developer integration checklist in Section 10. Site is ready for hub integration.

## **12.2  Deep Trout Lake Resort — Tourism Vertical (Next)**

No decisions made. Next build session starts from scratch for this client.

- Tourism vertical tool registry — different from Trades

- New intent rules for tourism buyer journey (not the plumbing rules config)

- Seasonal considerations — summer/winter split

- Different ContentRadar trigger topics

- Different watch markets

## **12.3  Spruce Lumber Mill — Manufacturing Vertical (After Tourism)**

No decisions made. Follows Deep Trout Lake Resort.

- B2B RFQ pipeline — different from consumer journey

- FotoJobber quality claims and spec matching

- Volume pricing integration

## **12.4  Support Model Summary**

| **Phase** | **Timeline** | **Rep Hours/Client/Month** | **Trigger to Advance** |
| --- | --- | --- | --- |
| 1 — Review everything | Launch through Month 4 | 3.5 – 4 hours | Launch condition. AI quality baseline not yet established. |
| 2 — Automation replaces review | Month 4 through Month 8 | 2 – 2.5 hours | 3 consecutive months with zero corrections on that task for that client. |
| 3 — Exception-based | Month 8+ | Average 2 hrs, range 1–6 | Platform identifies which clients need attention. Rep focuses there. |

ClearSky Software  |  Marketing Automation System  |  v3.0  |  May 2026  |  Confidential

Rory Dredhart  |  r.dredhart@clearskysoftware.net  |  705-274-9564

ClearSky Software — Confidential  |  Page