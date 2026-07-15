/**
 * ContentRadar — AI Platform Automation
 * server/scoring/aiPlatformScorer.js
 *
 * Automates signals 48, 49, and 50 — previously scored manually.
 *
 * Signal 48 — AI Platform Visibility
 *   Is this contractor being recommended by ChatGPT, Gemini, and Perplexity?
 *
 * Signal 49 — AI Query Type Coverage
 *   Across which query types (branded, trade, problem, emergency,
 *   comparison, research) does the contractor appear?
 *
 * Signal 50 — AI Citation Source Diversity
 *   When the contractor appears in AI responses, how many different
 *   source types are being cited? (GBP, reviews, directories,
 *   website, video, directories etc.)
 *
 * Architecture:
 *   1. Build a structured query set per trade (6 query types × 3 platforms)
 *   2. Send all queries in parallel via API
 *   3. Parse responses for contractor name mentions
 *   4. Extract citation sources from response text
 *   5. Score all three signals from the same query results
 *
 * APIs used:
 *   - OpenAI API    (ChatGPT — gpt-4o-mini, cheapest capable model)
 *   - Google Gemini (gemini-1.5-flash)
 *   - Perplexity    (sonar-small-online — has live web search built in)
 *
 * Cost estimate per contractor audit:
 *   18 queries × 3 platforms = 54 API calls
 *   OpenAI gpt-4o-mini:     ~$0.008 per audit
 *   Google Gemini Flash:    ~$0.003 per audit
 *   Perplexity sonar-small: ~$0.027 per audit ($0.0005/query)
 *   Total:                  ~$0.04–0.08 per contractor
 *
 * Environment variables required:
 *   OPENAI_API_KEY      — OpenAI API key
 *   GEMINI_API_KEY      — Google AI Studio key
 *   PERPLEXITY_API_KEY  — Perplexity API key
 *
 * Usage:
 *   const { runAIPlatformScoring } = require('./aiPlatformScorer');
 *   const scores = await runAIPlatformScoring(business, options);
 */

'use strict';

const fetch = require('node-fetch');

// ─── QUERY TEMPLATES ──────────────────────────────────────────────────────────
// Six query type categories × four trades
// {name}, {city}, {province} replaced at runtime

const QUERY_TEMPLATES = {
  branded: [
    '{name} {city}',
    '{name} {city} {province}',
    '{name} plumber reviews',  // varies per trade
  ],
  trade: [
    'best {trade} in {city}',
    '{trade} contractor {city} {province}',
    'top rated {trade} {city}',
  ],
  problem: [
    'who to call for {problem1} in {city}',
    '{problem1} repair {city}',
    '{problem2} {city} Ontario',
  ],
  emergency: [
    'emergency {trade} {city}',
    '24 hour {trade} {city}',
    'emergency {problem1} {city}',
  ],
  comparison: [
    'best {trade} contractor {city}',
    'recommended {trade} {city} {province}',
    'who is the best {trade} near {city}',
  ],
  research: [
    'how much does {service1} cost in {city}',
    'how long does {service1} take',
    'what to look for in a {trade} contractor',
  ],
};

// Trade-specific replacements
const TRADE_VARS = {
  plumbing: {
    trade:    'plumber',
    problem1: 'burst pipe',
    problem2: 'no hot water',
    service1: 'drain cleaning',
    service2: 'water heater replacement',
  },
  hvac: {
    trade:    'HVAC contractor',
    problem1: 'furnace not working',
    problem2: 'no heat',
    service1: 'furnace installation',
    service2: 'AC tune up',
  },
  electrical: {
    trade:    'electrician',
    problem1: 'electrical problem',
    problem2: 'circuit breaker keeps tripping',
    service1: 'electrical panel upgrade',
    service2: 'wiring repair',
  },
  roofing: {
    trade:    'roofing contractor',
    problem1: 'roof leak',
    problem2: 'storm damage roof',
    service1: 'roof replacement',
    service2: 'shingle repair',
  },
};

