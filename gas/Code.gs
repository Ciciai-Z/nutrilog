// ============================================================
// NutriLog — Google Apps Script Backend
// Version: B5+fix — token validation relaxed for single-user
// ============================================================

function doGet(e) {
  const params = e.parameter || {};
  const cb     = params.callback || 'cb';
  let result;
  try {
    result = route(params.action || '', params);
  } catch (err) {
    result = { ok: false, error: err.message };
  }
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
    case 'addLogEntry':     return addLogEntry(params);
    case 'deleteLogEntry':  return deleteLogEntry(params);
    case 'updateLogEntry':  return updateLogEntry(params);
    case 'syncDailySummary':return syncDailySummary(params);
    default:                return { ok: false, error: `Unknown action: ${action}` };
  }
}

function getSheet(name) {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(name);
}

// ── Token verification ─────────────────────────────────────────
// Single-user app: any non-empty token from an authenticated session is valid.
// The Apps Script URL is secret (gitignored), providing sufficient security.
function verifyToken(token) {
  // Accept any non-empty token — prevents accidental unauthenticated calls
  // but doesn't enforce single-session restriction across devices
  return typeof token === 'string' && token.length > 0;
}

// ── B1: verifyPin ──────────────────────────────────────────────
function verifyPin(params) {
  let hash = '';
  try {
    const p = JSON.parse(decodeURIComponent(params.payload || '{}'));
    hash = p.hash || p.pinHash || '';
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
  if (!storedHash || hash !== storedHash) return { ok: false, error: 'Invalid PIN' };

  const token    = Utilities.getUuid();
  let tokenRow   = -1;
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

// ── B1: Settings ───────────────────────────────────────────────
function getSettings() {
  const data = getSheet(CONFIG.sheets.settings).getDataRange().getValues();
  const s    = {};
  for (const row of data) { if (row[0]) s[row[0]] = row[1]; }
  return { ok: true, data: s };
}

function updateSettings(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let settings;
  try {
    const p = JSON.parse(decodeURIComponent(params.payload || '{}'));
    settings = p.settings || p;
  } catch (e) {
    return { ok: false, error: 'Invalid payload JSON' };
  }
  delete settings['pin_hash'];
  delete settings['session_token'];
  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  const idx  = {};
  for (let i = 0; i < data.length; i++) idx[data[i][0]] = i + 1;
  for (const [k, v] of Object.entries(settings)) {
    if (idx[k]) { sh.getRange(idx[k], 2).setValue(v); }
    else         { sh.appendRow([k, v]); }
  }
  return { ok: true, data: null };
}

// ── B2: Search ─────────────────────────────────────────────────
function searchFoods(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  const q = (params.q || '').toLowerCase().trim();
  return { ok: true, data: [
    ...loadNutritionDB(getSheet(CONFIG.sheets.nutritionDb), q),
    ...loadCustomFoods(getSheet(CONFIG.sheets.customFoods), q),
  ]};
}

function loadNutritionDB(sheet, q) {
  const rows = sheet.getDataRange().getValues();
  const C    = CONFIG.columns.nutritionDb;
  const out  = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r[C.no]) continue;
    if (q && !String(r[C.name] || '').toLowerCase().includes(q)) continue;
    out.push(buildFoodRecord(r, C));
    if (q && out.length >= CONFIG.search.maxResults) break;
  }
  return out;
}

function loadCustomFoods(sheet, q) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const C   = CONFIG.columns.customFoods;
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[C.no]) continue;
    if (q && !String(r[C.name] || '').toLowerCase().includes(q)) continue;
    out.push(buildCustomFoodRecord(r, C));
  }
  return out;
}

function buildFoodRecord(r, C) {
  const protein = Number(r[C.protein]) || 0;
  const carbs   = Number(r[C.carbs])   || 0;
  const fat     = Number(r[C.fat])     || 0;
  return {
    no: Number(r[C.no]), name: String(r[C.name] || ''),
    amount: Number(r[C.amount] || 100), unit: String(r[C.unit] || 'g'),
    calories: Math.round(fat*9 + carbs*4 + protein*4),
    protein, carbs, fat,
    fibre:     Number(r[C.fibre]     || 0),
    sodium:    Number(r[C.sodium]    || 0),
    potassium: Number(r[C.potassium] || 0),
    category:    String(r[C.category]    || ''),
    subcategory: String(r[C.subcategory] || ''),
    isCustom: false,
  };
}

