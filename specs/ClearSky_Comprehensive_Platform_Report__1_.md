ClearSky Software  —  Comprehensive Platform Report  |  Confidential

| **CLEARSKY SOFTWARE** **Comprehensive Platform Report** *What we built. Why it matters. Whether it is worth it.* Prepared for: Rory Dredhart Version 1.0  │  May 2026  │  Session 1 Handoff |
| --- |

# **Executive Summary**

ClearSky is a proprietary managed growth platform built specifically for Northern Ontario trades contractors, tourism operators, and manufacturers. It is not a website builder. It is not a marketing tool. It is not a CRM. It is a complete managed growth infrastructure that a business owner rents access to — and that is designed to guarantee 20% revenue growth in six months or their money back.

This report covers everything built in Session 1 — the signal capture layer, the intent classification engine, the three-vertical website system, and the ClearSky capture dashboard. It answers four questions a small business owner should ask before committing to a platform of this complexity:

- Why are we doing this — what problem does ClearSky actually solve

- How accurate and detailed is the data ClearSky captures

- How does ClearSky interpret that data and make decisions

- Is this worth the effort for a small business in Northern Ontario

| **The one-paragraph answer** A trades contractor, tourism operator, or manufacturer in Northern Ontario is invisible to most of the people who need their services. They get some calls, some walk-ins, some referrals. They have no idea who visited their website, what they were looking for, or why they left. ClearSky changes that. It sees every visitor, reads their intent in real time, adapts the website to match what they need, routes contacts to the right response, and gets smarter every month as more client data accumulates in the network. The contractor does not touch any of it. They focus on the work. ClearSky handles the rest. |
| --- |

| **01** | **Why We Are Building This** The problem ClearSky solves for a small Northern Ontario business |
| --- | --- |

## **The Problem**

A small trades contractor in Timmins has the same fundamental marketing problem as every other small trades contractor in Northern Ontario. They are good at their work. Their existing customers know it. But the people who do not know them — the homeowner with a burst pipe at 11pm, the family planning a bathroom renovation, the person who just moved to the area — have no way to find them, evaluate them, or contact them efficiently.

The contractor typically responds to this problem the same way every other contractor does. They set up a Google Business Profile. They get a website from a local agency. They run a Facebook ad occasionally. They ask satisfied customers to leave reviews. They wait for the phone to ring.

This approach has four critical failures:

- It treats every visitor the same — the person with a burst pipe and the person casually browsing bathroom ideas get the same website, the same content, the same call to action

- It has no memory — a visitor who comes back three times is treated as a stranger every single time

- It misses contacts — calls go to voicemail, forms go unread, messages on GBP sit for days

- It learns nothing — the contractor has no idea what is working, what is failing, or what their customers are actually searching for

## **What ClearSky Solves**

ClearSky replaces the passive website with an active intelligence system. Instead of waiting for a visitor to contact the contractor, the system reads every visitor's behaviour in real time and adapts to move them toward a booked job.

The system does this across three dimensions simultaneously:

**1 — Intent Classification**

Every visitor to the website is classified into one of four intent buckets in real time — Emergency, Active Project, Comparison, or Research. The bucket is determined by a combination of where they came from, what they are doing on the site, and how quickly they are doing it. The website responds differently to each bucket.

| **Bucket** | **What it means** | **Website response** | **Urgency** |
| --- | --- | --- | --- |
| Emergency | Crisis right now — burst pipe, flooding, no hot water | Phone number front and centre, 15-min SLA, emergency CTA | Immediate |
| Active Project | Planning a specific job this week or month | Estimate CTA, FotoJobber, appointment booking | High |
| Comparison | Evaluating options before deciding | Reviews, credentials, guarantee, social proof | Medium |
| Research | Learning and gathering information | Blog content, FAQ, educational guides | Low |

**2 — Signal Capture**

ClearSky captures signals from 35 distinct source types across the contractor's entire digital and physical marketing universe — not just the website. Every Google Ad click, every GBP phone call, every QR code scan on a yard sign, every email that gets clicked, every SMS that gets tapped. All of it feeds the same intelligence layer.

This matters because most marketing tools only see a fraction of the picture. Google Analytics sees website visitors. The GBP dashboard sees calls and messages. The email platform sees open rates. None of them talk to each other. ClearSky unifies all of it into a single visitor portrait.

**3 — Managed Response**

Every signal that enters the capture layer triggers a decision. The Orchestrator — the decision engine at the centre of the platform — reads the full picture and selects the appropriate response. A rep reviews and approves anything customer-facing before it goes out. The contractor never has to think about any of it.

