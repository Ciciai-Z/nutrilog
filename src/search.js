// ============================================================
// search.js — Food Search + Favourites + Quick Add
// Fixed: overlay busy, confirmAddFood re-fetch, Quick Add sheet
// ============================================================
import { CONFIG } from '../config.js';
import { getFavourites, toggleFavourite, addLogEntry, addQuickAdd, getDailyLog } from './api.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { calcCalories, today } from './utils.js';
import { invalidateLogCache, renderSidebarSummary, refreshLog } from './log.js';

let selectedMealType = CONFIG.labels.mealTypes[0];

// ── Shared overlay (mirrors log.js setPageBusy) ───────────────
function setPageBusy(busy) {
  const ID = 'log-busy-overlay';
  if (busy) {
    if (document.getElementById(ID)) return;
    const o = document.createElement('div');
    o.id = ID;
    o.style.cssText = 'position:fixed;inset:0;z-index:8888;background:rgba(242,239,233,0.45);cursor:wait;pointer-events:all';
    document.body.appendChild(o);
  } else {
    document.getElementById(ID)?.remove();
  }
}

// ── Data loading ──────────────────────────────────────────────
export async function ensureFoodsLoaded() {
  if (store.state.foods && store.state.foods.length > 0) return;
  console.log('[search] ensureFoodsLoaded → fetching');
  try {
    const { searchFoods } = await import('./api.js');
    store.state.foods = await searchFoods('');
    console.log(`[search] loaded ${store.state.foods.length} foods`);
  } catch (err) {
    console.error('[search] ensureFoodsLoaded:', err);
    showToast('Failed to load food database','error');
  }
}

export async function ensureFavouritesLoaded() {
  if (store.state.favourites) return;
  try {
    const ids = await getFavourites();
    store.state.favourites = new Set(ids);
  } catch (err) {
    console.error('[search] ensureFavouritesLoaded:', err);
    store.state.favourites = new Set();
  }
}

// ── iPhone bottom-sheet search ────────────────────────────────
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
      <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
        <input id="mobile-sheet-input" class="search-input"
          type="text" inputmode="search" enterkeyhint="search"
          placeholder="Search foods…"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          style="flex:1;font-size:16px;margin-bottom:0">
        <button id="mobile-quick-add-btn" class="btn btn--ghost"
          style="white-space:nowrap;font-size:14px;padding:8px 12px;flex-shrink:0">⚡ Quick Add</button>
      </div>
      <div id="mobile-sheet-results" class="search-results"
        style="max-height:60vh;overflow-y:auto;padding:0"></div>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('bottom-sheet--visible'));
  sheet.querySelector('.bottom-sheet__backdrop').addEventListener('click', closeMobileSheet);
  sheet.querySelector('#mobile-quick-add-btn').addEventListener('click', () => {
    closeMobileSheet(); openQuickAddSheet();
  });
  const input = document.getElementById('mobile-sheet-input');
  setTimeout(() => input?.focus(), 80);
  input?.addEventListener('input', () => runSheetSearch(input.value));
  runSheetSearch('');
}

function closeMobileSheet() {
  const sheet = document.getElementById('mobile-search-sheet');
  if (!sheet) return;
  sheet.classList.remove('bottom-sheet--visible');
  setTimeout(() => sheet.remove(), 250);
}

async function runSheetSearch(rawQuery) {
  const q      = rawQuery.trim().toLowerCase();
  const foods  = store.state.foods || [];
  const favSet = store.state.favourites || new Set();
  let filtered = !q
    ? foods.filter(f => favSet.has(f.no))
    : foods.filter(f => f.name.toLowerCase().includes(q));
  filtered.sort((a,b)=>{const af=favSet.has(a.no)?0:1,bf=favSet.has(b.no)?0:1;return af!==bf?af-bf:a.name.localeCompare(b.name);});
  const container = document.getElementById('mobile-sheet-results');
  if (!container) return;
  const results = filtered.slice(0, CONFIG.search.maxResults);
  if (!results.length) {
    container.innerHTML = `<p class="search-empty">${q?`No results for "${escHtml(q)}"` : 'Search for a food'}</p>`;
    return;
  }
  container.innerHTML = results.map(f => renderFoodRow(f, q)).join('');
  container.querySelectorAll('.search-result-row').forEach(row => {
    const no = Number(row.dataset.foodNo);
    row.querySelector('.result-info')?.addEventListener('click', () => { closeMobileSheet(); openAddSheet(no); });
    row.querySelector('.fav-btn')?.addEventListener('click', e => { e.stopPropagation(); handleToggleFavourite(no, row); });
  });
}

