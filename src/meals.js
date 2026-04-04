// ============================================================
// meals.js — B8 Composed Meal Templates
// Fixed: amount as clickable badge in create modal
//        Meal card expand: view/add/delete individual foods
// ============================================================
import { CONFIG } from '../config.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { today } from './utils.js';
import {
  getMeals, saveMeal, deleteMeal,
  deleteFoodFromMeal, addFoodToMeal,
  addLogEntry, getDailyLog,
} from './api.js';
import { invalidateLogCache, renderSidebarSummary } from './log.js';

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
    if (store.state.meals && !force) { renderMealsList(store.state.meals); return; }
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

function groupMeals(rows) {
  const groups = {};
  for (const r of rows) {
    if (!groups[r.mealNo]) groups[r.mealNo] = { mealNo: r.mealNo, name: r.name, foods: [] };
    groups[r.mealNo].foods.push(r);
  }
  return Object.values(groups);
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
  el.innerHTML = groupMeals(rows).map(g => renderMealCard(g)).join('');
  bindMealCardEvents(el);
}

function renderMealCard(group) {
  const totCal = group.foods.reduce((s, f) => s + (Number(f.calories) || 0), 0);
  const totPro = group.foods.reduce((s, f) => s + (Number(f.protein)  || 0), 0);
  const totC   = group.foods.reduce((s, f) => s + (Number(f.carbs)    || 0), 0);
  const totF   = group.foods.reduce((s, f) => s + (Number(f.fat)      || 0), 0);
  const totFi  = group.foods.reduce((s, f) => s + (Number(f.fibre)    || 0), 0);
  const n = group.foods.length;
  const foodRows = group.foods.map(f => `
    <div class="meals-food-row" data-meal-no="${escHtml(group.mealNo)}" data-food-name="${escHtml(f.food)}">
      <span class="meals-food-row__name">${escHtml(f.food)}</span>
      <span class="meals-food-row__amount">${f.amount}${f.unit}</span>
      <span class="meals-food-row__cal">${Math.round(Number(f.calories)||0)} kcal</span>
      <button class="meals-food-row__del" data-meal-no="${escHtml(group.mealNo)}" data-food-name="${escHtml(f.food)}" title="Remove food">✕</button>
    </div>`).join('');
  return `
    <div class="meals-card" data-meal-no="${escHtml(group.mealNo)}">
      <div class="meals-card__header meals-card__header--clickable" data-meal-no="${escHtml(group.mealNo)}">
        <span class="meals-card__icon">🍽</span>
        <div class="meals-card__info">
          <span class="meals-card__name">${escHtml(group.name)}</span>
          <span class="meals-card__meta">${n} ingredient${n!==1?'s':''}</span>
        </div>
        <span class="meals-card__cal">${Math.round(totCal)} kcal</span>
        <span class="meals-card__chevron">›</span>
      </div>
      <div class="meals-card__macros">
        <span>💪 P <strong>${totPro.toFixed(1)}g</strong></span>
        <span>🌾 C <strong>${totC.toFixed(1)}g</strong></span>
        <span>🥑 F <strong>${totF.toFixed(1)}g</strong></span>
        <span>🌿 Fi <strong>${totFi.toFixed(1)}g</strong></span>
      </div>
      <div class="meals-card__expand" id="expand-${escHtml(group.mealNo)}" style="display:none">
        <div class="meals-food-list">${foodRows}</div>
        <div class="meals-expand-add">
          <input class="meals-expand-search search-input" type="text"
            placeholder="Add food…" autocomplete="off"
            data-meal-no="${escHtml(group.mealNo)}"
            style="font-size:var(--text-base);margin-bottom:4px">
          <div class="meals-expand-results" data-meal-no="${escHtml(group.mealNo)}" style="display:none"></div>
        </div>
      </div>
      <div class="meals-card__actions">
        <button class="btn btn--primary meals-card__add-btn" data-meal-no="${escHtml(group.mealNo)}">+ Add to Log</button>
        <button class="btn btn--ghost meals-card__del-btn" data-meal-no="${escHtml(group.mealNo)}">Delete</button>
      </div>
    </div>`;
}

