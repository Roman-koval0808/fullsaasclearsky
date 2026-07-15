# RightFlush Plumbing — ClearSky Pixel Implementation
## Developer Reference · Session 3 Handoff

**Project:** ClearSky Software — RightFlush Plumbing website  
**Owner:** Rory Dredhart · r.dredhart@clearskysoftware.net · 705-274-9564  
**Site:** 25 pages across 8 categories  
**Last updated:** May 2026

---

## What the Pixel Does

The ClearSky pixel is a lightweight JavaScript event capture layer that fires on every significant visitor behaviour across every page. It calculates an **Engagement Score** in real time, assigns the visitor to an **Intent Bucket**, and sends that state to the ClearSky hub for use by the Orchestrator and Marketing Execution Engine.

Every pixel event carries:
- `event` — event name (string)
- `label` — human-readable description for the dashboard
- `delta` — points added to the Engagement Score (0–20 typically)
- `bucket` — the intent bucket this signal supports
- `market` — the city/page context (market pages only)
- `score` — running Engagement Score after this event (0–100 cap)

The pixel is **not connected to any third-party analytics**. It writes to the ClearSky hub only.

---

## The Four Intent Buckets

Evaluated in priority order. First match wins. Reassignment fires dynamically mid-session.

| Bucket | Threshold | Override behaviour |
|---|---|---|
| Emergency | Any single Emergency signal | Always overrides all other buckets, no exceptions |
| Active Project | Two or more Active Project signals | Overrides Comparison and Research |
| Comparison | Two or more Comparison signals | Overrides Research |
| Research | Default — any informational content signal | Lowest priority |

---

## Core Pixel Function — firePixel()

Every page implements this function identically:

```javascript
function firePixel(event, label, delta, bucket) {
  _score = Math.min(_score + delta, 100);
  // bucket escalation logic — never downgrade
  if (bucket && bucket !== 'unclassified') {
    const bucketPriority = ['emergency','active','comparison','research','unclassified'];
    const current = bucketPriority.indexOf(_bucket);
    const next = bucketPriority.indexOf(bucket);
    if (current === -1 || next < current || _bucket === 'unclassified') _bucket = bucket;
  }
  // send to hub (implementation replaces toast in production)
  console.log('[ClearSky Pixel]', { event, score: _score, bucket: _bucket, delta, label });
}
```

**In production:** replace the `console.log` line with a POST to the hub endpoint:
```javascript
fetch('/hub/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event, label, delta, bucket,
    score: _score,
    sessionId: _sessionId,
    timestamp: Date.now(),
    page: window.location.pathname
  })
});
```

---

## Standard Events — Every Page

These events are wired on **all 25 pages** using the same implementation.

### Scroll Depth

```javascript
window.addEventListener('scroll', () => {
  const pct = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
  if (pct >= 25 && _scrollDepth < 25) firePixel('scroll_25', 'Scroll 25%', 3, [page-specific-bucket]);
  if (pct >= 50 && _scrollDepth < 50) firePixel('scroll_50', 'Scroll 50%', 5, [page-specific-bucket]);
  if (pct >= 75 && _scrollDepth < 75) firePixel('scroll_75', 'Scroll 75%', 7, 'comparison');
  if (pct >= 90 && _scrollDepth < 90) firePixel('scroll_90', 'Scroll 90%', 8, 'comparison');
});
```

Note: 75% and 90% scroll always fire `comparison` regardless of page type — deep scroll is always a Comparison signal.

### Dwell Time

```javascript
setInterval(() => {
  const seconds = Math.round((Date.now() - _dwellStart) / 1000);
  if (seconds >= 30  && !_d30)  { _d30=true;  firePixel('dwell_30',  '30s dwell',  4, [page-bucket]); }
  if (seconds >= 60  && !_d60)  { _d60=true;  firePixel('dwell_60',  '60s dwell',  7, [page-bucket]); }
  if (seconds >= 120 && !_d120) { _d120=true; firePixel('dwell_120', '2min dwell', 8, [page-bucket]); }
}, 1000);
```

