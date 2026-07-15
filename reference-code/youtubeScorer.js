/**
 * ContentRadar — YouTube Data API Integration
 * server/scoring/youtubeScorer.js
 *
 * Scores signals 44, 45, 46, and 47 using the YouTube Data API v3.
 *
 * Signal 44 — Video Content Production
 *   Volume, recency, and cadence across platforms
 *
 * Signal 45 — Video Platform Distribution (YouTube component)
 *   Channel presence, optimisation, and cross-platform strategy
 *
 * Signal 46 — Video Content Strategy and Topics
 *   NLP analysis of video titles and descriptions against intent buckets
 *
 * Signal 47 — Video Engagement and Search Visibility
 *   View trajectory, subscriber growth, search ranking for trade queries
 *
 * API: YouTube Data API v3
 * Cost: Free — 10,000 units/day quota
 * Unit cost per operation:
 *   search.list:    100 units
 *   channels.list:  1 unit
 *   videos.list:    1 unit per video (up to 50 per call)
 * Estimated per contractor: ~120–150 units (well within free quota)
 *
 * Environment variable required:
 *   YOUTUBE_API_KEY — Google Cloud Console key with YouTube Data API v3 enabled
 *
 * Usage:
 *   const { runYouTubeScoring } = require('./youtubeScorer');
 *   const scores = await runYouTubeScoring(business, options);
 */

'use strict';

const fetch = require('node-fetch');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

// Scoring thresholds
const THRESHOLDS = {
  // Signal 44: Video production
  VIDEO_TOTAL_FUNCTIONAL:  5,    // 5+ total videos = functional
  VIDEO_TOTAL_BEST:        20,   // 20+ total videos = best practice
  UPLOAD_FREQ_BEST:        14,   // ≤14 days between uploads = weekly cadence
  UPLOAD_FREQ_FUNCTIONAL:  35,   // ≤35 days = twice monthly minimum

  // Signal 45: Distribution
  CHANNEL_SUBS_FUNCTIONAL: 50,   // 50+ subscribers = functional
  CHANNEL_SUBS_BEST:       200,  // 200+ = best practice
  VIDEOS_FOR_CHANNEL_BEST: 10,   // 10+ videos = well-established channel

  // Signal 46: Topic coverage — how many intent buckets represented
  INTENT_BUCKETS_FUNCTIONAL: 2,  // 2 of 4 buckets = functional
  INTENT_BUCKETS_BEST:       4,  // All 4 = best practice

  // Signal 47: Search visibility
  VIEWS_TRAJECTORY_GOOD:   1.2,  // 20%+ growth in recent vs older views
  SUBSCRIBERS_GROWING:     0.05, // 5%+ growth rate = growing
};

// Intent bucket keyword patterns for video title/description NLP
// Used to classify which intent buckets a video serves
const INTENT_PATTERNS = {
  emergency: [
    /emergency/i, /urgent/i, /burst pipe/i, /no heat/i, /flooded/i,
    /leak/i, /frozen pipe/i, /24.?hour/i, /right now/i, /immediately/i,
    /carbon monoxide/i, /power out/i, /storm damage/i,
  ],
  activeProject: [
    /installation/i, /install/i, /replace/i, /replacement/i, /upgrade/i,
    /what to expect/i, /our process/i, /how it works/i, /new (?:furnace|ac|roof|panel)/i,
    /renovation/i, /project/i, /before.?after/i,
  ],
  comparison: [
    /best/i, /top/i, /review/i, /testimonial/i, /recommend/i, /choose/i,
    /vs\b/i, /versus/i, /compare/i, /why (?:us|choose|hire)/i, /customer/i,
    /satisfied/i, /5.?star/i,
  ],
  research: [
    /how (?:to|much|long|often)/i, /what is/i, /why does/i, /tips/i, /guide/i,
    /diy/i, /maintenance/i, /seasonal/i, /winter/i, /spring/i, /annual/i,
    /cost of/i, /price of/i, /signs (?:of|your)/i, /do you need/i,
  ],
};

// ─── YOUTUBE API CALLER ───────────────────────────────────────────────────────

