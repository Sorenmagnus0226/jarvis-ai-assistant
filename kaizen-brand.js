(() => {
  const replacements = [
    [/JARVIS/g, 'KAIZEN'],
    [/Jarvis/g, 'Kaizen'],
    [/jarvis/g, 'kaizen']
  ];
  const rebrand = value => replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);

  function updateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const updated = rebrand(node.nodeValue || '');
      if (updated !== node.nodeValue) node.nodeValue = updated;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const attribute of ['title', 'aria-label', 'placeholder', 'content']) {
      if (node.hasAttribute(attribute)) {
        const value = node.getAttribute(attribute);
        const updated = rebrand(value);
        if (updated !== value) node.setAttribute(attribute, updated);
      }
    }
    node.childNodes.forEach(updateNode);
  }

  document.title = 'KAIZEN — Personal AI';
  updateNode(document.documentElement);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') updateNode(record.target);
      record.addedNodes?.forEach(updateNode);
      if (record.type === 'attributes') updateNode(record.target);
    }
  });
  observer.observe(document.documentElement, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder', 'content']});

  if (typeof window.prompt === 'function') {
    const originalPrompt = window.prompt.bind(window);
    window.prompt = (message, defaultValue) => originalPrompt(rebrand(String(message)), defaultValue);
  }
})();
