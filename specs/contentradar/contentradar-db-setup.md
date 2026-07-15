ClearSky Software

**ContentRadar**

Database Setup Guide

May 2026 — Confidential — Developer Reference

| **Document owner** | ClearSky Software — Rory Dredhart |
| --- | --- |
| **Contact** | r.dredhart@clearskysoftware.net — 705-274-9564 |
| **Version** | 1.0 — May 2026 |
| **Audience** | Developer — server-side setup only |
| **Classification** | Confidential |
| **Purpose** | Four-step guide to setting up the ContentRadar PostgreSQL database on the VPS alongside the existing ClearSky database. Run once. All tables prefixed cr_ — no impact on existing ClearSky tables. |

# **Section 1 — Overview**

ContentRadar uses the same PostgreSQL database server as the existing ClearSky application. All ContentRadar tables are prefixed cr_ to coexist cleanly with existing ClearSky tables. There is no schema conflict and no migration risk to existing data.

| **Run contentradar_schema.sql once on the VPS. That is all that is required to create the full ContentRadar database structure. This document explains the setup steps, the connection pool configuration, and what each table stores.** |
| --- |

| **Database server** | Same PostgreSQL instance as existing ClearSky database |
| --- | --- |
| **Table prefix** | cr_ — all ContentRadar tables. Never conflicts with ClearSky tables. |
| **Schema file** | contentradar_schema.sql — run once on VPS |
| **Tables created** | 8 live tables + 3 views. 4 additional tables to be added Session 25. |
| **Impact on existing data** | None. The schema file only creates new tables. It does not modify any existing ClearSky tables. |
| **Code file location** | server/scoring/ — all ContentRadar scoring files within the ClearSky Node.js backend |

# **Section 2 — Prerequisites**

Confirm all of the following before running the schema file.

- PostgreSQL is installed and running on the VPS

- The existing ClearSky database is operational

- You have the PostgreSQL superuser credentials or a user with CREATE TABLE privileges on the ClearSky database

- Node.js 18 or later is installed

- The ClearSky Node.js backend is deployed at the correct path

- You have SSH access to the VPS

- The .env file on the VPS contains the database connection string (DB_URL or equivalent)

# **Section 3 — Four Step Setup**

## **Step 1 — Upload the Schema File**

Upload contentradar_schema.sql to the VPS. Place it in the ClearSky project root or any accessible directory.

| # From your local machine: scp contentradar_schema.sql user@your-vps-ip:~/clearsky/ |
| --- |

## **Step 2 — Run the Schema File**

Connect to PostgreSQL and run the schema file against the ClearSky database. Replace clearsky_db with your actual database name.

| # SSH into VPS ssh user@your-vps-ip # Run the schema file psql -U postgres -d clearsky_db -f ~/clearsky/contentradar_schema.sql # Confirm tables were created psql -U postgres -d clearsky_db -c "\dt cr_*" |
| --- |

You should see all 8 cr_ tables listed. If any errors appear, check that the database name is correct and that your PostgreSQL user has CREATE TABLE privileges.

## **Step 3 — Add Environment Variables**

Add the following environment variables to the .env file on the VPS. These are required by the ContentRadar scoring pipeline in addition to the existing ClearSky environment variables.

| # Existing ClearSky variables — already present DB_URL=postgresql://user:password@localhost:5432/clearsky_db # ContentRadar — add these ANTHROPIC_API_KEY=your-anthropic-api-key GOOGLE_PLACES_API_KEY=your-google-places-api-key GOOGLE_YOUTUBE_API_KEY=your-youtube-data-api-key VALUESERP_API_KEY=your-valueserp-api-key APIFY_API_TOKEN=your-apify-api-token OPENAI_API_KEY=your-openai-api-key GEMINI_API_KEY=your-gemini-api-key PERPLEXITY_API_KEY=your-perplexity-api-key |
| --- |

| **Never expose API keys in browser JavaScript. All ContentRadar scoring runs server-side only. The .env file must never be committed to git or transferred via an insecure channel.** |
| --- |

## **Step 4 — Install Dependencies and Verify**

