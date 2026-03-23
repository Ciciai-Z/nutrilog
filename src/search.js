// ============================================================
// NutriLog — search.js
// B2: food search + favourites
// B5: confirmAddFood writes to DailyLog
// ============================================================

import { CONFIG }                                      from '../config.js';
import { searchFoods, getFavourites, toggleFavourite,
         addLogEntry }                                 from './api.js';
import { store }                                       from './store.js';
import { showToast }                                   from './ui.js';
import { calcCalories, today }                         from './utils.js';
import { invalidateLogCache }                          from './log.js';

// ── Module state ──────────────────────────────────────────────

let debounceTimer    = null;
let selectedMealType = CONFIG.labels.mealTypes[0];

// ── Init ──────────────────────────────────────────────────────

export async function initSearch() {
  console.log('[search] initSearch → start');
  renderSearchPage();
  await ensureFoodsLoaded();
  bindSearchEvents();
  console.log('[search] initSearch → ready');
}

function renderSearchPage() {
  const view = document.getElementById('view-search');
  if (!view) return;
  view.innerHTML = `
    <div class="search-container">
      <div class="search-bar-wrap">
        <input id="food-search-input" class="search-input" type="search"
               placeholder="Search foods…" autocomplete="off" autocorrect="off" spellcheck="false"/>
      </div>
      <div id="search-results" class="search-results" role="list"></div>
    </div>`;
}

// ── Data loading ──────────────────────────────────────────────

async function ensureFoodsLoaded() {
  if (store.state.foods && store.state.foods.length > 0) {
    console.log('[search] ensureFoodsLoaded → cache hit');
    return;
  }
  console.log('[search] ensureFoodsLoaded → fetching');
  try {
    store.state.foods = await searchFoods('');
    console.log(`[search] ensureFoodsLoaded → ${store.state.foods.length} foods`);
  } catch (err) {
    console.error('[search] ensureFoodsLoaded →', err);
    showToast('Failed to load food database', 'error');
  }
}

async function ensureFavouritesLoaded() {
  if (store.state.favourites) return;
  try {
    const ids = await getFavourites();
    store.state.favourites = new Set(ids);
  } catch (err) {
    console.error('[search] ensureFavouritesLoaded →', err);
    store.state.favourites = new Set();
  }
}

// ── Events ────────────────────────────────────────────────────

function bindSearchEvents() {
  const input = document.getElementById('food-search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value), CONFIG.search.debounceMs);
  });
  input.addEventListener('focus', () => { if (!input.value.trim()) runSearch(''); });
}

// ── Search ────────────────────────────────────────────────────

async function runSearch(rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  await ensureFavouritesLoaded();
  const foods = store.state.foods || [];
  if (!foods.length) { renderResults([], q); return; }

  let filtered;
  if (q.length === 0) {
    const favSet = store.state.favourites || new Set();
    filtered = foods.filter(f => favSet.has(f.no));
  } else if (q.length < CONFIG.search.minChars) {
    filtered = [];
  } else {
    filtered = foods.filter(f => f.name.toLowerCase().includes(q));
  }

  const favSet = store.state.favourites || new Set();
  filtered.sort((a, b) => {
    const af = favSet.has(a.no) ? 0 : 1;
    const bf = favSet.has(b.no) ? 0 : 1;
    return af !== bf ? af - bf : a.name.localeCompare(b.name);
  });

  renderResults(filtered.slice(0, CONFIG.search.maxResults), q);
}

// ── Render ────────────────────────────────────────────────────

function renderResults(foods, q) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (!foods.length) {
    container.innerHTML = q
      ? `<p class="search-empty">No results for "<strong>${escapeHtml(q)}</strong>"</p>`
      : `<p class="search-empty">Search for a food to get started</p>`;
    return;
  }

  container.innerHTML = foods.map(f => renderFoodRow(f, q)).join('');

  container.querySelectorAll('.search-result-row').forEach(row => {
    const no = Number(row.dataset.foodNo);
    row.querySelector('.result-info')?.addEventListener('click', () => openAddSheet(no));
    row.querySelector('.fav-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      handleToggleFavourite(no, row);
    });
  });
}

