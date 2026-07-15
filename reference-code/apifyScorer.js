/**
 * ContentRadar — Apify Integration
 * server/scoring/apifyScorer.js
 *
 * Handles data collection from six platforms that block direct fetching:
 *   - Facebook        (signals 19–24)
 *   - Nextdoor        (signals 25–27)
 *   - HomeStars       (signal 28)
 *   - Houzz           (signal 29)
 *   - Angi            (signal 30)
 *   - BBB             (signal 35)
 *
 * Architecture:
 *   1. apifyFetch()       — runs an Apify actor and waits for results
 *   2. Platform parsers   — normalise raw Apify JSON into clean objects
 *   3. runApifyCollection()— runs all 6 platforms in parallel, returns
 *                           normalised data ready for Method 1/2 scorers
 *
 * Environment variables required:
 *   APIFY_API_TOKEN — set in .env
 *
 * Apify actors used (all maintained by Apify):
 *   facebook:   apify/facebook-pages-scraper
 *   nextdoor:   apify/nextdoor-scraper
 *   homestars:  apify/web-scraper (custom task — see ACTOR_CONFIG)
 *   houzz:      apify/web-scraper (custom task)
 *   angi:       apify/web-scraper (custom task)
 *   bbb:        apify/web-scraper (custom task)
 *
 * Cost estimate per contractor audit:
 *   Facebook:   ~$0.50–1.50 per page
 *   Nextdoor:   ~$0.30–0.80 per page
 *   HomeStars:  ~$0.20–0.50 per profile
 *   Houzz:      ~$0.20–0.50 per profile
 *   Angi:       ~$0.20–0.50 per profile
 *   BBB:        ~$0.10–0.30 per profile
 *   Total:      ~$1.50–4.10 per full platform audit
 *
 * Usage:
 *   const { runApifyCollection } = require('./apifyScorer');
 *   const platformData = await runApifyCollection(business);
 */

'use strict';

const fetch = require('node-fetch');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const APIFY_BASE    = 'https://api.apify.com/v2';
const POLL_INTERVAL = 3000;   // ms between status polls
const MAX_WAIT_MS   = 120000; // 2 minute max wait per actor run

// Apify actor IDs
const ACTORS = {
  facebook:  'apify/facebook-pages-scraper',
  nextdoor:  'apify/nextdoor-scraper',
  webScraper:'apify/web-scraper',  // Used for HomeStars, Houzz, Angi, BBB
};

// ─── APIFY API CALLER ─────────────────────────────────────────────────────────

/**
 * Start an Apify actor run and wait for it to complete.
 * Returns the dataset items or null on failure.
 *
 * @param {string} actorId   — e.g. 'apify/facebook-pages-scraper'
 * @param {Object} input     — actor input configuration
 * @param {number} maxWaitMs — timeout in milliseconds
 */
async function apifyFetch(actorId, input, maxWaitMs = MAX_WAIT_MS) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN not set in .env');

  // ── Start the actor run ────────────────────────────────────────────────────
  let startRes;
  try {
    startRes = await fetch(
      `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        timeout: 15000,
      }
    );
  } catch (err) {
    throw new Error(`Apify start failed for ${actorId}: ${err.message}`);
  }

  if (!startRes.ok) {
    const body = await startRes.text().catch(() => '');
    throw new Error(`Apify HTTP ${startRes.status} for ${actorId}: ${body.substring(0, 200)}`);
  }

  const startData = await startRes.json();
  const runId = startData?.data?.id;
  if (!runId) throw new Error(`No run ID returned from Apify for ${actorId}`);

  // ── Poll for completion ────────────────────────────────────────────────────
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    const statusRes = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${token}`,
      { timeout: 10000 }
    ).catch(() => null);

    if (!statusRes?.ok) continue;

    const statusData = await statusRes.json().catch(() => null);
    const status = statusData?.data?.status;

    if (status === 'SUCCEEDED') {
      // Fetch dataset items
      const datasetId = statusData?.data?.defaultDatasetId;
      if (!datasetId) return [];

      const itemsRes = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&format=json`,
        { timeout: 15000 }
      ).catch(() => null);

      if (!itemsRes?.ok) return [];
      return await itemsRes.json().catch(() => []);
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${status} for ${actorId} — run ID: ${runId}`);
    }

    // RUNNING or READY — keep polling
  }

  throw new Error(`Apify timeout after ${maxWaitMs}ms for ${actorId}`);
}

