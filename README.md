# ClearSky Blueprint Workspace

Curated ClearSky context pack for building the **trades vertical blueprint** in Claude Code.
This is the canonical set — retired duplicates, superseded versions, and session-handoff
scaffolding were deliberately left behind so the build learns from one source of truth per topic.

## Start here
1. `CLAUDE.md` — orientation + the non-negotiables. Claude Code reads this first.
2. `specs/00-INTEGRATION-SPEC.md` — how the five bodies connect (the map + the seams).
3. Then the specific spec docs as needed.

## Layout
- **specs/** — canonical reference docs (architecture, MA spine, pipeline, orchestrator).
  - **specs/marketing-automation/** — MA operational docs (rules config, onboarding, hub integration, support, metrics).
  - **specs/diagnostic-frontend/** — the acquisition diagnostic (11-layer). Current Layer 1 = session16 (9 signals).
  - **specs/contentradar/** — ContentRadar; Combined-Master-Reference is authoritative.
  - **specs/verticals/** — tourism (future vertical, reference only).
- **data/** — glossary (controlled vocabulary), signal workbooks; **data/schema/** SQL + Prisma.
- **design/** — RightFlush site (design language) + demo-suite HTML + JSX components. Light mode is mandatory.
- **reference-code/** — implementation snapshots (Python + JS + TS). Live source of truth = Serhii's SvelteKit repo.

## Left behind on purpose (still in the main Claude project, not here)
Superseded specs (old diagnostic v2.0, Layer-1 session14), all session-handoff/summary/prompt
scaffolding, duplicate "master/manifest" docs, and the family-law ContentRadar stress-test.

## File tree
```
CLAUDE.md
README.md
data/ClearSky_40_Signals_Prototype_Workbook_updated_parameters_1.xlsx
data/ClearSky_AI_Decision_System_Dictionary_Glossary.xlsx
data/contentradar_72_signals_updated_4.xlsx
data/contentradar_signal_reference_updated_3.xlsx
data/schema/001_initial_schema.sql
data/schema/002_seed_rules.sql
data/schema/003_consultant_ownership.sql
data/schema/004_40_signals_seed.sql
data/schema/005_outcome_prisma.sql
data/schema/contentradar_schema.sql
data/schema/schema_ADDITIONS.prisma
data/schema/schema_outcome_models.prisma
design/ClearSkyIntakeForm.jsx
design/ClearSkyResultsModal.jsx
design/clearsky-intake-and-results-design__1_.html
design/clearsky-prototype.html
design/clearsky-provider-integration-card__1_.html
design/clearsky-section6-customer-journey.html
design/clearsky-section6b-orchestrator-dynamic.html
design/clearsky-section8-engagement-score.html
design/clearsky-session-log__1_.html
design/clearsky-simulator__2_.html
design/page.jsx
design/revenue-impact-calculator-v2.html
design/rightflush-site/rightflush-about.html
design/rightflush-site/rightflush-bathroom-renovations.html
design/rightflush-site/rightflush-before-after-gallery.html
design/rightflush-site/rightflush-blog__2_.html
design/rightflush-site/rightflush-burst-pipe-flooding.html
design/rightflush-site/rightflush-contact-quote__1_.html
design/rightflush-site/rightflush-emergency.html
design/rightflush-site/rightflush-faq__2_.html
design/rightflush-site/rightflush-home__3_.html
design/rightflush-site/rightflush-market-pages.html
design/rightflush-site/rightflush-our-guarantee.html
design/rightflush-site/rightflush-reviews.html
design/rightflush-site/rightflush-service-areas.html
design/rightflush-site/rightflush-service-pages__1_.html
design/rightflush-site/rightflush-shell.html
design/rightflush-site/rightflush-specials.html
reference-code/CHANGELOG.md
reference-code/CHANGES.md
reference-code/__init__.py
reference-code/_server.ts
reference-code/a2p-client.ts
reference-code/action-queue-engine_PATCH.ts
reference-code/aiPlatformScorer.js
reference-code/apifyScorer.js
reference-code/buildCandidatePool.js
reference-code/city-lookup-patch__1_.js
reference-code/clearsky-engine-SKILL.md
reference-code/clearsky-engine-test-v2__2_.js
reference-code/clearsky-engine-v2-session15__1_.js
reference-code/condition_evaluator.py
reference-code/database.py
reference-code/diagnostic-route__4_.js
reference-code/extraction.py
reference-code/gate1.js
reference-code/main.py
reference-code/pageFetcher.js
reference-code/registry.py
reference-code/requirements.txt
reference-code/rightflush-pixel-readme.md
reference-code/runner.py
reference-code/scorersMethod1.js
reference-code/scorersMethod2.js
reference-code/scorersMethod3.js
reference-code/section-5-execution_PATCH.ts
reference-code/section_1_event.py
reference-code/section_2_signal.py
reference-code/section_3_orchestrator.py
reference-code/seed_corrected.ts
reference-code/signalPipeline.js
reference-code/trades-route__2_.js
reference-code/unified-pipeline_PATCH.ts
reference-code/valueSerpScorer.js
reference-code/youtubeScorer.js
specs/00-INTEGRATION-SPEC.md
specs/ClearSky_A2P_Developer_Spec.md
specs/ClearSky_AI_Decision_System_Technical_Spec.md
specs/ClearSky_Comprehensive_Platform_Report__1_.md
specs/ClearSky_Developer_Session9_SvelteKit.md
specs/ClearSky_MA_Requirements_v3.md
specs/ClearSky_Orchestrator_Master_Report.md
specs/ClearSky_Pipeline_Complete_Reference.md
specs/ClearSky_Section5_Four_Intent_Buckets_Report__1_.md
specs/ClearSky_Section6_Outcome_Developer_Reference.md
specs/ClearSky_Section7_Feedback_Full_Documentation.md
specs/ClearSky_Serhii_Developer_Brief.md
specs/clearsky-master-architecture.md
specs/contentradar/ContentRadar-Combined-Master-Reference.md
specs/contentradar/clearsky-contentradar-spec.md
specs/contentradar/cohort1-master.md
specs/contentradar/contentradar-contractors-spec-v1_0.md
specs/contentradar/contentradar-db-setup.md
specs/contentradar/contentradar-engine1-handoff-todo.md
specs/contentradar/contentradar-readme-v1_0.md
specs/diagnostic-frontend/clearsky-developer-notes-v1_7.md
specs/diagnostic-frontend/clearsky-diagnostic-layers-overview-session14__1_.md
specs/diagnostic-frontend/clearsky-diagnostic-spec-v2_4.md
specs/diagnostic-frontend/clearsky-layer1-developer-spec-session16__2_.md
specs/diagnostic-frontend/clearsky-layer2-spec-session15__1_.md
specs/diagnostic-frontend/clearsky-layer3-spec-session15__1_.md
specs/marketing-automation/clearsky-ma-hub-integration-spec.md
specs/marketing-automation/clearsky-ma-onboarding-runbook.md
specs/marketing-automation/clearsky-ma-rules-config-plumbing.md
specs/marketing-automation/clearsky-ma-selfserve-transition.md
specs/marketing-automation/clearsky-ma-success-metrics.md
specs/marketing-automation/clearsky-ma-support-model.md
specs/verticals/ClearSky_Tourism_Transfer_Package_v1.md
```
