-- ============================================================
-- ContentRadar — PostgreSQL Schema
-- ClearSky Software · May 2026 · Confidential
--
-- Integrates into the existing ClearSky Node.js/Express backend.
-- All tables prefixed cr_ to avoid collision with existing tables.
--
-- Three consumers:
--   1. Scoring pipeline  — writes businesses, snapshots, scores, runs
--   2. ClearSky diagnostic — reads cr_signal_scores + cr_benchmark_averages
--   3. Client reports     — reads cr_signal_scores + cr_benchmark_averages
--                           + cr_businesses for cohort comparisons
--
-- Run order:
--   1. Extensions
--   2. ENUMs
--   3. Core tables (no foreign keys)
--   4. Tables with foreign keys
--   5. Indexes
--   6. Views
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- trigram search on business names


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE cr_trade AS ENUM (
  'plumbing',
  'hvac',
  'electrical',
  'roofing'
);

CREATE TYPE cr_cohort AS ENUM (
  'cohort1_benchmark',    -- external signals only — Cohort 1
  'cohort2_licensed'      -- licensed clients — external + A2P
);

CREATE TYPE cr_cohort_tier AS ENUM (
  'top10_aspirational',   -- top 30 per trade — display only
  'top_third_operational',-- top 100 per trade — used in gap calculation
  'remainder'             -- scored but not in either benchmark tier
);

CREATE TYPE cr_stage AS ENUM (
  'discovery',
  'engagement',
  'conversion',
  'growth'
);

CREATE TYPE cr_score_method AS ENUM (
  'deterministic',        -- Method 1 — formula from API data
  'rules_gate_claude',    -- Method 2 — gate + Claude quality assessment
  'pure_claude',          -- Method 3 — pure Claude judgment
  'manual',               -- Manual entry (referral network, AI authority)
  'a2p_feed'              -- A2P platform live data (licensed clients only)
);

CREATE TYPE cr_run_type AS ENUM (
  'initial_build',        -- First-ever full score of a business
  'pre_rank',             -- Pre-ranking pass (20 signals only)
  'quarterly_hash',       -- Quarterly hash-based refresh
  'annual_full',          -- Annual full re-score regardless of hashes
  'on_demand'             -- Triggered by onboarding or manual request
);

CREATE TYPE cr_gate1_result AS ENUM (
  'passed',
  'flagged',              -- Passed but franchise signal detected — human review
  'eliminated'
);

CREATE TYPE cr_page_type AS ENUM (
  'homepage',
  'about',
  'services',
  'contact',
  'faq',
  'gallery',
  'blog',
  'service_area',
  'process',
  'pricing',
  'other'
);


-- ============================================================
-- TABLE 1: cr_businesses
-- One row per business. Both cohorts live here.
-- ============================================================

CREATE TABLE cr_businesses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  business_name       TEXT NOT NULL,
  trade               cr_trade NOT NULL,
  city                TEXT NOT NULL,
  province_state      TEXT,                    -- e.g. 'ON', 'MN'
  country             CHAR(2) NOT NULL DEFAULT 'CA',
  
  -- Cohort assignment
  cohort              cr_cohort NOT NULL,
  cohort_tier         cr_cohort_tier,          -- Set after Cohort 1 scoring is complete
  
  -- URLs — all optional at entry, populated as discovered
  website_url         TEXT,
  gbp_url             TEXT,
  facebook_url        TEXT,
  nextdoor_url        TEXT,
  youtube_url         TEXT,
  homestars_url       TEXT,
  houzz_url           TEXT,
  angi_url            TEXT,

  -- Business facts
  years_in_business   SMALLINT,               -- Used in tenure-adjusted review benchmark
  years_source        TEXT,                   -- 'gbp' | 'website_text' | 'manual'

  -- Gate 1 result
  gate1_result        cr_gate1_result,
  gate1_reason        TEXT,                   -- Primary reason for elimination or flag
  gate1_run_at        TIMESTAMPTZ,

  -- For licensed clients (Cohort 2)
  clearsky_client_id  TEXT,                   -- Links to ClearSky client record
  protected_market_km SMALLINT DEFAULT 100,   -- Market radius in km
  onboarded_at        TIMESTAMPTZ,

  -- Metadata
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT                    -- Internal notes — manual review comments
);

