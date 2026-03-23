// ============================================================
// NutriLog — log.js
// B4: read-only display
// B5: add/delete/update entry interactions + Sync
// ============================================================

import { CONFIG }                                          from '../config.js';
import { getDailyLog, deleteLogEntry, updateLogEntry,
         syncDailySummary }                                from './api.js';
import { store }                                           from './store.js';
import { showToast }                                       from './ui.js';
import { today, formatDate, parseDate, calcCalories }      from './utils.js';

// ── Init ─────────────────────────────────────────────────────

export async function initLog() {
  console.log('[log] initLog → start');
  const date = store.state.currentDate || today();
  renderLogShell(date);
  await loadAndRender(date);
  console.log('[log] initLog → ready');
}

// Called from search.js after a food is added
export function invalidateLogCache(date) {
  delete store.state.dailyLog[date];
}

// ── Shell ─────────────────────────────────────────────────────

function renderLogShell(date) {
  const view = document.getElementById('view-today');
  if (!view) return;

  const isToday = date === formatDate(new Date());

  view.innerHTML = `
    <div class="log-page">
      <header class="page-header">
        <button class="log-nav-btn" id="log-prev" aria-label="Previous day">‹</button>
        <div class="log-date-wrap">
          <h2 class="page-header__title" id="log-date-label">${date}</h2>
        </div>
        <button class="log-nav-btn" id="log-next" aria-label="Next day"
          ${isToday ? 'disabled' : ''}>›</button>
      </header>
      <div id="log-summary-strip" class="log-summary-strip"></div>
      <div id="log-meals"         class="log-meals"></div>
      <div class="log-sync-wrap">
        <button id="log-sync-btn" class="btn btn--ghost log-sync-btn">
          ${CONFIG.labels.syncButton}
        </button>
      </div>
    </div>
  `;

  document.getElementById('log-prev')?.addEventListener('click', () => navigateDate(-1));
  document.getElementById('log-next')?.addEventListener('click', () => navigateDate(1));
  document.getElementById('log-sync-btn')?.addEventListener('click', handleSync);
}

// ── Date navigation ───────────────────────────────────────────

async function navigateDate(delta) {
  const current = store.state.currentDate || today();
  const d       = parseDate(current);
  d.setDate(d.getDate() + delta);
  const newDate = formatDate(d);
  store.setCurrentDate(newDate);

  const label   = document.getElementById('log-date-label');
  const nextBtn = document.getElementById('log-next');
  if (label)   label.textContent = newDate;
  if (nextBtn) nextBtn.disabled  = newDate === formatDate(new Date());

  await loadAndRender(newDate);
}

// ── Load + render ─────────────────────────────────────────────

async function loadAndRender(date) {
  showLoadingState();
  try {
    if (!store.state.dailyLog[date]) {
      store.state.dailyLog[date] = await getDailyLog(date);
    }
    renderLog(date, store.state.dailyLog[date]);
  } catch (err) {
    console.error('[log] loadAndRender →', err);
    showToast('Failed to load log', 'error');
    showEmptyState();
  }
}

function showLoadingState() {
  const el = document.getElementById('log-meals');
  if (el) el.innerHTML = '<p class="log-loading">Loading…</p>';
}

// ── Render ────────────────────────────────────────────────────

function renderLog(date, entries) {
  renderSummaryStrip(entries);
  renderMealSections(entries);
}

// ── Summary strip ─────────────────────────────────────────────

function renderSummaryStrip(entries) {
  const strip = document.getElementById('log-summary-strip');
  if (!strip) return;

  const totals  = sumNutrients(entries);
  const s       = store.state.settings || {};
  const targets = {
    calories: Number(s.calorie_target) || 0,
    protein:  Number(s.protein_target) || 0,
    carbs:    Number(s.carbs_target)   || 0,
    fat:      Number(s.fat_target)     || 0,
    fibre:    Number(s.fibre_target)   || 0,
  };

  const macros = [
    { label: 'Calories', unit: 'kcal', value: totals.calories, target: targets.calories },
    { label: 'Protein',  unit: 'g',    value: totals.protein,  target: targets.protein  },
    { label: 'Carbs',    unit: 'g',    value: totals.carbs,    target: targets.carbs    },
    { label: 'Fat',      unit: 'g',    value: totals.fat,      target: targets.fat      },
    { label: 'Fibre',    unit: 'g',    value: totals.fibre,    target: targets.fibre    },
  ];

  strip.innerHTML = `<div class="summary-strip">${macros.map(renderMacroBar).join('')}</div>`;
}

