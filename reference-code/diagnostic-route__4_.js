// app/api/diagnostic/route.js
// Session 13: Layer 2 Rank / Local Pack wired via ValueSERP API
// Layer 1 (GBP) and Layer 3 (PageSpeed) unchanged from Session 12
// All three live layers now run in Promise.all()

import { runDiagnostic } from '@/lib/clearsky-engine';

// ---------------------------------------------------------------------------
// LAYER 1 — Google Business Profile (live via Places API)
// Unchanged from Session 11
// ---------------------------------------------------------------------------
async function fetchGBPLayer(businessName, city) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  const MOCK_GBP = {
    gbpExists: true,
    gbpRating: 4.1,
    gbpReviewCount: 23,
    gbpPostCount: 2, // stays mocked — GMB OAuth not yet wired
    gbpPhotosCount: 6,
    gbpHoursComplete: true,
    gbpDescriptionPresent: false,
    gbpServicesListed: true,
    gbpWebsiteLinked: true,
    _source: 'mock',
  };

  if (!apiKey) {
    console.warn('[Layer 1] GOOGLE_PLACES_API_KEY not set — using mock GBP data');
    return MOCK_GBP;
  }

  try {
    const query = encodeURIComponent(`${businessName} ${city}`);
    const fieldsParam = 'name,rating,user_ratings_total,photos,opening_hours,website,editorial_summary';
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=${fieldsParam}&key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Places API HTTP ${res.status}`);

    const data = await res.json();
    const place = data.candidates?.[0];

    if (!place) {
      console.warn('[Layer 1] No GBP result found — using mock');
      return { ...MOCK_GBP, gbpExists: false, _source: 'mock-no-result' };
    }

    return {
      gbpExists: true,
      gbpRating: place.rating ?? null,
      gbpReviewCount: place.user_ratings_total ?? 0,
      gbpPostCount: 2, // mocked — GMB OAuth required
      gbpPhotosCount: place.photos?.length ?? 0,
      gbpHoursComplete: !!(place.opening_hours?.weekday_text?.length),
      gbpDescriptionPresent: !!(place.editorial_summary?.overview),
      gbpServicesListed: true, // not available via Places API — kept true
      gbpWebsiteLinked: !!(place.website),
      _source: 'live',
    };
  } catch (err) {
    console.error('[Layer 1] GBP fetch error — falling back to mock:', err.message);
    return { ...MOCK_GBP, _source: 'mock-error' };
  }
}

// ---------------------------------------------------------------------------
// LAYER 2 — Rank / Local Pack (live via ValueSERP API)
// Session 13: new. Keyword pulled from trade config keywords[0] + city.
// Falls back to mock silently if VALUESERP_API_KEY missing or call fails.
// ---------------------------------------------------------------------------
async function fetchRankLayer(primaryKeyword, city, province = 'Ontario') {
  const apiKey = process.env.VALUESERP_API_KEY;

  const MOCK_RANK = {
    localPackRank: null,
    organicRank: 14,
    isInLocalPack: false,
    serpQuery: null,
    _source: 'mock',
  };

  if (!apiKey) {
    console.warn('[Layer 2] VALUESERP_API_KEY not set — using mock rank data');
    return MOCK_RANK;
  }

  // Construct query: "plumber timmins ontario"
  const query = `${primaryKeyword} ${city} ${province}`.trim();
  const encodedQuery = encodeURIComponent(query);

  // ValueSERP parameters:
  // - gl=ca: Google Canada results
  // - hl=en: English language
  // - location: province-level geo for accuracy without over-constraining to one postal code
  // - include_answer_box: false — we only need organic + local pack
  // - num: 20 — enough to capture organic rank beyond page 1 fold
  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    location: `${city}, ${province}, Canada`,
    gl: 'ca',
    hl: 'en',
    num: '20',
    include_answer_box: 'false',
  });

  const url = `https://api.valueserp.com/search?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 }, // cache for 1 hour — rank is stable intraday
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ValueSERP HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();

    // --- Parse local pack (map results) ---
    // ValueSERP returns local_results array for local pack entries
    const localResults = data.local_results ?? [];
    let localPackRank = null;
    let isInLocalPack = false;

    // We don't have the business name here — pass it through from caller
    // localPackRank is set by the caller wrapper once business name is known
    // For now: return all local pack entries for the caller to match against
    const localPackEntries = localResults.map((r, i) => ({
      position: i + 1,
      title: r.title ?? '',
      rating: r.rating ?? null,
      reviews: r.reviews ?? null,
    }));

    // --- Parse organic results ---
    const organicResults = data.organic_results ?? [];
    let organicRank = null;

    // organicRank is also matched by business name by the caller
    // Return raw organic list for matching
    const organicEntries = organicResults.map((r, i) => ({
      position: i + 1,
      title: r.title ?? '',
      link: r.link ?? '',
      domain: r.domain ?? '',
    }));

    return {
      localPackRank: null,          // resolved by matchRankResults()
      organicRank: null,            // resolved by matchRankResults()
      isInLocalPack: false,         // resolved by matchRankResults()
      serpQuery: query,
      localPackEntries,             // raw — for matching + future display
      organicEntries,               // raw — for matching + future display
      _source: 'live',
    };
  } catch (err) {
    console.error('[Layer 2] ValueSERP fetch error — falling back to mock:', err.message);
    return { ...MOCK_RANK, serpQuery: query, _source: 'mock-error' };
  }
}