// ─── FACEBOOK SCRAPER ─────────────────────────────────────────────────────────

/**
 * Fetch Facebook business page data.
 * Returns normalised object ready for Method 1 and Method 2 scorers.
 */
async function fetchFacebook(pageUrl) {
  if (!pageUrl) return null;

  const items = await apifyFetch(ACTORS.facebook, {
    startUrls:         [{ url: pageUrl }],
    maxPosts:          30,
    maxPostComments:   0,
    maxReviews:        20,
    scrapeAbout:       true,
    scrapeReviews:     true,
    scrapePosts:       true,
    scrapeEvents:      true,
    language:          'en-US',
  });

  if (!items?.length) return null;
  const page = items[0];

  // Normalise to ContentRadar schema
  return {
    // Page identity
    name:             page.title || page.name || null,
    claimed:          !!(page.title || page.name),
    pageUrl:          page.url || pageUrl,

    // Completeness
    about:            page.about || page.description || null,
    profilePicUrl:    page.profilePic || page.logo || null,
    coverPhotoUrl:    page.coverPhoto || null,
    ctaType:          page.callToAction?.type || null,
    categoryName:     page.categories?.[0] || page.category || null,
    phone:            page.phone || null,
    website:          page.website || null,
    address:          page.address || null,

    // Reviews
    rating:           page.rating || page.overallStarRating || 0,
    ratingCount:      page.reviewCount || page.ratingCount || 0,
    reviews: (page.reviews || []).map(r => ({
      rating:    r.rating || r.starRating || 0,
      text:      r.text || r.review || '',
      time:      r.date ? new Date(r.date).getTime() / 1000 : null,
      response:  r.ownerReply || r.response || null,
    })),

    // Posts
    posts: (page.posts || []).map(p => ({
      text:      p.text || p.message || '',
      type:      p.type || 'status',
      time:      p.time ? new Date(p.time).getTime() / 1000 : null,
      likes:     p.likes || 0,
      comments:  p.comments || 0,
    })),

    // Events
    events: (page.events || []).map(e => ({
      name:      e.name || e.title || '',
      startTime: e.startDate || e.startTime || null,
    })),

    // Video
    videos: (page.videos || []).map(v => ({
      title:     v.title || '',
      url:       v.url || '',
      views:     v.views || 0,
    })),
    reels: (page.reels || []).map(r => ({
      title: r.title || '',
      url:   r.url || '',
    })),

    // Followers
    followersCount: page.followers || page.likes || 0,
    likesCount:     page.likes || 0,

    // Raw for debugging
    _raw: page,
  };
}

// ─── NEXTDOOR SCRAPER ──────────────────────────────────────────────────────────

/**
 * Fetch Nextdoor business page data.
 * Returns normalised object ready for Method 1 and Method 2 scorers.
 */
async function fetchNextdoor(pageUrl) {
  if (!pageUrl) return null;

  const items = await apifyFetch(ACTORS.nextdoor, {
    startUrls:       [{ url: pageUrl }],
    maxRecommendations: 50,
    scrapeRecommendations: true,
    scrapeBusinessInfo:    true,
  });

  if (!items?.length) return null;
  const page = items[0];

  return {
    // Page identity
    name:          page.businessName || page.name || null,
    claimed:       !!(page.businessName || page.name),
    pageUrl:       page.url || pageUrl,

    // Completeness
    about:         page.about || page.description || null,
    serviceArea:   page.serviceArea || page.neighborhoods || null,
    categories:    page.categories || [],
    phone:         page.phone || null,
    website:       page.website || null,

    // Recommendations
    recommendationCount: page.recommendationCount || (page.recommendations || []).length || 0,
    recommendations: (page.recommendations || []).map(r => ({
      text:        r.text || r.content || '',
      authorName:  r.authorName || null,
      date:        r.date || null,
    })),

    // Organic mentions (separate crawl — populated when community monitoring runs)
    organicMentions: page.organicMentions || 0,

    // Raw
    _raw: page,
  };
}

// ─── HOMESTARS SCRAPER ────────────────────────────────────────────────────────

/**
 * Scrape HomeStars profile using web-scraper actor.
 * HomeStars URL format: homestars.com/companies/{company-name}-{id}
 */
