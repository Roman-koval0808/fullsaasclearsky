/**
 * ContentRadar — Method 3 Pure Claude Scoring Functions
 *
 * 14 signals requiring holistic content judgment.
 * No deterministic gate can substitute for reading and understanding.
 *
 * PROMPT ENGINEERING PATTERN (applied to every signal):
 *   1. Role framing    — who Claude is acting as
 *   2. Scenario        — specific situation being evaluated
 *   3. Sub-questions   — specific measurable criteria broken into yes/no checks
 *   4. Scoring rubric  — explicit 0/1/2/3 criteria matching the spec exactly
 *   5. Output format   — locked JSON schema, no deviation allowed
 *
 * CRITICAL RULE: Claude is never asked "is this good?"
 * Claude is always asked specific sub-questions that map to scoring criteria.
 * Holistic judgment emerges from specific questions — not from vague prompts.
 *
 * Each function:
 *   async scoreS{N}_{Name}(content, context, claudeClient)
 *
 * Returns:
 * {
 *   signal:  number,
 *   score:   0|1|2|3,
 *   note:    string,
 *   method:  'pure_claude',
 *   claudeCalled: bool,
 *   subScores: object,   // The individual sub-question answers
 *   inputs:  object,
 * }
 */

'use strict';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 200;

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
// Shared system prompt for all Method 3 signals.

const SYSTEM_PROMPT = `You are a ContentRadar signal scorer. You evaluate contractor digital presence objectively and consistently.

You will be given website content and a set of specific sub-questions to answer.
Answer each sub-question honestly based only on what appears in the content provided.
Do not infer or assume — if something is not stated, it is not present.

Respond ONLY with valid JSON matching the exact schema requested. No other text.`;

// ─── CLAUDE CALLER ────────────────────────────────────────────────────────────

async function callClaude(client, prompt, signalNum) {
  if (!client) {
    return { score: -1, note: 'Claude not called — no client provided.', subScores: {}, claudeCalled: false };
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '';
    const parsed = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}');

    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 3) {
      return { score: 0, note: 'Score parse error.', subScores: parsed, claudeCalled: true };
    }

    return {
      score: parsed.score,
      note: parsed.note || '',
      subScores: parsed.subScores || {},
      claudeCalled: true,
    };
  } catch (err) {
    return { score: 0, note: `Claude error: ${err.message}`, subScores: {}, claudeCalled: true };
  }
}

function result(signal, claudeResult, inputs) {
  return {
    signal,
    score: claudeResult.score,
    note: claudeResult.note,
    method: 'pure_claude',
    claudeCalled: claudeResult.claudeCalled,
    subScores: claudeResult.subScores,
    inputs,
  };
}

// ─── SIGNAL 1: Value Proposition Clarity ──────────────────────────────────────

async function scoreS1_ValueProp(content, context, claude) {
  const { trade = 'plumbing', city = '' } = context;
  const inputs = { trade, city };

  const prompt = `You are evaluating the homepage of a ${trade} contractor${city ? ` in ${city}` : ''}.

HOMEPAGE CONTENT:
${content.substring(0, 3000)}

Answer these sub-questions based ONLY on what appears above the fold (headline area) of the homepage:

{
  "subScores": {
    "tradeIdentifiable": <true if the specific trade (${trade}) is clear within the first headline or subheadline — not buried in body text>,
    "locationPresent": <true if a specific city, region, or area name appears in the headline area>,
    "differentiatorPresent": <true if there is a specific differentiator beyond "quality service" or "local contractor" — e.g. years in business, response time, specific guarantee>,
    "differentiatorSpecific": <true if the differentiator is accountable and specific — "2-hour response" beats "fast response">
  },
  "score": <0 if tradeIdentifiable is false | 1 if trade visible but below headline or no location | 2 if trade+location+generic differentiator | 3 if all four true>,
  "note": "<one sentence under 20 words explaining the score>"
}`;

  const res = await callClaude(claude, prompt, 1);
  return result(1, res, inputs);
}

