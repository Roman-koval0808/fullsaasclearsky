**CLEARSKY SOFTWARE**

**Developer Roadmap — Session 9**

SvelteKit Build Reference — Persona Layer + Pixel Integration

*Supersedes: ClearSky_Developer_Session9_Roadmap.docx*

Stack: SvelteKit · Prisma · PostgreSQL · Telnyx  ·  May 2026

*Client: RightFlush Plumbing — Timmins, Ontario*

**CONFIDENTIAL — INTERNAL DEVELOPER DOCUMENT**

**1.  What Changed in Session 9**

 

| **Item** | **Change** |
| --- | --- |
| Stack confirmed | SvelteKit + Prisma + PostgreSQL. All code in this document is SvelteKit-ready. |
| This document supersedes | ClearSky_Developer_Session9_Roadmap.docx — which had the build sequence but not the SvelteKit code. |
| All 12 implementation files produced | Complete code for every file. Ready for Serhii to begin immediately. |
| Prisma schema additions | FsaCensusReference (new), PersonaSignalLog (new), VisitorProfile ALTER (13 columns). All migrations specified. |
| SvelteKit-specific rules added | Server-only boundary, Decimal wrapping, non-blocking async pattern, $transaction usage. |

 

**2.  Locked Constants — Never Change**

 

| **Constant** | **Value** |
| --- | --- |
| clientId | clearsky_client_042 |
| callToPurchaseRate | 0.024 |
| Hub event endpoint | POST /hub/events |
| ContentRadar endpoint | POST /hub/contentradar/queue |
| Token validate | GET /hub/validate-token?cs_token=<jwt> |
| Score cap | 100 — never exceeds, never decrements mid-session |
| Bucket priority | Emergency > Active Project > Comparison > Research |
| Emergency bucket expiry | 14 days — flags as inactive-emergency, re-enters at Comparison minimum |
| Form length 0–30 | Full form — all fields |
| Form length 31–60 | Remove optional fields |
| Form length 61–80 | Name and phone only |
| Form length 81–100 | Phone only |
| SHA-256 email | lowercase + trim before hashing |
| SHA-256 phone | E.164 +17052740988 before hashing |
| IP provider | ip-api.com — ~$15 USD/month — abstraction layer required for MaxMind swap |
| Co-occurrence window | Same session day — resets at midnight |
| A2P provider | Telnyx — all SMS delivery and call routing |
| SMS expiry — discount codes | 30 minutes |
| SMS expiry — review requests | 7 days signed one-time URL |
| cs_token expiry | 24h for SMS — 7 days for email |
| Persona cap — age | 0.650 hard cap — enforced in inferPersona() |
| Persona cap — income | 0.600 hard cap — enforced in inferPersona() |
| Persona cap — property | 1.000 |
| Persona cap — family | 1.000 |
| Persona threshold — age, property, family | 0.35 — dimension applied to manifest only when met |
| Persona threshold — income | 0.40 — higher because income inference is sensitive |
| Contradiction reset | delta >= 0.25 toward different class resets confidence to that delta only |

 

**3.  SvelteKit File Map**

 

All files for this build. All paths relative to project root. All src/lib/server/ files are server-only — never import from client-side Svelte components.

| src/ ├── lib/ │   └── server/ │       ├── persona/ │       │   ├── types.ts                     ← TypeScript interfaces for all persona types │       │   ├── rules.ts                     ← Step 4  INFERENCE_RULES, PERSONA_CAPS, PERSONA_THRESHOLDS │       │   ├── inferPersona.ts              ← Step 5  inference engine — called non-blocking │       │   └── applyPersonaModifiers.ts     ← Step 7  pure manifest modifier — no DB calls │       ├── orchestrator/ │       │   └── buildContentManifest.ts      ← Step 8  persona wired as Input 7 │       └── profiles/ │           ├── resolve.ts                   ← anonymous profile resolution │           └── enrichWithFsa.ts             ← FSA enrichment from IP postal code └── routes/     └── hub/         ├── events/         │   └── +server.ts                   ← Step 6 + Step 9  pixel receiver + Emergency patterns         └── contentradar/             └── queue/                 └── +server.ts               ← Step 10  ContentRadar question receiver  prisma/ └── schema.prisma                            ← Steps 1–3  new tables + VisitorProfile ALTER  src/scripts/ └── loadFsaCensus.ts                         ← Step 1  one-time ETL — run once after migration |
| --- |

 

| **⚠  ***CRITICAL: Wrap every Prisma Decimal field in Number() before arithmetic. Prisma returns Decimal.js objects. Forgetting this causes silent NaN bugs. Every read: Number(profile.personaAgeConf ?? 0) — never profile.personaAgeConf directly.* |
| --- |

 

**4.  Build Sequence — All 15 Steps**

 

Phase 1 (Steps 1–8) must be built in exact order. Phase 2 (Steps 9–15) is independent and can begin in parallel once Step 3 is done.

