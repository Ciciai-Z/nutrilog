// ============================================================
// api.js — 所有 HTTP 通信的唯一出口
// ============================================================

import { CONFIG } from '../config.js';
import { store }  from './store.js';

/**
 * 基础 fetch 封装
 * GET:  apiFetch('getSettings')
 * POST: apiFetch('verifyPin', { pinHash })
 */
async function apiFetch(action, body = null) {
  const token = store.getToken();

  try {
    let response;

    if (body === null) {
      // GET 请求
      const params = new URLSearchParams({ action, token: token || '' });
      response = await fetch(`${CONFIG.scriptUrl}?${params}`);
    } else {
      // POST 请求
      response = await fetch(CONFIG.scriptUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, token: token || '', ...body }),
      });
    }

    const data = await response.json();
    console.log(`[api] ${action} →`, data.ok ? 'ok' : data.error);

    if (!data.ok) throw new Error(data.error || 'Unknown error');
    return data.data;

  } catch (ex) {
    console.error(`[api] ${action} → ERROR:`, ex.message);
    throw ex;
  }
}

// ── 具体端点 ─────────────────────────────────────────────────

export async function verifyPin(pinHash) {
  return apiFetch('verifyPin', { pinHash });
}

export async function getSettings() {
  return apiFetch('getSettings');
}

export async function updateSettings(settings) {
  return apiFetch('updateSettings', { settings });
}