// ─── SIGNAL 2: Brand Promise & Trust Statement ────────────────────────────────

async function scoreS2_BrandPromise(content, context, claude) {
  const { trade = 'plumbing' } = context;
  const inputs = { trade };

  const prompt = `You are evaluating the homepage and about page of a ${trade} contractor.

CONTENT:
${content.substring(0, 3500)}

Answer these sub-questions about the brand promise and trust statement:

{
  "subScores": {
    "promiseExists": <true if there is any stated promise or commitment — even vague>,
    "beyondGeneric": <true if the promise goes beyond "quality work, great service, call us today">,
    "specificCommitment": <true if there is a concrete accountable commitment — response time, specific guarantee, named fee policy, clean jobsite promise>,
    "ownablePromise": <true if this promise is specific enough that a competitor couldn't copy it word for word>
  },
  "score": <0 if promiseExists is false | 1 if promise exists but generic only | 2 if beyondGeneric and specificCommitment but not fully ownable | 3 if all four true>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 2);
  return result(2, res, inputs);
}

// ─── SIGNAL 3: People & Credibility ───────────────────────────────────────────

async function scoreS3_People(content, context, claude) {
  const { trade = 'plumbing' } = context;
  const inputs = { trade };

  const prompt = `You are evaluating the about and team pages of a ${trade} contractor.

CONTENT:
${content.substring(0, 3500)}

The four trust dimensions for a trades contractor are:
1. Competence — qualifications, experience, trade knowledge
2. Reliability — showing up, following through, consistency
3. Local roots — community connection, how long in the area
4. Personality — human, approachable, someone you'd let into your home

{
  "subScores": {
    "realPhotoPresent": <true if a genuine photo of the owner or team appears — not stock imagery>,
    "ownerNamedWithContext": <true if the owner or key team member is named with more than just credentials>,
    "competenceDimension": <true if trade competence is established — years experience, qualifications, specific trade background>,
    "localRootsDimension": <true if local community connection is established — how long in area, community involvement>,
    "personalityDimension": <true if personality comes through — the content reads like a real person, not a corporate bio>,
    "reliabilityDimension": <true if reliability is established — track record, specific commitments, repeat customer references>
  },
  "score": <0 if realPhotoPresent is false | 1 if photo+name but only competence dimension | 2 if photo+name+2 dimensions | 3 if photo+name+all 4 dimensions present>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 3);
  return result(3, res, inputs);
}

// ─── SIGNAL 4: Process Transparency ───────────────────────────────────────────

async function scoreS4_Process(content, context, claude) {
  const { trade = 'plumbing' } = context;
  const inputs = { trade };

  const prompt = `You are evaluating the website of a ${trade} contractor for process transparency.

CONTENT:
${content.substring(0, 3500)}

A homeowner calling a ${trade} contractor for the first time has these specific anxieties:
— What happens when I call? How long until someone arrives?
— How does pricing work? Will I be surprised by the bill?
— How long will the work take? Will they leave a mess?
— What if something goes wrong after the job?

{
  "subScores": {
    "processExists": <true if any process steps are described — even vaguely>,
    "stepsIdentifiable": <true if specific steps are named — call, assessment, quote, schedule, work, follow-up>,
    "timelineCommitment": <true if any timing expectation is set — response time, appointment window, job duration>,
    "anxietyReducing": <true if the process description would actually reduce a first-time caller's anxiety — plain language, reassuring tone, trade-specific detail>,
    "tradeSpecific": <true if the process feels specific to ${trade} rather than generic "contact us → we help you" language>
  },
  "score": <0 if processExists is false | 1 if process exists but buried or generic | 2 if stepsIdentifiable and timelineCommitment but not anxiety-reducing | 3 if all 5 true>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 4);
  return result(4, res, inputs);
}

// ─── SIGNAL 5: Service Area Clarity ───────────────────────────────────────────

async function scoreS5_ServiceArea(content, context, claude) {
  const { city = '', protectedMarketCommunities = [] } = context;
  const inputs = { city, communityCount: protectedMarketCommunities.length };

  const prompt = `You are evaluating the website of a contractor${city ? ` based in ${city}` : ''}.

CONTENT:
${content.substring(0, 3500)}

${protectedMarketCommunities.length > 0
  ? `The contractor's protected market includes these communities: ${protectedMarketCommunities.join(', ')}.`
  : 'The protected market is approximately 100km radius.'}

{
  "subScores": {
    "serviceAreaMentioned": <true if any geographic service area is mentioned at all>,
    "specificCommunitiesNamed": <true if specific city, town, or community names are listed — not just "local area">,
    "primaryCityExplicit": <true if the primary city (${city || 'main city'}) is explicitly named>,
    "surroundingCommunitiesListed": <true if multiple communities beyond the primary city are listed>,
    "serviceAreaPageExists": <true if a dedicated service area page or section exists>,
    "coverageImmediatelyConfirmable": <true if a visitor from a surrounding community could confirm coverage in under 10 seconds>
  },
  "score": <0 if serviceAreaMentioned is false | 1 if vague reference only | 2 if primary city + some surrounding areas | 3 if full protected market named with service area page>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 5);
  return result(5, res, inputs);
}

