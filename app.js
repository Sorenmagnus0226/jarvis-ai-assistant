const toast = document.querySelector('#toast');
const setupDialog = document.querySelector('#setup-dialog');
const messageDialog = document.querySelector('#message-dialog');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
let toastTimer;
let conversationId = null;
let selectedProvider = 'openai';
let availableProviders = [];
let recognition = null;

const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      notify('Could not save this setting on this device.');
      return false;
    }
  }
};

function notify(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function showSetup(title, description) {
  const titleNode = document.querySelector('#setup-title');
  const descriptionNode = document.querySelector('#setup-description');
  if (!setupDialog || !titleNode || !descriptionNode) return notify(description || title);
  titleNode.textContent = title;
  descriptionNode.textContent = description || '';
  setupDialog.showModal();
}

function safeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function providerKey(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes('anthropic') || normalized.includes('claude')) return 'claude';
  if (normalized.includes('gemini') || normalized.includes('google')) return 'gemini';
  return normalized;
}

function getProviderInfo(name) {
  return availableProviders.find(provider => provider.name === name);
}

async function loadProviders() {
  try {
    const response = await fetch('/api/providers');
    if (!response.ok) throw new Error('Provider request failed');
    const data = await response.json();
    availableProviders = data.providers || [];
    selectedProvider = storage.get('jarvis.provider', data.default_provider || 'openai');
    const select = document.querySelector('#model-select');
    if (select) {
      for (const option of select.options) {
        if (option.value === 'Choose a provider') continue;
        const key = providerKey(option.value);
        option.value = key;
        const provider = getProviderInfo(key);
        option.textContent = `${option.textContent.replace(/ \(.+\)$/, '')}${provider?.configured ? ' · ready' : key === 'ollama' ? ' · local' : ' · needs setup'}`;
      }
      select.value = selectedProvider;
    }
    updateProviderStatus();
  } catch (_) {
    notify('Could not reach the local Jarvis API. Chat and provider status are unavailable.');
  }
}

function updateProviderStatus() {
  const status = document.querySelector('.model-status strong');
  const label = document.querySelector('.model-status span');
  const provider = getProviderInfo(selectedProvider);
  if (status) status.textContent = provider?.configured ? `${provider.name} · ${provider.default_model}` : `${selectedProvider} · credentials needed`;
  if (label) label.textContent = 'SELECTED PROVIDER';
}

function openMessage() {
  if (!messageDialog) return;
  conversationId = null;
  const transcript = document.querySelector('#conversation-messages');
  if (transcript) transcript.replaceChildren();
  messageDialog.showModal();
  setTimeout(() => messageInput?.focus(), 50);
}

function addMessage(role, text) {
  let transcript = document.querySelector('#conversation-messages');
  if (!transcript && messageInput) {
    transcript = document.createElement('div');
    transcript.id = 'conversation-messages';
    transcript.className = 'conversation-messages';
    messageInput.before(transcript);
  }
  if (!transcript) return;
  const message = document.createElement('div');
  message.className = `chat-message chat-${role}`;
  message.textContent = text;
  transcript.append(message);
  transcript.scrollTop = transcript.scrollHeight;
}

