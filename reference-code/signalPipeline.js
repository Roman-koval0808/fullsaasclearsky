/**
 * ContentRadar — Signal Pipeline Orchestrator
 * server/scoring/signalPipeline.js
 *
 * Called once per business. Orchestrates the complete audit:
 *   1. Gate 1 quality check
 *   2. Parallel page fetching (website + Apify)
 *   3. GBP data fetch (Google Places API)
 *   4. All three method scorers run in parallel
 *   5. Manual/pending signals marked
 *   6. Database writes (cr_signal_scores, cr_page_snapshots, cr_score_runs)
 *   7. Gap score calculated and returned
 *
 * Usage:
 *   const { runPipeline } = require('./signalPipeline');
 *   const result = await runPipeline(business, options);
 *
 * business object:
 * {
 *   id:               UUID from cr_businesses
 *   business_name:    string
 *   trade:            'plumbing' | 'hvac' | 'electrical' | 'roofing'
 *   city:             string
 *   province_state:   string
 *   website_url:      string
 *   facebook_url:     string
 *   nextdoor_url:     string
 *   youtube_url:      string
 *   years_in_business: number | null
 *   cohort:           'cohort1_benchmark' | 'cohort2_licensed'
 *   clearsky_client_id: string | null
 * }
 *
 * options:
 * {
 *   runId:            UUID — links scores to a cr_score_runs row
 *   skipGate1:        bool — skip Gate 1 (use when re-scoring known-good businesses)
 *   gateOnlyMode:     bool — run Gate 1 only, no scoring
 *   signalsOnly:      number[] — score only these signal numbers (for partial re-runs)
 *   skipApify:        bool — skip Apify fetches (cost saving for pre-rank pass)
 *   claudeClient:     Anthropic client instance
 *   db:               pg pool instance (from server/db.js)
 * }
 */

'use strict';

const { fetchContractorContent, getContentForSignal } = require('./pageFetcher');
const { runGate1 } = require('./gate1');
const { scoreAllMethod1 } = require('./scorersMethod1');
const { scoreAllMethod2 } = require('./scorersMethod2');
const { scoreAllMethod3 } = require('./scorersMethod3');

// ─── SIGNAL METADATA ──────────────────────────────────────────────────────────
// Maps signal numbers to their category, stage, and gap-score status.
// Source of truth — matches the locked signal spec.

