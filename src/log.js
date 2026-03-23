// ============================================================
// log.js — Today's Log
// Updated: Session 4 + fixes (no date nav row on Mac, pill format)
// ============================================================
import { CONFIG } from '../config.js';
import { getDailyLog, deleteLogEntry, updateLogEntry, syncDailySummary, addLogEntry } from './api.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { today, formatDate, parseDate } from './utils.js';

const isMac = () => window.innerWidth >= 768;

const MEAL_META = {
  Breakfast: { mod: 'breakfast', emoji: '☀️' },
  Lunch:     { mod: 'lunch',     emoji: '🌿' },
  Dinner:    { mod: 'dinner',    emoji: '🌙' },
  Snacks:    { mod: 'snacks',    emoji: '🍓' },
  Other:     { mod: 'other',     emoji: '📦' },
};

// ── Init ───────────────────────────────────────────────────────
export async function initLog(macMode = false) {
  console.log('[log] initLog → start, macMode=', macMode);
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
  const title   = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  const isToday = date === formatDate(new Date());

  view.innerHTML = `
    <div class="log-page">
      <!-- iPhone header: editable title + date pill -->
      <div class="log-page-header-row">
        <div class="page-title-wrap">
          <input class="page-title-input" id="log-title-input" type="text"
            value="${escapeAttr(title)}" maxlength="28" spellcheck="false" aria-label="Page title">
        </div>
        <span class="log-date-pill" id="log-date-pill">${date}</span>
      </div>

      <!-- Date nav arrows (iPhone only) -->
      <div class="log-date-nav">
        <button class="log-nav-btn" id="log-prev" aria-label="Previous day">‹</button>
        <span class="log-date-nav__label" id="log-date-label">${date}</span>
        <button class="log-nav-btn" id="log-next" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button>
      </div>

      <!-- Search bar -->
      <div class="search-bar-wrap" style="padding:0 16px 8px">
        <input class="search-input" id="log-search-input" type="search"
          placeholder="Search to add food..." autocomplete="off">
      </div>

      <!-- iPhone macro strip -->
      <div id="log-macro-strip" class="iphone-macro-strip"></div>

      <!-- Meal list -->
      <div id="log-meals" class="log-meals"></div>

      <!-- Mobile sync -->
      <div class="log-sync-wrap">
        <button id="log-sync-btn-mobile" class="btn btn--ghost log-sync-btn">Save Summary</button>
      </div>
    </div>`;

  bindShellEvents(date);
  bindTitleInput('log-title-input');
  bindMobileSearch('log-search-input');
}

// ── Shell: Mac ─────────────────────────────────────────────────
// On Mac: NO date nav row inside the page — navigation is via ‹ › arrows
// placed in the page header alongside the search pill.
function renderLogShellMac(date) {
  const view = document.getElementById('view-today');
  if (!view) return;
  const title   = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  const isToday = date === formatDate(new Date());

  view.innerHTML = `
    <div class="log-page">
      <!-- Mac header: title + date arrows + search pill -->
      <header class="page-header log-mac-header">
        <div class="page-title-wrap">
          <input class="page-title-input" id="log-title-input" type="text"
            value="${escapeAttr(title)}" maxlength="28" spellcheck="false" aria-label="Page title">
          <div class="page-title-edit-hint">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M7 1.5l1.5 1.5-5 5L2 8.5l.5-1.5z"/>
            </svg>
            click to edit
          </div>
        </div>

        <!-- Date arrows (inline in header, compact) -->
        <div class="log-mac-date-nav">
          <button class="log-nav-btn log-nav-btn--sm" id="log-prev" aria-label="Previous day">‹</button>
          <span class="log-mac-date-nav__label" id="log-date-label">${date}</span>
          <button class="log-nav-btn log-nav-btn--sm" id="log-next" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button>
        </div>

        <span class="page-header__spacer"></span>

        <!-- Search pill -->
        <div class="mac-search-pill-wrap" id="mac-search-wrap">
          <div class="mac-search-pill" id="mac-search-pill">
            <svg class="mac-search-pill__icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="5.5" cy="5.5" r="3.5"/>
              <line x1="8.5" y1="8.5" x2="12" y2="12"/>
            </svg>
            <input class="mac-search-pill__input" id="mac-search-input" type="text"
              placeholder="Add food..." autocomplete="off">
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

      <!-- Meal list -->
      <div id="log-meals" class="log-meals"></div>
    </div>`;

  bindShellEvents(date);
  bindTitleInput('log-title-input');
  bindMacSearch();
}

