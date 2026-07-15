/**
 * app/api/trades/route.js
 * ClearSky Software — Session 13
 *
 * Fetches trade + season config from the ClearSky CMS.
 * Falls back to hardcoded TRADES array if the CMS is unreachable,
 * so the intake form never breaks in production.
 *
 * Session 13: keywords array added to each trade in TRADES_FALLBACK.
 * keywords[0] is the primary keyword used for the ValueSERP Layer 2 call.
 * Alternates are stored for future multi-keyword ranking runs.
 * If the CMS is live, add keywords to the CMS trade objects to match this shape.
 *
 * Environment variables required in .env.local:
 *   CLEARSKY_CMS_URL   — base URL of your CMS API
 *                        e.g. https://cms.clearskysoftware.net
 *   CLEARSKY_CMS_KEY   — API key sent in the X-API-Key header
 *                        leave blank or omit if endpoint is open
 *
 * CMS endpoint expected:
 *   GET {CLEARSKY_CMS_URL}/api/trades
 *
 * Expected CMS response shape (array of trade objects):
 * [
 *   {
 *     name: "Plumber",
 *     keywords: ["plumber", "plumbing", "emergency plumber"],
 *     seasons: [
 *       { key: "q1", label: "Q1 — Jan / Feb / Mar" },
 *       { key: "q2", label: "Q2 — Apr / May / Jun" },
 *       { key: "q3", label: "Q3 — Jul / Aug / Sep" },
 *       { key: "q4", label: "Q4 — Oct / Nov / Dec" }
 *     ]
 *   },
 *   ...
 * ]
 */

import { NextResponse } from 'next/server';

// ─── FALLBACK ────────────────────────────────────────────────────────────────
// Used when CMS is unreachable. Keep in sync with CMS content.
// This is the source of truth until the CMS is live.

const TRADES_FALLBACK = [
  {
    name: 'Plumber',
    keywords: ['plumber', 'plumbing', 'emergency plumber', 'drain cleaning', 'water heater'],
    seasons: [
      { key: 'q1', label: 'Q1 — Jan / Feb / Mar' },
      { key: 'q2', label: 'Q2 — Apr / May / Jun' },
      { key: 'q3', label: 'Q3 — Jul / Aug / Sep' },
      { key: 'q4', label: 'Q4 — Oct / Nov / Dec' },
    ],
  },
  {
    name: 'HVAC',
    keywords: ['hvac', 'heating and cooling', 'furnace repair', 'air conditioning', 'hvac contractor'],
    seasons: [
      { key: 'q1', label: 'Q1 — Jan / Feb / Mar' },
      { key: 'q2', label: 'Q2 — Apr / May / Jun' },
      { key: 'q3', label: 'Q3 — Jul / Aug / Sep' },
      { key: 'q4', label: 'Q4 — Oct / Nov / Dec' },
    ],
  },
  {
    name: 'Electrician',
    keywords: ['electrician', 'electrical contractor', 'electrical repair', 'panel upgrade', 'licensed electrician'],
    seasons: [
      { key: 'q1', label: 'Q1 — Jan / Feb / Mar' },
      { key: 'q2', label: 'Q2 — Apr / May / Jun' },
      { key: 'q3', label: 'Q3 — Jul / Aug / Sep' },
      { key: 'q4', label: 'Q4 — Oct / Nov / Dec' },
    ],
  },
  {
    name: 'Roofer',
    keywords: ['roofer', 'roofing contractor', 'roof repair', 'roof replacement', 'roofing company'],
    seasons: [
      { key: 's1', label: 'Spring — Apr / May' },
      { key: 's2', label: 'Summer — Jun / Jul / Aug' },
      { key: 's3', label: 'Fall — Sep / Oct' },
    ],
  },
  {
    name: 'Landscaper',
    keywords: ['landscaper', 'landscaping', 'lawn care', 'landscape contractor', 'yard maintenance'],
    seasons: [
      { key: 's1', label: 'Spring — Apr / May' },
      { key: 's2', label: 'Summer — Jun / Jul / Aug' },
    ],
  },
  {
    name: 'Snow Removal',
    keywords: ['snow removal', 'snow plowing', 'snow clearing', 'winter maintenance', 'snow contractor'],
    seasons: [
      { key: 's1', label: 'Winter — Nov / Dec / Jan / Feb / Mar' },
    ],
  },
];

// ─── CMS FETCH ───────────────────────────────────────────────────────────────

async function fetchFromCMS() {
  const cmsUrl = process.env.CLEARSKY_CMS_URL;
  const cmsKey = process.env.CLEARSKY_CMS_KEY;

  // If CMS URL is not configured, skip fetch and use fallback
  if (!cmsUrl) {
    console.warn('[trades] CLEARSKY_CMS_URL not set — using fallback trades list');
    return null;
  }

  const endpoint = `${cmsUrl}/api/trades`;

  const headers = {
    'Content-Type': 'application/json',
    ...(cmsKey ? { 'X-API-Key': cmsKey } : {}),
  };

  const response = await fetch(endpoint, {
    headers,
    // Revalidate every 5 minutes — trades config changes rarely
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `CMS returned ${response.status} ${response.statusText} from ${endpoint}`
    );
  }

  const data = await response.json();

  // Validate shape — must be an array with at least one trade
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`CMS response from ${endpoint} is not a valid trades array`);
  }

  return data;
}

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    const trades = await fetchFromCMS();

    if (trades) {
      console.log(`[trades] Loaded ${trades.length} trades from CMS`);
      return NextResponse.json(trades);
    }

    // CMS URL not configured — serve fallback silently
    return NextResponse.json(TRADES_FALLBACK);

  } catch (err) {
    // CMS unreachable or returned bad data — serve fallback and log the error
    // The intake form continues working. Do not surface the error to the frontend.
    console.error('[trades] CMS fetch failed — serving fallback:', err.message);
    return NextResponse.json(TRADES_FALLBACK);
  }
}