function renderMacroBar({ label, unit, value, target }) {
  const pct       = target > 0 ? Math.min((value / target) * 100, 150) : 0;
  const ratio     = target > 0 ? value / target : 0;
  const fillClass = ratio > CONFIG.targets.dangerThreshold  ? 'progress-bar__fill--danger'
                  : ratio > CONFIG.targets.warningThreshold ? 'progress-bar__fill--warning'
                  : 'progress-bar__fill--normal';
  const disp  = label === 'Calories' ? Math.round(value) : value.toFixed(1);
  const tDisp = label === 'Calories' ? Math.round(target) : target;
  return `
    <div class="summary-macro">
      <div class="summary-macro__header">
        <span class="summary-macro__label">${label}</span>
        <span class="summary-macro__value">${disp}<span class="summary-macro__target"> / ${tDisp}${unit}</span></span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill ${fillClass}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ── Meal sections ─────────────────────────────────────────────

function renderMealSections(entries) {
  const container = document.getElementById('log-meals');
  if (!container) return;
  if (!entries || entries.length === 0) { showEmptyState(); return; }

  const groups = {};
  CONFIG.labels.mealTypes.forEach(t => { groups[t] = []; });
  entries.forEach(e => {
    const key = CONFIG.labels.mealTypes.includes(e.mealType) ? e.mealType : 'Other';
    groups[key].push(e);
  });

  const html = CONFIG.labels.mealTypes
    .filter(t => groups[t].length > 0)
    .map(t => renderMealSection(t, groups[t]))
    .join('');

  container.innerHTML = html || '<p class="log-empty">No entries for this day.</p>';
  bindEntryEvents(container);
}

function renderMealSection(mealType, entries) {
  const sectionCals = entries.reduce((s, e) => s + (Number(e.calories) || 0), 0);
  return `
    <div class="meal-section">
      <div class="meal-section__header">
        <span class="meal-section__name">${mealType}</span>
        <span class="meal-section__cals">${Math.round(sectionCals)} kcal</span>
      </div>
      <div class="meal-section__entries">
        ${entries.map(renderEntryRow).join('')}
      </div>
    </div>`;
}

function renderEntryRow(entry) {
  const cals = Math.round(Number(entry.calories) || 0);
  const na   = Math.round(Number(entry.sodium)   || 0);
  const k    = Math.round(Number(entry.potassium)|| 0);
  return `
    <div class="entry-row" data-row-index="${entry.rowIndex}">
      <div class="entry-row__swipe-container">
        <div class="entry-row__content">
          <div class="entry-row__info">
            <span class="entry-row__name">${escapeHtml(entry.name)}</span>
            <button class="entry-row__amount-btn" data-row-index="${entry.rowIndex}"
                    data-amount="${entry.amount}" data-unit="${entry.unit}">
              ${entry.amount}${entry.unit}
            </button>
          </div>
          <div class="entry-row__nutrients">
            <span class="entry-row__cals">${cals} kcal</span>
            <span class="entry-row__macros">P ${Number(entry.protein).toFixed(1)} &nbsp; C ${Number(entry.carbs).toFixed(1)} &nbsp; F ${Number(entry.fat).toFixed(1)}</span>
            <span class="entry-row__minerals">Na ${na}mg &nbsp; K ${k}mg</span>
          </div>
        </div>
        <button class="entry-row__delete-btn" data-row-index="${entry.rowIndex}"
                aria-label="Delete entry">Delete</button>
      </div>
    </div>`;
}

// ── Events ────────────────────────────────────────────────────

function bindEntryEvents(container) {
  // Amount inline edit
  container.querySelectorAll('.entry-row__amount-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAmountEdit(btn));
  });

  // Swipe-to-delete (touch)
  container.querySelectorAll('.entry-row').forEach(row => {
    bindSwipeDelete(row);
  });

  // Delete button click (also for mouse on desktop)
  container.querySelectorAll('.entry-row__delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(Number(btn.dataset.rowIndex)));
  });
}

// ── Amount inline edit ────────────────────────────────────────

function handleAmountEdit(btn) {
  if (btn.querySelector('input')) return; // already editing

  const rowIndex  = Number(btn.dataset.rowIndex);
  const oldAmount = Number(btn.dataset.amount);
  const unit      = btn.dataset.unit;

  btn.innerHTML = `
    <input class="entry-amount-input" type="number" value="${oldAmount}"
           min="1" step="1" inputmode="decimal"
           style="width:60px;text-align:right;" />
  `;

  const input = btn.querySelector('input');
  input.focus();
  input.select();

  const confirm = async () => {
    const newAmount = parseFloat(input.value);
    if (!newAmount || newAmount <= 0 || newAmount === oldAmount) {
      btn.textContent = `${oldAmount}${unit}`;
      return;
    }
    btn.textContent = `${newAmount}${unit}`;
    btn.dataset.amount = newAmount;
    await handleUpdate(rowIndex, newAmount);
  };

  input.addEventListener('blur',  confirm);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') {
      btn.textContent = `${oldAmount}${unit}`;
    }
  });
}

async function handleUpdate(rowIndex, newAmount) {
  try {
    await updateLogEntry(rowIndex, newAmount);
    const date = store.state.currentDate || today();
    invalidateLogCache(date);
    await loadAndRender(date);
    console.log(`[log] handleUpdate → row=${rowIndex} amount=${newAmount}`);
  } catch (err) {
    console.error('[log] handleUpdate →', err);
    showToast('Failed to update amount', 'error');
  }
}

// ── Swipe to delete ───────────────────────────────────────────

function bindSwipeDelete(row) {
  let startX = 0, isDragging = false;
  const container = row.querySelector('.entry-row__swipe-container');
  if (!container) return;

  row.addEventListener('touchstart', e => {
    startX     = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  row.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    if (dx < 0) {
      container.style.transform = `translateX(${Math.max(dx, -80)}px)`;
    }
  }, { passive: true });

  row.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -50) {
      container.style.transform = 'translateX(-80px)';
      row.classList.add('entry-row--swiped');
    } else {
      container.style.transform = '';
      row.classList.remove('entry-row--swiped');
    }
  });
}

// ── Delete ────────────────────────────────────────────────────

async function handleDelete(rowIndex) {
  try {
    await deleteLogEntry(rowIndex);

    // Remove the entry row directly from DOM — no full page reload
    const rowEl = document.querySelector(`.entry-row[data-row-index="${rowIndex}"]`);
    if (rowEl) {
      rowEl.style.transition = 'opacity 0.2s, max-height 0.2s';
      rowEl.style.opacity    = '0';
      rowEl.style.maxHeight  = '0';
      rowEl.style.overflow   = 'hidden';
      setTimeout(() => rowEl.remove(), 220);
    }

    // Invalidate cache so next visit re-fetches
    const date = store.state.currentDate || today();
    invalidateLogCache(date);

    // Update summary strip with fresh data after short delay
    setTimeout(async () => {
      if (store.state.dailyLog[date] === undefined) {
        store.state.dailyLog[date] = await getDailyLog(date);
      } else {
        // Remove entry from local cache too
        store.state.dailyLog[date] = store.state.dailyLog[date]
          .filter(e => e.rowIndex !== rowIndex);
      }
      renderSummaryStrip(store.state.dailyLog[date]);
    }, 250);

    showToast('Entry deleted', 'success');
    console.log(`[log] handleDelete → row=${rowIndex}`);
  } catch (err) {
    console.error('[log] handleDelete →', err);
    showToast('Failed to delete entry', 'error');
  }
}

// ── Sync ──────────────────────────────────────────────────────

async function handleSync() {
  const btn  = document.getElementById('log-sync-btn');
  const date = store.state.currentDate || today();
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }

  try {
    await syncDailySummary(date);
    showToast('Synced to DailySummary ✓', 'success');
    console.log(`[log] handleSync → date=${date}`);
  } catch (err) {
    console.error('[log] handleSync →', err);
    showToast('Sync failed', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = CONFIG.labels.syncButton; }
  }
}

// ── Empty state ───────────────────────────────────────────────

function showEmptyState() {
  const el = document.getElementById('log-meals');
  if (el) el.innerHTML = `
    <div class="log-empty-state">
      <span class="log-empty-state__icon">🥗</span>
      <p class="log-empty-state__text">No entries yet</p>
      <p class="log-empty-state__sub">Go to Search to add foods</p>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────

function sumNutrients(entries) {
  return (entries || []).reduce((acc, e) => {
    acc.calories += Number(e.calories) || 0;
    acc.protein  += Number(e.protein)  || 0;
    acc.carbs    += Number(e.carbs)    || 0;
    acc.fat      += Number(e.fat)      || 0;
    acc.fibre    += Number(e.fibre)    || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
