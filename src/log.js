// ============================================================
// log.js — Today's Log
// Fixes: 🔥 meal header, entry button order, touch drag cleanup,
//        no red delete, remove floating clone bug
// ============================================================
import { CONFIG } from '../config.js';
import { getDailyLog, deleteLogEntry, updateLogEntry, syncDailySummary, addLogEntry, toggleFavourite } from './api.js';
import { store } from './store.js';
import { showToast } from './ui.js';
import { today, formatDate, parseDate } from './utils.js';

const MEAL_META = {
  Breakfast: { mod: 'breakfast', emoji: '☀️' },
  Lunch:     { mod: 'lunch',     emoji: '🌿' },
  Dinner:    { mod: 'dinner',    emoji: '🌙' },
  Snacks:    { mod: 'snacks',    emoji: '🍓' },
  Other:     { mod: 'other',     emoji: '📦' },
};

export async function initLog(macMode = false) {
  console.log('[log] initLog → start, macMode=', macMode);
  const date = store.state.currentDate || today();
  if (macMode) renderLogShellMac(date);
  else         renderLogShellMobile(date);
  await loadAndRender(date);
  console.log('[log] initLog → ready');
}

export function invalidateLogCache(date) { delete store.state.dailyLog[date]; }

// ── Shell: Mobile ──────────────────────────────────────────────
function renderLogShellMobile(date) {
  const view = document.getElementById('view-today');
  if (!view) return;
  const title = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  view.innerHTML = `
    <div class="log-page">
      <div class="log-page-header-row">
        <div class="page-title-wrap">
          <input class="page-title-input" id="log-title-input" type="text"
            value="${escAttr(title)}" maxlength="28" spellcheck="false">
        </div>
      </div>
      <div style="padding:0 12px 6px">
        <input class="search-input" id="log-search-input" type="search"
          placeholder="Search to add food..." autocomplete="off" style="font-size:16px">
      </div>
      <div id="log-macro-strip" class="iphone-macro-strip"></div>
      <div id="log-meals" class="log-meals"></div>
      <div class="log-sync-wrap">
        <button id="log-sync-btn-mobile" class="btn btn--primary log-sync-btn">Save Summary</button>
      </div>
    </div>`;
  document.getElementById('log-sync-btn-mobile')?.addEventListener('click', handleSync);
  bindTitleInput('log-title-input');
  bindMobileSearch('log-search-input');
}

// ── Shell: Mac ─────────────────────────────────────────────────
function renderLogShellMac(date) {
  const view = document.getElementById('view-today');
  if (!view) return;
  const title = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  view.innerHTML = `
    <div class="log-page">
      <header class="page-header log-mac-header">
        <div class="page-title-wrap">
          <input class="page-title-input" id="log-title-input" type="text"
            value="${escAttr(title)}" maxlength="28" spellcheck="false">
          <div class="page-title-edit-hint">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M7 1.5l1.5 1.5-5 5L2 8.5l.5-1.5z"/></svg> click to edit
          </div>
        </div>
        <span class="page-header__spacer"></span>
        <div class="mac-search-pill-wrap" id="mac-search-wrap">
          <div class="mac-search-pill" id="mac-search-pill">
            <svg class="mac-search-pill__icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="5.5" cy="5.5" r="3.5"/><line x1="8.5" y1="8.5" x2="12" y2="12"/>
            </svg>
            <input class="mac-search-pill__input" id="mac-search-input" type="text"
              placeholder="Search to add food..." autocomplete="off">
          </div>
          <div class="mac-search-dropdown" id="mac-search-dropdown">
            <div class="mac-search-dropdown-rows" id="mac-search-rows"></div>
            <div class="mac-search-add-bar" id="mac-add-bar" style="display:none">
              <span class="mac-search-add-bar__name" id="mac-add-bar-name"></span>
              <input class="mac-search-add-bar__input" id="mac-add-amount" type="number" value="100" min="1" step="1">
              <span class="mac-search-add-bar__unit">g</span>
              <select class="mac-search-add-bar__select" id="mac-add-meal">
                ${CONFIG.labels.mealTypes.map(t=>`<option>${t}</option>`).join('')}
              </select>
              <span class="mac-search-add-bar__cal" id="mac-add-cal"></span>
              <button class="mac-search-add-bar__btn" id="mac-add-btn">+ Add</button>
            </div>
            <div class="mac-add-nutrition-preview" id="mac-nutrition-preview" style="display:none"></div>
          </div>
        </div>
      </header>
      <div id="log-meals" class="log-meals"></div>
    </div>`;
  bindTitleInput('log-title-input');
  bindMacSearch();
}

