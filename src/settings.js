// ============================================================
// NutriLog — settings.js
// Block B3: Settings Editor — nutrition targets + PIN change
// ============================================================

import { CONFIG }          from '../config.js';
import { updateSettings }  from './api.js';
import { store }           from './store.js';
import { showToast }       from './ui.js';

// ── Field definitions ─────────────────────────────────────────
// key matches Settings sheet key-value, label is display name, unit shown in input

const NUTRIENT_FIELDS = [
  { key: 'calorie_target',  label: 'Calories',  unit: 'kcal', min: 500,  max: 5000, step: 50  },
  { key: 'protein_target',  label: 'Protein',   unit: 'g',    min: 10,   max: 500,  step: 1   },
  { key: 'carbs_target',    label: 'Carbs',     unit: 'g',    min: 10,   max: 1000, step: 1   },
  { key: 'fat_target',      label: 'Fat',       unit: 'g',    min: 10,   max: 500,  step: 1   },
  { key: 'fibre_target',    label: 'Fibre',     unit: 'g',    min: 0,    max: 100,  step: 1   },
  { key: 'sodium_target',   label: 'Sodium',    unit: 'mg',   min: 0,    max: 5000, step: 50  },
];

// ── Public init ───────────────────────────────────────────────

export function initSettings() {
  console.log('[settings] initSettings → start');
  const view = document.getElementById('view-settings');
  if (!view) return;

  view.innerHTML = buildSettingsHTML();
  populateFields();
  bindEvents();
  console.log('[settings] initSettings → ready');
}

// ── HTML builder ──────────────────────────────────────────────

function buildSettingsHTML() {
  const fields = NUTRIENT_FIELDS.map(f => `
    <div class="settings-field">
      <label class="settings-field__label" for="setting-${f.key}">
        ${f.label}
        <span class="settings-field__unit">${f.unit}</span>
      </label>
      <input
        id="setting-${f.key}"
        class="settings-field__input"
        type="number"
        min="${f.min}"
        max="${f.max}"
        step="${f.step}"
        inputmode="decimal"
        data-key="${f.key}"
      />
    </div>
  `).join('');

  return `
    <div class="page">
      <header class="page-header">
        <h2 class="page-header__title">Settings</h2>
      </header>

      <div class="card">
        <p class="settings-section-title">Daily Nutrition Targets</p>
        <div class="settings-form" id="settings-form">
          ${fields}
        </div>
        <button id="settings-save-btn" class="btn btn--primary settings-save-btn">
          Save
        </button>
      </div>
    </div>
  `;
}

// ── Populate fields from store ────────────────────────────────

function populateFields() {
  const s = store.state.settings || {};
  NUTRIENT_FIELDS.forEach(f => {
    const input = document.getElementById(`setting-${f.key}`);
    if (input && s[f.key] !== undefined) {
      input.value = s[f.key];
    }
  });
}

// ── Events ────────────────────────────────────────────────────

function bindEvents() {
  document.getElementById('settings-save-btn')
    ?.addEventListener('click', handleSave);
}

// ── Save ──────────────────────────────────────────────────────

async function handleSave() {
  const btn = document.getElementById('settings-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  const payload = {};
  let hasError = false;

  NUTRIENT_FIELDS.forEach(f => {
    const input = document.getElementById(`setting-${f.key}`);
    const val   = parseFloat(input?.value);
    if (isNaN(val) || val < f.min || val > f.max) {
      input?.classList.add('settings-field__input--error');
      hasError = true;
    } else {
      input?.classList.remove('settings-field__input--error');
      payload[f.key] = val;
    }
  });

  if (hasError) {
    showToast('Please check the highlighted fields', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    return;
  }

  try {
    await updateSettings(payload);
    store.setSettings({ ...store.state.settings, ...payload });
    showToast('Settings saved ✓', 'success');
    console.log('[settings] handleSave → saved', payload);
  } catch (err) {
    console.error('[settings] handleSave →', err);
    showToast('Failed to save settings', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  }
}