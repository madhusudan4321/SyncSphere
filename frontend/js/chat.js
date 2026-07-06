// ── Socket.io connection ──────────────────────────────────────
const SOCKET_URL = 'https://syncsphere-api.onrender.com';
let socket = null;

// ── Presence Manager ─────────────────────────────────────────
const PresenceManager = {
  onlineUsers: new Set(),
  lastSeenMap: new Map(),
  _clockInterval: null,

  setOnline(userId) {
    this.onlineUsers.add(String(userId));
    this.lastSeenMap.delete(String(userId));
    this.updateChatHeader();
  },

  setOffline(userId, lastSeen) {
    this.onlineUsers.delete(String(userId));
    if (lastSeen) this.lastSeenMap.set(String(userId), new Date(lastSeen));
    this.updateChatHeader();
  },

  formatLastSeen(userId) {
    const uid = String(userId);
    if (this.onlineUsers.has(uid)) return 'Online';
    const ts = this.lastSeenMap.get(uid);
    if (!ts) return '';
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (s < 60)  return 'Last seen just now';
    if (m < 60)  return `Last seen ${m} minute${m > 1 ? 's' : ''} ago`;
    if (h < 24)  return `Last seen ${h} hour${h > 1 ? 's' : ''} ago`;
    if (d === 1) return 'Last seen yesterday';
    return `Last seen on ${ts.toLocaleDateString('en-US',{month:'short',day:'numeric'})} at ${ts.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`;
  },

  updateChatHeader() {
    if (!chatPartnerId) return;
    const statusEl = document.getElementById('cw-status');
    if (!statusEl) return;
    const text = this.formatLastSeen(chatPartnerId);
    statusEl.textContent = text;
    statusEl.className = 'cw-status' + (this.onlineUsers.has(String(chatPartnerId)) ? ' cw-online' : '');
  },

  startClock() { this._clockInterval = setInterval(() => this.updateChatHeader(), 30000); },
  stopClock()  { clearInterval(this._clockInterval); }
};

// ── Typing Manager ────────────────────────────────────────────
const TypingManager = {
  _typing: false,
  _timer: null,

  onKeyPress() {
    if (!chatPartnerId || !socket?.connected) return;
    if (!this._typing) {
      this._typing = true;
      socket.emit('typing:start', { to: chatPartnerId });
    }
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.stop(), 2000);
  },

  stop() {
    if (!this._typing) return;
    this._typing = false;
    clearTimeout(this._timer);
    if (chatPartnerId && socket?.connected) socket.emit('typing:stop', { to: chatPartnerId });
  },

  reset() { clearTimeout(this._timer); this._typing = false; }
};

// ── Recording Manager ─────────────────────────────────────────
const RecordingManager = {
  start() { if (chatPartnerId && socket?.connected) socket.emit('recording:start', { to: chatPartnerId }); },
  stop()  { if (chatPartnerId && socket?.connected) socket.emit('recording:stop',  { to: chatPartnerId }); }
};

// ── Offline Message Queue ─────────────────────────────────────
const MessageQueue = {
  KEY: 'ss_msg_queue_v2',
  _get()     { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { return []; } },
  _save(q)   { localStorage.setItem(this.KEY, JSON.stringify(q)); },
  enqueue(i) { const q = this._get(); if (!q.find(x => x.tempId === i.tempId)) { q.push(i); this._save(q); } },
  dequeue(t) { this._save(this._get().filter(x => x.tempId !== t)); },
  getAll()   { return this._get(); },

  async flush() {
    const q = this._get();
    if (!q.length || !socket?.connected) return;
    for (const item of q) {
      try {
        const msg = await api.post('/messages', { to: item.to, text: item.text });
        // Swap temp bubble → real bubble
        const tempRow = document.getElementById('row-temp-' + item.tempId);
        if (tempRow) {
          const bub = tempRow.querySelector('.msg-bubble');
          const tick = tempRow.querySelector('.msg-tick');
          if (bub)  bub.id  = 'mb-' + msg._id;
          if (tick) { tick.id = 'tick-' + msg._id; tick.dataset.status = msg.status || 'sent'; tick.innerHTML = renderTickInner(msg.status || 'sent'); }
          tempRow.id = 'row-real-' + msg._id;
          tempRow.dataset.msgId = msg._id;
        }
        if (socket?.connected) socket.emit('message-sent', { to: item.to, message: msg });
        this.dequeue(item.tempId);
      } catch { break; }
    }
  }
};