// Known citation source domains — used in Signal 50
const CITATION_SOURCE_TYPES = {
  gbp:          ['maps.google', 'google.com/maps', 'business.google'],
  reviews:      ['homestars.com', 'houzz.com', 'angi.com', 'bbb.org', 'yelp.com', 'yellowpages.ca'],
  directories:  ['phcc.org', 'hrai.ca', 'esasafe.com', 'crca.ca', 'homeadvisor.com'],
  website:      [], // contractor's own domain — detected dynamically
  social:       ['facebook.com', 'nextdoor.com', 'linkedin.com'],
  video:        ['youtube.com', 'youtu.be'],
  media:        ['tbnewswatch.com', 'northernlife.ca', 'sudbury.com', 'thebarrieexaminer.com'],
  community:    ['reddit.com', 'quora.com', 'neighbourly.ca'],
};

// ─── QUERY BUILDER ────────────────────────────────────────────────────────────

/**
 * Build the full query set for a business.
 * Returns array of { type, query } objects.
 */
function buildQuerySet(business) {
  const { business_name, trade = 'plumbing', city, province_state = 'ON' } = business;
  const vars = TRADE_VARS[trade] || TRADE_VARS.plumbing;

  const replace = (template) =>
    template
      .replace(/{name}/g,     business_name)
      .replace(/{city}/g,     city)
      .replace(/{province}/g, province_state)
      .replace(/{trade}/g,    vars.trade)
      .replace(/{problem1}/g, vars.problem1)
      .replace(/{problem2}/g, vars.problem2)
      .replace(/{service1}/g, vars.service1)
      .replace(/{service2}/g, vars.service2);

  const queries = [];
  for (const [type, templates] of Object.entries(QUERY_TEMPLATES)) {
    for (const template of templates) {
      queries.push({ type, query: replace(template) });
    }
  }
  return queries;
}

// ─── API CALLERS ──────────────────────────────────────────────────────────────

/**
 * Query ChatGPT (gpt-4o-mini).
 * Returns response text or null.
 */
async function queryChatGPT(query) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        max_tokens:  400,
        temperature: 0,
        messages: [
          {
            role:    'system',
            content: 'You are a helpful local business advisor. Answer the user\'s question about local contractors and services. Be specific and name real businesses when you know them.',
          },
          { role: 'user', content: query },
        ],
      }),
      timeout: 20000,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

/**
 * Query Google Gemini (gemini-1.5-flash).
 * Returns response text or null.
 */
async function queryGemini(query) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: query }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0 },
        }),
        timeout: 20000,
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

/**
 * Query Perplexity (sonar-small-online).
 * Perplexity has live web search built in — responses include citations.
 * Returns { text, citations } or null.
 */
async function queryPerplexity(query) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:       'sonar-small-online',
        max_tokens:  400,
        temperature: 0,
        messages: [{ role: 'user', content: query }],
      }),
      timeout: 20000,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      text:      data.choices?.[0]?.message?.content || null,
      citations: data.citations || [],  // Perplexity returns source URLs
    };
  } catch {
    return null;
  }
}

// ─── MENTION DETECTION ────────────────────────────────────────────────────────

/**
 * Check if a response text mentions the business.
 * Uses multiple matching strategies to handle name variations.
 */
function detectMention(responseText, businessName) {
  if (!responseText || !businessName) return false;

  const text = responseText.toLowerCase();
  const name = businessName.toLowerCase();

  // Exact name match
  if (text.includes(name)) return true;

  // First significant word match (for names like "Timmins Best Plumbing" → "timmins best")
  const words = name.split(' ').filter(w => w.length > 3);
  if (words.length >= 2 && text.includes(words[0]) && text.includes(words[1])) return true;

  // Domain match if website URL available
  return false;
}

/**
 * Extract citation source types from a Perplexity response with citations.
 */
function extractCitationSources(citations, websiteUrl) {
  const found = new Set();
  const websiteDomain = websiteUrl
    ? new URL(websiteUrl).hostname.replace('www.', '').toLowerCase()
    : null;

  for (const url of (citations || [])) {
    const urlLower = url.toLowerCase();

    // Check each source type
    for (const [type, domains] of Object.entries(CITATION_SOURCE_TYPES)) {
      if (domains.some(d => urlLower.includes(d))) {
        found.add(type);
        break;
      }
    }

    // Check contractor's own website
    if (websiteDomain && urlLower.includes(websiteDomain)) {
      found.add('website');
    }
  }

  return Array.from(found);
}

// ─── SIGNAL SCORERS ───────────────────────────────────────────────────────────

