// ============================================================
// NutriLog — Google Apps Script Backend
// Version: B2  Updated: 2026-03-23
// All requests use JSONP (callback= param). Write ops via payload=.
// ============================================================

// ── Entry point ─────────────────────────────────────────────

function doGet(e) {
  const params  = e.parameter || {};
  const action  = params.action  || '';
  const cb      = params.callback || 'cb';

  let result;
  try {
    result = route(action, params);
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  const json = JSON.stringify(result);
  return ContentService
    .createTextOutput(`${cb}(${json})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function route(action, params) {
  switch (action) {
    // B1
    case 'verifyPin':      return verifyPin(params);
    case 'getSettings':    return getSettings();
    case 'updateSettings': return updateSettings(params);
    // B2
    case 'searchFoods':    return searchFoods(params);
    case 'getFavourites':  return getFavourites(params);
    case 'toggleFavourite': return toggleFavourite(params);
    default:
      return { ok: false, error: `Unknown action: ${action}` };
  }
}

// ── Auth helpers ─────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  return ss.getSheetByName(name);
}

function verifyToken(token) {
  if (!token) return false;
  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  for (const row of data) {
    if (row[0] === 'session_token') return row[1] === token;
  }
  return false;
}

// ── B1: Auth ─────────────────────────────────────────────────

function verifyPin(params) {
  let hash = '';
  try {
    const payload = JSON.parse(decodeURIComponent(params.payload || '{}'));
    hash = payload.hash || payload.pinHash || '';
  } catch (e) {
    return { ok: false, error: 'Invalid payload' };
  }
  if (!hash) return { ok: false, error: 'Missing hash' };
  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();

  let storedHash = '';
  for (const row of data) {
    if (row[0] === 'pin_hash') { storedHash = row[1]; break; }
  }
  if (!storedHash || hash !== storedHash) {
    return { ok: false, error: 'Invalid PIN' };
  }

  const token = Utilities.getUuid();
  let tokenRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === 'session_token') { tokenRow = i + 1; break; }
  }
  if (tokenRow > 0) {
    sh.getRange(tokenRow, 2).setValue(token);
  } else {
    sh.appendRow(['session_token', token]);
  }
  return { ok: true, data: { token } };
}

// ── B1: Settings ─────────────────────────────────────────────

function getSettings() {
  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  const settings = {};
  for (const row of data) {
    if (row[0]) settings[row[0]] = row[1];
  }
  return { ok: true, data: settings };
}

function updateSettings(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };

  let payload;
  try {
    payload = JSON.parse(decodeURIComponent(params.payload || '{}'));
  } catch (e) {
    return { ok: false, error: 'Invalid payload JSON' };
  }

  // Never overwrite pin_hash
  delete payload['pin_hash'];
  delete payload['session_token'];

  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  const keyIndex = {};
  for (let i = 0; i < data.length; i++) {
    keyIndex[data[i][0]] = i + 1;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (keyIndex[key]) {
      sh.getRange(keyIndex[key], 2).setValue(value);
    } else {
      sh.appendRow([key, value]);
    }
  }
  return { ok: true, data: null };
}

// ── B2: Food Search ──────────────────────────────────────────
// NutritionDB is cached client-side after first load.
// searchFoods is called only when client-side cache is cold (first load).
// Returns all rows: { no, name, amount, unit, cals, protein, carbs, fat, fibre, sodium, potassium, category }

function searchFoods(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };

  const q = (params.q || '').toLowerCase().trim();

  const dbSheet  = getSheet(CONFIG.sheets.nutritionDb);
  const cfSheet  = getSheet(CONFIG.sheets.customFoods);

  const dbFoods  = loadNutritionDB(dbSheet, q);
  const cfFoods  = loadCustomFoods(cfSheet, q);

  return { ok: true, data: [...dbFoods, ...cfFoods] };
}

function loadNutritionDB(sheet, q) {
  const rows = sheet.getDataRange().getValues();
  // Row index 1 = header row (row 2 in Sheets = index 1 in 0-based array)
  const COL = CONFIG.columns.nutritionDb;
  const results = [];

  for (let i = 2; i < rows.length; i++) {
    const row  = rows[i];
    const name = String(row[COL.name] || '').toLowerCase();
    if (!row[COL.no]) continue;
    if (q && !name.includes(q)) continue;

    results.push(buildFoodRecord(row, COL, false));
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
    const row  = rows[i];
    const name = String(row[COL.name] || '').toLowerCase();
    if (!row[COL.no]) continue;
    if (q && !name.includes(q)) continue;
    results.push(buildCustomFoodRecord(row, COL));
  }
  return results;
}

function buildFoodRecord(row, COL, isCustom) {
  const protein = Number(row[COL.protein]) || 0;
  const carbs   = Number(row[COL.carbs])   || 0;
  const fat     = Number(row[COL.fat])     || 0;

  return {
    no:       Number(row[COL.no]),
    name:     String(row[COL.name]   || ''),
    amount:   Number(row[COL.amount] || 100),
    unit:     String(row[COL.unit]   || 'g'),
    calories: Math.round(fat * 9 + carbs * 4 + protein * 4),
    protein:  protein,
    carbs:    carbs,
    fat:      fat,
    fibre:    Number(row[COL.fibre]     || 0),
    sodium:   Number(row[COL.sodium]    || 0),
    potassium:Number(row[COL.potassium] || 0),
    category:    String(row[COL.category]     || ''),
    subcategory: String(row[COL.subcategory]  || ''),
    isCustom: isCustom,
  };
}

function buildCustomFoodRecord(row, COL) {
  const protein = Number(row[COL.protein]) || 0;
  const carbs   = Number(row[COL.carbs])   || 0;
  const fat     = Number(row[COL.fat])     || 0;

  return {
    no:         Number(row[COL.no]),
    name:       String(row[COL.name]   || ''),
    amount:     Number(row[COL.amount] || 100),
    unit:       String(row[COL.unit]   || 'g'),
    calories:   Math.round(fat * 9 + carbs * 4 + protein * 4),
    protein:    protein,
    carbs:      carbs,
    fat:        fat,
    fibre:      Number(row[COL.fibre]     || 0),
    sodium:     Number(row[COL.sodium]    || 0),
    potassium:  Number(row[COL.potassium] || 0),
    category:   'Custom',
    isCustom:   true,
    isQuickAdd: row[COL.isQuickAdd] === true || row[COL.isQuickAdd] === 'TRUE',
  };
}

// ── B2: Favourites ───────────────────────────────────────────

function getFavourites(params) {
  const token = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };

  const sh   = getSheet(CONFIG.sheets.favourites);
  const rows = sh.getDataRange().getValues();
  const ids  = [];

  for (let i = 1; i < rows.length; i++) {
    const no = Number(rows[i][0]);
    if (no) ids.push(no);
  }
  return { ok: true, data: ids };
}

function toggleFavourite(params) {
  const token  = params.token || '';
  if (!verifyToken(token)) return { ok: false, error: 'Unauthorized' };

  let foodNo = 0;
  try {
    const payload = JSON.parse(decodeURIComponent(params.payload || '{}'));
    foodNo = Number(payload.foodNo || 0);
  } catch (e) {
    return { ok: false, error: 'Invalid payload' };
  }
  if (!foodNo) return { ok: false, error: 'Missing foodNo' };

  const sh   = getSheet(CONFIG.sheets.favourites);
  const rows = sh.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === foodNo) {
      sh.deleteRow(i + 1);
      return { ok: true, data: { added: false } };
    }
  }

  sh.appendRow([foodNo]);
  return { ok: true, data: { added: true } };
}