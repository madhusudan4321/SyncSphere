// ── State ─────────────────────────────────────────────────────────────────────
let _verifyEmail = ''; // email awaiting verification
let _resendTimer = null;

// ── Login ─────────────────────────────────────────────────────────────────────
async function authLogin() {
  const identifier = document.getElementById('login-email').value.trim();
  const password   = document.getElementById('login-pass').value;
  const errEl      = document.getElementById('login-err');
  errEl.textContent = '';
  if (!identifier || !password) { errEl.textContent = 'All fields required'; return; }
  try {
    const data = await api.post('/auth/login', { identifier, password });
    _onAuthSuccess(data);
  } catch (err) {
    // If backend says needs verification → redirect to verify screen
    if (err.needsVerification || err.message?.includes('not verified')) {
      _verifyEmail = err.email || identifier;
      _showVerifyScreen(_verifyEmail);
    } else {
      errEl.textContent = err.message;
    }
  }
}

// ── Register ──────────────────────────────────────────────────────────────────
async function authRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pass').value;
  const pass2    = document.getElementById('reg-pass2').value;
  const errEl    = document.getElementById('reg-err');
  errEl.textContent = '';

  if (!username || !email || !password) { errEl.textContent = 'All fields required'; return; }
  if (password !== pass2) { errEl.textContent = 'Passwords do not match'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; return; }

  const btn = document.querySelector('#screen-register .btn-main');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending OTP...'; }

  try {
    await api.post('/auth/register', { username, email, password });
    _verifyEmail = email;
    _showVerifyScreen(email);
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Sign Up'; }
  }
}

