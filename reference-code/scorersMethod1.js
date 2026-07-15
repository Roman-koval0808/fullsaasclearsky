/**
 * ContentRadar — Method 1 Deterministic Scoring Functions
 * 
 * 18 signals scored entirely by formula from structured API data.
 * No Claude API calls. No ambiguity. Same input always produces same score.
 * 
 * Each function returns:
 * {
 *   signal:  number,   // Signal number
 *   score:   0|1|2|3, // The score
 *   note:    string,   // One-sentence explanation shown in the report
 *   method:  'deterministic',
 *   inputs:  object,   // The raw values used — stored in cr_signal_scores.api_data
 * }
 *
 * Data sources:
 *   GBP signals (11–18) — Google Places API via cr_gbp_data
 *   Facebook signals (21–23) — Apify Facebook scraper via cr_apify_data
 *   Nextdoor signal (26) — Apify Nextdoor scraper via cr_apify_data
 *   Reviews signals (28–30) — Apify HomeStars/Houzz/Angi via cr_apify_data
 *   Citation signal (37–38) — Directory crawl via cr_apify_data
 *   Video signals (44–45) — YouTube Data API via cr_apify_data
 */

'use strict';

// ─── SHARED CONSTANTS ─────────────────────────────────────────────────────────

const SCORING_CONSTANTS = {
  // Signal 12: GBP photo thresholds
  GBP_PHOTOS_WEAK:     10,
  GBP_PHOTOS_FUNCTIONAL: 25,

  // Signal 13: Review velocity — tenure benchmark multiplier
  // yearsInBusiness × REVIEW_BENCHMARK_MULTIPLIER = expected review count
  REVIEW_BENCHMARK_MULTIPLIER: 6,

  // Signal 13: Rating thresholds
  RATING_FUNCTIONAL:   4.0,
  RATING_BEST:         4.5,

  // Signal 13: Recency — days since last review
  REVIEW_RECENCY_BEST: 30,    // at least one review in last 30 days = best practice
  REVIEW_RECENCY_OK:   90,    // at least one review in last 90 days = functional

  // Signal 14: Review response rate thresholds
  RESPONSE_RATE_FUNCTIONAL: 0.60,  // 60%+ responses = functional
  RESPONSE_RATE_BEST:       0.90,  // 90%+ responses = best practice
  RESPONSE_DAYS_FUNCTIONAL: 7,     // within 7 days = functional
  RESPONSE_DAYS_BEST:       2,     // within 2 days = best practice

  // Signal 15: GBP post frequency (days between posts)
  POST_FREQ_BEST:       14,   // ≤ 14 days between posts = weekly minimum
  POST_FREQ_FUNCTIONAL: 35,   // ≤ 35 days = monthly minimum

  // Signal 16: GBP services list
  SERVICES_FUNCTIONAL: 3,    // 3+ services = functional
  SERVICES_BEST:       8,    // 8+ services with descriptions = best practice

  // Signal 17: GBP Q&A entries
  QA_FUNCTIONAL: 5,
  QA_BEST:       10,

  // Signal 21: Facebook review thresholds (similar to GBP)
  FB_RATING_FUNCTIONAL: 4.0,
  FB_RATING_BEST:       4.5,
  FB_REVIEWS_FUNCTIONAL: 10,
  FB_REVIEWS_BEST:       25,

  // Signal 22: Facebook response rate (same thresholds as GBP)
  FB_RESPONSE_FUNCTIONAL: 0.60,
  FB_RESPONSE_BEST:       0.90,

  // Signal 23: Facebook events per year
  FB_EVENTS_FUNCTIONAL: 3,
  FB_EVENTS_BEST:       6,

  // Signal 26: Nextdoor recommendation thresholds
  NEXTDOOR_RECOS_FUNCTIONAL: 5,
  NEXTDOOR_RECOS_BEST:       15,

  // Signal 28: HomeStars star score (out of 10)
  HOMESTARS_FUNCTIONAL: 7.5,
  HOMESTARS_BEST:       8.5,

  // Signal 29: Houzz review count
  HOUZZ_REVIEWS_FUNCTIONAL: 3,
  HOUZZ_REVIEWS_BEST:       10,

  // Signal 30: Angi review count
  ANGI_REVIEWS_FUNCTIONAL: 5,
  ANGI_REVIEWS_BEST:       15,

  // Signal 37: Citation volume
  CITATIONS_FUNCTIONAL: 25,
  CITATIONS_BEST:       50,

  // Signal 44: Video count
  VIDEO_COUNT_FUNCTIONAL: 5,
  VIDEO_COUNT_BEST:       20,

  // Signal 45: YouTube upload frequency (days between uploads)
  YOUTUBE_FREQ_BEST:       14,  // bi-weekly or better
  YOUTUBE_FREQ_FUNCTIONAL: 45,  // roughly monthly

  // Signal 45: YouTube subscriber count
  YOUTUBE_SUBS_FUNCTIONAL: 50,
  YOUTUBE_SUBS_BEST:       200,
};

