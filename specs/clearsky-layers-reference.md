# ClearSky — Layer Systems Reference (corrected)

ClearSky uses the word "Layer" in **four different systems**. They share numbers but mean different things. "Layer 1" alone is ambiguous — always name the system.

| "Layer 1" means… | in this system |
|---|---|
| Capture — did this event happen | **A. Four-Layer Operating Architecture** |
| Event Validity | (the validity check *inside* Layer 1 Capture) |
| GBP Health | **B. Diagnostic Layers** |
| Behavioural | **C. Cohort 2 Trajectory Layers** |

---

## System A — Four-Layer Operating Architecture (the primary one)

The live processing path every contact event runs through. This is the system the Denise walkthrough refers to. (`clearsky-master-architecture` §9.)

| Layer | Name | What happens |
|---|---|---|
| **1** | **Capture** | Providers split into two streams. Contact events normalized, **validity checked, attributed, and tiered**. Market intelligence routed to Context Store. Noise filtered. *(The two confidence dimensions — event validity, then attribution — live here.)* |
| **2** | **Classify** | Tier 1/2 events classified. Intent inferred via hub lookup + event mining. Context Store read to enrich. Confidence scored. Context package sealed. |
| **3** | **Decide** | The 7-stage pipeline (Event → Signal → Orchestrator → Action Queue → Execution → Outcome → Feedback) runs against the classified context. Bucket + both confidence scores are live inputs. Tier 2 held until upgrade. |
| **4** | **Act** | Right action, right channel, right moment. **Tier 2 never reaches this layer. Tier 3 never reaches it under any circumstances.** |

**Layer 2 components:** CL1 Hub lookup (resolves identifiers, upgrades Tier 2 if confidence crosses threshold) · CL2 Event mining (infers intent from content + Context Store) · CL3 Classification output (seals the context package).

**Layer 4 — Act, the four outputs:**

| Output | When it applies |
|---|---|
| Immediate response | Tier 1, Emergency or Active Project. A2P within SLA. |
| Sequence trigger | Tier 1, Research or Comparison. Nurture / soft follow-up. |
| **Site personalization** | Website-originated Tier 1 events. Push engine receives bucket + Engagement Score; dynamic sections update. |
| No action | Noise · Tier 2 held · Tier 3 · low confidence · blocked by safety rule. Log only. |

---

## System B — Diagnostic Layers (acquisition front-end)

The revenue-gap calculation. 12 layers (+ 2B). Each maps to a journey pillar. Status per Session 17.

| Layer | Name | Pillar | Source | Status |
|---|---|---|---|---|
| 1 | Google Business Profile | Discovery | Google Places + DataForSEO | Live |
| 2 | Rank / Local Pack | Discovery | DataForSEO SERP | Live |
| 2B | Citations / NAP Consistency | Discovery | DataForSEO | Live (partial) |
| 3 | Site Performance | Discovery | PageSpeed Insights | Live |
| 4 | Content Gap | Discovery | ContentRadar / Firecrawl | Mocked |
| 5 | AI Visibility | Discovery | Gartner/Semrush composite | Mocked |
| 6 | Paid Marketing | Discovery | (mocked) | Mocked |
| 7 | Social Voice | Engagement | Social APIs | Mocked |
| 8 | Competitive Paid Density | Discovery | City lookup | Mocked |
| 9 | Engagement Readiness | Engagement | On-site crawl (8 signals) | Mocked |
| 10 | Conversion Infrastructure | Conversion | Self-report + Layer 2 CTR | Mocked |
| 11 | Growth Signals | Growth | Composite (Brand Equity Index) | Mocked |
| 12 | Canonical Health | All | Multi-source audit | Mocked (default 1.08x) |

**Gap-combination rules:** GBP gap (L1) <- L12 · Rank gap (L2) <- L2B x, L9 x, L12 · Performance (L3) standalone · Content gap (L4) <- L9 x · AI risk (L5) x applied to total · Paid gap (L6/8) <- L3 organic health · Social (L7) <- L1 base · Missed-call <- L2 CTR, reduced by L10 · Market multiplier (L8) applied after AI multiplier · Canonical suppression (L12) on GBP + rank only.
Order: primary gaps -> layer multipliers -> AI risk (total) -> market multiplier -> canonical suppression.

---

## System C — Cohort 2 Trajectory Layers (feedback / matching)

The anonymised data model built from booked-job outcomes, queried by the Orchestrator. Written to `cohort2_trajectories`.

| Layer | Name | Captures |
|---|---|---|
| 1 | Behavioural | Bucket, `score_live`, velocity, session count, tier, tools engaged, action taken |
| 2 | Demographic (persona) | Age band, property type, income, family status |
| 3 | Language & Sentiment | Sentiment, urgency, price sensitivity, objections, commitment/cancellation, competitor mentions |
| 4 | Time & Trend | Touch timestamps, days in system, gap trend, score peak/trajectory, bucket history, channel sequence, season, demand state |
| 5 | Interest & Affinity | Service affinity, project type, aesthetic, decision driver, research depth, channel preference, referral source |

Queried via `GET /cohort2/query` on any Layer 1-5 field. Confidence: high >=200 matches, medium >=50, low = rules table.

---

## The "Layer 4" collision — resolved

- **Operating architecture** Layer 4 = **Act** (Site Personalization is one of its outputs) <- what the walkthrough means
- **Diagnostic** Layer 4 = **Content Gap**
- **Cohort 2** Layer 4 = **Time & Trend**

The walkthrough's "Layer 4 Site Personalization" is **correct** for System A. No relabel needed.
