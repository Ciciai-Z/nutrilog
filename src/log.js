// ============================================================
// log.js — Today's Log
// Updated: Session 4 (editable title, search pill, meal colours,
//          emoji summary sidebar, iPhone macro strip)
// ============================================================
import { CONFIG } from '../config.js';
import { getDailyLog, deleteLogEntry, updateLogEntry, syncDailySummary, searchFoods, addLogEntry } from './api.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { today, formatDate, parseDate } from './utils.js';

const isMac = () => window.innerWidth >= 768;

// Meal meta: CSS modifier, emoji, icon bg
const MEAL_META = {
  Breakfast: { mod: 'breakfast', emoji: '☀️' },
  Lunch:     { mod: 'lunch',     emoji: '🌿' },
  Dinner:    { mod: 'dinner',    emoji: '🌙' },
  Snacks:    { mod: 'snacks',    emoji: '🍓' },
  Other:     { mod: 'other',     emoji: '📦' },
};

// ── Init ───────────────────────────────────────────────────────
export async function initLog(macMode = false) {
  console.log('[log] initLog → start');
  const date = store.state.currentDate || today();

  if (macMode) {
    renderLogShellMac(date);
  } else {
    renderLogShellMobile(date);
  }
  await loadAndRender(date);
  console.log('[log] initLog → ready');
}

export function invalidateLogCache(date) {
  delete store.state.dailyLog[date];
}

// ── Shell: Mobile ──────────────────────────────────────────────
function renderLogShellMobile(date) {
  const view = document.getElementById('view-today');
  if (!view) return;

  const title = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  const isToday = date === formatDate(new Date());

  view.innerHTML = `
    <div class="log-page">
      <!-- iPhone header: editable title + date pill -->
      <div class="log-page-header-row">
        <div class="page-title-wrap">
          <input
            class="page-title-input"
            id="log-title-input"
            type="text"
            value="${escapeAttr(title)}"
            maxlength="28"
            spellcheck="false"
            aria-label="Page title"
          >
        </div>
        <span class="log-date-pill" id="log-date-pill">${date}</span>
      </div>

      <!-- Search bar (full-width on iPhone) -->
      <div class="search-bar-wrap" style="padding:0 16px 8px">
        <input
          class="search-input"
          id="log-search-input"
          type="search"
          placeholder="Search to add food..."
          autocomplete="off"
        >
      </div>

      <!-- iPhone macro strip -->
      <div id="log-macro-strip" class="iphone-macro-strip"></div>

      <!-- Mobile summary strip (hidden on Mac) -->
      <div id="log-summary-strip" class="log-summary-strip"></div>

      <!-- Date nav arrows (mobile) -->
      <header class="page-header" style="padding:4px 16px">
        <button class="log-nav-btn" id="log-prev" aria-label="Previous day">‹</button>
        <div class="log-date-wrap">
          <span style="font-size:13px;color:var(--color-text-secondary)" id="log-date-label">${date}</span>
        </div>
        <button class="log-nav-btn" id="log-next" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button>
      </header>

      <!-- Meal list -->
      <div id="log-meals" class="log-meals"></div>

      <!-- Mobile sync -->
      <div class="log-sync-wrap">
        <button id="log-sync-btn-mobile" class="btn btn--ghost log-sync-btn">
          Save Summary
        </button>
      </div>
    </div>`;

  bindShellEvents(date);
  bindTitleInput('log-title-input');
  bindMobileSearch('log-search-input');
}

