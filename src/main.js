// ============================================================
// main.js — Router
// Fixed: mobile tab guard (no reload on re-visit), sidebar refresh
// ============================================================
import { isLoggedIn, renderAuthScreen, logout } from './auth.js';
import { store } from './store.js';
import { getSettings } from './api.js';
import { today, formatDate } from './utils.js';
import { initLog, renderSidebarSummary } from './log.js';
import { initSettings } from './settings.js';
import { initFavourites } from './search.js';

// ── App shell ──────────────────────────────────────────────────
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
        <span class="nav-date-pill" id="nav-date-pill"></span>
        <button class="tab-bar__item tab-bar__item--logout" id="logout-btn">
          <span class="tab-bar__icon">🔓</span>
          <span class="tab-bar__label">Logout</span>
        </button>
      </nav>
    </div>`;
  updateDatePill();
  setupTabBar();
  navigateTo('today');
}

// ── Date pill ──────────────────────────────────────────────────
function formatPillDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.replace(/^[^,]+,/, '').split('/');
    const day   = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year  = 2000 + parseInt(parts[2]);
    const d     = new Date(year, month, day);
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${DOW[d.getDay()]} ${day} ${MON[month]}`;
  } catch { return dateStr; }
}

function updateDatePill() {
  const pill = document.getElementById('nav-date-pill');
  if (!pill) return;
  pill.textContent = formatPillDate(store.state.currentDate || today());
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

  // Mac sidebar tabs: skip re-init if same tab and shell intact
  if (tab === currentTab && isSidebarTab && document.getElementById('mac-left')) return;

  // Mobile + non-sidebar tabs: skip re-init if same tab AND content already rendered
  // Exception: always re-render settings (it's stateful)
  if (tab === currentTab && !isSidebarTab && tab !== 'settings') {
    // Just update active state and return
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
    case 'today':
      content.innerHTML = '<div id="view-today" class="page"></div>';
      await initLog(false);
      break;
    case 'favourites':
      content.innerHTML = '<div id="view-favourites" class="page"></div>';
      await initFavourites(false);
      break;
    case 'meals':
      content.innerHTML = placeholderPage('Meals', '🍽', 'Meal templates coming in B8');
      break;
    case 'history':
      content.innerHTML = placeholderPage('History', '📅', 'History coming in B9');
      break;
    case 'settings':
      content.innerHTML = '<div id="view-settings" class="page"></div>';
      initSettings();
      break;
    default:
      content.innerHTML = placeholderPage(tab, '🔧', `${tab} coming soon`);
  }
}

// ── Mac two-column shell ───────────────────────────────────────
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
    case 'today':
      left.innerHTML = '<div id="view-today" class="page"></div>';
      await initLog(true);
      // sidebar is refreshed inside initLog via renderLog → renderSidebarSummary
      break;
    case 'favourites':
      left.innerHTML = '<div id="view-favourites" class="page"></div>';
      renderSidebarSummary(); // show current data immediately
      await initFavourites(true);
      break;
    case 'meals':
      left.innerHTML = placeholderPage('Meals', '🍽', 'Meal templates coming in B8');
      renderSidebarSummary();
      break;
  }
}

export function refreshSidebar()   { renderSidebarSummary(); }
export function notifyDateChange() { updateDatePill(); }

function handleLogout() {
  currentTab       = null;
  macShellRendered = false;
  // Clear cached state so next login starts fresh
  store.state.foods      = null;
  store.state.favourites = null;
  store.state.dailyLog   = {};
  store.state.settings   = null;
  logout();
}

function placeholderPage(title, icon, note) {
  return `
    <div class="page">
      <header class="page-header">
        <h2 class="page-header__title">${title}</h2>
      </header>
      <div class="page-placeholder">
        <span class="page-placeholder__icon">${icon}</span>
        <p class="page-placeholder__text">${note}</p>
      </div>
    </div>`;
}

// ── Login ──────────────────────────────────────────────────────
async function onLogin() {
  store.setCurrentDate(today());
  try {
    const settings = await getSettings();
    store.setSettings(settings);
    console.log('[main] settings loaded');
  } catch (ex) {
    console.error('[main] failed to load settings:', ex.message);
  }
  renderAppShell();
  // Preload in background
  Promise.all([
    import('./search.js').then(m => m.ensureFoodsLoaded()),
    import('./search.js').then(m => m.ensureFavouritesLoaded?.()),
  ]).catch(err => console.warn('[main] preload failed:', err.message));
}

window.addEventListener('nutrilog:login', onLogin);
if (isLoggedIn()) { onLogin(); } else { renderAuthScreen(); }
