// Secure-in-process provider setup and browser-native speech preferences.
function showProviderSettings() {
  document.querySelector('#provider-settings-dialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'provider-settings-dialog';
  dialog.className = 'setup-dialog provider-settings-dialog';
  dialog.innerHTML = `
    <form method="dialog" id="provider-settings-form">
      <div class="dialog-head"><div><span class="eyebrow">VOICE &amp; AI</span><h2>Provider settings</h2></div><button class="dialog-close" value="cancel" aria-label="Close settings">×</button></div>
      <p class="settings-notice">API keys are sent only to this local desktop app and held in memory until it closes. They are not saved to disk. Configure a provider to enable chat.</p>
      <label class="settings-field">Provider<select id="settings-provider"></select></label>
      <label class="settings-field">API key <input id="settings-api-key" type="password" autocomplete="off" placeholder="Paste provider key (leave blank to keep current)"></label>
      <label class="settings-field">Model <input id="settings-model" type="text" maxlength="160" placeholder="Provider default model"></label>
      <button class="settings-save primary-button" type="button" id="save-provider-settings">Save provider</button>
      <hr>
      <h3>Voice preferences</h3>
      <label class="settings-field">Speech recognition language<select id="speech-language"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="es-ES">Español</option><option value="fr-FR">Français</option><option value="de-DE">Deutsch</option><option value="ja-JP">日本語</option></select></label>
      <label class="settings-check"><input id="speech-speak" type="checkbox"> Read Jarvis replies aloud (system voice)</label>
      <p class="settings-notice">Voice recognition is provided by the system webview and may require microphone permission. Audio is not stored by Jarvis.</p>
    </form>`;
  document.body.append(dialog);
  const selector = dialog.querySelector('#settings-provider');
  availableProviders.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider.name;
    option.textContent = `${provider.name} — ${provider.configured ? 'configured' : provider.name === 'ollama' ? 'local service' : 'not configured'}`;
    selector.append(option);
  });
  selector.value = selectedProvider;
  const modelInput = dialog.querySelector('#settings-model');
  const applyModel = () => { modelInput.value = getProviderInfo(selector.value)?.default_model || ''; };
  selector.addEventListener('change', applyModel);
  applyModel();
  dialog.querySelector('#speech-language').value = storage.get('jarvis.speech.language', navigator.language || 'en-US');
  dialog.querySelector('#speech-speak').checked = storage.get('jarvis.speech.speak', false);
  dialog.querySelector('#speech-language').addEventListener('change', event => storage.set('jarvis.speech.language', event.target.value));
  dialog.querySelector('#speech-speak').addEventListener('change', event => storage.set('jarvis.speech.speak', event.target.checked));
  dialog.querySelector('#save-provider-settings').addEventListener('click', async () => {
    const provider = selector.value;
    const apiKey = dialog.querySelector('#settings-api-key').value.trim();
    const model = modelInput.value.trim();
    try {
      const response = await fetch(`/api/providers/${encodeURIComponent(provider)}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey || null, model: model || null })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Settings failed (${response.status})`);
      availableProviders = availableProviders.map(item => item.name === data.name ? { ...item, configured: data.configured, default_model: data.default_model } : item);
      selectedProvider = data.name;
      storage.set('jarvis.provider', selectedProvider);
      const modelSelect = document.querySelector('#model-select');
      if (modelSelect) modelSelect.value = selectedProvider;
      updateProviderStatus();
      notify(`${data.name} settings applied for this session.`);
      dialog.close();
      dialog.remove();
    } catch (error) {
      notify(error.message || 'Could not save provider settings.');
    }
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
}

document.querySelector('#settings-button')?.addEventListener('click', showProviderSettings);
