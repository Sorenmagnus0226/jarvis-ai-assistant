(() => {
  const desktopViewport = window.matchMedia('(min-width: 960px)');
  const storageKey = 'jarvis.desktop.sidebar-collapsed';
  const sidebar = document.querySelector('.sidebar');
  const actions = document.querySelector('.topbar-actions');
  if (!sidebar || !actions) return;

  let collapsed = false;
  try {
    collapsed = localStorage.getItem(storageKey) === 'true';
  } catch (_) {
    // The desktop layout still works if browser storage is unavailable.
  }

  const button = document.createElement('button');
  button.className = 'desktop-sidebar-toggle';
  button.type = 'button';
  button.setAttribute('aria-controls', 'desktop-sidebar');
  button.innerHTML = '<span aria-hidden="true">☰</span>';
  button.title = 'Collapse navigation (Ctrl+B)';
  button.setAttribute('aria-label', button.title);
  sidebar.id = 'desktop-sidebar';
  actions.insertBefore(button, actions.firstChild);

  const applyState = () => {
    const active = desktopViewport.matches && collapsed;
    document.body.classList.toggle('jarvis-sidebar-collapsed', active);
    button.setAttribute('aria-expanded', String(!active));
    button.title = active ? 'Expand navigation (Ctrl+B)' : 'Collapse navigation (Ctrl+B)';
    button.setAttribute('aria-label', button.title);
  };

  button.addEventListener('click', () => {
    collapsed = !collapsed;
    try {
      localStorage.setItem(storageKey, String(collapsed));
    } catch (_) {
      // Keep the current session usable without persistent storage.
    }
    applyState();
  });

  desktopViewport.addEventListener('change', applyState);
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b'
      && !event.altKey && !event.shiftKey
      && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      collapsed = !collapsed;
      try {
        localStorage.setItem(storageKey, String(collapsed));
      } catch (_) {
        // Ignore storage errors; the state remains active until the window closes.
      }
      applyState();
    }
  });

  applyState();
})();
