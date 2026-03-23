// ============================================================
// main.js — Router
// Fixed: date picker covers full pill area, clean nav-bar
// ============================================================
import { isLoggedIn, renderAuthScreen, logout } from './auth.js';
import { store } from './store.js';
import { getSettings } from './api.js';
import { today, formatDate, parseDate } from './utils.js';
import { initLog, renderSidebarSummary } from './log.js';
import { initSettings } from './settings.js';
import { initFavourites } from './search.js';

function renderAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-shell">
      <main class="main-content" id="main-content">
        <div class="page-placeholder">Loading…</div>
      </main>
      <nav class="tab-bar" id="tab-bar">
        <button class="tab-bar__item" data-tab="today">
          <span class="tab-bar__icon">📋</span>
          <span class="tab-bar__label">Today</span>
        </button>
        <button class="tab-bar__item" data-tab="favourites">
          <span class="tab-bar__icon">⭐</span>
          <span class="tab-bar__label">Favourites</span>
        </button>
        <button class="tab-bar__item" data-tab="meals">
          <span class="tab-bar__icon">🍽</span>
          <span class="tab-bar__label">Meals</span>
        </button>
        <button class="tab-bar__item" data-tab="history">
          <span class="tab-bar__icon">📅</span>
          <span class="tab-bar__label">History</span>
        </button>
        <button class="tab-bar__item" data-tab="settings">
          <span class="tab-bar__icon">⚙️</span>
          <span class="tab-bar__label">Settings</span>
        </button>
        <!-- Date picker — full-area clickable pill -->
        <label class="nav-date-wrap" id="nav-date-wrap" title="Change date">
          <span class="nav-date-pill" id="nav-date-pill"></span>
          <input type="date" id="nav-date-input" class="nav-date-input" aria-label="Select date">
        </label>
        <button class="tab-bar__item tab-bar__item--logout" id="logout-btn">
          <span class="tab-bar__icon">🔓</span>
          <span class="tab-bar__label">Logout</span>
        </button>
      </nav>
    </div>`;
  setupDatePicker();
  setupTabBar();
  navigateTo('today');
}

// ── Date helpers ───────────────────────────────────────────────
function internalToISO(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.replace(/^[^,]+,/, '').split('/');
    const d = parseInt(parts[0]), m = parseInt(parts[1]), y = 2000 + parseInt(parts[2]);
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  } catch { return ''; }
}

function ISOToInternal(iso) {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m-1, d);
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${DOW[date.getDay()]},${d}/${m}/${String(y).slice(-2)}`;
  } catch { return ''; }
}

function formatPillDisplay(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.replace(/^[^,]+,/, '').split('/');
    const day   = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year  = 2000 + parseInt(parts[2]);
    const d     = new Date(year, month, day);
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return dateStr === today()
      ? `Today · ${DOW[d.getDay()]}, ${day} ${MON[month]}`
      : `${DOW[d.getDay()]}, ${day} ${MON[month]}`;
  } catch { return dateStr; }
}

function updateDatePill() {
  const pill  = document.getElementById('nav-date-pill');
  const input = document.getElementById('nav-date-input');
  if (!pill) return;
  const d = store.state.currentDate || today();
  pill.textContent = formatPillDisplay(d);
  if (input) input.value = internalToISO(d);
}

function setupDatePicker() {
  const input = document.getElementById('nav-date-input');
  if (!input) return;
  updateDatePill();
  input.addEventListener('change', async () => {
    const iso = input.value;
    if (!iso) return;
    const newDate = ISOToInternal(iso);
    if (!newDate || newDate === store.state.currentDate) return;
    store.setCurrentDate(newDate);
    updateDatePill();
    if (currentTab === 'today') {
      const isMac = window.innerWidth >= 768;
      const { initLog } = await import('./log.js');
      if (isMac) {
        const left = document.getElementById('mac-left');
        if (left) { left.innerHTML='<div id="view-today" class="page"></div>'; await initLog(true); }
      } else {
        const content = document.getElementById('main-content');
        if (content) { content.innerHTML='<div id="view-today" class="page"></div>'; await initLog(false); }
      }
    }
    console.log('[main] date changed →', newDate);
  });
}

// ── Tab bar ────────────────────────────────────────────────────
let currentTab       = null;
let macShellRendered = false;