// ─── HELPER UTILITIES ─────────────────────────────────────────────────────────

function daysAgo(unixTimestamp) {
  if (!unixTimestamp) return Infinity;
  return (Date.now() - unixTimestamp * 1000) / (1000 * 60 * 60 * 24);
}

function responseRate(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  const responded = reviews.filter(r => r.owner_reply || r.ownerReply || r.response).length;
  return responded / reviews.length;
}

function avgResponseDays(reviews) {
  const responded = (reviews || []).filter(r => {
    const reply = r.owner_reply || r.ownerReply || r.response;
    return reply && reply.time && r.time;
  });
  if (responded.length === 0) return Infinity;
  const totalDays = responded.reduce((sum, r) => {
    const reply = r.owner_reply || r.ownerReply || r.response;
    return sum + (reply.time - r.time) / 86400;
  }, 0);
  return totalDays / responded.length;
}

function result(signal, score, note, inputs) {
  return { signal, score, note, method: 'deterministic', inputs };
}

// ─── GBP SIGNALS (11–18) ──────────────────────────────────────────────────────

/**
 * Signal 11 — GBP Completeness
 * Source: Google Places API — completeness fields
 */
function scoreS11_GBPCompleteness(gbp) {
  const inputs = {
    hasPrimaryCategory: !!gbp.gbp_categories?.length,
    hasDescription:     !!gbp.description,
    hasHours:           !!gbp.hours,
    hasServices:        !!gbp.services_list?.length,
    hasWebsite:         !!gbp.website_url,
    hasPhotos:          (gbp.photo_count || 0) > 0,
    hasMessaging:       !!gbp.messaging_enabled,
  };

  const score_fields = Object.values(inputs).filter(Boolean).length;
  const total_fields = Object.keys(inputs).length;

  let score, note;

  if (score_fields <= 1) {
    score = 0;
    note = 'GBP unclaimed or effectively empty — only business name present.';
  } else if (score_fields <= 3) {
    score = 1;
    note = `GBP claimed but incomplete — ${score_fields}/${total_fields} core fields populated.`;
  } else if (score_fields <= 5) {
    score = 2;
    note = `GBP core fields complete — ${score_fields}/${total_fields} fields populated. Service list or attributes may be missing.`;
  } else {
    score = 3;
    note = `GBP fully optimised — all ${total_fields} core fields populated including services, hours, and messaging.`;
  }

  return result(11, score, note, inputs);
}

/**
 * Signal 12 — GBP Photo Volume and Quality
 * Source: Google Places API — photo_count
 */
function scoreS12_GBPPhotos(gbp) {
  const photoCount = gbp.photo_count || 0;
  const inputs = { photoCount };

  let score, note;

  if (photoCount === 0) {
    score = 0;
    note = 'No photos on GBP profile — profile appears empty or unclaimed.';
  } else if (photoCount < SCORING_CONSTANTS.GBP_PHOTOS_WEAK) {
    score = 1;
    note = `Only ${photoCount} photos — minimum ${SCORING_CONSTANTS.GBP_PHOTOS_WEAK} needed for a functional profile.`;
  } else if (photoCount < SCORING_CONSTANTS.GBP_PHOTOS_FUNCTIONAL) {
    score = 2;
    note = `${photoCount} photos present — functional but below the 25+ best practice threshold.`;
  } else {
    score = 3;
    note = `${photoCount} photos — meets best practice threshold of 25+ photos.`;
  }

  return result(12, score, note, inputs);
}

/**
 * Signal 13 — GBP Review Score and Velocity
 * Source: Google Places API — rating, review_count, yearsInBusiness
 * Tenure benchmark: yearsInBusiness × 6
 */
function scoreS13_GBPReviews(gbp, yearsInBusiness) {
  const rating = gbp.rating || 0;
  const reviewCount = gbp.review_count || 0;
  const benchmark = yearsInBusiness
    ? Math.ceil(yearsInBusiness * SCORING_CONSTANTS.REVIEW_BENCHMARK_MULTIPLIER)
    : 30; // fallback: assume 5 years

  const recentReviews = gbp.recent_reviews || [];
  const lastReviewDays = recentReviews.length > 0
    ? daysAgo(recentReviews[0].time)
    : Infinity;

  const pctOfBenchmark = reviewCount / benchmark;

  const inputs = {
    rating,
    reviewCount,
    benchmark,
    yearsInBusiness,
    lastReviewDaysAgo: Math.round(lastReviewDays),
    pctOfBenchmark: Math.round(pctOfBenchmark * 100),
  };

  let score, note;

  if (reviewCount === 0 || rating === 0) {
    score = 0;
    note = 'No reviews or no rating — GBP may be unclaimed or brand new.';
  } else if (
    pctOfBenchmark < 0.5 ||
    rating < SCORING_CONSTANTS.RATING_FUNCTIONAL ||
    lastReviewDays > 180
  ) {
    score = 1;
    note = `${reviewCount} reviews (${inputs.pctOfBenchmark}% of ${benchmark} benchmark), rating ${rating} — below functional threshold.`;
  } else if (
    pctOfBenchmark < 1.0 ||
    rating < SCORING_CONSTANTS.RATING_BEST ||
    lastReviewDays > SCORING_CONSTANTS.REVIEW_RECENCY_OK
  ) {
    score = 2;
    note = `${reviewCount} reviews at ${rating} stars — functional but below benchmark of ${benchmark} or recent velocity could improve.`;
  } else {
    score = 3;
    note = `${reviewCount} reviews at ${rating} stars — at or above tenure benchmark of ${benchmark}. Strong velocity.`;
  }

  return result(13, score, note, inputs);
}

