'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const styles = {
  page: {
    width: '100%',
  },
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  brand: {
    fontFamily: 'var(--font-dancing), "Dancing Script", cursive',
    fontSize: 52,
    fontWeight: 700,
    lineHeight: 1.1,
    margin: '4px 0 0',
    background: 'linear-gradient(90deg, #4f46e5, #c026d3, #e11d48)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #dbdbdb',
    borderRadius: 8,
    padding: '28px 24px 20px',
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  heading: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.4,
    color: '#262626',
    margin: '0 0 8px',
    fontFamily: 'var(--font-playfair), Georgia, serif',
  },
  subText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 1.5,
    color: '#737373',
    margin: '0 0 20px',
    wordBreak: 'break-all',
  },
  emailStrong: {
    color: '#262626',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  error: {
    color: '#ed4956',
    fontSize: 13,
    textAlign: 'center',
    margin: '2px 0 0',
  },
  button: {
    width: '100%',
    padding: '11px 0',
    marginTop: 8,
    borderRadius: 8,
    border: 'none',
    background: '#0095f6',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    transition: 'opacity 0.15s',
  },
  resendWrap: {
    textAlign: 'center',
    fontSize: 13,
    color: '#737373',
    margin: '14px 0 0',
  },
  resendBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#0095f6',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  switchCard: {
    background: '#ffffff',
    border: '1px solid #dbdbdb',
    borderRadius: 8,
    padding: '20px 16px',
    textAlign: 'center',
    fontSize: 14,
    color: '#737373',
    boxSizing: 'border-box',
  },
  link: {
    color: '#0095f6',
    fontWeight: 600,
    textDecoration: 'none',
  },
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  fontSize: 14,
  lineHeight: 1.2,
  color: '#262626',
  background: '#fafafa',
  border: '1px solid #dbdbdb',
  borderRadius: 6,
  outline: 'none',
  display: 'block',
  transition: 'border-color 0.15s, background 0.15s',
};

function TextInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        ...style,
        ...(focused ? { borderColor: '#a8a8a8', background: '#fff' } : {}),
      }}
    />
  );
}

function PrimaryButton({ loading, loadingText, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        ...styles.button,
        opacity: loading ? 0.6 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? loadingText : children}
    </button>
  );
}

export default function ForgotPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/forgot/send-otp', { email: email.trim() });
      showToast('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/forgot/verify-otp', { email: email.trim(), otp });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill both fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/forgot/reset-password', {
        email: email.trim(),
        otp,
        newPassword: password,
      });
      showToast('Password reset successfully!');
      router.push('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <Image
            src="/logo.png"
            alt="SyncSphere"
            width={120}
            height={120}
            style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
            priority
          />
          <h1 style={styles.brand}>SyncSphere</h1>
        </div>

        {/* Step 1: Enter email */}
        {step === 1 && (
          <>
            <div style={styles.card}>
              <p style={styles.heading}>Reset your password</p>
              <p style={styles.subText}>
                Enter your registered email and we&apos;ll send you an OTP
              </p>
              <form onSubmit={handleSendOTP} style={styles.form} noValidate>
                <TextInput
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {error && <p style={styles.error}>{error}</p>}
                <PrimaryButton loading={loading} loadingText="Sending...">
                  Send OTP
                </PrimaryButton>
              </form>
            </div>

            <div style={styles.switchCard}>
              Remember your password?{' '}
              <Link href="/login" style={styles.link}>
                Log in
              </Link>
            </div>
          </>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <div style={styles.card}>
            <p style={styles.heading}>Enter OTP</p>
            <p style={styles.subText}>
              We sent a 6-digit OTP to <span style={styles.emailStrong}>{email}</span>
            </p>
            <form onSubmit={handleVerifyOTP} style={styles.form} noValidate>
              <TextInput
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: 8,
                  padding: '12px',
                }}
              />
              {error && <p style={styles.error}>{error}</p>}
              <PrimaryButton loading={loading} loadingText="Verifying...">
                Verify OTP
              </PrimaryButton>
            </form>
            <p style={styles.resendWrap}>
              Didn&apos;t receive?{' '}
              <button type="button" onClick={handleSendOTP} style={styles.resendBtn}>
                Resend OTP
              </button>
            </p>
          </div>
        )}

        {/* Step 3: New password */}
        {step === 3 && (
          <div style={styles.card}>
            <p style={{ ...styles.heading, margin: '0 0 20px' }}>Set new password</p>
            <form onSubmit={handleReset} style={styles.form} noValidate>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password (min 6 chars)"
                autoComplete="new-password"
              />
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                autoComplete="new-password"
              />
              {error && <p style={styles.error}>{error}</p>}
              <PrimaryButton loading={loading} loadingText="Resetting...">
                Reset Password
              </PrimaryButton>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}