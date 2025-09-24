const fallbackData = [
  {
    id: "c1",
    title: "Test 1",
    time: "2025-09-19 14:38",
    snippet: "Test 2",
    messages: [
      {
        author: "User",
        text: "Test 3",
        time: "2025-09-19 14:38",
      },
    ],
  },
  {
    id: "c2",
    title: "Test 4",
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

const userid = "check";
const socket = io();

// --- Backend fetch helper: GET /api/conversations/:id ---
async function fetchConversationFromServer(id) {
  try {
    const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Network response not ok");
    const json = await res.json();
    // Expect shape: { id, title, time, snippet, messages: [{author,text,time}], content? }
    return json;
  } catch (err) {
    console.warn("Fetch conv fail", err);
    return null;
  }
}

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

// get id from URL (support /?id= or /chat/:id)
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

  // Try to find locally first
  let conv = conversations.find((c) => c.id === id);
  if (!conv) {
    // fetch from server if not in-memory
    const remote = await fetchConversationFromServer(id);
    if (remote) {
      // normalize remote into our structure
      conv = {
        id: remote.id,
        title: remote.title || "Conversation " + remote.id,
        time: remote.time || new Date().toLocaleString(),
        snippet:
          remote.snippet ||
          (remote.messages && remote.messages.length
            ? remote.messages.slice(-1)[0].text
            : ""),
        messages: remote.messages || [],
      };
      // insert into our list (at top)
      conversations.unshift(conv);
      renderList();
    }
  }

  if (conv) {
    chatTitle.textContent = conv.title;
    chatSubtitle.textContent = conv.time || "";
    renderMessages(conv);
  } else {
    goHome();
  }
}

// go home / new chat
function goHome(push = true) {
  currentId = null;
  updateSelectedInList();
  // show home
  chatShell.style.display = "none";
  homeView.style.display = "flex";
  // push clean URL (no id)
  if (push) history.pushState({}, "", "/chat");
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
  socket.emit("message_chatbot", text);

  // Optionally: POST to backend to persist the new conversation
  // fetch('/api/conversations', {method:'POST', body: JSON.stringify(conv), headers:{'Content-Type':'application/json'}})
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
  chatInput.focus();
  socket.emit("message_chatbot", text);

  // Optionally: send to backend to persist message
  // fetch(`/api/conversations/${encodeURIComponent(currentId)}/messages`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})})
});

// socket.on('chunk_response', ({ chunk }) => {
//   out.value += chunk;
//   // auto-scroll
//   out.scrollTop = out.scrollHeight;
// });

socket.on("chunk_response", ({ chunk }) => {
  let conv = conversations.find((c) => c.id === currentId);
  if (!conv) {
    const newConv = createConversation("");
    currentId = newConv.id;
    conv = newConv;
    homeView.style.display = "none";
    chatShell.style.display = "flex";
    chatTitle.textContent = conv.title;
    chatSubtitle.textContent = conv.time || "";
    updateSelectedInList();
  }
  const lastIdx = conv.messages.length - 1;
  let lastMsg = conv.messages[lastIdx];

  if (!lastMsg || lastMsg.author !== "Assistant") {
    const now = new Date().toLocaleString();
    const assistantMsg = {
      author: "Assistant",
      text: chunk || "",
      time: now,
    };
    conv.messages.push(assistantMsg);
    lastMsg = assistantMsg;
  } else {
    // otherwise append to existing assistant message text
    lastMsg.text = (lastMsg.text || "") + (chunk || "");
    lastMsg.time = new Date().toLocaleString();
  }

  conv.snippet = lastMsg.text;
  conv.time = lastMsg.time;
  renderList();
  renderMessages(conv);
});

socket.on("done", () => console.log("stream done"));
socket.on("error", (e) => console.error("err", e));

newChatBtn.addEventListener("click", () => {
  goHome();
  homeInput.focus();
});

window.addEventListener("popstate", (e) => {
  const id = (e.state && e.state.id) || idFromUrl();
  if (id) selectConversation(id, false);
  else goHome(false);
});

(async function init() {
  renderList();
  const urlId = idFromUrl();
  console.log("Log: ", urlId);
  if (urlId) {
    // try load from local first; selectConversation will fetch from server if not found
    await selectConversation(urlId, false);
  } else {
    // show home by default
    goHome(false);
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
