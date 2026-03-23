// ============================================================
// main.js — 路由初始化，页面切换入口
// Updated: B5 (tab dedup, logout button)
// ============================================================

import { isLoggedIn, renderAuthScreen, logout } from './auth.js';
import { store }                                 from './store.js';
import { getSettings }                           from './api.js';
import { today }                                 from './utils.js';
import { initSearch }                            from './search.js';
import { initSettings }                          from './settings.js';
import { initLog }                               from './log.js';

// ── 页面骨架 ──────────────────────────────────────────────────

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
        <button class="tab-bar__item" data-tab="search">
          <span class="tab-bar__icon">🔍</span>
          <span class="tab-bar__label">Search</span>
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
        <button class="tab-bar__item tab-bar__item--logout" id="logout-btn">
          <span class="tab-bar__icon">🔓</span>
          <span class="tab-bar__label">Logout</span>
        </button>
      </nav>
    </div>`;

  setupTabBar();
  navigateTo('today');
}

// ── Tab Bar ───────────────────────────────────────────────────

let currentTab = null;

function setupTabBar() {
  document.getElementById('tab-bar').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-bar__item');
    if (!btn) return;
    if (btn.id === 'logout-btn') { handleLogout(); return; }
    navigateTo(btn.dataset.tab);
  });
}

async function navigateTo(tab) {
  if (currentTab === tab) return;  // same tab, skip re-init
  currentTab = tab;

  document.querySelectorAll('.tab-bar__item[data-tab]').forEach(btn => {
    btn.classList.toggle('tab-bar__item--active', btn.dataset.tab === tab);
  });

  const content = document.getElementById('main-content');

  switch (tab) {
    case 'today':
      content.innerHTML = '<div id="view-today" class="page"></div>';
      await initLog();
      break;

    case 'search':
      content.innerHTML = '<div id="view-search" class="page"></div>';
      await initSearch();
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

// ── Logout ────────────────────────────────────────────────────

function handleLogout() {
  currentTab = null;
  logout();
}

// ── Placeholder ───────────────────────────────────────────────

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

// ── 登录后初始化 ──────────────────────────────────────────────

async function onLogin() {
  store.setCurrentDate(today());
  try {
    const settings = await getSettings();
    store.setSettings(settings);
    console.log('[main] settings loaded →', settings);
  } catch (ex) {
    console.error('[main] failed to load settings:', ex.message);
  }
  renderAppShell();
}

// ── 启动 ──────────────────────────────────────────────────────

window.addEventListener('nutrilog:login', onLogin);
if (isLoggedIn()) { onLogin(); }
else { renderAuthScreen(); }
