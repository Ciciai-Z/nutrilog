// ============================================================
// api.js — 所有 HTTP 通信的唯一出口
// 使用 JSONP 绕过 Apps Script CORS 限制
// Updated: B4 (adds getDailyLog)
// ============================================================

import { CONFIG } from '../config.js';
import { store }  from './store.js';

let jsonpCounter = 0;

/**
 * JSONP fetch
 * @param {string} action
 * @param {object|null} body        写操作 → 序列化为 payload= URL 参数
 * @param {object|null} extraParams 读操作附加参数 → 直接追加到 URL
 */
export function jsonpFetch(action, body = null, extraParams = null) {
  return new Promise((resolve, reject) => {
    const callbackName = '__nutrilog_cb_' + (++jsonpCounter);
    const token  = store.getToken() || '';
    const params = new URLSearchParams({ action, token, callback: callbackName });

    if (body) {
      params.set('payload', encodeURIComponent(JSON.stringify(body)));
    }
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) params.set(k, v);
    }

    const script    = document.createElement('script');
    const timeoutId = setTimeout(() => { cleanup(); reject(new Error('Request timeout')); }, 15000);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(data) {
      cleanup();
      console.log(`[api] ${action} →`, data.ok ? 'ok' : data.error);
      if (!data.ok) { reject(new Error(data.error || 'Unknown error')); }
      else { resolve(data); }
    };

    script.onerror = function() { cleanup(); reject(new Error('Network error')); };
    script.src = `${CONFIG.scriptUrl}?${params}`;
    document.head.appendChild(script);
  });
}

// ── B1 ────────────────────────────────────────────────────────

export async function verifyPin(pinHash) {
  const res = await jsonpFetch('verifyPin', { pinHash });
  return res.data;
}

export async function getSettings() {
  const res = await jsonpFetch('getSettings');
  return res.data;
}

export async function updateSettings(settings) {
  const res = await jsonpFetch('updateSettings', { settings });
  return res.data;
}

// ── B2 ────────────────────────────────────────────────────────

export async function searchFoods(q = '') {
  const res = await jsonpFetch('searchFoods', null, { q });
  return res.data;
}

export async function getFavourites() {
  const res = await jsonpFetch('getFavourites');
  return res.data;
}

export async function toggleFavourite(foodNo) {
  const res = await jsonpFetch('toggleFavourite', { foodNo });
  return res.data;
}

// ── B4 ────────────────────────────────────────────────────────

export async function getDailyLog(date) {
  const res = await jsonpFetch('getDailyLog', null, { date });
  return res.data;   // Array<LogEntry>
}
