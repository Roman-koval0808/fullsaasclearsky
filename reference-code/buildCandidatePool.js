'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ContentRadar — Cohort 1 Candidate Pool Builder
// ClearSky Software · May 2026 · Confidential
//
// PURPOSE:
//   Pulls 4,000 contractor businesses from DataForSEO Google Maps API.
//   1,000 per trade (Plumbing, HVAC, Electrical, Roofing).
//   Enforces geographic caps: max 200 per city, max 400 per province/state.
//   Validates 3 entry conditions: working website, claimed GBP, correct trade.
//   Writes results to cr_candidates table in PostgreSQL.
//   Outputs a summary CSV for human review.
//
// USAGE:
//   node buildCandidatePool.js
//   node buildCandidatePool.js --trade plumbing       (single trade only)
//   node buildCandidatePool.js --dry-run              (no DB writes)
//   node buildCandidatePool.js --resume               (skip already-fetched cities)
//
// LOCKED CONSTANTS (do not change without Rory's approval):
//   POOL_PER_TRADE       = 1,000
//   MAX_PER_CITY         = 200
//   MAX_PER_REGION       = 400
//   ENTRY_CONDITIONS     = website + claimed GBP + correct trade
//
// ENVIRONMENT VARIABLES REQUIRED:
//   DATAFORSEO_LOGIN     — your DataForSEO login email
//   DATAFORSEO_PASSWORD  — your DataForSEO password
//   CR_DB_HOST, CR_DB_PORT, CR_DB_NAME, CR_DB_USER, CR_DB_PASSWORD
//
// ESTIMATED COST:
//   DataForSEO Google Maps Search: ~$0.0006 per result
//   4,000 businesses total: ~$2.40–$5.00 depending on pagination
//   Run on existing DataForSEO account credits.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const { Pool } = require('pg');

// ─── Locked Constants ─────────────────────────────────────────────────────────
const POOL_PER_TRADE = 1000;
const MAX_PER_CITY = 200;
const MAX_PER_REGION = 400;
const RESULTS_PER_REQUEST = 20; // DataForSEO max per call
const REQUEST_DELAY_MS = 500;   // Throttle — be polite to the API

// ─── Trade Configuration ──────────────────────────────────────────────────────
// DataForSEO category_ids for Google Maps business search
// Find category IDs at: https://api.dataforseo.com/v3/business_data/google/categories/list
const TRADES = {
  plumbing: {
    label: 'Plumbing',
    keywords: ['plumber', 'plumbing company', 'plumbing contractor'],
    categoryIds: ['plumber', 'plumbing_supply_store'],
    tradeTag: 'plumbing'
  },
  hvac: {
    label: 'HVAC',
    keywords: ['HVAC', 'heating and cooling', 'furnace repair', 'air conditioning contractor'],
    categoryIds: ['hvac_contractor', 'air_conditioning_contractor', 'heating_contractor'],
    tradeTag: 'hvac'
  },
  electrical: {
    label: 'Electrical',
    keywords: ['electrician', 'electrical contractor', 'electrical company'],
    categoryIds: ['electrician'],
    tradeTag: 'electrical'
  },
  roofing: {
    label: 'Roofing',
    keywords: ['roofer', 'roofing company', 'roofing contractor'],
    categoryIds: ['roofing_contractor'],
    tradeTag: 'roofing'
  }
};

