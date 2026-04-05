let forgotEmail = '';
let forgotOTP   = '';

async function forgotSendOTP() {
  const email  = document.getElementById('forgot-email').value.trim();
  const errEl  = document.getElementById('forgot-err1');
  errEl.textContent = '';
  if (!email) { errEl.textContent = 'Please enter your email'; return; }

  const btn = document.querySelector('#forgot-step1 .btn-main');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    await api.post('/forgot/send-otp', { email });
    forgotEmail = email;
    document.getElementById('forgot-email-display').textContent = email;
    document.getElementById('forgot-step1').style.display = 'none';
    document.getElementById('forgot-step2').style.display = 'block';
    showToast('OTP sent to your email!');
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.textContent = 'Send OTP';
    btn.disabled = false;
  }
}

async function forgotVerifyOTP() {
  const otp   = document.getElementById('forgot-otp').value.trim();
  const errEl = document.getElementById('forgot-err2');
  errEl.textContent = '';
  if (!otp || otp.length !== 6) { errEl.textContent = 'Enter a valid 6-digit OTP'; return; }

  const btn = document.querySelector('#forgot-step2 .btn-main');
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  try {
    await api.post('/forgot/verify-otp', { email: forgotEmail, otp });
    forgotOTP = otp;
    document.getElementById('forgot-step2').style.display = 'none';
    document.getElementById('forgot-step3').style.display = 'block';
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.textContent = 'Verify OTP';
    btn.disabled = false;
  }
}

async function forgotResetPassword() {
  const newpass  = document.getElementById('forgot-newpass').value;
  const newpass2 = document.getElementById('forgot-newpass2').value;
  const errEl    = document.getElementById('forgot-err3');
  errEl.textContent = '';

  if (!newpass || !newpass2) { errEl.textContent = 'Please fill both fields'; return; }
  if (newpass !== newpass2)  { errEl.textContent = 'Passwords do not match'; return; }
  if (newpass.length < 6)    { errEl.textContent = 'Password must be at least 6 characters'; return; }

  const btn = document.querySelector('#forgot-step3 .btn-main');
  btn.textContent = 'Resetting...';
  btn.disabled = true;

  try {
    await api.post('/forgot/reset-password', {
      email: forgotEmail,
      otp: forgotOTP,
      newPassword: newpass
    });
    showToast('Password reset successfully!');
    // Reset all steps
    forgotEmail = '';
    forgotOTP   = '';
    document.getElementById('forgot-step1').style.display = 'block';
    document.getElementById('forgot-step2').style.display = 'none';
    document.getElementById('forgot-step3').style.display = 'none';
    document.getElementById('forgot-email').value    = '';
    document.getElementById('forgot-otp').value      = '';
    document.getElementById('forgot-newpass').value  = '';
    document.getElementById('forgot-newpass2').value = '';
    switchScreen('login');
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.textContent = 'Reset Password';
    btn.disabled = false;
  }
}