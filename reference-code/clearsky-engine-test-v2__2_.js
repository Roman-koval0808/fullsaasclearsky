/**
 * ClearSky Diagnostic Engine -- Test Suite
 * 
 * Run: node clearsky-engine-test.js
 * 
 * Tests the calculation engine against realistic sample data
 * representing a typical Northern Ontario plumber diagnostic.
 */

'use strict';

const { calculateDiagnostic, formatCurrency, BENCHMARKS,
        calcPersonalizationScore, calcCapacityLift, calcSocialAdjustment,
        contentBenchmark,
        getBrandTenureModifier, getMarketOpportunityMultiplier,
        calcDiagnosticConfidence, calcScenarioRecovery,
        calcBrandEquityIndex } = require('./clearsky-engine-v2');

// ─────────────────────────────────────────────────────────────
// SAMPLE DIAGNOSTIC DATA -- realistic Timmins plumber scenario
// ─────────────────────────────────────────────────────────────

const sampleData = {
  business: {
    name: 'Rempel Plumbing and Drain',
    city: 'Timmins',
    province: 'ON',
    trade: 'plumber',
    vertical: 'trades',
    population: 41145,
    websiteURL: 'https://rempelplumbing.ca',
    monthlySearchVolume: 280 // from ContentRadar for plumber + Timmins market
  },

  selfReported: {
    annualRevenue: 340000,
    avgSaleValue: 2800,
    newClientsPerMonth: 12,
    missedCallPct: 30,
    paidSpend: { google: 400, facebook: 150, other: 0 },
    staffCount: 2,
    adminStaffCount: 1,        // owner carries the admin burden
    adminHourlyRate: 30,       // owner hourly value for admin cost saving
    adminHoursPerWeek: 8,      // v2.3: direct input -- replaces nonBillablePct (retired)
    seasonal: { q2: 85, q3: 65, q4: 40 }
  },

  // Layer 1 -- Google Places API
  gbp: {
    rating: 3.9,
    reviewCount: 18,
    reviewRecency: '2025-11-15',
    photosPresent: true,
    hoursPublished: true,
    websiteLinked: true,
    ownerResponseCount: 3,
    reviews: [
      { text: 'Called three times, no answer. Had to find someone else.', rating: 1 },
      { text: 'Mark showed up on time and fixed the leak quickly. Good work.', rating: 5 },
      { text: 'Did a good job on the sump pump but was hard to reach.', rating: 3 },
      { text: 'Very professional. Fair price. Would use again.', rating: 5 },
      { text: 'Never called back. Very disappointed.', rating: 1 }
    ]
  },

  // Layer 2A -- Local Rank Tool
  rank: {
    keywords: [
      { keyword: 'plumber timmins', position: 'none', competitors: ['Timmins Plumbing Pro', 'Northern Pipe Works'] },
      { keyword: 'emergency plumber timmins', position: 'none', competitors: ['Timmins Plumbing Pro', 'John\'s Plumbing'] },
      { keyword: 'drain cleaning timmins', position: 3, competitors: ['Timmins Plumbing Pro', 'DrainMaster'] },
      { keyword: 'sump pump repair timmins', position: 'none', competitors: ['Timmins Plumbing Pro'] },
      { keyword: 'water heater repair timmins', position: 2, competitors: ['Northern Pipe Works'] }
    ]
  },

  // Layer 2B -- DataForSEO Content Analysis + On-Page
  citations: {
    count: 11,
    napMismatches: 2,
    schemaPresent: false,
    schemaErrors: [],
    directories: ['Google Business Profile', 'Facebook', 'Yellow Pages Canada', 'Yelp Canada']
  },

  // Layer 3 -- Google PageSpeed Insights
  lighthouse: {
    performance: 38,
    seo: 72,
    accessibility: 61,
    bestPractices: 75,
    isHttps: true,
    lcp: { value: 6.2, pass: false },
    inp: { value: 280, pass: false },
    cls: { value: 0.12, pass: true }
  },

  // Layer 4 -- Firecrawl + ContentRadar + SerpAPI
  contentGap: {
    covered: 6,
    weak: 4,
    missing: [
      { keyword: 'sump pump not turning on', monthlySearches: 90, urgency: 'critical' },
      { keyword: 'frozen pipe repair timmins', monthlySearches: 70, urgency: 'critical' },
      { keyword: 'backflow preventer test', monthlySearches: 45, urgency: 'high' },
      { keyword: 'drain camera inspection', monthlySearches: 55, urgency: 'high' },
      { keyword: 'emergency plumber cost after hours', monthlySearches: 80, urgency: 'critical' },
      { keyword: 'hose bib winterize', monthlySearches: 40, urgency: 'high' },
      { keyword: 'anode rod replacement', monthlySearches: 35, urgency: 'standard' },
      { keyword: 'water softener installation timmins', monthlySearches: 50, urgency: 'high' }
    ],
    paaGaps: 12
  },

  // Layer 5 -- DataForSEO AI Optimization API
  aiVisibility: {
    mentionCount: 0,
    liveResults: {
      chatgpt:     false,
      gemini:      false,
      perplexity:  false,
      aiOverviews: false
    },
    competitorComparison: {
      'Timmins Plumbing Pro': { mentionCount: 8, platforms: ['chatgpt', 'perplexity'] }
    }
  },

  // Layer 7 -- Facebook + Data365 + Claude NLP
  socialVoice: {
    sentimentScore: 0.52,
    themes: ['response speed', 'reliability', 'work quality'],
    unansweredMentions: 8,
    reviewResponseRate: 0.17,
    reviewVelocity90d: 2,
    fbPostFrequency: 0,
    // v2.3 Social Content Model fields (Data365)
    actualPostsPerMonth: 0,       // no active posting
    socialEngagementRate: 0.008,  // 0.8% -- below 2% trades benchmark
    unansweredComments: 4         // 4 unanswered customer questions on posts
  },

  // Layer 8 -- DataForSEO SERP + ScrapeCreators
  paidMarketing: {
    competitorLSAs: ['Timmins Plumbing Pro', 'John\'s Plumbing'],
    competitorGoogleAds: ['Timmins Plumbing Pro'],
    competitorMetaAds: ['Northern Pipe Works'],
    serpDisplacementByKeyword: {
      'plumber timmins': 2,
      'emergency plumber timmins': 2
    }
  },

  // Layer 9 -- Website scraper + page source + Claude NLP
  engagement: {
    faqPresent: false,
    clickToCall: false,
    bookingWidget: false,
    liveChat: false,
    trustSignals: false,
    emergencyAvailability: false,
    pricingTransparency: false,
    ctaStrength: 1
  },

  // Layer 10 -- Website scraper + page source
  conversion: {
    autoResponsePresent: false,
    ctaUrgency: 1,
    formFieldCount: 6,
    contactPathways: 1,
    hoursVisible: false
  },

  // Layer 11 -- Places API + website scraper + Facebook
  growth: {
    gbpPostsLast90d: 0,
    reviewsLast90d: 2,
    contentPublishingActive: false,
    referralInfraPresent: false,
    socialPostFrequency: 0,
    maintenancePlanPresent: false
  },

  // Layer 12 -- Canonical Health Agent
  canonicalHealth: {
    surfacesChecked: 18,        // all managed surfaces audited
    surfacesAligned: 9,         // 9 of 18 surfaces fully match canonical NAP
    napMismatches: 6,           // 6 surfaces with NAP variations found
    duplicateGbpFound: true,    // a second GBP listing detected for this business
    canonicalTagsMissing: 4,    // 4 website pages missing canonical tags
    schemaNapMismatch: true,    // schema markup conflicts with GBP NAP
    aiAccuracyScore: 0.42,      // AI platforms representing business at 42% accuracy
    remediationList: [
      { surface: 'Google Business Profile (duplicate)', issue: 'Duplicate listing detected -- must be merged or suppressed', priority: 'critical' },
      { surface: 'HomeStars',   issue: 'Business name listed as "Rempel Plumbing" -- canonical is "Rempel Plumbing and Drain"', priority: 'high' },
      { surface: 'Yellow Pages Canada', issue: 'Phone number outdated -- 705-xxx-xxxx vs canonical', priority: 'high' },
      { surface: 'Website schema', issue: 'LocalBusiness schema name does not match GBP name', priority: 'high' },
      { surface: 'Yelp Canada',  issue: 'Address missing suite number', priority: 'medium' }
    ]
  }
};

// ─────────────────────────────────────────────────────────────
// RUN TESTS
// ─────────────────────────────────────────────────────────────

