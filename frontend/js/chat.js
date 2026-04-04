let chatPartnerId   = null;
let chatPartnerName = null;
let pollInterval    = null;

async function loadThreads() {
  const el = document.getElementById('chat-threads');
  el.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  try {
    const threads = await api.get('/messages/threads');
    const requests = await api.get('/messages/requests');
    el.innerHTML = '';

    // Show pending requests at top
    if (requests.length > 0) {
      const reqHeader = document.createElement('div');
      reqHeader.style.cssText = 'padding:10px 16px;font-size:13px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--border);background:var(--surface2)';
      reqHeader.textContent = `Message Requests (${requests.length})`;
      el.appendChild(reqHeader);
      requests.forEach(r => {
        if (!r.from || !r.from._id) return;
        const div = document.createElement('div');
        div.className = 'chat-thread';
        div.style.background = '#fff8f0';
        div.innerHTML = `
          <div class="t-av"><div class="t-av-inner">${getInitials(r.from.name || r.from.username)}</div></div>
          <div class="t-info">
            <div class="t-name">${r.from.username} <span style="font-size:11px;color:#f09433;font-weight:400">• wants to message you</span></div>
            <div class="t-preview">${r.text.slice(0, 40)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button onclick="acceptRequest('${r._id}','${r.from._id}','${r.from.username}',event)" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">Accept</button>
            <button onclick="declineRequest('${r._id}',event)" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">Decline</button>
          </div>
        `;
        el.appendChild(div);
      });

      // divider
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
      if (!t.user || !t.user._id) return;
      const div = document.createElement('div');
      div.className = 'chat-thread';
      div.onclick = () => openChatWindow(t.user._id, t.user.username);
      div.innerHTML = `
        <div class="t-av"><div class="t-av-inner">${getInitials(t.user.name || t.user.username)}</div></div>
        <div class="t-info">
          <div class="t-name">${t.user.username}</div>
          <div class="t-preview">${t.lastMsg ? (t.lastMsg.from._id === window.APP.user._id ? 'You: ' : '') + t.lastMsg.text.slice(0, 40) : ''}</div>
        </div>
        ${t.lastMsg ? `<div class="t-time">${timeAgo(t.lastMsg.createdAt)}</div>` : ''}
      `;
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

function openChatWindow(userId, username) {
  chatPartnerId   = userId;
  chatPartnerName = username;
  document.getElementById('cw-name').textContent  = username;
  document.getElementById('cw-av').textContent    = getInitials(username);
  document.getElementById('chat-list-view').style.display = 'none';
  document.getElementById('chat-window').classList.add('open');
  loadMessages();
  clearInterval(pollInterval);
  pollInterval = setInterval(loadMessages, 3000);
  setTimeout(() => document.getElementById('chat-msg-input').focus(), 100);
}

function closeChatWindow() {
  clearInterval(pollInterval);
  chatPartnerId = null;
  document.getElementById('chat-window').classList.remove('open');
  document.getElementById('chat-list-view').style.display = 'flex';
}

async function loadMessages() {
  if (!chatPartnerId) return;
  try {
    const msgs = await api.get(`/messages/${chatPartnerId}`);
    const mc = document.getElementById('chat-messages');
    const atBottom = mc.scrollHeight - mc.clientHeight <= mc.scrollTop + 10;
    mc.innerHTML = '';
    if (msgs.length === 0) {
      mc.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px;font-size:13px">Say hi! 👋</p>';
      return;
    }
    msgs.forEach(m => {
      const mine = m.from._id === window.APP.user._id;
      const row = document.createElement('div');
      row.className = 'msg-row ' + (mine ? 'mine' : 'other');
      row.innerHTML = `<div class="msg-bubble">${m.text}</div><div class="msg-time">${timeAgo(m.createdAt)}</div>`;
      mc.appendChild(row);
    });
    if (atBottom) mc.scrollTop = mc.scrollHeight;
  } catch (err) {}
}

async function sendMessage() {
  const input = document.getElementById('chat-msg-input');
  const text  = input.value.trim();
  if (!text || !chatPartnerId) return;
  input.value = '';
  try {
    await api.post('/messages', { to: chatPartnerId, text });
    await loadMessages();
    document.getElementById('chat-messages').scrollTop = 9999;
  } catch (err) {
    // if not allowed to message directly, send request instead
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
    <p style="font-size:13px;color:var(--text);margin-bottom:12px">
      You don't follow <strong>${username}</strong>.<br>Send a message request instead?
    </p>
    <button onclick="sendRequest('${userId}','${text}')" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px">Send Request</button>
    <button onclick="document.getElementById('request-prompt').remove()" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>
  `;
  mc.appendChild(prompt);
  mc.scrollTop = mc.scrollHeight;
}

async function sendRequest(userId, text) {
  try {
    await api.post('/messages/request', { to: userId, text });
    showToast('Message request sent!');
    document.getElementById('request-prompt')?.remove();
    document.getElementById('chat-msg-input').value = '';
    const mc = document.getElementById('chat-messages');
    mc.innerHTML = `
      <div style="text-align:center;padding:30px 20px">
        <p style="font-size:32px;margin-bottom:12px">📨</p>
        <p style="font-size:14px;font-weight:600;margin-bottom:6px">Request Sent!</p>
        <p style="font-size:13px;color:var(--muted)">Your message request has been sent.<br>You can chat once they accept it.</p>
      </div>
    `;
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
      res.innerHTML = users.map(u => `
        <div class="user-result" style="padding:8px 0" onclick="startChatWith('${u._id}','${u.username}')">
          <div class="u-av"><div class="u-av-inner">${getInitials(u.name || u.username)}</div></div>
          <div class="u-info"><p>${u.username}</p><p>${u.name || ''}</p></div>
        </div>
      `).join('');
    } catch (err) {}
  }, 300);
}

function startChatWith(userId, username) {
  document.getElementById('new-chat-search').style.display = 'none';
  document.getElementById('new-chat-input').value = '';
  document.getElementById('new-chat-results').innerHTML = '';
  openChatWindow(userId, username);
}