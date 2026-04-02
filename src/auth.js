// ============================================================
// auth.js — PIN login
// B8/B9: auto-logout after 5 min inactivity
// ============================================================
import { sha256 } from './utils.js';
import { verifyPin } from './api.js';
import { store } from './store.js';
import { showToast } from './ui.js';

export function isLoggedIn() { return !!store.getToken(); }

// ── Auto-logout timer ─────────────────────────────────────────
const IDLE_MS = 5 * 60 * 1000; // 5 minutes
let _idleTimer = null;

export function resetIdleTimer() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    if (store.getToken()) {
      console.log('[auth] idle timeout → logout');
      logout();
      showToast('Session expired — please log in again', 'error');
    }
  }, IDLE_MS);
}

export function startIdleWatcher() {
  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(ev =>
    document.addEventListener(ev, resetIdleTimer, { passive: true }));
  resetIdleTimer();
}

export function stopIdleWatcher() {
  clearTimeout(_idleTimer);
}

export function renderAuthScreen() {
  // Dim entire page before showing auth card (for re-login flow)
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-logo">
          <span class="auth-logo__icon">🥗</span>
          <h1 class="auth-logo__title">NutriLog</h1>
        </div>
        <p class="auth-subtitle">Enter your PIN to continue</p>
        <div class="pin-display" id="pin-display">
          <span class="pin-dot" id="dot-0"></span>
          <span class="pin-dot" id="dot-1"></span>
          <span class="pin-dot" id="dot-2"></span>
          <span class="pin-dot" id="dot-3"></span>
        </div>
        <div class="pin-keypad" id="pin-keypad">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>`
            <button class="pin-key ${k===''?'pin-key--empty':''}" data-key="${k}">${k}</button>`).join('')}
        </div>
        <p class="auth-error" id="auth-error"></p>
        <p class="auth-processing" id="auth-processing" style="display:none">Verifying…</p>
      </div>
    </div>`;
  setupPinKeypad();
}

let pinBuffer = '';

function setupPinKeypad() {
  pinBuffer = '';
  const keypad = document.getElementById('pin-keypad');
  keypad.addEventListener('click', async (e) => {
    const btn = e.target.closest('.pin-key');
    if (!btn || btn.classList.contains('pin-key--empty')) return;
    const key = btn.dataset.key;
    if (key === '⌫') { pinBuffer = pinBuffer.slice(0,-1); }
    else if (pinBuffer.length < 4) { pinBuffer += key; }
    updatePinDisplay();
    if (pinBuffer.length === 4) { await submitPin(); }
  });
}

function updatePinDisplay() {
  for (let i=0;i<4;i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (dot) dot.classList.toggle('pin-dot--filled', i < pinBuffer.length);
  }
}

async function submitPin() {
  const keypad       = document.getElementById('pin-keypad');
  const errorEl      = document.getElementById('auth-error');
  const processingEl = document.getElementById('auth-processing');
  const display      = document.getElementById('pin-display');

  // Grey out entire auth card during verification
  const card = document.querySelector('.auth-card');
  if (card) card.style.opacity = '0.6';
  keypad.style.pointerEvents = 'none';
  errorEl.textContent = '';
  if (processingEl) processingEl.style.display = 'block';
  if (display) display.style.opacity = '0.5';

  try {
    const hash   = await sha256(pinBuffer);
    const result = await verifyPin(hash);
    store.setToken(result.token);
    console.log('[auth] verifyPin → success');
    startIdleWatcher();
    window.dispatchEvent(new CustomEvent('nutrilog:login'));
  } catch (ex) {
    console.log('[auth] verifyPin → failed');
    if (card) card.style.opacity = '';
    if (errorEl) errorEl.textContent = 'Incorrect PIN. Try again.';
    pinBuffer = '';
    updatePinDisplay();
    keypad.style.pointerEvents = '';
    if (processingEl) processingEl.style.display = 'none';
    if (display) display.style.opacity = '';
    if (display) {
      display.classList.add('pin-display--shake');
      setTimeout(() => display.classList.remove('pin-display--shake'), 500);
    }
  }
}

export function logout() {
  stopIdleWatcher();
  store.clearToken();
  renderAuthScreen();
}