async function fetchHomeStars(profileUrl) {
  if (!profileUrl) return null;

  // Build HomeStars search URL if only business name provided
  const url = profileUrl.includes('homestars.com')
    ? profileUrl
    : `https://homestars.com/search/plumbing?q=${encodeURIComponent(profileUrl)}`;

  const items = await apifyFetch(ACTORS.webScraper, {
    startUrls: [{ url }],
    pageFunction: `
      async function pageFunction(context) {
        const { page, request } = context;
        await page.waitForSelector('[data-testid="business-rating"], .star-score, .reviews-count', { timeout: 10000 }).catch(() => {});

        return {
          url: request.url,
          businessName:  document.querySelector('h1')?.textContent?.trim() || null,
          claimed:       !!document.querySelector('[data-testid="claimed-badge"], .claimed'),
          starScore:     parseFloat(document.querySelector('.star-score, [data-testid="star-score"]')?.textContent) || 0,
          reviewCount:   parseInt(document.querySelector('.reviews-count, [data-testid="reviews-count"]')?.textContent) || 0,
          bestOfHomeStars: !!document.querySelector('.best-of-badge, [data-testid="best-of"]'),
          hasPhotos:     !!document.querySelector('.project-photo, [data-testid="photo"]'),
          hasPortfolio:  !!document.querySelector('.portfolio, [data-testid="portfolio"]'),
          about:         document.querySelector('.business-description, [data-testid="description"]')?.textContent?.trim() || null,
        };
      }
    `,
    maxRequestsPerCrawl: 1,
  });

  if (!items?.length) return null;
  const profile = items[0];

  return {
    platform:        'homestars',
    profileUrl:      profile.url || profileUrl,
    businessName:    profile.businessName,
    claimed:         profile.claimed || false,
    starScore:       profile.starScore || 0,
    reviewCount:     profile.reviewCount || 0,
    bestOfHomeStars: profile.bestOfHomeStars || false,
    hasPhotos:       profile.hasPhotos || false,
    hasPortfolio:    profile.hasPortfolio || false,
    about:           profile.about || null,
    scrapeStatus:    profile.businessName ? 'success' : 'not_found',
    _raw:            profile,
  };
}

// ─── HOUZZ SCRAPER ─────────────────────────────────────────────────────────────

/**
 * Scrape Houzz professional profile.
 * Houzz URL format: houzz.com/professionals/{trade}/{company-name}
 */
async function fetchHouzz(profileUrl) {
  if (!profileUrl) return null;

  const items = await apifyFetch(ACTORS.webScraper, {
    startUrls: [{ url: profileUrl }],
    pageFunction: `
      async function pageFunction(context) {
        const { page, request } = context;
        await page.waitForSelector('h1, .hz-pro-header-info', { timeout: 10000 }).catch(() => {});

        return {
          url: request.url,
          businessName:  document.querySelector('h1, .hz-pro-header-info__name')?.textContent?.trim() || null,
          claimed:       !!document.querySelector('.hz-pro-header-info__claim, .claim-link') === false,
          reviewCount:   parseInt(document.querySelector('.hz-pro-reviews-count, [data-testid="review-count"]')?.textContent) || 0,
          rating:        parseFloat(document.querySelector('.hz-pro-rating, [data-testid="rating"]')?.textContent) || 0,
          projectCount:  parseInt(document.querySelector('.hz-pro-projects-count')?.textContent) || 0,
          hasBadge:      !!document.querySelector('.hz-pro-badge, .best-of-houzz'),
          about:         document.querySelector('.hz-pro-about-bio, [data-testid="bio"]')?.textContent?.trim()?.substring(0, 500) || null,
        };
      }
    `,
    maxRequestsPerCrawl: 1,
  });

  if (!items?.length) return null;
  const profile = items[0];

  return {
    platform:     'houzz',
    profileUrl:   profile.url || profileUrl,
    businessName: profile.businessName,
    claimed:      profile.claimed !== false,
    reviewCount:  profile.reviewCount || 0,
    rating:       profile.rating || 0,
    projectCount: profile.projectCount || 0,
    hasBadge:     profile.hasBadge || false,
    about:        profile.about || null,
    scrapeStatus: profile.businessName ? 'success' : 'not_found',
    _raw:         profile,
  };
}

// ─── ANGI SCRAPER ──────────────────────────────────────────────────────────────

/**
 * Scrape Angi (formerly HomeAdvisor) profile.
 * Angi URL format: angi.com/companylist/us/{city}/{trade}/{company-id}.htm
 */
