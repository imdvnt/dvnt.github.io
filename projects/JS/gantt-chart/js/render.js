// ---------- Рендер диаграммы ----------
import { diffDays, isWeekend, isSameDay, parseDate, daysFromToday, MONTHS_RU, DOW_RU } from './utils.js';
import { makeBarDraggable } from './dragResize.js';
import { moveTaskDates } from './state.js';

const container = document.getElementById('ganttContainer');
const emptyState = document.getElementById('emptyState');
const taskCountEl = document.getElementById('taskCount');
const overallProgressEl = document.getElementById('overallProgress');
const overallProgressBarEl = document.getElementById('overallProgressBar');
const todayBtn = document.getElementById('btnToday');

let currentDayWidth = 10;
let currentRangeStart = null;
let scrollEl = null;

export function setDayWidth(px) {
  currentDayWidth = px;
}

function getRange(tasks) {
  if (tasks.length === 0) {
    return { start: daysFromToday(-2), end: daysFromToday(14) };
  }
  let min = parseDate(tasks[0].start);
  let max = parseDate(tasks[0].end);
  tasks.forEach(t => {
    const s = parseDate(t.start), e = parseDate(t.end);
    if (s < min) min = s;
    if (e > max) max = e;
  });
  min = new Date(min); min.setDate(min.getDate() - 2);
  max = new Date(max); max.setDate(max.getDate() + 2);
  return { start: min, end: max };
}

function computeOverallProgress(tasks) {
  if (tasks.length === 0) return 0;
  let totalDuration = 0;
  let doneDuration = 0;
  tasks.forEach(t => {
    const dur = diffDays(parseDate(t.start), parseDate(t.end)) + 1;
    totalDuration += dur;
    doneDuration += dur * (t.progress || 0) / 100;
  });
  return totalDuration ? Math.round((doneDuration / totalDuration) * 100) : 0;
}

export function scrollToToday() {
  if (!scrollEl || !currentRangeStart) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const offset = diffDays(currentRangeStart, today) * currentDayWidth;
  scrollEl.scrollTo({ left: Math.max(offset - scrollEl.clientWidth / 2, 0), behavior: 'smooth' });
}