function bindMealCardEvents(container) {
  // Toggle expand
  container.querySelectorAll('.meals-card__header--clickable').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const mealNo = hdr.dataset.mealNo;
      const expand = document.getElementById(`expand-${mealNo}`);
      const chevron = hdr.querySelector('.meals-card__chevron');
      if (!expand) return;
      const open = expand.style.display !== 'none';
      expand.style.display = open ? 'none' : 'block';
      if (chevron) chevron.textContent = open ? '›' : '⌄';
    });
  });

  // Delete individual food from meal
  container.querySelectorAll('.meals-food-row__del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleDeleteFoodFromMeal(btn.dataset.mealNo, btn.dataset.foodName, btn);
    });
  });

  // Add to Log
  container.querySelectorAll('.meals-card__add-btn').forEach(btn =>
    btn.addEventListener('click', () => openAddToLogModal(btn.dataset.mealNo)));

  // Delete whole meal
  container.querySelectorAll('.meals-card__del-btn').forEach(btn =>
    btn.addEventListener('click', () => handleDeleteMeal(btn.dataset.mealNo, btn)));

  // Expand search: add food to existing meal
  container.querySelectorAll('.meals-expand-search').forEach(inp => {
    let _t = null;
    inp.addEventListener('input', () => {
      clearTimeout(_t);
      const q = inp.value.trim().toLowerCase();
      const mealNo = inp.dataset.mealNo;
      const resultsEl = container.querySelector(`.meals-expand-results[data-meal-no="${mealNo}"]`);
      if (!q || !resultsEl) { if (resultsEl) resultsEl.style.display='none'; return; }
      _t = setTimeout(() => {
        const foods = (store.state.foods||[]).filter(f => f.name.toLowerCase().includes(q)).slice(0,6);
        if (!foods.length) { resultsEl.style.display='none'; return; }
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = foods.map(f => `
          <div class="mac-search-dropdown-row meals-expand-result-row" data-no="${f.no}" data-meal-no="${mealNo}"
            style="cursor:pointer;padding:6px 10px">
            <span style="flex:1;font-size:var(--text-base);font-family:var(--font-sans)">${escHtml(f.name)}</span>
            <span style="font-size:var(--text-xs);color:var(--color-text-secondary)">${f.amount}${f.unit} · ${f.calories}kcal</span>
          </div>`).join('');
        resultsEl.querySelectorAll('.meals-expand-result-row').forEach(row => {
          row.addEventListener('click', () => {
            const food = (store.state.foods||[]).find(f => f.no === Number(row.dataset.no));
            if (!food) return;
            inp.value = '';
            resultsEl.style.display = 'none';
            handleAddFoodToMeal(mealNo, food);
          });
        });
      }, 200);
    });
  });
}

// ── Meal food CRUD ────────────────────────────────────────────
async function handleDeleteFoodFromMeal(mealNo, foodName, btn) {
  btn.disabled = true;
  try {
    await deleteFoodFromMeal(mealNo, foodName);
    store.state.meals = null;
    await loadMeals(true);
    showToast('Food removed ✓', 'success');
    // Re-open the expand panel
    const expand = document.getElementById(`expand-${mealNo}`);
    if (expand) expand.style.display = 'block';
  } catch (err) {
    console.error('[meals] deleteFoodFromMeal:', err);
    showToast('Failed to remove food', 'error');
    btn.disabled = false;
  }
}