async function fetchAngi(profileUrl) {
  if (!profileUrl) return null;

  const items = await apifyFetch(ACTORS.webScraper, {
    startUrls: [{ url: profileUrl }],
    pageFunction: `
      async function pageFunction(context) {
        const { page, request } = context;
        await page.waitForSelector('h1, [data-testid="business-name"]', { timeout: 10000 }).catch(() => {});

        return {
          url: request.url,
          businessName:   document.querySelector('h1, [data-testid="business-name"]')?.textContent?.trim() || null,
          claimed:        !document.querySelector('.claim-link, [data-testid="claim"]'),
          reviewCount:    parseInt(document.querySelector('[data-testid="review-count"], .review-count')?.textContent) || 0,
          rating:         parseFloat(document.querySelector('[data-testid="rating"], .rating-value')?.textContent) || 0,
          certified:      !!document.querySelector('.angi-certified, .super-service-award, [data-testid="certified"]'),
          superService:   !!document.querySelector('.super-service-award, [data-testid="super-service"]'),
          about:          document.querySelector('[data-testid="about"], .business-description')?.textContent?.trim()?.substring(0, 500) || null,
          licenseVerified: !!document.querySelector('.license-verified, [data-testid="license"]'),
          backgroundCheck: !!document.querySelector('.background-check, [data-testid="background"]'),
        };
      }
    `,
    maxRequestsPerCrawl: 1,
  });

  if (!items?.length) return null;
  const profile = items[0];

  return {
    platform:        'angi',
    profileUrl:      profile.url || profileUrl,
    businessName:    profile.businessName,
    claimed:         profile.claimed !== false,
    reviewCount:     profile.reviewCount || 0,
    rating:          profile.rating || 0,
    certified:       profile.certified || false,
    superService:    profile.superService || false,
    licenseVerified: profile.licenseVerified || false,
    backgroundCheck: profile.backgroundCheck || false,
    about:           profile.about || null,
    scrapeStatus:    profile.businessName ? 'success' : 'not_found',
    _raw:            profile,
  };
}

// ─── BBB SCRAPER ───────────────────────────────────────────────────────────────

/**
 * Scrape BBB (Better Business Bureau) profile.
 * BBB URL format: bbb.org/ca/on/{city}/profile/{category}/{business}-{id}
 */
async function fetchBBB(businessName, city) {
  // Search BBB for the business
  const searchUrl = `https://www.bbb.org/search?find_text=${encodeURIComponent(businessName)}&find_loc=${encodeURIComponent(city)}`;

  const items = await apifyFetch(ACTORS.webScraper, {
    startUrls: [{ url: searchUrl }],
    pageFunction: `
      async function pageFunction(context) {
        const { page, request } = context;
        await page.waitForSelector('.result-title, h1', { timeout: 10000 }).catch(() => {});

        // Try to find and navigate to the first result
        const firstResult = document.querySelector('a.result-title, [data-testid="business-name"] a');
        if (firstResult) {
          return {
            businessUrl: firstResult.href,
            businessName: firstResult.textContent?.trim(),
            fromSearch: true,
          };
        }

        // Already on a business page
        return {
          businessUrl: request.url,
          businessName: document.querySelector('h1')?.textContent?.trim() || null,
          rating:       document.querySelector('.dtm-rating, [itemprop="ratingValue"]')?.textContent?.trim() || null,
          accredited:   !!document.querySelector('.accredited-badge, [data-testid="accredited"]'),
          years:        parseInt(document.querySelector('.years-in-business')?.textContent) || null,
          openComplaints: parseInt(document.querySelector('.complaints-open')?.textContent) || 0,
          closedComplaints: parseInt(document.querySelector('.complaints-closed')?.textContent) || 0,
          phone:        document.querySelector('[itemprop="telephone"]')?.textContent?.trim() || null,
          address:      document.querySelector('[itemprop="address"]')?.textContent?.trim() || null,
          fromSearch: false,
        };
      }
    `,
    maxRequestsPerCrawl: 2, // Search page + business page
    pseudoUrls: ['https://www.bbb.org/[.*]'],
  });

  if (!items?.length) return null;

  // Find the business detail item (not search results page)
  const detail = items.find(i => !i.fromSearch) || items[items.length - 1];
  if (!detail?.businessName) return null;

  return {
    platform:        'bbb',
    businessName:    detail.businessName,
    rating:          detail.rating || null,      // A+, A, B+, etc.
    accredited:      detail.accredited || false,
    openComplaints:  detail.openComplaints || 0,
    closedComplaints: detail.closedComplaints || 0,
    yearsInBusiness: detail.years || null,
    phone:           detail.phone || null,
    address:         detail.address || null,
    scrapeStatus:    detail.businessName ? 'success' : 'not_found',
    _raw:            detail,
  };
}

