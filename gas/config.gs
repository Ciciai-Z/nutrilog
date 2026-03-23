// ============================================================
// NutriLog — Apps Script Configuration
// Version: B2  Updated: 2026-03-23
// Column indices are 0-based (JavaScript array index after getValues()).
// ============================================================

const CONFIG = {
  spreadsheetId: '1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU',

  sheets: {
    nutritionDb:  'NutritionDB',
    customFoods:  'CustomFoods',
    meals:        'Meals',
    dailyLog:     'DailyLog',
    dailySummary: 'DailySummary',
    settings:     'Settings',
    favourites:   'Favourites',
  },

  search: {
    maxResults: 50,
  },

  // 0-based column indices for NutritionDB
  // Row 2 in Sheets = index 1 in array = header row
  // Row 3 in Sheets = index 2 = first data row
  columns: {
    nutritionDb: {
      no:        0,   // A  - NO.
      name:      1,   // B  - FOOD
      amount:    2,   // C  - AMOUNT
      unit:      3,   // D  - UNIT
      // cals:   4,   // E  - CALS (never use for calculation!)
      protein:   55,  // BD - PROTEIN (index 55, col 56)
      carbs:     34,  // AI - CARBS (index 34, col 35)
      fat:       40,  // AO - FAT (index 40, col 41)
      fibre:     35,  // AJ - FIBRE (index 35, col 36)
      sodium:    32,  // AG - SODIUM (index 32, col 33)
      potassium: 30,  // AE - POTASSIUM (index 30, col 31)
      category:    61,  // BJ - CATEGORY big category (index 61, col 62)
      subcategory: 60,  // BI - subcategory small category (index 60, col 61)
    },

    // CustomFoods columns — confirmed 2026-03-23
    customFoods: {
      no:              0,  // A  - NO.
      name:            1,  // B  - NAME
      amount:          2,  // C  - AMOUNT
      unit:            3,  // D  - UNIT
      calories:        4,  // E  - CALORIES (stored, but we recalc)
      protein:         5,  // F  - PROTEIN
      carbs:           6,  // G  - CARBS
      fat:             7,  // H  - FAT
      fibre:           8,  // I  - FIBRE
      sodium:          9,  // J  - SODIUM
      potassium:       10, // K  - POTASSIUM
      isQuickAdd:      11, // L  - IS_QUICK_ADD
      createdDatetime: 12, // M  - CREATED_DATETIME (read-only, written on create)
    },

    // Favourites: single column A = food NO.
    favourites: {
      no: 0,
    },

    // DailyLog columns — confirmed from CLAUDE.md
    dailyLog: {
      date:      0,   // A - DATE (ddd,M/d/yy)
      mealType:  1,   // B - MEAL_TYPE
      foodNo:    2,   // C - FOOD_NO
      mealNo:    3,   // D - MEAL_NO
      name:      4,   // E - NAME
      amount:    5,   // F - AMOUNT
      unit:      6,   // G - UNIT
      calories:  7,   // H - CALORIES
      protein:   8,   // I - PROTEIN
      carbs:     9,   // J - CARBS
      fat:       10,  // K - FAT
      fibre:     11,  // L - FIBRE
      sodium:    12,  // M - SODIUM
      potassium: 13,  // N - POTASSIUM
    },
  },
};