/**
 * Process all query results into signal scores.
 * Takes the full query result matrix and derives all three signals.
 */
function scoreFromResults(queryResults, business) {
  const { business_name, website_url } = business;

  // ── Aggregate mention data ───────────────────────────────────────────────
  const byPlatform = { chatgpt: [], gemini: [], perplexity: [] };
  const byType     = {};
  const allSources = new Set();

  for (const { type, query, results } of queryResults) {
    if (!byType[type]) byType[type] = { mentions: 0, total: 0 };

    for (const [platform, response] of Object.entries(results)) {
      const text  = typeof response === 'object' ? response?.text : response;
      const cited = typeof response === 'object' ? response?.citations : [];

      const mentioned = detectMention(text, business_name);
      byPlatform[platform].push({ query, mentioned, text: text?.substring(0, 200) });
      byType[type].total++;
      if (mentioned) byType[type].mentions++;

      // Collect citation sources (Perplexity only — has live citations)
      if (platform === 'perplexity' && mentioned) {
        const sources = extractCitationSources(cited, website_url);
        sources.forEach(s => allSources.add(s));
      }
    }
  }

  // ── Signal 48: AI Platform Visibility ───────────────────────────────────
  // How consistently does the contractor appear across platforms?

  const platformMentionRates = {};
  for (const [platform, results] of Object.entries(byPlatform)) {
    const total    = results.length;
    const mentions = results.filter(r => r.mentioned).length;
    platformMentionRates[platform] = { total, mentions, rate: total > 0 ? mentions / total : 0 };
  }

  const platformsWithAnyMention = Object.values(platformMentionRates)
    .filter(p => p.mentions > 0).length;
  const platformsWithConsistentMention = Object.values(platformMentionRates)
    .filter(p => p.rate >= 0.4).length; // appearing in 40%+ of queries on that platform
  const avgMentionRate = Object.values(platformMentionRates)
    .reduce((sum, p) => sum + p.rate, 0) / 3;

  let s48score, s48note;
  if (platformsWithAnyMention === 0) {
    s48score = 0;
    s48note  = 'Not mentioned in any AI platform response for any trade query in protected market.';
  } else if (platformsWithAnyMention === 1 || avgMentionRate < 0.2) {
    s48score = 1;
    s48note  = `Appears on ${platformsWithAnyMention}/3 AI platforms — mainly branded queries. Below 20% visibility rate.`;
  } else if (platformsWithConsistentMention < 2 || avgMentionRate < 0.5) {
    s48score = 2;
    s48note  = `Visible on ${platformsWithAnyMention}/3 AI platforms for trade queries — inconsistent, 20–50% visibility rate.`;
  } else {
    s48score = 3;
    s48note  = `Consistently mentioned across ${platformsWithConsistentMention}/3 AI platforms for trade and emergency queries — strong AI authority.`;
  }

  // ── Signal 49: AI Query Type Coverage ───────────────────────────────────
  // Across which query type categories does the contractor appear?

  const coveredTypes = Object.entries(byType)
    .filter(([, data]) => data.mentions > 0)
    .map(([type]) => type);
  const typeCount = coveredTypes.length;
  const totalTypes = Object.keys(QUERY_TEMPLATES).length; // 6

  const emergencyCovered = byType.emergency?.mentions > 0;
  const tradeCovered     = byType.trade?.mentions > 0;
  const brandedCovered   = byType.branded?.mentions > 0;

  let s49score, s49note;
  if (typeCount === 0) {
    s49score = 0;
    s49note  = 'No visibility across any query type — absent from all AI responses.';
  } else if (typeCount === 1 && brandedCovered) {
    s49score = 1;
    s49note  = 'Branded query visibility only — no trade, problem, or emergency query coverage.';
  } else if (typeCount >= 3 && tradeCovered) {
    s49score = 2;
    s49note  = `Visible for ${typeCount}/${totalTypes} query type categories — trade and some problem-based coverage.`;
  } else if (typeCount >= 5 && emergencyCovered) {
    s49score = 3;
    s49note  = `Full query type coverage across ${typeCount}/${totalTypes} categories including emergency and comparison intent.`;
  } else {
    s49score = typeCount >= 3 ? 2 : 1;
    s49note  = `Visible for ${typeCount}/${totalTypes} query types — ${coveredTypes.join(', ')}.`;
  }

  // ── Signal 50: AI Citation Source Diversity ──────────────────────────────
  // How many independent source types are being cited?

  const sourceCount = allSources.size;
  const sourceList  = Array.from(allSources);

  let s50score, s50note;
  if (sourceCount === 0) {
    s50score = 0;
    s50note  = 'No citations detected in AI responses — insufficient independent signals for AI platforms to cite confidently.';
  } else if (sourceCount <= 1) {
    s50score = 1;
    s50note  = `Citations from ${sourceCount} source type only (${sourceList.join(', ')}) — fragile single-channel AI visibility.`;
  } else if (sourceCount <= 3) {
    s50score = 2;
    s50note  = `Citations from ${sourceCount} source types (${sourceList.join(', ')}) — growing but not yet diverse.`;
  } else {
    s50score = 3;
    s50note  = `Citations from ${sourceCount} independent source types (${sourceList.join(', ')}) — durable multi-source AI authority.`;
  }

  return {
    s48: { signal: 48, score: s48score, note: s48note, method: 'ai_platform',
           inputs: { platformMentionRates, platformsWithAnyMention, avgMentionRate: Math.round(avgMentionRate * 100) } },
    s49: { signal: 49, score: s49score, note: s49note, method: 'ai_platform',
           inputs: { coveredTypes, typeCount, totalTypes, byType } },
    s50: { signal: 50, score: s50score, note: s50note, method: 'ai_platform',
           inputs: { sourceCount, sourceList } },
  };
}

