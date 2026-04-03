const BASE_URL = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('pic_token');

const api = {
  async request(method, endpoint, data = null, isForm = false) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';
    const options = { method, headers };
    if (data) options.body = isForm ? data : JSON.stringify(data);
    const res = await fetch(BASE_URL + endpoint, options);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },
  get:    (ep)           => api.request('GET',    ep),
  post:   (ep, data)     => api.request('POST',   ep, data),
  put:    (ep, data)     => api.request('PUT',    ep, data),
  del:    (ep)           => api.request('DELETE', ep),
  upload: (ep, formData) => api.request('POST',   ep, formData, true),
};

function switchScreen(s) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById('screen-' + s).classList.add('active');
}

function switchTab(t) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');
  document.getElementById('nav-' + t).classList.add('active');
  if (t === 'home')    loadFeed();
  if (t === 'chat')    { closeChatWindow(); loadThreads(); }
  if (t === 'profile') loadProfile(window.APP.user.username, true);
  if (t === 'search')  resetSearch();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

window.APP = { user: null };