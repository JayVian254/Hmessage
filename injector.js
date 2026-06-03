(function () {
  "use strict";

  const STORAGE_KEY = "fakeMessenger_chats";

  const DEFAULT_CHATS = [
    {
      id: "c1",
      name: "Alex",
      pinned: false,
      muted: false,
      archived: false,
      messages: [
        { text: "Hey", direction: "incoming", state: "read", time: "9:38 PM" },
        { text: "Where are you?", direction: "incoming", state: "delivered", time: "9:41 PM" }
      ]
    },
    {
      id: "c2",
      name: "Sarah",
      pinned: true,
      muted: false,
      archived: false,
      messages: [
        { text: "Typing later?", direction: "incoming", state: "read", time: "8:12 PM" }
      ]
    },
    {
      id: "c3",
      name: "Mike",
      pinned: false,
      muted: false,
      archived: false,
      messages: [
        { text: "See you tomorrow", direction: "incoming", state: "read", time: "Yesterday" }
      ]
    }
  ];

  const contactSelect = document.getElementById("contactSelect");
  const messageInput = document.getElementById("messageInput");
  const stateSelect = document.getElementById("stateSelect");
  const timeInput = document.getElementById("timeInput");
  const injectBtn = document.getElementById("injectBtn");
  const backBtn = document.getElementById("backBtn");

  let chats = [];

  // ---------- LOAD ----------
  function loadChats() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          chats = parsed;
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    // fallback to defaults
    chats = DEFAULT_CHATS.map(chat => ({
      ...chat,
      messages: chat.messages.map(m => ({ ...m }))
    }));
  }

  // ---------- SAVE ----------
  function saveChats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  // ---------- POPULATE CONTACTS ----------
  function populateContacts() {
    contactSelect.innerHTML = "";
    chats.forEach(chat => {
      const option = document.createElement("option");
      option.value = chat.id;
      option.textContent = chat.name;
      contactSelect.appendChild(option);
    });
  }

  // ---------- CURRENT TIME (same format as app.js) ----------
  function getCurrentTime() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // ---------- INJECT ----------
  function injectMessage() {
    const chatId = contactSelect.value;
    const text = messageInput.value.trim();
    const direction = document.querySelector('input[name="direction"]:checked').value;
    const state = stateSelect.value;
    const time = timeInput.value.trim() || getCurrentTime();

    if (!text) {
      alert("Message required");
      return;
    }

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    if (!chat.messages) chat.messages = [];

    const newMessage = {
      text,
      direction,
      state,
      time
    };

    chat.messages.push(newMessage);
    saveChats();
    window.location.href = "index.html";
  }

  // ---------- EVENTS ----------
  injectBtn.addEventListener("click", injectMessage);
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // ---------- INIT ----------
  loadChats();
  populateContacts();
})();
