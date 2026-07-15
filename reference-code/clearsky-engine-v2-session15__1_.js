/**
 * ClearSky Software -- Digital Health Diagnostic
 * Revenue Gap Calculation Engine v2.4
 * 
 * This module takes the complete diagnosticData object assembled from all
 * API layers and returns a fully calculated results object ready for the
 * frontend to render.
 * 
 * All benchmarks are sourced -- see clearsky-diagnostic-spec.docx for citations.
 * 
 * Usage:
 *   const { calculateDiagnostic } = require('./clearsky-engine');
 *   const results = calculateDiagnostic(diagnosticData);
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// BENCHMARK CONSTANTS -- all sourced, do not adjust without citation
// ─────────────────────────────────────────────────────────────

const BENCHMARKS = {

  // Map Pack CTR by position -- BrightLocal / Local SEO Guide
  mapPackCTR: { 1: 0.44, 2: 0.24, 3: 0.17, none: 0.03, organic1: 0.03 },

  // GBP star rating CTR penalty vs 4.5-star baseline -- BrightLocal 2026
  gbpCtrPenalty: {
    high:   { min: 4.5, max: 5.0, penalty: 0.00 }, // baseline
    good:   { min: 4.0, max: 4.4, penalty: 0.18 },
    low:    { min: 3.5, max: 3.9, penalty: 0.31 },
    poor:   { min: 3.0, max: 3.4, penalty: 0.44 },
    bad:    { min: 0.0, max: 2.9, penalty: 0.60 }
  },

  // Review count credibility threshold -- BrightLocal local consumer research
  reviewCredibilityThreshold: 25,
  reviewCredibilityPenalty: 0.15, // additional CTR penalty below threshold

  // Citation benchmarks -- BrightLocal 2024 local citation study
  citationBenchmark: 40,
  citationMultipliers: [
    { max: 9,  multiplier: 1.28 },
    { max: 24, multiplier: 1.19 },
    { max: 39, multiplier: 1.10 },
    { max: Infinity, multiplier: 1.00 }
  ],
  napMismatchMultiplier: 1.08,
  schemaAbsentAiMultiplier: 1.12, // applied to AI visibility risk multiplier

  // Lighthouse performance score to conversion rate -- Portent Page Speed Study 2024
  lighthouseConversionRates: [
    { minScore: 90, convRate: 0.39 },
    { minScore: 70, convRate: 0.31 },
    { minScore: 50, convRate: 0.22 },
    { minScore: 0,  convRate: 0.16 }
  ],

  // Organic traffic conversion rate for trades -- WebFX 2026 Home Services Benchmarks
  organicConversionRate: 0.035,

  // Home services call-to-purchase rate -- Google / Invoca
  callToPurchaseRate: 0.40,

  // Click-to-call rate from search -- Invoca home services research 2025
  clickToCallRate: 0.62,

  // No-callback rate for missed calls -- Invoca 2025 / PATLive research
  noCallbackRate: 0.82,

  // Ratio of search clicks that visit site vs call directly from Map Pack
  clickToSiteRatio: 0.60,

  // AI risk multipliers by platform visibility score (0-4) -- Gartner / Semrush
  aiRiskMultipliers: [1.20, 1.15, 1.10, 1.05, 1.00],

  // Engagement readiness conversion multipliers -- composite research
  engagementMultipliers: [
    { minScore: 7, multiplier: 1.00 },
    { minScore: 5, multiplier: 0.85 },
    { minScore: 3, multiplier: 0.70 },
    { minScore: 0, multiplier: 0.55 }
  ],

  // Paid marketing waste multipliers by organic health score
  paidWasteMultipliers: [
    { maxHealth: 0.40, wastePct: 0.45 },
    { maxHealth: 0.60, wastePct: 0.25 },
    { maxHealth: 1.00, wastePct: 0.10 }
  ],

  // Social voice adjustments
  socialSentimentThreshold: 0.70, // below this = apply sentiment uplift
  socialSentimentUplift: 0.08,    // 8% uplift to GBP gap
  unansweredMentionThreshold: 5,
  unansweredMentionFactor: 0.15,  // x job value per unanswered mention

  // Capacity calculation -- industry benchmark
  tradesJobHours: 8,           // hours per job per crew
  capacityTimeSavingRate: 0.40, // ClearSky returns 40% of admin hours. Updated v2.3 (was 0.80).
                                // Conservative v1 baseline -- recalibrate with real client data.
  realisticCapacityCeiling: 0.85, // v1 -- no trades business runs at 100%.
                                  // 85% is realistic full capacity. Recalibrate with real data.
  adminHourlyRateDefault: 30,  // default owner/manager hourly value for admin cost saving
                               // used when adminHourlyRate not provided at intake
  adminHoursPerWeekDefault: 8, // default admin hours per week -- replaces nonBillablePct (retired v2.3)

  // ── Social Content Model -- Session 6 / v2.3
  socialPostingGapRate: 0.10,          // Posting_Gap coefficient -- v1 estimate
  socialEngagementGapRate: 0.03,       // Engagement_Gap_Social coefficient -- v1 estimate
  socialResponseGapRate: 0.10,         // Response_Gap coefficient -- v1 estimate
  minSocialPostsPerMonth: 2,           // floor -- at capacity ceiling, maintain presence only
  baseSocialPostsPerMonth: 4,          // base -- used in contentBenchmark() scaling
  maxSocialPostsPerMonth: 6,           // cap -- maximum realistic for trades owner
  socialPostingCeilingThreshold: 0.05, // capacity gap below which posting floors at minimum

  // ── Capacity-Aware Content Model benchmarks -- Session 6 / v2.3
  gbpPostingMin: 1,   gbpPostingBase: 2,   gbpPostingMax: 4,
  contentPublishingMin: 0.5, contentPublishingBase: 1, contentPublishingMax: 2,
  faqCadenceMin: 0,   faqCadenceBase: 1,   faqCadenceMax: 2,

  // Review response rate benchmark -- BrightLocal 2026
  reviewResponseBenchmark: 0.88, // 88% of consumers use businesses that respond
  reviewResponseFloor: 0.47,     // 47% use businesses that don't respond

  // ── LAYER 12: Canonical Health Agent -- Session 2 addition
  // Canonical alignment percentage thresholds
  canonicalHealthThresholds: [
    { minPct: 90, status: 'green',  suppressionMult: 1.00, label: 'Fully aligned'        },
    { minPct: 70, status: 'amber',  suppressionMult: 1.08, label: 'Minor misalignments'  },
    { minPct: 50, status: 'red',    suppressionMult: 1.16, label: 'Significant gaps'     },
    { minPct: 0,  status: 'red',    suppressionMult: 1.25, label: 'Critical misalignment'}
  ],

  // Duplicate GBP listing penalty -- applied on top of suppression multiplier
  duplicateGbpMultiplier: 1.05,

  // AI platform canonical accuracy thresholds
  aiCanonicalAccuracyThreshold: 0.70, // below this = AI platforms misrepresenting the business

  // Canonical suppression applies to these layers
  canonicalSuppressedLayers: ['gbp', 'rank', 'citations', 'aiVisibility'],

  // Personalization Capture Model ceiling -- v1 estimate, calibrate against real client data
  personalizationCaptureCeiling: 0.85,

  // ── Brand Tenure Modifier -- Session 7 / v2.4
  // Unconditional multiplier on capture rate based on years in business.
  // Reflects earned offline trust independent of digital presence.
  // Absence of digital brand equity signals does NOT reduce this modifier.
  // Applied to capture rate only -- does not create implied revenue above zero.
  brandTenureTiers: [
    { minYears: 21, modifier: 1.15, label: 'Established'  }, // multi-generational recognition
    { minYears: 11, modifier: 1.08, label: 'Recognised'   }, // meaningful local recognition
    { minYears: 6,  modifier: 1.00, label: 'Established'  }, // neutral baseline
    { minYears: 3,  modifier: 0.95, label: 'Building'     }, // starting to build name recognition
    { minYears: 0,  modifier: 0.85, label: 'New'          }  // no ambient recognition yet
  ],
  yearsInBusinessDefault: 5, // conservative default -- assumes limited digital equity

  // ── Market Demand Index -- Session 7 / v2.4
  marketDemandTiers: {
    booming:   { multiplier: 1.15, label: 'Booming'   }, // resource boom / major development
    strong:    { multiplier: 1.10, label: 'Strong'    }, // small market, captive demand -- Timmins
    neutral:   { multiplier: 1.00, label: 'Neutral'   }, // stable mid-size, avg competitor density
    slow:      { multiplier: 0.90, label: 'Slow'      }, // flat economy, higher competition
    depressed: { multiplier: 0.75, label: 'Depressed' }  // severe contraction, long-term decline
  },

  // City lookup table -- Canadian trades markets. Extensible. Prospect override takes priority.
  marketDemandLookup: {
    'timmins':          'strong',
    'sudbury':          'strong',
    'sault ste marie':  'neutral',
    'north bay':        'neutral',
    'thunder bay':      'neutral',
    'kirkland lake':    'strong',
    'elliot lake':      'slow',
    'toronto':          'neutral',
    'ottawa':           'neutral',
    'hamilton':         'neutral',
    'london':           'neutral',
    'windsor':          'slow',
    'barrie':           'neutral',
    'kingston':         'neutral',
    'fort mcmurray':    'booming',
    'calgary':          'neutral',
    'edmonton':         'neutral',
    'vancouver':        'neutral',
    'kelowna':          'strong',
    'winnipeg':         'neutral',
    'saskatoon':        'neutral',
    'regina':           'neutral',
    'halifax':          'neutral',
    'moncton':          'neutral',
    'fredericton':      'slow',
    'st. john\'s':      'neutral',
    'charlottetown':    'slow',
    'whitehorse':       'booming',
    'yellowknife':      'booming',
    'iqaluit':          'booming'
  },

  // ── Competitive Density Index -- Session 7 / v2.4
  // Derived from paid competitors (LSA + Google Ads + Meta Ads) only.
  // Organic-only players are a lesser threat.
  competitiveDensityTiers: [
    { maxCompetitors: 1,        multiplier: 1.15, label: 'Near-monopoly'     },
    { maxCompetitors: 3,        multiplier: 1.08, label: 'Low density'       },
    { maxCompetitors: 6,        multiplier: 1.00, label: 'Neutral'           },
    { maxCompetitors: 10,       multiplier: 0.92, label: 'High density'      },
    { maxCompetitors: Infinity, multiplier: 0.85, label: 'Very high density' }
  ],

  // ── Scenario Recovery Model labels -- Session 7 / v2.4
  scenarioLabels: {
    current:   'Current Reality',
    market:    'Market Opportunity',
    potential: 'Full Potential'
  },

  // ── Diagnostic Confidence -- Session 7 / v2.4
  // uncertainty_spread = confidenceSpreadMin + (0.25 × (1 − diagnosticConfidence))
  confidenceSpreadMin: 0.20, // ±20% at full confidence
  confidenceSpreadMax: 0.45, // ±45% at zero confidence

  // ── Brand Equity Index -- Session 7 / v2.4
  reviewsPerYearBenchmark:    6,   // expected review accumulation for an active trades business
  brandedSearchFollowerMin:   200, // minimum followers for branded social presence in market <50K
  brandEquityMentionsMin:     2,   // unprompted community mentions in 90 days to pass signal

  // Vertical revenue lift benchmarks
  verticalBenchmarks: {
    trades:       { lift: 1.00, label: 'Contractors and Trades',   pct: '100%', jobHrs: 8,  jobUnit: 'job' },
    tourism:      { lift: 0.80, label: 'Tourism and Hospitality',  pct: '80%',  jobHrs: 32, jobUnit: '4-night booking' },
    professional: { lift: 0.72, label: 'Professional Services',    pct: '72%',  jobHrs: 6,  jobUnit: 'client matter' }
  }
};

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Average an array of numbers, handling empty arrays gracefully
 */
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Clamp a value between min and max
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Format a number as currency string for display
 */
function formatCurrency(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + Math.round(n).toLocaleString();
}

/**
 * Look up a CTR penalty for a given star rating
 */
function getGbpCtrPenalty(rating) {
  const bands = Object.values(BENCHMARKS.gbpCtrPenalty);
  const band = bands.find(b => rating >= b.min && rating <= b.max);
  return band ? band.penalty : 0.60;
}

/**
 * Look up Lighthouse conversion rate for a given score
 */
function getLighthouseConvRate(score) {
  const tiers = BENCHMARKS.lighthouseConversionRates;
  const tier = tiers.find(t => score >= t.minScore);
  return tier ? tier.convRate : 0.16;
}

/**
 * Look up citation multiplier for a given citation count
 */