One rep manages up to 30 contractor clients. Four hours of managed marketing per month per client. AI generates the content, responses, and recommendations. The rep approves and publishes. The client gets a dedicated marketing department without hiring one.

## **The Northern Ontario Context**

The problem ClearSky solves is universal but the Northern Ontario context makes it more acute. The markets are smaller. There are fewer competitors but also fewer customers. Word of mouth travels fast but it does not travel fast enough to fill a service calendar. A plumber in Timmins cannot afford to miss a single viable lead.

The distances between communities — Timmins, Cochrane, Kapuskasing, Iroquois Falls — mean that a contractor who serves a 150km radius needs to be visible in every one of those communities. A generic website with no local SEO strategy is invisible outside the immediate town.

ClearSky addresses this through three Northern Ontario-specific mechanisms:

- Market pages for every community served — individual pages for Timmins, Cochrane, South Porcupine, Iroquois Falls, Kapuskasing, Matheson, Kirkland Lake — each targeting local search terms

- IP geolocation matched to origin-specific social proof — a visitor from Cochrane sees a Cochrane testimonial, not a generic one

- The Sudbury watch market — ContentRadar monitors Sudbury search behaviour 4 to 6 weeks ahead of Timmins, giving the contractor early warning of what their customers will be searching for before they search for it

| **02** | **How Accurate Is the Data** What ClearSky captures, what it knows, and what it honestly does not know |
| --- | --- |

## **The Complete Capture Layer — 35 Source Types**

ClearSky captures signals from every point of contact between the contractor and the market. These are organised into Stream A — individual contact events — and Stream B — aggregate market intelligence.

**Stream A — Individual Contact Events**

Stream A events are things a specific person did. They go through identity resolution and intent classification. They can create or update a visitor profile.

| **Source** | **What is captured** | **Confidence** | **Identity anchor** |
| --- | --- | --- | --- |
| Google Paid Ads | UTM source, medium, campaign, exact keyword, device, timestamp, pixel session | High | Session ID — cookie on form submit |
| Bing Paid Ads | Same as Google Paid Ads | High | Session ID — cookie on form submit |
| Facebook Ad | UTM source, campaign, ad creative, audience — no keyword | High | Session ID — no keyword |
| Google LSA + Telnyx | Phone number, call duration, timestamp, call recording, speech-to-text transcript | Medium | Phone number |
| GBP Website Click | UTM source, referrer, pixel session, device | High | Session ID |
| GBP Phone Call | Phone number, call duration, time of call, Google forwarding number | Medium | Phone number |
| GBP Message | Sender name, message text verbatim, timestamp | Medium | Display name |
| GBP Review | Reviewer name, rating, review text verbatim, timestamp | Medium | Display name + job timing |
| YouTube Organic Link | UTM source, campaign, video ID, referrer, pixel session | High | Session ID |
| YouTube Paid Ad | UTM source, keyword, campaign, non-skip signal, pixel session | High | Session ID |
| LLM Referral | Referrer domain only — query unknown | Medium — flagged | Session ID — behaviour only |
| QR Code | UTM source, campaign, placement tag, mobile confirmed, pixel session | High | Session ID — CID if personalised |
| Email Personalised Link | UTM source, campaign, CID, pixel session, device | High — Tier 1 at load | CID — named at millisecond zero |
| SMS A2P Personalised | UTM, CID, phone number match, mobile confirmed, pixel session | Very High — dual confirmed | CID + phone — strongest anchor |
| AI Chat Widget | Question text verbatim, NLP service type, urgency, pricing language, objections | High signal value | Name if provided at widget open |
| Lead Grabber | Name, phone or email, message verbatim, mode selected, abandonment pattern | High | Phone or email |
| FotoJobber | Photo, annotation, note text verbatim, AI image analysis, service type, severity | High | Contact at submission |
| ViewRoom | 54 possible signals — entry name, dwell, invitation, clicks, downloads, AI questions, appointment booking, rep request | High — 28 to 35 per session | Name at entry |
| Contact Form | Name, phone, email, message verbatim, field abandonment pattern | High | Phone + email |

**Stream B — Aggregate Market Intelligence**

Stream B sources never create individual profiles and never trigger customer-facing actions. They route to the Context Store and inform the Orchestrator's market-level understanding.