// ---------------------------------------------------------------------------
// LAYER 2 — Business name matching against SERP results
// Normalises business name and matches against local pack + organic titles.
// Fuzzy: checks if any word from the business name appears in the result title.
// ---------------------------------------------------------------------------
function matchRankResults(rankData, businessName) {
  if (rankData._source !== 'live') return rankData;

  const normaliseName = (s) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b(plumbing|hvac|electrical|roofing|heating|cooling|services|solutions|contractors?|co|inc|ltd)\b/g, '')
      .trim();

  const normBusiness = normaliseName(businessName);
  const businessWords = normBusiness.split(/\s+/).filter(Boolean);

  const titleMatches = (title) => {
    const normTitle = normaliseName(title);
    // Match if any meaningful word from the business name appears in the result title
    return businessWords.some((word) => word.length > 2 && normTitle.includes(word));
  };

  // Local pack match
  const localMatch = rankData.localPackEntries?.find((e) => titleMatches(e.title));
  const localPackRank = localMatch ? localMatch.position : null;
  const isInLocalPack = !!localMatch;

  // Organic match
  const organicMatch = rankData.organicEntries?.find((e) => titleMatches(e.title));
  const organicRank = organicMatch ? organicMatch.position : null;

  return {
    ...rankData,
    localPackRank,
    organicRank,
    isInLocalPack,
  };
}

// ---------------------------------------------------------------------------
// LAYER 3 — PageSpeed Insights (live, no key required for 25 req/day)
// Unchanged from Session 12
// ---------------------------------------------------------------------------
async function fetchPageSpeedLayer(websiteUrl) {
  const MOCK_PAGESPEED = {
    performanceScore: 52,
    accessibilityScore: 71,
    bestPracticesScore: 67,
    seoScore: 61,
    lcp: 4800,
    fid: 280,
    cls: 0.18,
    ttfb: 820,
    tbt: 540,
    si: 5200,
    mobileFriendly: false,
    _source: 'mock',
  };

  if (!websiteUrl) {
    return { ...MOCK_PAGESPEED, _source: 'mock-no-url' };
  }

  // Validate URL
  try {
    const parsed = new URL(websiteUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
  } catch {
    console.warn('[Layer 3] Invalid websiteUrl — using mock:', websiteUrl);
    return { ...MOCK_PAGESPEED, _source: 'mock-invalid-url' };
  }

  const psiKey = process.env.PAGEINSIGHTS_KEY;
  const keyParam = psiKey ? `&key=${psiKey}` : '';
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(websiteUrl)}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo${keyParam}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`PSI HTTP ${res.status}`);

    const data = await res.json();
    const cats = data.lighthouseResult?.categories ?? {};
    const audits = data.lighthouseResult?.audits ?? {};

    const score = (key) => Math.round((cats[key]?.score ?? 0) * 100);
    const numeric = (key) => audits[key]?.numericValue ?? null;

    // Validate — if all scores are null, treat as failed
    if (!cats.performance?.score && !cats.seo?.score) {
      throw new Error('PSI returned null scores');
    }

    return {
      performanceScore: score('performance'),
      accessibilityScore: score('accessibility'),
      bestPracticesScore: score('best-practices'),
      seoScore: score('seo'),
      lcp: numeric('largest-contentful-paint'),
      fid: numeric('max-potential-fid'),
      cls: numeric('cumulative-layout-shift'),
      ttfb: numeric('server-response-time'),
      tbt: numeric('total-blocking-time'),
      si: numeric('speed-index'),
      mobileFriendly: audits['viewport']?.score === 1,
      _source: 'live',
    };
  } catch (err) {
    console.error('[Layer 3] PageSpeed fetch error — falling back to mock:', err.message);
    return { ...MOCK_PAGESPEED, _source: 'mock-error' };
  }
}

