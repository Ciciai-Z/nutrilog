// ============================================================
// api.js — 所有 HTTP 通信的唯一出口
// 说明: Apps Script 不支持 CORS preflight，
//       所有请求统一用 GET，body 数据用 payload= 参数传递
// ============================================================

import { CONFIG } from '../config.js';
import { store }  from './store.js';

/**
 * 基础 fetch 封装（全部走 GET）
 * 读操作: apiFetch('getSettings')
 * 写操作: apiFetch('verifyPin', { pinHash })  ← payload 放 URL 参数
 */
async function apiFetch(action, body = null) {
  const token = store.getToken();

  try {
    const params = new URLSearchParams({ action, token: token || '' });
    if (body) {
      params.set('payload', encodeURIComponent(JSON.stringify(body)));
    }

    const response = await fetch(`${CONFIG.scriptUrl}?${params}`);
    const data     = await response.json();

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