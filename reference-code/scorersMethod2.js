/**
 * ContentRadar — Method 2 Scoring Functions
 * Rules gate + Claude quality assessment
 *
 * 28 signals. Two-stage pattern for every signal:
 *   Stage 1 — Gate (deterministic): checks existence and volume.
 *             Returns score 0 or 1 immediately. Claude NOT called.
 *   Stage 2 — Claude (quality): activates only when gate passes.
 *             Claude assesses quality, returns score 2 or 3.
 *
 * This pattern keeps Claude API costs low — Claude is only called
 * when there is something worth evaluating.
 *
 * Each function signature:
 *   async scoreS{N}_{Name}(content, context, claudeClient)
 *
 * Parameters:
 *   content       — relevant page text from pageFetcher.js
 *   context       — structured data (counts, dates, API data)
 *   claudeClient  — Anthropic client instance (null = skip Claude, return gate score only)
 *
 * Returns:
 * {
 *   signal:  number,
 *   score:   0|1|2|3,
 *   note:    string,
 *   method:  'rules_gate_claude',
 *   gateScore: 0|1,     // What the gate returned before Claude
 *   claudeCalled: bool,
 *   inputs:  object,    // Raw inputs used
 * }
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// ─── CLAUDE CALLER ────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 120;

/**
 * Call Claude with a scoring prompt.
 * Returns { score: 2|3, note: string } or falls back to gateScore on error.
 */
async function callClaude(client, prompt, gateScore) {
  if (!client) return { score: gateScore, note: 'Claude not called — gate score returned.' };

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      system: `You are a ContentRadar signal scorer evaluating a contractor's digital presence.
Respond ONLY with valid JSON in this exact format, no other text:
{"score": <2 or 3>, "note": "<one sentence under 20 words explaining why>"}
Score 2 = functional but not best practice. Score 3 = genuinely best practice.`,
    });

    const text = response.content[0]?.text || '';
    const parsed = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}');
    if (parsed.score === 2 || parsed.score === 3) return parsed;
    return { score: gateScore, note: 'Score parse error — gate score used.' };
  } catch {
    return { score: gateScore, note: 'Claude error — gate score returned.' };
  }
}

function result(signal, score, note, gateScore, claudeCalled, inputs) {
  return { signal, score, note, method: 'rules_gate_claude', gateScore, claudeCalled, inputs };
}

// ─── WEBSITE SIGNALS (6–10) ───────────────────────────────────────────────────

/**
 * Signal 6 — Before & After Gallery
 * Gate: any images present on gallery/homepage?
 * Claude: are they genuine before/after trade-specific photos or generic stock?
 */
async function scoreS6_Gallery(content, context, claude) {
  const { imageCount = 0, hasGalleryPage = false } = context;
  const inputs = { imageCount, hasGalleryPage };

  if (imageCount === 0 && !hasGalleryPage) {
    return result(6, 0, 'No project photos or gallery found — website uses no imagery.', 0, false, inputs);
  }
  if (imageCount < 3 && !hasGalleryPage) {
    return result(6, 1, `Only ${imageCount} image${imageCount===1?'':'s'} found — no gallery structure present.`, 1, false, inputs);
  }

  // Gate passed — Claude assesses quality
  const prompt = `A contractor's website has ${imageCount} images${hasGalleryPage ? ' and a dedicated gallery page' : ''}.

WEBSITE CONTENT:
${content.substring(0, 3000)}

Does this website have a genuine before-and-after project gallery with real trade work photos?
Score 2 if: real project photos exist but no clear before/after structure or limited variety.
Score 3 if: substantial before/after gallery organised by service type, with captions, genuine trade photography.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(6, score, note, 1, true, inputs);
}

/**
 * Signal 7 — Blog & Educational Content
 * Gate: blog section exists with recent posts?
 * Claude: is the content genuinely educational or keyword-stuffed filler?
 */
async function scoreS7_Blog(content, context, claude) {
  const { blogPostCount = 0, lastPostDaysAgo = Infinity, hasBlogSection = false } = context;
  const inputs = { blogPostCount, lastPostDaysAgo, hasBlogSection };

  if (!hasBlogSection && blogPostCount === 0) {
    return result(7, 0, 'No blog or educational content found — website is entirely promotional.', 0, false, inputs);
  }
  if (blogPostCount === 0 || lastPostDaysAgo > 365) {
    return result(7, 1, `Blog exists but ${blogPostCount === 0 ? 'empty' : `last post ${Math.round(lastPostDaysAgo)} days ago`} — inactive.`, 1, false, inputs);
  }

  const prompt = `A contractor's website has a blog with ${blogPostCount} posts. Last post was ${Math.round(lastPostDaysAgo)} days ago.

BLOG CONTENT SAMPLE:
${content.substring(0, 3000)}

Is this educational content genuinely useful to homeowners planning or researching trade work?
Score 2 if: real articles present, recently updated, but topics are generic or thin.
Score 3 if: trade-specific educational content targeting real homeowner questions, updated regularly, substantive answers.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(7, score, note, 1, true, inputs);
}

/**
 * Signal 8 — FAQ Coverage
 * Gate: FAQ section exists with at least 3 questions?
 * Claude: do FAQs match real homeowner search intent or are they firm-centric filler?
 */