function getCitationMultiplier(count) {
  const tiers = BENCHMARKS.citationMultipliers;
  const tier = tiers.find(t => count <= t.max);
  return tier ? tier.multiplier : 1.00;
}

/**
 * Look up engagement multiplier for a given score
 */
function getEngagementMultiplier(score) {
  const tiers = BENCHMARKS.engagementMultipliers;
  const tier = tiers.find(t => score >= t.minScore);
  return tier ? tier.multiplier : 0.55;
}

/**
 * Look up AI risk multiplier for a given visibility score (0-4)
 */
function getAiRiskMultiplier(score) {
  const clampedScore = clamp(Math.round(score), 0, 4);
  return BENCHMARKS.aiRiskMultipliers[clampedScore] || 1.20;
}

/**
 * Estimate monthly search volume for a trade and city
 * Based on Google Keyword Planner benchmarks for Canadian small markets
 * Under 150,000 population -- ContentRadar provides actual data in production
 */
function estimateMonthlySearchVolume(trade, city, population) {
  // Base estimates for Canadian small market (under 150k population)
  // Primary keyword (e.g. "plumber timmins") -- 180-400 searches/month
  // Adjusted by population relative to 50,000 baseline
  const popFactor = Math.min((population || 50000) / 50000, 3);
  const baseVolume = 250; // conservative midpoint
  return Math.round(baseVolume * popFactor);
}

// ─────────────────────────────────────────────────────────────
// MULTIPLIER CALCULATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Calculate the seasonal multiplier from prospect-reported quarterly inputs
 * Seasonal_Multiplier = (Peak + Q2 + Q3 + Q4) / 4 / 100
 */
function calculateSeasonalMultiplier(seasonal) {
  const { q2 = 85, q3 = 65, q4 = 45 } = seasonal || {};
  return (100 + q2 + q3 + q4) / 4 / 100;
}

/**
 * Calculate engagement readiness score from Layer 9 signals
 * Returns score (0-8) and multiplier
 */
function calculateEngagementScore(engagement) {
  if (!engagement) return { score: 4, multiplier: 0.70 };
  const signals = {
    faqPresent:            !!engagement.faqPresent,
    clickToCall:           !!engagement.clickToCall,
    bookingWidget:         !!engagement.bookingWidget,
    liveChat:              !!engagement.liveChat,
    trustSignals:          !!engagement.trustSignals,
    emergencyAvailability: !!engagement.emergencyAvailability,
    pricingTransparency:   !!engagement.pricingTransparency,
    ctaStrength:           (engagement.ctaStrength || 0) >= 3
  };
  const score = Object.values(signals).filter(Boolean).length;
  const multiplier = getEngagementMultiplier(score);
  return { score, multiplier, signals };
}

/**
 * Calculate AI visibility score and risk multiplier from Layer 5
 */
function calculateAiScore(aiVisibility, citations) {
  if (!aiVisibility) return { score: 0, multiplier: 1.20 };
  const platforms = {
    chatgpt:      !!aiVisibility.liveResults?.chatgpt,
    gemini:       !!aiVisibility.liveResults?.gemini,
    perplexity:   !!aiVisibility.liveResults?.perplexity,
    aiOverviews:  !!aiVisibility.liveResults?.aiOverviews
  };
  const score = Object.values(platforms).filter(Boolean).length;
  let multiplier = getAiRiskMultiplier(score);

  // Schema absence adds further AI citation risk -- capped at 1.20
  if (citations && !citations.schemaPresent) {
    multiplier = Math.min(multiplier * BENCHMARKS.schemaAbsentAiMultiplier, 1.20);
  }

  return { score, multiplier, platforms };
}

/**
 * Calculate citation multipliers for rank gap adjustment
 */
function calculateCitationMultipliers(citations) {
  if (!citations) return { citationMult: 1.28, napMult: 1.08 };
  const citationMult = getCitationMultiplier(citations.count || 0);
  const napMult = (citations.napMismatches && citations.napMismatches > 0)
    ? BENCHMARKS.napMismatchMultiplier : 1.00;
  return { citationMult, napMult };
}

/**
 * Calculate organic health score (0-1) used in paid efficiency gap
 */
function calculateOrganicHealthScore(lighthouse, gbp, contentGap) {
  const lighthouseHealth = (lighthouse?.performance || 0) / 100;
  const gbpHealth = (gbp?.rating || 0) / 5;
  const covered = contentGap?.covered || 0;
  const total = covered + (contentGap?.missing?.length || 0);
  const contentHealth = total > 0 ? covered / total : 0;
  return avg([lighthouseHealth, gbpHealth, contentHealth]);
}

// ─────────────────────────────────────────────────────────────
// GAP CALCULATIONS -- one function per layer
// ─────────────────────────────────────────────────────────────

/**
 * getSiteRetentionRate -- Session 15
 *
 * Returns the fraction of clicks that actually see the site given a
 * PageSpeed Insights performance score (mobile strategy).
 *
 * Small Northern Ontario markets = high intent searchers. A business
 * searching "plumber Timmins" has limited alternatives and will wait
 * longer than a metro searcher. Worst-case abandonment is 20%.
 *
 * Score bands (locked Session 15):
 *   90+     : 100% retention -- no penalty
 *   70-89   : 90% retention  -- 10% of clicks bail
 *   50-69   : 85% retention  -- 15% of clicks bail
 *   below 50: 80% retention  -- 20% of clicks bail
 *
 * Applied as a multiplier inside calcGbpGap() and calcRankGap().
 * Layer 3 does NOT produce a standalone dollar gap.
 *
 * @param {number} performanceScore - PSI performance score 0-100
 * @returns {number} siteRetentionRate between 0.80 and 1.00
 */
function getSiteRetentionRate(performanceScore) {
  const score = performanceScore || 0;
  if (score >= 90) return 1.00;
  if (score >= 70) return 0.90;
  if (score >= 50) return 0.85;
  return 0.80;
}

/**
 * LAYER 1: GBP Health Gap
 * Calculates revenue lost due to star rating, review count, and listing gaps.
 *
 * Session 15: siteRetentionRate added as a parameter.
 * A slow site taxes every click earned through GBP quality equally.
 * siteRetentionRate is applied to both baseGap and responseAdj.
 *
 * @param {Object} gbp
 * @param {number} monthlySearches
 * @param {number} avgSaleValue
 * @param {number} seasonal
 * @param {number} siteRetentionRate - from getSiteRetentionRate(). Default 1.00 (no penalty).
 */
function calcGbpGap(gbp, monthlySearches, avgSaleValue, seasonal, siteRetentionRate = 1.00) {
  if (!gbp) return { value: 0, detail: 'GBP data unavailable' };

  const retention = siteRetentionRate;

  const ratingPenalty = getGbpCtrPenalty(gbp.rating || 0);
  const reviewPenalty = (gbp.reviewCount || 0) < BENCHMARKS.reviewCredibilityThreshold
    ? BENCHMARKS.reviewCredibilityPenalty : 0;

  // Cap combined penalty at 0.75 to prevent unrealistic projections
  const totalPenalty = Math.min(ratingPenalty + reviewPenalty, 0.75);

  // Review response rate gap -- weighted at 20% attribution to GBP gap
  const responseRate = gbp.reviewCount > 0
    ? (gbp.ownerResponseCount || 0) / gbp.reviewCount : 0;
  const responseGap = Math.max(0, BENCHMARKS.reviewResponseBenchmark - responseRate);

  // Scale by Map Pack CTR at position 1 -- GBP gap is the visibility penalty on available search traffic
  // siteRetentionRate applied: a slow site reduces the value of every click earned through GBP quality
  const positionOneCtr = BENCHMARKS.mapPackCTR[1];
  const baseGap = monthlySearches * positionOneCtr * totalPenalty * retention * BENCHMARKS.callToPurchaseRate * avgSaleValue * 12;
  const responseAdj = monthlySearches * positionOneCtr * responseGap * retention * 0.15 * avgSaleValue * 12;

  const value = Math.round((baseGap + responseAdj) * seasonal);

  return {
    value,
    detail: {
      rating: gbp.rating,
      reviewCount: gbp.reviewCount,
      ratingPenalty: Math.round(ratingPenalty * 100) + '%',
      reviewPenalty: Math.round(reviewPenalty * 100) + '%',
      responseRate: Math.round(responseRate * 100) + '%',
      siteRetentionRate: Math.round(retention * 100) + '%',
      status: ratingPenalty === 0 && reviewPenalty === 0 ? 'green' : ratingPenalty < 0.18 ? 'amber' : 'red'
    }
  };
}

/**
 * LAYER 2A: Local Rank Gap
 * Calculates revenue lost due to Map Pack position below position 1.
 *
 * Session 15: siteRetentionRate added as a parameter.
 * A slow site taxes the clicks earned through rank position.
 * Applied to baseGap before seasonal and citation multipliers.
 *
 * @param {Object} rank
 * @param {number} monthlySearches
 * @param {number} avgSaleValue
 * @param {number} seasonal
 * @param {number} citationMult
 * @param {number} napMult
 * @param {number} engagementMult
 * @param {number} siteRetentionRate - from getSiteRetentionRate(). Default 1.00 (no penalty).
 */
function calcRankGap(rank, monthlySearches, avgSaleValue, seasonal, citationMult, napMult, engagementMult, siteRetentionRate = 1.00) {
  if (!rank || !rank.keywords) return { value: 0, detail: 'Rank data unavailable' };

  const retention = siteRetentionRate;
  const ctrMap = BENCHMARKS.mapPackCTR;
  const currentCtrs = rank.keywords.map(kw => {
    const pos = kw.position;
    return ctrMap[pos] || ctrMap['none'];
  });
  const avgCurrentCtr = avg(currentCtrs);
  const targetCtr = ctrMap[1]; // position 1 benchmark

  const ctrGap = Math.max(0, targetCtr - avgCurrentCtr);
  // siteRetentionRate applied: a slow site reduces the value of every rank-earned click
  const baseGap = monthlySearches * ctrGap * retention * BENCHMARKS.callToPurchaseRate * avgSaleValue * 12;

  const value = Math.round(baseGap * seasonal * citationMult * napMult * engagementMult);

  // Determine worst position for status
  const positions = rank.keywords.map(kw => kw.position === 'none' ? 99 : parseInt(kw.position) || 99);
  const avgPosition = avg(positions);
  const status = avgPosition <= 2 ? 'green' : avgPosition <= 3 ? 'amber' : 'red';

  return {
    value,
    avgCurrentCtr: Math.round(avgCurrentCtr * 100) + '%',
    detail: {
      avgPosition: avgCurrentCtr > 0 ? Math.round(1 / avgCurrentCtr) : 'not in pack',
      siteRetentionRate: Math.round(retention * 100) + '%',
      status
    }
  };
}

/**
 * LAYER 3: Website Performance Gap
 *
 * RETIRED -- Session 15.
 *
 * Layer 3 no longer produces a standalone dollar gap.
 * Site performance is now captured as siteRetentionRate -- a modifier
 * applied inside calcGbpGap() and calcRankGap().
 *
 * getSiteRetentionRate(performanceScore) returns the retention rate.
 * It is calculated in calculateDiagnostic() and passed into both gap functions.
 *
 * This stub is preserved so existing call sites do not crash during transition.
 * Remove after developer confirms all call sites have been updated.
 *
 * Layer 3 health signal (score, band, status) is still returned in results
 * under results.layers.performance for the results screen scorecard.
 */
function calcPerformanceGap(lighthouse, monthlySearches, avgCurrentCtr, avgSaleValue, seasonal) {
  // RETIRED -- returns zero. Gap is now embedded in Layer 1 and Layer 2 via siteRetentionRate.
  const score = lighthouse?.performance || 0;
  const status = score >= 90 ? 'green' : score >= 70 ? 'green' : score >= 50 ? 'amber' : 'red';
  const retentionRate = getSiteRetentionRate(score);
  const abandonmentPct = Math.round((1 - retentionRate) * 100);

  return {
    value: 0, // retired -- gap embedded in Layer 1 and Layer 2
    detail: {
      performanceScore: score,
      siteRetentionRate: Math.round(retentionRate * 100) + '%',
      abandonmentPct: abandonmentPct + '%',
      seoScore: lighthouse?.seo,
      accessibilityScore: lighthouse?.accessibility,
      bestPracticesScore: lighthouse?.bestPractices,
      mobileFriendly: lighthouse?.mobileFriendly,
      lcpMs: lighthouse?.lcp,
      clsScore: lighthouse?.cls,
      status,
      note: 'Layer 3 gap retired Session 15. Site abandonment now modifies Layer 1 and Layer 2 via siteRetentionRate.'
    }
  };
}

/**
 * LAYER 4: Content Gap
 * Calculates revenue lost due to missing keyword coverage vs ContentRadar demand
 */
