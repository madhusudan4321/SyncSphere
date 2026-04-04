async function authLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    const errEl    = document.getElementById('login-err');
    errEl.textContent = '';
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('pic_token', data.token);
      localStorage.setItem('pic_user',  JSON.stringify(data.user));
      window.APP.user = data.user;
      document.getElementById('chat-title').textContent = data.user.username;
      switchScreen('app');
      switchTab('home');
      autoRefreshOnLogin();
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
    }
  })();