// ============================================================
// meals.js — B8 Composed Meal Templates
// ============================================================
import { CONFIG } from '../config.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { today } from './utils.js';

const MEAL_EMOJI = { Breakfast:'☀️', Lunch:'🌿', Dinner:'🌙', Snacks:'🍓', Other:'📦' };

export async function initMeals(macMode = false) {
  console.log('[meals] init → start');
  const view = document.getElementById('view-meals');
  if (!view) return;
  view.innerHTML = `
    <div class="meals-page">
      <div class="meals-header">
        <h2 class="meals-title">Saved Meals</h2>
        <button class="btn btn--primary meals-new-btn" id="meals-new-btn">+ New Meal</button>
      </div>
      <div id="meals-list" class="meals-list">
        <div class="log-loading">Loading…</div>
      </div>
    </div>`;
  document.getElementById('meals-new-btn')?.addEventListener('click', openCreateMealModal);
  await loadMeals();
  console.log('[meals] init → ready');
}

// ── Load & render ─────────────────────────────────────────────
async function loadMeals(force = false) {
  try {
    // Use cache if available; force=true skips cache
    if (store.state.meals && !force) { renderMealsList(store.state.meals); return; }
    const { getMeals } = await import('./api.js');
    const rows = await getMeals();
    store.state.meals = rows;
    renderMealsList(rows);
  } catch (err) {
    console.error('[meals] load:', err);
    showToast('Failed to load meals', 'error');
    const el = document.getElementById('meals-list');
    if (el) el.innerHTML = '<p class="search-empty">Could not load meals.</p>';
  }
}

function renderMealsList(rows) {
  const el = document.getElementById('meals-list');
  if (!el) return;
  if (!rows || rows.length === 0) {
    el.innerHTML = `
      <div class="log-empty-state">
        <span class="log-empty-state__icon">🍽</span>
        <p class="log-empty-state__text">No saved meals yet</p>
        <p class="log-empty-state__sub">Create a meal template to log it quickly</p>
      </div>`;
    return;
  }
  // Group by mealNo
  const groups = {};
  for (const r of rows) {
    if (!groups[r.mealNo]) groups[r.mealNo] = { mealNo: r.mealNo, name: r.name, foods: [] };
    groups[r.mealNo].foods.push(r);
  }
  el.innerHTML = Object.values(groups).map(g => renderMealCard(g)).join('');
  el.querySelectorAll('.meals-card__add-btn').forEach(btn =>
    btn.addEventListener('click', () => openAddToLogModal(btn.dataset.mealNo)));
  el.querySelectorAll('.meals-card__del-btn').forEach(btn =>
    btn.addEventListener('click', () => handleDeleteMeal(btn.dataset.mealNo, btn)));
}

function renderMealCard(group) {
  const totCal = group.foods.reduce((s, f) => s + (Number(f.calories) || 0), 0);
  const totPro = group.foods.reduce((s, f) => s + (Number(f.protein)  || 0), 0);
  const totC   = group.foods.reduce((s, f) => s + (Number(f.carbs)    || 0), 0);
  const totF   = group.foods.reduce((s, f) => s + (Number(f.fat)      || 0), 0);
  const totFi  = group.foods.reduce((s, f) => s + (Number(f.fibre)    || 0), 0);
  const foodList = group.foods.map(f => `${escHtml(f.food)} ${f.amount}${f.unit}`).join(', ');
  const n = group.foods.length;
  return `
    <div class="meals-card" data-meal-no="${escHtml(group.mealNo)}">
      <div class="meals-card__header">
        <span class="meals-card__icon">🍽</span>
        <div class="meals-card__info">
          <span class="meals-card__name">${escHtml(group.name)}</span>
          <span class="meals-card__meta">${n} ingredient${n!==1?'s':''}</span>
        </div>
        <span class="meals-card__cal">${Math.round(totCal)} kcal</span>
      </div>
      <div class="meals-card__macros">
        <span>💪 P <strong>${totPro.toFixed(1)}g</strong></span>
        <span>🌾 C <strong>${totC.toFixed(1)}g</strong></span>
        <span>🥑 F <strong>${totF.toFixed(1)}g</strong></span>
        <span>🌿 Fi <strong>${totFi.toFixed(1)}g</strong></span>
      </div>
      <p class="meals-card__foods">${escHtml(foodList)}</p>
      <div class="meals-card__actions">
        <button class="btn btn--primary meals-card__add-btn" data-meal-no="${escHtml(group.mealNo)}">+ Add to Log</button>
        <button class="btn btn--ghost meals-card__del-btn" data-meal-no="${escHtml(group.mealNo)}">Delete</button>
      </div>
    </div>`;
}