function calcContentGap(contentGap, avgSaleValue, seasonal, engagementMult) {
  if (!contentGap || !contentGap.missing) return { value: 0, detail: 'Content data unavailable' };

  // Sum revenue potential of all missing keywords
  const keywordGap = contentGap.missing.reduce((sum, kw) => {
    const searches = kw.monthlySearches || 100; // default if not provided
    const urgencyWeight = kw.urgency === 'critical' ? 1.5 : kw.urgency === 'high' ? 1.2 : 1.0;
    return sum + (searches * BENCHMARKS.mapPackCTR[1] * BENCHMARKS.organicConversionRate * avgSaleValue * urgencyWeight);
  }, 0);

  // PAA gap -- People Also Ask questions not answered on site
  const paaGap = (contentGap.paaGaps || 0) * 80 * BENCHMARKS.organicConversionRate * avgSaleValue;

  const value = Math.round((keywordGap + paaGap) * 12 * seasonal * engagementMult);

  const covered = contentGap.covered || 0;
  const missing = contentGap.missing.length;
  const total = covered + missing;
  const coveragePct = total > 0 ? Math.round((covered / total) * 100) : 0;

  const status = coveragePct >= 70 ? 'green' : coveragePct >= 40 ? 'amber' : 'red';

  return {
    value,
    detail: {
      covered,
      missing,
      coveragePct: coveragePct + '%',
      paaGaps: contentGap.paaGaps || 0,
      topMissingKeywords: contentGap.missing.slice(0, 5).map(k => k.keyword),
      status
    }
  };
}

/**
 * LAYER 6: Missed Call Gap
 * Calculates revenue lost to unanswered calls that never call back
 */
function calcMissedCallGap(selfReported, monthlySearches, avgCurrentCtr, avgSaleValue, seasonal) {
  const missedCallPct = (selfReported.missedCallPct || 20) / 100;

  // Estimate inbound call volume from search traffic
  const estMonthlyCallsFromSearch = monthlySearches * avgCurrentCtr * BENCHMARKS.clickToCallRate;

  // Revenue per missed call that does not call back
  const missedCallRevenueLoss = estMonthlyCallsFromSearch
    * missedCallPct
    * BENCHMARKS.noCallbackRate
    * avgSaleValue;

  const value = Math.round(missedCallRevenueLoss * 12 * seasonal);

  const status = missedCallPct <= 0.15 ? 'green' : missedCallPct <= 0.29 ? 'amber' : 'red';

  return {
    value,
    detail: {
      missedCallPct: Math.round(missedCallPct * 100) + '%',
      estMonthlyMissedCalls: Math.round(estMonthlyCallsFromSearch * missedCallPct),
      estAnnualMissedCalls: Math.round(estMonthlyCallsFromSearch * missedCallPct * 12),
      noCallbackRate: Math.round(BENCHMARKS.noCallbackRate * 100) + '%',
      status
    }
  };
}

/**
 * contentBenchmark -- Capacity-Aware Content Model utility (NEW v2.3)
 *
 * Scales a content cadence benchmark to the quarterly capacity gap.
 * Floors at minVal when at or near capacity ceiling.
 * Ramps linearly to maxVal as idle capacity increases.
 *
 * contentBenchmark(capacityGap, minVal, baseVal, maxVal)
 *   IF capacityGap <= socialPostingCeilingThreshold THEN minVal
 *   ELSE MIN(baseVal x (1 + capacityGap), maxVal)
 *
 * ContentRadar owns scheduling and lead time. Diagnostic outputs targets only.
 */
function contentBenchmark(capacityGap, minVal, baseVal, maxVal) {
  if (capacityGap <= BENCHMARKS.socialPostingCeilingThreshold) return minVal;
  return Math.min(baseVal * (1 + capacityGap), maxVal);
}

/**
 * LAYER 7: Social Voice Adjustment -- v2.3 (five components)
 *
 * Component 1 (existing): Sentiment multiplier on GBP gap
 * Component 2 (existing): Unanswered mentions gap
 * Component 3 (NEW v2.3): Posting_Gap -- quarterly capacity-weighted posting shortfall
 * Component 4 (NEW v2.3): Engagement_Gap_Social -- engagement rate below 2% trades benchmark
 * Component 5 (NEW v2.3): Response_Gap -- unanswered comments on posts
 *
 * Data for Components 3-5 comes from Data365 already retrieved in Layer 7 Phase 1.
 * No additional API calls required.
 */
function calcSocialAdjustment(socialVoice, gbpGapValue, avgSaleValue, annualRevenue, quarterlyCapacityGaps) {
  if (!socialVoice) return { value: 0, detail: 'Social data unavailable' };

  // ── Component 1: Sentiment multiplier on GBP gap (existing)
  let sentimentMultiplierGap = 0;
  if ((socialVoice.sentimentScore || 1) < BENCHMARKS.socialSentimentThreshold) {
    sentimentMultiplierGap = gbpGapValue * BENCHMARKS.socialSentimentUplift;
  }

  // ── Component 2: Unanswered mentions gap (existing)
  let unansweredMentionsGap = 0;
  if ((socialVoice.unansweredMentions || 0) > BENCHMARKS.unansweredMentionThreshold) {
    unansweredMentionsGap = socialVoice.unansweredMentions * avgSaleValue * BENCHMARKS.unansweredMentionFactor;
  }

  // ── Component 3: Posting_Gap (NEW v2.3)
  // SUM over quarters: (1 - postingFrequencyScore) x (capacityGap x annualRevenue x 0.25) x rate x 0.25
  let postingGap = 0;
  if (quarterlyCapacityGaps && annualRevenue) {
    const actualPostsPerMonth = socialVoice.actualPostsPerMonth || 0;
    for (const q of ['q1', 'q2', 'q3', 'q4']) {
      const capGap = quarterlyCapacityGaps[q] || 0;
      const benchmark = contentBenchmark(
        capGap,
        BENCHMARKS.minSocialPostsPerMonth,
        BENCHMARKS.baseSocialPostsPerMonth,
        BENCHMARKS.maxSocialPostsPerMonth
      );
      const postingFrequencyScore = benchmark > 0
        ? Math.min(actualPostsPerMonth / benchmark, 1.0) : 1.0;
      postingGap += (1 - postingFrequencyScore)
        * (capGap * annualRevenue * 0.25)
        * BENCHMARKS.socialPostingGapRate
        * 0.25;
    }
  }

  // ── Component 4: Engagement_Gap_Social (NEW v2.3)
  // engagementRateScore: 0.0 (below 0.5%) to 1.0 (at or above 2% trades benchmark)
  let engagementGapSocial = 0;
  if (annualRevenue) {
    const engRate = socialVoice.socialEngagementRate || 0; // decimal e.g. 0.018 = 1.8%
    const tradesBenchmark = 0.02;
    const engagementRateScore = clamp(engRate / tradesBenchmark, 0, 1.0);
    engagementGapSocial = (1 - engagementRateScore) * annualRevenue * BENCHMARKS.socialEngagementGapRate;
  }

  // ── Component 5: Response_Gap (NEW v2.3)
  // unansweredComments = comments where customer asked question, no owner reply within 72hrs
  const unansweredComments = socialVoice.unansweredComments || 0;
  const responseGap = unansweredComments * avgSaleValue * BENCHMARKS.socialResponseGapRate;

  const totalAdjustment = sentimentMultiplierGap + unansweredMentionsGap
    + postingGap + engagementGapSocial + responseGap;

  const sentimentPct = Math.round((socialVoice.sentimentScore || 0) * 100);
  const status = sentimentPct >= 70 ? 'green' : sentimentPct >= 50 ? 'amber' : 'red';

  return {
    value: Math.round(totalAdjustment),
    detail: {
      sentimentScore:         sentimentPct + '%',
      sentimentMultiplierGap: Math.round(sentimentMultiplierGap),
      unansweredMentions:     socialVoice.unansweredMentions || 0,
      unansweredMentionsGap:  Math.round(unansweredMentionsGap),
      postingGap:             Math.round(postingGap),
      actualPostsPerMonth:    socialVoice.actualPostsPerMonth || 0,
      socialEngagementRate:   Math.round((socialVoice.socialEngagementRate || 0) * 1000) / 10 + '%',
      engagementGapSocial:    Math.round(engagementGapSocial),
      unansweredComments,
      responseGap:            Math.round(responseGap),
      themes:                 socialVoice.themes || [],
      reviewVelocity90d:      socialVoice.reviewVelocity90d || 0,
      reviewResponseRate:     Math.round((socialVoice.reviewResponseRate || 0) * 100) + '%',
      status
    }
  };
}

/**
 * LAYER 8: Paid Marketing Gap
 * Calculates waste in existing ad spend and SERP displacement cost
 */
function calcPaidGap(paidMarketing, selfReported, lighthouse, gbp, contentGap, seasonal) {
  if (!paidMarketing) return { value: 0, detail: 'Paid marketing data unavailable' };

  const totalPaidSpend = (selfReported.paidSpend?.google || 0)
    + (selfReported.paidSpend?.facebook || 0)
    + (selfReported.paidSpend?.other || 0);

  // Organic health score determines how much paid spend is being wasted
  const organicHealth = calculateOrganicHealthScore(lighthouse, gbp, contentGap);
  const wasteTier = BENCHMARKS.paidWasteMultipliers.find(t => organicHealth <= t.maxHealth);
  const wastePct = wasteTier ? wasteTier.wastePct : 0.10;
  const paidEfficiencyGap = totalPaidSpend * (1 - organicHealth) * wastePct * 12;

  // SERP displacement -- competitor LSAs push organic position down
  const competitorLSACount = paidMarketing.competitorLSAs?.length || 0;
  const displacementPositions = competitorLSACount; // each LSA pushes down by ~1 position
  const displacedCtr = BENCHMARKS.mapPackCTR[Math.min(3, displacementPositions + 1)] || BENCHMARKS.mapPackCTR['none'];
  // Displacement gap is captured in rank gap -- here we show as context only

  const value = Math.round(paidEfficiencyGap * seasonal);

  const competitorCount = competitorLSACount
    + (paidMarketing.competitorGoogleAds?.length || 0)
    + (paidMarketing.competitorMetaAds?.length || 0);
  const status = competitorCount === 0 ? 'green' : competitorCount <= 2 ? 'amber' : 'red';

  return {
    value,
    detail: {
      totalMonthlyPaidSpend: totalPaidSpend,
      organicHealthScore: Math.round(organicHealth * 100) + '%',
      estimatedWastePct: Math.round(wastePct * 100) + '%',
      competitorLSAs: paidMarketing.competitorLSAs || [],
      competitorGoogleAds: paidMarketing.competitorGoogleAds || [],
      competitorMetaAds: paidMarketing.competitorMetaAds || [],
      status
    }
  };
}

/**
 * LAYER 9: Engagement Readiness Gap
 * Calculates revenue lost because visitors don't convert due to poor engagement signals
 * Note: engagementMult is already applied within rank, content, and AI gaps
 * This calculates the direct conversion gap on existing call volume
 */
function calcEngagementGap(engagement, monthlySearches, avgCurrentCtr, avgSaleValue, seasonal, engagementMult) {
  const { score } = engagement;
  const benchmarkConvRate = BENCHMARKS.callToPurchaseRate; // 40% benchmark
  const currentConvRate = benchmarkConvRate * engagementMult;

  const estMonthlyCallsFromSearch = monthlySearches * avgCurrentCtr * BENCHMARKS.clickToCallRate;
  const convGap = Math.max(0, benchmarkConvRate - currentConvRate);
  const value = Math.round(estMonthlyCallsFromSearch * convGap * avgSaleValue * 12 * seasonal);

  const status = score >= 7 ? 'green' : score >= 5 ? 'amber' : 'red';

  return {
    value,
    detail: {
      engagementScore: score + '/8',
      conversionMultiplier: Math.round(engagementMult * 100) + '%',
      signals: engagement.signals || {},
      status
    }
  };
}

/**
 * LAYER 10: Conversion Infrastructure Assessment
 * Modifies missed call gap based on presence/absence of automated response
 * A contractor with no auto-response loses all 82% of missed callers
 * A contractor with auto-response can recover 40-60% of them
 */
function calcConversionInfrastructureAdjustment(conversion, missedCallGapValue) {
  if (!conversion) return { adjustment: 0, detail: {} };

  const hasAutoResponse = !!conversion.autoResponsePresent;
  const recoveryRate = hasAutoResponse ? 0.50 : 0; // 50% recovery with auto-response
  const adjustment = hasAutoResponse ? -(missedCallGapValue * recoveryRate) : 0;

  const score = [
    conversion.autoResponsePresent,
    (conversion.ctaUrgency || 0) >= 3,
    (conversion.formFieldCount || 99) <= 4,
    (conversion.contactPathways || 0) >= 2,
    conversion.hoursVisible
  ].filter(Boolean).length;

  const status = score >= 4 ? 'green' : score >= 2 ? 'amber' : 'red';

  return {
    adjustment: Math.round(adjustment),
    detail: {
      conversionScore: score + '/5',
      autoResponsePresent: hasAutoResponse,
      ctaUrgency: conversion.ctaUrgency || 0,
      formFieldCount: conversion.formFieldCount || 'not detected',
      contactPathways: conversion.contactPathways || 0,
      status
    }
  };
}

