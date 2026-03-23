// ============================================================
// NutriLog — Google Apps Script Backend
// Version: B4  Updated: 2026-03-23
// All requests use JSONP (callback= param). Write ops via payload=.
// ============================================================

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action  || '';
  const cb     = params.callback || 'cb';
  let result;
  try { result = route(action, params); }
  catch (err) { result = { ok: false, error: err.message }; }
  return ContentService
    .createTextOutput(`${cb}(${JSON.stringify(result)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function route(action, params) {
  switch (action) {
    case 'verifyPin':       return verifyPin(params);
    case 'getSettings':     return getSettings();
    case 'updateSettings':  return updateSettings(params);
    case 'searchFoods':     return searchFoods(params);
    case 'getFavourites':   return getFavourites(params);
    case 'toggleFavourite': return toggleFavourite(params);
    case 'getDailyLog':     return getDailyLog(params);
    default: return { ok: false, error: `Unknown action: ${action}` };
  }
}

function getSheet(name) {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(name);
}

function verifyToken(token) {
  if (!token) return false;
  const data = getSheet(CONFIG.sheets.settings).getDataRange().getValues();
  for (const row of data) {
    if (row[0] === 'session_token') return row[1] === token;
  }
  return false;
}

// ── B1: verifyPin ────────────────────────────────────────────

function verifyPin(params) {
  let hash = '';
  try {
    const payload = JSON.parse(decodeURIComponent(params.payload || '{}'));
    hash = payload.hash || payload.pinHash || '';
  } catch (e) { return { ok: false, error: 'Invalid payload' }; }
  if (!hash) return { ok: false, error: 'Missing hash' };

  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  let storedHash = '';
  for (const row of data) {
    if (row[0] === 'pin_hash') { storedHash = row[1]; break; }
  }
  if (!storedHash || hash !== storedHash) return { ok: false, error: 'Invalid PIN' };

  const token = Utilities.getUuid();
  let tokenRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === 'session_token') { tokenRow = i + 1; break; }
  }
  if (tokenRow > 0) { sh.getRange(tokenRow, 2).setValue(token); }
  else { sh.appendRow(['session_token', token]); }
  return { ok: true, data: { token } };
}

// ── B1: getSettings / updateSettings ────────────────────────

function getSettings() {
  const data = getSheet(CONFIG.sheets.settings).getDataRange().getValues();
  const settings = {};
  for (const row of data) { if (row[0]) settings[row[0]] = row[1]; }
  return { ok: true, data: settings };
}

function updateSettings(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };

  let settings;
  try {
    const payload = JSON.parse(decodeURIComponent(params.payload || '{}'));
    settings = payload.settings || payload;
  } catch (e) { return { ok: false, error: 'Invalid payload JSON' }; }

  delete settings['pin_hash'];
  delete settings['session_token'];

  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  const keyIndex = {};
  for (let i = 0; i < data.length; i++) keyIndex[data[i][0]] = i + 1;

  for (const [key, value] of Object.entries(settings)) {
    if (keyIndex[key]) { sh.getRange(keyIndex[key], 2).setValue(value); }
    else { sh.appendRow([key, value]); }
  }
  return { ok: true, data: null };
}

// ── B2: searchFoods ──────────────────────────────────────────

function searchFoods(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };
  const q = (params.q || '').toLowerCase().trim();
  return { ok: true, data: [
    ...loadNutritionDB(getSheet(CONFIG.sheets.nutritionDb), q),
    ...loadCustomFoods(getSheet(CONFIG.sheets.customFoods), q),
  ]};
}

function loadNutritionDB(sheet, q) {
  const rows = sheet.getDataRange().getValues();
  const COL  = CONFIG.columns.nutritionDb;
  const results = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.no]) continue;
    if (q && !String(row[COL.name] || '').toLowerCase().includes(q)) continue;
    results.push(buildFoodRecord(row, COL));
    if (results.length >= CONFIG.search.maxResults) break;
  }
  return results;
}

function loadCustomFoods(sheet, q) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const COL = CONFIG.columns.customFoods;
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.no]) continue;
    if (q && !String(row[COL.name] || '').toLowerCase().includes(q)) continue;
    results.push(buildCustomFoodRecord(row, COL));
  }
  return results;
}

function buildFoodRecord(row, COL) {
  const protein = Number(row[COL.protein]) || 0;
  const carbs   = Number(row[COL.carbs])   || 0;
  const fat     = Number(row[COL.fat])     || 0;
  return {
    no: Number(row[COL.no]), name: String(row[COL.name] || ''),
    amount: Number(row[COL.amount] || 100), unit: String(row[COL.unit] || 'g'),
    calories: Math.round(fat * 9 + carbs * 4 + protein * 4),
    protein, carbs, fat,
    fibre: Number(row[COL.fibre] || 0), sodium: Number(row[COL.sodium] || 0),
    potassium: Number(row[COL.potassium] || 0),
    category: String(row[COL.category] || ''), subcategory: String(row[COL.subcategory] || ''),
    isCustom: false,
  };
}

function buildCustomFoodRecord(row, COL) {
  const protein = Number(row[COL.protein]) || 0;
  const carbs   = Number(row[COL.carbs])   || 0;
  const fat     = Number(row[COL.fat])     || 0;
  return {
    no: Number(row[COL.no]), name: String(row[COL.name] || ''),
    amount: Number(row[COL.amount] || 100), unit: String(row[COL.unit] || 'g'),
    calories: Math.round(fat * 9 + carbs * 4 + protein * 4),
    protein, carbs, fat,
    fibre: Number(row[COL.fibre] || 0), sodium: Number(row[COL.sodium] || 0),
    potassium: Number(row[COL.potassium] || 0),
    category: 'Custom', isCustom: true,
    isQuickAdd: row[COL.isQuickAdd] === true || row[COL.isQuickAdd] === 'TRUE',
  };
}

// ── B2: Favourites ───────────────────────────────────────────

function getFavourites(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };
  const rows = getSheet(CONFIG.sheets.favourites).getDataRange().getValues();
  const ids  = [];
  for (let i = 1; i < rows.length; i++) {
    const no = Number(rows[i][0]);
    if (no) ids.push(no);
  }
  return { ok: true, data: ids };
}

function toggleFavourite(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };
  let foodNo = 0;
  try {
    foodNo = Number(JSON.parse(decodeURIComponent(params.payload || '{}')).foodNo || 0);
  } catch (e) { return { ok: false, error: 'Invalid payload' }; }
  if (!foodNo) return { ok: false, error: 'Missing foodNo' };

  const sh   = getSheet(CONFIG.sheets.favourites);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === foodNo) { sh.deleteRow(i + 1); return { ok: true, data: { added: false } }; }
  }
  sh.appendRow([foodNo]);
  return { ok: true, data: { added: true } };
}

// ── B4: getDailyLog ──────────────────────────────────────────
// Returns all entries for a given date (ddd,M/d/yy format)

function getDailyLog(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };

  const date = (params.date || '').trim();
  if (!date) return { ok: false, error: 'Missing date' };

  const sh      = getSheet(CONFIG.sheets.dailyLog);
  const rows    = sh.getDataRange().getValues();
  const COL     = CONFIG.columns.dailyLog;
  const entries = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.date]) continue;
    if (String(row[COL.date]).trim() !== date) continue;

    entries.push({
      rowIndex:  i + 1,
      date:      String(row[COL.date]),
      mealType:  String(row[COL.mealType]  || ''),
      foodNo:    row[COL.foodNo]  ? Number(row[COL.foodNo])  : null,
      mealNo:    row[COL.mealNo]  ? String(row[COL.mealNo])  : null,
      name:      String(row[COL.name]      || ''),
      amount:    Number(row[COL.amount]    || 0),
      unit:      String(row[COL.unit]      || 'g'),
      calories:  Number(row[COL.calories]  || 0),
      protein:   Number(row[COL.protein]   || 0),
      carbs:     Number(row[COL.carbs]     || 0),
      fat:       Number(row[COL.fat]       || 0),
      fibre:     Number(row[COL.fibre]     || 0),
      sodium:    Number(row[COL.sodium]    || 0),
      potassium: Number(row[COL.potassium] || 0),
    });
  }
  return { ok: true, data: entries };
}
