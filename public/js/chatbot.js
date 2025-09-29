const fallbackData = [
  {
    id: "c1",
    name: "Test 1",
    edit_time: "2025-09-19 14:38",
    history: [['USER', "Test 123232323232323232"], ['BOT', "Test 2"]],
  },
  {
    id: "c2",
    name: "Test 2",
    edit_time: "2025-09-20 14:38",
    history: [['USER', "Test 3"], ['BOT', "Test 4"]],
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
let conversations = null;
let currentId = null; // when null => show home
let addNewChat = false;

const userid = "check";
const socket = io();

// --- Backend fetch helper: GET /api/conversations/:id ---
async function fetchConversationFromServer() {
  try {
    const res = await fetch(`/api/findConversationByUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({'user_id': userid}),
    });
    if (!res.ok) throw new Error("Network response not ok");
    const json = await res.json();
    // console.log(json[0])
    return json;
  } catch (err) {
    console.warn("Fetch conv fail", err);
    return fallbackData;
  }
}

async function deleteConversation(cid) {
  try {
    const res = await fetch(`/api/deleteConversationById`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({'id': cid}),
    });
    if (!res.ok){
      console.log("Network response not ok");
      return;
    }
    conversations = conversations.filter(c => c.id != cid);
    if(currentId == cid){
      goHome();
    }
    renderList();
  } catch (err) {
    console.warn("Delete conv fail", err);
  }
}
function renderList() {
  convContainer.innerHTML = "";
  conversations.forEach((c) => {
    const el = document.createElement("div");
    el.className = "conv";
    el.dataset.id = c.id;

    // meta (title + snippet)
    const meta = document.createElement("div");
    meta.className = "meta";
    const h = document.createElement("h4");
    h.textContent = c.name;
    const p = document.createElement("p");
    p.textContent = c.edit_time;
    meta.appendChild(h);
    meta.appendChild(p);

    const actions = document.createElement("div");
    actions.className = "actions";

    const trash = document.createElement("div");
    trash.className = "trash-btn";
    trash.type = "button";
    trash.title = "Delete conversation";

    const img = document.createElement("img");
    img.src = "../images/trash-solid-full.svg";
    img.alt = "delete";
    img.className = "trash-icon";
    img.draggable = false;

    trash.appendChild(img);

    trash.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const ok = window.confirm("Are you sure to delete this conversation?");
      if (!ok) return;
      deleteConversation(c.id);
    });

    actions.appendChild(trash);
    el.appendChild(meta);
    el.appendChild(actions);
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
  if (!conv || !conv.history) return;
  conv.history.forEach((m) => {
    // console.log(m[0] == "BOT")
    const mEl = document.createElement("div");
    mEl.className =
      "message" + (m[0] == "USER" ? " me" : "");
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${m[0]}`;
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = m[1];
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
  if (conv) {
    chatTitle.textContent = conv.name;
    chatSubtitle.textContent = conv.edit_time || "";
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
  const id = crypto.randomUUID();
  const now = new Date();
  const timeStr = now.toLocaleString();
  const name = initialText
    ? initialText.slice(0, 30) + (initialText.length > 30 ? "..." : "")
    : "New conversation";
  const conv = {
    id: id,
    name,
    edit_time: timeStr,
    history: [],
  };
  if (initialText)
    conv.history.push(["USER", initialText]);
  conversations.unshift(conv); // newest on top
  renderList();
  addNewChat = true;
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
  const params = {'text': text, 'history': []}
  socket.emit("message_chatbot", params);

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
  const params = {'text': text, 'history': conv.history}
  conv.history.push(["USER", text]);
  // conv.name = text;
  conv.edit_time = now;
  // update list preview and messages
  conversations = conversations.filter(c => c.id != currentId);
  conversations.unshift(conv);
  renderList();
  renderMessages(conv);
  chatInput.value = "";
  chatInput.focus();
  socket.emit("message_chatbot", params);

  // Optionally: send to backend to persist message
  // fetch(`/api/conversations/${encodeURIComponent(currentId)}/messages`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})})
});

socket.on("chunk_response", ({ process_chunk }) => {
  let conv = conversations.find((c) => c.id === currentId);
  if (!conv) {
    const newConv = createConversation("");
    currentId = newConv.id;
    conv = newConv;
    homeView.style.display = "none";
    chatShell.style.display = "flex";
    chatTitle.textContent = conv.name;
    chatSubtitle.textContent = conv.time || "";
    updateSelectedInList();
  }
  const lastIdx = conv.history.length - 1;
  let lastMsg = conv.history[lastIdx];

  const now = new Date().toLocaleString();
  console.log(process_chunk);
  if(lastMsg[0] != 'BOT'){
    const assistantMsg = ["BOT", process_chunk || ""];
    conv.history.push(assistantMsg);
    lastMsg = assistantMsg;
  }
  else{
    lastMsg[1] = (lastMsg[1] || "") + (process_chunk || "");
  }
  conv.edit_time = now
  renderList();
  renderMessages(conv);
});

socket.on("done", async () => {
  console.log("stream done");
  let conv = conversations.find((c) => c.id === currentId);
  const lastIdx = conv.history.length - 1;
  if(addNewChat){
    const convPush = {id: conv.id, user_id: userid, edit_time: conv.edit_time, name: conv.name,
                      user_text: conv.history[lastIdx - 1][1], bot_text: conv.history[lastIdx][1]}
    const response = await fetch('/api/pushConversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(convPush),
    });
    if(response.status != 200){
      console.log(`Push error: ${response.status}`)
    }
  }
  else{
    const convUpdate = {id: conv.id, user_text: conv.history[lastIdx - 1][1], bot_text: conv.history[lastIdx][1], edit_time: conv.edit_time}
    const response = await fetch('/api/updateConversation', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(convUpdate),
    });
    if(response.status != 200){
      console.log(`Update error: ${response.status}`)
    }
  }
  addNewChat = false;
});

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
  // load all conversations
  conversations = await fetchConversationFromServer();
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