// ── Shell: Mac ─────────────────────────────────────────────────
function renderLogShellMac(date) {
  const view = document.getElementById('view-today');
  if (!view) return;

  const title = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  const isToday = date === formatDate(new Date());

  view.innerHTML = `
    <div class="log-page">
      <!-- Mac header: editable serif title + search pill -->
      <header class="page-header">
        <div class="page-title-wrap" style="flex-shrink:0;position:relative">
          <input
            class="page-title-input"
            id="log-title-input"
            type="text"
            value="${escapeAttr(title)}"
            maxlength="28"
            spellcheck="false"
            aria-label="Page title"
          >
          <div class="page-title-edit-hint">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M7 1.5l1.5 1.5-5 5L2 8.5l.5-1.5z"/>
            </svg>
            click to edit
          </div>
        </div>

        <span class="page-header__spacer"></span>

        <!-- Search pill -->
        <div class="mac-search-pill-wrap" id="mac-search-wrap">
          <div class="mac-search-pill" id="mac-search-pill">
            <svg class="mac-search-pill__icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="5.5" cy="5.5" r="3.5"/>
              <line x1="8.5" y1="8.5" x2="12" y2="12"/>
            </svg>
            <input
              class="mac-search-pill__input"
              id="mac-search-input"
              type="text"
              placeholder="Add food..."
              autocomplete="off"
            >
          </div>
          <div class="mac-search-dropdown" id="mac-search-dropdown">
            <div class="mac-search-dropdown-rows" id="mac-search-rows"></div>
            <div class="mac-search-add-bar" id="mac-add-bar" style="display:none">
              <span class="mac-search-add-bar__name" id="mac-add-bar-name"></span>
              <input class="mac-search-add-bar__input" id="mac-add-amount" type="number" value="100" min="1" step="1">
              <span class="mac-search-add-bar__unit">g</span>
              <select class="mac-search-add-bar__select" id="mac-add-meal">
                ${CONFIG.labels.mealTypes.map(t => `<option>${t}</option>`).join('')}
              </select>
              <span class="mac-search-add-bar__cal" id="mac-add-cal"></span>
              <button class="mac-search-add-bar__btn" id="mac-add-btn">+ Add</button>
            </div>
          </div>
        </div>
      </header>

      <!-- Date nav (Mac, inside left col) -->
      <div style="display:flex;align-items:center;padding:4px 16px;gap:8px;border-bottom:1px solid var(--color-border)">
        <button class="log-nav-btn" id="log-prev" aria-label="Previous day">‹</button>
        <span style="flex:1;text-align:center;font-size:12px;color:var(--color-text-secondary)" id="log-date-label">${date}</span>
        <button class="log-nav-btn" id="log-next" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button>
      </div>

      <!-- Meal list -->
      <div id="log-meals" class="log-meals"></div>
    </div>`;

  bindShellEvents(date);
  bindTitleInput('log-title-input');
  bindMacSearch();
}

// ── Shared shell events ────────────────────────────────────────
function bindShellEvents(date) {
  document.getElementById('log-prev')?.addEventListener('click', () => navigateDate(-1));
  document.getElementById('log-next')?.addEventListener('click', () => navigateDate(1));
  document.getElementById('log-sync-btn-mobile')?.addEventListener('click', handleSync);
}

// ── Editable title ─────────────────────────────────────────────
function bindTitleInput(id) {
  const input = document.getElementById(id);
  if (!input) return;

  // Auto-resize width
  const resize = () => {
    input.style.width = Math.max(input.value.length * 13 + 8, 80) + 'px';
  };
  resize();
  input.addEventListener('input', resize);

  input.addEventListener('blur', async () => {
    const val = input.value.trim() || CONFIG.labels.defaultDayTitle || "Today's log";
    input.value = val;
    if (val === (store.state.settings?.day_title || '')) return;
    try {
      const { updateSettings } = await import('./api.js');
      await updateSettings({ day_title: val });
      if (store.state.settings) store.state.settings.day_title = val;
      console.log('[log] day_title saved →', val);
    } catch (err) {
      console.error('[log] day_title save failed:', err);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = store.state.settings?.day_title || ''; input.blur(); }
  });
}

// ── Mobile search (triggers bottom sheet from search.js) ───────
function bindMobileSearch(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('focus', async () => {
    const { openSearchSheet } = await import('./search.js');
    openSearchSheet();
  });
}

// ── Mac search pill ────────────────────────────────────────────
let _macSelectedFood = null;
let _macSearchTimeout = null;