/**
 * Signal 14 — GBP Review Response Behaviour
 * Source: Google Places API — recent_reviews with owner_reply
 */
function scoreS14_GBPResponseBehaviour(gbp) {
  const reviews = gbp.recent_reviews || [];
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return result(14, 0, 'No reviews to respond to — cannot assess response behaviour.', { totalReviews });
  }

  const rate = responseRate(reviews);
  const avgDays = avgResponseDays(reviews);
  const hasNegativeUnresponded = reviews.some(
    r => r.rating <= 3 && !(r.owner_reply || r.ownerReply || r.response)
  );

  const inputs = {
    totalReviews,
    responseRate: Math.round(rate * 100),
    avgResponseDays: isFinite(avgDays) ? Math.round(avgDays) : null,
    hasNegativeUnresponded,
  };

  let score, note;

  if (rate === 0) {
    score = 0;
    note = 'No reviews responded to — all reviews unanswered.';
  } else if (
    rate < SCORING_CONSTANTS.RESPONSE_RATE_FUNCTIONAL ||
    hasNegativeUnresponded
  ) {
    score = 1;
    note = `${inputs.responseRate}% response rate — inconsistent. ${hasNegativeUnresponded ? 'Negative reviews left unanswered.' : ''}`.trim();
  } else if (
    rate < SCORING_CONSTANTS.RESPONSE_RATE_BEST ||
    avgDays > SCORING_CONSTANTS.RESPONSE_DAYS_FUNCTIONAL
  ) {
    score = 2;
    note = `${inputs.responseRate}% response rate — responds to most reviews but not all, or response time could improve.`;
  } else {
    score = 3;
    note = `${inputs.responseRate}% response rate with avg ${inputs.avgResponseDays}-day response time — responds to every review promptly.`;
  }

  return result(14, score, note, inputs);
}

/**
 * Signal 15 — GBP Posts and Updates
 * Source: Google Places API / GMB API — post_count and most recent post date
 */
function scoreS15_GBPPosts(gbp) {
  const postCount = gbp.post_count || 0;
  const lastPostDays = gbp.last_post_date
    ? daysAgo(gbp.last_post_date)
    : Infinity;

  const inputs = {
    postCount,
    lastPostDaysAgo: isFinite(lastPostDays) ? Math.round(lastPostDays) : null,
  };

  let score, note;

  if (postCount === 0 || !isFinite(lastPostDays)) {
    score = 0;
    note = 'No GBP posts found — profile is static.';
  } else if (lastPostDays > 90) {
    score = 1;
    note = `Last post was ${Math.round(lastPostDays)} days ago — no consistent posting cadence.`;
  } else if (lastPostDays > SCORING_CONSTANTS.POST_FREQ_BEST) {
    score = 2;
    note = `Posts present with roughly monthly cadence — last post ${Math.round(lastPostDays)} days ago.`;
  } else {
    score = 3;
    note = `Active posting — last post ${Math.round(lastPostDays)} days ago with consistent weekly cadence.`;
  }

  return result(15, score, note, inputs);
}

/**
 * Signal 16 — GBP Services and Products
 * Source: Google Places API — services_list
 */
function scoreS16_GBPServices(gbp) {
  const services = gbp.services_list || [];
  const serviceCount = Array.isArray(services) ? services.length : Object.keys(services).length;
  const withDescriptions = Array.isArray(services)
    ? services.filter(s => s.description && s.description.length > 10).length
    : 0;

  const inputs = { serviceCount, withDescriptions };

  let score, note;

  if (serviceCount === 0) {
    score = 0;
    note = 'No services listed on GBP — profile gives no indication of trade offerings.';
  } else if (serviceCount < SCORING_CONSTANTS.SERVICES_FUNCTIONAL) {
    score = 1;
    note = `Only ${serviceCount} service${serviceCount === 1 ? '' : 's'} listed with no descriptions — minimal service presence.`;
  } else if (serviceCount < SCORING_CONSTANTS.SERVICES_BEST || withDescriptions < 3) {
    score = 2;
    note = `${serviceCount} services listed — core trade services represented but descriptions could be more detailed.`;
  } else {
    score = 3;
    note = `${serviceCount} services listed with ${withDescriptions} descriptions — comprehensive and client-facing service coverage.`;
  }

  return result(16, score, note, inputs);
}