// ── Tick Renderer ─────────────────────────────────────────────
function renderTickInner(status) {
  if (status === 'seen') {
    return `<svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.5 8.5L10.5 1" stroke="#53BDEB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5L9 8.5L15 1" stroke="#53BDEB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  } else if (status === 'delivered') {
    return `<svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.5 8.5L10.5 1" stroke="#8A8A8A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5L9 8.5L15 1" stroke="#8A8A8A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4 8.5L9 1" stroke="#8A8A8A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function updateTickStatus(msgId, newStatus) {
  const el = document.getElementById('tick-' + msgId);
  if (!el) return;
  const order = { sent: 0, delivered: 1, seen: 2 };
  if ((order[newStatus] ?? 0) <= (order[el.dataset.status] ?? 0)) return; // never downgrade
  el.dataset.status = newStatus;
  el.className = `msg-tick tick-${newStatus}`;
  el.innerHTML = renderTickInner(newStatus);
}

// ── Activity Indicator (typing / recording) ───────────────────
function showTypingIndicator() {
  hideActivityIndicator();
  const mc = document.getElementById('chat-messages'); if (!mc) return;
  const el = document.createElement('div');
  el.id = 'chat-activity-indicator';
  el.className = 'activity-row';
  el.innerHTML = `<div class="typing-bubble"><span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span></div>`;
  mc.appendChild(el);
  mc.scrollTop = mc.scrollHeight;
}

function showRecordingIndicator() {
  hideActivityIndicator();
  const mc = document.getElementById('chat-messages'); if (!mc) return;
  const el = document.createElement('div');
  el.id = 'chat-activity-indicator';
  el.className = 'activity-row';
  el.innerHTML = `<div class="recording-bubble"><span class="rec-pulse"></span>Recording audio...</div>`;
  mc.appendChild(el);
  mc.scrollTop = mc.scrollHeight;
}

function hideActivityIndicator() {
  document.getElementById('chat-activity-indicator')?.remove();
}

function connectSocket() {
  if (socket?.connected) return;
  socket = io(SOCKET_URL, {
    auth:                { token: localStorage.getItem('pic_token') },
    transports:          ['websocket', 'polling'],
    reconnection:        true,
    reconnectionAttempts: 10,
    reconnectionDelay:   1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    // Flush any messages queued while offline
    MessageQueue.flush();
  });

  socket.on('connect_error', (err) => console.warn('Socket error:', err.message));

  // ── Incoming message ──────────────────────────────────────
  socket.on('receive-message', (msg) => {
    if (chatPartnerId && (msg.from?._id === chatPartnerId || msg.from === chatPartnerId)) {
      hideActivityIndicator();
      appendMessage(msg, false);
      // Mark as seen immediately since window is open
      if (socket?.connected) socket.emit('messages:mark-seen', { partnerId: chatPartnerId });
    }
    loadThreads();
  });

  // ── Presence ──────────────────────────────────────────────
  socket.on('user:online', ({ userId }) => {
    PresenceManager.setOnline(userId);
    refreshThreadOnlineState(userId);
  });

  socket.on('user:offline', ({ userId, lastSeen }) => {
    PresenceManager.setOffline(userId, lastSeen);
    refreshThreadOnlineState(userId);
  });

  socket.on('presence:update', ({ userId, isOnline, lastSeen }) => {
    if (isOnline) PresenceManager.setOnline(userId);
    else          PresenceManager.setOffline(userId, lastSeen);
  });

  // ── Typing & Recording ────────────────────────────────────
  socket.on('typing:start', ({ from }) => {
    if (chatPartnerId && from === chatPartnerId) showTypingIndicator();
  });

  socket.on('typing:stop', ({ from }) => {
    if (chatPartnerId && from === chatPartnerId) hideActivityIndicator();
  });

  socket.on('recording:start', ({ from }) => {
    if (chatPartnerId && from === chatPartnerId) showRecordingIndicator();
  });

  socket.on('recording:stop', ({ from }) => {
    if (chatPartnerId && from === chatPartnerId) hideActivityIndicator();
  });

  // ── Message status ticks ──────────────────────────────────
  socket.on('message:delivered', ({ msgIds }) => {
    (msgIds || []).forEach(id => updateTickStatus(id, 'delivered'));
  });

  socket.on('message:seen', ({ by }) => {
    // All our messages to this user are now seen — update all visible ticks
    document.querySelectorAll('.msg-tick').forEach(el => {
      if (el.dataset.status !== 'seen') updateTickStatus(el.id.replace('tick-', ''), 'seen');
    });
  });

  // ── Legacy events ─────────────────────────────────────────
  socket.on('message-unsent', ({ msgId }) => {
    document.getElementById('mb-' + msgId)?.closest('.msg-row')?.remove();
    document.getElementById('mr-' + msgId)?.remove();
  });

  socket.on('message-edited', ({ msgId, text }) => {
    const bubble = document.getElementById('mb-' + msgId);
    if (bubble) bubble.innerHTML = `${sanitize(text)}<span style="font-size:10px;opacity:.7;margin-left:4px">(edited)</span>`;
  });

  socket.on('message-reacted', ({ msgId, reactions }) => {
    const rWrap = document.getElementById('mr-' + msgId);
    if (rWrap) rWrap.innerHTML = reactions.map(r => `<span class="msg-reaction" onclick="_reactToMsg('${msgId}','${r.emoji}')">${r.emoji}</span>`).join('');
  });
}

// ── State ─────────────────────────────────────────────────────
let chatPartnerId   = null;
let chatPartnerName = null;

// ── Thread list ───────────────────────────────────────────────
async function loadThreads() {
  const el = document.getElementById('chat-threads');
  el.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  try {
    const [threads, requests] = await Promise.all([
      api.get('/messages/threads'),
      api.get('/messages/requests')
    ]);
    el.innerHTML = '';

    if (requests.length > 0) {
      const hdr = document.createElement('div');
      hdr.style.cssText = 'padding:10px 16px;font-size:13px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--border);background:var(--surface2)';
      hdr.textContent = `Message Requests (${requests.length})`;
      el.appendChild(hdr);

      requests.forEach(r => {
        if (!r.from?._id) return;
        const div = document.createElement('div');
        div.className = 'chat-thread';
        div.style.background = '#fff8f0';
        const safeFrom = sanitize(r.from.name || r.from.username);
        const safeName = sanitize(r.from.username);
        const safeText = sanitize(r.text.slice(0, 40));
        div.innerHTML = `
          <div class="t-av"><div class="t-av-inner">${getInitials(safeFrom)}</div></div>
          <div class="t-info">
            <div class="t-name">${safeName} <span style="font-size:11px;color:#f09433;font-weight:400">• wants to message you</span></div>
            <div class="t-preview">${safeText}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button onclick="acceptRequest('${r._id}','${r.from._id}','${safeName}',event)" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">Accept</button>
            <button onclick="declineRequest('${r._id}',event)" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">Decline</button>
          </div>`;
        el.appendChild(div);
      });

      const divider = document.createElement('div');
      divider.style.cssText = 'padding:10px 16px;font-size:13px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--border);background:var(--surface2)';
      divider.textContent = 'Messages';
      el.appendChild(divider);
    }

    if (threads.length === 0 && requests.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px">No messages yet. Tap + to start!</p>';
      return;
    }

    threads.forEach(t => {
      if (!t.user?._id) return;
      const div = document.createElement('div');
      div.className = 'chat-thread';
      const safeUser  = sanitize(t.user.name || t.user.username);
      const safeUname = sanitize(t.user.username);
      const lastTxt   = t.lastMsg ? sanitize(t.lastMsg.text.slice(0, 40)) : '';
      const preview   = t.lastMsg ? (t.lastMsg.from._id === window.APP.user._id ? 'You: ' : '') + lastTxt : '';
      div.onclick = () => openChatWindow(t.user._id, t.user.username);
      div.innerHTML = `
        <div class="t-av"><div class="t-av-inner">${getInitials(safeUser)}</div></div>
        <div class="t-info">
          <div class="t-name">${safeUname}</div>
          <div class="t-preview">${preview}</div>
        </div>
        ${t.lastMsg ? `<div class="t-time">${timeAgo(t.lastMsg.createdAt)}</div>` : ''}`;
      el.appendChild(div);
    });
  } catch (err) {
    el.innerHTML = `<p style="color:#ed4956;text-align:center;padding:20px">${err.message}</p>`;
  }
}

async function acceptRequest(requestId, fromId, fromUsername, e) {
  e.stopPropagation();
  try {
    await api.put(`/messages/request/${requestId}/accept`);
    showToast('Request accepted!');
    loadThreads();
    openChatWindow(fromId, fromUsername);
  } catch (err) { showToast(err.message); }
}

async function declineRequest(requestId, e) {
  e.stopPropagation();
  try {
    await api.put(`/messages/request/${requestId}/decline`);
    showToast('Request declined');
    loadThreads();
  } catch (err) { showToast(err.message); }
}

// ── Chat window ───────────────────────────────────────────────
function openChatWindow(userId, username) {
  chatPartnerId   = userId;
  chatPartnerName = username;

  // Header: name
  const nameEl = document.getElementById('cw-name');
  nameEl.textContent = username;
  nameEl.onclick = () => showChatUserMenu(userId, username);
  nameEl.style.cursor = 'pointer';

  // Header: avatar
  const avEl = document.getElementById('cw-av');
  avEl.textContent = getInitials(username);
  avEl.onclick = () => showChatUserMenu(userId, username);
  avEl.style.cursor = 'pointer';

  // Header: inject status subtitle if not already present
  let statusEl = document.getElementById('cw-status');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'cw-status';
    statusEl.className = 'cw-status';
    // Insert below cw-name inside the header
    const header = document.querySelector('.chat-win-header');
    if (header) {
      // Wrap name + status in a column div
      const nameWrap = document.createElement('div');
      nameWrap.style.cssText = 'display:flex;flex-direction:column;flex:1;min-width:0';
      nameEl.style.flex = '';
      nameEl.parentNode?.insertBefore(nameWrap, nameEl);
      nameWrap.appendChild(nameEl);
      nameWrap.appendChild(statusEl);
    }
  }
  statusEl.textContent = '';

  document.getElementById('chat-list-view').style.display = 'none';
  document.getElementById('chat-window').classList.add('open');

  // Socket: join room
  if (socket?.connected) {
    socket.emit('join-chat', { partnerId: userId });
    // Request presence state for this partner
    socket.emit('presence:request', { targetId: userId });
    // Mark all their messages as seen
    socket.emit('messages:mark-seen', { partnerId: userId });
  }

  // REST fallback: also mark seen via HTTP in case socket isn't ready
  api.request('PUT', `/messages/seen/${userId}`, null).catch(() => {});

  // Start clock that updates "last seen X ago" text every 30s
  PresenceManager.startClock();

  loadMessages();
  setTimeout(() => document.getElementById('chat-msg-input').focus(), 100);
}