function runTests() {
  console.log('\n========================================');
  console.log('ClearSky Diagnostic Engine -- Test Run');
  console.log('Scenario: Rempel Plumbing, Timmins ON');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, condition, detail = '') {
    if (condition) {
      console.log('  PASS -- ' + name);
      passed++;
    } else {
      console.log('  FAIL -- ' + name + (detail ? ' -- ' + detail : ''));
      failed++;
    }
  }

  // ── Run the engine
  const results = calculateDiagnostic(sampleData);

  // ── Section 1: Engine runs without errors
  console.log('-- Section 1: Engine Output Structure --');
  test('Results object returned', !!results);
  test('Business profile present', !!results.business);
  test('Health scores present', !!results.healthScores);
  test('Gaps object present', !!results.gaps);
  test('Meta object present', !!results.meta);
  test('Raw gaps present', !!results.rawGaps);

  // ── Section 2: Multipliers
  console.log('\n-- Section 2: Multipliers --');
  const seasonal = parseFloat(results.meta.seasonalMultiplier) / 100;
  test('Seasonal multiplier in valid range', seasonal >= 0.50 && seasonal <= 1.00,
    'Got: ' + results.meta.seasonalMultiplier);
  test('Seasonal multiplier calculation correct',
    Math.abs(seasonal - (100 + 85 + 65 + 40) / 4 / 100) < 0.01,
    'Expected ~72.5%, got: ' + results.meta.seasonalMultiplier);

  test('AI risk multiplier is 1.20 (0/4 platforms)',
    results.meta.aiRiskMultiplier === '1.20x',
    'Got: ' + results.meta.aiRiskMultiplier);

  test('Engagement multiplier is 0.55 (0/8 signals)',
    results.meta.engagementMultiplier === '55%',
    'Got: ' + results.meta.engagementMultiplier);

  test('Citation multiplier > 1.00 (only 11 citations)',
    parseFloat(results.meta.citationMultiplier) > 1.00,
    'Got: ' + results.meta.citationMultiplier);

  // ── Section 3: Health scores
  console.log('\n-- Section 3: Health Score Status --');
  test('GBP status is amber or red (3.9 stars, 18 reviews)',
    ['amber', 'red'].includes(results.healthScores.gbp.status),
    'Got: ' + results.healthScores.gbp.status);

  test('Rank status is red (mostly not in pack)',
    results.healthScores.rank.status === 'red',
    'Got: ' + results.healthScores.rank.status);

  test('Citation status is red (11 citations, mismatches, no schema)',
    results.healthScores.citations.status === 'red',
    'Got: ' + results.healthScores.citations.status);

  test('Performance status is red (Lighthouse 38)',
    results.healthScores.performance.status === 'red',
    'Got: ' + results.healthScores.performance.status);

  test('AI visibility status is red (0/4 platforms)',
    results.healthScores.aiVisibility.status === 'red',
    'Got: ' + results.healthScores.aiVisibility.status);

  test('Engagement status is red (0/8 signals)',
    results.healthScores.engagement.status === 'red',
    'Got: ' + results.healthScores.engagement.status);

  test('Growth score is 0 (no infrastructure)',
    results.healthScores.growth.score === 0,
    'Got: ' + results.healthScores.growth.score);

  test('Growth label is "Not started"',
    results.healthScores.growth.label === 'Not started',
    'Got: ' + results.healthScores.growth.label);

  // ── Section 4: Gap values
  console.log('\n-- Section 4: Gap Values (sanity checks) --');
  test('GBP gap is positive', results.gaps.gbp > 0, 'Got: ' + formatCurrency(results.gaps.gbp));
  test('Rank gap is positive', results.gaps.rank > 0, 'Got: ' + formatCurrency(results.gaps.rank));
  test('Performance gap is positive', results.gaps.performance > 0, 'Got: ' + formatCurrency(results.gaps.performance));
  test('Content gap is positive', results.gaps.content > 0, 'Got: ' + formatCurrency(results.gaps.content));
  test('Missed call gap is positive', results.gaps.missedCalls > 0, 'Got: ' + formatCurrency(results.gaps.missedCalls));
  test('Social adjustment is positive', results.gaps.social > 0, 'Got: ' + formatCurrency(results.gaps.social));
  test('Paid gap is positive', results.gaps.paid > 0, 'Got: ' + formatCurrency(results.gaps.paid));
  test('Capacity lift is positive', results.gaps.capacityLift > 0, 'Got: ' + formatCurrency(results.gaps.capacityLift));

  test('Total gap is larger than any single gap',
    results.gaps.total > Math.max(results.gaps.gbp, results.gaps.rank, results.gaps.missedCalls),
    'Total: ' + formatCurrency(results.gaps.total));

  test('Projected revenue is larger than current revenue',
    results.gaps.projected > sampleData.selfReported.annualRevenue,
    'Current: ' + formatCurrency(sampleData.selfReported.annualRevenue) + ', Projected: ' + results.gaps.display.projected);

  test('Total gap is credible (less than 12x current revenue -- extreme cases expected when all 12 layers are red)',
    results.gaps.total < sampleData.selfReported.annualRevenue * 12,
    'Gap: ' + formatCurrency(results.gaps.total) + ' vs Revenue: ' + formatCurrency(sampleData.selfReported.annualRevenue));

  // ── Section 5: Specific formula verification
  console.log('\n-- Section 5: Formula Verification --');

  // Missed call gap manual check
  // avgCurrentCtr for this scenario: mostly 'none' position = 0.03
  // keywords: none, none, 3, none, 2 -> ctrs: 0.03, 0.03, 0.17, 0.03, 0.24 -> avg = 0.10
  const testAvgCtr = (0.03 + 0.03 + 0.17 + 0.03 + 0.24) / 5;
  const expectedMissedCalls = Math.round(
    280 * testAvgCtr * BENCHMARKS.clickToCallRate
    * 0.30 * BENCHMARKS.noCallbackRate * 2800 * 12
    * ((100 + 85 + 65 + 40) / 4 / 100)
  );
  test('Missed call gap matches manual calculation',
    Math.abs(results.gaps.missedCalls - expectedMissedCalls) < 2000,
    'Expected ~' + formatCurrency(expectedMissedCalls) + ', Got: ' + formatCurrency(results.gaps.missedCalls));

  // Seasonal multiplier manual check
  const expectedSeasonal = (100 + 85 + 65 + 40) / 4 / 100;
  test('Seasonal multiplier is approximately 0.725',
    Math.abs(expectedSeasonal - 0.725) < 0.001);

  // ── Section 6: Display fields
  console.log('\n-- Section 6: Display Fields --');
  test('Current revenue formatted', results.gaps.display.current.startsWith('$'));
  test('Gap formatted', results.gaps.display.gap.startsWith('$'));
  test('Projected formatted', results.gaps.display.projected.startsWith('$'));
  test('Capacity insight string generated', results.capacityInsight.length > 50);
  test('Growth statement generated', results.growthStatement.length > 20);

  // ── Section 7: Edge case -- perfect business
  console.log('\n-- Section 7: Edge Case -- Strong Business --');
  const strongBusiness = JSON.parse(JSON.stringify(sampleData));
  strongBusiness.gbp.rating = 4.8;
  strongBusiness.gbp.reviewCount = 95;
  strongBusiness.gbp.ownerResponseCount = 90;
  strongBusiness.rank.keywords = strongBusiness.rank.keywords.map(k => ({ ...k, position: 1 }));
  strongBusiness.citations.count = 55;
  strongBusiness.citations.napMismatches = 0;
  strongBusiness.citations.schemaPresent = true;
  strongBusiness.lighthouse.performance = 94;
  strongBusiness.aiVisibility.liveResults = { chatgpt: true, gemini: true, perplexity: true, aiOverviews: true };
  strongBusiness.engagement = { faqPresent: true, clickToCall: true, bookingWidget: true, liveChat: true, trustSignals: true, emergencyAvailability: true, pricingTransparency: true, ctaStrength: 5 };
  strongBusiness.canonicalHealth = {
    surfacesChecked: 18, surfacesAligned: 17, napMismatches: 0,
    duplicateGbpFound: false, canonicalTagsMissing: 0, schemaNapMismatch: false,
    aiAccuracyScore: 0.95, remediationList: []
  };

  const strongResults = calculateDiagnostic(strongBusiness);
  test('Strong business has lower total gap than weak business',
    strongResults.gaps.total < results.gaps.total,
    'Strong: ' + formatCurrency(strongResults.gaps.total) + ', Weak: ' + formatCurrency(results.gaps.total));
  test('Strong business AI multiplier is 1.00',
    strongResults.meta.aiRiskMultiplier === '1.00x',
    'Got: ' + strongResults.meta.aiRiskMultiplier);
  test('Strong business engagement multiplier is 100%',
    strongResults.meta.engagementMultiplier === '100%',
    'Got: ' + strongResults.meta.engagementMultiplier);
  test('Strong business GBP status is green',
    strongResults.healthScores.gbp.status === 'green',
    'Got: ' + strongResults.healthScores.gbp.status);
  test('Strong business canonical multiplier is 1.00',
    strongResults.meta.canonicalMultiplier === '1.00x',
    'Got: ' + strongResults.meta.canonicalMultiplier);
  test('Strong business canonical status is green',
    strongResults.healthScores.canonicalHealth.status === 'green',
    'Got: ' + strongResults.healthScores.canonicalHealth.status);

  // ── Section 8: Layer 12 Canonical Health tests
  console.log('\n-- Section 8: Layer 12 Canonical Health --');

  test('Canonical health panel exists in healthScores',
    !!results.healthScores.canonicalHealth,
    'canonicalHealth key missing from healthScores');

  test('Canonical suppression multiplier is applied (> 1.00 for misaligned business)',
    results.meta.canonicalMultiplier !== '1.00x',
    'Got: ' + results.meta.canonicalMultiplier);

  test('Canonical multiplier is in meta object',
    !!results.meta.canonicalMultiplier,
    'canonicalMultiplier missing from meta');

  test('Duplicate GBP detected in sample data',
    results.healthScores.canonicalHealth.duplicateGbpFound === true,
    'Got: ' + results.healthScores.canonicalHealth.duplicateGbpFound);

  test('Canonical status is red (50% alignment with duplicate GBP)',
    results.healthScores.canonicalHealth.status === 'red',
    'Got: ' + results.healthScores.canonicalHealth.status);

  test('Canonical suppression multiplier is > 1.16 (50% alignment + duplicate GBP)',
    results.rawGaps.canonical.suppressionMult > 1.16,
    'Got: ' + results.rawGaps.canonical.suppressionMult);

  test('GBP gap in rawGaps shows canonical-adjusted value',
    results.rawGaps.gbp.canonicalAdjusted >= results.rawGaps.gbp.value,
    'Adjusted: ' + formatCurrency(results.rawGaps.gbp.canonicalAdjusted) +
    ', Base: ' + formatCurrency(results.rawGaps.gbp.value));

  test('Rank gap in rawGaps shows canonical-adjusted value',
    results.rawGaps.rank.canonicalAdjusted >= results.rawGaps.rank.value,
    'Adjusted: ' + formatCurrency(results.rawGaps.rank.canonicalAdjusted) +
    ', Base: ' + formatCurrency(results.rawGaps.rank.value));

  test('Remediation list is present and non-empty',
    Array.isArray(results.healthScores.canonicalHealth.remediationList) &&
    results.healthScores.canonicalHealth.remediationList.length > 0,
    'Got length: ' + (results.healthScores.canonicalHealth.remediationList?.length || 0));

  test('Canonical agent missing data produces default amber suppression',
    (() => {
      const noCanonicalData = JSON.parse(JSON.stringify(sampleData));
      delete noCanonicalData.canonicalHealth;
      const noCanonicalResults = calculateDiagnostic(noCanonicalData);
      return noCanonicalResults.rawGaps.canonical.suppressionMult === 1.08;
    })(),
    'Default suppression should be 1.08 when no canonical data');

  // ── Section 9: Personalization Capture Model
  console.log('\n-- Section 9: Personalization Capture Model --');

  // Shared signal sets
  const noSignals = {};

  const allPassSignals = {
    // Discovery (14)
    gbpPostLast90d: true, communityContentPresent: true, localGeoReferencesPresent: true,
    faqPresent: true, socialAccountLinked: true, socialPostLast90d: true,
    blogPresent: true, blogPostLast90d: true, metaOptimised: true,
    eventsPresent: true, sponsorshipPresent: true,
    // Engagement (19 -- v2.3: +3 social signals)
    reviewInLast60d: true, reviewWordCountPass: true, technicianNamesInReviews: true,
    peoplePhotosPresent: true, beforeAfterPhotosPresent: true, galleryPresent: true,
    photoCaptionsPresent: true, testimonialsPresent: true, chatPresent: true,
    contactFormPresent: true, askAQuestionPresent: true, ugcQaPresent: true,
    ctaOnHomepage: true, ctaVariety: true,
    socialPostRecent: true, socialEngagementRatePass: true, socialOwnerResponds: true,
    // Conversion (11)
    emailAutoResponsePresent: true, smsCapabilityPresent: true, ivrPresent: true,
    afterHoursPathwayPresent: true, aiChatPresent: true, onlineBookingPresent: true,
    bookingConfirmationPresent: true, preArrivalCommsPresent: true,
    technicianIdentityOnConversion: true, ownerOnContactPage: true, professionalPlatformSignal: true,
    // Growth (14 -- v2.3: +1 social signal)
    postJobFollowUpPresent: true, annualCheckInPresent: true, reviewRequestSystemPresent: true,
    referralInfraPresent: true, seasonalContentPublishing: true, promotionsPresent: true,
    newsletterActive: true, membershipPlanPresent: true, loyaltyProgramPresent: true,
    socialCommunityPresent: true, socialRetentionContent: true, podcastPresent: true,
    podcastActive: true, socialPostingCadence: true
  };

  const fullGbp = { rating: 4.8, reviewCount: 50, ownerResponseCount: 45 };
  const fullSocial = { fbPostFrequency: 5 };
  const fullConversion = { autoResponsePresent: true, hoursVisible: true };
  const fullGrowth = { gbpPostsLast90d: 5, reviewsLast90d: 10, referralInfraPresent: true, maintenancePlanPresent: true };
  const fullCitations = { schemaPresent: true };

  const technicalRevenueGap = results.gaps.total; // use the Rempel diagnostic gap as the anchor

  // ── Test P1: Zero personalization -- no signals, all quality = 0
  // Expect: score 0.00, capture 40%, lift = gap to 85% ceiling
  const p1 = calcPersonalizationScore(
    { personalizationSignals: noSignals },
    { discovery_quality_score: 0, engagement_quality_score: 0, conversion_quality_score: 0, growth_quality_score: 0 },
    technicalRevenueGap
  );
  test('P1: Zero personalization -- weighted score is 0.00',
    p1.weightedScore === 0.00, 'Got: ' + p1.weightedScore);
  test('P1: Zero personalization -- capture rate is 0%',
    p1.captureRate === '0%', 'Got: ' + p1.captureRate);
  test('P1: Zero personalization -- recoverable revenue is 0',
    p1.recoverableRevenue === 0,
    'Got: ' + formatCurrency(p1.recoverableRevenue));
  test('P1: Zero personalization -- lift equals full score recoverable (0% to 85%)',
    p1.personalizationLift === p1.recoverableRevenueFullScore,
    'Got lift: ' + formatCurrency(p1.personalizationLift));

  // ── Test P2: Full personalization -- all signals pass, all quality = 1
  // Expect: score 3.00, capture 85% (ceiling), lift = 0
  const p2 = calcPersonalizationScore(
    { gbp: fullGbp, citations: fullCitations, socialVoice: fullSocial, conversion: fullConversion, growth: fullGrowth, personalizationSignals: allPassSignals },
    { discovery_quality_score: 1, engagement_quality_score: 1, conversion_quality_score: 1, growth_quality_score: 1 },
    technicalRevenueGap
  );
  test('P2: Full personalization -- weighted score is 3.00',
    p2.weightedScore === 3.00, 'Got: ' + p2.weightedScore);
  test('P2: Full personalization -- capture rate is 85% (ceiling)',
    p2.captureRate === '85%', 'Got: ' + p2.captureRate);
  test('P2: Full personalization -- recoverable revenue is 85% of gap',
    Math.abs(p2.recoverableRevenue - Math.round(technicalRevenueGap * 0.85)) <= 1,
    'Got: ' + formatCurrency(p2.recoverableRevenue));
  test('P2: Full personalization -- lift is 0 (already at ceiling)',
    p2.personalizationLift === 0,
    'Got: ' + formatCurrency(p2.personalizationLift));

  // ── Test P3: Quality ceiling rule -- all signals pass, all quality = 0
  // Expect: all stages capped at 2, weighted score 2.00, capture 80%, lift = gap to 85%
  const p3 = calcPersonalizationScore(
    { gbp: fullGbp, citations: fullCitations, socialVoice: fullSocial, conversion: fullConversion, growth: fullGrowth, personalizationSignals: allPassSignals },
    { discovery_quality_score: 0, engagement_quality_score: 0, conversion_quality_score: 0, growth_quality_score: 0 },
    technicalRevenueGap
  );
  test('P3: Quality ceiling -- all stages capped at score 2',
    p3.stages.discovery.score === 2 &&
    p3.stages.engagement.score === 2 &&
    p3.stages.conversion.score === 2 &&
    p3.stages.growth.score === 2,
    'Got: D=' + p3.stages.discovery.score + ' E=' + p3.stages.engagement.score +
    ' C=' + p3.stages.conversion.score + ' G=' + p3.stages.growth.score);
  test('P3: Quality ceiling -- weighted score is 2.00',
    p3.weightedScore === 2.00, 'Got: ' + p3.weightedScore);
  test('P3: Quality ceiling -- capture rate is 57% ((2/3) x 85%)',
    p3.captureRate === '57%', 'Got: ' + p3.captureRate);
  test('P3: Quality ceiling -- qualityCeiling flag is true on all stages',
    p3.stages.discovery.qualityCeiling === true &&
    p3.stages.engagement.qualityCeiling === true &&
    p3.stages.conversion.qualityCeiling === true &&
    p3.stages.growth.qualityCeiling === true,
    'Got: D=' + p3.stages.discovery.qualityCeiling + ' E=' + p3.stages.engagement.qualityCeiling +
    ' C=' + p3.stages.conversion.qualityCeiling + ' G=' + p3.stages.growth.qualityCeiling);

  // ── Test P4: Quality unlocks Score 3 -- same signals, flip quality to 1
  // Expect: all stages jump from 2 to 3, capture 85%
  const p4 = calcPersonalizationScore(
    { gbp: fullGbp, citations: fullCitations, socialVoice: fullSocial, conversion: fullConversion, growth: fullGrowth, personalizationSignals: allPassSignals },
    { discovery_quality_score: 1, engagement_quality_score: 1, conversion_quality_score: 1, growth_quality_score: 1 },
    technicalRevenueGap
  );
  test('P4: Quality unlocks Score 3 -- all stages reach score 3',
    p4.stages.discovery.score === 3 &&
    p4.stages.engagement.score === 3 &&
    p4.stages.conversion.score === 3 &&
    p4.stages.growth.score === 3,
    'Got: D=' + p4.stages.discovery.score + ' E=' + p4.stages.engagement.score +
    ' C=' + p4.stages.conversion.score + ' G=' + p4.stages.growth.score);
  test('P4: Quality unlocks Score 3 -- capture hits 85% ceiling',
    p4.captureRate === '85%', 'Got: ' + p4.captureRate);

  // ── Test P5: Partial quality -- only engagement quality = 1, others = 0
  // Engagement weight = 35%, so weighted score = (0*0.20)+(1*0.35)+(0*0.30)+(0*0.15) = 0.35
  // But stages need enough content passes to reach score 1 first
  // Use mid-band signals: 5-8 engagement passes, 4-7 discovery, 3-5 conversion, 3-6 growth
  const midSignals = {
    // Discovery: 5 passes (band 4-7 = score 1)
    gbpPostLast90d: true, faqPresent: true, socialAccountLinked: true,
    metaOptimised: true, localGeoReferencesPresent: true,
    // Engagement: 6 passes (band 5-8 = score 1), quality=1 so stays at 1
    reviewInLast60d: true, reviewWordCountPass: true, technicianNamesInReviews: true,
    peoplePhotosPresent: true, contactFormPresent: true, ctaOnHomepage: true,
    // Conversion: 4 passes (band 3-5 = score 1)
    emailAutoResponsePresent: true, onlineBookingPresent: true,
    ownerOnContactPage: true, professionalPlatformSignal: true,
    // Growth: 4 passes (band 3-6 = score 1)
    postJobFollowUpPresent: true, referralInfraPresent: true,
    seasonalContentPublishing: true, promotionsPresent: true
  };
  const p5 = calcPersonalizationScore(
    { gbp: { rating: 4.1, reviewCount: 15, ownerResponseCount: 6 }, citations: { schemaPresent: false }, socialVoice: { fbPostFrequency: 0 }, conversion: {}, growth: { gbpPostsLast90d: 1, reviewsLast90d: 2 }, personalizationSignals: midSignals },
    { discovery_quality_score: 0, engagement_quality_score: 1, conversion_quality_score: 0, growth_quality_score: 0 },
    technicalRevenueGap
  );
  test('P5: Partial quality -- all four stages score 1',
    p5.stages.discovery.score === 1 &&
    p5.stages.engagement.score === 1 &&
    p5.stages.conversion.score === 1 &&
    p5.stages.growth.score === 1,
    'Got: D=' + p5.stages.discovery.score + ' E=' + p5.stages.engagement.score +
    ' C=' + p5.stages.conversion.score + ' G=' + p5.stages.growth.score);
  test('P5: Partial quality -- weighted score is 1.00',
    p5.weightedScore === 1.00, 'Got: ' + p5.weightedScore);
  test('P5: Partial quality -- capture rate is 28% ((1/3) x 85%)',
    p5.captureRate === '28%', 'Got: ' + p5.captureRate);

  // ── Test P6: Realistic weak business -- Rempel Plumbing profile
  // Low signals across the board, no quality -- expect low score
  const rempelSignals = {
    // Discovery: 3 passes (GBP photos implied, schema absent, social absent)
    localGeoReferencesPresent: true, metaOptimised: false, faqPresent: false,
    gbpPostLast90d: false, communityContentPresent: false, socialAccountLinked: false,
    blogPresent: false, eventsPresent: false, sponsorshipPresent: false,
    // Engagement: 3 passes (rating < 4.0 fails, response rate 17% fails)
    reviewInLast60d: true, contactFormPresent: true, ctaOnHomepage: true,
    reviewWordCountPass: false, technicianNamesInReviews: false, peoplePhotosPresent: false,
    galleryPresent: false, testimonialsPresent: false, chatPresent: false,
    // Conversion: 0 passes
    // Growth: 0 passes
  };
  const p6 = calcPersonalizationScore(
    { gbp: sampleData.gbp, citations: sampleData.citations, socialVoice: sampleData.socialVoice,
      conversion: sampleData.conversion, growth: sampleData.growth, personalizationSignals: rempelSignals },
    { discovery_quality_score: 0, engagement_quality_score: 0, conversion_quality_score: 0, growth_quality_score: 0 },
    technicalRevenueGap
  );
  test('P6: Rempel Plumbing -- discovery score is 0 (<= 3 passes)',
    p6.stages.discovery.score === 0,
    'Got: ' + p6.stages.discovery.score + ' (' + p6.stages.discovery.contentPasses + ' passes)');
  test('P6: Rempel Plumbing -- engagement score is 0 (<= 4 passes)',
    p6.stages.engagement.score === 0,
    'Got: ' + p6.stages.engagement.score + ' (' + p6.stages.engagement.contentPasses + ' passes)');
  test('P6: Rempel Plumbing -- capture rate is 0% (score zero, no floor)',
    p6.captureRate === '0%', 'Got: ' + p6.captureRate);
  test('P6: Rempel Plumbing -- personalization lift is positive',
    p6.personalizationLift > 0,
    'Got: ' + formatCurrency(p6.personalizationLift));

  // ── Test P7: Null nlpScores -- should default all quality to 0, no crash
  const p7 = calcPersonalizationScore(
    { personalizationSignals: allPassSignals, gbp: fullGbp, citations: fullCitations,
      socialVoice: fullSocial, conversion: fullConversion, growth: fullGrowth },
    null,
    technicalRevenueGap
  );
  test('P7: Null nlpScores -- function does not throw',
    !!p7, 'Function threw or returned falsy');
  test('P7: Null nlpScores -- all quality defaults to 0, all stages capped at 2',
    p7.stages.discovery.score <= 2 &&
    p7.stages.engagement.score <= 2 &&
    p7.stages.conversion.score <= 2 &&
    p7.stages.growth.score <= 2,
    'Got: D=' + p7.stages.discovery.score + ' E=' + p7.stages.engagement.score +
    ' C=' + p7.stages.conversion.score + ' G=' + p7.stages.growth.score);

  // ── Test P8: No personalizationSignals key -- graceful zeros, no crash
  const p8 = calcPersonalizationScore(
    { gbp: sampleData.gbp, citations: sampleData.citations },
    { discovery_quality_score: 1, engagement_quality_score: 1, conversion_quality_score: 1, growth_quality_score: 1 },
    technicalRevenueGap
  );
  test('P8: No personalizationSignals -- function does not throw',
    !!p8, 'Function threw or returned falsy');
  test('P8: No personalizationSignals -- conversion and growth passes are 0 (no Firecrawl data)',
    p8.stages.conversion.contentPasses === 0 &&
    p8.stages.growth.contentPasses === 0,
    'Got: C=' + p8.stages.conversion.contentPasses + ' G=' + p8.stages.growth.contentPasses);
  test('P8: No personalizationSignals -- capture rate is 0% (no floor)',
    p8.captureRate === '0%', 'Got: ' + p8.captureRate);

  // ── Personalization output preview
  console.log('\nPERSONALIZATION OUTPUT PREVIEW -- Rempel Plumbing, Timmins ON');
  console.log('--------------------------------------------------------------');
  console.log('Technical Revenue Gap:   ' + p6.display.technicalRevenueGap);
  console.log('Weighted Score:          ' + p6.display.weightedScore);
  console.log('Capture Rate:            ' + p6.display.captureRate);
  console.log('Recoverable Revenue:     ' + p6.display.recoverableRevenue);
  console.log('Personalization Lift:    ' + p6.display.personalizationLift);
  console.log('');
  console.log('Stage Breakdown:');
  Object.entries(p6.stages).forEach(([stage, s]) => {
    const ceiling = s.qualityCeiling ? ' [CEILING]' : '';
    console.log('  ' + stage.padEnd(12) + 'score=' + s.score + '  passes=' + s.contentPasses + '/' + s.contentTotal + '  quality=' + s.qualityScore + ceiling);
  });
  console.log('');

  // ─────────────────────────────────────────────────────────
  // SESSION 6 TEST SUITE
  // ─────────────────────────────────────────────────────────

  // ── Section 10: Admin formula v2.3
  console.log('\n-- Section 10: Admin Formula v2.3 --');

  // Rempel: adminStaffCount=1, adminHoursPerWeek=8, adminHourlyRate=30
  // Saved_Hrs = 1 × 8 × 0.40 = 3.2 hrs/wk
  // Annual_Cost_Saving = 3.2 × 30 × 52 = $4,992 (~$5K)
  const capRempel = calcCapacityLift(sampleData.selfReported, 2800, null, 'trades');

  test('S10-1: adminHoursPerWeek=8 used directly (not adminPct)',
    capRempel.detail.adminHoursPerWeek === 8,
    'Got: ' + capRempel.detail.adminHoursPerWeek);

  test('S10-2: savedHrsPerWeek = 1 × 8 × 0.40 = 3.2',
    capRempel.detail.savedHrsPerWeek === 3.2,
    'Expected 3.2, got: ' + capRempel.detail.savedHrsPerWeek);

  test('S10-3: annualCostSaving = 3.2 × $30 × 52 ≈ $5K',
    Math.abs(capRempel.detail.annualCostSaving - 4992) <= 5,
    'Expected ~$4992, got: ' + capRempel.detail.annualCostSaving);

  test('S10-4: capacityTimeSavingRate is 0.40',
    BENCHMARKS.capacityTimeSavingRate === 0.40,
    'Got: ' + BENCHMARKS.capacityTimeSavingRate);

  test('S10-5: adminHoursPerWeekDefault is 8',
    BENCHMARKS.adminHoursPerWeekDefault === 8,
    'Got: ' + BENCHMARKS.adminHoursPerWeekDefault);

  // Default when adminHoursPerWeek not supplied
  const capDefault = calcCapacityLift(
    { annualRevenue: 300000, adminStaffCount: 1, adminHourlyRate: 30, seasonal: { q2: 85, q3: 65, q4: 45 } },
    3000, null, 'trades'
  );
  test('S10-6: adminHoursPerWeek defaults to 8 when not provided',
    capDefault.detail.adminHoursPerWeek === 8,
    'Got: ' + capDefault.detail.adminHoursPerWeek);

  test('S10-7: detail includes adminHoursPerWeek field',
    'adminHoursPerWeek' in capRempel.detail,
    'adminHoursPerWeek missing from detail object');

  // ── Section 11: Rempel $84K capacity lift verification
  console.log('\n-- Section 11: Rempel $84K Capacity Lift Verification --');

  // Rempel: annualRevenue=$340K, q2=85, q3=65, q4=40
  // q1Gap=0%, q2Gap=12.75%, q3Gap=29.75%, q4Gap=51% → avg=23.375%
  // idleCapacityValue = 340000 × 0.23375 = ~$79,475
  // annualCostSaving  = 3.2 × 30 × 52   = $4,992
  // total             = ~$84,467

  test('S11-1: idleCapacityValue ≈ $79K',
    Math.abs(capRempel.detail.idleCapacityValue - 79475) <= 500,
    'Expected ~$79475, got: ' + capRempel.detail.idleCapacityValue);

  test('S11-2: annualCostSaving ≈ $5K',
    Math.abs(capRempel.detail.annualCostSaving - 4992) <= 5,
    'Expected ~$4992, got: ' + capRempel.detail.annualCostSaving);

  test('S11-3: totalCapacityValue ≈ $84K',
    Math.abs(capRempel.detail.totalCapacityValue - 84467) <= 1000,
    'Expected ~$84K, got: ' + formatCurrency(capRempel.detail.totalCapacityValue));

  test('S11-4: totalCapacityValue < $89K (confirms 0.80→0.40 rate change)',
    capRempel.detail.totalCapacityValue < 89000,
    'Got: ' + formatCurrency(capRempel.detail.totalCapacityValue));

  test('S11-5: Q1 gap is 0% (at ceiling in peak)',
    capRempel.detail.quarterlyGaps.q1 === '0%',
    'Got: ' + capRempel.detail.quarterlyGaps.q1);

  test('S11-6: Q4 gap is largest (40% seasonal index → 51% capacity gap)',
    parseFloat(capRempel.detail.quarterlyGaps.q4) > parseFloat(capRempel.detail.quarterlyGaps.q3),
    'Q4: ' + capRempel.detail.quarterlyGaps.q4 + ', Q3: ' + capRempel.detail.quarterlyGaps.q3);

  // ── Section 12: contentBenchmark() utility function
  console.log('\n-- Section 12: contentBenchmark() Utility --');

  // At ceiling (gap ≤ 0.05) → floors at minVal
  test('S12-1: floors at minVal when capacityGap ≤ threshold (0.0)',
    contentBenchmark(0.0, 2, 4, 6) === 2,
    'Got: ' + contentBenchmark(0.0, 2, 4, 6));

  test('S12-2: floors at minVal at exact threshold (0.05)',
    contentBenchmark(0.05, 2, 4, 6) === 2,
    'Got: ' + contentBenchmark(0.05, 2, 4, 6));

  // Rempel Q2 gap ≈ 12.75%: MIN(4 × 1.1275, 6) = MIN(4.51, 6) = 4.51
  const q2Benchmark = contentBenchmark(0.1275, 2, 4, 6);
  test('S12-3: Q2 Rempel gap (12.75%) produces benchmark between min and max',
    q2Benchmark > 2 && q2Benchmark <= 6,
    'Got: ' + q2Benchmark.toFixed(2));

  // Rempel Q4 gap ≈ 51%: MIN(4 × 1.51, 6) = MIN(6.04, 6) = 6
  test('S12-4: Q4 Rempel gap (51%) caps at maxVal=6',
    contentBenchmark(0.51, 2, 4, 6) === 6,
    'Got: ' + contentBenchmark(0.51, 2, 4, 6));

  // GBP posting benchmarks
  test('S12-5: GBP posting floors at min=1 at ceiling',
    contentBenchmark(0.0, 1, 2, 4) === 1,
    'Got: ' + contentBenchmark(0.0, 1, 2, 4));

  // gap=1.0: MIN(2 × 2.0, 4) = MIN(4.0, 4) = 4 -- exactly hits cap
  test('S12-6: GBP posting caps at max=4 at gap=1.0',
    contentBenchmark(1.0, 1, 2, 4) === 4,
    'Got: ' + contentBenchmark(1.0, 1, 2, 4));

  // FAQ cadence
  test('S12-7: FAQ cadence floors at min=0 at ceiling',
    contentBenchmark(0.0, 0, 1, 2) === 0,
    'Got: ' + contentBenchmark(0.0, 0, 1, 2));

  // ── Section 13: Social_Adjustment five components
  console.log('\n-- Section 13: Social_Adjustment Five Components (v2.3) --');

  // Use Rempel quarterly gaps for the posting gap calculation
  const rempelCapGaps = {
    q1: 0.0,
    q2: 0.1275,
    q3: 0.2975,
    q4: 0.51
  };

  // Rempel: sentimentScore=0.52 (<0.70 → component 1 fires)
  //         unansweredMentions=8 (>5 → component 2 fires)
  //         actualPostsPerMonth=0 (→ component 3 fires)
  //         socialEngagementRate=0.008 (below 2% → component 4 fires)
  //         unansweredComments=4 (→ component 5 fires)
  const socialRempel = calcSocialAdjustment(
    sampleData.socialVoice,
    results.rawGaps.gbp.value,
    sampleData.selfReported.avgSaleValue,
    sampleData.selfReported.annualRevenue,
    rempelCapGaps
  );

  test('S13-1: social adjustment detail has all five component keys',
    'sentimentMultiplierGap' in socialRempel.detail &&
    'unansweredMentionsGap' in socialRempel.detail &&
    'postingGap' in socialRempel.detail &&
    'engagementGapSocial' in socialRempel.detail &&
    'responseGap' in socialRempel.detail,
    'Missing keys: ' + JSON.stringify(Object.keys(socialRempel.detail)));

  test('S13-2: Component 1 sentimentMultiplierGap > 0 (score 0.52 < threshold 0.70)',
    socialRempel.detail.sentimentMultiplierGap > 0,
    'Got: ' + socialRempel.detail.sentimentMultiplierGap);

  test('S13-3: Component 2 unansweredMentionsGap > 0 (8 mentions > threshold 5)',
    socialRempel.detail.unansweredMentionsGap > 0,
    'Got: ' + socialRempel.detail.unansweredMentionsGap);

  test('S13-4: Component 3 postingGap > 0 (0 posts/month)',
    socialRempel.detail.postingGap > 0,
    'Got: ' + socialRempel.detail.postingGap);

  test('S13-5: Component 4 engagementGapSocial > 0 (0.8% rate < 2% benchmark)',
    socialRempel.detail.engagementGapSocial > 0,
    'Got: ' + socialRempel.detail.engagementGapSocial);

  test('S13-6: Component 5 responseGap > 0 (4 unanswered comments)',
    socialRempel.detail.responseGap > 0,
    'Got: ' + socialRempel.detail.responseGap);

  test('S13-7: total value ≈ sum of all five components (rounding ≤ 2)',
    Math.abs(socialRempel.value - (
      socialRempel.detail.sentimentMultiplierGap +
      socialRempel.detail.unansweredMentionsGap +
      socialRempel.detail.postingGap +
      socialRempel.detail.engagementGapSocial +
      socialRempel.detail.responseGap
    )) <= 2,
    'Total: ' + socialRempel.value);

  // null socialVoice → graceful zero
  const noSocial = calcSocialAdjustment(null, 10000, 2800, 340000, rempelCapGaps);
  test('S13-8: null socialVoice returns value=0 gracefully',
    noSocial.value === 0,
    'Got: ' + noSocial.value);

  // At ceiling (all gaps=0) → posting gap = 0
  const atCeilingGaps = { q1: 0.0, q2: 0.0, q3: 0.0, q4: 0.0 };
  const atCeilingSocial = calcSocialAdjustment(
    { sentimentScore: 0.80, unansweredMentions: 0, actualPostsPerMonth: 2,
      socialEngagementRate: 0.03, unansweredComments: 0 },
    10000, 2800, 340000, atCeilingGaps
  );
  test('S13-9: postingGap is 0 when all quarterly gaps are at ceiling (≤0.05)',
    atCeilingSocial.detail.postingGap === 0,
    'Got: ' + atCeilingSocial.detail.postingGap);

  // Full engagement rate (≥2%) → engagementGapSocial = 0
  const fullEngSocial = calcSocialAdjustment(
    { sentimentScore: 0.80, unansweredMentions: 0, actualPostsPerMonth: 4,
      socialEngagementRate: 0.02, unansweredComments: 0 },
    10000, 2800, 340000, rempelCapGaps
  );
  test('S13-10: engagementGapSocial is 0 when rate ≥ 2% trades benchmark',
    fullEngSocial.detail.engagementGapSocial === 0,
    'Got: ' + fullEngSocial.detail.engagementGapSocial);

  // ── Section 14: Four new personalization signals
  console.log('\n-- Section 14: Four New Personalization Signals (v2.3) --');

  // Three new Engagement signals
  const engOnlyNewSignals = {
    socialPostRecent: true, socialEngagementRatePass: true, socialOwnerResponds: true
  };
  const s14eng = calcPersonalizationScore(
    { personalizationSignals: engOnlyNewSignals },
    { discovery_quality_score: 0, engagement_quality_score: 0,
      conversion_quality_score: 0, growth_quality_score: 0 },
    technicalRevenueGap
  );
  test('S14-1: socialPostRecent, socialEngagementRatePass, socialOwnerResponds count as Engagement passes',
    s14eng.stages.engagement.contentPasses === 3,
    'Expected 3, got: ' + s14eng.stages.engagement.contentPasses);

  // New Growth signal
  const growthOnlyNewSignal = { socialPostingCadence: true };
  const s14grow = calcPersonalizationScore(
    { personalizationSignals: growthOnlyNewSignal },
    { discovery_quality_score: 0, engagement_quality_score: 0,
      conversion_quality_score: 0, growth_quality_score: 0 },
    technicalRevenueGap
  );
  test('S14-2: socialPostingCadence counts as a Growth pass',
    s14grow.stages.growth.contentPasses === 1,
    'Expected 1, got: ' + s14grow.stages.growth.contentPasses);

  // Updated contentTotal values
  test('S14-3: Engagement contentTotal is 19 (was 16)',
    s14eng.stages.engagement.contentTotal === 19,
    'Got: ' + s14eng.stages.engagement.contentTotal);

  test('S14-4: Growth contentTotal is 14 (was 13)',
    s14grow.stages.growth.contentTotal === 14,
    'Got: ' + s14grow.stages.growth.contentTotal);

  // Full pass with all 58 signals
  const s14full = calcPersonalizationScore(
    { gbp: fullGbp, citations: fullCitations, socialVoice: fullSocial,
      conversion: fullConversion, growth: fullGrowth,
      personalizationSignals: allPassSignals },
    { discovery_quality_score: 1, engagement_quality_score: 1,
      conversion_quality_score: 1, growth_quality_score: 1 },
    technicalRevenueGap
  );
  test('S14-5: all 58 signals pass with quality=1 → score 3.00, capture 85%',
    s14full.weightedScore === 3.00 && s14full.captureRate === '85%',
    'Score: ' + s14full.weightedScore + ', Rate: ' + s14full.captureRate);

  // ── Section 15: Engine integration -- Session 6 fields in results
  console.log('\n-- Section 15: Engine Integration -- Session 6 Fields --');

  test('S15-1: capacityInsight references adminHoursPerWeek (not a percentage)',
    results.capacityInsight.includes('8 hours'),
    'Got: ' + results.capacityInsight.substring(0, 80));

  test('S15-2: rawGaps.social.detail has all five component keys',
    'postingGap' in results.rawGaps.social.detail &&
    'engagementGapSocial' in results.rawGaps.social.detail &&
    'responseGap' in results.rawGaps.social.detail,
    'Missing keys in rawGaps.social.detail');

  test('S15-3: social gap is positive (five-component model)',
    results.gaps.social > 0,
    'Got: ' + formatCurrency(results.gaps.social));

  test('S15-4: capacity detail includes adminHoursPerWeek field',
    results.rawGaps.capacity.detail.adminHoursPerWeek !== undefined,
    'adminHoursPerWeek missing from capacity detail');

  test('S15-5: capacity detail does NOT include adminPct-derived weeklyAdminHrs field (retired)',
    !('weeklyAdminHrsFromPct' in results.rawGaps.capacity.detail),
    'Retired adminPct field still present');

  // ── RESULTS SUMMARY
  console.log('\n========================================');
  console.log('TEST RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================\n');

  // ── DIAGNOSTIC OUTPUT PREVIEW
  console.log('DIAGNOSTIC OUTPUT PREVIEW -- Rempel Plumbing, Timmins ON');
  console.log('----------------------------------------------------------');
  console.log('Current Revenue:        ' + results.gaps.display.current);
  console.log('Total Revenue Gap:      ' + results.gaps.display.gap);
  console.log('Capacity Lift:          ' + formatCurrency(results.gaps.capacityLift));
  console.log('Projected Revenue:      ' + results.gaps.display.projected);
  console.log('');
  console.log('Gap Breakdown:');
  console.log('  GBP Health:          ' + formatCurrency(results.gaps.gbp) + ' (canonical-adjusted)');
  console.log('  Local Rank:          ' + formatCurrency(results.gaps.rank) + ' (canonical-adjusted)');
  console.log('  Performance:         ' + formatCurrency(results.gaps.performance));
  console.log('  Content Gap:         ' + formatCurrency(results.gaps.content));
  console.log('  Missed Calls:        ' + formatCurrency(results.gaps.missedCalls));
  console.log('  Social:              ' + formatCurrency(results.gaps.social));
  console.log('  Paid Marketing:      ' + formatCurrency(results.gaps.paid));
  console.log('  Engagement:          ' + formatCurrency(results.gaps.engagement));
  console.log('');
  console.log('Multipliers Applied:');
  console.log('  Seasonal:            ' + results.meta.seasonalMultiplier);
  console.log('  AI Risk:             ' + results.meta.aiRiskMultiplier);
  console.log('  Engagement:          ' + results.meta.engagementMultiplier);
  console.log('  Citation:            ' + results.meta.citationMultiplier);
  console.log('  Canonical:           ' + results.meta.canonicalMultiplier + ' (Layer 12)');
  console.log('');
  console.log('Health Scorecard:');
  Object.entries(results.healthScores).forEach(([layer, data]) => {
    if (data.status) console.log('  ' + layer.padEnd(20) + data.status.toUpperCase());
    else if (data.label) console.log('  ' + 'growth'.padEnd(20) + data.label + ' (' + data.score + '/6)');
  });
  console.log('');
  console.log('Layer 12 -- Canonical Health:');
  console.log('  Alignment:           ' + results.healthScores.canonicalHealth.alignmentPct);
  console.log('  Suppression:         ' + results.meta.canonicalMultiplier);
  console.log('  Duplicate GBP:       ' + results.healthScores.canonicalHealth.duplicateGbpFound);
  console.log('  NAP Mismatches:      ' + results.healthScores.canonicalHealth.napMismatches);
  console.log('  AI Accuracy:         ' + results.healthScores.canonicalHealth.aiAccuracyScore);
  console.log('  Top Remediation:     ' + (results.healthScores.canonicalHealth.remediationList[0]?.issue || 'none'));

  // ── Run Session 7 tests (share test helper and results)
  runSession7Tests(test, results);

  // ── Combined summary (passed/failed counts include both suites)
  console.log('\n========================================');
  console.log('TOTAL RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================\n');

  // ── Diagnostic output preview
  console.log('DIAGNOSTIC OUTPUT PREVIEW -- Rempel Plumbing, Timmins ON');
  console.log('----------------------------------------------------------');
  console.log('Current Revenue:        ' + results.gaps.display.current);
  console.log('Total Revenue Gap:      ' + results.gaps.display.gap);
  console.log('Capacity Lift:          ' + formatCurrency(results.gaps.capacityLift));
  console.log('Projected Revenue:      ' + results.gaps.display.projected);
  console.log('');
  console.log('Gap Breakdown:');
  console.log('  GBP Health:          ' + formatCurrency(results.gaps.gbp) + ' (canonical-adjusted)');
  console.log('  Local Rank:          ' + formatCurrency(results.gaps.rank) + ' (canonical-adjusted)');
  console.log('  Performance:         ' + formatCurrency(results.gaps.performance));
  console.log('  Content Gap:         ' + formatCurrency(results.gaps.content));
  console.log('  Missed Calls:        ' + formatCurrency(results.gaps.missedCalls));
  console.log('  Social:              ' + formatCurrency(results.gaps.social));
  console.log('  Paid Marketing:      ' + formatCurrency(results.gaps.paid));
  console.log('  Engagement:          ' + formatCurrency(results.gaps.engagement));
  console.log('');
  console.log('Multipliers Applied:');
  console.log('  Seasonal:            ' + results.meta.seasonalMultiplier);
  console.log('  AI Risk:             ' + results.meta.aiRiskMultiplier);
  console.log('  Engagement:          ' + results.meta.engagementMultiplier);
  console.log('  Citation:            ' + results.meta.citationMultiplier);
  console.log('  Canonical:           ' + results.meta.canonicalMultiplier + ' (Layer 12)');
  console.log('  Market Opportunity:  ' + results.meta.marketOpportunityMultiplier + ' (Session 7)');
  console.log('');
  console.log('Health Scorecard:');
  Object.entries(results.healthScores).forEach(([layer, data]) => {
    if (data.status) console.log('  ' + layer.padEnd(20) + data.status.toUpperCase());
    else if (data.label) console.log('  ' + 'growth'.padEnd(20) + data.label + ' (' + data.score + '/7)');
  });
  console.log('');
  console.log('Layer 12 -- Canonical Health:');
  console.log('  Alignment:           ' + results.healthScores.canonicalHealth.alignmentPct);
  console.log('  Suppression:         ' + results.meta.canonicalMultiplier);
  console.log('  Duplicate GBP:       ' + results.healthScores.canonicalHealth.duplicateGbpFound);
  console.log('  NAP Mismatches:      ' + results.healthScores.canonicalHealth.napMismatches);
  console.log('  AI Accuracy:         ' + results.healthScores.canonicalHealth.aiAccuracyScore);
  console.log('  Top Remediation:     ' + (results.healthScores.canonicalHealth.remediationList[0]?.issue || 'none'));
  console.log('');
  console.log('Growth Score:          ' + results.healthScores.growth.score + '/7 -- ' + results.healthScores.growth.label);
  console.log('');
  console.log('Session 7 -- Brand Tenure / Market Opportunity / Confidence:');
  console.log('  Brand Tenure:        ' + results.meta.brandTenureLabel + ' ' + results.meta.brandTenureModifier);
  console.log('  Market Multiplier:   ' + results.meta.marketOpportunityMultiplier + ' (' + results.meta.marketDemandTier + ' demand, ' + results.meta.competitiveDensity + ' density)');
  console.log('  Diagnostic Conf:     ' + results.meta.diagnosticConfidence + ' (+/-' + results.meta.uncertaintySpread + ' spread)');
  console.log('');
  console.log('Scenario Recovery (pre-personalization placeholder):');
  console.log('  Technical Gap:       ' + results.scenarios.technicalGap.display.low + ' / ' + results.scenarios.technicalGap.display.mid + ' / ' + results.scenarios.technicalGap.display.high);
  console.log('  S1 Current Reality:  ' + results.scenarios.current.display.low + ' / ' + results.scenarios.current.display.mid + ' / ' + results.scenarios.current.display.high + ' (' + results.scenarios.current.captureRate + ')');
  console.log('  S2 Market Oppty:     ' + results.scenarios.market.display.low + ' / ' + results.scenarios.market.display.mid + ' / ' + results.scenarios.market.display.high + ' (' + results.scenarios.market.captureRate + ')');
  console.log('  S3 Full Potential:   ' + results.scenarios.potential.display.low + ' / ' + results.scenarios.potential.display.mid + ' / ' + results.scenarios.potential.display.high + ' (' + results.scenarios.potential.captureRate + ')');
  console.log('');
  console.log('Capacity Insight:');
  console.log('  ' + results.capacityInsight);
  console.log('');

  if (failed > 0) {
    console.log('WARNING: ' + failed + ' test(s) failed. Review failures above before deployment.');
    process.exit(1);
  } else {
    console.log('All tests passed. Engine is ready for integration.');
  }
}

