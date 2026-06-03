(function () {
  "use strict";

  const STORAGE_KEY = "fakeMessenger_chats";
  const NON_REPLY_SENDERS = [
    "mpesa", "safaricom", "m-pesa", "m‑pesa", "lipa na m-pesa", "equity", "kcb",
    "co-operative bank", "airtel money", "tkash"
  ]; // Case‑insensitive check

  // ---------- DOM Elements ----------
  const backBtn = document.getElementById("backBtn");
  const chatNameEl = document.getElementById("chatName");
  const headerAvatar = document.getElementById("headerAvatar");
  const messageList = document.getElementById("messageList");
  const replyBox = document.getElementById("replyBox");
  const noReplyNotice = document.getElementById("noReplyNotice");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  let currentChat = null;
  let chatId = null;

  // ---------- Helpers ----------
  function getChats() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveChats(chats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  function isNonReplySender(name) {
    const lower = name.toLowerCase().trim();
    return NON_REPLY_SENDERS.some(prefix => lower.includes(prefix));
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---------- Render messages ----------
  function renderMessages() {
    if (!currentChat) return;
    messageList.innerHTML = "";

    if (!currentChat.messages || currentChat.messages.length === 0) {
      messageList.innerHTML = `<div class="empty-chat">No messages yet</div>`;
      return;
    }

    currentChat.messages.forEach(msg => {
      const row = document.createElement("div");
      row.className = `message-row ${msg.direction}`;

      const bubble = document.createElement("div");
      bubble.className = "message-bubble";

      const text = document.createElement("div");
      text.className = "message-text";
      text.textContent = msg.text;

      const meta = document.createElement("div");
      meta.className = "message-meta";

      const timeSpan = document.createElement("span");
      timeSpan.className = "message-time";
      timeSpan.textContent = msg.time;

      meta.appendChild(timeSpan);

      if (msg.direction === "outgoing") {
        const stateSpan = document.createElement("span");
        stateSpan.className = `message-state state-${msg.state || "sent"}`;
        meta.appendChild(stateSpan);
      }

      bubble.appendChild(text);
      bubble.appendChild(meta);
      row.appendChild(bubble);
      messageList.appendChild(row);
    });

    // Auto‑scroll to bottom
    messageList.scrollTop = messageList.scrollHeight;
  }

  // ---------- Load chat ----------
  function loadChat() {
    const params = new URLSearchParams(window.location.search);
    chatId = params.get("id");
    if (!chatId) {
      window.location.href = "index.html";
      return;
    }

    const chats = getChats();
    currentChat = chats.find(c => c.id === chatId);
    if (!currentChat) {
      window.location.href = "index.html";
      return;
    }

    // Update header
    chatNameEl.textContent = currentChat.name;
    headerAvatar.textContent = currentChat.name.charAt(0).toUpperCase();

    // Toggle reply / no‑reply UI
    if (isNonReplySender(currentChat.name)) {
      replyBox.style.display = "none";
      noReplyNotice.style.display = "block";
    } else {
      replyBox.style.display = "flex";
      noReplyNotice.style.display = "none";
    }

    renderMessages();
  }

  // ---------- Send message ----------
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg = {
      text,
      direction: "outgoing",
      state: "sent",
      time
    };

    // Ensure messages array exists
    if (!currentChat.messages) currentChat.messages = [];
    currentChat.messages.push(newMsg);

    // Save
    const chats = getChats();
    const idx = chats.findIndex(c => c.id === currentChat.id);
    if (idx !== -1) {
      chats[idx] = currentChat;
      saveChats(chats);
    }

    messageInput.value = "";
    renderMessages();
  }

  // ---------- Event listeners ----------
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  sendBtn.addEventListener("click", sendMessage);

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto‑resize textarea (optional)
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
  });

  // ---------- Initialise ----------
  loadChat();
})();