/**
 * CAPACITY LIFT CALCULATION -- v2.3
 *
 * Two distinct components:
 *
 * Component 1 -- Idle capacity revenue
 * Gap between current seasonal utilization and 85% realistic ceiling.
 * Seasonal -- varies by quarter.
 *
 * Component 2 -- Admin time cost saving
 * ClearSky returns 40% of adminHoursPerWeek to the owner, valued at
 * adminHourlyRate. NOT seasonal. NOT converted to jobs.
 *
 * v2.3 changes:
 *   - nonBillablePct / adminPct RETIRED. Replaced by adminHoursPerWeek
 *     collected directly (default 8).
 *   - capacityTimeSavingRate reduced 0.80 → 0.40. Conservative v1 baseline.
 *   - Saved_Hrs_Per_Week = adminStaffCount × adminHoursPerWeek × 0.40
 *
 * @param {Object} selfReported
 *   @param {number} selfReported.adminStaffCount   - staff carrying admin burden (default 1)
 *   @param {number} selfReported.adminHoursPerWeek - direct hours/week input (default 8)
 *   @param {number} selfReported.adminHourlyRate   - owner hourly value (default 30)
 *   @param {Object} selfReported.seasonal          - quarterly utilization relative to peak
 *   @param {number} selfReported.annualRevenue
 */
function calcCapacityLift(selfReported, avgSaleValue, seasonal, vertical = 'trades') {
  const {
    adminStaffCount  = 1,
    adminHoursPerWeek = BENCHMARKS.adminHoursPerWeekDefault,
    adminHourlyRate  = BENCHMARKS.adminHourlyRateDefault,
    annualRevenue    = 300000,
    seasonal: seasonalInputs = {}
  } = selfReported;

  const { q2 = 85, q3 = 65, q4 = 45 } = seasonalInputs;
  const ceiling = BENCHMARKS.realisticCapacityCeiling; // 0.85

  // ── Component 1: Idle capacity revenue
  const q1Util = ceiling;
  const q2Util = (q2 / 100) * ceiling;
  const q3Util = (q3 / 100) * ceiling;
  const q4Util = (q4 / 100) * ceiling;

  const q1Gap = Math.max(0, ceiling - q1Util); // always 0 at peak
  const q2Gap = Math.max(0, ceiling - q2Util);
  const q3Gap = Math.max(0, ceiling - q3Util);
  const q4Gap = Math.max(0, ceiling - q4Util);

  const avgGap = (q1Gap + q2Gap + q3Gap + q4Gap) / 4;
  const idleCapacityValue = Math.round(annualRevenue * avgGap);

  // ── Component 2: Admin time cost saving -- v2.3
  // Saved_Hrs_Per_Week = adminStaffCount × adminHoursPerWeek × capacityTimeSavingRate
  const savedHrsPerWeek = adminStaffCount * adminHoursPerWeek * BENCHMARKS.capacityTimeSavingRate;
  const annualCostSaving = Math.round(savedHrsPerWeek * adminHourlyRate * 52);

  const value = idleCapacityValue + annualCostSaving;

  return {
    value,
    detail: {
      realisticCeiling:  Math.round(ceiling * 100) + '%',
      quarterlyGaps: {
        q1: Math.round(q1Gap * 100) + '%',
        q2: Math.round(q2Gap * 100) + '%',
        q3: Math.round(q3Gap * 100) + '%',
        q4: Math.round(q4Gap * 100) + '%'
      },
      avgAnnualGap:      Math.round(avgGap * 100) + '%',
      idleCapacityValue,
      adminStaffCount,
      adminHoursPerWeek,
      savedHrsPerWeek:   Math.round(savedHrsPerWeek * 10) / 10,
      adminHourlyRate,
      annualCostSaving,
      totalCapacityValue: value
    }
  };
}

/**
 * GROWTH READINESS SCORE (Layer 11)
 * Forward-looking score 0-6 -- not a dollar gap
 */
/**
 * calcBrandEquityIndex -- Session 7 / v2.4
 *
 * Scores whether an established business's offline word-of-mouth reputation
 * is being captured digitally. Four signals, each pass/fail. Total index 0-4.
 * Lives in Layer 11 as the seventh growth signal (brandEquityEstablished).
 *
 * @param {Object} gbp          - GBP layer data
 * @param {Object} socialVoice  - Social voice layer data
 * @param {Object} contentGap   - Content gap layer data (brandedSearchPresent flag)
 * @param {Object} selfReported - Self-reported inputs (yearsInBusiness)
 * @param {number} population   - Market population
 * @returns {Object} { score, signals }
 */
function calcBrandEquityIndex(gbp, socialVoice, contentGap, selfReported, population) {
  const yearsInBusiness = selfReported?.yearsInBusiness || BENCHMARKS.yearsInBusinessDefault;
  const reviewBenchmark = yearsInBusiness * BENCHMARKS.reviewsPerYearBenchmark;
  const followerMin     = population < 50000
    ? BENCHMARKS.brandedSearchFollowerMin
    : BENCHMARKS.brandedSearchFollowerMin * 2;

  const signals = {
    // 1 - Review depth: reviewCount >= yearsInBusiness × 6
    reviewDepth:         (gbp?.reviewCount || 0) >= reviewBenchmark,
    // 2 - Branded search: business name detected as keyword with search volume (ContentRadar)
    brandedSearch:       !!(contentGap?.brandedSearchPresent),
    // 3 - Social following: follower count >= population-adjusted benchmark
    socialFollowing:     (socialVoice?.fbFollowerCount || socialVoice?.followerCount || 0) >= followerMin,
    // 4 - Unprompted mentions: >= 2 in 90 days where business named without being tagged
    unpromptedMentions:  (socialVoice?.unpromptedMentions90d || 0) >= BENCHMARKS.brandEquityMentionsMin
  };

  const score = Object.values(signals).filter(Boolean).length;

  return { score, signals };
}

function calcGrowthScore(growth, gbp, socialVoice, contentGap, selfReported, population) {
  if (!growth) return { score: 0, label: 'Not started', signals: {}, brandEquity: { score: 0, signals: {} }, growthStatement: 'Every customer relationship currently ends at job completion. ClearSky\'s Growth module changes that -- adding retention, referral, and repeat booking infrastructure.' };

  // ── Brand Equity Index (seventh signal) -- Session 7 / v2.4
  const brandEquity = calcBrandEquityIndex(gbp, socialVoice, contentGap, selfReported, population);
  const brandEquityEstablished = brandEquity.score >= 2;

  const signals = {
    activeGbpPosting:        (growth.gbpPostsLast90d || 0) >= 4,
    reviewGenerationCadence: (growth.reviewsLast90d || 0) >= 9,
    contentPublishing:       !!growth.contentPublishingActive,
    referralInfrastructure:  !!growth.referralInfraPresent,
    activeSocial:            (growth.socialPostFrequency || 0) >= 4,
    maintenancePlan:         !!growth.maintenancePlanPresent,
    // Signal 7 -- Brand Equity Index (NEW v2.4)
    brandEquityEstablished
  };

  const score = Object.values(signals).filter(Boolean).length;

  // Updated label bands for 7-signal scale: 6-7 Growth-ready, 4-5 Partially ready, 2-3 Early stage, 0-1 Not started
  const label = score >= 6 ? 'Growth-ready'
    : score >= 4 ? 'Partially ready'
    : score >= 2 ? 'Early stage'
    : 'Not started';

  const growthStatement = score >= 6
    ? 'Your business has the infrastructure to compound these gains over time. Our 12-month projection assumes full growth-rate compounding.'
    : score >= 4
    ? 'Your business has some growth foundations in place. Adding review generation cadence and content publishing will accelerate gains beyond the 12-month projection.'
    : score >= 2
    ? 'Your business has minimal growth infrastructure. ClearSky\'s Growth module adds the retention, referral, and review systems needed to compound your gains.'
    : 'Every customer relationship currently ends at job completion. ClearSky\'s Growth module changes that -- adding retention, referral, and repeat booking infrastructure.';

  return { score, label, signals, brandEquity, growthStatement };
}


// ─────────────────────────────────────────────────────────────
// HEALTH SCORE HELPERS
// ─────────────────────────────────────────────────────────────

function getGbpStatus(gbp) {
  if (!gbp) return 'red';
  if (gbp.rating >= 4.5 && gbp.reviewCount >= 40) return 'green';
  if (gbp.rating >= 4.0 && gbp.reviewCount >= 25) return 'amber';
  return 'red';
}

function getRankStatus(rank) {
  if (!rank || !rank.keywords) return 'red';
  const positions = rank.keywords.map(kw => kw.position === 'none' ? 99 : parseInt(kw.position) || 99);
  const avg_ = avg(positions);
  if (avg_ <= 2) return 'green';
  if (avg_ <= 3) return 'amber';
  return 'red';
}

function getCitationStatus(citations) {
  if (!citations) return 'red';
  if (citations.count >= 40 && !citations.napMismatches && citations.schemaPresent) return 'green';
  if (citations.count >= 25 && (!citations.napMismatches || citations.napMismatches <= 1)) return 'amber';
  return 'red';
}

function getAiStatus(aiScore) {
  if (aiScore >= 3) return 'green';
  if (aiScore >= 1) return 'amber';
  return 'red';
}

/**
 * LAYER 12: Canonical Health Agent
 * Scores canonical alignment across all managed surfaces.
 * Returns a suppression multiplier applied to Layers 1, 2A, 2B, and 5.
 *
 * canonicalHealth object structure (assembled server-side by the canonical agent):
 *   surfacesChecked      {number}  -- total surfaces audited
 *   surfacesAligned      {number}  -- surfaces fully matching canonical NAP record
 *   napMismatches        {number}  -- count of NAP variations found
 *   duplicateGbpFound    {boolean} -- whether a duplicate GBP listing was detected
 *   canonicalTagsMissing {number}  -- website pages missing canonical tags
 *   schemaNapMismatch    {boolean} -- schema markup conflicts with GBP NAP
 *   aiAccuracyScore      {number}  -- 0.0-1.0, accuracy of AI platform representation
 *                                     vs canonical record (Perplexity, ChatGPT, Gemini)
 *   remediationList      {Array}   -- prioritised fixes [{surface, issue, priority}]
 */
function calcCanonicalHealth(canonicalHealth) {
  if (!canonicalHealth) {
    return {
      suppressionMult: 1.08, // conservative default -- partial misalignment assumed
      score: null,
      detail: { status: 'amber', note: 'Canonical agent data unavailable -- default suppression applied' }
    };
  }

  // Calculate alignment percentage
  const { surfacesChecked = 1, surfacesAligned = 0 } = canonicalHealth;
  const alignmentPct = surfacesChecked > 0
    ? Math.round((surfacesAligned / surfacesChecked) * 100) : 0;

  // Look up suppression multiplier from thresholds
  const tiers = BENCHMARKS.canonicalHealthThresholds;
  const tier = tiers.find(t => alignmentPct >= t.minPct) || tiers[tiers.length - 1];
  let suppressionMult = tier.suppressionMult;

  // Duplicate GBP listing adds further suppression
  if (canonicalHealth.duplicateGbpFound) {
    suppressionMult = Math.min(suppressionMult * BENCHMARKS.duplicateGbpMultiplier, 1.35);
  }

  // AI platform canonical accuracy below threshold amplifies AI visibility risk
  const aiCanonicalRisk = (canonicalHealth.aiAccuracyScore || 1.0)
    < BENCHMARKS.aiCanonicalAccuracyThreshold;

  const status = tier.status;

  return {
    suppressionMult: Math.round(suppressionMult * 100) / 100,
    alignmentPct,
    aiCanonicalRisk,
    detail: {
      alignmentPct: alignmentPct + '%',
      surfacesChecked: canonicalHealth.surfacesChecked || 0,
      surfacesAligned: canonicalHealth.surfacesAligned || 0,
      napMismatches: canonicalHealth.napMismatches || 0,
      duplicateGbpFound: canonicalHealth.duplicateGbpFound || false,
      canonicalTagsMissing: canonicalHealth.canonicalTagsMissing || 0,
      schemaNapMismatch: canonicalHealth.schemaNapMismatch || false,
      aiAccuracyScore: canonicalHealth.aiAccuracyScore != null
        ? Math.round(canonicalHealth.aiAccuracyScore * 100) + '%' : 'not checked',
      remediationList: canonicalHealth.remediationList || [],
      suppressionLabel: tier.label,
      status
    }
  };
}