### Section Visibility (IntersectionObserver)

Sections tagged with `data-pixel-event` attributes fire automatically when they scroll into view:

```html
<section 
  data-pixel-event="event_name"
  data-pixel-label="Human readable label"
  data-pixel-delta="6"
  data-pixel-bucket="comparison">
```

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      firePixel(el.dataset.pixelEvent, el.dataset.pixelLabel, parseInt(el.dataset.pixelDelta), el.dataset.pixelBucket);
      observer.unobserve(el); // fires once only
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('[data-pixel-event]').forEach(el => observer.observe(el));
```

### Navigation CTAs

```javascript
navEmergencyBtn.addEventListener('click', () => firePixel('nav_emergency', 'Nav: Emergency', 15, 'emergency'));
navBookBtn.addEventListener('click', () => firePixel('nav_book', 'Nav: Book Now', 10, 'active'));
```

---

## Page-by-Page Pixel Reference

### PAGE 1 — Homepage (`/`)

**Page load:** Not applicable — homepage is the classification start. No bucket assigned on load.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `scroll_25/50/75/90` | Scroll depth milestones | 3 / 5 / 7 / 8 | varies |
| `dwell_30/60/120` | Time on page | 4 / 7 / 8 | varies |
| `service_card_hover` | Hover over any service card | 2 | research |
| `service_card_click` | Click any service card | 8 | active |
| `emergency_card_click` | Click Emergency service card | 15 | emergency |
| `hero_cta_click` | Hero CTA button | 10 | active |
| `fotojobber_open` | FotoJobber tool opened | 8 | active |
| `fotojobber_submit` | FotoJobber photo submitted | 20 | active |
| `lead_grabber_open` | Lead Grabber opened | 8 | active |
| `lead_grabber_submit` | Lead Grabber submitted | 15 | active |
| `chat_open` | AI Chat opened | 6 | research |
| `chat_question` | Question sent in AI Chat | 10 | varies |
| `nav_emergency` | Nav: Emergency clicked | 15 | emergency |
| `nav_book` | Nav: Book Now clicked | 10 | active |

**Bucket assignment rule:** Homepage classifies from zero. All four buckets in play. First strong signal wins.

---

### PAGE 2 — About Us (`/about`)

**Page load:** `firePixel('page_load', 'About page — Comparison bucket signal', 5, 'comparison')`

Visiting the About page is a **Comparison bucket rule trigger** per the rules config. It signals the visitor is evaluating the business, not just researching the service.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 5 | comparison |
| `about_story` | Owner story section enters viewport | 8 | comparison |
| `about_team` | Team section enters viewport | 6 | comparison |
| `about_how` | How we work section enters viewport | 6 | comparison |
| `about_proof` | Proof band enters viewport | 5 | comparison |
| `dwell_60` | 60 seconds on page | 8 | comparison |
| `dwell_120` | 2 minutes on page | 10 | comparison |
| `hero_call` | Call CTA in hero | 15 | active |
| `cta_book` | Get a quote CTA | 12 | active |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now nav | 10 | active |
| `chat_open` | AI Chat opened | 6 | comparison |
| `chat_question` | Chat question sent | 8 | comparison |
| `lg_open` | Lead Grabber opened | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

---

### PAGE 3 — Contact / Quote (`/contact`)

**Page load:** `firePixel('page_load', 'Contact page — Active Project bucket', 8, 'active')`

This is the primary conversion page. Visiting Contact/Quote fires Active Project immediately — a visitor reaching this page has demonstrated intent.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 8 | active |
| `fotojobber_open` | FotoJobber opened | 8 | active |
| `fotojobber_submit` | FotoJobber photo submitted | 20 | active |
| `form_name_focus` | Name field focused | 5 | active |
| `form_phone_focus` | Phone field focused | 8 | active |
| `form_service_select` | Service type selected | 6 | active |
| `form_submit` | Quote form submitted | 20 | active |
| `call_cta` | Call CTA clicked | 15 | active |
| `lg_open` | Lead Grabber opened | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |
| `chat_open` | AI Chat opened | 6 | comparison |
| `chat_question` | Chat question sent | 10 | active |

---

### PAGE 4 — Emergency 24/7 (`/emergency`)

**Page load:** `firePixel('page_load', 'Emergency 24/7 page', 20, 'emergency')`

URL contains `/emergency` — Emergency bucket rule fires immediately on page load. No other bucket can override Emergency once assigned.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads (URL rule: /emergency) | 20 | emergency |
| `hero_call` | Hero call button clicked | 20 | emergency |
| `cta_call` | Bottom call CTA | 20 | emergency |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `callback_open` | Callback form opened | 12 | emergency |
| `callback_submit` | Callback submitted | 20 | emergency |
| `lg_open` | Lead Grabber opened | 12 | emergency |
| `lg_submit` | Lead Grabber submitted | 20 | emergency |
| `chat_open` | AI Chat opened | 6 | emergency |
| `chat_question` | Chat question | 10 | emergency |
| `scroll_25/50/75/90` | Scroll depth | 3/5/7/10 | emergency |
| `dwell_30/60/120` | Dwell time | 4/7/10 | emergency |

**Note:** Lead Grabber is speak-now only on emergency pages — email mode is suppressed.

---

### PAGE 5 — Burst Pipe & Flooding (`/burst-pipe`)

**Page load:** `firePixel('page_load', 'Burst Pipe page — Emergency bucket', 20, 'emergency')`

URL contains `/burst-pipe` — Emergency bucket URL rule fires immediately. Same emergency treatment as Page 4.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads (URL rule: /burst-pipe) | 20 | emergency |
| `problem_click` | Any problem card clicked (tel: link) | 20 | emergency |
| `hero_call` | Hero call button | 20 | emergency |
| `cta_call` | Bottom CTA | 20 | emergency |
| `callback_open` | Callback form toggle | 12 | emergency |
| `callback_submit` | Callback submitted | 20 | emergency |
| `steps_view` | What to do section | 3 | emergency |
| `tips_view` | Water damage tips | 2 | emergency |
| `proof_view` | Proof cards | 4 | emergency |
| `scroll_25` | Scroll 25% | 20 | emergency |
| `scroll_50/75/90` | Scroll 50/75/90% | 5/7/10 | emergency |
| `dwell_30/60/120` | Dwell time | 4/7/10 | emergency |
| `lg_open` | Lead Grabber | 12 | emergency |
| `lg_submit` | Lead Grabber submitted | 20 | emergency |
| `chat_open` | AI Chat | 6 | emergency |
| `chat_question` | Chat question | 10 | emergency |

---

### PAGES 6–10 — Service Pages (`/hot-water`, `/blocked-drains`, `/leak-detection`, `/gas-plumbing`, `/water-filtration`)

Single template file (`rightflush-service-pages.html`) — `window.PAGE` config controls per-page content.

**Page load signals differ by service:**

| Page | page_load delta | page_load bucket |
|---|---|---|
| Hot Water (`/hot-water`) | 6 | active |
| Blocked Drains (`/blocked-drains`) | 6 | active |
| Leak Detection (`/leak-detection`) | 4 | research |
| Gas Plumbing (`/gas-plumbing`) | 6 | active |
| Water Filtration (`/water-filtration`) | 4 | research |

**Rationale:** Leak Detection and Water Filtration are more often Research intent (homeowner investigating). Hot Water, Drains, and Gas are more often Active Project (homeowner with a defined need).

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | varies | varies |
| `scope_view` | Scope/services section | 5 | active |
| `howto_view` | How it works section | 4 | active |
| `fotojobber_open` | FotoJobber opened (not water-filtration) | 8 | active |
| `fotojobber_submit` | FotoJobber submitted (not water-filtration) | 20 | active |
| `apt_form_focus` | Appointment form field focused | 6 | active |
| `apt_submit` | Appointment form submitted | 20 | active |
| `emergency_band` | Emergency band section | 8 | emergency |
| `related_svc_click` | Related service clicked | 5 | active |
| `scroll_25/50/75/90` | Scroll depth | 3/5/7/8 | active |
| `dwell_30/60/120` | Dwell time | 4/7/8 | active |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now nav | 10 | active |
| `lg_open` | Lead Grabber opened | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |
| `chat_open` | AI Chat | 6 | active |
| `chat_question` | Chat question | 10 | active |

---

### PAGE 8 — Bathroom Renovations (`/bathroom-renovations`)

Inherits all service page events above, plus tool-specific events:

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `visualizer_open` | Visualizer tool opened | 8 | comparison |
| `visualizer_style_select` | Design style selected | 10 | comparison |
| `visualizer_save` | Result saved | 15 | active |
| `viewroom_open` | ViewRoom entered | 12 | active |
| `viewroom_question` | Question asked in ViewRoom | 10 | active |
| `viewroom_apt_book` | Appointment booked via ViewRoom | 20 | active |

---

### PAGE 12 — Before & After Gallery (`/before-after-gallery`)

**Page load:** `firePixel('page_load', 'Gallery page — Comparison bucket', 5, 'comparison')`

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 5 | comparison |
| `gallery_item_view` | Gallery item enters viewport | 4 | comparison |
| `gallery_item_click` | Gallery item clicked/expanded | 8 | comparison |
| `viewroom_open` | ViewRoom opened | 12 | active |
| `dwell_60` | 60s on page | 8 | comparison |
| `dwell_120` | 2min on page | 10 | comparison |
| `cta_estimate` | Get estimate CTA | 12 | active |

---

### PAGE 13 — Reviews & Testimonials (`/reviews`)

**Page load:** `firePixel('page_load', 'Reviews page — Comparison bucket', 4, 'comparison')`

Visiting the Reviews page is a Comparison bucket rule trigger. The 60-second dwell rule is particularly important — "spent 90 seconds on reviews page" is a named Comparison bucket assignment rule in the rules config.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 4 | comparison |
| `reviews_section` | Reviews grid enters viewport | 8 | comparison |
| `review_filter` | Filter by category used | 5 | comparison |
| `write_review_view` | Write a review section | 5 | comparison |
| `write_review` | Google review link clicked | 8 | comparison |
| `write_review_nav` | Write review nav link | 5 | comparison |
| `dwell_30` | 30s on page | 4 | research |
| `dwell_60` | 60s on page (**Comparison rule fires here**) | 8 | comparison |
| `dwell_120` | 2min on page | 8 | comparison |
| `scroll_50/75/90` | Scroll depth | 5/7/8 | comparison |
| `cta_call` | Call CTA | 15 | active |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now nav | 10 | active |
| `chat_open` | AI Chat | 6 | comparison |
| `chat_question` | Chat question | 10 | comparison |
| `lg_open` | Lead Grabber | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

---

### PAGE 14 — Our Guarantee (`/our-guarantee`)

**Page load:** `firePixel('page_load', 'Our Guarantee — Comparison bucket', 4, 'comparison')`

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 4 | comparison |
| `guar_workmanship` | Workmanship section | 6 | comparison |
| `guar_pricing` | Flat-rate pricing section | 6 | comparison |
| `guar_licensing` | Licensing section | 5 | comparison |
| `guar_standards` | Response standards table | 5 | comparison |
| `guar_proof` | Proof band | 5 | comparison |
| `dwell_60` | 60s on page | 7 | comparison |
| `dwell_120` | 2min on page | 8 | comparison |
| `cta_call` | Call CTA | 15 | active |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now nav | 10 | active |
| `chat_open` | AI Chat | 6 | comparison |
| `chat_question` | Chat question | 10 | comparison |
| `lg_open` | Lead Grabber | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

---

### PAGE 15 — Blog (`/blog`)

**Page load:** `firePixel('page_load', 'Blog page — Research bucket', 3, 'research')`

All blog question submissions fire ContentRadar signals. The 2-minute dwell is the key Research classification signal.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 3 | research |
| `blog_filter` | Topic filter used | 5 | research |
| `blog_post_open` | Post opened | 10 | research |
| `blog_q_focus` | Hero question form field focused | 6 | research |
| `blog_question_submit` | Question submitted (**ContentRadar signal**) | 12 | research |
| `post_q_focus` | Per-post question form focused | 8 | research |
| `post_question_submit` | Per-post question submitted (**ContentRadar signal**) | 12 | research |
| `sidebar_q_focus` | Sidebar question focused | 6 | research |
| `sidebar_question_submit` | Sidebar question submitted (**ContentRadar signal**) | 10 | research |
| `dwell_30/60` | 30s / 60s on page | 4/7 | research |
| `dwell_120` | 2min dwell (**Research classification**) | 10 | research |
| `scroll_75/90` | Deep scroll | 7/8 | comparison |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now — **fires active** | 12 | active |
| `chat_open` | AI Chat | 6 | research |
| `chat_question` | Chat question | 10 | research |
| `lg_open` | Lead Grabber | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

**ContentRadar integration note:** Question submissions from the blog should be forwarded to the ContentRadar flag queue. If 5+ submissions on the same topic arrive within a 48-hour window, a ContentRadar flag fires. This is the primary on-site ContentRadar source.

---

### PAGE 16 — FAQ (`/faq`)

**Page load:** `firePixel('page_load', 'FAQ page — Research·Comparison bucket', 4, 'research')`

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 4 | research |
| `faq_expand` | FAQ accordion item opened | 5 | research |
| `faq_search` | Search used | 5 | research |
| `faq_question_submit` | "Still have a question" submitted (**ContentRadar**) | 10 | research |
| `faq_still_focus` | Question field focused | 6 | research |
| `dwell_30/60` | 30s / 60s | 4/7 | research |
| `dwell_120` | 2min | 10 | research |
| `scroll_75/90` | Deep scroll | 7/8 | comparison |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now | 10 | active |
| `sidebar_call` | Sidebar call button | 15 | active |
| `chat_open` | AI Chat | 6 | research |
| `chat_question` | Chat question | 10 | research |
| `lg_open` | Lead Grabber | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

---

### PAGE 17 — Service Areas Hub (`/service-areas`)

**Page load:** `firePixel('page_load', 'Service Areas Hub — Research bucket', 3, 'research')`

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 3 | research |
| `area_click` | Any area chip clicked | 5 | research |
| `hub_map` | Map section enters viewport | 4 | research |
| `hub_areas` | Area detail cards enter viewport | 5 | comparison |
| `area_card_click` | Area detail card clicked | 5 | comparison |
| `notsure_call` | "Not sure" call button | 15 | active |
| `dwell_30` | 30s | 4 | research |
| `dwell_60` | 60s | 7 | comparison |
| `dwell_120` | 2min | 8 | comparison |
| `scroll_50/75/90` | Scroll depth | 5/7/8 | comparison |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now | 10 | active |
| `chat_open` | AI Chat | 6 | research |
| `chat_question` | Chat — coverage question | 8 | research |
| `lg_open` | Lead Grabber | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

---

### PAGE 18 — Specials & Seasonal Offers (`/specials`)

**Page load:** `firePixel('page_load', 'Specials page — Comparison · Active Project', 6, 'comparison')`

This page has the most important bucket transition on the site: **Comparison → Active Project**. A visitor who visits Specials and engages with the booking form is transitioning from evaluating to committing. The appointment submit fires the highest-value single non-emergency event on the site.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 6 | comparison |
| `spl_card_view` | Special offer card enters viewport | 8 | comparison |
| `spl_claim_click` | "Claim this offer" button clicked | 12 | active |
| `apt_name_focus` | Booking form: name field focused | 8 | active |
| `apt_phone_focus` | Booking form: phone field focused | 12 | active |
| `spl_apt_submit` | **Booking submitted — Comparison → Active Project** | 20 | active |
| `dwell_30` | 30s | 4 | comparison |
| `dwell_60` | 60s (**Specials interest signal**) | 8 | active |
| `dwell_120` | 2min | 10 | active |
| `scroll_25/50` | Early scroll | 3/6 | comparison |
| `scroll_75/90` | Deep scroll | 8/10 | active |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now | 10 | active |
| `chat_open` | AI Chat | 6 | comparison |
| `chat_question` | Chat question | 10 | comparison |
| `lg_open` | Lead Grabber | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

---

### PAGES 19–25 — Market Pages (`/timmins`, `/cochrane`, `/south-porcupine`, `/iroquois-falls`, `/kapuskasing`, `/matheson`, `/kirkland-lake`)

Single template file (`rightflush-market-pages.html`) — `window.PAGE` config controls per-market content.

**Page load bucket by market:**

| Market | page_load delta | page_load bucket |
|---|---|---|
| Timmins | 4 | comparison |
| South Porcupine | 4 | comparison |
| Iroquois Falls | 4 | comparison |
| Matheson | 4 | comparison |
| Cochrane | 4 | comparison |
| Kapuskasing | 3 | research |
| Kirkland Lake | 3 | research |

Kapuskasing and Kirkland Lake are Research on load — honest ETA copy on those pages (90–120 min) signals a visitor more likely exploring than actively booking. They can still escalate to Comparison or Active.

| Event ID | Trigger | Delta | Bucket |
|---|---|---|---|
| `page_load` | Page loads | 3–4 | varies per market |
| `mkt_local` | Local context section enters viewport | 5 | comparison |
| `mkt_services` | Services section | 4 | comparison |
| `mkt_book` | Booking section | 6 | comparison |
| `mkt_proof` | Local proof (origin-matched review) | 6 | comparison |
| `heroCta` | Book free estimate CTA | 12 | active |
| `heroCall` | Call CTA in hero | 12 | active |
| `emgCall` | Emergency call button | 12 | active |
| `bandCall` | Emergency band CTA | 12 | active |
| `apt_name_focus` | Booking form: name focused | 6 | active |
| `apt_phone_focus` | Booking form: phone focused | 10 | active |
| `apt_submit` | **Appointment submitted** | 20 | active |
| `dwell_30` | 30s | 4 | varies |
| `dwell_60` | 60s | 7 | comparison |
| `dwell_120` | 2min | 8 | comparison |
| `scroll_50/75/90` | Deep scroll | 5/7/8 | comparison |
| `nav_emergency` | Emergency nav | 15 | emergency |
| `nav_book` | Book Now | 10 | active |
| `chat_open` | AI Chat | 6 | comparison |
| `chat_question` | Chat question (ETA, services, quote) | 8 | comparison |
| `lg_open` | Lead Grabber | 8 | active |
| `lg_submit` | Lead Grabber submitted | 15 | active |

---

## Tool Placement Summary

| Tool | Pages | Notes |
|---|---|---|
| ClearSky Pixel | All 25 | Every page — always wired |
| AI Chat (widget) | All 25 | Every page — always wired |
| Lead Grabber (both modes) | All except emergency pages | Speak-now + email both active |
| Lead Grabber (speak-now only) | Emergency 24/7, Burst Pipe | Email mode suppressed |
| FotoJobber | Contact/Quote, Hot Water, Blocked Drains, Leak Detection, Gas, Bathroom Renos | NOT on emergency pages, NOT on Water Filtration |
| Appointments widget | Contact/Quote, all service pages, Specials, all market pages | Embedded booking form |
| Visualizer | Bathroom Renovations only | One page, one vertical |
| ViewRoom | Bathroom Renovations, Before & After Gallery | Two pages only |

---

## Emergency URL Rules

The following URL patterns trigger Emergency bucket assignment automatically on page load, regardless of any other signals. These are evaluated before any scroll or dwell time:

```
/emergency
/burst-pipe
/flood
/no-hot-water
/blocked-drain
/leak
/urgent
```

Any page whose URL contains these strings fires a +20 Emergency pixel on load and locks the Emergency bucket.

---

## ContentRadar Signal Sources

ContentRadar flags fire when 5+ questions on the same topic arrive within a 48-hour window. The following on-site forms feed ContentRadar:

| Source | Page | Form location |
|---|---|---|
| Blog hero question form | `/blog` | Top of page, right column |
| Blog per-post question form | `/blog` (post view) | Bottom of each expanded post |
| Blog sidebar question form | `/blog` | Sticky sidebar |
| FAQ "still have a question" | `/faq` | Sidebar |

**Implementation requirement:** All four form submissions must forward to the ContentRadar queue endpoint, not just the general hub events endpoint. The payload should include: `question_text`, `source_page`, `source_form`, `timestamp`, `session_id`.

---

## Engagement Score Thresholds

| Score range | Form length presented | Notes |
|---|---|---|
| 0–30 | Full form, all fields | Early stage — full context needed |
| 31–60 | Remove optional fields | Reduce friction |
| 61–80 | Name and phone only | High engagement |
| 81–100 | Phone only | Maximum intent — one field |

---

## Pixel Toast (Demo Mode Only)

Every page includes a visible pixel toast — a small notification in the bottom-left corner that displays the event name and delta whenever `firePixel()` fires. This is for demo and QA purposes only.

**Remove in production** by deleting the `.pixel-toast` element and the toast logic inside `firePixel()`. The hub POST call replaces it.

```html
<!-- REMOVE IN PRODUCTION -->
<div class="pixel-toast" id="pixelToast">
  <div class="pixel-toast-dot"></div>
  <span id="pixelToastText">Pixel fired</span>
