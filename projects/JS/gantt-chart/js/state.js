// ---------- Состояние приложения ----------
import { uid, fmtDate, daysFromToday, parseDate } from './utils.js';
import { loadTasks, saveTasks } from './storage.js';

const DEMO_TASKS = [
  { id: uid(), name: 'Анализ требований', start: fmtDate(daysFromToday(0)), end: fmtDate(daysFromToday(3)), progress: 100, color: '#4ade80' },
  { id: uid(), name: 'Проектирование', start: fmtDate(daysFromToday(3)), end: fmtDate(daysFromToday(8)), progress: 60, color: '#4ade80' },
  { id: uid(), name: 'Разработка', start: fmtDate(daysFromToday(8)), end: fmtDate(daysFromToday(18)), progress: 20, color: '#4ade80' },
  { id: uid(), name: 'Тестирование', start: fmtDate(daysFromToday(16)), end: fmtDate(daysFromToday(22)), progress: 0, color: '#ffb454' }
];

const saved = loadTasks();
let tasks = saved && saved.length ? saved : DEMO_TASKS;

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  saveTasks(tasks);
  listeners.forEach(fn => fn(tasks));
}

export function getTasks() {
  // Отдаём задачи отсортированными по дате начала — так диаграмму проще читать.
  return [...tasks].sort((a, b) => parseDate(a.start) - parseDate(b.start));
}

export function getTaskById(id) {
  return tasks.find(t => t.id === id) || null;
}

export function addTask(data) {
  const task = { id: uid(), ...data };
  tasks.push(task);
  notify();
  return task;
}

export function updateTask(id, data) {
  const t = tasks.find(x => x.id === id);
  if (!t) return null;
  Object.assign(t, data);
  notify();
  return t;
}

export function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  notify();
}

export function duplicateTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return null;
  const copy = { ...t, id: uid(), name: t.name + ' (копия)' };
  tasks.push(copy);
  notify();
  return copy;
}

export function replaceAllTasks(newTasks) {
  tasks = newTasks;
  notify();
}

export function moveTaskDates(id, start, end) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.start = start;
  t.end = end;
  notify();
}