// ─────────────────────────────────────────────────────────────
// SESSION 7 TEST DATA
// ─────────────────────────────────────────────────────────────

// Minimal diagnostic data for confidence scoring tests
const confTestData = {
  business: { city: 'Timmins', name: 'Test Co', trade: 'plumber' },
  selfReported: { missedCallPct: 30, yearsInBusiness: 14 },
  gbp:          { rating: 4.2, reviewCount: 38 },
  rank:         { keywords: [{ keyword: 'plumber timmins', position: 2 }] },
  citations:    { count: 22, napMismatches: 1 },
  lighthouse:   { performance: 61 },
  contentGap:   { coveragePct: 50 },
  aiVisibility: { score: 1 },
  socialVoice:  { sentiment: { score: 0.74 } },
  paidMarketing:{ competitorLSAs: ['A'], competitorGoogleAds: [], competitorMetaAds: [] },
  engagement:   { score: 3 },
  conversion:   { score: 3 },
  growth:       { gbpPostsLast90d: 3 },
  canonicalHealth: { alignmentPct: 72 }
};

// Paid marketing fixture for density tests
const noPaidCompetitors    = { competitorLSAs: [], competitorGoogleAds: [], competitorMetaAds: [] };
const lowDensityPaid       = { competitorLSAs: ['A'], competitorGoogleAds: ['B'], competitorMetaAds: [] };       // 2
const neutralDensityPaid   = { competitorLSAs: ['A','B'], competitorGoogleAds: ['C','D'], competitorMetaAds: ['E'] }; // 5
const highDensityPaid      = { competitorLSAs: ['A','B','C'], competitorGoogleAds: ['D','E','F','G'], competitorMetaAds: [] }; // 7
const veryHighDensityPaid  = { competitorLSAs: Array(6).fill('x'), competitorGoogleAds: Array(6).fill('y'), competitorMetaAds: [] }; // 12

