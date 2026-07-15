/**
 * ContentRadar — Smart Page Fetcher
 * 
 * Purpose: Discovers, classifies, and fetches the right pages from a
 * contractor website so that each signal group gets the content it needs.
 * 
 * The basic fetcher (fetch homepage → strip HTML → send to Claude) misses
 * content on interior pages — credentials on /about, pricing on /services,
 * FAQs on /faq, galleries on /portfolio. This script fixes that.
 * 
 * Output: A structured content object with labelled sections, ready to be
 * passed to Claude signal scorers.
 * 
 * Usage:
 *   const { fetchContractorContent } = require('./pageFetcher');
 *   const content = await fetchContractorContent('https://example.com');
 *   // content.homepage, content.about, content.services, content.contact etc.
 * 
 * Dependencies: node-fetch (npm install node-fetch@2)
 */

const fetch = require('node-fetch');

// ─── CONFIGURATION ───────────────────────────────────────────────────────────

const CONFIG = {
  timeoutMs: 12000,          // Per-page timeout in milliseconds
  maxPagesPerType: 2,        // Maximum pages to fetch per category type
  maxCharsPerPage: 6000,     // Max characters extracted per page
  maxCharsPerSection: 8000,  // Max characters in final assembled section
  userAgent: 'Mozilla/5.0 (compatible; ContentRadar/1.0; +https://clearskysoftware.net)',
};

// ─── PAGE TYPE CLASSIFICATION ─────────────────────────────────────────────────
// Keywords in URLs that indicate which page type this is.
// Order matters — first match wins.

const PAGE_CLASSIFIERS = [
  {
    type: 'about',
    signals: [1, 2, 3, 4, 9],   // value prop, brand promise, people, process, credentials
    patterns: [
      /\/about/i, /\/our-team/i, /\/meet-the/i, /\/who-we-are/i,
      /\/our-story/i, /\/company/i, /\/team/i, /\/staff/i,
      /\/owner/i, /\/founders/i, /\/history/i
    ],
    priority: 1,
  },
  {
    type: 'services',
    signals: [5, 7, 8, 10],    // service area, blog/content, FAQ, pricing
    patterns: [
      /\/services/i, /\/what-we-do/i, /\/plumbing/i, /\/hvac/i,
      /\/electrical/i, /\/roofing/i, /\/heating/i, /\/cooling/i,
      /\/drain/i, /\/pipe/i, /\/furnace/i, /\/air-condition/i,
      /\/emergency/i, /\/repair/i, /\/installation/i, /\/maintenance/i,
      /\/residential/i, /\/commercial/i
    ],
    priority: 2,
  },
  {
    type: 'contact',
    signals: [55, 56, 57, 58, 59],  // click-to-call, emergency pathway, quote, after-hours, response time
    patterns: [
      /\/contact/i, /\/get-a-quote/i, /\/quote/i, /\/book/i,
      /\/schedule/i, /\/appointment/i, /\/reach-us/i, /\/call/i,
      /\/get-in-touch/i, /\/free-estimate/i, /\/estimate/i,
      /\/request/i, /\/hire/i
    ],
    priority: 1,
  },
  {
    type: 'faq',
    signals: [8],    // FAQ coverage
    patterns: [
      /\/faq/i, /\/faqs/i, /\/frequently-asked/i, /\/questions/i,
      /\/help/i, /\/support/i, /\/answers/i, /\/knowledge/i
    ],
    priority: 2,
  },
  {
    type: 'gallery',
    signals: [6],    // before/after gallery
    patterns: [
      /\/gallery/i, /\/portfolio/i, /\/projects/i, /\/our-work/i,
      /\/before-after/i, /\/photos/i, /\/work/i, /\/showcase/i,
      /\/examples/i, /\/case-studies/i
    ],
    priority: 3,
  },
  {
    type: 'blog',
    signals: [7],    // blog & educational content
    patterns: [
      /\/blog/i, /\/news/i, /\/articles/i, /\/tips/i, /\/resources/i,
      /\/learn/i, /\/education/i, /\/guides/i, /\/how-to/i,
      /\/advice/i, /\/insights/i
    ],
    priority: 3,
  },
  {
    type: 'service_area',
    signals: [5, 41, 43],  // service area clarity, content coverage, geo visibility
    patterns: [
      /\/service-area/i, /\/areas-we-serve/i, /\/coverage/i,
      /\/locations/i, /\/cities/i, /\/communities/i, /\/where-we-serve/i,
      /\/serving/i, /\/(timmins|sudbury|cochrane|kapuskasing|kirkland)/i
    ],
    priority: 2,
  },
  {
    type: 'process',
    signals: [4],    // process transparency
    patterns: [
      /\/process/i, /\/how-it-works/i, /\/our-process/i, /\/what-to-expect/i,
      /\/steps/i, /\/how-we-work/i, /\/approach/i
    ],
    priority: 2,
  },
  {
    type: 'pricing',
    signals: [10],   // pricing transparency
    patterns: [
      /\/pricing/i, /\/rates/i, /\/cost/i, /\/price/i,
      /\/fees/i, /\/how-much/i, /\/afford/i
    ],
    priority: 2,
  },
];

