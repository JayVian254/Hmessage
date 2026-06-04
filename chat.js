
(function () {
  "use strict";

  const STORAGE_KEY = "fakeMessenger_chats";

  const ORGANIZATIONS = [
    "mpesa", "m-pesa", "safaricom", "airtel",
    "equity", "kcb", "co-operative bank",
    "netflix", "google"
  ];

  function isOrganization(name) {
    return ORGANIZATIONS.some(org => name.toLowerCase().includes(org));
  }

  const ORG_COLORS = [
    "#F4C430", "#4CAF50", "#FF9800", "#2196F3",
    "#9C27B0", "#E91E63", "#00BCD4", "#FF5722",
    "#795548", "#607D8B", "#CDDC39", "#FFC107"
  ];

  function getOrgColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return ORG_COLORS[hash % ORG_COLORS.length];
  }

  // DOM elements
  const backBtn = document.getElementById("backBtn");
  const chatNameEl = document.getElementById("chatName");
  const headerAvatar = document.getElementById("headerAvatar");
  const messageList = document.getElementById("messageList");
  const replyBox = document.getElementById("replyBox");
  const noReplyNotice = document.getElementById("noReplyNotice");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const contextBar = document.getElementById("messageContextBar");
  const contextBackdrop = document.getElementById("contextBackdrop");
  const deleteMessageBtn = document.getElementById("deleteMessageBtn");

  let currentChat = null;
  let chatId = null;
  let selectedMessageIndex = -1;
  let longPressTimer = null;
  let ignoreNextClick = false;

  function getChats() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
  }

  function saveChats(chats) { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }

  // ---------- Mark all messages as read ----------
  function markMessagesRead() {
    if (!currentChat || !currentChat.messages) return;
    let changed = false;
    currentChat.messages.forEach(msg => {
      if (msg.direction === "incoming" && msg.state !== "read") {
        msg.state = "read";
        changed = true;
      }
    });
    if (!changed) return;
    const chats = getChats();
    const idx = chats.findIndex(c => c.id === currentChat.id);
    if (idx !== -1) { chats[idx] = currentChat; saveChats(chats); }
  }

  // ---------- Render messages ----------
  function renderMessages() {
    if (!currentChat) return;
    messageList.innerHTML = "";
    if (!currentChat.messages || currentChat.messages.length === 0) {
      messageList.innerHTML = '<div class="empty-chat">No messages yet</div>';
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
      meta.innerHTML = `<span class="message-time">${msg.time}</span>`;
      if (msg.direction === "outgoing") {
        meta.innerHTML += `<span class="message-state state-${msg.state || 'sent'}"></span>`;
      }

      bubble.appendChild(text);
      bubble.appendChild(meta);
      row.appendChild(bubble);

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

    messageList.scrollTop = messageList.scrollHeight;
  }

  function clearLongPress() { clearTimeout(longPressTimer); longPressTimer = null; }

  function openMessageContextBar() {
    ignoreNextClick = true;
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

  function deleteSelectedMessage() {
    if (selectedMessageIndex < 0 || !currentChat || !currentChat.messages) return;
    currentChat.messages.splice(selectedMessageIndex, 1);
    const chats = getChats();
    const idx = chats.findIndex(c => c.id === currentChat.id);
    if (idx !== -1) { chats[idx] = currentChat; saveChats(chats); }
    closeMessageContextBar();
    renderMessages();
  }

  // ---------- Load chat ----------
  function loadChat() {
    const params = new URLSearchParams(window.location.search);
    chatId = params.get("id");
    if (!chatId) { window.location.href = "index.html"; return; }

    const chats = getChats();
    currentChat = chats.find(c => c.id === chatId);
    if (!currentChat) { window.location.href = "index.html"; return; }

    chatNameEl.textContent = currentChat.name;

    const isOrg = isOrganization(currentChat.name);
    if (isOrg) {
      headerAvatar.innerHTML = '<span class="org-icon">👤</span>';
      headerAvatar.classList.add("organization");
      headerAvatar.style.background = getOrgColor(currentChat.name);
    } else {
      headerAvatar.textContent = currentChat.name.charAt(0).toUpperCase();
      headerAvatar.classList.remove("organization");
      headerAvatar.style.background = "";
    }

    if (isOrg) {
      replyBox.style.display = "none";
      noReplyNotice.style.display = "block";
    } else {
      replyBox.style.display = "flex";
      noReplyNotice.style.display = "none";
    }

    markMessagesRead();       // clear unread counter
    renderMessages();
  }

  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!currentChat.messages) currentChat.messages = [];
    currentChat.messages.push({
      text, direction: "outgoing", state: "sent", time
    });

    const chats = getChats();
    const idx = chats.findIndex(c => c.id === currentChat.id);
    if (idx !== -1) { chats[idx] = currentChat; saveChats(chats); }

    messageInput.value = "";
    renderMessages();
  }

  // Events
  backBtn.addEventListener("click", () => { window.location.href = "index.html"; });
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
  });

  deleteMessageBtn.addEventListener("click", deleteSelectedMessage);
  contextBackdrop.addEventListener("click", closeMessageContextBar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMessageContextBar(); });

  messageList.addEventListener("click", (e) => {
    if (!contextBar.classList.contains("active")) return;
    if (ignoreNextClick) { ignoreNextClick = false; return; }
    if (!e.target.closest(".message-context-bar")) closeMessageContextBar();
  });

  loadChat();
})();
