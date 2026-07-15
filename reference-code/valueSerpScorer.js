/**
 * ContentRadar — ValueSERP Integration
 * server/scoring/valueSerpScorer.js
 *
 * Automates 6 signals previously scored manually:
 *   Signal 40 — Seasonal Content Readiness
 *   Signal 43 — Geographic Search Visibility
 *   Signal 51 — Search Share of Voice
 *   Signal 52 — Social Share of Voice (partial — Facebook community posts in SERP)
 *   Signal 53 — Competitor Ad & LSA Pressure
 *   Signal 54 — Branded Search Presence
 *
 * ValueSERP API docs: https://www.valueserp.com/docs
 * Cost: ~$0.002 per search query
 * Estimated cost per contractor audit: ~$0.02–0.06 (10–30 queries)
 *
 * Environment variable required:
 *   VALUESERP_API_KEY — set in .env
 *
 * Usage:
 *   const { runValueSerpScoring } = require('./valueSerpScorer');
 *   const scores = await runValueSerpScoring(business, context);
 */

'use strict';

const fetch = require('node-fetch');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const VALUESERP_BASE = 'https://api.valueserp.com/search';

// Scoring thresholds
const THRESHOLDS = {
  // Signal 43: Map Pack position thresholds
  MAP_PACK_DOMINANT:    1,   // Position 1 = dominant
  MAP_PACK_STRONG:      3,   // Position 1–3 = strong
  MAP_PACK_PRESENT:     10,  // Position 4–10 = present but not dominant

  // Signal 51: Search SOV — % of keywords where contractor appears in top 3
  SOV_DOMINANT:         0.60,  // 60%+ = dominant (score 3)
  SOV_FUNCTIONAL:       0.25,  // 25%+ = functional (score 2)
  SOV_WEAK:             0.01,  // Any presence = weak (score 1)

  // Signal 51: What % of protected market communities must rank top 3 for score 3
  GEO_COVERAGE_DOMINANT:   0.75,
  GEO_COVERAGE_FUNCTIONAL: 0.40,

  // Signal 53: Competitor pressure
  PRESSURE_HIGH:    3,   // 3+ competitor LSA/ads = high pressure
  PRESSURE_MEDIUM:  1,   // 1–2 = medium

  // Signal 54: Branded search
  BRANDED_DIRS_BEST: 5,  // 5+ directory listings for branded search = best practice
};

// Trade keyword templates — primary search queries per trade
// {city} and {trade} are replaced at runtime
const TRADE_KEYWORDS = {
  plumbing: [
    'plumber {city}',
    'emergency plumber {city}',
    'plumbing {city}',
    'drain cleaning {city}',
    'pipe repair {city}',
    'water heater repair {city}',
    'burst pipe {city}',
    'plumber near me {city}',
  ],
  hvac: [
    'hvac {city}',
    'furnace repair {city}',
    'ac repair {city}',
    'heating cooling {city}',
    'emergency hvac {city}',
    'furnace installation {city}',
    'air conditioning repair {city}',
    'heat pump installation {city}',
  ],
  electrical: [
    'electrician {city}',
    'emergency electrician {city}',
    'electrical repair {city}',
    'electrical panel upgrade {city}',
    'licensed electrician {city}',
    'electrical contractor {city}',
    'generator installation {city}',
    'wiring repair {city}',
  ],
  roofing: [
    'roofer {city}',
    'roofing contractor {city}',
    'roof repair {city}',
    'emergency roofing {city}',
    'roof replacement {city}',
    'storm damage roof {city}',
    'shingle replacement {city}',
    'flat roof repair {city}',
  ],
};

