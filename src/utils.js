// ============================================================
// utils.js — 纯工具函数（无副作用，无外部依赖）
// Updated: B4 (date format changed to ddd,d/m/yy)
// ============================================================

/**
 * 热量计算公式（唯一实现，全局调用此函数）
 * 永远不使用 NutritionDB 的 CALS 列
 */
export function calcCalories(protein, carbs, fat) {
  return Math.round((fat * 9) + (carbs * 4) + (protein * 4));
}

/**
 * 格式化日期为 ddd,d/m/yy（如 Wed,4/3/26 = 4日3月2026）
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d   = days[date.getDay()];
  const day = date.getDate();
  const m   = date.getMonth() + 1;
  const yy  = String(date.getFullYear()).slice(-2);
  return `${d},${day}/${m}/${yy}`;
}

/**
 * 解析 ddd,d/m/yy 格式为 Date 对象
 * @param {string} str 如 "Wed,4/3/26" = 4日3月2026
 * @returns {Date}
 */
export function parseDate(str) {
  // 兼容带空格的格式 "Wed, 4/3/26"
  const normalised = str.trim().replace(/,\s+/, ',');
  const parts = normalised.split(',');
  if (parts.length < 2) return new Date();
  const [day, m, yy] = parts[1].split('/');
  return new Date(2000 + parseInt(yy), parseInt(m) - 1, parseInt(day));
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
