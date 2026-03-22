// ============================================================
// main.js — 路由初始化，页面切换入口
// ============================================================

import { isLoggedIn, renderAuthScreen } from './auth.js';
import { store }    from './store.js';
import { getSettings } from './api.js';
import { today }    from './utils.js';

// ── 页面骨架 HTML ─────────────────────────────────────────────

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
      </nav>
    </div>`;

  setupTabBar();
  navigateTo('today');
}

// ── Tab Bar ───────────────────────────────────────────────────

let currentTab = null;

function setupTabBar() {
  const tabBar = document.getElementById('tab-bar');
  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-bar__item');
    if (!btn) return;
    navigateTo(btn.dataset.tab);
  });
}

function navigateTo(tab) {
  currentTab = tab;

  // 高亮当前 tab
  document.querySelectorAll('.tab-bar__item').forEach(btn => {
    btn.classList.toggle('tab-bar__item--active', btn.dataset.tab === tab);
  });

  // 渲染页面占位内容（B2–B9 逐步替换为真实内容）
  const content = document.getElementById('main-content');
  const pages = {
    today:    renderTodayPage,
    search:   () => placeholderPage('Search', '🔍', 'Food search coming in B2'),
    meals:    () => placeholderPage('Meals', '🍽', 'Meal templates coming in B8'),
    history:  () => placeholderPage('History', '📅', 'History coming in B9'),
    settings: renderSettingsPage,
  };

  const render = pages[tab];
  if (render) content.innerHTML = render();
}

// ── 占位页面 ──────────────────────────────────────────────────

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

// ── Today 页面（B4 完善，现在显示骨架） ──────────────────────

function renderTodayPage() {
  const date = store.state.currentDate || today();
  return `
    <div class="page">
      <header class="page-header">
        <h2 class="page-header__title">Today</h2>
        <span class="page-header__date">${date}</span>
      </header>
      <div class="page-placeholder">
        <span class="page-placeholder__icon">📋</span>
        <p class="page-placeholder__text">Log entries coming in B4 & B5</p>
      </div>
    </div>`;
}

// ── Settings 页面（B3 完善，现在显示骨架） ────────────────────

function renderSettingsPage() {
  const s = store.state.settings;
  return `
    <div class="page">
      <header class="page-header">
        <h2 class="page-header__title">Settings</h2>
      </header>
      <div class="card">
        <p class="settings-note">Nutrition targets loaded from Google Sheets.</p>
        <ul class="settings-list">
          <li>Calories: <strong>${s.calorie_target || '—'} kcal</strong></li>
          <li>Protein: <strong>${s.protein_target || '—'} g</strong></li>
          <li>Carbs: <strong>${s.carbs_target || '—'} g</strong></li>
          <li>Fat: <strong>${s.fat_target || '—'} g</strong></li>
          <li>Fibre: <strong>${s.fibre_target || '—'} g</strong></li>
          <li>Sodium: <strong>${s.sodium_target || '—'} mg</strong></li>
        </ul>
        <p class="settings-note">Full settings editor coming in B3.</p>
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

if (isLoggedIn()) {
  onLogin();
} else {
  renderAuthScreen();
}