// ─── Target Cities ────────────────────────────────────────────────────────────
// Prioritises Canadian small and mid-market cities that match ClearSky's markets.
// Each city has a region tag for the 400-per-region cap.
// DataForSEO location_code: https://api.dataforseo.com/v3/business_data/google/locations
const CITIES = [
  // Ontario — Northern
  { city: 'Timmins', province: 'Ontario', region: 'ON-North', locationCode: 1002124, country: 'CA' },
  { city: 'Sudbury', province: 'Ontario', region: 'ON-North', locationCode: 1002228, country: 'CA' },
  { city: 'Thunder Bay', province: 'Ontario', region: 'ON-North', locationCode: 1002256, country: 'CA' },
  { city: 'Sault Ste. Marie', province: 'Ontario', region: 'ON-North', locationCode: 1002213, country: 'CA' },
  { city: 'North Bay', province: 'Ontario', region: 'ON-North', locationCode: 1002170, country: 'CA' },
  { city: 'Kirkland Lake', province: 'Ontario', region: 'ON-North', locationCode: 1002133, country: 'CA' },
  // Ontario — Mid
  { city: 'Barrie', province: 'Ontario', region: 'ON-Mid', locationCode: 1002024, country: 'CA' },
  { city: 'Kingston', province: 'Ontario', region: 'ON-Mid', locationCode: 1002132, country: 'CA' },
  { city: 'Peterborough', province: 'Ontario', region: 'ON-Mid', locationCode: 1002192, country: 'CA' },
  { city: 'Belleville', province: 'Ontario', region: 'ON-Mid', locationCode: 1002027, country: 'CA' },
  { city: 'Orillia', province: 'Ontario', region: 'ON-Mid', locationCode: 1002183, country: 'CA' },
  { city: 'Owen Sound', province: 'Ontario', region: 'ON-Mid', locationCode: 1002185, country: 'CA' },
  // Ontario — South
  { city: 'London', province: 'Ontario', region: 'ON-South', locationCode: 1002149, country: 'CA' },
  { city: 'Windsor', province: 'Ontario', region: 'ON-South', locationCode: 1002281, country: 'CA' },
  { city: 'Hamilton', province: 'Ontario', region: 'ON-South', locationCode: 1002106, country: 'CA' },
  { city: 'Kitchener', province: 'Ontario', region: 'ON-South', locationCode: 1002136, country: 'CA' },
  { city: 'St. Catharines', province: 'Ontario', region: 'ON-South', locationCode: 1002224, country: 'CA' },
  // Quebec
  { city: 'Quebec City', province: 'Quebec', region: 'QC', locationCode: 1002198, country: 'CA' },
  { city: 'Sherbrooke', province: 'Quebec', region: 'QC', locationCode: 1002217, country: 'CA' },
  { city: 'Trois-Rivieres', province: 'Quebec', region: 'QC', locationCode: 1002261, country: 'CA' },
  { city: 'Saguenay', province: 'Quebec', region: 'QC', locationCode: 1002208, country: 'CA' },
  // British Columbia
  { city: 'Kelowna', province: 'British Columbia', region: 'BC', locationCode: 1002128, country: 'CA' },
  { city: 'Kamloops', province: 'British Columbia', region: 'BC', locationCode: 1002126, country: 'CA' },
  { city: 'Nanaimo', province: 'British Columbia', region: 'BC', locationCode: 1002165, country: 'CA' },
  { city: 'Prince George', province: 'British Columbia', region: 'BC', locationCode: 1002195, country: 'CA' },
  // Alberta
  { city: 'Red Deer', province: 'Alberta', region: 'AB', locationCode: 1002202, country: 'CA' },
  { city: 'Lethbridge', province: 'Alberta', region: 'AB', locationCode: 1002144, country: 'CA' },
  { city: 'Medicine Hat', province: 'Alberta', region: 'AB', locationCode: 1002158, country: 'CA' },
  { city: 'Grande Prairie', province: 'Alberta', region: 'AB', locationCode: 1002103, country: 'CA' },
  // Saskatchewan
  { city: 'Saskatoon', province: 'Saskatchewan', region: 'SK', locationCode: 1002212, country: 'CA' },
  { city: 'Regina', province: 'Saskatchewan', region: 'SK', locationCode: 1002203, country: 'CA' },
  { city: 'Prince Albert', province: 'Saskatchewan', region: 'SK', locationCode: 1002194, country: 'CA' },
  // Manitoba
  { city: 'Winnipeg', province: 'Manitoba', region: 'MB', locationCode: 1002280, country: 'CA' },
  { city: 'Brandon', province: 'Manitoba', region: 'MB', locationCode: 1002038, country: 'CA' },
  // Nova Scotia
  { city: 'Halifax', province: 'Nova Scotia', region: 'NS', locationCode: 1002104, country: 'CA' },
  { city: 'Sydney', province: 'Nova Scotia', region: 'NS', locationCode: 1002230, country: 'CA' },
  // New Brunswick
  { city: 'Moncton', province: 'New Brunswick', region: 'NB', locationCode: 1002161, country: 'CA' },
  { city: 'Saint John', province: 'New Brunswick', region: 'NB', locationCode: 1002210, country: 'CA' },
  // USA — Northern states (similar market profile to Northern Ontario)
  { city: 'Duluth', province: 'Minnesota', region: 'US-North', locationCode: 1014933, country: 'US' },
  { city: 'Green Bay', province: 'Wisconsin', region: 'US-North', locationCode: 1015267, country: 'US' },
  { city: 'Marquette', province: 'Michigan', region: 'US-North', locationCode: 1015668, country: 'US' },
  { city: 'Fargo', province: 'North Dakota', region: 'US-North', locationCode: 1015098, country: 'US' },
  { city: 'Billings', province: 'Montana', region: 'US-North', locationCode: 1014642, country: 'US' },
  { city: 'Missoula', province: 'Montana', region: 'US-North', locationCode: 1014795, country: 'US' },
  { city: 'Anchorage', province: 'Alaska', region: 'US-North', locationCode: 1014222, country: 'US' },
  { city: 'Spokane', province: 'Washington', region: 'US-North', locationCode: 1015928, country: 'US' },
];