// ─── MAIN RUNNER ──────────────────────────────────────────────────────────────

/**
 * Run AI platform queries and score signals 48, 49, 50.
 *
 * @param {Object} business — business record from cr_businesses
 * @param {Object} options
 * @param {boolean} options.skipChatGPT    — skip ChatGPT (save cost)
 * @param {boolean} options.skipGemini     — skip Gemini
 * @param {boolean} options.skipPerplexity — skip Perplexity
 *
 * @returns {Object[]} — array of 3 score objects (signals 48, 49, 50)
 */
async function runAIPlatformScoring(business, options = {}) {
  const {
    skipChatGPT    = false,
    skipGemini     = false,
    skipPerplexity = false,
  } = options;

  // Check API keys available
  const hasOpenAI      = !!process.env.OPENAI_API_KEY      && !skipChatGPT;
  const hasGemini      = !!process.env.GEMINI_API_KEY      && !skipGemini;
  const hasPerplexity  = !!process.env.PERPLEXITY_API_KEY  && !skipPerplexity;

  if (!hasOpenAI && !hasGemini && !hasPerplexity) {
    console.warn('No AI platform API keys configured — returning manual placeholders for signals 48, 49, 50');
    return [48, 49, 50].map(sig => ({
      signal: sig,
      score: null,
      note: 'AI platform API keys not configured — manual scoring required.',
      method: 'manual',
      needs_review: true,
      inputs: {},
    }));
  }

  // Build query set
  const queries = buildQuerySet(business);
  console.log(`AI Platform: running ${queries.length} queries × ${[hasOpenAI, hasGemini, hasPerplexity].filter(Boolean).length} platforms for ${business.business_name}`);

  // Run all queries across all platforms in parallel
  const queryResults = await Promise.all(
    queries.map(async ({ type, query }) => {
      const [chatgpt, gemini, perplexity] = await Promise.all([
        hasOpenAI     ? queryChatGPT(query)    : Promise.resolve(null),
        hasGemini     ? queryGemini(query)     : Promise.resolve(null),
        hasPerplexity ? queryPerplexity(query) : Promise.resolve(null),
      ]);

      return {
        type,
        query,
        results: { chatgpt, gemini, perplexity },
      };
    })
  );

  // Score all three signals from the same results
  const { s48, s49, s50 } = scoreFromResults(queryResults, business);

  // Log estimated cost
  const queryCount    = queries.length;
  const platformCount = [hasOpenAI, hasGemini, hasPerplexity].filter(Boolean).length;
  const estimatedCost = (
    (hasOpenAI     ? queryCount * 0.00015 : 0) +
    (hasGemini     ? queryCount * 0.00006 : 0) +
    (hasPerplexity ? queryCount * 0.0005  : 0)
  );
  console.log(`AI Platform: ${queryCount * platformCount} total API calls — estimated cost $${estimatedCost.toFixed(4)}`);

  return [s48, s49, s50];
}