-- Indexes for scoring pipeline queries
CREATE INDEX idx_cr_businesses_trade        ON cr_businesses (trade);
CREATE INDEX idx_cr_businesses_cohort       ON cr_businesses (cohort);
CREATE INDEX idx_cr_businesses_cohort_tier  ON cr_businesses (cohort_tier);
CREATE INDEX idx_cr_businesses_gate1        ON cr_businesses (gate1_result);
CREATE INDEX idx_cr_businesses_active       ON cr_businesses (is_active);
CREATE INDEX idx_cr_businesses_name_trgm    ON cr_businesses USING GIN (business_name gin_trgm_ops);
-- Diagnostic reads by clearsky_client_id
CREATE INDEX idx_cr_businesses_client       ON cr_businesses (clearsky_client_id)
  WHERE clearsky_client_id IS NOT NULL;


-- ============================================================
-- TABLE 2: cr_page_snapshots
-- One row per page per fetch. The content store.
-- Hash enables quarterly change detection.
-- ============================================================

CREATE TABLE cr_page_snapshots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES cr_businesses (id) ON DELETE CASCADE,

  -- Page identity
  page_type           cr_page_type NOT NULL,
  page_url            TEXT NOT NULL,

  -- Content
  extracted_text      TEXT,                   -- Stripped plain text — what Claude reads
  content_hash        CHAR(64),               -- SHA-256 of extracted_text
  char_count          INTEGER,                -- Length of extracted_text

  -- Fetch metadata
  fetch_status        SMALLINT,               -- HTTP status code (200, 404, 0=timeout)
  fetch_duration_ms   INTEGER,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Run link
  run_id              UUID,                   -- Links to cr_score_runs

  -- Change detection
  hash_changed        BOOLEAN,                -- TRUE if hash differs from previous snapshot
  previous_snapshot_id UUID                  -- Link to prior version of this page
    REFERENCES cr_page_snapshots (id) ON DELETE SET NULL
);

-- Scoring pipeline: fetch latest snapshot per business per page type
CREATE INDEX idx_cr_snapshots_business      ON cr_page_snapshots (business_id);
CREATE INDEX idx_cr_snapshots_type          ON cr_page_snapshots (business_id, page_type);
CREATE INDEX idx_cr_snapshots_hash          ON cr_page_snapshots (content_hash);
CREATE INDEX idx_cr_snapshots_fetched       ON cr_page_snapshots (fetched_at DESC);
CREATE INDEX idx_cr_snapshots_run           ON cr_page_snapshots (run_id);


-- ============================================================
-- TABLE 3: cr_score_runs
-- One row per scoring run. Tracks cost, timing, and change rate.
-- ============================================================

CREATE TABLE cr_score_runs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  run_type            cr_run_type NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  duration_ms         INTEGER,

  -- Scope
  trade_filter        cr_trade,               -- NULL = all trades
  cohort_filter       cr_cohort,              -- NULL = all cohorts

  -- Volume counts
  businesses_in_scope INTEGER DEFAULT 0,
  businesses_scored   INTEGER DEFAULT 0,
  pages_fetched       INTEGER DEFAULT 0,
  pages_changed       INTEGER DEFAULT 0,      -- Hash changed since last run
  pages_skipped       INTEGER DEFAULT 0,      -- Hash unchanged — skipped Claude
  claude_calls_made   INTEGER DEFAULT 0,
  api_errors          INTEGER DEFAULT 0,

  -- Cost tracking
  claude_input_tokens  INTEGER DEFAULT 0,
  claude_output_tokens INTEGER DEFAULT 0,
  estimated_cost_usd   NUMERIC(8,4) DEFAULT 0,

  -- Outcome
  status              TEXT DEFAULT 'running', -- running | completed | failed | partial
  error_log           JSONB,                  -- Any errors encountered
  notes               TEXT
);

CREATE INDEX idx_cr_runs_type       ON cr_score_runs (run_type);
CREATE INDEX idx_cr_runs_started    ON cr_score_runs (started_at DESC);
CREATE INDEX idx_cr_runs_status     ON cr_score_runs (status);


-- ============================================================
-- TABLE 4: cr_signal_scores
-- One row per signal per business per run.
-- This is the primary read table for the diagnostic and reports.
-- ============================================================

