// ============================================================
// search.js — Food Search + Favourites
// Fixed: export ensureFavouritesLoaded for preloading
// ============================================================
import { CONFIG } from '../config.js';
import { getFavourites, toggleFavourite, addLogEntry } from './api.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { calcCalories, today } from './utils.js';
import { invalidateLogCache, renderSidebarSummary } from './log.js';

let selectedMealType = CONFIG.labels.mealTypes[0];

// ── Data loading ──────────────────────────────────────────────
export async function ensureFoodsLoaded() {
  if (store.state.foods && store.state.foods.length > 0) return;
  console.log('[search] ensureFoodsLoaded → fetching');
  try {
    const { searchFoods } = await import('./api.js');
    store.state.foods = await searchFoods('');
    console.log(`[search] loaded ${store.state.foods.length} foods`);
  } catch (err) {
    console.error('[search] ensureFoodsLoaded →', err);
    showToast('Failed to load food database', 'error');
  }
}

export async function ensureFavouritesLoaded() {
  if (store.state.favourites) return;
  try {
    const ids = await getFavourites();
    store.state.favourites = new Set(ids);
  } catch (err) {
    console.error('[search] ensureFavouritesLoaded →', err);
    store.state.favourites = new Set();
  }
}

// ── iPhone: mobile bottom-sheet search ───────────────────────
export async function openSearchSheet() {
  await ensureFoodsLoaded();
  await ensureFavouritesLoaded();

  document.getElementById('mobile-search-sheet')?.remove();
  const sheet = document.createElement('div');
  sheet.id = 'mobile-search-sheet';
  sheet.className = 'bottom-sheet';
  sheet.innerHTML = `
    <div class="bottom-sheet__backdrop"></div>
    <div class="bottom-sheet__panel" style="padding:12px 14px 40px;max-height:85vh">
      <input id="mobile-sheet-input" class="search-input" type="search"
        placeholder="Search foods…" autocomplete="off" autocorrect="off" spellcheck="false"
        style="margin-bottom:8px;font-size:16px">
      <div id="mobile-sheet-results" class="search-results"
        style="max-height:60vh;overflow-y:auto;padding:0"></div>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('bottom-sheet--visible'));

  sheet.querySelector('.bottom-sheet__backdrop').addEventListener('click', closeMobileSheet);

  const input = document.getElementById('mobile-sheet-input');
  // Small delay so backdrop animation finishes before keyboard opens
  setTimeout(() => input?.focus(), 80);
  input?.addEventListener('input', () => runSheetSearch(input.value));

  // Show starred foods immediately (already in memory)
  runSheetSearch('');
}

function closeMobileSheet() {
  const sheet = document.getElementById('mobile-search-sheet');
  if (!sheet) return;
  sheet.classList.remove('bottom-sheet--visible');
  setTimeout(() => sheet.remove(), 250);
}

async function runSheetSearch(rawQuery) {
  const q     = rawQuery.trim().toLowerCase();
  const foods = store.state.foods || [];
  const favSet= store.state.favourites || new Set();

  let filtered = !q
    ? foods.filter(f => favSet.has(f.no))
    : foods.filter(f => f.name.toLowerCase().includes(q));

  filtered.sort((a, b) => {
    const af = favSet.has(a.no) ? 0 : 1;
    const bf = favSet.has(b.no) ? 0 : 1;
    return af !== bf ? af - bf : a.name.localeCompare(b.name);
  });

  const container = document.getElementById('mobile-sheet-results');
  if (!container) return;

  const results = filtered.slice(0, CONFIG.search.maxResults);
  if (!results.length) {
    container.innerHTML = `<p class="search-empty">${q ? `No results for "${escapeHtml(q)}"` : 'Search for a food'}</p>`;
    return;
  }

  container.innerHTML = results.map(f => renderFoodRow(f, q)).join('');
  container.querySelectorAll('.search-result-row').forEach(row => {
    const no = Number(row.dataset.foodNo);
    row.querySelector('.result-info')?.addEventListener('click', () => {
      closeMobileSheet();
      openAddSheet(no);
    });
    row.querySelector('.fav-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      handleToggleFavourite(no, row);
    });
  });
}

// ── Favourites page ───────────────────────────────────────────
export async function initFavourites(_macMode = false) {
  console.log('[search] initFavourites → start');
  await ensureFoodsLoaded();
  await ensureFavouritesLoaded();
  renderFavouritesPage();
  console.log('[search] initFavourites → ready');
}

function renderFavouritesPage() {
  const view = document.getElementById('view-favourites');
  if (!view) return;
  const favSet   = store.state.favourites || new Set();
  const favFoods = (store.state.foods || []).filter(f => favSet.has(f.no));

  const groups = {};
  favFoods.forEach(f => {
    const cat = f.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(f);
  });

  const groupsHTML = Object.entries(groups).map(([cat, foods]) => `
    <div class="favs-section-label">${escapeHtml(cat)}</div>
    <div class="favs-group">
      ${foods.map(f => renderFavRow(f)).join('')}
    </div>`).join('');

  view.innerHTML = `
    <div class="favs-page">
      <div class="favs-page-header">
        <h2 style="font-family:var(--font-serif);font-size:var(--text-xl);font-weight:400;font-style:italic;color:var(--color-text-primary)">Favourites</h2>
        <span class="favs-hint">Click a food to add</span>
      </div>
      ${favFoods.length === 0
        ? '<p class="search-empty" style="margin-top:40px">Star foods in Search to add them here</p>'
        : groupsHTML}
    </div>`;

  bindFavouritesEvents(view);
}

function renderFavRow(food) {
  const cals = calcCalories(food.protein, food.carbs, food.fat);
  return `
    <div class="favs-row" data-food-no="${food.no}">
      <div class="favs-row__top">
        <svg class="favs-row__star" viewBox="0 0 12 12" fill="var(--color-accent)" stroke="var(--color-accent)" stroke-width="0.5">
          <path d="M6 .5l1.3 2.8 3 .4-2.2 2.1.5 3L6 7.5l-2.6 1.3.5-3L1.7 3.7l3-.4z"/>
        </svg>
        <span class="favs-row__name">${escapeHtml(food.name)}</span>
        <span class="favs-row__meta">${food.amount}${food.unit}</span>
        <span class="favs-row__cal">${cals} cal</span>
      </div>
      <div class="favs-row__expand" data-food-no="${food.no}">
        ${buildExpandPanel(food, cals)}
      </div>
    </div>`;
}

function buildExpandPanel(food, cals) {
  const options = CONFIG.labels.mealTypes.map(t => `<option>${t}</option>`).join('');
  return `
    <div class="favs-expand-inner" data-food-no="${food.no}">
      <div class="favs-expand__macros">
        <span class="favs-expand__macro"><strong>${cals}</strong> cal</span>
        <span class="favs-expand__macro">P <strong>${food.protein.toFixed(1)}g</strong></span>
        <span class="favs-expand__macro">C <strong>${food.carbs.toFixed(1)}g</strong></span>
        <span class="favs-expand__macro">F <strong>${food.fat.toFixed(1)}g</strong></span>
        <span class="favs-expand__macro">Fi <strong>${(food.fibre||0).toFixed(1)}g</strong></span>
      </div>
      <div class="favs-expand__divider"></div>
      <input class="favs-expand__input" type="number"
        value="${store.state.lastAmounts?.[food.no] || food.amount}"
        min="1" step="1" data-base="${food.amount}" aria-label="Amount">
      <span class="favs-expand__unit">${food.unit}</span>
      <select class="favs-expand__select">${options}</select>
      <span class="favs-expand__cal" data-cal-preview></span>
      <button class="favs-expand__btn" data-add-btn>+ Add</button>
    </div>`;
}

function bindFavouritesEvents(view) {
  let openNo = null;
  view.querySelectorAll('.favs-row').forEach(row => {
    const no = Number(row.dataset.foodNo);
    row.querySelector('.favs-row__top').addEventListener('click', () => {
      if (openNo && openNo !== no) {
        view.querySelector(`.favs-row[data-food-no="${openNo}"]`)?.classList.remove('favs-row--selected');
        openNo = null;
      }
      if (row.classList.contains('favs-row--selected')) {
        row.classList.remove('favs-row--selected');
        openNo = null;
      } else {
        row.classList.add('favs-row--selected');
        openNo = no;
        updateExpandCalPreview(row, no);
      }
    });
    row.querySelector('.favs-expand__input')?.addEventListener('input', () => updateExpandCalPreview(row, no));
    row.querySelector('[data-add-btn]')?.addEventListener('click', () => handleFavAdd(row, no));
  });
}

function updateExpandCalPreview(row, no) {
  const food = (store.state.foods || []).find(f => f.no === no);
  if (!food) return;
  const amtInput = row.querySelector('.favs-expand__input');
  const calSpan  = row.querySelector('[data-cal-preview]');
  if (!amtInput || !calSpan) return;
  const amount = parseFloat(amtInput.value) || food.amount;
  const ratio  = amount / food.amount;
  calSpan.textContent = `= ${Math.round(calcCalories(food.protein, food.carbs, food.fat) * ratio)} cal`;
}

async function handleFavAdd(row, no) {
  const food   = (store.state.foods || []).find(f => f.no === no);
  if (!food) return;
  const amtInput = row.querySelector('.favs-expand__input');
  const mealSel  = row.querySelector('.favs-expand__select');
  const addBtn   = row.querySelector('[data-add-btn]');
  const amount   = parseFloat(amtInput?.value) || food.amount;
  const mealType = mealSel?.value || 'Breakfast';
  if (!amount || amount <= 0) { showToast('Enter a valid amount','error'); return; }
  if (addBtn) { addBtn.disabled=true; addBtn.textContent='…'; }
  try {
    const date  = store.state.currentDate || today();
    const ratio = amount / food.amount;
    await addLogEntry({ date, mealType, foodNo:food.no, name:food.name, amount, unit:food.unit,
      calories:  Math.round(calcCalories(food.protein, food.carbs, food.fat) * ratio),
      protein:   Math.round(food.protein   * ratio * 10) / 10,
      carbs:     Math.round(food.carbs     * ratio * 10) / 10,
      fat:       Math.round(food.fat       * ratio * 10) / 10,
      fibre:     Math.round((food.fibre||0)* ratio * 10) / 10,
      sodium:    Math.round((food.sodium||0)   * ratio),
      potassium: Math.round((food.potassium||0)* ratio),
    });
    if (!store.state.lastAmounts) store.state.lastAmounts = {};
    store.state.lastAmounts[no] = amount;
    invalidateLogCache(date);
    const { getDailyLog } = await import('./api.js');
    store.state.dailyLog[date] = await getDailyLog(date);
    renderSidebarSummary(store.state.dailyLog[date]);
    row.classList.remove('favs-row--selected');
    showToast(`${food.name} added ✓`, 'success');
  } catch (err) {
    console.error('[search] handleFavAdd →', err);
    showToast('Failed to add', 'error');
  } finally {
    if (addBtn) { addBtn.disabled=false; addBtn.textContent='+ Add'; }
  }
}

// ── Shared row renderer ───────────────────────────────────────
function renderFoodRow(food, q) {
  const favSet = store.state.favourites || new Set();
  const isFav  = favSet.has(food.no);
  const cals   = calcCalories(food.protein, food.carbs, food.fat);
  const hl     = q ? highlightMatch(food.name, q) : escapeHtml(food.name);
  return `
    <div class="search-result-row" data-food-no="${food.no}" role="listitem">
      <button class="fav-btn ${isFav?'fav-btn--active':''}"
        aria-label="${isFav?'Remove from favourites':'Add to favourites'}">★</button>
      <div class="result-info">
        <span class="result-name">${hl}</span>
        <span class="result-meta">${food.amount}${food.unit} · ${cals} kcal</span>
      </div>
      <span class="result-macros">P ${food.protein.toFixed(1)}g &nbsp; C ${food.carbs.toFixed(1)}g &nbsp; F ${food.fat.toFixed(1)}g</span>
    </div>`;
}

function highlightMatch(name, q) {
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0, idx))
    + `<mark class="search-highlight">${escapeHtml(name.slice(idx, idx + q.length))}</mark>`
    + escapeHtml(name.slice(idx + q.length));
}

// ── Add sheet (iPhone bottom sheet) ──────────────────────────
function openAddSheet(foodNo) {
  const food = (store.state.foods || []).find(f => f.no === foodNo);
  if (!food) return;
  document.getElementById('add-food-sheet')?.remove();
  const sheet = document.createElement('div');
  sheet.id = 'add-food-sheet';
  sheet.className = 'bottom-sheet';
  sheet.innerHTML = buildAddSheetHTML(food);
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('bottom-sheet--visible'));
  sheet.querySelector('#add-sheet-cancel')?.addEventListener('click', closeAddSheet);
  sheet.querySelector('#add-sheet-confirm')?.addEventListener('click', () => confirmAddFood(food, sheet));
  sheet.querySelector('.bottom-sheet__backdrop')?.addEventListener('click', closeAddSheet);
}

function buildAddSheetHTML(food) {
  const cals    = calcCalories(food.protein, food.carbs, food.fat);
  const lastAmt = store.state.lastAmounts?.[food.no] || food.amount;
  const options = CONFIG.labels.mealTypes
    .map(t => `<option value="${t}" ${t===selectedMealType?'selected':''}>${t}</option>`).join('');
  return `
    <div class="bottom-sheet__backdrop"></div>
    <div class="bottom-sheet__panel">
      <div class="bottom-sheet__header">
        <span class="bottom-sheet__title">${escapeHtml(food.name)}</span>
        <span class="bottom-sheet__sub">${cals} kcal per ${food.amount}${food.unit}</span>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        ${[['Cal',cals,''],['P',food.protein.toFixed(1),'g'],['C',food.carbs.toFixed(1),'g'],
           ['F',food.fat.toFixed(1),'g'],['Fi',(food.fibre||0).toFixed(1),'g']]
          .map(([l,v,u])=>`
          <div style="background:var(--color-accent-light);border-radius:7px;padding:5px 9px;text-align:center;min-width:44px">
            <div style="font-size:10px;color:var(--color-text-secondary)">${l}</div>
            <div style="font-size:13px;font-weight:500;color:var(--color-accent-dark)">${v}${u}</div>
          </div>`).join('')}
      </div>
      <div class="bottom-sheet__body">
        <label class="sheet-label" for="add-sheet-amount">Amount (${food.unit})</label>
        <input id="add-sheet-amount" class="sheet-input" type="number" min="1" step="1"
          value="${lastAmt}" inputmode="decimal" style="font-size:16px">
        <label class="sheet-label" for="add-sheet-meal">Meal</label>
        <select id="add-sheet-meal" class="sheet-select" style="font-size:16px">${options}</select>
      </div>
      <div class="bottom-sheet__footer">
        <button id="add-sheet-cancel" class="btn btn--ghost">Cancel</button>
        <button id="add-sheet-confirm" class="btn btn--primary">Add to Log</button>
      </div>
    </div>`;
}

function closeAddSheet() {
  const sheet = document.getElementById('add-food-sheet');
  if (!sheet) return;
  sheet.classList.remove('bottom-sheet--visible');
  setTimeout(() => sheet.remove(), 250);
}

async function confirmAddFood(food, sheet) {
  const amountInput = sheet.querySelector('#add-sheet-amount');
  const mealSelect  = sheet.querySelector('#add-sheet-meal');
  const amount      = parseFloat(amountInput?.value) || food.amount;
  const mealType    = mealSelect?.value || selectedMealType;
  selectedMealType  = mealType;
  const confirmBtn  = sheet.querySelector('#add-sheet-confirm');
  if (confirmBtn) { confirmBtn.disabled=true; confirmBtn.textContent='Adding…'; }
  const ratio = amount / food.amount;
  const date  = store.state.currentDate || today();
  const entry = { date, mealType, foodNo:food.no, name:food.name, amount, unit:food.unit,
    calories:  Math.round(calcCalories(food.protein, food.carbs, food.fat) * ratio),
    protein:   Math.round(food.protein   * ratio * 10) / 10,
    carbs:     Math.round(food.carbs     * ratio * 10) / 10,
    fat:       Math.round(food.fat       * ratio * 10) / 10,
    fibre:     Math.round((food.fibre||0)* ratio * 10) / 10,
    sodium:    Math.round((food.sodium||0)   * ratio),
    potassium: Math.round((food.potassium||0)* ratio),
  };
  try {
    await addLogEntry(entry);
    if (!store.state.lastAmounts) store.state.lastAmounts = {};
    store.state.lastAmounts[food.no] = amount;
    invalidateLogCache(date);
    showToast(`Added ${food.name} ✓`, 'success');
    closeAddSheet();
  } catch (err) {
    console.error('[search] confirmAddFood →', err);
    showToast('Failed to add food', 'error');
    if (confirmBtn) { confirmBtn.disabled=false; confirmBtn.textContent='Add to Log'; }
  }
}

// ── Favourite toggle ──────────────────────────────────────────
async function handleToggleFavourite(foodNo, rowEl) {
  const favSet = store.state.favourites;
  const wasFav = favSet.has(foodNo);
  wasFav ? favSet.delete(foodNo) : favSet.add(foodNo);
  updateFavBtn(rowEl, !wasFav);
  try {
    const result = await toggleFavourite(foodNo);
    showToast(result.added ? 'Added to favourites ★' : 'Removed from favourites', 'success');
  } catch (err) {
    wasFav ? favSet.add(foodNo) : favSet.delete(foodNo);
    updateFavBtn(rowEl, wasFav);
    console.error('[search] handleToggleFavourite →', err);
    showToast('Failed to update favourite', 'error');
  }
}

function updateFavBtn(rowEl, isFav) {
  const btn = rowEl.querySelector('.fav-btn');
  if (!btn) return;
  btn.classList.toggle('fav-btn--active', isFav);
  btn.setAttribute('aria-label', isFav ? 'Remove from favourites' : 'Add to favourites');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
