/**
 * ContentRadar — Gate 1 Quality Floor
 * 
 * Applied BEFORE any signal scoring. Eliminates businesses that don't
 * meet minimum quality thresholds. Flags potential franchises for
 * manual review rather than hard-eliminating them.
 *
 * All four thresholds locked — May 2026.
 *
 * Input: GBP data from Google Places API + website URL + years in business
 * Output: { pass: bool, flag: bool, reason: string, details: object }
 */

// ─── LOCKED CONSTANTS ─────────────────────────────────────────────────────────

const GATE1 = {
  // Minimum GBP star rating to qualify
  MIN_RATING: 4.2,

  // Minimum reviews = years in business × this multiplier
  // A 2yr contractor needs 8 reviews. A 10yr contractor needs 40.
  REVIEWS_PER_YEAR: 4,

  // Minimum number of reviews posted in the last N days
  RECENCY_WINDOW_DAYS: 180,        // 6 months
  RECENCY_MIN_REVIEWS: 1,          // at least 1 review in that window
  RECENCY_MIN_AVG_RATING: 3.0,     // that review (or avg if multiple) must be 3.0+ stars

  // Fallback minimum review count when years in business is unknown
  // Assumes 3 years minimum operating history
  MIN_REVIEWS_FALLBACK: 12,
};

// ─── FRANCHISE DETECTION PATTERNS ─────────────────────────────────────────────

const FRANCHISE_SIGNALS = {
  // Subdomain pattern — business URL is subdomain of a parent domain
  // e.g. timmins.rooterplumbing.com → flagged
  // e.g. timminsplumbing.com → not flagged
  SUBDOMAIN_REGEX: /^https?:\/\/[a-z0-9-]+\.[a-z0-9-]+\.[a-z]{2,}(\/|$)/i,

  // Known franchise domain patterns — hard-coded list of known franchisors
  // Expand this list as new franchises are identified
  KNOWN_FRANCHISE_DOMAINS: [
    'mr-rooter.com', 'mrrooter.com',
    'benjaminfranklinplumbing.com',
    'onehourheatandair.com',
    'mrelectric.com',
    'groundworks.com',
    'servicemaster.com',
    'servpro.com',
    'rotorouter.com', 'rotorooter.com',
    'centimark.com',
    'abc-home.com',
    'hiller.com',
    'forhomeowners.com',
  ],

  // Navigation location keywords — if nav contains 3+ of these
  // alongside the business name, flag as multi-location
  LOCATION_NAV_KEYWORDS: [
    'toronto', 'ottawa', 'vancouver', 'calgary', 'edmonton',
    'winnipeg', 'hamilton', 'london', 'kitchener', 'sudbury',
    'mississauga', 'brampton', 'markham', 'richmond hill',
    'minneapolis', 'buffalo', 'detroit', 'chicago',
    'locations', 'find a location', 'service areas', 'our locations',
    'select your city', 'find your city',
  ],
};

// ─── HELPER: extract domain from URL ──────────────────────────────────────────

function extractDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isSubdomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Count dots — a subdomain has 3+ parts (sub.domain.tld)
    const parts = hostname.split('.');
    if (parts.length < 3) return false;
    // Exclude www — that's not a meaningful subdomain
    if (parts[0] === 'www') return false;
    return true;
  } catch {
    return false;
  }
}

// ─── HELPER: count recent reviews ─────────────────────────────────────────────

function analyseRecentReviews(reviews, windowDays) {
  if (!reviews || !Array.isArray(reviews)) return { count: 0, avgRating: null };
  const cutoff = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
  const recent = reviews.filter(r => {
    // Google Places API returns time as Unix timestamp in seconds
    const ts = (r.time || r.timestamp || 0) * 1000;
    return ts >= cutoff;
  });
  const count = recent.length;
  const ratingsPresent = recent.filter(r => r.rating != null);
  const avgRating = ratingsPresent.length > 0
    ? ratingsPresent.reduce((sum, r) => sum + r.rating, 0) / ratingsPresent.length
    : null;
  return { count, avgRating, recent };
}