| **Source** | **What it provides** | **How it is used** |
| --- | --- | --- |
| Matomo | Session recordings, heatmaps, funnel data, aggregate traffic sources, form analytics — all unsampled | Shows how visitors use the site in aggregate. Identifies friction points and content gaps. |
| DataForSEO | Keyword demand in target markets, SERP rankings, competitor positions, search volume trends | Tells ClearSky what people in Timmins are searching for right now and how RightFlush ranks. |
| ContentRadar aggregate | Topic clustering from AI widget questions and ViewRoom questions across all sessions | Identifies content gaps — topics visitors ask about that the site does not yet cover. |
| Sudbury watch market | Search behaviour in Sudbury 4 to 6 weeks ahead of Timmins | Early warning system. Frozen pipe searches spike in Sudbury in October — Timmins follows in November. |
| Google Search Console | Aggregate keyword clicks and impressions — not per session | Market-level keyword performance data. |
| GBP aggregate insights | Views, searches, direction requests, call volume — aggregate only | Local visibility metrics. |

## **The Three Uncertainty Flags**

ClearSky is honest about what it does not know. Three source categories are flagged as uncertain — meaning the system acknowledges the gap rather than misattributing traffic to a confident-sounding but wrong source.

| **Google AI Mode** Google AI generates answers directly in search results and cites sources. If a visitor clicks a cited link the referrer is stripped or shows generically as google.com. Cannot be distinguished from standard organic. Many AI answers satisfy the question without any click at all — the visitor gets their answer and never arrives on the site. ClearSky flags these sessions as AI Mode uncertain and uses on-page behaviour as the primary classification signal. |
| --- |

| **Dark Social** A visitor watches a RightFlush YouTube video, finds the content helpful, and navigates directly to rightflush.ca by typing the URL from memory. No referrer. No UTM. Arrives as direct traffic. ClearSky knows influence happened — it can see the spike in direct traffic after a video is published — but cannot attribute it to a specific individual or content piece. Flagged honestly. On-page behaviour classifies the session. |
| --- |

| **Direct / Unknown** Typed URL, bookmark, or source that cannot be determined. Could be a returning visitor whose cookie expired, a referral from a source that strips referrer data, or a genuinely new visitor who heard about RightFlush from someone. If a cookie or device fingerprint matches a prior session the system resolves the identity. Otherwise behaviour is the only classification tool. |
| --- |

## **IP Geolocation and Origin Matching**

Every website session captures the visitor's IP address. ClearSky uses this for four purposes:

- City-level geolocation — confirms the visitor is local or identifies their origin market

- Origin-matched social proof — a visitor from Cochrane sees Cochrane testimonials; a visitor from Toronto sees Toronto testimonials

- Bot filtering — known bot IP ranges are dropped before the pixel fires, keeping the engagement score clean

- Tourism distance tier — for Deep Trout Lake Resort, a visitor's distance from the lodge determines which package duration and pricing is shown by default

IP addresses are treated as personal information under PIPEDA. ClearSky uses them for city-level geolocation, aggregate analytics, and bot filtering only. They are not used as identity anchors and are not shared with third parties.

## **Identity Resolution — How Confident Is the System**

ClearSky resolves visitor identity through four mechanisms applied in order of confidence. The system is explicit about which mechanism produced the identification and does not overstate certainty.

| **Method** | **Speed** | **Confidence** | **Limitation** |
| --- | --- | --- | --- |
| CID personalised link | 12 to 54 milliseconds | Very High | Only available on outbound owned channel communications |
| First-party cookie match | 8 to 26 milliseconds | Very High | Fails if visitor cleared cookies or switched browser |
| Device fingerprint match | 28 to 38 milliseconds | High — 90 to 96% | Privacy browsers including Safari ITP and Brave resist fingerprinting |
| Behavioural pattern match | 7 to 15 minutes | Medium — 70 to 85% | Not unique enough alone — best as confirmation layer |
| Explicit re-identification | On user action | Very High | Requires visitor to take an action — welcome back prompt or form entry |

When identity is confirmed — by any method — all events that occurred during the anonymous portion of the session are retroactively stitched to the identified profile. No pixel data is lost.

| **03** | **How ClearSky Interprets the Data** The Engagement Score, intent classification, and the Orchestrator decision engine |
| --- | --- |

## **The Engagement Score**

The Engagement Score is a real-time number between 0 and 100 that reflects where a visitor is in the customer journey at this specific moment. It is deterministic — the same inputs always produce the same score. It is not a machine learning prediction. It is a calculated measurement.

The score is built from three input types:

- Source context — where the visitor came from. A keyword that declares emergency intent pre-loads the score before the pixel fires once.

- Behavioural events — what the visitor does on the site. Scroll depth, dwell time, section visits, clicks, form engagement, tool interactions. Each event carries a score delta.

- Tool engagement — interactions with ViewRoom, FotoJobber, the AI widget, Lead Grabber, and appointment booking. Tool events carry the largest individual deltas because they represent deliberate commitment.

**Score Reference — Key Events and Deltas**

