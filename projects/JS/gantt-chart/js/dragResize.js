// ---------- Drag / resize логика ----------
// Улучшение относительно исходной версии: во время перетаскивания DOM
// обновляется точечно (позиция/ширина полосы + всплывающая подсказка с датами),
// а полный ре-рендер и сохранение состояния происходят один раз — по mouseup.
// Раньше render() дёргался на каждый mousemove, что могло подтормаживать
// на больших диаграммах и пересоздавало DOM прямо во время жеста.

import { diffDays, fmtDate, parseDate } from './utils.js';

export function makeBarDraggable(bar, task, rangeStart, dayW, onCommit) {
  let mode = null; // 'move' | 'resize-left' | 'resize-right'
  let startX = 0;
  let origStartDays = 0;
  let origEndDays = 0;
  let pendingStart = task.start;
  let pendingEnd = task.end;

  const leftHandle = document.createElement('div');
  leftHandle.className = 'resize-handle left';
  leftHandle.setAttribute('aria-hidden', 'true');
  const rightHandle = document.createElement('div');
  rightHandle.className = 'resize-handle right';
  rightHandle.setAttribute('aria-hidden', 'true');
  bar.appendChild(leftHandle);
  bar.appendChild(rightHandle);

  const tip = document.createElement('div');
  tip.className = 'drag-tip';
  tip.hidden = true;
  bar.appendChild(tip);

  function onDown(e, m) {
    mode = m;
    startX = e.clientX;
    origStartDays = diffDays(rangeStart, parseDate(task.start));
    origEndDays = diffDays(rangeStart, parseDate(task.end));
    pendingStart = task.start;
    pendingEnd = task.end;
    bar.classList.add('dragging');
    tip.hidden = false;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.stopPropagation();
    e.preventDefault();
  }

  function onMove(e) {
    const deltaPx = e.clientX - startX;
    const deltaDays = Math.round(deltaPx / dayW);

    let newStartDays = origStartDays;
    let newEndDays = origEndDays;

    if (mode === 'move') {
      newStartDays = origStartDays + deltaDays;
      newEndDays = origEndDays + deltaDays;
    } else if (mode === 'resize-left') {
      newStartDays = Math.min(origStartDays + deltaDays, origEndDays);
    } else if (mode === 'resize-right') {
      newEndDays = Math.max(origEndDays + deltaDays, origStartDays);
    }

    const newStart = new Date(rangeStart); newStart.setDate(newStart.getDate() + newStartDays);
    const newEnd = new Date(rangeStart); newEnd.setDate(newEnd.getDate() + newEndDays);
    pendingStart = fmtDate(newStart);
    pendingEnd = fmtDate(newEnd);

    bar.style.left = (newStartDays * dayW) + 'px';
    bar.style.width = Math.max((newEndDays - newStartDays + 1) * dayW - 4, dayW - 4) + 'px';
    tip.textContent = `${pendingStart} → ${pendingEnd}`;
  }

  function onUp() {
    if (mode) {
      bar.classList.remove('dragging');
      tip.hidden = true;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (pendingStart !== task.start || pendingEnd !== task.end) {
        onCommit(task.id, pendingStart, pendingEnd);
      }
      mode = null;
    }
  }

  bar.addEventListener('mousedown', (e) => onDown(e, 'move'));
  leftHandle.addEventListener('mousedown', (e) => onDown(e, 'resize-left'));
  rightHandle.addEventListener('mousedown', (e) => onDown(e, 'resize-right'));
}
