/* ClearSky live-monitoring HUD — injected at serve/deploy time.
 * Shows, on-screen, what the ClearSky pixel is doing as a visitor browses:
 * a stable fingerprint identity, identity tier, intent bucket, and an
 * engagement score that PERSISTS across page navigations (the site is
 * multi-page — full loads — so state is kept in sessionStorage, keyed to the
 * fingerprint, instead of resetting on every page).
 *
 * Identity: FingerprintJS (open-source v4) generates the visitor id, matching
 * the real pixel's "we set a fingerprint" step. Falls back to a local id if the
 * library can't load. Demo aid only — no data leaves the browser.
 */
(function () {
  "use strict";
  if (window.__clearskyHud) return;
  window.__clearskyHud = true;

  var LADDER = ["emergency", "active", "comparison", "research", "unclassified"];
  var BUCKET_COLOR = {
    unclassified: "#9ca3af", research: "#1d4ed8", comparison: "#6d28d9",
    active: "#0d7f78", emergency: "#b91c1c"
  };
  var IDENTIFY = /lg_submit|form_submit|contact_submit|email_capture|phone_submit/;
  var SKEY = "clearsky_engagement"; // sessionStorage: survives page nav, one tab session

  // Restore the running session so navigating pages does NOT reset the score.
  var state = { score: 0, bucket: "unclassified", tier: "Tier 2B", last: "session started", fp: "resolving…", visits: 0 };
  try {
    var saved = JSON.parse(sessionStorage.getItem(SKEY) || "null");
    if (saved && typeof saved === "object") { for (var k in saved) state[k] = saved[k]; }
  } catch (e) {}
  state.visits = (state.visits || 0) + 1;
  function save() { try { sessionStorage.setItem(SKEY, JSON.stringify(state)); } catch (e) {} }

  // ---- styles ----
  var css = document.createElement("style");
  css.textContent =
    "#cs-hud{position:fixed;bottom:64px;left:16px;z-index:99999;width:246px;" +
    "font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;" +
    "background:#fff;border:1px solid #e3e7ef;border-radius:12px;" +
    "box-shadow:0 1px 2px rgba(16,24,40,.04),0 12px 32px -12px rgba(16,24,40,.22);overflow:hidden;color:#111827}" +
    "#cs-hud .cs-h{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #eef1f5;background:#fbfcfd}" +
    "#cs-hud .cs-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.5);animation:cspulse 1.6s infinite}" +
    "@keyframes cspulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}" +
    "#cs-hud .cs-title{font-size:11px;font-weight:700;letter-spacing:.02em}#cs-hud .cs-title b{color:#0d7f78}" +
    "#cs-hud .cs-body{padding:11px 12px;display:flex;flex-direction:column;gap:9px}" +
    "#cs-hud .cs-row{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
    "#cs-hud .cs-k{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-weight:700}" +
    "#cs-hud .cs-badge{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;border:1px solid;transition:.25s}" +
    "#cs-hud .cs-meter{height:7px;background:#eef1f5;border:1px solid #e3e7ef;border-radius:999px;overflow:hidden;margin-top:3px}" +
    "#cs-hud .cs-fill{display:block;height:100%;width:0;border-radius:999px;transition:width .5s cubic-bezier(.2,.7,.2,1),background .3s}" +
    "#cs-hud .cs-score{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:11px;font-weight:700}" +
    "#cs-hud .cs-foot{padding:8px 12px;border-top:1px solid #eef1f5;background:#fbfcfd;font-size:10px;color:#4b5563;line-height:1.55}" +
    "#cs-hud .cs-mono{font-family:ui-monospace,'SF Mono',Menlo,monospace;color:#0d7f78}" +
    "#cs-hud.cs-flash{animation:csflash .6s ease}" +
    "@keyframes csflash{0%{transform:scale(1)}40%{transform:scale(1.06)}100%{transform:scale(1)}}" +
    "@media(max-width:520px){#cs-hud{display:none}}";
  document.head.appendChild(css);

  // ---- markup ----
  var hud = document.createElement("div");
  hud.id = "cs-hud";
  hud.innerHTML =
    '<div class="cs-h"><span class="cs-dot"></span><span class="cs-title"><b>ClearSky</b> — live monitoring</span></div>' +
    '<div class="cs-body">' +
      '<div class="cs-row"><span class="cs-k">Identity tier</span><span class="cs-badge" id="cs-tier"></span></div>' +
      '<div class="cs-row"><span class="cs-k">Intent bucket</span><span class="cs-badge" id="cs-bucket"></span></div>' +
      '<div><div class="cs-row"><span class="cs-k">Engagement</span><span class="cs-score"><span id="cs-num">0</span>/100</span></div>' +
        '<div class="cs-meter"><span class="cs-fill" id="cs-fill"></span></div></div>' +
    '</div>' +
    '<div class="cs-foot">📡 fingerprint <span class="cs-mono" id="cs-fp">resolving…</span> · <span id="cs-visits"></span> page(s)<br>' +
      'last: <span class="cs-mono" id="cs-last">session started</span></div>';

  function mount() { document.body.appendChild(hud); render(true); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  function setText(id, t) { var el = hud.querySelector("#" + id); if (el) el.textContent = t; }

  function render(first) {
    var t1 = state.tier === "Tier 1";
    var tierEl = hud.querySelector("#cs-tier");
    tierEl.textContent = state.tier;
    tierEl.style.color = t1 ? "#0d7f78" : "#475569";
    tierEl.style.background = t1 ? "#e8f7f6" : "#f1f5f9";
    tierEl.style.borderColor = t1 ? "#9de0db" : "#cbd5e1";

    var bEl = hud.querySelector("#cs-bucket");
    var bc = BUCKET_COLOR[state.bucket] || "#9ca3af";
    bEl.textContent = state.bucket;
    bEl.style.color = bc; bEl.style.background = bc + "18"; bEl.style.borderColor = bc + "66";

    setText("cs-num", state.score);
    var fill = hud.querySelector("#cs-fill");
    fill.style.width = state.score + "%"; fill.style.background = bc;
    setText("cs-last", state.last);
    setText("cs-fp", state.fp);
    setText("cs-visits", state.visits);
    if (!first) { hud.classList.remove("cs-flash"); void hud.offsetWidth; hud.classList.add("cs-flash"); }
  }

  function apply(event, label, delta, bkt) {
    if (typeof delta === "number") state.score = Math.min(state.score + delta, 100);
    if (bkt && bkt !== "unclassified") {
      var cb = LADDER.indexOf(state.bucket), nb = LADDER.indexOf(bkt);
      if (nb !== -1 && (cb === -1 || nb < cb || state.bucket === "unclassified")) state.bucket = bkt;
    }
    if (IDENTIFY.test(event)) state.tier = "Tier 1";
    state.last = (label || event) + (delta > 0 ? " +" + delta : "");
    save();
    render(false);
  }

  // ---- FingerprintJS: the persistent visitor identity ----
  function setFp(id) { state.fp = id; save(); setText("cs-fp", id); }
  (function resolveFingerprint() {
    if (state.fp && state.fp !== "resolving…") { return; } // already resolved earlier this session
    var done = false;
    var fallback = function () {
      if (done) return; done = true;
      var id;
      try { id = localStorage.getItem("clearsky_fp"); } catch (e) {}
      if (!id) { id = "fp_" + Math.random().toString(36).slice(2, 10); try { localStorage.setItem("clearsky_fp", id); } catch (e) {} }
      setFp(id);
    };
    setTimeout(fallback, 2500); // don't hang the HUD if the CDN is slow/blocked
    import("https://openfpcdn.io/fingerprintjs/v4")
      .then(function (m) { return (m.default || m).load(); })
      .then(function (agent) { return agent.get(); })
      .then(function (r) { if (!done) { done = true; setFp(r.visitorId.slice(0, 12)); } })
      .catch(fallback);
  })();

  // ---- wrap the page's firePixel ----
  var orig = window.firePixel;
  window.firePixel = function (event, label, delta, bkt) {
    var r;
    if (typeof orig === "function") { try { r = orig.apply(this, arguments); } catch (e) {} }
    try { apply(event, label, delta, bkt); } catch (e) {}
    return r;
  };
})();