| **Event** | **Score delta** | **Bucket signal** | **Notes** |
| --- | --- | --- | --- |
| Page load | +0 | Unclassified | Session started — score building begins |
| Scroll 25% | +3 | Research | Moved past hero — reading content |
| Scroll 50% | +5 | Research | Mid-page — services or proof visible |
| Scroll 75% | +7 | Comparison | Deep page — about or reviews visible |
| Scroll 90% | +10 | Active Project | Near bottom — contact form approaching |
| 30-second dwell | +4 | Research | Not a bounce — engaged visitor |
| 60-second dwell | +7 | Comparison | Strong interest confirmed |
| 2-minute dwell | +10 | Active Project | Very high engagement |
| Service card hover | +3 | Research | Noticing specific services |
| Service card click | +6 | Comparison | Specific service interest declared |
| Review section dwell 30s | +8 | Comparison | Evaluating — reading testimonials |
| Form name field focused | +8 | Active Project | Started the quote form |
| Form phone field focused | +12 | Active Project | High commitment — phone is personal |
| Form submitted | +20 | Active Project | Conversion event — highest form score |
| Hero CTA click | +12 | Active Project | Deliberate action — knew what they wanted |
| Emergency CTA click | +20 | Emergency | Crisis confirmed — maximum urgency |
| Phone number click | +15 | Active Project or Emergency | Prefers direct contact |
| AI widget question | +10 | Comparison | Verbatim intent — richest text signal |
| FotoJobber photo upload | +10 | Active Project | Personal commitment — own home shown |
| FotoJobber submitted | +12 | Active Project | Complete job description provided |
| ViewRoom entered | +10 | Active Project | Significant engagement threshold |
| ViewRoom invitation sent | +8 | Active Project | Decision involves others — purchase is real |
| Appointment booked | +20 | Active Project | Highest conversion event in system |

## **Intent Bucket Assignment**

The intent bucket follows the score. The score follows the behaviour. The bucket never changes the score — the score changes the bucket. This ensures the classification always reflects observed behaviour, not the other way around.

Bucket transitions happen in real time during the session. A visitor who arrives as Research and clicks a pricing CTA transitions to Active Project mid-session. The website adapts immediately — the dynamic content engine pushes a new variant to the page without a reload.

| **Bucket** | **Score range** | **Primary signals** | **Website response** | **Orchestrator priority** |
| --- | --- | --- | --- | --- |
| Unclassified | 0 to 8 | Page load only — insufficient signal | Default variant — no adaptation yet | None — monitoring only |
| Research | 9 to 24 | Dwell, scroll, service hover, blog read | Educational content, guides, blog links | Low — nurture sequence |
| Comparison | 25 to 44 | Review dwell, pricing visit, CTA hover | Social proof, reviews, guarantee, credentials | Medium — retargeting sequence |
| Active Project | 45 to 74 | Form engagement, service click, tool use | Quote form, appointment booking, FotoJobber | High — conversion sequence |
| Emergency | 75+ | Emergency CTA, after hours, rapid scroll | Phone number, 15-min SLA, immediate escalation | Immediate — 15-minute response |

## **Non-Click Signals — What Visitors Ignore**

ClearSky captures what visitors do not do as carefully as what they do. A visitor who spends 6 seconds on the emergency CTA section and scrolls past without clicking is telling the system something specific — they saw it, considered it, and decided they were not in crisis. That non-click adjusts the bucket hypothesis.

Non-click signals drive dynamic content replacement at three speeds:

- **Immediate — same session — element replaced before the visitor scrolls back to it**

- **Next visit — repeated bypass logged — element removed from their version of the page on return**

- **Cohort level — pattern across many sessions — default content for that bucket updated for all future visitors**

This is the mechanism that makes the website get smarter over time without anyone redesigning it. The visitor trained it.

## **The Orchestrator — Decision Engine**

The Orchestrator is the decision engine that sits above all captured signals. It reads the Engagement Score, the intent bucket, the identification tier, the session tool usage, and the visitor's full prior history — and selects the optimal next action.

The Orchestrator follows the locked seven-stage pipeline:

- Stage 1 — Event intake — signal received and logged

- Stage 2 — Signal detection — event type and confidence evaluated

- Stage 3 — Orchestrator decision — optimal action selected from decision table

- Stage 4 — Action queue — action parameters set and queued for execution

- Stage 5 — Execution — action carried out — rep approves customer-facing actions

- Stage 6 — Outcome — result of action logged

- Stage 7 — Feedback — outcome fed back to improve future decisions

| **The non-negotiables** Human approval is required for all public replies, review responses, and social posts. The system never posts automatically to external platforms. Every customer-facing action is reviewed by a rep before it goes out. The contractor can see everything the system does. Full auditability is maintained at every stage. |
| --- |