// ── B6: Quick Add sheet ───────────────────────────────────────
export function openQuickAddSheet() {
  document.getElementById('quick-add-sheet')?.remove();
  const sheet = document.createElement('div');
  sheet.id = 'quick-add-sheet';
  sheet.className = 'bottom-sheet';
  const options = CONFIG.labels.mealTypes.map(t => `<option>${t}</option>`).join('');
  const numField = (id, label, required = false) => `
    <div>
      <label class="sheet-label">${label}${required?' *':''}</label>
      <input id="${id}" class="sheet-input" type="number"
        min="0" max="3000" step="0.1"
        placeholder="${required?'required':'0'}"
        inputmode="decimal" style="font-size:var(--text-md)">
    </div>`;
  sheet.innerHTML = `
    <div class="bottom-sheet__backdrop"></div>
    <div class="bottom-sheet__panel">
      <div class="bottom-sheet__header">
        <span class="bottom-sheet__title">⚡ Quick Add</span>
        <span class="bottom-sheet__sub">Enter nutrition values directly</span>
      </div>
      <div class="bottom-sheet__body" style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label class="sheet-label">Name *</label>
          <input id="qa-name" class="sheet-input" type="text"
            placeholder="e.g. Restaurant noodles"
            autocomplete="off" style="font-size:var(--text-md)">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${numField('qa-calories','Calories (kcal)',true)}
          ${numField('qa-protein','Protein (g)')}
          ${numField('qa-carbs','Carbs (g)')}
          ${numField('qa-fat','Fat (g)')}
          ${numField('qa-fibre','Fibre (g)')}
          <div>
            <label class="sheet-label">Meal</label>
            <select id="qa-meal" class="sheet-select" style="font-size:var(--text-md)">${options}</select>
          </div>
        </div>
      </div>
      <div class="bottom-sheet__footer">
        <button id="qa-cancel" class="btn btn--ghost">Cancel</button>
        <button id="qa-confirm" class="btn btn--primary">Add to Log</button>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('bottom-sheet--visible'));
  const closeQA = () => { sheet.classList.remove('bottom-sheet--visible'); setTimeout(() => sheet.remove(), 250); };
  sheet.querySelector('.bottom-sheet__backdrop').addEventListener('click', closeQA);
  sheet.querySelector('#qa-cancel').addEventListener('click', closeQA);
  // Clamp to 1 decimal + max 3000
  sheet.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.addEventListener('blur', () => {
      let v = parseFloat(inp.value);
      if (isNaN(v) || v < 0) { inp.value = ''; return; }
      if (v > 3000) v = 3000;
      inp.value = Math.round(v * 10) / 10;
    });
  });
  sheet.querySelector('#qa-confirm').addEventListener('click', () => confirmQuickAdd(sheet, closeQA));
}

async function confirmQuickAdd(sheet, closeQA) {
  const name = sheet.querySelector('#qa-name').value.trim();
  if (!name) { showToast('Name is required','error'); sheet.querySelector('#qa-name').focus(); return; }
  const calories = parseFloat(sheet.querySelector('#qa-calories').value);
  if (!calories || calories <= 0) { showToast('Calories is required','error'); sheet.querySelector('#qa-calories').focus(); return; }
  const clamp = v => Math.min(Math.max(Math.round((parseFloat(v)||0)*10)/10, 0), 3000);
  const protein  = clamp(sheet.querySelector('#qa-protein').value);
  const carbs    = clamp(sheet.querySelector('#qa-carbs').value);
  const fat      = clamp(sheet.querySelector('#qa-fat').value);
  const fibre    = clamp(sheet.querySelector('#qa-fibre').value);
  const mealType = sheet.querySelector('#qa-meal').value || 'Other';
  const calsClamped = Math.min(Math.round(calories), 3000);
  const confirmBtn = sheet.querySelector('#qa-confirm');
  const cancelBtn  = sheet.querySelector('#qa-cancel');
  confirmBtn.disabled = true; confirmBtn.textContent = 'Adding…';
  cancelBtn.disabled  = true;
  setPageBusy(true);
  try {
    const date = store.state.currentDate || today();
    const result = await addQuickAdd({ date, mealType, name, calories: calsClamped, protein, carbs, fat, fibre });
    if (!store.state.foods) store.state.foods = [];
    const newFood = { no: result.foodNo, name, amount: 1, unit: 'serving',
      calories: result.calories, protein, carbs, fat, fibre, sodium: 0, potassium: 0,
      category: 'Custom', isCustom: true, isQuickAdd: true };
    if (!store.state.foods.find(f => f.no === result.foodNo)) store.state.foods.push(newFood);
    invalidateLogCache(date);
    store.state.dailyLog[date] = await getDailyLog(date);
    if (refreshLog) refreshLog(date);
    renderSidebarSummary(store.state.dailyLog[date]);
    showToast(`${name} added ✓`,'success');
    closeQA();
  } catch (err) {
    console.error('[search] confirmQuickAdd:', err);
    showToast('Failed to add — please try again','error');
    confirmBtn.disabled = false; confirmBtn.textContent = 'Add to Log';
    cancelBtn.disabled  = false;
  } finally {
    setPageBusy(false);
  }
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
  favFoods.forEach(f => { const cat=f.category||'Other'; if(!groups[cat])groups[cat]=[]; groups[cat].push(f); });
  const groupsHTML = Object.entries(groups).map(([cat,foods])=>`
    <div class="favs-section-label">${escHtml(cat)}</div>
    <div class="favs-group">${foods.map(f=>renderFavRow(f)).join('')}</div>`).join('');
  view.innerHTML = `
    <div class="favs-page">
      <div class="favs-page-header">
        <h2 style="font-family:var(--font-sans);font-size:var(--text-lg);font-weight:500;color:var(--color-text-primary)">Favourites</h2>
        <span class="favs-hint">Click to add · ★ to unfavourite</span>
      </div>
      ${favFoods.length===0 ? '<p class="search-empty" style="margin-top:40px">No favourites yet — star foods in Search</p>' : groupsHTML}
    </div>`;
  bindFavouritesEvents(view);
}

function renderFavRow(food) {
  const cals = calcCalories(food.protein, food.carbs, food.fat);
  return `
    <div class="favs-row" data-food-no="${food.no}">
      <div class="favs-row__top">
        <button class="favs-row__star-btn favs-row__star-btn--active" data-food-no="${food.no}" title="Remove from favourites">★</button>
        <span class="favs-row__name">${escHtml(food.name)}</span>
        <span class="favs-row__meta">${food.amount}${food.unit}</span>
        <span class="favs-row__cal">${cals} cal</span>
      </div>
      <div class="favs-row__expand" data-food-no="${food.no}">
        ${buildExpandPanel(food, cals)}
      </div>
    </div>`;
}

function buildExpandPanel(food, cals) {
  const options = CONFIG.labels.mealTypes.map(t=>`<option>${t}</option>`).join('');
  return `
    <div class="favs-expand-inner" data-food-no="${food.no}">
      <div class="favs-expand__macros" id="favs-macros-${food.no}">
        <span class="favs-expand__macro"><strong>${cals}</strong> cal</span>
        <span class="favs-expand__macro">P <strong>${food.protein.toFixed(1)}g</strong></span>
        <span class="favs-expand__macro">C <strong>${food.carbs.toFixed(1)}g</strong></span>
        <span class="favs-expand__macro">F <strong>${food.fat.toFixed(1)}g</strong></span>
        <span class="favs-expand__macro">Fi <strong>${(food.fibre||0).toFixed(1)}g</strong></span>
      </div>
      <div class="favs-expand__divider"></div>
      <input class="favs-expand__input" type="number"
        value="${store.state.lastAmounts?.[food.no]||food.amount}"
        min="1" step="1" data-base="${food.amount}"
        data-food-no="${food.no}" aria-label="Amount"
        style="font-size:13px">
      <span class="favs-expand__unit">${food.unit}</span>
      <select class="favs-expand__select" style="font-size:13px">${options}</select>
      <button class="favs-expand__btn" data-add-btn data-food-no="${food.no}">+ Add</button>
    </div>`;
}

function bindFavouritesEvents(view) {
  let openNo = null;
  view.querySelectorAll('.favs-row').forEach(row => {
    const no = Number(row.dataset.foodNo);
    row.querySelector('.favs-row__star-btn')?.addEventListener('click', async e => { e.stopPropagation(); await removeFavourite(no, row); });
    row.querySelector('.favs-row__top')?.addEventListener('click', e => {
      if (e.target.closest('.favs-row__star-btn')) return;
      if (openNo && openNo !== no) { view.querySelector(`.favs-row[data-food-no="${openNo}"]`)?.classList.remove('favs-row--selected'); openNo=null; }
      if (row.classList.contains('favs-row--selected')) { row.classList.remove('favs-row--selected'); openNo=null; }
      else { row.classList.add('favs-row--selected'); openNo=no; updateFavExpandPreview(row,no); }
    });
    row.querySelector('.favs-expand__input')?.addEventListener('input', () => updateFavExpandPreview(row,no));
    row.querySelector('[data-add-btn]')?.addEventListener('click', () => handleFavAdd(row,no));
  });
}

async function removeFavourite(foodNo, rowEl) {
  const fs = store.state.favourites;
  if (fs instanceof Set) fs.delete(foodNo);
  else if (Array.isArray(fs)) store.state.favourites = fs.filter(n=>n!==foodNo);
  rowEl.style.transition='opacity 0.2s,max-height 0.25s';rowEl.style.opacity='0';rowEl.style.maxHeight=rowEl.offsetHeight+'px';
  setTimeout(()=>{rowEl.style.maxHeight='0';rowEl.style.overflow='hidden';},10);
  setTimeout(()=>{rowEl.remove();const rem=(store.state.foods||[]).filter(f=>{const s=store.state.favourites;return s instanceof Set?s.has(f.no):Array.isArray(s)&&s.includes(f.no);});if(rem.length===0)renderFavouritesPage();},260);
  // Also update any star buttons on the Today log page
  document.querySelectorAll(`.entry-row__star-btn[data-food-no="${foodNo}"]`).forEach(b => {
    b.classList.remove('entry-row__star-btn--active');
  });
  try{await toggleFavourite(foodNo);showToast('Removed from favourites','success');}
  catch(err){console.error('[search] removeFavourite:',err);showToast('Failed to update','error');renderFavouritesPage();}
}

function updateFavExpandPreview(row, no) {
  const food=(store.state.foods||[]).find(f=>f.no===no);if(!food)return;
  const amtInput=row.querySelector('.favs-expand__input');
  const macrosEl=row.querySelector(`#favs-macros-${no}`)||row.querySelector('.favs-expand__macros');
  if(!amtInput||!macrosEl)return;
  const amount=parseFloat(amtInput.value)||food.amount,ratio=amount/(food.amount||100);
  const cals=Math.round(calcCalories(food.protein,food.carbs,food.fat)*ratio);
  macrosEl.innerHTML=`
    <span class="favs-expand__macro"><strong>${cals}</strong> cal</span>
    <span class="favs-expand__macro">P <strong>${((food.protein||0)*ratio).toFixed(1)}g</strong></span>
    <span class="favs-expand__macro">C <strong>${((food.carbs||0)*ratio).toFixed(1)}g</strong></span>
    <span class="favs-expand__macro">F <strong>${((food.fat||0)*ratio).toFixed(1)}g</strong></span>
    <span class="favs-expand__macro">Fi <strong>${((food.fibre||0)*ratio).toFixed(1)}g</strong></span>`;
}

