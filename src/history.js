// ============================================================
// history.js — B9 History view (reads DailySummary)
// ============================================================
import { CONFIG } from '../config.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { today, formatDate, parseDate } from './utils.js';

export async function initHistory() {
  console.log('[history] init → start');
  const view = document.getElementById('view-history');
  if (!view) return;
  view.innerHTML = `
    <div class="hist-page">
      <div class="hist-header">
        <h2 class="hist-title">History</h2>
      </div>
      <div id="hist-body" class="hist-body">
        <div class="log-loading">Loading…</div>
      </div>
    </div>`;
  try {
    if (store.state.history) { renderHistory(store.state.history); return; }
    const { getHistory } = await import('./api.js');
    const rows = await getHistory();
    store.state.history = rows;
    renderHistory(rows);
  } catch (err) {
    console.error('[history] load error:', err);
    showToast('Failed to load history', 'error');
    document.getElementById('hist-body').innerHTML =
      '<p class="search-empty">Could not load history.</p>';
  }
  console.log('[history] init → ready');
}

function renderHistory(rows) {
  const body = document.getElementById('hist-body');
  if (!body) return;
  if (!rows || rows.length === 0) {
    body.innerHTML = '<p class="search-empty" style="margin-top:40px">No history yet — save a daily summary to see it here.</p>';
    return;
  }
  // Sort newest first
  const sorted = [...rows].sort((a, b) => {
    const da = parseSummaryDate(a.date), db = parseSummaryDate(b.date);
    return db - da;
  });
  body.innerHTML = sorted.map(r => renderDayCard(r)).join('');
}

function parseSummaryDate(dateStr) {
  // Format: ddd,d/m/yy  e.g. "Mon,23/3/26"
  try {
    const parts = String(dateStr).replace(/^[^,]+,/, '').split('/');
    const d = parseInt(parts[0]), m = parseInt(parts[1]), y = 2000 + parseInt(parts[2]);
    return new Date(y, m - 1, d);
  } catch { return new Date(0); }
}

function formatDisplayDate(dateStr) {
  try {
    const dt = parseSummaryDate(dateStr);
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${DOW[dt.getDay()]}, ${dt.getDate()} ${MON[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch { return dateStr; }
}

function renderDayCard(r) {
  const s = store.state.settings || {};
  const calTarget = Number(s.calorie_target) || 0;
  const cal    = Math.round(Number(r.calories)  || 0);
  const pro    = Number(r.protein) || 0;
  const carbs  = Number(r.carbs)   || 0;
  const fat    = Number(r.fat)     || 0;
  const fibre  = Number(r.fibre)   || 0;
  const calT   = Number(r.calorieTarget) || calTarget;

  // Progress bar: calories vs target
  const pct = calT > 0 ? Math.min(cal / calT * 100, 100) : 0;
  const ratio = calT > 0 ? cal / calT : 0;
  const barCls = ratio > 1.2 ? 'hist-bar__fill--danger'
               : ratio > 1.1 ? 'hist-bar__fill--warn' : '';

  // Status badge
  let badge = '', badgeCls = '';
  if (calT > 0) {
    if (ratio <= 1.05 && ratio >= 0.9) { badge = 'On track';  badgeCls = 'hist-badge--ok'; }
    else if (ratio > 1.1)              { badge = 'Over';       badgeCls = 'hist-badge--over'; }
    else if (ratio < 0.85)             { badge = 'Under';      badgeCls = 'hist-badge--under'; }
    else                               { badge = 'Close';      badgeCls = 'hist-badge--ok'; }
  }

  return `
    <div class="hist-card">
      <div class="hist-card__top">
        <span class="hist-card__date">${formatDisplayDate(r.date)}</span>
        ${badge ? `<span class="hist-badge ${badgeCls}">${badge}</span>` : ''}
      </div>
      <div class="hist-card__macros">
        <div class="hist-macro"><span class="hist-macro__icon">🔥</span><span class="hist-macro__val">${cal.toLocaleString()}</span><span class="hist-macro__label">kcal</span></div>
        <div class="hist-macro"><span class="hist-macro__icon">💪</span><span class="hist-macro__val">${pro.toFixed(1)}g</span><span class="hist-macro__label">protein</span></div>
        <div class="hist-macro"><span class="hist-macro__icon">🌾</span><span class="hist-macro__val">${carbs.toFixed(1)}g</span><span class="hist-macro__label">carbs</span></div>
        <div class="hist-macro"><span class="hist-macro__icon">🥑</span><span class="hist-macro__val">${fat.toFixed(1)}g</span><span class="hist-macro__label">fat</span></div>
      </div>
      <div class="hist-bar"><div class="hist-bar__fill ${barCls}" style="width:${pct}%"></div></div>
    </div>`;
}