function closeChatWindow() {
  if (chatPartnerId && socket?.connected) {
    socket.emit('leave-chat', { partnerId: chatPartnerId });
  }
  // Clean up real-time state
  TypingManager.stop();
  TypingManager.reset();
  PresenceManager.stopClock();
  hideActivityIndicator();
  chatPartnerId = null;
  chatPartnerName = null;
  document.getElementById('chat-window').classList.remove('open');
  document.getElementById('chat-list-view').style.display = 'flex';
}

async function loadMessages() {
  if (!chatPartnerId) return;
  try {
    const msgs = await api.get(`/messages/${chatPartnerId}`);
    const mc   = document.getElementById('chat-messages');
    const atBottom = mc.scrollHeight - mc.clientHeight <= mc.scrollTop + 30;
    mc.innerHTML = '';
    if (msgs.length === 0) {
      mc.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px;font-size:13px">Say hi!</p>';
      return;
    }
    msgs.forEach(m => appendMessage(m, m.from._id === window.APP.user._id));
    if (atBottom) mc.scrollTop = mc.scrollHeight;
  } catch (err) {}
}

function appendMessage(m, isMine) {
  const mc = document.getElementById('chat-messages');
  if (!mc) return;
  const atBottom = mc.scrollHeight - mc.clientHeight <= mc.scrollTop + 30;
  const placeholder = mc.querySelector('p');
  if (placeholder) placeholder.remove();

  const msgId    = m._id || '';
  const isUnsent = m.deletedForAll;
  const safeText = isUnsent
    ? `<span style="color:var(--muted);font-style:italic;font-size:13px">Message unsent</span>`
    : sanitize(m.text || m);
  const editedBadge = m.edited && !isUnsent
    ? `<span style="font-size:10px;opacity:.6;margin-left:4px">· edited</span>` : '';
  const dotsSvg = `<svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>`;

  const row = document.createElement('div');
  row.className = 'msg-row ' + (isMine ? 'mine' : 'other');
  row.dataset.msgId  = msgId;
  row.dataset.isMine = isMine ? '1' : '0';
  // Tick status for own messages (sent/delivered/seen)
  const tickStatus = m.status || 'sent';
  const tickHtml = isMine && msgId
    ? `<span class="msg-tick tick-${tickStatus}" id="tick-${msgId}" data-status="${tickStatus}">${renderTickInner(tickStatus)}</span>`
    : '';

  row.innerHTML = `
    <div class="msg-bubble-wrap">
      <div class="msg-bubble" id="mb-${msgId}">${safeText}${editedBadge}</div>
      <div class="msg-time">${timeAgo(m.createdAt || new Date())}${tickHtml}</div>
    </div>
    <button class="msg-dots-btn" id="dots-${msgId}" onclick="_showMsgMenu('${msgId}',${isMine},event)">${dotsSvg}</button>`;

  const bubbleEl = row.querySelector('.msg-bubble');
  let holdTimer = null, longPressed = false;
  bubbleEl.addEventListener('pointerdown', () => { longPressed = false; holdTimer = setTimeout(() => { longPressed = true; _showEmojiPicker(msgId, bubbleEl); }, 500); }, { passive: true });
  bubbleEl.addEventListener('pointerup',     () => clearTimeout(holdTimer), { passive: true });
  bubbleEl.addEventListener('pointercancel', () => clearTimeout(holdTimer), { passive: true });
  bubbleEl.addEventListener('contextmenu',   e  => e.preventDefault());
  bubbleEl.addEventListener('click', e => { e.stopPropagation(); if (longPressed) { longPressed = false; return; } _toggleMsgDots(msgId); });

  const reactions = (m.reactions || []);
  mc.appendChild(row);
  const rDiv = document.createElement('div');
  rDiv.className = 'msg-reactions-wrap ' + (isMine ? 'mine' : 'other');
  rDiv.id = 'mr-' + msgId;
  if (reactions.length > 0)
    rDiv.innerHTML = reactions.map(r => `<span class="msg-reaction" onclick="_reactToMsg('${msgId}','${r.emoji}')">${r.emoji}</span>`).join('');
  mc.appendChild(rDiv);
  if (atBottom) mc.scrollTop = mc.scrollHeight;
}

