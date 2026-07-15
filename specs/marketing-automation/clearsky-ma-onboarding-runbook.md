ClearSky Software — Confidential — Internal Document

**Onboarding Runbook**

Internal Operations Reference — ClearSky Team Use Only

April 2026

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564

| *This is an internal ClearSky document. Clients do not see it, receive it, or interact with it. The ClearSky team executes every step on behalf of the client. The client’s job is to be available for the walkthrough call and to provide account access when requested. Everything else is handled by ClearSky.* |
| --- |

# **Pre-Onboarding — Complete Before the Session**

Every item in this section must be confirmed before the onboarding session begins. Do not start technical setup until all of this is done.

## **Client information to collect at signup**

- Business name, city, and primary service area

- Primary trade — plumbing confirmed for default configuration

- Website URL and CMS platform — identify before the session by visiting the site and checking page source

- Google Ads account ID or confirmation that no account exists

- Meta Business Manager ID or confirmation that no account exists

- The client’s Google account login (the one that owns Google Ads) — needed for OAuth

- The client’s Facebook account login (the one with Business Manager admin access) — needed for OAuth

## **Accounts to prepare before the session**

- ClearSky platform — client website provisioned and ready

- Communication hub — client profile created

- ClearSky dashboard — client account created, pixel snippet generated and ready to copy

# **Section 1 — Platform Configuration**

Because ClearSky provides the website, there is no third-party CMS pixel installation in the traditional sense. The ClearSky platform is the website. The pixel and all tracking are native to the platform and configured through the ClearSky dashboard.

## **Platform setup steps**

- ClearSky dashboard → Client → New Client → enter business details

- Confirm trade is set to Plumbing — this loads the default plumbing intent rules configuration

- Confirm city is set correctly — this loads the correct market tier from the lookup table

- Confirm website is provisioned and accessible at the client’s domain

- Confirm pixel is active on all pages — check event stream for a test session

# **Section 2 — OAuth — Google Ads**

## **If the contractor has an existing Google Ads account**

- ClearSky dashboard → Client → Integrations → Google Ads → Connect

- The contractor must be logged into the correct Google account during this step — the one that owns the Ads account, not a personal Gmail

- Grant ClearSky audience management and read access to campaign data

- Confirm the correct Google Ads account ID appears in the ClearSky dashboard after connection

- Document the connected account ID in the client record

## **If the contractor does not have a Google Ads account**

- Not a blocker — audiences can be built in ClearSky before the ad account exists

- Document as an open item in the client record

- Do not pressure the contractor to create an ad account during onboarding — outside ClearSky scope

- When the contractor is ready to run Google Ads, the OAuth connection takes 10 minutes to complete

| *Token refresh note: Google OAuth tokens can silently fail if the contractor changes their Google password or revokes app permissions. Check connection status at every monthly review. This is a proactive monitoring responsibility, not a reactive one.* |
| --- |

# **Section 3 — OAuth — Meta**

## **If the contractor has an existing Meta Business Manager account**

- ClearSky dashboard → Client → Integrations → Meta → Connect

- The contractor must be logged into the Facebook account with admin access to Business Manager

- Confirm the ad account is linked inside Business Manager before proceeding — some contractors have Business Manager but have not linked their ad account

- Grant ClearSky audience management and ad account read access

- Document the connected Business Manager ID and ad account ID in the client record

## **Common complications — handle before the onboarding session ends**

- Contractor has a Facebook page managed by a marketing agency and does not have Business Manager admin access — document the agency name, flag as open item, schedule a follow-up once agency access is resolved

- Contractor has Business Manager but ad account is not linked — walk them through linking the ad account before proceeding with the OAuth connection

- Contractor has no Meta Business Manager account — not a blocker. Document and note as open item. A personal Facebook page cannot be connected.

# **Section 4 — Intent Rules Configuration**

The default plumbing configuration is loaded automatically when the trade is set to Plumbing. The ClearSky team reviews and adjusts URL patterns to match the client’s actual site structure.

- ClearSky dashboard → Client → Intent Rules → Configuration

- Review Emergency bucket URL patterns — confirm they match the client’s emergency-related pages

- Review Active Project URL patterns — confirm they match the client’s pricing, quote, and booking pages

- Review Comparison URL patterns — confirm they match the client’s review, gallery, and about pages

- Review Research URL patterns — confirm they match the client’s blog, FAQ, and content pages

- Confirm engagement threshold is set to platform default: 2 pages + 60 seconds OR any CTA click / form start / quote request

## **Per-client overrides — document any that apply**

- Emergency URL patterns that differ from the default

- Proof blocks that should be suppressed — e.g. client has fewer than 20 reviews, suppress review count, surface years-in-business instead

- CTA text that differs from default — client has specific brand language

## **Before saving — confirm all of the following**

- All URL patterns are lowercase and do not include query strings

- No duplicate URL patterns across buckets — the same URL should not trigger two different buckets

- Preview bucket assignment for three sample URLs: one emergency page, one pricing page, one review page

# **Section 5 — Audience Setup and Push**