async function scoreS8_FAQ(content, context, claude) {
  const { faqQuestionCount = 0, hasFAQSection = false } = context;
  const inputs = { faqQuestionCount, hasFAQSection };

  if (!hasFAQSection && faqQuestionCount === 0) {
    return result(8, 0, 'No FAQ section found — common homeowner questions entirely unanswered.', 0, false, inputs);
  }
  if (faqQuestionCount < 3) {
    return result(8, 1, `Only ${faqQuestionCount} FAQ question${faqQuestionCount===1?'':'s'} — too shallow to address real homeowner concerns.`, 1, false, inputs);
  }

  const prompt = `A contractor's website has a FAQ section with approximately ${faqQuestionCount} questions.

FAQ CONTENT:
${content.substring(0, 3500)}

Do these FAQs answer real homeowner questions about this trade (costs, timelines, process, emergency response, credentials)?
Score 2 if: genuine questions present but surface-level answers, or fewer than 15 questions covering core topics.
Score 3 if: 20+ questions matching real search intent, thorough plain-language answers, trade-specific and seasonal content.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(8, score, note, 1, true, inputs);
}

/**
 * Signal 19 — Facebook Page Completeness
 * Gate: Facebook page exists and is claimed?
 * Claude: is the page complete with consistent branding and optimised CTA?
 */
async function scoreS19_FacebookCompleteness(content, context, claude) {
  const { pageExists = false, claimed = false, hasCTA = false,
          aboutSection = false, hasProfilePhoto = false } = context;
  const inputs = { pageExists, claimed, hasCTA, aboutSection, hasProfilePhoto };

  if (!pageExists) {
    return result(19, 0, 'No Facebook business page found — absent from the platform.', 0, false, inputs);
  }
  if (!claimed) {
    return result(19, 1, 'Facebook page exists but appears unclaimed — incomplete and unmanaged.', 1, false, inputs);
  }

  const completenessScore = [hasCTA, aboutSection, hasProfilePhoto].filter(Boolean).length;
  if (completenessScore < 2) {
    return result(19, 1, 'Facebook page claimed but incomplete — missing CTA button, about section, or profile photo.', 1, false, inputs);
  }

  const prompt = `A contractor has a claimed Facebook business page.

PAGE DATA:
${content.substring(0, 2500)}

How complete and optimised is this Facebook business page?
Score 2 if: claimed, basic info present, CTA configured, but branding is inconsistent or about section is thin.
Score 3 if: fully optimised — consistent visual branding, complete about section, CTA linked to best conversion destination, NAP consistent with GBP.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(19, score, note, 1, true, inputs);
}

/**
 * Signal 20 — Facebook Content & Community Voice
 * Gate: posts exist in last 90 days?
 * Claude: is the content genuinely community-oriented or purely promotional?
 */
async function scoreS20_FacebookContent(content, context, claude) {
  const { postCount30Days = 0, postCount90Days = 0, hasGroupActivity = false } = context;
  const inputs = { postCount30Days, postCount90Days, hasGroupActivity };

  if (postCount90Days === 0) {
    return result(20, 0, 'No Facebook posts in last 90 days — page appears inactive.', 0, false, inputs);
  }
  if (postCount30Days < 2) {
    return result(20, 1, `Only ${postCount30Days} post${postCount30Days===1?'':'s'} in last 30 days — below weekly minimum cadence.`, 1, false, inputs);
  }

  const prompt = `A contractor's Facebook page has ${postCount30Days} posts in the last 30 days${hasGroupActivity ? ' and participates in local community groups' : ''}.

RECENT POSTS:
${content.substring(0, 3000)}

Is this Facebook content genuinely community-oriented or purely self-promotional?
Score 2 if: posts regularly but mostly promotional — offers, services, before/afters without community engagement.
Score 3 if: community-first strategy — trade tips, seasonal advice, local involvement, genuine group participation, content that serves before it sells.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(20, score, note, 1, true, inputs);
}

/**
 * Signal 24 — Facebook Video & Reels
 * Gate: any video content exists on the page?
 * Claude: is there a deliberate video strategy or random one-offs?
 */
async function scoreS24_FacebookVideo(content, context, claude) {
  const { videoCount = 0, reelCount = 0, mostRecentVideoDaysAgo = Infinity } = context;
  const totalVideo = videoCount + reelCount;
  const inputs = { videoCount, reelCount, totalVideo, mostRecentVideoDaysAgo };

  if (totalVideo === 0) {
    return result(24, 0, 'No video or reels content on Facebook — highest-reach format unused.', 0, false, inputs);
  }
  if (totalVideo < 3 || mostRecentVideoDaysAgo > 90) {
    return result(24, 1, `${totalVideo} video${totalVideo===1?'':'s'} found — minimal with no consistent cadence.`, 1, false, inputs);
  }

  const prompt = `A contractor's Facebook page has ${videoCount} videos and ${reelCount} reels. Most recent was ${Math.round(mostRecentVideoDaysAgo)} days ago.

VIDEO CONTENT CONTEXT:
${content.substring(0, 2500)}

Is there a deliberate video content strategy or are these random one-offs?
Score 2 if: regular video present but mostly project reveals only — no educational content or reels strategy.
Score 3 if: consistent mix of short-form reels and longer content, educational trade tips, project reveals, community content — cross-posted from YouTube where channel exists.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(24, score, note, 1, true, inputs);
}

/**
 * Signal 25 — Nextdoor Business Page Presence
 * Gate: business page exists on Nextdoor?
 * Claude: is the page complete with service area configured?
 */
async function scoreS25_NextdoorPresence(content, context, claude) {
  const { pageExists = false, claimed = false, serviceAreaConfigured = false } = context;
  const inputs = { pageExists, claimed, serviceAreaConfigured };

  if (!pageExists) {
    return result(25, 0, 'No Nextdoor business page found — absent from the highest-trust local discovery channel.', 0, false, inputs);
  }
  if (!claimed) {
    return result(25, 1, 'Nextdoor page exists but unclaimed — community presence not established.', 1, false, inputs);
  }

  const prompt = `A contractor has a claimed Nextdoor business page${serviceAreaConfigured ? ' with service area configured' : ''}.

PAGE CONTENT:
${content.substring(0, 2000)}

How complete and optimised is this Nextdoor business page?
Score 2 if: claimed and complete but service area not fully matching protected market or business info thin.
Score 3 if: fully optimised — complete information, service area matches protected market, connected to all relevant neighbourhood communities.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(25, score, note, 1, true, inputs);
}

/**
 * Signal 27 — Nextdoor Community Visibility
 * Gate: any organic mentions in community posts?
 * Claude: is the contractor the dominant recommendation or occasionally mentioned?
 */
async function scoreS27_NextdoorCommunity(content, context, claude) {
  const { organicMentionCount = 0, mentionWindowDays = 90 } = context;
  const inputs = { organicMentionCount, mentionWindowDays };

  if (organicMentionCount === 0) {
    return result(27, 0, 'No organic mentions found in Nextdoor community posts — community presence absent.', 0, false, inputs);
  }
  if (organicMentionCount < 2) {
    return result(27, 1, `Only ${organicMentionCount} organic mention in last ${mentionWindowDays} days — isolated, not a community pattern.`, 1, false, inputs);
  }

  const prompt = `A contractor has ${organicMentionCount} organic mentions in Nextdoor community posts in the last ${mentionWindowDays} days.

MENTION CONTEXT:
${content.substring(0, 2500)}

How dominant is this contractor's community presence on Nextdoor?
Score 2 if: regularly mentioned when neighbours ask for the trade but not always the first name — shares recommendations with competitors.
Score 3 if: the automatic first recommendation when neighbours ask — unprompted mentions across multiple communities, neighbours tagging the business proactively.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(27, score, note, 1, true, inputs);
}

