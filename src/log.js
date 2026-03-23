// ============================================================
// log.js — Today's Log
// Fixes: iPhone macro strip realtime on delete, actual/target format,
//        star+delete buttons, date picker (no duplicate row)
// ============================================================
import { CONFIG } from '../config.js';
import { getDailyLog, deleteLogEntry, updateLogEntry, syncDailySummary, addLogEntry } from './api.js';
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

// ── Date helpers ───────────────────────────────────────────────
function dateToInputValue(dateStr) {
  try {
    const parts = dateStr.replace(/^[^,]+,/, '').split('/');
    const d=parseInt(parts[0]), m=parseInt(parts[1])-1, y=2000+parseInt(parts[2]);
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  } catch { return ''; }
}
function inputValueToDate(val) {
  try {
    const [y,m,d] = val.split('-').map(Number);
    return formatDate(new Date(y, m-1, d));
  } catch { return today(); }
}
function formatDateReadable(dateStr) {
  try {
    const parts = dateStr.replace(/^[^,]+,/, '').split('/');
    const day=parseInt(parts[0]), month=parseInt(parts[1])-1, year=2000+parseInt(parts[2]);
    const d = new Date(year, month, day);
    const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${DOW[d.getDay()]} ${day} ${MON[month]}`;
  } catch { return dateStr; }
}

async function setDate(newDate) {
  store.setCurrentDate(newDate);
  const displayEl = document.getElementById('log-date-display');
  if (displayEl) displayEl.textContent = formatDateReadable(newDate);
  const labelEl = document.getElementById('log-date-label');
  if (labelEl) labelEl.textContent = newDate;
  const nextBtn = document.getElementById('log-next');
  if (nextBtn) nextBtn.disabled = newDate === formatDate(new Date());
  try { const m = await import('./main.js'); m.notifyDateChange?.(); } catch {}
  await loadAndRender(newDate);
}

// ── Shell: Mobile — no duplicate date row ──────────────────────
function renderLogShellMobile(date) {
  const view = document.getElementById('view-today');
  if (!view) return;
  const title = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  view.innerHTML = `
    <div class="log-page">
      <div class="log-page-header-row">
        <div class="page-title-wrap">
          <input class="page-title-input" id="log-title-input" type="text"
            value="${escAttr(title)}" maxlength="28" spellcheck="false" aria-label="Page title">
        </div>
        <div class="log-date-picker-wrap">
          <button class="log-date-btn" id="log-date-btn">
            <span class="log-date-btn__text" id="log-date-display">${formatDateReadable(date)}</span>
            <span class="log-date-btn__chevron">▾</span>
          </button>
          <input class="log-date-input" id="log-date-input" type="date"
            value="${dateToInputValue(date)}" max="${dateToInputValue(today())}">
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
  // Date picker
  const dateBtn = document.getElementById('log-date-btn');
  const dateInput = document.getElementById('log-date-input');
  dateBtn?.addEventListener('click', () => { dateInput?.showPicker?.() || dateInput?.click(); });
  dateInput?.addEventListener('change', async () => {
    if (dateInput.value) await setDate(inputValueToDate(dateInput.value));
  });
}

// ── Shell: Mac ─────────────────────────────────────────────────
function renderLogShellMac(date) {
  const view = document.getElementById('view-today');
  if (!view) return;
  const title   = store.state.settings?.day_title || CONFIG.labels.defaultDayTitle || "Today's log";
  const isToday = date === formatDate(new Date());
  view.innerHTML = `
    <div class="log-page">
      <header class="page-header log-mac-header">
        <div class="page-title-wrap">
          <input class="page-title-input" id="log-title-input" type="text"
            value="${escAttr(title)}" maxlength="28" spellcheck="false" aria-label="Page title">
          <div class="page-title-edit-hint">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M7 1.5l1.5 1.5-5 5L2 8.5l.5-1.5z"/></svg> click to edit
          </div>
        </div>
        <div class="log-mac-date-nav">
          <button class="log-nav-btn log-nav-btn--sm" id="log-prev">‹</button>
          <span class="log-mac-date-nav__label" id="log-date-label">${date}</span>
          <button class="log-nav-btn log-nav-btn--sm" id="log-next" ${isToday?'disabled':''}>›</button>
        </div>
        <span class="page-header__spacer"></span>
        <div class="mac-search-pill-wrap" id="mac-search-wrap">
          <div class="mac-search-pill" id="mac-search-pill">
            <svg class="mac-search-pill__icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="5.5" cy="5.5" r="3.5"/><line x1="8.5" y1="8.5" x2="12" y2="12"/></svg>
            <input class="mac-search-pill__input" id="mac-search-input" type="text" placeholder="Add food..." autocomplete="off">
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
          </div>
        </div>
      </header>
      <div id="log-meals" class="log-meals"></div>
    </div>`;
  document.getElementById('log-prev')?.addEventListener('click', () => navigateDate(-1));
  document.getElementById('log-next')?.addEventListener('click', () => navigateDate(1));
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
    try { const {updateSettings}=await import('./api.js'); await updateSettings({day_title:val}); if(store.state.settings) store.state.settings.day_title=val; }
    catch(err){console.error('[log] day_title:',err);}
  });
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'){input.value=store.state.settings?.day_title||'';input.blur();}});
}

