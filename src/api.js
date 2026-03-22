// ============================================================
// api.js — 所有 HTTP 通信的唯一出口
// 使用 JSONP 绕过 Apps Script CORS 限制
// ============================================================

import { CONFIG } from '../config.js';
import { store }  from './store.js';

let jsonpCounter = 0;

/**
 * JSONP fetch — 通过动态 <script> 标签发请求，绕过 CORS
 */
function jsonpFetch(action, body = null) {
  return new Promise((resolve, reject) => {
    const callbackName = '__nutrilog_cb_' + (++jsonpCounter);
    const token = store.getToken() || '';

    const params = new URLSearchParams({ action, token, callback: callbackName });
    if (body) {
      params.set('payload', encodeURIComponent(JSON.stringify(body)));
    }

    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(data) {
      cleanup();
      console.log(`[api] ${action} →`, data.ok ? 'ok' : data.error);
      if (!data.ok) {
        reject(new Error(data.error || 'Unknown error'));
      } else {
        resolve(data.data);
      }
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('Network error'));
    };

    script.src = `${CONFIG.scriptUrl}?${params}`;
    document.head.appendChild(script);
  });
}

// ── 具体端点 ─────────────────────────────────────────────────

export async function verifyPin(pinHash) {
  return jsonpFetch('verifyPin', { pinHash });
}

export async function getSettings() {
  return jsonpFetch('getSettings');
}

export async function updateSettings(settings) {
  return jsonpFetch('updateSettings', { settings });
}