| **Step** | **Task** | **Verify** |
| --- | --- | --- |
| Step 1 Persona | Load Stats Canada 2021 Census (table 98-401-X2021006) into fsa_census_reference. ~1,630 rows. One-time load. Prerequisite for all FSA-based persona signals. | SELECT COUNT(*) = ~1,630. Spot-check P4N, P4P, P4R — non-null median_household_income. |
| Step 2 Persona | Prisma migration — 13 new nullable persona columns on VisitorProfile. Zero-downtime. No backfill needed. | SELECT column_name WHERE table_name=visitor_profiles AND column_name LIKE persona_% — confirm 13 columns. |
| Step 3 Persona | Create PersonaSignalLog table and 4 indexes: profileId, sessionId, (dimension, classification), thresholdCrossed. Append-only — never UPDATE or DELETE. | \d persona_signal_log — confirm 4 indexes. INSERT test row, DELETE after. |
| Step 4 Persona | Implement INFERENCE_RULES, PERSONA_CAPS, PERSONA_THRESHOLDS in rules.ts. Server-only file. | Unit test: fotojobber_submit → house, 0.22. child_safety_faq → family, 0.28. |
| Step 5 Persona | Implement inferPersona() — 4 edge cases: double-count prevention, contradiction reset, hard cap, atomic $transaction. | Unit tests for all 4 edge cases. Decimal wrapping confirmed. Transaction rollback confirmed. |
| Step 6 Persona | Hook inferPersona() into POST /hub/events — no await, .catch() wrapper. Must not delay ACK. | POST test event. persona_property populates. ACK < 50ms. |
| Step 7 Persona | Implement applyPersonaModifiers() — pure function, structuredClone(), Emergency CTA never touched, urgency.show never set. | Marie profile test: proof_keys includes tssa_certification. Urgency suffix applied. CTA unchanged. |
| Step 8 Persona | Wire applyPersonaModifiers() into buildContentManifest() as Input 7. isPersonaActive() fast exit if no dimension active. | End-to-end: manifest.personaActive === true. outputs.proofBlock.personaModifier.applied === true. |
| Step 9 Pixel | Build POST /hub/events — Emergency URL detection, cs_token path, profile resolve, event write, bucket/score update, non-blocking inferPersona(). | Four QA scenarios pass. Events in pixel_events table. |
| Step 10 Pixel | Build POST /hub/contentradar/queue — 5-question/48h threshold, flagFired in response, upsert flag for ContentRadar dashboard. | flagFired: true after 5 same-topic questions. Flag written to contentRadarFlag table. |
| Step 11 Pixel | 7 Emergency URL patterns registered: /emergency, /burst-pipe, /flood, /no-hot-water, /blocked-drain, /leak, /urgent. page_load on these locks Emergency immediately. | Navigate to /burst-pipe — Emergency on page_load before any scroll. Never downgrades. |
| Step 12 Pixel | Confirm .pixel-toast removed from all 25 pages. Already removed in prior build — verify in production DOM. | No .pixel-toast in DOM on any page after production build. |
| Step 13 Pixel | Telnyx: booking confirmation SMS (REPLY YES mechanic), Emergency A2P (15-min SLA from signal detection), GBP click-to-call webhook. A2P requires Tier 1. | All three flows tested. Emergency SLA clock starts at signal detection — not first contact. |
| Step 14 Pixel | Validate window.PAGE config on all 7 market pages. One active block per file. Timmins +4, all others +3. | Correct delta fires per market. Only one PAGE config block active per file. |
| Step 15 Pixel | Full QA pass — four mandatory scenarios. All must pass before production sign-off. | About, Reviews 60s, Specials submit, /burst-pipe. All four pass. Sign off. |

 

**5.  Prisma Schema — All Additions**

 

**5.1  FsaCensusReference — New Table**

| model FsaCensusReference {   fsaCode               String   @id              @db.VarChar(3)   @map("fsa_code")   medianHouseholdIncome Int?                                        @map("median_household_income")   pctOwnerOccupied      Decimal?                 @db.Decimal(5,2)  @map("pct_owner_occupied")   pctDetached           Decimal?                 @db.Decimal(5,2)  @map("pct_detached")   medianAge             Decimal?                 @db.Decimal(4,1)  @map("median_age")   pctCoupleFamily       Decimal?                 @db.Decimal(5,2)  @map("pct_couple_family")   avgHouseholdSize      Decimal?                 @db.Decimal(3,1)  @map("avg_household_size")   pctRecentMovers       Decimal?                 @db.Decimal(5,2)  @map("pct_recent_movers")   @@map("fsa_census_reference") } |
| --- |

 

**5.2  VisitorProfile — Add 13 Persona Columns**