// ─── HTML CONTENT EXTRACTOR ───────────────────────────────────────────────────

/**
 * Extracts meaningful text from raw HTML.
 * Removes scripts, styles, nav, footer boilerplate.
 * Preserves heading structure as context signals for Claude.
 */
function extractText(html, maxChars = CONFIG.maxCharsPerPage) {
  if (!html || typeof html !== 'string') return '';

  let text = html
    // Remove script and style blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // Remove nav and footer — usually boilerplate, not content
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    // Convert headings to plain text with marker so Claude knows they're headings
    .replace(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi, ' ## $1 ## ')
    // Convert list items to lines
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    // Convert paragraphs and divs to line breaks
    .replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n')
    // Strip all remaining HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text.substring(0, maxChars);
}

// ─── LINK DISCOVERER ──────────────────────────────────────────────────────────

/**
 * Discovers all internal links from a homepage HTML string.
 * Returns an array of absolute URLs that belong to the same domain.
 */
function discoverInternalLinks(html, baseUrl) {
  const links = new Set();

  try {
    const base = new URL(baseUrl);
    const hrefPattern = /href=["']([^"'#?]+)/gi;
    let match;

    while ((match = hrefPattern.exec(html)) !== null) {
      const href = match[1].trim();
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') ||
          href.startsWith('javascript:') || href.endsWith('.pdf') ||
          href.endsWith('.jpg') || href.endsWith('.png') || href.endsWith('.webp')) {
        continue;
      }

      try {
        const resolved = new URL(href, base);
        // Only include same-domain links
        if (resolved.hostname === base.hostname) {
          // Clean the URL — remove query strings and fragments
          resolved.search = '';
          resolved.hash = '';
          const clean = resolved.toString().replace(/\/$/, ''); // remove trailing slash
          if (clean !== base.toString().replace(/\/$/, '')) {
            links.add(clean);
          }
        }
      } catch (e) {
        // Malformed URL — skip
      }
    }
  } catch (e) {
    // Malformed base URL — return empty
  }

  return Array.from(links);
}

// ─── PAGE CLASSIFIER ──────────────────────────────────────────────────────────

/**
 * Classifies a URL into a page type based on the URL pattern.
 * Returns the matching PAGE_CLASSIFIERS entry or null.
 */
function classifyUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    // Sort classifiers by priority (lower = higher priority)
    const sorted = [...PAGE_CLASSIFIERS].sort((a, b) => a.priority - b.priority);
    for (const classifier of sorted) {
      for (const pattern of classifier.patterns) {
        if (pattern.test(pathname)) {
          return classifier;
        }
      }
    }
  } catch (e) {}
  return null;
}

// ─── SINGLE PAGE FETCHER ──────────────────────────────────────────────────────

/**
 * Fetches a single URL with timeout and returns extracted text.
 * Returns empty string on any failure — never throws.
 */
async function fetchPage(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-CA,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);

    if (!response.ok) return { html: '', text: '', status: response.status };

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return { html: '', text: '', status: 200 };

    const html = await response.text();
    const text = extractText(html);
    return { html, text, status: 200 };

  } catch (e) {
    return { html: '', text: '', status: 0, error: e.message };
  }
}

// ─── MAIN EXPORT: fetchContractorContent ─────────────────────────────────────

/**
 * Master function. Given a contractor's homepage URL, discovers all
 * internal links, classifies them into page types, fetches the most
 * relevant pages for each type, and returns a structured content object.
 *
 * @param {string} websiteUrl - The contractor's homepage URL (must include https://)
 * @returns {Object} content - Structured content object with these sections:
 *   content.homepage     — Homepage text (always present)
 *   content.about        — About/team/company page text
 *   content.services     — Services page(s) text
 *   content.contact      — Contact/quote/booking page text
 *   content.faq          — FAQ page text
 *   content.gallery      — Gallery/portfolio page text
 *   content.blog         — Blog/articles page text (first page)
 *   content.service_area — Service area page text
 *   content.process      — Process/how-it-works page text
 *   content.pricing      — Pricing page text
 *   content.combined     — All content concatenated with section labels (for Claude)
 *   content.pagesFound   — Map of type → URLs discovered
 *   content.pagesFetched — Map of type → URLs actually fetched
 *   content.fetchErrors  — Any pages that failed with their error
 *   content.meta         — Timing and summary stats
 */