/**
 * Signal 17 — GBP Q&A
 * Source: Google Places API — qa_count
 */
function scoreS17_GBPQnA(gbp) {
  const qaCount = gbp.qa_count || 0;
  const inputs = { qaCount };

  let score, note;

  if (qaCount === 0) {
    score = 0;
    note = 'No Q&A entries — section empty and unmonitored.';
  } else if (qaCount < SCORING_CONSTANTS.QA_FUNCTIONAL) {
    score = 1;
    note = `${qaCount} Q&A ${qaCount === 1 ? 'entry' : 'entries'} — present but minimal. Public questions may be unanswered.`;
  } else if (qaCount < SCORING_CONSTANTS.QA_BEST) {
    score = 2;
    note = `${qaCount} Q&A entries — business has seeded core questions but could expand to cover more trade topics.`;
  } else {
    score = 3;
    note = `${qaCount} Q&A entries — actively managed section covering high-value homeowner questions.`;
  }

  return result(17, score, note, inputs);
}

/**
 * Signal 18 — GBP Contact and Conversion Features
 * Source: Google Places API — feature flags
 */
function scoreS18_GBPFeatures(gbp) {
  const features = {
    messaging:      !!gbp.messaging_enabled,
    bookingButton:  !!gbp.booking_button,
    quoteRequest:   !!(gbp.services_list?.length), // services presence enables quote requests
  };

  const activeCount = Object.values(features).filter(Boolean).length;
  const inputs = { ...features, activeCount };

  let score, note;

  if (activeCount === 0) {
    score = 0;
    note = 'No conversion features configured — messaging and booking both disabled.';
  } else if (activeCount === 1) {
    score = 1;
    note = `Only 1 of 3 conversion features active — ${Object.entries(features).filter(([,v])=>v).map(([k])=>k).join(', ')}.`;
  } else if (activeCount === 2) {
    score = 2;
    note = `2 of 3 conversion features active — ${Object.entries(features).filter(([,v])=>v).map(([k])=>k).join(', ')}.`;
  } else {
    score = 3;
    note = 'All 3 conversion features active — messaging, booking button, and quote request all configured.';
  }

  return result(18, score, note, inputs);
}

// ─── FACEBOOK SIGNALS (21–23) ─────────────────────────────────────────────────

/**
 * Signal 21 — Facebook Review Score and Velocity
 * Source: Apify Facebook scraper — rating, review_count
 */
function scoreS21_FacebookReviews(fbData) {
  const rating = fbData.rating || fbData.overallStarRating || 0;
  const reviewCount = fbData.reviewCount || fbData.ratingCount || 0;
  const inputs = { rating, reviewCount };

  let score, note;

  if (reviewCount === 0 || rating === 0) {
    score = 0;
    note = 'No Facebook reviews — reviews tab absent or disabled.';
  } else if (
    reviewCount < SCORING_CONSTANTS.FB_REVIEWS_FUNCTIONAL ||
    rating < SCORING_CONSTANTS.FB_RATING_FUNCTIONAL
  ) {
    score = 1;
    note = `${reviewCount} Facebook reviews at ${rating} stars — below functional threshold.`;
  } else if (
    reviewCount < SCORING_CONSTANTS.FB_REVIEWS_BEST ||
    rating < SCORING_CONSTANTS.FB_RATING_BEST
  ) {
    score = 2;
    note = `${reviewCount} Facebook reviews at ${rating} stars — functional but volume or rating could improve.`;
  } else {
    score = 3;
    note = `${reviewCount} Facebook reviews at ${rating} stars — strong cross-platform review presence.`;
  }

  return result(21, score, note, inputs);
}

/**
 * Signal 22 — Facebook Review Response Behaviour
 * Source: Apify Facebook scraper — reviews with owner responses
 */
function scoreS22_FacebookResponseBehaviour(fbData) {
  const reviews = fbData.reviews || [];
  if (reviews.length === 0) {
    return result(22, 0, 'No Facebook reviews to assess response behaviour.', { reviewCount: 0 });
  }

  const rate = responseRate(reviews);
  const hasNegativeUnresponded = reviews.some(
    r => (r.rating || r.starRating || 5) <= 3 && !(r.response || r.ownerResponse)
  );

  const inputs = {
    reviewCount: reviews.length,
    responseRate: Math.round(rate * 100),
    hasNegativeUnresponded,
  };

  let score, note;

  if (rate === 0) {
    score = 0;
    note = 'No Facebook reviews responded to.';
  } else if (rate < SCORING_CONSTANTS.FB_RESPONSE_FUNCTIONAL || hasNegativeUnresponded) {
    score = 1;
    note = `${inputs.responseRate}% Facebook response rate — inconsistent. ${hasNegativeUnresponded ? 'Negative reviews unanswered.' : ''}`.trim();
  } else if (rate < SCORING_CONSTANTS.FB_RESPONSE_BEST) {
    score = 2;
    note = `${inputs.responseRate}% Facebook response rate — responds to most reviews.`;
  } else {
    score = 3;
    note = `${inputs.responseRate}% Facebook response rate — responds to every review.`;
  }

  return result(22, score, note, inputs);
}

