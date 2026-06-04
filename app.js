
(function () {
  "use strict";

  const STORAGE_KEY = "fakeMessenger_chats";

  // ---------- Organization helpers ----------
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

  // ---------- Default chats ----------
  const DEFAULT_CHATS = [
    {
      id: "c1", name: "Alex", pinned: false, muted: false, archived: false,
      messages: [
        { text: "Hey", direction: "incoming", state: "read", time: "9:38 PM" },
        { text: "Where are you?", direction: "incoming", state: "delivered", time: "9:41 PM" }
      ]
    },
    {
      id: "c2", name: "Sarah", pinned: true, muted: false, archived: false,
      messages: [
        { text: "Typing later?", direction: "incoming", state: "read", time: "8:12 PM" }
      ]
    },
    {
      id: "c3", name: "Mike", pinned: false, muted: false, archived: false,
      messages: [
        { text: "See you tomorrow", direction: "incoming", state: "read", time: "Yesterday" }
      ]
    }
  ];

  function loadChats() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn("Chat storage corrupted, resetting."); }
    return DEFAULT_CHATS.map(c => ({ ...c, messages: c.messages.map(m => ({ ...m })) }));
  }

  function saveChats(chats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  class ChatApp {
    constructor() {
      this.chats = loadChats();
      this.activeFilter = "";
      this.selectedChats = new Set();
      this.selectionMode = false;
      this.longPressTimer = null;
      this.longPressedChatId = null;
      this.tapCount = 0;
      this.tapTimer = null;
      this.appTitle = document.getElementById("app-title");

      this.contextMenu = document.getElementById("contextMenu");
      this.contextBackdrop = document.getElementById("contextBackdrop");
      this.pinBtn = document.getElementById("pinChatBtn");
      this.unreadBtn = document.getElementById("markUnreadBtn");
      this.muteBtn = document.getElementById("muteChatBtn");
      this.archiveBtn = document.getElementById("archiveChatBtn");
      this.deleteBtn = document.getElementById("deleteChatBtn");

      this.chatList = document.getElementById("chatList");
      this.searchInput = document.getElementById("search-input");
      this.hamburgerBtn = document.getElementById("hamburgerBtn");
      this.sideDrawer = document.getElementById("sideDrawer");
      this.drawerBackdrop = document.getElementById("drawerBackdrop");
      this.moreBtn = document.querySelector(".more-btn");
      this.fab = document.getElementById("addContactBtn");
      this.addModal = document.getElementById("addModal");
      this.cancelAddBtn = document.getElementById("cancelAddBtn");
      this.confirmAddBtn = document.getElementById("confirmAddBtn");
      this.newName = document.getElementById("newName");
      this.newMessage = document.getElementById("newMessage");
      this.newUnread = document.getElementById("newUnread");

      this.render = this.render.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.handleChatClick = this.handleChatClick.bind(this);
      this.toggleDrawer = this.toggleDrawer.bind(this);
      this.closeDrawer = this.closeDrawer.bind(this);
      this.openModal = this.openModal.bind(this);
      this.closeModal = this.closeModal.bind(this);
      this.confirmAdd = this.confirmAdd.bind(this);
      this.showMoreOptions = this.showMoreOptions.bind(this);
      this.init();
    }

    init() {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDrawer(); this.closeModal(); this.closeContextMenu();
          if (this.selectionMode) { this.clearSelection(); this.render(); }
        }
      });

      const searchForm = document.querySelector(".search-box");
      if (this.appTitle) this.appTitle.addEventListener("click", this.handleSecretTap.bind(this));

      if (this.chatList) {
        this.chatList.addEventListener("pointerdown", (e) => {
          const item = e.target.closest(".chat-item");
          if (!item) return;
          const chatId = item.dataset.chatId;
          this.longPressTimer = setTimeout(() => {
            navigator.vibrate?.(50);
            this.longPressedChatId = chatId;
            this.selectionMode = true;
            this.selectedChats.clear();
            this.selectedChats.add(chatId);
            this.render();
            item.dataset.longPressed = "true";
            this.openContextMenu();
          }, 500);
        });
        this.chatList.addEventListener("pointerup", () => clearTimeout(this.longPressTimer));
        this.chatList.addEventListener("pointerleave", () => clearTimeout(this.longPressTimer));
      }

      this.pinBtn?.addEventListener("click", () => this.togglePin());
      this.unreadBtn?.addEventListener("click", () => this.markUnread());
      this.muteBtn?.addEventListener("click", () => this.toggleMute());
      this.archiveBtn?.addEventListener("click", () => this.archiveChat());
      this.deleteBtn?.addEventListener("click", () => this.deleteChat());
      this.contextBackdrop?.addEventListener("click", () => this.closeContextMenu());

      if (searchForm) searchForm.addEventListener("submit", e => e.preventDefault());

      this.render();

      if (this.searchInput) {
        this.searchInput.addEventListener("input", this.handleSearch);
        this.searchInput.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            this.searchInput.value = ""; this.activeFilter = ""; this.render(); this.searchInput.blur();
          }
        });
      }

      if (this.hamburgerBtn) this.hamburgerBtn.addEventListener("click", this.toggleDrawer);
      if (this.drawerBackdrop) this.drawerBackdrop.addEventListener("click", this.closeDrawer);
      if (this.moreBtn) this.moreBtn.addEventListener("click", this.showMoreOptions);
      if (this.chatList) this.chatList.addEventListener("click", this.handleChatClick);
      if (this.fab) this.fab.addEventListener("click", this.openModal);
      if (this.cancelAddBtn) this.cancelAddBtn.addEventListener("click", this.closeModal);
      if (this.confirmAddBtn) this.confirmAddBtn.addEventListener("click", this.confirmAdd);
      if (this.addModal) {
        this.addModal.addEventListener("click", (e) => { if (e.target === this.addModal) this.closeModal(); });
      }
    }

    handleSearch(e) { this.activeFilter = e.target.value; this.render(); }

    getFilteredChats() {
      const filter = this.activeFilter.trim().toLowerCase();
      let chats = this.chats.filter(c => !c.archived);
      if (filter) {
        chats = chats.filter(c =>
          c.name.toLowerCase().includes(filter) ||
          (c.messages?.[c.messages.length - 1]?.text || "").toLowerCase().includes(filter)
        );
      }
      chats.sort((a, b) => (a.pinned ? -1 : 1) - (b.pinned ? -1 : 1) || 0);
      return chats;
    }

    getLastMessage(chat) {
      if (!chat.messages || chat.messages.length === 0) return null;
      return chat.messages[chat.messages.length - 1];
    }

    getUnreadCount(chat) {
      if (!chat.messages) return 0;
      return chat.messages.filter(m => m.direction === "incoming" && m.state !== "read").length;
    }

    render() {
      if (!this.chatList) return;
      const filtered = this.getFilteredChats();
      const fragment = document.createDocumentFragment();

      filtered.forEach((chat, index) => {
        const isOrg = isOrganization(chat.name);
        const avatarContent = isOrg ? '<span class="org-icon">👤</span>' : chat.name.charAt(0).toUpperCase();
        const lastMessage = this.getLastMessage(chat);
        const previewText = lastMessage?.text || "No messages";
        const previewTime = lastMessage?.time || "";
        const unreadCount = this.getUnreadCount(chat);

        const chatItem = document.createElement("li");
        chatItem.className = `chat-item${chat.pinned ? " pinned" : ""}${chat.muted ? " muted" : ""}${this.selectedChats.has(chat.id) ? " selected" : ""}`;
        chatItem.dataset.chatId = chat.id;
        chatItem.setAttribute("role", "listitem");
        chatItem.setAttribute("tabindex", "0");

        chatItem.innerHTML = `
          <div class="avatar${isOrg ? " organization" : ""}">${avatarContent}</div>
          <div class="chat-info">
            <div class="chat-top">
              <div class="chat-name">${this.escapeHTML(chat.name)}</div>
              <div class="chat-time">${this.escapeHTML(previewTime)}</div>
            </div>
            <div class="chat-message">${this.escapeHTML(previewText)}</div>
          </div>
          ${unreadCount > 0 ? `<div class="unread">${unreadCount}</div>` : ""}
        `;

        if (isOrg) {
          chatItem.querySelector(".avatar").style.background = getOrgColor(chat.name);
        }

        if (window.CSS && CSS.supports("animation", "fadeInUp 0.4s ease")) {
          chatItem.style.animation = `fadeInUp 0.3s ease ${index * 0.05}s both`;
        }
        fragment.appendChild(chatItem);
      });

      this.chatList.innerHTML = "";
      this.chatList.appendChild(fragment);

      if (filtered.length === 0 && this.activeFilter) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "chat-item no-results";
        emptyMsg.textContent = "No chats match your search.";
        emptyMsg.style.cssText = "color:var(--text-muted);padding:20px;text-align:center;";
        this.chatList.appendChild(emptyMsg);
      }
    }

    handleChatClick(e) {
      const chatItem = e.target.closest(".chat-item");
      if (!chatItem) return;
      if (chatItem.dataset.longPressed === "true") { chatItem.dataset.longPressed = "false"; return; }

      const chatId = chatItem.dataset.chatId;
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return;

      if (this.selectionMode) {
        if (this.selectedChats.has(chatId)) this.selectedChats.delete(chatId);
        else this.selectedChats.add(chatId);
        if (this.selectedChats.size === 0) this.selectionMode = false;
        this.render();
        return;
      }

      window.location.href = `chat.html?id=${chatId}`;
    }

    toggleDrawer() { this.sideDrawer.classList.toggle("open"); this.drawerBackdrop.classList.toggle("visible"); }
    closeDrawer() { this.sideDrawer.classList.remove("open"); this.drawerBackdrop.classList.remove("visible"); }

    showMoreOptions() { document.body.classList.toggle("dark-mode-enhanced"); }

    openModal() { this.addModal.classList.add("active"); this.newName.focus(); }
    closeModal() { this.addModal.classList.remove("active"); this.newName.value = ""; this.newMessage.value = ""; this.newUnread.value = "0"; }
    confirmAdd() {
      const name = this.newName.value.trim();
      if (!name) { alert("Name is required"); return; }
      const message = this.newMessage.value.trim() || "Hey there!";
      const unread = parseInt(this.newUnread.value, 10) || 0;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.addChat(name, message, time, unread);
      this.closeModal();
    }

    addChat(name, message, time, unread = 0) {
      const id = "c" + Date.now() + Math.random().toString(36).substring(2, 11);
      const messages = [];
      for (let i = 0; i < unread; i++) messages.push({ text: message, direction: "incoming", state: "delivered", time });
      if (unread === 0) messages.push({ text: message, direction: "incoming", state: "read", time });
      this.chats.unshift({ id, name, pinned: false, muted: false, archived: false, messages });
      saveChats(this.chats);
      this.render();
    }

    handleSecretTap() {
      this.tapCount++;
      clearTimeout(this.tapTimer);
      this.tapTimer = setTimeout(() => { this.tapCount = 0; }, 600);
      if (this.tapCount === 3) { this.tapCount = 0; window.location.href = "injector.html"; }
    }

    openContextMenu() { this.contextMenu?.classList.add("active"); this.contextBackdrop?.classList.add("visible"); }
    closeContextMenu() { this.contextMenu?.classList.remove("active"); this.contextBackdrop?.classList.remove("visible"); }

    togglePin() {
      this.chats.forEach(c => { if (this.selectedChats.has(c.id)) c.pinned = !c.pinned; });
      saveChats(this.chats); this.clearSelection(); this.closeContextMenu(); this.render();
    }
    markUnread() {
      this.chats.forEach(c => {
        if (this.selectedChats.has(c.id)) {
          const last = c.messages?.[c.messages.length - 1];
          if (last) last.state = "delivered";
        }
      });
      saveChats(this.chats); this.clearSelection(); this.closeContextMenu(); this.render();
    }
    toggleMute() {
      this.chats.forEach(c => { if (this.selectedChats.has(c.id)) c.muted = !c.muted; });
      saveChats(this.chats); this.clearSelection(); this.closeContextMenu(); this.render();
    }
    archiveChat() {
      this.chats.forEach(c => { if (this.selectedChats.has(c.id)) c.archived = true; });
      saveChats(this.chats); this.clearSelection(); this.closeContextMenu(); this.render();
    }
    deleteChat() {
      this.chats = this.chats.filter(c => !this.selectedChats.has(c.id));
      saveChats(this.chats); this.clearSelection(); this.closeContextMenu(); this.render();
    }

    clearSelection() { this.selectedChats.clear(); this.selectionMode = false; }

    escapeHTML(str) {
      const div = document.createElement("div");
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    }
  }

  document.addEventListener("DOMContentLoaded", () => { window.chatApp = new ChatApp(); });
})();