</div>
```

---

## Files Delivered

| File | Pages covered |
|---|---|
| `rightflush-shell.html` | Site shell template |
| `rightflush-emergency.html` | Emergency 24/7 |
| `rightflush-burst-pipe-flooding.html` | Burst Pipe & Flooding |
| `rightflush-bathroom-renovations.html` | Bathroom Renovations |
| `rightflush-contact-quote.html` | Contact / Quote |
| `rightflush-before-after-gallery.html` | Before & After Gallery |
| `rightflush-service-pages.html` | Hot Water, Blocked Drains, Leak Detection, Gas, Water Filtration (5 pages via config) |
| `rightflush-reviews.html` | Reviews & Testimonials |
| `rightflush-our-guarantee.html` | Our Guarantee & Standards |
| `rightflush-blog.html` | Blog / Plumbing Tips |
| `rightflush-faq.html` | FAQ |
| `rightflush-service-areas.html` | Service Areas Hub |
| `rightflush-specials.html` | Specials & Seasonal Offers |
| `rightflush-about.html` | About Us |
| `rightflush-market-pages.html` | Timmins, Cochrane, South Porcupine, Iroquois Falls, Kapuskasing, Matheson, Kirkland Lake (7 pages via config) |

**Total pages:** 25  
**Template files:** 15 (2 files cover 12 pages via `window.PAGE` config)

---

## Implementation Checklist

- [ ] Replace `console.log` in `firePixel()` with POST to `/hub/events`
- [ ] Add session ID generation (`_sessionId = uuid()`) to every page
- [ ] Remove pixel toast element from all 25 pages before production
- [ ] Wire blog and FAQ question forms to ContentRadar queue (separate endpoint from hub events)
- [ ] Confirm `/burst-pipe` URL pattern registered in Emergency URL rule config on hub
- [ ] Confirm all Emergency URL patterns registered: `/emergency`, `/burst-pipe`, `/flood`, `/no-hot-water`, `/blocked-drain`, `/leak`, `/urgent`
- [ ] Validate `window.PAGE` config for each market page before deployment (one active block, all others commented)
- [ ] Validate FotoJobber is absent from water-filtration and all emergency page variants
- [ ] QA: Visit About page and confirm Comparison bucket fires on load
- [ ] QA: Visit Reviews page, dwell 60 seconds, confirm Comparison bucket strengthens
- [ ] QA: Visit Specials page, submit appointment form, confirm Active Project bucket fires
- [ ] QA: Visit `/burst-pipe`, confirm Emergency bucket fires on load before any scroll

---

*ClearSky Software · RightFlush Plumbing · Pixel Implementation Reference · May 2026*  
*Rory Dredhart · r.dredhart@clearskysoftware.net*