function bindTitleInput(id) {
  const input = document.getElementById(id); if (!input) return;
  const resize = () => { input.style.width = Math.max(input.value.length*13+8,80)+'px'; };
  resize(); input.addEventListener('input', resize);
  input.addEventListener('blur', async () => {
    const val = input.value.trim() || CONFIG.labels.defaultDayTitle || "Today's log";
    input.value = val;
    if (val === (store.state.settings?.day_title||'')) return;
    try { const { updateSettings } = await import('./api.js'); await updateSettings({day_title:val}); if (store.state.settings) store.state.settings.day_title=val; }
    catch (err) { console.error('[log] day_title save:', err); }
  });
  input.addEventListener('keydown', e => {
    if (e.key==='Enter'){e.preventDefault();input.blur();}
    if (e.key==='Escape'){input.value=store.state.settings?.day_title||'';input.blur();}
  });
}

function bindMobileSearch(id) {
  const input = document.getElementById(id); if (!input) return;
  input.addEventListener('focus', async () => {
    input.blur();
    try { const { openSearchSheet } = await import('./search.js'); openSearchSheet(); }
    catch (err) { console.error('[log] openSearchSheet:', err); }
  });
}

// ── Mac search ─────────────────────────────────────────────────
let _macSelFood = null;

function bindMacSearch() {
  const input    = document.getElementById('mac-search-input');
  const pill     = document.getElementById('mac-search-pill');
  const dropdown = document.getElementById('mac-search-dropdown');
  const rows     = document.getElementById('mac-search-rows');
  const addBar   = document.getElementById('mac-add-bar');
  const addBtn   = document.getElementById('mac-add-btn');
  const amountIn = document.getElementById('mac-add-amount');
  const calSpan  = document.getElementById('mac-add-cal');
  const nutPrev  = document.getElementById('mac-nutrition-preview');
  if (!input||!dropdown) return;

  const showDD = () => { pill.classList.add('mac-search-pill--expanded'); dropdown.classList.add('mac-search-dropdown--visible'); };
  const hideDD = () => { pill.classList.remove('mac-search-pill--expanded'); dropdown.classList.remove('mac-search-dropdown--visible'); addBar.style.display='none'; nutPrev.style.display='none'; _macSelFood=null; };

  input.addEventListener('focus', () => { showDD(); renderDD(getFavFoods().slice(0,8)); });
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    renderDD(q?(store.state.foods||[]).filter(f=>f.name?.toLowerCase().includes(q)).slice(0,8):getFavFoods().slice(0,8));
  });
  document.addEventListener('click', e => { if (!document.getElementById('mac-search-wrap')?.contains(e.target)) hideDD(); });

  const getFavFoods = () => { const fs=store.state.favourites; return (store.state.foods||[]).filter(f=>fs instanceof Set?fs.has(f.no):Array.isArray(fs)&&fs.includes(f.no)); };
  const isFav = no => { const fs=store.state.favourites; return fs instanceof Set?fs.has(no):Array.isArray(fs)&&fs.includes(no); };

  function renderDD(foods) {
    rows.innerHTML = foods.map(f => `
      <div class="mac-search-dropdown-row" data-no="${f.no}">
        <button class="mac-dd-fav-btn ${isFav(f.no)?'mac-dd-fav-btn--active':''}" data-no="${f.no}">★</button>
        <span class="mac-search-drow__name">${escHtml(f.name)}</span>
        <span class="mac-search-drow__meta">${calcCals(f,100)} cal · P${f.protein?.toFixed(1)}g C${f.carbs?.toFixed(1)}g F${f.fat?.toFixed(1)}g</span>
      </div>`).join('');
    rows.querySelectorAll('.mac-search-dropdown-row').forEach(r => {
      r.querySelector('.mac-search-drow__name')?.addEventListener('click', () => selectFood(Number(r.dataset.no)));
      r.querySelector('.mac-search-drow__meta')?.addEventListener('click', () => selectFood(Number(r.dataset.no)));
      r.querySelector('.mac-dd-fav-btn')?.addEventListener('click', async e => { e.stopPropagation(); await toggleFavInDD(Number(r.dataset.no),r); });
    });
  }

  async function toggleFavInDD(no, rowEl) {
    const fs=store.state.favourites; const wasFav=fs instanceof Set?fs.has(no):Array.isArray(fs)&&fs.includes(no);
    if (fs instanceof Set){wasFav?fs.delete(no):fs.add(no);}else if(Array.isArray(fs)){if(wasFav)store.state.favourites=fs.filter(n=>n!==no);else fs.push(no);}
    const btn=rowEl.querySelector('.mac-dd-fav-btn'); if(btn)btn.classList.toggle('mac-dd-fav-btn--active',!wasFav);
    try{await toggleFavourite(no);}catch(err){if(fs instanceof Set){wasFav?fs.add(no):fs.delete(no);}if(btn)btn.classList.toggle('mac-dd-fav-btn--active',wasFav);console.error('[log] mac toggleFav:',err);}
  }

  function selectFood(no) {
    const food=(store.state.foods||[]).find(f=>f.no===no); if(!food) return;
    _macSelFood=food;
    rows.querySelectorAll('.mac-search-dropdown-row').forEach(r=>r.classList.toggle('mac-search-dropdown-row--selected',Number(r.dataset.no)===no));
    amountIn.value=store.state.lastAmounts?.[no]||100;
    document.getElementById('mac-add-bar-name').textContent=(food.name||'').substring(0,28);
    updateNutritionPreview(); addBar.style.display='flex'; nutPrev.style.display='flex';
  }

  function updateNutritionPreview() {
    if (!_macSelFood||!nutPrev) return;
    const amount=parseFloat(amountIn.value)||0, ratio=amount/(_macSelFood.amount||100), f=_macSelFood;
    const cals=Math.round((f.fat||0)*ratio*9+(f.carbs||0)*ratio*4+(f.protein||0)*ratio*4);
    calSpan.textContent=cals+' cal';
    nutPrev.innerHTML=`<span class="mac-nut-chip">🔥 ${cals} kcal</span><span class="mac-nut-chip">💪 P ${((f.protein||0)*ratio).toFixed(1)}g</span><span class="mac-nut-chip">🌾 C ${((f.carbs||0)*ratio).toFixed(1)}g</span><span class="mac-nut-chip">🥑 F ${((f.fat||0)*ratio).toFixed(1)}g</span><span class="mac-nut-chip">🌿 Fi ${((f.fibre||0)*ratio).toFixed(1)}g</span><span class="mac-nut-chip">💧 Na ${Math.round((f.sodium||0)*ratio)}mg</span>`;
  }
  amountIn.addEventListener('input', updateNutritionPreview);

  addBtn.addEventListener('click', async () => {
    if (!_macSelFood) return;
    const food=_macSelFood, amount=parseFloat(amountIn.value), meal=document.getElementById('mac-add-meal')?.value||'Breakfast';
    if (!amount||amount<=0){showToast('Enter a valid amount','error');return;}
    addBtn.disabled=true; addBtn.textContent='…';
    try {
      const date=store.state.currentDate||today(), ratio=amount/(food.amount||100);
      await addLogEntry({date,mealType:meal,foodNo:food.no,name:food.name,amount,unit:food.unit||'g',
        calories:Math.round(calcCals(food,food.amount||100)*ratio),protein:r1((food.protein||0)*ratio),
        carbs:r1((food.carbs||0)*ratio),fat:r1((food.fat||0)*ratio),fibre:r1((food.fibre||0)*ratio),
        sodium:r1((food.sodium||0)*ratio),potassium:r1((food.potassium||0)*ratio)});
      if(!store.state.lastAmounts)store.state.lastAmounts={};
      store.state.lastAmounts[food.no]=amount;
      invalidateLogCache(date); store.state.dailyLog[date]=await getDailyLog(date);
      renderLog(date, store.state.dailyLog[date]);
      showToast(`${food.name} added ✓`,'success'); hideDD(); input.value='';
    } catch(err){console.error('[log] mac add:',err);showToast('Failed to add','error');}
    finally{addBtn.disabled=false;addBtn.textContent='+ Add';}
  });
}

