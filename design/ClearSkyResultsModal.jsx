/**
 * ClearSkyResultsModal.jsx
 * Self-contained React component — no external dependencies beyond React.
 * Drop into any React project (Next.js, Vite, CRA, etc.)
 *
 * USAGE:
 *   import ClearSkyResultsModal from './ClearSkyResultsModal';
 *
 *   <ClearSkyResultsModal
 *     isOpen={true}
 *     data={diagnosticResults}   // return value of calculateDiagnostic() after scenario merge
 *     onClose={() => setOpen(false)}
 *     onCTA={(data) => router.push('/book')}        // optional
 *     onConfirmInputs={(confidence) => {}}          // optional — rep mode "confirm inputs"
 *   />
 *
 * PROPS:
 *   isOpen          {boolean}   — controls visibility
 *   data            {Object}    — calculateDiagnostic() result with scenarios merged in
 *   onClose         {Function}  — called when modal closes
 *   onCTA           {Function}  — called with { businessName, scenarioData } on primary CTA click
 *   onConfirmInputs {Function}  — called with { confidenceData } when rep confirms inputs
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── STYLES ─────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  .cs-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(6, 8, 14, 0.92);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px 16px 40px;
    overflow-y: auto;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .cs-modal-overlay.cs-visible { opacity: 1; }

  .cs-modal {
    width: 100%;
    max-width: 1020px;
    background: #0c0e12;
    border: 1px solid #2a2f3e;
    border-radius: 12px;
    overflow: hidden;
    transform: translateY(16px);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04) inset,
      0 40px 80px rgba(0,0,0,0.6),
      0 0 120px rgba(74,158,255,0.04);
  }
  .cs-modal-overlay.cs-visible .cs-modal { transform: translateY(0); }

  /* ── HEADER ── */
  .cs-header {
    padding: 20px 28px 18px;
    border-bottom: 1px solid #2a2f3e;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #13161d;
  }
  .cs-header-left  { display: flex; align-items: center; gap: 14px; }
  .cs-header-right { display: flex; align-items: center; gap: 12px; }

  .cs-logo { display: flex; align-items: center; gap: 8px; }
  .cs-logo-mark {
    width: 28px; height: 28px;
    border-radius: 6px;
    background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800; font-size: 13px; color: #fff; letter-spacing: -0.5px;
  }
  .cs-logo-text {
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 600; color: #e8eaf0; letter-spacing: 0.02em;
  }
  .cs-header-divider { width: 1px; height: 20px; background: #2a2f3e; }

  .cs-business-name {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 600; color: #e8eaf0;
  }
  .cs-business-meta {
    font-size: 12px; color: #7c8399; margin-top: 1px;
    font-family: 'DM Mono', monospace;
  }

  /* confidence badge */
  .cs-conf-badge {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 10px;
    background: #1a1e28; border: 1px solid #2a2f3e; border-radius: 6px;
    font-family: 'DM Mono', monospace; font-size: 11px; color: #7c8399;
    cursor: default; position: relative;
  }
  .cs-conf-badge:hover .cs-conf-tooltip { opacity: 1; pointer-events: all; }
  .cs-conf-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #2dd4a0; box-shadow: 0 0 6px #2dd4a0;
    animation: cs-pulse 2.5s ease-in-out infinite;
  }
  @keyframes cs-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .cs-conf-tooltip {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 260px; background: #222736; border: 1px solid #323848;
    border-radius: 6px; padding: 12px 14px;
    font-family: 'DM Sans', sans-serif; font-size: 11.5px;
    line-height: 1.6; color: #7c8399;
    opacity: 0; pointer-events: none; transition: opacity 0.15s;
    z-index: 10; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  .cs-conf-tooltip strong { color: #e8eaf0; display: block; margin-bottom: 4px; }

  /* rep toggle */
  .cs-rep-toggle {
    display: flex; align-items: center; gap: 8px;
    cursor: pointer; padding: 5px 10px;
    background: #1a1e28; border: 1px solid #2a2f3e; border-radius: 6px;
    user-select: none; transition: border-color 0.15s;
  }
  .cs-rep-toggle:hover { border-color: #323848; }
  .cs-track {
    width: 28px; height: 16px; border-radius: 8px;
    background: #2a2f3e; position: relative; transition: background 0.2s;
    flex-shrink: 0;
  }
  .cs-track.cs-on { background: #4a9eff; }
  .cs-thumb {
    position: absolute; top: 2px; left: 2px;
    width: 12px; height: 12px; border-radius: 50%;
    background: #fff; transition: transform 0.2s;
  }
  .cs-track.cs-on .cs-thumb { transform: translateX(12px); }
  .cs-toggle-label {
    font-size: 11px; color: #7c8399;
    font-family: 'DM Mono', monospace; letter-spacing: 0.03em;
  }

  /* close button */
  .cs-close {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px; border: 1px solid #2a2f3e;
    background: transparent; color: #7c8399;
    cursor: pointer; font-size: 16px; line-height: 1;
    transition: all 0.15s;
  }
  .cs-close:hover { border-color: #323848; color: #e8eaf0; background: #1a1e28; }

  /* ── GAP BANNER ── */
  .cs-gap-banner {
    padding: 22px 28px;
    background: linear-gradient(135deg, rgba(74,158,255,0.06) 0%, rgba(74,158,255,0.02) 100%);
    border-bottom: 1px solid #2a2f3e;
    display: grid; grid-template-columns: 1fr auto;
    align-items: center; gap: 24px;
  }
  .cs-gap-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; font-weight: 500; color: #7c8399;
    letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;
  }
  .cs-gap-range { display: flex; align-items: baseline; gap: 10px; }
  .cs-gap-end {
    font-family: 'DM Mono', monospace;
    font-size: 18px; color: #4a5168; font-weight: 300;
  }
  .cs-gap-sep { font-family: 'DM Mono', monospace; font-size: 13px; color: #4a5168; }
  .cs-gap-mid {
    font-family: 'Syne', sans-serif;
    font-size: 36px; font-weight: 700; color: #4a9eff;
    letter-spacing: -0.02em; line-height: 1;
    text-shadow: 0 0 40px rgba(74,158,255,0.25);
  }
  .cs-gap-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: #7c8399; margin-top: 4px; }
  .cs-spread-label { font-family: 'DM Mono', monospace; font-size: 11px; color: #7c8399; margin-bottom: 4px; text-align: right; }
  .cs-spread-track {
    width: 120px; height: 4px; background: #222736;
    border-radius: 2px; overflow: hidden; margin-left: auto;
  }
  .cs-spread-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, #4a9eff 0%, rgba(74,158,255,0.4) 100%);
    transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
  }
  .cs-spread-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: #4a5168; margin-top: 4px; text-align: right; }

  /* ── FRAMING STRIP ── */
  .cs-framing {
    padding: 10px 28px;
    background: #13161d; border-bottom: 1px solid #2a2f3e;
    font-size: 12px; color: #7c8399; line-height: 1.5;
    font-family: 'DM Sans', sans-serif;
  }
  .cs-framing em { color: #e8eaf0; font-style: normal; }

  /* ── SCENARIO GRID ── */
  .cs-scenarios { display: grid; grid-template-columns: repeat(3,1fr); border-bottom: 1px solid #2a2f3e; }

  .cs-panel {
    padding: 24px 24px 22px;
    border-right: 1px solid #2a2f3e;
    position: relative; overflow: hidden;
    animation: cs-fadeup 0.35s ease both;
  }
  .cs-panel:last-child { border-right: none; }
  @keyframes cs-fadeup { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .cs-panel:nth-child(1) { animation-delay: 0.05s; }
  .cs-panel:nth-child(2) { animation-delay: 0.12s; }
  .cs-panel:nth-child(3) { animation-delay: 0.19s; }

  .cs-panel::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
  }
  .cs-panel-1::before { background: #4a9eff; }
  .cs-panel-2::before { background: #a78bfa; }
  .cs-panel-3::before { background: #2dd4a0; }

  .cs-panel-num {
    font-family: 'DM Mono', monospace;
    font-size: 10px; color: #4a5168; letter-spacing: 0.1em; margin-bottom: 4px;
  }
  .cs-panel-title {
    font-family: 'Syne', sans-serif;
    font-size: 14px; font-weight: 700; letter-spacing: 0.01em;
  }
  .cs-panel-1 .cs-panel-title { color: #4a9eff; }
  .cs-panel-2 .cs-panel-title { color: #a78bfa; }
  .cs-panel-3 .cs-panel-title { color: #2dd4a0; }
  .cs-panel-desc { font-size: 11.5px; color: #7c8399; line-height: 1.55; margin-top: 4px; }
  .cs-panel-header { margin-bottom: 18px; }

  .cs-rev-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #4a5168; margin-bottom: 5px; }
  .cs-rev-nums { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  .cs-rev-end { font-family: 'DM Mono', monospace; font-size: 14px; color: #4a5168; font-weight: 300; }
  .cs-rev-sep { font-size: 11px; color: #4a5168; font-family: 'DM Mono', monospace; }
  .cs-rev-mid {
    font-family: 'Syne', sans-serif;
    font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1;
  }
  .cs-panel-1 .cs-rev-mid { color: #4a9eff; }
  .cs-panel-2 .cs-rev-mid { color: #a78bfa; }
  .cs-panel-3 .cs-rev-mid { color: #2dd4a0; }
  .cs-rev-sub { font-family: 'DM Mono', monospace; font-size: 9px; color: #4a5168; margin-top: 3px; }

  /* range bar */
  .cs-bar-wrap {
    height: 4px; background: #222736; border-radius: 2px;
    position: relative; overflow: visible; margin: 10px 0 14px;
  }
  .cs-bar-track {
    position: absolute; height: 100%; width: 100%;
    border-radius: 2px; opacity: 0.35; top: 0; left: 0;
  }
  .cs-panel-1 .cs-bar-track { background: #4a9eff; }
  .cs-panel-2 .cs-bar-track { background: #a78bfa; }
  .cs-panel-3 .cs-bar-track { background: #2dd4a0; }
  .cs-bar-mid {
    position: absolute; width: 3px; height: 10px;
    border-radius: 1.5px; top: -3px; transform: translateX(-50%);
  }
  .cs-panel-1 .cs-bar-mid { background: #4a9eff; }
  .cs-panel-2 .cs-bar-mid { background: #a78bfa; }
  .cs-panel-3 .cs-bar-mid { background: #2dd4a0; }

  /* capture chip */
  .cs-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 8px; border-radius: 4px;
    font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500;
  }
  .cs-panel-1 .cs-chip { background: rgba(74,158,255,0.1); color: #4a9eff; }
  .cs-panel-2 .cs-chip { background: rgba(167,139,250,0.1); color: #a78bfa; }
  .cs-panel-3 .cs-chip { background: rgba(45,212,160,0.1); color: #2dd4a0; }
  .cs-chip-label { color: #4a5168; font-weight: 300; font-size: 9px; }

  /* market badge (s3) */
  .cs-market-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; margin-left: 6px;
    background: rgba(45,212,160,0.08); border: 1px solid rgba(45,212,160,0.2);
    border-radius: 4px; font-family: 'DM Mono', monospace;
    font-size: 10px; color: #2dd4a0;
  }
  .cs-panel-note { font-size: 11px; color: #4a5168; margin-top: 6px; line-height: 1.5; }

  /* ── REP PANEL ── */
  .cs-rep-panel {
    border-top: 1px solid #2a2f3e; background: #13161d;
    max-height: 0; overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1);
  }
  .cs-rep-panel.cs-open { max-height: 420px; }
  .cs-rep-inner { padding: 20px 28px 22px; }
  .cs-rep-title {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #7c8399; margin-bottom: 14px;
  }
  .cs-conf-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 6px; }
  .cs-conf-cell {
    background: #1a1e28; border: 1px solid #2a2f3e;
    border-radius: 6px; padding: 8px 10px;
    transition: border-color 0.15s; cursor: default;
  }
  .cs-conf-cell:hover { border-color: #323848; }
  .cs-conf-cell-label {
    font-family: 'DM Mono', monospace; font-size: 9px;
    color: #4a5168; letter-spacing: 0.05em; margin-bottom: 4px; text-transform: uppercase;
  }
  .cs-conf-cell-val { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; }
  .cs-conf-full    .cs-conf-cell-val { color: #2dd4a0; }
  .cs-conf-partial .cs-conf-cell-val { color: #f5a623; }
  .cs-conf-default .cs-conf-cell-val { color: #ff5c72; }
  .cs-conf-mini { height: 2px; border-radius: 1px; margin-top: 4px; background: #222736; overflow: hidden; }
  .cs-conf-mini-fill { height: 100%; border-radius: 1px; }
  .cs-conf-full    .cs-conf-mini-fill { background: #2dd4a0; width: 100%; }
  .cs-conf-partial .cs-conf-mini-fill { background: #f5a623; width: 50%; }
  .cs-conf-default .cs-conf-mini-fill { background: #ff5c72; width: 25%; }

  .cs-rep-totals {
    display: flex; align-items: center; gap: 20px;
    margin-top: 14px; padding-top: 14px; border-top: 1px solid #2a2f3e;
    flex-wrap: wrap;
  }
  .cs-rep-total-label { font-family: 'DM Mono', monospace; font-size: 9px; color: #4a5168; text-transform: uppercase; letter-spacing: 0.1em; }
  .cs-rep-total-val   { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #e8eaf0; margin-top: 2px; }
  .cs-confirm-btn {
    margin-left: auto; padding: 7px 14px;
    background: rgba(74,158,255,0.06); border: 1px solid rgba(74,158,255,0.3);
    border-radius: 6px; font-family: 'DM Mono', monospace;
    font-size: 11px; color: #4a9eff; cursor: pointer; transition: all 0.15s;
  }
  .cs-confirm-btn:hover { background: rgba(74,158,255,0.12); border-color: rgba(74,158,255,0.5); }
  .cs-confirm-btn.cs-confirmed { color: #2dd4a0; border-color: rgba(45,212,160,0.4); }

  /* ── FOOTER ── */
  .cs-footer {
    padding: 16px 28px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; background: #13161d; border-top: 1px solid #2a2f3e;
  }
  .cs-footer-ctx { font-size: 12px; color: #7c8399; line-height: 1.5; max-width: 480px; }
  .cs-footer-ctx em { color: #e8eaf0; font-style: normal; }
  .cs-footer-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  .cs-btn {
    padding: 9px 18px; border-radius: 6px;
    font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600;
    letter-spacing: 0.02em; cursor: pointer; transition: all 0.15s; border: none;
  }
  .cs-btn-secondary {
    background: #1a1e28; border: 1px solid #2a2f3e; color: #7c8399;
  }
  .cs-btn-secondary:hover { border-color: #323848; color: #e8eaf0; }
  .cs-btn-primary {
    background: #4a9eff; color: #fff;
    box-shadow: 0 0 20px rgba(74,158,255,0.25);
  }
  .cs-btn-primary:hover {
    background: #5aabff;
    box-shadow: 0 0 28px rgba(74,158,255,0.35);
    transform: translateY(-1px);
  }

  /* ── MOBILE — 360px screen / 340px content ── */
  @media (max-width: 600px) {
    .cs-modal-overlay { padding: 0; align-items: flex-start; }
    .cs-modal { border-radius: 0; border-left: none; border-right: none; min-height: 100dvh; }

    .cs-header { flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px 10px 12px; }
    .cs-header-left { width: 100%; gap: 10px; }
    .cs-header-right { width: 100%; gap: 8px; flex-wrap: nowrap; }
    .cs-toggle-label { display: none; }
    .cs-close { margin-left: auto; }
    .cs-conf-badge { font-size: 10px; padding: 5px 8px; }
    .cs-conf-tooltip { right: auto; left: 0; width: 240px; }

    .cs-gap-banner { grid-template-columns: 1fr; gap: 12px; padding: 16px 10px 14px; }
    .cs-gap-mid { font-size: 28px; }
    .cs-gap-end { font-size: 15px; }
    .cs-spread-label { text-align: left; }
    .cs-spread-track { width: 100%; margin-left: 0; }
    .cs-spread-sub { text-align: left; }

    .cs-framing { padding: 9px 10px; font-size: 11.5px; }

    .cs-scenarios { grid-template-columns: 1fr; }
    .cs-panel { border-right: none; border-bottom: 1px solid #2a2f3e; padding: 18px 10px 16px; }
    .cs-panel:last-child { border-bottom: none; }
    .cs-panel-num { display: inline; margin-right: 6px; }
    .cs-rev-mid { font-size: 22px; }
    .cs-rev-end { font-size: 13px; }

    .cs-rep-inner { padding: 16px 10px 18px; }
    .cs-conf-grid { grid-template-columns: repeat(3,1fr); gap: 5px; }
    .cs-conf-cell { padding: 7px 8px; }
    .cs-conf-cell-label { font-size: 8px; }
    .cs-conf-cell-val { font-size: 11px; }
    .cs-confirm-btn { width: 100%; margin-left: 0; margin-top: 4px; text-align: center; }

    .cs-footer { flex-direction: column; align-items: stretch; gap: 12px; padding: 14px 10px; }
    .cs-footer-ctx { max-width: 100%; font-size: 11.5px; }
    .cs-footer-actions { width: 100%; display: grid; grid-template-columns: 1fr 2fr; gap: 8px; }
    .cs-btn { padding: 11px 12px; font-size: 13px; text-align: center; }
    .cs-market-badge { margin-left: 0; margin-top: 5px; }
  }
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CONF_LABELS = {
  gbp: 'GBP', rank: 'Rank', citations: 'Citations', performance: 'Site Speed',
  content: 'Content', aiVisibility: 'AI Visibility', missedCalls: 'Missed Calls',
  social: 'Social', paid: 'Paid', engagement: 'Engagement', conversion: 'Conversion',
  growth: 'Growth', canonical: 'Canonical', market: 'Market Tier', brandEquity: 'Brand Equity'
};

function confClass(v) { return v >= 0.9 ? 'cs-conf-full' : v >= 0.4 ? 'cs-conf-partial' : 'cs-conf-default'; }
function confLabel(v) { return v >= 0.9 ? 'Full' : v >= 0.4 ? 'Partial' : 'Default'; }

function spreadFill(spreadPct) {
  return Math.min(100, Math.max(20, Math.round(20 + ((spreadPct - 20) / 25) * 80)));
}

function spreadSubLabel(pct) {
  if (pct <= 22) return 'high confidence — tight range';
  if (pct <= 32) return 'medium confidence — moderate range';
  return 'wider range — confirm inputs to narrow';
}

function midPct(low, mid, high) {
  const span = high - low;
  return span > 0 ? Math.round(((mid - low) / span) * 100) : 50;
}

function footerCtx(confPct, spreadPct) {
  if (!confPct) return 'This estimate is based on live data from your digital presence. A ClearSky advisor can verify key inputs and narrow the range to a tighter estimate.';
  const n = parseInt(confPct);
  if (n >= 85) return `Diagnostic confidence: ${confPct}. Confirming remaining inputs with a ClearSky advisor can narrow this range further and unlock your action plan.`;
  return `Some inputs are estimated. A ClearSky advisor can confirm the details that would narrow this from ±${spreadPct}% down toward ±20% — and produce a tighter dollar figure.`;
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
function RangeBar({ low, mid, high, panelClass }) {
  const pct = midPct(low, mid, high);
  return (
    <div className="cs-bar-wrap">
      <div className={`cs-bar-track ${panelClass}`} />
      <div className={`cs-bar-mid ${panelClass}`} style={{ left: `${pct}%` }} />
    </div>
  );
}

function ScenarioPanel({ scenario, data, panelNum, panelClass, note, showMarketBadge }) {
  if (!data) return null;
  const { display = {}, captureRate, marketMultiplier } = data;
  return (
    <div className={`cs-panel ${panelClass}`}>
      <div className="cs-panel-header">
        <div className="cs-panel-num">SCENARIO 0{panelNum}</div>
        <div className="cs-panel-title">{scenario.label}</div>
        <div className="cs-panel-desc">{scenario.desc}</div>
      </div>
      <div>
        <div className="cs-rev-label">Recoverable Revenue</div>
        <div className="cs-rev-nums">
          <span className="cs-rev-end">{display.low || '—'}</span>
          <span className="cs-rev-sep">–</span>
          <span className="cs-rev-mid">{display.mid || '—'}</span>
          <span className="cs-rev-sep">–</span>
          <span className="cs-rev-end">{display.high || '—'}</span>
        </div>
        <div className="cs-rev-sub">best estimate · low — high</div>
      </div>
      <RangeBar low={data.low} mid={data.mid} high={data.high} panelClass={panelClass} />
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
        <div className="cs-chip">
          <span>{captureRate || '—'}</span>
          <span className="cs-chip-label">capture rate</span>
        </div>
        {showMarketBadge && marketMultiplier && (
          <div className="cs-market-badge">
            <span>⊕</span>
            <span>{marketMultiplier} market</span>
          </div>
        )}
      </div>
      {note && <div className="cs-panel-note">{note}</div>}
    </div>
  );
}

function ConfidenceGrid({ layerConfidence }) {
  if (!layerConfidence) return null;
  return (
    <div className="cs-conf-grid">
      {Object.entries(layerConfidence).map(([key, val]) => (
        <div key={key} className={`cs-conf-cell ${confClass(val)}`}>
          <div className="cs-conf-cell-label">{CONF_LABELS[key] || key}</div>
          <div className="cs-conf-cell-val">{confLabel(val)}</div>
          <div className="cs-conf-mini"><div className="cs-conf-mini-fill" /></div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ClearSkyResultsModal({
  isOpen,
  data,
  onClose,
  onCTA,
  onConfirmInputs,
}) {
  const [visible, setVisible]     = useState(false);
  const [repMode, setRepMode]     = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const styleInjected             = useRef(false);

  // Inject CSS once
  useEffect(() => {
    if (styleInjected.current) return;
    const tag = document.createElement('style');
    tag.setAttribute('data-clearsky-modal', '1');
    tag.textContent = CSS;
    document.head.appendChild(tag);
    styleInjected.current = true;
  }, []);

  // Visibility transitions
  useEffect(() => {
    if (isOpen) {
      setVisible(false);
      setRepMode(false);
      setConfirmed(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      document.body.style.overflow = 'hidden';
    } else {
      setVisible(false);
      const t = setTimeout(() => { document.body.style.overflow = ''; }, 280);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Escape key
  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose?.(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirmInputs?.({ confidenceData: data?.rawGaps?.confidence });
    setTimeout(() => setConfirmed(false), 2500);
  };

  const handleCTA = () => {
    onCTA?.({ businessName: data?.business?.name, scenarioData: data?.scenarios });
  };

  if (!isOpen) return null;

  // ── Destructure data
  const b   = data?.business   || {};
  const m   = data?.meta       || {};
  const sc  = data?.scenarios  || {};
  const rc  = data?.rawGaps?.confidence || {};
  const tg  = sc.technicalGap  || {};

  const spreadPct  = Math.round((rc.uncertaintySpread || 0.22) * 100);
  const fillPct    = spreadFill(spreadPct);

  const s3note = m.marketDemandTier
    ? `${m.marketDemandTier} market demand (${m.marketOpportunityMultiplier || ''}) · ${m.competitiveDensity || ''} competitor density · ${m.brandTenureLabel || ''} brand tenure`
    : 'Full score × brand tenure × market opportunity. The ceiling ClearSky is built to reach.';

  return (
    <div
      className={`cs-modal-overlay${visible ? ' cs-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="cs-modal">

        {/* HEADER */}
        <div className="cs-header">
          <div className="cs-header-left">
            <div className="cs-logo">
              <div className="cs-logo-mark">CS</div>
              <span className="cs-logo-text">ClearSky</span>
            </div>
            <div className="cs-header-divider" />
            <div>
              <div className="cs-business-name">{b.name || 'Business Diagnostic'}</div>
              <div className="cs-business-meta">
                {[b.trade, b.city].filter(Boolean).join(' · ') || 'ClearSky Digital Health Diagnostic'}
              </div>
            </div>
          </div>
          <div className="cs-header-right">
            {repMode && (
              <div className="cs-conf-badge">
                <div className="cs-conf-dot" />
                <span>{m.diagnosticConfidence || '—'}</span> confidence
                <div className="cs-conf-tooltip">
                  <strong>Diagnostic Confidence</strong>
                  Score based on data completeness across all 15 inputs.
                  Full API data on all layers = higher confidence = narrower range.
                  Confirming inputs with the prospect narrows the estimate in real time.
                </div>
              </div>
            )}
            <div className="cs-rep-toggle" onClick={() => setRepMode(r => !r)}>
              <div className={`cs-track${repMode ? ' cs-on' : ''}`}>
                <div className="cs-thumb" />
              </div>
              <span className="cs-toggle-label">REP MODE</span>
            </div>
            <button className="cs-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* GAP BANNER */}
        <div className="cs-gap-banner">
          <div>
            <div className="cs-gap-label">Technical Revenue Gap — shared across all scenarios</div>
            <div className="cs-gap-range">
              <span className="cs-gap-end">{tg.display?.low || '—'}</span>
              <span className="cs-gap-sep">—</span>
              <span className="cs-gap-mid">{tg.display?.mid || '—'}</span>
              <span className="cs-gap-sep">—</span>
              <span className="cs-gap-end">{tg.display?.high || '—'}</span>
            </div>
            <div className="cs-gap-sub">best estimate · low — high range</div>
          </div>
          <div>
            <div className="cs-spread-label">±{spreadPct}% estimate range</div>
            <div className="cs-spread-track">
              <div className="cs-spread-fill" style={{ width: `${fillPct}%` }} />
            </div>
            <div className="cs-spread-sub">{spreadSubLabel(spreadPct)}</div>
          </div>
        </div>

        {/* FRAMING */}
        <div className="cs-framing">
          Three scenarios showing <em>what is possible given current demand, supply, and capacity.</em>{' '}
          Each range narrows as more inputs are confirmed — it is a planning tool, not a disclaimer.
        </div>

        {/* SCENARIO PANELS */}
        <div className="cs-scenarios">
          <ScenarioPanel
            panelNum={1} panelClass="cs-panel-1"
            scenario={{ label: 'Current Reality', desc: 'Recovery available today with current digital gaps and current capacity.' }}
            data={sc.current}
            note="Based on current personalization score and available capacity."
          />
          <ScenarioPanel
            panelNum={2} panelClass="cs-panel-2"
            scenario={{ label: 'Market Opportunity', desc: 'What becomes recoverable as idle capacity fills to the realistic ceiling.' }}
            data={sc.market}
            note="ClearSky fills visibility gaps. Business absorbs incoming work at full capacity."
          />
          <ScenarioPanel
            panelNum={3} panelClass="cs-panel-3"
            scenario={{ label: 'Full Potential', desc: 'What the market can sustain at full personalization and market demand.' }}
            data={sc.potential}
            note={s3note}
            showMarketBadge
          />
        </div>

        {/* REP PANEL */}
        <div className={`cs-rep-panel${repMode ? ' cs-open' : ''}`}>
          <div className="cs-rep-inner">
            <div className="cs-rep-title">Diagnostic Confidence Breakdown — operator view</div>
            <ConfidenceGrid layerConfidence={rc.layerConfidence} />
            <div className="cs-rep-totals">
              {[
                { label: 'Overall Confidence', val: m.diagnosticConfidence || '—' },
                { label: 'Uncertainty Spread',  val: m.uncertaintySpread    || '—' },
                { label: 'Brand Tenure',         val: `${m.brandTenureLabel || ''} ${m.brandTenureModifier || ''}`.trim() || '—' },
                { label: 'Market Multiplier',    val: m.marketOpportunityMultiplier || '—' },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="cs-rep-total-label">{label}</div>
                  <div className="cs-rep-total-val">{val}</div>
                </div>
              ))}
              <button
                className={`cs-confirm-btn${confirmed ? ' cs-confirmed' : ''}`}
                onClick={handleConfirm}
              >
                {confirmed ? 'Inputs confirmed ✓' : 'Confirm inputs with prospect →'}
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="cs-footer">
          <div className="cs-footer-ctx">
            {footerCtx(m.diagnosticConfidence, spreadPct)}
          </div>
          <div className="cs-footer-actions">
            <button className="cs-btn cs-btn-secondary" onClick={onClose}>Close</button>
            <button className="cs-btn cs-btn-primary" onClick={handleCTA}>
              Talk to an advisor
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