// ─── SIGNAL 9: Pricing Transparency ───────────────────────────────────────────

async function scoreS9_Pricing(content, context, claude) {
  const { trade = 'plumbing' } = context;
  const inputs = { trade };

  const prompt = `You are evaluating the pricing transparency on a ${trade} contractor's website.

CONTENT:
${content.substring(0, 3500)}

{
  "subScores": {
    "pricingMentioned": <true if pricing is mentioned at all>,
    "beyondVague": <true if pricing language goes beyond "competitive rates" or "call for a quote">,
    "estimateProcessExplained": <true if the estimate process is described — what happens when you request a quote>,
    "serviceCallFeeNamed": <true if a diagnostic, service call, or assessment fee is specifically named>,
    "priceRangesGiven": <true if any actual price ranges are given for common services>,
    "noSurpriseCommitment": <true if there is any promise around transparent or upfront pricing — "no surprise billing", "price before we start">
  },
  "score": <0 if pricingMentioned is false | 1 if vague only — competitive rates, call for quote | 2 if estimateProcessExplained and serviceCallFeeNamed | 3 if priceRangesGiven and noSurpriseCommitment and estimateProcessExplained>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 9);
  return result(9, res, inputs);
}

// ─── SIGNAL 10: Credentials & Licensing Visibility ────────────────────────────

async function scoreS10_Credentials(content, context, claude) {
  const { trade = 'plumbing' } = context;
  const inputs = { trade };

  const tradeCredentials = {
    plumbing:   'Master Plumber licence, WSIB, liability insurance, PHCC membership',
    hvac:       'TSSA certification, HRAI membership, manufacturer certifications (Carrier, Lennox, Trane), WSIB, liability insurance',
    electrical: 'ESA licence, ECRA contractor licence, WSIB, liability insurance, ESA inspection authority',
    roofing:    'CRCA membership, manufacturer certifications (IKO, GAF, CertainTeed), WSIB, liability insurance',
  };

  const prompt = `You are evaluating the credentials display on a ${trade} contractor's website.

Relevant credentials for ${trade}: ${tradeCredentials[trade] || 'trade licences, WSIB, liability insurance'}

CONTENT:
${content.substring(0, 3500)}

{
  "subScores": {
    "anyCredentialsMentioned": <true if any credentials, licensing, or insurance is mentioned>,
    "specificCredentialNamed": <true if at least one specific credential is named — not just "licensed and insured">,
    "wsibMentioned": <true if WSIB clearance is specifically mentioned>,
    "tradeSpecificCredential": <true if a trade-specific credential is named — e.g. for ${trade}: ${tradeCredentials[trade]?.split(',')[0] || 'trade licence'}>,
    "logosOrBadgesDisplayed": <true if credential logos, badges, or certificate images are described or referenced>,
    "multiplePageVisibility": <true if credentials appear on more than one page — homepage, footer, about, AND service pages>
  },
  "score": <0 if anyCredentialsMentioned is false | 1 if mentioned in text only with no specifics | 2 if specificCredentialNamed and wsibMentioned and tradeSpecificCredential | 3 if all 6 true>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 10);
  return result(10, res, inputs);
}

