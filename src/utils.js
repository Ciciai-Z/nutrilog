// ============================================================
// utils.js — 纯工具函数（无副作用，无外部依赖）
// ============================================================

/**
 * 热量计算公式（唯一实现，全局调用此函数）
 * 永远不使用 NutritionDB 的 CALS 列
 */
export function calcCalories(protein, carbs, fat) {
  return Math.round((fat * 9) + (carbs * 4) + (protein * 4));
}

/**
 * 格式化日期为 ddd,M/d/yy（如 Wed,4/3/26）
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d   = days[date.getDay()];
  const m   = date.getMonth() + 1;
  const day = date.getDate();
  const yy  = String(date.getFullYear()).slice(-2);
  return `${d},${m}/${day}/${yy}`;
}

/**
 * 解析 ddd,M/d/yy 格式为 Date 对象
 * @param {string} str  如 "Wed,4/3/26"
 * @returns {Date}
 */
export function parseDate(str) {
  const parts = str.split(',');
  if (parts.length < 2) return new Date();
  const [m, d, yy] = parts[1].split('/');
  return new Date(2000 + parseInt(yy), parseInt(m) - 1, parseInt(d));
}

/**
 * 今天的日期字符串
 */
export function today() {
  return formatDate(new Date());
}

/**
 * 昨天的日期字符串
 */
export function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

/**
 * 相对日期偏移（offset=-1 = 昨天，+1 = 明天）
 */
export function offsetDate(dateStr, offset) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + offset);
  return formatDate(d);
}

/**
 * 营养值显示：保留 1 位小数
 */
export function fmtNutrient(value) {
  return Number(value || 0).toFixed(1);
}

/**
 * 热量显示：整数
 */
export function fmtCalories(value) {
  return Math.round(Number(value || 0));
}

/**
 * SHA-256 哈希（用于 PIN）
 */
export async function sha256(text) {
  const encoder = new TextEncoder();
  const data    = encoder.encode(text);
  const hash    = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