| **Audience name** | **Bucket** | **Membership duration** |
| --- | --- | --- |
| ClearSky — Emergency | Emergency | 14 days |
| ClearSky — Active Project | Active Project | 90 days |
| ClearSky — Comparison | Comparison | 60 days |
| ClearSky — Research | Research | 180 days |

- ClearSky dashboard → Client → Audiences → Create — create all four with correct bucket mappings and membership durations

- Push to Google Ads: confirm all four appear in Google Ads Audience Manager

- Push to Meta: confirm all four appear in Meta Ads Manager with status Populating

- Note for client walkthrough: audiences require 1,000 members minimum before they can be used for targeting. Typically 30–45 days for a Northern Ontario plumbing contractor.

# **Section 6 — QA Checklist**

Run this checklist in full before the client walkthrough. Do not begin the walkthrough until every item passes. The client should never attend a walkthrough on a system that has not been fully validated.

## **Platform and pixel**

- [ ] Open client’s website in a fresh browser with no cookies

- [ ] Load homepage — confirm pixel fires on page load

- [ ] Navigate to a second page — confirm pixel fires again

- [ ] Confirm anonymous ID is consistent across both page loads — same ID, not regenerated

- [ ] Confirm no console errors related to ClearSky pixel

## **Intent bucket validation**

- [ ] Navigate to emergency page — confirm Emergency bucket assigned in event stream

- [ ] Navigate to quote or pricing page — confirm Active Project bucket assigned

- [ ] Navigate to reviews page — confirm Comparison bucket assigned

- [ ] Navigate to blog or FAQ page — confirm Research bucket assigned

- [ ] Confirm dynamic reassignment: start on Research page, navigate to quote page, confirm reassignment to Active Project

## **Engagement threshold**

- [ ] Confirm pixel event does not fire on single page view under 60 seconds with no CTA interaction

- [ ] Confirm pixel event fires after 2 pages viewed

- [ ] Confirm pixel event fires immediately on CTA click regardless of time on site

## **Hub integration**

- [ ] Generate a test session crossing the engagement threshold

- [ ] Confirm session event appears in communication hub as website activity event on test profile

- [ ] Complete a test form submission — confirm anonymous session history stitches to hub profile

- [ ] Generate a forwarded link token from hub — confirm clicking the link associates session with named profile from first pageview

## **Audiences and OAuth**

- [ ] Confirm all four audiences appear in ClearSky dashboard with correct bucket mappings

- [ ] Confirm all four audiences appear in Google Ads Audience Manager if OAuth connected

- [ ] Confirm all four audiences appear in Meta Ads Manager if OAuth connected

- [ ] Confirm audience membership duration matches tiered expiry schedule

- [ ] Confirm Google Ads connection status shows active

- [ ] Confirm Meta connection status shows active

# **Section 7 — Client Walkthrough Script**

This is a success call, not a training session. The client does not need to learn anything. The ClearSky rep explains what has been built, what to expect, and what the client will see as results. Keep it to 30–45 minutes.

## **Opening — 5 minutes**

Everything is built and running. I want to give you a quick picture of what we’ve set up for your business so you know what to expect over the next 90 days.

- Every visitor to your website is being watched as they browse. The system figures out what they’re looking for — someone who needs emergency help right now, someone ready to get a quote, someone comparing you to other plumbers, or someone still learning. Each type of visitor sees a version of your site matched to where they are in their decision.

- When someone calls, fills a form, or requests a quote, their full history on your site gets attached to their record. When you or your team follows up, you already know what they were looking at.

- We’ve also set up four audiences in your Google and Meta ad accounts — one for each type of visitor. When you run ads, those audiences are ready to use. The people who saw your emergency page get one ad. The people comparing you to other plumbers get a different one.

- Your content is being published automatically based on what people in your market are searching for right now. We watch what’s trending in other markets and get content live on your site before that demand reaches Timmins.

## **What they will see — 10 minutes**

- Monthly report: delivered to your inbox every month. Shows calls generated, audience growth, content published, and how your site is performing. You don’t need to log in anywhere to see your results.

- Dashboard access: you have a dashboard if you want to look at the numbers. Most of our clients focus on the calls and the booked jobs — the report tells you everything you need.

- Your assigned rep: you have one person at ClearSky who manages your marketing. If you ever want to talk, book a 15-minute appointment through our scheduling link and they will call you at that time.

## **What to expect — 10 minutes**

- 30 days: the system is building your audience pools. Your content is going live. You will start to see the system working in the form of visitors coming back to your site.

- 60 days: your ad audiences will be large enough to run retargeting. Your content will be indexed and driving traffic. We will send you a report showing how things are performing.

- 90 days: this is where you should be able to trace a real job back to the system. We will show you the journey — from the first anonymous visit to the call that turned into booked work.

## **Closing — 5 minutes**

We handle everything. You run your business. If something comes up or you have a question, book a 15-minute call with your rep through the scheduling link we’ll send you. Otherwise you’ll hear from us every month with your report and we’ll have a proper review call at 30, 60, and 90 days.

| *Document any questions or concerns raised during the walkthrough in the client record immediately after the call. Any commitment made to the client during the walkthrough must be noted and delivered.* |
| --- |

ClearSky Software — Onboarding Runbook — Internal Operations Reference — April 2026 — Confidential

Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564