// ─── SIGNAL 43: Geographic Search Visibility ──────────────────────────────────

async function scoreS43_GeoVisibility(content, context, claude) {
  const { trade = 'plumbing', city = '', communitiesRanking = [],
          totalCommunities = 0 } = context;
  const inputs = { trade, city, communitiesRanking: communitiesRanking.slice(0, 5), totalCommunities };

  const prompt = `You are evaluating the geographic search visibility of a ${trade} contractor${city ? ` in ${city}` : ''}.

SERP AND CONTENT DATA:
${content.substring(0, 2500)}

Communities in protected market: ${totalCommunities}
Communities where contractor appears in Map Pack top 3: ${communitiesRanking.filter(c => c.position <= 3).length} (${communitiesRanking.filter(c=>c.position<=3).map(c=>c.name).join(', ') || 'none confirmed'})
Communities checked: ${communitiesRanking.map(c => `${c.name} (pos ${c.position || 'absent'})`).join(', ') || 'not yet checked'}

{
  "subScores": {
    "primaryCityVisible": <true if contractor appears in Map Pack for primary city trade searches>,
    "surroundingCitiesVisible": <true if contractor appears in any surrounding community searches>,
    "halfMarketCovered": <true if contractor appears top 3 in at least 50% of communities checked>,
    "fullMarketCovered": <true if contractor appears top 3 across virtually all communities in protected market>,
    "serviceAreaContentSupports": <true if website has community-specific content that would support ranking in those communities>
  },
  "score": <0 if primaryCityVisible is false | 1 if primary city only | 2 if halfMarketCovered | 3 if fullMarketCovered and serviceAreaContentSupports>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 43);
  return result(43, res, inputs);
}

// ─── SIGNAL 48: AI Authority ───────────────────────────────────────────────────

async function scoreS48_AIAuthority(content, context, claude) {
  const { trade = 'plumbing', city = '', chatgptMentioned = false,
          geminiMentioned = false, perplexityMentioned = false,
          queriesRun = 0 } = context;
  const inputs = { trade, city, chatgptMentioned, geminiMentioned, perplexityMentioned, queriesRun };

  const prompt = `You are evaluating the AI search authority of a ${trade} contractor${city ? ` in ${city}` : ''}.

AI PLATFORM QUERY RESULTS (from live queries to ChatGPT, Gemini, Perplexity):
${content.substring(0, 2500)}

Contractor appeared in ChatGPT responses: ${chatgptMentioned}
Contractor appeared in Gemini responses: ${geminiMentioned}
Contractor appeared in Perplexity responses: ${perplexityMentioned}
Total queries run across platforms: ${queriesRun}

{
  "subScores": {
    "appearsForBrandedQuery": <true if contractor appears when their business name is queried>,
    "appearsForTradeQuery": <true if contractor appears for "best ${trade} in ${city || 'their city'}" type queries>,
    "appearsOnMultiplePlatforms": <true if contractor appears on 2 or more AI platforms>,
    "consistentlyFirstMentioned": <true if contractor is the first or only contractor mentioned across multiple query variations>
  },
  "score": <0 if appearsForBrandedQuery is false | 1 if branded query only | 2 if appearsForTradeQuery on at least 1 platform | 3 if appearsOnMultiplePlatforms and appearsForTradeQuery consistently>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 48);
  return result(48, res, inputs);
}

// ─── SIGNAL 49: AI Citation Readiness ─────────────────────────────────────────