| // Add inside existing model VisitorProfile {    personaAgeBand        String?   @map("persona_age_band")   personaAgeConf        Decimal?  @map("persona_age_conf")         @db.Decimal(4,3)  // cap 0.650   personaProperty       String?   @map("persona_property")   personaPropertyConf   Decimal?  @map("persona_property_conf")    @db.Decimal(4,3)   personaIncomeBand     String?   @map("persona_income_band")   personaIncomeConf     Decimal?  @map("persona_income_conf")      @db.Decimal(4,3)  // cap 0.600   personaFamilyStatus   String?   @map("persona_family_status")   personaFamilyConf     Decimal?  @map("persona_family_conf")      @db.Decimal(4,3)   personaSignalCount    Int       @default(0)  @map("persona_signal_count")   personaLastUpdated    DateTime?              @map("persona_last_updated")   fsaCode               String?   @map("fsa_code")                 @db.VarChar(3)   fsaMedianIncome       Int?      @map("fsa_median_income")   fsaPctOwnerOccupied   Decimal?  @map("fsa_pct_owner_occupied")   @db.Decimal(5,2)   fsaPctDetached        Decimal?  @map("fsa_pct_detached")         @db.Decimal(5,2)   fsaMedianAge          Decimal?  @map("fsa_median_age")           @db.Decimal(4,1)   personaSignalLogs     PersonaSignalLog[] |
| --- |

 

**5.3  PersonaSignalLog — New Table**