function getCanonicalStatus(canonicalResult) {
  if (!canonicalResult || !canonicalResult.detail) return 'amber';
  return canonicalResult.detail.status;
}



// ─────────────────────────────────────────────────────────────
// PERSONALIZATION CAPTURE MODEL
// ─────────────────────────────────────────────────────────────

/**
 * Score a single personalization stage (0-3) from content signal passes
 * and the NLP quality call result, applying the universal quality ceiling rule.
 *
 * Quality ceiling rule: quality = 0 caps the stage score at 2 regardless
 * of content pass count. Quality = 1 is required to achieve Score 3.
 *
 * @param {number} passes     - Number of content signals that passed
 * @param {number} total      - Total content signals for this stage
 * @param {number} quality    - NLP quality call result: 0 or 1
 * @param {Array}  mapping    - Score mapping array: [{ maxPasses, score }]
 * @returns {number} stage score 0-3
 */
function scorePersonalizationStage(passes, total, quality, mapping) {
  // Find raw score from content pass count
  const tier = mapping.find(t => passes <= t.maxPasses);
  const rawScore = tier ? tier.score : mapping[mapping.length - 1].score;

  // Apply quality ceiling rule
  if (quality === 0 && rawScore === 3) return 2;
  return rawScore;
}

// Score mappings for each stage
// Each entry: { maxPasses: upper bound of this band (inclusive), score: stage score }
// Last entry has maxPasses: Infinity to catch all remaining passes
const PERSONALIZATION_MAPPINGS = {
  discovery: [   // 14 content signals
    { maxPasses: 3,        score: 0 },
    { maxPasses: 7,        score: 1 },
    { maxPasses: 11,       score: 2 },
    { maxPasses: Infinity, score: 3 }
  ],
  engagement: [  // 19 content signals (was 16; +3 social signals added v2.3)
    { maxPasses: 4,        score: 0 },
    { maxPasses: 9,        score: 1 },
    { maxPasses: 15,       score: 2 },
    { maxPasses: Infinity, score: 3 }
  ],
  conversion: [  // 11 content signals
    { maxPasses: 2,        score: 0 },
    { maxPasses: 5,        score: 1 },
    { maxPasses: 8,        score: 2 },
    { maxPasses: Infinity, score: 3 }
  ],
  growth: [      // 14 content signals (was 13; +1 social signal added v2.3)
    { maxPasses: 2,        score: 0 },
    { maxPasses: 7,        score: 1 },
    { maxPasses: 11,       score: 2 },
    { maxPasses: Infinity, score: 3 }
  ]
};

/**
 * Count content signal passes for the Discovery Presence stage.
 * Sources: Places API (gbp), Layer 7 social data (socialVoice),
 * citations (Layer 2B reuse), Firecrawl signals (personalizationSignals).
 *
 * Many signals require Firecrawl page content assessed upstream.
 * The caller passes pre-evaluated boolean flags in personalizationSignals.
 *
 * @param {Object} gbp
 * @param {Object} socialVoice
 * @param {Object} citations
 * @param {Object} personalizationSignals  - Pre-evaluated Firecrawl signal flags
 * @returns {Object} { passes, signals }
 */
function countDiscoverySignals(gbp, socialVoice, citations, ps) {
  const signals = {
    // 1 - Owner description on GBP >= 40 chars
    ownerDescription:      !!(gbp?.editorialSummary && gbp.editorialSummary.length >= 40),
    // 2 - Photos >= 5
    photosPresent:         (gbp?.photos?.length ?? gbp?.photosPresent ? 5 : 0) >= 5
                             || (gbp?.photosPresent === true),
    // 3 - GBP post in last 90 days (Layer 11 reuse)
    gbpPostRecent:         !!(ps?.gbpPostLast90d),
    // 4 - Community content on website (>= 2 keyword matches)
    communityContent:      !!(ps?.communityContentPresent),
    // 5 - Local geographic references (NER GPE entities)
    localGeoReferences:    !!(ps?.localGeoReferencesPresent),
    // 6 - FAQ section >= 3 Q&A pairs
    faqPresent:            !!(ps?.faqPresent),
    // 7 - Social account linked on website
    socialAccountLinked:   !!(ps?.socialAccountLinked),
    // 8 - Active social posting (Layer 7 reuse) >= 1 post in 90 days
    activeSocialPosting:   (socialVoice?.fbPostFrequency ?? 0) > 0
                             || !!(ps?.socialPostLast90d),
    // 9 - Blog present
    blogPresent:           !!(ps?.blogPresent),
    // 10 - Blog posting active (>= 1 post in 90 days)
    blogPostingActive:     !!(ps?.blogPostLast90d),
    // 11 - Schema markup present (Layer 2B reuse)
    schemaPresent:         !!(citations?.schemaPresent),
    // 12 - Meta title and description optimised
    metaOptimised:         !!(ps?.metaOptimised),
    // 13 - Events or community participation present
    eventsPresent:         !!(ps?.eventsPresent),
    // 14 - Sponsorship or community involvement
    sponsorshipPresent:    !!(ps?.sponsorshipPresent)
  };

  const passes = Object.values(signals).filter(Boolean).length;
  return { passes, signals };
}

/**
 * Count content signal passes for the Engagement Trust stage.
 * Sources: Places API (gbp), Layer 7 (socialVoice), Firecrawl (ps).
 */
function countEngagementSignals(gbp, socialVoice, ps) {
  const reviewCount      = gbp?.reviewCount ?? gbp?.user_ratings_total ?? 0;
  const responseCount    = gbp?.ownerResponseCount ?? 0;
  const responseRate     = reviewCount > 0 ? responseCount / reviewCount : 0;

  const signals = {
    // 1 - Review count >= 10 AND >= 1 in last 60 days
    reviewCountAndVelocity: reviewCount >= 10 && !!(ps?.reviewInLast60d ?? gbp?.reviewRecency),
    // 2 - Owner response rate >= 40%
    ownerResponseRate:      responseRate >= 0.40,
    // 3 - Star rating >= 4.0
    starRating:             (gbp?.rating ?? 0) >= 4.0,
    // 4 - Review word count average >= 30 words (Layer 7 reuse)
    reviewWordCount:        !!(ps?.reviewWordCountPass),
    // 5 - Technician names in reviews (Layer 7 NLP)
    technicianNamesInReviews: !!(ps?.technicianNamesInReviews),
    // 6 - People photos on website and GBP
    peoplePhotos:           !!(ps?.peoplePhotosPresent),
    // 7 - Before and after photos present
    beforeAfterPhotos:      !!(ps?.beforeAfterPhotosPresent),
    // 8 - Media library or gallery >= 5 images
    galleryPresent:         !!(ps?.galleryPresent),
    // 9 - Photo captions >= 50% of gallery images
    photoCaptions:          !!(ps?.photoCaptionsPresent),
    // 10 - Testimonials >= 3 entries
    testimonialsPresent:    !!(ps?.testimonialsPresent),
    // 11 - Chat or chatbot present
    chatPresent:            !!(ps?.chatPresent),
    // 12 - Contact form present
    contactFormPresent:     !!(ps?.contactFormPresent),
    // 13 - Ask a question feature (website Q&A OR GBP Q&A with owner responses)
    askAQuestionPresent:    !!(ps?.askAQuestionPresent),
    // 14 - UGC Q&A with >= 3 owner responses
    ugcQaPresent:           !!(ps?.ugcQaPresent),
    // 15 - CTA present on homepage
    ctaOnHomepage:          !!(ps?.ctaOnHomepage),
    // 16 - CTA variety >= 2 distinct types
    ctaVariety:             !!(ps?.ctaVariety),
    // 17 - Last social post within 30 days (Data365) -- NEW v2.3
    socialPostRecent:       !!(ps?.socialPostRecent),
    // 18 - Social engagement rate >= 2% averaged across last 10 posts (Data365) -- NEW v2.3
    socialEngagementRate:   !!(ps?.socialEngagementRatePass),
    // 19 - Owner replied to >= 1 comment in last 30 posts (Data365) -- NEW v2.3
    socialOwnerResponds:    !!(ps?.socialOwnerResponds)
  };

  const passes = Object.values(signals).filter(Boolean).length;
  return { passes, signals };
}

/**
 * Count content signal passes for the Conversion Continuity stage.
 * Sources: Layer 10 (conversion), Firecrawl (ps).
 */
function countConversionSignals(conversion, ps) {
  const signals = {
    // 1 - Email auto-response system present (Layer 10 reuse)
    emailAutoResponse:      !!(conversion?.autoResponsePresent || ps?.emailAutoResponsePresent),
    // 2 - SMS capability present
    smsCapability:          !!(ps?.smsCapabilityPresent),
    // 3 - IVR or call management system present
    ivrPresent:             !!(ps?.ivrPresent),
    // 4 - After hours contact pathway
    afterHoursPathway:      !!(ps?.afterHoursPathwayPresent || conversion?.hoursVisible),
    // 5 - Conversational AI or live chat agent
    aiChatPresent:          !!(ps?.aiChatPresent),
    // 6 - Online booking system present
    onlineBooking:          !!(ps?.onlineBookingPresent || conversion?.bookingWidget),
    // 7 - Booking confirmation capability inferred
    bookingConfirmation:    !!(ps?.bookingConfirmationPresent),
    // 8 - Pre-arrival communication present
    preArrivalComms:        !!(ps?.preArrivalCommsPresent),
    // 9 - Technician identity on conversion pages
    technicianIdentity:     !!(ps?.technicianIdentityOnConversion),
    // 10 - Owner name and photo on contact page
    ownerOnContactPage:     !!(ps?.ownerOnContactPage),
    // 11 - Professional platform signal (custom domain + no free tier watermark)
    professionalPlatform:   !!(ps?.professionalPlatformSignal)
  };

  const passes = Object.values(signals).filter(Boolean).length;
  return { passes, signals };
}

/**
 * Count content signal passes for the Growth Loyalty stage.
 * Sources: Layer 11 (growth), Layer 7 (socialVoice), Firecrawl (ps).
 */
function countGrowthSignals(growth, socialVoice, ps) {
  const signals = {
    // 1 - Post-job follow-up system present
    postJobFollowUp:        !!(ps?.postJobFollowUpPresent || growth?.maintenancePlanPresent),
    // 2 - Annual check-in system detected
    annualCheckIn:          !!(ps?.annualCheckInPresent),
    // 3 - Review request cadence (Layer 11 reuse)
    reviewRequestCadence:   !!(growth?.reviewsLast90d >= 3 && ps?.reviewRequestSystemPresent),
    // 4 - Referral infrastructure present (Layer 11 reuse)
    referralInfrastructure: !!(growth?.referralInfraPresent || ps?.referralInfraPresent),
    // 5 - Seasonal content publishing (Layer 11 reuse)
    seasonalContent:        !!(ps?.seasonalContentPublishing || (growth?.gbpPostsLast90d >= 1)),
    // 6 - Promotions or seasonal offers present
    promotionsPresent:      !!(ps?.promotionsPresent),
    // 7 - Newsletter signup present and active
    newsletterActive:       !!(ps?.newsletterActive),
    // 8 - Membership or service plan present
    membershipPlan:         !!(ps?.membershipPlanPresent || growth?.maintenancePlanPresent),
    // 9 - Loyalty or rewards program present
    loyaltyProgram:         !!(ps?.loyaltyProgramPresent),
    // 10 - Social community building present
    socialCommunity:        !!(ps?.socialCommunityPresent),
    // 11 - Social posting cadence for retention (>= 50% relationship content)
    socialRetentionCadence: (socialVoice?.fbPostFrequency ?? 0) >= 4 && !!(ps?.socialRetentionContent),
    // 12 - Podcast present
    podcastPresent:         !!(ps?.podcastPresent),
    // 13 - Podcast posting active (>= 1 episode in 90 days)
    podcastActive:          !!(ps?.podcastActive),
    // 14 - Social posting cadence meets capacity-aware benchmark (Data365) -- NEW v2.3
    // Pass if actualPostsPerMonth >= contentBenchmark(currentQuarter, 2, 4, 6) x 0.75
    socialPostingCadence:   !!(ps?.socialPostingCadence)
  };

  const passes = Object.values(signals).filter(Boolean).length;
  return { passes, signals };
}

