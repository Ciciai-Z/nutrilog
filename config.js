// ============================================================
// config.example.js — NutriLog 配置模板
// 使用方法：复制此文件为 config.js，填入真实的 Apps Script URL
// 注意：config.js 已加入 .gitignore，不会提交到 GitHub
// ============================================================

export const CONFIG = {
 //scriptUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
 scriptUrl: 'https://script.google.com/macros/s/AKfycbztlZlDpWi3tmF6TXg6hu-atL_TOAJU1-d68-vputMZ6ltr1q38yCc88C783fIRM7Wl4Q/exec',  
 sheets: {
    nutritionDb:   'NutritionDB',
    customFoods:   'CustomFoods',
    meals:         'Meals',
    dailyLog:      'DailyLog',
    dailySummary:  'DailySummary',
    settings:      'Settings',
    favourites:    'Favourites',
  },

  targets: {
    warningThreshold: 1.10,  // 进度条变 amber（超过目标 10%）
    dangerThreshold:  1.20,  // 进度条变 red（超过目标 20%）
  },

  search: {
    minChars:   1,
    maxResults: 50,
    debounceMs: 200,
  },

  labels: {
    mealTypes:  ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'],
    syncButton: 'Sync to DailySummary',
    addFood:    '+ Add food',
    quickAdd:   'Quick Add',
  },
};