// ─── MAIN COLLECTION RUNNER ───────────────────────────────────────────────────

/**
 * Run all Apify platform collections in parallel for one business.
 * Returns a structured object with all platform data.
 *
 * @param {Object} business — business record from cr_businesses
 * @param {Object} options
 * @param {boolean} options.skipFacebook   — skip Facebook (cost saving)
 * @param {boolean} options.skipNextdoor   — skip Nextdoor
 * @param {boolean} options.skipDirectories — skip HomeStars/Houzz/Angi/BBB
 *
 * @returns {Object} {
 *   facebook:  normalised Facebook data | null
 *   nextdoor:  normalised Nextdoor data | null
 *   homestars: normalised HomeStars data | null
 *   houzz:     normalised Houzz data | null
 *   angi:      normalised Angi data | null
 *   bbb:       normalised BBB data | null
 *   errors:    string[] — any platform errors
 *   durationMs: number
 * }
 */
async function runApifyCollection(business, options = {}) {
  const {
    skipFacebook    = false,
    skipNextdoor    = false,
    skipDirectories = false,
  } = options;

  const startTime = Date.now();
  const errors = [];

  const wrap = async (label, fn) => {
    try {
      return await fn();
    } catch (err) {
      errors.push(`${label}: ${err.message}`);
      console.error(`Apify ${label} failed for ${business.business_name}: ${err.message}`);
      return null;
    }
  };

  // All platforms run in parallel
  const [facebook, nextdoor, homestars, houzz, angi, bbb] = await Promise.all([
    skipFacebook
      ? Promise.resolve(null)
      : wrap('Facebook', () => fetchFacebook(business.facebook_url)),

    skipNextdoor
      ? Promise.resolve(null)
      : wrap('Nextdoor', () => fetchNextdoor(business.nextdoor_url)),

    (skipDirectories || !business.homestars_url)
      ? Promise.resolve(null)
      : wrap('HomeStars', () => fetchHomeStars(business.homestars_url)),

    (skipDirectories || !business.houzz_url)
      ? Promise.resolve(null)
      : wrap('Houzz', () => fetchHouzz(business.houzz_url)),

    (skipDirectories || !business.angi_url)
      ? Promise.resolve(null)
      : wrap('Angi', () => fetchAngi(business.angi_url)),

    skipDirectories
      ? Promise.resolve(null)
      : wrap('BBB', () => fetchBBB(business.business_name, business.city)),
  ]);

  return {
    facebook,
    nextdoor,
    homestars,
    houzz,
    angi,
    bbb,
    errors,
    durationMs: Date.now() - startTime,
  };
}

// ─── SCHEMA VALIDATOR ─────────────────────────────────────────────────────────

/**
 * Validate that an Apify response has the expected fields.
 * Call this during integration testing to confirm actor output.
 *
 * Usage: node apifyScorer.js validate facebook
 */
function validateSchema(platform, data) {
  const requiredFields = {
    facebook:  ['name', 'claimed', 'rating', 'ratingCount', 'reviews', 'posts', 'events', 'videos'],
    nextdoor:  ['name', 'claimed', 'recommendationCount', 'recommendations'],
    homestars: ['claimed', 'starScore', 'reviewCount', 'scrapeStatus'],
    houzz:     ['claimed', 'reviewCount', 'rating', 'scrapeStatus'],
    angi:      ['claimed', 'reviewCount', 'rating', 'certified', 'scrapeStatus'],
    bbb:       ['accredited', 'rating', 'openComplaints', 'scrapeStatus'],
  };

  const required = requiredFields[platform] || [];
  const missing  = required.filter(f => !(f in (data || {})));
  const present  = required.filter(f =>   f in (data || {}));

  return {
    platform,
    valid:   missing.length === 0,
    present: present.length,
    missing,
    total:   required.length,
  };
}

// ─── COST ESTIMATOR ───────────────────────────────────────────────────────────