// ── Create meal modal ─────────────────────────────────────────
function openCreateMealModal() {
  document.getElementById('create-meal-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'create-meal-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:520px;width:92vw">
      <h3 class="modal-title">🍽 New Meal</h3>
      <label class="sheet-label">Meal Name *</label>
      <input id="cm-name" class="sheet-input" type="text"
        placeholder="e.g. OATS Breakfast, High Protein Lunch"
        autocomplete="off" style="margin-bottom:12px">
      <label class="sheet-label">Search foods to add</label>
      <input id="cm-search" class="search-input" type="text"
        placeholder="Search foods…" autocomplete="off"
        style="margin-bottom:8px;font-size:var(--text-md)">
      <div id="cm-search-results" style="max-height:160px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-input);margin-bottom:8px;display:none"></div>
      <div id="cm-food-list" style="margin-bottom:12px"></div>
      <div id="cm-total" class="meals-modal-total" style="display:none"></div>
      <div class="bottom-sheet__footer" style="margin-top:12px">
        <button id="cm-cancel" class="btn btn--ghost">Cancel</button>
        <button id="cm-save" class="btn btn--primary">Save Meal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  let selectedFoods = []; // [{food, amount}]

  modal.querySelector('#cm-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const searchEl   = modal.querySelector('#cm-search');
  const resultsEl  = modal.querySelector('#cm-search-results');
  const foodListEl = modal.querySelector('#cm-food-list');
  const totalEl    = modal.querySelector('#cm-total');

  // Search
  let _searchTimer = null;
  searchEl.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    const q = searchEl.value.trim().toLowerCase();
    if (!q) { resultsEl.style.display='none'; resultsEl.innerHTML=''; return; }
    _searchTimer = setTimeout(() => {
      const foods = (store.state.foods || []).filter(f =>
        f.name.toLowerCase().includes(q)).slice(0, 8);
      if (!foods.length) { resultsEl.style.display='none'; return; }
      resultsEl.style.display = 'block';
      resultsEl.innerHTML = foods.map(f => `
        <div class="mac-search-dropdown-row" data-no="${f.no}" style="cursor:pointer">
          <span style="flex:1;font-family:var(--font-sans);font-size:var(--text-base)">${escHtml(f.name)}</span>
          <span style="font-size:var(--text-xs);color:var(--color-text-secondary)">${f.amount}${f.unit} · ${f.calories}kcal</span>
        </div>`).join('');
      resultsEl.querySelectorAll('.mac-search-dropdown-row').forEach(row => {
        row.addEventListener('click', () => {
          const food = (store.state.foods||[]).find(f => f.no === Number(row.dataset.no));
          if (!food) return;
          selectedFoods.push({ food, amount: food.amount });
          searchEl.value = '';
          resultsEl.style.display = 'none';
          renderFoodList();
        });
      });
    }, 200);
  });

  function renderFoodList() {
    foodListEl.innerHTML = selectedFoods.map((item, i) => `
      <div class="cm-food-row" style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:.5px solid var(--color-border)">
        <span style="flex:1;font-size:var(--text-base);font-family:var(--font-sans)">${escHtml(item.food.name)}</span>
        <input class="cm-amt-input" type="number" min="1" step="1"
          value="${item.amount}" data-idx="${i}"
          style="width:56px;padding:4px 6px;border:1px solid var(--color-border);border-radius:6px;font-size:var(--text-base);font-family:var(--font-sans);text-align:right">
        <span style="font-size:var(--text-xs);color:var(--color-text-secondary);min-width:18px">${item.food.unit}</span>
        <button class="cm-remove-btn" data-idx="${i}"
          style="color:var(--color-text-hint);font-size:14px;padding:2px 6px">✕</button>
      </div>`).join('');
    foodListEl.querySelectorAll('.cm-amt-input').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        selectedFoods[idx].amount = parseFloat(inp.value) || selectedFoods[idx].food.amount;
        renderTotal();
      });
    });
    foodListEl.querySelectorAll('.cm-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFoods.splice(Number(btn.dataset.idx), 1);
        renderFoodList();
      });
    });
    renderTotal();
  }

  function renderTotal() {
    if (!selectedFoods.length) { totalEl.style.display='none'; return; }
    const tot = selectedFoods.reduce((acc, {food, amount}) => {
      const ratio = amount / (food.amount || 100);
      return {
        cal: acc.cal + Math.round((food.calories||0) * ratio),
        pro: acc.pro + (food.protein||0) * ratio,
        c:   acc.c   + (food.carbs||0)   * ratio,
        f:   acc.f   + (food.fat||0)     * ratio,
        fi:  acc.fi  + (food.fibre||0)   * ratio,
      };
    }, {cal:0,pro:0,c:0,f:0,fi:0});
    totalEl.style.display = 'flex';
    totalEl.innerHTML = `
      <span>🔥 <strong>${tot.cal}</strong> kcal</span>
      <span>💪 P <strong>${tot.pro.toFixed(1)}g</strong></span>
      <span>🌾 C <strong>${tot.c.toFixed(1)}g</strong></span>
      <span>🥑 F <strong>${tot.f.toFixed(1)}g</strong></span>
      <span>🌿 Fi <strong>${tot.fi.toFixed(1)}g</strong></span>`;
  }

  modal.querySelector('#cm-save').addEventListener('click', async () => {
    const name = modal.querySelector('#cm-name').value.trim();
    if (!name) { showToast('Meal name is required', 'error'); modal.querySelector('#cm-name').focus(); return; }
    if (!selectedFoods.length) { showToast('Add at least one food', 'error'); return; }
    const saveBtn = modal.querySelector('#cm-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      const { saveMeal } = await import('./api.js');
      await saveMeal({ name, foods: selectedFoods.map(({food, amount}) => ({
        foodNo: food.no, foodName: food.name, amount, unit: food.unit,
        calories: Math.round((food.calories||0) * amount / (food.amount||100)),
        protein:  Math.round((food.protein||0)  * amount / (food.amount||100) * 10) / 10,
        carbs:    Math.round((food.carbs||0)    * amount / (food.amount||100) * 10) / 10,
        fat:      Math.round((food.fat||0)      * amount / (food.amount||100) * 10) / 10,
        fibre:    Math.round((food.fibre||0)    * amount / (food.amount||100) * 10) / 10,
      }))});
      showToast(`${name} saved ✓`, 'success');
      store.state.meals = null;
      modal.remove();
      await loadMeals(true);
    } catch (err) {
      console.error('[meals] saveMeal:', err);
      showToast('Failed to save meal', 'error');
      saveBtn.disabled = false; saveBtn.textContent = 'Save Meal';
    }
  });
}