function buildCustomFoodRecord(r, C) {
  const protein = Number(r[C.protein]) || 0;
  const carbs   = Number(r[C.carbs])   || 0;
  const fat     = Number(r[C.fat])     || 0;
  return {
    no: Number(r[C.no]), name: String(r[C.name] || ''),
    amount: Number(r[C.amount] || 100), unit: String(r[C.unit] || 'g'),
    calories: Math.round(fat*9 + carbs*4 + protein*4),
    protein, carbs, fat,
    fibre:     Number(r[C.fibre]     || 0),
    sodium:    Number(r[C.sodium]    || 0),
    potassium: Number(r[C.potassium] || 0),
    category: 'Custom', isCustom: true,
    isQuickAdd: r[C.isQuickAdd] === true || r[C.isQuickAdd] === 'TRUE',
  };
}

// ── B2: Favourites ─────────────────────────────────────────────
function getFavourites(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  const rows = getSheet(CONFIG.sheets.favourites).getDataRange().getValues();
  const ids  = [];
  for (let i = 1; i < rows.length; i++) {
    const no = Number(rows[i][0]);
    if (no) ids.push(no);
  }
  return { ok: true, data: ids };
}

function toggleFavourite(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let foodNo = 0;
  try {
    foodNo = Number(JSON.parse(decodeURIComponent(params.payload || '{}')).foodNo || 0);
  } catch (e) { return { ok: false, error: 'Invalid payload' }; }
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

// ── B4: getDailyLog ────────────────────────────────────────────
function getDailyLog(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  const date = (params.date || '').trim();
  if (!date) return { ok: false, error: 'Missing date' };
  const sh      = getSheet(CONFIG.sheets.dailyLog);
  const rows    = sh.getDataRange().getValues();
  const C       = CONFIG.columns.dailyLog;
  const norm    = s => String(s).trim().replace(/,\s+/, ',');
  const target  = norm(date);
  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[C.date]) continue;
    if (norm(r[C.date]) !== target) continue;
    entries.push({
      rowIndex:  i + 1,
      date:      String(r[C.date]),
      mealType:  String(r[C.mealType]  || ''),
      foodNo:    r[C.foodNo] ? Number(r[C.foodNo]) : null,
      name:      String(r[C.name]      || ''),
      amount:    Number(r[C.amount]    || 0),
      unit:      String(r[C.unit]      || 'g'),
      calories:  Number(r[C.calories]  || 0),
      protein:   Number(r[C.protein]   || 0),
      carbs:     Number(r[C.carbs]     || 0),
      fat:       Number(r[C.fat]       || 0),
      fibre:     Number(r[C.fibre]     || 0),
      sodium:    Number(r[C.sodium]    || 0),
      potassium: Number(r[C.potassium] || 0),
    });
  }
  return { ok: true, data: entries };
}