function bindMacSearch() {
  const input    = document.getElementById('mac-search-input');
  const pill     = document.getElementById('mac-search-pill');
  const dropdown = document.getElementById('mac-search-dropdown');
  const rows     = document.getElementById('mac-search-rows');
  const addBar   = document.getElementById('mac-add-bar');
  const addBtn   = document.getElementById('mac-add-btn');
  const amountIn = document.getElementById('mac-add-amount');
  const calSpan  = document.getElementById('mac-add-cal');
  if (!input || !dropdown) return;

  const showDropdown = () => {
    pill.classList.add('mac-search-pill--expanded');
    dropdown.classList.add('mac-search-dropdown--visible');
  };
  const hideDropdown = () => {
    pill.classList.remove('mac-search-pill--expanded');
    dropdown.classList.remove('mac-search-dropdown--visible');
    addBar.style.display = 'none';
    _macSelectedFood = null;
  };

  input.addEventListener('focus', () => {
    showDropdown();
    if (!input.value) renderMacDropdown(store.state.foods?.filter(f => store.state.favourites?.includes(f.no)) || []);
  });

  input.addEventListener('input', () => {
    clearTimeout(_macSearchTimeout);
    const q = input.value.trim();
    if (!q) {
      renderMacDropdown(store.state.foods?.filter(f => store.state.favourites?.includes(f.no)) || []);
      return;
    }
    const results = (store.state.foods || [])
      .filter(f => f.name?.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 6);
    renderMacDropdown(results);
  });

  document.addEventListener('click', e => {
    if (!document.getElementById('mac-search-wrap')?.contains(e.target)) hideDropdown();
  });

  function renderMacDropdown(foods) {
    rows.innerHTML = foods.map(f => `
      <div class="mac-search-dropdown-row" data-no="${f.no}">
        <svg class="mac-search-drow__star" viewBox="0 0 12 12" fill="${store.state.favourites?.includes(f.no) ? 'var(--color-accent)' : 'none'}" stroke="var(--color-accent)" stroke-width="1">
          <path d="M6 .5l1.3 2.8 3 .4-2.2 2.1.5 3L6 7.5l-2.6 1.3.5-3L1.7 3.7l3-.4z"/>
        </svg>
        <span class="mac-search-drow__name">${escapeHtml(f.name)}</span>
        <span class="mac-search-drow__meta">${calcCals(f, 100)} cal/100g</span>
      </div>`).join('');

    rows.querySelectorAll('.mac-search-dropdown-row').forEach(row => {
      row.addEventListener('click', () => selectMacFood(Number(row.dataset.no)));
    });
  }

  function selectMacFood(no) {
    const food = (store.state.foods || []).find(f => f.no === no);
    if (!food) return;
    _macSelectedFood = food;
    rows.querySelectorAll('.mac-search-dropdown-row').forEach(r => {
      r.classList.toggle('mac-search-dropdown-row--selected', Number(r.dataset.no) === no);
    });

    // Pre-fill last used amount
    const lastAmt = store.state.lastAmounts?.[no] || 100;
    amountIn.value = lastAmt;
    document.getElementById('mac-add-bar-name').textContent = food.name?.substring(0, 20) || '';
    updateCalPreview();
    addBar.style.display = 'flex';
  }

  function updateCalPreview() {
    if (!_macSelectedFood) return;
    const amt = parseFloat(amountIn.value) || 0;
    calSpan.textContent = calcCals(_macSelectedFood, amt) + ' cal';
  }
  amountIn.addEventListener('input', updateCalPreview);

  addBtn.addEventListener('click', async () => {
    if (!_macSelectedFood) return;
    const food   = _macSelectedFood;
    const amount = parseFloat(amountIn.value);
    const meal   = document.getElementById('mac-add-meal')?.value || 'Breakfast';
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

    addBtn.disabled = true;
    addBtn.textContent = '…';
    try {
      const date = store.state.currentDate || today();
      const ratio = amount / (food.amount || 100);
      const entry = {
        date, mealType: meal, foodNo: food.no, name: food.name,
        amount, unit: food.unit || 'g',
        calories:   Math.round((food.calories || calcCals(food, food.amount || 100)) * ratio),
        protein:    round1((food.protein  || 0) * ratio),
        carbs:      round1((food.carbs    || 0) * ratio),
        fat:        round1((food.fat      || 0) * ratio),
        fibre:      round1((food.fibre    || 0) * ratio),
        sodium:     round1((food.sodium   || 0) * ratio),
        potassium:  round1((food.potassium|| 0) * ratio),
      };
      await addLogEntry(entry);
      // cache last amount
      if (!store.state.lastAmounts) store.state.lastAmounts = {};
      store.state.lastAmounts[food.no] = amount;
      invalidateLogCache(date);
      store.state.dailyLog[date] = await getDailyLog(date);
      renderLog(date, store.state.dailyLog[date]);
      // refresh sidebar
      const { refreshSidebar } = await import('./main.js');
      refreshSidebar();
      showToast(`${food.name} added ✓`, 'success');
      hideDropdown();
      input.value = '';
    } catch (err) {
      console.error('[log] mac add failed:', err);
      showToast('Failed to add', 'error');
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = '+ Add';
    }
  });
}