| model PersonaSignalLog {   id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid   profileId             String   @map("profile_id")               @db.Uuid   sessionId             String   @map("session_id")   pixelEventType        String   @map("pixel_event_type")   signalGroup           String   @map("signal_group")             @db.VarChar(30)   // signal_group: device │ ip_location │ behavioural │ session_pattern │ content_tool │ fsa   dimension             String                                    @db.VarChar(20)   // dimension: property │ age │ income │ family   classification        String                                    @db.VarChar(20)   confidenceDelta       Decimal  @map("confidence_delta")         @db.Decimal(4,3)   confBefore            Decimal  @map("conf_before")              @db.Decimal(4,3)   confAfter             Decimal  @map("conf_after")               @db.Decimal(4,3)   thresholdCrossed      Boolean  @default(false) @map("threshold_crossed")   classificationChanged Boolean  @default(false) @map("classification_changed")   priorClassification   String?  @map("prior_classification")     @db.VarChar(20)   signalPayload         Json?    @map("signal_payload")           // { url, tool } — NO PII   createdAt             DateTime @default(now()) @map("created_at")   profile               VisitorProfile @relation(fields: [profileId], references: [id])   @@index([profileId])   @@index([sessionId])   @@index([dimension, classification])   @@index([thresholdCrossed])   @@map("persona_signal_log") } |
| --- |

 

Run migrations:

| npx prisma migrate dev --name fsa_census_reference_session8 npx prisma migrate dev --name persona_layer_session8 |
| --- |

 

**6.  TypeScript Interfaces — src/lib/server/persona/types.ts**

 

| // src/lib/server/persona/types.ts  export interface PersonaProfile {   ageBand:       string │ null   ageConf:       number   property:      string │ null   propertyConf:  number   incomeBand:    string │ null   incomeConf:    number   familyStatus:  string │ null   familyConf:    number }  export interface PersonaModifier {   applied:            boolean   proofKeys?:         string[]   urgencyTextSuffix?: string   variant?:           string   adjustments?:       Record<string, string> }  export interface ContentManifestOutputs {   proofBlock:   { proofKeys: string[];  personaModifier?: PersonaModifier }   tone:         { formality: string;   personaModifier?: PersonaModifier }   cta:          { variant: string;     personaModifier?: PersonaModifier }   urgency:      { show: boolean; urgencyText: string; personaModifier?: PersonaModifier }   formLength:   { fields: string[];    personaModifier?: PersonaModifier }   contentStrip: { topics: string[];    personaModifier?: PersonaModifier } }  export interface ContentManifest {   bucket:            string   scoreLive:         number   tier:              1 │ 2 │ 3   personaActive:     boolean   personaDimensions: {     age:      { band:   string │ null; conf: number }     property: { type:   string │ null; conf: number }     income:   { band:   string │ null; conf: number }     family:   { status: string │ null; conf: number }   }   outputs: ContentManifestOutputs }  export interface SessionState {   bucket:    'emergency' │ 'active_project' │ 'comparison' │ 'research' │ 'unclassified'   scoreLive: number   tier:      1 │ 2 │ 3   urgency:   { show: boolean; urgencyText: string } }  export interface PixelEvent {   type:          string   sessionId:     string   pageUrl:       string   clientId:      string   bucket:        string   delta:         number   score:         number   timestamp:     string   anonymousId?:  string   csToken?:      string   ipPostalCode?: string   tool?:         string } |
| --- |

 

**7.  rules.ts — src/lib/server/persona/rules.ts**

 

INFERENCE_RULES is the lookup table inferPersona() reads on every pixel event. PERSONA_CAPS and PERSONA_THRESHOLDS are locked constants. Server-only file — never import from client-side Svelte components.

| // src/lib/server/persona/rules.ts  export const INFERENCE_RULES = {    property: {     fotojobber_submit:        { classification: 'house',   delta: 0.22 },     gallery_view:             { classification: 'house',   delta: 0.08 },     bathroom_reno_page_load:  { classification: 'house',   delta: 0.12 },     contentradar_condo_faq:   { classification: 'condo',   delta: 0.30 },     contentradar_tenant_faq:  { classification: 'rental',  delta: 0.28 },     market_page_load:         { classification: 'house',   delta: 0.05 },   },    age: {     device_desktop:           { classification: '55+',     delta: 0.06 },     device_mobile_old:        { classification: '35-54',   delta: 0.04 },     fsa_median_age_over_50:   { classification: '55+',     delta: 0.10 },     fsa_median_age_under_35:  { classification: '18-34',   delta: 0.10 },     session_daytime_weekday:  { classification: '55+',     delta: 0.05 },     session_evening_weekend:  { classification: '18-34',   delta: 0.05 },     content_senior_discount:  { classification: '55+',     delta: 0.15 },   },    income: {     fsa_median_income_high:   { classification: 'high',    delta: 0.12 },     fsa_median_income_low:    { classification: 'low',     delta: 0.12 },     fsa_pct_owner_over_70:    { classification: 'high',    delta: 0.08 },     fotojobber_premium:       { classification: 'high',    delta: 0.10 },     specials_page_load:       { classification: 'low',     delta: 0.06 },     specials_cta_click:       { classification: 'low',     delta: 0.10 },   },    family: {     child_safety_faq:         { classification: 'family',  delta: 0.28 },     fsa_pct_couple_over_60:   { classification: 'couple',  delta: 0.10 },     fsa_avg_household_over_3: { classification: 'family',  delta: 0.08 },     session_pattern_2_devices:{ classification: 'couple',  delta: 0.12 },     contentradar_family_q:    { classification: 'family',  delta: 0.18 },   },  } as const  export const PERSONA_CAPS = {   age: 0.650, income: 0.600, property: 1.000, family: 1.000, } as const  export const PERSONA_THRESHOLDS = {   age: 0.35, property: 0.35, income: 0.40, family: 0.35, } as const  export type Dimension = keyof typeof PERSONA_CAPS |
| --- |

 

**8.  inferPersona.ts — src/lib/server/persona/inferPersona.ts**

 

Processes every qualifying pixel event and accumulates confidence across four dimensions. Four edge cases handled: double-count prevention, contradiction reset, hard cap, atomic write. Called non-blocking — must never block the ACK.

| // src/lib/server/persona/inferPersona.ts  import { db } from '$lib/server/db' import { INFERENCE_RULES, PERSONA_CAPS, PERSONA_THRESHOLDS } from './rules' import type { Dimension, PixelEvent } from './types'  export async function inferPersona(   profileId: string,   sessionId: string,   event: PixelEvent ): Promise<void> {   const profile = await db.visitorProfile.findUnique({ where: { id: profileId } })   if (!profile) return    const dimensions: Dimension[] = ['property', 'age', 'income', 'family']    for (const dimension of dimensions) {     const rules = INFERENCE_RULES[dimension] as Record<string, { classification: string; delta: number }>     const rule  = rules[event.type]     if (!rule) continue     const { classification, delta } = rule      // Double-count prevention — same event + dimension within same session = skip     const alreadyFired = await db.personaSignalLog.findFirst({       where: { profileId, sessionId, pixelEventType: event.type, dimension },     })     if (alreadyFired) continue      // CRITICAL: Wrap all Decimal in Number() — Prisma returns Decimal.js     const confKey  = `persona${cap(dimension)}Conf`  as keyof typeof profile     const classKey = `persona${cap(dimension)}`       as keyof typeof profile     const currentConf  = Number(profile[confKey]  ?? 0)     const currentClass = profile[classKey] as string │ null     const capVal       = PERSONA_CAPS[dimension]     const threshold    = PERSONA_THRESHOLDS[dimension]      let newConf: number, newClass: string     let classChanged = false, priorClass: string │ null = null      if (currentClass && classification !== currentClass && delta >= 0.25) {       // Contradiction reset — discard prior accumulation       newConf = delta; newClass = classification       classChanged = true; priorClass = currentClass     } else if (!currentClass ││ classification === currentClass) {       // Accumulate — enforce hard cap       newConf  = Math.min(currentConf + delta, capVal)       newClass = classification       classChanged = newClass !== currentClass       priorClass   = classChanged ? currentClass : null     } else {       continue  // Contradictory signal below 0.25 — skip silently     }      const thresholdCrossed = currentConf < threshold && newConf >= threshold      // Atomic write — both succeed or both fail     await db.$transaction([       db.visitorProfile.update({         where: { id: profileId },         data: { [classKey]: newClass, [confKey]: newConf,                 personaSignalCount: { increment: 1 }, personaLastUpdated: new Date() },       }),       db.personaSignalLog.create({ data: {         profileId, sessionId, pixelEventType: event.type,         signalGroup: getSignalGroup(event.type), dimension, classification,         confidenceDelta: delta, confBefore: currentConf, confAfter: newConf,         thresholdCrossed, classificationChanged: classChanged,         priorClassification: priorClass,         signalPayload: { url: event.pageUrl, tool: event.tool ?? null },       }}),     ])   } }  function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }  function getSignalGroup(eventType: string): string {   if (['fotojobber_submit','gallery_view','cta_click'].includes(eventType)) return 'content_tool'   if (eventType.startsWith('contentradar_'))                                   return 'content_tool'   if (['device_desktop','device_mobile_old'].includes(eventType))             return 'device'   if (eventType.startsWith('fsa_'))                                            return 'fsa'   if (eventType.startsWith('session_'))                                        return 'session_pattern'   return 'behavioural' } |
| --- |

 

**9.  applyPersonaModifiers.ts — src/lib/server/persona/applyPersonaModifiers.ts**

 

Pure function. No DB calls. No side effects. Uses structuredClone(). Emergency CTA never touched. urgency.show never set by persona.

| // src/lib/server/persona/applyPersonaModifiers.ts  import { PERSONA_THRESHOLDS } from './rules' import type { ContentManifest, PersonaProfile, SessionState } from './types'  export function applyPersonaModifiers(   manifest: ContentManifest,   persona: PersonaProfile,   sessionState: SessionState ): ContentManifest {   if (!isPersonaActive(persona)) return manifest   const modified: ContentManifest = structuredClone(manifest)   const isEmergency = sessionState.bucket === 'emergency'    // Property → proof_block   if (persona.propertyConf >= PERSONA_THRESHOLDS.property) {     const baseKeys = manifest.outputs.proofBlock.proofKeys     if (persona.property === 'house') {       modified.outputs.proofBlock.personaModifier = {         applied: true, proofKeys: [...baseKeys, 'tssa_certification', 'fotojobber_gallery'],       }     } else if (persona.property === 'condo') {       modified.outputs.proofBlock.personaModifier = {         applied: true, proofKeys: [...baseKeys, 'condo_experience', 'strata_approved'],       }     } else if (persona.property === 'rental') {       modified.outputs.proofBlock.personaModifier = {         applied: true, proofKeys: [...baseKeys, 'tenant_safe', 'landlord_approved'],       }     }   }    // Age → tone   if (persona.ageConf >= PERSONA_THRESHOLDS.age) {     if (persona.ageBand === '55+') {       modified.outputs.tone.personaModifier = { applied: true,         adjustments: { formality: 'increase', trustSignals: 'emphasise', urgencyLanguage: 'soften' } }     } else if (persona.ageBand === '18-34') {       modified.outputs.tone.personaModifier = { applied: true,         adjustments: { formality: 'decrease', trustSignals: 'social_proof', urgencyLanguage: 'direct' } }     }   }    // Income → CTA — NEVER on Emergency bucket   if (!isEmergency && persona.incomeConf >= PERSONA_THRESHOLDS.income) {     if (persona.incomeBand === 'low')       modified.outputs.cta.personaModifier = { applied: true, variant: 'free_estimate_primary' }     else if (persona.incomeBand === 'high')       modified.outputs.cta.personaModifier = { applied: true, variant: 'premium_same_day_primary' }   }    // Family → urgency text suffix ONLY — NEVER sets urgency.show = true   if (persona.familyConf >= PERSONA_THRESHOLDS.family &&       persona.familyStatus === 'family' && manifest.outputs.urgency.show === true) {     modified.outputs.urgency.personaModifier = {       applied: true, urgencyTextSuffix: ' — safe for your family, fast.' }   }    modified.personaActive = true   modified.personaDimensions = {     age:      { band:   persona.ageBand,      conf: persona.ageConf      },     property: { type:   persona.property,     conf: persona.propertyConf },     income:   { band:   persona.incomeBand,   conf: persona.incomeConf   },     family:   { status: persona.familyStatus, conf: persona.familyConf   },   }   return modified }  export function isPersonaActive(persona: PersonaProfile): boolean {   return (     persona.ageConf      >= PERSONA_THRESHOLDS.age      ││     persona.propertyConf >= PERSONA_THRESHOLDS.property ││     persona.incomeConf   >= PERSONA_THRESHOLDS.income   ││     persona.familyConf   >= PERSONA_THRESHOLDS.family   ) } |
| --- |

 

**10.  buildContentManifest.ts — src/lib/server/orchestrator/buildContentManifest.ts**

 

Connects persona as Input 7 after inputs 1–6. Narrow Prisma select — persona columns only, no PII. isPersonaActive() fast exit if no dimension active.

| // src/lib/server/orchestrator/buildContentManifest.ts  import { db } from '$lib/server/db' import { applyPersonaModifiers, isPersonaActive } from '$lib/server/persona/applyPersonaModifiers' import type { ContentManifest, PersonaProfile, SessionState } from '$lib/server/persona/types'  export async function buildContentManifest(   profileId: string,   sessionState: SessionState ): Promise<ContentManifest> {   // Inputs 1–6 — unchanged from Sessions 1–7   const baseManifest = await buildBaseManifest(sessionState)    // Input 7 — Persona (narrow select, no PII)   const profile = await db.visitorProfile.findUnique({     where: { id: profileId },     select: {       personaAgeBand: true, personaAgeConf: true,       personaProperty: true, personaPropertyConf: true,       personaIncomeBand: true, personaIncomeConf: true,       personaFamilyStatus: true, personaFamilyConf: true,     },   })    // CRITICAL: Wrap all Decimal in Number()   const persona: PersonaProfile = {     ageBand:      profile?.personaAgeBand      ?? null,     ageConf:      Number(profile?.personaAgeConf      ?? 0),     property:     profile?.personaProperty     ?? null,     propertyConf: Number(profile?.personaPropertyConf ?? 0),     incomeBand:   profile?.personaIncomeBand   ?? null,     incomeConf:   Number(profile?.personaIncomeConf   ?? 0),     familyStatus: profile?.personaFamilyStatus ?? null,     familyConf:   Number(profile?.personaFamilyConf   ?? 0),   }    if (!isPersonaActive(persona)) return baseManifest   return applyPersonaModifiers(baseManifest, persona, sessionState) }  async function buildBaseManifest(sessionState: SessionState): Promise<ContentManifest> {   return {     bucket: sessionState.bucket, scoreLive: sessionState.scoreLive, tier: sessionState.tier,     personaActive: false,     personaDimensions: {       age: { band: null, conf: 0 }, property: { type: null, conf: 0 },       income: { band: null, conf: 0 }, family: { status: null, conf: 0 },     },     outputs: {       proofBlock:   { proofKeys: getProofKeys(sessionState.bucket) },       tone:         { formality: getTone(sessionState.bucket) },       cta:          { variant: getCTAVariant(sessionState.bucket, sessionState.scoreLive) },       urgency:      sessionState.urgency,       formLength:   { fields: getFormFields(sessionState.scoreLive) },       contentStrip: { topics: getContentTopics(sessionState.bucket) },     },   } }  function getProofKeys(b: string): string[] {   if (b==='emergency') return ['emergency_response_time','tssa_certified','licensed']   if (b==='active_project') return ['fotojobber_gallery','reviews','guarantee']   return ['reviews','years_experience','licensed'] } function getTone(b: string): string {   if (b==='emergency') return 'urgent'   if (b==='active_project') return 'confident'   if (b==='comparison') return 'reassuring'   return 'informative' } function getCTAVariant(b: string, score: number): string {   if (b==='emergency') return 'call_now_emergency'   if (b==='active_project') return 'book_now_primary'   if (score >= 60) return 'get_quote_primary'   return 'get_quote_secondary' } function getFormFields(score: number): string[] {   if (score<=30) return ['name','email','phone','message','service','preferred_time']   if (score<=60) return ['name','email','phone','message']   if (score<=80) return ['name','phone']   return ['phone'] } function getContentTopics(b: string): string[] {   if (b==='emergency') return ['emergency_plumbing','response_time','safety']   if (b==='active_project') return ['renovation_gallery','pricing','process']   if (b==='comparison') return ['reviews','guarantee','certifications']   return ['tips','maintenance','faq'] } |
| --- |

 

**11.  Hub Endpoints**

 

**11.1  POST /hub/events — src/routes/hub/events/+server.ts**

Receives every firePixel() POST. Emergency URL detection, cs_token path, profile resolve, event write, bucket/score update, non-blocking persona hook.

| // src/routes/hub/events/+server.ts  import { json } from '@sveltejs/kit' import type { RequestHandler } from './$types' import { db } from '$lib/server/db' import { inferPersona } from '$lib/server/persona/inferPersona' import { resolveProfile } from '$lib/server/profiles/resolve' import { enrichWithFsa } from '$lib/server/profiles/enrichWithFsa' import { updateBucketAndScore } from '$lib/server/scoring/update'  const EMERGENCY_PATTERNS = [   '/emergency', '/burst-pipe', '/flood',   '/no-hot-water', '/blocked-drain', '/leak', '/urgent', ] as const  export const POST: RequestHandler = async ({ request }) => {   const event = await request.json()    // Emergency URL override — evaluated first, before all other logic   if (event.type === 'page_load' &&       EMERGENCY_PATTERNS.some(p => (event.pageUrl ?? '').includes(p))) {     event.bucket = 'emergency'     event.delta  = 20   }    // Profile resolution — named path if cs_token, otherwise anonymous   let profileId: string   if (event.csToken) {     const v = await validateCsToken(event.csToken)     profileId = v.valid && v.profileId ? v.profileId : await resolveProfile(event)   } else {     profileId = await resolveProfile(event)   }    // Write pixel event — append-only   await db.pixelEvent.create({ data: {     profileId, eventType: event.type, delta: event.delta,     bucket: event.bucket, score: event.score, sessionId: event.sessionId,     pageUrl: event.pageUrl, clientId: event.clientId,     timestamp: new Date(event.timestamp), toolUsed: event.tool ?? null,   }})    await updateBucketAndScore(profileId, event)    // FSA enrichment — non-blocking, once per profile   enrichWithFsa(profileId, event.ipPostalCode ?? null).catch((err: Error) =>     console.error('[enrichWithFsa] silent failure:', err.message)   )    // Persona inference — non-blocking — must not delay ACK   inferPersona(profileId, event.sessionId, event).catch((err: Error) =>     console.error('[inferPersona] silent failure:', err.message)   )    return json({ received: true }) }  async function validateCsToken(token: string)   : Promise<{ valid: boolean; profileId?: string }> {   try {     const r = await db.csToken.findFirst({       where: { token, expiresAt: { gt: new Date() }, used: false },       select: { profileId: true },     })     return r ? { valid: true, profileId: r.profileId } : { valid: false }   } catch { return { valid: false } } } |
| --- |

 

**11.2  POST /hub/contentradar/queue — src/routes/hub/contentradar/queue/+server.ts**

Blog and FAQ question forms only. Never pixel events. 5-question/48h threshold. Returns flagFired.

| // src/routes/hub/contentradar/queue/+server.ts  import { json } from '@sveltejs/kit' import type { RequestHandler } from './$types' import { db } from '$lib/server/db'  const CLUSTER_WINDOW_HOURS = 48 const FLAG_THRESHOLD = 5  export const POST: RequestHandler = async ({ request }) => {   const { question_text, source_page, source_form, timestamp, session_id }     = await request.json()    if (!question_text ││ !source_page ││ !source_form ││ !session_id)     return json({ received: false, error: 'missing_required_fields' }, { status: 422 })    await db.contentRadarQuestion.create({ data: {     questionText: question_text, sourcePage: source_page,     sourceForm: source_form, sessionId: session_id,     createdAt: timestamp ? new Date(timestamp) : new Date(),   }})    const windowStart = new Date(Date.now() - CLUSTER_WINDOW_HOURS * 60 * 60 * 1000)   const recentCount = await db.contentRadarQuestion.count({     where: { sourcePage: source_page, createdAt: { gte: windowStart } },   })   const flagFired = recentCount >= FLAG_THRESHOLD    if (flagFired) {     await db.contentRadarFlag.upsert({       where: { sourcePage_windowStart: { sourcePage: source_page, windowStart } },       create: { sourcePage: source_page, windowStart, questionCount: recentCount, status: 'pending' },       update: { questionCount: recentCount },     })   }    return json({ received: true, flagFired }) } |
| --- |

 

**12.  Supporting Files**

 

**12.1  resolve.ts — src/lib/server/profiles/resolve.ts**

| // src/lib/server/profiles/resolve.ts  import { db } from '$lib/server/db' import type { PixelEvent } from '$lib/server/persona/types'  export async function resolveProfile(event: PixelEvent): Promise<string> {   const { anonymousId } = event    if (!anonymousId) {     const p = await db.visitorProfile.create({ data: {       clientId: event.clientId, firstSeenAt: new Date(),       lastSeenAt: new Date(), sessionCount: 1, personaSignalCount: 0,     }})     return p.id   }    const existing = await db.visitorProfile.findFirst({ where: { anonymousId } })   if (existing) {     await db.visitorProfile.update({       where: { id: existing.id }, data: { lastSeenAt: new Date() }     })     return existing.id   }    const p = await db.visitorProfile.create({ data: {     anonymousId, clientId: event.clientId, firstSeenAt: new Date(),     lastSeenAt: new Date(), sessionCount: 1, personaSignalCount: 0,   }})   return p.id } |
| --- |

 

**12.2  update.ts — src/lib/server/scoring/update.ts**

| // src/lib/server/scoring/update.ts  import { db } from '$lib/server/db' import type { PixelEvent } from '$lib/server/persona/types'  const BUCKET_PRIORITY: Record<string, number> = {   emergency: 0, active_project: 1, comparison: 2, research: 3, unclassified: 4, }  export async function updateBucketAndScore(   profileId: string, event: PixelEvent ): Promise<void> {   const profile = await db.visitorProfile.findUnique({     where: { id: profileId }, select: { scoreRaw: true, bucket: true },   })   if (!profile) return    const currentScore   = Number(profile.scoreRaw ?? 0)   const currentBucket  = profile.bucket ?? 'unclassified'   const newScore       = Math.min(currentScore + (event.delta ?? 0), 100)   const incomingBucket = event.bucket ?? 'unclassified'   const newBucket      = (BUCKET_PRIORITY[incomingBucket] ?? 4) < (BUCKET_PRIORITY[currentBucket] ?? 4)                        ? incomingBucket : currentBucket    await db.visitorProfile.update({     where: { id: profileId },     data: { scoreRaw: newScore, bucket: newBucket, lastSeenAt: new Date() },   }) } |
| --- |

 

**12.3  enrichWithFsa.ts — src/lib/server/profiles/enrichWithFsa.ts**

| // src/lib/server/profiles/enrichWithFsa.ts // Called non-blocking after profile resolve. Fires once per profile.  import { db } from '$lib/server/db' import type { PixelEvent } from '$lib/server/persona/types'  export async function enrichWithFsa(   profileId: string, postalCode: string │ null ): Promise<void> {   if (!postalCode) return   const fsa = postalCode.replace(/\s/g, '').substring(0, 3).toUpperCase()   if (!/^[A-Z]\d[A-Z]$/.test(fsa)) return    const profile = await db.visitorProfile.findUnique({     where: { id: profileId }, select: { fsaCode: true },   })   if (!profile ││ profile.fsaCode) return  // Already enriched    const census = await db.fsaCensusReference.findUnique({ where: { fsaCode: fsa } })   if (!census) return    await db.visitorProfile.update({     where: { id: profileId },     data: {       fsaCode:             fsa,       fsaMedianIncome:     census.medianHouseholdIncome,       fsaPctOwnerOccupied: census.pctOwnerOccupied ? Number(census.pctOwnerOccupied) : null,       fsaPctDetached:      census.pctDetached       ? Number(census.pctDetached)      : null,       fsaMedianAge:        census.medianAge          ? Number(census.medianAge)        : null,     },   })   await fireFsaSignals(profileId, census) }  async function fireFsaSignals(profileId: string, census: any): Promise<void> {   const { inferPersona } = await import('$lib/server/persona/inferPersona')   const SID = 'fsa_enrichment'   const e = (type: string): PixelEvent => ({     type, sessionId: SID, pageUrl: '', clientId: '',     bucket: '', delta: 0, score: 0, timestamp: new Date().toISOString(),   })   const income = census.medianHouseholdIncome   const owner  = Number(census.pctOwnerOccupied ?? 0)   const age    = Number(census.medianAge ?? 0)   const couple = Number(census.pctCoupleFamily ?? 0)   const hh     = Number(census.avgHouseholdSize ?? 0)    if (income !== null) {     if (income >= 85000)     await inferPersona(profileId, SID, e('fsa_median_income_high'))     else if (income < 55000) await inferPersona(profileId, SID, e('fsa_median_income_low'))   }   if (owner  >= 70) await inferPersona(profileId, SID, e('fsa_pct_owner_over_70'))   if (age    >= 50) await inferPersona(profileId, SID, e('fsa_median_age_over_50'))   else if (age < 35) await inferPersona(profileId, SID, e('fsa_median_age_under_35'))   if (couple >= 60) await inferPersona(profileId, SID, e('fsa_pct_couple_over_60'))   if (hh     >= 3)  await inferPersona(profileId, SID, e('fsa_avg_household_over_3')) } |
| --- |

 

**13.  Database Verification Queries**

 

| -- Step 1: FSA data loaded SELECT COUNT(*) FROM fsa_census_reference; -- Must return ~1,630  SELECT fsa_code, median_household_income, pct_owner_occupied, median_age FROM fsa_census_reference WHERE fsa_code IN ('P4N','P4P','P4R') ORDER BY fsa_code; -- All three rows present, median_household_income not null  -- Step 2: All 13 persona + FSA columns present SELECT column_name FROM information_schema.columns WHERE table_name='visitor_profiles' AND (column_name LIKE 'persona_%' OR column_name LIKE 'fsa_%') ORDER BY column_name; -- Must return 15 rows  -- Step 3: All 4 indexes present SELECT indexname FROM pg_indexes WHERE tablename='persona_signal_log'; -- Must return 4 indexes  -- Step 6: Persona inference running SELECT persona_property, persona_property_conf, persona_signal_count FROM visitor_profiles WHERE id='<test_profile_id>'; -- After fotojobber_submit: persona_property='house', conf >= 0.22  -- Confidence cap enforcement — MUST return 0 SELECT COUNT(*) FROM visitor_profiles WHERE persona_age_conf > 0.650 OR persona_income_conf > 0.600;  -- Double-count prevention — MUST return 0 rows SELECT profile_id, session_id, pixel_event_type, dimension, COUNT(*) AS cnt FROM persona_signal_log GROUP BY profile_id, session_id, pixel_event_type, dimension HAVING COUNT(*) > 1;  -- Audit contradiction resets SELECT profile_id, dimension, prior_classification, classification,   confidence_delta, created_at FROM persona_signal_log WHERE classification_changed=TRUE ORDER BY created_at DESC LIMIT 20; |
| --- |

 

**14.  QA — Four Mandatory Scenarios**

 

**All four must pass before production sign-off. Run in order.**

| **Scenario** | **What to verify** |
| --- | --- |
| Load /about | page_load fires. Delta +4. Comparison bucket. Score increments. No Emergency. |
| Load /reviews — wait 60 seconds | Comparison on load. dwell_60 fires at 60s. Bucket does not downgrade. Score increments. |
| Load /specials — submit appointment form | Comparison on load. spl_apt_submit fires +20. Bucket escalates to Active Project. |
| Navigate to /burst-pipe | Emergency bucket fires on page_load before any scroll. Delta +20. Bucket locked — never downgrades. Emergency CTA shown. personaModifier on CTA is null — never touched by persona. |

 

 

ClearSky Software  ·  Developer Roadmap Session 9 — SvelteKit  ·  May 2026  ·  r.dredhart@clearskysoftware.net