async function scoreS49_AICitationReadiness(content, context, claude) {
  const { trade = 'plumbing', hasSchema = false, faqCount = 0,
          qaCount = 0 } = context;
  const inputs = { trade, hasSchema, faqCount, qaCount };

  const prompt = `You are evaluating how well a ${trade} contractor's digital content is structured for AI platform citation.

AI platforms (ChatGPT, Gemini, Perplexity) prefer to cite content that is: structured, specific, authoritative, and answers real questions directly.

WEBSITE AND GBP CONTENT:
${content.substring(0, 3500)}

Schema markup present: ${hasSchema}
FAQ questions on website: ${faqCount}
GBP Q&A entries: ${qaCount}

{
  "subScores": {
    "structuredContentExists": <true if the website has structured Q&A, FAQ, or schema that AI can parse>,
    "specificAnswersToTradeQuestions": <true if the content directly answers specific trade questions — costs, timelines, process, emergency response>,
    "authoritySignalsPresent": <true if credentials, reviews, and trade associations are clearly stated and structured>,
    "faqOrQASubstantial": <true if FAQ or GBP Q&A covers 10+ real homeowner questions with substantive answers>,
    "contentStructuredForAIParsing": <true if schema markup, structured headings, and clear Q&A format make this content easy for AI to extract and cite>
  },
  "score": <0 if structuredContentExists is false | 1 if basic structure only | 2 if specificAnswersToTradeQuestions and authoritySignalsPresent | 3 if all 5 true>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 49);
  return result(49, res, inputs);
}

// ─── SIGNAL 50: AI Share of Voice ─────────────────────────────────────────────

async function scoreS50_AIShareOfVoice(content, context, claude) {
  const { trade = 'plumbing', city = '', contractorMentionCount = 0,
          competitorMentionCount = 0, totalQueriesRun = 0 } = context;
  const inputs = { trade, city, contractorMentionCount, competitorMentionCount, totalQueriesRun };

  const prompt = `You are evaluating AI share of voice for a ${trade} contractor${city ? ` in ${city}` : ''}.

AI QUERY RESULTS:
${content.substring(0, 2500)}

This contractor mentioned in AI responses: ${contractorMentionCount} times across ${totalQueriesRun} queries
Competitors mentioned more frequently: ${competitorMentionCount} competitor mentions

{
  "subScores": {
    "appearsAtAll": <true if contractor appears in any AI response>,
    "asFrequentAsCompetitors": <true if contractor appears as often as the most frequently mentioned competitor>,
    "dominatesResponses": <true if contractor appears in the majority of relevant query responses>,
    "exclusiveMentions": <true if some query responses mention only this contractor with no competitors>
  },
  "score": <0 if appearsAtAll is false | 1 if appears but competitors mentioned more | 2 if asFrequentAsCompetitors | 3 if dominatesResponses or exclusiveMentions>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 50);
  return result(50, res, inputs);
}

// ─── SIGNAL 55: Click-to-Call Above the Fold ──────────────────────────────────

