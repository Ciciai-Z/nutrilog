// ============================================================
// NutriLog — log.js
// Block B4: Today Log — read-only display
// Block B5: will add CRUD interactions
// ============================================================

import { CONFIG }      from '../config.js';
import { getDailyLog } from './api.js';
import { store }       from './store.js';
import { showToast }   from './ui.js';
import { today, formatDate, parseDate, calcCalories } from './utils.js';

// ── Init ─────────────────────────────────────────────────────

export async function initLog() {
  console.log('[log] initLog → start');
  const date = store.state.currentDate || today();
  renderLogShell(date);
  await loadAndRender(date);
  console.log('[log] initLog → ready');
}

// ── Shell (date nav + empty containers) ──────────────────────

function renderLogShell(date) {
  const view = document.getElementById('view-today');
  if (!view) return;

  view.innerHTML = `
    <div class="log-page">
      <header class="page-header">
        <button class="log-nav-btn" id="log-prev" aria-label="Previous day">‹</button>
        <div class="log-date-wrap">
          <h2 class="page-header__title" id="log-date-label">${date}</h2>
        </div>
        <button class="log-nav-btn" id="log-next" aria-label="Next day">›</button>
      </header>

      <div id="log-summary-strip" class="log-summary-strip"></div>
      <div id="log-meals"         class="log-meals"></div>
    </div>
  `;

  document.getElementById('log-prev')?.addEventListener('click', () => navigateDate(-1));
  document.getElementById('log-next')?.addEventListener('click', () => navigateDate(1));
}

// ── Date navigation ───────────────────────────────────────────

async function navigateDate(delta) {
  const current = store.state.currentDate || today();
  const d       = parseDate(current);
  d.setDate(d.getDate() + delta);
  const newDate = formatDate(d);
  store.setCurrentDate(newDate);

  const label = document.getElementById('log-date-label');
  if (label) label.textContent = newDate;

  // Disable next button on today
  const nextBtn = document.getElementById('log-next');
  if (nextBtn) nextBtn.disabled = formatDate(new Date()) === newDate;

  await loadAndRender(newDate);
}

// ── Load + render ─────────────────────────────────────────────

async function loadAndRender(date) {
  showLoadingState();

  try {
    // Check cache first
    if (!store.state.dailyLog[date]) {
      const entries = await getDailyLog(date);
      store.state.dailyLog[date] = entries;
    }
    renderLog(date, store.state.dailyLog[date]);
  } catch (err) {
    console.error('[log] loadAndRender →', err);
    showToast('Failed to load log', 'error');
    showEmptyState();
  }
}

function showLoadingState() {
  const meals = document.getElementById('log-meals');
  if (meals) meals.innerHTML = '<p class="log-loading">Loading…</p>';
}

// ── Render log ────────────────────────────────────────────────

function renderLog(date, entries) {
  renderSummaryStrip(entries);
  renderMealSections(entries);
}

// ── Summary strip (macro progress bars) ──────────────────────

function renderSummaryStrip(entries) {
  const strip = document.getElementById('log-summary-strip');
  if (!strip) return;

  const totals = sumNutrients(entries);
  const s      = store.state.settings || {};
  const targets = {
    calories: Number(s.calorie_target) || 0,
    protein:  Number(s.protein_target) || 0,
    carbs:    Number(s.carbs_target)   || 0,
    fat:      Number(s.fat_target)     || 0,
    fibre:    Number(s.fibre_target)   || 0,
  };

  const macros = [
    { key: 'calories', label: 'Calories', unit: 'kcal', value: totals.calories, target: targets.calories },
    { key: 'protein',  label: 'Protein',  unit: 'g',    value: totals.protein,  target: targets.protein  },
    { key: 'carbs',    label: 'Carbs',    unit: 'g',    value: totals.carbs,    target: targets.carbs    },
    { key: 'fat',      label: 'Fat',      unit: 'g',    value: totals.fat,      target: targets.fat      },
    { key: 'fibre',    label: 'Fibre',    unit: 'g',    value: totals.fibre,    target: targets.fibre    },
  ];

  strip.innerHTML = `
    <div class="summary-strip">
      ${macros.map(m => renderMacroBar(m)).join('')}
    </div>
  `;
}

function renderMacroBar({ label, unit, value, target }) {
  const pct      = target > 0 ? Math.min((value / target) * 100, 150) : 0;
  const ratio    = target > 0 ? value / target : 0;
  const fillClass = ratio > CONFIG.targets.dangerThreshold  ? 'progress-bar__fill--danger'
                  : ratio > CONFIG.targets.warningThreshold ? 'progress-bar__fill--warning'
                  : 'progress-bar__fill--normal';
  const displayed = label === 'Calories' ? Math.round(value) : value.toFixed(1);
  const tDisplay  = label === 'Calories' ? Math.round(target) : target;

  return `
    <div class="summary-macro">
      <div class="summary-macro__header">
        <span class="summary-macro__label">${label}</span>
        <span class="summary-macro__value">${displayed}<span class="summary-macro__target"> / ${tDisplay}${unit}</span></span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill ${fillClass}" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

// ── Meal sections ─────────────────────────────────────────────

function renderMealSections(entries) {
  const container = document.getElementById('log-meals');
  if (!container) return;

  if (!entries || entries.length === 0) {
    showEmptyState();
    return;
  }

  // Group by mealType in canonical order
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
}

function renderMealSection(mealType, entries) {
  const sectionCals = entries.reduce((s, e) => s + (Number(e.calories) || 0), 0);
  const rows = entries.map(e => renderEntryRow(e)).join('');

  return `
    <div class="meal-section">
      <div class="meal-section__header">
        <span class="meal-section__name">${mealType}</span>
        <span class="meal-section__cals">${Math.round(sectionCals)} kcal</span>
      </div>
      <div class="meal-section__entries">
        ${rows}
      </div>
    </div>
  `;
}

function renderEntryRow(entry) {
  const cals = Math.round(Number(entry.calories) || 0);
  return `
    <div class="entry-row" data-row-index="${entry.rowIndex}">
      <div class="entry-row__info">
        <span class="entry-row__name">${escapeHtml(entry.name)}</span>
        <span class="entry-row__meta">${entry.amount}${entry.unit}</span>
      </div>
      <div class="entry-row__nutrients">
        <span class="entry-row__cals">${cals} kcal</span>
        <span class="entry-row__macros">
          P ${Number(entry.protein).toFixed(1)} &nbsp;
          C ${Number(entry.carbs).toFixed(1)} &nbsp;
          F ${Number(entry.fat).toFixed(1)}
        </span>
      </div>
    </div>
  `;
}

// ── Empty state ───────────────────────────────────────────────

function showEmptyState() {
  const container = document.getElementById('log-meals');
  if (container) {
    container.innerHTML = `
      <div class="log-empty-state">
        <span class="log-empty-state__icon">🥗</span>
        <p class="log-empty-state__text">No entries yet</p>
        <p class="log-empty-state__sub">Go to Search to add foods</p>
      </div>
    `;
  }
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
