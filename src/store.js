// ============================================================
// store.js — 全局状态缓存（唯一真实来源）
// ============================================================

export const store = {
  state: {
    token:       null,   // session token（来自 verifyPin）
    settings:    {},     // 营养目标 + 配置
    foods:       [],     // NutritionDB 全量（B2 加载）
    favourites:  [],     // 收藏的 food IDs
    currentDate: null,   // 当前查看的日期字符串
  },

  setToken(token) {
    this.state.token = token;
    sessionStorage.setItem('nutrilog_token', token);
  },

  getToken() {
    if (!this.state.token) {
      this.state.token = sessionStorage.getItem('nutrilog_token');
    }
    return this.state.token;
  },

  clearToken() {
    this.state.token = null;
    sessionStorage.removeItem('nutrilog_token');
  },

  setSettings(settings) {
    this.state.settings = settings;
  },

  setCurrentDate(dateStr) {
    this.state.currentDate = dateStr;
  },
};