CREATE TABLE cr_signal_scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES cr_businesses (id) ON DELETE CASCADE,
  run_id              UUID NOT NULL REFERENCES cr_score_runs (id) ON DELETE CASCADE,

  -- Signal identity
  signal_num          SMALLINT NOT NULL,      -- 1–72
  signal_name         TEXT NOT NULL,          -- Denormalised for query convenience
  category            TEXT NOT NULL,          -- e.g. 'Website', 'Google Business Profile'
  stage               cr_stage,              -- discovery | engagement | conversion | growth
  in_gap_score        BOOLEAN NOT NULL DEFAULT TRUE,

  -- Score
  score               SMALLINT,              -- 0 | 1 | 2 | 3 | NULL (not scored)
  score_note          TEXT,                  -- One-sentence Claude explanation
  score_method        cr_score_method,

  -- Source traceability
  snapshot_id         UUID                   -- Which page snapshot produced this score
    REFERENCES cr_page_snapshots (id) ON DELETE SET NULL,
  api_data            JSONB,                 -- Raw API data used for deterministic scoring
  claude_prompt       TEXT,                  -- Prompt sent to Claude (for audit/debugging)

  -- Timestamps
  scored_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: one score per signal per business per run
  CONSTRAINT uq_signal_score UNIQUE (business_id, run_id, signal_num)
);

-- Diagnostic reads: all signals for one business (most recent run)
CREATE INDEX idx_cr_scores_business     ON cr_signal_scores (business_id);
CREATE INDEX idx_cr_scores_run          ON cr_signal_scores (run_id);
CREATE INDEX idx_cr_scores_signal       ON cr_signal_scores (signal_num);
CREATE INDEX idx_cr_scores_stage        ON cr_signal_scores (stage);
CREATE INDEX idx_cr_scores_gap          ON cr_signal_scores (in_gap_score) WHERE in_gap_score = TRUE;
-- Report reads: all scores for a signal across Cohort 1
CREATE INDEX idx_cr_scores_signal_run   ON cr_signal_scores (signal_num, run_id);


-- ============================================================
-- TABLE 5: cr_benchmark_averages
-- Cohort 1 averages per signal per trade per tier.
-- Read by diagnostic (gap %) and client reports (comparison).
-- Updated after each quarterly refresh or annual full re-score.
-- Replaces the hardcoded cohort1Averages.js constants.
-- ============================================================

CREATE TABLE cr_benchmark_averages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Dimension
  trade               TEXT NOT NULL,          -- 'plumbing' | 'hvac' | 'electrical' | 'roofing' | 'all'
  tier                cr_cohort_tier NOT NULL,

  -- Signal
  signal_num          SMALLINT NOT NULL,
  signal_name         TEXT NOT NULL,          -- Denormalised for convenience
  stage               cr_stage,

  -- Average
  avg_score           NUMERIC(4,3) NOT NULL,  -- e.g. 1.847
  median_score        NUMERIC(4,3),
  min_score           SMALLINT,
  max_score           SMALLINT,
  sample_size         SMALLINT NOT NULL,      -- Businesses contributing to this average

  -- Provenance
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_id              UUID REFERENCES cr_score_runs (id) ON DELETE SET NULL,

  -- Constraint: one average per trade × tier × signal combination
  CONSTRAINT uq_benchmark UNIQUE (trade, tier, signal_num)
);

CREATE INDEX idx_cr_benchmark_trade     ON cr_benchmark_averages (trade);
CREATE INDEX idx_cr_benchmark_tier      ON cr_benchmark_averages (tier);
CREATE INDEX idx_cr_benchmark_signal    ON cr_benchmark_averages (signal_num);
-- Diagnostic primary read pattern: trade + tier + all signals
CREATE INDEX idx_cr_benchmark_lookup    ON cr_benchmark_averages (trade, tier);


-- ============================================================
-- TABLE 6: cr_gbp_data
-- Raw GBP data from Google Places API.
-- Stored separately from snapshots — structured not text.
-- ============================================================