/**
 * Signal 31 — Aggregate Review Footprint
 * Gate: reviews present on at least 2 platforms?
 * Claude: is the multi-platform presence substantial and consistent?
 */
async function scoreS31_AggregateReviews(content, context, claude) {
  const { platformsWithReviews = [], totalReviews = 0 } = context;
  const platformCount = platformsWithReviews.length;
  const inputs = { platformCount, platformsWithReviews, totalReviews };

  if (platformCount <= 1) {
    return result(31, 0, `Reviews on only ${platformCount} platform — concentrated and vulnerable to single-platform changes.`, 0, false, inputs);
  }
  if (platformCount === 2 || totalReviews < 30) {
    return result(31, 1, `Reviews on ${platformCount} platforms with ${totalReviews} total — starting to build cross-platform presence.`, 1, false, inputs);
  }

  const prompt = `A contractor has reviews across ${platformCount} platforms (${platformsWithReviews.join(', ')}) with ${totalReviews} total reviews.

REVIEW PLATFORM DATA:
${content.substring(0, 2000)}

How strong and consistent is this multi-platform review footprint?
Score 2 if: reviews on 3-4 platforms but one platform heavily dominates — breadth present but unbalanced.
Score 3 if: meaningful review volume across 5+ platforms — no single platform overwhelming, consistent velocity across all, AI platforms have abundant cross-source data to cite this contractor.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(31, score, note, 1, true, inputs);
}

/**
 * Signal 32 — Review Sentiment Consistency
 * Gate: enough reviews across platforms to assess sentiment?
 * Claude: is the sentiment narrative consistent across platforms and mirroring brand promise?
 */
async function scoreS32_SentimentConsistency(content, context, claude) {
  const { totalReviews = 0, platformCount = 0, avgRating = 0 } = context;
  const inputs = { totalReviews, platformCount, avgRating };

  if (totalReviews < 10 || platformCount < 2) {
    return result(32, 0, 'Insufficient reviews across platforms to assess sentiment consistency.', 0, false, inputs);
  }
  if (avgRating < 3.8) {
    return result(32, 1, `Average rating ${avgRating} across platforms — sentiment inconsistent or negative themes present.`, 1, false, inputs);
  }

  const prompt = `A contractor has ${totalReviews} reviews across ${platformCount} platforms with an average rating of ${avgRating}.

REVIEW TEXT SAMPLES:
${content.substring(0, 3000)}

Is the sentiment narrative consistent across all platforms and does it mirror what a strong brand promise would look like?
Score 2 if: generally positive across platforms but recurring negative themes on at least one platform, or the sentiment narrative doesn't clearly reflect a specific brand promise.
Score 3 if: consistent positive narrative across all platforms — recurring themes mirror a specific brand promise (fast, clean, honest, reliable), sentiment breadth is what AI platforms cite as authoritative.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(32, score, note, 1, true, inputs);
}

/**
 * Signal 33 — Tier 1 Trades Directory Presence
 * Gate: listed on at least one Tier 1 directory?
 * Claude: how complete and optimised are the profiles?
 */
async function scoreS33_Tier1Directory(content, context, claude) {
  const { directoriesPresent = [], claimedCount = 0 } = context;
  const inputs = { directoriesPresent, claimedCount, directoryCount: directoriesPresent.length };

  if (directoriesPresent.length === 0) {
    return result(33, 0, 'Not present on any Tier 1 trades directory — missing from HomeAdvisor, Angi Pro, and Houzz Pro.', 0, false, inputs);
  }
  if (claimedCount === 0) {
    return result(33, 1, `Listed on ${directoriesPresent.length} director${directoriesPresent.length===1?'y':'ies'} but none claimed — unmanaged presence.`, 1, false, inputs);
  }

  const prompt = `A contractor is present on ${directoriesPresent.length} Tier 1 trades directories (${directoriesPresent.join(', ')}) with ${claimedCount} claimed.

DIRECTORY PROFILE DATA:
${content.substring(0, 2500)}

How complete and optimised are these Tier 1 directory profiles?
Score 2 if: claimed on 1-2 directories with basic information — photos and service descriptions could be more complete.
Score 3 if: fully optimised on all relevant Tier 1 directories — photos, descriptions, service lists populated, reviews maintained, recognition achieved where applicable.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(33, score, note, 1, true, inputs);
}

/**
 * Signal 34 — Trade Association Directory Presence
 * Gate: listed in relevant trade association directory?
 * Claude: how prominently is membership displayed and leveraged?
 */
async function scoreS34_TradeAssociation(content, context, claude) {
  const { associationsFound = [], trade = 'plumbing' } = context;
  const inputs = { associationsFound, trade };

  const tradeAssociations = {
    plumbing:   ['PHCC', 'MCAA'],
    hvac:       ['HRAI', 'ACCA', 'TSSA'],
    electrical: ['ECRA', 'ESA', 'IEC'],
    roofing:    ['CRCA', 'NRCA', 'OIRCA'],
  };
  const relevantAssocs = tradeAssociations[trade] || [];

  if (associationsFound.length === 0) {
    return result(34, 0, `Not listed in any ${trade} trade association directory — missing from ${relevantAssocs.join('/')} directories.`, 0, false, inputs);
  }

  const prompt = `A ${trade} contractor is listed in these trade association directories: ${associationsFound.join(', ')}.

WEBSITE CONTENT:
${content.substring(0, 2500)}

How well is trade association membership displayed and leveraged on this contractor's digital presence?
Score 2 if: association membership confirmed but only referenced in one place or mentioned without logos/specificity.
Score 3 if: membership prominently displayed across website, GBP, and directories — logos visible, specific associations named, used as a trust signal on key conversion pages.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(34, score, note, 1, true, inputs);
}

/**
 * Signal 35 — BBB Accreditation & Rating
 * Gate: BBB listing exists?
 * Claude: is accreditation in good standing and prominently displayed?
 */