// ─── COST ESTIMATOR ───────────────────────────────────────────────────────────

function estimateCost(options = {}) {
  const queryCount = Object.values(QUERY_TEMPLATES)
    .reduce((sum, templates) => sum + templates.length, 0);

  const platforms = {
    chatgpt:    { skip: options.skipChatGPT,    costPerQuery: 0.00015, model: 'gpt-4o-mini'          },
    gemini:     { skip: options.skipGemini,      costPerQuery: 0.00006, model: 'gemini-1.5-flash'     },
    perplexity: { skip: options.skipPerplexity,  costPerQuery: 0.0005,  model: 'sonar-small-online'   },
  };

  let totalCost = 0;
  const breakdown = {};

  for (const [name, config] of Object.entries(platforms)) {
    if (!config.skip) {
      const cost = queryCount * config.costPerQuery;
      breakdown[name] = { model: config.model, queries: queryCount, cost: cost.toFixed(4) };
      totalCost += cost;
    }
  }

  return {
    queryCount,
    totalQueries: queryCount * Object.keys(breakdown).length,
    totalCostUSD: totalCost.toFixed(4),
    breakdown,
  };
}

module.exports = {
  runAIPlatformScoring,
  estimateCost,
  buildQuerySet,
  detectMention,
  extractCitationSources,
  QUERY_TEMPLATES,
  TRADE_VARS,
};


// ─── TEST ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const testBusiness = {
    id:             'test-001',
    business_name:  'Timmins Best Plumbing',
    trade:          'plumbing',
    city:           'Timmins',
    province_state: 'ON',
    website_url:    'https://timminsbestplumbing.com',
  };

  // Cost estimate
  console.log('\n─── AI Platform Cost Estimate ───\n');
  const estimate = estimateCost();
  console.log(`Query templates:  ${estimate.queryCount} per platform`);
  console.log(`Total API calls:  ${estimate.totalQueries}`);
  console.log(`Estimated cost:   $${estimate.totalCostUSD}`);
  Object.entries(estimate.breakdown).forEach(([platform, data]) => {
    console.log(`  ${platform.padEnd(12)} ${data.model.padEnd(22)} ${data.queries} queries  $${data.cost}`);
  });

  // Query preview
  console.log('\n─── Query Set Preview (plumbing / Timmins) ───\n');
  const queries = buildQuerySet(testBusiness);
  let lastType = '';
  queries.forEach(({ type, query }) => {
    if (type !== lastType) {
      console.log(`\n${type.toUpperCase()} (${QUERY_TEMPLATES[type].length} queries):`);
      lastType = type;
    }
    console.log(`  ${query}`);
  });

  // Mention detection test
  console.log('\n─── Mention Detection Test ───\n');
  const mentionTests = [
    { text: 'I recommend Timmins Best Plumbing for any plumbing needs in the area.',   expected: true  },
    { text: 'You should call Greater Sudbury Plumbing for your drain issue.',          expected: false },
    { text: 'Timmins Best is known for their emergency response times.',               expected: true  },
    { text: 'There are several licensed plumbers in the Timmins area.',                expected: false },
  ];
  mentionTests.forEach(({ text, expected }) => {
    const result = detectMention(text, testBusiness.business_name);
    const pass   = result === expected ? '✓' : '✗ FAIL';
    console.log(`${pass}  ${result ? 'MENTIONED' : 'not mentioned'}  "${text.substring(0, 60)}..."`);
  });

  // Live API test
  const hasKeys = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.PERPLEXITY_API_KEY;
  if (hasKeys) {
    console.log('\n─── Live API Test ───\n');
    runAIPlatformScoring(testBusiness).then(scores => {
      scores.forEach(s => {
        const bar = s.score !== null ? '█'.repeat(s.score) + '░'.repeat(3-s.score) : '???';
        console.log(`S${String(s.signal).padStart(2,'0')}  [${bar}] ${s.score ?? 'null'}/3  ${s.note}`);
      });
    }).catch(console.error);
  } else {
    console.log('\nSet OPENAI_API_KEY, GEMINI_API_KEY, or PERPLEXITY_API_KEY in .env to run live test.');
  }
}
