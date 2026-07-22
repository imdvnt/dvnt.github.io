import { fmtDate, daysFromToday, clamp, isoToDisplay, displayToIso, attachDateMask, isValidDateStr } from './utils.js';
import * as state from './state.js';
import { render, setDayWidth, scrollToToday } from './render.js';
import { confirmDialog, taskFormDialog } from './modal.js';
import { showToast } from './toast.js';

function rerender() {
  render(state.getTasks(), {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate
  });
}

async function handleEdit(id) {
  const task = state.getTaskById(id);
  if (!task) return;
  const result = await taskFormDialog(task);
  if (!result) return;
  state.updateTask(id, result);
  showToast('Задача обновлена', 'success');
}

async function handleDelete(id) {
  const task = state.getTaskById(id);
  if (!task) return;
  const ok = await confirmDialog(`Удалить задачу «${task.name}»? Это действие нельзя отменить.`, {
    confirmText: 'Удалить', danger: true
  });
  if (!ok) return;
  state.deleteTask(id);
  showToast('Задача удалена', 'info');
}

function handleDuplicate(id) {
  const copy = state.duplicateTask(id);
  if (copy) showToast(`Создана копия «${copy.name}»`, 'success');
}

// ---------- Форма быстрого добавления ----------
function initAddForm() {
  const nameEl = document.getElementById('inpName');
  const startEl = document.getElementById('inpStart');
  const endEl = document.getElementById('inpEnd');
  const progressEl = document.getElementById('inpProgress');
  const colorEl = document.getElementById('inpColor');

  attachDateMask(startEl);
  attachDateMask(endEl);
  startEl.value = isoToDisplay(fmtDate(daysFromToday(0)));
  endEl.value = isoToDisplay(fmtDate(daysFromToday(5)));

  document.getElementById('btnAdd').addEventListener('click', () => {
    const name = nameEl.value.trim();
    const start = displayToIso(startEl.value);
    const end = displayToIso(endEl.value);
    const progress = clamp(parseInt(progressEl.value, 10) || 0, 0, 100);
    const color = colorEl.value;

    if (!name) { showToast('Введите название задачи', 'error'); nameEl.focus(); return; }
    if (!start || !end) { showToast('Даты в формате дд/мм/гггг, например 22/07/2026', 'error'); return; }
    if (end < start) { showToast('Дата окончания раньше даты начала', 'error'); return; }

    state.addTask({ name, start, end, progress, color });
    showToast(`Задача «${name}» добавлена`, 'success');

    nameEl.value = '';
    startEl.value = isoToDisplay(fmtDate(daysFromToday(0)));
    endEl.value = isoToDisplay(fmtDate(daysFromToday(5)));
    progressEl.value = 0;
    nameEl.focus();
  });

  // Enter в поле названия — быстрое добавление
  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnAdd').click();
  });
}

// ---------- Импорт / экспорт JSON ----------
function exportJSON() {
  const data = JSON.stringify({ tasks: state.getTasks() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gantt-export-${fmtDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('JSON-файл экспортирован', 'success');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const list = Array.isArray(parsed) ? parsed : parsed.tasks;
      if (!Array.isArray(list)) throw new Error('Ожидался массив задач');

      const cleaned = list.map((item, i) => {
        if (!item.name || !item.start || !item.end) {
          throw new Error(`Задача №${i + 1}: должны быть заполнены name, start, end`);
        }
        if (!isValidDateStr(item.start) || !isValidDateStr(item.end)) {
          throw new Error(`Задача «${item.name}»: некорректная дата`);
        }
        return {
          id: item.id || crypto.randomUUID?.() || String(Math.random()),
          name: String(item.name),
          start: item.start,
          end: item.end,
          progress: clamp(parseInt(item.progress, 10) || 0, 0, 100),
          color: item.color || '#5b8cff'
        };
      });

      state.replaceAllTasks(cleaned);
      showToast(`Импортировано задач: ${cleaned.length}`, 'success');
    } catch (err) {
      showToast('Ошибка импорта: ' + err.message, 'error', 5000);
    }
  };
  reader.readAsText(file);
}

function initToolbar() {
  document.getElementById('btnExport').addEventListener('click', exportJSON);

  document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });

  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJSON(file);
    e.target.value = '';
  });

  document.getElementById('btnClear').addEventListener('click', async () => {
    if (state.getTasks().length === 0) return;
    const ok = await confirmDialog('Удалить все задачи без возможности восстановления?', {
      confirmText: 'Удалить всё', danger: true
    });
    if (!ok) return;
    state.clearTasks();
    showToast('Все задачи удалены', 'info');
  });

  document.getElementById('zoomSelect').addEventListener('change', (e) => {
    setDayWidth(parseInt(e.target.value, 10));
    rerender();
  });

  document.getElementById('btnToday').addEventListener('click', scrollToToday);
}

// ---------- Инициализация ----------
document.addEventListener('DOMContentLoaded', () => {
  initAddForm();
  initToolbar();
  state.subscribe(rerender);
  rerender();
});