function setupTabBar() {
  document.getElementById('tab-bar').addEventListener('click', e => {
    const btn = e.target.closest('.tab-bar__item');
    if (!btn) return;
    if (btn.id === 'logout-btn') { handleLogout(); return; }
    const tab = btn.dataset.tab;
    if (!tab) return;
    navigateTo(tab);
  });
}

export async function navigateTo(tab) {
  const isMac        = window.innerWidth >= 768;
  const isSidebarTab = isMac && ['today','favourites','meals'].includes(tab);
  const wasSidebarTab= isMac && ['today','favourites','meals'].includes(currentTab);

  if (tab === currentTab && isSidebarTab && document.getElementById('mac-left')) return;
  if (tab === currentTab && !isSidebarTab && tab !== 'settings') {
    document.querySelectorAll('.tab-bar__item[data-tab]').forEach(btn =>
      btn.classList.toggle('tab-bar__item--active', btn.dataset.tab === tab));
    return;
  }
  if (isSidebarTab && !wasSidebarTab) macShellRendered = false;

  currentTab = tab;
  document.querySelectorAll('.tab-bar__item[data-tab]').forEach(btn =>
    btn.classList.toggle('tab-bar__item--active', btn.dataset.tab === tab));

  const content = document.getElementById('main-content');
  if (isSidebarTab) { await renderWithSidebar(tab, content); return; }
  if (isMac) macShellRendered = false;

  switch (tab) {
    case 'today':      content.innerHTML='<div id="view-today" class="page"></div>'; await initLog(false); break;
    case 'favourites': content.innerHTML='<div id="view-favourites" class="page"></div>'; await initFavourites(false); break;
    case 'meals':      content.innerHTML=placeholderPage('Meals','🍽','Meal templates coming in B8'); break;
    case 'history':    content.innerHTML=placeholderPage('History','📅','History coming in B9'); break;
    case 'settings':   content.innerHTML='<div id="view-settings" class="page"></div>'; initSettings(); break;
    default:           content.innerHTML=placeholderPage(tab,'🔧',`${tab} coming soon`);
  }
}

async function renderWithSidebar(tab, content) {
  if (!macShellRendered) {
    content.innerHTML = `
      <div class="mac-shell">
        <div id="mac-left" class="mac-left"></div>
        <div id="mac-sidebar" class="mac-sidebar">
          <p class="sidebar-heading">How I'm doing</p>
          <div id="sidebar-summary" class="sidebar-summary"></div>
          <button id="sidebar-save-btn" class="sidebar-save-btn">Save Summary</button>
        </div>
      </div>`;
    document.getElementById('sidebar-save-btn')?.addEventListener('click', () => {
      import('./log.js').then(m => m.handleSyncFromSidebar?.());
    });
    macShellRendered = true;
  }
  const left = document.getElementById('mac-left');
  if (!left) return;
  switch (tab) {
    case 'today':      left.innerHTML='<div id="view-today" class="page"></div>'; await initLog(true); break;
    case 'favourites': left.innerHTML='<div id="view-favourites" class="page"></div>'; renderSidebarSummary(); await initFavourites(true); break;
    case 'meals':      left.innerHTML=placeholderPage('Meals','🍽','Meal templates coming in B8'); renderSidebarSummary(); break;
  }
}

export function refreshSidebar()   { renderSidebarSummary(); }
export function notifyDateChange() { updateDatePill(); }

function handleLogout() {
  currentTab=null; macShellRendered=false;
  store.state.foods=null; store.state.favourites=null;
  store.state.dailyLog={}; store.state.settings=null;
  logout();
}

function placeholderPage(title, icon, note) {
  return `<div class="page"><header class="page-header"><h2 class="page-header__title">${title}</h2></header>
    <div class="page-placeholder"><span class="page-placeholder__icon">${icon}</span>
    <p class="page-placeholder__text">${note}</p></div></div>`;
}

async function onLogin() {
  store.setCurrentDate(today());
  try { const s=await getSettings(); store.setSettings(s); console.log('[main] settings loaded'); }
  catch (ex) { console.error('[main] settings failed:', ex.message); }
  renderAppShell();
  Promise.all([
    import('./search.js').then(m=>m.ensureFoodsLoaded()),
    import('./search.js').then(m=>m.ensureFavouritesLoaded?.()),
  ]).catch(err=>console.warn('[main] preload:', err.message));
}

window.addEventListener('nutrilog:login', onLogin);
if (isLoggedIn()) { onLogin(); } else { renderAuthScreen(); }