// ─── HELPER: detect location navigation ───────────────────────────────────────

function detectLocationNav(websiteText, navText) {
  const text = ((websiteText || '') + ' ' + (navText || '')).toLowerCase();
  const hits = FRANCHISE_SIGNALS.LOCATION_NAV_KEYWORDS.filter(kw => text.includes(kw));
  // Flag if 3 or more location keywords found — single location mentions are OK
  return hits.length >= 3 ? hits : null;
}

// ─── MAIN GATE 1 FUNCTION ─────────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {number} params.rating             - GBP star rating (e.g. 4.6)
 * @param {number} params.reviewCount        - Total GBP review count
 * @param {Array}  params.reviews            - Array of review objects with .time field
 * @param {number} params.yearsInBusiness    - Years in operation (null if unknown)
 * @param {string} params.websiteUrl         - Full website URL
 * @param {string} params.websiteText        - Extracted homepage text (for nav detection)
 * @param {string} params.businessName       - Business name (for logging)
 *
 * @returns {Object} {
 *   pass: boolean,       - true = qualifies for scoring
 *   flag: boolean,       - true = pass but flag for human review (franchise signal)
 *   eliminated: boolean, - true = hard eliminated, do not score
 *   reason: string,      - primary reason for elimination or flag
 *   details: Object,     - full breakdown of all checks
 * }
 */
