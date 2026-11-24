const toast = document.querySelector('#toast');
const setupDialog = document.querySelector('#setup-dialog');
const messageDialog = document.querySelector('#message-dialog');
let toastTimer;

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function showSetup(title, description = 'This capability is part of the Kaizen roadmap. Integrations require your authorization before connecting or taking action.') {
  document.querySelector('#setup-title').textContent = title;
  document.querySelector('#setup-description').textContent = description;
  setupDialog.showModal();
}

function openMessage() {
  messageDialog.showModal();
  setTimeout(() => document.querySelector('#message-input').focus(), 50);
}

document.querySelector('#type-button').addEventListener('click', openMessage);
document.querySelector('#new-task').addEventListener('click', () => showSetup('Create a task'));
document.querySelector('#settings-button').addEventListener('click', () => showSetup('Workspace settings'));
document.querySelector('#edit-layout').addEventListener('click', () => notify('Layout editing is coming soon.'));
document.querySelector('#teach-button').addEventListener('click', () => showSetup('Add a memory', 'Use the Smart Kaizen memory controls to save or remove local context.'));
document.querySelector('#routine-button').addEventListener('click', () => showSetup('Create a routine'));
document.querySelector('#all-integrations').addEventListener('click', () => showSetup('Explore integrations'));

document.querySelectorAll('.connect-button').forEach(button => {
  button.addEventListener('click', () => showSetup(`Connect ${button.dataset.integration}`, 'No external service is contacted in this prototype. A future connection will use explicit authorization.'));
});

document.querySelector('#model-select').addEventListener('change', event => {
  if (event.target.value === 'Choose a provider') return;
  showSetup(`Configure ${event.target.value}`, 'Use the provider setup flow before sending data to an AI provider.');
  event.target.value = 'Choose a provider';
});

document.querySelector('#voice-button').addEventListener('click', () => {
  showSetup('Voice setup', 'Microphone access, wake-word detection, speech recognition, and speech generation require platform support and configuration. No audio is recorded automatically.');
});

document.querySelector('#message-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'send') return;
  event.preventDefault();
  const input = document.querySelector('#message-input');
  if (!input.value.trim()) return;
  messageDialog.close();
  input.value = '';
  showSetup('AI provider not configured', 'Configure an AI model through workspace settings before sending messages.');
});

document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    link.classList.add('active');
  });
});

document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !messageDialog.open && !setupDialog.open) {
    event.preventDefault();
    document.querySelector('#voice-button').click();
  }
});
