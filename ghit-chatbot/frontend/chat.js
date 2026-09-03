const API_URL = "https://ghit-chatbot.onrender.com/api/chat";

const messagesEl = document.getElementById("chat-messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendButton = formEl.querySelector("button");

// Markdown renderer
const markdown = window.markdownit({
  html: false,
  breaks: true,
  linkify: true,
});

function getUserId() {
  let id = localStorage.getItem("ghit_user_id");

  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("ghit_user_id", id);
  }

  return id;
}

function appendMessage(text, role) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  if (role === "bot") {
    // Convert Markdown to HTML, then sanitize it.
    const rendered = markdown.render(String(text || ""));
    div.innerHTML = DOMPurify.sanitize(rendered);
  } else {
    // User messages remain plain text.
    div.textContent = text;
  }

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return div;
}

/* Visible GHIT searching indicator */
function appendSearchingIndicator() {
  const div = document.createElement("div");

  div.className = "msg searching";
  div.setAttribute("role", "status");
  div.setAttribute("aria-live", "polite");

  div.innerHTML = `
    <span class="searching-icon" aria-hidden="true">⌕</span>

    <span class="searching-content">
      <strong>
        GHIT is searching for the best answer
        <span class="searching-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </strong>

      <small>
        Please wait / Da fatan za a dakata na ɗan lokaci
      </small>
    </span>
  `;

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return div;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = inputEl.value.trim();

  if (!text) return;

  // Prevent duplicate submissions while GHIT is responding.
  sendButton.disabled = true;
  inputEl.disabled = true;

  appendMessage(text, "user");
  inputEl.value = "";

  // Show visible searching status.
  const searchingEl = appendSearchingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: getUserId(),
        message: text,
      }),
    });

    const data = await response.json();

    searchingEl.remove();

    if (!response.ok) {
      appendMessage(
        data.error || "Server Error",
        "bot"
      );
      return;
    }

    appendMessage(data.reply, "bot");

  } catch (err) {
    console.error("Fetch error:", err);

    if (searchingEl && searchingEl.parentNode) {
      searchingEl.remove();
    }

    appendMessage(
      "ERROR: " + err.message,
      "bot"
    );

  } finally {
    // Re-enable input after response/error.
    sendButton.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
  }
});

appendMessage(
  "Hello! I'm GHIT Health Assistant. Ask me anything in English or Hausa. / Sannu! Ni ne GHIT Health Assistant. Ka tambaye ni tambayoyin lafiya cikin Turanci ko Hausa.",
  "bot"
);