function renderFoodRow(food, q) {
  const favSet    = store.state.favourites || new Set();
  const isFav     = favSet.has(food.no);
  const cals      = calcCalories(food.protein, food.carbs, food.fat);
  const highlight = q ? highlightMatch(food.name, q) : escapeHtml(food.name);
  return `
    <div class="search-result-row" data-food-no="${food.no}" role="listitem">
      <button class="fav-btn ${isFav ? 'fav-btn--active' : ''}"
              aria-label="${isFav ? 'Remove from favourites' : 'Add to favourites'}">★</button>
      <div class="result-info">
        <span class="result-name">${highlight}</span>
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

// ── Add sheet ─────────────────────────────────────────────────

function openAddSheet(foodNo) {
  const food = (store.state.foods || []).find(f => f.no === foodNo);
  if (!food) return;
  document.getElementById('add-food-sheet')?.remove();

  const sheet = document.createElement('div');
  sheet.id    = 'add-food-sheet';
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
  const options = CONFIG.labels.mealTypes
    .map(t => `<option value="${t}" ${t === selectedMealType ? 'selected' : ''}>${t}</option>`)
    .join('');
  return `
    <div class="bottom-sheet__backdrop"></div>
    <div class="bottom-sheet__panel">
      <div class="bottom-sheet__header">
        <span class="bottom-sheet__title">${escapeHtml(food.name)}</span>
        <span class="bottom-sheet__sub">${cals} kcal per ${food.amount}${food.unit}</span>
      </div>
      <div class="bottom-sheet__body">
        <label class="sheet-label" for="add-sheet-amount">Amount (${food.unit})</label>
        <input id="add-sheet-amount" class="sheet-input" type="number"
               min="1" step="1" value="${food.amount}" inputmode="decimal"/>
        <label class="sheet-label" for="add-sheet-meal">Meal</label>
        <select id="add-sheet-meal" class="sheet-select">${options}</select>
      </div>
      <div class="bottom-sheet__footer">
        <button id="add-sheet-cancel"  class="btn btn--ghost">Cancel</button>
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

// ── B5: confirmAddFood writes to DailyLog ─────────────────────

async function confirmAddFood(food, sheet) {
  const amountInput = sheet.querySelector('#add-sheet-amount');
  const mealSelect  = sheet.querySelector('#add-sheet-meal');
  const amount      = parseFloat(amountInput?.value) || food.amount;
  const mealType    = mealSelect?.value || selectedMealType;
  selectedMealType  = mealType;

  const confirmBtn = sheet.querySelector('#add-sheet-confirm');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Adding…'; }

  const ratio = amount / food.amount;
  const date  = store.state.currentDate || today();

  const entry = {
    date,
    mealType,
    foodNo:    food.no,
    name:      food.name,
    amount,
    unit:      food.unit,
    calories:  Math.round(calcCalories(food.protein, food.carbs, food.fat) * ratio),
    protein:   Math.round(food.protein   * ratio * 10) / 10,
    carbs:     Math.round(food.carbs     * ratio * 10) / 10,
    fat:       Math.round(food.fat       * ratio * 10) / 10,
    fibre:     Math.round(food.fibre     * ratio * 10) / 10,
    sodium:    Math.round(food.sodium    * ratio),
    potassium: Math.round(food.potassium * ratio),
  };

  try {
    await addLogEntry(entry);
    invalidateLogCache(date);
    showToast(`Added ${food.name} ✓`, 'success');
    console.log(`[search] confirmAddFood → food=${food.no} amount=${amount} meal=${mealType}`);
    closeAddSheet();
  } catch (err) {
    console.error('[search] confirmAddFood →', err);
    showToast('Failed to add food', 'error');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Add to Log'; }
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
    console.log(`[search] toggleFavourite → food=${foodNo} added=${result.added}`);
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

// ── Helpers ───────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