const SIGNAL_META = {
  // Website
  1:  { name: 'Value Proposition Clarity',        category: 'Website',                   stage: 'discovery',  inGapScore: true  },
  2:  { name: 'Brand Promise & Trust Statement',   category: 'Website',                   stage: 'discovery',  inGapScore: true  },
  3:  { name: 'People & Credibility',              category: 'Website',                   stage: 'discovery',  inGapScore: true  },
  4:  { name: 'Process Transparency',              category: 'Website',                   stage: 'discovery',  inGapScore: true  },
  5:  { name: 'Service Area Clarity',              category: 'Website',                   stage: 'discovery',  inGapScore: true  },
  6:  { name: 'Before & After Gallery',            category: 'Website',                   stage: 'engagement', inGapScore: true  },
  7:  { name: 'Blog & Educational Content',        category: 'Website',                   stage: 'engagement', inGapScore: true  },
  8:  { name: 'FAQ Coverage',                      category: 'Website',                   stage: 'engagement', inGapScore: true  },
  9:  { name: 'Pricing Transparency',              category: 'Website',                   stage: 'conversion', inGapScore: true  },
  10: { name: 'Credentials & Licensing Visibility',category: 'Website',                   stage: 'discovery',  inGapScore: true  },
  // GBP
  11: { name: 'GBP Completeness',                  category: 'Google Business Profile',   stage: 'discovery',  inGapScore: true  },
  12: { name: 'GBP Photo Volume & Quality',        category: 'Google Business Profile',   stage: 'engagement', inGapScore: true  },
  13: { name: 'GBP Review Score & Velocity',       category: 'Google Business Profile',   stage: 'engagement', inGapScore: true  },
  14: { name: 'GBP Review Response Behaviour',     category: 'Google Business Profile',   stage: 'engagement', inGapScore: true  },
  15: { name: 'GBP Posts & Updates',               category: 'Google Business Profile',   stage: 'engagement', inGapScore: true  },
  16: { name: 'GBP Services & Products',           category: 'Google Business Profile',   stage: 'discovery',  inGapScore: true  },
  17: { name: 'GBP Q&A',                           category: 'Google Business Profile',   stage: 'engagement', inGapScore: true  },
  18: { name: 'GBP Contact & Conversion Features', category: 'Google Business Profile',   stage: 'conversion', inGapScore: true  },
  // Facebook
  19: { name: 'Facebook Page Completeness',        category: 'Facebook',                  stage: 'discovery',  inGapScore: true  },
  20: { name: 'Facebook Content & Community Voice',category: 'Facebook',                  stage: 'engagement', inGapScore: true  },
  21: { name: 'Facebook Review Score & Velocity',  category: 'Facebook',                  stage: 'engagement', inGapScore: true  },
  22: { name: 'Facebook Review Response Behaviour',category: 'Facebook',                  stage: 'engagement', inGapScore: true  },
  23: { name: 'Facebook Events',                   category: 'Facebook',                  stage: 'engagement', inGapScore: true  },
  24: { name: 'Facebook Video & Reels',            category: 'Facebook',                  stage: 'engagement', inGapScore: true  },
  // Nextdoor
  25: { name: 'Nextdoor Business Page Presence',   category: 'Nextdoor',                  stage: 'discovery',  inGapScore: true  },
  26: { name: 'Nextdoor Recommendations',          category: 'Nextdoor',                  stage: 'growth',     inGapScore: true  }, // Reclassified May 2026
  27: { name: 'Nextdoor Community Visibility',     category: 'Nextdoor',                  stage: 'growth',     inGapScore: true  },
  // Reviews & Reputation
  28: { name: 'HomeStars Presence & Score',        category: 'Reviews & Reputation',      stage: 'engagement', inGapScore: true  },
  29: { name: 'Houzz Presence & Reviews',          category: 'Reviews & Reputation',      stage: 'engagement', inGapScore: true  },
  30: { name: 'Angi Presence & Reviews',           category: 'Reviews & Reputation',      stage: 'engagement', inGapScore: true  },
  31: { name: 'Aggregate Review Footprint',        category: 'Reviews & Reputation',      stage: 'growth',     inGapScore: true  },
  32: { name: 'Review Sentiment Consistency',      category: 'Reviews & Reputation',      stage: 'growth',     inGapScore: true  },
  // Trades Directory
  33: { name: 'Tier 1 Trades Directory Presence',  category: 'Trades Directory',          stage: 'discovery',  inGapScore: true  },
  34: { name: 'Trade Association Directory',       category: 'Trades Directory',          stage: 'discovery',  inGapScore: true  },
  35: { name: 'BBB Accreditation & Rating',        category: 'Trades Directory',          stage: 'discovery',  inGapScore: true  },
  36: { name: 'Google Local Services Ad Presence', category: 'Trades Directory',          stage: 'discovery',  inGapScore: true  },
  // Citation & NAP
  37: { name: 'Citation Volume & Consistency',     category: 'Citation & NAP',            stage: 'conversion', inGapScore: true  },
  38: { name: 'NAP Consistency Score',             category: 'Citation & NAP',            stage: 'conversion', inGapScore: true  },
  39: { name: 'Schema Markup',                     category: 'Citation & NAP',            stage: 'conversion', inGapScore: true  },
  // Seasonal & Geographic
  40: { name: 'Seasonal Content Readiness',        category: 'Seasonal & Geographic',     stage: 'discovery',  inGapScore: true  },
  41: { name: 'Service Area Content Coverage',     category: 'Seasonal & Geographic',     stage: 'conversion', inGapScore: true  },
  42: { name: 'Seasonal Offer & Campaign Execution',category: 'Seasonal & Geographic',    stage: 'conversion', inGapScore: true  },
  43: { name: 'Geographic Search Visibility',      category: 'Seasonal & Geographic',     stage: 'discovery',  inGapScore: true  },
  // Video
  44: { name: 'Video Content Production',          category: 'Video',                     stage: 'conversion', inGapScore: true  },
  45: { name: 'YouTube Channel Presence',          category: 'Video',                     stage: 'conversion', inGapScore: true  },
  46: { name: 'Video Content Quality & Strategy',  category: 'Video',                     stage: 'growth',     inGapScore: true  },
  47: { name: 'Video Platform Cross-Posting',      category: 'Video',                     stage: 'growth',     inGapScore: true  },
  // AI Authority
  48: { name: 'AI Authority — ChatGPT/Gemini/Perplexity', category: 'AI Authority',      stage: 'growth',     inGapScore: true  },
  49: { name: 'AI Citation Readiness',             category: 'AI Authority',              stage: 'growth',     inGapScore: true  },
  50: { name: 'AI Share of Voice',                 category: 'AI Authority',              stage: 'growth',     inGapScore: true  },
  // Share of Voice
  51: { name: 'Search Share of Voice',             category: 'Share of Voice',            stage: 'growth',     inGapScore: true  },
  52: { name: 'Social Share of Voice',             category: 'Share of Voice',            stage: 'growth',     inGapScore: true  },
  53: { name: 'Competitor Ad & LSA Pressure',      category: 'Share of Voice',            stage: 'growth',     inGapScore: true  },
  54: { name: 'Branded Search Presence',           category: 'Share of Voice',            stage: 'growth',     inGapScore: true  },
  // Contact Friction
  55: { name: 'Click-to-Call Above the Fold',      category: 'Contact Friction',          stage: 'conversion', inGapScore: true  },
  56: { name: 'Emergency Pathway Clarity',         category: 'Contact Friction',          stage: 'conversion', inGapScore: true  },
  57: { name: 'Quote/Booking Friction',            category: 'Contact Friction',          stage: 'conversion', inGapScore: true  },
  58: { name: 'After-Hours Availability Signal',   category: 'Contact Friction',          stage: 'conversion', inGapScore: true  },
  59: { name: 'Response Time Commitment',          category: 'Contact Friction',          stage: 'conversion', inGapScore: true  },
  60: { name: 'Mobile Experience Quality',         category: 'Contact Friction',          stage: 'conversion', inGapScore: true  },
  // Outside gap score — A2P
  61: { name: 'Inbound Inquiry Volume & Trajectory', category: 'A2P Content Intelligence', stage: 'engagement', inGapScore: false },
  62: { name: 'Inquiry Channel Diversity',           category: 'A2P Content Intelligence', stage: 'engagement', inGapScore: false },
  63: { name: 'Anonymous Web Visit Behaviour',       category: 'A2P Content Intelligence', stage: 'discovery',  inGapScore: false },
  64: { name: 'Inquiry to Conversion Rate',          category: 'A2P Content Intelligence', stage: 'conversion', inGapScore: false },
  65: { name: 'Intent Bucket Distribution',          category: 'A2P Content Intelligence', stage: 'engagement', inGapScore: false },
  66: { name: 'Call Tracking Attribution',           category: 'A2P Content Intelligence', stage: 'growth',     inGapScore: false },
  // Outside gap score — Referral
  67: { name: 'Realtor & Real Estate Network',     category: 'Referral Network',          stage: 'growth',     inGapScore: false },
  68: { name: 'Property Manager Network',          category: 'Referral Network',          stage: 'growth',     inGapScore: false },
  69: { name: 'Insurance Adjuster & Restoration',  category: 'Referral Network',          stage: 'growth',     inGapScore: false },
  70: { name: 'Building Inspector & Municipal',    category: 'Referral Network',          stage: 'growth',     inGapScore: false },
  71: { name: 'Hardware Store & Supplier Network', category: 'Referral Network',          stage: 'growth',     inGapScore: false },
  72: { name: 'Cross-Trade Referral Network',      category: 'Referral Network',          stage: 'growth',     inGapScore: false },
};