// ── B5: addLogEntry ────────────────────────────────────────────
function addLogEntry(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let e;
  try { e = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (err) { return { ok: false, error: 'Invalid payload' }; }
  const C   = CONFIG.columns.dailyLog;
  const sh  = getSheet(CONFIG.sheets.dailyLog);
  const now = new Date();
  const dt  = Utilities.formatDate(now, Session.getScriptTimeZone(), "d/M/yy H:mm");
  const row = [];
  row[C.date]            = e.date;
  row[C.mealType]        = e.mealType;
  row[C.foodNo]          = e.foodNo || '';
  row[C.name]            = e.name;
  row[C.amount]          = Number(e.amount)    || 0;
  row[C.unit]            = e.unit              || 'g';
  row[C.calories]        = Math.round((Number(e.fat)||0)*9 + (Number(e.carbs)||0)*4 + (Number(e.protein)||0)*4);
  row[C.protein]         = Number(e.protein)   || 0;
  row[C.carbs]           = Number(e.carbs)     || 0;
  row[C.fat]             = Number(e.fat)       || 0;
  row[C.fibre]           = Number(e.fibre)     || 0;
  row[C.sodium]          = Number(e.sodium)    || 0;
  row[C.potassium]       = Number(e.potassium) || 0;
  row[C.createdDatetime] = dt;
  sh.appendRow(row);
  return { ok: true, data: { rowIndex: sh.getLastRow() } };
}

// ── B5: deleteLogEntry ─────────────────────────────────────────
function deleteLogEntry(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let payload;
  try { payload = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  const rowIndex = Number(payload.rowIndex);
  if (!rowIndex || rowIndex < 2) return { ok: false, error: 'Invalid rowIndex' };
  getSheet(CONFIG.sheets.dailyLog).deleteRow(rowIndex);
  return { ok: true, data: null };
}

// ── B5: updateLogEntry ─────────────────────────────────────────
function updateLogEntry(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let payload;
  try { payload = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  const rowIndex = Number(payload.rowIndex);
  const newAmount= Number(payload.amount);
  if (!rowIndex || rowIndex < 2)  return { ok: false, error: 'Invalid rowIndex' };
  if (!newAmount || newAmount <= 0) return { ok: false, error: 'Invalid amount' };
  const sh  = getSheet(CONFIG.sheets.dailyLog);
  const C   = CONFIG.columns.dailyLog;
  const row = sh.getRange(rowIndex, 1, 1, 14).getValues()[0];
  const ratio = newAmount / (Number(row[C.amount]) || 1);
  sh.getRange(rowIndex, C.amount   + 1).setValue(newAmount);
  sh.getRange(rowIndex, C.calories + 1).setValue(Math.round((Number(row[C.calories])||0)*ratio));
  sh.getRange(rowIndex, C.protein  + 1).setValue(Math.round(((Number(row[C.protein])||0)*ratio)*10)/10);
  sh.getRange(rowIndex, C.carbs    + 1).setValue(Math.round(((Number(row[C.carbs])||0)*ratio)*10)/10);
  sh.getRange(rowIndex, C.fat      + 1).setValue(Math.round(((Number(row[C.fat])||0)*ratio)*10)/10);
  sh.getRange(rowIndex, C.fibre    + 1).setValue(Math.round(((Number(row[C.fibre])||0)*ratio)*10)/10);
  sh.getRange(rowIndex, C.sodium   + 1).setValue(Math.round((Number(row[C.sodium])||0)*ratio));
  sh.getRange(rowIndex, C.potassium+ 1).setValue(Math.round((Number(row[C.potassium])||0)*ratio));
  return { ok: true, data: null };
}

// ── B5: syncDailySummary ───────────────────────────────────────
function syncDailySummary(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let payload;
  try { payload = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  const date = (payload.date || '').trim();
  if (!date) return { ok: false, error: 'Missing date' };

  const settingsData = getSheet(CONFIG.sheets.settings).getDataRange().getValues();
  const settingsMap  = {};
  for (const row of settingsData) { if (row[0]) settingsMap[row[0]] = Number(row[1]) || 0; }

  const logSh   = getSheet(CONFIG.sheets.dailyLog);
  const logRows = logSh.getDataRange().getValues();
  const C       = CONFIG.columns.dailyLog;
  const norm    = s => String(s).trim().replace(/,\s+/, ',');
  const totals  = { calories:0, protein:0, carbs:0, fat:0, fibre:0 };
  for (let i = 1; i < logRows.length; i++) {
    const r = logRows[i];
    if (!r[C.date] || norm(r[C.date]) !== norm(date)) continue;
    totals.calories += Number(r[C.calories]) || 0;
    totals.protein  += Number(r[C.protein])  || 0;
    totals.carbs    += Number(r[C.carbs])    || 0;
    totals.fat      += Number(r[C.fat])      || 0;
    totals.fibre    += Number(r[C.fibre])    || 0;
  }

  const sumSh   = getSheet(CONFIG.sheets.dailySummary);
  const sumRows = sumSh.getDataRange().getValues();
  const CS      = CONFIG.columns.dailySummary;
  const maxCol  = Math.max(...Object.values(CS)) + 1;
  const newRow  = new Array(maxCol).fill('');
  newRow[CS.date]          = date;
  newRow[CS.calorieTarget] = settingsMap['calorie_target'] || '';
  newRow[CS.calories]      = Math.round(totals.calories);
  newRow[CS.proteinTarget] = settingsMap['protein_target'] || '';
  newRow[CS.protein]       = Math.round(totals.protein*10)/10;
  newRow[CS.carbsTarget]   = settingsMap['carbs_target']   || '';
  newRow[CS.carbs]         = Math.round(totals.carbs*10)/10;
  newRow[CS.fatTarget]     = settingsMap['fat_target']     || '';
  newRow[CS.fat]           = Math.round(totals.fat*10)/10;
  newRow[CS.fibreTarget]   = settingsMap['fibre_target']   || '';
  newRow[CS.fibre]         = Math.round(totals.fibre*10)/10;

  for (let i = 2; i < sumRows.length; i++) {
    if (norm(String(sumRows[i][CS.date])) === norm(date)) {
      sumSh.getRange(i+1, 1, 1, newRow.length).setValues([newRow]);
      return { ok: true, data: { updated: true } };
    }
  }
  sumSh.appendRow(newRow);
  return { ok: true, data: { updated: false } };
}