async function scoreS35_BBB(content, context, claude) {
  const { bbbListed = false, accredited = false, rating = '', complaintsOpen = 0 } = context;
  const inputs = { bbbListed, accredited, rating, complaintsOpen };

  if (!bbbListed) {
    return result(35, 0, 'No BBB listing found — absent from a trust signal used by older homeowner demographic.', 0, false, inputs);
  }
  if (!accredited || rating < 'A' || complaintsOpen > 2) {
    return result(35, 1, `BBB listed but ${!accredited ? 'not accredited' : `rating ${rating}`}${complaintsOpen > 0 ? `, ${complaintsOpen} open complaint${complaintsOpen===1?'':'s'}` : ''}.`, 1, false, inputs);
  }

  const prompt = `A contractor has BBB accreditation with rating ${rating} and ${complaintsOpen} open complaints.

WEBSITE CONTENT:
${content.substring(0, 2000)}

How well is BBB accreditation leveraged as a trust signal?
Score 2 if: accredited in good standing but BBB badge/mention is absent from the website or hard to find.
Score 3 if: A+ rating, zero open complaints, BBB accreditation badge prominently displayed on website homepage and key pages.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(35, score, note, 1, true, inputs);
}

/**
 * Signal 36 — Google Local Services Ad Presence
 * Gate: LSA verification status?
 * Claude: how actively optimised is the LSA presence?
 */
async function scoreS36_LSA(content, context, claude) {
  const { lsaVerified = false, lsaActive = false, googleGuaranteed = false,
          primaryKeywordPresent = false } = context;
  const inputs = { lsaVerified, lsaActive, googleGuaranteed, primaryKeywordPresent };

  if (!lsaVerified) {
    return result(36, 0, 'Not LSA verified — losing positions 1, 2, and 3 in search to Google Guaranteed competitors.', 0, false, inputs);
  }
  if (!lsaActive) {
    return result(36, 1, 'LSA verified but not actively running — verification complete but ads paused or not configured.', 1, false, inputs);
  }

  const prompt = `A contractor is Google Guaranteed with active Local Services Ads${primaryKeywordPresent ? ' appearing for primary trade keywords' : ''}.

LSA AND SEARCH CONTEXT:
${content.substring(0, 2000)}

How well optimised is this contractor's LSA presence?
Score 2 if: LSA verified and running for primary city but not yet covering surrounding communities in protected market.
Score 3 if: Google Guaranteed badge active across all primary trade keywords in full protected market — appearing in top position for emergency-intent searches.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(36, score, note, 1, true, inputs);
}

/**
 * Signal 39 — Schema Markup
 * Gate: any schema markup detected on website?
 * Claude: how complete and correctly implemented is the schema?
 */
async function scoreS39_Schema(content, context, claude) {
  const { schemaTypes = [], hasLocalBusiness = false, hasErrors = false,
          serviceSchemaCount = 0 } = context;
  const inputs = { schemaTypes, hasLocalBusiness, hasErrors, serviceSchemaCount };

  if (schemaTypes.length === 0) {
    return result(39, 0, 'No schema markup found — Google and AI platforms must infer business data rather than reading it directly.', 0, false, inputs);
  }
  if (!hasLocalBusiness || hasErrors) {
    return result(39, 1, `Schema present (${schemaTypes.join(', ')}) but ${!hasLocalBusiness ? 'LocalBusiness schema missing' : 'validation errors found'}.`, 1, false, inputs);
  }

  const prompt = `A contractor's website has schema markup including: ${schemaTypes.join(', ')}. LocalBusiness schema: ${hasLocalBusiness ? 'present' : 'missing'}. Service schema on ${serviceSchemaCount} pages. Errors: ${hasErrors ? 'yes' : 'none'}.

SCHEMA CONTEXT:
${content.substring(0, 2000)}

How complete and correctly implemented is this contractor's schema markup?
Score 2 if: LocalBusiness schema present and valid, but service schema missing from key pages, or FAQ/Review schema not implemented.
Score 3 if: Full schema implementation — LocalBusiness on homepage, service-specific schema on each service page, FAQ schema on FAQ page, review schema pulling GBP rating, all validated error-free.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(39, score, note, 1, true, inputs);
}

/**
 * Signal 40 — Seasonal Content Readiness
 * Gate: any seasonal content exists on website or GBP?
 * Claude: is it published proactively before demand peaks or reactively after?
 */
async function scoreS40_SeasonalContent(content, context, claude) {
  const { seasonalPagesFound = 0, gbpSeasonalPosts = 0,
          contentPublishedBeforePeak = false, trade = 'plumbing' } = context;
  const inputs = { seasonalPagesFound, gbpSeasonalPosts, contentPublishedBeforePeak, trade };

  if (seasonalPagesFound === 0 && gbpSeasonalPosts === 0) {
    return result(40, 0, 'No seasonal content found — website and GBP are static regardless of season.', 0, false, inputs);
  }
  if (!contentPublishedBeforePeak) {
    return result(40, 1, 'Seasonal content exists but published reactively — content goes up after demand peaks, capturing nothing.', 1, false, inputs);
  }

  const tradePeaks = {
    plumbing:   'pipe freeze (Feb), spring flooding (Apr), furnace transition (Sep)',
    hvac:       'AC tune-ups (Apr), furnace tune-ups (Sep), heat pumps (Oct)',
    electrical:  'generator season (Nov), outdoor lighting (May), panel upgrades (Mar)',
    roofing:    'spring inspection (Apr), storm season (Jun-Aug), fall cleanup (Oct)',
  };

  const prompt = `A ${trade} contractor has ${seasonalPagesFound} seasonal content pages and ${gbpSeasonalPosts} seasonal GBP posts. Content published before demand peaks: ${contentPublishedBeforePeak}.

Trade demand peaks: ${tradePeaks[trade] || 'seasonal patterns apply'}.

SEASONAL CONTENT:
${content.substring(0, 3000)}

How well does this contractor capitalise on predictable seasonal demand?
Score 2 if: seasonal content exists and published roughly on time but not for all key demand peaks or GBP posts not coordinated.
Score 3 if: full seasonal content calendar — website content, GBP posts, and campaigns all published 4-6 weeks before each demand peak, covering all major seasonal moments for the trade.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(40, score, note, 1, true, inputs);
}

/**
 * Signal 41 — Service Area Content Coverage
 * Gate: any community-specific service area pages exist?
 * Claude: does the coverage match the protected market geography?
 */
