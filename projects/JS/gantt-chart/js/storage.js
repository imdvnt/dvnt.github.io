// ---------- Хранение задач в localStorage ----------
// Раньше данные жили только в памяти вкладки и терялись при перезагрузке.
// Теперь состояние переживает reload — экспорт JSON остаётся для бэкапов и переноса.

const STORAGE_KEY = 'gantt-chart:tasks:v1';

export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn('Не удалось прочитать сохранённые задачи:', err);
    return null;
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (err) {
    console.warn('Не удалось сохранить задачи:', err);
    return false;
  }
}

export function clearSavedTasks() {
  localStorage.removeItem(STORAGE_KEY);
}
