// ============================================================
// config.gs — NutriLog Google Apps Script 配置常量
// 版本: v1.0 | 2026-03-22
// 说明: 所有 Sheet 名称和列索引集中定义于此。
//       Code.gs 中所有对 Sheet 的访问必须引用这里的常量，
//       不得硬编码字符串或数字索引。
// ============================================================

// ── Spreadsheet ID ───────────────────────────────────────────
const SPREADSHEET_ID = '1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU';

// ── Sheet 名称 ───────────────────────────────────────────────
const SHEETS = {
  NUTRITION_DB:    'NutritionDB',
  CUSTOM_FOODS:    'CustomFoods',
  MEALS:           'Meals',
  DAILY_LOG:       'DailyLog',
  DAILY_SUMMARY:   'DailySummary',
  SETTINGS:        'Settings',
  FAVOURITES:      'Favourites',
};

// ── NutritionDB 列索引（row 2 = 列名，row 3+ = 数据）────────
// 注意：Apps Script getValues() 返回 0-based 数组；
//       这里用 1-based 对应 Sheets 界面列号，读取时减 1。
const COL_DB = {
  NO:        1,   // A
  FOOD:      2,   // B
  AMOUNT:    3,   // C
  UNIT:      4,   // D
  CALS:      5,   // E — 仅参考，永远不用于计算
  ALCOHOL:   6,
  CAFFEINE:  7,
  WATER:     8,
  // 维生素 B1–K 在 9–? 列（应用不直接使用）
  // 矿物质在 ?–? 列（应用不直接使用）
  POTASSIUM: 31,  // AE
  SODIUM:    33,  // AG
  CARBS:     35,  // AI
  FIBRE:     36,  // AJ
  SUGARS:    38,  // AL
  NET_CARBS: 40,  // AN
  FAT:       41,  // AO
  PROTEIN:   56,  // BD
  CATEGORY:  62,  // BJ
};

// ── CustomFoods 列索引（1-based）────────────────────────────
const COL_CUSTOM = {
  NO:           1,   // A
  FOOD:         2,   // B
  AMOUNT:       3,   // C
  UNIT:         4,   // D
  CALORIES:     5,   // E
  PROTEIN:      6,   // F
  CARBS:        7,   // G
  FAT:          8,   // H
  FIBRE:        9,   // I
  SODIUM:       10,  // J
  IS_QUICK_ADD: 11,  // K
};

// ── Meals 列索引（1-based）──────────────────────────────────
const COL_MEALS = {
  MEAL_NO:   1,   // A
  MEAL_NAME: 2,   // B
  TYPE:      3,   // C  — 'Composed' | 'Manual'
  FOOD_NO:   4,   // D  — null for Manual
  FOOD_NAME: 5,   // E
  AMOUNT:    6,   // F
  UNIT:      7,   // G
  CALORIES:  8,   // H
  PROTEIN:   9,   // I
  CARBS:     10,  // J
  FAT:       11,  // K
  FIBRE:     12,  // L
  SODIUM:    13,  // M
};

// ── DailyLog 列索引（1-based）───────────────────────────────
const COL_LOG = {
  DATE:             1,   // A — 格式 ddd,M/d/yy（如 Wed,4/3/26）
  MEAL_TYPE:        2,   // B — Breakfast|Lunch|Dinner|Snacks|Other
  FOOD_NO:          3,   // C
  MEAL_NO:          4,   // D
  NAME:             5,   // E
  AMOUNT:           6,   // F
  UNIT:             7,   // G
  CALORIES:         8,   // H
  PROTEIN:          9,   // I
  CARBS:            10,  // J
  FAT:              11,  // K
  FIBRE:            12,  // L
  SODIUM:           13,  // M
  POTASSIUM:        14,  // N
  CREATED_DATETIME: 15,  // O
};

// ── DailySummary 列索引（1-based）───────────────────────────
const COL_SUMMARY = {
  DATE:      1,   // A
  CALORIES:  2,   // B
  PROTEIN:   3,   // C
  CARBS:     4,   // D
  FAT:       5,   // E
  FIBRE:     6,   // F
  SODIUM:    7,   // G
  POTASSIUM: 8,   // H
  SYNCED_AT: 9,   // I
};

// ── Settings key 名（key-value 格式，col A = key, col B = value）
const SETTINGS_KEYS = {
  CALORIE_TARGET:    'calorie_target',
  PROTEIN_TARGET:    'protein_target',
  CARBS_TARGET:      'carbs_target',
  FAT_TARGET:        'fat_target',
  FIBRE_TARGET:      'fibre_target',
  SODIUM_TARGET:     'sodium_target',
  PIN_HASH:          'pin_hash',          // updateSettings 不得覆盖此 key
  WARNING_THRESHOLD: 'warning_threshold', // 默认 1.10
  DANGER_THRESHOLD:  'danger_threshold',  // 默认 1.20
};

// ── Favourites 列索引（1-based）─────────────────────────────
const COL_FAV = {
  FOOD_NO: 1,  // A
};

// ── Meal 编号前缀 ────────────────────────────────────────────
const MEAL_NO_PREFIX = 'meal';  // → meal001, meal002 …

// ── CustomFoods ID 起点 ──────────────────────────────────────
const CUSTOM_FOOD_ID_START = 50001;  // 避免与 NutritionDB (1–~2500) 冲突

// ── NutritionDB 数据起始行 ───────────────────────────────────
const DB_DATA_START_ROW = 3;  // row 1 = 空, row 2 = 列名行

// ── CORS 响应头 ──────────────────────────────────────────────
function corsHeaders() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}