function estimateCost(options = {}) {
  const costs = {
    facebook:  { min: 0.50, max: 1.50 },
    nextdoor:  { min: 0.30, max: 0.80 },
    homestars: { min: 0.20, max: 0.50 },
    houzz:     { min: 0.20, max: 0.50 },
    angi:      { min: 0.20, max: 0.50 },
    bbb:       { min: 0.10, max: 0.30 },
  };

  let minTotal = 0, maxTotal = 0;
  const breakdown = {};

  for (const [platform, range] of Object.entries(costs)) {
    const skip = options[`skip${platform.charAt(0).toUpperCase() + platform.slice(1)}`];
    if (!skip) {
      minTotal += range.min;
      maxTotal += range.max;
      breakdown[platform] = range;
    }
  }

  return {
    minUSD: minTotal.toFixed(2),
    maxUSD: maxTotal.toFixed(2),
    breakdown,
  };
}

module.exports = {
  runApifyCollection,
  estimateCost,
  validateSchema,
  // Individual fetchers for testing
  fetchFacebook,
  fetchNextdoor,
  fetchHomeStars,
  fetchHouzz,
  fetchAngi,
  fetchBBB,
};


// ─── TEST ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const [,, command, platform] = process.argv;

  console.log('\n─── Apify Integration ───\n');

  // Cost estimate
  const estimate = estimateCost();
  console.log('Cost estimate per contractor (all platforms):');
  console.log(`  Min: $${estimate.minUSD} | Max: $${estimate.maxUSD}`);
  Object.entries(estimate.breakdown).forEach(([p, c]) =>
    console.log(`  ${p.padEnd(12)} $${c.min.toFixed(2)}–$${c.max.toFixed(2)}`)
  );

  // Schema validation templates
  console.log('\nExpected schema per platform:');
  const templates = {
    facebook:  { name: 'string', claimed: 'bool', rating: 'number', ratingCount: 'number', reviews: 'array', posts: 'array', events: 'array', videos: 'array' },
    nextdoor:  { name: 'string', claimed: 'bool', recommendationCount: 'number', recommendations: 'array' },
    homestars: { claimed: 'bool', starScore: 'number', reviewCount: 'number', scrapeStatus: 'string' },
    houzz:     { claimed: 'bool', reviewCount: 'number', rating: 'number', scrapeStatus: 'string' },
    angi:      { claimed: 'bool', reviewCount: 'number', rating: 'number', certified: 'bool', scrapeStatus: 'string' },
    bbb:       { accredited: 'bool', rating: 'string', openComplaints: 'number', scrapeStatus: 'string' },
  };

  Object.entries(templates).forEach(([p, schema]) => {
    console.log(`\n  ${p.toUpperCase()}:`);
    Object.entries(schema).forEach(([field, type]) =>
      console.log(`    ${field.padEnd(20)} ${type}`)
    );
  });

  if (!process.env.APIFY_API_TOKEN) {
    console.log('\nSet APIFY_API_TOKEN in .env to run live tests.');
    console.log('Validation commands:');
    console.log('  node apifyScorer.js validate facebook');
    console.log('  node apifyScorer.js validate homestars');
    return;
  }

  if (command === 'validate' && platform) {
    const testUrls = {
      facebook:  process.env.TEST_FB_URL || 'https://facebook.com/example',
      nextdoor:  process.env.TEST_ND_URL || null,
      homestars: process.env.TEST_HS_URL || null,
      houzz:     process.env.TEST_HZ_URL || null,
      angi:      process.env.TEST_ANGI_URL || null,
    };

    console.log(`\nValidating ${platform} schema...`);
    const fetchers = { facebook: fetchFacebook, nextdoor: fetchNextdoor, homestars: fetchHomeStars, houzz: fetchHouzz, angi: fetchAngi };
    const fn = fetchers[platform];
    if (!fn) {
      console.log(`Unknown platform: ${platform}`);
      return;
    }

    fn(testUrls[platform]).then(data => {
      const validation = validateSchema(platform, data);
      console.log(`\nSchema validation for ${platform}:`);
      console.log(`  Valid:   ${validation.valid}`);
      console.log(`  Present: ${validation.present}/${validation.total} required fields`);
      if (validation.missing.length) {
        console.log(`  Missing: ${validation.missing.join(', ')}`);
      }
      console.log('\nRaw data sample:', JSON.stringify(data, null, 2).substring(0, 500));
    }).catch(err => console.error('Validation failed:', err.message));
  }
}