// ---------------------------------------------------------------------------
// MAIN ROUTE HANDLER
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json();
    const { business, inputs } = body;

    // Fetch trade config to get keyword list
    // Province defaults to Ontario — extend when multi-province launches
    const tradeSlug = business?.trade?.toLowerCase() ?? 'plumbing';
    const province = business?.province ?? 'Ontario';

    let primaryKeyword = tradeSlug; // fallback if trade fetch fails
    try {
      const tradeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/trades`
      );
      if (tradeRes.ok) {
        const tradesArray = await tradeRes.json();
        // Real trades route returns an array — match by name (case-insensitive)
        const tradeConfig = tradesArray.find(
          (t) => t.name.toLowerCase() === tradeSlug || t.name.toLowerCase().startsWith(tradeSlug)
        );
        primaryKeyword = tradeConfig?.keywords?.[0] ?? tradeSlug;
      }
    } catch (err) {
      console.warn('[diagnostic] Trade config fetch failed — using trade slug as keyword:', err.message);
    }

    // Run Layer 1, Layer 2, Layer 3 in parallel
    const [gbpData, rankDataRaw, pageSpeedData] = await Promise.all([
      fetchGBPLayer(business?.businessName ?? '', business?.city ?? ''),
      fetchRankLayer(primaryKeyword, business?.city ?? '', province),
      fetchPageSpeedLayer(business?.websiteUrl ?? null),
    ]);

    // Resolve business name matching against SERP results
    const rankData = matchRankResults(rankDataRaw, business?.businessName ?? '');

    // Build engine inputs — merge live data with form inputs
    const engineInputs = {
      ...inputs,

      // Layer 1 — GBP
      gbpExists: gbpData.gbpExists,
      gbpRating: gbpData.gbpRating,
      gbpReviewCount: gbpData.gbpReviewCount,
      gbpPostCount: gbpData.gbpPostCount,
      gbpPhotosCount: gbpData.gbpPhotosCount,
      gbpHoursComplete: gbpData.gbpHoursComplete,
      gbpDescriptionPresent: gbpData.gbpDescriptionPresent,
      gbpServicesListed: gbpData.gbpServicesListed,
      gbpWebsiteLinked: gbpData.gbpWebsiteLinked,

      // Layer 2 — Rank / Local Pack
      localPackRank: rankData.localPackRank,
      organicRank: rankData.organicRank,
      isInLocalPack: rankData.isInLocalPack,

      // Layer 3 — PageSpeed
      performanceScore: pageSpeedData.performanceScore,
      accessibilityScore: pageSpeedData.accessibilityScore,
      bestPracticesScore: pageSpeedData.bestPracticesScore,
      seoScore: pageSpeedData.seoScore,
      lcp: pageSpeedData.lcp,
      fid: pageSpeedData.fid,
      cls: pageSpeedData.cls,
      ttfb: pageSpeedData.ttfb,
      tbt: pageSpeedData.tbt,
      si: pageSpeedData.si,
      mobileFriendly: pageSpeedData.mobileFriendly,

      // Layers 4–12 — mocked until wired
      pageCount: inputs?.pageCount ?? 8,
      blogPostCount: inputs?.blogPostCount ?? 3,
      faqCount: inputs?.faqCount ?? 2,
      brandedSearchPresent: inputs?.brandedSearchPresent ?? false,
      aiPlatformCount: inputs?.aiPlatformCount ?? 0,
      facebookFollowers: inputs?.facebookFollowers ?? 180,
      instagramFollowers: inputs?.instagramFollowers ?? 95,
      socialPostingCadence: inputs?.socialPostingCadence ?? 'low',
      paidCampaignActive: inputs?.paidCampaignActive ?? false,
      lsaActive: inputs?.lsaActive ?? false,
      paidCompetitorCount: inputs?.paidCompetitorCount ?? 3,
      chatbotPresent: inputs?.chatbotPresent ?? false,
      bookingToolPresent: inputs?.bookingToolPresent ?? false,
      leadFormPresent: inputs?.leadFormPresent ?? false,
      conversionTrackingPresent: inputs?.conversionTrackingPresent ?? false,
      clientPortalPresent: inputs?.clientPortalPresent ?? false,
      ga4Connected: inputs?.ga4Connected ?? false,
      emailMarketingActive: inputs?.emailMarketingActive ?? false,
      referralSystemPresent: inputs?.referralSystemPresent ?? false,
      duplicateGbpPresent: inputs?.duplicateGbpPresent ?? false,
    };

    // Run diagnostic engine
    const results = runDiagnostic(business, engineInputs);

    // Attach source metadata
    results.meta = {
      ...(results.meta ?? {}),
      _gbpSource: gbpData._source,
      _rankSource: rankData._source,
      _serpQuery: rankData.serpQuery ?? null,
      _localPackEntries: rankData.localPackEntries ?? null,   // for testing/debug
      _organicEntries: rankData.organicEntries?.slice(0, 5) ?? null, // first 5 for debug
      _pageSpeedSource: pageSpeedData._source,
      _websiteUrl: business?.websiteUrl ?? null,
      _primaryKeyword: primaryKeyword,
    };

    return Response.json(results);
  } catch (err) {
    console.error('[diagnostic] Unhandled error:', err);
    return Response.json({ error: 'Diagnostic failed', detail: err.message }, { status: 500 });
  }
}
