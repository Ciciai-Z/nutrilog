// ============================================================
// NutriLog — store.js
// 全局内存状态缓存，无持久化，重新加载后重新获取
// Updated: B2 (adds foods, favourites)
// ============================================================

export const store = {
  state: {
    // Auth
    token: null,          // session token（同时存在 sessionStorage，由 auth.js 管理）

    // Settings（来自 Google Sheets）
    settings: null,       // { calorie_target, protein_target, ... }

    // 当前日期
    currentDate: null,

    // B2: 食物数据库（每 session 加载一次）
    foods: null,          // Array<FoodRecord> | null（null = 尚未加载）

    // B2: 收藏的食物 ID
    favourites: null,     // Set<number> | null（null = 尚未加载）

    // B4+: 日志缓存，按日期字符串索引
    dailyLog: {},         // { [dateStr]: Array<LogEntry> }
  },

  // ── Token 管理（供 api.js 调用）─────────────────────────

  getToken() {
    return this.state.token || sessionStorage.getItem('nutrilog_token') || '';
  },

  setToken(token) {
    this.state.token = token;
    sessionStorage.setItem('nutrilog_token', token);
  },

  clearToken() {
    this.state.token = null;
    sessionStorage.removeItem('nutrilog_token');
  },

  // ── Settings ─────────────────────────────────────────────

  setSettings(settings) {
    this.state.settings = settings || {};
  },

  // ── 日期 ─────────────────────────────────────────────────

  setCurrentDate(date) {
    this.state.currentDate = date;
  },
};