function calcCals(food,amount){const r=amount/(food.amount||100);return Math.round((food.fat||0)*r*9+(food.carbs||0)*r*4+(food.protein||0)*r*4);}
const r1 = v => Math.round(v*10)/10;

async function loadAndRender(date) {
  const el=document.getElementById('log-meals');
  if(el)el.innerHTML='<p class="log-loading">Loading…</p>';
  try {
    if(!store.state.dailyLog[date])store.state.dailyLog[date]=await getDailyLog(date);
    renderLog(date, store.state.dailyLog[date]);
  } catch(err){console.error('[log] loadAndRender:',err);showToast('Failed to load log','error');showEmptyState();}
}

function renderLog(date, entries) {
  renderMacroStrip(entries);
  renderMealSections(entries);
  renderSidebarSummary(entries);
}

// ── iPhone macro strip ─────────────────────────────────────────
function renderMacroStrip(entries) {
  const el=document.getElementById('log-macro-strip'); if(!el)return;
  const t=sumNutrients(entries), s=store.state.settings||{};
  const chips=[
    {emoji:'🔥',actual:Math.round(t.calories),target:Number(s.calorie_target)||0,unit:''},
    {emoji:'💪',actual:t.protein,target:Number(s.protein_target)||0,unit:'g'},
    {emoji:'🌾',actual:t.carbs,target:Number(s.carbs_target)||0,unit:'g'},
    {emoji:'🥑',actual:t.fat,target:Number(s.fat_target)||0,unit:'g'},
  ];
  el.innerHTML=chips.map(c=>{
    const aDisp=c.unit?c.actual.toFixed(1):c.actual, tDisp=c.target||0;
    const pct=c.target>0?Math.min(c.actual/c.target*100,100):0, ratio=c.target>0?c.actual/c.target:0;
    const over=ratio>CONFIG.targets.dangerThreshold, warn=ratio>CONFIG.targets.warningThreshold;
    return `<div class="iphone-macro-chip ${over?'iphone-macro-chip--danger':warn?'iphone-macro-chip--warn':''}">
      <span class="iphone-macro-chip__emoji">${c.emoji}</span>
      <span class="iphone-macro-chip__val">${aDisp}${c.unit}<span class="chip-target"> / ${tDisp}${c.unit}</span></span>
      <div class="iphone-macro-chip__bar"><div class="iphone-macro-chip__fill ${over?'iphone-macro-chip__fill--danger':warn?'iphone-macro-chip__fill--warn':''}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ── Sidebar summary ────────────────────────────────────────────
export function renderSidebarSummary(entries) {
  const el=document.getElementById('sidebar-summary'); if(!el)return;
  const date=store.state.currentDate||today();
  const data=entries!==undefined?entries:(store.state.dailyLog?.[date]||[]);
  const t=sumNutrients(data), s=store.state.settings||{};
  const macros=[
    {emoji:'🔥',label:'Calories',unit:'kcal',value:t.calories, target:Number(s.calorie_target)||0},
    {emoji:'💪',label:'Protein', unit:'g',   value:t.protein,  target:Number(s.protein_target)||0},
    {emoji:'🌾',label:'Carbs',   unit:'g',   value:t.carbs,    target:Number(s.carbs_target)||0},
    {emoji:'🥑',label:'Fat',     unit:'g',   value:t.fat,      target:Number(s.fat_target)||0},
    {emoji:'🌿',label:'Fibre',   unit:'g',   value:t.fibre,    target:Number(s.fibre_target)||0},
  ];
  const minerals=[
    {emoji:'💧',label:'Sodium',   unit:'mg',value:t.sodium,   target:Number(s.sodium_target)||2000},
    {emoji:'⚡',label:'Potassium',unit:'mg',value:t.potassium,target:Number(s.potassium_target)||3500},
  ];
  const bar=(value,target)=>{
    const pct=target>0?Math.min(value/target*100,100):0, ratio=target>0?value/target:0;
    const cls=ratio>CONFIG.targets.dangerThreshold?'sidebar-bar__fill--danger':ratio>CONFIG.targets.warningThreshold?'sidebar-bar__fill--warning':'';
    return `<div class="sidebar-bar"><div class="sidebar-bar__fill ${cls}" style="width:${pct}%"></div></div>`;
  };
  const mHTML=macros.map(m=>{
    const disp=m.label==='Calories'?Math.round(m.value):m.value.toFixed(1);
    const tDisp=m.label==='Calories'?Math.round(m.target):m.target;
    return `<div class="sidebar-macro"><div class="sidebar-macro__header"><span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span><span class="sidebar-macro__value">${disp} / ${tDisp}${m.unit}</span></div>${bar(m.value,m.target)}</div>`;
  }).join('');
  const minHTML=minerals.map(m=>`<div class="sidebar-macro"><div class="sidebar-macro__header"><span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span><span class="sidebar-macro__value">${Math.round(m.value)} / ${Math.round(m.target)}${m.unit}</span></div>${bar(m.value,m.target)}</div>`).join('');
  const remHTML=macros.slice(0,4).map(m=>{
    const r=Math.max(0,m.label==='Calories'?Math.round(m.target-m.value):r1(m.target-m.value));
    return `<div class="sidebar-remaining-card"><div class="sidebar-remaining-card__label">${m.emoji} ${m.label}</div><div class="sidebar-remaining-card__value">${r}${m.unit}</div></div>`;
  }).join('');
  el.innerHTML=`${mHTML}<hr class="sidebar-divider"><div class="sidebar-minerals-title">Minerals</div>${minHTML}<hr class="sidebar-divider"><div class="sidebar-remaining-title">Remaining today</div><div class="sidebar-remaining-grid">${remHTML}`;
}

export function handleSyncFromSidebar() { handleSync(); }

// ── Meal sections ──────────────────────────────────────────────
function renderMealSections(entries) {
  const container=document.getElementById('log-meals'); if(!container)return;
  if(!entries||entries.length===0){showEmptyState();return;}
  const groups={}; CONFIG.labels.mealTypes.forEach(t=>{groups[t]=[];});
  entries.forEach(e=>{const key=CONFIG.labels.mealTypes.includes(e.mealType)?e.mealType:'Other';groups[key].push(e);});
  const html=CONFIG.labels.mealTypes.filter(t=>groups[t].length>0).map(t=>renderMealSection(t,groups[t])).join('');
  container.innerHTML=html||'<p class="log-empty">No entries for this day.</p>';
  bindEntryEvents(container);
}

// Meal header: 🔥 before kcal, macros visible on all devices
function renderMealSection(mealType, entries) {
  const meta=MEAL_META[mealType]||MEAL_META['Other'];
  const secCals=entries.reduce((s,e)=>s+(Number(e.calories)||0),0);
  const tot=entries.reduce((a,e)=>({protein:a.protein+(Number(e.protein)||0),carbs:a.carbs+(Number(e.carbs)||0),fat:a.fat+(Number(e.fat)||0),fibre:a.fibre+(Number(e.fibre)||0)}),{protein:0,carbs:0,fat:0,fibre:0});
  return `
    <div class="meal-section meal-section--${meta.mod}" data-meal-type="${mealType}">
      <div class="meal-section__header">
        <div class="meal-section__header-left">
          <div class="meal-icon-circle">${meta.emoji}</div>
          <span class="meal-section__name">${mealType}</span>
        </div>
        <div class="meal-section__macros">
          <span class="meal-section__macro-item">🔥<strong>${Math.round(secCals)}</strong>kcal</span>
          <span class="meal-section__macro-item">P<strong>${tot.protein.toFixed(1)}</strong></span>
          <span class="meal-section__macro-item">C<strong>${tot.carbs.toFixed(1)}</strong></span>
          <span class="meal-section__macro-item">F<strong>${tot.fat.toFixed(1)}</strong></span>
          <span class="meal-section__macro-item">Fi<strong>${tot.fibre.toFixed(1)}</strong></span>
        </div>
      </div>
      <div class="meal-section__entries">${entries.map(renderEntryRow).join('')}</div>
    </div>`;
}

// ── Entry row: name+macros left | [Xg] [★] [✕] right ─────────
function renderEntryRow(entry) {
  const cals=Math.round(Number(entry.calories)||0);
  const p=Number(entry.protein)||0, c=Number(entry.carbs)||0, f=Number(entry.fat)||0, fi=Number(entry.fibre)||0;
  const isFav=isFavFood(entry.foodNo);
  return `
    <div class="entry-row" data-row-index="${entry.rowIndex}" data-food-no="${entry.foodNo||''}" draggable="true">
      <div class="entry-row__main">
        <div class="entry-row__left">
          <span class="entry-row__name">${escHtml(entry.name)}</span>
          <div class="entry-row__macros">
            <span class="entry-row__cals">${cals} kcal</span>
            <span>P ${p.toFixed(1)}g</span>
            <span>C ${c.toFixed(1)}g</span>
            <span>F ${f.toFixed(1)}g</span>
            <span>Fi ${fi.toFixed(1)}g</span>
          </div>
        </div>
        <div class="entry-row__right">
          <button class="entry-row__amount-btn"
            data-row-index="${entry.rowIndex}" data-amount="${entry.amount}" data-unit="${entry.unit}"
            >${entry.amount}${entry.unit}</button>
          <button class="entry-row__star-btn ${isFav?'entry-row__star-btn--active':''}"
            data-food-no="${entry.foodNo||''}" aria-label="Toggle favourite">★</button>
          <button class="entry-row__delete-btn"
            data-row-index="${entry.rowIndex}" aria-label="Delete">✕</button>
        </div>
      </div>
    </div>`;
}

function isFavFood(foodNo) {
  if (!foodNo) return false;
  const fs=store.state.favourites;
  if (fs instanceof Set) return fs.has(Number(foodNo));
  if (Array.isArray(fs)) return fs.includes(Number(foodNo));
  return false;
}

function bindEntryEvents(container) {
  container.querySelectorAll('.entry-row__amount-btn').forEach(btn=>btn.addEventListener('click',()=>handleAmountEdit(btn)));
  container.querySelectorAll('.entry-row__delete-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();handleDelete(Number(btn.dataset.rowIndex));}));
  container.querySelectorAll('.entry-row__star-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();handleToggleFav(btn);}));
  bindDragMove(container);
  bindTouchDrag(container);
}

async function handleToggleFav(btn) {
  const foodNo=Number(btn.dataset.foodNo); if(!foodNo){showToast('Cannot favourite this entry','error');return;}
  const fs=store.state.favourites;
  const wasFav=fs instanceof Set?fs.has(foodNo):Array.isArray(fs)&&fs.includes(foodNo);
  if(fs instanceof Set){wasFav?fs.delete(foodNo):fs.add(foodNo);}else if(Array.isArray(fs)){store.state.favourites=wasFav?fs.filter(n=>n!==foodNo):[...fs,foodNo];}
  btn.classList.toggle('entry-row__star-btn--active',!wasFav);
  try{await toggleFavourite(foodNo);showToast(!wasFav?'★ Added':'Removed from favourites','success');}
  catch(err){if(fs instanceof Set){wasFav?fs.add(foodNo):fs.delete(foodNo);}btn.classList.toggle('entry-row__star-btn--active',wasFav);console.error('[log] toggleFav:',err);}
}

function handleAmountEdit(btn) {
  if(btn.querySelector('input'))return;
  const rowIndex=Number(btn.dataset.rowIndex),oldAmt=Number(btn.dataset.amount),unit=btn.dataset.unit;
  btn.innerHTML=`<input class="entry-amount-input" type="number" value="${oldAmt}" min="1" step="1" inputmode="decimal" style="width:52px;text-align:right;font-size:13px">`;
  const input=btn.querySelector('input'); input.focus(); input.select();
  const confirm=async()=>{const newAmt=parseFloat(input.value);if(!newAmt||newAmt<=0||newAmt===oldAmt){btn.textContent=`${oldAmt}${unit}`;return;}btn.textContent=`${newAmt}${unit}`;btn.dataset.amount=newAmt;await handleUpdate(rowIndex,newAmt);};
  input.addEventListener('blur',confirm);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'){btn.textContent=`${oldAmt}${unit}`;}});
}

async function handleUpdate(rowIndex, newAmount) {
  try{await updateLogEntry(rowIndex,newAmount);const date=store.state.currentDate||today();invalidateLogCache(date);store.state.dailyLog[date]=await getDailyLog(date);renderLog(date,store.state.dailyLog[date]);}
  catch(err){console.error('[log] handleUpdate:',err);showToast('Failed to update','error');}
}

async function handleDelete(rowIndex) {
  const date=store.state.currentDate||today();
  if(store.state.dailyLog[date]){store.state.dailyLog[date]=store.state.dailyLog[date].filter(e=>e.rowIndex!==rowIndex);}
  const rowEl=document.querySelector(`.entry-row[data-row-index="${rowIndex}"]`);
  if(rowEl){
    const section=rowEl.closest('.meal-section');
    rowEl.style.transition='opacity 0.15s,max-height 0.18s'; rowEl.style.opacity='0'; rowEl.style.maxHeight=rowEl.offsetHeight+'px';
    setTimeout(()=>{rowEl.style.maxHeight='0';rowEl.style.overflow='hidden';},10);
    setTimeout(()=>{rowEl.remove();if(section&&!section.querySelector('.entry-row')){section.style.opacity='0';setTimeout(()=>section.remove(),150);}},200);
  }
  renderMacroStrip(store.state.dailyLog[date]||[]);
  renderSidebarSummary(store.state.dailyLog[date]||[]);
  deleteLogEntry(rowIndex).then(()=>{invalidateLogCache(date);showToast('Entry deleted','success');})
    .catch(err=>{console.error('[log] handleDelete API failed:',err);showToast('Delete failed — please refresh','error');invalidateLogCache(date);});
}

// ── Mac drag & drop ────────────────────────────────────────────
function bindDragMove(container) {
  let dragRowIndex=null;
  container.addEventListener('dragstart',e=>{const row=e.target.closest('.entry-row');if(!row)return;dragRowIndex=Number(row.dataset.rowIndex);e.dataTransfer.effectAllowed='move';setTimeout(()=>row.style.opacity='0.4',0);});
  container.addEventListener('dragend',e=>{const row=e.target.closest('.entry-row');if(row)row.style.opacity='';dragRowIndex=null;});
  container.querySelectorAll('.meal-section').forEach(sec=>{
    sec.addEventListener('dragover',e=>{e.preventDefault();sec.classList.add('meal-section--drag-over');});
    sec.addEventListener('dragleave',()=>sec.classList.remove('meal-section--drag-over'));
    sec.addEventListener('drop',async e=>{e.preventDefault();sec.classList.remove('meal-section--drag-over');if(dragRowIndex&&sec.dataset.mealType)await moveEntry(dragRowIndex,sec.dataset.mealType);});
  });
}

// ── iPhone touch drag — with robust cleanup ────────────────────
function bindTouchDrag(container) {
  let _dragRow=null, _dragRowIndex=null, _clone=null, _timer=null;

  function cleanup() {
    clearTimeout(_timer); _timer=null;
    if (_clone) { _clone.remove(); _clone=null; }
    if (_dragRow) { _dragRow.style.opacity=''; _dragRow=null; }
    _dragRowIndex=null;
    container.querySelectorAll('.meal-section').forEach(s=>{s.classList.remove('meal-section--drag-over');s.classList.remove('meal-section--drop-target');});
  }

  container.addEventListener('touchstart', e=>{
    const row=e.target.closest('.entry-row'); if(!row)return;
    cleanup(); // always reset
    _dragRow=row; _dragRowIndex=Number(row.dataset.rowIndex);
    _timer=setTimeout(()=>{
      _clone=row.cloneNode(true);
      const rect=row.getBoundingClientRect();
      _clone.id='touch-drag-clone';
      _clone.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;opacity:0.85;z-index:9999;pointer-events:none;background:white;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.2)`;
      document.body.appendChild(_clone);
      row.style.opacity='0.3';
      container.querySelectorAll('.meal-section').forEach(s=>s.classList.add('meal-section--drop-target'));
    },320);
  },{passive:true});

  container.addEventListener('touchmove', e=>{
    if(!_clone)return;
    e.preventDefault();
    const touch=e.touches[0];
    _clone.style.top=(touch.clientY-_clone.offsetHeight/2)+'px';
    const el=document.elementFromPoint(touch.clientX,touch.clientY);
    const sec=el?.closest('.meal-section[data-meal-type]');
    container.querySelectorAll('.meal-section').forEach(s=>s.classList.toggle('meal-section--drag-over',s===sec));
  },{passive:false});

  container.addEventListener('touchend', async e=>{
    clearTimeout(_timer); _timer=null;
    if(!_clone){cleanup();return;}
    const touch=e.changedTouches[0];
    const el=document.elementFromPoint(touch.clientX,touch.clientY);
    const targetSection=el?.closest('.meal-section[data-meal-type]');
    const savedRowIndex=_dragRowIndex;
    const savedMeal=targetSection?.dataset.mealType;
    cleanup();
    if(savedMeal&&savedRowIndex)await moveEntry(savedRowIndex,savedMeal);
  },{passive:true});

  container.addEventListener('touchcancel', ()=>cleanup(), {passive:true});
}