async function handleAddFoodToMeal(mealNo, food) {
  // Get the current meal name from store
  const groups = groupMeals(store.state.meals || []);
  const group = groups.find(g => g.mealNo === mealNo);
  if (!group) return;
  try {
    await addFoodToMeal(mealNo, group.name, food);
    store.state.meals = null;
    await loadMeals(true);
    showToast(`${food.name} added ✓`, 'success');
    const expand = document.getElementById(`expand-${mealNo}`);
    if (expand) expand.style.display = 'block';
  } catch (err) {
    console.error('[meals] addFoodToMeal:', err);
    showToast('Failed to add food', 'error');
  }
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

  let selectedFoods = [];

  modal.querySelector('#cm-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const searchEl   = modal.querySelector('#cm-search');
  const resultsEl  = modal.querySelector('#cm-search-results');
  const foodListEl = modal.querySelector('#cm-food-list');
  const totalEl    = modal.querySelector('#cm-total');

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
      <div class="cm-food-row" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:.5px solid var(--color-border)">
        <span style="flex:1;font-size:var(--text-base);font-family:var(--font-sans)">${escHtml(item.food.name)}</span>
        <button class="cm-amt-badge" data-idx="${i}"
          style="min-width:52px;padding:3px 8px;border:1px solid var(--color-border);border-radius:6px;
                 font-size:var(--text-base);font-family:var(--font-sans);background:var(--color-bg-page);
                 color:var(--color-text-primary);cursor:pointer;text-align:right">
          ${item.amount}${item.food.unit}
        </button>
        <button class="cm-remove-btn" data-idx="${i}"
          style="color:var(--color-text-hint);font-size:14px;padding:2px 6px;flex-shrink:0">✕</button>
      </div>`).join('');

    // Amount badge → click to edit inline (same as Today entry row)
    foodListEl.querySelectorAll('.cm-amt-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        if (badge.querySelector('input')) return;
        const idx = Number(badge.dataset.idx);
        const item = selectedFoods[idx];
        badge.innerHTML = `<input type="number" min="1" step="1" value="${item.amount}"
          style="width:52px;text-align:right;font-size:var(--text-base);border:none;
                 background:#fff;color:#111;border-radius:4px;padding:1px 3px;
                 outline:none;font-family:var(--font-sans);">`;
        const inp = badge.querySelector('input');
        inp.focus(); inp.select();
        const confirm = () => {
          const v = parseFloat(inp.value);
          selectedFoods[idx].amount = (v > 0) ? v : item.food.amount;
          renderFoodList();
        };
        inp.addEventListener('blur', confirm);
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') inp.blur();
          if (e.key === 'Escape') { selectedFoods[idx].amount = item.amount; renderFoodList(); }
        });
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
  const groups = groupMeals(store.state.meals || []);
  const group  = groups.find(g => g.mealNo === mealNo);
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
        <span style="font-size:var(--text-xs);color:var(--color-text-secondary)">
          ${group.foods.length} ingredient${group.foods.length!==1?'s':''}
        </span>
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
  const mealType  = modal.querySelector('#atl-meal').value;
  const confirmBtn = modal.querySelector('#atl-confirm');
  const cancelBtn  = modal.querySelector('#atl-cancel');
  confirmBtn.disabled = true; confirmBtn.textContent = 'Adding…';
  cancelBtn.disabled  = true;

  try {
    const date = store.state.currentDate || today();
    for (const f of group.foods) {
      await addLogEntry({
        date, mealType,
        foodNo:    f.foodNo || '',
        name:      f.food,
        amount:    Number(f.amount)    || 100,
        unit:      f.unit              || 'g',
        calories:  Number(f.calories)  || 0,
        protein:   Number(f.protein)   || 0,
        carbs:     Number(f.carbs)     || 0,
        fat:       Number(f.fat)       || 0,
        fibre:     Number(f.fibre)     || 0,
        sodium:    Number(f.sodium)    || 0,
        potassium: Number(f.potassium) || 0,
      });
    }
    invalidateLogCache(date);
    store.state.dailyLog[date] = await getDailyLog(date);
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

// ── Delete whole meal ─────────────────────────────────────────
async function handleDeleteMeal(mealNo, btn) {
  if (!confirm('Delete this meal template?')) return;
  btn.disabled = true;
  try {
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