function bindMobileSearch(id) {
  const input=document.getElementById(id); if(!input) return;
  input.addEventListener('focus',async()=>{
    input.blur();
    try{const{openSearchSheet}=await import('./search.js');openSearchSheet();}
    catch(err){console.error('[log] openSearchSheet:',err);}
  });
}

let _macSelFood=null;
function bindMacSearch() {
  const input=document.getElementById('mac-search-input'), pill=document.getElementById('mac-search-pill'),
        dropdown=document.getElementById('mac-search-dropdown'), rows=document.getElementById('mac-search-rows'),
        addBar=document.getElementById('mac-add-bar'), addBtn=document.getElementById('mac-add-btn'),
        amountIn=document.getElementById('mac-add-amount'), calSpan=document.getElementById('mac-add-cal');
  if(!input||!dropdown) return;
  const showDD=()=>{pill.classList.add('mac-search-pill--expanded');dropdown.classList.add('mac-search-dropdown--visible');};
  const hideDD=()=>{pill.classList.remove('mac-search-pill--expanded');dropdown.classList.remove('mac-search-dropdown--visible');addBar.style.display='none';_macSelFood=null;};
  input.addEventListener('focus',()=>{showDD();renderDD(getFavFoods().slice(0,6));});
  input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();renderDD(q?(store.state.foods||[]).filter(f=>f.name?.toLowerCase().includes(q)).slice(0,6):getFavFoods().slice(0,6));});
  document.addEventListener('click',e=>{if(!document.getElementById('mac-search-wrap')?.contains(e.target))hideDD();});
  function getFavFoods(){const fs=store.state.favourites;return(store.state.foods||[]).filter(f=>fs instanceof Set?fs.has(f.no):Array.isArray(fs)&&fs.includes(f.no));}
  function isFav(no){const fs=store.state.favourites;return fs instanceof Set?fs.has(no):Array.isArray(fs)&&fs.includes(no);}
  function renderDD(foods){
    rows.innerHTML=foods.map(f=>`<div class="mac-search-dropdown-row" data-no="${f.no}">
      <svg class="mac-search-drow__star" viewBox="0 0 12 12" fill="${isFav(f.no)?'var(--color-accent)':'none'}" stroke="var(--color-accent)" stroke-width="1"><path d="M6 .5l1.3 2.8 3 .4-2.2 2.1.5 3L6 7.5l-2.6 1.3.5-3L1.7 3.7l3-.4z"/></svg>
      <span class="mac-search-drow__name">${escHtml(f.name)}</span>
      <span class="mac-search-drow__meta">${calcCals(f,100)} cal/100g</span></div>`).join('');
    rows.querySelectorAll('.mac-search-dropdown-row').forEach(r=>r.addEventListener('click',()=>selectFood(Number(r.dataset.no))));
  }
  function selectFood(no){
    const food=(store.state.foods||[]).find(f=>f.no===no);if(!food)return;
    _macSelFood=food;
    rows.querySelectorAll('.mac-search-dropdown-row').forEach(r=>r.classList.toggle('mac-search-dropdown-row--selected',Number(r.dataset.no)===no));
    amountIn.value=store.state.lastAmounts?.[no]||100;
    document.getElementById('mac-add-bar-name').textContent=(food.name||'').substring(0,22);
    updateCal();addBar.style.display='flex';
  }
  function updateCal(){if(_macSelFood)calSpan.textContent=calcCals(_macSelFood,parseFloat(amountIn.value)||0)+' cal';}
  amountIn.addEventListener('input',updateCal);
  addBtn.addEventListener('click',async()=>{
    if(!_macSelFood)return;const food=_macSelFood,amount=parseFloat(amountIn.value),meal=document.getElementById('mac-add-meal')?.value||'Breakfast';
    if(!amount||amount<=0){showToast('Enter a valid amount','error');return;}
    addBtn.disabled=true;addBtn.textContent='…';
    try{
      const date=store.state.currentDate||today(),ratio=amount/(food.amount||100);
      await addLogEntry({date,mealType:meal,foodNo:food.no,name:food.name,amount,unit:food.unit||'g',
        calories:Math.round(calcCals(food,food.amount||100)*ratio),protein:r1((food.protein||0)*ratio),
        carbs:r1((food.carbs||0)*ratio),fat:r1((food.fat||0)*ratio),fibre:r1((food.fibre||0)*ratio),
        sodium:r1((food.sodium||0)*ratio),potassium:r1((food.potassium||0)*ratio)});
      if(!store.state.lastAmounts)store.state.lastAmounts={};store.state.lastAmounts[food.no]=amount;
      invalidateLogCache(date);store.state.dailyLog[date]=await getDailyLog(date);
      renderLog(date,store.state.dailyLog[date]);showToast(`${food.name} added ✓`,'success');hideDD();input.value='';
    }catch(err){console.error('[log] mac add:',err);showToast('Failed to add','error');}
    finally{addBtn.disabled=false;addBtn.textContent='+ Add';}
  });
}