## **The Cohort 2 Network — How the System Gets Smarter**

At launch the Orchestrator uses a rules-based decision table — if the visitor is in Emergency bucket at Tier 1, trigger the 15-minute SLA and fire the A2P alert. The rules work but they are static.

As the network of ClearSky clients accumulates Engagement Score trajectory data, the Orchestrator evolves into a predictive engine. It compares individual trajectories against network patterns of contacts that converted at similar score levels with similar bucket histories.

This produces predictions like:

- Visitors who invite a spouse into ViewRoom convert at 3x the rate of solo visitors

- Visitors who download a promo and then request a rep within 5 minutes book 78% of the time

- Visitors who ask more than 4 questions in the AI widget need a follow-up call before committing

- Morning ViewRoom sessions convert at higher rates than evening sessions for water heater jobs

None of this intelligence exists at launch. It accumulates as the network grows. Every client who signs up adds trajectory data. Every data point makes the predictions more accurate. Every new client benefits from every prior client's pattern library. This is the compounding moat that makes ClearSky harder to replicate over time.

| **04** | **How ClearSky Is Managed** The rep model, the client relationship, and the operational structure |
| --- | --- |

## **The One Rep to Thirty Clients Model**

ClearSky is a managed platform. The contractor does not log into a dashboard and adjust settings. They do not write content or respond to reviews. They do not manage their ad budget or check their analytics. A dedicated rep does all of that on their behalf.

The rep model is built on three principles:

- AI generates — all content drafts, review responses, social posts, follow-up messages, and performance reports are generated by the AI layer

- Rep approves — the rep reviews everything before it goes out. Nothing customer-facing is published or sent automatically.

- Client receives — the contractor gets a monthly performance report, a rep call, and the results. They do not need to understand the system to benefit from it.

## **The Four-Hour Monthly Allocation**

Each client receives four hours of managed marketing per month from their dedicated rep. This covers:

- Review monitoring and response — all new GBP reviews read, responses drafted, approved, and published

- Content management — blog posts, seasonal content, ContentRadar-flagged content reviewed and published

- Performance review — monthly report generated, anomalies investigated, recommendations made

- Ad management — Google Ads, Facebook Ads budget reviewed, keywords adjusted, LSA profile maintained

- Lead management — all inbound leads from all sources reviewed, followed up, and logged

- Reputation management — GBP profile maintained, photos updated, service descriptions current

Four hours is sufficient because AI does the generation work. The rep's time is spent on judgment and approval — not creation. A rep who would spend 20 hours per client doing everything manually spends 4 hours because the AI handles the 16-hour generation workload.

## **The 1:30 Rep Ratio**

One rep manages 30 contractor clients. At four hours per client per month that is 120 hours of managed work per rep per month. A full-time rep working 160 hours per month has 40 hours of buffer for onboarding, training, platform management, and the occasional high-activity client.

This ratio makes the economics work. A contractor paying for a managed marketing service at market rates could not afford a dedicated human marketing person. ClearSky makes it possible because one person manages 30 clients simultaneously using AI-assisted workflows — and delivers a quality of service that a solo contractor could never afford individually.

## **The Support Model**

Beyond the dedicated rep, ClearSky operates a support model with three tiers:

- Tier 1 — self-serve — the contractor portal, performance dashboard, and knowledge base handle routine questions

- Tier 2 — rep — the dedicated rep handles all marketing, content, and performance questions within the four-hour allocation

- Tier 3 — ClearSky platform team — technical issues, billing, guarantee claims, and escalations handled by the platform team directly

## **The Six-Month Guarantee**

ClearSky offers a 20% revenue growth guarantee in six months for clients who meet the selection criteria. The guarantee is not a marketing promise — it is a contractual obligation backed by the platform's confidence in its own performance data.

The guarantee creates a powerful alignment of incentives. ClearSky only wins when the contractor wins. The rep's performance is measured against client revenue growth. The platform's reputation depends on delivering results. Every decision — from which pages to build first, to which keywords to target, to which content to publish — is made with the revenue growth target in mind.

Selection criteria for the guarantee include:

- Six months minimum operating history in the target market

- At least 3.5-star Google rating with a minimum of 10 reviews

- Willingness to respond to booked leads within 24 hours

- Commitment to the full four-hour managed marketing allocation

- Market not already occupied by another ClearSky client in the same vertical

| **05** | **Is This Worth the Effort for a Small Business** An honest assessment of value, complexity, and return on investment |
| --- | --- |

## **The Honest Answer**

For a small business owner in Northern Ontario the question is not whether the technology is impressive. The question is whether it moves the needle on revenue — and whether the effort required to implement and maintain it is proportional to the return.

