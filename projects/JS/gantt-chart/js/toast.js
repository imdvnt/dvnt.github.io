// ---------- Ненавязчивые уведомления вместо alert() ----------

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-stack';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 3200) {
  const stack = getContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  stack.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  const remove = () => {
    el.classList.remove('show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };

  const timer = setTimeout(remove, duration);
  el.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
}