// Firecrawl signal keys that belong to each stage.
// Used to detect whether Firecrawl data was available for a stage at all.
// If none of a stage's Firecrawl keys are present in ps, the stage is flagged
// as not fully evaluable -- data to be captured at onboarding.
const DISCOVERY_PS_KEYS  = [
  'gbpPostLast90d', 'communityContentPresent', 'localGeoReferencesPresent',
  'faqPresent', 'socialAccountLinked', 'socialPostLast90d',
  'blogPresent', 'blogPostLast90d', 'metaOptimised', 'eventsPresent', 'sponsorshipPresent'
];
const ENGAGEMENT_PS_KEYS = [
  'reviewInLast60d', 'reviewWordCountPass', 'technicianNamesInReviews',
  'peoplePhotosPresent', 'beforeAfterPhotosPresent', 'galleryPresent',
  'photoCaptionsPresent', 'testimonialsPresent', 'chatPresent',
  'contactFormPresent', 'askAQuestionPresent', 'ugcQaPresent',
  'ctaOnHomepage', 'ctaVariety',
  'socialPostRecent', 'socialEngagementRatePass', 'socialOwnerResponds'  // NEW v2.3
];
const CONVERSION_PS_KEYS = [
  'emailAutoResponsePresent', 'smsCapabilityPresent', 'ivrPresent',
  'afterHoursPathwayPresent', 'aiChatPresent', 'onlineBookingPresent',
  'bookingConfirmationPresent', 'preArrivalCommsPresent',
  'technicianIdentityOnConversion', 'ownerOnContactPage', 'professionalPlatformSignal'
];
const GROWTH_PS_KEYS = [
  'postJobFollowUpPresent', 'annualCheckInPresent', 'reviewRequestSystemPresent',
  'referralInfraPresent', 'seasonalContentPublishing', 'promotionsPresent',
  'newsletterActive', 'membershipPlanPresent', 'loyaltyProgramPresent',
  'socialCommunityPresent', 'socialRetentionContent', 'podcastPresent', 'podcastActive',
  'socialPostingCadence'  // NEW v2.3
];

/**
 * Check whether a stage was genuinely evaluable or defaulted to zero due
 * to missing data sources.
 *
 * A stage is evaluable if at least one of its Firecrawl keys exists in ps
 * (even if the value is false -- presence of the key means it was assessed),
 * OR if a non-Firecrawl API fallback source has usable data for this stage.
 *
 * @param {Object}  ps            - personalizationSignals object
 * @param {Array}   psKeys        - Firecrawl keys for this stage
 * @param {boolean} hasApiFallback - whether a non-Firecrawl API source has data
 * @returns {boolean} true if stage was evaluable
 */
function isStageEvaluable(ps, psKeys, hasApiFallback) {
  if (hasApiFallback) return true;
  if (!ps || Object.keys(ps).length === 0) return false;
  return psKeys.some(key => key in ps);
}

/**
 * calcPersonalizationScore
 *
 * Calculates the Personalization Capture Model score from diagnostic data
 * and NLP quality call results. Produces four stage scores, a weighted
 * personalization score (0.0-3.0), capture rate (0%-85%), recoverable
 * revenue, and personalization lift.
 *
 * Per-stage dataAvailable flags and a dataAvailability summary block are
 * included so the results screen can surface which stages need onboarding
 * capture. Scores are not penalised for missing data -- absence defaults
 * to 0 passes, which is already the worst-case score for that stage.
 *
 * @param {Object} diagnosticData   - Complete diagnostic data object (all 12 layers)
 * @param {Object} nlpScores        - Four binary NLP quality call results (0 or 1 each)
 *   @param {number} nlpScores.discovery_quality_score
 *   @param {number} nlpScores.engagement_quality_score
 *   @param {number} nlpScores.conversion_quality_score
 *   @param {number} nlpScores.growth_quality_score
 * @param {number}  technicalRevenueGap  - totalGap from calculateDiagnostic()
 * @returns {Object} personalization result object
 */
function calcPersonalizationScore(diagnosticData, nlpScores, technicalRevenueGap) {
  const {
    gbp            = null,
    citations      = null,
    socialVoice    = null,
    conversion     = null,
    growth         = null,
    personalizationSignals: ps = {}  // Firecrawl pre-evaluated signal flags
  } = diagnosticData;

  // ── Defensive defaults for NLP scores
  const dq = nlpScores?.discovery_quality_score   === 1 ? 1 : 0;
  const eq = nlpScores?.engagement_quality_score  === 1 ? 1 : 0;
  const cq = nlpScores?.conversion_quality_score  === 1 ? 1 : 0;
  const gq = nlpScores?.growth_quality_score      === 1 ? 1 : 0;

  // ── Data availability -- per stage, per-source checks
  // Discovery: API fallback = GBP data present OR citations present
  // Engagement: API fallback = GBP data present (rating, review count)
  // Conversion: no API fallback -- entirely Firecrawl dependent
  // Growth: API fallback = Layer 11 growth data present
  const discoveryAvailable  = isStageEvaluable(ps, DISCOVERY_PS_KEYS,
    !!(gbp || citations));
  const engagementAvailable = isStageEvaluable(ps, ENGAGEMENT_PS_KEYS,
    !!(gbp?.rating || gbp?.reviewCount));
  const conversionAvailable = isStageEvaluable(ps, CONVERSION_PS_KEYS,
    false); // no non-Firecrawl fallback for conversion
  const growthAvailable     = isStageEvaluable(ps, GROWTH_PS_KEYS,
    !!(growth?.gbpPostsLast90d != null || growth?.referralInfraPresent != null));

  // ── Count content signal passes per stage
  const discoverySignals  = countDiscoverySignals(gbp, socialVoice, citations, ps);
  const engagementSignals = countEngagementSignals(gbp, socialVoice, ps);
  const conversionSignals = countConversionSignals(conversion, ps);
  const growthSignals     = countGrowthSignals(growth, socialVoice, ps);

  // ── Score each stage (0-3) applying the quality ceiling rule
  const discoveryScore  = scorePersonalizationStage(
    discoverySignals.passes,  14, dq, PERSONALIZATION_MAPPINGS.discovery);
  const engagementScore = scorePersonalizationStage(
    engagementSignals.passes, 19, eq, PERSONALIZATION_MAPPINGS.engagement);  // 19 signals v2.3
  const conversionScore = scorePersonalizationStage(
    conversionSignals.passes, 11, cq, PERSONALIZATION_MAPPINGS.conversion);
  const growthScore     = scorePersonalizationStage(
    growthSignals.passes,     14, gq, PERSONALIZATION_MAPPINGS.growth);  // 14 signals v2.3

  // ── Weighted personalization score (0.0-3.0)
  const weightedScore = (discoveryScore  * 0.20)
                      + (engagementScore * 0.35)
                      + (conversionScore * 0.30)
                      + (growthScore     * 0.15);

  const weightedScoreRounded = Math.round(weightedScore * 100) / 100;

  // ── Capture rate: (weightedScore / 3.0) x 85% ceiling -- no floor
  // Range: 0% (score = 0.0) to 85% ceiling (score = 3.0) -- v1 estimate
  // The floor was removed -- a business with zero personalization score
  // has not earned a guaranteed capture rate. Zero is honest.
  const captureRateRaw  = (weightedScore / 3.0) * BENCHMARKS.personalizationCaptureCeiling;
  const captureRate     = Math.min(captureRateRaw, BENCHMARKS.personalizationCaptureCeiling);
  const captureRatePct  = Math.round(captureRate * 100);

  // ── Full score capture rate (score = 3.0) -- at ceiling
  const fullCaptureRate = BENCHMARKS.personalizationCaptureCeiling;

  // ── Recoverable revenue at current score
  const recoverableRevenue = Math.round((technicalRevenueGap || 0) * captureRate);

  // ── Recoverable revenue at full score (Score 3.0 across all stages)
  const recoverableRevenueFullScore = Math.round((technicalRevenueGap || 0) * fullCaptureRate);

  // ── Personalization lift: the additional revenue ClearSky delivers
  // through personalization improvements (full score minus current score)
  const personalizationLift = Math.max(0, recoverableRevenueFullScore - recoverableRevenue);

  // ── Stage detail for results screen
  const stages = {
    discovery: {
      score:          discoveryScore,
      weight:         '20%',
      contentPasses:  discoverySignals.passes,
      contentTotal:   14,
      qualityScore:   dq,
      qualityCeiling: dq === 0 && discoverySignals.passes >= 12,
      dataAvailable:  discoveryAvailable,
      signals:        discoverySignals.signals
    },
    engagement: {
      score:          engagementScore,
      weight:         '35%',
      contentPasses:  engagementSignals.passes,
      contentTotal:   19,  // v2.3: +3 social signals
      qualityScore:   eq,
      qualityCeiling: eq === 0 && engagementSignals.passes >= 17,
      dataAvailable:  engagementAvailable,
      signals:        engagementSignals.signals
    },
    conversion: {
      score:          conversionScore,
      weight:         '30%',
      contentPasses:  conversionSignals.passes,
      contentTotal:   11,
      qualityScore:   cq,
      qualityCeiling: cq === 0 && conversionSignals.passes >= 9,
      dataAvailable:  conversionAvailable,
      signals:        conversionSignals.signals
    },
    growth: {
      score:          growthScore,
      weight:         '15%',
      contentPasses:  growthSignals.passes,
      contentTotal:   14,  // v2.3: +1 social signal
      qualityScore:   gq,
      qualityCeiling: gq === 0 && growthSignals.passes >= 12,
      dataAvailable:  growthAvailable,
      signals:        growthSignals.signals
    }
  };

  // ── Data availability summary
  const unevaluableStages = [
    !discoveryAvailable  && 'discovery',
    !engagementAvailable && 'engagement',
    !conversionAvailable && 'conversion',
    !growthAvailable     && 'growth'
  ].filter(Boolean);

  const dataAvailability = {
    discoveryAvailable,
    engagementAvailable,
    conversionAvailable,
    growthAvailable,
    unevaluableStages,
    flaggedForOnboarding: unevaluableStages.length > 0,
    note: unevaluableStages.length > 0
      ? unevaluableStages.length + ' stage(s) could not be fully evaluated -- signal data to be captured at onboarding: ' + unevaluableStages.join(', ')
      : 'All stages fully evaluated'
  };

  return {
    weightedScore:              weightedScoreRounded,
    captureRate:                captureRatePct + '%',
    captureRateDecimal:         Math.round(captureRate * 1000) / 1000,
    technicalRevenueGap:        technicalRevenueGap || 0,
    recoverableRevenue,
    recoverableRevenueFullScore,
    personalizationLift,
    stages,
    dataAvailability,
    // Formatted for display
    display: {
      weightedScore:          weightedScoreRounded.toFixed(2) + ' / 3.00',
      captureRate:            captureRatePct + '%',
      recoverableRevenue:     formatCurrency(recoverableRevenue),
      personalizationLift:    formatCurrency(personalizationLift),
      technicalRevenueGap:    formatCurrency(technicalRevenueGap || 0)
    }
  };
}

/**
 * calculateDiagnostic
 * 
 * Takes the complete diagnosticData object and returns a results object
 * ready for the frontend to render.
 * 
 * @param {Object} diagnosticData - Complete data from all API layers + self-reported inputs
 * @returns {Object} results - Fully calculated results object
 */
// ─────────────────────────────────────────────────────────────
// SESSION 7 FUNCTIONS -- v2.4
// Brand Tenure Modifier, Market Opportunity Multiplier,
// Diagnostic Confidence, Three-Scenario Recovery Model
// ─────────────────────────────────────────────────────────────

/**
 * getBrandTenureModifier -- Session 7 / v2.4
 *
 * Returns the unconditional capture rate modifier based on years in business.
 * Reflects earned offline trust independent of digital presence.
 * Modifier amplifies existing capture rate -- does NOT create revenue above zero.
 * Zero capture rate × any modifier = zero.
 *
 * @param {number} yearsInBusiness
 * @returns {Object} { modifier, label }
 */
function getBrandTenureModifier(yearsInBusiness) {
  const years = (yearsInBusiness != null) ? yearsInBusiness : BENCHMARKS.yearsInBusinessDefault;
  const tier = BENCHMARKS.brandTenureTiers.find(t => years >= t.minYears);
  return tier
    ? { modifier: tier.modifier, label: tier.label }
    : { modifier: 0.85, label: 'New' }; // fallback to lowest tier
}

/**
 * getMarketOpportunityMultiplier -- Session 7 / v2.4
 *
 * Returns Market_Opportunity_Multiplier = Market_Demand_Index × Competitive_Density_Index.
 * Applied to Total_Gap after AI risk and seasonal multipliers.
 *
 * @param {string} city              - Business city (used for lookup table)
 * @param {string} marketTierOverride - Prospect override ('booming'|'strong'|'neutral'|'slow'|'depressed')
 * @param {Object} paidMarketing     - Paid marketing layer data (for paid competitor count)
 * @returns {Object} { multiplier, demandTier, demandLabel, densityLabel, paidCompetitorCount }
 */
