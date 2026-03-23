// ============================================================
// api.js — All HTTP communication via JSONP
// Fixed: timeout 30s, no GC on callback during long requests
// ============================================================
import { CONFIG } from '../config.js';
import { store } from './store.js';

let jsonpCounter = 0;

export function jsonpFetch(action, body = null, extraParams = null) {
  return new Promise((resolve, reject) => {
    const cbName    = '__nutrilog_cb_' + (++jsonpCounter);
    const token     = store.getToken() || '';
    const params    = new URLSearchParams({ action, token, callback: cbName });
    if (body)        params.set('payload', encodeURIComponent(JSON.stringify(body)));
    if (extraParams) for (const [k, v] of Object.entries(extraParams)) params.set(k, v);

    const script = document.createElement('script');
    // 30s timeout — syncDailySummary can be slow on first cold call
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000);

    function cleanup() {
      clearTimeout(timeoutId);
      // Keep callback on window until GAS calls it (don't delete before response)
      // Use a short grace period then clean up
      setTimeout(() => { delete window[cbName]; }, 5000);
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    // Attach to window BEFORE appending script to DOM
    window[cbName] = data => {
      // Remove immediately after called
      delete window[cbName];
      clearTimeout(timeoutId);
      if (script.parentNode) script.parentNode.removeChild(script);
      console.log(`[api] ${action} →`, data.ok ? 'ok' : data.error);
      data.ok ? resolve(data) : reject(new Error(data.error || 'Unknown error'));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Network error'));
    };

    script.src = `${CONFIG.scriptUrl}?${params}`;
    document.head.appendChild(script);
  });
}

// ── B1 ──────────────────────────────────────────────────────────
export async function verifyPin(pinHash)    { return (await jsonpFetch('verifyPin', { pinHash })).data; }
export async function getSettings()         { return (await jsonpFetch('getSettings')).data; }
export async function updateSettings(s)     { return (await jsonpFetch('updateSettings', { settings: s })).data; }

// ── B2 ──────────────────────────────────────────────────────────
export async function searchFoods(q = '')   { return (await jsonpFetch('searchFoods', null, { q })).data; }
export async function getFavourites()       { return (await jsonpFetch('getFavourites')).data; }
export async function toggleFavourite(no)   { return (await jsonpFetch('toggleFavourite', { foodNo: no })).data; }

// ── B4 ──────────────────────────────────────────────────────────
export async function getDailyLog(date)     { return (await jsonpFetch('getDailyLog', null, { date })).data; }

// ── B5 ──────────────────────────────────────────────────────────
export async function addLogEntry(entry)    { return (await jsonpFetch('addLogEntry', entry)).data; }
export async function deleteLogEntry(idx)   { return (await jsonpFetch('deleteLogEntry', { rowIndex: idx })).data; }
export async function updateLogEntry(idx, amount) { return (await jsonpFetch('updateLogEntry', { rowIndex: idx, amount })).data; }
export async function syncDailySummary(date){ return (await jsonpFetch('syncDailySummary', { date })).data; }