async function scoreS55_ClickToCall(content, context, claude) {
  const { hasTelLink = false, phoneInHeader = false,
          stickyMobileHeader = false, emergencyCTA = false } = context;
  const inputs = { hasTelLink, phoneInHeader, stickyMobileHeader, emergencyCTA };

  const prompt = `You are evaluating click-to-call accessibility for a contractor website — specifically from the perspective of a homeowner on a mobile phone with a plumbing emergency.

WEBSITE CONTENT:
${content.substring(0, 2500)}

Technical checks already performed:
- Phone number is a clickable tel: link: ${hasTelLink}
- Phone number appears in header: ${phoneInHeader}
- Sticky/persistent mobile header detected: ${stickyMobileHeader}
- Emergency-specific CTA present: ${emergencyCTA}

{
  "subScores": {
    "phoneImmediatelyVisible": <true if phone number is visible above the fold without scrolling — based on content structure>,
    "clickToCallEnabled": <true — already confirmed: ${hasTelLink}>,
    "persistentOnScroll": <true if phone or call button remains accessible while scrolling>,
    "emergencyFraming": <true if the call CTA communicates emergency availability — "Call Now 24/7" or equivalent>,
    "mobileOptimised": <true if the contact pathway appears optimised for a thumb-press on mobile — prominent, high contrast, large tap target>
  },
  "score": <0 if clickToCallEnabled is false | 1 if tel link exists but not above fold or not prominent | 2 if phoneImmediatelyVisible and clickToCallEnabled but no emergency framing | 3 if all 5 true>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 55);
  return result(55, res, inputs);
}

// ─── SIGNAL 56: Emergency Pathway Clarity ─────────────────────────────────────

async function scoreS56_EmergencyPathway(content, context, claude) {
  const { trade = 'plumbing' } = context;
  const inputs = { trade };

  const emergencyUrgency = {
    plumbing:   'burst pipe, flooded basement, no hot water, sewer backup',
    hvac:       'no heat in winter, no AC in summer, furnace failure, carbon monoxide concern',
    electrical: 'power outage, electrical fire risk, tripped breaker will not reset, sparks',
    roofing:    'active leak, storm damage, structural concern, insurance claim needed',
  };

  const prompt = `You are evaluating the emergency pathway clarity for a ${trade} contractor — from the perspective of a homeowner who has just experienced: ${emergencyUrgency[trade] || 'an urgent trade emergency'}.

The homeowner is on their phone, stressed, needs help NOW. They have 10 seconds to decide whether to call this contractor.

WEBSITE CONTENT:
${content.substring(0, 3500)}

{
  "subScores": {
    "emergencyMentionedProminently": <true if emergency availability is visible without scrolling on homepage>,
    "responseTimeCommitted": <true if a specific response time is committed — not vague "fast response" but "within X hours" or "same day">,
    "afterHoursExplicit": <true if 24/7 or after-hours availability is clearly stated>,
    "tradeSpecificEmergencyLanguage": <true if the emergency content references the specific ${trade} emergency scenarios — not generic "we can help">,
    "emergencyPageOrSection": <true if a dedicated emergency page or section exists beyond a general homepage mention>,
    "callToActionImmediatelyActionable": <true if the stressed homeowner would know exactly what to do next within 10 seconds>
  },
  "score": <0 if emergencyMentionedProminently is false | 1 if mentioned but not prominent or vague | 2 if afterHoursExplicit and callToActionImmediatelyActionable but no response time | 3 if all 6 true>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 56);
  return result(56, res, inputs);
}

// ─── SIGNAL 58: After-Hours Availability Signal ────────────────────────────────