The honest answer is: yes, but the value depends on the vertical and the starting point.

## **The Trades Contractor Case — RightFlush Plumbing**

A plumber in Timmins with 64 Google reviews and 4.7 stars is already performing well. The question is whether ClearSky accelerates that performance or just adds complexity.

The primary value driver for a trades contractor is missed leads. Every voicemail that goes unreturned, every form submission that sits unread for 48 hours, every emergency call that goes to a competitor because the contractor's phone was engaged — these are revenue losses that are invisible to the contractor because they never see the contacts that walked away.

ClearSky makes those losses visible and then eliminates them. The 15-minute emergency response commitment alone — backed by the A2P escalation system and the Telnyx voice integration — is worth significant revenue for a contractor who currently misses after-hours emergency calls.

| **Illustrative example** A Timmins plumber misses an average of 3 after-hours emergency calls per week. Average emergency job value: $450. Annual missed revenue from after-hours calls alone: $70,200. ClearSky's emergency response system captures these calls. Even at 50% conversion of captured calls, that is $35,100 in recovered annual revenue. This is one revenue stream from one feature of the platform. |
| --- |

## **The Tourism Case — Deep Trout Lake Resort**

A fly-in fishing lodge north of Cochrane has a different problem. The product is premium. The market is wide — Ontario, the US, international. The booking cycle is long — visitors plan 3 to 12 months ahead. The contact volume is lower but the value per booking is much higher.

The primary value driver for Deep Trout Lake Resort is reach and conversion quality. A visitor from London, England who spends 70 seconds on the homepage and leaves is not the same as a visitor who reads two blog posts, signs up for the newsletter, and checks the August availability calendar. ClearSky treats them differently — and the newsletter subscriber gets a 12-month nurture sequence that a generic website has no mechanism to deliver.

The IP distance tier system is particularly valuable for tourism. A visitor from Detroit seeing the 7-night expedition package and USD pricing on arrival — before they have scrolled once — is a fundamentally different experience from a visitor who has to hunt for that information. That differentiation converts at a measurably higher rate.

## **The Manufacturing Case — Spruce Lumber Mill**

A lumber mill in Northern Ontario has a B2B sales problem. Procurement managers search for suppliers online. They compare specifications, certifications, lead times, and pricing. They do not fill out contact forms — they call the purchasing line or submit an RFQ.

The primary value driver for a manufacturer is lead quality, not lead volume. A procurement manager who arrives from a Google search for "lumber supplier northern ontario" and spends 5 minutes on the spec sheet page is worth 50 visitors who bounce in 8 seconds. ClearSky identifies that procurement manager, logs their session history, and routes them to the RFQ form or the purchasing phone line — not the generic contact form.

The FotoJobber quality claim scenario is also significant for manufacturing. When an existing client submits a photo of damaged stock with an annotation and a note, that claim is processed in minutes — not days. The speed of response to a quality issue is a direct measure of supplier relationship health. ClearSky makes that response fast and documented.

## **What ClearSky Does Not Do**

An honest assessment requires acknowledging what the platform cannot do, does not do, and should not be expected to do.

| **ClearSky cannot create demand that does not exist** If nobody in Timmins is searching for water softeners, no amount of content optimisation will generate water softener leads. ClearSky captures and converts existing demand more effectively. It does not manufacture demand from nothing. ContentRadar and the Sudbury watch market give advance notice of emerging demand — but they cannot create it. |
| --- |

| **ClearSky cannot compensate for poor service quality** The platform can get more people through the door. If the contractor does poor work, shows up late, or fails to deliver on the 15-minute emergency commitment, the reviews will reflect that. ClearSky amplifies what is already there — good or bad. |
| --- |

| **ClearSky cannot replace the rep** The AI layer generates. The rep judges. That judgment cannot be automated away without degrading quality. A system where AI posts review responses without human review will eventually publish something tone-deaf or factually wrong. The four-hour allocation is not a cost to be minimised — it is the quality control layer. |
| --- |

## **The Complexity Question**

The platform is genuinely complex. The Signal Tracking Taxonomy document alone identifies 35 source types across 8 categories with 3 uncertainty flags and multiple confidence tiers. The Orchestrator has 7 pipeline stages. The website has 25 pages with 7 integrated tools.

But here is the critical point: that complexity is invisible to the contractor. The contractor sees a website, a phone that gets answered, and a rep who handles their marketing. They do not see the pixel event stream. They do not see the identity resolution hierarchy. They do not see the Cohort 2 network accumulating trajectory data.

The complexity exists in the platform layer — not the client layer. This is the correct architecture. Complexity that the client has to manage is a liability. Complexity that the platform manages invisibly on the client's behalf is a competitive advantage.

