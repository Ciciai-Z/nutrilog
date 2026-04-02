// ============================================================
// NutriLog — Google Apps Script Backend
// B6: addQuickAdd (writes CustomFoods IS_QUICK_ADD=TRUE + DailyLog)
//     deleteLogEntry: cascade-deletes CustomFoods if IS_QUICK_ADD=TRUE
// ============================================================

function doGet(e) {
  const params = e.parameter || {};
  const cb     = params.callback || 'cb';
  let result;
  try { result = route(params.action || '', params); }
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
    case 'addLogEntry':     return addLogEntry(params);
    case 'deleteLogEntry':  return deleteLogEntry(params);
    case 'updateLogEntry':  return updateLogEntry(params);
    case 'syncDailySummary':return syncDailySummary(params);
    case 'addQuickAdd':     return addQuickAdd(params);
    case 'getMeals':        return getMeals(params);
    case 'saveMeal':        return saveMeal(params);
    case 'deleteMeal':      return deleteMeal(params);
    case 'getHistory':      return getHistory(params);
    default: return { ok: false, error: `Unknown action: ${action}` };
  }
}

function getSheet(name) {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(name);
}

// Single-user: any non-empty token is valid
function verifyToken(token) {
  return typeof token === 'string' && token.length > 0;
}

// ── Helper: parse amount from cell value ──────────────────────
function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const str = String(raw).replace(/^'+/, '').trim();
  const n = parseFloat(str);
  return (!isNaN(n) && n > 0) ? n : null;
}

// ── Helper: parse unit from cell value ────────────────────────
function parseUnit(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).replace(/^'+/, '').trim();
  return str !== '' ? str : null;
}

// ── B1: verifyPin ──────────────────────────────────────────────
function verifyPin(params) {
  let hash = '';
  try {
    const p = JSON.parse(decodeURIComponent(params.payload || '{}'));
    hash = p.hash || p.pinHash || '';
  } catch (e) { return { ok: false, error: 'Invalid payload' }; }
  if (!hash) return { ok: false, error: 'Missing hash' };
  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  let storedHash = '';
  for (const row of data) { if (row[0] === 'pin_hash') { storedHash = row[1]; break; } }
  if (!storedHash || hash !== storedHash) return { ok: false, error: 'Invalid PIN' };
  const token    = Utilities.getUuid();
  let tokenRow   = -1;
  for (let i = 0; i < data.length; i++) { if (data[i][0] === 'session_token') { tokenRow = i + 1; break; } }
  if (tokenRow > 0) sh.getRange(tokenRow, 2).setValue(token);
  else sh.appendRow(['session_token', token]);
  return { ok: true, data: { token } };
}

// ── B1: Settings ───────────────────────────────────────────────
function getSettings() {
  const data = getSheet(CONFIG.sheets.settings).getDataRange().getValues();
  const s = {};
  for (const row of data) { if (row[0]) s[row[0]] = row[1]; }
  return { ok: true, data: s };
}