export function render(tasks, handlers) {
  taskCountEl.textContent = tasks.length;
  const overall = computeOverallProgress(tasks);
  overallProgressEl.textContent = overall + '%';
  overallProgressBarEl.style.width = overall + '%';

  container.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.style.display = 'block';
    todayBtn.disabled = true;
    return;
  }
  emptyState.style.display = 'none';
  todayBtn.disabled = false;

  const { start, end } = getRange(tasks);
  currentRangeStart = start;
  const totalDays = diffDays(start, end) + 1;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayWidth = currentDayWidth;

  // --- Левая колонка со списком задач ---
  const taskList = document.createElement('div');
  taskList.className = 'task-list';

  const listHeader = document.createElement('div');
  listHeader.className = 'task-list-header';
  listHeader.textContent = 'Задача';
  taskList.appendChild(listHeader);

  const monthSpacer = document.createElement('div');
  monthSpacer.className = 'month-spacer';
  taskList.insertBefore(monthSpacer, listHeader.nextSibling);

  tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'task-row';

    const info = document.createElement('div');
    info.className = 'task-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'task-name';
    nameEl.textContent = t.name;

    const metaEl = document.createElement('span');
    metaEl.className = 'task-meta';
    const dur = diffDays(parseDate(t.start), parseDate(t.end)) + 1;
    metaEl.textContent = `${dur} дн. · ${t.progress || 0}%`;

    info.appendChild(nameEl);
    info.appendChild(metaEl);
    info.title = `${t.name} (${t.start} → ${t.end})`;

    const actions = document.createElement('span');
    actions.className = 'task-row-actions';

    const dupBtn = document.createElement('button');
    dupBtn.className = 'icon-btn';
    dupBtn.textContent = '⧉';
    dupBtn.title = 'Дублировать';
    dupBtn.setAttribute('aria-label', `Дублировать задачу «${t.name}»`);
    dupBtn.onclick = () => handlers.onDuplicate(t.id);

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.textContent = '✎';
    editBtn.title = 'Редактировать';
    editBtn.setAttribute('aria-label', `Редактировать задачу «${t.name}»`);
    editBtn.onclick = () => handlers.onEdit(t.id);

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn del';
    delBtn.textContent = '✕';
    delBtn.title = 'Удалить';
    delBtn.setAttribute('aria-label', `Удалить задачу «${t.name}»`);
    delBtn.onclick = () => handlers.onDelete(t.id);

    actions.appendChild(dupBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    row.appendChild(info);
    row.appendChild(actions);
    taskList.appendChild(row);
  });

  // --- Правая часть: временная шкала ---
  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  const scroll = document.createElement('div');
  scroll.className = 'timeline-scroll';
  scrollEl = scroll;

  const totalWidth = totalDays * dayWidth;

  // Строка месяцев
  const monthRow = document.createElement('div');
  monthRow.className = 'month-row';
  monthRow.style.width = totalWidth + 'px';

  let cursor = new Date(start);
  let curMonth = cursor.getMonth();
  let curMonthStart = 0;
  let dayIndex = 0;
  const monthSegments = [];
  while (dayIndex < totalDays) {
    if (cursor.getMonth() !== curMonth) {
      monthSegments.push({ month: curMonth, year: cursor.getFullYear(), days: dayIndex - curMonthStart });
      curMonth = cursor.getMonth();
      curMonthStart = dayIndex;
    }
    cursor.setDate(cursor.getDate() + 1);
    dayIndex++;
  }
  monthSegments.push({ month: curMonth, days: dayIndex - curMonthStart });

  monthSegments.forEach(seg => {
    const cell = document.createElement('div');
    cell.className = 'month-cell';
    cell.style.width = (seg.days * dayWidth) + 'px';
    cell.textContent = MONTHS_RU[seg.month] + (seg.year ? ' ' + seg.year : '');
    monthRow.appendChild(cell);
  });

  // Строка дней
  const headerRow = document.createElement('div');
  headerRow.className = 'timeline-header-row';
  headerRow.style.width = totalWidth + 'px';

  const bodyDays = [];
  cursor = new Date(start);
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(cursor);
    bodyDays.push(d);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (isWeekend(d)) cell.classList.add('weekend');
    if (isSameDay(d, today)) cell.classList.add('today');
    cell.style.width = dayWidth + 'px';
    if (dayWidth >= 16) {
      const num = document.createElement('div');
      num.textContent = d.getDate();
      const dow = document.createElement('div');
      dow.className = 'dow';
      dow.textContent = DOW_RU[d.getDay()];
      cell.appendChild(num);
      cell.appendChild(dow);
    } else {
      cell.textContent = d.getDate();
    }
    headerRow.appendChild(cell);
    cursor.setDate(cursor.getDate() + 1);
  }

  // Тело: сетка + полосы задач
  const body = document.createElement('div');
  body.className = 'timeline-body';
  body.style.width = totalWidth + 'px';

  tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'grid-row';
    row.style.width = totalWidth + 'px';

    bodyDays.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      if (isWeekend(d)) cell.classList.add('weekend');
      if (isSameDay(d, today)) cell.classList.add('today');
      cell.style.width = dayWidth + 'px';
      row.appendChild(cell);
    });

    const tStart = parseDate(t.start);
    const tEnd = parseDate(t.end);
    const offsetDays = diffDays(start, tStart);
    const lengthDays = diffDays(tStart, tEnd) + 1;

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.left = (offsetDays * dayWidth) + 'px';
    bar.style.width = Math.max(lengthDays * dayWidth - 4, dayWidth - 4) + 'px';
    bar.style.background = t.color || '#5b8cff';
    bar.title = `${t.name}\n${t.start} → ${t.end}\nПрогресс: ${t.progress}%`;
    bar.tabIndex = 0;

    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = (t.progress || 0) + '%';
    bar.appendChild(fill);

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = `${t.name} · ${t.progress || 0}%`;
    bar.appendChild(label);

    makeBarDraggable(bar, t, start, dayWidth, (id, newStart, newEnd) => {
      moveTaskDates(id, newStart, newEnd);
    });

    row.appendChild(bar);
    body.appendChild(row);
  });

  scroll.appendChild(monthRow);
  scroll.appendChild(headerRow);
  scroll.appendChild(body);
  timeline.appendChild(scroll);

  container.appendChild(taskList);
  container.appendChild(timeline);
}