async function handleFavAdd(row, no) {
  const food=(store.state.foods||[]).find(f=>f.no===no);if(!food)return;
  const amtInput=row.querySelector('.favs-expand__input');
  const mealSel=row.querySelector('.favs-expand__select');
  const addBtn=row.querySelector('[data-add-btn]');
  const amount=parseFloat(amtInput?.value)||food.amount;
  const mealType=mealSel?.value||'Breakfast';
  if(!amount||amount<=0){showToast('Enter a valid amount','error');return;}
  setPageBusy(true);
  if(addBtn){addBtn.disabled=true;addBtn.textContent='Adding…';}
  if(amtInput)amtInput.disabled=true;
  if(mealSel)mealSel.disabled=true;
  try{
    const date=store.state.currentDate||today(),ratio=amount/(food.amount||100);
    await addLogEntry({date,mealType,foodNo:food.no,name:food.name,amount,unit:food.unit,
      calories:Math.round(calcCalories(food.protein,food.carbs,food.fat)*ratio),
      protein:Math.round(food.protein*ratio*10)/10,carbs:Math.round(food.carbs*ratio*10)/10,
      fat:Math.round(food.fat*ratio*10)/10,fibre:Math.round((food.fibre||0)*ratio*10)/10,
      sodium:Math.round((food.sodium||0)*ratio),potassium:Math.round((food.potassium||0)*ratio),
    });
    if(!store.state.lastAmounts)store.state.lastAmounts={};store.state.lastAmounts[no]=amount;
    invalidateLogCache(date);
    store.state.dailyLog[date] = await getDailyLog(date);
    if (refreshLog) refreshLog(date);
    renderSidebarSummary(store.state.dailyLog[date]);
    row.classList.remove('favs-row--selected');
    showToast(`${food.name} added ✓`,'success');
  }catch(err){console.error('[search] handleFavAdd:',err);showToast('Failed to add','error');}
  finally{
    setPageBusy(false);
    if(addBtn){addBtn.disabled=false;addBtn.textContent='+ Add';}
    if(amtInput)amtInput.disabled=false;if(mealSel)mealSel.disabled=false;
  }
}

