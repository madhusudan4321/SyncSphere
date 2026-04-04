let chatPartnerId   = null;
let chatPartnerName = null;
let pollInterval    = null;

async function loadThreads() {
  const el = document.getElementById('chat-threads');
  el.innerHTML = '<div class="loader">Loading...</div>';
  try {
    const threads = await api.get('/messages/threads');
    el.innerHTML = '';
    if (threads.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;font-size:14px">No messages yet. Tap + to start!</p>';
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
  } catch (err) { el.innerHTML = `<p style="color:#ed4956;text-align:center;padding:20px">${err.message}</p>`; }
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
    if (msgs.length === 0) { mc.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px;font-size:13px">Say hi! 👋</p>'; return; }
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