async function scoreS41_ServiceAreaContent(content, context, claude) {
  const { serviceAreaPageCount = 0, communitiesCovered = [],
          protectedMarketCommunities = [] } = context;
  const inputs = { serviceAreaPageCount, communitiesCovered: communitiesCovered.slice(0, 5),
                   totalCommunitiesInMarket: protectedMarketCommunities.length };

  if (serviceAreaPageCount === 0) {
    return result(41, 0, 'No service area pages — contractor visible only in primary city, leaving surrounding communities to competitors.', 0, false, inputs);
  }
  if (serviceAreaPageCount === 1) {
    return result(41, 1, 'Only primary city service page — surrounding communities in protected market not addressed.', 1, false, inputs);
  }

  const coverageRatio = protectedMarketCommunities.length > 0
    ? Math.round(communitiesCovered.length / protectedMarketCommunities.length * 100)
    : null;

  const prompt = `A contractor has ${serviceAreaPageCount} service area pages covering: ${communitiesCovered.join(', ')}.
Protected market communities: ${protectedMarketCommunities.join(', ')} (${protectedMarketCommunities.length} total).
Coverage: ${coverageRatio !== null ? `${coverageRatio}%` : 'unknown'}.

SERVICE AREA CONTENT:
${content.substring(0, 3000)}

Does the service area content coverage match the protected market geography?
Score 2 if: several community pages exist but coverage is patchy — some communities in protected market not addressed, or pages are thin duplicates.
Score 3 if: optimised service area pages for every community in the protected market — each page unique, locally relevant, and targeting community-specific trade keywords.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(41, score, note, 1, true, inputs);
}

/**
 * Signal 42 — Seasonal Offer & Campaign Execution
 * Gate: any seasonal offers or campaigns found?
 * Claude: are campaigns coordinated across channels and timed correctly?
 */
async function scoreS42_SeasonalCampaigns(content, context, claude) {
  const { campaignCount12Mo = 0, channelsUsed = [], launchedBeforePeak = false } = context;
  const inputs = { campaignCount12Mo, channelsUsed, launchedBeforePeak };

  if (campaignCount12Mo === 0) {
    return result(42, 0, 'No seasonal campaigns found — predictable demand peaks not capitalised on.', 0, false, inputs);
  }
  if (!launchedBeforePeak || channelsUsed.length < 2) {
    return result(42, 1, `${campaignCount12Mo} campaign${campaignCount12Mo===1?'':'s'} found but ${!launchedBeforePeak ? 'launched reactively' : 'on only '+channelsUsed.length+' channel'}.`, 1, false, inputs);
  }

  const prompt = `A contractor ran ${campaignCount12Mo} seasonal campaigns in the last 12 months across: ${channelsUsed.join(', ')}.
Campaigns launched before demand peaks: ${launchedBeforePeak}.

CAMPAIGN CONTENT:
${content.substring(0, 2500)}

How well executed are these seasonal campaigns?
Score 2 if: campaigns exist and launched on time but not fully coordinated — one channel doing most work, or offers not compelling enough to drive action.
Score 3 if: full seasonal campaign coordination — website, GBP posts, Facebook, and LSA all updated simultaneously 4-6 weeks before peak. Specific, compelling offers. Results tracked.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(42, score, note, 1, true, inputs);
}

/**
 * Signal 46 — Video Content Quality & Strategy
 * Gate: at least 5 videos across platforms?
 * Claude: is there a deliberate content strategy or random uploads?
 */
async function scoreS46_VideoQuality(content, context, claude) {
  const { totalVideoCount = 0, hasEducationalContent = false,
          hasProjectReveals = false, titlesOptimised = false } = context;
  const inputs = { totalVideoCount, hasEducationalContent, hasProjectReveals, titlesOptimised };

  if (totalVideoCount < 3) {
    return result(46, 0, `Only ${totalVideoCount} video${totalVideoCount===1?'':'s'} — insufficient to assess content strategy.`, 0, false, inputs);
  }
  if (totalVideoCount < 5 || (!hasEducationalContent && !hasProjectReveals)) {
    return result(46, 1, `${totalVideoCount} videos present but content appears random — no clear educational or project-reveal strategy.`, 1, false, inputs);
  }

  const prompt = `A contractor has ${totalVideoCount} videos. Educational content: ${hasEducationalContent}. Project reveals: ${hasProjectReveals}. Optimised titles/descriptions: ${titlesOptimised}.

VIDEO TITLES AND DESCRIPTIONS:
${content.substring(0, 2500)}

Does this contractor have a deliberate video content strategy?
Score 2 if: video content is consistent with a mix of types but titles are generic, descriptions thin, or seasonal content absent.
Score 3 if: deliberate strategy — educational series targeting homeowner questions, project reveals building credibility, seasonal content timed to demand peaks, titles and descriptions optimised for search.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(46, score, note, 1, true, inputs);
}

/**
 * Signal 47 — Video Platform Cross-Posting
 * Gate: video exists on at least 2 platforms?
 * Claude: is cross-posting systematic or coincidental?
 */
async function scoreS47_VideoCrossPosting(content, context, claude) {
  const { platformsWithVideo = [], matchingContentFound = false } = context;
  const inputs = { platformCount: platformsWithVideo.length, platformsWithVideo, matchingContentFound };

  if (platformsWithVideo.length < 2) {
    return result(47, 0, `Video on only ${platformsWithVideo.length} platform — content not cross-posted, reach limited.`, 0, false, inputs);
  }
  if (!matchingContentFound) {
    return result(47, 1, `Video on ${platformsWithVideo.length} platforms but matching content not detected — different videos per platform, not systematic cross-posting.`, 1, false, inputs);
  }

  const prompt = `A contractor has video content on ${platformsWithVideo.join(', ')} with matching content detected across platforms.

VIDEO CROSS-POSTING CONTEXT:
${content.substring(0, 2000)}

How systematic and optimised is the cross-posting strategy?
Score 2 if: same videos appearing on multiple platforms but not optimised per platform — no captions on Facebook, no chapters on YouTube, same thumbnail everywhere.
Score 3 if: systematic cross-posting with per-platform optimisation — YouTube (chapters, tags), Facebook (captions, native upload), GBP posts (video clips), website embeds. Each platform gets the right format.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(47, score, note, 1, true, inputs);
}