// ── Verify Email ──────────────────────────────────────────────────────────────
async function authVerifyEmail() {
  const otp = [0,1,2,3,4,5].map(i => {
    const el = document.getElementById('otp-' + i);
    return el ? el.value.trim() : '';
  }).join('');

  const errEl = document.getElementById('verify-err');
  errEl.textContent = '';

  if (otp.length !== 6) { errEl.textContent = 'Enter the complete 6-digit code'; return; }

  const btn = document.getElementById('verify-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

  try {
    const data = await api.post('/auth/verify-email', { email: _verifyEmail, otp });
    showToast('Email verified! Welcome to SyncSphere 🎉');
    _onAuthSuccess(data);
  } catch (err) {
    errEl.textContent = err.message;
    // Shake animation on OTP boxes
    document.getElementById('otp-inputs')?.classList.add('otp-shake');
    setTimeout(() => document.getElementById('otp-inputs')?.classList.remove('otp-shake'), 500);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Verify Email'; }
  }
}

// ── Resend OTP ────────────────────────────────────────────────────────────────
async function authResendOTP() {
  const errEl = document.getElementById('verify-err');
  errEl.textContent = '';
  if (!_verifyEmail) return;

  try {
    await api.post('/auth/resend-verify', { email: _verifyEmail });
    showToast('New OTP sent! Check your email.');
    // Clear existing inputs
    [0,1,2,3,4,5].forEach(i => {
      const el = document.getElementById('otp-' + i);
      if (el) el.value = '';
    });
    document.getElementById('otp-0')?.focus();
    _startResendCooldown(60);
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// ── OTP box helpers ───────────────────────────────────────────────────────────
function otpNext(el, nextIdx) {
  el.value = el.value.replace(/\D/g, '').slice(-1); // keep last digit only
  if (el.value && nextIdx !== null) {
    document.getElementById('otp-' + nextIdx)?.focus();
  }
  // Auto-submit when all 6 filled
  const otp = [0,1,2,3,4,5].map(i => document.getElementById('otp-'+i)?.value || '').join('');
  if (otp.length === 6) authVerifyEmail();
}

function otpBack(event, el, prevIdx) {
  if (event.key === 'Backspace' && !el.value && prevIdx !== null) {
    const prev = document.getElementById('otp-' + prevIdx);
    if (prev) { prev.value = ''; prev.focus(); }
  }
}

// ── Resend cooldown timer ─────────────────────────────────────────────────────
function _startResendCooldown(seconds) {
  clearInterval(_resendTimer);
  const btn   = document.getElementById('resend-btn');
  const timer = document.getElementById('resend-timer');
  if (btn)   btn.style.display   = 'none';
  if (timer) { timer.style.display = 'inline'; timer.textContent = `(${seconds}s)`; }

  _resendTimer = setInterval(() => {
    seconds--;
    if (timer) timer.textContent = `(${seconds}s)`;
    if (seconds <= 0) {
      clearInterval(_resendTimer);
      if (btn)   btn.style.display   = 'inline';
      if (timer) timer.style.display = 'none';
    }
  }, 1000);
}

// ── Show verify screen ────────────────────────────────────────────────────────
function _showVerifyScreen(email) {
  const display = document.getElementById('verify-email-display');
  if (display) display.textContent = email;
  // Clear OTP inputs
  [0,1,2,3,4,5].forEach(i => {
    const el = document.getElementById('otp-' + i);
    if (el) el.value = '';
  });
  document.getElementById('verify-err').textContent = '';
  // Reset resend button
  const btn = document.getElementById('resend-btn');
  const timer = document.getElementById('resend-timer');
  if (btn)   btn.style.display   = 'inline';
  if (timer) timer.style.display = 'none';

  switchScreen('verify');
  setTimeout(() => document.getElementById('otp-0')?.focus(), 300);
  _startResendCooldown(60); // start 60-second cooldown on first send
}

// ── Post-auth success ─────────────────────────────────────────────────────────
function _onAuthSuccess(data) {
  localStorage.setItem('pic_token', data.token);
  localStorage.setItem('pic_user',  JSON.stringify(data.user));
  window.APP.user = data.user;
  document.getElementById('chat-title').textContent = data.user.username;
  switchScreen('app');
  switchTab('home');            // internally calls loadFeed() + loadStories()
  loadThreads();               // load chat threads in the background
  checkFollowRequests();       // check pending follow requests
  connectSocket();
}

// ── Logout ────────────────────────────────────────────────────────────────────
function authLogout() {
  localStorage.removeItem('pic_token');
  localStorage.removeItem('pic_user');
  window.APP.user = null;
  switchScreen('login');
}

// ── Auto-login on page load ───────────────────────────────────────
(function init() {
  const token = localStorage.getItem('pic_token');
  const user  = localStorage.getItem('pic_user');

  // No session — stay on login screen (default active state in HTML)
  if (!token || !user) return;

  // ── Restore session synchronously before first paint ─────────────
  window.APP.user = JSON.parse(user);
  document.getElementById('chat-title').textContent = window.APP.user.username;

  // Show the app shell immediately, but inject a loading overlay so the
  // blank white content area is NEVER exposed to the user.
  switchScreen('app');
  _showAppLoadingOverlay();

  const hash = window.location.hash;
  const isProfileDeepLink = hash && hash.startsWith('#@');

  if (isProfileDeepLink) {
    // Deep-link to a profile — restore that tab without feed data
    const profileUsername = hash.slice(2);
    sessionStorage.setItem('restoreProfile', profileUsername);
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-profile').classList.add('active');
    document.getElementById('nav-profile').classList.add('active');
    _hideAppLoadingOverlay();
    connectSocket();
    loadThreads();
    checkFollowRequests();
  } else {
    // Normal home tab — load feed + stories in parallel, then reveal
    sessionStorage.removeItem('restoreProfile');

    // Activate home tab UI elements (nav highlight) without triggering
    // the switchTab() data-fetch — we handle fetching ourselves below.
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-home').classList.add('active');
    document.getElementById('nav-home').classList.add('active');

    // Fetch feed + stories in parallel; hide overlay when both settle
    Promise.allSettled([
      loadFeed(),
      loadStories()
    ]).then(() => {
      _hideAppLoadingOverlay();
    });

    // Socket + thread loading can happen in parallel — they don't block the UI
    connectSocket();
    loadThreads();
    checkFollowRequests();
  }
})();

// ── App-level loading overlay helpers ────────────────────────────
function _showAppLoadingOverlay() {
  if (document.getElementById('app-init-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'app-init-overlay';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:9999',
    'background:var(--surface)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:16px',
    'pointer-events:none'
  ].join(';');
  overlay.innerHTML = `
    <div style="font-family:'Dancing Script',cursive;font-size:36px;font-weight:700;
      background:linear-gradient(90deg,#c13584,#833ab4,#405de6);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;">
      SyncSphere
    </div>
    <div class="spinner" style="width:28px;height:28px;border-width:2.5px"></div>
  `;
  document.body.appendChild(overlay);
}

function _hideAppLoadingOverlay() {
  const overlay = document.getElementById('app-init-overlay');
  if (!overlay) return;
  // Fade out smoothly
  overlay.style.transition = 'opacity 0.25s ease';
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 260);
}

// ── Toggle password visibility ────────────────────────────────────────────────
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