// Signals that require manual entry — not auto-scored
const MANUAL_SIGNALS = new Set([
  67, 68, 69, 70, 71, 72, // Referral network — Meeting 1 intake
]);

// Signals pending ValueSERP integration — currently manual
const PENDING_VALUESERP = new Set([
  43, 51, 53, 54, // Geographic + search SOV
]);

// Signals pending Apify AI queries — currently manual
const PENDING_AI_AUTOMATION = new Set([
  48, 49, 50, // AI authority + citation + SOV
]);

// A2P signals — only for licensed clients with A2P onboarded
const A2P_SIGNALS = new Set([
  61, 62, 63, 64, 65, 66,
]);

// ─── MANUAL SIGNAL PLACEHOLDER ────────────────────────────────────────────────

function manualPlaceholder(signalNum, reason) {
  const meta = SIGNAL_META[signalNum];
  return {
    signal: signalNum,
    signal_name: meta?.name || `Signal ${signalNum}`,
    category: meta?.category || 'Unknown',
    stage: meta?.stage || null,
    in_gap_score: meta?.inGapScore ?? false,
    score: null,
    note: reason,
    method: 'manual',
    needs_review: true,
  };
}

// ─── GBP FETCHER ──────────────────────────────────────────────────────────────

async function fetchGBP(businessName, city, apiKey) {
  try {
    const query = encodeURIComponent(`${businessName} ${city}`);
    const fields = 'name,rating,user_ratings_total,photos,business_status,opening_hours,website,formatted_phone_number,types,editorial_summary,serves_cuisine';
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name,rating,user_ratings_total&key=${apiKey}`;

    const res = await fetch(url, { timeout: 10000 });
    const data = await res.json();
    const placeId = data.candidates?.[0]?.place_id;

    if (!placeId) return null;

    // Fetch full place details
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,photos,opening_hours,website,formatted_phone_number,types,reviews,editorial_summary,serves_beer&key=${apiKey}`;
    const detailRes = await fetch(detailUrl, { timeout: 10000 });
    const detail = await detailRes.json();

    const place = detail.result || {};
    return {
      place_id: placeId,
      gbp_name: place.name,
      rating: place.rating || 0,
      review_count: place.user_ratings_total || 0,
      photo_count: (place.photos || []).length,
      hours: place.opening_hours?.periods || null,
      description: place.editorial_summary?.overview || null,
      messaging_enabled: false, // Requires GMB API OAuth
      booking_button: false,    // Requires GMB API OAuth
      post_count: null,         // Requires GMB API OAuth
      qa_count: null,           // Requires GMB API OAuth
      services_list: [],        // Requires GMB API OAuth
      recent_reviews: (place.reviews || []).map(r => ({
        time: r.time,
        rating: r.rating,
        text: r.text,
        owner_reply: r.author_reply || null,
      })),
    };
  } catch {
    return null;
  }
}