async function fetchContractorContent(websiteUrl) {
  const startTime = Date.now();

  // Normalise the URL
  let baseUrl = websiteUrl.trim();
  if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

  const result = {
    homepage: '',
    about: '',
    services: '',
    contact: '',
    faq: '',
    gallery: '',
    blog: '',
    service_area: '',
    process: '',
    pricing: '',
    combined: '',
    pagesFound: {},
    pagesFetched: {},
    fetchErrors: [],
    meta: {
      baseUrl,
      fetchDurationMs: 0,
      totalPages: 0,
      totalChars: 0,
    },
  };

  // ── Step 1: Fetch homepage ────────────────────────────────────────────────
  const homeFetch = await fetchPage(baseUrl);
  result.homepage = homeFetch.text;

  if (!result.homepage) {
    // If homepage fails, nothing else will work — return immediately
    result.meta.fetchDurationMs = Date.now() - startTime;
    result.fetchErrors.push({ url: baseUrl, error: homeFetch.error || `HTTP ${homeFetch.status}` });
    return result;
  }

  // ── Step 2: Discover all internal links ──────────────────────────────────
  const allLinks = discoverInternalLinks(homeFetch.html, baseUrl);

  // ── Step 3: Classify links into page types ───────────────────────────────
  const classified = {};    // type → [url, url, ...]

  for (const link of allLinks) {
    const classifier = classifyUrl(link);
    if (classifier) {
      if (!classified[classifier.type]) classified[classifier.type] = [];
      if (classified[classifier.type].length < CONFIG.maxPagesPerType) {
        classified[classifier.type].push(link);
      }
    }
  }

  result.pagesFound = classified;

  // ── Step 4: Fetch all classified pages in parallel ───────────────────────
  const fetchTasks = [];

  for (const [type, urls] of Object.entries(classified)) {
    for (const url of urls) {
      fetchTasks.push(
        fetchPage(url).then(fetched => ({ type, url, ...fetched }))
      );
    }
  }

  const fetched = await Promise.all(fetchTasks);

  // ── Step 5: Assemble content by type ─────────────────────────────────────
  const typeText = {};  // type → concatenated text

  for (const page of fetched) {
    if (page.error || !page.text) {
      result.fetchErrors.push({ url: page.url, error: page.error || `HTTP ${page.status}` });
      continue;
    }

    if (!result.pagesFetched[page.type]) result.pagesFetched[page.type] = [];
    result.pagesFetched[page.type].push(page.url);

    if (!typeText[page.type]) typeText[page.type] = '';
    typeText[page.type] += '\n\n' + page.text;
  }

  // ── Step 6: Trim each section and write to result ─────────────────────────
  for (const type of Object.keys(typeText)) {
    result[type] = typeText[type].trim().substring(0, CONFIG.maxCharsPerSection);
  }

  // ── Step 7: Build combined content with section labels ────────────────────
  // This is what gets passed to Claude when a signal needs full-site context
  const sections = [
    { key: 'homepage',     label: 'HOMEPAGE' },
    { key: 'about',        label: 'ABOUT / TEAM' },
    { key: 'services',     label: 'SERVICES' },
    { key: 'process',      label: 'PROCESS / HOW IT WORKS' },
    { key: 'pricing',      label: 'PRICING' },
    { key: 'faq',          label: 'FAQ' },
    { key: 'gallery',      label: 'GALLERY / PORTFOLIO' },
    { key: 'contact',      label: 'CONTACT / QUOTE / BOOKING' },
    { key: 'service_area', label: 'SERVICE AREA' },
    { key: 'blog',         label: 'BLOG / RESOURCES' },
  ];

  let combined = '';
  let totalChars = result.homepage.length;

  for (const { key, label } of sections) {
    if (result[key]) {
      combined += `\n\n=== ${label} ===\n${result[key]}`;
      totalChars += result[key].length;
    }
  }

  // Cap combined at a reasonable total for full-site Claude calls
  result.combined = combined.trim().substring(0, 24000);

  // ── Step 8: Meta stats ────────────────────────────────────────────────────
  result.meta.fetchDurationMs = Date.now() - startTime;
  result.meta.totalPages = 1 + fetched.filter(f => f.text).length;
  result.meta.totalChars = totalChars;

  return result;
}

// ─── CONTENT SELECTOR ────────────────────────────────────────────────────────