/**
 * Signal 51 — Search Share of Voice
 * Gate: ranking in top 10 for primary trade keywords?
 * Claude: how dominant is the position across the protected market?
 */
async function scoreS51_SearchSOV(content, context, claude) {
  const { mapPackPosition = null, organicRank = null,
          keywordsInTop3 = 0, totalKeywordsChecked = 0 } = context;
  const inputs = { mapPackPosition, organicRank, keywordsInTop3, totalKeywordsChecked };

  if (mapPackPosition === null && organicRank === null) {
    return result(51, 0, 'Not ranking for primary trade keywords — invisible in search for primary market.', 0, false, inputs);
  }
  if ((mapPackPosition || 99) > 10 && (organicRank || 99) > 10) {
    return result(51, 1, `Ranking outside top 10 — Map Pack position ${mapPackPosition || 'absent'}, organic rank ${organicRank || 'absent'}.`, 1, false, inputs);
  }

  const prompt = `A contractor has Map Pack position ${mapPackPosition || 'absent'} and organic rank ${organicRank || 'absent'} for primary trade keywords. In top 3 for ${keywordsInTop3} of ${totalKeywordsChecked} keywords checked.

SERP CONTEXT:
${content.substring(0, 2000)}

How dominant is this contractor's search presence?
Score 2 if: ranking top 5 for most primary keywords in main city but Map Pack position 3-5, or not yet ranking in surrounding communities.
Score 3 if: dominant search share of voice — Map Pack position 1 for primary trade keywords across the full protected market, top 3 organic. Competitors cannot easily displace.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(51, score, note, 1, true, inputs);
}

/**
 * Signal 52 — Social Share of Voice
 * Gate: any social mentions detected beyond own pages?
 * Claude: is the contractor the dominant community recommendation?
 */
async function scoreS52_SocialSOV(content, context, claude) {
  const { ownPageMentions = 0, communityMentions = 0,
          competitorMentions = 0 } = context;
  const inputs = { ownPageMentions, communityMentions, competitorMentions };

  if (communityMentions === 0) {
    return result(52, 0, 'No organic community mentions detected — competitors mentioned when neighbours ask for the trade.', 0, false, inputs);
  }
  if (communityMentions < 3) {
    return result(52, 1, `${communityMentions} community mention${communityMentions===1?'':'s'} — occasionally referenced but not a community pattern.`, 1, false, inputs);
  }

  const prompt = `A contractor has ${communityMentions} organic community mentions vs ${competitorMentions} competitor mentions in local Facebook groups and Nextdoor.

COMMUNITY MENTION CONTEXT:
${content.substring(0, 2500)}

How dominant is this contractor's social share of voice?
Score 2 if: regularly mentioned alongside competitors — shares the recommendation space but doesn't dominate.
Score 3 if: dominant social share of voice — first name that comes up when neighbours ask, mentioned more than all competitors combined, unprompted recommendations across multiple communities.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(52, score, note, 1, true, inputs);
}

/**
 * Signal 53 — Competitor Ad & LSA Pressure
 * Gate: competitor paid activity detected?
 * Claude: how does this contractor's position hold up against paid competitor pressure?
 */
async function scoreS53_CompetitorPressure(content, context, claude) {
  const { competitorLSACount = 0, competitorAdCount = 0,
          ownLSAActive = false, ownMapPackPosition = null } = context;
  const totalPressure = competitorLSACount + competitorAdCount;
  const inputs = { competitorLSACount, competitorAdCount, ownLSAActive, ownMapPackPosition, totalPressure };

  if (totalPressure === 0) {
    return result(53, 2, 'No competitor LSA or paid ad activity detected — low competitive pressure environment.', 1, false, inputs);
  }
  if (totalPressure >= 4 && !ownLSAActive && (!ownMapPackPosition || ownMapPackPosition > 3)) {
    return result(53, 1, `${totalPressure} competitor paid/LSA entries in results — significant top-of-page pressure with no LSA defence.`, 1, false, inputs);
  }

  const prompt = `A contractor faces ${competitorLSACount} competitor LSA entries and ${competitorAdCount} competitor paid ads. Own LSA active: ${ownLSAActive}. Own Map Pack position: ${ownMapPackPosition || 'unknown'}.

COMPETITIVE CONTEXT:
${content.substring(0, 2000)}

How well does this contractor's position hold against competitor paid pressure?
Score 2 if: competitor pressure present but this contractor holds Map Pack top 3 — paid ads below organic presence but LSA gap exists.
Score 3 if: LSA verified and active, Map Pack position 1, organic rank high — competitor paid activity cannot displace top-of-page presence. Branded search volume insulates against paid pressure.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(53, score, note, 1, true, inputs);
}

/**
 * Signal 54 — Branded Search Presence
 * Gate: business name search produces any results?
 * Claude: how strong and growing is the branded search signal?
 */
async function scoreS54_BrandedSearch(content, context, claude) {
  const { brandedRank = null, gbpAppearsForBrand = false,
          directoryListingsForBrand = 0, estimatedBrandedVolume = 0 } = context;
  const inputs = { brandedRank, gbpAppearsForBrand, directoryListingsForBrand, estimatedBrandedVolume };

  if (!brandedRank && !gbpAppearsForBrand) {
    return result(54, 0, 'Business name search produces no clear results — digital footprint too thin for branded recognition.', 0, false, inputs);
  }
  if (!gbpAppearsForBrand || directoryListingsForBrand < 3) {
    return result(54, 1, 'Business name search returns website only — GBP and directory listings not reinforcing branded presence.', 1, false, inputs);
  }

  const prompt = `A contractor's branded search (business name) produces: rank ${brandedRank || 'unknown'}, GBP present: ${gbpAppearsForBrand}, ${directoryListingsForBrand} directory listings. Estimated monthly branded search volume: ${estimatedBrandedVolume || 'unknown'}.

BRANDED SEARCH CONTEXT:
${content.substring(0, 2000)}

How strong is this contractor's branded search presence?
Score 2 if: business name search produces website + GBP but limited directory reinforcement — branded volume present but not yet growing.
Score 3 if: strong branded presence — name search surfaces website, GBP, multiple directories, social profiles. Branded search volume growing consistently, indicating word-of-mouth momentum. No competitor ads appearing on branded terms.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(54, score, note, 1, true, inputs);
}

/**
 * Signal 57 — Quote/Booking Friction
 * Gate: any quote request or booking capability exists?
 * Claude: how low is the friction and how well is it positioned?
 */
