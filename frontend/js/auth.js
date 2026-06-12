async function authLogin() {
    const identifier = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    const errEl    = document.getElementById('login-err');
    errEl.textContent = '';
    try {
      const data = await api.post('/auth/login', { identifier, password });
      localStorage.setItem('pic_token', data.token);
      localStorage.setItem('pic_user',  JSON.stringify(data.user));
      window.APP.user = data.user;
      document.getElementById('chat-title').textContent = data.user.username;
      switchScreen('app');
      switchTab('home');
      autoRefreshOnLogin();
      connectSocket();
    } catch (err) {
      errEl.textContent = err.message;
    }
  }
  
  async function authRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    const pass2    = document.getElementById('reg-pass2').value;
    const errEl    = document.getElementById('reg-err');
    errEl.textContent = '';
    if (password !== pass2) { errEl.textContent = 'Passwords do not match'; return; }
    try {
      await api.post('/auth/register', { username, email, password });
      showToast('Account created! Please log in.');
      switchScreen('login');
    } catch (err) {
      errEl.textContent = err.message;
    }
  }
  
  function authLogout() {
    localStorage.removeItem('pic_token');
    localStorage.removeItem('pic_user');
    window.APP.user = null;
    switchScreen('login');
  }
  
  // Auto-login on page load
  (function init() {
    const token = localStorage.getItem('pic_token');
    const user  = localStorage.getItem('pic_user');
    if (token && user) {
      window.APP.user = JSON.parse(user);
      document.getElementById('chat-title').textContent = window.APP.user.username;
      switchScreen('app');
      switchTab('home');
      setTimeout(() => autoRefreshOnLogin(), 500);
      setTimeout(() => connectSocket(), 300);
    }
  })();
  function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.innerHTML = isHidden ? `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ` : `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
  }