function runGate1(params) {
  const {
    rating,
    reviewCount,
    reviews = [],
    yearsInBusiness = null,
    websiteUrl = '',
    websiteText = '',
    businessName = '',
  } = params;

  const details = {
    rating: { value: rating, threshold: GATE1.MIN_RATING, pass: null },
    reviewCount: { value: reviewCount, threshold: null, pass: null },
    reviewRecency: { value: null, threshold: GATE1.RECENCY_MIN_REVIEWS, pass: null },
    franchiseSubdomain: { detected: false, url: websiteUrl },
    franchiseKnownDomain: { detected: false, domain: '' },
    franchiseLocationNav: { detected: false, keywords: [] },
  };

  const flags = [];
  const eliminations = [];

  // ── CHECK 1: GBP Rating ──────────────────────────────────────────────────
  details.rating.pass = (rating >= GATE1.MIN_RATING);
  if (!details.rating.pass) {
    eliminations.push(`GBP rating ${rating} is below minimum ${GATE1.MIN_RATING}`);
  }

  // ── CHECK 2: Review Count (tenure-adjusted) ──────────────────────────────
  const minReviews = yearsInBusiness
    ? Math.ceil(yearsInBusiness * GATE1.REVIEWS_PER_YEAR)
    : GATE1.MIN_REVIEWS_FALLBACK;

  details.reviewCount.threshold = minReviews;
  details.reviewCount.yearsInBusiness = yearsInBusiness;
  details.reviewCount.formula = yearsInBusiness
    ? `${yearsInBusiness} years × ${GATE1.REVIEWS_PER_YEAR} = ${minReviews}`
    : `Unknown tenure — fallback minimum ${GATE1.MIN_REVIEWS_FALLBACK}`;
  details.reviewCount.pass = (reviewCount >= minReviews);

  if (!details.reviewCount.pass) {
    eliminations.push(
      `Review count ${reviewCount} below tenure-adjusted minimum ${minReviews} ` +
      `(${details.reviewCount.formula})`
    );
  }

  // ── CHECK 3: Review Recency ───────────────────────────────────────────────
  const { count: recentCount, avgRating: recentAvgRating } = analyseRecentReviews(reviews, GATE1.RECENCY_WINDOW_DAYS);
  details.reviewRecency.value = recentCount;
  details.reviewRecency.avgRating = recentAvgRating;
  details.reviewRecency.windowDays = GATE1.RECENCY_WINDOW_DAYS;

  const recentCountPass = recentCount >= GATE1.RECENCY_MIN_REVIEWS;
  const recentRatingPass = recentAvgRating === null || recentAvgRating >= GATE1.RECENCY_MIN_AVG_RATING;
  details.reviewRecency.pass = recentCountPass && recentRatingPass;

  if (!recentCountPass) {
    eliminations.push(
      `Only ${recentCount} reviews in last ${GATE1.RECENCY_WINDOW_DAYS} days — ` +
      `minimum ${GATE1.RECENCY_MIN_REVIEWS} required`
    );
  } else if (!recentRatingPass) {
    eliminations.push(
      `Recent reviews average ${recentAvgRating.toFixed(1)} stars — ` +
      `minimum ${GATE1.RECENCY_MIN_AVG_RATING} required on reviews from last 6 months`
    );
  }

  // ── CHECK 4: Franchise — Subdomain ────────────────────────────────────────
  if (isSubdomain(websiteUrl)) {
    const domain = extractDomain(websiteUrl);
    details.franchiseSubdomain.detected = true;
    details.franchiseSubdomain.subdomain = domain;
    flags.push(`Website is a subdomain: ${domain} — possible franchise or multi-location`);
  }

  // ── CHECK 5: Franchise — Known Domain ────────────────────────────────────
  const domain = extractDomain(websiteUrl);
  const knownFranchise = FRANCHISE_SIGNALS.KNOWN_FRANCHISE_DOMAINS.find(
    fd => domain.includes(fd)
  );
  if (knownFranchise) {
    details.franchiseKnownDomain.detected = true;
    details.franchiseKnownDomain.domain = knownFranchise;
    flags.push(`Known franchise domain detected: ${knownFranchise}`);
  }

  // ── CHECK 6: Franchise — Location Navigation ──────────────────────────────
  const locationHits = detectLocationNav(websiteText, '');
  if (locationHits) {
    details.franchiseLocationNav.detected = true;
    details.franchiseLocationNav.keywords = locationHits;
    flags.push(`Multi-location navigation detected: ${locationHits.slice(0, 3).join(', ')}`);
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  const eliminated = eliminations.length > 0;
  const flagged = !eliminated && flags.length > 0;

  return {
    businessName,
    pass: !eliminated,
    flag: flagged,
    eliminated,
    reason: eliminated
      ? eliminations[0]                      // Primary elimination reason
      : flagged
        ? flags[0]                           // Primary flag reason
        : 'Passed all Gate 1 thresholds',
    eliminations,                            // All elimination reasons
    flags,                                   // All flag reasons
    details,                                 // Full breakdown
    constants: GATE1,                        // Constants used — for audit trail
  };
}

// ─── BATCH RUNNER ─────────────────────────────────────────────────────────────

/**
 * Run Gate 1 against an array of businesses.
 * Returns summary stats plus categorised results.
 */
function runGate1Batch(businesses) {
  const results = businesses.map(b => ({ ...b, gate1: runGate1(b) }));

  const passed    = results.filter(r => r.gate1.pass && !r.gate1.flag);
  const flagged   = results.filter(r => r.gate1.pass && r.gate1.flag);
  const eliminated = results.filter(r => r.gate1.eliminated);

  const eliminationReasons = {};
  eliminated.forEach(r => {
    r.gate1.eliminations.forEach(reason => {
      const key = reason.split(' ')[0] + ' ' + reason.split(' ')[1];
      eliminationReasons[key] = (eliminationReasons[key] || 0) + 1;
    });
  });

  return {
    total: results.length,
    passed: passed.length,
    flagged: flagged.length,
    eliminated: eliminated.length,
    passRate: ((passed.length + flagged.length) / results.length * 100).toFixed(1) + '%',
    eliminationReasons,
    results,
    passedBusinesses: passed,
    flaggedBusinesses: flagged,
    eliminatedBusinesses: eliminated,
  };
}

module.exports = { runGate1, runGate1Batch, GATE1, FRANCHISE_SIGNALS };


// ─── TEST ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const now = Math.floor(Date.now()/1000);
  const daysAgo = d => now - (d * 86400);

  const testCases = [
    {
      businessName: "Timmins Best Plumbing — should PASS",
      rating: 4.8, reviewCount: 64, yearsInBusiness: 12,
      websiteUrl: "https://timminsbestplumbing.com",
      reviews: [
        { time: daysAgo(30), rating: 5 },
        { time: daysAgo(90), rating: 5 },
        { time: daysAgo(150), rating: 4 },
      ],
    },
    {
      businessName: "Budget Drain Co — should ELIMINATE (low rating)",
      rating: 3.9, reviewCount: 8, yearsInBusiness: 5,
      websiteUrl: "https://budgetdrain.com",
      reviews: [{ time: daysAgo(200), rating: 2 }],
    },
    {
      businessName: "Ghost Town Roofing — should ELIMINATE (no recent reviews)",
      rating: 4.5, reviewCount: 40, yearsInBusiness: 10,
      websiteUrl: "https://ghosttownroofing.com",
      reviews: [{ time: daysAgo(220), rating: 4 }],  // last review 7+ months ago
    },
    {
      businessName: "Tanking Fast Electric — should ELIMINATE (recent review rating too low)",
      rating: 4.3, reviewCount: 45, yearsInBusiness: 8,
      websiteUrl: "https://tankingfast.com",
      reviews: [
        { time: daysAgo(20), rating: 1 },   // only recent review is 1 star
        { time: daysAgo(300), rating: 5 },
        { time: daysAgo(400), rating: 5 },
      ],
    },
    {
      businessName: "Roto-Rooter Timmins — should FLAG (subdomain)",
      rating: 4.5, reviewCount: 90, yearsInBusiness: 8,
      websiteUrl: "https://timmins.rotorooter.com",
      reviews: [
        { time: daysAgo(20), rating: 5 },
        { time: daysAgo(60), rating: 4 },
      ],
    },
    {
      businessName: "Northern HVAC — should ELIMINATE (low review count) + FLAG (location nav)",
      rating: 4.3, reviewCount: 15, yearsInBusiness: 6,
      websiteUrl: "https://northernhvac.ca",
      websiteText: "serving toronto ottawa sudbury timmins find your location select your city",
      reviews: [{ time: daysAgo(10), rating: 5 }],
    },
    {
      businessName: "New Sparks Electric — should ELIMINATE (low review count, unknown tenure)",
      rating: 4.6, reviewCount: 5, yearsInBusiness: null,
      websiteUrl: "https://newsparkselectric.com",
      reviews: [{ time: daysAgo(15), rating: 5 }],
    },
  ];

  console.log('\n─── Gate 1 Test Results ───\n');
  testCases.forEach(tc => {
    const r = runGate1(tc);
    const status = r.eliminated ? '✗ ELIMINATED' : r.flag ? '⚑ FLAGGED' : '✓ PASSED';
    console.log(`${status.padEnd(16)} ${tc.businessName}`);
    console.log(`               ${r.reason}`);
    const rc = r.details.reviewCount;
    if (rc.formula) console.log(`               Reviews: ${tc.reviewCount} / required ${rc.threshold} (${rc.formula})`);
    const rr = r.details.reviewRecency;
    if (rr.avgRating !== null && rr.avgRating !== undefined) {
      console.log(`               Recent avg rating: ${rr.avgRating.toFixed(1)} / required ${GATE1.RECENCY_MIN_AVG_RATING} — count: ${rr.value}`);
    }
    console.log('');
  });

  const batch = runGate1Batch(testCases);
  console.log('─── Batch Summary ───');
  console.log(`Total: ${batch.total} | Passed: ${batch.passed} | Flagged: ${batch.flagged} | Eliminated: ${batch.eliminated} | Pass rate: ${batch.passRate}`);
}