function calcCals(food, amount) {
  const ratio = amount / (food.amount || 100);
  const fat  = (food.fat  || 0) * ratio;
  const carbs= (food.carbs|| 0) * ratio;
  const prot = (food.protein||0)*ratio;
  return Math.round(fat * 9 + carbs * 4 + prot * 4);
}
const round1 = v => Math.round(v * 10) / 10;

// ── Date navigation ────────────────────────────────────────────
async function navigateDate(delta) {
  const current = store.state.currentDate || today();
  const d = parseDate(current);
  d.setDate(d.getDate() + delta);
  const newDate = formatDate(d);
  store.setCurrentDate(newDate);

  const label   = document.getElementById('log-date-label');
  const pill    = document.getElementById('log-date-pill');
  const nextBtn = document.getElementById('log-next');
  if (label)   label.textContent = newDate;
  if (pill)    pill.textContent  = newDate;
  if (nextBtn) nextBtn.disabled  = newDate === formatDate(new Date());

  // update nav pill
  const navPill = document.getElementById('nav-date-pill');
  if (navPill) navPill.textContent = newDate;

  await loadAndRender(newDate);
}

// ── Load + render ──────────────────────────────────────────────
async function loadAndRender(date) {
  const el = document.getElementById('log-meals');
  if (el) el.innerHTML = '<p class="log-loading">Loading…</p>';
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

function renderLog(date, entries) {
  renderMacroStrip(entries);
  renderMobileStrip(entries);
  renderMealSections(entries);
}

// ── iPhone macro strip ─────────────────────────────────────────
function renderMacroStrip(entries) {
  const el = document.getElementById('log-macro-strip');
  if (!el) return;
  const t = sumNutrients(entries);
  const s = store.state.settings || {};
  const chips = [
    { emoji: '🔥', val: Math.round(t.calories), target: Number(s.calorie_target) || 0 },
    { emoji: '💪', val: t.protein.toFixed(1),   target: Number(s.protein_target)  || 0, unit:'g' },
    { emoji: '🌾', val: t.carbs.toFixed(1),     target: Number(s.carbs_target)    || 0, unit:'g' },
    { emoji: '🥑', val: t.fat.toFixed(1),       target: Number(s.fat_target)      || 0, unit:'g' },
  ];
  el.innerHTML = chips.map(c => {
    const pct = c.target > 0 ? Math.min((parseFloat(c.val) / c.target) * 100, 100) : 0;
    return `<div class="iphone-macro-chip">
      <span class="iphone-macro-chip__emoji">${c.emoji}</span>
      <span class="iphone-macro-chip__val">${c.val}${c.unit || ''}</span>
      <div class="iphone-macro-chip__bar"><div class="iphone-macro-chip__fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ── Mobile summary strip ───────────────────────────────────────
function renderMobileStrip(entries) {
  const strip = document.getElementById('log-summary-strip');
  if (!strip) return;
  const t = sumNutrients(entries);
  const s = store.state.settings || {};
  const macros = [
    { label:'Calories', unit:'kcal', value:t.calories, target:Number(s.calorie_target)||0 },
    { label:'Protein',  unit:'g',    value:t.protein,  target:Number(s.protein_target)||0 },
    { label:'Carbs',    unit:'g',    value:t.carbs,    target:Number(s.carbs_target)||0 },
    { label:'Fat',      unit:'g',    value:t.fat,      target:Number(s.fat_target)||0 },
    { label:'Fibre',    unit:'g',    value:t.fibre,    target:Number(s.fibre_target)||0 },
  ];
  strip.innerHTML = `<div class="summary-strip">${macros.map(renderMacroBar).join('')}</div>`;
}

// ── Sidebar summary (Mac) ─────────────────────────────────────
export function renderSidebarSummary(entries) {
  const el = document.getElementById('sidebar-summary');
  if (!el) return;

  const date = store.state.currentDate || today();
  const data = entries || store.state.dailyLog?.[date] || [];
  const t = sumNutrients(data);
  const s = store.state.settings || {};

  const macros = [
    { emoji:'🔥', label:'Calories', unit:'kcal', value:t.calories, target:Number(s.calorie_target)||0 },
    { emoji:'💪', label:'Protein',  unit:'g',    value:t.protein,  target:Number(s.protein_target)||0 },
    { emoji:'🌾', label:'Carbs',    unit:'g',    value:t.carbs,    target:Number(s.carbs_target)||0 },
    { emoji:'🥑', label:'Fat',      unit:'g',    value:t.fat,      target:Number(s.fat_target)||0 },
    { emoji:'🌿', label:'Fibre',    unit:'g',    value:t.fibre,    target:Number(s.fibre_target)||0 },
  ];
  const minerals = [
    { emoji:'💧', label:'Sodium',    unit:'mg', value:t.sodium,    target:Number(s.sodium_target)||2000 },
    { emoji:'⚡', label:'Potassium', unit:'mg', value:t.potassium, target:Number(s.potassium_target)||3500 },
  ];

  const barHTML = (value, target) => {
    const pct   = target > 0 ? Math.min((value / target) * 100, 100) : 0;
    const ratio = target > 0 ? value / target : 0;
    const cls   = ratio > CONFIG.targets.dangerThreshold  ? 'sidebar-bar__fill--danger'  :
                  ratio > CONFIG.targets.warningThreshold ? 'sidebar-bar__fill--warning' : '';
    return `<div class="sidebar-bar"><div class="sidebar-bar__fill ${cls}" style="width:${pct}%"></div></div>`;
  };

  const macroHTML = macros.map(m => {
    const disp = m.label === 'Calories' ? Math.round(m.value) : m.value.toFixed(1);
    const tDisp= m.label === 'Calories' ? Math.round(m.target) : m.target;
    return `<div class="sidebar-macro">
      <div class="sidebar-macro__header">
        <span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span>
        <span class="sidebar-macro__value">${disp} / ${tDisp}${m.unit}</span>
      </div>
      ${barHTML(m.value, m.target)}
    </div>`;
  }).join('');

  const mineralHTML = minerals.map(m => {
    const disp = Math.round(m.value);
    return `<div class="sidebar-macro">
      <div class="sidebar-macro__header">
        <span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span>
        <span class="sidebar-macro__value">${disp} / ${Math.round(m.target)}${m.unit}</span>
      </div>
      ${barHTML(m.value, m.target)}
    </div>`;
  }).join('');

  const rem = macros.slice(0, 4).map(m => {
    const r = Math.max(0, (m.label === 'Calories' ? Math.round(m.target - m.value) : round1(m.target - m.value)));
    return `<div class="sidebar-remaining-card">
      <div class="sidebar-remaining-card__label">${m.emoji} ${m.label}</div>
      <div class="sidebar-remaining-card__value">${r}${m.unit}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    ${macroHTML}
    <hr class="sidebar-divider">
    <div class="sidebar-minerals-title">Minerals</div>
    ${mineralHTML}
    <hr class="sidebar-divider">
    <div class="sidebar-remaining-title">Remaining today</div>
    <div class="sidebar-remaining-grid">${rem}</div>
  `;
}

// Exported alias so main.js can call it
export function handleSyncFromSidebar() { handleSync(); }

// ── Macro bar (mobile) ─────────────────────────────────────────
function renderMacroBar({ label, unit, value, target }) {
  const pct   = target > 0 ? Math.min((value / target) * 100, 150) : 0;
  const ratio = target > 0 ? value / target : 0;
  const cls   = ratio > CONFIG.targets.dangerThreshold  ? 'progress-bar__fill--danger'  :
                ratio > CONFIG.targets.warningThreshold ? 'progress-bar__fill--warning' : 'progress-bar__fill--normal';
  const disp  = label === 'Calories' ? Math.round(value) : value.toFixed(1);
  const tDisp = label === 'Calories' ? Math.round(target) : target;
  return `
    <div class="summary-macro">
      <div class="summary-macro__header">
        <span class="summary-macro__label">${label}</span>
        <span class="summary-macro__value">${disp}<span class="summary-macro__target"> / ${tDisp}${unit}</span></span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill ${cls}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ── Meal sections ──────────────────────────────────────────────
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
  const meta     = MEAL_META[mealType] || MEAL_META['Other'];
  const modClass = `meal-section--${meta.mod}`;
  const sectionCals = entries.reduce((s, e) => s + (Number(e.calories) || 0), 0);

  // Macro totals for header
  const tot = entries.reduce((a, e) => {
    a.protein  += Number(e.protein)  || 0;
    a.carbs    += Number(e.carbs)    || 0;
    a.fat      += Number(e.fat)      || 0;
    a.fibre    += Number(e.fibre)    || 0;
    return a;
  }, { protein:0, carbs:0, fat:0, fibre:0 });

  return `
    <div class="meal-section ${modClass}">
      <div class="meal-section__header">
        <div class="meal-section__header-left">
          <div class="meal-icon-circle">${meta.emoji}</div>
          <span class="meal-section__name">${mealType}</span>
        </div>
        <div class="meal-section__macros">
          <span class="meal-section__macro-item"><strong>${Math.round(sectionCals)}</strong> cal</span>
          <span class="meal-section__macro-item">P <strong>${tot.protein.toFixed(1)}g</strong></span>
          <span class="meal-section__macro-item">C <strong>${tot.carbs.toFixed(1)}g</strong></span>
          <span class="meal-section__macro-item">F <strong>${tot.fat.toFixed(1)}g</strong></span>
          <span class="meal-section__macro-item">Fi <strong>${tot.fibre.toFixed(1)}g</strong></span>
        </div>
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
            <button class="entry-row__amount-btn"
              data-row-index="${entry.rowIndex}"
              data-amount="${entry.amount}"
              data-unit="${entry.unit}">
              ${entry.amount}${entry.unit}
            </button>
          </div>
          <div class="entry-row__nutrients">
            <span class="entry-row__cals">${cals} kcal</span>
            <span class="entry-row__macros">P ${Number(entry.protein).toFixed(1)} &nbsp; C ${Number(entry.carbs).toFixed(1)} &nbsp; F ${Number(entry.fat).toFixed(1)}</span>
            <span class="entry-row__minerals">Na ${na}mg &nbsp; K ${k}mg</span>
          </div>
        </div>
        <button class="entry-row__delete-btn" data-row-index="${entry.rowIndex}" aria-label="Delete">Delete</button>
      </div>
    </div>`;
}

// ── Events ─────────────────────────────────────────────────────
function bindEntryEvents(container) {
  container.querySelectorAll('.entry-row__amount-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAmountEdit(btn));
  });
  container.querySelectorAll('.entry-row').forEach(row => bindSwipeDelete(row));
  container.querySelectorAll('.entry-row__delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(Number(btn.dataset.rowIndex)));
  });
}

// ── Amount edit ────────────────────────────────────────────────
function handleAmountEdit(btn) {
  if (btn.querySelector('input')) return;
  const rowIndex = Number(btn.dataset.rowIndex);
  const oldAmt   = Number(btn.dataset.amount);
  const unit     = btn.dataset.unit;
  btn.innerHTML  = `<input class="entry-amount-input" type="number" value="${oldAmt}" min="1" step="1" inputmode="decimal" style="width:60px;text-align:right;"/>`;
  const input = btn.querySelector('input');
  input.focus(); input.select();

  const confirm = async () => {
    const newAmt = parseFloat(input.value);
    if (!newAmt || newAmt <= 0 || newAmt === oldAmt) { btn.textContent = `${oldAmt}${unit}`; return; }
    btn.textContent = `${newAmt}${unit}`;
    btn.dataset.amount = newAmt;
    await handleUpdate(rowIndex, newAmt);
  };
  input.addEventListener('blur', confirm);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { btn.textContent = `${oldAmt}${unit}`; }
  });
}