async function scoreS57_QuoteFriction(content, context, claude) {
  const { hasQuoteForm = false, hasOnlineBooking = false,
          formFieldCount = 0, responseTimeStated = false } = context;
  const inputs = { hasQuoteForm, hasOnlineBooking, formFieldCount, responseTimeStated };

  if (!hasQuoteForm && !hasOnlineBooking) {
    return result(57, 0, 'No quote or booking capability — phone-only contact with no digital conversion path for Active Project intent.', 0, false, inputs);
  }
  if (formFieldCount > 6 && !hasOnlineBooking) {
    return result(57, 1, `Quote form exists but ${formFieldCount} fields — friction too high for comparison-shopping visitors.`, 1, false, inputs);
  }

  const prompt = `A contractor has ${hasOnlineBooking ? 'online booking' : 'a quote request form'}${hasQuoteForm && hasOnlineBooking ? ' and a quote form' : ''}. Form fields: ${formFieldCount}. Response time committed: ${responseTimeStated}.

CONTACT/BOOKING CONTENT:
${content.substring(0, 2500)}

How low-friction and well-positioned is the quote or booking path?
Score 2 if: quote or booking exists and functional — form under 5 fields or booking calendar present, but not prominently positioned or response time not committed.
Score 3 if: frictionless quote/booking — under 4 fields, response time committed, confirmation sent instantly, available on website + GBP + Facebook. Active Project visitors can request without committing to a phone call.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(57, score, note, 1, true, inputs);
}

/**
 * Signal 60 — Mobile Experience Quality
 * Gate: PageSpeed mobile score above 50?
 * Claude: how well does the mobile experience serve emergency-intent visitors?
 */
async function scoreS60_MobileExperience(content, context, claude) {
  const { mobileScore = 0, lcpSeconds = null, clsScore = null,
          fidMs = null, hasClickToCall = false } = context;
  const inputs = { mobileScore, lcpSeconds, clsScore, fidMs, hasClickToCall };

  if (mobileScore < 30) {
    return result(60, 0, `Mobile score ${mobileScore}/100 — website fails on mobile, losing the majority of emergency-intent visitors.`, 0, false, inputs);
  }
  if (mobileScore < 60 || (lcpSeconds && lcpSeconds > 4)) {
    return result(60, 1, `Mobile score ${mobileScore}/100${lcpSeconds ? `, LCP ${lcpSeconds}s` : ''} — accessible but poor experience losing significant conversion.`, 1, false, inputs);
  }

  const prompt = `A contractor's website has a mobile PageSpeed score of ${mobileScore}/100. LCP: ${lcpSeconds || 'unknown'}s. CLS: ${clsScore || 'unknown'}. Click-to-call present: ${hasClickToCall}.

MOBILE UX CONTEXT:
${content.substring(0, 2000)}

How well does the mobile experience serve a homeowner with an emergency who needs to call immediately?
Score 2 if: mobile score 60-80, loads in reasonable time, core functions work — but click-to-call could be more prominent or some CWV metrics need improvement.
Score 3 if: mobile score 85+, loads under 2 seconds, click-to-call persistent and prominent, all Core Web Vitals passing, no horizontal scrolling — emergency visitors can initiate contact in under 3 seconds.`;

  const { score, note } = await callClaude(claude, prompt, 1);
  return result(60, score, note, 1, true, inputs);
}

// ─── BATCH RUNNER ─────────────────────────────────────────────────────────────

/**
 * Run all 28 Method 2 scoring functions.
 * claudeClient: Anthropic instance or null (null = gate scores only, no Claude calls)
 */
async function scoreAllMethod2(data, claudeClient = null) {
  const { content = {}, context = {} } = data;

  const scorers = [
    () => scoreS6_Gallery(content.gallery || content.homepage || '', context.s6 || {}, claudeClient),
    () => scoreS7_Blog(content.blog || '', context.s7 || {}, claudeClient),
    () => scoreS8_FAQ(content.faq || content.services || '', context.s8 || {}, claudeClient),
    () => scoreS19_FacebookCompleteness(content.facebook || '', context.s19 || {}, claudeClient),
    () => scoreS20_FacebookContent(content.facebook || '', context.s20 || {}, claudeClient),
    () => scoreS24_FacebookVideo(content.facebook || '', context.s24 || {}, claudeClient),
    () => scoreS25_NextdoorPresence(content.nextdoor || '', context.s25 || {}, claudeClient),
    () => scoreS27_NextdoorCommunity(content.nextdoor || '', context.s27 || {}, claudeClient),
    () => scoreS31_AggregateReviews(content.reviews || '', context.s31 || {}, claudeClient),
    () => scoreS32_SentimentConsistency(content.reviews || '', context.s32 || {}, claudeClient),
    () => scoreS33_Tier1Directory(content.directories || '', context.s33 || {}, claudeClient),
    () => scoreS34_TradeAssociation(content.about || content.homepage || '', context.s34 || {}, claudeClient),
    () => scoreS35_BBB(content.about || content.homepage || '', context.s35 || {}, claudeClient),
    () => scoreS36_LSA(content.serp || '', context.s36 || {}, claudeClient),
    () => scoreS39_Schema(content.homepage || '', context.s39 || {}, claudeClient),
    () => scoreS40_SeasonalContent(content.homepage || content.blog || '', context.s40 || {}, claudeClient),
    () => scoreS41_ServiceAreaContent(content.service_area || '', context.s41 || {}, claudeClient),
    () => scoreS42_SeasonalCampaigns(content.homepage || '', context.s42 || {}, claudeClient),
    () => scoreS46_VideoQuality(content.video || '', context.s46 || {}, claudeClient),
    () => scoreS47_VideoCrossPosting(content.video || '', context.s47 || {}, claudeClient),
    () => scoreS51_SearchSOV(content.serp || '', context.s51 || {}, claudeClient),
    () => scoreS52_SocialSOV(content.social || '', context.s52 || {}, claudeClient),
    () => scoreS53_CompetitorPressure(content.serp || '', context.s53 || {}, claudeClient),
    () => scoreS54_BrandedSearch(content.serp || '', context.s54 || {}, claudeClient),
    () => scoreS57_QuoteFriction(content.contact || content.homepage || '', context.s57 || {}, claudeClient),
    () => scoreS60_MobileExperience(content.homepage || '', context.s60 || {}, claudeClient),
  ];

  // Run all in parallel — gate results come back instantly, Claude calls run concurrently
  return Promise.all(scorers.map(fn => fn()));
}

module.exports = {
  scoreAllMethod2,
  // Individual exports for unit testing
  scoreS6_Gallery, scoreS7_Blog, scoreS8_FAQ,
  scoreS19_FacebookCompleteness, scoreS20_FacebookContent, scoreS24_FacebookVideo,
  scoreS25_NextdoorPresence, scoreS27_NextdoorCommunity,
  scoreS31_AggregateReviews, scoreS32_SentimentConsistency,
  scoreS33_Tier1Directory, scoreS34_TradeAssociation, scoreS35_BBB, scoreS36_LSA,
  scoreS39_Schema, scoreS40_SeasonalContent, scoreS41_ServiceAreaContent, scoreS42_SeasonalCampaigns,
  scoreS46_VideoQuality, scoreS47_VideoCrossPosting,
  scoreS51_SearchSOV, scoreS52_SocialSOV, scoreS53_CompetitorPressure, scoreS54_BrandedSearch,
  scoreS57_QuoteFriction, scoreS60_MobileExperience,
};


// ─── TEST (gate scores only — no Claude client) ────────────────────────────────
if (require.main === module) {
  const testData = {
    content: {
      homepage: 'Welcome to Timmins Best Plumbing. Emergency plumbing 24/7. Call now.',
      gallery:  'Before and after gallery showing drain cleaning, pipe replacement, water heater installs.',
      blog:     'How to prevent frozen pipes this winter. When to replace your water heater. Top 5 signs your drain needs cleaning.',
      faq:      'How much does drain cleaning cost? Do you offer free estimates? Are you available 24/7? How long does pipe repair take? Do you warranty your work? What areas do you serve? Are you licensed and insured?',
      facebook: 'Posts: Winter pipe protection tips. New furnace install in Timmins. Community BBQ sponsorship. Emergency call? We answer 24/7.',
      nextdoor: 'Recommended by 22 neighbours. Top recommendation for plumbing in Timmins.',
      service_area: 'We serve Timmins, Porcupine, South Porcupine, Schumacher, Mountjoy, and surrounding communities within 100km.',
      contact:  'Request a quote — Name, Phone, Service needed. We respond within 2 hours. Online booking available via Jobber.',
    },
    context: {
      s6:  { imageCount: 34, hasGalleryPage: true },
      s7:  { blogPostCount: 18, lastPostDaysAgo: 12, hasBlogSection: true },
      s8:  { faqQuestionCount: 22, hasFAQSection: true },
      s19: { pageExists: true, claimed: true, hasCTA: true, aboutSection: true, hasProfilePhoto: true },
      s20: { postCount30Days: 6, postCount90Days: 16, hasGroupActivity: true },
      s24: { videoCount: 8, reelCount: 12, mostRecentVideoDaysAgo: 5 },
      s25: { pageExists: true, claimed: true, serviceAreaConfigured: true },
      s27: { organicMentionCount: 14, mentionWindowDays: 90 },
      s31: { platformsWithReviews: ['GBP','HomeStars','Facebook','Angi','Nextdoor'], totalReviews: 187 },
      s32: { totalReviews: 187, platformCount: 5, avgRating: 4.7 },
      s33: { directoriesPresent: ['HomeAdvisor','Houzz Pro'], claimedCount: 2 },
      s34: { associationsFound: ['PHCC'], trade: 'plumbing' },
      s35: { bbbListed: true, accredited: true, rating: 'A+', complaintsOpen: 0 },
      s36: { lsaVerified: true, lsaActive: true, googleGuaranteed: true, primaryKeywordPresent: true },
      s39: { schemaTypes: ['LocalBusiness','Plumber','FAQPage'], hasLocalBusiness: true, hasErrors: false, serviceSchemaCount: 4 },
      s40: { seasonalPagesFound: 3, gbpSeasonalPosts: 8, contentPublishedBeforePeak: true, trade: 'plumbing' },
      s41: { serviceAreaPageCount: 8, communitiesCovered: ['Timmins','Porcupine','South Porcupine','Schumacher','Mountjoy','Gogama','Chapleau','Foleyet'], protectedMarketCommunities: ['Timmins','Porcupine','South Porcupine','Schumacher','Mountjoy','Gogama','Chapleau','Foleyet','Matheson'] },
      s42: { campaignCount12Mo: 4, channelsUsed: ['website','GBP','Facebook','LSA'], launchedBeforePeak: true },
      s46: { totalVideoCount: 22, hasEducationalContent: true, hasProjectReveals: true, titlesOptimised: true },
      s47: { platformsWithVideo: ['YouTube','Facebook','website'], matchingContentFound: true },
      s51: { mapPackPosition: 1, organicRank: 2, keywordsInTop3: 8, totalKeywordsChecked: 10 },
      s52: { ownPageMentions: 45, communityMentions: 28, competitorMentions: 9 },
      s53: { competitorLSACount: 2, competitorAdCount: 1, ownLSAActive: true, ownMapPackPosition: 1 },
      s54: { brandedRank: 1, gbpAppearsForBrand: true, directoryListingsForBrand: 8, estimatedBrandedVolume: 120 },
      s57: { hasQuoteForm: true, hasOnlineBooking: true, formFieldCount: 3, responseTimeStated: true },
      s60: { mobileScore: 91, lcpSeconds: 1.4, clsScore: 0.05, fidMs: 45, hasClickToCall: true },
    },
  };

  console.log('\n─── Method 2 Gate Scores (no Claude) ───\n');
  scoreAllMethod2(testData, null).then(scores => {
    let total = 0;
    scores.forEach(s => {
      const bar = '█'.repeat(s.score) + '░'.repeat(3 - s.score);
      const claudeTag = s.claudeCalled ? '[C]' : '   ';
      console.log(`S${String(s.signal).padStart(2,'0')} ${claudeTag} [${bar}] ${s.score}/3  ${s.note}`);
      total += s.score;
    });
    console.log(`\nTotal: ${total}/${scores.length * 3} across ${scores.length} Method 2 signals`);
    console.log(`Average: ${(total/scores.length).toFixed(2)}/3`);
    console.log('\n[C] = Claude was called. All show gate scores here since claudeClient = null.');
  });
}
