// --- Data model: each conversation has id,title,snippet,time,messages[] ---
const fallbackData = [
  {
    id: "c1",
    title: "Check 1",
    time: "2025-09-19 14:38",
    snippet: "Check 1: ABCDED",
    messages: [
      {
        author: "Response",
        text: "Check 3",
        time: "2025-09-19 14:38",
      },
    ],
  },
  {
    id: "c2",
    title: "Check 4",
    time: "2025-09-12 09:02",
    snippet: "Realtime chat, games, IOT",
    messages: [
      {
        author: "User",
        text: "Socket application",
        time: "2025-09-12 09:02",
      },
    ],
  },
];

const convContainer = document.getElementById("conversations");
const homeView = document.getElementById("homeView");
const chatShell = document.getElementById("chatShell");
const chatArea = document.getElementById("chatArea");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

const homeInput = document.getElementById("homeInput");
const homeSend = document.getElementById("homeSend");
const newChatBtn = document.getElementById("newChatBtn");

// in-memory conversations (simulate DB)
let conversations = [...fallbackData];
let currentId = null; // when null => show home

// Render sidebar list
function renderList() {
  convContainer.innerHTML = "";
  conversations.forEach((c) => {
    const el = document.createElement("div");
    el.className = "conv";
    el.dataset.id = c.id;

    const meta = document.createElement("div");
    meta.className = "meta";
    const h = document.createElement("h4");
    h.textContent = c.title;
    const p = document.createElement("p");
    p.textContent = c.snippet;
    meta.appendChild(h);
    meta.appendChild(p);

    const time = document.createElement("div");
    time.className = "time muted";
    time.textContent = c.time;

    el.appendChild(meta);
    el.appendChild(time);
    el.addEventListener("click", () => selectConversation(c.id, true));
    convContainer.appendChild(el);
  });
  updateSelectedInList();
}

function updateSelectedInList() {
  document
    .querySelectorAll(".conv")
    .forEach((el) =>
      el.classList.toggle("selected", el.dataset.id === currentId)
    );
}

// get id from URL (support /chat/:id)
function idFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) return params.get("id");
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts[0] === "chat" && parts[1]) return parts[1];
  return null;
}

// render chat messages into chatArea
function renderMessages(conv) {
  chatArea.innerHTML = "";
  if (!conv || !conv.messages) return;
  conv.messages.forEach((m) => {
    const mEl = document.createElement("div");
    mEl.className =
      "message" + (m.author === "You" || m.author === "Me" ? " me" : "");
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${m.author} • ${m.time}`;
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = m.text;
    mEl.appendChild(meta);
    mEl.appendChild(body);
    chatArea.appendChild(mEl);
  });
  // scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Fetch conversation by id from backend API
async function fetchConversation(id) {
  try {
    const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Network response not ok");
    const json = await res.json();
    // expected shape: { id, title, time, content, snippet }
    return json;
  } catch (err) {
    console.warn("Fetch failed, using fallback for", id, err);
    // fallback to client-side data
    return conversations.find((d) => d.id === id) || null;
  }
}

// select conversation; if push true, update history
async function selectConversation(id, push = false) {
  currentId = id;
  updateSelectedInList();
  // show chat view
  homeView.style.display = "none";
  chatShell.style.display = "flex";

  // push state
  if (push) {
    history.pushState({ id }, "", `/chat/${encodeURIComponent(id)}`);
  }

  // Fetch from backend (simulate) — here we use local conversations array
  const conv = await fetchConversation(id);
  if (conv) {
    chatTitle.textContent = conv.title;
    chatSubtitle.textContent = conv.time || "";
    renderMessages(conv);
  } else {
    chatTitle.textContent = "Cannot find the conversation";
    chatSubtitle.textContent = "";
    chatArea.innerHTML = '<div class="message">Cannot find the content.</div>';
  }
}

// go home / new chat
function goHome() {
  currentId = null;
  updateSelectedInList();
  // show home
  chatShell.style.display = "none";
  homeView.style.display = "flex";
  // push clean URL (no id)
  history.pushState({}, "", "/");
}

// create new conversation and optionally send initial message
function createConversation(initialText) {
  const id = "c" + Date.now();
  const now = new Date();
  const timeStr = now.toLocaleString();
  const title = initialText
    ? initialText.slice(0, 30) + (initialText.length > 30 ? "..." : "")
    : "New conversation";
  const conv = {
    id,
    title,
    time: timeStr,
    snippet: initialText || "",
    messages: [],
  };
  if (initialText)
    conv.messages.push({ author: "You", text: initialText, time: timeStr });
  conversations.unshift(conv); // newest on top
  renderList();
  return conv;
}

// handle sending from home (creates conversation and opens it)
homeSend.addEventListener("click", () => {
  const text = homeInput.value.trim();
  if (!text) return;
  const conv = createConversation(text);
  // clear home input and switch to chat
  homeInput.value = "";
  // select new conv and show (push state)
  selectConversation(conv.id, true);
  // focus chat input for follow-ups
  setTimeout(() => chatInput.focus(), 120);
});

// handle send in chat view (append message to existing conversation)
chatSend.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text || !currentId) return;
  const conv = conversations.find((c) => c.id === currentId);
  if (!conv) return;
  const now = new Date().toLocaleString();
  conv.messages.push({ author: "You", text, time: now });
  conv.snippet = text;
  conv.time = now;
  // update list preview and messages
  renderList();
  renderMessages(conv);
  chatInput.value = "";
  // focus back
  chatInput.focus();
});

// New Chat button
newChatBtn.addEventListener("click", () => {
  goHome();
  homeInput.focus();
});

// Handle popstate for back/forward
window.addEventListener("popstate", (e) => {
  const id = (e.state && e.state.id) || idFromUrl();
  if (id) selectConversation(id, false);
  else goHome();
});

// Initialize: render list and decide whether to show a conversation from URL or home
(function init() {
  renderList();
  const urlId = idFromUrl();
  if (urlId) {
    // show existing conv if present, else try fetch (omitted)
    const found = conversations.find((c) => c.id === urlId);
    if (found) selectConversation(urlId, false);
    else goHome();
  } else {
    // show home by default
    goHome();
  }
})();

// Keyboard shortcuts: Enter to send when focused in inputs (Ctrl+Enter for newline)
[homeInput, chatInput].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (el === homeInput) homeSend.click();
      else chatSend.click();
    }
  });
});