## **The ROI Framework**

There are three ways to measure ClearSky's return on investment for a small business:

**1 — Revenue recovered from missed leads**

How many leads are currently being lost to voicemail, slow response, or no-show on the website? Every one of those recovered is direct revenue. For most small contractors the answer is several per week. At a modest average job value, the annual recovery number is significant.

**2 — Revenue gained from expanded reach**

The 25-page local SEO structure — including 7 individual market pages for Timmins, Cochrane, South Porcupine, Iroquois Falls, Kapuskasing, Matheson, and Kirkland Lake — puts RightFlush in front of searchers in communities the contractor serves but was previously invisible to. Each community page that ranks is incremental revenue.

**3 — Revenue retained from better conversion**

A visitor who arrives on a generic website and does not find what they need in 8 seconds leaves and calls a competitor. A visitor who arrives on a ClearSky website and sees an emergency CTA, an AI chat that answers their question instantly, and a FotoJobber that lets them describe the job without a call — that visitor converts at a measurably higher rate. Every percentage point improvement in conversion rate is direct revenue.

## **The Competitive Moat**

One final consideration for the small business owner. ClearSky is not a commodity tool available to every competitor. The protected market model means only one plumber in Timmins gets access to ClearSky. If RightFlush is that plumber, no competitor can buy the same advantage in the same market.

Over time the Cohort 2 network makes the platform more accurate and more effective for every client in the network. A competitor who tries to replicate ClearSky from scratch two years from now is not replicating a website and a pixel. They are replicating two years of accumulated trajectory data from dozens of contractor clients across Northern Ontario. That cannot be purchased. It has to be earned.

For a small business in a small market, the compounding advantage of being on ClearSky for three years versus not being on it for three years is the difference between owning the market and competing for scraps of it.

| **06** | **What Was Built in Session 1** A complete inventory of every deliverable produced |
| --- | --- |

## **The Signal Tracking Taxonomy**

A comprehensive Word document defining every signal the ClearSky capture layer collects. Covers all 35 source types, 8 categories, 3 uncertainty flags, confidence tiers, identity anchors, and the IP geolocation and origin-matching system. 14 sections. The foundation document for the capture dashboard.

## **The ClearSky Capture Dashboard**

A fully interactive HTML dashboard demonstrating the complete ClearSky signal capture and intent classification system. Three panels — Capture, Classify, Act. Three vertical selectors — Trades, Tourism, Manufacturing. Fourteen external signal sources in a grouped dropdown. Seventeen on-page scenarios in a second dropdown. Every combination produces a unique animated three-panel demonstration.

The dashboard demonstrates:

- How each of the 14 external signal sources delivers different data to the capture layer

- How identity resolution works — cookie match, device fingerprint, behavioural match, explicit re-identification

- How the Engagement Score builds from pixel events

- How the intent bucket assigns and transitions in real time

- How the Orchestrator queues appropriate responses

- The LSA + Telnyx call bridge sequence in detail

- The personalised link Tier 1 identification at millisecond zero

- The IP distance tier system for Deep Trout Lake Resort — North Bay, Toronto, Detroit, London England

- Origin-matched social proof for all three verticals

- The tourism fly-in product matching by visitor distance

- B2B manufacturing scenarios including FotoJobber quality claim escalation

## **The RightFlush Plumbing Website — Homepage**

A production-grade contractor website homepage built to Option A design specification — white dominant, green accent, Lucide icon service navigation, Barlow Condensed typography. Fully responsive.

The homepage includes:

- Trust bar — licensed and insured, 4.7 stars, 24/7 emergency, free estimates, Timmins and area

- Sticky navigation — logo, eight service icon navigation, emergency button, book now button

- 100vh hero — dark ink background, green radial glow, Barlow Condensed 900-weight headline, stats bar

- Trust strip — green band, four trust signals

- Services grid — eight service cards with Lucide icons, hover animations, emergency card rust treatment

- Proof band — dark background, testimonial, four stat cards

- How it works — four-step process

- Emergency band — full rust red, 24/7 call CTA

- Tools section — AI Chat, FotoJobber, ViewRoom cards

- About section — owner story, credentials, photo placeholder

- Service areas strip — seven clickable city chips

- Footer — four column, services, company, areas, contact

- Lead Grabber — floating rust red button, speak now and email me modes

- AI chat widget — floating green bubble, quick questions, message input

- ClearSky pixel — fully wired — fires on scroll depth, dwell time, all CTAs, all service card hovers and clicks, all tool interactions

- Pixel toast — visible pixel event notification for demo purposes

## **The 25-Page Site Architecture**