async function sendMessage(text) {
  const sendButton = messageForm?.querySelector('[value="send"]');
  if (sendButton) sendButton.disabled = true;
  addMessage('user', text);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, conversation_id: conversationId, provider: selectedProvider })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Chat request failed (${response.status})`);
    conversationId = data.conversation_id;
    const answer = data.message?.content || 'The provider returned an empty response.';
    addMessage('assistant', answer);
  } catch (error) {
    addMessage('error', error.message || 'Could not reach the Jarvis API.');
  } finally {
    if (sendButton) sendButton.disabled = false;
    if (messageInput) messageInput.value = '';
    messageInput?.focus();
  }
}

const memoryKey = 'jarvis.memories';
const taskKey = 'jarvis.tasks';
const routineKey = 'jarvis.routines';

function renderLocalItems() {
  const memoryPanel = document.querySelector('.memory-panel');
  const memoryButton = document.querySelector('#teach-button');
  const memories = storage.get(memoryKey, []);
  let memoryList = document.querySelector('#memory-list');
  if (memoryPanel && memoryButton) {
    if (!memoryList) {
      memoryList = document.createElement('ul');
      memoryList.id = 'memory-list';
      memoryList.className = 'local-item-list';
      memoryButton.before(memoryList);
    }
    memoryList.replaceChildren();
    memories.forEach((memory, index) => {
      const item = document.createElement('li');
      item.innerHTML = `<span>${safeText(memory)}</span><button type="button" aria-label="Delete memory ${index + 1}" data-delete-memory="${index}">×</button>`;
      memoryList.append(item);
    });
  }

  const automationPanel = document.querySelector('.tasks-panel');
  const routineButton = document.querySelector('#routine-button');
  if (automationPanel && routineButton) {
    let list = document.querySelector('#local-work-list');
    if (!list) {
      list = document.createElement('div');
      list.id = 'local-work-list';
      list.className = 'local-work-list';
      routineButton.before(list);
    }
    list.replaceChildren();
    const tasks = storage.get(taskKey, []);
    const routines = storage.get(routineKey, []);
    tasks.forEach((task, index) => {
      const row = document.createElement('div');
      row.className = 'local-work-item';
      row.innerHTML = `<label><input type="checkbox" data-complete-task="${index}" ${task.done ? 'checked' : ''}><span>${safeText(task.title)}</span></label><button type="button" data-delete-task="${index}" aria-label="Delete task">×</button>`;
      list.append(row);
    });
    routines.forEach((routine, index) => {
      const row = document.createElement('div');
      row.className = 'local-work-item routine-item';
      row.innerHTML = `<span>↻ ${safeText(routine.title)} <small>Manual routine</small></span><button type="button" data-delete-routine="${index}" aria-label="Delete routine">×</button>`;
      list.append(row);
    });
  }
}

function askForText(title, placeholder) {
  const value = window.prompt(`${title}\n\n${placeholder}`);
  return value?.trim() || '';
}

document.querySelector('#type-button')?.addEventListener('click', openMessage);
document.querySelector('#new-task')?.addEventListener('click', () => {
  const title = askForText('Add a task', 'Enter a short task description:');
  if (!title) return;
  const tasks = storage.get(taskKey, []);
  tasks.unshift({ title, done: false });
  storage.set(taskKey, tasks);
  renderLocalItems();
  notify('Task added to your local workspace.');
});

document.querySelector('#settings-button')?.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    const summary = (data.providers || []).map(item => `${item.name}: ${item.configured ? 'ready' : 'not configured'}`).join(' · ');
    showSetup('Workspace settings', `Local API: ${data.status}. Provider status: ${summary || 'unavailable'}. Add provider credentials to your local .env file and restart Jarvis. Secrets are not shown in this window.`);
  } catch (_) {
    showSetup('Workspace settings', 'The local API is unavailable. Restart the desktop app and check its terminal output.');
  }
});

document.querySelector('.user-menu')?.addEventListener('click', () => {
  showSetup('Your workspace', 'Jarvis stores this prototype’s memories, tasks, routines, provider choice, and hidden cards locally in this desktop profile.');
});

document.querySelector('#edit-layout')?.addEventListener('click', event => {
  const panels = [...document.querySelectorAll('.overview-grid > .panel')];
  const editing = document.body.classList.toggle('editing-layout');
  if (editing) {
    panels.forEach(panel => { panel.hidden = false; });
    event.currentTarget.textContent = 'Done editing ✓';
    notify('Click a card’s ··· menu to hide it. Hidden cards return next time you edit layout.');
  } else {
    event.currentTarget.innerHTML = 'Edit layout <span>↗</span>';
    notify('Layout updated for this session.');
  }
});

document.querySelectorAll('.panel-menu').forEach(button => {
  button.setAttribute('aria-label', 'Hide this card while editing layout');
  button.addEventListener('click', () => {
    if (!document.body.classList.contains('editing-layout')) return notify('Choose Edit layout first to hide or rearrange cards.');
    const panel = button.closest('.panel');
    if (panel) panel.hidden = true;
  });
});

document.querySelector('#teach-button')?.addEventListener('click', () => {
  const text = askForText('Teach Jarvis a memory', 'This will be saved locally on this device:');
  if (!text) return;
  const memories = storage.get(memoryKey, []);
  memories.unshift(text);
  storage.set(memoryKey, memories);
  renderLocalItems();
  notify('Memory saved on this device.');
});

document.querySelector('#routine-button')?.addEventListener('click', () => {
  const title = askForText('Create a routine', 'Name a routine to keep as a manual checklist item:');
  if (!title) return;
  const routines = storage.get(routineKey, []);
  routines.unshift({ title });
  storage.set(routineKey, routines);
  renderLocalItems();
  notify('Routine saved locally. It will not run automatically or control your computer.');
});

document.querySelector('#all-integrations')?.addEventListener('click', () => {
  showSetup('Connected apps', 'External integrations are not enabled yet. No account connection or authorization is performed by these buttons.');
});
document.querySelectorAll('.connect-button').forEach(button => {
  button.addEventListener('click', () => showSetup(`Connect ${button.dataset.integration}`, 'Secure OAuth connection is not implemented yet, so no account access is requested.'));
});

document.querySelector('#model-select')?.addEventListener('change', event => {
  if (!event.target.value) return;
  selectedProvider = event.target.value;
  storage.set('jarvis.provider', selectedProvider);
  updateProviderStatus();
  const provider = getProviderInfo(selectedProvider);
  notify(provider?.configured ? `${provider.name} selected.` : `${selectedProvider} selected; configure its credentials in .env to chat.`);
});

document.querySelector('#voice-button')?.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showSetup('Voice input unavailable', 'This desktop webview does not provide speech recognition. Use Type instead, or open Jarvis in a browser with speech recognition support.');
    return;
  }
  if (recognition) {
    recognition.stop();
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    const label = document.querySelector('#voice-label');
    if (label) label.textContent = 'Listening… click to stop';
  };
  recognition.onresult = async event => {
    const phrase = event.results?.[0]?.[0]?.transcript?.trim();
    if (!phrase) return;
    openMessage();
    await sendMessage(phrase);
    const answer = document.querySelector('.chat-assistant:last-child')?.textContent;
    if (answer && 'speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
  };
  recognition.onerror = event => notify(`Voice input error: ${event.error}. Check microphone permissions.`);
  recognition.onend = () => {
    recognition = null;
    const label = document.querySelector('#voice-label');
    if (label) label.textContent = 'Start voice session';
  };
  try { recognition.start(); } catch (_) { recognition = null; notify('Could not start voice input. Check microphone permissions.'); }
});

messageForm?.addEventListener('submit', event => {
  if (event.submitter?.value !== 'send') return;
  event.preventDefault();
  const text = messageInput?.value.trim();
  if (text) sendMessage(text);
});

document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const memoryDelete = target.closest('[data-delete-memory]');
  if (memoryDelete) {
    const memories = storage.get(memoryKey, []);
    memories.splice(Number(memoryDelete.dataset.deleteMemory), 1);
    storage.set(memoryKey, memories);
    renderLocalItems();
    return;
  }
  const taskCheck = target.closest('[data-complete-task]');
  if (taskCheck) {
    const tasks = storage.get(taskKey, []);
    const index = Number(taskCheck.dataset.completeTask);
    if (tasks[index]) tasks[index].done = taskCheck.checked;
    storage.set(taskKey, tasks);
    renderLocalItems();
    return;
  }
  const taskDelete = target.closest('[data-delete-task]');
  if (taskDelete) {
    const tasks = storage.get(taskKey, []);
    tasks.splice(Number(taskDelete.dataset.deleteTask), 1);
    storage.set(taskKey, tasks);
    renderLocalItems();
    return;
  }
  const routineDelete = target.closest('[data-delete-routine]');
  if (routineDelete) {
    const routines = storage.get(routineKey, []);
    routines.splice(Number(routineDelete.dataset.deleteRoutine), 1);
    storage.set(routineKey, routines);
    renderLocalItems();
  }
});

document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    link.classList.add('active');
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (['#avatar', '#customize'].includes(link.getAttribute('href'))) {
      showSetup(link.textContent.trim(), `${link.textContent.trim()} controls are planned; no unsupported feature is simulated.`);
    }
  });
});

document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)
    && !messageDialog?.open && !setupDialog?.open) {
    event.preventDefault();
    document.querySelector('#voice-button')?.click();
  }
});

renderLocalItems();
loadProviders();