/**
 * Signal 23 — Facebook Events
 * Source: Apify Facebook scraper — events count in last 12 months
 */
function scoreS23_FacebookEvents(fbData) {
  const events = fbData.events || [];
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter(e => {
    const ts = (e.startTime || e.start_time || 0);
    return (typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime()) >= cutoff;
  });
  const eventCount = recentEvents.length;
  const inputs = { eventCount, windowDays: 365 };

  let score, note;

  if (eventCount === 0) {
    score = 0;
    note = 'No Facebook events in the last 12 months — feature completely unused.';
  } else if (eventCount < SCORING_CONSTANTS.FB_EVENTS_FUNCTIONAL) {
    score = 1;
    note = `${eventCount} event${eventCount === 1 ? '' : 's'} in last 12 months — minimal and sporadic.`;
  } else if (eventCount < SCORING_CONSTANTS.FB_EVENTS_BEST) {
    score = 2;
    note = `${eventCount} events in last 12 months — regular event activity reaching non-followers.`;
  } else {
    score = 3;
    note = `${eventCount} events in last 12 months — active event calendar driving organic reach.`;
  }

  return result(23, score, note, inputs);
}

// ─── NEXTDOOR SIGNAL (26) ─────────────────────────────────────────────────────

/**
 * Signal 26 — Nextdoor Recommendations
 * Source: Apify Nextdoor scraper — recommendation count
 * Stage: GROWTH (reclassified from Engagement — May 2026)
 */
function scoreS26_NextdoorRecommendations(ndData) {
  const recoCount = ndData.recommendationCount || ndData.recommendations?.length || 0;
  const hasDetail = (ndData.recommendations || []).some(
    r => (r.text || r.content || '').length > 30
  );

  const inputs = { recoCount, hasDetailedRecommendations: hasDetail };

  let score, note;

  if (recoCount === 0) {
    score = 0;
    note = 'No Nextdoor recommendations — page unclaimed or community presence absent.';
  } else if (recoCount < SCORING_CONSTANTS.NEXTDOOR_RECOS_FUNCTIONAL) {
    score = 1;
    note = `${recoCount} Nextdoor recommendation${recoCount === 1 ? '' : 's'} — minimal community presence.`;
  } else if (recoCount < SCORING_CONSTANTS.NEXTDOOR_RECOS_BEST) {
    score = 2;
    note = `${recoCount} Nextdoor recommendations — growing community trust signal.`;
  } else {
    score = 3;
    note = `${recoCount} Nextdoor recommendations — strong, compounding community authority.`;
  }

  return result(26, score, note, inputs);
}

// ─── REVIEWS & REPUTATION SIGNALS (28–30) ────────────────────────────────────

/**
 * Signal 28 — HomeStars Presence and Score
 * Source: Apify HomeStars scraper — star_score (out of 10), review_count
 */
function scoreS28_HomeStars(hsData) {
  if (!hsData || hsData.scrape_status === 'not_found') {
    return result(28, 0, 'No HomeStars profile found — absent from Canada\'s primary trades review platform.', { found: false });
  }

  const starScore = hsData.starScore || hsData.star_score || 0;
  const reviewCount = hsData.reviewCount || hsData.review_count || 0;
  const claimed = !!(hsData.claimed || hsData.isClaimed);
  const inputs = { starScore, reviewCount, claimed };

  let score, note;

  if (!claimed || starScore === 0) {
    score = 0;
    note = 'HomeStars profile exists but unclaimed — no managed presence.';
  } else if (starScore < SCORING_CONSTANTS.HOMESTARS_FUNCTIONAL || reviewCount < 3) {
    score = 1;
    note = `HomeStars Star Score ${starScore}/10 with ${reviewCount} reviews — claimed but below functional threshold.`;
  } else if (starScore < SCORING_CONSTANTS.HOMESTARS_BEST || reviewCount < 10) {
    score = 2;
    note = `HomeStars Star Score ${starScore}/10 with ${reviewCount} reviews — functional presence approaching best practice.`;
  } else {
    score = 3;
    note = `HomeStars Star Score ${starScore}/10 with ${reviewCount} reviews — strong Canadian trades directory presence.`;
  }

  return result(28, score, note, inputs);
}

/**
 * Signal 29 — Houzz Presence and Reviews
 * Source: Apify Houzz scraper — review_count, claimed status
 */