// Right-click context menu (Mac)
document.addEventListener('contextmenu', e=>{
  const row=e.target.closest('.entry-row'); if(!row)return;
  const rowIndex=Number(row.dataset.rowIndex);
  const entry=(store.state.dailyLog[store.state.currentDate||today()]||[]).find(ev=>ev.rowIndex===rowIndex);
  if(!entry)return; e.preventDefault();
  showContextMenu(e.clientX,e.clientY,rowIndex,entry.mealType);
});

function showContextMenu(x,y,rowIndex,currentMeal) {
  document.getElementById('ctx-move-menu')?.remove();
  const menu=document.createElement('div'); menu.id='ctx-move-menu'; menu.className='ctx-move-menu';
  const vw=window.innerWidth, vh=window.innerHeight;
  menu.style.cssText=`position:fixed;left:${Math.min(x,vw-180)}px;top:${Math.min(y,vh-200)}px;z-index:9999`;
  menu.innerHTML=`<div class="ctx-move-menu__title">Move to meal…</div>${CONFIG.labels.mealTypes.filter(t=>t!==currentMeal).map(t=>`<button class="ctx-move-menu__item" data-meal="${t}">${MEAL_META[t]?.emoji||''} ${t}</button>`).join('')}`;
  document.body.appendChild(menu);
  menu.querySelectorAll('.ctx-move-menu__item').forEach(btn=>btn.addEventListener('click',async()=>{menu.remove();await moveEntry(rowIndex,btn.dataset.meal);}));
  setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),50);
}

