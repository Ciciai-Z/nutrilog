// ============================================================
// Code.gs — NutriLog Apps Script 路由
// 版本: B1 | 2026-03-22
// 包含: verifyPin + getSettings + updateSettings 端点
// ============================================================

// ── 响应工具函数 ─────────────────────────────────────────────

function ok(data) {
  const payload = JSON.stringify({ ok: true, data: data });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function err(message) {
  const payload = JSON.stringify({ ok: false, error: message });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

// ── Token 管理 ───────────────────────────────────────────────

function generateToken() {
  return Utilities.getUuid();
}

function saveToken(token) {
  PropertiesService.getScriptProperties().setProperty('session_token', token);
}

function isValidToken(token) {
  const saved = PropertiesService.getScriptProperties().getProperty('session_token');
  return saved && saved === token;
}

// ── doGet 路由 ───────────────────────────────────────────────

function doGet(e) {
  try {
    const action = e.parameter.action;
    const token  = e.parameter.token;

    if (action === 'ping') return ok('pong');

    if (!isValidToken(token)) return err('Unauthorized');

    switch (action) {
      case 'getSettings': return handleGetSettings();
      default:            return err('Unknown action: ' + action);
    }
  } catch (ex) {
    return err(ex.message);
  }
}

// ── doPost 路由 ──────────────────────────────────────────────

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const token  = body.token;

    if (action === 'verifyPin') return handleVerifyPin(body);

    if (!isValidToken(token)) return err('Unauthorized');

    switch (action) {
      case 'updateSettings': return handleUpdateSettings(body);
      default:               return err('Unknown action: ' + action);
    }
  } catch (ex) {
    return err(ex.message);
  }
}

// ── verifyPin ────────────────────────────────────────────────

function handleVerifyPin(body) {
  const { pinHash } = body;
  if (!pinHash) return err('Missing pinHash');

  const sheet  = getSheet(SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();

  let storedHash = null;
  for (const row of values) {
    if (row[0] === SETTINGS_KEYS.PIN_HASH) {
      storedHash = String(row[1]);
      break;
    }
  }

  // 首次使用：Settings 里还没有 pin_hash，写入并通过
  if (!storedHash) {
    setSettingValue(SETTINGS_KEYS.PIN_HASH, pinHash);
    storedHash = pinHash;
  }

  if (pinHash !== storedHash) return err('Invalid PIN');

  const token = generateToken();
  saveToken(token);
  return ok({ token });
}

// ── getSettings ──────────────────────────────────────────────

function handleGetSettings() {
  const sheet  = getSheet(SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();
  const result = {};
  for (const row of values) {
    if (row[0] && row[0] !== SETTINGS_KEYS.PIN_HASH) {
      result[row[0]] = row[1];
    }
  }
  return ok(result);
}

// ── updateSettings ───────────────────────────────────────────

function handleUpdateSettings(body) {
  const { settings } = body;
  if (!settings) return err('Missing settings');

  for (const [key, value] of Object.entries(settings)) {
    if (key === SETTINGS_KEYS.PIN_HASH) continue; // 永远不覆盖 PIN
    setSettingValue(key, value);
  }
  return ok(true);
}

// ── 工具：写入或更新 Settings 某行 ───────────────────────────

function setSettingValue(key, value) {
  const sheet  = getSheet(SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}
