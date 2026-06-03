(function () {
  "use strict";

  const STORAGE_KEY = "fakeMessenger_chats";
  const NON_REPLY_SENDERS = [
    "mpesa", "safaricom", "m-pesa", "m‑pesa", "lipa na m-pesa", "equity", "kcb",
    "co-operative bank", "airtel money", "tkash"
  ];

  // ---------- DOM Elements ----------
  const backBtn = document.getElementById("backBtn");
  const chatNameEl = document.getElementById("chatName");
  const headerAvatar = document.getElementById("headerAvatar");
  const messageList = document.getElementById("messageList");
  const replyBox = document.getElementById("replyBox");
  const noReplyNotice = document.getElementById("noReplyNotice");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  // Message context elements
  const contextBar = document.getElementById("messageContextBar");
  const contextBackdrop = document.getElementById("contextBackdrop");
  const deleteMessageBtn = document.getElementById("deleteMessageBtn");

  let currentChat = null;
  let chatId = null;
  let selectedMessageIndex = -1;

  // Long‑press handling
  let longPressTimer = null;
  let ignoreNextClick = false;   // prevents immediate close after long‑press

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

  // ---------- Render messages ----------
  function renderMessages() {
    if (!currentChat) return;
    messageList.innerHTML = "";

    if (!currentChat.messages || currentChat.messages.length === 0) {
      messageList.innerHTML = `<div class="empty-chat">No messages yet</div>`;
      return;
    }

    currentChat.messages.forEach((msg, index) => {
      const row = document.createElement("div");
      row.className = `message-row ${msg.direction}`;
      row.dataset.index = index;

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

      // Attach long‑press listeners directly to the bubble
      bubble.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        selectedMessageIndex = index;
        longPressTimer = setTimeout(() => {
          navigator.vibrate?.(50);
          openMessageContextBar();
        }, 500);
      });

      bubble.addEventListener("pointerup", clearLongPress);
      bubble.addEventListener("pointerleave", clearLongPress);
      bubble.addEventListener("pointercancel", clearLongPress);

      messageList.appendChild(row);
    });

    // Auto‑scroll to bottom
    messageList.scrollTop = messageList.scrollHeight;
  }

  function clearLongPress() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  function openMessageContextBar() {
    ignoreNextClick = true;   // prevent immediate close from the up‑coming click
    contextBar.classList.add("active");
    contextBackdrop.classList.add("visible");
  }

  function closeMessageContextBar() {
    contextBar.classList.remove("active");
    contextBackdrop.classList.remove("visible");
    selectedMessageIndex = -1;
    clearLongPress();
    ignoreNextClick = false;
  }

  // ---------- Delete message ----------
  function deleteSelectedMessage() {
    if (selectedMessageIndex < 0 || !currentChat || !currentChat.messages) return;
    currentChat.messages.splice(selectedMessageIndex, 1);

    const chats = getChats();
    const idx = chats.findIndex(c => c.id === currentChat.id);
    if (idx !== -1) {
      chats[idx] = currentChat;
      saveChats(chats);
    }

    closeMessageContextBar();
    renderMessages();
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

    chatNameEl.textContent = currentChat.name;
    headerAvatar.textContent = currentChat.name.charAt(0).toUpperCase();

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

    if (!currentChat.messages) currentChat.messages = [];
    currentChat.messages.push(newMsg);

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

  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
  });

  deleteMessageBtn.addEventListener("click", deleteSelectedMessage);
  contextBackdrop.addEventListener("click", closeMessageContextBar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMessageContextBar();
    }
  });

  // Handle clicks on the message list – only close if bar is open AND it was not the long‑press release
  messageList.addEventListener("click", (e) => {
    if (!contextBar.classList.contains("active")) return;
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    // Close if tap is outside the context bar
    if (!e.target.closest(".message-context-bar")) {
      closeMessageContextBar();
    }
  });

  // ---------- Initialise ----------
  loadChat();
})();