// ── Shell events ───────────────────────────────────────────────
function bindShellEvents(date) {
  document.getElementById('log-prev')?.addEventListener('click', () => navigateDate(-1));
  document.getElementById('log-next')?.addEventListener('click', () => navigateDate(1));
  document.getElementById('log-sync-btn-mobile')?.addEventListener('click', handleSync);
}

// ── Editable title ─────────────────────────────────────────────
function bindTitleInput(id) {
  const input = document.getElementById(id);
  if (!input) return;
  const resize = () => { input.style.width = Math.max(input.value.length * 13 + 8, 80) + 'px'; };
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
    } catch (err) { console.error('[log] day_title save failed:', err); }
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = store.state.settings?.day_title || ''; input.blur(); }
  });
}

// ── Mobile search ──────────────────────────────────────────────
function bindMobileSearch(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('focus', async () => {
    input.blur(); // prevent keyboard on mobile
    try {
      const { openSearchSheet } = await import('./search.js');
      openSearchSheet();
    } catch (err) { console.error('[log] openSearchSheet error:', err); }
  });
}

// ── Mac search pill ────────────────────────────────────────────
let _macSelectedFood = null;

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

  const showDD = () => { pill.classList.add('mac-search-pill--expanded'); dropdown.classList.add('mac-search-dropdown--visible'); };
  const hideDD = () => { pill.classList.remove('mac-search-pill--expanded'); dropdown.classList.remove('mac-search-dropdown--visible'); addBar.style.display='none'; _macSelectedFood=null; };

  input.addEventListener('focus', () => {
    showDD();
    const favs = store.state.foods?.filter(f => store.state.favourites?.has?.(f.no) || store.state.favourites?.includes?.(f.no)) || [];
    renderDD(favs.slice(0, 6));
  });
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { const favs = store.state.foods?.filter(f => store.state.favourites?.has?.(f.no) || store.state.favourites?.includes?.(f.no)) || []; renderDD(favs.slice(0,6)); return; }
    renderDD((store.state.foods||[]).filter(f=>f.name?.toLowerCase().includes(q)).slice(0,6));
  });
  document.addEventListener('click', e => { if (!document.getElementById('mac-search-wrap')?.contains(e.target)) hideDD(); });

  function renderDD(foods) {
    const favSet = store.state.favourites;
    const isFav  = no => favSet instanceof Set ? favSet.has(no) : Array.isArray(favSet) ? favSet.includes(no) : false;
    rows.innerHTML = foods.map(f => `
      <div class="mac-search-dropdown-row" data-no="${f.no}">
        <svg class="mac-search-drow__star" viewBox="0 0 12 12" fill="${isFav(f.no)?'var(--color-accent)':'none'}" stroke="var(--color-accent)" stroke-width="1">
          <path d="M6 .5l1.3 2.8 3 .4-2.2 2.1.5 3L6 7.5l-2.6 1.3.5-3L1.7 3.7l3-.4z"/>
        </svg>
        <span class="mac-search-drow__name">${escapeHtml(f.name)}</span>
        <span class="mac-search-drow__meta">${calcCals(f,100)} cal/100g</span>
      </div>`).join('');
    rows.querySelectorAll('.mac-search-dropdown-row').forEach(r => r.addEventListener('click', () => selectFood(Number(r.dataset.no))));
  }

  function selectFood(no) {
    const food = (store.state.foods||[]).find(f=>f.no===no);
    if (!food) return;
    _macSelectedFood = food;
    rows.querySelectorAll('.mac-search-dropdown-row').forEach(r => r.classList.toggle('mac-search-dropdown-row--selected', Number(r.dataset.no)===no));
    amountIn.value = store.state.lastAmounts?.[no] || 100;
    document.getElementById('mac-add-bar-name').textContent = (food.name||'').substring(0,22);
    updateCal();
    addBar.style.display = 'flex';
  }

  function updateCal() {
    if (!_macSelectedFood) return;
    calSpan.textContent = calcCals(_macSelectedFood, parseFloat(amountIn.value)||0) + ' cal';
  }
  amountIn.addEventListener('input', updateCal);

  addBtn.addEventListener('click', async () => {
    if (!_macSelectedFood) return;
    const food   = _macSelectedFood;
    const amount = parseFloat(amountIn.value);
    const meal   = document.getElementById('mac-add-meal')?.value || 'Breakfast';
    if (!amount||amount<=0) { showToast('Enter a valid amount','error'); return; }
    addBtn.disabled=true; addBtn.textContent='…';
    try {
      const date  = store.state.currentDate || today();
      const ratio = amount / (food.amount||100);
      await addLogEntry({ date, mealType:meal, foodNo:food.no, name:food.name, amount, unit:food.unit||'g',
        calories: Math.round(calcCals(food,food.amount||100)*ratio),
        protein:  round1((food.protein||0)*ratio), carbs:round1((food.carbs||0)*ratio),
        fat:      round1((food.fat||0)*ratio),     fibre:round1((food.fibre||0)*ratio),
        sodium:   round1((food.sodium||0)*ratio),  potassium:round1((food.potassium||0)*ratio) });
      if (!store.state.lastAmounts) store.state.lastAmounts={};
      store.state.lastAmounts[food.no] = amount;
      invalidateLogCache(date);
      store.state.dailyLog[date] = await getDailyLog(date);
      renderLog(date, store.state.dailyLog[date]);
      const m = await import('./main.js'); m.refreshSidebar?.();
      showToast(`${food.name} added ✓`,'success');
      hideDD(); input.value='';
    } catch(err) { console.error('[log] mac add:',err); showToast('Failed to add','error'); }
    finally { addBtn.disabled=false; addBtn.textContent='+ Add'; }
  });
}