// Seasonal keywords — used for Signal 40
// Mapped to the months they peak (0-indexed)
const SEASONAL_KEYWORDS = {
  plumbing: [
    { keyword: 'frozen pipe repair {city}',    peakMonths: [0, 1],     // Jan, Feb
      peakLabel: 'pipe freeze season' },
    { keyword: 'burst pipe {city}',            peakMonths: [0, 1, 11], // Jan, Feb, Dec
      peakLabel: 'pipe freeze season' },
    { keyword: 'sump pump {city}',             peakMonths: [3, 4],     // Apr, May
      peakLabel: 'spring flooding' },
    { keyword: 'furnace tune up {city}',       peakMonths: [8, 9],     // Sep, Oct
      peakLabel: 'fall furnace prep' },
  ],
  hvac: [
    { keyword: 'furnace tune up {city}',       peakMonths: [8, 9],
      peakLabel: 'fall furnace prep' },
    { keyword: 'furnace repair {city}',        peakMonths: [10, 11, 0],
      peakLabel: 'heating season' },
    { keyword: 'ac tune up {city}',            peakMonths: [3, 4],
      peakLabel: 'spring AC prep' },
    { keyword: 'air conditioning repair {city}', peakMonths: [5, 6, 7],
      peakLabel: 'cooling season' },
  ],
  electrical: [
    { keyword: 'generator installation {city}', peakMonths: [9, 10, 11],
      peakLabel: 'storm/winter prep' },
    { keyword: 'outdoor lighting {city}',       peakMonths: [4, 5],
      peakLabel: 'spring outdoor season' },
    { keyword: 'electrical panel upgrade {city}', peakMonths: [2, 3],
      peakLabel: 'spring renovation' },
  ],
  roofing: [
    { keyword: 'roof inspection {city}',        peakMonths: [3, 4],
      peakLabel: 'spring inspection' },
    { keyword: 'storm damage roof repair {city}', peakMonths: [5, 6, 7],
      peakLabel: 'storm season' },
    { keyword: 'roof replacement {city}',        peakMonths: [4, 5, 8, 9],
      peakLabel: 'prime roofing season' },
  ],
};

// ─── VALUESERP API CALLER ─────────────────────────────────────────────────────

/**
 * Make a single ValueSERP API call.
 * Returns parsed SERP data or null on error.
 *
 * @param {string} query       — search query
 * @param {string} location    — e.g. "Timmins,Ontario,Canada"
 * @param {string} gl          — country code e.g. "ca"
 * @param {string} hl          — language e.g. "en"
 */