A complete site architecture for RightFlush Plumbing covering 25 pages across 8 categories, with tool placement mapping, navigation structure, and local SEO strategy.

| **Category** | **Pages** | **Count** |
| --- | --- | --- |
| Core | Homepage, About Us, Contact / Quote | 3 |
| Emergency | Emergency 24/7, Burst Pipe and Flooding | 2 |
| Plumbing Services | Hot Water Systems, Blocked Drains, Bathroom Renovations, Leak Detection, Gas Plumbing | 5 |
| Water Systems | Water Filtration | 1 |
| Visual Tools | Before and After Gallery | 1 |
| Trust and Proof | Reviews and Testimonials, Our Guarantee | 2 |
| Content and Research | Blog, FAQ | 2 |
| Local and Promotions | Service Areas Hub, Specials and Seasonal Offers | 2 |
| Markets Served | Timmins, Cochrane, South Porcupine, Iroquois Falls, Kapuskasing, Matheson, Kirkland Lake | 7 |
| Total |  | 25 |

## **The Three-Vertical Platform Architecture**

ClearSky is confirmed as a three-vertical platform. Each vertical has its own client, its own tool set, its own on-page scenario library, and its own capture layer logic.

| **Vertical** | **Client** | **Location** | **Key differentiator** | **Tools** |
| --- | --- | --- | --- | --- |
| Trades | RightFlush Plumbing | Timmins ON | 15-minute emergency response, flat-rate pricing, Northern Ontario service area | ViewRoom, FotoJobber, Lead Grabber, AI Chat, Appointments, A2P, Telnyx |
| Tourism | Deep Trout Lake Resort | North of Cochrane ON — fly-in only | IP distance tier product matching, origin-matched proof, fly-in logistics, international visitor content | ViewRoom, Lead Grabber, AI Chat, Blog questions, Newsletter, Promotions, Appointments, A2P, Telnyx |
| Manufacturing | Spruce Lumber Mill | Northern Ontario | B2B RFQ pipeline, FotoJobber quality claims, technical spec matching, volume pricing tiers | ViewRoom, FotoJobber, Lead Grabber, AI Chat, Appointments, A2P, Telnyx |

| **07** | **What Comes Next** The build sequence for Session 2 and beyond |
| --- | --- |

## **Immediate Next Steps — Session 2**

Session 1 established the foundation. Session 2 focuses on the website build — completing the remaining 24 pages for RightFlush Plumbing and wiring the pixel and tools into every page consistently.

Priority build order for Session 2:

- **Site shell — shared navigation, footer, pixel layer, tool integrations as a reusable template**

- **Emergency 24/7 page — highest-priority standalone page, emergency bucket landing page**

- **Bathroom Renovations — Visualizer, ViewRoom, and FotoJobber all live here, most complex page**

- **Contact / Quote page — FotoJobber primary home, appointment booking, all lead capture tools**

- **Before and After Gallery — ViewRoom invite, visual proof, Comparison bucket page**

## **Medium-Term Build — Sessions 3 to 6**

Once the site shell and priority pages are complete:

- Complete all 25 RightFlush pages

- Build Deep Trout Lake Resort website — tourism template, fly-in logistics, IP distance tier content

- Build Spruce Lumber Mill website — B2B template, RFQ workflow, spec sheet integration

- Connect the ClearSky capture dashboard to live pixel data from all three websites

- Build the Communication Hub — the profile and session persistence database

- Build the Orchestrator rules table — connect all capture sources to decision logic

- Build the client management platform — provisions new sites, monitors all clients, runs support workflow

## **Long-Term Platform Build**

The platform's compounding value comes from the Cohort 2 network. Building it requires:

- Cohort 1 — the first contractor, tourism, and manufacturing clients go live and start accumulating trajectory data

- Cohort 2 — as trajectory data accumulates, the Orchestrator evolves from rules-based to predictive

- Machine learning model expansion — the Visualizer's trained model expands to additional trades verticals beyond bathroom renovation

- Market expansion — HVAC vertical, electrical vertical, roofing vertical — each following the trades template

- Geographic expansion — Sudbury, Sault Ste. Marie, Thunder Bay — Northern Ontario markets that share the same trades economy

| **The bottom line.** ClearSky is a bet that small businesses in Northern Ontario deserve the same quality of marketing intelligence that enterprise companies in Toronto take for granted. The platform gives them a protected market, a dynamic website that reads every visitor's intent in real time, a complete suite of conversion tools, a signal detection engine that predicts what their customers will search for before they search for it, and a rep who handles everything so the owner can focus on the work. The goal of the entire system is simple: one booked job. Everything else is infrastructure in service of that goal. |
| --- |

ClearSky Software  —  Proprietary & Confidential