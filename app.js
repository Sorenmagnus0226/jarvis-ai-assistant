const toast = document.querySelector('#toast');
const setupDialog = document.querySelector('#setup-dialog');
let toastTimer;

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function showSetup(title, description = 'This capability is part of the Jarvis roadmap. Integrations will be opt-in and require your authorization before connecting or taking action.') {
  document.querySelector('#setup-title').textContent = title;
  document.querySelector('#setup-description').textContent = description;
  setupDialog.showModal();
}

const messageDialog = document.querySelector('#message-dialog');
function openMessage() {
  messageDialog.showModal();
  setTimeout(() => document.querySelector('#message-input').focus(), 50);
}

document.querySelector('#type-button').addEventListener('click', openMessage);
document.querySelector('#new-task').addEventListener('click', () => showSetup('Create a task'));
document.querySelector('#settings-button').addEventListener('click', () => showSetup('Workspace settings'));
document.querySelector('#edit-layout').addEventListener('click', () => notify('Layout editing is coming soon.'));
document.querySelector('#teach-button').addEventListener('click', () => showSetup('Add a memory', 'Memory storage is not configured in this prototype. When implemented, you will be able to review, edit, and delete anything Jarvis remembers.'));
document.querySelector('#routine-button').addEventListener('click', () => showSetup('Create a routine'));
document.querySelector('#all-integrations').addEventListener('click', () => showSetup('Explore integrations'));

document.querySelectorAll('.connect-button').forEach(button => {
  button.addEventListener('click', () => showSetup(`Connect ${button.dataset.integration}`, 'No external service is contacted in this prototype. A future connection will use an explicit authorization flow and show requested permissions before access is granted.'));
});

document.querySelector('#model-select').addEventListener('change', event => {
  const provider = event.target.value;
  if (provider === 'Choose a provider') return;
  showSetup(`Configure ${provider}`, 'Provider selection is a UI preview only. Add credentials through a secure backend settings flow before sending data to an AI provider.');
  event.target.value = 'Choose a provider';
});

document.querySelector('#voice-button').addEventListener('click', () => {
  showSetup('Voice setup', 'Microphone access, wake-word detection, speech recognition, and speech generation are not enabled in this prototype. No audio is recorded or sent.');
});

document.querySelector('#message-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'send') return;
  event.preventDefault();
  const input = document.querySelector('#message-input');
  if (!input.value.trim()) return;
  messageDialog.close();
  input.value = '';
  showSetup('AI provider not configured', 'Connect an AI model through secure settings before sending messages. Your text was not transmitted or stored.');
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