/**
 * Returns the most relevant content section(s) for a given signal number.
 * Use this in the signal pipeline to pass the right content to Claude
 * rather than always passing the entire combined blob.
 *
 * @param {Object} content - Result from fetchContractorContent()
 * @param {number} signalNum - Signal number (1–72)
 * @returns {string} - The most relevant content for this signal
 */
function getContentForSignal(content, signalNum) {
  // Signal → which content sections are most relevant
  const signalContentMap = {
    // Website — Discovery
    1:  ['homepage', 'about'],           // Value proposition clarity
    2:  ['homepage', 'about'],           // Brand promise
    3:  ['about', 'homepage'],           // People & credibility
    4:  ['process', 'about', 'services'], // Process transparency
    5:  ['service_area', 'homepage', 'contact'], // Service area clarity
    // Website — Engagement
    6:  ['gallery', 'homepage'],         // Before/after gallery
    7:  ['blog', 'homepage'],            // Blog & educational content
    8:  ['faq', 'services', 'homepage'], // FAQ coverage
    9:  ['about', 'homepage'],           // Credentials & licensing
    // Website — Conversion
    10: ['pricing', 'services', 'homepage'], // Pricing transparency
    // Contact Friction
    55: ['homepage', 'contact'],         // Click-to-call above fold
    56: ['homepage', 'contact', 'services'], // Emergency pathway
    57: ['contact', 'homepage'],         // Quote/booking friction
    58: ['homepage', 'contact'],         // After-hours availability
    59: ['homepage', 'contact'],         // Response time commitment
    60: ['homepage'],                    // Mobile experience (uses PageSpeed API — minimal text needed)
  };

  const sections = signalContentMap[signalNum];
  if (!sections) return content.combined; // Default to full content

  // Build content from the specified sections in order
  let assembled = '';
  for (const section of sections) {
    if (content[section]) {
      const label = section.toUpperCase().replace('_', ' ');
      assembled += `\n\n=== ${label} ===\n${content[section]}`;
    }
  }

  // Fall back to homepage if nothing found
  if (!assembled.trim() && content.homepage) {
    assembled = `\n\n=== HOMEPAGE ===\n${content.homepage}`;
  }

  return assembled.trim().substring(0, 8000);
}

// ─── DIAGNOSTIC HELPER ────────────────────────────────────────────────────────

/**
 * Prints a summary of what was fetched — useful for debugging.
 */
function logFetchSummary(content) {
  console.log('\n─── ContentRadar Page Fetch Summary ───');
  console.log(`URL:          ${content.meta.baseUrl}`);
  console.log(`Duration:     ${content.meta.fetchDurationMs}ms`);
  console.log(`Pages:        ${content.meta.totalPages}`);
  console.log(`Total chars:  ${content.meta.totalChars.toLocaleString()}`);
  console.log(`Homepage:     ${content.homepage.length} chars`);

  const types = ['about', 'services', 'contact', 'faq', 'gallery', 'blog', 'service_area', 'process', 'pricing'];
  for (const type of types) {
    if (content[type]) {
      console.log(`${type.padEnd(14)}: ${content[type].length} chars — ${(content.pagesFetched[type] || []).join(', ')}`);
    } else if (content.pagesFound[type]) {
      console.log(`${type.padEnd(14)}: FOUND but empty — ${(content.pagesFound[type] || []).join(', ')}`);
    } else {
      console.log(`${type.padEnd(14)}: not found`);
    }
  }

  if (content.fetchErrors.length > 0) {
    console.log(`\nFetch errors (${content.fetchErrors.length}):`);
    content.fetchErrors.forEach(e => console.log(`  ${e.url} — ${e.error}`));
  }
  console.log('───────────────────────────────────────\n');
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

module.exports = {
  fetchContractorContent,
  getContentForSignal,
  logFetchSummary,
  fetchPage,            // Exported for unit testing
  extractText,          // Exported for unit testing
  classifyUrl,          // Exported for unit testing
  discoverInternalLinks // Exported for unit testing
};


// ─── QUICK TEST ───────────────────────────────────────────────────────────────
// Run directly: node pageFetcher.js https://example-plumber.com
// Remove this block before production deployment

if (require.main === module) {
  const testUrl = process.argv[2];
  if (!testUrl) {
    console.log('Usage: node pageFetcher.js <website-url>');
    console.log('Example: node pageFetcher.js https://rotorooterofplumbing.com');
    process.exit(1);
  }

  console.log(`\nFetching: ${testUrl}`);
  fetchContractorContent(testUrl)
    .then(content => {
      logFetchSummary(content);
      console.log('\n--- Combined content preview (first 500 chars) ---');
      console.log(content.combined.substring(0, 500));
    })
    .catch(err => console.error('Fatal error:', err));
}