function scoreS29_Houzz(houzzData) {
  if (!houzzData || houzzData.scrape_status === 'not_found') {
    return result(29, 0, 'No Houzz profile found.', { found: false });
  }

  const reviewCount = houzzData.reviewCount || houzzData.review_count || 0;
  const claimed = !!(houzzData.claimed || houzzData.isClaimed);
  const inputs = { reviewCount, claimed };

  let score, note;

  if (!claimed) {
    score = 0;
    note = 'Houzz profile unclaimed — no managed presence.';
  } else if (reviewCount < SCORING_CONSTANTS.HOUZZ_REVIEWS_FUNCTIONAL) {
    score = 1;
    note = `Houzz profile claimed with ${reviewCount} review${reviewCount === 1 ? '' : 's'} — minimal presence.`;
  } else if (reviewCount < SCORING_CONSTANTS.HOUZZ_REVIEWS_BEST) {
    score = 2;
    note = `Houzz profile with ${reviewCount} reviews — functional renovation platform presence.`;
  } else {
    score = 3;
    note = `Houzz profile with ${reviewCount} reviews — strong renovation platform authority.`;
  }

  return result(29, score, note, inputs);
}

/**
 * Signal 30 — Angi Presence and Reviews
 * Source: Apify Angi scraper — review_count, certified status
 */
function scoreS30_Angi(angiData) {
  if (!angiData || angiData.scrape_status === 'not_found') {
    return result(30, 0, 'No Angi profile found.', { found: false });
  }

  const reviewCount = angiData.reviewCount || angiData.review_count || 0;
  const claimed = !!(angiData.claimed || angiData.isClaimed);
  const certified = !!(angiData.certified || angiData.angiCertified || angiData.superServiceAward);
  const inputs = { reviewCount, claimed, certified };

  let score, note;

  if (!claimed) {
    score = 0;
    note = 'Angi profile unclaimed — no managed presence.';
  } else if (reviewCount < SCORING_CONSTANTS.ANGI_REVIEWS_FUNCTIONAL) {
    score = 1;
    note = `Angi profile claimed with ${reviewCount} review${reviewCount === 1 ? '' : 's'} — minimal presence.`;
  } else if (reviewCount < SCORING_CONSTANTS.ANGI_REVIEWS_BEST || !certified) {
    score = 2;
    note = `Angi profile with ${reviewCount} reviews${certified ? ' — Angi certified' : ' — certification not yet achieved'}.`;
  } else {
    score = 3;
    note = `Angi certified with ${reviewCount} reviews — strong verified directory presence.`;
  }

  return result(30, score, note, inputs);
}

// ─── CITATION & NAP SIGNALS (37–38) ──────────────────────────────────────────

/**
 * Signal 37 — Citation Volume and Consistency
 * Source: Directory crawl — total citation count across all platforms
 */
function scoreS37_CitationVolume(citationData) {
  const count = citationData.totalCitations || citationData.citation_count || 0;
  const inputs = { citationCount: count };

  let score, note;

  if (count < 10) {
    score = 0;
    note = `Only ${count} citations found — business has minimal online directory presence.`;
  } else if (count < SCORING_CONSTANTS.CITATIONS_FUNCTIONAL) {
    score = 1;
    note = `${count} citations — below the functional threshold of ${SCORING_CONSTANTS.CITATIONS_FUNCTIONAL}. Major directories may be missing.`;
  } else if (count < SCORING_CONSTANTS.CITATIONS_BEST) {
    score = 2;
    note = `${count} citations — functional presence approaching best practice of ${SCORING_CONSTANTS.CITATIONS_BEST}+.`;
  } else {
    score = 3;
    note = `${count} citations — comprehensive directory presence across major and trade-specific platforms.`;
  }

  return result(37, score, note, inputs);
}

/**
 * Signal 38 — NAP Consistency Score
 * Source: Cross-reference GBP + website + directories
 */
function scoreS38_NAPConsistency(napData) {
  const total = napData.totalSourcesChecked || 0;
  const inconsistencies = napData.inconsistencies || [];
  const inconsistencyCount = inconsistencies.length;

  const inputs = {
    totalSourcesChecked: total,
    inconsistencyCount,
    inconsistencies: inconsistencies.slice(0, 3), // store first 3 for the report
  };

  let score, note;

  if (total === 0) {
    score = 0;
    note = 'NAP consistency check could not run — insufficient directory presence.';
  } else if (inconsistencyCount >= 3) {
    score = 0;
    note = `${inconsistencyCount} NAP inconsistencies found across ${total} sources — name, address, or phone differs in multiple directories.`;
  } else if (inconsistencyCount === 2) {
    score = 1;
    note = `${inconsistencyCount} NAP inconsistencies found — minor variations in name or address format across directories.`;
  } else if (inconsistencyCount === 1) {
    score = 2;
    note = `1 minor NAP inconsistency found — mostly consistent across ${total} sources checked.`;
  } else {
    score = 3;
    note = `Perfect NAP consistency across all ${total} sources checked — name, address, and phone identical everywhere.`;
  }

  return result(38, score, note, inputs);
}

// ─── VIDEO SIGNALS (44–45) ────────────────────────────────────────────────────

/**
 * Signal 44 — Video Content Production
 * Source: YouTube Data API + Apify Facebook — total video count across platforms
 */