function getMarketOpportunityMultiplier(city, marketTierOverride, paidMarketing) {
  // ── Market Demand Index
  let demandTierKey;
  if (marketTierOverride && BENCHMARKS.marketDemandTiers[marketTierOverride]) {
    demandTierKey = marketTierOverride;
  } else {
    const cityKey = (city || '').toLowerCase().trim();
    demandTierKey = BENCHMARKS.marketDemandLookup[cityKey] || 'neutral';
  }
  const demandTier = BENCHMARKS.marketDemandTiers[demandTierKey];
  const demandMultiplier = demandTier.multiplier;

  // ── Competitive Density Index (paid competitors only: LSA + Google Ads + Meta Ads)
  const lsaCount     = (paidMarketing?.competitorLSAs?.length     || 0);
  const googleCount  = (paidMarketing?.competitorGoogleAds?.length || 0);
  const metaCount    = (paidMarketing?.competitorMetaAds?.length   || 0);
  const paidCompetitorCount = lsaCount + googleCount + metaCount;

  const densityTier = BENCHMARKS.competitiveDensityTiers.find(t => paidCompetitorCount <= t.maxCompetitors)
    || BENCHMARKS.competitiveDensityTiers[BENCHMARKS.competitiveDensityTiers.length - 1];
  const densityMultiplier = densityTier.multiplier;

  const multiplier = Math.round(demandMultiplier * densityMultiplier * 1000) / 1000;

  return {
    multiplier,
    demandTier:   demandTierKey,
    demandLabel:  demandTier.label,
    densityLabel: densityTier.label,
    paidCompetitorCount
  };
}

/**
 * calcDiagnosticConfidence -- Session 7 / v2.4
 *
 * Scores data confidence per layer (1.0 / 0.5 / 0.25) and calculates
 * overall diagnosticConfidence. Drives uncertainty spread for the
 * three-scenario recovery range shown in the results modal.
 *
 * uncertaintySpread = 0.20 + (0.25 × (1 − diagnosticConfidence))
 * Full confidence (1.0) → ±20% band. Low (0.5) → ±32.5%. Min (0.0) → ±45%.
 *
 * @param {Object} diagnosticData - Complete diagnostic data object
 * @returns {Object} { diagnosticConfidence, uncertaintySpread, layerConfidence }
 */
function calcDiagnosticConfidence(diagnosticData) {
  const {
    gbp, rank, citations, lighthouse, contentGap, aiVisibility,
    selfReported, socialVoice, paidMarketing, engagement, conversion,
    growth, canonicalHealth
  } = diagnosticData;

  // Score each of the 15 confidence inputs
  // 1.0 = full API data returned and complete
  // 0.5 = data returned but incomplete or fallback used
  // 0.25 = no data, engine default applied
  const layerConfidence = {
    gbp:         gbp?.rating != null && gbp?.reviewCount != null          ? 1.0 : gbp           ? 0.5 : 0.25,
    rank:        rank?.keywords?.length > 0                                ? 1.0 : rank          ? 0.5 : 0.25,
    citations:   citations?.count != null && citations?.count > 0         ? 1.0 : citations     ? 0.5 : 0.25,
    performance: lighthouse?.performance != null                           ? 1.0 : lighthouse    ? 0.5 : 0.25,
    content:     contentGap?.coveragePct != null                          ? 1.0 : contentGap    ? 0.5 : 0.25,
    aiVisibility:aiVisibility != null                                      ? 1.0 : 0.25,
    missedCalls: selfReported?.missedCallPct != null || selfReported?.missedCallRate != null ? 1.0 : 0.5,
    social:      socialVoice?.sentiment?.score != null || socialVoice?.sentimentScore != null ? 1.0 : socialVoice ? 0.5 : 0.25,
    paid:        paidMarketing != null                                     ? 1.0 : 0.25,
    engagement:  engagement != null                                        ? 1.0 : 0.5,
    conversion:  conversion != null                                        ? 1.0 : 0.5,
    growth:      growth?.gbpPostsLast90d != null                          ? 1.0 : growth        ? 0.5 : 0.25,
    canonical:   canonicalHealth?.alignmentPct != null                    ? 1.0 : canonicalHealth ? 0.5 : 0.25,
    market:      diagnosticData.business?.city                            ? 1.0 : 0.5,
    brandEquity: growth?.reviewsLast90d != null || gbp?.reviewCount != null ? 1.0 : 0.5
  };

  const values = Object.values(layerConfidence);
  const diagnosticConfidence = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000;

  // uncertaintySpread = confidenceSpreadMin + (0.25 × (1 − diagnosticConfidence))
  const uncertaintySpread = Math.round(
    (BENCHMARKS.confidenceSpreadMin + 0.25 * (1 - diagnosticConfidence)) * 1000
  ) / 1000;

  return { diagnosticConfidence, uncertaintySpread, layerConfidence };
}

/**
 * calcScenarioRecovery -- Session 7 / v2.4
 *
 * Three-Scenario Recovery Model. Produces low/mid/high revenue ranges
 * for each scenario driven by diagnosticConfidence uncertainty spread.
 *
 * Scenario 1 - Current Reality:   current capture rate × tenure, capacity-constrained
 * Scenario 2 - Market Opportunity: same capture rate + tenure, capacity at 85% ceiling
 * Scenario 3 - Full Potential:    full personalization (85%) × tenure × market opportunity
 *
 * @param {number} totalGap          - Total revenue gap from calculateDiagnostic()
 * @param {Object} personalization   - Result of calcPersonalizationScore()
 * @param {Object} capacityResult    - Result of calcCapacityLift()
 * @param {Object} brandTenure       - Result of getBrandTenureModifier()
 * @param {Object} marketOpportunity - Result of getMarketOpportunityMultiplier()
 * @param {Object} confidenceResult  - Result of calcDiagnosticConfidence()
 * @returns {Object} { technicalGap, current, market, potential }
 */
function calcScenarioRecovery(totalGap, personalization, capacityResult,
                               brandTenure, marketOpportunity, confidenceResult) {
  const ceiling = BENCHMARKS.personalizationCaptureCeiling; // 0.85
  const spread  = confidenceResult.uncertaintySpread;
  const tenure  = brandTenure.modifier;

  // ── Gap range (confidence-driven)
  const gapLow  = Math.round(totalGap * (1 - spread));
  const gapMid  = totalGap;
  const gapHigh = Math.round(totalGap * (1 + spread));

  // ── Scenario 1: Current Reality
  // Current capture rate × tenure modifier, capacity-constrained to avg quarterly utilisation
  const currentCaptureBase = personalization.captureRateDecimal || 0;
  const currentCaptureAdj  = Math.min(currentCaptureBase * tenure, ceiling);
  // Capacity constraint: average utilisation across quarters as fraction of ceiling
  const avgGapPct          = parseFloat(capacityResult.detail.avgAnnualGap) / 100;
  const currentCapacityFactor = Math.max(0, 1 - avgGapPct); // utilisation = 1 - gap
  const currentCapture     = currentCaptureAdj * currentCapacityFactor;

  const currentLow  = Math.round(gapLow  * currentCapture);
  const currentMid  = Math.round(gapMid  * currentCapture);
  const currentHigh = Math.round(gapHigh * currentCapture);

  // ── Scenario 2: Market Opportunity
  // Same capture rate + tenure, capacity fills to realistic 85% ceiling (full utilisation)
  const marketCapture = Math.min(currentCaptureBase * tenure, ceiling);

  const marketLow   = Math.round(gapLow  * marketCapture);
  const marketMid   = Math.round(gapMid  * marketCapture);
  const marketHigh  = Math.round(gapHigh * marketCapture);

  // ── Scenario 3: Full Potential
  // Full personalization (85% capture) × tenure modifier × market opportunity multiplier
  // Capped at ceiling -- market multiplier amplifies but doesn't breach cap
  const fullCaptureBase = ceiling;
  const fullCaptureAdj  = Math.min(fullCaptureBase * tenure, ceiling);
  const mktMult         = marketOpportunity.multiplier;

  const potentialLow  = Math.round(gapLow  * fullCaptureAdj * mktMult);
  const potentialMid  = Math.round(gapMid  * fullCaptureAdj * mktMult);
  const potentialHigh = Math.round(gapHigh * fullCaptureAdj * mktMult);

  return {
    technicalGap: {
      low:  gapLow,
      mid:  gapMid,
      high: gapHigh,
      display: {
        low:  formatCurrency(gapLow),
        mid:  formatCurrency(gapMid),
        high: formatCurrency(gapHigh)
      }
    },
    current: {
      label:       BENCHMARKS.scenarioLabels.current,
      captureRate: Math.round(currentCapture * 100) + '%',
      low:         currentLow,
      mid:         currentMid,
      high:        currentHigh,
      display: {
        low:  formatCurrency(currentLow),
        mid:  formatCurrency(currentMid),
        high: formatCurrency(currentHigh)
      }
    },
    market: {
      label:       BENCHMARKS.scenarioLabels.market,
      captureRate: Math.round(marketCapture * 100) + '%',
      low:         marketLow,
      mid:         marketMid,
      high:        marketHigh,
      display: {
        low:  formatCurrency(marketLow),
        mid:  formatCurrency(marketMid),
        high: formatCurrency(marketHigh)
      }
    },
    potential: {
      label:           BENCHMARKS.scenarioLabels.potential,
      captureRate:     Math.round(fullCaptureAdj * ceiling * 100) + '%',
      marketMultiplier: mktMult.toFixed(2) + 'x',
      low:             potentialLow,
      mid:             potentialMid,
      high:            potentialHigh,
      display: {
        low:  formatCurrency(potentialLow),
        mid:  formatCurrency(potentialMid),
        high: formatCurrency(potentialHigh)
      }
    },
    meta: {
      uncertaintySpread:           Math.round(spread * 100) + '%',
      diagnosticConfidence:        Math.round(confidenceResult.diagnosticConfidence * 100) + '%',
      brandTenureModifier:         tenure.toFixed(2) + 'x',
      brandTenureLabel:            brandTenure.label,
      marketOpportunityMultiplier: mktMult.toFixed(2) + 'x',
      demandTier:                  marketOpportunity.demandLabel,
      densityLabel:                marketOpportunity.densityLabel
    }
  };
}