Install any additional Node.js packages required by the ContentRadar scoring files and run a connection test.

| # In the ClearSky backend directory cd ~/clearsky/server # Install dependencies (if not already installed) npm install pg node-fetch # Test database connection node -e "   const { Pool } = require('pg');   const pool = new Pool({ connectionString: process.env.DB_URL });   pool.query('SELECT COUNT(*) FROM cr_businesses').then(r => {     console.log('cr_businesses rows:', r.rows[0].count);     pool.end();   }).catch(e => { console.error(e); pool.end(); }); " |
| --- |

Expected output: cr_businesses rows: 0 — confirms the table exists and the connection works. The count is 0 because the Cohort 1 build has not been run yet.

# **Section 4 — Connection Pool Configuration**

Add the following connection pool to your server-side database module. ContentRadar scoring files import this pool — they do not create their own connections.

| // server/db.js — add ContentRadar pool alongside existing ClearSky pool const { Pool } = require('pg'); // Existing ClearSky pool — already present const clearSkyPool = new Pool({   connectionString: process.env.DB_URL,   max: 10,   idleTimeoutMillis: 30000,   connectionTimeoutMillis: 2000, }); // ContentRadar pool — uses same database, separate pool for isolation const crPool = new Pool({   connectionString: process.env.DB_URL,   max: 5,                    // Lower cap — scoring runs are batch, not real-time   idleTimeoutMillis: 30000,   connectionTimeoutMillis: 5000,  // Higher timeout — some scoring calls are slow }); crPool.on('error', (err) => {   console.error('ContentRadar DB pool error:', err); }); module.exports = { clearSkyPool, crPool }; |
| --- |

All ContentRadar scoring files import crPool from this module. signalPipeline.js uses crPool for all DB writes. The two pools share the same PostgreSQL server but are managed independently.

# **Section 5 — Table Reference**

All 8 tables created by contentradar_schema.sql. All tables prefixed cr_.

## **5.1 — Live Tables — Created by Schema File**

| **Table** | **Purpose** | **Key Fields** |
| --- | --- | --- |
| **cr_businesses** | Primary business registry | All 1,200 Cohort 1 businesses. One row per business. Fields: id, name, trade (ENUM: plumbing/hvac/electrical/roofing), city, province_state, country, website_url, gbp_url, gbp_place_id, years_in_business, gate1_pass (BOOLEAN), cohort_tier (ENUM: aspirational/operational/general), created_at, updated_at. |
| **cr_page_snapshots** | Website content cache | Every page fetched during scoring. Fields: id, business_id (FK), page_url, page_type (ENUM: homepage/services/about/contact/blog/faq/gallery/testimonials/pricing/other), content_text, content_hash (SHA-256), fetch_status, fetched_at. Hash enables change detection on quarterly re-scores — unchanged pages skipped. |
| **cr_score_runs** | Scoring run audit log | One row per scoring run per business. Fields: id, business_id (FK), run_type (ENUM: initial/quarterly/annual/adhoc), started_at, completed_at, total_cost_usd, pages_fetched, pages_skipped (hash match), claude_calls_made, gap_score, gap_percent, status (ENUM: running/complete/failed). |
| **cr_signal_scores** | Primary signal data table | One row per signal per business per run. The main read table for all gap score calculations. Fields: id, run_id (FK), business_id (FK), signal_number (1–72), signal_name, score (0/1/2/3), scoring_method (ENUM: method1/method2/method3/manual), score_note, claude_prompt_used, scored_at. |
| **cr_benchmark_averages** | Cohort 1 benchmark data | Cohort 1 averaged scores per signal per trade per benchmark tier. Updated after each quarterly refresh. Replaces the old cohort1Averages.js hardcoded file. Fields: id, trade, tier (ENUM: aspirational/operational), signal_number, avg_score, business_count, calculated_at. |
| **cr_gbp_data** | Raw Google Places API data | Raw GBP API response stored per business per run. Fields: id, business_id (FK), run_id (FK), place_id, name, rating, review_count, photos_count, hours_complete (BOOLEAN), services_listed (BOOLEAN), qa_count, website_url, fetched_at, raw_json (JSONB). |
| **cr_apify_data** | Raw Apify scraper results | Raw Apify results per platform per business per run. Fields: id, business_id (FK), run_id (FK), platform (ENUM: facebook/nextdoor/homestars/houzz/angi/bbb), apify_run_id, status, result_count, cost_usd, raw_json (JSONB), fetched_at. |
| **cr_gate1_log** | Gate 1 audit trail | Complete Gate 1 evaluation record per business per evaluation. Fields: id, business_id (FK), evaluated_at, gbp_rating, review_count, years_in_business, reviews_required (years x 4), recent_review_found (BOOLEAN), recent_review_rating, franchise_flagged (BOOLEAN), gate1_pass (BOOLEAN), constants_snapshot (JSONB — locked constant values at evaluation time). |