// ── Add meal to log modal ─────────────────────────────────────
function openAddToLogModal(mealNo) {
  const groups = {};
  for (const r of (store.state.meals || [])) {
    if (!groups[r.mealNo]) groups[r.mealNo] = { mealNo: r.mealNo, name: r.name, foods: [] };
    groups[r.mealNo].foods.push(r);
  }
  const group = groups[mealNo];
  if (!group) return;

  const totCal = group.foods.reduce((s,f)=>s+(Number(f.calories)||0),0);
  const totPro = group.foods.reduce((s,f)=>s+(Number(f.protein)||0),0);
  const totC   = group.foods.reduce((s,f)=>s+(Number(f.carbs)||0),0);
  const totF   = group.foods.reduce((s,f)=>s+(Number(f.fat)||0),0);

  document.getElementById('add-meal-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'add-meal-modal';
  modal.className = 'modal-backdrop';
  const options = CONFIG.labels.mealTypes.map(t =>
    `<option value="${t}">${MEAL_EMOJI[t]||''} ${t}</option>`).join('');
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;width:92vw">
      <h3 class="modal-title">Add to Log</h3>
      <div class="meals-modal-preview">
        <strong>${escHtml(group.name)}</strong>
        <span style="font-size:var(--text-xs);color:var(--color-text-secondary)">${group.foods.length} ingredient${group.foods.length!==1?'s':''}</span>
        <div style="margin-top:6px;font-size:var(--text-xs);color:var(--color-text-secondary)">
          🔥 ${Math.round(totCal)} kcal · P ${totPro.toFixed(1)}g · C ${totC.toFixed(1)}g · F ${totF.toFixed(1)}g
        </div>
      </div>
      <label class="sheet-label" style="margin-top:12px">Add to meal</label>
      <select id="atl-meal" class="sheet-select" style="margin-top:4px">${options}</select>
      <div class="bottom-sheet__footer" style="margin-top:16px">
        <button id="atl-cancel" class="btn btn--ghost">Cancel</button>
        <button id="atl-confirm" class="btn btn--primary">Add All Foods</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#atl-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#atl-confirm').addEventListener('click', () => confirmAddToLog(modal, group));
}

async function confirmAddToLog(modal, group) {
  const mealType = modal.querySelector('#atl-meal').value;
  const confirmBtn = modal.querySelector('#atl-confirm');
  const cancelBtn  = modal.querySelector('#atl-cancel');
  confirmBtn.disabled = true; confirmBtn.textContent = 'Adding…';
  cancelBtn.disabled  = true;

  try {
    const { addLogEntry, getDailyLog } = await import('./api.js');
    const date = store.state.currentDate || today();
    for (const f of group.foods) {
      await addLogEntry({
        date, mealType,
        foodNo:    f.foodNo || '',
        name:      f.food,
        amount:    Number(f.amount) || 100,
        unit:      f.unit  || 'g',
        calories:  Number(f.calories)  || 0,
        protein:   Number(f.protein)   || 0,
        carbs:     Number(f.carbs)     || 0,
        fat:       Number(f.fat)       || 0,
        fibre:     Number(f.fibre)     || 0,
        sodium:    Number(f.sodium)    || 0,
        potassium: Number(f.potassium) || 0,
      });
    }
    // Refresh log cache
    const { invalidateLogCache } = await import('./log.js');
    invalidateLogCache(date);
    store.state.dailyLog[date] = await getDailyLog(date);
    const { renderSidebarSummary } = await import('./log.js');
    renderSidebarSummary(store.state.dailyLog[date]);
    showToast(`${group.name} added to ${mealType} ✓`, 'success');
    modal.remove();
  } catch (err) {
    console.error('[meals] addToLog:', err);
    showToast('Failed to add to log', 'error');
    confirmBtn.disabled = false; confirmBtn.textContent = 'Add All Foods';
    cancelBtn.disabled  = false;
  }
}

// ── Delete meal ───────────────────────────────────────────────
async function handleDeleteMeal(mealNo, btn) {
  if (!confirm(`Delete this meal template?`)) return;
  btn.disabled = true;
  try {
    const { deleteMeal } = await import('./api.js');
    await deleteMeal(mealNo);
    store.state.meals = null;
    showToast('Meal deleted', 'success');
    await loadMeals(true);
  } catch (err) {
    console.error('[meals] delete:', err);
    showToast('Failed to delete', 'error');
    btn.disabled = false;
  }
}

function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