function calcCals(food, amount) {
  const r = amount/(food.amount||100);
  return Math.round((food.fat||0)*r*9 + (food.carbs||0)*r*4 + (food.protein||0)*r*4);
}
const round1 = v => Math.round(v*10)/10;

// ── Date navigation ────────────────────────────────────────────
async function navigateDate(delta) {
  const current = store.state.currentDate || today();
  const d = parseDate(current);
  d.setDate(d.getDate() + delta);
  const newDate = formatDate(d);
  store.setCurrentDate(newDate);

  // Update all date labels in the page
  ['log-date-label','log-date-pill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = newDate;
  });
  const nextBtn = document.getElementById('log-next');
  if (nextBtn) nextBtn.disabled = newDate === formatDate(new Date());

  // Notify main.js to update nav date pill
  try { const m = await import('./main.js'); m.notifyDateChange?.(); } catch {}

  await loadAndRender(newDate);
}

// ── Load + render ──────────────────────────────────────────────
async function loadAndRender(date) {
  const el = document.getElementById('log-meals');
  if (el) el.innerHTML = '<p class="log-loading">Loading…</p>';
  try {
    if (!store.state.dailyLog[date]) store.state.dailyLog[date] = await getDailyLog(date);
    renderLog(date, store.state.dailyLog[date]);
  } catch (err) {
    console.error('[log] loadAndRender →', err);
    showToast('Failed to load log','error');
    showEmptyState();
  }
}

function renderLog(date, entries) {
  renderMacroStrip(entries);
  renderMealSections(entries);
}