// ── Dots toggle ───────────────────────────────────────────────
function _toggleMsgDots(msgId) {
  document.querySelectorAll('.msg-dots-btn.visible').forEach(b => {
    if (b.id !== 'dots-'+msgId) { clearTimeout(b._hideTimer); b.classList.remove('visible'); }
  });
  document.getElementById('msg-dots-menu')?.remove();
  const btn = document.getElementById('dots-'+msgId);
  if (!btn) return;
  btn.classList.toggle('visible');
  clearTimeout(btn._hideTimer);
  if (btn.classList.contains('visible')) {
    btn._hideTimer = setTimeout(() => {
      btn.classList.remove('visible');
      document.getElementById('msg-dots-menu')?.remove();
    }, 3000);
  }
}

// ── Three-dot menu (Emoji row + Edit/Unsend for sender) ──────
function _showMsgMenu(msgId, isMine, e) {
  e?.stopPropagation();
  document.getElementById('msg-dots-menu')?.remove();

  const btn = document.getElementById('dots-'+msgId);
  if (!btn) return;
  const rect = btn.getBoundingClientRect();

  // Position: for mine (right side) open leftward; for other (left side) open rightward
  const menu = document.createElement('div');
  menu.id = 'msg-dots-menu';
  const menuWidth = 220;
  const leftPos = isMine
    ? Math.max(10, rect.right - menuWidth - 8)
    : Math.min(rect.left + 4, window.innerWidth - menuWidth - 10);
  menu.style.cssText = `position:fixed;z-index:600;top:${Math.max(60, rect.top - 60)}px;left:${leftPos}px;background:var(--surface);border-radius:16px;box-shadow:0 6px 28px rgba(0,0,0,.2);border:1px solid var(--border);overflow:hidden;width:${menuWidth}px;animation:fadeInOverlay .15s ease`;

  const mkRow = (label, color, svgPath, fn) =>
    `<div onclick="${fn}" style="display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;font-size:14px;font-weight:500;color:${color}" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'"><svg width="15" height="15" fill="none" stroke="${color}" stroke-width="2" viewBox="0 0 24 24">${svgPath}</svg>${label}</div>`;

  const dismissFn = `document.getElementById('msg-dots-menu')?.remove();document.getElementById('dots-${msgId}')?.classList.remove('visible');clearTimeout(document.getElementById('dots-${msgId}')?._hideTimer)`;

  menu.innerHTML = `
    <!-- Emoji reactions row -->
    <div style="display:flex;justify-content:space-around;align-items:center;padding:10px 6px 8px;border-bottom:1px solid var(--border)">
      ${QUICK_EMOJIS.map(em => `<button onclick="_reactToMsg('${msgId}','${em}');${dismissFn}" style="background:none;border:none;font-size:22px;cursor:pointer;padding:5px 4px;border-radius:50%;transition:transform .12s,background .12s;line-height:1" onmouseover="this.style.transform='scale(1.3)';this.style.background='var(--surface2)'" onmouseout="this.style.transform='scale(1)';this.style.background='none'">${em}</button>`).join('')}
    </div>
    ${isMine ? `
    <div style="padding:4px 0">
      ${mkRow('Edit','var(--text)','<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',`_editMsg('${msgId}');${dismissFn}`)}
      <div style="height:1px;background:var(--border)"></div>
      ${mkRow('Unsend','#ed4956','<polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>',`_confirmUnsend('${msgId}')`)}
    </div>` : ''}
  `;

  const close = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 50);
  document.body.appendChild(menu);
}