CREATE TABLE cr_gbp_data (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES cr_businesses (id) ON DELETE CASCADE,
  run_id              UUID REFERENCES cr_score_runs (id) ON DELETE SET NULL,

  -- Core GBP fields
  place_id            TEXT,                   -- Google Place ID
  gbp_name            TEXT,
  rating              NUMERIC(2,1),           -- e.g. 4.6
  review_count        INTEGER,
  photo_count         INTEGER,
  gbp_categories      TEXT[],                 -- Primary + secondary categories
  description         TEXT,
  services_list       JSONB,                  -- Service names + descriptions
  hours               JSONB,                  -- Hours of operation
  messaging_enabled   BOOLEAN,
  booking_button      BOOLEAN,
  qa_count            INTEGER,
  post_count          INTEGER,                -- Requires GMB API OAuth

  -- Recent reviews (last 20 — for recency and sentiment checks)
  recent_reviews      JSONB,                  -- Array: [{rating, time, text, owner_reply}]

  -- Gate 1 inputs
  review_velocity_6mo INTEGER,               -- Reviews in last 180 days
  recent_avg_rating   NUMERIC(2,1),          -- Avg rating of last 180 day reviews

  -- Metadata
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  api_response        JSONB                   -- Full raw API response — for debugging
);

CREATE INDEX idx_cr_gbp_business    ON cr_gbp_data (business_id);
CREATE INDEX idx_cr_gbp_run         ON cr_gbp_data (run_id);
CREATE INDEX idx_cr_gbp_fetched     ON cr_gbp_data (fetched_at DESC);


-- ============================================================
-- TABLE 7: cr_apify_data
-- Raw Apify scraper results per platform per business.
-- Structured JSON — parsed by signal scoring functions.
-- ============================================================