// ── iPhone macro strip ─────────────────────────────────────────
function renderMacroStrip(entries) {
  const el = document.getElementById('log-macro-strip');
  if (!el) return;
  const t = sumNutrients(entries);
  const s = store.state.settings || {};
  const chips = [
    { emoji:'🔥', val:Math.round(t.calories),    target:Number(s.calorie_target)||0 },
    { emoji:'💪', val:t.protein.toFixed(1)+'g',  target:Number(s.protein_target)||0 },
    { emoji:'🌾', val:t.carbs.toFixed(1)+'g',    target:Number(s.carbs_target)||0 },
    { emoji:'🥑', val:t.fat.toFixed(1)+'g',      target:Number(s.fat_target)||0 },
  ];
  el.innerHTML = chips.map(c => {
    const num = parseFloat(c.val);
    const pct = c.target>0 ? Math.min(num/c.target*100,100) : 0;
    return `<div class="iphone-macro-chip">
      <span class="iphone-macro-chip__emoji">${c.emoji}</span>
      <span class="iphone-macro-chip__val">${c.val}</span>
      <div class="iphone-macro-chip__bar"><div class="iphone-macro-chip__fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ── Sidebar summary (Mac) ──────────────────────────────────────
export function renderSidebarSummary(entries) {
  const el = document.getElementById('sidebar-summary');
  if (!el) return;
  const date = store.state.currentDate || today();
  const data = entries || store.state.dailyLog?.[date] || [];
  const t = sumNutrients(data);
  const s = store.state.settings || {};

  const macros = [
    { emoji:'🔥', label:'Calories', unit:'kcal', value:t.calories,  target:Number(s.calorie_target)||0 },
    { emoji:'💪', label:'Protein',  unit:'g',    value:t.protein,   target:Number(s.protein_target)||0 },
    { emoji:'🌾', label:'Carbs',    unit:'g',    value:t.carbs,     target:Number(s.carbs_target)||0 },
    { emoji:'🥑', label:'Fat',      unit:'g',    value:t.fat,       target:Number(s.fat_target)||0 },
    { emoji:'🌿', label:'Fibre',    unit:'g',    value:t.fibre,     target:Number(s.fibre_target)||0 },
  ];
  const minerals = [
    { emoji:'💧', label:'Sodium',    unit:'mg', value:t.sodium,    target:Number(s.sodium_target)||2000 },
    { emoji:'⚡', label:'Potassium', unit:'mg', value:t.potassium, target:Number(s.potassium_target)||3500 },
  ];

  const bar = (value, target) => {
    const pct   = target>0 ? Math.min(value/target*100,100) : 0;
    const ratio = target>0 ? value/target : 0;
    const cls   = ratio>CONFIG.targets.dangerThreshold ? 'sidebar-bar__fill--danger' :
                  ratio>CONFIG.targets.warningThreshold ? 'sidebar-bar__fill--warning' : '';
    return `<div class="sidebar-bar"><div class="sidebar-bar__fill ${cls}" style="width:${pct}%"></div></div>`;
  };

  const mHTML = macros.map(m => {
    const disp  = m.label==='Calories' ? Math.round(m.value) : m.value.toFixed(1);
    const tDisp = m.label==='Calories' ? Math.round(m.target) : m.target;
    return `<div class="sidebar-macro">
      <div class="sidebar-macro__header">
        <span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span>
        <span class="sidebar-macro__value">${disp} / ${tDisp}${m.unit}</span>
      </div>${bar(m.value,m.target)}</div>`;
  }).join('');

  const minHTML = minerals.map(m => `<div class="sidebar-macro">
    <div class="sidebar-macro__header">
      <span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span>
      <span class="sidebar-macro__value">${Math.round(m.value)} / ${Math.round(m.target)}${m.unit}</span>
    </div>${bar(m.value,m.target)}</div>`).join('');

  const remHTML = macros.slice(0,4).map(m => {
    const r = Math.max(0, m.label==='Calories' ? Math.round(m.target-m.value) : round1(m.target-m.value));
    return `<div class="sidebar-remaining-card">
      <div class="sidebar-remaining-card__label">${m.emoji} ${m.label}</div>
      <div class="sidebar-remaining-card__value">${r}${m.unit}</div>
    </div>`;
  }).join('');

  el.innerHTML = `${mHTML}
    <hr class="sidebar-divider">
    <div class="sidebar-minerals-title">Minerals</div>
    ${minHTML}
    <hr class="sidebar-divider">
    <div class="sidebar-remaining-title">Remaining today</div>
    <div class="sidebar-remaining-grid">${remHTML}`;
}

export function handleSyncFromSidebar() { handleSync(); }

// ── Meal sections ──────────────────────────────────────────────
function renderMealSections(entries) {
  const container = document.getElementById('log-meals');
  if (!container) return;
  if (!entries||entries.length===0) { showEmptyState(); return; }
  const groups={};
  CONFIG.labels.mealTypes.forEach(t=>{groups[t]=[];});
  entries.forEach(e=>{
    const key = CONFIG.labels.mealTypes.includes(e.mealType)?e.mealType:'Other';
    groups[key].push(e);
  });
  const html = CONFIG.labels.mealTypes.filter(t=>groups[t].length>0).map(t=>renderMealSection(t,groups[t])).join('');
  container.innerHTML = html||'<p class="log-empty">No entries for this day.</p>';
  bindEntryEvents(container);
}

function renderMealSection(mealType, entries) {
  const meta = MEAL_META[mealType]||MEAL_META['Other'];
  const sectionCals = entries.reduce((s,e)=>s+(Number(e.calories)||0),0);
  const tot = entries.reduce((a,e)=>({
    protein: a.protein+(Number(e.protein)||0), carbs: a.carbs+(Number(e.carbs)||0),
    fat:     a.fat+(Number(e.fat)||0),         fibre: a.fibre+(Number(e.fibre)||0),
  }),{protein:0,carbs:0,fat:0,fibre:0});
  return `
    <div class="meal-section meal-section--${meta.mod}">
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
      <div class="meal-section__entries">${entries.map(renderEntryRow).join('')}</div>
    </div>`;
}

function renderEntryRow(entry) {
  const cals = Math.round(Number(entry.calories)||0);
  const na   = Math.round(Number(entry.sodium)||0);
  const k    = Math.round(Number(entry.potassium)||0);
  return `
    <div class="entry-row" data-row-index="${entry.rowIndex}">
      <div class="entry-row__swipe-container">
        <div class="entry-row__content">
          <div class="entry-row__info">
            <span class="entry-row__name">${escapeHtml(entry.name)}</span>
            <button class="entry-row__amount-btn" data-row-index="${entry.rowIndex}" data-amount="${entry.amount}" data-unit="${entry.unit}">
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

function bindEntryEvents(container) {
  container.querySelectorAll('.entry-row__amount-btn').forEach(btn=>btn.addEventListener('click',()=>handleAmountEdit(btn)));
  container.querySelectorAll('.entry-row').forEach(row=>bindSwipeDelete(row));
  container.querySelectorAll('.entry-row__delete-btn').forEach(btn=>btn.addEventListener('click',()=>handleDelete(Number(btn.dataset.rowIndex))));
}

function handleAmountEdit(btn) {
  if (btn.querySelector('input')) return;
  const rowIndex=Number(btn.dataset.rowIndex), oldAmt=Number(btn.dataset.amount), unit=btn.dataset.unit;
  btn.innerHTML=`<input class="entry-amount-input" type="number" value="${oldAmt}" min="1" step="1" inputmode="decimal" style="width:60px;text-align:right;"/>`;
  const input=btn.querySelector('input'); input.focus(); input.select();
  const confirm=async()=>{
    const newAmt=parseFloat(input.value);
    if (!newAmt||newAmt<=0||newAmt===oldAmt){btn.textContent=`${oldAmt}${unit}`;return;}
    btn.textContent=`${newAmt}${unit}`; btn.dataset.amount=newAmt; await handleUpdate(rowIndex,newAmt);
  };
  input.addEventListener('blur',confirm);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'){btn.textContent=`${oldAmt}${unit}`;}});
}

async function handleUpdate(rowIndex, newAmount) {
  try {
    await updateLogEntry(rowIndex, newAmount);
    const date=store.state.currentDate||today();
    invalidateLogCache(date);
    store.state.dailyLog[date]=await getDailyLog(date);
    renderMacroStrip(store.state.dailyLog[date]);
    renderSidebarSummary(store.state.dailyLog[date]);
    console.log(`[log] handleUpdate → row=${rowIndex} amount=${newAmount}`);
  } catch(err){console.error('[log] handleUpdate →',err);showToast('Failed to update amount','error');}
}

function bindSwipeDelete(row) {
  let startX=0,isDragging=false;
  const container=row.querySelector('.entry-row__swipe-container');
  if(!container)return;
  row.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;isDragging=true;},{passive:true});
  row.addEventListener('touchmove',e=>{if(!isDragging)return;const dx=e.touches[0].clientX-startX;if(dx<0)container.style.transform=`translateX(${Math.max(dx,-80)}px)`;},{passive:true});
  row.addEventListener('touchend',e=>{if(!isDragging)return;isDragging=false;const dx=e.changedTouches[0].clientX-startX;if(dx<-50){container.style.transform='translateX(-80px)';row.classList.add('entry-row--swiped');}else{container.style.transform='';row.classList.remove('entry-row--swiped');}});
}

async function handleDelete(rowIndex) {
  try {
    await deleteLogEntry(rowIndex);
    const rowEl=document.querySelector(`.entry-row[data-row-index="${rowIndex}"]`);
    if(rowEl){
      const section=rowEl.closest('.meal-section');
      rowEl.style.transition='opacity 0.2s, max-height 0.25s';
      rowEl.style.opacity='0';
      rowEl.style.maxHeight=rowEl.offsetHeight+'px';
      setTimeout(()=>{rowEl.style.maxHeight='0';rowEl.style.overflow='hidden';},10);
      setTimeout(()=>{rowEl.remove();if(section&&!section.querySelector('.entry-row')){section.style.transition='opacity 0.2s';section.style.opacity='0';setTimeout(()=>section.remove(),200);}},260);
    }
    const date=store.state.currentDate||today();
    if(store.state.dailyLog[date]){
      store.state.dailyLog[date]=store.state.dailyLog[date].filter(e=>e.rowIndex!==rowIndex);
      renderMacroStrip(store.state.dailyLog[date]);
      renderSidebarSummary(store.state.dailyLog[date]);
    }
    invalidateLogCache(date);
    showToast('Entry deleted','success');
    console.log(`[log] handleDelete → row=${rowIndex}`);
  } catch(err){console.error('[log] handleDelete →',err);showToast('Failed to delete entry','error');}
}

async function handleSync() {
  const date=store.state.currentDate||today();
  const btns=['log-sync-btn-mobile','sidebar-save-btn'].map(id=>document.getElementById(id)).filter(Boolean);
  btns.forEach(b=>{b.disabled=true;b.textContent='Saving…';});
  try {
    await syncDailySummary(date);
    showToast('Saved to DailySummary ✓','success');
    console.log(`[log] handleSync → date=${date}`);
  } catch(err){console.error('[log] handleSync →',err);showToast('Save failed','error');}
  finally {btns.forEach(b=>{b.disabled=false;b.textContent='Save Summary';});}
}

function showEmptyState() {
  const el=document.getElementById('log-meals');
  if(el) el.innerHTML=`
    <div class="log-empty-state">
      <span class="log-empty-state__icon">🥗</span>
      <p class="log-empty-state__text">No entries yet</p>
      <p class="log-empty-state__sub">Search above to add foods</p>
    </div>`;
}

function sumNutrients(entries) {
  return (entries||[]).reduce((acc,e)=>({
    calories:  acc.calories +(Number(e.calories)||0),
    protein:   acc.protein  +(Number(e.protein)||0),
    carbs:     acc.carbs    +(Number(e.carbs)||0),
    fat:       acc.fat      +(Number(e.fat)||0),
    fibre:     acc.fibre    +(Number(e.fibre)||0),
    sodium:    acc.sodium   +(Number(e.sodium)||0),
    potassium: acc.potassium+(Number(e.potassium)||0),
  }),{calories:0,protein:0,carbs:0,fat:0,fibre:0,sodium:0,potassium:0});
}

function escapeHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escapeAttr(str) { return String(str||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
