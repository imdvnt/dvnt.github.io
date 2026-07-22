// ---------- Утилиты: даты, id, форматирование ----------

export function uid() {
  return 't' + Math.random().toString(36).slice(2, 10);
}

export function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Возвращает Date или null, если строка не в формате ГГГГ-ММ-ДД
// либо описывает несуществующую дату (например, 2024-02-30).
export function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null; // JS Date "исправил" несуществующую дату — считаем невалидной
  }
  return date;
}

export function isValidDateStr(str) {
  return parseDate(str) !== null;
}

export function daysFromToday(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

export function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

export function isWeekend(d) {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const DOW_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
