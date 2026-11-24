(() => {
  const desktopViewport = window.matchMedia('(min-width: 960px)');
  const storageKey = 'kaizen.desktop.sidebar-collapsed';
  const sidebar = document.querySelector('.sidebar');
  const actions = document.querySelector('.topbar-actions');
  if (!sidebar || !actions) return;

  let collapsed = false;
  try { collapsed = localStorage.getItem(storageKey) === 'true'; } catch (_) {}

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
    document.body.classList.toggle('kaizen-sidebar-collapsed', active);
    button.setAttribute('aria-expanded', String(!active));
  };

  button.addEventListener('click', () => {
    collapsed = !collapsed;
    try { localStorage.setItem(storageKey, String(collapsed)); } catch (_) {}
    applyState();
  });
  desktopViewport.addEventListener('change', applyState);
  applyState();
})();
