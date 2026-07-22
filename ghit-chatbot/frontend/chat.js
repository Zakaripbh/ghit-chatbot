const API_URL = 'http://localhost:3000/api/chat'; // change to your deployed backend URL

const messagesEl = document.getElementById('chat-messages');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');

// Stable per-browser user id, persisted locally.
function getUserId() {
  let id = localStorage.getItem('ghit_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('ghit_user_id', id);
  }
  return id;
}

function appendMessage(text, role) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  appendMessage(text, 'user');
  inputEl.value = '';

  const typingEl = appendMessage('...', 'typing');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: getUserId(), message: text }),
    });
    const data = await res.json();
    typingEl.remove();
    appendMessage(data.reply || data.error || 'No response.', 'bot');
  } catch (err) {
    typingEl.remove();
    appendMessage('Network error — please try again. / Matsalar hanyar sadarwa.', 'bot');
  }
});

appendMessage("Hello! I'm GHIT. Ask me anything in English or Hausa. / Sannu! Ni ne GHIT, ka tambaye ni kome cikin Turanci ko Hausa.", 'bot');