async function handleUpdate(rowIndex, newAmount) {
  try {
    await updateLogEntry(rowIndex, newAmount);
    const date = store.state.currentDate || today();
    invalidateLogCache(date);
    store.state.dailyLog[date] = await getDailyLog(date);
    renderMacroStrip(store.state.dailyLog[date]);
    renderMobileStrip(store.state.dailyLog[date]);
    renderSidebarSummary(store.state.dailyLog[date]);
    console.log(`[log] handleUpdate → row=${rowIndex} amount=${newAmount}`);
  } catch (err) {
    console.error('[log] handleUpdate →', err);
    showToast('Failed to update amount', 'error');
  }
}

// ── Swipe to delete ────────────────────────────────────────────
function bindSwipeDelete(row) {
  let startX = 0, isDragging = false;
  const container = row.querySelector('.entry-row__swipe-container');
  if (!container) return;

  row.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; }, { passive: true });
  row.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    if (dx < 0) container.style.transform = `translateX(${Math.max(dx, -80)}px)`;
  }, { passive: true });
  row.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -50) { container.style.transform = 'translateX(-80px)'; row.classList.add('entry-row--swiped'); }
    else           { container.style.transform = ''; row.classList.remove('entry-row--swiped'); }
  });
}

// ── Delete ─────────────────────────────────────────────────────
async function handleDelete(rowIndex) {
  try {
    await deleteLogEntry(rowIndex);
    const rowEl = document.querySelector(`.entry-row[data-row-index="${rowIndex}"]`);
    if (rowEl) {
      const section = rowEl.closest('.meal-section');
      rowEl.style.transition = 'opacity 0.2s, max-height 0.25s';
      rowEl.style.opacity    = '0';
      rowEl.style.maxHeight  = rowEl.offsetHeight + 'px';
      setTimeout(() => { rowEl.style.maxHeight = '0'; rowEl.style.overflow = 'hidden'; }, 10);
      setTimeout(() => {
        rowEl.remove();
        if (section && !section.querySelector('.entry-row')) {
          section.style.transition = 'opacity 0.2s';
          section.style.opacity    = '0';
          setTimeout(() => section.remove(), 200);
        }
      }, 260);
    }
    const date = store.state.currentDate || today();
    if (store.state.dailyLog[date]) {
      store.state.dailyLog[date] = store.state.dailyLog[date].filter(e => e.rowIndex !== rowIndex);
      renderMacroStrip(store.state.dailyLog[date]);
      renderMobileStrip(store.state.dailyLog[date]);
      renderSidebarSummary(store.state.dailyLog[date]);
    }
    invalidateLogCache(date);
    showToast('Entry deleted', 'success');
    console.log(`[log] handleDelete → row=${rowIndex}`);
  } catch (err) {
    console.error('[log] handleDelete →', err);
    showToast('Failed to delete entry', 'error');
  }
}