function scoreS44_VideoProduction(videoData) {
  const youtubeCount = videoData.youtubeVideoCount || 0;
  const facebookCount = videoData.facebookVideoCount || 0;
  const totalCount = youtubeCount + facebookCount;
  const inputs = { youtubeCount, facebookCount, totalCount };

  let score, note;

  if (totalCount === 0) {
    score = 0;
    note = 'No video content found on any platform — video completely absent.';
  } else if (totalCount < SCORING_CONSTANTS.VIDEO_COUNT_FUNCTIONAL) {
    score = 1;
    note = `${totalCount} video${totalCount === 1 ? '' : 's'} found — minimal, no consistent strategy visible.`;
  } else if (totalCount < SCORING_CONSTANTS.VIDEO_COUNT_BEST) {
    score = 2;
    note = `${totalCount} videos across ${[youtubeCount && 'YouTube', facebookCount && 'Facebook'].filter(Boolean).join(' and ')} — functional video presence.`;
  } else {
    score = 3;
    note = `${totalCount} videos across platforms — active, multi-platform video content strategy.`;
  }

  return result(44, score, note, inputs);
}

/**
 * Signal 45 — YouTube Channel Presence
 * Source: YouTube Data API — channel stats
 */
function scoreS45_YouTubeChannel(ytData) {
  if (!ytData || !ytData.channelId) {
    return result(45, 0, 'No YouTube channel found — absent from the second largest search engine.', { found: false });
  }

  const videoCount    = ytData.videoCount || 0;
  const subscriberCount = ytData.subscriberCount || 0;
  const lastUploadDays = ytData.lastUploadDate ? daysAgo(ytData.lastUploadDate / 1000) : Infinity;

  const inputs = {
    channelId: ytData.channelId,
    videoCount,
    subscriberCount,
    lastUploadDaysAgo: isFinite(lastUploadDays) ? Math.round(lastUploadDays) : null,
  };

  let score, note;

  if (videoCount < 3 || lastUploadDays > 180) {
    score = 1;
    note = `YouTube channel exists but inactive — ${videoCount} videos, last upload ${isFinite(lastUploadDays) ? Math.round(lastUploadDays) + ' days ago' : 'unknown'}.`;
  } else if (
    videoCount < 10 ||
    subscriberCount < SCORING_CONSTANTS.YOUTUBE_SUBS_FUNCTIONAL ||
    lastUploadDays > SCORING_CONSTANTS.YOUTUBE_FREQ_FUNCTIONAL
  ) {
    score = 2;
    note = `YouTube channel with ${videoCount} videos and ${subscriberCount} subscribers — active but below best practice volume.`;
  } else {
    score = 3;
    note = `YouTube channel with ${videoCount} videos and ${subscriberCount} subscribers — active, consistent upload cadence.`;
  }

  return result(45, score, note, inputs);
}

// ─── BATCH RUNNER ─────────────────────────────────────────────────────────────

/**
 * Run all 18 Method 1 scoring functions against a business's data.
 * Returns an array of 18 score objects ready to insert into cr_signal_scores.
 *
 * @param {Object} data
 * @param {Object} data.gbp           — cr_gbp_data row
 * @param {number} data.yearsInBusiness
 * @param {Object} data.facebook      — cr_apify_data row for platform='facebook'
 * @param {Object} data.nextdoor      — cr_apify_data row for platform='nextdoor'
 * @param {Object} data.homestars     — cr_apify_data row for platform='homestars'
 * @param {Object} data.houzz         — cr_apify_data row for platform='houzz'
 * @param {Object} data.angi          — cr_apify_data row for platform='angi'
 * @param {Object} data.citations     — aggregated citation data
 * @param {Object} data.nap           — NAP consistency check result
 * @param {Object} data.video         — combined YouTube + Facebook video counts
 * @param {Object} data.youtube       — YouTube Data API channel stats
 */
function scoreAllMethod1(data) {
  const { gbp = {}, yearsInBusiness, facebook = {}, nextdoor = {},
          homestars, houzz, angi, citations = {}, nap = {}, video = {}, youtube = {} } = data;

  const fb = facebook.scraped_data || facebook;
  const nd = nextdoor.scraped_data || nextdoor;
  const hs = homestars?.scraped_data || homestars;
  const hz = houzz?.scraped_data    || houzz;
  const ag = angi?.scraped_data     || angi;

  return [
    scoreS11_GBPCompleteness(gbp),
    scoreS12_GBPPhotos(gbp),
    scoreS13_GBPReviews(gbp, yearsInBusiness),
    scoreS14_GBPResponseBehaviour(gbp),
    scoreS15_GBPPosts(gbp),
    scoreS16_GBPServices(gbp),
    scoreS17_GBPQnA(gbp),
    scoreS18_GBPFeatures(gbp),
    scoreS21_FacebookReviews(fb),
    scoreS22_FacebookResponseBehaviour(fb),
    scoreS23_FacebookEvents(fb),
    scoreS26_NextdoorRecommendations(nd),
    scoreS28_HomeStars(hs),
    scoreS29_Houzz(hz),
    scoreS30_Angi(ag),
    scoreS37_CitationVolume(citations),
    scoreS38_NAPConsistency(nap),
    scoreS44_VideoProduction(video),
    scoreS45_YouTubeChannel(youtube),
  ];
}

