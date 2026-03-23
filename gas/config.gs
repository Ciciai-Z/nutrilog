// ============================================================
// NutriLog — Apps Script Configuration
// Version: B5  Updated: 2026-03-23
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

  search: { maxResults: 50 },

  columns: {

    // NutritionDB — 0-based, row 2=header, row 3+=data
    nutritionDb: {
      no:          0,   // A
      name:        1,   // B
      amount:      2,   // C
      unit:        3,   // D
      protein:     55,  // BD
      carbs:       34,  // AI
      fat:         40,  // AO
      fibre:       35,  // AJ
      sodium:      32,  // AG
      potassium:   30,  // AE
      category:    61,  // BJ - big category
      subcategory: 60,  // BI - small category
    },

    // CustomFoods — confirmed 2026-03-23
    customFoods: {
      no:              0,   // A
      name:            1,   // B
      amount:          2,   // C
      unit:            3,   // D
      calories:        4,   // E
      protein:         5,   // F
      carbs:           6,   // G
      fat:             7,   // H
      fibre:           8,   // I
      sodium:          9,   // J
      potassium:       10,  // K
      isQuickAdd:      11,  // L
      createdDatetime: 12,  // M
    },

    // DailyLog — confirmed 2026-03-23 (no MEAL_NO column)
    dailyLog: {
      date:            0,   // A - ddd,d/m/yy
      mealType:        1,   // B
      foodNo:          2,   // C
      name:            3,   // D
      amount:          4,   // E
      unit:            5,   // F
      calories:        6,   // G
      protein:         7,   // H
      carbs:           8,   // I
      fat:             9,   // J
      fibre:           10,  // K
      sodium:          11,  // L
      potassium:       12,  // M
      createdDatetime: 13,  // N
    },

    // DailySummary
    dailySummary: {
      date:      0,   // A
      calories:  1,   // B
      protein:   2,   // C
      carbs:     3,   // D
      fat:       4,   // E
      fibre:     5,   // F
      sodium:    6,   // G
      potassium: 7,   // H
      syncedAt:  8,   // I
    },

    // Favourites
    favourites: { no: 0 },
  },
};