## **5.2 — Tables to Build in Session 25**

| **Table** | **Purpose** | **Key Fields** |
| --- | --- | --- |
| **cr_content_events** | Content intelligence feed | New content detected on Cohort 1 business websites. Fields: id, business_id (FK), detected_at, content_type (ENUM: blog_post/video/faq/gbp_post/new_page/other), topic_tag, intent_bucket, published_at, page_url, content_summary, t0_signal_snapshot (JSONB — baseline signal readings at detection). |
| **cr_signal_snapshots** | Attribution tracking | Signal readings at T=0, T+14, T+30, T+60, T+90 after each content event. Fields: id, content_event_id (FK), snapshot_at, days_after_event (0/14/30/60/90), map_pack_position, gbp_views_7day, review_count, youtube_views, ai_platform_mentioned (BOOLEAN), notes. |
| **cr_content_outcomes** | Attribution pattern library | Aggregated patterns from cr_signal_snapshots. Content type X in trade Y correlated with outcome Z at N days. Fields: id, trade, content_type, topic_tag, sample_size, avg_map_pack_change_60d, avg_gbp_views_change_30d, pct_improved_map_pack, pct_gained_ai_mention, calculated_at. |
| **cr_cohort_trends** | Weekly trend aggregation | What is happening across the cohort this week. Fields: id, week_ending, trade, top_content_topics (JSONB array), top_questions (JSONB array), new_content_event_count, pct_businesses_published, trend_notes, created_at. |

## **5.3 — Views Created by Schema File**

| **View** | **Purpose** | **Usage** |
| --- | --- | --- |
| **v_latest_signal_scores** | Latest score per business | Returns the most recent cr_signal_scores row per signal per business. Simplifies queries that need current state without specifying run_id. |
| **v_benchmark_comparison** | Client vs benchmark | Joins v_latest_signal_scores with cr_benchmark_averages. Returns signal-by-signal gap for any business vs the Cohort 1 operational tier for their trade. Primary view for the diagnostic Layer 4 gap calculation. |
| **v_cohort1_top_performers** | Top tier businesses | Filters cr_businesses to aspirational tier (top 30 per trade). Used for the aspirational benchmark display in client presentations. |

# **Section 6 — VPS Deployment Reference**

## **6.1 — Server Requirements**

| **OS** | Ubuntu 22.04 LTS or later |
| --- | --- |
| **Node.js** | Version 18 or later |
| **RAM** | Minimum 1GB — Claude API responses can be large during Method 3 scoring |
| **HTTPS** | Required — API keys must never travel over plain HTTP |
| **Domain** | A domain name pointing to the VPS IP — required for SSL |
| **PostgreSQL** | Already installed for existing ClearSky database |

## **6.2 — Backend Deployment**

| # SSH into VPS ssh user@your-vps-ip # Install Node.js if not already installed curl -fsSL https://deb.nodesource.com/setup_18.x │ sudo -E bash - sudo apt-get install -y nodejs # Navigate to ClearSky backend cd ~/clearsky/server # Install PM2 for process management npm install -g pm2 # Start the backend pm2 start index.js --name clearsky-api # Save the PM2 process list so it restarts on reboot pm2 save && pm2 startup |
| --- |

## **6.3 — Nginx Configuration**

