// ---------- Модальные окна: замена prompt()/confirm() ----------
// Даёт нормальную форму с подписанными полями вместо цепочки prompt(),
// и понятный диалог подтверждения вместо системного confirm().

import { attachDateMask, isoToDisplay, displayToIso } from './utils.js';

let activeModal = null;
let lastFocused = null;

function trapFocus(e, root) {
  if (e.key !== 'Tab') return;
  const focusables = root.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

function openModal({ title, bodyEl, onClose }) {
  lastFocused = document.activeElement;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modalTitle');

  const header = document.createElement('div');
  header.className = 'modal-header';
  const h = document.createElement('h2');
  h.id = 'modalTitle';
  h.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'icon-btn modal-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Закрыть');
  header.appendChild(h);
  header.appendChild(closeBtn);

  modal.appendChild(header);
  modal.appendChild(bodyEl);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
    activeModal = null;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    if (onClose) onClose();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { close(); return; }
    trapFocus(e, modal);
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKeyDown);

  activeModal = { close };

  const firstInput = modal.querySelector('input, button:not(.modal-close)');
  (firstInput || closeBtn).focus();

  return { close };
}

export function confirmDialog(message, { confirmText = 'Подтвердить', cancelText = 'Отмена', danger = false } = {}) {
  return new Promise((resolve) => {
    const body = document.createElement('div');
    body.className = 'modal-body';

    const p = document.createElement('p');
    p.className = 'modal-message';
    p.textContent = message;
    body.appendChild(p);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;

    const okBtn = document.createElement('button');
    okBtn.className = danger ? 'danger-solid' : 'primary';
    okBtn.textContent = confirmText;

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    body.appendChild(actions);

    let resolved = false;
    const { close } = openModal({
      title: danger ? 'Требуется подтверждение' : 'Подтвердите действие',
      bodyEl: body,
      onClose: () => { if (!resolved) resolve(false); }
    });

    cancelBtn.addEventListener('click', () => { resolved = true; close(); resolve(false); });
    okBtn.addEventListener('click', () => { resolved = true; close(); resolve(true); });
  });
}

// task: существующая задача для редактирования, либо null для новой
export function taskFormDialog(task) {
  return new Promise((resolve) => {
    const isEdit = !!task;
    const body = document.createElement('div');
    body.className = 'modal-body';

    body.innerHTML = `
      <div class="field">
        <label for="mfName">Название задачи</label>
        <input type="text" id="mfName" placeholder="Например: Разработка ТЗ">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="mfStart">Начало</label>
          <input type="text" id="mfStart">
        </div>
        <div class="field">
          <label for="mfEnd">Окончание</label>
          <input type="text" id="mfEnd">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="mfProgress">Прогресс (%)</label>
          <input type="number" id="mfProgress" min="0" max="100" value="0">
        </div>
        <div class="field">
          <label for="mfColor">Цвет</label>
          <input type="color" id="mfColor" value="#5b8cff" style="height:36px;padding:2px;">
        </div>
      </div>
      <p class="field-error" id="mfError" hidden></p>
      <div class="modal-actions">
        <button id="mfCancel">Отмена</button>
        <button id="mfSave" class="primary">${isEdit ? 'Сохранить' : 'Добавить'}</button>
      </div>
    `;

    const { close } = openModal({
      title: isEdit ? 'Редактировать задачу' : 'Новая задача',
      bodyEl: body,
      onClose: () => resolve(null)
    });

    const nameEl = body.querySelector('#mfName');
    const startEl = body.querySelector('#mfStart');
    const endEl = body.querySelector('#mfEnd');
    const progressEl = body.querySelector('#mfProgress');
    const colorEl = body.querySelector('#mfColor');
    const errorEl = body.querySelector('#mfError');

    attachDateMask(startEl);
    attachDateMask(endEl);

    if (isEdit) {
      nameEl.value = task.name;
      startEl.value = isoToDisplay(task.start);
      endEl.value = isoToDisplay(task.end);
      progressEl.value = task.progress;
      colorEl.value = task.color || '#5b8cff';
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }

    let resolved = false;

    body.querySelector('#mfCancel').addEventListener('click', () => { resolved = true; close(); resolve(null); });

    body.querySelector('#mfSave').addEventListener('click', () => {
      const name = nameEl.value.trim();
      const start = displayToIso(startEl.value);
      const end = displayToIso(endEl.value);
      const progress = Math.min(100, Math.max(0, parseInt(progressEl.value, 10) || 0));
      const color = colorEl.value;

      if (!name) { showError('Введите название задачи'); nameEl.focus(); return; }
      if (!start || !end) { showError('Даты в формате дд/мм/гггг, например 22/07/2026'); return; }
      if (end < start) { showError('Дата окончания раньше даты начала'); return; }

      resolved = true;
      close();
      resolve({ name, start, end, progress, color });
    });

    // Enter в любом поле = сохранить
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        body.querySelector('#mfSave').click();
      }
    });
  });
}