async function moveEntry(rowIndex, targetMeal) {
  try {
    const date=store.state.currentDate||today();
    const entry=(store.state.dailyLog[date]||[]).find(e=>e.rowIndex===rowIndex);
    if(!entry||entry.mealType===targetMeal)return;
    if(store.state.dailyLog[date]){store.state.dailyLog[date]=store.state.dailyLog[date].map(e=>e.rowIndex===rowIndex?{...e,mealType:targetMeal}:e);}
    renderLog(date,store.state.dailyLog[date]); showToast(`Moved to ${targetMeal} ✓`,'success');
    await deleteLogEntry(rowIndex); await addLogEntry({...entry,mealType:targetMeal,rowIndex:undefined});
    invalidateLogCache(date); store.state.dailyLog[date]=await getDailyLog(date); renderLog(date,store.state.dailyLog[date]);
  } catch(err){console.error('[log] moveEntry:',err);showToast('Failed to move','error');}
}

async function handleSync() {
  const date=store.state.currentDate||today();
  const btns=['log-sync-btn-mobile','sidebar-save-btn'].map(id=>document.getElementById(id)).filter(Boolean);
  btns.forEach(b=>{b.disabled=true;b.textContent='Saving…';});
  try{await syncDailySummary(date);showToast('Saved to DailySummary ✓','success');}
  catch(err){console.error('[log] handleSync:',err);showToast('Save failed','error');}
  finally{btns.forEach(b=>{b.disabled=false;b.textContent='Save Summary';});}
}

function showEmptyState() {
  const el=document.getElementById('log-meals');
  if(el)el.innerHTML=`<div class="log-empty-state"><span class="log-empty-state__icon">🥗</span><p class="log-empty-state__text">No entries yet</p><p class="log-empty-state__sub">Search above to add foods</p></div>`;
}

function sumNutrients(entries) {
  return (entries||[]).reduce((acc,e)=>({calories:acc.calories+(Number(e.calories)||0),protein:acc.protein+(Number(e.protein)||0),carbs:acc.carbs+(Number(e.carbs)||0),fat:acc.fat+(Number(e.fat)||0),fibre:acc.fibre+(Number(e.fibre)||0),sodium:acc.sodium+(Number(e.sodium)||0),potassium:acc.potassium+(Number(e.potassium)||0)}),{calories:0,protein:0,carbs:0,fat:0,fibre:0,sodium:0,potassium:0});
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escAttr(s){return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