async function scoreS58_AfterHours(content, context, claude) {
  const { trade = 'plumbing', gbpHours = '' } = context;
  const inputs = { trade, gbpHours };

  const prompt = `You are evaluating how clearly a ${trade} contractor communicates after-hours availability.

GBP Hours: ${gbpHours || 'not provided'}

WEBSITE CONTENT:
${content.substring(0, 3000)}

{
  "subScores": {
    "afterHoursMentioned": <true if any after-hours or extended availability is mentioned>,
    "specificHoursOrAvailability": <true if specific hours are named — "7 days a week", "evenings and weekends", "24/7" etc>,
    "emergencyLineDistinct": <true if an emergency or after-hours contact method is distinct from the main business number>,
    "responseTimeForAfterHours": <true if a response time commitment for after-hours calls is stated>,
    "gbpConfiguredForAfterHours": <true if GBP shows 24-hour or extended hours that match the website claims>
  },
  "score": <0 if afterHoursMentioned is false | 1 if mentioned vaguely only | 2 if specificHoursOrAvailability stated | 3 if specificHoursOrAvailability and responseTimeForAfterHours and gbpConfiguredForAfterHours>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 58);
  return result(58, res, inputs);
}

// ─── SIGNAL 59: Response Time Commitment ──────────────────────────────────────

async function scoreS59_ResponseTime(content, context, claude) {
  const { trade = 'plumbing' } = context;
  const inputs = { trade };

  const prompt = `You are evaluating how specifically a ${trade} contractor commits to response times across all their digital touchpoints.

WEBSITE AND PLATFORM CONTENT:
${content.substring(0, 3000)}

{
  "subScores": {
    "anyResponseTimeStated": <true if any response time is mentioned at all>,
    "specificTimeCommitted": <true if a specific time is named — "within 2 hours", "same day", "within 15 minutes for emergencies" — not vague "quickly" or "promptly">,
    "differentiatedByIntentType": <true if different response times are given for emergency vs routine requests>,
    "committedAcrossMultipleChannels": <true if the response time commitment appears on website AND GBP or Facebook — not just one place>,
    "accountableLanguage": <true if the commitment uses accountable language — "we guarantee", "or we'll" — not hedged with "we try to">
  },
  "score": <0 if anyResponseTimeStated is false | 1 if vague only — promptly, quickly | 2 if specificTimeCommitted but single channel only | 3 if specificTimeCommitted and differentiatedByIntentType and committedAcrossMultipleChannels>,
  "note": "<one sentence under 20 words>"
}`;

  const res = await callClaude(claude, prompt, 59);
  return result(59, res, inputs);
}

// ─── BATCH RUNNER ─────────────────────────────────────────────────────────────

/**
 * Run all 14 Method 3 scoring functions.
 * Returns array of score objects. All Claude calls run in parallel.
 *
 * @param {Object} data
 * @param {Object} data.content     — page content sections from pageFetcher
 * @param {Object} data.context     — per-signal context objects
 * @param claudeClient              — Anthropic client instance
 */
async function scoreAllMethod3(data, claudeClient = null) {
  const { content = {}, context = {} } = data;

  const combined = [
    content.homepage,
    content.about,
    content.services,
    content.process,
  ].filter(Boolean).join('\n\n--- PAGE BREAK ---\n\n').substring(0, 6000);

  const scorers = [
    () => scoreS1_ValueProp(content.homepage || combined, context.s1 || {}, claudeClient),
    () => scoreS2_BrandPromise(content.homepage || combined, context.s2 || {}, claudeClient),
    () => scoreS3_People(content.about || combined, context.s3 || {}, claudeClient),
    () => scoreS4_Process(content.process || combined, context.s4 || {}, claudeClient),
    () => scoreS5_ServiceArea(content.service_area || combined, context.s5 || {}, claudeClient),
    () => scoreS9_Pricing(content.pricing || content.services || combined, context.s9 || {}, claudeClient),
    () => scoreS10_Credentials(combined, context.s10 || {}, claudeClient),
    () => scoreS43_GeoVisibility(content.serp || combined, context.s43 || {}, claudeClient),
    () => scoreS48_AIAuthority(content.ai_queries || '', context.s48 || {}, claudeClient),
    () => scoreS49_AICitationReadiness(combined, context.s49 || {}, claudeClient),
    () => scoreS50_AIShareOfVoice(content.ai_queries || '', context.s50 || {}, claudeClient),
    () => scoreS55_ClickToCall(content.homepage || combined, context.s55 || {}, claudeClient),
    () => scoreS56_EmergencyPathway(content.homepage || combined, context.s56 || {}, claudeClient),
    () => scoreS58_AfterHours(content.homepage || combined, context.s58 || {}, claudeClient),
    () => scoreS59_ResponseTime(combined, context.s59 || {}, claudeClient),
  ];

  // All Claude calls fire simultaneously
  return Promise.all(scorers.map(fn => fn()));
}

module.exports = {
  scoreAllMethod3,
  // Individual exports for testing
  scoreS1_ValueProp, scoreS2_BrandPromise, scoreS3_People,
  scoreS4_Process, scoreS5_ServiceArea, scoreS9_Pricing,
  scoreS10_Credentials, scoreS43_GeoVisibility,
  scoreS48_AIAuthority, scoreS49_AICitationReadiness, scoreS50_AIShareOfVoice,
  scoreS55_ClickToCall, scoreS56_EmergencyPathway,
  scoreS58_AfterHours, scoreS59_ResponseTime,
};


// ─── TEST (no Claude — verifies function structure) ────────────────────────────
if (require.main === module) {
  const testData = {
    content: {
      homepage: `TIMMINS BEST PLUMBING — Emergency Plumber Timmins ON
Call now: (705) 555-1234 — We answer 24/7 including weekends and holidays.
Burst pipe? Frozen pipes? Sewer backup? We're there in 60 minutes or less — guaranteed.
Serving Timmins, Porcupine, South Porcupine, Schumacher, Mountjoy, and all communities within 100km.
Licensed Master Plumbers. WSIB covered. $2M liability insurance. PHCC members.`,

      about: `Meet Dave Korhonen — Timmins native, Master Plumber since 1998.
Dave grew up watching his dad fix frozen pipes every February in Mountjoy. 
That's 26 years of Northern Ontario winters. He knows what happens when a pipe bursts at 2am.
When Dave isn't under someone's sink, he's coaching bantam hockey at McIntyre Arena.
Every tech on our crew is licensed, WSIB-covered, and background-checked.
We show up when we say we will. We clean up before we leave. We charge what we quoted.`,

      services: `Our process: 1) Call us — we answer 24/7. 2) We arrive within 60 minutes for emergencies, same day for routine service. 3) We assess and give you a firm quote before touching anything. 4) We do the work. You watch if you want. 5) We clean up. We test everything. We leave a clean jobsite. 6) You get a 2-year parts and labour warranty. Emergency diagnostic fee: $89. Waived if you proceed with repair.`,

      pricing: `Pricing at Timmins Best Plumbing: Emergency diagnostic fee $89 — waived if you proceed with repair. Drain cleaning from $149. Water heater installation from $899 installed. We quote before we start. No surprise billing — ever. Financing available through Financeit for jobs over $1,000.`,

      faq: `How fast can you get here in an emergency? Within 60 minutes guaranteed or your diagnostic fee is free. Do you charge extra for after-hours calls? No — same rate 24/7. Are you licensed? Yes — Master Plumber licence #MP-12847. Are you WSIB covered? Yes. Do you offer free estimates? Yes for non-emergency work. What areas do you serve? Timmins and all communities within 100km including Porcupine, Schumacher, Mountjoy, Gogama, Chapleau.`,
    },
    context: {
      s1:  { trade: 'plumbing', city: 'Timmins' },
      s2:  { trade: 'plumbing' },
      s3:  { trade: 'plumbing' },
      s4:  { trade: 'plumbing' },
      s5:  { city: 'Timmins', protectedMarketCommunities: ['Timmins','Porcupine','Schumacher','Mountjoy','Gogama','Chapleau'] },
      s9:  { trade: 'plumbing' },
      s10: { trade: 'plumbing' },
      s43: { trade: 'plumbing', city: 'Timmins', communitiesRanking: [
               {name:'Timmins',position:1},{name:'Porcupine',position:2},{name:'Schumacher',position:3},
               {name:'Mountjoy',position:1},{name:'Gogama',position:4}], totalCommunities: 8 },
      s48: { trade: 'plumbing', city: 'Timmins', chatgptMentioned: true, geminiMentioned: false, perplexityMentioned: true, queriesRun: 9 },
      s49: { trade: 'plumbing', hasSchema: true, faqCount: 22, qaCount: 12 },
      s50: { trade: 'plumbing', city: 'Timmins', contractorMentionCount: 6, competitorMentionCount: 2, totalQueriesRun: 9 },
      s55: { hasTelLink: true, phoneInHeader: true, stickyMobileHeader: true, emergencyCTA: true },
      s56: { trade: 'plumbing' },
      s58: { trade: 'plumbing', gbpHours: 'Open 24 hours — 7 days a week' },
      s59: { trade: 'plumbing' },
    },
  };

  console.log('\n─── Method 3 Structure Test (no Claude — returns score -1) ───\n');
  scoreAllMethod3(testData, null).then(scores => {
    scores.forEach(s => {
      const status = s.score === -1 ? '⏸ PENDING CLAUDE' : `[${s.score}/3]`;
      console.log(`S${String(s.signal).padStart(2,'0')} ${status}  ${s.note}`);
    });
    console.log(`\n${scores.length} Method 3 functions structured correctly.`);
    console.log('Pass claudeClient to get real scores — all calls run in parallel.');
  });
}