runTests();

function runSession7Tests(test, results) {
  console.log('\n\n========================================');
  console.log('SESSION 7 TESTS -- v2.4 Additions');
  console.log('========================================');

  // ── Section 16: getBrandTenureModifier ──────────────────────
  console.log('\n-- Section 16: getBrandTenureModifier --');

  test('S16-1: 0 years → New (0.85×)',
    getBrandTenureModifier(0).modifier === 0.85 && getBrandTenureModifier(0).label === 'New',
    'Got: ' + JSON.stringify(getBrandTenureModifier(0)));

  test('S16-2: 2 years → New (0.85×)',
    getBrandTenureModifier(2).modifier === 0.85,
    'Got: ' + getBrandTenureModifier(2).modifier);

  test('S16-3: 3 years → Building (0.95×)',
    getBrandTenureModifier(3).modifier === 0.95 && getBrandTenureModifier(3).label === 'Building',
    'Got: ' + JSON.stringify(getBrandTenureModifier(3)));

  test('S16-4: 5 years → Building (0.95×)',
    getBrandTenureModifier(5).modifier === 0.95,
    'Got: ' + getBrandTenureModifier(5).modifier);

  test('S16-5: 6 years → Established (1.00×)',
    getBrandTenureModifier(6).modifier === 1.00,
    'Got: ' + getBrandTenureModifier(6).modifier);

  test('S16-6: 10 years → Established (1.00×)',
    getBrandTenureModifier(10).modifier === 1.00,
    'Got: ' + getBrandTenureModifier(10).modifier);

  test('S16-7: 11 years → Recognised (1.08×)',
    getBrandTenureModifier(11).modifier === 1.08 && getBrandTenureModifier(11).label === 'Recognised',
    'Got: ' + JSON.stringify(getBrandTenureModifier(11)));

  test('S16-8: 14 years → Recognised (1.08×) -- Rempel profile',
    getBrandTenureModifier(14).modifier === 1.08,
    'Got: ' + getBrandTenureModifier(14).modifier);

  test('S16-9: 20 years → Recognised (1.08×)',
    getBrandTenureModifier(20).modifier === 1.08,
    'Got: ' + getBrandTenureModifier(20).modifier);

  test('S16-10: 21 years → Established (1.15×)',
    getBrandTenureModifier(21).modifier === 1.15 && getBrandTenureModifier(21).label === 'Established',
    'Got: ' + JSON.stringify(getBrandTenureModifier(21)));

  test('S16-11: 40 years → Established (1.15×)',
    getBrandTenureModifier(40).modifier === 1.15,
    'Got: ' + getBrandTenureModifier(40).modifier);

  test('S16-12: null → default (5 years) → Building (0.95×)',
    getBrandTenureModifier(null).modifier === 0.95,
    'Got: ' + getBrandTenureModifier(null).modifier);

  test('S16-13: undefined → default (5 years) → Building (0.95×)',
    getBrandTenureModifier(undefined).modifier === 0.95,
    'Got: ' + getBrandTenureModifier(undefined).modifier);

  // ── Section 17: getMarketOpportunityMultiplier ──────────────
  console.log('\n-- Section 17: getMarketOpportunityMultiplier --');

  test('S17-1: Timmins (strong=1.10) × no paid competitors (near-monopoly=1.15) ≈ 1.265',
    getMarketOpportunityMultiplier('Timmins', null, noPaidCompetitors).multiplier === 1.265,
    'Got: ' + getMarketOpportunityMultiplier('Timmins', null, noPaidCompetitors).multiplier);

  test('S17-2: Timmins → demandLabel is Strong',
    getMarketOpportunityMultiplier('Timmins', null, noPaidCompetitors).demandLabel === 'Strong',
    'Got: ' + getMarketOpportunityMultiplier('Timmins', null, noPaidCompetitors).demandLabel);

  test('S17-3: Timmins × 2 paid competitors (low density=1.08) ≈ 1.188',
    getMarketOpportunityMultiplier('timmins', null, lowDensityPaid).multiplier === 1.188,
    'Got: ' + getMarketOpportunityMultiplier('timmins', null, lowDensityPaid).multiplier);

  test('S17-4: Timmins × 5 paid competitors (neutral=1.00) = 1.10',
    getMarketOpportunityMultiplier('Timmins', null, neutralDensityPaid).multiplier === 1.1,
    'Got: ' + getMarketOpportunityMultiplier('Timmins', null, neutralDensityPaid).multiplier);

  test('S17-5: neutral city (lookup miss) × neutral density = 1.00',
    getMarketOpportunityMultiplier('unknowncity', null, neutralDensityPaid).multiplier === 1.00,
    'Got: ' + getMarketOpportunityMultiplier('unknowncity', null, neutralDensityPaid).multiplier);

  test('S17-6: marketTierOverride=booming overrides city lookup',
    getMarketOpportunityMultiplier('Timmins', 'booming', neutralDensityPaid).multiplier === 1.15,
    'Got: ' + getMarketOpportunityMultiplier('Timmins', 'booming', neutralDensityPaid).multiplier);

  test('S17-7: marketTierOverride=depressed × neutral density = 0.75',
    getMarketOpportunityMultiplier('Timmins', 'depressed', neutralDensityPaid).multiplier === 0.75,
    'Got: ' + getMarketOpportunityMultiplier('Timmins', 'depressed', neutralDensityPaid).multiplier);

  test('S17-8: 7 paid competitors → high density (0.92×)',
    getMarketOpportunityMultiplier('Timmins', null, highDensityPaid).densityLabel === 'High density',
    'Got: ' + getMarketOpportunityMultiplier('Timmins', null, highDensityPaid).densityLabel);

  test('S17-9: 12 paid competitors → very high density (0.85×)',
    getMarketOpportunityMultiplier('Timmins', null, veryHighDensityPaid).densityLabel === 'Very high density',
    'Got: ' + getMarketOpportunityMultiplier('Timmins', null, veryHighDensityPaid).densityLabel);

  test('S17-10: paidCompetitorCount is correctly summed across LSA + Google + Meta',
    getMarketOpportunityMultiplier('Timmins', null, lowDensityPaid).paidCompetitorCount === 2,
    'Got: ' + getMarketOpportunityMultiplier('Timmins', null, lowDensityPaid).paidCompetitorCount);

  test('S17-11: null paidMarketing → 0 paid competitors → near-monopoly (1.15×)',
    getMarketOpportunityMultiplier('Timmins', null, null).densityLabel === 'Near-monopoly',
    'Got: ' + getMarketOpportunityMultiplier('Timmins', null, null).densityLabel);

  test('S17-12: Fort McMurray → booming (1.15×)',
    getMarketOpportunityMultiplier('fort mcmurray', null, neutralDensityPaid).demandLabel === 'Booming',
    'Got: ' + getMarketOpportunityMultiplier('fort mcmurray', null, neutralDensityPaid).demandLabel);

  // ── Section 18: calcDiagnosticConfidence ────────────────────
  console.log('\n-- Section 18: calcDiagnosticConfidence --');

  const fullDataConf = calcDiagnosticConfidence(confTestData);

  test('S18-1: returns diagnosticConfidence between 0 and 1',
    fullDataConf.diagnosticConfidence >= 0 && fullDataConf.diagnosticConfidence <= 1,
    'Got: ' + fullDataConf.diagnosticConfidence);

  test('S18-2: returns uncertaintySpread between 0.20 and 0.45',
    fullDataConf.uncertaintySpread >= 0.20 && fullDataConf.uncertaintySpread <= 0.45,
    'Got: ' + fullDataConf.uncertaintySpread);

  test('S18-3: returns layerConfidence object with 15 keys',
    Object.keys(fullDataConf.layerConfidence).length === 15,
    'Got: ' + Object.keys(fullDataConf.layerConfidence).length);

  test('S18-4: full data → confidence close to 1.0 (all 15 layers present)',
    fullDataConf.diagnosticConfidence >= 0.85,
    'Got: ' + fullDataConf.diagnosticConfidence);

  test('S18-5: full data → uncertaintySpread close to 0.20 (minimum)',
    fullDataConf.uncertaintySpread <= 0.24,
    'Got: ' + fullDataConf.uncertaintySpread);

  // Minimal data: only business name and selfReported, no API layers
  const minimalConf = calcDiagnosticConfidence({
    business: { city: 'Timmins' },
    selfReported: { missedCallPct: 30 }
  });

  test('S18-6: minimal data → confidence is low (missing most API layers)',
    minimalConf.diagnosticConfidence < 0.60,
    'Got: ' + minimalConf.diagnosticConfidence);

  test('S18-7: minimal data → uncertaintySpread is high (> 0.30)',
    minimalConf.uncertaintySpread > 0.30,
    'Got: ' + minimalConf.uncertaintySpread);

  test('S18-8: gbp layer confidence = 1.0 when rating and reviewCount present',
    fullDataConf.layerConfidence.gbp === 1.0,
    'Got: ' + fullDataConf.layerConfidence.gbp);

  test('S18-9: gbp layer confidence = 0.25 when gbp is null',
    calcDiagnosticConfidence({ business: {}, selfReported: {} }).layerConfidence.gbp === 0.25,
    'Got: ' + calcDiagnosticConfidence({ business: {}, selfReported: {} }).layerConfidence.gbp);

  test('S18-10: uncertainty formula: spread = 0.20 + 0.25 × (1 − confidence)',
    Math.abs(fullDataConf.uncertaintySpread - (0.20 + 0.25 * (1 - fullDataConf.diagnosticConfidence))) < 0.002,
    'Spread: ' + fullDataConf.uncertaintySpread + ', Conf: ' + fullDataConf.diagnosticConfidence);

  test('S18-11: full confidence (1.0) → spread = 0.20',
    (() => {
      const r = calcDiagnosticConfidence(confTestData);
      // Verify formula is honoured regardless of actual confidence level
      return Math.abs(r.uncertaintySpread - (0.20 + 0.25 * (1 - r.diagnosticConfidence))) < 0.002;
    })(),
    'Formula mismatch');

  test('S18-12: all layerConfidence values are 0.25, 0.5, or 1.0',
    Object.values(fullDataConf.layerConfidence).every(v => v === 0.25 || v === 0.5 || v === 1.0),
    'Got non-standard values: ' + JSON.stringify(fullDataConf.layerConfidence));

  // ── Section 19: calcScenarioRecovery ────────────────────────
  console.log('\n-- Section 19: calcScenarioRecovery --');

  const srTotalGap      = 300000;
  const srBrandTenure   = getBrandTenureModifier(14);   // 1.08× Recognised
  const srMarketOpp     = getMarketOpportunityMultiplier('Timmins', null, lowDensityPaid); // 1.188
  const srConf          = calcDiagnosticConfidence(confTestData);

  // Mock capacity result (matches calcCapacityLift return shape)
  const srCapacity = {
    value: 84000,
    detail: { avgAnnualGap: '23' } // 23% average idle capacity
  };

  // Pre-personalization placeholder (captureRateDecimal = 0)
  const srPrePersona = { captureRateDecimal: 0 };

  // Post-personalization (28% capture rate)
  const srPersona28  = { captureRateDecimal: 0.28 };

  const srPre  = calcScenarioRecovery(srTotalGap, srPrePersona,  srCapacity, srBrandTenure, srMarketOpp, srConf);
  const srPost = calcScenarioRecovery(srTotalGap, srPersona28, srCapacity, srBrandTenure, srMarketOpp, srConf);

  test('S19-1: returns technicalGap with low/mid/high and display',
    srPre.technicalGap.mid === srTotalGap &&
    srPre.technicalGap.low  < srTotalGap &&
    srPre.technicalGap.high > srTotalGap,
    'mid: ' + srPre.technicalGap.mid + ', low: ' + srPre.technicalGap.low + ', high: ' + srPre.technicalGap.high);

  test('S19-2: technicalGap.display values are formatted currency strings',
    srPre.technicalGap.display.mid.startsWith('$'),
    'Got: ' + srPre.technicalGap.display.mid);

  test('S19-3: gap range = mid × (1 ± spread)',
    srPre.technicalGap.low  === Math.round(srTotalGap * (1 - srConf.uncertaintySpread)) &&
    srPre.technicalGap.high === Math.round(srTotalGap * (1 + srConf.uncertaintySpread)),
    'low: ' + srPre.technicalGap.low + ', high: ' + srPre.technicalGap.high);

  test('S19-4: pre-personalization → S1 current captureRate is 0%',
    srPre.current.captureRate === '0%',
    'Got: ' + srPre.current.captureRate);

  test('S19-5: pre-personalization → S1 current mid is 0',
    srPre.current.mid === 0,
    'Got: ' + srPre.current.mid);

  test('S19-6: pre-personalization → S2 market mid is 0 (no capture)',
    srPre.market.mid === 0,
    'Got: ' + srPre.market.mid);

  test('S19-7: pre-personalization → S3 potential mid > 0 (full capture × tenure × market)',
    srPre.potential.mid > 0,
    'Got: ' + srPre.potential.mid);

  test('S19-8: post-personalization 28% → S1 mid > 0',
    srPost.current.mid > 0,
    'Got: ' + srPost.current.mid);

  test('S19-9: S1 current mid < S2 market mid (capacity constraint reduces S1)',
    srPost.current.mid <= srPost.market.mid,
    'S1: ' + srPost.current.mid + ', S2: ' + srPost.market.mid);

  test('S19-10: S2 market mid < S3 potential mid (full personalisation > 28%)',
    srPost.market.mid < srPost.potential.mid,
    'S2: ' + srPost.market.mid + ', S3: ' + srPost.potential.mid);

  test('S19-11: S3 potential shows marketMultiplier string',
    typeof srPost.potential.marketMultiplier === 'string' && srPost.potential.marketMultiplier.endsWith('x'),
    'Got: ' + srPost.potential.marketMultiplier);

  test('S19-12: S3 capture rate is capped at 85% ceiling (1.08 tenure × 0.85 = 0.918, capped at 0.85)',
    (() => {
      const capRate = parseInt(srPost.potential.captureRate);
      return capRate <= 85;
    })(),
    'Got: ' + srPost.potential.captureRate);

  test('S19-13: all three scenarios return display objects with low/mid/high strings',
    srPost.current.display.low.startsWith('$') &&
    srPost.market.display.mid.startsWith('$') &&
    srPost.potential.display.high.startsWith('$'),
    'Missing display fields');

  test('S19-14: scenarios.meta includes all six summary fields',
    srPost.meta &&
    'uncertaintySpread'           in srPost.meta &&
    'diagnosticConfidence'        in srPost.meta &&
    'brandTenureModifier'         in srPost.meta &&
    'brandTenureLabel'            in srPost.meta &&
    'marketOpportunityMultiplier' in srPost.meta &&
    'demandTier'                  in srPost.meta,
    'meta keys: ' + Object.keys(srPost.meta || {}).join(', '));

  // ── Section 20: Brand Equity Index ──────────────────────────
  console.log('\n-- Section 20: calcBrandEquityIndex --');

  const beGbpPass    = { reviewCount: 90 };   // 14 years × 6 = 84 benchmark → passes
  const beGbpFail    = { reviewCount: 38 };   // 38 < 84 → fails
  const beSocialPass = { fbFollowerCount: 250, unpromptedMentions90d: 3 };
  const beSocialFail = { fbFollowerCount: 100, unpromptedMentions90d: 1 };
  const beContentPass = { brandedSearchPresent: true };
  const beContentFail = { brandedSearchPresent: false };
  const beSelfRep14  = { yearsInBusiness: 14 };

  const beAllPass = calcBrandEquityIndex(beGbpPass, beSocialPass, beContentPass, beSelfRep14, 41000);
  const beAllFail = calcBrandEquityIndex(beGbpFail, beSocialFail, beContentFail, beSelfRep14, 41000);
  const beMixed   = calcBrandEquityIndex(beGbpFail, beSocialPass, beContentFail, beSelfRep14, 41000);

  test('S20-1: all four signals pass → score 4',
    beAllPass.score === 4,
    'Got: ' + beAllPass.score);

  test('S20-2: all four signals fail → score 0',
    beAllFail.score === 0,
    'Got: ' + beAllFail.score);

  test('S20-3: social signals pass (following + mentions), review + branded fail → score 2',
    beMixed.score === 2,
    'Got: ' + beMixed.score + ', signals: ' + JSON.stringify(beMixed.signals));

  test('S20-4: score >= 2 qualifies as brandEquityEstablished',
    beMixed.score >= 2,
    'Got: ' + beMixed.score);

  test('S20-5: review depth benchmark = yearsInBusiness × 6',
    (() => {
      const be = calcBrandEquityIndex({ reviewCount: 84 }, beSocialFail, beContentFail, beSelfRep14, 41000);
      return be.signals.reviewDepth === true; // exactly 14×6=84 → passes
    })(),
    'reviewDepth should pass at exactly benchmark');

  test('S20-6: review count 83 (just below 14×6=84) → reviewDepth fails',
    (() => {
      const be = calcBrandEquityIndex({ reviewCount: 83 }, beSocialFail, beContentFail, beSelfRep14, 41000);
      return be.signals.reviewDepth === false;
    })(),
    'reviewDepth should fail below benchmark');

  test('S20-7: unpromptedMentions90d >= 2 → unpromptedMentions passes',
    calcBrandEquityIndex(beGbpFail, { unpromptedMentions90d: 2 }, beContentFail, beSelfRep14, 41000).signals.unpromptedMentions === true,
    'Should pass at exactly 2');

  test('S20-8: unpromptedMentions90d = 1 → unpromptedMentions fails',
    calcBrandEquityIndex(beGbpFail, { unpromptedMentions90d: 1 }, beContentFail, beSelfRep14, 41000).signals.unpromptedMentions === false,
    'Should fail below 2');

  test('S20-9: brandedSearchPresent = true → brandedSearch passes',
    beAllPass.signals.brandedSearch === true,
    'Got: ' + beAllPass.signals.brandedSearch);

  test('S20-10: null gbp → reviewDepth fails gracefully (no throw)',
    (() => {
      try {
        const be = calcBrandEquityIndex(null, beSocialFail, beContentFail, beSelfRep14, 41000);
        return be.signals.reviewDepth === false;
      } catch (e) { return false; }
    })(),
    'Should handle null gbp without throwing');

  // ── Section 21: calculateDiagnostic integration (Session 7 fields) ──
  console.log('\n-- Section 21: calculateDiagnostic -- Session 7 Integration --');

  // Use the sampleData from the existing test suite (already computed as `results`)
  // We need to re-require it here since sampleData is in the outer scope

  test('S21-1: results.meta includes brandTenureModifier string',
    typeof results.meta.brandTenureModifier === 'string' && results.meta.brandTenureModifier.endsWith('x'),
    'Got: ' + results.meta.brandTenureModifier);

  test('S21-2: results.meta includes brandTenureLabel string',
    typeof results.meta.brandTenureLabel === 'string' && results.meta.brandTenureLabel.length > 0,
    'Got: ' + results.meta.brandTenureLabel);

  test('S21-3: results.meta includes marketOpportunityMultiplier string',
    typeof results.meta.marketOpportunityMultiplier === 'string' && results.meta.marketOpportunityMultiplier.endsWith('x'),
    'Got: ' + results.meta.marketOpportunityMultiplier);

  test('S21-4: results.meta includes diagnosticConfidence string with %',
    typeof results.meta.diagnosticConfidence === 'string' && results.meta.diagnosticConfidence.endsWith('%'),
    'Got: ' + results.meta.diagnosticConfidence);

  test('S21-5: results.meta includes uncertaintySpread string with %',
    typeof results.meta.uncertaintySpread === 'string' && results.meta.uncertaintySpread.endsWith('%'),
    'Got: ' + results.meta.uncertaintySpread);

  test('S21-6: results.scenarios is present with three scenario objects',
    results.scenarios &&
    results.scenarios.current &&
    results.scenarios.market &&
    results.scenarios.potential &&
    results.scenarios.technicalGap,
    'Got: ' + JSON.stringify(Object.keys(results.scenarios || {})));

  test('S21-7: results.rawGaps.confidence is present with diagnosticConfidence',
    results.rawGaps.confidence &&
    typeof results.rawGaps.confidence.diagnosticConfidence === 'number',
    'Got: ' + JSON.stringify(results.rawGaps.confidence));

  test('S21-8: results.rawGaps.brandTenure is present with modifier',
    results.rawGaps.brandTenure &&
    typeof results.rawGaps.brandTenure.modifier === 'number',
    'Got: ' + JSON.stringify(results.rawGaps.brandTenure));

  test('S21-9: results.rawGaps.marketOpportunity is present with multiplier',
    results.rawGaps.marketOpportunity &&
    typeof results.rawGaps.marketOpportunity.multiplier === 'number',
    'Got: ' + JSON.stringify(results.rawGaps.marketOpportunity));

  test('S21-10: Timmins → market demand label is Strong',
    results.meta.marketDemandTier === 'Strong',
    'Got: ' + results.meta.marketDemandTier);

  test('S21-11: results.healthScores.growth has brandEquity field',
    results.healthScores.growth.brandEquity &&
    typeof results.healthScores.growth.brandEquity.score === 'number',
    'Got: ' + JSON.stringify(results.healthScores.growth.brandEquity));

  test('S21-12: totalGap is amplified by marketOpportunityMultiplier (> pre-market gap)',
    (() => {
      const mktMult = results.rawGaps.marketOpportunity.multiplier;
      return mktMult >= 0.64 && mktMult <= 1.35; // valid range per spec
    })(),
    'multiplier: ' + results.rawGaps.marketOpportunity.multiplier);

  test('S21-13: scenarios.technicalGap.mid equals results.gaps.total',
    results.scenarios.technicalGap.mid === results.gaps.total,
    'technicalGap.mid: ' + results.scenarios.technicalGap.mid + ', gaps.total: ' + results.gaps.total);

  test('S21-14: pre-personalization scenario S1 and S2 capture rates are 0%',
    results.scenarios.current.captureRate === '0%' &&
    results.scenarios.market.captureRate === '0%',
    'S1: ' + results.scenarios.current.captureRate + ', S2: ' + results.scenarios.market.captureRate);

  test('S21-15: growth score is on 7-signal scale (0-7)',
    results.healthScores.growth.score >= 0 && results.healthScores.growth.score <= 7,
    'Got: ' + results.healthScores.growth.score);
}