module.exports = {
  scoreAllMethod1,
  SCORING_CONSTANTS,
  // Individual exports for unit testing
  scoreS11_GBPCompleteness,
  scoreS12_GBPPhotos,
  scoreS13_GBPReviews,
  scoreS14_GBPResponseBehaviour,
  scoreS15_GBPPosts,
  scoreS16_GBPServices,
  scoreS17_GBPQnA,
  scoreS18_GBPFeatures,
  scoreS21_FacebookReviews,
  scoreS22_FacebookResponseBehaviour,
  scoreS23_FacebookEvents,
  scoreS26_NextdoorRecommendations,
  scoreS28_HomeStars,
  scoreS29_Houzz,
  scoreS30_Angi,
  scoreS37_CitationVolume,
  scoreS38_NAPConsistency,
  scoreS44_VideoProduction,
  scoreS45_YouTubeChannel,
};


// ─── TEST ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const now = Math.floor(Date.now() / 1000);
  const dAgo = d => now - d * 86400;

  const testData = {
    yearsInBusiness: 10,
    gbp: {
      rating: 4.7,
      review_count: 82,
      photo_count: 34,
      description: 'Timmins best plumber since 2014',
      gbp_categories: ['Plumber', 'Emergency Plumber'],
      hours: { monday: '8am-6pm' },
      services_list: [
        { name: 'Drain Cleaning', description: 'Professional drain clearing' },
        { name: 'Pipe Repair',    description: 'All pipe materials' },
        { name: 'Water Heater',   description: 'Install and repair' },
        { name: 'Emergency',      description: '24/7 service' },
        { name: 'Sump Pump',      description: 'Installation and service' },
        { name: 'Gas Line',       description: 'Licensed gas work' },
        { name: 'Backflow',       description: 'Prevention devices' },
        { name: 'Inspections',    description: 'Full plumbing inspection' },
        { name: 'Faucets',        description: 'All makes and models' },
      ],
      messaging_enabled: true,
      booking_button: true,
      qa_count: 12,
      post_count: 8,
      last_post_date: dAgo(7),
      recent_reviews: [
        { time: dAgo(5),  rating: 5, owner_reply: { time: dAgo(4), text: 'Thank you!' } },
        { time: dAgo(15), rating: 5, owner_reply: { time: dAgo(13), text: 'Appreciate it!' } },
        { time: dAgo(32), rating: 4, owner_reply: { time: dAgo(30), text: 'Glad we helped.' } },
        { time: dAgo(48), rating: 5, owner_reply: { time: dAgo(46), text: 'Thanks for the kind words.' } },
        { time: dAgo(60), rating: 2, owner_reply: null },  // negative unanswered — should reduce S14
      ],
    },
    facebook: {
      rating: 4.6,
      reviewCount: 38,
      reviews: [
        { rating: 5, response: { text: 'Thank you!' } },
        { rating: 5, response: { text: 'Glad to help!' } },
        { rating: 4, response: null },
        { rating: 5, response: { text: 'Much appreciated.' } },
        { rating: 5, response: { text: 'We love our customers.' } },
      ],
      events: [
        { startTime: dAgo(30) },
        { startTime: dAgo(90) },
        { startTime: dAgo(180) },
        { startTime: dAgo(210) },
      ],
    },
    nextdoor: { recommendationCount: 22, recommendations: [
      { text: 'Best plumber in town — fixed our burst pipe in an hour' },
      { text: 'Called them on a Sunday, they showed up within 45 minutes' },
    ]},
    homestars:  { claimed: true, starScore: 9.2, reviewCount: 28 },
    houzz:      { claimed: true, reviewCount: 7 },
    angi:       { claimed: true, reviewCount: 19, certified: true },
    citations:  { totalCitations: 67 },
    nap:        { totalSourcesChecked: 24, inconsistencies: [] },
    video:      { youtubeVideoCount: 18, facebookVideoCount: 12 },
    youtube:    { channelId: 'UCxxx', videoCount: 18, subscriberCount: 340, lastUploadDate: Date.now() - 10 * 86400 * 1000 },
  };

  const scores = scoreAllMethod1(testData);

  console.log('\n─── Method 1 Signal Scores ───\n');
  let total = 0;
  scores.forEach(s => {
    const bar = '█'.repeat(s.score) + '░'.repeat(3 - s.score);
    console.log(`S${String(s.signal).padStart(2,'0')}  [${bar}] ${s.score}/3  ${s.note}`);
    total += s.score;
  });
  console.log(`\nTotal: ${total}/${scores.length * 3} across ${scores.length} Method 1 signals`);
  console.log(`Average: ${(total/scores.length).toFixed(2)}/3`);
}