// ── Sync ───────────────────────────────────────────────────────
async function handleSync() {
  const date = store.state.currentDate || today();
  const btns = ['log-sync-btn-mobile', 'sidebar-save-btn']
    .map(id => document.getElementById(id)).filter(Boolean);
  btns.forEach(b => { b.disabled = true; b.textContent = 'Saving…'; });
  try {
    await syncDailySummary(date);
    showToast('Saved to DailySummary ✓', 'success');
    console.log(`[log] handleSync → date=${date}`);
  } catch (err) {
    console.error('[log] handleSync →', err);
    showToast('Save failed', 'error');
  } finally {
    btns.forEach(b => { b.disabled = false; b.textContent = b.id === 'sidebar-save-btn' ? 'Save Summary' : 'Save Summary'; });
  }
}

// ── Empty state ────────────────────────────────────────────────
function showEmptyState() {
  const el = document.getElementById('log-meals');
  if (el) el.innerHTML = `
    <div class="log-empty-state">
      <span class="log-empty-state__icon">🥗</span>
      <p class="log-empty-state__text">No entries yet</p>
      <p class="log-empty-state__sub">Search above to add foods</p>
    </div>`;
}

// ── Helpers ────────────────────────────────────────────────────
function sumNutrients(entries) {
  return (entries || []).reduce((acc, e) => {
    acc.calories  += Number(e.calories)  || 0;
    acc.protein   += Number(e.protein)   || 0;
    acc.carbs     += Number(e.carbs)     || 0;
    acc.fat       += Number(e.fat)       || 0;
    acc.fibre     += Number(e.fibre)     || 0;
    acc.sodium    += Number(e.sodium)    || 0;
    acc.potassium += Number(e.potassium) || 0;
    return acc;
  }, { calories:0, protein:0, carbs:0, fat:0, fibre:0, sodium:0, potassium:0 });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeAttr(str) {
  return String(str || '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