function calcCals(food,amount){const r=amount/(food.amount||100);return Math.round((food.fat||0)*r*9+(food.carbs||0)*r*4+(food.protein||0)*r*4);}
const r1=v=>Math.round(v*10)/10;

async function navigateDate(delta) {
  const d=parseDate(store.state.currentDate||today());d.setDate(d.getDate()+delta);
  await setDate(formatDate(d));
}

async function loadAndRender(date) {
  const el=document.getElementById('log-meals');if(el)el.innerHTML='<p class="log-loading">Loading…</p>';
  try{
    if(!store.state.dailyLog[date])store.state.dailyLog[date]=await getDailyLog(date);
    renderLog(date,store.state.dailyLog[date]);
  }catch(err){console.error('[log] loadAndRender:',err);showToast('Failed to load log','error');showEmptyState();}
}

function renderLog(date,entries){
  renderMacroStrip(entries);
  renderMealSections(entries);
  renderSidebarSummary(entries);
}

// ── iPhone macro strip — actual / target format ────────────────
function renderMacroStrip(entries) {
  const el=document.getElementById('log-macro-strip');if(!el)return;
  const t=sumNutrients(entries),s=store.state.settings||{};
  const chips=[
    {emoji:'🔥',actual:Math.round(t.calories),target:Number(s.calorie_target)||0,unit:'kcal',isInt:true},
    {emoji:'💪',actual:t.protein, target:Number(s.protein_target)||0,unit:'g'},
    {emoji:'🌾',actual:t.carbs,   target:Number(s.carbs_target)||0, unit:'g'},
    {emoji:'🥑',actual:t.fat,     target:Number(s.fat_target)||0,   unit:'g'},
  ];
  el.innerHTML=chips.map(c=>{
    const disp=c.isInt?c.actual:c.actual.toFixed(1);
    const tDisp=c.isInt?c.target:c.target;
    const pct=c.target>0?Math.min(c.actual/c.target*100,100):0;
    const ratio=c.target>0?c.actual/c.target:0;
    const over=ratio>CONFIG.targets.dangerThreshold,warn=ratio>CONFIG.targets.warningThreshold;
    const fillCls=over?'iphone-macro-chip__fill--danger':warn?'iphone-macro-chip__fill--warn':'';
    const chipCls=over?'iphone-macro-chip--danger':warn?'iphone-macro-chip--warn':'';
    const label=c.target>0?`${disp} / ${tDisp}${c.unit}`:`${disp}${c.unit}`;
    return `<div class="iphone-macro-chip ${chipCls}">
      <span class="iphone-macro-chip__emoji">${c.emoji}</span>
      <span class="iphone-macro-chip__val">${label}</span>
      <div class="iphone-macro-chip__bar"><div class="iphone-macro-chip__fill ${fillCls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

export function renderSidebarSummary(entries) {
  const el=document.getElementById('sidebar-summary');if(!el)return;
  const date=store.state.currentDate||today();
  const data=entries!==undefined?entries:(store.state.dailyLog?.[date]||[]);
  const t=sumNutrients(data),s=store.state.settings||{};
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
  const bar=(value,target)=>{const pct=target>0?Math.min(value/target*100,100):0,ratio=target>0?value/target:0;const cls=ratio>CONFIG.targets.dangerThreshold?'sidebar-bar__fill--danger':ratio>CONFIG.targets.warningThreshold?'sidebar-bar__fill--warning':'';return `<div class="sidebar-bar"><div class="sidebar-bar__fill ${cls}" style="width:${pct}%"></div></div>`;};
  const mHTML=macros.map(m=>{const disp=m.label==='Calories'?Math.round(m.value):m.value.toFixed(1),tDisp=m.label==='Calories'?Math.round(m.target):m.target;return `<div class="sidebar-macro"><div class="sidebar-macro__header"><span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span><span class="sidebar-macro__value">${disp} / ${tDisp}${m.unit}</span></div>${bar(m.value,m.target)}</div>`;}).join('');
  const minHTML=minerals.map(m=>`<div class="sidebar-macro"><div class="sidebar-macro__header"><span class="sidebar-macro__label"><span class="sidebar-macro__emoji">${m.emoji}</span>${m.label}</span><span class="sidebar-macro__value">${Math.round(m.value)} / ${Math.round(m.target)}${m.unit}</span></div>${bar(m.value,m.target)}</div>`).join('');
  const remHTML=macros.slice(0,4).map(m=>{const r=Math.max(0,m.label==='Calories'?Math.round(m.target-m.value):r1(m.target-m.value));return `<div class="sidebar-remaining-card"><div class="sidebar-remaining-card__label">${m.emoji} ${m.label}</div><div class="sidebar-remaining-card__value">${r}${m.unit}</div></div>`;}).join('');
  el.innerHTML=`${mHTML}<hr class="sidebar-divider"><div class="sidebar-minerals-title">Minerals</div>${minHTML}<hr class="sidebar-divider"><div class="sidebar-remaining-title">Remaining today</div><div class="sidebar-remaining-grid">${remHTML}`;
}

export function handleSyncFromSidebar(){handleSync();}

function renderMealSections(entries) {
  const container=document.getElementById('log-meals');if(!container)return;
  if(!entries||entries.length===0){showEmptyState();return;}
  const groups={};CONFIG.labels.mealTypes.forEach(t=>{groups[t]=[];});
  entries.forEach(e=>{const key=CONFIG.labels.mealTypes.includes(e.mealType)?e.mealType:'Other';groups[key].push(e);});
  const html=CONFIG.labels.mealTypes.filter(t=>groups[t].length>0).map(t=>renderMealSection(t,groups[t])).join('');
  container.innerHTML=html||'<p class="log-empty">No entries for this day.</p>';
  bindEntryEvents(container);
}

function renderMealSection(mealType,entries) {
  const meta=MEAL_META[mealType]||MEAL_META['Other'];
  const secCals=entries.reduce((s,e)=>s+(Number(e.calories)||0),0);
  const tot=entries.reduce((a,e)=>({protein:a.protein+(Number(e.protein)||0),carbs:a.carbs+(Number(e.carbs)||0),fat:a.fat+(Number(e.fat)||0),fibre:a.fibre+(Number(e.fibre)||0)}),{protein:0,carbs:0,fat:0,fibre:0});
  return `<div class="meal-section meal-section--${meta.mod}" data-meal-type="${mealType}">
    <div class="meal-section__header">
      <div class="meal-section__header-left"><div class="meal-icon-circle">${meta.emoji}</div><span class="meal-section__name">${mealType}</span></div>
      <div class="meal-section__macros">
        <span class="meal-section__macro-item"><strong>${Math.round(secCals)}</strong> cal</span>
        <span class="meal-section__macro-item">P <strong>${tot.protein.toFixed(1)}g</strong></span>
        <span class="meal-section__macro-item">C <strong>${tot.carbs.toFixed(1)}g</strong></span>
        <span class="meal-section__macro-item">F <strong>${tot.fat.toFixed(1)}g</strong></span>
        <span class="meal-section__macro-item">Fi <strong>${tot.fibre.toFixed(1)}g</strong></span>
      </div>
    </div>
    <div class="meal-section__entries">${entries.map(renderEntryRow).join('')}</div>
  </div>`;
}

// ── Entry row — ★ (star/fav) + ❌ (delete) on the right ──────
function renderEntryRow(entry) {
  const cals=Math.round(Number(entry.calories)||0),na=Math.round(Number(entry.sodium)||0),k=Math.round(Number(entry.potassium)||0);
  const p=Number(entry.protein)||0,c=Number(entry.carbs)||0,f=Number(entry.fat)||0;
  const isFav=isEntryFavourited(entry.foodNo);
  return `<div class="entry-row" data-row-index="${entry.rowIndex}" data-food-no="${entry.foodNo||''}" draggable="true">
    <div class="entry-row__main">
      <div class="entry-row__drag-handle" title="Drag to move">⠿</div>
      <div class="entry-row__left">
        <span class="entry-row__name">${escHtml(entry.name)}</span>
        <div class="entry-row__sub">
          <button class="entry-row__amount-btn" data-row-index="${entry.rowIndex}" data-amount="${entry.amount}" data-unit="${entry.unit}">${entry.amount}${entry.unit}</button>
          <span class="entry-row__cals">${cals} kcal</span>
        </div>
        <div class="entry-row__macros">P ${p.toFixed(1)} &nbsp; C ${c.toFixed(1)} &nbsp; F ${f.toFixed(1)} &nbsp;<span class="entry-row__minerals">Na ${na}mg &nbsp; K ${k}mg</span></div>
      </div>
      <div class="entry-row__actions">
        <button class="entry-row__star-btn ${isFav?'entry-row__star-btn--active':''}" data-food-no="${entry.foodNo||''}" aria-label="${isFav?'Remove from favourites':'Add to favourites'}" title="Toggle favourite">★</button>
        <button class="entry-row__delete-btn" data-row-index="${entry.rowIndex}" aria-label="Delete">❌</button>
      </div>
    </div>
  </div>`;
}

function isEntryFavourited(foodNo) {
  if(!foodNo)return false;const fs=store.state.favourites;
  return fs instanceof Set?fs.has(Number(foodNo)):Array.isArray(fs)&&fs.includes(Number(foodNo));
}

function bindEntryEvents(container) {
  container.querySelectorAll('.entry-row__amount-btn').forEach(btn=>btn.addEventListener('click',()=>handleAmountEdit(btn)));
  container.querySelectorAll('.entry-row__delete-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();handleDelete(Number(btn.dataset.rowIndex));}));
  container.querySelectorAll('.entry-row__star-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();handleStarToggle(btn);}));
  bindDragMove(container);
  bindLongPressMove(container);
}

async function handleStarToggle(btn) {
  const foodNo=Number(btn.dataset.foodNo);if(!foodNo){showToast('Cannot favourite this item','error');return;}
  try{
    const{toggleFavourite}=await import('./api.js');
    const result=await toggleFavourite(foodNo);
    const isNowFav=result.added;
    if(!store.state.favourites)store.state.favourites=new Set();
    if(isNowFav){if(store.state.favourites instanceof Set)store.state.favourites.add(foodNo);}
    else{if(store.state.favourites instanceof Set)store.state.favourites.delete(foodNo);}
    document.querySelectorAll(`.entry-row__star-btn[data-food-no="${foodNo}"]`).forEach(b=>{
      b.classList.toggle('entry-row__star-btn--active',isNowFav);
      b.setAttribute('aria-label',isNowFav?'Remove from favourites':'Add to favourites');
    });
    showToast(isNowFav?'★ Added to favourites':'Removed from favourites','success');
  }catch(err){console.error('[log] star toggle:',err);showToast('Failed to update favourite','error');}
}

function handleAmountEdit(btn) {
  if(btn.querySelector('input'))return;
  const rowIndex=Number(btn.dataset.rowIndex),oldAmt=Number(btn.dataset.amount),unit=btn.dataset.unit;
  btn.innerHTML=`<input class="entry-amount-input" type="number" value="${oldAmt}" min="1" step="1" inputmode="decimal" style="width:56px;text-align:right;">`;
  const input=btn.querySelector('input');input.focus();input.select();
  const confirm=async()=>{const newAmt=parseFloat(input.value);if(!newAmt||newAmt<=0||newAmt===oldAmt){btn.textContent=`${oldAmt}${unit}`;return;}btn.textContent=`${newAmt}${unit}`;btn.dataset.amount=newAmt;await handleUpdate(rowIndex,newAmt);};
  input.addEventListener('blur',confirm);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'){btn.textContent=`${oldAmt}${unit}`;}});
}

async function handleUpdate(rowIndex,newAmount) {
  try{
    await updateLogEntry(rowIndex,newAmount);
    const date=store.state.currentDate||today();invalidateLogCache(date);
    store.state.dailyLog[date]=await getDailyLog(date);
    renderMacroStrip(store.state.dailyLog[date]);renderSidebarSummary(store.state.dailyLog[date]);renderMealSections(store.state.dailyLog[date]);
  }catch(err){console.error('[log] handleUpdate:',err);showToast('Failed to update amount','error');}
}

// ── Delete: immediate store update → immediate strip/sidebar refresh ──
async function handleDelete(rowIndex) {
  try{
    await deleteLogEntry(rowIndex);
    const date=store.state.currentDate||today();
    // Update store FIRST
    if(store.state.dailyLog[date]){
      store.state.dailyLog[date]=store.state.dailyLog[date].filter(e=>e.rowIndex!==rowIndex);
    }
    invalidateLogCache(date);
    // Animate DOM removal
    const rowEl=document.querySelector(`.entry-row[data-row-index="${rowIndex}"]`);
    if(rowEl){
      const section=rowEl.closest('.meal-section');
      rowEl.style.transition='opacity 0.18s,max-height 0.2s';rowEl.style.opacity='0';rowEl.style.maxHeight=rowEl.offsetHeight+'px';
      setTimeout(()=>{rowEl.style.maxHeight='0';rowEl.style.overflow='hidden';},10);
      setTimeout(()=>{rowEl.remove();if(section&&!section.querySelector('.entry-row')){section.style.transition='opacity 0.15s';section.style.opacity='0';setTimeout(()=>section.remove(),160);}},220);
    }
    // Refresh summaries IMMEDIATELY
    const updated=store.state.dailyLog[date]||[];
    renderMacroStrip(updated);
    renderSidebarSummary(updated);
    showToast('Entry deleted','success');
  }catch(err){console.error('[log] handleDelete:',err);showToast('Failed to delete entry','error');}
}

function bindDragMove(container){
  let dragRowIndex=null;
  container.addEventListener('dragstart',e=>{const row=e.target.closest('.entry-row');if(!row)return;dragRowIndex=Number(row.dataset.rowIndex);e.dataTransfer.effectAllowed='move';setTimeout(()=>row.style.opacity='0.4',0);});
  container.addEventListener('dragend',e=>{const row=e.target.closest('.entry-row');if(row)row.style.opacity='';dragRowIndex=null;container.querySelectorAll('.meal-section--drag-over').forEach(s=>s.classList.remove('meal-section--drag-over'));});
  container.querySelectorAll('.meal-section').forEach(section=>{
    section.addEventListener('dragover',e=>{e.preventDefault();section.classList.add('meal-section--drag-over');});
    section.addEventListener('dragleave',e=>{if(!section.contains(e.relatedTarget))section.classList.remove('meal-section--drag-over');});
    section.addEventListener('drop',async e=>{e.preventDefault();section.classList.remove('meal-section--drag-over');if(!dragRowIndex)return;const targetMeal=section.dataset.mealType;if(!targetMeal)return;await moveEntry(dragRowIndex,targetMeal);});
  });
}

function bindLongPressMove(container){
  let timer=null;
  container.addEventListener('touchstart',e=>{const row=e.target.closest('.entry-row');if(!row)return;const rowIndex=Number(row.dataset.rowIndex);timer=setTimeout(()=>showMoveMenu(rowIndex,row),600);},{passive:true});
  container.addEventListener('touchend',()=>clearTimeout(timer));
  container.addEventListener('touchmove',()=>clearTimeout(timer),{passive:true});
  container.addEventListener('touchcancel',()=>clearTimeout(timer));
}

function showMoveMenu(rowIndex,rowEl){
  document.getElementById('move-menu')?.remove();
  const entry=(store.state.dailyLog[store.state.currentDate||today()]||[]).find(e=>e.rowIndex===rowIndex);if(!entry)return;
  const menu=document.createElement('div');menu.id='move-menu';menu.className='move-menu';
  menu.innerHTML=`<div class="move-menu__title">Move "${entry.name.substring(0,20)}" to…</div>${CONFIG.labels.mealTypes.filter(t=>t!==entry.mealType).map(t=>`<button class="move-menu__item" data-meal="${t}">${MEAL_META[t]?.emoji||''} ${t}</button>`).join('')}<button class="move-menu__cancel">Cancel</button>`;
  document.body.appendChild(menu);requestAnimationFrame(()=>menu.classList.add('move-menu--visible'));
  menu.querySelectorAll('.move-menu__item').forEach(btn=>btn.addEventListener('click',async()=>{menu.remove();await moveEntry(rowIndex,btn.dataset.meal);}));
  menu.querySelector('.move-menu__cancel').addEventListener('click',()=>menu.remove());
}

document.addEventListener('contextmenu',e=>{
  const row=e.target.closest('.entry-row');if(!row)return;
  const entry=(store.state.dailyLog[store.state.currentDate||today()]||[]).find(ev=>ev.rowIndex===Number(row.dataset.rowIndex));if(!entry)return;
  e.preventDefault();document.getElementById('ctx-move-menu')?.remove();
  const menu=document.createElement('div');menu.id='ctx-move-menu';menu.className='ctx-move-menu';
  menu.style.cssText=`position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:9999`;
  menu.innerHTML=`<div class="ctx-move-menu__title">Move to meal…</div>${CONFIG.labels.mealTypes.filter(t=>t!==entry.mealType).map(t=>`<button class="ctx-move-menu__item" data-meal="${t}">${MEAL_META[t]?.emoji||''} ${t}</button>`).join('')}`;
  document.body.appendChild(menu);
  menu.querySelectorAll('.ctx-move-menu__item').forEach(btn=>btn.addEventListener('click',async()=>{menu.remove();await moveEntry(Number(row.dataset.rowIndex),btn.dataset.meal);}));
  setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),50);
});

async function moveEntry(rowIndex,targetMeal){
  try{
    const date=store.state.currentDate||today();
    const entry=(store.state.dailyLog[date]||[]).find(e=>e.rowIndex===rowIndex);if(!entry)return;
    await deleteLogEntry(rowIndex);await addLogEntry({...entry,mealType:targetMeal,rowIndex:undefined});
    invalidateLogCache(date);store.state.dailyLog[date]=await getDailyLog(date);
    renderLog(date,store.state.dailyLog[date]);showToast(`Moved to ${targetMeal} ✓`,'success');
  }catch(err){console.error('[log] moveEntry:',err);showToast('Failed to move entry','error');}
}

async function handleSync(){
  const date=store.state.currentDate||today();
  const btns=['log-sync-btn-mobile','sidebar-save-btn'].map(id=>document.getElementById(id)).filter(Boolean);
  btns.forEach(b=>{b.disabled=true;b.textContent='Saving…';});
  try{await syncDailySummary(date);showToast('Saved to DailySummary ✓','success');}
  catch(err){console.error('[log] handleSync:',err);showToast('Save failed','error');}
  finally{btns.forEach(b=>{b.disabled=false;b.textContent='Save Summary';});}
}

function showEmptyState(){const el=document.getElementById('log-meals');if(el)el.innerHTML=`<div class="log-empty-state"><span class="log-empty-state__icon">🥗</span><p class="log-empty-state__text">No entries yet</p><p class="log-empty-state__sub">Search above to add foods</p></div>`;}
function sumNutrients(entries){return(entries||[]).reduce((acc,e)=>({calories:acc.calories+(Number(e.calories)||0),protein:acc.protein+(Number(e.protein)||0),carbs:acc.carbs+(Number(e.carbs)||0),fat:acc.fat+(Number(e.fat)||0),fibre:acc.fibre+(Number(e.fibre)||0),sodium:acc.sodium+(Number(e.sodium)||0),potassium:acc.potassium+(Number(e.potassium)||0)}),{calories:0,protein:0,carbs:0,fat:0,fibre:0,sodium:0,potassium:0});}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escAttr(s){return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