async function ytFetch(endpoint, params) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY not set in .env');

  const url = new URL(`${YT_BASE}/${endpoint}`);
  url.searchParams.set('key', key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), { timeout: 12000 });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`YouTube API ${res.status}: ${err?.error?.message || 'unknown error'}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(`YouTube fetch failed (${endpoint}): ${err.message}`);
  }
}

// ─── CHANNEL FINDER ───────────────────────────────────────────────────────────

/**
 * Find a YouTube channel by business name and/or explicit URL.
 * Returns channel data or null if not found.
 */
async function findChannel(businessName, city, youtubeUrl = null) {
  // If explicit channel URL provided, extract channel ID
  if (youtubeUrl) {
    const channelId = extractChannelId(youtubeUrl);
    if (channelId) {
      return fetchChannelById(channelId);
    }
  }

  // Search by business name
  try {
    const searchData = await ytFetch('search', {
      part:       'snippet',
      q:          `${businessName} ${city}`,
      type:       'channel',
      maxResults: '3',
    });

    if (!searchData.items?.length) return null;

    // Find the best matching channel
    const normalised = businessName.toLowerCase();
    const bestMatch = searchData.items.find(item => {
      const title = (item.snippet?.title || '').toLowerCase();
      return title.includes(normalised.split(' ')[0]) ||
             normalised.includes(title.split(' ')[0]);
    }) || searchData.items[0];

    const channelId = bestMatch.id?.channelId || bestMatch.snippet?.channelId;
    if (!channelId) return null;

    return fetchChannelById(channelId);
  } catch {
    return null;
  }
}

function extractChannelId(url) {
  // Handle: /channel/UCxxx, /c/channelname, /@handle
  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]+)/,
    /youtube\.com\/c\/([\w-]+)/,
    /youtube\.com\/@([\w-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchChannelById(channelId) {
  const data = await ytFetch('channels', {
    part:  'snippet,statistics,contentDetails,brandingSettings',
    id:    channelId,
  });

  if (!data.items?.length) return null;
  return data.items[0];
}

// ─── VIDEO FETCHER ────────────────────────────────────────────────────────────

/**
 * Fetch the most recent videos from a channel.
 * Returns array of video objects with snippet and statistics.
 */
async function fetchChannelVideos(channelId, maxResults = 50) {
  // Get upload playlist ID
  const channelData = await ytFetch('channels', {
    part: 'contentDetails',
    id:   channelId,
  });

  const uploadsPlaylistId = channelData.items?.[0]
    ?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) return [];

  // Get video IDs from uploads playlist
  const playlistData = await ytFetch('playlistItems', {
    part:       'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });

  const videoIds = (playlistData.items || [])
    .map(i => i.contentDetails?.videoId)
    .filter(Boolean);

  if (!videoIds.length) return [];

  // Fetch video details in batches of 50
  const batches = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }

  const videos = [];
  for (const batch of batches) {
    const data = await ytFetch('videos', {
      part: 'snippet,statistics,contentDetails',
      id:   batch.join(','),
    });
    videos.push(...(data.items || []));
  }

  return videos;
}

// ─── CONTENT ANALYSER ─────────────────────────────────────────────────────────

/**
 * Analyse video titles and descriptions to determine:
 * - Which intent buckets are represented
 * - Whether content is trade-specific vs generic
 * - Whether titles are optimised (include trade + city keywords)
 */
function analyseVideoContent(videos, trade, city) {
  const intentCoverage = {
    emergency:    false,
    activeProject: false,
    comparison:   false,
    research:     false,
  };

  let tradeSpecificCount = 0;
  let optimisedTitleCount = 0;
  const titleKeywords = [trade, city].map(s => s.toLowerCase());

  for (const video of videos) {
    const title       = (video.snippet?.title || '').toLowerCase();
    const description = (video.snippet?.description || '').toLowerCase();
    const combined    = `${title} ${description}`;

    // Check intent buckets
    for (const [bucket, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (patterns.some(p => p.test(combined))) {
        intentCoverage[bucket] = true;
      }
    }

    // Trade-specific check
    if (titleKeywords.some(kw => title.includes(kw))) {
      tradeSpecificCount++;
    }

    // Optimised title check — trade keyword + location keyword
    const hasTradeKw = title.includes(trade.toLowerCase()) ||
                       title.includes(trade.toLowerCase().split(' ')[0]);
    const hasCityKw  = title.includes(city.toLowerCase());
    if (hasTradeKw || hasCityKw) optimisedTitleCount++;
  }

  const bucketsCovered = Object.values(intentCoverage).filter(Boolean).length;

  return {
    intentCoverage,
    bucketsCovered,
    tradeSpecificCount,
    tradeSpecificRate: videos.length > 0
      ? Math.round(tradeSpecificCount / videos.length * 100)
      : 0,
    optimisedTitleCount,
    optimisedTitleRate: videos.length > 0
      ? Math.round(optimisedTitleCount / videos.length * 100)
      : 0,
  };
}

/**
 * Calculate upload frequency in days between uploads.
 * Lower = more frequent.
 */
function calculateUploadFrequency(videos) {
  if (videos.length < 2) return Infinity;

  const dates = videos
    .map(v => new Date(v.snippet?.publishedAt || 0).getTime())
    .filter(d => d > 0)
    .sort((a, b) => b - a); // newest first

  if (dates.length < 2) return Infinity;

  // Average gap between uploads
  let totalGap = 0;
  for (let i = 0; i < dates.length - 1; i++) {
    totalGap += (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
  }
  return totalGap / (dates.length - 1);
}

/**
 * Calculate view trajectory — are views growing over time?
 * Compares average views of recent videos vs older videos.
 */
function calculateViewTrajectory(videos) {
  if (videos.length < 4) return null;

  const withViews = videos
    .filter(v => v.statistics?.viewCount)
    .sort((a, b) =>
      new Date(b.snippet?.publishedAt || 0) - new Date(a.snippet?.publishedAt || 0)
    );

  if (withViews.length < 4) return null;

  const half    = Math.floor(withViews.length / 2);
  const recent  = withViews.slice(0, half);
  const older   = withViews.slice(half);

  const avgRecent = recent.reduce((sum, v) => sum + parseInt(v.statistics.viewCount), 0) / recent.length;
  const avgOlder  = older.reduce((sum, v) => sum + parseInt(v.statistics.viewCount), 0) / older.length;

  if (avgOlder === 0) return null;
  return avgRecent / avgOlder; // ratio > 1.0 = growing
}

/**
 * Check if videos have captions/transcripts available.
 * Transcripts support AI indexing and search.
 */
function checkTranscriptsAvailable(videos) {
  return videos.some(v =>
    v.contentDetails?.caption === 'true' ||
    v.snippet?.defaultAudioLanguage === 'en'
  );
}

// ─── SIGNAL SCORERS ───────────────────────────────────────────────────────────

/**
 * Score signals 44–47 from channel + video data.
 * Takes pre-fetched channel and video objects.
 */
function scoreFromYouTubeData(channel, videos, fbVideoCount, trade, city, businessName) {
  const videoCount      = videos.length;
  const uploadFreq      = calculateUploadFrequency(videos);
  const viewTrajectory  = calculateViewTrajectory(videos);
  const contentAnalysis = analyseVideoContent(videos, trade, city);
  const hasTranscripts  = checkTranscriptsAvailable(videos);
  const totalVideos     = videoCount + (fbVideoCount || 0);

  const subscribers = parseInt(channel?.statistics?.subscriberCount || '0');
  const totalViews  = parseInt(channel?.statistics?.viewCount || '0');
  const channelAge  = channel
    ? Math.floor((Date.now() - new Date(channel.snippet?.publishedAt || 0).getTime())
        / (1000 * 60 * 60 * 24 * 365))
    : 0;

  const lastUploadDays = videos.length > 0
    ? Math.floor((Date.now() - new Date(videos[0].snippet?.publishedAt || 0).getTime())
        / (1000 * 60 * 60 * 24))
    : Infinity;

  // ── Signal 44: Video Content Production ─────────────────────────────────
  let s44score, s44note;
  const inputs44 = { totalVideos, videoCount, fbVideoCount, uploadFreqDays: Math.round(uploadFreq), lastUploadDays };

  if (totalVideos === 0) {
    s44score = 0;
    s44note  = 'No video content found on YouTube or Facebook — contractor has no video presence.';
  } else if (totalVideos < THRESHOLDS.VIDEO_TOTAL_FUNCTIONAL || lastUploadDays > 180) {
    s44score = 1;
    s44note  = `${totalVideos} video${totalVideos === 1 ? '' : 's'} found — minimal or inactive video production.`;
  } else if (
    totalVideos < THRESHOLDS.VIDEO_TOTAL_BEST ||
    uploadFreq > THRESHOLDS.UPLOAD_FREQ_FUNCTIONAL
  ) {
    s44score = 2;
    s44note  = `${totalVideos} videos with roughly ${Math.round(uploadFreq)}-day upload cadence — functional but below weekly best practice.`;
  } else {
    s44score = 3;
    s44note  = `${totalVideos} videos with ${Math.round(uploadFreq)}-day upload cadence — consistent weekly production across platforms.`;
  }

  // ── Signal 45: Video Platform Distribution ───────────────────────────────
  const platformsWithVideo = [];
  if (videoCount > 0)     platformsWithVideo.push('YouTube');
  if (fbVideoCount > 0)   platformsWithVideo.push('Facebook');
  // Website embedding is checked by Method 2 scorer (S47) — not here

  let s45score, s45note;
  const inputs45 = {
    channelFound: !!channel,
    subscribers,
    videoCount,
    lastUploadDays,
    platformsWithVideo,
    hasPlaylists: !!(channel?.contentDetails?.relatedPlaylists),
  };

  if (!channel) {
    s45score = 0;
    s45note  = 'No YouTube channel found — absent from the second largest search engine.';
  } else if (videoCount < 3 || lastUploadDays > 180) {
    s45score = 1;
    s45note  = `YouTube channel exists but inactive — ${videoCount} videos, last upload ${lastUploadDays} days ago.`;
  } else if (
    subscribers < THRESHOLDS.CHANNEL_SUBS_FUNCTIONAL ||
    videoCount < THRESHOLDS.VIDEOS_FOR_CHANNEL_BEST ||
    platformsWithVideo.length < 2
  ) {
    s45score = 2;
    s45note  = `YouTube channel with ${videoCount} videos, ${subscribers} subscribers — active but below best practice distribution.`;
  } else {
    s45score = 3;
    s45note  = `YouTube channel with ${videoCount} videos, ${subscribers} subscribers — active, well-distributed across ${platformsWithVideo.join(' and ')}.`;
  }

  // ── Signal 46: Video Content Strategy and Topics ─────────────────────────
  let s46score, s46note;
  const inputs46 = {
    ...contentAnalysis,
    totalVideos,
    hasTranscripts,
  };

  if (totalVideos === 0 || contentAnalysis.bucketsCovered === 0) {
    s46score = 0;
    s46note  = 'No video content to analyse or content entirely promotional — no intent bucket coverage.';
  } else if (contentAnalysis.bucketsCovered === 1) {
    s46score = 1;
    const bucket = Object.entries(contentAnalysis.intentCoverage)
      .find(([, v]) => v)?.[0] || 'single topic';
    s46note  = `Video content covers only ${bucket} intent — no deliberate multi-bucket strategy.`;
  } else if (contentAnalysis.bucketsCovered >= THRESHOLDS.INTENT_BUCKETS_FUNCTIONAL) {
    s46score = 2;
    const covered = Object.entries(contentAnalysis.intentCoverage)
      .filter(([, v]) => v).map(([k]) => k);
    s46note  = `Video content covers ${contentAnalysis.bucketsCovered}/4 intent buckets (${covered.join(', ')}) — functional strategy emerging.`;
  } else {
    s46score = 3;
    s46note  = `All 4 intent buckets represented in video content — deliberate strategy covering emergency, project, comparison, and research.`;
  }

  // ── Signal 47: Video Engagement and Search Visibility ────────────────────
  const trajectoryRatio = viewTrajectory;
  const hasOptimisedTitles = contentAnalysis.optimisedTitleRate >= 40;
  const subscribersGrowing = channelAge > 0 && subscribers > 0; // Growth tracking requires historical data

  let s47score, s47note;
  const inputs47 = {
    totalViews,
    subscribers,
    viewTrajectory: trajectoryRatio !== null ? Math.round(trajectoryRatio * 100) : null,
    hasOptimisedTitles,
    optimisedTitleRate: contentAnalysis.optimisedTitleRate,
    hasTranscripts,
    channelAgeYears: channelAge,
  };

  if (videoCount === 0) {
    s47score = 0;
    s47note  = 'No YouTube videos — zero video search visibility.';
  } else if (!hasOptimisedTitles || subscribers < THRESHOLDS.CHANNEL_SUBS_FUNCTIONAL) {
    s47score = 1;
    s47note  = `${videoCount} videos but titles not optimised for search and subscriber base minimal — organic discovery limited.`;
  } else if (
    trajectoryRatio === null ||
    trajectoryRatio < THRESHOLDS.VIEWS_TRAJECTORY_GOOD ||
    !hasTranscripts
  ) {
    s47score = 2;
    s47note  = `Optimised channel with ${subscribers} subscribers — functional search visibility but ${!hasTranscripts ? 'no transcripts' : 'view trajectory not strongly growing'}.`;
  } else {
    s47score = 3;
    s47note  = `Strong video search visibility — optimised titles, ${subscribers} subscribers, growing view trajectory${hasTranscripts ? ', transcripts available' : ''}.`;
  }

  return {
    s44: { signal: 44, score: s44score, note: s44note, method: 'youtube_api', inputs: inputs44 },
    s45: { signal: 45, score: s45score, note: s45note, method: 'youtube_api', inputs: inputs45 },
    s46: { signal: 46, score: s46score, note: s46note, method: 'youtube_api', inputs: inputs46 },
    s47: { signal: 47, score: s47score, note: s47note, method: 'youtube_api', inputs: inputs47 },
  };
}

// ─── MAIN RUNNER ──────────────────────────────────────────────────────────────

/**
 * Run YouTube scoring for signals 44–47.
 *
 * @param {Object} business       — business record from cr_businesses
 * @param {Object} options
 * @param {number} options.fbVideoCount  — Facebook video count from Apify (default 0)
 * @param {number} options.maxVideos     — max videos to fetch (default 50)
 *
 * @returns {Object[]} — array of 4 score objects (signals 44–47)
 */
async function runYouTubeScoring(business, options = {}) {
  const {
    fbVideoCount = 0,
    maxVideos    = 50,
  } = options;

  if (!process.env.YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY not set — returning manual placeholders for signals 44–47');
    return [44, 45, 46, 47].map(sig => ({
      signal: sig,
      score: null,
      note: 'YouTube API key not configured — manual scoring required.',
      method: 'manual',
      needs_review: true,
      inputs: {},
    }));
  }

  const { business_name, trade = 'plumbing', city, youtube_url } = business;
  console.log(`YouTube: scoring signals 44–47 for ${business_name}`);

  try {
    // Find channel
    const channel = await findChannel(business_name, city, youtube_url);

    if (!channel) {
      // No channel found — return zero scores with correct structure
      const noChannel = {
        signal: 45, score: 0,
        note: 'No YouTube channel found — absent from the second largest search engine.',
        method: 'youtube_api', inputs: { channelFound: false },
      };
      const noContent = (sig) => ({
        signal: sig, score: 0,
        note: 'No YouTube channel — video scoring not possible.',
        method: 'youtube_api',
        inputs: { channelFound: false, fbVideoCount },
      });
      return [noContent(44), noChannel, noContent(46), noContent(47)];
    }

    const channelId = channel.id;

    // Fetch videos
    const videos = await fetchChannelVideos(channelId, maxVideos);
    console.log(`YouTube: found channel with ${videos.length} videos, ${channel.statistics?.subscriberCount} subscribers`);

    // Score all four signals
    const { s44, s45, s46, s47 } = scoreFromYouTubeData(
      channel, videos, fbVideoCount, trade, city, business_name
    );

    return [s44, s45, s46, s47];

  } catch (err) {
    console.error(`YouTube scoring failed for ${business_name}: ${err.message}`);
    return [44, 45, 46, 47].map(sig => ({
      signal: sig,
      score: null,
      note: `YouTube API error: ${err.message}`,
      method: 'youtube_api',
      needs_review: true,
      inputs: { error: err.message },
    }));
  }
}

// ─── UNIT COST ESTIMATOR ──────────────────────────────────────────────────────

function estimateCost() {
  return {
    units: {
      channelSearch:  100,  // search.list
      channelFetch:   1,    // channels.list
      videosList:     1,    // playlistItems.list
      videoDetails:   1,    // videos.list (per video, up to 50/call)
      totalEstimate:  155,  // ~155 units per contractor
    },
    dailyQuota:      10000,
    contractorsPerDay: Math.floor(10000 / 155), // ~64 contractors/day on free quota
    cost:            '$0.00 — free quota',
  };
}

module.exports = {
  runYouTubeScoring,
  estimateCost,
  findChannel,
  fetchChannelVideos,
  analyseVideoContent,
  calculateUploadFrequency,
  calculateViewTrajectory,
  INTENT_PATTERNS,
  THRESHOLDS,
};


// ─── TEST ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const testBusiness = {
    id:            'test-001',
    business_name: 'Timmins Best Plumbing',
    trade:         'plumbing',
    city:          'Timmins',
    youtube_url:   null,
  };

  // Cost estimate
  console.log('\n─── YouTube API Cost Estimate ───\n');
  const est = estimateCost();
  console.log(`Units per contractor:  ~${est.units.totalEstimate}`);
  console.log(`Daily quota:           ${est.dailyQuota.toLocaleString()} units`);
  console.log(`Contractors per day:   ~${est.contractorsPerDay} (on free quota)`);
  console.log(`Cost:                  ${est.cost}`);
  console.log(`\nUnit breakdown:`);
  console.log(`  Channel search:      ${est.units.channelSearch} units (search.list)`);
  console.log(`  Channel fetch:       ${est.units.channelFetch} unit (channels.list)`);
  console.log(`  Videos list:         ${est.units.videosList} unit (playlistItems.list)`);
  console.log(`  Video details:       ${est.units.videoDetails} unit per video (videos.list)`);

  // Intent pattern test
  console.log('\n─── Intent Bucket Detection Test ───\n');
  const testTitles = [
    { title: 'Emergency Furnace Repair Timmins - We Answer 24/7',       expected: 'emergency'     },
    { title: 'What to Expect During Your Water Heater Installation',     expected: 'activeProject' },
    { title: 'Why Choose Timmins Best Plumbing - Customer Reviews',     expected: 'comparison'    },
    { title: 'How Much Does Drain Cleaning Cost in Northern Ontario?',   expected: 'research'      },
    { title: 'Timmins Plumber Weekly Vlog',                             expected: 'none'          },
  ];

  testTitles.forEach(({ title, expected }) => {
    const detected = [];
    for (const [bucket, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (patterns.some(p => p.test(title))) detected.push(bucket);
    }
    const matched = detected.includes(expected) || (expected === 'none' && detected.length === 0);
    const status  = matched ? '✓' : '✗ FAIL';
    console.log(`${status}  [${(detected.join(', ') || 'none').padEnd(20)}]  "${title}"`);
  });

  // Upload frequency test
  console.log('\n─── Upload Frequency Test ───\n');
  const now = Date.now();
  const mockVideos = [
    { snippet: { publishedAt: new Date(now - 7  * 86400000).toISOString() } },
    { snippet: { publishedAt: new Date(now - 14 * 86400000).toISOString() } },
    { snippet: { publishedAt: new Date(now - 21 * 86400000).toISOString() } },
    { snippet: { publishedAt: new Date(now - 28 * 86400000).toISOString() } },
  ];
  const freq = calculateUploadFrequency(mockVideos);
  console.log(`4 videos at weekly cadence → ${Math.round(freq)} days between uploads (expected: 7)`);
  console.log(`Score: ${freq <= THRESHOLDS.UPLOAD_FREQ_BEST ? '3 (best practice)' : freq <= THRESHOLDS.UPLOAD_FREQ_FUNCTIONAL ? '2 (functional)' : '1 (weak)'}`);

  // Live API test
  if (process.env.YOUTUBE_API_KEY) {
    console.log('\n─── Live API Test ───\n');
    runYouTubeScoring(testBusiness, { fbVideoCount: 8 }).then(scores => {
      scores.forEach(s => {
        const bar = s.score !== null ? '█'.repeat(s.score) + '░'.repeat(3 - s.score) : '???';
        console.log(`S${String(s.signal).padStart(2, '0')}  [${bar}] ${s.score ?? 'null'}/3  ${s.note}`);
      });
    }).catch(console.error);
  } else {
    console.log('\nSet YOUTUBE_API_KEY in .env to run live test.');
    console.log('Get a key at: console.cloud.google.com → Enable YouTube Data API v3');
  }
}
