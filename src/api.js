// ============================================================
// api.js — 所有 HTTP 通信的唯一出口
// Updated: B5 (adds log CRUD endpoints)
// ============================================================

import { CONFIG } from '../config.js';
import { store }  from './store.js';

let jsonpCounter = 0;

export function jsonpFetch(action, body = null, extraParams = null) {
  return new Promise((resolve, reject) => {
    const cbName = '__nutrilog_cb_' + (++jsonpCounter);
    const token  = store.getToken() || '';
    const params = new URLSearchParams({ action, token, callback: cbName });

    if (body)        params.set('payload', encodeURIComponent(JSON.stringify(body)));
    if (extraParams) for (const [k, v] of Object.entries(extraParams)) params.set(k, v);

    const script    = document.createElement('script');
    const timeoutId = setTimeout(() => { cleanup(); reject(new Error('Request timeout')); }, 15000);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = data => {
      cleanup();
      console.log(`[api] ${action} →`, data.ok ? 'ok' : data.error);
      data.ok ? resolve(data) : reject(new Error(data.error || 'Unknown error'));
    };
    script.onerror = () => { cleanup(); reject(new Error('Network error')); };
    script.src = `${CONFIG.scriptUrl}?${params}`;
    document.head.appendChild(script);
  });
}

// ── B1 ────────────────────────────────────────────────────────

export async function verifyPin(pinHash) {
  return (await jsonpFetch('verifyPin', { pinHash })).data;
}
export async function getSettings() {
  return (await jsonpFetch('getSettings')).data;
}
export async function updateSettings(settings) {
  return (await jsonpFetch('updateSettings', { settings })).data;
}

// ── B2 ────────────────────────────────────────────────────────

export async function searchFoods(q = '') {
  return (await jsonpFetch('searchFoods', null, { q })).data;
}
export async function getFavourites() {
  return (await jsonpFetch('getFavourites')).data;
}
export async function toggleFavourite(foodNo) {
  return (await jsonpFetch('toggleFavourite', { foodNo })).data;
}

// ── B4 ────────────────────────────────────────────────────────

export async function getDailyLog(date) {
  return (await jsonpFetch('getDailyLog', null, { date })).data;
}

// ── B5 ────────────────────────────────────────────────────────

export async function addLogEntry(entry) {
  return (await jsonpFetch('addLogEntry', entry)).data;
}
export async function deleteLogEntry(rowIndex) {
  return (await jsonpFetch('deleteLogEntry', { rowIndex })).data;
}
export async function updateLogEntry(rowIndex, amount) {
  return (await jsonpFetch('updateLogEntry', { rowIndex, amount })).data;
}
export async function syncDailySummary(date) {
  return (await jsonpFetch('syncDailySummary', { date })).data;
}