| server {   listen 443 ssl;   server_name clearsky.yourdomain.com;   location /api {     proxy_pass http://localhost:3000;     proxy_http_version 1.1;     proxy_set_header Host $host;     proxy_set_header X-Real-IP $remote_addr;   }   location / {     root /var/www/clearsky/dist;     try_files $uri /index.html;   } } |
| --- |

## **6.4 — SSL with Certbot**

| sudo apt install certbot python3-certbot-nginx sudo certbot --nginx -d clearsky.yourdomain.com |
| --- |

# **Section 7 — Common Queries**

Reference queries for the developer. All use the cr_ prefix.

**Check table counts after schema creation**

| SELECT   schemaname,   tablename,   n_live_tup AS row_count FROM pg_stat_user_tables WHERE tablename LIKE 'cr_%' ORDER BY tablename; |
| --- |

**Get latest gap score for a business**

| SELECT   b.name,   b.trade,   r.gap_score,   r.gap_percent,   r.completed_at FROM cr_businesses b JOIN cr_score_runs r ON r.business_id = b.id WHERE b.id = $1 ORDER BY r.completed_at DESC LIMIT 1; |
| --- |

**Get signal-by-signal comparison vs benchmark**

| -- Uses the v_benchmark_comparison view SELECT   signal_number,   signal_name,   client_score,   benchmark_avg,   (client_score - benchmark_avg) AS gap FROM v_benchmark_comparison WHERE business_id = $1   AND trade = $2 ORDER BY gap ASC;  -- Worst gaps first |
| --- |

**Get Cohort 1 benchmark averages by trade**

| SELECT   signal_number,   signal_name,   trade,   tier,   avg_score,   business_count FROM cr_benchmark_averages WHERE trade = $1  -- 'plumbing' │ 'hvac' │ 'electrical' │ 'roofing'   AND tier = 'operational' ORDER BY signal_number; |
| --- |

**Get Gate 1 pass rate by trade**

| SELECT   b.trade,   COUNT(*) AS total_evaluated,   SUM(CASE WHEN g.gate1_pass THEN 1 ELSE 0 END) AS passed,   ROUND(100.0 * SUM(CASE WHEN g.gate1_pass THEN 1 ELSE 0 END) / COUNT(*), 1) AS pass_rate_pct FROM cr_gate1_log g JOIN cr_businesses b ON b.id = g.business_id GROUP BY b.trade ORDER BY b.trade; |
| --- |

# **Section 8 — Environment Variables Reference**

Complete list of environment variables required by ContentRadar. Add to .env on VPS. Never commit to git.

| **Variable** | **Format** | **Used By** |
| --- | --- | --- |
| **DB_URL** | postgresql://user:pass@localhost:5432/clearsky_db | PostgreSQL connection string — same as existing ClearSky |
| **ANTHROPIC_API_KEY** | sk-ant-... | Used by scorersMethod2.js, scorersMethod3.js, and the weekly content detection scanner |
| **GOOGLE_PLACES_API_KEY** | AIza... | Used by the Google Places API integration — GBP signals 11–18 |
| **GOOGLE_YOUTUBE_API_KEY** | AIza... | Used by youtubeScorer.js — YouTube Data API v3 — signals 44–47 |
| **VALUESERP_API_KEY** | ... | Used by valueSerpScorer.js — signals 40, 43, 51–54 |
| **APIFY_API_TOKEN** | apify_api_... | Used by apifyScorer.js — Facebook, Nextdoor, HomeStars, Houzz, Angi, BBB |
| **OPENAI_API_KEY** | sk-... | Used by aiPlatformScorer.js — ChatGPT signal 48 |
| **GEMINI_API_KEY** | AIza... | Used by aiPlatformScorer.js — Gemini signal 49 |
| **PERPLEXITY_API_KEY** | pplx-... | Used by aiPlatformScorer.js — Perplexity signal 50 + citation source detection |

ClearSky Software — ContentRadar Database Setup Guide — May 2026 — Confidential

Rory Dredhart — r.dredhart@clearskysoftware.net — 705-274-9564