// ── Shared food row renderer ──────────────────────────────────
function renderFoodRow(food, q) {
  const favSet=store.state.favourites||new Set();
  const isFav=favSet.has(food.no);
  const cals=calcCalories(food.protein,food.carbs,food.fat);
  const hl=q?highlightMatch(food.name,q):escHtml(food.name);
  return `
    <div class="search-result-row" data-food-no="${food.no}" role="listitem">
      <button class="fav-btn ${isFav?'fav-btn--active':''}" aria-label="${isFav?'Remove':'Add to favourites'}">★</button>
      <div class="result-info">
        <span class="result-name">${hl}</span>
        <span class="result-meta">${food.amount}${food.unit} · ${cals} kcal</span>
      </div>
      <span class="result-macros">P ${food.protein.toFixed(1)}g &nbsp; C ${food.carbs.toFixed(1)}g &nbsp; F ${food.fat.toFixed(1)}g</span>
    </div>`;
}

function highlightMatch(name, q) {
  const idx=name.toLowerCase().indexOf(q.toLowerCase());if(idx===-1)return escHtml(name);
  return escHtml(name.slice(0,idx))+`<mark class="search-highlight">${escHtml(name.slice(idx,idx+q.length))}</mark>`+escHtml(name.slice(idx+q.length));
}