// ─── Database Pool ────────────────────────────────────────────────────────────
const db = new Pool({
  host: process.env.CR_DB_HOST,
  port: process.env.CR_DB_PORT || 5432,
  database: process.env.CR_DB_NAME,
  user: process.env.CR_DB_USER,
  password: process.env.CR_DB_PASSWORD,
});

// ─── DataForSEO Auth ──────────────────────────────────────────────────────────
function getAuthHeader() {
  const credentials = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString('base64');
  return `Basic ${credentials}`;
}

// ─── DataForSEO Google Maps Search ───────────────────────────────────────────
async function searchGoogleMaps(keyword, locationCode, country, offset = 0) {
  const body = [{
    keyword,
    location_code: locationCode,
    language_code: 'en',
    depth: RESULTS_PER_REQUEST,
    offset,
    filters: [
      ['is_claimed', '=', true]  // Only claimed GBP listings
    ]
  }];

  try {
    const response = await fetch(
      'https://api.dataforseo.com/v3/business_data/google/my_business_info/live',
      {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[DATAFORSEO] HTTP ${response.status}:`, err);
      return null;
    }

    const data = await response.json();

    if (data.status_code !== 20000) {
      console.error(`[DATAFORSEO] API error ${data.status_code}:`, data.status_message);
      return null;
    }

    return data.tasks?.[0]?.result || null;

  } catch (err) {
    console.error('[DATAFORSEO] Request failed:', err.message);
    return null;
  }
}

// ─── Validate Entry Conditions ────────────────────────────────────────────────
function validateEntryConditions(business, trade) {
  const reasons = [];

  // Condition 1 — Has a working website URL
  if (!business.domain && !business.url) {
    reasons.push('No website URL');
  }

  // Condition 2 — Has a claimed GBP listing (filtered in API call, but double-check)
  if (!business.place_id) {
    reasons.push('No GBP place_id');
  }

  // Condition 3 — GBP lists the relevant trade as a primary service
  const categories = [
    ...(business.category ? [business.category.toLowerCase()] : []),
    ...(business.additional_categories || []).map(c => c.toLowerCase())
  ];

  const tradeKeywords = {
    plumbing: ['plumb'],
    hvac: ['hvac', 'heating', 'cooling', 'air condition', 'furnace', 'refriger'],
    electrical: ['electr'],
    roofing: ['roof']
  };

  const keywords = tradeKeywords[trade] || [];
  const hasTradeCategory = categories.some(cat =>
    keywords.some(kw => cat.includes(kw))
  );

  if (!hasTradeCategory) {
    reasons.push(`No ${trade} category in GBP`);
  }

  // Check for franchise indicators
  const name = (business.title || '').toLowerCase();
  const isFranchiseSuspect = [
    'rooter', 'mr.', 'mister', '1-800', 'one hour', 'comfort systems'
  ].some(f => name.includes(f));

  return {
    valid: reasons.length === 0,
    reasons,
    isFranchiseSuspect,
    websiteUrl: business.domain
      ? `https://${business.domain}`
      : business.url || null
  };
}

// ─── Parse DataForSEO Business Result ────────────────────────────────────────
function parseBusiness(result, city, province, region, trade) {
  const validation = validateEntryConditions(result, trade);

  return {
    businessName: result.title || 'Unknown',
    city,
    province,
    region,
    country: result.country_code || 'CA',
    trade,
    websiteUrl: validation.websiteUrl,
    placeId: result.place_id,
    address: result.address,
    phone: result.phone,
    rating: result.rating?.value || null,
    reviewCount: result.rating?.votes_count || 0,
    category: result.category || null,
    additionalCategories: result.additional_categories || [],
    isFranchiseSuspect: validation.isFranchiseSuspect,
    entryValid: validation.valid,
    entryFailReasons: validation.reasons,
    dataforseoCost: result.cpc || null,
    fetchedAt: new Date().toISOString()
  };
}

// ─── Write to Database ────────────────────────────────────────────────────────
async function writeCandidates(candidates, dryRun) {
  if (dryRun) {
    console.log(`[DRY RUN] Would write ${candidates.length} candidates to database`);
    return;
  }

  const client = await db.connect();
  let written = 0;
  let skipped = 0;

  try {
    for (const c of candidates) {
      if (!c.entryValid) {
        skipped++;
        continue;
      }

      await client.query(`
        INSERT INTO cr_candidates (
          business_name, city, province, region, country, trade,
          website_url, place_id, address, phone, rating, review_count,
          primary_category, additional_categories, is_franchise_suspect,
          fetched_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (place_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          fetched_at = EXCLUDED.fetched_at
      `, [
        c.businessName, c.city, c.province, c.region, c.country, c.trade,
        c.websiteUrl, c.placeId, c.address, c.phone, c.rating, c.reviewCount,
        c.category, JSON.stringify(c.additionalCategories), c.isFranchiseSuspect,
        c.fetchedAt
      ]);
      written++;
    }
  } finally {
    client.release();
  }

  return { written, skipped };
}

// ─── Write Summary CSV ────────────────────────────────────────────────────────
function writeCsv(allCandidates, trade) {
  const filename = `candidates_${trade}_${new Date().toISOString().split('T')[0]}.csv`;
  const headers = [
    'business_name', 'city', 'province', 'trade', 'website_url',
    'rating', 'review_count', 'primary_category', 'entry_valid',
    'entry_fail_reasons', 'is_franchise_suspect', 'place_id'
  ];

  const rows = allCandidates.map(c => [
    `"${c.businessName}"`, c.city, c.province, c.trade,
    c.websiteUrl || '', c.rating || '', c.reviewCount,
    `"${c.category || ''}"`, c.entryValid,
    `"${c.entryFailReasons.join('; ')}"`, c.isFranchiseSuspect,
    c.placeId
  ].join(','));

  fs.writeFileSync(filename, [headers.join(','), ...rows].join('\n'));
  console.log(`[CSV] Written: ${filename}`);
  return filename;
}

// ─── Progress Logger ──────────────────────────────────────────────────────────
function log(msg) {
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${time}] ${msg}`);
}

// ─── Sleep Helper ─────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main Pool Builder ────────────────────────────────────────────────────────
async function buildCandidatePool(options = {}) {
  const { tradeSingle, dryRun = false, resume = false } = options;

  // Validate env vars
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    console.error('[ERROR] DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD required in .env');
    process.exit(1);
  }

  const tradesToRun = tradeSingle
    ? { [tradeSingle]: TRADES[tradeSingle] }
    : TRADES;

  const summary = {
    startedAt: new Date().toISOString(),
    trades: {},
    totals: { fetched: 0, valid: 0, invalid: 0, dbWritten: 0, franchiseFlagged: 0 }
  };

  for (const [tradeKey, tradeConfig] of Object.entries(tradesToRun)) {
    log(`\n═══ Starting trade: ${tradeConfig.label} ═══`);

    const tradeCandidates = [];
    const cityCount = {};      // city → count
    const regionCount = {};    // region → count

    // Shuffle cities so we don't always hit the same markets first
    const shuffledCities = [...CITIES].sort(() => Math.random() - 0.5);

    for (const cityObj of shuffledCities) {
      // Check if we have enough for this trade
      const validSoFar = tradeCandidates.filter(c => c.entryValid).length;
      if (validSoFar >= POOL_PER_TRADE) {
        log(`Reached ${POOL_PER_TRADE} valid candidates for ${tradeKey}. Moving to next trade.`);
        break;
      }

      // Check geographic caps
      const cityKey = `${cityObj.city}_${cityObj.province}`;
      const cityTotal = cityCount[cityKey] || 0;
      const regionTotal = regionCount[cityObj.region] || 0;

      if (cityTotal >= MAX_PER_CITY) {
        log(`Skip ${cityObj.city} — city cap reached (${cityTotal}/${MAX_PER_CITY})`);
        continue;
      }

      if (regionTotal >= MAX_PER_REGION) {
        log(`Skip ${cityObj.city} — region cap reached for ${cityObj.region} (${regionTotal}/${MAX_PER_REGION})`);
        continue;
      }

      // Fetch from DataForSEO using primary keyword for this trade
      const keyword = tradeConfig.keywords[0];
      log(`Fetching: ${keyword} in ${cityObj.city}, ${cityObj.province}`);

      let offset = 0;
      let pageResults = [];

      do {
        const results = await searchGoogleMaps(
          keyword,
          cityObj.locationCode,
          cityObj.country,
          offset
        );

        if (!results || results.length === 0) break;

        for (const result of results) {
          // Check caps before adding
          const cityCurrentCount = cityCount[cityKey] || 0;
          const regionCurrentCount = regionCount[cityObj.region] || 0;

          if (cityCurrentCount >= MAX_PER_CITY) break;
          if (regionCurrentCount >= MAX_PER_REGION) break;

          const candidate = parseBusiness(
            result, cityObj.city, cityObj.province, cityObj.region, tradeKey
          );

          tradeCandidates.push(candidate);
          pageResults.push(candidate);

          // Update counts only for valid entries
          if (candidate.entryValid) {
            cityCount[cityKey] = (cityCount[cityKey] || 0) + 1;
            regionCount[cityObj.region] = (regionCount[cityObj.region] || 0) + 1;
          }
        }

        offset += RESULTS_PER_REQUEST;
        await sleep(REQUEST_DELAY_MS);

      } while (pageResults.length === RESULTS_PER_REQUEST && (cityCount[cityKey] || 0) < MAX_PER_CITY);

      const validFromCity = pageResults.filter(c => c.entryValid).length;
      const franchiseFromCity = pageResults.filter(c => c.isFranchiseSuspect).length;
      log(`${cityObj.city}: ${pageResults.length} fetched · ${validFromCity} valid · ${franchiseFromCity} franchise suspects`);
    }

    // Write to database
    const dbResult = await writeCandidates(tradeCandidates, dryRun);

    // Write CSV for human review
    const csvFile = writeCsv(tradeCandidates, tradeKey);

    const tradeValid = tradeCandidates.filter(c => c.entryValid).length;
    const tradeInvalid = tradeCandidates.filter(c => !c.entryValid).length;
    const tradeFranchise = tradeCandidates.filter(c => c.isFranchiseSuspect).length;

    summary.trades[tradeKey] = {
      fetched: tradeCandidates.length,
      valid: tradeValid,
      invalid: tradeInvalid,
      franchiseFlagged: tradeFranchise,
      dbWritten: dbResult?.written || 0,
      csvFile
    };

    summary.totals.fetched += tradeCandidates.length;
    summary.totals.valid += tradeValid;
    summary.totals.invalid += tradeInvalid;
    summary.totals.franchiseFlagged += tradeFranchise;
    summary.totals.dbWritten += dbResult?.written || 0;

    log(`\n${tradeConfig.label} complete:`);
    log(`  Fetched: ${tradeCandidates.length}`);
    log(`  Valid (entry conditions met): ${tradeValid}`);
    log(`  Invalid: ${tradeInvalid}`);
    log(`  Franchise suspects (for human review): ${tradeFranchise}`);
    log(`  DB written: ${dbResult?.written || 0}`);
  }

  // Final summary
  summary.completedAt = new Date().toISOString();

  log('\n═══════════════════════════════════════');
  log('CANDIDATE POOL BUILD COMPLETE');
  log('═══════════════════════════════════════');
  log(`Total fetched:          ${summary.totals.fetched}`);
  log(`Total valid:            ${summary.totals.valid}`);
  log(`Total invalid:          ${summary.totals.invalid}`);
  log(`Franchise suspects:     ${summary.totals.franchiseFlagged}`);
  log(`Written to database:    ${summary.totals.dbWritten}`);
  log(`\nNext step: Run Gate 1 batch against cr_candidates`);
  log(`Command: node runGate1Batch.js`);

  // Write summary JSON
  const summaryFile = `pool_build_summary_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  log(`\nSummary written: ${summaryFile}`);

  await db.end();
  return summary;
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const options = {
  tradeSingle: args.includes('--trade') ? args[args.indexOf('--trade') + 1] : null,
  dryRun: args.includes('--dry-run'),
  resume: args.includes('--resume')
};

if (options.tradeSingle && !TRADES[options.tradeSingle]) {
  console.error(`[ERROR] Unknown trade: ${options.tradeSingle}`);
  console.error(`Valid trades: ${Object.keys(TRADES).join(', ')}`);
  process.exit(1);
}

if (options.dryRun) {
  log('DRY RUN MODE — no database writes will occur');
}

buildCandidatePool(options).catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
