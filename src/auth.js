// ============================================================
// auth.js — PIN login
// Fixed: processing state during PIN verify, loading indicator
// ============================================================
import { sha256 } from './utils.js';
import { verifyPin } from './api.js';
import { store } from './store.js';
import { showToast } from './ui.js';

export function isLoggedIn() { return !!store.getToken(); }

export function renderAuthScreen() {
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
        <!-- Processing indicator (hidden by default) -->
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
  const keypad    = document.getElementById('pin-keypad');
  const errorEl   = document.getElementById('auth-error');
  const processingEl = document.getElementById('auth-processing');
  keypad.style.pointerEvents = 'none';
  errorEl.textContent = '';
  if (processingEl) processingEl.style.display = 'block';
  // Dim the dot display to indicate processing
  const display = document.getElementById('pin-display');
  if (display) display.style.opacity = '0.5';
  try {
    const hash   = await sha256(pinBuffer);
    const result = await verifyPin(hash);
    store.setToken(result.token);
    console.log('[auth] verifyPin → success');
    window.dispatchEvent(new CustomEvent('nutrilog:login'));
  } catch (ex) {
    console.log('[auth] verifyPin → failed');
    if (errorEl) errorEl.textContent = 'Incorrect PIN. Try again.';
    pinBuffer = '';
    updatePinDisplay();
    keypad.style.pointerEvents = '';
    if (processingEl) processingEl.style.display = 'none';
    if (display) display.style.opacity = '';
    // Shake animation
    if (display) {
      display.classList.add('pin-display--shake');
      setTimeout(() => display.classList.remove('pin-display--shake'), 500);
    }
  }
}

export function logout() {
  store.clearToken();
  renderAuthScreen();
}