// ── Add sheet (iPhone) ────────────────────────────────────────
function openAddSheet(foodNo) {
  const food=(store.state.foods||[]).find(f=>f.no===foodNo);if(!food)return;
  document.getElementById('add-food-sheet')?.remove();
  const sheet=document.createElement('div');sheet.id='add-food-sheet';sheet.className='bottom-sheet';
  sheet.innerHTML=buildAddSheetHTML(food);
  document.body.appendChild(sheet);
  requestAnimationFrame(()=>sheet.classList.add('bottom-sheet--visible'));
  sheet.querySelector('#add-sheet-cancel')?.addEventListener('click',closeAddSheet);
  sheet.querySelector('#add-sheet-confirm')?.addEventListener('click',()=>confirmAddFood(food,sheet));
  sheet.querySelector('.bottom-sheet__backdrop')?.addEventListener('click',closeAddSheet);
  const amtInput=sheet.querySelector('#add-sheet-amount');
  const preview=sheet.querySelector('#add-sheet-preview');
  amtInput?.addEventListener('input',()=>updateAddSheetPreview(food,amtInput,preview));
}

function buildAddSheetHTML(food) {
  const cals=calcCalories(food.protein,food.carbs,food.fat);
  const lastAmt=store.state.lastAmounts?.[food.no]||food.amount;
  const options=CONFIG.labels.mealTypes.map(t=>`<option value="${t}" ${t===selectedMealType?'selected':''}>${t}</option>`).join('');
  return `
    <div class="bottom-sheet__backdrop"></div>
    <div class="bottom-sheet__panel">
      <div class="bottom-sheet__header">
        <span class="bottom-sheet__title">${escHtml(food.name)}</span>
        <span class="bottom-sheet__sub">${cals} kcal per ${food.amount}${food.unit}</span>
      </div>
      <div id="add-sheet-preview" class="add-sheet-preview">
        ${buildPreviewChips(food,lastAmt)}
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

function buildPreviewChips(food, amount) {
  const ratio=amount/(food.amount||100);
  const cals=Math.round(calcCalories(food.protein,food.carbs,food.fat)*ratio);
  return [['Cal',cals,''],['P',((food.protein||0)*ratio).toFixed(1),'g'],['C',((food.carbs||0)*ratio).toFixed(1),'g'],['F',((food.fat||0)*ratio).toFixed(1),'g'],['Fi',((food.fibre||0)*ratio).toFixed(1),'g']]
    .map(([l,v,u])=>`<div class="add-sheet-chip"><div class="add-sheet-chip__label">${l}</div><div class="add-sheet-chip__val">${v}${u}</div></div>`).join('');
}

function updateAddSheetPreview(food,amtInput,preview) {
  if(!preview)return;
  preview.innerHTML=buildPreviewChips(food,parseFloat(amtInput.value)||0);
}

function closeAddSheet() {
  const sheet=document.getElementById('add-food-sheet');if(!sheet)return;
  sheet.classList.remove('bottom-sheet--visible');setTimeout(()=>sheet.remove(),250);
}

async function confirmAddFood(food, sheet) {
  const amountInput=sheet.querySelector('#add-sheet-amount');
  const mealSelect=sheet.querySelector('#add-sheet-meal');
  const amount=parseFloat(amountInput?.value)||food.amount;
  const mealType=mealSelect?.value||selectedMealType;
  selectedMealType=mealType;
  const confirmBtn=sheet.querySelector('#add-sheet-confirm');
  const cancelBtn=sheet.querySelector('#add-sheet-cancel');
  if(confirmBtn){confirmBtn.disabled=true;confirmBtn.textContent='Adding…';}
  if(cancelBtn)cancelBtn.disabled=true;
  if(amountInput)amountInput.disabled=true;if(mealSelect)mealSelect.disabled=true;
  const ratio=amount/food.amount;const date=store.state.currentDate||today();
  const entry={date,mealType,foodNo:food.no,name:food.name,amount,unit:food.unit,
    calories:Math.round(calcCalories(food.protein,food.carbs,food.fat)*ratio),
    protein:Math.round(food.protein*ratio*10)/10,carbs:Math.round(food.carbs*ratio*10)/10,
    fat:Math.round(food.fat*ratio*10)/10,fibre:Math.round((food.fibre||0)*ratio*10)/10,
    sodium:Math.round((food.sodium||0)*ratio),potassium:Math.round((food.potassium||0)*ratio),
  };
  try{
    await addLogEntry(entry);
    if(!store.state.lastAmounts)store.state.lastAmounts={};store.state.lastAmounts[food.no]=amount;
    // Re-fetch and re-render so meal section totals update immediately
    invalidateLogCache(date);
    store.state.dailyLog[date] = await getDailyLog(date);
    if (refreshLog) refreshLog(date);
    renderSidebarSummary(store.state.dailyLog[date]);
    showToast(`Added ${food.name} ✓`,'success');
    closeAddSheet();
  }catch(err){
    console.error('[search] confirmAddFood:',err);showToast('Failed to add food','error');
    if(confirmBtn){confirmBtn.disabled=false;confirmBtn.textContent='Add to Log';}
    if(cancelBtn)cancelBtn.disabled=false;
    if(amountInput)amountInput.disabled=false;if(mealSelect)mealSelect.disabled=false;
  }
}

async function handleToggleFavourite(foodNo, rowEl) {
  const favSet=store.state.favourites;const wasFav=favSet.has(foodNo);
  wasFav?favSet.delete(foodNo):favSet.add(foodNo);updateFavBtn(rowEl,!wasFav);
  // Update Today log star buttons for this food
  document.querySelectorAll(`.entry-row__star-btn[data-food-no="${foodNo}"]`).forEach(b=>{
    b.classList.toggle('entry-row__star-btn--active', !wasFav);
  });
  try{const result=await toggleFavourite(foodNo);showToast(result.added?'Added to favourites ★':'Removed from favourites','success');}
  catch(err){wasFav?favSet.add(foodNo):favSet.delete(foodNo);updateFavBtn(rowEl,wasFav);console.error('[search] handleToggleFavourite:',err);}
}

function updateFavBtn(rowEl, isFav) {
  const btn=rowEl.querySelector('.fav-btn');if(!btn)return;
  btn.classList.toggle('fav-btn--active',isFav);
  btn.setAttribute('aria-label',isFav?'Remove from favourites':'Add to favourites');
}

function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Register on window so log.js can call without dynamic import
window.__nutrilog_openQuickAdd  = openQuickAddSheet;
window.__nutrilog_openSearch    = openSearchSheet;
window.__nutrilog_ensureFavs    = ensureFavouritesLoaded;