async function serpFetch(query, location, gl = 'ca', hl = 'en') {
  const apiKey = process.env.VALUESERP_API_KEY;
  if (!apiKey) throw new Error('VALUESERP_API_KEY not set in .env');

  const params = new URLSearchParams({
    api_key:  apiKey,
    q:        query,
    location: location,
    gl:       gl,
    hl:       hl,
    output:   'json',
    num:      '20',                // Get 20 results to see beyond top 10
    include_answer_box: 'false',
  });

  try {
    const res = await fetch(`${VALUESERP_BASE}?${params}`, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.error(`ValueSERP error ${res.status} for query: ${query}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`ValueSERP fetch failed for "${query}": ${err.message}`);
    return null;
  }
}

/**
 * Run multiple SERP queries in parallel.
 * Returns array of { query, location, data } objects.
 * Null entries indicate failed queries — handled gracefully.
 */
async function serpFetchBatch(queries) {
  return Promise.all(
    queries.map(async ({ query, location, gl, hl }) => ({
      query,
      location,
      data: await serpFetch(query, location, gl, hl),
    }))
  );
}

// ─── SERP PARSERS ─────────────────────────────────────────────────────────────

/**
 * Find a business's position in the Map Pack (local results).
 * Returns position (1-based) or null if not found.
 */
function findMapPackPosition(serpData, businessName) {
  if (!serpData?.local_results?.length) return null;
  const normalised = businessName.toLowerCase();
  const idx = serpData.local_results.findIndex(r =>
    (r.title || '').toLowerCase().includes(normalised) ||
    normalised.includes((r.title || '').toLowerCase().split(' ').slice(0, 2).join(' '))
  );
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Find a business's position in organic results.
 */
function findOrganicPosition(serpData, websiteUrl, businessName) {
  if (!serpData?.organic_results?.length) return null;
  const domain = extractDomain(websiteUrl || '');
  const normalised = (businessName || '').toLowerCase();

  const idx = serpData.organic_results.findIndex(r => {
    const link = (r.link || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    return (domain && link.includes(domain)) || title.includes(normalised);
  });
  return idx >= 0 ? idx + 1 : null;
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return ''; }
}

/**
 * Count competitor LSA entries in SERP.
 */
function countCompetitorLSA(serpData, businessName) {
  if (!serpData?.local_services_ads?.length) return 0;
  const normalised = (businessName || '').toLowerCase();
  return serpData.local_services_ads.filter(ad =>
    !(ad.title || '').toLowerCase().includes(normalised)
  ).length;
}

/**
 * Count competitor paid ads in SERP.
 */
function countCompetitorAds(serpData, websiteUrl, businessName) {
  if (!serpData?.ads?.length) return 0;
  const domain = extractDomain(websiteUrl || '');
  const normalised = (businessName || '').toLowerCase();
  return serpData.ads.filter(ad => {
    const adDomain = extractDomain(ad.link || '');
    const adTitle = (ad.title || '').toLowerCase();
    return !adDomain.includes(domain) && !adTitle.includes(normalised);
  }).length;
}

/**
 * Check if business has an LSA entry.
 */
function hasOwnLSA(serpData, businessName) {
  if (!serpData?.local_services_ads?.length) return false;
  const normalised = (businessName || '').toLowerCase();
  return serpData.local_services_ads.some(ad =>
    (ad.title || '').toLowerCase().includes(normalised)
  );
}

/**
 * Check if any Facebook community posts appear in organic results.
 * These represent social share of voice in SERP.
 */
function countSocialSERPResults(serpData) {
  if (!serpData?.organic_results?.length) return 0;
  return serpData.organic_results.filter(r => {
    const link = (r.link || '').toLowerCase();
    return link.includes('facebook.com/groups') ||
           link.includes('nextdoor.com') ||
           link.includes('reddit.com') ||
           link.includes('houzz.com') ||
           link.includes('homestars.com');
  }).length;
}

// ─── SIGNAL SCORERS ───────────────────────────────────────────────────────────

/**
 * Signal 40 — Seasonal Content Readiness
 *
 * Checks if the contractor is ranking for seasonal keywords
 * before their demand peak arrives.
 */
async function scoreS40_Seasonal(business, location) {
  const { business_name, trade = 'plumbing', website_url, city } = business;
  const keywords = SEASONAL_KEYWORDS[trade] || [];
  const currentMonth = new Date().getMonth();

  // Determine which seasonal keywords are in or approaching their peak window
  // "Approaching" = within 6 weeks of peak
  const relevantKeywords = keywords.filter(k => {
    const monthsToPeak = k.peakMonths.map(pm =>
      ((pm - currentMonth + 12) % 12)
    );
    return Math.min(...monthsToPeak) <= 1.5; // within ~6 weeks
  });

  if (relevantKeywords.length === 0) {
    // No seasonal keywords currently approaching peak — assess evergreen seasonal presence
    return {
      signal: 40,
      score: 1,
      note: 'No seasonal keywords currently at peak window — content readiness not assessable at this time.',
      method: 'valueserp',
      inputs: { relevantKeywords: 0, currentMonth, trade },
    };
  }

  const queries = relevantKeywords.map(k => ({
    query:    k.keyword.replace('{city}', city),
    location: location,
  }));

  const results = await serpFetchBatch(queries);

  let rankingCount = 0;
  const rankingDetails = [];

  for (let i = 0; i < results.length; i++) {
    const { query, data } = results[i];
    const kw = relevantKeywords[i];
    const mapPackPos = findMapPackPosition(data, business_name);
    const organicPos = findOrganicPosition(data, website_url, business_name);

    const ranking = (mapPackPos !== null && mapPackPos <= 5) ||
                    (organicPos !== null && organicPos <= 10);

    if (ranking) rankingCount++;
    rankingDetails.push({
      keyword: query,
      peakLabel: kw.peakLabel,
      mapPackPos,
      organicPos,
      ranking,
    });
  }

  const rankRate = relevantKeywords.length > 0
    ? rankingCount / relevantKeywords.length
    : 0;

  const inputs = { rankingCount, total: relevantKeywords.length, rankRate: Math.round(rankRate * 100), rankingDetails };

  let score, note;
  if (rankingCount === 0) {
    score = 0;
    note = `Not ranking for any of ${relevantKeywords.length} seasonal keywords approaching peak — demand arrives, contractor invisible.`;
  } else if (rankRate < 0.5) {
    score = 1;
    note = `Ranking for ${rankingCount}/${relevantKeywords.length} seasonal keywords — partial seasonal content readiness.`;
  } else if (rankRate < 1.0) {
    score = 2;
    note = `Ranking for ${rankingCount}/${relevantKeywords.length} seasonal keywords approaching peak — strong but not complete coverage.`;
  } else {
    score = 3;
    note = `Ranking for all ${relevantKeywords.length} seasonal keywords before demand peak — full seasonal content readiness.`;
  }

  return { signal: 40, score, note, method: 'valueserp', inputs };
}

/**
 * Signal 43 — Geographic Search Visibility
 *
 * Checks Map Pack position for primary trade keywords
 * across all communities in the protected market.
 */
async function scoreS43_GeoVisibility(business, communities, location) {
  const { business_name, trade = 'plumbing', website_url } = business;
  const primaryKeywords = (TRADE_KEYWORDS[trade] || []).slice(0, 3); // Top 3 primary keywords

  if (communities.length === 0) {
    return {
      signal: 43,
      score: 0,
      note: 'No protected market communities configured — geographic visibility cannot be assessed.',
      method: 'valueserp',
      inputs: { communities: 0 },
    };
  }

  // Build query matrix: 3 keywords × N communities
  const queries = [];
  for (const community of communities) {
    for (const kw of primaryKeywords) {
      queries.push({
        query:    kw.replace('{city}', community),
        location: `${community},Ontario,Canada`,
        community,
        keyword: kw,
      });
    }
  }

  const results = await serpFetchBatch(queries);

  // Aggregate by community — a community is "covered" if contractor
  // appears in Map Pack top 3 for ANY of the primary keywords
  const communityResults = {};
  communities.forEach(c => { communityResults[c] = { bestPosition: null, covered: false }; });

  results.forEach(({ data, community, keyword }) => {
    if (!data) return;
    const pos = findMapPackPosition(data, business_name);
    const curr = communityResults[community];
    if (pos !== null) {
      if (curr.bestPosition === null || pos < curr.bestPosition) {
        curr.bestPosition = pos;
      }
      if (pos <= THRESHOLDS.MAP_PACK_STRONG) {
        curr.covered = true;
      }
    }
  });

  const coveredCount   = Object.values(communityResults).filter(c => c.covered).length;
  const totalCommunities = communities.length;
  const coverageRate   = coveredCount / totalCommunities;

  const inputs = {
    totalCommunities,
    coveredCount,
    coverageRate: Math.round(coverageRate * 100),
    communityResults,
    keywordsChecked: primaryKeywords,
  };

  let score, note;
  if (coveredCount === 0) {
    score = 0;
    note = `Not ranking in Map Pack for any of ${totalCommunities} communities — geographically invisible across the protected market.`;
  } else if (coveredCount === 1 || coverageRate < THRESHOLDS.GEO_COVERAGE_FUNCTIONAL) {
    score = 1;
    note = `Map Pack presence in ${coveredCount}/${totalCommunities} communities — primary city or sparse coverage only.`;
  } else if (coverageRate < THRESHOLDS.GEO_COVERAGE_DOMINANT) {
    score = 2;
    note = `Map Pack top 3 in ${coveredCount}/${totalCommunities} communities — functional geographic coverage approaching full market.`;
  } else {
    score = 3;
    note = `Map Pack top 3 in ${coveredCount}/${totalCommunities} communities — dominant geographic visibility across full protected market.`;
  }

  return { signal: 43, score, note, method: 'valueserp', inputs };
}

/**
 * Signal 51 — Search Share of Voice
 *
 * Checks what % of primary trade keywords the contractor
 * appears in top 3 (Map Pack or organic) in their primary city.
 */
async function scoreS51_SearchSOV(business, location) {
  const { business_name, trade = 'plumbing', website_url, city } = business;
  const keywords = TRADE_KEYWORDS[trade] || [];

  const queries = keywords.map(kw => ({
    query:    kw.replace('{city}', city),
    location: location,
  }));

  const results = await serpFetchBatch(queries);

  const keywordResults = [];
  let top3Count = 0;

  results.forEach(({ query, data }, i) => {
    if (!data) return;
    const mapPack = findMapPackPosition(data, business_name);
    const organic = findOrganicPosition(data, website_url, business_name);
    const inTop3  = (mapPack !== null && mapPack <= 3) ||
                    (organic !== null && organic <= 3);

    if (inTop3) top3Count++;

    keywordResults.push({
      keyword:  query,
      mapPack,
      organic,
      inTop3,
      lsaPresent: hasOwnLSA(data, business_name),
    });
  });

  const sovRate = keywords.length > 0 ? top3Count / keywords.length : 0;
  const inputs = {
    keywordsChecked: keywords.length,
    top3Count,
    sovRate: Math.round(sovRate * 100),
    keywordResults,
  };

  let score, note;
  if (top3Count === 0) {
    score = 0;
    note = `Not in top 3 for any of ${keywords.length} primary trade keywords — search share of voice is zero.`;
  } else if (sovRate < THRESHOLDS.SOV_FUNCTIONAL) {
    score = 1;
    note = `Top 3 for ${top3Count}/${keywords.length} primary keywords (${inputs.sovRate}% SOV) — below functional threshold.`;
  } else if (sovRate < THRESHOLDS.SOV_DOMINANT) {
    score = 2;
    note = `Top 3 for ${top3Count}/${keywords.length} primary keywords (${inputs.sovRate}% SOV) — functional search presence.`;
  } else {
    score = 3;
    note = `Top 3 for ${top3Count}/${keywords.length} primary keywords (${inputs.sovRate}% SOV) — dominant search share of voice.`;
  }

  return { signal: 51, score, note, method: 'valueserp', inputs };
}

/**
 * Signal 52 — Social Share of Voice (SERP component)
 *
 * Checks if social/community content (Facebook groups, Nextdoor,
 * Reddit) is appearing in SERP for primary trade keywords.
 * This is the SERP-visible component of social share of voice —
 * combined with Apify community mention data for the full picture.
 */
async function scoreS52_SocialSOV(business, location) {
  const { business_name, trade = 'plumbing', city } = business;

  // Check 3 keywords for social SERP presence
  const keywords = (TRADE_KEYWORDS[trade] || []).slice(0, 3);
  const queries = keywords.map(kw => ({
    query:    kw.replace('{city}', city),
    location: location,
  }));

  const results = await serpFetchBatch(queries);

  let totalSocialResults = 0;
  let contractorInSocialResults = 0;
  const socialDetails = [];

  results.forEach(({ query, data }) => {
    if (!data) return;
    const socialCount = countSocialSERPResults(data);
    totalSocialResults += socialCount;

    // Check if contractor's own Facebook page appears in social results
    const ownSocial = (data.organic_results || []).some(r => {
      const link = (r.link || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      return (link.includes('facebook.com') || link.includes('nextdoor.com')) &&
             title.includes((business_name || '').toLowerCase().split(' ')[0]);
    });

    if (ownSocial) contractorInSocialResults++;
    socialDetails.push({ keyword: query, socialResults: socialCount, ownPresent: ownSocial });
  });

  const inputs = { totalSocialResults, contractorInSocialResults, queries: keywords.length, socialDetails };

  let score, note;
  if (contractorInSocialResults === 0 && totalSocialResults === 0) {
    score = 0;
    note = 'No social or community content appearing in search results for primary trade keywords.';
  } else if (contractorInSocialResults === 0) {
    score = 1;
    note = `${totalSocialResults} community results in SERP but contractor's own social pages not appearing — competitors capturing social SERP presence.`;
  } else if (contractorInSocialResults < keywords.length) {
    score = 2;
    note = `Contractor social pages appearing in ${contractorInSocialResults}/${keywords.length} keyword SERPs — partial social SERP presence.`;
  } else {
    score = 3;
    note = `Contractor social pages appearing in search results across primary trade keywords — strong social SERP visibility.`;
  }

  return { signal: 52, score, note, method: 'valueserp', inputs };
}

/**
 * Signal 53 — Competitor Ad & LSA Pressure
 *
 * Counts how many competitor LSA and paid ads appear
 * for primary trade keywords in the contractor's primary city.
 */
async function scoreS53_CompetitorPressure(business, location) {
  const { business_name, trade = 'plumbing', website_url, city } = business;

  // Check the two highest-intent keywords for competitor pressure
  const keywords = (TRADE_KEYWORDS[trade] || []).slice(0, 2);
  const queries = keywords.map(kw => ({
    query:    kw.replace('{city}', city),
    location: location,
  }));

  const results = await serpFetchBatch(queries);

  let totalCompetitorLSA = 0;
  let totalCompetitorAds = 0;
  let ownLSACount = 0;
  let ownMapPackPosition = null;
  const pressureDetails = [];

  results.forEach(({ query, data }) => {
    if (!data) return;
    const compLSA = countCompetitorLSA(data, business_name);
    const compAds = countCompetitorAds(data, website_url, business_name);
    const ownLSA  = hasOwnLSA(data, business_name);
    const mapPos  = findMapPackPosition(data, business_name);

    totalCompetitorLSA += compLSA;
    totalCompetitorAds += compAds;
    if (ownLSA) ownLSACount++;
    if (mapPos && (ownMapPackPosition === null || mapPos < ownMapPackPosition)) {
      ownMapPackPosition = mapPos;
    }

    pressureDetails.push({
      keyword: query,
      competitorLSA: compLSA,
      competitorAds: compAds,
      ownLSA,
      mapPackPos: mapPos,
    });
  });

  const avgCompetitorLSA = totalCompetitorLSA / (keywords.length || 1);
  const ownLSAActive = ownLSACount > 0;
  const inputs = {
    avgCompetitorLSA: Math.round(avgCompetitorLSA * 10) / 10,
    totalCompetitorAds,
    ownLSAActive,
    ownMapPackPosition,
    pressureDetails,
  };

  let score, note;
  if (avgCompetitorLSA === 0 && totalCompetitorAds === 0) {
    score = 3;
    note = 'No competitor LSA or paid activity detected — low competitive pressure environment.';
  } else if (avgCompetitorLSA >= THRESHOLDS.PRESSURE_HIGH && !ownLSAActive) {
    score = 1;
    note = `${Math.round(avgCompetitorLSA)} avg competitor LSA entries — heavy top-of-page pressure with no LSA defence in place.`;
  } else if (avgCompetitorLSA >= THRESHOLDS.PRESSURE_MEDIUM && !ownLSAActive) {
    score = 1;
    note = `${Math.round(avgCompetitorLSA)} avg competitor LSA — moderate pressure, own LSA not active.`;
  } else if (ownLSAActive && ownMapPackPosition !== null && ownMapPackPosition <= 2) {
    score = 3;
    note = `Own LSA active, Map Pack top ${ownMapPackPosition} — well positioned against ${Math.round(avgCompetitorLSA)} avg competitor LSA entries.`;
  } else {
    score = 2;
    note = `${Math.round(avgCompetitorLSA)} avg competitor LSA. Own LSA: ${ownLSAActive ? 'active' : 'inactive'}. Map Pack: ${ownMapPackPosition || 'absent'}.`;
  }

  return { signal: 53, score, note, method: 'valueserp', inputs };
}

/**
 * Signal 54 — Branded Search Presence
 *
 * Searches for the contractor's business name and checks
 * how strongly their digital footprint appears.
 */
async function scoreS54_BrandedSearch(business, location) {
  const { business_name, website_url, city } = business;
  const brandQuery = business_name;

  const [{ data }] = await serpFetchBatch([{
    query: brandQuery,
    location: location,
  }]);

  if (!data) {
    return {
      signal: 54,
      score: 0,
      note: 'Branded search query failed — unable to assess branded presence.',
      method: 'valueserp',
      inputs: { error: true },
    };
  }

  const websiteRank   = findOrganicPosition(data, website_url, business_name);
  const gbpPresent    = findMapPackPosition(data, business_name) !== null;
  const domain        = extractDomain(website_url || '');

  // Count directory listings appearing for branded search
  const directoryDomains = ['homestars', 'houzz', 'bbb.org', 'yellowpages', 'yelp', 'angi', 'facebook', 'linkedin'];
  const directoryCount = (data.organic_results || []).filter(r =>
    directoryDomains.some(d => (r.link || '').toLowerCase().includes(d))
  ).length;

  // Check for competitor ads on branded terms — a red flag
  const competitorAdsOnBrand = countCompetitorAds(data, website_url, business_name);

  const inputs = {
    brandQuery,
    websiteRank,
    gbpPresent,
    directoryCount,
    competitorAdsOnBrand,
  };

  let score, note;
  if (!websiteRank && !gbpPresent) {
    score = 0;
    note = `Searching "${business_name}" produces no clear results — brand has insufficient digital footprint.`;
  } else if (!gbpPresent || directoryCount < 2) {
    score = 1;
    note = `Branded search shows website at rank ${websiteRank || 'absent'} — GBP and directory reinforcement minimal.`;
  } else if (directoryCount < THRESHOLDS.BRANDED_DIRS_BEST) {
    score = 2;
    note = `Branded search shows website + GBP with ${directoryCount} directory listings — strong but not yet multi-channel reinforced.`;
  } else {
    score = 3;
    note = `Strong branded presence — website rank ${websiteRank}, GBP present, ${directoryCount} directory listings, ${competitorAdsOnBrand === 0 ? 'no competitor ads on brand' : `${competitorAdsOnBrand} competitor ads detected`}.`;
  }

  return { signal: 54, score, note, method: 'valueserp', inputs };
}

// ─── MAIN RUNNER ──────────────────────────────────────────────────────────────

/**
 * Run all 6 ValueSERP signal scorers for one business.
 * All queries run in parallel batches — efficient and fast.
 *
 * @param {Object} business          — business record from cr_businesses
 * @param {Object} options
 * @param {string[]} options.communities  — protected market communities list
 * @param {string}   options.location    — ValueSERP location string e.g. "Timmins,Ontario,Canada"
 * @param {string}   options.gl          — country code e.g. "ca"
 *
 * @returns {Object[]} — array of 6 score objects, one per signal
 */
async function runValueSerpScoring(business, options = {}) {
  const {
    communities = [],
    location    = `${business.city},Ontario,Canada`,
    gl          = 'ca',
  } = options;

  if (!process.env.VALUESERP_API_KEY) {
    console.warn('VALUESERP_API_KEY not set — returning manual placeholders for signals 40, 43, 51, 52, 53, 54');
    return [40, 43, 51, 52, 53, 54].map(sig => ({
      signal: sig,
      score: null,
      note: 'ValueSERP API key not configured — manual scoring required.',
      method: 'manual',
      needs_review: true,
      inputs: {},
    }));
  }

  console.log(`ValueSERP: scoring 6 signals for ${business.business_name} in ${location}`);

  // All 6 scorers run in parallel
  const [s40, s43, s51, s52, s53, s54] = await Promise.all([
    scoreS40_Seasonal(business, location).catch(err => ({
      signal: 40, score: null,
      note: `ValueSERP error: ${err.message}`,
      method: 'valueserp', inputs: { error: err.message },
    })),
    scoreS43_GeoVisibility(business, communities, location).catch(err => ({
      signal: 43, score: null,
      note: `ValueSERP error: ${err.message}`,
      method: 'valueserp', inputs: { error: err.message },
    })),
    scoreS51_SearchSOV(business, location).catch(err => ({
      signal: 51, score: null,
      note: `ValueSERP error: ${err.message}`,
      method: 'valueserp', inputs: { error: err.message },
    })),
    scoreS52_SocialSOV(business, location).catch(err => ({
      signal: 52, score: null,
      note: `ValueSERP error: ${err.message}`,
      method: 'valueserp', inputs: { error: err.message },
    })),
    scoreS53_CompetitorPressure(business, location).catch(err => ({
      signal: 53, score: null,
      note: `ValueSERP error: ${err.message}`,
      method: 'valueserp', inputs: { error: err.message },
    })),
    scoreS54_BrandedSearch(business, location).catch(err => ({
      signal: 54, score: null,
      note: `ValueSERP error: ${err.message}`,
      method: 'valueserp', inputs: { error: err.message },
    })),
  ]);

  const results = [s40, s43, s51, s52, s53, s54];

  // Log estimated cost
  const totalQueries = results.reduce((sum, r) => {
    const q = r.inputs?.keywordsChecked || r.inputs?.queries ||
              r.inputs?.totalCommunities || 1;
    return sum + (typeof q === 'number' ? q : 1);
  }, 0);
  console.log(`ValueSERP: ~${totalQueries} queries run — estimated cost $${(totalQueries * 0.002).toFixed(3)}`);

  return results;
}

// ─── COST ESTIMATOR ───────────────────────────────────────────────────────────

/**
 * Estimate the ValueSERP cost for one business before running.
 */
function estimateCost(trade, communityCount) {
  const primaryKeywords = (TRADE_KEYWORDS[trade] || []).length;
  const seasonalKeywords = (SEASONAL_KEYWORDS[trade] || []).length;

  const s40queries = Math.min(seasonalKeywords, 4);              // Signal 40
  const s43queries = communityCount * 3;                          // Signal 43 — 3 keywords × communities
  const s51queries = primaryKeywords;                             // Signal 51
  const s52queries = 3;                                           // Signal 52
  const s53queries = 2;                                           // Signal 53
  const s54queries = 1;                                           // Signal 54

  const total = s40queries + s43queries + s51queries + s52queries + s53queries + s54queries;
  return {
    totalQueries: total,
    estimatedCostUSD: total * 0.002,
    breakdown: { s40: s40queries, s43: s43queries, s51: s51queries, s52: s52queries, s53: s53queries, s54: s54queries },
  };
}

module.exports = {
  runValueSerpScoring,
  estimateCost,
  TRADE_KEYWORDS,
  SEASONAL_KEYWORDS,
  // Individual scorers for testing
  scoreS40_Seasonal,
  scoreS43_GeoVisibility,
  scoreS51_SearchSOV,
  scoreS52_SocialSOV,
  scoreS53_CompetitorPressure,
  scoreS54_BrandedSearch,
};


// ─── TEST ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const testBusiness = {
    id: 'test-001',
    business_name: 'Timmins Best Plumbing',
    trade: 'plumbing',
    city: 'Timmins',
    province_state: 'ON',
    website_url: 'https://timminsbestplumbing.com',
  };

  const testCommunities = [
    'Timmins', 'Porcupine', 'South Porcupine', 'Schumacher', 'Mountjoy',
    'Gogama', 'Chapleau', 'Foleyet', 'Matheson',
  ];

  console.log('\n─── ValueSERP Cost Estimate ───');
  const estimate = estimateCost('plumbing', testCommunities.length);
  console.log(`Trade:              plumbing`);
  console.log(`Communities:        ${testCommunities.length}`);
  console.log(`Total queries:      ${estimate.totalQueries}`);
  console.log(`Estimated cost:     $${estimate.estimatedCostUSD.toFixed(3)}`);
  console.log(`Breakdown:          Signal 40: ${estimate.breakdown.s40} queries`);
  console.log(`                    Signal 43: ${estimate.breakdown.s43} queries (${testCommunities.length} communities × 3 keywords)`);
  console.log(`                    Signal 51: ${estimate.breakdown.s51} queries`);
  console.log(`                    Signal 52: ${estimate.breakdown.s52} queries`);
  console.log(`                    Signal 53: ${estimate.breakdown.s53} queries`);
  console.log(`                    Signal 54: ${estimate.breakdown.s54} query`);

  console.log('\n─── Trade Keyword Preview ───');
  Object.entries(TRADE_KEYWORDS).forEach(([trade, kws]) => {
    console.log(`\n${trade.toUpperCase()} (${kws.length} keywords):`);
    kws.forEach(kw => console.log(`  ${kw.replace('{city}', 'Timmins')}`));
  });

  if (process.env.VALUESERP_API_KEY) {
    console.log('\n─── Live API test ───');
    runValueSerpScoring(testBusiness, {
      communities: testCommunities,
      location: 'Timmins,Ontario,Canada',
    }).then(scores => {
      scores.forEach(s => {
        const bar = s.score !== null ? '█'.repeat(s.score) + '░'.repeat(3 - s.score) : '???';
        console.log(`S${String(s.signal).padStart(2,'0')}  [${bar}] ${s.score ?? 'null'}/3  ${s.note}`);
      });
    }).catch(console.error);
  } else {
    console.log('\nSet VALUESERP_API_KEY in .env to run live test.');
  }
}