function calculateDiagnostic(diagnosticData) {
  const {
    business = {},
    selfReported = {},
    gbp = null,
    rank = null,
    citations = null,
    lighthouse = null,
    contentGap = null,
    aiVisibility = null,
    socialVoice = null,
    paidMarketing = null,
    engagement: rawEngagement = null,
    conversion = null,
    growth = null,
    canonicalHealth = null   // Layer 12 -- canonical health agent output
  } = diagnosticData;

  // ── Core inputs
  const annualRevenue   = selfReported.annualRevenue    || 300000;
  const avgSaleValue    = selfReported.avgSaleValue     || 3000;
  const vertical        = business.vertical             || 'trades';
  const population      = business.population           || 50000;
  const trade           = business.trade                || 'plumber';
  const city            = business.city                 || '';

  // ── Multipliers
  const seasonal        = calculateSeasonalMultiplier(selfReported.seasonal);
  const engResult       = calculateEngagementScore(rawEngagement);
  const engagementMult  = engResult.multiplier;
  const aiResult        = calculateAiScore(aiVisibility, citations);
  const aiMult          = aiResult.multiplier;
  const { citationMult, napMult } = calculateCitationMultipliers(citations);

  // ── Layer 12: Canonical health suppression multiplier
  // Applied to GBP, Rank, Citation, and AI Visibility gaps
  const canonicalResult    = calcCanonicalHealth(canonicalHealth);
  const canonicalMult      = canonicalResult.suppressionMult;

  // ── Brand Tenure Modifier -- unconditional capture rate amplifier (Session 7 / v2.4)
  const brandTenure        = getBrandTenureModifier(selfReported.yearsInBusiness);

  // ── Market Opportunity Multiplier -- demand × competitive density (Session 7 / v2.4)
  const marketOpportunity  = getMarketOpportunityMultiplier(
    city, selfReported.marketTierOverride, paidMarketing);

  // ── Diagnostic Confidence -- layer data quality scoring (Session 7 / v2.4)
  const confidenceResult   = calcDiagnosticConfidence(diagnosticData);

  // ── Monthly search volume estimate (ContentRadar provides actual in production)
  const monthlySearches = business.monthlySearchVolume
    || estimateMonthlySearchVolume(trade, city, population);

  // ── Average current CTR from rank data
  const ctrMap = BENCHMARKS.mapPackCTR;
  const avgCurrentCtr = rank && rank.keywords
    ? avg(rank.keywords.map(kw => ctrMap[kw.position] || ctrMap['none']))
    : ctrMap['none'];

  // ── Layer 3: Site retention rate (Session 15)
  // siteRetentionRate is a modifier applied inside Layer 1 and Layer 2 gap calculations.
  // It represents the fraction of earned clicks that actually see the site.
  // A slow site taxes every click regardless of rank position or GBP quality.
  const siteRetentionRate = getSiteRetentionRate(lighthouse?.performanceScore || lighthouse?.performance || 0);

  // ── Calculate all gaps
  // Layer 12 canonical suppression multiplier is applied to layers 1, 2A, 2B, and 5
  // It represents ranking authority suppression from canonical misalignment
  const gbpGapResult     = calcGbpGap(gbp, monthlySearches, avgSaleValue, seasonal, siteRetentionRate);
  const gbpGapAdjusted   = Math.round(gbpGapResult.value * canonicalMult);
  const rankGapResult    = calcRankGap(rank, monthlySearches, avgSaleValue, seasonal, citationMult, napMult, engagementMult, siteRetentionRate);
  const rankGapAdjusted  = Math.round(rankGapResult.value * canonicalMult);
  const perfGapResult    = calcPerformanceGap(lighthouse, monthlySearches, avgCurrentCtr, avgSaleValue, seasonal);
  const contentGapResult = calcContentGap(contentGap, avgSaleValue, seasonal, engagementMult);
  const missedCallResult = calcMissedCallGap(selfReported, monthlySearches, avgCurrentCtr, avgSaleValue, seasonal);
  const capacityResult   = calcCapacityLift(selfReported, avgSaleValue, seasonal, vertical);
  const growthResult     = calcGrowthScore(growth, gbp, socialVoice, contentGap, selfReported, population);

  // Extract raw quarterly capacity gaps (fractions) for Social_Adjustment Components 3-5
  const quarterlyCapacityGaps = {
    q1: parseFloat(capacityResult.detail.quarterlyGaps.q1) / 100,
    q2: parseFloat(capacityResult.detail.quarterlyGaps.q2) / 100,
    q3: parseFloat(capacityResult.detail.quarterlyGaps.q3) / 100,
    q4: parseFloat(capacityResult.detail.quarterlyGaps.q4) / 100
  };

  const socialResult     = calcSocialAdjustment(socialVoice, gbpGapResult.value, avgSaleValue, annualRevenue, quarterlyCapacityGaps);
  const paidGapResult    = calcPaidGap(paidMarketing, selfReported, lighthouse, gbp, contentGap, seasonal);
  const engagementResult = calcEngagementGap(engResult, monthlySearches, avgCurrentCtr, avgSaleValue, seasonal, engagementMult);
  const convInfraResult  = calcConversionInfrastructureAdjustment(conversion, missedCallResult.value);

  // ── Adjusted missed call gap (reduced by conversion infrastructure if auto-response present)
  const adjustedMissedCallGap = Math.max(0, missedCallResult.value + convInfraResult.adjustment);

  // ── Sum base gap (GBP and Rank use canonical-adjusted values)
  // Note: perfGapResult.value is 0 -- Layer 3 gap retired Session 15.
  // Site performance is now embedded in Layer 1 and Layer 2 via siteRetentionRate.
  const baseGap = gbpGapAdjusted
    + rankGapAdjusted
    + contentGapResult.value
    + adjustedMissedCallGap
    + socialResult.value
    + paidGapResult.value
    + engagementResult.value;

  // ── Apply AI risk multiplier then Market Opportunity Multiplier
  // Note: seasonal multiplier is already applied inside each individual gap function.
  // Total_Gap = Base_Gap × AI_Risk_Multiplier × Market_Opportunity_Multiplier
  const totalGapPreMarket = Math.round(baseGap * aiMult);
  const totalGap          = Math.round(totalGapPreMarket * marketOpportunity.multiplier);

  // ── Projected revenue
  const projectedRevenue = Math.round(annualRevenue + totalGap + capacityResult.value);

  // ── Benchmark lift percentage
  const benchmark = BENCHMARKS.verticalBenchmarks[vertical] || BENCHMARKS.verticalBenchmarks.trades;

  // ── Health scorecard
  const healthScores = {
    gbp: {
      status: getGbpStatus(gbp),
      rating: gbp?.rating || 'not found',
      reviewCount: gbp?.reviewCount || 0
    },
    rank: {
      status: getRankStatus(rank),
      keywords: rank?.keywords || []
    },
    citations: {
      status: getCitationStatus(citations),
      count: citations?.count || 0,
      benchmark: BENCHMARKS.citationBenchmark,
      napConsistent: !citations?.napMismatches,
      schemaPresent: citations?.schemaPresent || false
    },
    performance: {
      status: (lighthouse?.performance || 0) >= 80 ? 'green' : (lighthouse?.performance || 0) >= 50 ? 'amber' : 'red',
      score: lighthouse?.performance || 0,
      cwvPass: (lighthouse?.lcp?.pass && lighthouse?.cls?.pass) || false
    },
    content: {
      status: contentGapResult.detail?.status || 'red',
      coveragePct: contentGapResult.detail?.coveragePct || '0%',
      missing: contentGapResult.detail?.missing || 0
    },
    aiVisibility: {
      status: getAiStatus(aiResult.score),
      score: aiResult.score,
      platforms: aiResult.platforms || {}
    },
    missedCalls: {
      status: missedCallResult.detail?.status || 'red',
      rate: missedCallResult.detail?.missedCallPct || '0%'
    },
    social: {
      status: socialResult.detail?.status || 'red',
      sentiment: socialResult.detail?.sentimentScore || '0%',
      themes: socialResult.detail?.themes || []
    },
    paidPressure: {
      status: paidGapResult.detail?.status || 'green',
      competitors: (paidGapResult.detail?.competitorLSAs?.length || 0)
        + (paidGapResult.detail?.competitorGoogleAds?.length || 0)
        + (paidGapResult.detail?.competitorMetaAds?.length || 0)
    },
    engagement: {
      status: engagementResult.detail?.status || 'red',
      score: engResult.score,
      signals: engResult.signals || {}
    },
    conversion: {
      status: convInfraResult.detail?.status || 'red',
      score: convInfraResult.detail?.conversionScore || '0/5'
    },
    growth: {
      score: growthResult.score,
      label: growthResult.label,
      signals: growthResult.signals,
      brandEquity: growthResult.brandEquity
    },
    // Layer 12 -- canonical health
    canonicalHealth: {
      status: getCanonicalStatus(canonicalResult),
      alignmentPct: canonicalResult.detail?.alignmentPct || 'not checked',
      suppressionMult: canonicalResult.suppressionMult,
      duplicateGbpFound: canonicalResult.detail?.duplicateGbpFound || false,
      napMismatches: canonicalResult.detail?.napMismatches || 0,
      aiAccuracyScore: canonicalResult.detail?.aiAccuracyScore || 'not checked',
      remediationList: canonicalResult.detail?.remediationList || []
    }
  };

  // ── Gap breakdown for display
  const gaps = {
    gbp:           gbpGapAdjusted,
    rank:          rankGapAdjusted,
    performance:   perfGapResult.value,
    content:       contentGapResult.value,
    missedCalls:   adjustedMissedCallGap,
    social:        socialResult.value,
    paid:          paidGapResult.value,
    engagement:    engagementResult.value,
    capacityLift:  capacityResult.value,
    total:         totalGap,
    projected:     projectedRevenue,
    // Formatted for display
    display: {
      current:   formatCurrency(annualRevenue),
      gap:       formatCurrency(totalGap),
      capacity:  formatCurrency(capacityResult.value),
      projected: formatCurrency(projectedRevenue)
    }
  };

  // ── Capacity insight plain language
  const capDetail = capacityResult.detail;
  const adminPersonLabel = (selfReported.adminStaffCount || 1) === 1 ? 'the owner or manager' : `${selfReported.adminStaffCount} people`;
  const capacityInsight = `${adminPersonLabel.charAt(0).toUpperCase() + adminPersonLabel.slice(1)} is currently spending ${capDetail.adminHoursPerWeek} hours per week on admin. ClearSky automation returns approximately ${capDetail.savedHrsPerWeek} of those hours. At $${capDetail.adminHourlyRate}/hr that is $${Math.round(capDetail.savedHrsPerWeek * capDetail.adminHourlyRate * 52 / 1000)}K per year in reclaimed time -- without hiring anyone new. Combined with filling ${capDetail.avgAnnualGap} of idle capacity across the year, total addressable value is ${formatCurrency(capDetail.totalCapacityValue)}.`;

  // ── Meta
  const meta = {
    seasonalMultiplier:    Math.round(seasonal * 100) + '%',
    aiRiskMultiplier:      aiMult.toFixed(2) + 'x',
    engagementMultiplier:  Math.round(engagementMult * 100) + '%',
    citationMultiplier:    citationMult.toFixed(2) + 'x',
    canonicalMultiplier:   canonicalMult.toFixed(2) + 'x',  // Layer 12
    benchmarkLift:         benchmark.pct,
    verticalLabel:         benchmark.label,
    monthlySearches,
    avgCurrentCtr:         Math.round(avgCurrentCtr * 100) + '%',
    // ── Session 7 / v2.4
    brandTenureModifier:         brandTenure.modifier.toFixed(2) + 'x',
    brandTenureLabel:            brandTenure.label,
    brandTenureYears:            selfReported.yearsInBusiness || BENCHMARKS.yearsInBusinessDefault,
    marketOpportunityMultiplier: marketOpportunity.multiplier.toFixed(2) + 'x',
    marketDemandTier:            marketOpportunity.demandLabel,
    competitiveDensity:          marketOpportunity.densityLabel,
    paidCompetitorCount:         marketOpportunity.paidCompetitorCount,
    diagnosticConfidence:        Math.round(confidenceResult.diagnosticConfidence * 100) + '%',
    uncertaintySpread:           Math.round(confidenceResult.uncertaintySpread * 100) + '%'
  };

  // ── Scenario Recovery (pre-personalization pass: captureRateDecimal = 0)
  // The integration layer should call calcScenarioRecovery() again after
  // calcPersonalizationScore() completes and merge results.scenarios.
  const scenarioResult = calcScenarioRecovery(
    totalGap,
    { captureRateDecimal: 0 },
    capacityResult,
    brandTenure,
    marketOpportunity,
    confidenceResult
  );

  return {
    business: {
      name:             business.name,
      city:             business.city,
      trade:            business.trade,
      websiteURL:       business.websiteURL,
      gbpRating:        gbp?.rating || 'not found',
      reviewCount:      gbp?.reviewCount || 0,
      lighthouseScore:  lighthouse?.performance || 0,
      mapPackPosition:  rank?.keywords?.[0]?.position || 'not in pack'
    },
    healthScores,
    gaps,
    capacityInsight,
    growthStatement: growthResult.growthStatement,
    scenarios: scenarioResult,  // pre-personalization placeholder; merge after calcPersonalizationScore()
    meta,
    // Raw gap details for debugging / transparency
    rawGaps: {
      gbp:         { ...gbpGapResult, canonicalAdjusted: gbpGapAdjusted },
      rank:        { ...rankGapResult, canonicalAdjusted: rankGapAdjusted },
      performance:  perfGapResult,
      content:     contentGapResult,
      missedCalls: missedCallResult,
      social:      socialResult,
      paid:        paidGapResult,
      engagement:  engagementResult,
      conversion:  convInfraResult,
      capacity:    capacityResult,
      growth:      growthResult,
      canonical:   canonicalResult,     // Layer 12
      confidence:  confidenceResult,    // Session 7 / v2.4
      brandTenure,                      // Session 7 / v2.4
      marketOpportunity                 // Session 7 / v2.4
    }
  };
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  calculateDiagnostic,
  BENCHMARKS,
  // Export individual calculators for unit testing
  calcGbpGap,
  calcRankGap,
  calcPerformanceGap,
  calcContentGap,
  calcMissedCallGap,
  calcSocialAdjustment,
  calcPaidGap,
  calcEngagementGap,
  calcConversionInfrastructureAdjustment,
  calcCapacityLift,
  calcGrowthScore,
  calcBrandEquityIndex,            // Session 7 / v2.4
  getBrandTenureModifier,          // Session 7 / v2.4
  getMarketOpportunityMultiplier,  // Session 7 / v2.4
  calcDiagnosticConfidence,        // Session 7 / v2.4
  calcScenarioRecovery,            // Session 7 / v2.4
  calcPersonalizationScore,        // Personalization Capture Model
  calcCanonicalHealth,             // Layer 12
  contentBenchmark,                // Capacity-Aware Content Model utility -- v2.3
  calculateSeasonalMultiplier,
  calculateEngagementScore,
  calculateAiScore,
  calculateCitationMultipliers,
  calculateOrganicHealthScore,
  formatCurrency
};
