// ── Socket.io connection ──────────────────────────────────────
const SOCKET_URL = 'https://syncsphere-api.onrender.com';
let socket = null;

function connectSocket() {
  if (socket?.connected) return;
  socket = io(SOCKET_URL, {
    auth: { token: localStorage.getItem('pic_token') },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('connect_error', (err) => console.warn('Socket error:', err.message));

  socket.on('receive-message', (msg) => {
    // If chat window is open with this user, show the message
    if (chatPartnerId && (msg.from?._id === chatPartnerId || msg.from === chatPartnerId)) {
      appendMessage(msg, false);
    }
    // Refresh thread list for preview
    loadThreads();
  });

  // Real-time: partner unsent a message
  socket.on('message-unsent', ({ msgId }) => {
    const row = document.getElementById('mb-' + msgId)?.closest('.msg-row');
    const rWrap = document.getElementById('mr-' + msgId);
    if (row) row.remove();
    if (rWrap) rWrap.remove();
  });

  // Real-time: partner edited a message
  socket.on('message-edited', ({ msgId, text }) => {
    const bubble = document.getElementById('mb-' + msgId);
    if (bubble) bubble.innerHTML = `${sanitize(text)}<span style="font-size:10px;opacity:.7;margin-left:4px">(edited)</span>`;
  });

  // Real-time: someone reacted to a message
  socket.on('message-reacted', ({ msgId, reactions }) => {
    const rWrap = document.getElementById('mr-' + msgId);
    if (rWrap) {
      rWrap.innerHTML = reactions.map(r =>
        `<span class="msg-reaction" onclick="_reactToMsg('${msgId}','${r.emoji}')">${r.emoji}</span>`
      ).join('');
    }
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
  document.getElementById('cw-name').textContent = username;
  document.getElementById('cw-name').onclick = () => showChatUserMenu(userId, username);
  document.getElementById('cw-name').style.cursor = 'pointer';
  document.getElementById('cw-av').textContent = getInitials(username);
  document.getElementById('cw-av').onclick = () => showChatUserMenu(userId, username);
  document.getElementById('cw-av').style.cursor = 'pointer';
  document.getElementById('chat-list-view').style.display = 'none';
  document.getElementById('chat-window').classList.add('open');

  // Join socket room
  if (socket?.connected) socket.emit('join-chat', { partnerId: userId });

  loadMessages();
  setTimeout(() => document.getElementById('chat-msg-input').focus(), 100);
}

function closeChatWindow() {
  if (chatPartnerId && socket?.connected) {
    socket.emit('leave-chat', { partnerId: chatPartnerId });
  }
  chatPartnerId = null;
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
      mc.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px;font-size:13px">Say hi! 👋</p>';
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

  // Remove "say hi" placeholder
  const placeholder = mc.querySelector('p');
  if (placeholder) placeholder.remove();

  const msgId    = m._id || '';
  const isUnsent = m.deletedForAll;
  const safeText = isUnsent
    ? `<span style="color:var(--muted);font-style:italic;font-size:13px">Message unsent</span>`
    : sanitize(m.text || m);
  const editedBadge = m.edited && !isUnsent
    ? `<span style="font-size:10px;opacity:.7;margin-left:4px">(edited)</span>`
    : '';

  const row = document.createElement('div');
  row.className = 'msg-row ' + (isMine ? 'mine' : 'other');
  row.dataset.msgId  = msgId;
  row.dataset.isMine = isMine ? '1' : '0';

  // Render reactions
  const reactions = (m.reactions || []);
  const reactionHtml = reactions.length > 0
    ? `<div class="msg-reactions">${reactions.map(r => `<span class="msg-reaction" onclick="_reactToMsg('${msgId}','${r.emoji}')">${r.emoji}</span>`).join('')}</div>`
    : `<div class="msg-reactions" id="mr-${msgId}"></div>`;

  row.innerHTML = `
    <div class="msg-bubble" id="mb-${msgId}" onclick="_showMsgActions('${msgId}',${isMine},event)">
      ${safeText}${editedBadge}
    </div>
    <div class="msg-time">${timeAgo(m.createdAt || new Date())}</div>
  `;

  // Add reactions below bubble (outside row so it spans)
  if (reactions.length > 0) {
    const rDiv = document.createElement('div');
    rDiv.className = 'msg-reactions-wrap ' + (isMine ? 'mine' : 'other');
    rDiv.id = 'mr-' + msgId;
    rDiv.innerHTML = reactions.map(r =>
      `<span class="msg-reaction" onclick="_reactToMsg('${msgId}','${r.emoji}')">${r.emoji}</span>`
    ).join('');
    mc.appendChild(row);
    mc.appendChild(rDiv);
  } else {
    mc.appendChild(row);
    // placeholder for reactions
    const rDiv = document.createElement('div');
    rDiv.className = 'msg-reactions-wrap ' + (isMine ? 'mine' : 'other');
    rDiv.id = 'mr-' + msgId;
    mc.appendChild(rDiv);
  }

  if (atBottom) mc.scrollTop = mc.scrollHeight;
}

// ── Message action menu ───────────────────────────────────────
const QUICK_EMOJIS = ['❤️','😂','😮','😢','😡','👍'];

function _showMsgActions(msgId, isMine, e) {
  e?.stopPropagation();
  document.getElementById('msg-action-menu')?.remove();
  if (!msgId) return;

  const bubble = document.getElementById('mb-' + msgId);
  if (!bubble) return;

  const menu = document.createElement('div');
  menu.id = 'msg-action-menu';

  // Position near bubble
  const rect = bubble.getBoundingClientRect();
  const menuTop = rect.top - 130 < 10 ? rect.bottom + 8 : rect.top - 130;

  menu.style.cssText = `
    position:fixed;z-index:500;
    top:${Math.max(10, menuTop)}px;
    left:50%;transform:translateX(-50%);
    width:calc(100% - 40px);max-width:340px;
    background:var(--surface);border-radius:18px;
    box-shadow:0 8px 40px rgba(0,0,0,.22),0 2px 8px rgba(0,0,0,.1);
    border:1px solid var(--border);
    animation:slideUpSheet .18s cubic-bezier(.32,1,.26,1);
    overflow:hidden;
  `;

  menu.innerHTML = `
    <!-- Emoji reaction row -->
    <div style="display:flex;justify-content:space-around;padding:14px 12px 10px;border-bottom:1px solid var(--border)">
      ${QUICK_EMOJIS.map(em => `
        <button onclick="_reactToMsg('${msgId}','${em}');document.getElementById('msg-action-menu')?.remove()" 
          style="background:none;border:none;font-size:26px;cursor:pointer;padding:4px 6px;border-radius:10px;transition:.12s"
          onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='none'">${em}</button>
      `).join('')}
    </div>
    <!-- Actions -->
    <div style="padding:6px 0">
      ${isMine ? `
      <div onclick="_editMsg('${msgId}');document.getElementById('msg-action-menu')?.remove()" style="display:flex;align-items:center;gap:14px;padding:12px 20px;cursor:pointer" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
        <div style="width:36px;height:36px;border-radius:50%;background:#0095f615;display:flex;align-items:center;justify-content:center;font-size:17px">✏️</div>
        <div>
          <p style="font-size:14px;font-weight:600">Edit Message</p>
          <p style="font-size:11px;color:var(--muted)">Change your message text</p>
        </div>
      </div>
      <div onclick="_confirmUnsend('${msgId}')" style="display:flex;align-items:center;gap:14px;padding:12px 20px;cursor:pointer;border-top:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
        <div style="width:36px;height:36px;border-radius:50%;background:#ed495615;display:flex;align-items:center;justify-content:center;font-size:17px">🗑️</div>
        <div>
          <p style="font-size:14px;font-weight:600;color:#ed4956">Unsend</p>
          <p style="font-size:11px;color:var(--muted)">Remove for everyone</p>
        </div>
      </div>` : ''}
    </div>
  `;

  // Close on outside click
  const closeHandler = (ev) => {
    if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeHandler); }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 50);
  document.getElementById('chat-messages')?.appendChild(menu);
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
        <div style="width:52px;height:52px;border-radius:50%;background:#ed495615;border:2px solid #ed495630;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 12px">🗑️</div>
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
  } catch (err) { showToast('❌ ' + err.message); }
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
  } catch (err) { showToast('❌ ' + err.message); loadMessages(); }
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
  try {
    const msg = await api.post('/messages', { to: chatPartnerId, text });
    appendMessage(msg, true);
    // Notify partner via socket
    if (socket?.connected) socket.emit('message-sent', { to: chatPartnerId, message: msg });
  } catch (err) {
    if (err.message === 'Send a message request first') {
      input.value = text;
      showRequestPrompt(chatPartnerId, chatPartnerName, text);
    } else {
      showToast(err.message);
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
        <p style="font-size:32px;margin-bottom:12px">📨</p>
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
          <div style="width:40px;height:40px;border-radius:50%;background:#e8f4fd;display:flex;align-items:center;justify-content:center">👤</div>
          <div><p style="font-size:15px;font-weight:600">View Profile</p></div>
        </div>
        <div onclick="chatMenuBlockUser('${userId}','${username}')" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#fdecea;display:flex;align-items:center;justify-content:center">🚫</div>
          <div><p style="font-size:15px;font-weight:600;color:#ed4956">Block User</p></div>
        </div>
        <div onclick="chatMenuReportUser('${userId}','${username}')" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#fff8e1;display:flex;align-items:center;justify-content:center">⚠️</div>
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