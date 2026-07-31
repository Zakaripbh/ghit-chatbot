const API_URL = "http://localhost:3000/api/chat";

const messagesEl = document.getElementById("chat-messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");

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
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = inputEl.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  inputEl.value = "";

  const typingEl = appendMessage("...", "typing");

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

    typingEl.remove();

    if (!response.ok) {
      appendMessage(data.error || "Server Error", "bot");
      return;
    }

    appendMessage(data.reply, "bot");
  } catch (err) {
    console.error("Fetch error:", err);
    typingEl.remove();
    appendMessage("ERROR: " + err.message, "bot");
  }
});

appendMessage(
  "Hello! I'm GHIT Health Assistant. Ask me anything in English or Hausa. / Sannu! Ni ne GHIT Health Assistant. Ka tambaye ni tambayoyin lafiya cikin Turanci ko Hausa.",
  "bot"
);
