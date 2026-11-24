(() => {
  const memoryList = document.querySelector('#memory-list');
  const memoryCount = document.querySelector('#memory-count');
  const teachButton = document.querySelector('#teach-button');
  const documentInput = document.querySelector('#document-input');
  const documentList = document.querySelector('#document-list');

  async function refreshMemories() {
    try {
      const response = await fetch('/api/memories');
      if (!response.ok) throw new Error('Memory request failed');
      const rows = await response.json();
      if (memoryCount) memoryCount.textContent = String(rows.length);
      if (memoryList) {
        memoryList.replaceChildren();
        rows.forEach(row => {
          const item = document.createElement('div');
          item.className = 'smart-memory-item';
          item.innerHTML = `<span><small>${escapeText(row.category)}</small>${escapeText(row.content)}</span><button type="button" aria-label="Delete memory" data-memory-id="${row.id}">×</button>`;
          memoryList.append(item);
        });
      }
    } catch (error) {
      notifySmart(error.message);
    }
  }

  async function refreshDocuments() {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) throw new Error('Document request failed');
      const rows = await response.json();
      if (!documentList) return;
      documentList.replaceChildren();
      rows.forEach(row => {
        const item = document.createElement('div');
        item.className = 'smart-document-item';
        item.innerHTML = `<span>${escapeText(row.name)}<small>${row.characters.toLocaleString()} characters</small></span><button type="button" aria-label="Remove document" data-document-id="${row.id}">×</button>`;
        documentList.append(item);
      });
    } catch (error) {
      notifySmart(error.message);
    }
  }

  function escapeText(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }

  function notifySmart(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  teachButton?.addEventListener('click', async () => {
    const content = window.prompt('Teach Jarvis a memory\n\nEnter one accurate fact or preference:')?.trim();
    if (!content) return;
    const category = window.prompt('Category (for example: preference, profile, work, family):', 'general')?.trim() || 'general';
    try {
      const response = await fetch('/api/memories', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content, category}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Could not save memory');
      await refreshMemories();
      notifySmart('Memory saved locally.');
    } catch (error) { notifySmart(error.message); }
  });

  memoryList?.addEventListener('click', async event => {
    const button = event.target.closest('[data-memory-id]');
    if (!button) return;
    await fetch(`/api/memories/${button.dataset.memoryId}`, {method:'DELETE'});
    await refreshMemories();
  });

  documentInput?.addEventListener('change', async () => {
    for (const file of [...documentInput.files]) {
      const form = new FormData();
      form.append('file', file);
      try {
        const response = await fetch('/api/documents', {method:'POST', body:form});
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || `Could not add ${file.name}`);
        notifySmart(`${file.name} added for document context.`);
      } catch (error) { notifySmart(error.message); }
    }
    documentInput.value = '';
    await refreshDocuments();
  });

  documentList?.addEventListener('click', async event => {
    const button = event.target.closest('[data-document-id]');
    if (!button) return;
    await fetch(`/api/documents/${button.dataset.documentId}`, {method:'DELETE'});
    await refreshDocuments();
  });

  refreshMemories();
  refreshDocuments();
})();