// ─── SCORE NORMALISER ─────────────────────────────────────────────────────────
// Converts scorer output arrays into a consistent signal score object

function normaliseScore(scorerResult, runId, businessId, snapshotId = null) {
  const meta = SIGNAL_META[scorerResult.signal] || {};
  return {
    business_id:  businessId,
    run_id:       runId,
    signal_num:   scorerResult.signal,
    signal_name:  meta.name || scorerResult.signal_name || `Signal ${scorerResult.signal}`,
    category:     meta.category || scorerResult.category || 'Unknown',
    stage:        meta.stage || scorerResult.stage || null,
    in_gap_score: meta.inGapScore ?? true,
    score:        scorerResult.score,
    score_note:   scorerResult.note,
    score_method: scorerResult.method || 'deterministic',
    snapshot_id:  snapshotId,
    api_data:     scorerResult.inputs ? JSON.stringify(scorerResult.inputs) : null,
    claude_prompt: scorerResult.claudeCalled ? '[stored in scorer]' : null,
    needs_review: scorerResult.needs_review || false,
    scored_at:    new Date().toISOString(),
  };
}

// ─── DATABASE WRITER ──────────────────────────────────────────────────────────

async function writeScoresToDB(db, scores, runId, businessId) {
  if (!db) return; // No-op if no DB provided (test mode)

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    for (const score of scores) {
      await client.query(`
        INSERT INTO cr_signal_scores
          (business_id, run_id, signal_num, signal_name, category, stage,
           in_gap_score, score, score_note, score_method, snapshot_id,
           api_data, claude_prompt, scored_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (business_id, run_id, signal_num)
        DO UPDATE SET
          score = EXCLUDED.score,
          score_note = EXCLUDED.score_note,
          score_method = EXCLUDED.score_method,
          scored_at = EXCLUDED.scored_at
      `, [
        score.business_id, score.run_id, score.signal_num, score.signal_name,
        score.category, score.stage, score.in_gap_score, score.score,
        score.score_note, score.score_method, score.snapshot_id,
        score.api_data, score.claude_prompt, score.scored_at,
      ]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── GAP SCORE CALCULATOR ─────────────────────────────────────────────────────

function calculateGapScore(scores) {
  const gapSignals = scores.filter(s => s.in_gap_score && s.score !== null && s.score >= 0);
  const totalScore = gapSignals.reduce((sum, s) => sum + (s.score || 0), 0);
  const maxScore   = 180; // 60 signals × 3 points

  const byStage = { discovery: 0, engagement: 0, conversion: 0, growth: 0 };
  const maxByStage = { discovery: 45, engagement: 54, conversion: 45, growth: 36 };

  gapSignals.forEach(s => {
    if (s.stage && byStage[s.stage] !== undefined) {
      byStage[s.stage] += (s.score || 0);
    }
  });

  return {
    totalScore,
    maxScore,
    contentGapPct: Math.round(totalScore / maxScore * 100 * 10) / 10,
    signalsScored: gapSignals.length,
    signalsPending: scores.filter(s => s.in_gap_score && s.score === null).length,
    byStage,
    maxByStage,
    byStageGapPct: {
      discovery:  Math.round(byStage.discovery  / maxByStage.discovery  * 100),
      engagement: Math.round(byStage.engagement / maxByStage.engagement * 100),
      conversion: Math.round(byStage.conversion / maxByStage.conversion * 100),
      growth:     Math.round(byStage.growth     / maxByStage.growth     * 100),
    },
  };
}

// ─── MAIN PIPELINE ────────────────────────────────────────────────────────────

/**
 * Run the full scoring pipeline for one business.
 *
 * @param {Object} business — business record from cr_businesses
 * @param {Object} options  — pipeline options
 * @returns {Object} pipelineResult — full scored result
 */
async function runPipeline(business, options = {}) {
  const {
    runId        = null,
    skipGate1    = false,
    gateOnlyMode = false,
    skipApify    = false,
    claudeClient = null,
    db           = null,
  } = options;

  const startTime = Date.now();
  const businessId = business.id;
  const trade      = business.trade || 'plumbing';
  const city       = business.city || '';

  const pipelineResult = {
    businessId,
    businessName: business.business_name,
    trade,
    city,
    runId,
    gate1: null,
    scores: [],
    gapScore: null,
    errors: [],
    durationMs: 0,
    claudeCallCount: 0,
  };

  // ── STEP 1: Gate 1 ──────────────────────────────────────────────────────────
  if (!skipGate1) {
    // GBP data needed for Gate 1 — fetch now
    const gbpForGate = await fetchGBP(
      business.business_name,
      city,
      process.env.GOOGLE_PLACES_API_KEY
    ).catch(() => null);

    const gate1Result = runGate1({
      rating:          gbpForGate?.rating || 0,
      reviewCount:     gbpForGate?.review_count || 0,
      reviews:         gbpForGate?.recent_reviews || [],
      yearsInBusiness: business.years_in_business,
      websiteUrl:      business.website_url || '',
      websiteText:     '',
      businessName:    business.business_name,
    });

    pipelineResult.gate1 = gate1Result;

    // Write Gate 1 log to DB
    if (db) {
      await db.query(`
        INSERT INTO cr_gate1_log
          (business_id, run_id, result, primary_reason, all_reasons, all_flags,
           rating_checked, review_count_checked, years_in_business,
           min_reviews_required, recent_review_count, recent_avg_rating,
           website_url, gate1_constants, evaluated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      `, [
        businessId, runId,
        gate1Result.eliminated ? 'eliminated' : gate1Result.flag ? 'flagged' : 'passed',
        gate1Result.reason,
        gate1Result.eliminations,
        gate1Result.flags,
        gate1Result.details.rating.value,
        gate1Result.details.reviewCount.value,
        business.years_in_business,
        gate1Result.details.reviewCount.threshold,
        gate1Result.details.reviewRecency.value,
        gate1Result.details.reviewRecency.avgRating,
        business.website_url,
        JSON.stringify(gate1Result.constants),
      ]).catch(err => pipelineResult.errors.push(`Gate1 DB write: ${err.message}`));
    }

    if (gate1Result.eliminated && !skipGate1) {
      pipelineResult.durationMs = Date.now() - startTime;
      return pipelineResult; // Stop here — business eliminated
    }
    if (gateOnlyMode) {
      pipelineResult.durationMs = Date.now() - startTime;
      return pipelineResult;
    }
  }

  // ── STEP 2: Parallel fetches ────────────────────────────────────────────────
  // Website pages + GBP + Apify all fire simultaneously

  const [websiteContent, gbpData, apifyFacebook, apifyNextdoor, apifyHomeStars] =
    await Promise.allSettled([
      // Website
      business.website_url
        ? fetchContractorContent(business.website_url)
        : Promise.resolve({}),

      // GBP
      fetchGBP(business.business_name, city, process.env.GOOGLE_PLACES_API_KEY),

      // Apify — Facebook (skip if skipApify or no URL)
      (!skipApify && business.facebook_url)
        ? fetchApifyPlatform('facebook', business.facebook_url)
        : Promise.resolve(null),

      // Apify — Nextdoor
      (!skipApify && business.nextdoor_url)
        ? fetchApifyPlatform('nextdoor', business.nextdoor_url)
        : Promise.resolve(null),

      // Apify — HomeStars
      (!skipApify && business.homestars_url)
        ? fetchApifyPlatform('homestars', business.homestars_url)
        : Promise.resolve(null),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

  const content = websiteContent || {};
  const gbp = gbpData || {};

  // ── STEP 3: Build context objects for scorers ────────────────────────────────
  // Each scorer expects a context object with pre-computed values.
  // This separates data extraction from scoring logic.

  const fbData   = apifyFacebook?.scraped_data || {};
  const ndData   = apifyNextdoor?.scraped_data || {};
  const hsData   = apifyHomeStars?.scraped_data || {};

  const method1Data = {
    yearsInBusiness: business.years_in_business,
    gbp,
    facebook:  { scraped_data: fbData },
    nextdoor:  { scraped_data: ndData },
    homestars: { scraped_data: hsData },
    houzz:     null,  // Wire when Apify Houzz actor validated
    angi:      null,  // Wire when Apify Angi actor validated
    citations: { totalCitations: 0 },  // Wire when directory crawl built
    nap:       { totalSourcesChecked: 0, inconsistencies: [] },
    video:     {
      youtubeVideoCount:  0,  // Wire YouTube API
      facebookVideoCount: (fbData.videos || []).length,
    },
    youtube:   {},  // Wire YouTube Data API
  };

  const method2Context = {
    s6:  { imageCount: estimateImageCount(content), hasGalleryPage: !!content.gallery },
    s7:  { blogPostCount: estimateBlogPosts(content), lastPostDaysAgo: 365, hasBlogSection: !!content.blog },
    s8:  { faqQuestionCount: estimateFAQCount(content), hasFAQSection: !!content.faq },
    s19: { pageExists: !!business.facebook_url, claimed: !!(fbData.name), hasCTA: !!(fbData.ctaType), aboutSection: !!(fbData.about), hasProfilePhoto: !!(fbData.profilePicUrl) },
    s20: { postCount30Days: recentPostCount(fbData.posts, 30), postCount90Days: recentPostCount(fbData.posts, 90), hasGroupActivity: false },
    s24: { videoCount: (fbData.videos || []).length, reelCount: (fbData.reels || []).length, mostRecentVideoDaysAgo: 90 },
    s25: { pageExists: !!business.nextdoor_url, claimed: !!(ndData.name), serviceAreaConfigured: !!(ndData.serviceArea) },
    s27: { organicMentionCount: ndData.organicMentions || 0, mentionWindowDays: 90 },
    s31: { platformsWithReviews: getPlatformsWithReviews(gbp, fbData, hsData), totalReviews: getTotalReviews(gbp, fbData, hsData) },
    s32: { totalReviews: getTotalReviews(gbp, fbData, hsData), platformCount: getPlatformsWithReviews(gbp, fbData, hsData).length, avgRating: gbp.rating || 0 },
    s33: { directoriesPresent: [], claimedCount: 0 }, // Wire directory scraper
    s34: { associationsFound: [], trade },
    s35: { bbbListed: false, accredited: false, rating: '', complaintsOpen: 0 },
    s36: { lsaVerified: false, lsaActive: false, googleGuaranteed: false, primaryKeywordPresent: false },
    s39: { schemaTypes: [], hasLocalBusiness: false, hasErrors: false, serviceSchemaCount: 0 },
    s40: { seasonalPagesFound: 0, gbpSeasonalPosts: 0, contentPublishedBeforePeak: false, trade },
    s41: { serviceAreaPageCount: content.service_area ? 1 : 0, communitiesCovered: [], protectedMarketCommunities: [] },
    s42: { campaignCount12Mo: 0, channelsUsed: [], launchedBeforePeak: false },
    s46: { totalVideoCount: (fbData.videos || []).length, hasEducationalContent: false, hasProjectReveals: false, titlesOptimised: false },
    s47: { platformsWithVideo: [], matchingContentFound: false },
    s51: { mapPackPosition: null, organicRank: null, keywordsInTop3: 0, totalKeywordsChecked: 0 },
    s52: { ownPageMentions: 0, communityMentions: ndData.organicMentions || 0, competitorMentions: 0 },
    s53: { competitorLSACount: 0, competitorAdCount: 0, ownLSAActive: false, ownMapPackPosition: null },
    s54: { brandedRank: null, gbpAppearsForBrand: !!gbp.place_id, directoryListingsForBrand: 0, estimatedBrandedVolume: 0 },
    s57: { hasQuoteForm: hasQuoteForm(content), hasOnlineBooking: hasBookingWidget(content), formFieldCount: 4, responseTimeStated: false },
    s60: { mobileScore: 0, lcpSeconds: null, clsScore: null, fidMs: null, hasClickToCall: hasClickToCall(content) },
  };

  const method3Context = {
    s1:  { trade, city },
    s2:  { trade },
    s3:  { trade },
    s4:  { trade },
    s5:  { city, protectedMarketCommunities: [] },
    s9:  { trade },
    s10: { trade },
    s43: { trade, city, communitiesRanking: [], totalCommunities: 0 },
    s48: { trade, city, chatgptMentioned: false, geminiMentioned: false, perplexityMentioned: false, queriesRun: 0 },
    s49: { trade, hasSchema: false, faqCount: estimateFAQCount(content), qaCount: gbp.qa_count || 0 },
    s50: { trade, city, contractorMentionCount: 0, competitorMentionCount: 0, totalQueriesRun: 0 },
    s55: { hasTelLink: hasClickToCall(content), phoneInHeader: true, stickyMobileHeader: false, emergencyCTA: hasEmergencyCTA(content) },
    s56: { trade },
    s58: { trade, gbpHours: formatGBPHours(gbp.hours) },
    s59: { trade },
  };

  // ── STEP 4: Run all three method scorers in parallel ────────────────────────
  const [m1Results, m2Results, m3Results] = await Promise.all([
    // Method 1: deterministic — no Claude, instant
    Promise.resolve(scoreAllMethod1(method1Data)),

    // Method 2: gate + Claude — fires in parallel
    scoreAllMethod2(
      { content, context: method2Context },
      claudeClient
    ),

    // Method 3: pure Claude — all 15 fire simultaneously
    scoreAllMethod3(
      { content, context: method3Context },
      claudeClient
    ),
  ]);

  // ── STEP 5: Assemble all scored signals ─────────────────────────────────────
  const allScored = [
    ...m1Results.map(s => normaliseScore(s, runId, businessId)),
    ...m2Results.map(s => normaliseScore(s, runId, businessId)),
    ...m3Results.map(s => normaliseScore(s, runId, businessId)),
  ];

  // ── STEP 6: Add manual/pending signal placeholders ──────────────────────────
  // Signals not yet scored get a null score and needsReview flag

  const scoredSignalNums = new Set(allScored.map(s => s.signal_num));

  // Manual referral network (67–72)
  for (const sig of MANUAL_SIGNALS) {
    if (!scoredSignalNums.has(sig)) {
      allScored.push({
        ...manualPlaceholder(sig, 'Self-reported in Meeting 1 — not yet entered.'),
        business_id: businessId,
        run_id: runId,
        scored_at: new Date().toISOString(),
      });
    }
  }

  // ValueSERP pending
  for (const sig of PENDING_VALUESERP) {
    if (!scoredSignalNums.has(sig)) {
      allScored.push({
        ...manualPlaceholder(sig, 'ValueSERP integration pending — manual scoring required.'),
        business_id: businessId,
        run_id: runId,
        scored_at: new Date().toISOString(),
      });
    }
  }

  // AI automation pending (48–50 if not already scored by Method 3)
  for (const sig of PENDING_AI_AUTOMATION) {
    if (!scoredSignalNums.has(sig)) {
      allScored.push({
        ...manualPlaceholder(sig, 'AI platform queries not yet automated — manual scoring required.'),
        business_id: businessId,
        run_id: runId,
        scored_at: new Date().toISOString(),
      });
    }
  }

  // A2P signals
  for (const sig of A2P_SIGNALS) {
    allScored.push({
      ...manualPlaceholder(sig, business.clearsky_client_id
        ? 'A2P data feed — activates after platform onboarding.'
        : 'A2P signals — licensed clients only.'),
      business_id: businessId,
      run_id: runId,
      scored_at: new Date().toISOString(),
    });
  }

  // ── STEP 7: Calculate gap score ─────────────────────────────────────────────
  const gapScore = calculateGapScore(allScored);

  // ── STEP 8: Write to database ────────────────────────────────────────────────
  if (db) {
    await writeScoresToDB(db, allScored, runId, businessId)
      .catch(err => pipelineResult.errors.push(`DB write: ${err.message}`));
  }

  // ── STEP 9: Assemble result ──────────────────────────────────────────────────
  pipelineResult.scores = allScored;
  pipelineResult.gapScore = gapScore;
  pipelineResult.claudeCallCount = allScored.filter(s => s.score_method === 'pure_claude' || s.score_method === 'rules_gate_claude').length;
  pipelineResult.durationMs = Date.now() - startTime;

  return pipelineResult;
}

// ─── BATCH RUNNER ─────────────────────────────────────────────────────────────

/**
 * Run the pipeline against multiple businesses.
 * Processes in batches to avoid overwhelming APIs.
 *
 * @param {Array}  businesses — array of business objects
 * @param {Object} options    — same as runPipeline options + batchSize
 * @returns {Object} { results, summary }
 */
async function runBatchPipeline(businesses, options = {}) {
  const { batchSize = 5, ...pipelineOptions } = options;
  const results = [];
  const summary = {
    total: businesses.length,
    scored: 0,
    eliminated: 0,
    errors: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    totalClaudeCalls: 0,
  };

  // Process in batches
  for (let i = 0; i < businesses.length; i += batchSize) {
    const batch = businesses.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize)+1}/${Math.ceil(businesses.length/batchSize)} — businesses ${i+1}–${Math.min(i+batchSize, businesses.length)}`);

    const batchResults = await Promise.all(
      batch.map(b => runPipeline(b, pipelineOptions).catch(err => ({
        businessId: b.id,
        businessName: b.business_name,
        error: err.message,
        scores: [],
        gapScore: null,
      })))
    );

    results.push(...batchResults);

    batchResults.forEach(r => {
      if (r.error) {
        summary.errors++;
      } else if (r.gate1?.eliminated) {
        summary.eliminated++;
      } else {
        summary.scored++;
        summary.totalDurationMs += r.durationMs || 0;
        summary.totalClaudeCalls += r.claudeCallCount || 0;
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < businesses.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  summary.avgDurationMs = summary.scored > 0
    ? Math.round(summary.totalDurationMs / summary.scored)
    : 0;

  return { results, summary };
}

// ─── CONTENT DETECTION HELPERS ────────────────────────────────────────────────

function estimateImageCount(content) {
  const text = (content.gallery || '') + (content.homepage || '');
  const matches = text.match(/\.(jpg|jpeg|png|webp|gif)/gi) || [];
  return matches.length;
}

function estimateBlogPosts(content) {
  if (!content.blog) return 0;
  const headings = (content.blog.match(/##[^#]/g) || []).length;
  return Math.max(headings, 1);
}

function estimateFAQCount(content) {
  const text = content.faq || content.homepage || '';
  const questions = (text.match(/\?/g) || []).length;
  return Math.min(questions, 50);
}

function recentPostCount(posts, days) {
  if (!posts || !Array.isArray(posts)) return 0;
  const cutoff = Date.now() - days * 86400 * 1000;
  return posts.filter(p => {
    const t = p.time || p.timestamp || p.created_time || 0;
    return (typeof t === 'number' ? t * 1000 : new Date(t).getTime()) >= cutoff;
  }).length;
}

function getPlatformsWithReviews(gbp, fb, hs) {
  const platforms = [];
  if ((gbp.review_count || 0) > 0)   platforms.push('GBP');
  if ((fb.ratingCount || 0) > 0)     platforms.push('Facebook');
  if ((hs.reviewCount || 0) > 0)     platforms.push('HomeStars');
  return platforms;
}

function getTotalReviews(gbp, fb, hs) {
  return (gbp.review_count || 0) + (fb.ratingCount || 0) + (hs.reviewCount || 0);
}

function hasClickToCall(content) {
  const text = Object.values(content).join(' ');
  return /tel:|click.?to.?call|tap.?to.?call/i.test(text);
}

function hasEmergencyCTA(content) {
  const text = content.homepage || '';
  return /emergency|24\/7|24 hours|burst pipe|no heat/i.test(text);
}

function hasQuoteForm(content) {
  const text = Object.values(content).join(' ');
  return /get a quote|request a quote|free estimate|contact form/i.test(text);
}

function hasBookingWidget(content) {
  const text = Object.values(content).join(' ');
  return /book online|schedule online|calendly|jobber|servicetitan|housecall/i.test(text);
}

function formatGBPHours(hours) {
  if (!hours) return 'not available';
  // Simplified — returns a readable string
  return Array.isArray(hours)
    ? hours.map(h => `${h.open?.day}: ${h.open?.time}–${h.close?.time}`).join(', ')
    : String(hours);
}

// Apify stub — wire actual Apify API calls here
async function fetchApifyPlatform(platform, url) {
  // TODO: Wire Apify actor calls
  // return await apifyClient.actor('apify/facebook-page-scraper').call({ url });
  return null;
}

module.exports = {
  runPipeline,
  runBatchPipeline,
  calculateGapScore,
  SIGNAL_META,
  MANUAL_SIGNALS,
  PENDING_VALUESERP,
  PENDING_AI_AUTOMATION,
};


// ─── TEST ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const testBusiness = {
    id: 'test-uuid-001',
    business_name: 'Timmins Best Plumbing',
    trade: 'plumbing',
    city: 'Timmins',
    province_state: 'ON',
    website_url: null,   // Set a real URL to test live fetching
    facebook_url: null,
    nextdoor_url: null,
    years_in_business: 10,
    cohort: 'cohort1_benchmark',
    clearsky_client_id: null,
  };

  console.log('\n─── Pipeline Test (no DB, no Claude, no live fetches) ───\n');
  runPipeline(testBusiness, {
    runId: 'test-run-001',
    skipGate1: true,   // Skip Gate 1 so we can see scorer output
    skipApify: true,
    claudeClient: null,
    db: null,
  }).then(result => {
    console.log(`Business:       ${result.businessName}`);
    console.log(`Duration:       ${result.durationMs}ms`);
    console.log(`Signals scored: ${result.scores.length}`);
    console.log(`Gap score:      ${result.gapScore?.totalScore}/${result.gapScore?.maxScore} (${result.gapScore?.contentGapPct}%)`);
    console.log(`Needs review:   ${result.scores.filter(s=>s.needs_review).length} signals`);
    console.log('\nStage breakdown:');
    Object.entries(result.gapScore?.byStage || {}).forEach(([stage, score]) => {
      const max = result.gapScore.maxByStage[stage];
      const pct = result.gapScore.byStageGapPct[stage];
      console.log(`  ${stage.padEnd(12)} ${score}/${max} (${pct}%)`);
    });
    if (result.errors.length) {
      console.log('\nErrors:', result.errors);
    }
  }).catch(console.error);
}
