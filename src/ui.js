// ============================================================
// ui.js — 共享 UI 组件（toast, modal, progress bar）
// ============================================================

// ── Toast ─────────────────────────────────────────────────────

let toastTimer = null;

/**
 * 显示底部提示条
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className   = `toast toast--${type} toast--visible`;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 3000);
}

// ── Modal ─────────────────────────────────────────────────────

/**
 * 显示确认对话框
 * @param {string} message
 * @param {Function} onConfirm
 */
export function showConfirm(message, onConfirm) {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <p class="modal__message"></p>
        <div class="modal__actions">
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--danger" id="modal-confirm">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  overlay.querySelector('.modal__message').textContent = message;
  overlay.classList.add('modal-overlay--visible');

  const confirmBtn = overlay.querySelector('#modal-confirm');
  const cancelBtn  = overlay.querySelector('#modal-cancel');

  const close = () => overlay.classList.remove('modal-overlay--visible');

  confirmBtn.onclick = () => { close(); onConfirm(); };
  cancelBtn.onclick  = close;
  overlay.onclick    = (e) => { if (e.target === overlay) close(); };
}

// ── Progress Bar ─────────────────────────────────────────────

/**
 * 计算进度条颜色
 * @param {number} value    当前值
 * @param {number} target   目标值
 * @returns {'normal'|'warning'|'danger'}
 */
export function progressStatus(value, target) {
  if (!target || target === 0) return 'normal';
  const ratio = value / target;
  if (ratio > 1.20) return 'danger';
  if (ratio > 1.10) return 'warning';
  return 'normal';
}

/**
 * 渲染进度条 HTML
 */
export function progressBarHTML(value, target, label, unit = '') {
  const pct    = target ? Math.min((value / target) * 100, 100) : 0;
  const status = progressStatus(value, target);
  return `
    <div class="progress-item">
      <div class="progress-item__header">
        <span class="progress-item__label">${label}</span>
        <span class="progress-item__value">${value}${unit} / ${target}${unit}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill progress-bar__fill--${status}"
             style="width: ${pct}%"></div>
      </div>
    </div>`;
}

// ── Loading state ─────────────────────────────────────────────

export function setLoading(selector, loading) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (loading) {
    el.setAttribute('disabled', true);
    el.dataset.originalText = el.textContent;
    el.textContent = 'Loading…';
  } else {
    el.removeAttribute('disabled');
    el.textContent = el.dataset.originalText || el.textContent;
  }
}