CREATE TABLE cr_apify_data (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES cr_businesses (id) ON DELETE CASCADE,
  run_id              UUID REFERENCES cr_score_runs (id) ON DELETE SET NULL,

  -- Platform
  platform            TEXT NOT NULL,          -- 'facebook' | 'homestars' | 'houzz' | 'angi' | 'nextdoor' | 'bbb'

  -- Result
  scraped_data        JSONB,                  -- Full structured response from Apify actor
  scrape_status       TEXT,                   -- 'success' | 'blocked' | 'not_found' | 'error'
  error_message       TEXT,

  -- Actor metadata
  actor_id            TEXT,                   -- Apify actor used
  apify_run_id        TEXT,                   -- Apify's own run ID for debugging

  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cr_apify_business    ON cr_apify_data (business_id);
CREATE INDEX idx_cr_apify_platform    ON cr_apify_data (business_id, platform);
CREATE INDEX idx_cr_apify_run         ON cr_apify_data (run_id);


-- ============================================================
-- TABLE 8: cr_gate1_log
-- Full Gate 1 audit trail — every business that was evaluated.
-- ============================================================

CREATE TABLE cr_gate1_log (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES cr_businesses (id) ON DELETE CASCADE,
  run_id              UUID REFERENCES cr_score_runs (id) ON DELETE SET NULL,

  result              cr_gate1_result NOT NULL,
  primary_reason      TEXT,
  all_reasons         TEXT[],                 -- All elimination reasons
  all_flags           TEXT[],                 -- All franchise flag reasons

  -- Input values used
  rating_checked      NUMERIC(2,1),
  review_count_checked INTEGER,
  years_in_business   SMALLINT,
  min_reviews_required INTEGER,
  recent_review_count SMALLINT,
  recent_avg_rating   NUMERIC(2,1),
  website_url         TEXT,
  franchise_signals   JSONB,                  -- Detected franchise indicators

  -- Constants used — locked audit trail
  gate1_constants     JSONB NOT NULL,         -- Snapshot of GATE1 constants at run time

  evaluated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cr_gate1_business  ON cr_gate1_log (business_id);
CREATE INDEX idx_cr_gate1_result    ON cr_gate1_log (result);
CREATE INDEX idx_cr_gate1_run       ON cr_gate1_log (run_id);


-- ============================================================
-- VIEWS — Read patterns for diagnostic and reports
-- ============================================================

-- View 1: Latest signal scores per business
-- Diagnostic reads this — one row per signal for the most recent run
CREATE VIEW cr_latest_scores AS
SELECT DISTINCT ON (ss.business_id, ss.signal_num)
  ss.*,
  b.business_name,
  b.trade,
  b.city,
  b.cohort,
  b.cohort_tier
FROM cr_signal_scores ss
JOIN cr_businesses b ON b.id = ss.business_id
ORDER BY ss.business_id, ss.signal_num, ss.scored_at DESC;


-- View 2: Content Gap % per business (latest run, gap score signals only)
-- ClearSky diagnostic reads this for Layer 4 gap calculation
CREATE VIEW cr_content_gap AS
SELECT
  b.id                              AS business_id,
  b.business_name,
  b.trade,
  b.city,
  b.cohort,
  b.cohort_tier,
  b.clearsky_client_id,
  COUNT(ss.id)                      AS signals_scored,
  SUM(ss.score)                     AS total_score,
  180                               AS max_score,
  ROUND(SUM(ss.score)::NUMERIC / 180 * 100, 1)  AS content_gap_pct,
  -- Stage breakdowns
  SUM(CASE WHEN ss.stage = 'discovery'   THEN ss.score ELSE 0 END)  AS discovery_score,
  SUM(CASE WHEN ss.stage = 'engagement'  THEN ss.score ELSE 0 END)  AS engagement_score,
  SUM(CASE WHEN ss.stage = 'conversion'  THEN ss.score ELSE 0 END)  AS conversion_score,
  SUM(CASE WHEN ss.stage = 'growth'      THEN ss.score ELSE 0 END)  AS growth_score,
  MAX(ss.scored_at)                 AS last_scored_at
FROM cr_businesses b
JOIN cr_latest_scores ss ON ss.business_id = b.id
WHERE ss.in_gap_score = TRUE
  AND ss.score IS NOT NULL
  AND b.is_active = TRUE
GROUP BY b.id, b.business_name, b.trade, b.city, b.cohort, b.cohort_tier, b.clearsky_client_id;


-- View 3: Benchmark comparison — client score vs Cohort 1 operational tier
-- Client reports read this — one row per signal showing gap vs benchmark
CREATE VIEW cr_benchmark_comparison AS
SELECT
  ls.business_id,
  ls.business_name,
  ls.trade,
  ls.signal_num,
  ls.signal_name,
  ls.stage,
  ls.score                          AS client_score,
  ba.avg_score                      AS benchmark_avg,
  ba.sample_size                    AS benchmark_n,
  ROUND(ls.score - ba.avg_score, 2) AS gap_vs_benchmark,
  ls.score_note
FROM cr_latest_scores ls
JOIN cr_benchmark_averages ba
  ON ba.signal_num = ls.signal_num
  AND ba.trade = ls.trade::TEXT
  AND ba.tier = 'top_third_operational'
WHERE ls.in_gap_score = TRUE;


-- ============================================================
-- UPDATED_AT trigger — keeps updated_at current on cr_businesses
-- ============================================================

CREATE OR REPLACE FUNCTION cr_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cr_businesses_updated_at
  BEFORE UPDATE ON cr_businesses
  FOR EACH ROW EXECUTE FUNCTION cr_set_updated_at();


-- ============================================================
-- COMMENTS — self-documenting schema
-- ============================================================

COMMENT ON TABLE cr_businesses          IS 'All businesses — both Cohort 1 benchmark and Cohort 2 licensed clients';
COMMENT ON TABLE cr_page_snapshots      IS 'Fetched page content with SHA-256 hash for quarterly change detection';
COMMENT ON TABLE cr_score_runs          IS 'One row per scoring run — tracks cost, timing, and change rate';
COMMENT ON TABLE cr_signal_scores       IS 'Primary read table — one score per signal per business per run';
COMMENT ON TABLE cr_benchmark_averages  IS 'Cohort 1 averages per signal per trade per tier — replaces cohort1Averages.js';
COMMENT ON TABLE cr_gbp_data            IS 'Raw Google Places API response — structured GBP data';
COMMENT ON TABLE cr_apify_data          IS 'Raw Apify scraper results per platform per business';
COMMENT ON TABLE cr_gate1_log           IS 'Full Gate 1 audit trail — every business evaluated with locked constants snapshot';

COMMENT ON COLUMN cr_signal_scores.claude_prompt  IS 'Prompt sent to Claude — stored for scoring audit and prompt iteration';
COMMENT ON COLUMN cr_benchmark_averages.avg_score IS 'Cohort 1 average for this signal/trade/tier combination — updated quarterly';
COMMENT ON COLUMN cr_businesses.cohort_tier       IS 'Set after Cohort 1 scoring: top10_aspirational=top30, top_third_operational=top100, remainder=rest';
COMMENT ON COLUMN cr_gate1_log.gate1_constants    IS 'Snapshot of GATE1 constants at run time — locked audit trail so threshold changes are traceable';