// ── Long-press emoji picker ───────────────────────────────────
function _showEmojiPicker(msgId, bubbleEl) {
  document.getElementById('msg-emoji-picker')?.remove();
  const rect = bubbleEl.getBoundingClientRect();
  const picker = document.createElement('div');
  picker.id = 'msg-emoji-picker';
  picker.style.cssText = `position:fixed;z-index:650;top:${Math.max(10,rect.top-60)}px;left:50%;transform:translateX(-50%);background:var(--surface);border-radius:40px;box-shadow:0 4px 24px rgba(0,0,0,.2);border:1px solid var(--border);display:flex;gap:2px;padding:8px 10px;animation:fadeInOverlay .15s ease`;
  picker.innerHTML = QUICK_EMOJIS.map(em =>
    `<button onclick="_reactToMsg('${msgId}','${em}');document.getElementById('msg-emoji-picker')?.remove()" style="background:none;border:none;font-size:24px;cursor:pointer;padding:4px 5px;border-radius:50%;transition:.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='none'">${em}</button>`
  ).join('');
  const close = ev => { if (!picker.contains(ev.target)) { picker.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 50);
  document.body.appendChild(picker);
}

function _confirmUnsend(msgId) {
  document.getElementById('msg-action-menu')?.remove();
  document.getElementById('unsend-confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'unsend-confirm-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:600;display:flex;align-items:flex-end;justify-content:center;animation:fadeInOverlay .18s ease';
  modal.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:24px 24px 0 0;overflow:hidden;padding-bottom:env(safe-area-inset-bottom);animation:slideUpSheet .22s cubic-bezier(.32,1,.26,1)">
      <div style="padding:8px 0 4px;display:flex;justify-content:center"><div style="width:36px;height:4px;background:var(--border);border-radius:4px"></div></div>
      <div style="padding:18px 24px 8px;text-align:center">
        <div style="width:52px;height:52px;border-radius:50%;background:#ed495615;border:2px solid #ed495630;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
          <svg width="22" height="22" fill="none" stroke="#ed4956" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </div>
        <h3 style="font-size:17px;font-weight:700;margin-bottom:6px">Unsend Message?</h3>
        <p style="font-size:13px;color:var(--muted)">This message will be removed for everyone. This cannot be undone.</p>
      </div>
      <div style="padding:14px 24px 18px;display:flex;flex-direction:column;gap:10px">
        <button onclick="_doUnsend('${msgId}')" style="width:100%;padding:13px;background:linear-gradient(135deg,#ff6b6b,#ed4956);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px #ed495640">Unsend for Everyone</button>
        <button onclick="document.getElementById('unsend-confirm-modal').remove()" style="width:100%;padding:12px;background:var(--surface2);color:var(--text);border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer">Cancel</button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function _doUnsend(msgId) {
  document.getElementById('unsend-confirm-modal')?.remove();
  try {
    await api.request('DELETE', `/messages/${msgId}`, null);
    // Remove both the row and its reaction wrap from DOM
    document.getElementById('mb-' + msgId)?.closest('.msg-row')?.remove();
    document.getElementById('mr-' + msgId)?.remove();
    showToast('Message unsent');
    // Emit socket event so partner also sees it removed
    if (socket?.connected) socket.emit('message-unsent', { msgId, to: chatPartnerId });
    loadThreads();
  } catch (err) { showToast(err.message); }
}

function _editMsg(msgId) {
  const bubble = document.getElementById('mb-' + msgId);
  if (!bubble) return;
  const currentText = bubble.innerText.replace('(edited)', '').trim();
  bubble.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center">
      <input id="edit-msg-input-${msgId}" value="${currentText.replace(/"/g,'&quot;')}" 
        style="flex:1;background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.4);border-radius:8px;padding:5px 8px;font-size:14px;color:inherit;outline:none;font-family:var(--font)"
        onkeydown="if(event.key==='Enter')_saveEditMsg('${msgId}');if(event.key==='Escape')loadMessages()">
      <button onclick="_saveEditMsg('${msgId}')" style="background:rgba(255,255,255,.25);border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;color:inherit">Save</button>
      <button onclick="loadMessages()" style="background:none;border:none;font-size:18px;cursor:pointer;color:inherit;opacity:.7">✕</button>
    </div>`;
  setTimeout(() => document.getElementById('edit-msg-input-' + msgId)?.focus(), 50);
}

async function _saveEditMsg(msgId) {
  const input = document.getElementById('edit-msg-input-' + msgId);
  if (!input) return;
  const newText = input.value.trim();
  if (!newText) return;
  try {
    const updated = await api.request('PUT', `/messages/${msgId}`, { text: newText });
    // Update bubble in place
    const bubble = document.getElementById('mb-' + msgId);
    if (bubble) bubble.innerHTML = `${sanitize(updated.text)}<span style="font-size:10px;opacity:.7;margin-left:4px">(edited)</span>`;
    // Emit socket event
    if (socket?.connected) socket.emit('message-edited', { msgId, to: chatPartnerId, text: updated.text });
  } catch (err) { showToast(err.message); loadMessages(); }
}

async function _reactToMsg(msgId, emoji) {
  try {
    const { reactions } = await api.post(`/messages/${msgId}/react`, { emoji });
    const rWrap = document.getElementById('mr-' + msgId);
    if (rWrap) {
      rWrap.innerHTML = reactions.map(r =>
        `<span class="msg-reaction" onclick="_reactToMsg('${msgId}','${r.emoji}')">${r.emoji}</span>`
      ).join('');
    }
    if (socket?.connected) socket.emit('message-reacted', { msgId, to: chatPartnerId, reactions });
  } catch (err) { showToast('❌ ' + err.message); }
}

async function sendMessage() {
  const input = document.getElementById('chat-msg-input');
  const text  = input.value.trim();
  if (!text || !chatPartnerId) return;
  input.value = '';

  // Stop typing indicator
  TypingManager.stop();

  // ── Optimistic UI: show message immediately with temp ID ──
  const tempId  = 'tmp_' + Date.now();
  const tempMsg = {
    _id: tempId, from: { _id: window.APP.user._id }, to: chatPartnerId,
    text, status: 'sent', createdAt: new Date(), reactions: []
  };
  appendMessage(tempMsg, true);
  // Give the temp row a stable ID for queue lookup
  const addedRow = document.querySelector(`[data-msg-id='${tempId}']`);
  if (addedRow) addedRow.id = 'row-temp-' + tempId;

  // Queue for offline resilience before async call
  MessageQueue.enqueue({ tempId, to: chatPartnerId, text });

  try {
    const msg = await api.post('/messages', { to: chatPartnerId, text });
    // Replace temp bubble with real one
    const tempRow = document.getElementById('row-temp-' + tempId);
    if (tempRow) {
      const bub  = tempRow.querySelector('.msg-bubble');
      const tick = tempRow.querySelector('.msg-tick');
      const tBub = document.getElementById('mb-' + tempId);
      if (bub  || tBub) (bub || tBub).id = 'mb-' + msg._id;
      if (tick) { tick.id = 'tick-' + msg._id; tick.dataset.status = msg.status || 'sent'; tick.innerHTML = renderTickInner(msg.status || 'sent'); }
      tempRow.dataset.msgId = msg._id;
      tempRow.id = '';
    }
    MessageQueue.dequeue(tempId);
    // Notify partner via socket
    if (socket?.connected) socket.emit('message-sent', { to: chatPartnerId, message: msg });
  } catch (err) {
    if (err.message === 'Send a message request first') {
      // Remove optimistic bubble
      document.getElementById('row-temp-' + tempId)?.remove();
      MessageQueue.dequeue(tempId);
      input.value = text;
      showRequestPrompt(chatPartnerId, chatPartnerName, text);
    } else {
      // Keep bubble visible (queued), mark with offline style
      const failRow = document.getElementById('row-temp-' + tempId);
      if (failRow) failRow.style.opacity = '0.6';
      // Queue will auto-flush on reconnect
    }
  }
}

function showRequestPrompt(userId, username, text) {
  const existing = document.getElementById('request-prompt');
  if (existing) existing.remove();
  const mc = document.getElementById('chat-messages');
  const prompt = document.createElement('div');
  prompt.id = 'request-prompt';
  prompt.style.cssText = 'background:#fff8f0;border:1px solid #f09433;border-radius:12px;padding:16px;margin:16px;text-align:center';
  prompt.innerHTML = `
    <p style="font-size:13px;margin-bottom:12px">You don't follow <strong>${sanitize(username)}</strong>.<br>Send a message request instead?</p>
    <button onclick="sendRequest('${userId}','${text}')" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px">Send Request</button>
    <button onclick="document.getElementById('request-prompt').remove()" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>`;
  mc.appendChild(prompt);
  mc.scrollTop = mc.scrollHeight;
}

async function sendRequest(userId, text) {
  try {
    await api.post('/messages/request', { to: userId, text });
    showToast('Message request sent!');
    document.getElementById('request-prompt')?.remove();
    document.getElementById('chat-msg-input').value = '';
    document.getElementById('chat-messages').innerHTML = `
      <div style="text-align:center;padding:30px 20px">
        <p style="font-size:14px;font-weight:600;margin-bottom:6px">Request Sent!</p>
        <p style="font-size:13px;color:var(--muted)">You can chat once they accept it.</p>
      </div>`;
  } catch (err) { showToast(err.message); }
}

function toggleNewChat() {
  const el = document.getElementById('new-chat-search');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') document.getElementById('new-chat-input').focus();
}

let newChatTimer = null;
function searchNewChat(q) {
  clearTimeout(newChatTimer);
  const res = document.getElementById('new-chat-results');
  if (!q.trim()) { res.innerHTML = ''; return; }
  newChatTimer = setTimeout(async () => {
    try {
      const users = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      res.innerHTML = users.map(u => {
        const safeUname = sanitize(u.username);
        const safeName  = sanitize(u.name || '');
        return `<div class="user-result" style="padding:8px 0" onclick="startChatWith('${u._id}','${u.username}')">
          <div class="u-av"><div class="u-av-inner">${getInitials(safeName || safeUname)}</div></div>
          <div class="u-info"><p>${safeUname}</p><p>${safeName}</p></div>
        </div>`;
      }).join('');
    } catch (err) {}
  }, 300);
}

function startChatWith(userId, username) {
  document.getElementById('new-chat-search').style.display = 'none';
  document.getElementById('new-chat-input').value = '';
  document.getElementById('new-chat-results').innerHTML = '';
  openChatWindow(userId, username);
}

// ── Chat user context menu ────────────────────────────────────
function showChatUserMenu(userId, username) {
  const existing = document.getElementById('chat-user-menu');
  if (existing) { existing.remove(); return; }
  const menu = document.createElement('div');
  menu.id = 'chat-user-menu';
  menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:flex-end;justify-content:center';
  menu.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom);overflow:hidden">
      <div style="padding:24px 20px 16px;text-align:center;border-bottom:1px solid var(--border)">
        <div style="width:60px;height:60px;border-radius:50%;background:var(--grad);padding:2px;margin:0 auto 12px">
          <div style="width:100%;height:100%;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;border:2px solid #fff">${getInitials(username)}</div>
        </div>
        <p style="font-size:16px;font-weight:700">@${sanitize(username)}</p>
      </div>
      <div>
        <div onclick="chatMenuViewProfile('${username}')" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <div><p style="font-size:15px;font-weight:600">View Profile</p></div>
        </div>
        <div onclick="chatMenuBlockUser('${userId}','${username}')" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#fdecea;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" fill="none" stroke="#ed4956" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
          <div><p style="font-size:15px;font-weight:600;color:#ed4956">Block User</p></div>
        </div>
        <div onclick="chatMenuReportUser('${userId}','${username}')" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#fff8e1;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" fill="none" stroke="#f09433" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div><p style="font-size:15px;font-weight:600;color:#f09433">Report User</p></div>
        </div>
        <div onclick="document.getElementById('chat-user-menu').remove()" style="display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <p style="font-size:15px;font-weight:600;color:var(--muted)">Cancel</p>
        </div>
      </div>
    </div>`;
  menu.addEventListener('click', e => { if (e.target === menu) menu.remove(); });
  document.body.appendChild(menu);
}

function chatMenuViewProfile(username) {
  document.getElementById('chat-user-menu')?.remove();
  viewProfile(username);
}

async function chatMenuBlockUser(userId, username) {
  document.getElementById('chat-user-menu')?.remove();
  if (!confirm(`Block @${username}?`)) return;
  try {
    await api.post(`/users/${userId}/block`);
    showToast(`@${username} blocked`);
    closeChatWindow();
  } catch (err) { showToast(err.message); }
}

function chatMenuReportUser(userId, username) {
  document.getElementById('chat-user-menu')?.remove();
  showReportModal(userId, username);
}

function showReportModal(userId, username) {
  const existing = document.getElementById('report-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'report-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:16px;width:100%;max-width:380px;overflow:hidden">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <h3 style="font-size:16px;font-weight:700">Report @${sanitize(username)}</h3>
        <button onclick="document.getElementById('report-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text)">×</button>
      </div>
      <div style="padding:16px">
        <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Why are you reporting this account?</p>
        ${['Spam or fake account','Inappropriate content','Harassment or bullying','Hate speech','Scam or fraud','Other'].map(reason => `
          <div onclick="submitReport('${userId}','${sanitize(username)}','${reason}')" style="padding:12px 16px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:pointer;font-size:14px" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">${reason}</div>`).join('')}
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function submitReport(userId, username, reason) {
  document.getElementById('report-modal')?.remove();
  try {
    await api.post(`/users/${userId}/report`, { reason });
    showToast('Report submitted. Thank you!');
  } catch (err) { showToast('Report submitted!'); }
}

// ── Online dot in thread list ─────────────────────────────────
// Called when a presence:update arrives for a user who may be in the threads list
function refreshThreadOnlineState(userId) {
  // Update thread row's online dot if visible
  const threads = document.querySelectorAll('.chat-thread');
  threads.forEach(t => {
    const uid = t.dataset.userId;
    if (uid && uid === String(userId)) {
      let dot = t.querySelector('.thread-online-dot');
      if (PresenceManager.onlineUsers.has(String(userId))) {
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'thread-online-dot';
          const avEl = t.querySelector('.t-av');
          if (avEl) avEl.appendChild(dot);
        }
      } else {
        dot?.remove();
      }
    }
  });
}

// ── Wire typing manager to chat input ────────────────────────
// Called from HTML: oninput="chatInputTyping()"
function chatInputTyping() {
  TypingManager.onKeyPress();
}

// ── Page visibility: stop typing when user hides the tab ─────
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    TypingManager.stop();
  }
});