function updateSettings(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let settings;
  try {
    const p = JSON.parse(decodeURIComponent(params.payload || '{}'));
    settings = p.settings || p;
  } catch (e) { return { ok: false, error: 'Invalid payload JSON' }; }
  delete settings['pin_hash']; delete settings['session_token'];
  const sh   = getSheet(CONFIG.sheets.settings);
  const data = sh.getDataRange().getValues();
  const idx  = {};
  for (let i = 0; i < data.length; i++) idx[data[i][0]] = i + 1;
  for (const [k, v] of Object.entries(settings)) {
    if (idx[k]) sh.getRange(idx[k], 2).setValue(v);
    else sh.appendRow([k, v]);
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
  const amount  = parseAmount(r[C.amount]) || 100;
  const unit    = parseUnit(r[C.unit])     || 'g';
  return {
    no:          Number(r[C.no]),
    name:        String(r[C.name] || ''),
    amount, unit,
    calories:    Math.round(fat * 9 + carbs * 4 + protein * 4),
    protein, carbs, fat,
    fibre:       Number(r[C.fibre]       || 0),
    sodium:      Number(r[C.sodium]      || 0),
    potassium:   Number(r[C.potassium]   || 0),
    category:    String(r[C.category]    || ''),
    subcategory: String(r[C.subcategory] || ''),
    isCustom:    false,
  };
}

function buildCustomFoodRecord(r, C) {
  const protein = Number(r[C.protein]) || 0;
  const carbs   = Number(r[C.carbs])   || 0;
  const fat     = Number(r[C.fat])     || 0;
  const amount  = parseAmount(r[C.amount]) || 100;
  const unit    = parseUnit(r[C.unit])     || 'g';
  return {
    no:        Number(r[C.no]),
    name:      String(r[C.name] || ''),
    amount, unit,
    calories:  Math.round(fat * 9 + carbs * 4 + protein * 4),
    protein, carbs, fat,
    fibre:     Number(r[C.fibre]      || 0),
    sodium:    Number(r[C.sodium]     || 0),
    potassium: Number(r[C.potassium]  || 0),
    category:  'Custom',
    isCustom:  true,
    isQuickAdd: r[C.isQuickAdd] === true || r[C.isQuickAdd] === 'TRUE',
  };
}

// ── B2: Favourites ─────────────────────────────────────────────
function getFavourites(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  const rows = getSheet(CONFIG.sheets.favourites).getDataRange().getValues();
  const ids  = [];
  for (let i = 1; i < rows.length; i++) { const no = Number(rows[i][0]); if (no) ids.push(no); }
  return { ok: true, data: ids };
}

function toggleFavourite(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let foodNo = 0;
  try { foodNo = Number(JSON.parse(decodeURIComponent(params.payload || '{}')).foodNo || 0); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  if (!foodNo) return { ok: false, error: 'Missing foodNo' };
  const sh   = getSheet(CONFIG.sheets.favourites);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === foodNo) { sh.deleteRow(i + 1); return { ok: true, data: { added: false } }; }
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
  const dt  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "d/M/yy H:mm");
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

// ── B5: deleteLogEntry — B6: cascade Quick Add ─────────────────
function deleteLogEntry(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let payload;
  try { payload = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  const rowIndex = Number(payload.rowIndex);
  if (!rowIndex || rowIndex < 2) return { ok: false, error: 'Invalid rowIndex' };

  const logSh  = getSheet(CONFIG.sheets.dailyLog);
  const logRow = logSh.getRange(rowIndex, 1, 1, 14).getValues()[0];
  const CL     = CONFIG.columns.dailyLog;
  const foodNo = logRow[CL.foodNo] ? Number(logRow[CL.foodNo]) : null;

  // B6: cascade-delete CustomFoods + Favourites if IS_QUICK_ADD = TRUE
  if (foodNo && foodNo >= 50001) {
    const cfSh   = getSheet(CONFIG.sheets.customFoods);
    const cfRows = cfSh.getDataRange().getValues();
    const CC     = CONFIG.columns.customFoods;
    for (let i = 1; i < cfRows.length; i++) {
      if (Number(cfRows[i][CC.no]) === foodNo) {
        const isQA = cfRows[i][CC.isQuickAdd] === true || cfRows[i][CC.isQuickAdd] === 'TRUE';
        if (isQA) {
          cfSh.deleteRow(i + 1);
          // Also remove from Favourites if starred
          const favSh   = getSheet(CONFIG.sheets.favourites);
          const favRows = favSh.getDataRange().getValues();
          for (let j = 1; j < favRows.length; j++) {
            if (Number(favRows[j][0]) === foodNo) { favSh.deleteRow(j + 1); break; }
          }
        }
        break;
      }
    }
  }

  logSh.deleteRow(rowIndex);
  return { ok: true, data: null };
}

// ── B5: updateLogEntry ─────────────────────────────────────────
function updateLogEntry(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let payload;
  try { payload = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  const rowIndex  = Number(payload.rowIndex);
  const newAmount = Number(payload.amount);
  if (!rowIndex || rowIndex < 2) return { ok: false, error: 'Invalid rowIndex' };
  if (!newAmount || newAmount <= 0) return { ok: false, error: 'Invalid amount' };
  const sh    = getSheet(CONFIG.sheets.dailyLog);
  const C     = CONFIG.columns.dailyLog;
  const row   = sh.getRange(rowIndex, 1, 1, 14).getValues()[0];
  const ratio = newAmount / (Number(row[C.amount]) || 1);
  sh.getRange(rowIndex, C.amount   + 1).setValue(newAmount);
  sh.getRange(rowIndex, C.calories + 1).setValue(Math.round((Number(row[C.calories]) || 0) * ratio));
  sh.getRange(rowIndex, C.protein  + 1).setValue(Math.round(((Number(row[C.protein])  || 0) * ratio) * 10) / 10);
  sh.getRange(rowIndex, C.carbs    + 1).setValue(Math.round(((Number(row[C.carbs])    || 0) * ratio) * 10) / 10);
  sh.getRange(rowIndex, C.fat      + 1).setValue(Math.round(((Number(row[C.fat])      || 0) * ratio) * 10) / 10);
  sh.getRange(rowIndex, C.fibre    + 1).setValue(Math.round(((Number(row[C.fibre])    || 0) * ratio) * 10) / 10);
  sh.getRange(rowIndex, C.sodium   + 1).setValue(Math.round((Number(row[C.sodium])    || 0) * ratio));
  sh.getRange(rowIndex, C.potassium+ 1).setValue(Math.round((Number(row[C.potassium]) || 0) * ratio));
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
  const totals  = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
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
  newRow[CS.protein]       = Math.round(totals.protein * 10) / 10;
  newRow[CS.carbsTarget]   = settingsMap['carbs_target']   || '';
  newRow[CS.carbs]         = Math.round(totals.carbs * 10) / 10;
  newRow[CS.fatTarget]     = settingsMap['fat_target']     || '';
  newRow[CS.fat]           = Math.round(totals.fat * 10) / 10;
  newRow[CS.fibreTarget]   = settingsMap['fibre_target']   || '';
  newRow[CS.fibre]         = Math.round(totals.fibre * 10) / 10;
  for (let i = 2; i < sumRows.length; i++) {
    if (norm(String(sumRows[i][CS.date])) === norm(date)) {
      sumSh.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      return { ok: true, data: { updated: true } };
    }
  }
  sumSh.appendRow(newRow);
  return { ok: true, data: { updated: false } };
}

// ── B6: addQuickAdd ────────────────────────────────────────────
// Writes CustomFoods (IS_QUICK_ADD=TRUE) + DailyLog in one call
function addQuickAdd(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let e;
  try { e = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (err) { return { ok: false, error: 'Invalid payload' }; }

  // 1. Generate new foodNo: max existing CustomFoods no + 1, floor at 50001
  const cfSh   = getSheet(CONFIG.sheets.customFoods);
  const cfRows = cfSh.getDataRange().getValues();
  const CC     = CONFIG.columns.customFoods;
  let maxNo    = 50000;
  for (let i = 1; i < cfRows.length; i++) {
    const n = Number(cfRows[i][CC.no]);
    if (n > maxNo) maxNo = n;
  }
  const foodNo = maxNo + 1;

  // 2. Store caller's calories directly (Quick Add: user enters known value)
  const protein  = Math.round((Number(e.protein)  || 0) * 10) / 10;
  const carbs    = Math.round((Number(e.carbs)    || 0) * 10) / 10;
  const fat      = Math.round((Number(e.fat)      || 0) * 10) / 10;
  const fibre    = Math.round((Number(e.fibre)    || 0) * 10) / 10;
  const calories = Math.round(Number(e.calories)  || 0);  // stored as-is
  const name     = String(e.name || '').trim();
  if (!name) return { ok: false, error: 'Name is required' };
  if (!calories || calories <= 0) return { ok: false, error: 'Calories is required' };
  const dt       = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "d/M/yy H:mm");

  // 3. Write CustomFoods row
  const cfRow = new Array(13).fill('');
  cfRow[CC.no]              = foodNo;
  cfRow[CC.name]            = name;
  cfRow[CC.amount]          = 1;
  cfRow[CC.unit]            = 'serving';
  cfRow[CC.calories]        = calories;
  cfRow[CC.protein]         = protein;
  cfRow[CC.carbs]           = carbs;
  cfRow[CC.fat]             = fat;
  cfRow[CC.fibre]           = fibre;
  cfRow[CC.sodium]          = Number(e.sodium)    || 0;
  cfRow[CC.potassium]       = Number(e.potassium) || 0;
  cfRow[CC.isQuickAdd]      = true;
  cfRow[CC.createdDatetime] = dt;
  cfSh.appendRow(cfRow);

  // 4. Write DailyLog row
  const logSh  = getSheet(CONFIG.sheets.dailyLog);
  const CL     = CONFIG.columns.dailyLog;
  const logRow = new Array(14).fill('');
  logRow[CL.date]            = e.date;
  logRow[CL.mealType]        = e.mealType || 'Other';
  logRow[CL.foodNo]          = foodNo;
  logRow[CL.name]            = name;
  logRow[CL.amount]          = 1;
  logRow[CL.unit]            = 'serving';
  logRow[CL.calories]        = calories;
  logRow[CL.protein]         = protein;
  logRow[CL.carbs]           = carbs;
  logRow[CL.fat]             = fat;
  logRow[CL.fibre]           = fibre;
  logRow[CL.sodium]          = Number(e.sodium)    || 0;
  logRow[CL.potassium]       = Number(e.potassium) || 0;
  logRow[CL.createdDatetime] = dt;
  logSh.appendRow(logRow);

  return { ok: true, data: { foodNo, rowIndex: logSh.getLastRow(), calories } };
}

// ── B8: getMeals ───────────────────────────────────────────────
function getMeals(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  const sh   = getSheet(CONFIG.sheets.meals);
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return { ok: true, data: [] };
  const CM = CONFIG.columns.meals;
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[CM.mealNo]) continue;
    out.push({
      mealNo:   String(r[CM.mealNo]),
      name:     String(r[CM.name]     || ''),
      food:     String(r[CM.food]     || ''),
      amount:   Number(r[CM.amount]   || 0),
      unit:     String(r[CM.unit]     || 'g'),
      calories: Number(r[CM.calories] || 0),
      protein:  Number(r[CM.protein]  || 0),
      carbs:    Number(r[CM.carbs]    || 0),
      fat:      Number(r[CM.fat]      || 0),
      fibre:    Number(r[CM.fibre]    || 0),
    });
  }
  return { ok: true, data: out };
}

// ── B8: saveMeal ───────────────────────────────────────────────
function saveMeal(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let payload;
  try { payload = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  const name  = String(payload.name || '').trim();
  const foods = payload.foods || [];
  if (!name)         return { ok: false, error: 'Name required' };
  if (!foods.length) return { ok: false, error: 'No foods' };

  // Generate new meal number: max existing + 1, format as meal001
  const sh   = getSheet(CONFIG.sheets.meals);
  const rows = sh.getDataRange().getValues();
  const CM   = CONFIG.columns.meals;
  let maxN   = 0;
  for (let i = 1; i < rows.length; i++) {
    const mn = String(rows[i][CM.mealNo] || '').replace(/\D/g, '');
    const n  = parseInt(mn) || 0;
    if (n > maxN) maxN = n;
  }
  const mealNo = 'meal' + String(maxN + 1).padStart(3, '0');
  const dt     = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "d/M/yy H:mm");
  const date   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEE,d/M/yy");

  for (const f of foods) {
    const row = new Array(12).fill('');
    row[CM.date]            = date;
    row[CM.mealNo]          = mealNo;
    row[CM.name]            = name;
    row[CM.food]            = String(f.foodName || '');
    row[CM.amount]          = Number(f.amount)   || 0;
    row[CM.unit]            = String(f.unit      || 'g');
    row[CM.calories]        = Number(f.calories) || 0;
    row[CM.protein]         = Number(f.protein)  || 0;
    row[CM.carbs]           = Number(f.carbs)    || 0;
    row[CM.fat]             = Number(f.fat)      || 0;
    row[CM.fibre]           = Number(f.fibre)    || 0;
    row[CM.createdDatetime] = dt;
    sh.appendRow(row);
  }
  return { ok: true, data: { mealNo } };
}

// ── B8: deleteMeal ─────────────────────────────────────────────
function deleteMeal(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  let payload;
  try { payload = JSON.parse(decodeURIComponent(params.payload || '{}')); }
  catch (e) { return { ok: false, error: 'Invalid payload' }; }
  const mealNo = String(payload.mealNo || '').trim();
  if (!mealNo) return { ok: false, error: 'Missing mealNo' };
  const sh   = getSheet(CONFIG.sheets.meals);
  const rows = sh.getDataRange().getValues();
  const CM   = CONFIG.columns.meals;
  // Delete from bottom up to avoid row index shifting
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][CM.mealNo]) === mealNo) sh.deleteRow(i + 1);
  }
  return { ok: true, data: null };
}

// ── B9: getHistory ─────────────────────────────────────────────
function getHistory(params) {
  if (!verifyToken(params.token || '')) return { ok: false, error: 'Unauthorized' };
  const sh   = getSheet(CONFIG.sheets.dailySummary);
  const rows = sh.getDataRange().getValues();
  const CS   = CONFIG.columns.dailySummary;
  const out  = [];
  // Skip header rows (rows 1 and 2)
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r[CS.date]) continue;
    out.push({
      date:          String(r[CS.date]),
      calorieTarget: Number(r[CS.calorieTarget] || 0),
      calories:      Number(r[CS.calories]      || 0),
      proteinTarget: Number(r[CS.proteinTarget]  || 0),
      protein:       Number(r[CS.protein]        || 0),
      carbsTarget:   Number(r[CS.carbsTarget]    || 0),
      carbs:         Number(r[CS.carbs]          || 0),
      fatTarget:     Number(r[CS.fatTarget]      || 0),
      fat:           Number(r[CS.fat]            || 0),
      fibreTarget:   Number(r[CS.fibreTarget]    || 0),
      fibre:         Number(r[CS.fibre]          || 0),
    });
  }
  return { ok: true, data: out };
}
